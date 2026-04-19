import React, { useEffect, useMemo, useState } from 'react';

const NEWS_CACHE_KEY = 'airqualitythai:news-cache:v2';
const NEWS_CACHE_TTL_MS = 10 * 60 * 1000;

const severityStyles = {
  high: {
    color: '#b91c1c',
    bg: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.24)',
    label: 'เร่งด่วน',
  },
  medium: {
    color: '#b45309',
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.24)',
    label: 'เฝ้าระวัง',
  },
  normal: {
    color: '#0f766e',
    bg: 'rgba(20,184,166,0.12)',
    border: 'rgba(20,184,166,0.24)',
    label: 'อัปเดต',
  },
};

const categoryLabels = {
  warning: 'เตือนภัย',
  storm: 'ฝน-พายุ',
  earthquake: 'แผ่นดินไหว',
  'thai-disaster': 'เหตุในไทย',
  'global-alert': 'เตือนต่างประเทศ',
  'global-disaster': 'ภัยพิบัติโลก',
  climate: 'ภูมิอากาศ',
};

const thaiSectionConfig = [
  { key: 'warnings', title: 'ประกาศเตือน', desc: 'ติดตามประกาศจากหน่วยงานในประเทศ', icon: '⚠️' },
  { key: 'storms', title: 'พายุและฝน', desc: 'ข่าวพายุหรือสภาพอากาศน่าจับตา', icon: '🌧️' },
  { key: 'earthquakes', title: 'แผ่นดินไหวใกล้ไทย', desc: 'เหตุแผ่นดินไหวที่เกี่ยวข้องกับภูมิภาค', icon: '🌋' },
  { key: 'disasters', title: 'รายงานเหตุการณ์', desc: 'เหตุการณ์ที่มีผลกระทบในประเทศไทย', icon: '📍' },
];

const globalSectionConfig = [
  { key: 'alerts', title: 'เตือนภัยโลก', desc: 'สัญญาณเตือนจากต่างประเทศ', icon: '🚨' },
  { key: 'earthquakes', title: 'แผ่นดินไหวโลก', desc: 'เหตุแผ่นดินไหวเด่นในรอบสัปดาห์', icon: '🌍' },
  { key: 'disasters', title: 'เหตุการณ์สำคัญ', desc: 'รายงานภัยพิบัติจากหลายประเทศ', icon: '🧭' },
  { key: 'climate', title: 'ภูมิอากาศ & เอลนีโญ่', desc: 'งานวิชาการ ปรากฏการณ์เอลนีโญ่ ลานีญ่า และการเปลี่ยนแปลงภูมิอากาศ', icon: '🌡️' },
];

function SectionCard({ children, style }) {
  return (
    <section
      style={{
        background: 'var(--bg-card)',
        borderRadius: '24px',
        border: '1px solid var(--border-color)',
        padding: '18px',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </section>
  );
}

function CardTitle({ eyebrow, title, desc, action, light = false }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '12px',
        marginBottom: '14px',
        flexWrap: 'wrap',
      }}
    >
      <div>
        {eyebrow ? (
          <div
            style={{
              color: light ? 'rgba(255,255,255,0.76)' : 'var(--text-sub)',
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: '6px',
            }}
          >
            {eyebrow}
          </div>
        ) : null}
        <h2 style={{ margin: 0, color: light ? '#ffffff' : 'var(--text-main)', fontSize: '1.02rem', fontWeight: 900 }}>
          {title}
        </h2>
        {desc ? (
          <p
            style={{
              margin: '6px 0 0',
              color: light ? 'rgba(255,255,255,0.82)' : 'var(--text-sub)',
              fontSize: '0.82rem',
              lineHeight: 1.65,
              maxWidth: '720px',
            }}
          >
            {desc}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

function MetricCard({ label, value, accent, note, isDark }) {
  return (
    <div
      style={{
        background: isDark
          ? 'linear-gradient(180deg, rgba(7,18,38,0.78), rgba(20,39,69,0.92))'
          : 'linear-gradient(180deg, rgba(9,27,56,0.28), rgba(20,55,100,0.42))',
        borderRadius: '20px',
        border: isDark ? '1px solid rgba(125,211,252,0.16)' : '1px solid rgba(255,255,255,0.22)',
        padding: '16px',
        boxShadow: isDark ? 'inset 0 1px 0 rgba(255,255,255,0.08)' : 'inset 0 1px 0 rgba(255,255,255,0.16)',
      }}
    >
      <div style={{ color: 'rgba(255,255,255,0.88)', fontSize: '0.74rem', marginBottom: '8px', fontWeight: 700 }}>{label}</div>
      <div style={{ color: '#ffffff', fontWeight: 900, fontSize: '1.55rem', lineHeight: 1 }}>{value}</div>
      <div style={{ color: accent, fontWeight: 800, fontSize: '0.74rem', marginTop: '8px' }}>{note}</div>
    </div>
  );
}

function VisualArea({ item, compact, visual }) {
  const hasImage = !!item.imageUrl;
  const minHeight = compact ? '84px' : '112px';
  const borderRadius = compact ? '14px' : '16px';
  const padding = compact ? '12px' : '14px';

  const contentStyle = {
    position: 'relative',
    zIndex: 1,
    height: '100%',
    display: 'grid',
    alignContent: 'space-between',
    minHeight,
    padding,
  };

  return (
    <div
      style={{
        borderRadius,
        minHeight,
        overflow: 'hidden',
        position: 'relative',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16)',
      }}
    >
      {hasImage ? (
        <>
          <img
            src={item.imageUrl}
            alt={item.title}
            loading="lazy"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.62) 100%)',
            }}
          />
        </>
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: visual.gradient,
          }}
        />
      )}
      <div style={contentStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'start' }}>
          <span
            style={{
              background: 'rgba(255,255,255,0.22)',
              borderRadius: '999px',
              padding: '4px 10px',
              fontSize: '0.68rem',
              fontWeight: 800,
              color: '#ffffff',
              backdropFilter: 'blur(4px)',
            }}
          >
            {visual.kicker}
          </span>
          <span style={{ fontSize: compact ? '1.6rem' : '1.9rem', lineHeight: 1 }}>{visual.emoji}</span>
        </div>
        <div style={{ color: '#ffffff', fontSize: compact ? '0.78rem' : '0.84rem', fontWeight: 800, lineHeight: 1.5, opacity: 0.96 }}>
          {visual.label}
        </div>
      </div>
    </div>
  );
}

function NewsItem({ item, compact = false, isDark = false }) {
  const severity = severityStyles[item.severity] || severityStyles.normal;
  const metaTone = isDark ? '#c9deef' : '#516173';
  const visual = item.visual || {
    emoji: '📰',
    gradient: 'linear-gradient(135deg, #0f766e 0%, #0369a1 100%)',
    kicker: item.source || 'ข่าวเด่น',
    label: item.title,
  };

  return (
    <article
      style={{
        background: compact ? (isDark ? '#132745' : '#f7fbff') : 'transparent',
        borderRadius: compact ? '16px' : 0,
        border: compact ? `1px solid ${isDark ? 'rgba(125,211,252,0.16)' : severity.border}` : 'none',
        borderBottom: compact ? 'none' : `1px solid ${isDark ? 'rgba(125,211,252,0.16)' : 'rgba(148,163,184,0.18)'}`,
        padding: compact ? '12px' : '0 0 18px',
        display: 'grid',
        gap: compact ? '8px' : '10px',
        boxShadow: compact ? (isDark ? '0 10px 28px rgba(0,0,0,0.18)' : '0 10px 22px rgba(14,30,56,0.05)') : 'none',
      }}
    >
      {compact ? <VisualArea item={item} compact={compact} visual={visual} /> : null}

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {item.categoryLabel ? (
            <span style={{ color: metaTone, fontSize: '0.68rem', fontWeight: 900, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
              {item.categoryLabel}
            </span>
          ) : null}
          <span
            style={{
              background: severity.bg,
              color: severity.color,
              border: `1px solid ${severity.border}`,
              borderRadius: '999px',
              padding: '4px 10px',
              fontSize: '0.68rem',
              fontWeight: 800,
            }}
          >
            {severity.label}
          </span>
          {item.source ? <span style={{ color: metaTone, fontSize: '0.72rem', fontWeight: 700 }}>{item.source}</span> : null}
        </div>
        <span style={{ color: 'var(--text-sub)', fontSize: '0.72rem', fontWeight: 700 }}>{item.publishedAgoLabel || item.publishedAtLabel || '-'}</span>
      </div>

      <div>
        <div style={{ color: 'var(--text-main)', fontWeight: 900, fontSize: compact ? '0.88rem' : '1rem', lineHeight: 1.55 }}>
          {item.title}
        </div>
        {item.summary ? (
          <div style={{ color: 'var(--text-sub)', fontSize: compact ? '0.77rem' : '0.83rem', lineHeight: 1.75, marginTop: '6px' }}>
            {item.summary}
          </div>
        ) : null}
      </div>

      {(item.eventLabel || item.country || item.status || item.magnitude) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {item.eventLabel ? <MetaBadge text={item.eventLabel} isDark={isDark} /> : null}
          {item.country ? <MetaBadge text={item.country} isDark={isDark} /> : null}
          {item.status ? <MetaBadge text={item.status} isDark={isDark} /> : null}
          {item.magnitude ? <MetaBadge text={`M ${item.magnitude}`} isDark={isDark} /> : null}
        </div>
      )}

      {item.link ? (
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#0284c7', fontSize: '0.77rem', fontWeight: 800, textDecoration: 'none' }}
        >
          อ่านข่าวต้นทาง →
        </a>
      ) : null}
    </article>
  );
}

function MetaBadge({ text, subtle = false, tone, isDark = false }) {
  return (
    <span
      style={{
        background: subtle
          ? isDark
            ? 'rgba(8,19,38,0.7)'
            : 'rgba(255,255,255,0.92)'
          : isDark
            ? 'rgba(96,202,242,0.14)'
            : 'rgba(148,163,184,0.16)',
        color: tone || 'var(--text-main)',
        border: `1px solid ${isDark ? 'rgba(125,211,252,0.16)' : 'rgba(148,163,184,0.2)'}`,
        borderRadius: '999px',
        padding: '4px 9px',
        fontSize: '0.68rem',
        fontWeight: 800,
      }}
    >
      {text}
    </span>
  );
}

function EmptyState({ title, desc, isDark = false }) {
  return (
    <div
      style={{
        borderRadius: '18px',
        border: '1px dashed var(--border-color)',
        padding: '24px',
        textAlign: 'center',
        background: isDark ? '#132745' : '#f7fbff',
      }}
    >
      <div style={{ color: 'var(--text-main)', fontWeight: 900 }}>{title}</div>
      <div style={{ color: 'var(--text-sub)', fontSize: '0.82rem', marginTop: '6px', lineHeight: 1.6 }}>{desc}</div>
    </div>
  );
}

function BentoSection({ icon, title, desc, items, isDark = false }) {
  return (
    <SectionCard>
      <CardTitle eyebrow={icon} title={title} desc={desc} />
      {!items.length ? (
        <EmptyState title={`ยังไม่มี${title}`} desc="ตอนนี้ยังไม่มีประเด็นใหม่ในหมวดนี้" isDark={isDark} />
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {items.map((item, index) => (
            <NewsItem key={`${title}-${item.title}-${index}`} item={item} compact isDark={isDark} />
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function WeatherDayCard({ day, index, isDark = false }) {
  return (
    <div
      style={{
        background:
          index === 0
            ? isDark
              ? 'linear-gradient(180deg, rgba(14,165,233,0.38), rgba(19,39,69,0.96))'
              : 'linear-gradient(180deg, rgba(14,165,233,0.18), rgba(255,255,255,0.68))'
            : isDark
              ? 'linear-gradient(180deg, rgba(8,19,38,0.92), rgba(19,39,69,0.9))'
              : 'linear-gradient(180deg, rgba(255,255,255,0.92), rgba(221,240,255,0.8))',
        borderRadius: '18px',
        border: `1px solid ${isDark ? 'rgba(125,211,252,0.16)' : 'var(--border-color)'}`,
        padding: '14px',
        display: 'grid',
        gap: '7px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
        <div style={{ color: 'var(--text-main)', fontWeight: 900, fontSize: '0.8rem' }}>
          {index === 0 ? 'วันนี้' : new Date(day.time).toLocaleDateString('th-TH', { weekday: 'short' })}
        </div>
        <span style={{ color: 'var(--text-sub)', fontSize: '0.7rem' }}>
          {new Date(day.time).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
        </span>
      </div>
      <div style={{ color: 'var(--text-main)', fontWeight: 800, fontSize: '0.83rem', lineHeight: 1.5 }}>{day.label}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ color: '#ea580c', fontWeight: 900, fontSize: '1.15rem' }}>{day.max != null ? `${day.max}°` : '-'}</div>
        <div style={{ color: '#2563eb', fontWeight: 800, fontSize: '0.84rem', alignSelf: 'end' }}>
          ต่ำสุด {day.min != null ? `${day.min}°` : '-'}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', color: 'var(--text-sub)', fontSize: '0.72rem' }}>
        <span>ฝน {day.rainChance ?? '-'}%</span>
        <span>{day.rainSum || 0} มม.</span>
      </div>
    </div>
  );
}

function formatApiItems(items = []) {
  return items.map((item) => ({
    ...item,
    categoryLabel: categoryLabels[item.category] || 'ข่าว',
    publishedAtLabel: item.publishedAt
      ? (() => {
          const d = new Date(item.publishedAt);
          if (Number.isNaN(d.getTime())) return item.publishedAt;
          return d.toLocaleString('th-TH', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          });
        })()
      : '-',
    publishedAgoLabel: item.publishedAt
      ? (() => {
          const d = new Date(item.publishedAt);
          if (Number.isNaN(d.getTime())) return '';
          const diffMs = Date.now() - d.getTime();
          if (diffMs < 0) return '';
          const hours = Math.floor(diffMs / 3600000);
          const days = Math.floor(diffMs / 86400000);
          if (hours < 1) return 'ไม่ถึง 1 ชม.';
          if (hours < 24) return `${hours} ชม.ที่ผ่านมา`;
          if (days <= 7) return `${days} วันที่ผ่านมา`;
          return '';
        })()
      : '',
  }));
}

function readCachedNews() {
  try {
    const raw = sessionStorage.getItem(NEWS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.payload || !parsed?.savedAt) return null;
    if (Date.now() - parsed.savedAt > NEWS_CACHE_TTL_MS) return null;
    return parsed.payload;
  } catch {
    return null;
  }
}

function writeCachedNews(payload) {
  try {
    sessionStorage.setItem(NEWS_CACHE_KEY, JSON.stringify({ payload, savedAt: Date.now() }));
  } catch {
    // Ignore cache write failures.
  }
}

export default function NewsPage() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState(() => readCachedNews());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDark, setIsDark] = useState(document.body.classList.contains('dark-theme'));

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const syncTheme = () => setIsDark(document.body.classList.contains('dark-theme'));
    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  const loadNews = async ({ silent = false } = {}) => {
    if (!silent || !data) setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/news');
      if (!response.ok) {
        throw new Error('ยังไม่สามารถโหลดข่าวได้ในขณะนี้');
      }
      const payload = await response.json();
      setData(payload);
      writeCachedNews(payload);
    } catch (fetchError) {
      setError(fetchError.message || 'ขออภัย ขณะนี้ยังไม่สามารถแสดงข่าวได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cached = readCachedNews();
    if (cached) {
      setData(cached);
      setLoading(false);
      loadNews({ silent: true });
    } else {
      loadNews();
    }
    const timer = setInterval(() => loadNews({ silent: true }), 10 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const tabs = [
    { id: 'overview', label: isMobile ? 'สรุป' : 'ภาพรวม', icon: '✦' },
    { id: 'thailand', label: isMobile ? 'ไทย' : 'ข่าวไทย', icon: '🇹🇭' },
    { id: 'global', label: isMobile ? 'โลก' : 'ต่างประเทศ', icon: '🌐' },
    { id: 'climate', label: isMobile ? 'ภูมิอากาศ' : 'ภูมิอากาศโลก', icon: '🌡️' },
  ];

  const thaiGroups = useMemo(() => {
    if (!data) return {};
    return {
      warnings: formatApiItems(data.thailand?.warnings || []),
      storms: formatApiItems(data.thailand?.storms || []),
      earthquakes: formatApiItems(data.thailand?.earthquakes || []),
      disasters: formatApiItems(data.thailand?.disasters || []),
    };
  }, [data]);

  const globalGroups = useMemo(() => {
    if (!data) return {};
    return {
      alerts: formatApiItems(data.global?.alerts || []),
      earthquakes: formatApiItems(data.global?.earthquakes || []),
      disasters: formatApiItems(data.global?.disasters || []),
      climate: formatApiItems(data.global?.climate || []),
    };
  }, [data]);

  const weatherDays = data?.weather?.days || [];
  const digestBullets = data?.digest?.bullets || [];
  const topStories = data?.topStories || [];
  const leadThaiStory = thaiGroups.warnings?.[0] || thaiGroups.storms?.[0] || thaiGroups.disasters?.[0];
  const leadGlobalStory = globalGroups.alerts?.[0] || globalGroups.earthquakes?.[0] || globalGroups.disasters?.[0];
  const leadClimateStory = globalGroups.climate?.[0];
  const leadStory = topStories[0] || leadThaiStory || leadGlobalStory || leadClimateStory;

  return (
    <div
      className="hide-scrollbar"
      style={{
        minHeight: '100%',
        background:
          'radial-gradient(circle at top left, rgba(20,184,166,0.16), transparent 28%), radial-gradient(circle at top right, rgba(59,130,246,0.14), transparent 30%), var(--bg-app)',
        padding: isMobile ? '14px' : '28px',
        paddingBottom: isMobile ? '88px' : '42px',
      }}
    >
      <div style={{ maxWidth: '1160px', margin: '0 auto', display: 'grid', gap: '16px' }}>
        <SectionCard
          style={{
            background: 'linear-gradient(135deg, #115e59 0%, #0369a1 45%, #1d4ed8 100%)',
            color: '#fff',
            border: 'none',
            boxShadow: '0 24px 60px rgba(2,132,199,0.22)',
          }}
        >
          <div style={{ position: 'absolute', inset: 'auto -80px -120px auto', width: '260px', height: '260px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ position: 'absolute', inset: '-60px auto auto -80px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />

          <div style={{ position: 'relative', display: 'grid', gap: '18px' }}>
            {!!topStories.length && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  flexWrap: 'wrap',
                  padding: '10px 14px',
                  borderRadius: '16px',
                  background: 'rgba(127,29,29,0.28)',
                  border: '1px solid rgba(254,202,202,0.28)',
                }}
              >
                <span style={{ fontSize: '0.72rem', fontWeight: 900, letterSpacing: '0.04em' }}>BREAKING</span>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, lineHeight: 1.5 }}>
                  {topStories.slice(0, 3).map((item) => item.title).join(' • ')}
                </span>
              </div>
            )}
            <CardTitle
              eyebrow="ข่าวเด่น"
              title="ข่าวสารอากาศและภัยพิบัติ"
              light
              action={
                <button
                  onClick={loadNews}
                  style={{
                    border: '1px solid rgba(255,255,255,0.26)',
                    borderRadius: '999px',
                    padding: '10px 14px',
                    background: 'rgba(255,255,255,0.08)',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                  }}
                >
                  รีเฟรชข่าว
                </button>
              }
            />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: '14px',
                alignItems: 'stretch',
              }}
            >
              <div
                style={{
                  background: isDark ? 'rgba(8,19,38,0.42)' : 'rgba(255,255,255,0.18)',
                  borderRadius: '24px',
                  padding: isMobile ? '16px' : '20px',
                  border: isDark ? '1px solid rgba(125,211,252,0.16)' : '1px solid rgba(255,255,255,0.22)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <div style={{ fontSize: '0.72rem', fontWeight: 800, opacity: 0.82, marginBottom: '8px' }}>
                  อัปเดตล่าสุด {data?.labels?.generatedAt || '-'}
                </div>
                <div style={{ fontSize: isMobile ? '1rem' : '1.24rem', fontWeight: 900, lineHeight: 1.55 }}>
                  {data?.digest?.headline || 'รวมประเด็นสำคัญด้านอากาศและภัยพิบัติไว้ในที่เดียว'}
                </div>
                {!!digestBullets.length && (
                  <div style={{ marginTop: '14px', display: 'grid', gap: '8px' }}>
                    {digestBullets.slice(0, 4).map((bullet) => (
                      <div
                        key={bullet}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '14px 1fr',
                          gap: '8px',
                          alignItems: 'start',
                          fontSize: '0.84rem',
                          lineHeight: 1.6,
                        }}
                      >
                        <span style={{ fontWeight: 900 }}>•</span>
                        <span>{bullet}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {tabs.filter((tab) => tab.id !== 'climate').map((tab) => {
                const active = tab.id === activeTab;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      border: 'none',
                      borderRadius: '999px',
                      padding: '10px 14px',
                      background: active ? '#ffffff' : 'rgba(255,255,255,0.14)',
                      color: active ? '#0f172a' : '#ffffff',
                      cursor: 'pointer',
                      fontWeight: 900,
                      fontSize: '0.82rem',
                    }}
                  >
                    {tab.icon} {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </SectionCard>

        {loading ? (
          <SectionCard>
            <div style={{ textAlign: 'center', padding: '34px 12px', color: 'var(--text-sub)' }}>กำลังอัปเดตข่าวล่าสุด...</div>
          </SectionCard>
        ) : null}

        {error ? (
          <SectionCard>
            <div style={{ color: '#dc2626', fontWeight: 800 }}>{error}</div>
          </SectionCard>
        ) : null}

        {!loading && !error && data && activeTab === 'overview' ? (
          <div
            style={{
              display: 'grid',
              gap: '14px',
              maxWidth: '860px',
              margin: '0 auto',
            }}
          >
            {!!weatherDays.length && (
              <section
                style={{
                  display: 'grid',
                  gap: '10px',
                }}
              >
                <div style={{ color: 'var(--text-main)', fontWeight: 900, fontSize: '0.95rem' }}>พยากรณ์วันนี้ พรุ่งนี้ และ 7 วันข้างหน้า</div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(7, minmax(0, 1fr))',
                    gap: '10px',
                  }}
                >
                  {weatherDays.slice(0, 7).map((day, index) => (
                    <WeatherDayCard key={`${day.time}-${index}`} day={day} index={index} isDark={isDark} />
                  ))}
                </div>
              </section>
            )}

            {leadStory ? (
              <article
                style={{
                  background: isDark
                    ? 'linear-gradient(180deg, rgba(8,19,38,0.96), rgba(15,33,63,0.98))'
                    : 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(239,248,255,0.96))',
                  borderRadius: '24px',
                  border: '1px solid var(--border-color)',
                  padding: isMobile ? '16px' : '20px',
                }}
              >
                <div style={{ color: '#0f766e', fontWeight: 900, fontSize: '0.76rem', marginBottom: '10px' }}>ข่าวนำ</div>
                <NewsItem item={leadStory} isDark={isDark} />
              </article>
            ) : null}

            {topStories.slice(1).length ? (
              <div style={{ display: 'grid', gap: '10px' }}>
                {topStories.slice(1).map((item, index) => (
                  <NewsItem key={`overview-feed-${item.id || item.title || index}`} item={item} compact={false} isDark={isDark} />
                ))}
              </div>
            ) : !leadStory ? (
              <EmptyState title="ยังไม่มีข่าวเด่นในตอนนี้" desc="โปรดลองรีเฟรชใหม่อีกครั้งในอีกสักครู่" isDark={isDark} />
            ) : null}
          </div>
        ) : null}

        {!loading && !error && data && activeTab === 'thailand' ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
              gap: '16px',
            }}
          >
            {thaiSectionConfig.map((section) => (
              <SectionCard key={section.key}>
                <CardTitle eyebrow={section.icon} title={section.title} desc={section.desc} />
                {!thaiGroups[section.key]?.length ? (
                  <EmptyState title={`ยังไม่มี${section.title}`} desc="ตอนนี้ยังไม่มีประเด็นใหม่ในหมวดนี้" isDark={isDark} />
                ) : (
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {thaiGroups[section.key].slice(0, 5).map((item, index) => (
                      <NewsItem key={`${section.key}-${item.title}-${index}`} item={item} compact isDark={isDark} />
                    ))}
                  </div>
                )}
              </SectionCard>
            ))}
          </div>
        ) : null}

        {!loading && !error && data && activeTab === 'global' ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))',
              gap: '16px',
            }}
          >
            {globalSectionConfig.filter((s) => s.key !== 'climate').map((section) => (
              <SectionCard key={section.key}>
                <CardTitle eyebrow={section.icon} title={section.title} desc={section.desc} />
                {!globalGroups[section.key]?.length ? (
                  <EmptyState title={`ยังไม่มี${section.title}`} desc="ตอนนี้ยังไม่มีประเด็นใหม่ในหมวดนี้" isDark={isDark} />
                ) : (
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {globalGroups[section.key].slice(0, 5).map((item, index) => (
                      <NewsItem key={`${section.key}-${item.title}-${index}`} item={item} compact isDark={isDark} />
                    ))}
                  </div>
                )}
              </SectionCard>
            ))}
          </div>
        ) : null}

        {!loading && !error && data && activeTab === 'climate' ? (
          <div style={{ display: 'grid', gap: '16px' }}>
            <SectionCard
              style={{
                background: isDark
                  ? 'linear-gradient(135deg, rgba(5,150,105,0.18), rgba(3,105,161,0.22))'
                  : 'linear-gradient(135deg, rgba(5,150,105,0.08), rgba(3,105,161,0.10))',
                border: isDark ? '1px solid rgba(52,211,153,0.2)' : '1px solid rgba(5,150,105,0.2)',
              }}
            >
              <CardTitle
                eyebrow="🌡️ Climate Science"
                title="ภูมิอากาศ เอลนีโญ่ & ลานีญ่า"
                desc="ติดตามงานวิชาการ ปรากฏการณ์ ENSO ล่าสุด การเปลี่ยนแปลงสภาพภูมิอากาศ จาก NASA และองค์การอุตุนิยมวิทยาโลก (WMO)"
              />
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
                  gap: '12px',
                  marginBottom: '16px',
                }}
              >
                <div
                  style={{
                    background: isDark ? 'rgba(5,150,105,0.16)' : 'rgba(5,150,105,0.08)',
                    border: '1px solid rgba(5,150,105,0.24)',
                    borderRadius: '18px',
                    padding: '16px',
                  }}
                >
                  <div style={{ fontSize: '1.6rem', marginBottom: '8px' }}>🌊</div>
                  <div style={{ fontWeight: 900, fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '6px' }}>เอลนีโญ่ (El Niño)</div>
                  <div style={{ color: 'var(--text-sub)', fontSize: '0.8rem', lineHeight: 1.6 }}>
                    ปรากฏการณ์ที่น้ำทะเลในมหาสมุทรแปซิฟิกตะวันออกมีอุณหภูมิสูงกว่าปกติ ทำให้ฝนลดลงในหลายพื้นที่ของเอเชียตะวันออกเฉียงใต้
                  </div>
                </div>
                <div
                  style={{
                    background: isDark ? 'rgba(3,105,161,0.16)' : 'rgba(3,105,161,0.08)',
                    border: '1px solid rgba(3,105,161,0.24)',
                    borderRadius: '18px',
                    padding: '16px',
                  }}
                >
                  <div style={{ fontSize: '1.6rem', marginBottom: '8px' }}>🌧️</div>
                  <div style={{ fontWeight: 900, fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '6px' }}>ลานีญ่า (La Niña)</div>
                  <div style={{ color: 'var(--text-sub)', fontSize: '0.8rem', lineHeight: 1.6 }}>
                    น้ำทะเลในมหาสมุทรแปซิฟิกตะวันออกเย็นกว่าปกติ มักนำฝนมากและอาจก่อให้เกิดน้ำท่วมในภูมิภาคเอเชีย
                  </div>
                </div>
              </div>
            </SectionCard>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
                gap: '16px',
              }}
            >
              <BentoSection
                icon="🌡️"
                title="ข่าวภูมิอากาศล่าสุด"
                desc="งานวิชาการและข่าวสารจาก NASA Climate & WMO"
                items={(globalGroups.climate || []).filter((item) => item.source === 'NASA Climate').slice(0, 5)}
                isDark={isDark}
              />
              <BentoSection
                icon="🌍"
                title="ประกาศ WMO"
                desc="ข่าวสารจากองค์การอุตุนิยมวิทยาโลก"
                items={(globalGroups.climate || []).filter((item) => item.source === 'WMO').slice(0, 5)}
                isDark={isDark}
              />
            </div>

            {!!(globalGroups.climate || []).length && (
              <SectionCard>
                <CardTitle eyebrow="📚 ทั้งหมด" title="ข่าวภูมิอากาศทั้งหมด" desc="รวมข่าววิทยาศาสตร์ภูมิอากาศจากทุกแหล่ง" />
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))',
                    gap: '10px',
                  }}
                >
                  {(globalGroups.climate || []).map((item, index) => (
                    <NewsItem key={`climate-all-${item.id || index}`} item={item} compact isDark={isDark} />
                  ))}
                </div>
              </SectionCard>
            )}

            {!(globalGroups.climate || []).length && (
              <EmptyState
                title="ยังไม่มีข่าวภูมิอากาศในขณะนี้"
                desc="โปรดลองรีเฟรชใหม่อีกครั้ง หรือตรวจสอบที่เว็บไซต์ NASA Climate และ WMO โดยตรง"
                isDark={isDark}
              />
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
