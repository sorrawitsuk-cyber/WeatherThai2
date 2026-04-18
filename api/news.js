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

const MODEL_CANDIDATES = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
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
  warning: { emoji: '⚠️', gradient: 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)', kicker: 'ประกาศเตือน' },
  storm: { emoji: '🌧️', gradient: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)', kicker: 'พายุและฝน' },
  earthquake: { emoji: '🌋', gradient: 'linear-gradient(135deg, #f97316 0%, #b91c1c 100%)', kicker: 'แผ่นดินไหว' },
  'thai-disaster': { emoji: '📍', gradient: 'linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)', kicker: 'เหตุการณ์ในไทย' },
  'global-alert': { emoji: '🌐', gradient: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)', kicker: 'เตือนภัยโลก' },
  'global-disaster': { emoji: '🧭', gradient: 'linear-gradient(135deg, #0284c7 0%, #0f766e 100%)', kicker: 'เหตุการณ์สำคัญ' },
  weather: { emoji: '⛅', gradient: 'linear-gradient(135deg, #0ea5e9 0%, #14b8a6 100%)', kicker: 'พยากรณ์อากาศ' },
  climate: { emoji: '🌡️', gradient: 'linear-gradient(135deg, #059669 0%, #0369a1 100%)', kicker: 'ภูมิอากาศวิทยา' },
  enso: { emoji: '🌊', gradient: 'linear-gradient(135deg, #0284c7 0%, #7c3aed 100%)', kicker: 'เอลนีโญ่/ลานีญ่า' },
  default: { emoji: '📰', gradient: 'linear-gradient(135deg, #0f766e 0%, #0369a1 100%)', kicker: 'ข่าวเด่น' },
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
  const visualCategory =
    isEnso && item.category === 'climate'
      ? 'enso'
      : item.category === 'global-alert' && item.eventType === 'EQ'
        ? 'earthquake'
        : item.category;
  return {
    ...item,
    visual: buildVisual(visualCategory, item.title, {
      kicker: item.eventLabel || item.country || item.status || undefined,
    }),
  };
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
      const result = await client.getGenerativeModel({ model }).generateContent(prompt);
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

function buildDigest({ weather, tmd, gdacs, usgs, thaiDisasters, globalDisasters, sourceStatus }) {
  const warningTitles = (tmd.warnings || []).slice(0, 2).map((item) => item.title).filter(Boolean);
  const stormTitles = (tmd.storm || []).slice(0, 1).map((item) => item.title).filter(Boolean);
  const topGdacs = (gdacs || []).find((item) => item.severity === 'high') || gdacs?.[0];
  const topEarthquake = (usgs || [])[0];
  const thaiHeadline = thaiDisasters?.[0];
  const sourceFailures = sourceStatus.filter((entry) => entry.status !== 'ok').map((entry) => entry.label);

  const bullets = [];
  const thaiLines = [];

  if (warningTitles.length) thaiLines.push(`มีประกาศเตือนจากกรมอุตุนิยมวิทยา เช่น ${warningTitles.join(' / ')}`);
  if (stormTitles.length) thaiLines.push(`มีประเด็นติดตามพายุหรือสภาพอากาศสำคัญ: ${stormTitles[0]}`);
  if (!thaiLines.length) thaiLines.push('ยังไม่พบประกาศเตือนใหม่ที่เด่นมากจากกรมอุตุนิยมวิทยาในชุดข้อมูลล่าสุด');

  bullets.push(...thaiLines);

  if (topGdacs) bullets.push(`ต่างประเทศ: ${topGdacs.eventLabel} ใน${topGdacs.country || 'หลายพื้นที่'} ระดับ ${topGdacs.alertLevel || 'ติดตาม'}`);
  if (topEarthquake) bullets.push(`แผ่นดินไหวเด่นในสัปดาห์นี้: ${topEarthquake.title}`);
  if (thaiHeadline) bullets.push(`เหตุการณ์ในไทยล่าสุด: ${thaiHeadline.title}`);
  if (sourceFailures.length) bullets.push('บางข้อมูลอาจใช้เวลามากกว่าปกติ แต่ข่าวสำคัญยังแสดงได้ตามปกติ');

  return {
    title: 'สรุปข่าวอากาศและภัยพิบัติ',
    updatedAt: isoNow(),
    overview: {
      thaiWarningCount: tmd.warnings?.length || 0,
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
      const result = await client.getGenerativeModel({ model }).generateContent(prompt);
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

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const tasks = await Promise.allSettled([
    fetchJson(WEATHER_URL),
    fetchTmdFeeds(),
    fetchGdacsAlerts(),
    fetchEarthquakes(),
    fetchReliefWebDisasters('thai'),
    fetchReliefWebDisasters('global'),
    fetchClimateNews(),
  ]);

  const weatherRaw = tasks[0].status === 'fulfilled' ? tasks[0].value : null;
  const tmd = tasks[1].status === 'fulfilled' ? tasks[1].value : { forecast: [], warnings: [], storm: [], earthquake: [] };
  const gdacsRaw = tasks[2].status === 'fulfilled' ? tasks[2].value : [];
  const usgsRaw = tasks[3].status === 'fulfilled' ? tasks[3].value : [];
  const thaiDisastersRaw = tasks[4].status === 'fulfilled' ? tasks[4].value : [];
  const globalDisastersRaw = tasks[5].status === 'fulfilled' ? tasks[5].value : [];
  const climateRaw = tasks[6].status === 'fulfilled' ? tasks[6].value : [];

  // Batch all non-Thai content into a single translation call for better performance
  const allGlobalRaw = [
    ...gdacsRaw.map((item) => ({ ...item, _batch: 'gdacs' })),
    ...usgsRaw.map((item) => ({ ...item, _batch: 'usgs' })),
    ...globalDisastersRaw.map((item) => ({ ...item, _batch: 'globalDisasters' })),
    ...climateRaw.map((item) => ({ ...item, _batch: 'climate' })),
  ];

  const allGlobalTranslated = await maybeTranslateItems(allGlobalRaw);

  const gdacsTranslated = allGlobalTranslated.filter((item) => item._batch === 'gdacs').map(({ _batch, ...item }) => item);
  const usgsTranslated = allGlobalTranslated.filter((item) => item._batch === 'usgs').map(({ _batch, ...item }) => item);
  const globalDisastersTranslated = allGlobalTranslated.filter((item) => item._batch === 'globalDisasters').map(({ _batch, ...item }) => item);
  const climateTranslated = allGlobalTranslated.filter((item) => item._batch === 'climate').map(({ _batch, ...item }) => item);

  const weather = buildWeatherSummary(weatherRaw);
  const thaiDisasters = thaiDisastersRaw.map(enrichItem);
  const globalAlerts = gdacsTranslated.map(enrichItem);
  const globalEarthquakes = usgsTranslated.map(enrichItem);
  const globalDisasters = globalDisastersTranslated.map(enrichItem);
  const climateItems = climateTranslated.map(enrichItem);

  const sourceStatus = [
    normalizeSourceStatus('Open-Meteo', tasks[0], weather.days?.length || 0),
    normalizeSourceStatus('TMD', tasks[1], tmd.forecast.length + tmd.warnings.length + tmd.storm.length + tmd.earthquake.length),
    normalizeSourceStatus('GDACS', tasks[2], globalAlerts.length),
    normalizeSourceStatus('USGS', tasks[3], globalEarthquakes.length),
    normalizeSourceStatus('ReliefWeb Thailand', tasks[4], thaiDisasters.length),
    normalizeSourceStatus('ReliefWeb Global', tasks[5], globalDisasters.length),
    normalizeSourceStatus('NASA Climate / WMO', tasks[6], climateItems.length),
  ];

  const deterministicDigest = buildDigest({
    weather,
    tmd,
    gdacs: globalAlerts,
    usgs: globalEarthquakes,
    thaiDisasters,
    globalDisasters,
    sourceStatus,
  });

  const aiDigest = await maybeGenerateAiSummary({
    weather: weather.summary,
    thaiWarnings: tmd.warnings.slice(0, 4).map((item) => item.title),
    thaiStorms: tmd.storm.slice(0, 3).map((item) => item.title),
    thaiDisasters: thaiDisasters.slice(0, 4).map((item) => item.title),
    globalAlerts: globalAlerts.slice(0, 4).map((item) => `${item.eventLabel || ''} ${item.country || ''} ${item.title}`.trim()),
    earthquakes: globalEarthquakes.slice(0, 4).map((item) => item.title),
    climate: climateItems.slice(0, 3).map((item) => item.title),
  });

  const digest = aiDigest
    ? { ...deterministicDigest, headline: aiDigest.headline, bullets: aiDigest.bullets, mode: 'ai' }
    : { ...deterministicDigest, mode: 'rule-based' };

  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=300');

  return res.status(200).json({
    generatedAt: isoNow(),
    digest,
    weather,
    thailand: {
      forecast: tmd.forecast,
      warnings: tmd.warnings.map(enrichItem),
      storms: tmd.storm.map(enrichItem),
      earthquakes: tmd.earthquake.map(enrichItem),
      disasters: thaiDisasters,
    },
    global: {
      alerts: globalAlerts,
      earthquakes: globalEarthquakes,
      disasters: globalDisasters,
      climate: climateItems,
    },
    sourceStatus,
    labels: {
      generatedAt: toThaiDateTime(isoNow()),
      weatherUpdatedFor: toThaiDate(isoNow()),
    },
  });
}
