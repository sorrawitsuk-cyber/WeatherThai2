import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  ChevronLeft,
  ChevronRight,
  CloudRain,
  ExternalLink,
  Flame,
  Newspaper,
  RefreshCw,
  Search,
  ShieldAlert,
  ThermometerSun,
  Waves,
} from 'lucide-react';
import LoadingScreen from '../components/LoadingScreen';

const categoryOptions = [
  { id: 'all', label: 'ทั้งหมด', icon: Search, color: '#2563eb' },
  { id: 'warning', label: 'เตือนภัย', icon: ShieldAlert, color: '#ef4444' },
  { id: 'news', label: 'ข่าวสาร', icon: Newspaper, color: '#475569' },
  { id: 'weather', label: 'สภาพอากาศ', icon: CloudRain, color: '#0ea5e9' },
  { id: 'storm', label: 'พายุ', icon: Waves, color: '#2563eb' },
  { id: 'rain', label: 'ฝนตกหนัก', icon: CloudRain, color: '#2563eb' },
  { id: 'flood', label: 'น้ำท่วม', icon: Waves, color: '#0f766e' },
  { id: 'quake', label: 'แผ่นดินไหว', icon: AlertTriangle, color: '#d97706' },
  { id: 'fire', label: 'ไฟป่า', icon: Flame, color: '#dc2626' },
  { id: 'climate', label: 'Climate', icon: ThermometerSun, color: '#16a34a' },
];

const topicMeta = {
  warning: { label: 'เตือนภัย', icon: '⚠️', color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)' },
  news: { label: 'ข่าวสาร', icon: '📰', color: '#475569', gradient: 'linear-gradient(135deg, #475569 0%, #0f172a 100%)' },
  weather: { label: 'สภาพอากาศ', icon: '⛅', color: '#0ea5e9', gradient: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)' },
  storm: { label: 'พายุ', icon: '🌪️', color: '#2563eb', gradient: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' },
  rain: { label: 'ฝนตกหนัก', icon: '🌧️', color: '#2563eb', gradient: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)' },
  flood: { label: 'น้ำท่วม', icon: '🌊', color: '#0f766e', gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0f766e 100%)' },
  quake: { label: 'แผ่นดินไหว', icon: '🌋', color: '#d97706', gradient: 'linear-gradient(135deg, #f97316 0%, #b45309 100%)' },
  fire: { label: 'ไฟป่า', icon: '🔥', color: '#dc2626', gradient: 'linear-gradient(135deg, #f97316 0%, #b91c1c 100%)' },
  climate: { label: 'Climate', icon: '🌍', color: '#16a34a', gradient: 'linear-gradient(135deg, #16a34a 0%, #0f766e 100%)' },
  air: { label: 'คุณภาพอากาศ', icon: '🌫️', color: '#7c3aed', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' },
};

const sourceLinks = {
  'Open-Meteo': 'https://open-meteo.com/',
  'TMD XML': 'https://www.tmd.go.th/',
  'TMD Web (พยากรณ์/เตือนภัย)': 'https://www.tmd.go.th/',
  GDACS: 'https://www.gdacs.org/',
  USGS: 'https://earthquake.usgs.gov/',
  'USGS Regional (SE Asia)': 'https://earthquake.usgs.gov/',
  'ReliefWeb Thailand': 'https://reliefweb.int/country/tha',
  'ReliefWeb Global': 'https://reliefweb.int/',
  'NASA Climate / WMO': 'https://climate.nasa.gov/',
  'NASA EONET': 'https://eonet.gsfc.nasa.gov/',
  'Thai PBS': 'https://www.thaipbs.or.th/',
  'ปภ. (DDPM)': 'https://www.disaster.go.th/',
  'TMD แผ่นดินไหว': 'https://earthquake.tmd.go.th/',
  'NOAA CPC ENSO': 'https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.html',
  'IRI ENSO Forecast': 'https://iri.columbia.edu/our-expertise/climate/forecasts/enso/current/',
};

const agencyCards = [
  { label: 'กรมอุตุนิยมวิทยา', short: 'TMD', key: 'TMD XML', url: 'https://www.tmd.go.th/' },
  { label: 'กรมป้องกันและบรรเทาสาธารณภัย', short: 'DDPM', key: 'ปภ. (DDPM)', url: 'https://www.disaster.go.th/' },
  { label: 'USGS', short: 'USGS', key: 'USGS', url: 'https://earthquake.usgs.gov/' },
  { label: 'NASA EONET', short: 'EONET', key: 'NASA EONET', url: 'https://eonet.gsfc.nasa.gov/' },
];

const defaultAlertPrefs = {
  push: true,
  email: false,
  line: true,
  sms: false,
};

const thaiProvinceNames = [
  'กรุงเทพมหานคร', 'กระบี่', 'กาญจนบุรี', 'กาฬสินธุ์', 'กำแพงเพชร', 'ขอนแก่น', 'จันทบุรี', 'ฉะเชิงเทรา', 'ชลบุรี', 'ชัยนาท',
  'ชัยภูมิ', 'ชุมพร', 'เชียงราย', 'เชียงใหม่', 'ตรัง', 'ตราด', 'ตาก', 'นครนายก', 'นครปฐม', 'นครพนม', 'นครราชสีมา',
  'นครศรีธรรมราช', 'นครสวรรค์', 'นนทบุรี', 'นราธิวาส', 'น่าน', 'บึงกาฬ', 'บุรีรัมย์', 'ปทุมธานี', 'ประจวบคีรีขันธ์',
  'ปราจีนบุรี', 'ปัตตานี', 'พระนครศรีอยุธยา', 'พะเยา', 'พังงา', 'พัทลุง', 'พิจิตร', 'พิษณุโลก', 'เพชรบุรี', 'เพชรบูรณ์',
  'แพร่', 'ภูเก็ต', 'มหาสารคาม', 'มุกดาหาร', 'แม่ฮ่องสอน', 'ยโสธร', 'ยะลา', 'ร้อยเอ็ด', 'ระนอง', 'ระยอง', 'ราชบุรี',
  'ลพบุรี', 'ลำปาง', 'ลำพูน', 'เลย', 'ศรีสะเกษ', 'สกลนคร', 'สงขลา', 'สตูล', 'สมุทรปราการ', 'สมุทรสงคราม', 'สมุทรสาคร',
  'สระแก้ว', 'สระบุรี', 'สิงห์บุรี', 'สุโขทัย', 'สุพรรณบุรี', 'สุราษฎร์ธานี', 'สุรินทร์', 'หนองคาย', 'หนองบัวลำภู',
  'อ่างทอง', 'อำนาจเจริญ', 'อุดรธานี', 'อุตรดิตถ์', 'อุทัยธานี', 'อุบลราชธานี',
];

const englishProvinceAliases = {
  bangkok: 'กรุงเทพมหานคร',
  krabi: 'กระบี่',
  kanchanaburi: 'กาญจนบุรี',
  kalasin: 'กาฬสินธุ์',
  'kamphaeng phet': 'กำแพงเพชร',
  'khon kaen': 'ขอนแก่น',
  chanthaburi: 'จันทบุรี',
  'chachoengsao': 'ฉะเชิงเทรา',
  'chon buri': 'ชลบุรี',
  chonburi: 'ชลบุรี',
  'chai nat': 'ชัยนาท',
  chainat: 'ชัยนาท',
  chaiyaphum: 'ชัยภูมิ',
  chumphon: 'ชุมพร',
  'chiang rai': 'เชียงราย',
  'chiang mai': 'เชียงใหม่',
  trang: 'ตรัง',
  trat: 'ตราด',
  tak: 'ตาก',
  'nakhon nayok': 'นครนายก',
  'nakhon pathom': 'นครปฐม',
  'nakhon phanom': 'นครพนม',
  'nakhon ratchasima': 'นครราชสีมา',
  'nakhon si thammarat': 'นครศรีธรรมราช',
  'nakhon sawan': 'นครสวรรค์',
  nonthaburi: 'นนทบุรี',
  narathiwat: 'นราธิวาส',
  nan: 'น่าน',
  'bueng kan': 'บึงกาฬ',
  buriram: 'บุรีรัมย์',
  'buri ram': 'บุรีรัมย์',
  'pathum thani': 'ปทุมธานี',
  'prachuap khiri khan': 'ประจวบคีรีขันธ์',
  prachinburi: 'ปราจีนบุรี',
  'prachin buri': 'ปราจีนบุรี',
  pattani: 'ปัตตานี',
  'phra nakhon si ayutthaya': 'พระนครศรีอยุธยา',
  ayutthaya: 'พระนครศรีอยุธยา',
  phayao: 'พะเยา',
  phangnga: 'พังงา',
  'phang nga': 'พังงา',
  phatthalung: 'พัทลุง',
  phichit: 'พิจิตร',
  phitsanulok: 'พิษณุโลก',
  phetchaburi: 'เพชรบุรี',
  phetchabun: 'เพชรบูรณ์',
  phrae: 'แพร่',
  phuket: 'ภูเก็ต',
  'maha sarakham': 'มหาสารคาม',
  mukdahan: 'มุกดาหาร',
  'mae hong son': 'แม่ฮ่องสอน',
  yasothon: 'ยโสธร',
  yala: 'ยะลา',
  'roi et': 'ร้อยเอ็ด',
  ranong: 'ระนอง',
  rayong: 'ระยอง',
  ratchaburi: 'ราชบุรี',
  lopburi: 'ลพบุรี',
  'lop buri': 'ลพบุรี',
  lampang: 'ลำปาง',
  lamphun: 'ลำพูน',
  loei: 'เลย',
  'si sa ket': 'ศรีสะเกษ',
  sisaket: 'ศรีสะเกษ',
  'sakon nakhon': 'สกลนคร',
  songkhla: 'สงขลา',
  satun: 'สตูล',
  'samut prakan': 'สมุทรปราการ',
  'samut songkhram': 'สมุทรสงคราม',
  'samut sakhon': 'สมุทรสาคร',
  'sa kaeo': 'สระแก้ว',
  saraburi: 'สระบุรี',
  'sing buri': 'สิงห์บุรี',
  singburi: 'สิงห์บุรี',
  sukhothai: 'สุโขทัย',
  suphanburi: 'สุพรรณบุรี',
  'suphan buri': 'สุพรรณบุรี',
  'surat thani': 'สุราษฎร์ธานี',
  surin: 'สุรินทร์',
  'nong khai': 'หนองคาย',
  'nong bua lamphu': 'หนองบัวลำภู',
  'ang thong': 'อ่างทอง',
  'amnat charoen': 'อำนาจเจริญ',
  'udon thani': 'อุดรธานี',
  uttaradit: 'อุตรดิตถ์',
  'uthai thani': 'อุทัยธานี',
  'ubon ratchathani': 'อุบลราชธานี',
};

function extractThaiProvinces(text = '', limit = 18) {
  const value = String(text || '');
  const found = [];
  const add = (province) => {
    if (province && !found.includes(province)) found.push(province);
  };

  thaiProvinceNames.forEach((province) => {
    if (value.includes(province) || value.includes(`จังหวัด${province}`)) add(province);
  });

  Object.entries(englishProvinceAliases)
    .sort((a, b) => b[0].length - a[0].length)
    .forEach(([englishName, thaiName]) => {
      const pattern = new RegExp(`(^|[^a-z])${englishName.replace(/\s+/g, '\\s+')}(?=[^a-z]|$)`, 'i');
      if (pattern.test(value)) add(thaiName);
    });

  return found.slice(0, limit);
}

const ensoOutlook = {
  updatedAt: '26 เม.ย. 2569',
  status: 'ENSO-neutral',
  alert: 'El Niño Watch',
  nino34: '-0.2°C',
  sourceNote: 'อ้างอิง NOAA CPC 9 เม.ย. 2569 และ IRI 20 เม.ย. 2569',
  summary:
    'มหาสมุทรแปซิฟิกเขตร้อนกลับสู่ภาวะเป็นกลางแล้ว แต่สัญญาณใต้ผิวน้ำและลมตะวันตกทำให้โอกาสเกิดเอลนีโญเพิ่มขึ้นชัดเจนตั้งแต่ช่วงกลางปี 2569',
  forecast: [
    { label: 'ตอนนี้', value: 'เป็นกลาง', detail: 'Niño 3.4 ล่าสุดราว -0.2°C', color: '#2563eb' },
    { label: 'เม.ย.-มิ.ย.', value: 'NOAA: เป็นกลาง 80%', detail: 'IRI มองเอลนีโญเริ่มนำ 70%', color: '#0ea5e9' },
    { label: 'พ.ค.-ก.ค.', value: 'เอลนีโญ 61%', detail: 'NOAA ระบุมีแนวโน้มเริ่มก่อตัว', color: '#f97316' },
    { label: 'ปลายปี 2569', value: 'เอลนีโญเด่น', detail: 'IRI ให้โอกาสราว 88-94%', color: '#ef4444' },
  ],
  impacts: [
    {
      title: 'ฝนและฤดูมรสุม',
      detail: 'ช่วงที่เอลนีโญเริ่มก่อตัวมักทำให้ฝนในไทยกระจายตัวไม่สม่ำเสมอ บางพื้นที่อาจมีช่วงฝนทิ้งช่วงยาวขึ้น แต่ยังมีฝนหนักเฉพาะจุดได้จากมรสุมและพายุ จึงต้องดูเรดาร์และประกาศกรมอุตุควบคู่กัน',
      color: '#2563eb',
    },
    {
      title: 'ความร้อนและสุขภาพ',
      detail: 'ถ้าเอลนีโญชัดขึ้นในครึ่งหลังของปี ความเสี่ยงวันที่ร้อนจัดและค่าดัชนีความร้อนสูงจะเพิ่มขึ้น โดยเฉพาะเมืองใหญ่ ภาคกลาง ภาคเหนือ และพื้นที่ในเมืองที่สะสมความร้อนง่าย',
      color: '#ef4444',
    },
    {
      title: 'น้ำต้นทุนและเกษตร',
      detail: 'ฝนที่แปรปรวนอาจกระทบปริมาณน้ำในเขื่อน แหล่งน้ำชุมชน และรอบเพาะปลูก พื้นที่เกษตรควรติดตามฝนสะสมรายสัปดาห์มากกว่าดูฝนรายวันเพียงวันเดียว',
      color: '#0f766e',
    },
    {
      title: 'ฝุ่น PM2.5 และไฟป่า',
      detail: 'หากปลายปีเข้าสู่เอลนีโญและอากาศแห้งขึ้น ฤดูฝุ่นช่วงปลายปีถึงต้นปีถัดไปอาจกดดันมากขึ้น โดยเฉพาะภาคเหนือและพื้นที่ที่มีการเผาในที่โล่ง',
      color: '#f97316',
    },
    {
      title: 'ลานีญายังไม่ใช่ฉากหลัก',
      detail: 'ชุดคาดการณ์ล่าสุดให้โอกาสลานีญาต่ำมาก จึงยังไม่ควรวางแผนโดยคาดว่าจะมีฝนมากจากลานีญา แต่ควรเตรียมรับความผันผวนและความร้อนที่อาจเพิ่มขึ้น',
      color: '#7c3aed',
    },
  ],
};

const Panel = React.forwardRef(({ children, style }, ref) => (
  <section
    ref={ref}
    style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: 24,
      boxShadow: '0 18px 42px rgba(15, 23, 42, 0.06)',
      ...style,
    }}
  >
    {children}
  </section>
));

Panel.displayName = 'NewsPanel';

function toThaiDateTime(value) {
  if (!value) return 'ไม่ระบุเวลา';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function toThaiShortDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function getSeverityMeta(level = 'normal') {
  if (level === 'high') return { label: 'ระดับสูง', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' };
  if (level === 'medium') return { label: 'ระดับปานกลาง', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' };
  return { label: 'ระดับติดตาม', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)' };
}

function inferTopic(item) {
  const text = `${item.title || ''} ${item.summary || ''} ${item.category || ''} ${item.eventLabel || ''}`.toLowerCase();
  if (/pm2\.?5|aqi|ฝุ่น|หมอกควัน|dust|haze/.test(text)) return 'air';
  if (/heat|คลื่นความร้อน|อากาศร้อน|อุณหภูมิสูง/.test(text)) return 'warning';
  if (/climate|โลกร้อน|ภูมิอากาศ|el nino|la nina|enso/.test(text)) return 'climate';
  if (/earthquake|แผ่นดินไหว/.test(text) || item.category === 'earthquake') return 'quake';
  if (/flood|น้ำท่วม|น้ำป่า|ท่วมฉับพลัน/.test(text)) return 'flood';
  if (/wildfire|ไฟป่า/.test(text)) return 'fire';
  if (/storm|typhoon|cyclone|พายุ|มรสุม|ลมแรง/.test(text) || item.category === 'storm') return 'storm';
  if (/rain|ฝน|ฝนตกหนัก/.test(text)) return 'rain';
  if (/forecast|พยากรณ์|weather|อากาศ/.test(text) || item.category === 'weather') return 'weather';
  if (['warning', 'thai-disaster', 'global-alert', 'global-disaster'].includes(item.category)) return 'warning';
  return 'news';
}

function deriveArea(item) {
  const text = `${item.title || ''} ${item.summary || ''} ${item.country || ''}`;
  if (item.country) return item.country;
  const thaiMatch = text.match(/(กรุงเทพมหานคร|ภาคเหนือ|ภาคตะวันออกเฉียงเหนือ|ภาคกลาง|ภาคตะวันออก|ภาคใต้|ภาคตะวันตก|อ่าวไทย|ทะเลอันดามัน|จังหวัด[^\s,]+)/);
  if (thaiMatch) return thaiMatch[1];
  const globalMatch = text.match(/(Myanmar|Japan|Laos|Cambodia|Vietnam|China|Philippines|Indonesia|Malaysia|Thailand|เอเชีย)/i);
  if (globalMatch) return globalMatch[1];
  return 'หลายพื้นที่';
}

function getNewsScope(item) {
  const source = `${item.source || ''}`.toLowerCase();
  const text = `${item.title || ''} ${item.summary || ''} ${item.country || ''} ${item.area || ''}`.toLowerCase();
  if (/tmd|open-meteo|กรมอุตุ|thai pbs|ปภ|ddpm|reliefweb thailand|thailand|ประเทศไทย|กรุงเทพ|ภาคเหนือ|ภาคกลาง|ภาคใต้|อ่าวไทย|อันดามัน/.test(`${source} ${text}`)) {
    return 'thai';
  }
  return 'global';
}

function normalizeDedupeText(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\b(24|48|72)\s*(ชั่วโมง|hrs?|hours?)\b/gi, '')
    .replace(/\b(ภาค|จังหวัด|province|region)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function translateDisplayText(text = '') {
  const value = String(text || '').trim();
  if (!/[A-Za-z]/.test(value) || /[\u0E00-\u0E7F]/.test(value)) return value;

  return value
    .replace(/\bSignificant earthquake\b/gi, 'แผ่นดินไหวสำคัญ')
    .replace(/\bEarthquake\b/gi, 'แผ่นดินไหว')
    .replace(/\bTropical Cyclone\b/gi, 'พายุหมุนเขตร้อน')
    .replace(/\bFloods?\b/gi, 'น้ำท่วม')
    .replace(/\bWildfires?\b/gi, 'ไฟป่า')
    .replace(/\bVolcano\b/gi, 'ภูเขาไฟ')
    .replace(/\bDrought\b/gi, 'ภัยแล้ง')
    .replace(/\bLandslide\b/gi, 'ดินถล่ม')
    .replace(/\bHeat Wave\b/gi, 'คลื่นความร้อน')
    .replace(/\bmagnitude\b/gi, 'ขนาด')
    .replace(/\bnear\b/gi, 'ใกล้')
    .replace(/\bof\b/gi, 'ของ')
    .replace(/\bJapan\b/gi, 'ญี่ปุ่น')
    .replace(/\bMyanmar\b/gi, 'เมียนมา')
    .replace(/\bLaos\b/gi, 'ลาว')
    .replace(/\bCambodia\b/gi, 'กัมพูชา')
    .replace(/\bVietnam\b/gi, 'เวียดนาม')
    .replace(/\bChina\b/gi, 'จีน')
    .replace(/\bPhilippines\b/gi, 'ฟิลิปปินส์')
    .replace(/\bIndonesia\b/gi, 'อินโดนีเซีย')
    .replace(/\bMalaysia\b/gi, 'มาเลเซีย')
    .replace(/\bThailand\b/gi, 'ไทย')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanDdpmItem(item) {
  if (item.source !== 'ปภ.') return item;
  const rawTitle = String(item.title || '').trim();
  const stripped = rawTitle.replace(/^\d+\s*[:：-]\s*/, '').trim();
  const isAgencyOnly = /กรมป้องกันและบรรเทาสาธารณภัย|กระทรวงมหาดไทย/.test(stripped) && stripped.length < 90;
  const title = isAgencyOnly ? 'ประกาศจากกรมป้องกันและบรรเทาสาธารณภัย' : (stripped || 'ประกาศจาก ปภ.');
  const summary = item.summary && item.summary !== rawTitle
    ? item.summary
    : 'ปภ. เผยแพร่ประกาศหรือข้อมูลสถานการณ์ล่าสุด ควรเปิดแหล่งข่าวต้นทางเพื่อตรวจสอบรายละเอียดพื้นที่ เวลา และคำแนะนำอย่างเป็นทางการ';

  return { ...item, title, summary, eventLabel: item.eventLabel || 'ปภ. แจ้งเตือน' };
}

function buildTmdBrief(item) {
  if (item.source !== 'TMD') return null;
  const text = `${item.title || ''} ${item.summary || ''} ${item.rawSummary || ''}`;
  const provinces = extractThaiProvinces(text, 14);
  const areas = [...new Set((text.match(/กรุงเทพมหานคร|ภาคเหนือ|ภาคตะวันออกเฉียงเหนือ|ภาคกลาง|ภาคตะวันออก|ภาคใต้|ภาคตะวันตก|อ่าวไทย|ทะเลอันดามัน/g) || []))]
    .slice(0, 6);
  const hazards = [
    /ฝนฟ้าคะนอง/.test(text) && 'ฝนฟ้าคะนอง',
    /ลมกระโชก/.test(text) && 'ลมกระโชกแรง',
    /ฝนตกหนัก|ฝนหนัก/.test(text) && 'ฝนตกหนัก',
    /คลื่นสูง|ทะเลมีคลื่น/.test(text) && 'คลื่นลมแรง',
    /ร้อน|อุณหภูมิสูง/.test(text) && 'อากาศร้อน',
  ].filter(Boolean);
  const advice = /ฝนฟ้าคะนอง|ลมกระโชก|ฝนตกหนัก/.test(text)
    ? 'หลีกเลี่ยงพื้นที่โล่งแจ้ง ตรวจสอบเรดาร์ฝน และเผื่อเวลาเดินทาง'
    : 'ติดตามประกาศฉบับล่าสุดก่อนวางแผนกิจกรรมกลางแจ้ง';

  return {
    areas: areas.length ? areas : [item.area || 'หลายพื้นที่'],
    provinces,
    hazards: hazards.length ? hazards : [item.label || 'สภาพอากาศ'],
    advice,
  };
}

function isTmdRegionalForecast(item) {
  return item?.source === 'TMD' && /^พยากรณ์(ภาค|กรุงเทพมหานคร)/.test(item.title || '');
}

function mergeTmdRegionalForecasts(items) {
  const regionalItems = items.filter(isTmdRegionalForecast);
  if (regionalItems.length <= 1) return items;

  const otherItems = items.filter((item) => !isTmdRegionalForecast(item));
  const allText = regionalItems.map((item) => `${item.title} ${item.summary}`).join(' ');
  const regionOrder = ['ภาคเหนือ', 'ภาคตะวันออกเฉียงเหนือ', 'ภาคกลาง', 'ภาคตะวันออก', 'ภาคใต้', 'ภาคตะวันตก', 'อ่าวไทย', 'ทะเลอันดามัน'];
  const regions = regionOrder.filter((region) => allText.includes(region));
  const provinces = extractThaiProvinces(allText, 24);
  const hazards = [
    /ฝนฟ้าคะนอง/.test(allText) && 'ฝนฟ้าคะนอง',
    /ลมกระโชก/.test(allText) && 'ลมกระโชกแรง',
    /ฝนตกหนัก|ฝนหนัก/.test(allText) && 'ฝนตกหนัก',
    /คลื่นสูง|ทะเลมีคลื่น/.test(allText) && 'คลื่นลมแรง',
    /ร้อน|อุณหภูมิสูง/.test(allText) && 'อากาศร้อน',
  ].filter(Boolean);
  const latest = [...regionalItems].sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime())[0];
  const merged = {
    ...latest,
    id: `tmd-regional-forecast-${latest.publishedAt || 'latest'}`,
    title: 'พยากรณ์อากาศประเทศไทย 24 ชั่วโมงข้างหน้า',
    summary: `กรมอุตุนิยมวิทยารวมพยากรณ์รายภาค ${regions.length ? `ครอบคลุม ${regions.join(', ')}` : 'หลายพื้นที่'}${hazards.length ? ` โดยประเด็นหลักคือ ${hazards.join(', ')}` : ''}`,
    area: regions.length ? regions.join(', ') : 'หลายพื้นที่',
    tmdBrief: {
      areas: regions.length ? regions : ['หลายพื้นที่'],
      provinces,
      hazards: hazards.length ? hazards : ['สภาพอากาศเปลี่ยนแปลง'],
      advice: /ฝนฟ้าคะนอง|ลมกระโชก|ฝนตกหนัก/.test(allText)
        ? 'หลีกเลี่ยงพื้นที่โล่งแจ้ง ตรวจสอบเรดาร์ฝน และเผื่อเวลาเดินทาง'
        : 'ติดตามประกาศฉบับล่าสุดก่อนวางแผนกิจกรรมกลางแจ้ง',
    },
  };

  return [merged, ...otherItems];
}

function normalizeItem(item, forcedType) {
  if (!item?.title) return null;
  const cleanedItem = cleanDdpmItem({
    ...item,
    title: translateDisplayText(item.title),
    summary: translateDisplayText(item.summary || item.description || ''),
  });
  const topic = inferTopic(item);
  const meta = topicMeta[topic] || topicMeta.news;
  const severity = cleanedItem.severity || 'normal';
  const alertLike = ['warning', 'storm', 'earthquake', 'thai-disaster', 'global-alert', 'global-disaster'].includes(cleanedItem.category) || severity !== 'normal';
  const type = forcedType || (alertLike ? 'warning' : 'news');
  const normalized = {
    id: cleanedItem.id || `${cleanedItem.source || 'source'}-${cleanedItem.title}`,
    title: cleanedItem.title,
    summary: cleanedItem.summary || 'ไม่มีรายละเอียดเพิ่มเติม',
    rawSummary: cleanedItem.rawSummary || '',
    source: cleanedItem.source || 'แหล่งข่าว',
    url: cleanedItem.url || cleanedItem.link || '',
    publishedAt: cleanedItem.publishedAt || cleanedItem.time || cleanedItem.date || '',
    severity,
    severityMeta: getSeverityMeta(severity),
    topic,
    type,
    area: deriveArea(cleanedItem),
    visual: cleanedItem.visual || {},
    icon: cleanedItem.visual?.emoji || meta.icon,
    gradient: cleanedItem.visual?.gradient || meta.gradient,
    kicker: cleanedItem.visual?.kicker || meta.label,
    label: meta.label,
    color: meta.color,
    eventLabel: cleanedItem.eventLabel || meta.label,
    priorityScore: cleanedItem.priorityScore || 0,
    scope: getNewsScope(cleanedItem),
  };
  return { ...normalized, tmdBrief: buildTmdBrief(normalized) };
}

function dedupeItems(items) {
  const seen = new Set();
  const fuzzyTitles = [];
  return items.filter((item) => {
    const normalizedTitle = normalizeDedupeText(item.title);
    const titleLead = normalizedTitle.split(' ').slice(0, 8).join(' ');
    const key = `${item.source}-${titleLead}`;
    if (seen.has(key)) return false;
    if (fuzzyTitles.some((title) => title && titleLead && (title.includes(titleLead) || titleLead.includes(title)))) {
      return false;
    }
    seen.add(key);
    fuzzyTitles.push(titleLead);
    return true;
  });
}

function matchesCategory(item, activeCategory) {
  if (activeCategory === 'all') return true;
  if (activeCategory === 'warning') return item.type === 'warning';
  if (activeCategory === 'news') return item.type === 'news';
  return item.topic === activeCategory;
}

function includesQuery(item, query) {
  if (!query) return true;
  const haystack = `${item.title} ${item.summary} ${item.source} ${item.area} ${item.label}`.toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function openExternal(url) {
  if (!url || typeof window === 'undefined') return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export default function NewsPage() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [activeCategory, setActiveCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [feed, setFeed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [selectedItem, setSelectedItem] = useState(null);
  const [currentHero, setCurrentHero] = useState(0);
  const [alertPrefs, setAlertPrefs] = useState(() => {
    try {
      const saved = window.localStorage.getItem('air4thai-news-alert-prefs');
      return saved ? { ...defaultAlertPrefs, ...JSON.parse(saved) } : defaultAlertPrefs;
    } catch {
      return defaultAlertPrefs;
    }
  });

  const heroRef = useRef(null);
  const detailRef = useRef(null);
  const newsRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    window.localStorage.setItem('air4thai-news-alert-prefs', JSON.stringify(alertPrefs));
  }, [alertPrefs]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadFeed() {
      setLoading(true);
      setError('');
      try {
        const endpoint = `/api/news?_fresh=${refreshToken || Date.now()}`;
        const response = await fetch(endpoint, {
          signal: controller.signal,
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) {
          throw new Error(`โหลดข่าวไม่สำเร็จ (${response.status})`);
        }
        const payload = await response.json();
        if (!active) return;
        setFeed(payload);
      } catch (loadError) {
        if (loadError.name === 'AbortError') return;
        if (!active) return;
        setError(loadError.message || 'ไม่สามารถโหลดข่าวจากแหล่งข้อมูลได้');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadFeed();
    return () => {
      active = false;
      controller.abort();
    };
  }, [refreshToken]);

  const normalizedAlerts = useMemo(() => {
    if (!feed) return [];
    const items = dedupeItems(
      [
        ...(feed.thailand?.warnings || []).map((item) => normalizeItem(item, 'warning')),
        ...(feed.thailand?.storms || []).map((item) => normalizeItem(item, 'warning')),
        ...(feed.thailand?.earthquakes || []).map((item) => normalizeItem(item, 'warning')),
        ...(feed.thailand?.disasters || []).map((item) => normalizeItem(item, 'warning')),
        ...(feed.thailand?.ddpm || []).map((item) => normalizeItem(item, 'warning')),
        ...(feed.thailand?.tmdEq || []).map((item) => normalizeItem(item, 'warning')),
        ...(feed.global?.alerts || []).map((item) => normalizeItem(item, 'warning')),
        ...(feed.global?.earthquakes || []).map((item) => normalizeItem(item, 'warning')),
        ...(feed.global?.disasters || []).map((item) => normalizeItem(item, 'warning')),
        ...(feed.global?.eonet || []).map((item) => normalizeItem(item, 'warning')),
      ].filter(Boolean),
    );
    return mergeTmdRegionalForecasts(items).sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
  }, [feed]);

  const normalizedStories = useMemo(() => {
    if (!feed) return [];
    const weatherCards = (feed.weather?.days || []).slice(0, 3).map((day) =>
      normalizeItem({
        title: `พยากรณ์ ${toThaiShortDate(day.time)}`,
        summary: `${day.label} สูงสุด ${day.max}°C ต่ำสุด ${day.min}°C โอกาสฝน ${day.rainChance}%`,
        source: 'Open-Meteo',
        category: 'weather',
        severity: day.rainChance >= 60 ? 'medium' : 'normal',
        publishedAt: day.time,
        url: sourceLinks['Open-Meteo'],
        visual: {
          emoji: day.rainChance >= 50 ? '🌧️' : '⛅',
          gradient: topicMeta.weather.gradient,
          kicker: 'พยากรณ์อากาศ',
        },
      }),
    );

    const items = dedupeItems(
      [
        ...(feed.topStories || []).map((item) => normalizeItem(item)),
        ...(feed.thailand?.thaiPbs || []).map((item) => normalizeItem(item, 'news')),
        ...(feed.thailand?.webSevenday || []).map((item) => normalizeItem(item, 'news')),
        ...(feed.global?.climate || []).map((item) => normalizeItem(item, 'news')),
        ...weatherCards,
      ].filter(Boolean),
    );
    return mergeTmdRegionalForecasts(items).sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());
  }, [feed]);

  const filteredAlerts = useMemo(
    () => normalizedAlerts.filter((item) => matchesCategory(item, activeCategory) && includesQuery(item, query)),
    [normalizedAlerts, activeCategory, query],
  );

  const filteredStories = useMemo(
    () => normalizedStories.filter((item) => matchesCategory(item, activeCategory) && includesQuery(item, query)),
    [normalizedStories, activeCategory, query],
  );

  const filteredThaiStories = useMemo(
    () => filteredStories.filter((item) => item.scope === 'thai'),
    [filteredStories],
  );

  const filteredGlobalStories = useMemo(
    () => filteredStories.filter((item) => item.scope === 'global'),
    [filteredStories],
  );

  const heroItems = useMemo(() => {
    const items = dedupeItems([...filteredAlerts.slice(0, 4), ...filteredStories.slice(0, 4)]);
    return items.length ? items.slice(0, 4) : dedupeItems([...normalizedAlerts.slice(0, 4), ...normalizedStories.slice(0, 4)]).slice(0, 4);
  }, [filteredAlerts, filteredStories, normalizedAlerts, normalizedStories]);

  const heroItem = heroItems[currentHero] || null;

  useEffect(() => {
    if (!heroItems.length) {
      setCurrentHero(0);
      return undefined;
    }
    setCurrentHero((current) => (current >= heroItems.length ? 0 : current));
    const timer = window.setInterval(() => {
      setCurrentHero((current) => (current + 1) % heroItems.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [heroItems]);

  const scrollTo = (ref) => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const openDetail = (item) => {
    setSelectedItem(item);
    window.setTimeout(() => scrollTo(detailRef), 60);
  };

  const togglePref = (key) => {
    setAlertPrefs((current) => ({ ...current, [key]: !current[key] }));
  };

  const renderTmdBrief = (item, compact = false) => {
    if (!item?.tmdBrief) return null;
    return (
      <div style={{ marginTop: compact ? 8 : 14, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
        {[
          { label: 'ต้องระวัง', value: item.tmdBrief.hazards.join(', '), tone: '#ef4444' },
          {
            label: 'พื้นที่เกี่ยวข้อง',
            value: item.tmdBrief.provinces?.length
              ? `จังหวัด: ${item.tmdBrief.provinces.join(', ')}`
              : item.tmdBrief.areas?.join(', '),
            tone: '#2563eb',
          },
          { label: 'ควรทำ', value: item.tmdBrief.advice, tone: '#16a34a' },
        ].map((block) => (
          <div key={block.label} style={{ border: `1px solid ${block.tone}2f`, background: `${block.tone}0d`, borderRadius: 14, padding: compact ? '8px 10px' : '11px 12px', minWidth: 0 }}>
            <div style={{ color: block.tone, fontSize: '0.68rem', fontWeight: 900 }}>{block.label}</div>
            <div style={{ color: 'var(--text-main)', fontSize: compact ? '0.76rem' : '0.86rem', fontWeight: 850, lineHeight: 1.5, marginTop: 3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: compact ? 2 : 3, WebkitBoxOrient: 'vertical' }}>
              {block.value}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderNewsList = (items, emptyText) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.length ? (
        items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => openDetail(item)}
            style={{
              border: '1px solid var(--border-color)',
              background: 'color-mix(in srgb, var(--bg-card) 96%, white)',
              borderRadius: 18,
              padding: isMobile ? 13 : 15,
              display: 'grid',
              gridTemplateColumns: isMobile ? '40px minmax(0, 1fr)' : '46px minmax(0, 1fr) 130px 34px',
              gap: isMobile ? 10 : 14,
              alignItems: item.tmdBrief && !isMobile ? 'start' : 'center',
              textAlign: 'left',
              cursor: 'pointer',
              boxShadow: '0 10px 24px rgba(15, 23, 42, 0.045)',
            }}
          >
            <span style={{ width: isMobile ? 40 : 46, height: isMobile ? 40 : 46, borderRadius: 14, background: `${item.color}14`, color: item.color, display: 'grid', placeItems: 'center', fontSize: '1.18rem', flexShrink: 0 }}>
              {item.icon}
            </span>
            <div style={{ minWidth: 0 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                <span style={{ color: item.color, fontSize: '0.68rem', fontWeight: 900 }}>{item.label}</span>
                <span style={{ color: 'var(--text-sub)', fontSize: '0.68rem', fontWeight: 800 }}>{item.source}</span>
              </span>
              <span style={{ display: 'block', color: 'var(--text-main)', fontWeight: 900, lineHeight: 1.45, whiteSpace: item.tmdBrief ? 'normal' : 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</span>
              <span style={{ color: 'var(--text-sub)', fontSize: '0.78rem', lineHeight: 1.55, marginTop: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {item.summary}
              </span>
              {item.tmdBrief && renderTmdBrief(item, true)}
            </div>
            {!isMobile && <span style={{ color: 'var(--text-sub)', fontSize: '0.78rem', fontWeight: 800, paddingTop: item.tmdBrief ? 2 : 0 }}>{toThaiDateTime(item.publishedAt)}</span>}
            {!isMobile && (
              <span style={{ width: 34, height: 34, borderRadius: 999, background: 'var(--bg-secondary)', display: 'grid', placeItems: 'center', color: '#2563eb' }}>
                <ChevronRight size={18} />
              </span>
            )}
          </button>
        ))
      ) : (
        <div style={{ color: 'var(--text-sub)', padding: '10px 0' }}>{emptyText}</div>
      )}
    </div>
  );

  if (loading && !feed) {
    return <LoadingScreen title="กำลังโหลดข่าวสาร" subtitle="รวมข่าวอากาศและประกาศเตือนภัยล่าสุด" />;
  }

  return (
    <main
      style={{
        padding: isMobile ? 14 : 24,
        background: 'var(--bg-app)',
        minHeight: '100%',
        color: 'var(--text-main)',
        fontFamily: 'Sarabun, sans-serif',
      }}
      className="hide-scrollbar"
    >
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) auto', gap: 14, alignItems: 'start', marginBottom: 18 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: isMobile ? '1.5rem' : '1.95rem', fontWeight: 900 }}>ข่าวสาร & เตือนภัย</h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-sub)', fontSize: '0.92rem' }}>
            อัปเดตสถานการณ์ล่าสุดเพื่อความปลอดภัยของคุณ และตรวจสอบแหล่งข้อมูลจริงได้จากหน้าเดียว
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: isMobile ? 'flex-start' : 'flex-end' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              minWidth: isMobile ? '100%' : 360,
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              borderRadius: 18,
              padding: '11px 14px',
            }}
          >
            <Search size={18} color="#64748b" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหาข่าวสาร, เตือนภัย, พายุ, ฝนตกหนัก, PM2.5..."
              style={{
                border: 0,
                outline: 'none',
                background: 'transparent',
                width: '100%',
                color: 'var(--text-main)',
                fontWeight: 700,
                fontSize: '0.92rem',
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => setRefreshToken((value) => value + 1)}
            style={{
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              color: 'var(--text-main)',
              borderRadius: 16,
              padding: '11px 14px',
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={16} />
            รีเฟรชข่าวจริง
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
        {categoryOptions.map((option) => {
          const Icon = option.icon;
          const active = activeCategory === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setActiveCategory(option.id)}
              style={{
                border: `1px solid ${active ? option.color : 'var(--border-color)'}`,
                background: active ? option.color : 'var(--bg-card)',
                color: active ? '#fff' : 'var(--text-main)',
                borderRadius: 999,
                padding: '10px 14px',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                fontSize: '0.82rem',
              }}
            >
              <Icon size={15} />
              {option.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 18, alignItems: 'start', maxWidth: 1180, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Panel
            ref={heroRef}
            style={{
              padding: 18,
              overflow: 'hidden',
              background: heroItem
                ? `linear-gradient(135deg, ${heroItem.color}14 0%, var(--bg-card) 48%, var(--bg-secondary) 100%)`
                : 'var(--bg-card)',
              color: 'var(--text-main)',
            }}
          >
            {loading ? (
              <div style={{ padding: '18px 4px', color: 'rgba(255,255,255,0.92)' }}>กำลังดึงข่าวล่าสุดจากแหล่งข้อมูลจริง...</div>
            ) : error ? (
              <div style={{ padding: '18px 4px', color: '#fff' }}>
                <div style={{ fontWeight: 900, fontSize: '1rem' }}>โหลดข่าวจาก `/api/news` ไม่สำเร็จ</div>
                <div style={{ opacity: 0.92, marginTop: 6 }}>{error}</div>
              </div>
            ) : heroItem ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, alignItems: 'stretch' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                    <div>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          background: `${heroItem.color}14`,
                          border: `1px solid ${heroItem.color}26`,
                          color: heroItem.color,
                          borderRadius: 999,
                          padding: '7px 12px',
                          fontWeight: 900,
                          fontSize: '0.78rem',
                        }}
                      >
                        {heroItem.icon}
                        {heroItem.kicker}
                      </div>
                      <h2 style={{ margin: '14px 0 0', fontSize: isMobile ? '1.32rem' : '1.72rem', lineHeight: 1.18, fontWeight: 900 }}>
                        {heroItem.title}
                      </h2>
                      <p style={{ margin: '10px 0 0', lineHeight: 1.65, maxWidth: 620, color: 'var(--text-sub)' }}>
                        {heroItem.summary}
                      </p>
                    </div>

                    {!isMobile && (
                      <div
                        style={{
                          minWidth: 82,
                          height: 82,
                          borderRadius: 24,
                          background: `${heroItem.color}14`,
                          border: `1px solid ${heroItem.color}26`,
                          color: heroItem.color,
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: '2.2rem',
                          flexShrink: 0,
                        }}
                      >
                        {heroItem.icon}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 14, padding: '10px 12px', minWidth: 150 }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-sub)' }}>แหล่งข้อมูล</div>
                      <div style={{ fontWeight: 900, marginTop: 3 }}>{heroItem.source}</div>
                    </div>
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 14, padding: '10px 12px', minWidth: 150 }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-sub)' }}>อัปเดตล่าสุด</div>
                      <div style={{ fontWeight: 900, marginTop: 3 }}>{toThaiDateTime(heroItem.publishedAt)}</div>
                    </div>
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 14, padding: '10px 12px', minWidth: 150 }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-sub)' }}>พื้นที่หลัก</div>
                      <div style={{ fontWeight: 900, marginTop: 3 }}>{heroItem.area}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
                    <button
                      type="button"
                      onClick={() => openDetail(heroItem)}
                      style={{
                        border: 0,
                        background: heroItem.color,
                        color: '#fff',
                        borderRadius: 14,
                        padding: '12px 16px',
                        fontWeight: 900,
                        cursor: 'pointer',
                      }}
                    >
                      ดูรายละเอียดเพิ่มเติม
                    </button>
                    <button
                      type="button"
                      onClick={() => (heroItem.url ? openExternal(heroItem.url) : scrollTo(newsRef))}
                      style={{
                        border: `1px solid ${heroItem.color}44`,
                        background: 'transparent',
                        color: heroItem.color,
                        borderRadius: 14,
                        padding: '12px 16px',
                        fontWeight: 900,
                        cursor: 'pointer',
                      }}
                    >
                      {heroItem.url ? 'เปิดแหล่งข่าวต้นทาง' : 'ดูรายการข่าว'}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {heroItems.map((item, index) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setCurrentHero(index)}
                          aria-label={`slide-${index + 1}`}
                          style={{
                            width: index === currentHero ? 28 : 10,
                            height: 10,
                            borderRadius: 999,
                            border: 0,
                            background: index === currentHero ? heroItem.color : `${heroItem.color}33`,
                            cursor: 'pointer',
                          }}
                        />
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => setCurrentHero((current) => (current - 1 + heroItems.length) % heroItems.length)}
                        style={{ width: 34, height: 34, borderRadius: 999, border: `1px solid ${heroItem.color}2f`, background: `${heroItem.color}12`, color: heroItem.color, display: 'grid', placeItems: 'center', cursor: 'pointer' }}
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentHero((current) => (current + 1) % heroItems.length)}
                        style={{ width: 34, height: 34, borderRadius: 999, border: `1px solid ${heroItem.color}2f`, background: `${heroItem.color}12`, color: heroItem.color, display: 'grid', placeItems: 'center', cursor: 'pointer' }}
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
              </div>
            ) : (
              <div style={{ padding: '18px 4px', color: '#fff' }}>ยังไม่มีข่าวที่ตรงกับตัวกรองตอนนี้</div>
            )}
          </Panel>

          <Panel style={{ padding: 18, background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.08) 0%, var(--bg-card) 44%, rgba(249, 115, 22, 0.08) 100%)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.05fr) minmax(340px, 0.95fr)', gap: 18, alignItems: 'stretch' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ width: 42, height: 42, borderRadius: 16, background: 'rgba(14, 165, 233, 0.14)', color: '#0284c7', display: 'grid', placeItems: 'center' }}>
                    <ThermometerSun size={21} />
                  </span>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 900 }}>ENSO: เอลนีโญ / ลานีญา</h2>
                    <div style={{ color: 'var(--text-sub)', fontSize: '0.76rem', marginTop: 3 }}>{ensoOutlook.sourceNote}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
                  {[
                    ['สถานะตอนนี้', ensoOutlook.status, '#2563eb'],
                    ['ระบบเฝ้าระวัง', ensoOutlook.alert, '#f97316'],
                    ['Niño 3.4', ensoOutlook.nino34, '#0f766e'],
                  ].map(([label, value, color]) => (
                    <div key={label} style={{ border: `1px solid ${color}2f`, background: `${color}0d`, borderRadius: 16, padding: '10px 12px', minWidth: 132 }}>
                      <div style={{ color: 'var(--text-sub)', fontSize: '0.72rem', fontWeight: 800 }}>{label}</div>
                      <div style={{ color, fontWeight: 950, fontSize: '1rem', marginTop: 3 }}>{value}</div>
                    </div>
                  ))}
                </div>

                <p style={{ color: 'var(--text-sub)', lineHeight: 1.75, margin: '14px 0 0' }}>{ensoOutlook.summary}</p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={() => openExternal(sourceLinks['NOAA CPC ENSO'])}
                    style={{ border: '1px solid rgba(37, 99, 235, 0.28)', background: 'rgba(37, 99, 235, 0.08)', color: '#2563eb', borderRadius: 14, padding: '10px 13px', fontWeight: 900, cursor: 'pointer' }}
                  >
                    NOAA CPC
                  </button>
                  <button
                    type="button"
                    onClick={() => openExternal(sourceLinks['IRI ENSO Forecast'])}
                    style={{ border: '1px solid rgba(249, 115, 22, 0.28)', background: 'rgba(249, 115, 22, 0.08)', color: '#ea580c', borderRadius: 14, padding: '10px 13px', fontWeight: 900, cursor: 'pointer' }}
                  >
                    IRI Forecast
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
                  {ensoOutlook.forecast.map((step) => (
                    <div key={step.label} style={{ border: `1px solid ${step.color}2a`, background: 'var(--bg-card)', borderRadius: 16, padding: '11px 10px', minWidth: 0 }}>
                      <div style={{ color: 'var(--text-sub)', fontSize: '0.7rem', fontWeight: 850 }}>{step.label}</div>
                      <div style={{ color: step.color, fontWeight: 950, marginTop: 4, lineHeight: 1.28 }}>{step.value}</div>
                      <div style={{ color: 'var(--text-sub)', fontSize: '0.72rem', lineHeight: 1.45, marginTop: 5 }}>{step.detail}</div>
                    </div>
                  ))}
                </div>

                <div style={{ border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.58)', borderRadius: 18, padding: 14 }}>
                  <div style={{ fontWeight: 950, marginBottom: 4 }}>ผลต่อประเทศไทย</div>
                  <div style={{ color: 'var(--text-sub)', fontSize: '0.76rem', marginBottom: 10 }}>สรุปผลกระทบที่ควรติดตามในช่วงหลายเดือนข้างหน้า</div>
                  <div style={{ display: 'grid', gap: 9 }}>
                    {ensoOutlook.impacts.map((item) => (
                      <div key={item.title} style={{ display: 'grid', gridTemplateColumns: '10px minmax(0, 1fr)', gap: 10, alignItems: 'start', color: 'var(--text-sub)', lineHeight: 1.58, fontSize: '0.82rem' }}>
                        <span style={{ width: 8, height: 8, borderRadius: 999, background: item.color, marginTop: 8, boxShadow: `0 0 0 4px ${item.color}18` }} />
                        <span>
                          <strong style={{ display: 'block', color: 'var(--text-main)', fontSize: '0.86rem', marginBottom: 2 }}>{item.title}</strong>
                          {item.detail}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Panel>

          {selectedItem && (
            <Panel ref={detailRef} style={{ padding: 18, borderColor: `${selectedItem.color}40` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ display: 'flex', gap: 14 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 18, background: `${selectedItem.color}15`, display: 'grid', placeItems: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                    {selectedItem.icon}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ color: selectedItem.color, fontSize: '0.76rem', fontWeight: 900 }}>{selectedItem.kicker}</span>
                      <span style={{ background: selectedItem.severityMeta.bg, color: selectedItem.severityMeta.color, borderRadius: 999, padding: '4px 9px', fontSize: '0.7rem', fontWeight: 900 }}>
                        {selectedItem.severityMeta.label}
                      </span>
                    </div>
                    <h2 style={{ margin: '6px 0 0', fontSize: '1.12rem' }}>{selectedItem.title}</h2>
                    <div style={{ marginTop: 7, color: 'var(--text-sub)', fontSize: '0.8rem' }}>
                      {selectedItem.source} • {toThaiDateTime(selectedItem.publishedAt)} • {selectedItem.area}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-sub)',
                    cursor: 'pointer',
                    fontWeight: 900,
                  }}
                >
                  ×
                </button>
              </div>

              <p style={{ margin: '14px 0 0', color: 'var(--text-sub)', lineHeight: 1.75 }}>{selectedItem.summary}</p>
              {renderTmdBrief(selectedItem)}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
                <button
                  type="button"
                  onClick={() => scrollTo(newsRef)}
                  style={{
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-main)',
                    borderRadius: 14,
                    padding: '10px 14px',
                    fontWeight: 900,
                    cursor: 'pointer',
                  }}
                >
                  กลับไปยังรายการ
                </button>
                {selectedItem.url && (
                  <button
                    type="button"
                    onClick={() => openExternal(selectedItem.url)}
                    style={{
                      border: 0,
                      background: selectedItem.color,
                      color: '#fff',
                      borderRadius: 14,
                      padding: '10px 14px',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    เปิดต้นทาง <ExternalLink size={15} />
                  </button>
                )}
              </div>
            </Panel>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 18, alignItems: 'start' }}>
            <Panel style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 900 }}>ข่าวไทย</h2>
                  <div style={{ color: 'var(--text-sub)', fontSize: '0.78rem', marginTop: 4 }}>ประกาศและข่าวจากแหล่งข้อมูลในประเทศ</div>
                </div>
                <span style={{ color: '#2563eb', fontSize: '0.76rem', fontWeight: 900 }}>{filteredThaiStories.length} ข่าว</span>
              </div>
              {renderNewsList(filteredThaiStories.slice(0, 6), 'ยังไม่พบข่าวไทยในตัวกรองนี้')}
            </Panel>

            <Panel style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 900 }}>ข่าวต่างประเทศ</h2>
                  <div style={{ color: 'var(--text-sub)', fontSize: '0.78rem', marginTop: 4 }}>ภัยพิบัติ ภูมิอากาศ และเหตุการณ์สำคัญนอกไทย</div>
                </div>
                <span style={{ color: '#0f766e', fontSize: '0.76rem', fontWeight: 900 }}>{filteredGlobalStories.length} ข่าว</span>
              </div>
              {renderNewsList(filteredGlobalStories.slice(0, 6), 'ยังไม่พบข่าวต่างประเทศในตัวกรองนี้')}
            </Panel>
          </div>

          <Panel ref={newsRef} style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 900 }}>ข่าวสารล่าสุด</h2>
              <button type="button" onClick={() => setActiveCategory('news')} style={{ border: 0, background: 'transparent', color: '#2563eb', fontWeight: 900, cursor: 'pointer' }}>
                ดูทั้งหมด
              </button>
            </div>

            {loading ? (
              <div style={{ color: 'var(--text-sub)' }}>กำลังดึงข่าวสารล่าสุด...</div>
            ) : filteredStories.length ? (
              renderNewsList(filteredStories.slice(0, 16), 'ไม่พบข่าวสารในตัวกรองนี้')
            ) : (
              <div style={{ color: 'var(--text-sub)' }}>ไม่พบข่าวสารในตัวกรองนี้</div>
            )}
          </Panel>
        </div>

        <aside style={{ display: 'none' }}>
          <Panel style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: '1.03rem', fontWeight: 900 }}>ภาพรวมสถานการณ์วันนี้</h2>
              <button type="button" onClick={() => scrollTo(newsRef)} style={{ border: 0, background: 'transparent', color: '#2563eb', fontWeight: 900, cursor: 'pointer' }}>
                ดูข่าวล่าสุด
              </button>
            </div>

            <div style={{ color: 'var(--text-sub)', fontSize: '0.8rem', marginBottom: 14 }}>
              {feed?.labels?.generatedAt || 'กำลังรอข้อมูลล่าสุด'}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, marginBottom: 16 }}>
              {[
                { icon: '🚨', value: normalizedAlerts.filter((item) => item.severity === 'high').length, label: 'อันตราย', color: '#ef4444' },
                { icon: '⚠️', value: normalizedAlerts.filter((item) => item.severity === 'medium').length, label: 'เฝ้าระวัง', color: '#f59e0b' },
                { icon: '📰', value: normalizedStories.length, label: 'ข่าวใหม่', color: '#2563eb' },
                { icon: '🌍', value: heroItem?.area || 'หลายพื้นที่', label: 'พื้นที่หลัก', color: '#22c55e' },
              ].map((stat) => (
                <div key={stat.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900, color: stat.color }}>{stat.icon} {stat.value}</div>
                  <div style={{ color: 'var(--text-sub)', fontSize: '0.64rem', fontWeight: 800 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            <div style={{ borderRadius: 18, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: 14 }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-sub)' }}>สรุปจากระบบ</div>
              <div style={{ marginTop: 6, fontWeight: 900, lineHeight: 1.55 }}>{feed?.digest?.headline || 'กำลังสรุปภาพรวมล่าสุด'}</div>
              {feed?.digest?.bullets?.length ? (
                <ul style={{ margin: '10px 0 0', paddingLeft: 18, color: 'var(--text-sub)', lineHeight: 1.65 }}>
                  {feed.digest.bullets.slice(0, 3).map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </Panel>

          <Panel style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontSize: '1.03rem', fontWeight: 900 }}>ช่องทางการแจ้งเตือน</h2>
              <Bell size={18} color="#2563eb" />
            </div>

            {[
              ['push', 'แอปเตือนบนเว็บไซต์', 'เปิดแจ้งเตือน', '🔔'],
              ['email', 'อีเมล', 'example@email.com', '✉️'],
              ['line', 'LINE', 'เชื่อมต่อแล้ว', '💬'],
              ['sms', 'SMS', '09x-xxx-xxxx', '📱'],
            ].map(([key, title, subtitle, icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => togglePref(key)}
                style={{ width: '100%', border: 0, background: 'transparent', padding: '9px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}>
                  <span style={{ fontSize: '1.1rem' }}>{icon}</span>
                  <span>
                    <span style={{ display: 'block', fontWeight: 900 }}>{title}</span>
                    <span style={{ display: 'block', color: 'var(--text-sub)', fontSize: '0.72rem' }}>{subtitle}</span>
                  </span>
                </span>
                <span style={{ width: 42, height: 24, borderRadius: 999, background: alertPrefs[key] ? '#2563eb' : 'var(--bg-secondary)', border: '1px solid var(--border-color)', position: 'relative' }}>
                  <span style={{ position: 'absolute', top: 2, left: alertPrefs[key] ? 20 : 2, width: 18, height: 18, borderRadius: 999, background: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.18)', transition: 'left 0.18s ease' }} />
                </span>
              </button>
            ))}
          </Panel>

          <Panel style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: '1.03rem', fontWeight: 900 }}>หน่วยงานที่เกี่ยวข้อง</h2>
              <button type="button" onClick={() => scrollTo(newsRef)} style={{ border: 0, background: 'transparent', color: '#2563eb', fontWeight: 900, cursor: 'pointer' }}>
                ดูข่าวล่าสุด
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              {agencyCards.map((agency) => (
                <button
                  key={agency.key}
                  type="button"
                  onClick={() => openExternal(agency.url)}
                  style={{ border: '1px solid var(--border-color)', background: 'var(--bg-card)', borderRadius: 18, padding: 14, textAlign: 'left', cursor: 'pointer' }}
                >
                  <div style={{ width: 48, height: 48, borderRadius: 16, background: 'rgba(37,99,235,0.12)', display: 'grid', placeItems: 'center', fontWeight: 900, color: '#2563eb' }}>
                    {agency.short}
                  </div>
                  <div style={{ marginTop: 10, fontWeight: 900, lineHeight: 1.4 }}>{agency.label}</div>
                  <div style={{ marginTop: 5, color: 'var(--text-sub)', fontSize: '0.72rem', fontWeight: 800 }}>
                    เว็บไซต์ทางการ
                  </div>
                </button>
              ))}
            </div>
          </Panel>
        </aside>
      </div>
    </main>
  );
}
