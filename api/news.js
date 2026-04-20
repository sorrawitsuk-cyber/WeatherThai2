import { GoogleGenerativeAI } from '@google/generative-ai';

const WEATHER_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=13.7563&longitude=100.5018&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max&current_weather=true&timezone=Asia%2FBangkok&forecast_days=7';

const TMD_FEEDS = {
  forecast: 'https://www.tmd.go.th/api/xml/region-daily-forecast?regionid=7',
  warnings: 'https://www.tmd.go.th/api/xml/warning-news',
  storm: 'https://www.tmd.go.th/api/xml/storm-tracking',
  quake: 'https://www.tmd.go.th/api/xml/earthquake-report',
};

const GDACS_URL = 'https://www.gdacs.org/xml/rss.xml';
const USGS_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson';
const RELIEFWEB_URL = 'https://api.reliefweb.int/v1/disasters?appname=airqualitythai&limit=30&sort[]=date.created:desc';
const NASA_CLIMATE_URL = 'https://climate.nasa.gov/api/v1/news_items/?page=0&per_page=10&order=publish_date+desc';
const WMO_RSS_URL = 'https://public.wmo.int/en/rss.xml';

const TMD_WEB = {
  daily: 'https://www.tmd.go.th/forecast/daily',
  sevenday: 'https://www.tmd.go.th/forecast/sevenday',
  storm: 'https://www.tmd.go.th/warning-and-events/warning-storm',
};

// Additional TMD XML region feeds (complement the single-region feed)
const TMD_REGION_FEEDS = [1, 2, 3, 4, 5, 6].map(
  (id) => `https://www.tmd.go.th/api/xml/region-daily-forecast?regionid=${id}`,
);

// ─── New data source URLs ─────────────────────────────────────────────────────
const EONET_URL = 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=14&limit=50';
const USGS_45_WEEK_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson';
const THAIPBS_RSS_CANDIDATES = [
  'https://www.thaipbs.or.th/news/rss/news/3',
  'https://www.thaipbs.or.th/rss/2',
  'https://news.thaipbs.or.th/rss',
];
const DDPM_WEB = 'https://www.disaster.go.th/';
const TMD_EQ_WEB = 'https://earthquake.tmd.go.th/';

const EONET_CATS = {
  volcanoes:    { th: 'ภูเขาไฟ',                  severity: 'medium', category: 'global-disaster' },
  wildfires:    { th: 'ไฟป่า',                     severity: 'medium', category: 'global-disaster' },
  severeStorms: { th: 'พายุรุนแรง',               severity: 'high',   category: 'global-alert'    },
  dustHaze:     { th: 'พายุฝุ่น/หมอกควัน',       severity: 'medium', category: 'global-disaster' },
  floods:       { th: 'น้ำท่วม',                   severity: 'medium', category: 'global-disaster' },
  earthquakes:  { th: 'แผ่นดินไหว',               severity: 'medium', category: 'earthquake'      },
  drought:      { th: 'ภัยแล้ง',                   severity: 'normal', category: 'global-disaster' },
  landslides:   { th: 'ดินถล่ม',                   severity: 'medium', category: 'global-disaster' },
  seaLakeIce:   { th: 'น้ำแข็งขั้วโลก',           severity: 'normal', category: 'climate'         },
  snow:         { th: 'พายุหิมะ/หิมะหนัก',        severity: 'normal', category: 'global-disaster' },
};

const MODEL_CANDIDATES = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
const AI_TIMEOUT_MS = 7000;
const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

const GDACS_EVENT_MAP = {
  EQ: 'แผ่นดินไหว',
  FL: 'น้ำท่วม',
  TC: 'พายุหมุนเขตร้อน',
  WF: 'ไฟป่า',
  VO: 'ภูเขาไฟ',
  DR: 'ภัยแล้ง',
  TS: 'สึนามิ',
};

const CLIMATE_KEYWORDS = [
  'el nino', 'el niño', 'la nina', 'la niña', 'enso', 'climate', 'global warming',
  'sea surface temperature', 'pacific', 'monsoon', 'drought', 'flood', 'extreme weather',
  'carbon', 'arctic', 'glacier', 'sea level', 'heat wave', 'cyclone', 'typhoon',
];

const VISUAL_PRESETS = {
  warning:         { emoji: '⚠️',  gradient: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)',  kicker: 'ประกาศเตือน'       },
  storm:           { emoji: '🌧️', gradient: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',  kicker: 'พายุและฝน'         },
  earthquake:      { emoji: '🌋',  gradient: 'linear-gradient(135deg, #f97316 0%, #b91c1c 100%)',  kicker: 'แผ่นดินไหว'        },
  'thai-disaster': { emoji: '📍',  gradient: 'linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)',  kicker: 'เหตุการณ์ในไทย'    },
  'global-alert':  { emoji: '🌐',  gradient: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)',  kicker: 'เตือนภัยโลก'       },
  'global-disaster':{ emoji: '🧭', gradient: 'linear-gradient(135deg, #0284c7 0%, #0f766e 100%)',  kicker: 'เหตุการณ์สำคัญ'    },
  weather:         { emoji: '⛅',  gradient: 'linear-gradient(135deg, #0ea5e9 0%, #14b8a6 100%)',  kicker: 'พยากรณ์อากาศ'      },
  climate:         { emoji: '🌡️', gradient: 'linear-gradient(135deg, #059669 0%, #0369a1 100%)',  kicker: 'ภูมิอากาศวิทยา'    },
  enso:            { emoji: '🌊',  gradient: 'linear-gradient(135deg, #0284c7 0%, #7c3aed 100%)',  kicker: 'เอลนีโญ่/ลานีญ่า'  },
  volcano:         { emoji: '🌋',  gradient: 'linear-gradient(135deg, #ef4444 0%, #78350f 100%)',  kicker: 'ภูเขาไฟ'           },
  wildfire:        { emoji: '🔥',  gradient: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)',  kicker: 'ไฟป่า'             },
  dust:            { emoji: '🌫️', gradient: 'linear-gradient(135deg, #92400e 0%, #78716c 100%)',  kicker: 'ฝุ่น/หมอกควัน'    },
  flood:           { emoji: '🌊',  gradient: 'linear-gradient(135deg, #0ea5e9 0%, #1d4ed8 100%)',  kicker: 'น้ำท่วม'           },
  ddpm:            { emoji: '🛡️', gradient: 'linear-gradient(135deg, #dc2626 0%, #9f1239 100%)',  kicker: 'ปภ. แจ้งเตือน'     },
  default:         { emoji: '📰',  gradient: 'linear-gradient(135deg, #0f766e 0%, #0369a1 100%)',  kicker: 'ข่าวเด่น'           },
};

function isoNow() {
  return new Date().toISOString();
}

function cleanText(text = '') {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function getTag(block, tagName) {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName.split(':').pop()}>`, 'i');
  const match = block.match(regex);
  if (match) return cleanText(match[1]);

  const fallback = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/[^>]+>`, 'i');
  return cleanText(block.match(fallback)?.[1] || '');
}

function parseRssItems(xmlText, mapper) {
  const items = xmlText.match(/<item\b[\s\S]*?<\/item>/gi) || [];
  return items.map((item) => mapper(item)).filter(Boolean);
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json, text/plain, */*',
        'User-Agent': 'AirQualityThai-News/1.0',
        ...(options.headers || {}),
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson(url, options) {
  const response = await fetchWithTimeout(url, options);
  return response.json();
}

async function fetchText(url, options) {
  const response = await fetchWithTimeout(url, {
    ...options,
    headers: {
      Accept: 'text/xml, application/xml, text/plain, */*',
      'User-Agent': 'Mozilla/5.0 (compatible; AirQualityThai/1.0)',
      ...(options?.headers || {}),
    },
  });
  return response.text();
}

function toThaiDate(dateLike) {
  if (!dateLike) return '-';
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return '-';
  return `${date.getDate()} ${THAI_MONTHS[date.getMonth()]} ${date.getFullYear() + 543}`;
}

function toThaiDateTime(dateLike) {
  if (!dateLike) return '-';
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return '-';
  return `${date.getDate()} ${THAI_MONTHS[date.getMonth()]} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')} น.`;
}

function severityFromText(text = '') {
  const combined = text.toLowerCase();
  if (/red|รุนแรงมาก|อันตราย|ด่วน|ฉุกเฉิน/.test(combined)) return 'high';
  if (/orange|เตือน|เฝ้าระวัง|warning|advisory/.test(combined)) return 'medium';
  return 'normal';
}

function gdacsSeverity(level = '') {
  if (level === 'Red') return 'high';
  if (level === 'Orange') return 'medium';
  return 'normal';
}

function isMostlyThai(text = '') {
  return /[\u0E00-\u0E7F]/.test(text);
}

function isEnsoRelated(text = '') {
  const lower = text.toLowerCase();
  return CLIMATE_KEYWORDS.some((kw) => lower.includes(kw));
}

function translateStaticText(text = '') {
  const replacements = [
    ['Earthquake', 'แผ่นดินไหว'],
    ['Flood', 'น้ำท่วม'],
    ['Tropical Cyclone', 'พายุหมุนเขตร้อน'],
    ['Wildfire', 'ไฟป่า'],
    ['Wild Fire', 'ไฟป่า'],
    ['Volcano', 'ภูเขาไฟ'],
    ['Drought', 'ภัยแล้ง'],
    ['Tsunami', 'สึนามิ'],
    ['Landslide', 'ดินถล่ม'],
    ['Storm Surge', 'คลื่นพายุซัดฝั่ง'],
    ['Heat Wave', 'คลื่นความร้อน'],
    ['Cold Wave', 'คลื่นความหนาว'],
    ['Significant earthquake', 'แผ่นดินไหวสำคัญ'],
    ['magnitude', 'ขนาด'],
    ['km', 'กม.'],
    ['Red', 'ระดับแดง'],
    ['Orange', 'ระดับส้ม'],
    ['Green', 'ระดับเขียว'],
    ['ongoing', 'กำลังเกิดขึ้น'],
    ['alert', 'แจ้งเตือน'],
    ['past', 'ที่ผ่านมา'],
    ['El Nino', 'เอลนีโญ่'],
    ['El Niño', 'เอลนีโญ่'],
    ['La Nina', 'ลานีญ่า'],
    ['La Niña', 'ลานีญ่า'],
    ['ENSO', 'ENSO (ปรากฏการณ์เอลนีโญ่)'],
    ['climate change', 'การเปลี่ยนแปลงสภาพภูมิอากาศ'],
    ['global warming', 'ภาวะโลกร้อน'],
    ['sea level', 'ระดับน้ำทะเล'],
    ['NASA', 'NASA'],
    ['WMO', 'องค์การอุตุนิยมวิทยาโลก'],
  ];

  return replacements.reduce((value, [from, to]) => value.replaceAll(from, to), text).trim();
}

function buildVisual(category, fallbackTitle = '', extra = {}) {
  const preset = VISUAL_PRESETS[category] || VISUAL_PRESETS.default;
  return {
    emoji: preset.emoji,
    gradient: preset.gradient,
    kicker: extra.kicker || preset.kicker,
    label: extra.label || fallbackTitle,
  };
}

function enrichItem(item) {
  const text = `${item.title} ${item.summary || ''}`.toLowerCase();
  const isEnso = isEnsoRelated(text);

  let visualCategory = item.category;
  if (isEnso && item.category === 'climate') {
    visualCategory = 'enso';
  } else if (item.category === 'global-alert' && item.eventType === 'EQ') {
    visualCategory = 'earthquake';
  } else if (item.source === 'NASA EONET' || item.source === 'ปภ.') {
    const eonetMap = {
      volcanoes:    'volcano',
      wildfires:    'wildfire',
      dustHaze:     'dust',
      floods:       'flood',
      severeStorms: 'storm',
    };
    visualCategory = eonetMap[item.eventType] || (item.source === 'ปภ.' ? 'ddpm' : item.category);
  }

  return {
    ...item,
    visual: buildVisual(visualCategory, item.title, {
      kicker: item.eventLabel || item.country || item.status || undefined,
    }),
  };
}

function parseDateValue(dateLike) {
  if (!dateLike) return null;
  const date = new Date(dateLike);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hoursSince(dateLike) {
  const date = parseDateValue(dateLike);
  if (!date) return Infinity;
  return Math.max(0, (Date.now() - date.getTime()) / 3600000);
}

function summarizeForReaders(text = '') {
  const cleaned = cleanText(text)
    .replace(/\b(click here|read more|continue reading)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return '';
  if (cleaned.length <= 180) return cleaned;

  const short = cleaned.slice(0, 177).trim();
  const lastStop = Math.max(short.lastIndexOf('. '), short.lastIndexOf('! '), short.lastIndexOf('? '));
  if (lastStop > 80) return short.slice(0, lastStop + 1).trim();
  return `${short}...`;
}

function classifyFreshnessHours(item) {
  if (item.category === 'warning' || item.category === 'storm') return 48;
  if (item.category === 'earthquake') return 96;
  if (item.category === 'global-alert' || item.category === 'thai-disaster' || item.category === 'global-disaster') return 120;
  if (item.category === 'climate') return 336;
  return 168;
}

function isFreshEnough(item) {
  return hoursSince(item.publishedAt) <= classifyFreshnessHours(item);
}

function severityScore(severity) {
  if (severity === 'high') return 120;
  if (severity === 'medium') return 70;
  return 25;
}

function categoryScore(category) {
  if (category === 'warning') return 90;
  if (category === 'storm') return 80;
  if (category === 'global-alert') return 75;
  if (category === 'thai-disaster') return 70;
  if (category === 'earthquake') return 65;
  if (category === 'global-disaster') return 55;
  if (category === 'climate') return 20;
  return 10;
}

function proximityScore(item) {
  if (item.category === 'warning' || item.category === 'storm' || item.category === 'thai-disaster') return 35;
  if (item.category === 'earthquake' && /thailand|myanmar|laos|cambodia|vietnam|malaysia|indonesia|china/i.test(`${item.title} ${item.summary} ${item.country || ''}`)) {
    return 30;
  }
  return 0;
}

function recencyScore(item) {
  const hours = hoursSince(item.publishedAt);
  if (hours <= 6) return 80;
  if (hours <= 24) return 55;
  if (hours <= 48) return 35;
  if (hours <= 72) return 20;
  if (hours <= 120) return 8;
  return 0;
}

function normalizeNewsItem(item) {
  return {
    ...item,
    title: cleanText(item.title || ''),
    summary: summarizeForReaders(item.summary || ''),
  };
}

function hasStaleYearMention(text) {
  const currentYear = new Date().getFullYear();
  const christianYears = [...text.matchAll(/\b(20\d{2})\b/g)].map((match) => Number(match[1]));
  if (christianYears.some((year) => year < currentYear)) return true;

  const thaiYears = [...text.matchAll(/\b(25\d{2})\b/g)].map((match) => Number(match[1]) - 543);
  return thaiYears.some((year) => year < currentYear);
}

function isActionableNewsItem(item) {
  const haystack = `${item.title || ''} ${item.summary || ''}`.toLowerCase();

  const staleSeasonalPatterns = [
    /ประกาศ(?:การ)?เข้าสู่ฤดู/,
    /ฤดูร้อน/,
    /ฤดูฝน/,
    /ฤดูหนาว/,
    /เริ่มต้นฤดู/,
    /summer season/,
    /rainy season/,
    /winter season/,
  ];

  if (staleSeasonalPatterns.some((pattern) => pattern.test(haystack))) return false;

  const lowUrgencyPatterns = [
    /คาดหมายลักษณะอากาศ/,
    /ภาวะอากาศทั่วไป/,
    /ระยะยาว/,
    /apec/,
    /เทศกาลสงกรานต์/,
    /ลอยกระทง/,
    /ปีใหม่/,
    /วันหยุดยาว/,
    /ช่วงวันหยุด/,
    /seasonal outlook/,
    /monthly outlook/,
    /holiday travel/,
  ];

  if ((item.category === 'warning' || item.category === 'storm') && lowUrgencyPatterns.some((pattern) => pattern.test(haystack))) {
    return false;
  }

  if ((item.category === 'warning' || item.category === 'storm') && hasStaleYearMention(haystack)) {
    return false;
  }

  return true;
}

function prioritizeItems(items = [], limit = items.length) {
  return items
    .map(normalizeNewsItem)
    .filter((item) => item.title && isFreshEnough(item) && isActionableNewsItem(item))
    .map((item) => ({
      ...item,
      priorityScore:
        severityScore(item.severity) +
        categoryScore(item.category) +
        proximityScore(item) +
        recencyScore(item),
    }))
    .sort((a, b) => {
      if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
      return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
    })
    .slice(0, limit);
}

function getWeatherField(daily, newKey, oldKey, index) {
  return daily[newKey]?.[index] ?? daily[oldKey]?.[index];
}

function mapWeatherCode(code) {
  const labels = {
    0: 'ท้องฟ้าแจ่มใส',
    1: 'ค่อนข้างแจ่มใส',
    2: 'มีเมฆบางส่วน',
    3: 'เมฆมาก',
    45: 'มีหมอก',
    48: 'หมอกน้ำค้างแข็ง',
    51: 'ฝนปรอยเล็กน้อย',
    53: 'ฝนปรอยปานกลาง',
    55: 'ฝนปรอยหนัก',
    61: 'ฝนเล็กน้อย',
    63: 'ฝนปานกลาง',
    65: 'ฝนหนัก',
    80: 'ฝนตกเป็นช่วง',
    81: 'ฝนตกเป็นช่วงปานกลาง',
    82: 'ฝนตกหนักเป็นช่วง',
    95: 'พายุฝนฟ้าคะนอง',
    96: 'พายุฝนฟ้าคะนองและลูกเห็บ',
    99: 'พายุรุนแรงและลูกเห็บ',
  };
  return labels[code] || (code != null ? `สภาพอากาศรหัส ${code}` : 'ไม่ทราบสภาพอากาศ');
}

function buildWeatherSummary(weather) {
  if (!weather?.daily) {
    return {
      title: 'สรุปอากาศกรุงเทพฯ',
      summary: 'ไม่สามารถดึงพยากรณ์อากาศได้ในขณะนี้',
      bullets: [],
      days: [],
    };
  }

  const { daily } = weather;
  const today = {
    max: daily.temperature_2m_max?.[0],
    min: daily.temperature_2m_min?.[0],
    rainChance: daily.precipitation_probability_max?.[0],
    rainSum: daily.precipitation_sum?.[0],
    wind: getWeatherField(daily, 'wind_speed_10m_max', 'windspeed_10m_max', 0),
    uv: daily.uv_index_max?.[0],
    code: getWeatherField(daily, 'weather_code', 'weathercode', 0),
  };

  const summary = `${mapWeatherCode(today.code)} สูงสุด ${today.max ?? '-'}°C ต่ำสุด ${today.min ?? '-'}°C โอกาสฝน ${today.rainChance ?? '-'}%`;
  const bullets = [];

  if ((today.rainChance || 0) >= 60) bullets.push('กรุงเทพฯ มีโอกาสฝนค่อนข้างสูง ควรเผื่อเวลาเดินทางและเตรียมร่ม');
  if ((today.wind || 0) >= 30) bullets.push(`มีช่วงลมแรงได้ถึง ${today.wind} กม./ชม.`);
  if ((today.uv || 0) >= 8) bullets.push(`ค่า UV สูงระดับ ${today.uv} ควรหลบแดดช่วงกลางวัน`);
  if ((today.rainSum || 0) > 0) bullets.push(`ปริมาณฝนสะสมคาดการณ์ ${today.rainSum} มม.`);

  return {
    title: 'สรุปอากาศกรุงเทพฯ',
    summary,
    bullets,
    today,
    visual: buildVisual('weather', summary),
    days: (daily.time || []).map((time, index) => ({
      time,
      label: mapWeatherCode(getWeatherField(daily, 'weather_code', 'weathercode', index)),
      code: getWeatherField(daily, 'weather_code', 'weathercode', index),
      max: daily.temperature_2m_max?.[index],
      min: daily.temperature_2m_min?.[index],
      rainChance: daily.precipitation_probability_max?.[index],
      rainSum: daily.precipitation_sum?.[index],
      wind: getWeatherField(daily, 'wind_speed_10m_max', 'windspeed_10m_max', index),
      uv: daily.uv_index_max?.[index],
    })),
  };
}

async function fetchTmdFeeds() {
  const [forecastResult, warningsResult, stormResult, quakeResult] = await Promise.allSettled([
    fetchText(TMD_FEEDS.forecast),
    fetchText(TMD_FEEDS.warnings),
    fetchText(TMD_FEEDS.storm),
    fetchText(TMD_FEEDS.quake),
  ]);

  const safeXml = (result) => (result.status === 'fulfilled' ? result.value : '<rss></rss>');

  const parseStandard = (xml) =>
    parseRssItems(xml, (item) => ({
      title: getTag(item, 'title'),
      summary: getTag(item, 'description'),
      publishedAt: getTag(item, 'pubDate'),
      link: getTag(item, 'link'),
    }));

  return {
    forecast: parseStandard(safeXml(forecastResult)).slice(0, 5),
    warnings: parseStandard(safeXml(warningsResult))
      .slice(0, 8)
      .map((item) => ({
        ...item,
        severity: severityFromText(`${item.title} ${item.summary}`),
        source: 'TMD',
        category: 'warning',
      })),
    storm: parseStandard(safeXml(stormResult))
      .slice(0, 6)
      .map((item) => ({
        ...item,
        severity: 'medium',
        source: 'TMD',
        category: 'storm',
      })),
    earthquake: parseStandard(safeXml(quakeResult))
      .slice(0, 10)
      .map((item) => ({
        ...item,
        severity: 'medium',
        source: 'TMD',
        category: 'earthquake',
      })),
    tmdStatus: {
      forecast: forecastResult.status,
      warnings: warningsResult.status,
      storm: stormResult.status,
      earthquake: quakeResult.status,
    },
  };
}

async function fetchGdacsAlerts() {
  const xml = await fetchText(GDACS_URL);
  return parseRssItems(xml, (item) => {
    const eventType = getTag(item, 'gdacs:eventtype') || getTag(item, 'eventtype');
    const alertLevel = getTag(item, 'gdacs:alertlevel') || getTag(item, 'alertlevel');
    const country = getTag(item, 'gdacs:country') || getTag(item, 'country');

    return {
      title: getTag(item, 'title'),
      summary: getTag(item, 'description'),
      publishedAt: getTag(item, 'pubDate'),
      link: getTag(item, 'link') || getTag(item, 'guid'),
      eventType,
      eventLabel: GDACS_EVENT_MAP[eventType] || eventType || 'ภัยพิบัติ',
      country,
      alertLevel,
      severity: gdacsSeverity(alertLevel),
      source: 'GDACS',
      category: 'global-alert',
    };
  }).slice(0, 20);
}

async function fetchEarthquakes() {
  const data = await fetchJson(USGS_URL);
  return (data.features || []).slice(0, 10).map((item) => ({
    id: item.id,
    title: item.properties?.title || '',
    summary: item.properties?.place || '',
    magnitude: item.properties?.mag,
    publishedAt: item.properties?.time,
    updatedAt: item.properties?.updated,
    link: item.properties?.url,
    tsunami: item.properties?.tsunami,
    severity: (item.properties?.mag || 0) >= 6.5 ? 'high' : 'medium',
    source: 'USGS',
    category: 'earthquake',
  }));
}

async function fetchReliefWebDisasters(mode) {
  const body =
    mode === 'thai'
      ? {
          fields: { include: ['name', 'date', 'country', 'type', 'status', 'url_alias'] },
          filter: { field: 'primary_country.iso3', value: 'tha' },
        }
      : {
          fields: { include: ['name', 'date', 'country', 'type', 'status', 'url_alias'] },
          filter: {
            operator: 'AND',
            conditions: [
              {
                field: 'date.created',
                value: { from: new Date(Date.now() - 7 * 86400_000).toISOString().split('T')[0] },
              },
            ],
          },
        };

  const data = await fetchJson(RELIEFWEB_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return (data.data || []).slice(0, mode === 'thai' ? 10 : 12).map((item) => {
    const fields = item.fields || {};
    return {
      id: item.id,
      title: fields.name || '',
      summary: `${(fields.type || []).map((entry) => entry.name).join(', ') || 'ภัยพิบัติ'} · ${fields.country?.[0]?.name || ''}`.trim(),
      publishedAt: fields.date?.created,
      status: fields.status,
      country: fields.country?.[0]?.name || '',
      types: (fields.type || []).map((entry) => entry.name),
      link: fields.url_alias ? `https://reliefweb.int/disaster/${fields.url_alias}` : 'https://reliefweb.int/disasters',
      severity: severityFromText(`${fields.status || ''} ${(fields.type || []).map((entry) => entry.name).join(' ')}`),
      source: 'ReliefWeb',
      category: mode === 'thai' ? 'thai-disaster' : 'global-disaster',
    };
  });
}

async function fetchClimateNews() {
  const results = await Promise.allSettled([
    fetchJson(NASA_CLIMATE_URL),
    fetchText(WMO_RSS_URL),
  ]);

  const items = [];

  // NASA Climate JSON API
  if (results[0].status === 'fulfilled') {
    const data = results[0].value;
    const nasaItems = (data.results || data.items || []).slice(0, 8);
    for (const item of nasaItems) {
      items.push({
        id: `nasa-${item.id}`,
        title: item.title || '',
        summary: item.excerpt || item.description || '',
        publishedAt: item.publish_date,
        link: item.url || `https://climate.nasa.gov/news/${item.id}/`,
        imageUrl: item.featured_image_url || item.main_image?.url || '',
        source: 'NASA Climate',
        category: 'climate',
        severity: 'normal',
      });
    }
  }

  // WMO RSS as secondary
  if (results[1].status === 'fulfilled') {
    const wmoItems = parseRssItems(results[1].value, (item) => ({
      title: getTag(item, 'title'),
      summary: getTag(item, 'description'),
      publishedAt: getTag(item, 'pubDate'),
      link: getTag(item, 'link') || getTag(item, 'guid'),
      imageUrl: '',
      source: 'WMO',
      category: 'climate',
      severity: 'normal',
    })).slice(0, 5);
    items.push(...wmoItems);
  }

  // Sort by publishedAt, deduplicate by title prefix
  const seen = new Set();
  return items
    .filter((item) => {
      if (!item.title) return false;
      const key = item.title.slice(0, 40).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
    .slice(0, 12);
}

function stripMarkdownJson(text = '') {
  return text
    .replace(/^```(?:json)?\s*\n?/m, '')
    .replace(/\n?\s*```\s*$/m, '')
    .trim();
}

async function withTimeout(promise, timeoutMs, label = 'operation') {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function maybeTranslateItems(items) {
  const apiKey = process.env.GEMINI_API_KEY;
  const targets = items.filter((item) => !isMostlyThai(item.title) || !isMostlyThai(item.summary || ''));
  if (!targets.length) return items;

  if (!apiKey) {
    return items.map((item) => ({
      ...item,
      title: translateStaticText(item.title || ''),
      summary: translateStaticText(item.summary || ''),
    }));
  }

  const payload = targets.map((item, index) => ({
    index,
    title: item.title || '',
    summary: (item.summary || '').slice(0, 200),
    eventLabel: item.eventLabel || '',
    country: item.country || '',
    status: item.status || '',
  }));

  const prompt = [
    'แปลข่าวภัยพิบัติ สภาพอากาศ และภูมิอากาศต่อไปนี้เป็นภาษาไทยสำหรับผู้ใช้ทั่วไป',
    'ตอบเป็น JSON array เท่านั้น (ไม่ต้องมี markdown) โดยคงลำดับเดิมและใช้รูปแบบ [{"index":0,"title":"...","summary":"..."}]',
    'แปลให้กระชับ อ่านง่าย เข้าใจง่าย และห้ามเติมข้อมูลใหม่',
    'ชื่อเฉพาะ เช่น El Niño ให้แปลว่า เอลนีโญ่, La Niña ให้แปลว่า ลานีญ่า',
    JSON.stringify(payload),
  ].join('\n');

  const client = new GoogleGenerativeAI(apiKey);

  for (const model of MODEL_CANDIDATES) {
    try {
      const result = await withTimeout(
        client.getGenerativeModel({ model }).generateContent(prompt),
        AI_TIMEOUT_MS,
        `AI translation (${model})`,
      );
      const raw = result.response.text()?.trim();
      const text = stripMarkdownJson(raw);
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) continue;

      const translatedByIndex = new Map(parsed.map((entry) => [entry.index, entry]));

      return items.map((item) => {
        const targetIndex = targets.indexOf(item);
        if (targetIndex === -1) return item;
        const translated = translatedByIndex.get(targetIndex);
        return {
          ...item,
          title: translated?.title?.trim() || translateStaticText(item.title || ''),
          summary: translated?.summary?.trim() || translateStaticText(item.summary || ''),
        };
      });
    } catch (error) {
      console.error(`AI translation failed on ${model}:`, error.message || error);
    }
  }

  return items.map((item) => ({
    ...item,
    title: translateStaticText(item.title || ''),
    summary: translateStaticText(item.summary || ''),
  }));
}

function buildDigest({ weather, thaiWarnings, thaiStorms, gdacs, usgs, thaiDisasters, globalDisasters, sourceStatus }) {
  const warningTitles = (thaiWarnings || []).slice(0, 2).map((item) => item.title).filter(Boolean);
  const stormTitles = (thaiStorms || []).slice(0, 1).map((item) => item.title).filter(Boolean);
  const topGdacs = (gdacs || []).find((item) => item.severity === 'high') || gdacs?.[0];
  const topEarthquake = (usgs || [])[0];
  const thaiHeadline = thaiDisasters?.[0];

  const bullets = [];
  const thaiLines = [];

  if (warningTitles.length) thaiLines.push(`มีประกาศเตือนจากกรมอุตุนิยมวิทยา เช่น ${warningTitles.join(' / ')}`);
  if (stormTitles.length) thaiLines.push(`มีประเด็นติดตามพายุหรือสภาพอากาศสำคัญ: ${stormTitles[0]}`);

  bullets.push(...thaiLines);

  if (topGdacs) bullets.push(`ต่างประเทศ: ${topGdacs.eventLabel} ใน${topGdacs.country || 'หลายพื้นที่'} ระดับ ${topGdacs.alertLevel || 'ติดตาม'}`);
  if (topEarthquake) bullets.push(`แผ่นดินไหวเด่นในสัปดาห์นี้: ${topEarthquake.title}`);
  if (thaiHeadline) bullets.push(`เหตุการณ์ในไทยล่าสุด: ${thaiHeadline.title}`);

  return {
    title: 'สรุปข่าวอากาศและภัยพิบัติ',
    updatedAt: isoNow(),
    overview: {
      thaiWarningCount: thaiWarnings?.length || 0,
      thaiDisasterCount: thaiDisasters?.length || 0,
      globalAlertCount: gdacs?.length || 0,
      globalDisasterCount: globalDisasters?.length || 0,
      earthquakeCount: usgs?.length || 0,
    },
    headline: weather.summary,
    bullets: bullets.slice(0, 5),
  };
}

async function maybeGenerateAiSummary(payload) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const prompt = [
    'สรุปข่าวอากาศและภัยพิบัติเป็นภาษาไทยแบบกระชับ ใช้งานจริง อ่านง่าย สำหรับหน้า dashboard',
    'ตอบเป็น JSON เท่านั้น (ไม่ต้องมี markdown) ในรูปแบบ {"headline":"...","bullets":["..."]}',
    'headline 1 ประโยค bullets 3-5 ข้อ และห้ามแต่งข้อมูลเกินชุดข้อมูลที่ให้',
    JSON.stringify(payload),
  ].join('\n');

  const client = new GoogleGenerativeAI(apiKey);

  for (const model of MODEL_CANDIDATES) {
    try {
      const result = await withTimeout(
        client.getGenerativeModel({ model }).generateContent(prompt),
        AI_TIMEOUT_MS,
        `AI digest (${model})`,
      );
      const raw = result.response.text()?.trim();
      const text = stripMarkdownJson(raw);
      const parsed = JSON.parse(text);
      if (parsed?.headline && Array.isArray(parsed?.bullets)) {
        return {
          headline: parsed.headline,
          bullets: parsed.bullets.filter(Boolean).slice(0, 5),
        };
      }
    } catch (error) {
      console.error(`AI news summary failed on ${model}:`, error.message || error);
    }
  }

  return null;
}

function normalizeSourceStatus(label, result, count = 0) {
  if (result.status === 'fulfilled') return { label, status: 'ok', count };
  return {
    label,
    status: 'error',
    count: 0,
    error: result.reason?.message || 'Unknown error',
  };
}

// ─── TMD Web Scraping ─────────────────────────────────────────────────────────

function extractNextData(html) {
  const m = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

function deepFind(obj, keys, _depth = 0) {
  if (_depth > 7 || obj == null || typeof obj !== 'object') return undefined;
  if (Array.isArray(obj)) {
    for (const item of obj.slice(0, 20)) {
      const r = deepFind(item, keys, _depth + 1);
      if (r !== undefined) return r;
    }
    return undefined;
  }
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  for (const val of Object.values(obj).slice(0, 30)) {
    const r = deepFind(val, keys, _depth + 1);
    if (r !== undefined) return r;
  }
  return undefined;
}

function makeTmdItem(title, summary, link, category, severity = 'normal') {
  return enrichItem({
    title: cleanText(title || '').slice(0, 200),
    summary: summarizeForReaders(summary || ''),
    publishedAt: new Date().toISOString(),
    link,
    severity,
    source: 'TMD',
    category,
  });
}

function parseTmdNextData(nextData, url, type) {
  const props = nextData?.props?.pageProps;
  if (!props) return [];
  const items = [];

  if (type === 'storm') {
    const stormList = deepFind(props, ['storms', 'stormList', 'cyclones', 'warnings', 'stormData', 'data']);
    if (Array.isArray(stormList) && stormList.length) {
      for (const s of stormList.slice(0, 5)) {
        const title = s.title_th || s.name_th || s.name || s.title || '';
        const summary = s.detail_th || s.description_th || s.body || s.content || '';
        if (!title) continue;
        const sev = /ไต้ฝุ่น|โซนร้อนกำลังแรง/.test(`${title}${summary}`) ? 'high' : 'medium';
        items.push(makeTmdItem(title, summary, url, 'storm', sev));
      }
    }
    // Fallback: look for content blob
    if (!items.length) {
      const blob = deepFind(props, ['content', 'body', 'html', 'text', 'description']);
      if (typeof blob === 'string') {
        const stormBlocks = blob.match(/(?:พายุ|ดีเปรสชัน|โซนร้อน|ไต้ฝุ่น)[^.!?\n]{20,300}/g) || [];
        for (const block of stormBlocks.slice(0, 3)) {
          items.push(makeTmdItem(block.slice(0, 100), block, url, 'storm', 'medium'));
        }
      }
    }
  } else {
    // daily / sevenday forecast
    const fcList = deepFind(props, ['forecasts', 'forecast', 'regions', 'dailyForecast', 'sevenDayForecast', 'regionForecast', 'data']);
    if (Array.isArray(fcList) && fcList.length) {
      for (const f of fcList.slice(0, 8)) {
        const title = f.region_th || f.region || f.title_th || f.header || f.name || '';
        const summary = f.forecast_th || f.detail_th || f.content || f.description || f.weather || '';
        if (!title) continue;
        items.push(makeTmdItem(title, summary, url, 'warning', 'normal'));
      }
    }
  }

  return items;
}

function parseTmdHtml(html, url, type) {
  const items = [];

  // Strip non-content sections
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  // Flatten to plain text
  const plain = stripped
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

  // Extract Thai text blocks (30-400 chars)
  const blocks = plain.match(/[\u0E00-\u0E7F][\u0E00-\u0E7F\s\d.,!?:;()\-]{29,399}/g) || [];
  const unique = [...new Set(blocks)].filter((t) => t.trim().length > 30);

  if (type === 'storm') {
    const stormBlocks = unique.filter((t) =>
      /พายุ|ดีเปรสชัน|โซนร้อน|ไต้ฝุ่น|คลื่นลมแรง|ลมมรสุม/.test(t),
    );
    if (stormBlocks.length) {
      const isHigh = stormBlocks.some((t) => /ไต้ฝุ่น|โซนร้อนกำลังแรง/.test(t));
      items.push(
        makeTmdItem(
          stormBlocks[0].slice(0, 100),
          stormBlocks.slice(0, 3).join(' ').slice(0, 500),
          url,
          'storm',
          isHigh ? 'high' : 'medium',
        ),
      );
    } else {
      // Show a "no active storm" info item if page loaded but no storm found
      items.push(
        makeTmdItem(
          'ไม่มีพายุที่น่าเป็นห่วงในขณะนี้',
          'กรมอุตุนิยมวิทยาไม่ได้ประกาศเตือนพายุใดในขณะนี้',
          url,
          'storm',
          'normal',
        ),
      );
    }
  } else {
    const REGIONS = [
      'ภาคเหนือ',
      'ภาคตะวันออกเฉียงเหนือ',
      'ภาคกลาง',
      'ภาคตะวันออก',
      'ภาคใต้',
      'กรุงเทพมหานคร',
    ];

    let found = 0;
    for (const region of REGIONS) {
      const block = unique.find((t) => t.includes(region));
      if (block) {
        items.push(makeTmdItem(`พยากรณ์${region}`, block, url, 'warning', 'normal'));
        found++;
      }
    }

    if (!found) {
      const weatherBlocks = unique
        .filter((t) => /อากาศ|ฝน|อุณหภูมิ|ลม|พยากรณ์|ร้อน|เย็น/.test(t))
        .slice(0, 4);
      if (weatherBlocks.length) {
        const label = type === 'daily' ? 'พยากรณ์อากาศประจำวัน' : 'พยากรณ์อากาศ 7 วัน';
        items.push(makeTmdItem(label, weatherBlocks.join(' ').slice(0, 500), url, 'warning', 'normal'));
      }
    }
  }

  return items;
}

async function fetchTmdAllRegions() {
  const results = await Promise.allSettled(
    TMD_REGION_FEEDS.map((url) => fetchText(url)),
  );

  const parseStandard = (xml) =>
    parseRssItems(xml, (item) => ({
      title: getTag(item, 'title'),
      summary: getTag(item, 'description'),
      publishedAt: getTag(item, 'pubDate'),
      link: getTag(item, 'link'),
      severity: 'normal',
      source: 'TMD',
      category: 'warning',
    }));

  const items = [];
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      items.push(...parseStandard(result.value).slice(0, 2));
    }
  }

  // Deduplicate by title prefix
  const seen = new Set();
  return items.filter((item) => {
    if (!item.title) return false;
    const key = item.title.slice(0, 30).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchTmdWebPages() {
  const htmlHeaders = {
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept-Language': 'th-TH,th;q=0.9,en;q=0.8',
    Referer: 'https://www.tmd.go.th/',
  };

  const [dailyRes, sevendayRes, stormRes, regionsRaw] = await Promise.allSettled([
    fetchText(TMD_WEB.daily, { headers: htmlHeaders }),
    fetchText(TMD_WEB.sevenday, { headers: htmlHeaders }),
    fetchText(TMD_WEB.storm, { headers: htmlHeaders }),
    fetchTmdAllRegions(),
  ]);

  const parsePage = (result, url, type) => {
    if (result.status !== 'fulfilled' || !result.value) return [];
    const html = result.value;
    const nextData = extractNextData(html);
    if (nextData) {
      const parsed = parseTmdNextData(nextData, url, type);
      if (parsed.length) return parsed;
    }
    return parseTmdHtml(html, url, type);
  };

  return {
    daily: parsePage(dailyRes, TMD_WEB.daily, 'daily'),
    sevenday: parsePage(sevendayRes, TMD_WEB.sevenday, 'sevenday'),
    storm: parsePage(stormRes, TMD_WEB.storm, 'storm'),
    regions: regionsRaw.status === 'fulfilled' ? regionsRaw.value : [],
  };
}

// ─── EONET: NASA natural events ──────────────────────────────────────────────
async function fetchEonetEvents() {
  const data = await fetchJson(EONET_URL);
  if (!data?.events) return [];
  const items = [];
  for (const event of data.events) {
    const catId = event.categories?.[0]?.id || '';
    const catKey = Object.keys(EONET_CATS).find((k) => catId.toLowerCase().includes(k.toLowerCase().replace(/severe/i, ''))) ||
      Object.keys(EONET_CATS).find((k) => event.categories?.[0]?.title?.toLowerCase().includes(k.toLowerCase().replace(/severe/i, '')));
    const cat = EONET_CATS[catKey] || { th: 'เหตุการณ์ธรรมชาติ', severity: 'normal', category: 'global-disaster' };

    const geom = event.geometry?.[0];
    let country = '';
    let coords = null;
    if (geom?.coordinates) {
      coords = geom.coordinates;
      const [lon, lat] = Array.isArray(coords[0]) ? coords[0] : coords;
      if (lat >= -10 && lat <= 35 && lon >= 88 && lon <= 145) country = 'ภูมิภาคเอเชียตะวันออกเฉียงใต้';
    }

    const date = geom?.date || event.geometry?.[event.geometry.length - 1]?.date || isoNow();
    items.push({
      id: `eonet-${event.id}`,
      title: event.title,
      summary: `${cat.th}${country ? ` · ${country}` : ''}`,
      source: 'NASA EONET',
      category: cat.category,
      severity: cat.severity,
      eventType: catKey || catId,
      eventLabel: cat.th,
      country,
      url: event.sources?.[0]?.url || `https://eonet.gsfc.nasa.gov/api/v3/events/${event.id}`,
      publishedAt: date,
      lang: 'en',
    });
  }
  return items;
}

// ─── USGS regional M4.5+ SE Asia ────────────────────────────────────────────
async function fetchUsgsRegional() {
  const data = await fetchJson(USGS_45_WEEK_URL);
  if (!data?.features) return [];
  return data.features
    .filter((f) => {
      const [lon, lat] = f.geometry?.coordinates || [];
      return lat >= -10 && lat <= 35 && lon >= 88 && lon <= 145;
    })
    .map((f) => {
      const p = f.properties;
      const mag = p.mag?.toFixed(1) ?? '?';
      const place = p.place || 'ไม่ระบุสถานที่';
      return {
        id: `usgs-reg-${f.id}`,
        title: `แผ่นดินไหว M${mag} · ${place}`,
        summary: `USGS · ขนาด ${mag} · ${place}`,
        source: 'USGS Regional',
        category: 'earthquake',
        severity: parseFloat(mag) >= 6 ? 'high' : parseFloat(mag) >= 5 ? 'medium' : 'normal',
        eventType: 'EQ',
        eventLabel: 'แผ่นดินไหว',
        country: 'ภูมิภาคเอเชีย',
        url: p.url || 'https://earthquake.usgs.gov',
        publishedAt: new Date(p.time).toISOString(),
        lang: 'mixed',
        magnitude: parseFloat(mag),
      };
    });
}

// ─── Thai PBS RSS ─────────────────────────────────────────────────────────────
async function fetchThaiPbsRss() {
  const htmlHeaders = { 'User-Agent': 'Mozilla/5.0', Accept: 'application/rss+xml,text/xml,*/*' };
  const KEYWORDS_RE = /ฝน|พายุ|น้ำท่วม|แผ่นดินไหว|ภัย|อากาศ|ร้อน|ไฟ|ฝุ่น|หมอก|สภาพ|ดิน/;
  for (const url of THAIPBS_RSS_CANDIDATES) {
    try {
      const xml = await fetchText(url, { headers: htmlHeaders });
      if (!xml) continue;
      const items = [];
      const itemMatches = xml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi);
      for (const m of itemMatches) {
        const block = m[1];
        const title = cleanText(block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
        const link  = cleanText(block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] || block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i)?.[1] || '');
        const desc  = cleanText(block.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1] || '');
        const pubDate = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1] || '';
        if (!title || !KEYWORDS_RE.test(title + desc)) continue;
        items.push({
          id: `thaipbs-${Buffer.from(link).toString('base64').slice(0, 16)}`,
          title,
          summary: desc.slice(0, 200),
          source: 'Thai PBS',
          category: 'thai-disaster',
          severity: 'normal',
          eventLabel: 'ข่าวไทยพีบีเอส',
          url: link,
          publishedAt: pubDate ? new Date(pubDate).toISOString() : isoNow(),
          lang: 'th',
        });
        if (items.length >= 10) break;
      }
      if (items.length > 0) return items;
    } catch (_) { /* try next candidate */ }
  }
  return [];
}

// ─── DDPM (กรมป้องกันและบรรเทาสาธารณภัย) ────────────────────────────────────
function parseDdpmHtml(html) {
  const items = [];
  const thaiRe = /[\u0E00-\u0E7F]{4,}/g;
  const paragraphs = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .split(/<\/?(p|div|li|h[1-6]|section|article)[^>]*>/gi)
    .map((s) => cleanText(s).trim())
    .filter((s) => s.length > 20 && thaiRe.test(s));
  for (const p of paragraphs.slice(0, 15)) {
    items.push({
      id: `ddpm-${Buffer.from(p.slice(0, 40)).toString('base64').slice(0, 16)}`,
      title: p.slice(0, 120),
      summary: p.slice(0, 300),
      source: 'ปภ.',
      category: 'thai-disaster',
      severity: /เตือน|ภัย|วิกฤต|ฉุกเฉิน/.test(p) ? 'high' : 'medium',
      eventLabel: 'ปภ. แจ้งเตือน',
      url: DDPM_WEB,
      publishedAt: isoNow(),
      lang: 'th',
    });
  }
  return items;
}

async function fetchDdpmPage() {
  try {
    const htmlHeaders = {
      Accept: 'text/html,*/*',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept-Language': 'th-TH,th;q=0.9',
    };
    const html = await fetchText(DDPM_WEB, { headers: htmlHeaders });
    if (!html) return [];
    const nextData = extractNextData(html);
    if (nextData) {
      const texts = [];
      deepFind(nextData, (v) => {
        if (typeof v === 'string' && /[\u0E00-\u0E7F]{4,}/.test(v) && v.length > 20) texts.push(v);
      });
      if (texts.length) {
        return texts.slice(0, 10).map((t) => ({
          id: `ddpm-nd-${Buffer.from(t.slice(0, 40)).toString('base64').slice(0, 16)}`,
          title: t.slice(0, 120),
          summary: t.slice(0, 300),
          source: 'ปภ.',
          category: 'thai-disaster',
          severity: /เตือน|ภัย|วิกฤต|ฉุกเฉิน/.test(t) ? 'high' : 'medium',
          eventLabel: 'ปภ. แจ้งเตือน',
          url: DDPM_WEB,
          publishedAt: isoNow(),
          lang: 'th',
        }));
      }
    }
    return parseDdpmHtml(html);
  } catch (_) {
    return [];
  }
}

// ─── TMD Earthquake Division ─────────────────────────────────────────────────
function parseTmdEqHtml(html) {
  const items = [];
  const thaiRe = /[\u0E00-\u0E7F]{3,}/g;
  const rows = html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
  for (const row of rows) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) => cleanText(c[1]).trim());
    if (cells.length < 3) continue;
    const text = cells.join(' ');
    const magMatch = text.match(/(\d+\.?\d*)\s*(ริกเตอร์|ML|Mw|M\b)/i);
    const mag = magMatch ? parseFloat(magMatch[1]) : null;
    if (!mag && !thaiRe.test(text)) continue;
    const title = cells.find((c) => /[\u0E00-\u0E7F]/.test(c) || c.match(/\d+\.\d+/)) || text.slice(0, 80);
    items.push({
      id: `tmdeq-${Buffer.from(text.slice(0, 40)).toString('base64').slice(0, 16)}`,
      title: mag ? `แผ่นดินไหว M${mag.toFixed(1)} · ${title.slice(0, 80)}` : title.slice(0, 120),
      summary: text.slice(0, 200),
      source: 'TMD แผ่นดินไหว',
      category: 'earthquake',
      severity: mag && mag >= 5 ? 'medium' : 'normal',
      eventLabel: 'แผ่นดินไหว',
      magnitude: mag,
      url: TMD_EQ_WEB,
      publishedAt: isoNow(),
      lang: 'th',
    });
    if (items.length >= 8) break;
  }
  return items;
}

async function fetchTmdEqPage() {
  try {
    const htmlHeaders = {
      Accept: 'text/html,*/*',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept-Language': 'th-TH,th;q=0.9',
    };
    const html = await fetchText(TMD_EQ_WEB, { headers: htmlHeaders });
    if (!html) return [];
    const nextData = extractNextData(html);
    if (nextData) {
      const eqItems = [];
      deepFind(nextData, (v, path) => {
        if (typeof v === 'object' && v !== null && (v.magnitude || v.mag) && (v.location || v.place || v.region)) {
          const mag = parseFloat(v.magnitude || v.mag || 0);
          const place = v.location || v.place || v.region || 'ไม่ระบุ';
          eqItems.push({
            id: `tmdeq-nd-${Buffer.from(place.slice(0, 30)).toString('base64').slice(0, 16)}`,
            title: `แผ่นดินไหว M${mag.toFixed(1)} · ${place}`,
            summary: `TMD รายงานแผ่นดินไหว ขนาด ${mag.toFixed(1)} บริเวณ ${place}`,
            source: 'TMD แผ่นดินไหว',
            category: 'earthquake',
            severity: mag >= 5 ? 'medium' : 'normal',
            eventLabel: 'แผ่นดินไหว',
            magnitude: mag,
            url: TMD_EQ_WEB,
            publishedAt: v.datetime || v.date || v.time || isoNow(),
            lang: 'th',
          });
        }
      });
      if (eqItems.length) return eqItems.slice(0, 8);
    }
    return parseTmdEqHtml(html);
  } catch (_) {
    return [];
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const tasks = await Promise.allSettled([
    fetchJson(WEATHER_URL),            // 0
    fetchTmdFeeds(),                   // 1
    fetchGdacsAlerts(),                // 2
    fetchEarthquakes(),                // 3
    fetchReliefWebDisasters('thai'),   // 4
    fetchReliefWebDisasters('global'), // 5
    fetchClimateNews(),                // 6
    fetchTmdWebPages(),                // 7
    fetchEonetEvents(),                // 8
    fetchUsgsRegional(),               // 9
    fetchThaiPbsRss(),                 // 10
    fetchDdpmPage(),                   // 11
    fetchTmdEqPage(),                  // 12
  ]);

  const weatherRaw = tasks[0].status === 'fulfilled' ? tasks[0].value : null;
  const tmd = tasks[1].status === 'fulfilled' ? tasks[1].value : { forecast: [], warnings: [], storm: [], earthquake: [] };
  const gdacsRaw = tasks[2].status === 'fulfilled' ? tasks[2].value : [];
  const usgsRaw = tasks[3].status === 'fulfilled' ? tasks[3].value : [];
  const thaiDisastersRaw = tasks[4].status === 'fulfilled' ? tasks[4].value : [];
  const globalDisastersRaw = tasks[5].status === 'fulfilled' ? tasks[5].value : [];
  const climateRaw = tasks[6].status === 'fulfilled' ? tasks[6].value : [];
  const tmdWeb = tasks[7].status === 'fulfilled'
    ? tasks[7].value
    : { daily: [], sevenday: [], storm: [], regions: [] };
  const eonetRaw = tasks[8].status === 'fulfilled' ? tasks[8].value : [];
  const usgsRegionalRaw = tasks[9].status === 'fulfilled' ? tasks[9].value : [];
  const thaiPbsRaw = tasks[10].status === 'fulfilled' ? tasks[10].value : [];
  const ddpmRaw = tasks[11].status === 'fulfilled' ? tasks[11].value : [];
  const tmdEqRaw = tasks[12].status === 'fulfilled' ? tasks[12].value : [];

  // Batch all non-Thai content into a single translation call for better performance
  const allGlobalRaw = [
    ...gdacsRaw.map((item) => ({ ...item, _batch: 'gdacs' })),
    ...usgsRaw.map((item) => ({ ...item, _batch: 'usgs' })),
    ...globalDisastersRaw.map((item) => ({ ...item, _batch: 'globalDisasters' })),
    ...climateRaw.map((item) => ({ ...item, _batch: 'climate' })),
    ...eonetRaw.map((item) => ({ ...item, _batch: 'eonet' })),
    ...usgsRegionalRaw.map((item) => ({ ...item, _batch: 'usgsRegional' })),
  ];

  const allGlobalTranslated = await maybeTranslateItems(allGlobalRaw);

  const gdacsTranslated = allGlobalTranslated.filter((item) => item._batch === 'gdacs').map(({ _batch, ...item }) => item);
  const usgsTranslated = allGlobalTranslated.filter((item) => item._batch === 'usgs').map(({ _batch, ...item }) => item);
  const globalDisastersTranslated = allGlobalTranslated.filter((item) => item._batch === 'globalDisasters').map(({ _batch, ...item }) => item);
  const climateTranslated = allGlobalTranslated.filter((item) => item._batch === 'climate').map(({ _batch, ...item }) => item);
  const eonetTranslated = allGlobalTranslated.filter((item) => item._batch === 'eonet').map(({ _batch, ...item }) => item);
  const usgsRegionalTranslated = allGlobalTranslated.filter((item) => item._batch === 'usgsRegional').map(({ _batch, ...item }) => item);

  const weather = buildWeatherSummary(weatherRaw);

  // Merge TMD XML warnings with regional forecasts from web scrape
  const allTmdWarnings = [
    ...tmd.warnings.map(enrichItem),
    ...tmdWeb.regions.map(enrichItem),
    ...tmdWeb.daily.map(enrichItem),
  ];
  const thaiWarnings = prioritizeItems(allTmdWarnings, 10);

  // Merge TMD XML storms with web-scraped storm data (web may have richer details)
  const allTmdStorms = [
    ...tmd.storm.map(enrichItem),
    ...tmdWeb.storm.map(enrichItem),
  ];
  const thaiStorms = prioritizeItems(allTmdStorms, 8);
  const thaiEarthquakes = prioritizeItems([...tmd.earthquake.map(enrichItem), ...tmdEqRaw.map(enrichItem)], 10);
  const thaiDisasters = prioritizeItems([...thaiDisastersRaw.map(enrichItem), ...ddpmRaw.map(enrichItem)], 10);
  const thaiPbsItems = prioritizeItems(thaiPbsRaw.map(enrichItem), 8);
  const globalAlerts = prioritizeItems(gdacsTranslated.map(enrichItem), 10);
  const globalEarthquakes = prioritizeItems([...usgsTranslated.map(enrichItem), ...usgsRegionalTranslated.map(enrichItem)], 10);
  const globalDisasters = prioritizeItems(globalDisastersTranslated.map(enrichItem), 8);
  const climateItems = prioritizeItems(climateTranslated.map(enrichItem), 6);
  const eonetItems = prioritizeItems(eonetTranslated.map(enrichItem), 12);

  const topStories = prioritizeItems([
    ...thaiWarnings,
    ...thaiStorms,
    ...thaiDisasters,
    ...thaiPbsItems,
    ...globalAlerts,
    ...globalEarthquakes,
    ...globalDisasters,
    ...eonetItems.filter((i) => i.severity === 'high'),
  ], 12);

  const tmdWebCount = tmdWeb.daily.length + tmdWeb.sevenday.length + tmdWeb.storm.length + tmdWeb.regions.length;

  const sourceStatus = [
    normalizeSourceStatus('Open-Meteo', tasks[0], weather.days?.length || 0),
    normalizeSourceStatus('TMD XML', tasks[1], tmd.forecast.length + tmd.warnings.length + tmd.storm.length + tmd.earthquake.length),
    normalizeSourceStatus('TMD Web (พยากรณ์/เตือนภัย)', tasks[7], tmdWebCount),
    normalizeSourceStatus('GDACS', tasks[2], globalAlerts.length),
    normalizeSourceStatus('USGS', tasks[3], globalEarthquakes.length),
    normalizeSourceStatus('USGS Regional (SE Asia)', tasks[9], usgsRegionalTranslated.length),
    normalizeSourceStatus('ReliefWeb Thailand', tasks[4], thaiDisasters.length),
    normalizeSourceStatus('ReliefWeb Global', tasks[5], globalDisasters.length),
    normalizeSourceStatus('NASA Climate / WMO', tasks[6], climateItems.length),
    normalizeSourceStatus('NASA EONET', tasks[8], eonetItems.length),
    normalizeSourceStatus('Thai PBS', tasks[10], thaiPbsItems.length),
    normalizeSourceStatus('ปภ. (DDPM)', tasks[11], ddpmRaw.length),
    normalizeSourceStatus('TMD แผ่นดินไหว', tasks[12], tmdEqRaw.length),
  ];

  const deterministicDigest = buildDigest({
    weather,
    thaiWarnings,
    thaiStorms,
    gdacs: globalAlerts,
    usgs: globalEarthquakes,
    thaiDisasters,
    globalDisasters,
    sourceStatus,
  });

  const aiDigest = await maybeGenerateAiSummary({
    weather: weather.summary,
    thaiWarnings: thaiWarnings.slice(0, 4).map((item) => item.title),
    thaiStorms: thaiStorms.slice(0, 3).map((item) => item.title),
    thaiDisasters: thaiDisasters.slice(0, 4).map((item) => item.title),
    globalAlerts: globalAlerts.slice(0, 4).map((item) => `${item.eventLabel || ''} ${item.country || ''} ${item.title}`.trim()),
    earthquakes: globalEarthquakes.slice(0, 4).map((item) => item.title),
    climate: [],
  });

  const digest = aiDigest
    ? { ...deterministicDigest, headline: aiDigest.headline, bullets: aiDigest.bullets, mode: 'ai' }
    : { ...deterministicDigest, mode: 'rule-based' };

  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=300');

  return res.status(200).json({
    generatedAt: isoNow(),
    digest,
    weather,
    topStories,
    thailand: {
      forecast: tmd.forecast,
      warnings: thaiWarnings,
      storms: thaiStorms,
      earthquakes: thaiEarthquakes,
      disasters: thaiDisasters,
      ddpm: prioritizeItems(ddpmRaw.map(enrichItem), 8),
      thaiPbs: thaiPbsItems,
      tmdEq: prioritizeItems(tmdEqRaw.map(enrichItem), 8),
      webSevenday: prioritizeItems(tmdWeb.sevenday.map(enrichItem), 5),
    },
    global: {
      alerts: globalAlerts,
      earthquakes: globalEarthquakes,
      earthquakesRegional: usgsRegionalTranslated.map(enrichItem),
      disasters: globalDisasters,
      climate: climateItems,
      eonet: eonetItems,
    },
    sourceStatus,
    labels: {
      generatedAt: toThaiDateTime(isoNow()),
      weatherUpdatedFor: toThaiDate(isoNow()),
    },
  });
}
