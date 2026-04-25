import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import {
  AlertTriangle,
  Bell,
  ChevronLeft,
  ChevronRight,
  CloudRain,
  ExternalLink,
  Flame,
  MapPinned,
  Newspaper,
  RefreshCw,
  Search,
  ShieldAlert,
  ThermometerSun,
  Waves,
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { WeatherContext } from '../context/WeatherContext';
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

function normalizeItem(item, forcedType) {
  if (!item?.title) return null;
  const topic = inferTopic(item);
  const meta = topicMeta[topic] || topicMeta.news;
  const severity = item.severity || 'normal';
  const alertLike = ['warning', 'storm', 'earthquake', 'thai-disaster', 'global-alert', 'global-disaster'].includes(item.category) || severity !== 'normal';
  const type = forcedType || (alertLike ? 'warning' : 'news');
  return {
    id: item.id || `${item.source || 'source'}-${item.title}`,
    title: item.title,
    summary: item.summary || item.description || 'ไม่มีรายละเอียดเพิ่มเติม',
    source: item.source || 'แหล่งข่าว',
    url: item.url || item.link || '',
    publishedAt: item.publishedAt || item.time || item.date || '',
    severity,
    severityMeta: getSeverityMeta(severity),
    topic,
    type,
    area: deriveArea(item),
    visual: item.visual || {},
    icon: item.visual?.emoji || meta.icon,
    gradient: item.visual?.gradient || meta.gradient,
    kicker: item.visual?.kicker || meta.label,
    label: meta.label,
    color: meta.color,
    eventLabel: item.eventLabel || meta.label,
    priorityScore: item.priorityScore || 0,
  };
}

function dedupeItems(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.source}-${item.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
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
  const { darkMode, stations, stationTemps } = useContext(WeatherContext);
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
  const alertsRef = useRef(null);
  const newsRef = useRef(null);
  const mapRef = useRef(null);

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
        const response = await fetch('/api/news', {
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
    return dedupeItems(
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
    ).sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
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

    return dedupeItems(
      [
        ...(feed.topStories || []).map((item) => normalizeItem(item)),
        ...(feed.thailand?.thaiPbs || []).map((item) => normalizeItem(item, 'news')),
        ...(feed.thailand?.webSevenday || []).map((item) => normalizeItem(item, 'news')),
        ...(feed.global?.climate || []).map((item) => normalizeItem(item, 'news')),
        ...weatherCards,
      ].filter(Boolean),
    ).sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());
  }, [feed]);

  const filteredAlerts = useMemo(
    () => normalizedAlerts.filter((item) => matchesCategory(item, activeCategory) && includesQuery(item, query)),
    [normalizedAlerts, activeCategory, query],
  );

  const filteredStories = useMemo(
    () => normalizedStories.filter((item) => matchesCategory(item, activeCategory) && includesQuery(item, query)),
    [normalizedStories, activeCategory, query],
  );

  const heroItems = useMemo(() => {
    const items = dedupeItems([...filteredAlerts.slice(0, 4), ...filteredStories.slice(0, 4)]);
    return items.length ? items.slice(0, 4) : dedupeItems([...normalizedAlerts.slice(0, 4), ...normalizedStories.slice(0, 4)]).slice(0, 4);
  }, [filteredAlerts, filteredStories, normalizedAlerts, normalizedStories]);

  const riskAreas = useMemo(() => dedupeItems(normalizedAlerts.filter((item) => item.severity !== 'normal')).slice(0, 3), [normalizedAlerts]);

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

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.68fr) minmax(320px, 0.78fr)', gap: 18, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Panel
            ref={heroRef}
            style={{
              padding: 18,
              overflow: 'hidden',
              background: heroItem
                ? `${heroItem.gradient}, radial-gradient(circle at right center, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 46%)`
                : 'var(--bg-card)',
              color: heroItem ? '#fff' : 'var(--text-main)',
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
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.1fr) minmax(280px, 0.9fr)', gap: 18, alignItems: 'stretch' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                    <div>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          background: 'rgba(255,255,255,0.14)',
                          border: '1px solid rgba(255,255,255,0.18)',
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
                      <p style={{ margin: '10px 0 0', lineHeight: 1.65, maxWidth: 620, color: 'rgba(255,255,255,0.9)' }}>
                        {heroItem.summary}
                      </p>
                    </div>

                    {!isMobile && (
                      <div
                        style={{
                          minWidth: 82,
                          height: 82,
                          borderRadius: 24,
                          background: 'rgba(255,255,255,0.12)',
                          border: '1px solid rgba(255,255,255,0.18)',
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
                    <div style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 14, padding: '10px 12px', minWidth: 150 }}>
                      <div style={{ fontSize: '0.72rem', opacity: 0.82 }}>แหล่งข้อมูล</div>
                      <div style={{ fontWeight: 900, marginTop: 3 }}>{heroItem.source}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 14, padding: '10px 12px', minWidth: 150 }}>
                      <div style={{ fontSize: '0.72rem', opacity: 0.82 }}>อัปเดตล่าสุด</div>
                      <div style={{ fontWeight: 900, marginTop: 3 }}>{toThaiDateTime(heroItem.publishedAt)}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 14, padding: '10px 12px', minWidth: 150 }}>
                      <div style={{ fontSize: '0.72rem', opacity: 0.82 }}>พื้นที่หลัก</div>
                      <div style={{ fontWeight: 900, marginTop: 3 }}>{heroItem.area}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
                    <button
                      type="button"
                      onClick={() => openDetail(heroItem)}
                      style={{
                        border: 0,
                        background: 'rgba(255,255,255,0.18)',
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
                      onClick={() => (heroItem.url ? openExternal(heroItem.url) : scrollTo(alertsRef))}
                      style={{
                        border: '1px solid rgba(255,255,255,0.22)',
                        background: 'transparent',
                        color: '#fff',
                        borderRadius: 14,
                        padding: '12px 16px',
                        fontWeight: 900,
                        cursor: 'pointer',
                      }}
                    >
                      {heroItem.url ? 'เปิดแหล่งข่าวต้นทาง' : 'ดูรายการแจ้งเตือน'}
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    borderRadius: 24,
                    border: '1px solid rgba(255,255,255,0.16)',
                    background: 'rgba(255,255,255,0.12)',
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 14,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'radial-gradient(circle at 20% 18%, rgba(255,255,255,0.24) 0, rgba(255,255,255,0) 24%), radial-gradient(circle at 80% 26%, rgba(255,255,255,0.16) 0, rgba(255,255,255,0) 18%), radial-gradient(circle at 56% 72%, rgba(255,255,255,0.14) 0, rgba(255,255,255,0) 20%)',
                      pointerEvents: 'none',
                    }}
                  />
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ fontSize: '0.74rem', opacity: 0.86 }}>ภาพรวมสถานการณ์วันนี้</div>
                    <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                      {[
                        ['เตือนภัย', normalizedAlerts.length, '#fff'],
                        ['ข่าวเด่น', normalizedStories.length, '#fff'],
                        ['แหล่งข่าวหลัก', heroItem?.source || '-', '#fff'],
                        ['โหมดสรุป', feed?.digest?.mode === 'ai' ? 'AI' : 'Rule', '#fff'],
                      ].map(([label, value]) => (
                        <div key={label} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.12)' }}>
                          <div style={{ fontSize: '0.72rem', opacity: 0.82 }}>{label}</div>
                          <div style={{ fontSize: '1.15rem', fontWeight: 900, marginTop: 4 }}>{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
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
                            background: index === currentHero ? '#fff' : 'rgba(255,255,255,0.35)',
                            cursor: 'pointer',
                          }}
                        />
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => setCurrentHero((current) => (current - 1 + heroItems.length) % heroItems.length)}
                        style={{ width: 34, height: 34, borderRadius: 999, border: 0, background: 'rgba(255,255,255,0.16)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentHero((current) => (current + 1) % heroItems.length)}
                        style={{ width: 34, height: 34, borderRadius: 999, border: 0, background: 'rgba(255,255,255,0.16)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '18px 4px', color: '#fff' }}>ยังไม่มีข่าวที่ตรงกับตัวกรองตอนนี้</div>
            )}
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

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
                <button
                  type="button"
                  onClick={() => scrollTo(selectedItem.type === 'warning' ? alertsRef : newsRef)}
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

          <Panel ref={alertsRef} style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 900 }}>รายการแจ้งเตือนล่าสุด</h2>
              <button type="button" onClick={() => setActiveCategory('warning')} style={{ border: 0, background: 'transparent', color: '#2563eb', fontWeight: 900, cursor: 'pointer' }}>
                ดูทั้งหมด
              </button>
            </div>

            {loading ? (
              <div style={{ color: 'var(--text-sub)' }}>กำลังโหลดรายการแจ้งเตือน...</div>
            ) : filteredAlerts.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filteredAlerts.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openDetail(item)}
                    style={{
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-card)',
                      borderRadius: 18,
                      padding: '14px 16px',
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : '44px minmax(0, 1fr) auto 34px',
                      gap: 12,
                      alignItems: 'center',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    {!isMobile && (
                      <span style={{ width: 44, height: 44, borderRadius: 15, background: item.severityMeta.bg, display: 'grid', placeItems: 'center', fontSize: '1.3rem' }}>
                        {item.icon}
                      </span>
                    )}
                    <span>
                      <span style={{ display: 'block', fontWeight: 900, color: 'var(--text-main)' }}>{item.title}</span>
                      <span style={{ display: 'block', color: 'var(--text-sub)', fontSize: '0.78rem', marginTop: 4 }}>
                        {item.summary}
                      </span>
                    </span>
                    <span style={{ color: 'var(--text-sub)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{toThaiDateTime(item.publishedAt)}</span>
                    {!isMobile && (
                      <span style={{ width: 34, height: 34, borderRadius: 999, background: 'var(--bg-secondary)', display: 'grid', placeItems: 'center', color: '#2563eb' }}>
                        <ChevronRight size={18} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ color: 'var(--text-sub)' }}>ไม่พบรายการแจ้งเตือนในตัวกรองนี้</div>
            )}
          </Panel>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.25fr) minmax(280px, 0.8fr)', gap: 18, alignItems: 'start' }}>
            <Panel ref={mapRef} style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900 }}>พื้นที่เสี่ยงภัยวันนี้</h2>
                <NavLink to="/map" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 900 }}>
                  ดูแผนที่เสี่ยงภัย
                </NavLink>
              </div>
              <div style={{ height: isMobile ? 250 : 340, borderRadius: 20, overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative' }}>
                <MapContainer center={[13.75, 100.5]} zoom={5} zoomControl={false} style={{ width: '100%', height: '100%', background: darkMode ? '#0f172a' : '#dbeafe' }}>
                  <TileLayer url={darkMode ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'} />
                  {(stations || []).slice(0, 90).map((station) => {
                    const lat = Number.parseFloat(station.lat);
                    const lon = Number.parseFloat(station.long);
                    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
                    const rain = Math.round(stationTemps?.[station.stationID]?.rainProb || 0);
                    const pm25 = Math.round(station.AQILast?.PM25?.value || 0);
                    const value = Math.max(rain, pm25);
                    if (value < 15) return null;
                    const color = value >= 80 ? '#ef4444' : value >= 50 ? '#f59e0b' : '#2563eb';
                    return <CircleMarker key={station.stationID} center={[lat, lon]} radius={Math.min(26, 6 + value / 4)} fillColor={color} fillOpacity={0.45} color="#fff" weight={1.2} />;
                  })}
                </MapContainer>
                <div style={{ position: 'absolute', left: 14, top: 14, zIndex: 500, background: 'rgba(255,255,255,0.92)', color: '#0f172a', borderRadius: 14, padding: '10px 12px', fontSize: '0.76rem', fontWeight: 900 }}>
                  เรดาร์ฝนและจุดเฝ้าระวัง<br />
                  <span style={{ color: '#64748b', fontWeight: 700 }}>{feed?.labels?.generatedAt || 'อัปเดตล่าสุด'}</span>
                </div>
                <div style={{ position: 'absolute', right: 14, bottom: 14, zIndex: 500 }}>
                  <NavLink to="/map" style={{ textDecoration: 'none', background: '#2563eb', color: '#fff', borderRadius: 999, padding: '10px 14px', fontWeight: 900, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <MapPinned size={16} />
                    ดูแผนที่แบบเต็ม
                  </NavLink>
                </div>
              </div>
            </Panel>

            <Panel style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900 }}>พื้นที่เสี่ยงวันนี้</h2>
                <button type="button" onClick={() => scrollTo(mapRef)} style={{ border: 0, background: 'transparent', color: '#2563eb', fontWeight: 900, cursor: 'pointer' }}>
                  ดูแผนที่เสี่ยงภัย
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {riskAreas.length ? (
                  riskAreas.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openDetail(item)}
                      style={{ border: '1px solid var(--border-color)', background: 'var(--bg-card)', borderRadius: 18, padding: 12, textAlign: 'left', cursor: 'pointer' }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '96px minmax(0, 1fr)', gap: 12 }}>
                        <div style={{ borderRadius: 14, background: item.gradient, minHeight: 70, display: 'grid', placeItems: 'center', color: '#fff', fontSize: '1.7rem', fontWeight: 900 }}>
                          {item.icon}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 900 }}>{item.title}</div>
                          <div style={{ color: 'var(--text-sub)', fontSize: '0.76rem', marginTop: 3 }}>{item.area}</div>
                          <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 999, background: item.severityMeta.bg, color: item.severityMeta.color, padding: '4px 9px', fontWeight: 900, fontSize: '0.68rem' }}>
                            {item.severityMeta.label}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div style={{ color: 'var(--text-sub)' }}>ตอนนี้ยังไม่มีพื้นที่เสี่ยงเด่นจากข้อมูลล่าสุด</div>
                )}
              </div>
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
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
                {filteredStories.slice(0, isMobile ? 4 : 8).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openDetail(item)}
                    style={{
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-card)',
                      borderRadius: 20,
                      overflow: 'hidden',
                      padding: 0,
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ minHeight: 138, background: `${item.gradient}, radial-gradient(circle at top right, rgba(255,255,255,0.32) 0, rgba(255,255,255,0) 32%)`, position: 'relative', padding: 14, color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div style={{ display: 'inline-flex', alignSelf: 'flex-start', borderRadius: 999, background: 'rgba(255,255,255,0.18)', padding: '6px 10px', fontSize: '0.68rem', fontWeight: 900 }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: '2rem' }}>{item.icon}</div>
                    </div>
                    <div style={{ padding: 14 }}>
                      <div style={{ fontWeight: 900, lineHeight: 1.45 }}>{item.title}</div>
                      <div style={{ color: 'var(--text-sub)', fontSize: '0.76rem', marginTop: 8, lineHeight: 1.6 }}>
                        {item.summary}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 12, color: 'var(--text-sub)', fontSize: '0.7rem' }}>
                        <span>{item.source}</span>
                        <span>{toThaiDateTime(item.publishedAt)}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ color: 'var(--text-sub)' }}>ไม่พบข่าวสารในตัวกรองนี้</div>
            )}
          </Panel>
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
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
