import { GoogleGenerativeAI } from '@google/generative-ai';

const CACHE_TTL = 60 * 60 * 1000; // 1 hour
let _cache = null;
let _cacheAt = 0;

const TMD_URL = 'http://www.marine.tmd.go.th/html/weather0.html';
const MODEL = 'gemini-2.5-flash';
const AI_TIMEOUT_MS = 25000;

// Upper air analysis standard times (UTC): 00, 06, 12, 18 + supplemental 03, 09, 15, 21
const SYNOPTIC_HOURS = [0, 3, 6, 9, 12, 15, 18, 21];

function nearestSynopticTime() {
  const utcH = new Date().getUTCHours();
  return SYNOPTIC_HOURS.reduce((prev, h) => (Math.abs(h - utcH) < Math.abs(prev - utcH) ? h : prev));
}

async function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
  });
  try { return await Promise.race([promise, timeout]); }
  finally { clearTimeout(timer); }
}

async function fetchHtml() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2000);
  try {
    const res = await fetch(TMD_URL, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AirQualityThai/1.0)' },
    });
    if (!res.ok) throw new Error(`TMD HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}


function buildFallbackData(pageText, synopticHour) {
  const month = new Date().getMonth() + 1; // 1-12
  const hour = new Date().getHours(); // 0-23

  // Thai seasonal patterns
  const isHotSeason = month >= 3 && month <= 5;
  const isRainySeason = month >= 5 && month <= 10;
  const isCoolSeason = month >= 11 || month <= 2;

  // Afternoon = 12-18, evening = 18-22
  const isAfternoon = hour >= 12 && hour < 18;
  const isEvening = hour >= 18 && hour < 22;

  let rainForming = 'none';
  let nationalRainChance = 0;
  let peakRainTime = 'none';

  if (isRainySeason) {
    rainForming = 'possible';
    nationalRainChance = 35;
    peakRainTime = 'afternoon';
    if (isAfternoon || isEvening) {
      rainForming = 'forming';
      nationalRainChance = 55;
    }
  } else if (isHotSeason && (isAfternoon || isEvening)) {
    rainForming = 'possible';
    nationalRainChance = 25;
    peakRainTime = 'afternoon';
  }

  return {
    limited: false,
    isFallback: true,
    quickSummary: isRainySeason
      ? 'ฤดูฝนเริ่มต้น มีโอกาสเกิดฝนกระจายหลายพื้นที่'
      : 'ท้องฟ้าส่วนใหญ่แจ่มใส แต่อาจมีฝนบางพื้นที่',
    summary: `ข้อมูลฤดูกาล: ${isRainySeason ? 'ฤดูฝน' : isHotSeason ? 'ฤดูร้อน' : 'ฤดูหนาว'}`,
    synopticHourUTC: synopticHour,
    nationalRainChance,
    rainForming,
    rainFormingDesc: `ตอนนี้ฝน${rainForming === 'active' ? 'ตกอยู่' : rainForming === 'forming' ? 'กำลังก่อตัว' : rainForming === 'possible' ? 'อาจเกิดขึ้น' : 'ไม่น่าจะเกิด'}`,
    peakRainTime,
    peakRainTimeDesc: peakRainTime === 'afternoon' ? '12:00–18:00 น.' : peakRainTime === 'evening' ? '18:00–22:00 น.' : '–',
    bangkok: {
      rainChance: Math.max(0, Math.min(100, nationalRainChance - 15)),
      status: nationalRainChance > 40 ? 'มีโอกาสฝน' : nationalRainChance > 20 ? 'ท้องฟ้าปกติ' : 'ท้องฟ้าแจ่มใส',
      action: nationalRainChance > 40 ? '🌂 แนะนำพกร่ม' : '✅ ไม่ต้องพกร่ม',
      detail: 'จากข้อมูลฤดูกาล (ระบบวิเคราะห์หลักขัดข้อง)',
    },
    mainDriver: isRainySeason ? 'ลมมรสุมตะวันออกเฉียงใต้' : 'ความร้อนจากแรงแสงอาทิตย์',
    regions: [
      { name: 'ภาคเหนือ', rainChance: Math.max(20, nationalRainChance - 20), windLevel: '850hPa', pattern: 'ลมจากตะวันออก', detail: '' },
      { name: 'ภาคกลาง', rainChance: Math.max(15, nationalRainChance - 25), windLevel: '850hPa', pattern: 'ลมแปรปรวน', detail: '' },
      { name: 'ภาคตะวันออกเฉียงเหนือ', rainChance: nationalRainChance - 10, windLevel: '850hPa', pattern: 'ลมจากตะวันออก', detail: '' },
      { name: 'ภาคตะวันออก', rainChance: nationalRainChance, windLevel: '850hPa', pattern: 'ลมจากทะเล', detail: '' },
      { name: 'ภาคตะวันตก', rainChance: Math.max(nationalRainChance - 5, 15), windLevel: '850hPa', pattern: 'ลมแปรปรวน', detail: '' },
      { name: 'ภาคใต้ฝั่งตะวันออก', rainChance: nationalRainChance + 10, windLevel: '850hPa', pattern: 'ลมจากทะเล', detail: '' },
      { name: 'ภาคใต้ฝั่งตะวันตก', rainChance: nationalRainChance + 5, windLevel: '850hPa', pattern: 'ลมจากทะเล', detail: '' },
    ],
    levelInsights: [
      { level: '925hPa', description: 'ลมระดับต่ำ: ทิศทางแปรปรวน' },
      { level: '850hPa', description: 'ลมระดับกลางล่าง: ส่วนใหญ่จากตะวันออก' },
      { level: '500hPa', description: 'ลมระดับกลาง: อ่อนไป ปานกลาง' },
    ],
    alerts: ['ข้อมูลเป็นการประมาณจากรูปแบบฤดูกาล เนื่องจากระบบวิเคราะห์หลักไม่พร้อมใช้งาน'],
    confidence: 'low',
    tmdAvailable: false,
    cachedAt: new Date().toISOString(),
  };
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildPrompt(pageText, synopticHour) {
  const thaiHour = (synopticHour + 7) % 24;
  return [
    'คุณเป็นนักอุตุนิยมวิทยาผู้เชี่ยวชาญ วิเคราะห์ข้อมูลลมชั้นบนจากกรมอุตุนิยมวิทยาทางทะเลไทย (TMD Marine)',
    `เวลาอ้างอิง: ${String(synopticHour).padStart(2,'0')}:00 UTC (${String(thaiHour).padStart(2,'0')}:00 น. ไทย)`,
    'ชั้นความกดอากาศที่วิเคราะห์: 925, 850, 700, 500, 300 hPa',
    '',
    'ข้อมูลจากหน้าเว็บ TMD:',
    pageText.slice(0, 2500),
    '',
    'วิเคราะห์รูปแบบลมและโอกาสเกิดฝนในไทยสำหรับประชาชนทั่วไป ตอบเป็น JSON เท่านั้น (ไม่ใส่ markdown) รูปแบบ:',
    JSON.stringify({
      quickSummary: 'สรุป 1 ประโยคสั้นๆ เข้าใจง่าย เช่น "วันนี้ฝนกระจายหลายภาค โดยเฉพาะภาคใต้และภาคตะวันตก"',
      summary: 'สรุปสภาพลมชั้นบนโดยรวม 2-3 ประโยคสำหรับผู้เชี่ยวชาญ',
      synopticHourUTC: synopticHour,
      nationalRainChance: 0,
      rainForming: 'none|possible|forming|active',
      rainFormingDesc: 'อธิบาย 1 ประโยคว่าตอนนี้ฝนกำลังก่อตัวอยู่ไหม',
      peakRainTime: 'morning|afternoon|evening|night|all-day|none',
      peakRainTimeDesc: 'เช่น "ช่วงบ่ายถึงค่ำ 13:00-20:00 น."',
      bangkok: {
        rainChance: 0,
        status: 'สถานะฝน เช่น ท้องฟ้าแจ่มใส / มีโอกาสฝนบางพื้นที่ / ฝนกระจาย',
        action: 'คำแนะนำ 1 ประโยค เช่น "ไม่ต้องพกร่ม" / "แนะนำพกร่ม"',
        detail: 'รายละเอียดเพิ่มเติมสำหรับกรุงเทพฯ และปริมณฑล',
      },
      mainDriver: 'ปัจจัยหลักที่ทำให้เกิดฝน (กระชับ 1 ประโยค)',
      regions: [
        { name: 'ภาคเหนือ', rainChance: 0, windLevel: '850hPa', pattern: 'รูปแบบลมกระชับ', detail: 'รายละเอียดเพิ่มเติม' },
        { name: 'ภาคกลาง', rainChance: 0, windLevel: '850hPa', pattern: '', detail: '' },
        { name: 'ภาคตะวันออกเฉียงเหนือ', rainChance: 0, windLevel: '850hPa', pattern: '', detail: '' },
        { name: 'ภาคตะวันออก', rainChance: 0, windLevel: '850hPa', pattern: '', detail: '' },
        { name: 'ภาคตะวันตก', rainChance: 0, windLevel: '850hPa', pattern: '', detail: '' },
        { name: 'ภาคใต้ฝั่งตะวันออก', rainChance: 0, windLevel: '850hPa', pattern: '', detail: '' },
        { name: 'ภาคใต้ฝั่งตะวันตก', rainChance: 0, windLevel: '850hPa', pattern: '', detail: '' },
      ],
      levelInsights: [
        { level: '925hPa', description: 'รูปแบบลมระดับต่ำ' },
        { level: '850hPa', description: 'รูปแบบลมระดับกลางล่าง (สำคัญสำหรับฝน)' },
        { level: '500hPa', description: 'รูปแบบลมระดับกลาง' },
      ],
      alerts: [],
      confidence: 'low|medium|high',
    }, null, 2),
    '',
    'ถ้าข้อมูลหน้าเว็บไม่ครบ ให้ใช้ความรู้อุตุนิยมวิทยาและฤดูกาลไทยประมาณค่าที่สมเหตุสมผล',
  ].join('\n');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  if (_cache && Date.now() - _cacheAt < CACHE_TTL) {
    return res.status(200).json(_cache);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });

  try {
    const htmlText = await fetchHtml().catch(() => null);
    const pageText = htmlText ? stripHtml(htmlText) : 'ไม่สามารถโหลดข้อมูลจาก TMD ได้';

    const synopticHour = nearestSynopticTime();
    const prompt = buildPrompt(pageText, synopticHour);

    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel(
      { model: MODEL },
      { apiVersion: 'v1beta' },
    );

    let raw = null;
    try {
      const result = await withTimeout(
        model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { thinkingConfig: { thinkingBudget: 0 } },
        }),
        AI_TIMEOUT_MS,
      );
      raw = result.response.text().trim();
    } catch (err) {
      console.warn(`[tmd-wind] ${MODEL} failed: ${err.message}`);
    }

    if (!raw) {
      const fallback = buildFallbackData(pageText, synopticHour);
      _cache = fallback;
      _cacheAt = Date.now();
      return res.status(200).json(fallback);
    }

    let data;
    try {
      const m = raw.match(/\{[\s\S]+\}/);
      data = m ? JSON.parse(m[0]) : { summary: raw, regions: [], nationalRainChance: 0 };
    } catch {
      data = { summary: raw, regions: [], nationalRainChance: 0 };
    }

    _cache = {
      ...data,
      model: MODEL,
      tmdAvailable: htmlText !== null,
      cachedAt: new Date().toISOString(),
      nextUpdateAt: new Date(Date.now() + CACHE_TTL).toISOString(),
    };
    _cacheAt = Date.now();

    return res.status(200).json(_cache);
  } catch (err) {
    console.error('[tmd-wind] CRITICAL ERROR:', err);
    const fallback = buildFallbackData('', nearestSynopticTime());
    return res.status(200).json(fallback);
  }
}
