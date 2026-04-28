import { GoogleGenerativeAI } from '@google/generative-ai';

const CACHE_TTL = 60 * 60 * 1000; // 1 hour
let _cache = null;
let _cacheAt = 0;

const TMD_URL = 'http://www.marine.tmd.go.th/html/weather0.html';
const MODEL_CANDIDATES = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
const AI_TIMEOUT_MS = 25000;

// Upper air analysis standard times (UTC): 00, 06, 12, 18 + supplemental 03, 09, 15, 21
const SYNOPTIC_HOURS = [0, 3, 6, 9, 12, 15, 18, 21];
const PRESSURE_LEVELS = [925, 850, 700, 500, 300];

function nearestSynopticTime() {
  const utcH = new Date().getUTCHours();
  return SYNOPTIC_HOURS.reduce((prev, h) => (Math.abs(h - utcH) < Math.abs(prev - utcH) ? h : prev));
}

async function withTimeout(promise, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try { return await promise; }
  finally { clearTimeout(timer); }
}

async function fetchHtml() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
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

function extractImageUrls(html) {
  const BASE = 'http://www.marine.tmd.go.th';
  const rx = /<img[^>]+src=["']([^"']+)["']/gi;
  const results = [];
  let m;
  while ((m = rx.exec(html)) !== null) {
    let src = m[1];
    if (src.startsWith('//')) src = 'http:' + src;
    else if (src.startsWith('/')) src = BASE + src;
    else if (!src.startsWith('http')) src = BASE + '/html/' + src;
    if (/\.(png|jpg|gif|jpeg)$/i.test(src)) results.push(src);
  }
  return results;
}

function filterWindImages(urls) {
  // Prioritize images that look like upper air charts
  const priority = urls.filter(u =>
    PRESSURE_LEVELS.some(l => u.includes(String(l))) ||
    /upper|wind|stream|front|isoba|level/i.test(u)
  );
  return (priority.length ? priority : urls).slice(0, 6);
}

async function fetchImageBase64(url) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || 'image/png';
    if (!ct.startsWith('image/')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return { base64: buf.toString('base64'), mimeType: ct.split(';')[0] };
  } catch {
    return null;
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
    'วิเคราะห์รูปแบบลมและโอกาสเกิดฝนในไทย ตอบเป็น JSON เท่านั้น (ไม่ใส่ markdown) รูปแบบ:',
    JSON.stringify({
      summary: 'สรุปสภาพลมชั้นบนโดยรวม 2-3 ประโยค',
      synopticHourUTC: synopticHour,
      nationalRainChance: 0,
      mainDriver: 'ปัจจัยหลักที่ทำให้เกิดฝน',
      regions: [
        { name: 'ภาคเหนือ', rainChance: 0, windLevel: '850hPa', pattern: 'รูปแบบลม', detail: 'รายละเอียด' },
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
    const [html] = await Promise.allSettled([fetchHtml()]);
    const pageText = html.status === 'fulfilled' ? stripHtml(html.value) : 'ไม่สามารถโหลดข้อมูลจาก TMD ได้';

    const imageUrls = html.status === 'fulfilled' ? filterWindImages(extractImageUrls(html.value)) : [];
    const imageFetches = await Promise.all(imageUrls.slice(0, 4).map(fetchImageBase64));
    const imageParts = imageFetches.filter(Boolean).map(d => ({ inlineData: d }));

    const synopticHour = nearestSynopticTime();
    const prompt = buildPrompt(pageText, synopticHour);

    const client = new GoogleGenerativeAI(apiKey);
    const parts = imageParts.length ? [{ text: prompt }, ...imageParts] : prompt;

    let raw = null;
    let usedModel = null;
    for (const modelId of MODEL_CANDIDATES) {
      try {
        const result = await withTimeout(
          client.getGenerativeModel({ model: modelId }).generateContent(parts),
          AI_TIMEOUT_MS,
        );
        raw = result.response.text().trim();
        usedModel = modelId;
        break;
      } catch (err) {
        console.warn(`[tmd-wind] ${modelId} failed:`, err.message?.slice(0, 120));
      }
    }

    if (!raw) throw new Error('All Gemini models failed');

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
      imageCount: imageParts.length,
      tmdAvailable: html.status === 'fulfilled',
      cachedAt: new Date().toISOString(),
      nextUpdateAt: new Date(Date.now() + CACHE_TTL).toISOString(),
    };
    _cacheAt = Date.now();

    return res.status(200).json(_cache);
  } catch (err) {
    console.error('[tmd-wind]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
