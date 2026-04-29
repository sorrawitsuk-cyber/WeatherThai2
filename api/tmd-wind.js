import { GoogleGenerativeAI } from '@google/generative-ai';

const CACHE_TTL = 60 * 60 * 1000; // 1 hour
let _cache = null;
let _cacheAt = 0;

const TMD_URL = 'http://www.marine.tmd.go.th/html/weather0.html';
const MODEL_CANDIDATES = ['gemini-2.0-flash', 'gemini-2.0-flash-lite'];
const AI_TIMEOUT_MS = 7000;

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
  const timer = setTimeout(() => ctrl.abort(), 3000);
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

    let raw = null;
    let usedModel = null;
    for (const modelId of MODEL_CANDIDATES) {
      try {
        const result = await withTimeout(
          client.getGenerativeModel({ model: modelId }).generateContent(prompt),
          AI_TIMEOUT_MS,
        );
        raw = result.response.text().trim();
        usedModel = modelId;
        break;
      } catch (err) {
        console.warn(`[tmd-wind] ${modelId} failed:`, err.message?.slice(0, 120));
      }
    }

    if (!raw) {
      return res.status(200).json({
        limited: true,
        quickSummary: 'ไม่สามารถวิเคราะห์สภาพอากาศได้ในขณะนี้',
        summary: 'ระบบวิเคราะห์ชั่วคราวขัดข้อง โปรดลองใหม่ในภายหลัง',
        nationalRainChance: 0,
        rainForming: 'none',
        rainFormingDesc: '',
        peakRainTime: 'none',
        peakRainTimeDesc: '',
        bangkok: { rainChance: 0, status: '–', action: 'ไม่สามารถวิเคราะห์ได้', detail: '' },
        mainDriver: '',
        regions: [],
        levelInsights: [],
        alerts: [],
        confidence: 'low',
        tmdAvailable: htmlText !== null,
        cachedAt: new Date().toISOString(),
      });
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
      model: usedModel,
      tmdAvailable: htmlText !== null,
      cachedAt: new Date().toISOString(),
      nextUpdateAt: new Date(Date.now() + CACHE_TTL).toISOString(),
    };
    _cacheAt = Date.now();

    return res.status(200).json(_cache);
  } catch (err) {
    console.error('[tmd-wind] CRITICAL ERROR:', err);
    return res.status(200).json({
      limited: true,
      quickSummary: 'ไม่สามารถวิเคราะห์สภาพอากาศได้ในขณะนี้',
      summary: err.message,
      nationalRainChance: 0,
      rainForming: 'none',
      rainFormingDesc: '',
      peakRainTime: 'none',
      peakRainTimeDesc: '',
      bangkok: { rainChance: 0, status: '–', action: 'ไม่สามารถวิเคราะห์ได้', detail: '' },
      mainDriver: '',
      regions: [],
      levelInsights: [],
      alerts: [],
      confidence: 'low',
      tmdAvailable: false,
      cachedAt: new Date().toISOString(),
    });
  }
}
