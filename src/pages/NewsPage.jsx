import React, { useEffect, useMemo, useState } from 'react';

const severityStyles = {
  high: {
    color: '#dc2626',
    bg: 'rgba(220,38,38,0.12)',
    border: 'rgba(220,38,38,0.3)',
    label: 'เร่งด่วน',
  },
  medium: {
    color: '#d97706',
    bg: 'rgba(217,119,6,0.12)',
    border: 'rgba(217,119,6,0.3)',
    label: 'เฝ้าระวัง',
  },
  normal: {
    color: '#0284c7',
    bg: 'rgba(2,132,199,0.10)',
    border: 'rgba(2,132,199,0.25)',
    label: 'ข้อมูล',
  },
};

const sourceLinkGroups = [
  { label: 'กรมอุตุนิยมวิทยา', url: 'https://www.tmd.go.th/' },
  { label: 'กรมป้องกันและบรรเทาสาธารณภัย', url: 'https://www.disaster.go.th/' },
  { label: 'GISTDA Fire Monitor', url: 'https://fire.gistda.or.th/' },
  { label: 'GDACS', url: 'https://www.gdacs.org/' },
  { label: 'USGS Earthquake', url: 'https://earthquake.usgs.gov/' },
  { label: 'ReliefWeb', url: 'https://reliefweb.int/disasters' },
];

function SectionCard({ children, style }) {
  return (
    <section
      style={{
        background: 'var(--bg-card)',
        borderRadius: '22px',
        border: '1px solid var(--border-color)',
        padding: '18px',
        ...style,
      }}
    >
      {children}
    </section>
  );
}

function CardTitle({ title, desc, action }) {
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
        <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1rem', fontWeight: 800 }}>{title}</h2>
        {desc ? (
          <p style={{ margin: '5px 0 0', color: 'var(--text-sub)', fontSize: '0.8rem', lineHeight: 1.6 }}>{desc}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

function MetricCard({ label, value, tone = '#0ea5e9' }) {
  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        borderRadius: '16px',
        padding: '14px',
        border: '1px solid var(--border-color)',
      }}
    >
      <div style={{ color: 'var(--text-sub)', fontSize: '0.74rem', marginBottom: '4px' }}>{label}</div>
      <div style={{ color: tone, fontWeight: 800, fontSize: '1.25rem' }}>{value}</div>
    </div>
  );
}

function NewsItem({ item }) {
  const severity = severityStyles[item.severity] || severityStyles.normal;

  return (
    <article
      style={{
        background: 'var(--bg-secondary)',
        borderRadius: '16px',
        border: `1px solid ${severity.border}`,
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span
            style={{
              background: severity.bg,
              color: severity.color,
              border: `1px solid ${severity.border}`,
              borderRadius: '999px',
              padding: '4px 10px',
              fontSize: '0.7rem',
              fontWeight: 800,
            }}
          >
            {severity.label}
          </span>
          {item.source ? (
            <span
              style={{
                background: 'rgba(14,165,233,0.1)',
                color: '#0369a1',
                borderRadius: '999px',
                padding: '4px 10px',
                fontSize: '0.7rem',
                fontWeight: 700,
              }}
            >
              {item.source}
            </span>
          ) : null}
        </div>
        <span style={{ color: 'var(--text-sub)', fontSize: '0.72rem' }}>{item.publishedAtLabel || '-'}</span>
      </div>

      <div>
        <div style={{ color: 'var(--text-main)', fontWeight: 800, fontSize: '0.95rem', lineHeight: 1.5 }}>{item.title}</div>
        {item.summary ? (
          <div style={{ color: 'var(--text-sub)', fontSize: '0.82rem', lineHeight: 1.7, marginTop: '6px' }}>{item.summary}</div>
        ) : null}
      </div>

      {(item.eventLabel || item.country || item.status || item.magnitude) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {item.eventLabel ? <MetaBadge text={item.eventLabel} /> : null}
          {item.country ? <MetaBadge text={item.country} /> : null}
          {item.status ? <MetaBadge text={item.status} /> : null}
          {item.magnitude ? <MetaBadge text={`M ${item.magnitude}`} /> : null}
        </div>
      )}

      {item.link ? (
        <div>
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#0284c7', fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none' }}
          >
            เปิดแหล่งข่าว →
          </a>
        </div>
      ) : null}
    </article>
  );
}

function MetaBadge({ text }) {
  return (
    <span
      style={{
        background: 'rgba(148,163,184,0.16)',
        color: 'var(--text-main)',
        borderRadius: '999px',
        padding: '4px 8px',
        fontSize: '0.7rem',
        fontWeight: 700,
      }}
    >
      {text}
    </span>
  );
}

function EmptyState({ title, desc }) {
  return (
    <div
      style={{
        borderRadius: '18px',
        border: '1px dashed var(--border-color)',
        padding: '24px',
        textAlign: 'center',
        background: 'var(--bg-secondary)',
      }}
    >
      <div style={{ color: 'var(--text-main)', fontWeight: 800 }}>{title}</div>
      <div style={{ color: 'var(--text-sub)', fontSize: '0.82rem', marginTop: '6px', lineHeight: 1.6 }}>{desc}</div>
    </div>
  );
}

function formatApiItems(items = []) {
  return items.map((item) => ({
    ...item,
    publishedAtLabel: item.publishedAt ? new Date(item.publishedAt).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-',
  }));
}

export default function NewsPage() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const loadNews = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/news', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('ยังไม่สามารถโหลดข่าวได้ในขณะนี้');
      }
      const payload = await response.json();
      setData(payload);
    } catch (fetchError) {
      setError(fetchError.message || 'ขออภัย ขณะนี้ยังไม่สามารถแสดงข่าวได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNews();
    const timer = setInterval(loadNews, 10 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const tabs = [
    { id: 'overview', label: isMobile ? 'สรุป' : 'ภาพรวม' },
    { id: 'thailand', label: isMobile ? 'ไทย' : 'ข่าวไทย' },
    { id: 'global', label: isMobile ? 'โลก' : 'ต่างประเทศ' },
  ];

  const thaiItems = useMemo(() => {
    if (!data) return [];
    return formatApiItems([
      ...(data.thailand?.warnings || []),
      ...(data.thailand?.storms || []),
      ...(data.thailand?.earthquakes || []),
      ...(data.thailand?.disasters || []),
    ]).sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
  }, [data]);

  const globalItems = useMemo(() => {
    if (!data) return [];
    return formatApiItems([
      ...(data.global?.alerts || []),
      ...(data.global?.earthquakes || []),
      ...(data.global?.disasters || []),
    ]).sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
  }, [data]);

  const weatherDays = data?.weather?.days || [];

  return (
    <div
      className="hide-scrollbar"
      style={{
        minHeight: '100%',
        background: 'var(--bg-app)',
        padding: isMobile ? '14px' : '28px',
        paddingBottom: isMobile ? '88px' : '42px',
      }}
    >
      <div style={{ maxWidth: '1120px', margin: '0 auto', display: 'grid', gap: '16px' }}>
        <SectionCard
          style={{
            background: 'linear-gradient(135deg, #0f766e 0%, #0369a1 45%, #1d4ed8 100%)',
            color: '#fff',
            border: 'none',
            boxShadow: '0 18px 40px rgba(3,105,161,0.22)',
          }}
        >
          <div style={{ display: 'grid', gap: '14px' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: isMobile ? '1.35rem' : '1.9rem', fontWeight: 900, lineHeight: 1.3 }}>
                ข่าวสารอากาศและภัยพิบัติ
              </h1>
              <p style={{ margin: '8px 0 0', maxWidth: '760px', fontSize: '0.88rem', lineHeight: 1.7, opacity: 0.92 }}>
                รวมข่าวจาก TMD, Open-Meteo, GDACS, USGS และ ReliefWeb พร้อมสรุปกลางที่อ่านได้ทันทีและกดออกไปดูต้นทางได้จริง
              </p>
            </div>

            {data?.digest ? (
              <div
                style={{
                  background: 'rgba(255,255,255,0.14)',
                  borderRadius: '20px',
                  padding: isMobile ? '14px' : '18px',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.18)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, opacity: 0.82 }}>
                    สรุปล่าสุด {data.labels?.generatedAt || ''}
                  </div>
                </div>
                <div style={{ fontSize: isMobile ? '0.96rem' : '1.08rem', fontWeight: 800, lineHeight: 1.6 }}>{data.digest.headline}</div>
                {!!data.digest.bullets?.length && (
                  <div style={{ marginTop: '10px', display: 'grid', gap: '6px' }}>
                    {data.digest.bullets.map((bullet) => (
                      <div key={bullet} style={{ fontSize: '0.83rem', lineHeight: 1.6 }}>
                        • {bullet}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {tabs.map((tab) => {
                const active = tab.id === activeTab;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      border: 'none',
                      borderRadius: '999px',
                      padding: '10px 14px',
                      background: active ? '#ffffff' : 'rgba(255,255,255,0.16)',
                      color: active ? '#0f172a' : '#ffffff',
                      cursor: 'pointer',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
              <button
                onClick={loadNews}
                style={{
                  border: '1px solid rgba(255,255,255,0.28)',
                  borderRadius: '999px',
                  padding: '10px 14px',
                  background: 'transparent',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                }}
              >
                รีเฟรชข้อมูล
              </button>
            </div>
          </div>
        </SectionCard>

        {loading ? (
          <SectionCard>
            <div style={{ textAlign: 'center', padding: '28px 12px', color: 'var(--text-sub)' }}>กำลังอัปเดตข่าวล่าสุด...</div>
          </SectionCard>
        ) : null}

        {error ? (
          <SectionCard>
            <div style={{ color: '#dc2626', fontWeight: 700 }}>{error}</div>
          </SectionCard>
        ) : null}

        {!loading && !error && data && activeTab === 'overview' ? (
          <>
            <SectionCard>
              <CardTitle
                title="ภาพรวมสถานการณ์"
                desc="สรุปประเด็นสำคัญจากข่าวอากาศและภัยพิบัติที่ควรรู้ในช่วงนี้"
              />
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(5, minmax(0, 1fr))',
                  gap: '10px',
                }}
              >
                <MetricCard label="เตือนไทย" value={data.digest?.overview?.thaiWarningCount ?? 0} tone="#dc2626" />
                <MetricCard label="เหตุไทย" value={data.digest?.overview?.thaiDisasterCount ?? 0} tone="#ea580c" />
                <MetricCard label="เตือนโลก" value={data.digest?.overview?.globalAlertCount ?? 0} tone="#7c3aed" />
                <MetricCard label="เหตุโลก" value={data.digest?.overview?.globalDisasterCount ?? 0} tone="#0284c7" />
                <MetricCard label="แผ่นดินไหว" value={data.digest?.overview?.earthquakeCount ?? 0} tone="#16a34a" />
              </div>
            </SectionCard>

            <SectionCard>
              <CardTitle
                title="อากาศกรุงเทพฯ 7 วัน"
                desc={data.weather?.summary || 'ดูแนวโน้มอากาศกรุงเทพฯ สำหรับสัปดาห์นี้'}
              />
              {!weatherDays.length ? (
                <EmptyState title="ยังไม่มีพยากรณ์อากาศ" desc="โปรดลองใหม่อีกครั้งในอีกสักครู่" />
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(7, minmax(0, 1fr))',
                    gap: '10px',
                  }}
                >
                  {weatherDays.map((day, index) => (
                    <div
                      key={day.time}
                      style={{
                        background: index === 0 ? 'linear-gradient(180deg, rgba(14,165,233,0.18), rgba(255,255,255,0.3))' : 'var(--bg-secondary)',
                        borderRadius: '16px',
                        border: '1px solid var(--border-color)',
                        padding: '12px',
                        display: 'grid',
                        gap: '6px',
                      }}
                    >
                      <div style={{ color: 'var(--text-main)', fontWeight: 800, fontSize: '0.78rem' }}>
                        {index === 0 ? 'วันนี้' : new Date(day.time).toLocaleDateString('th-TH', { weekday: 'short' })}
                      </div>
                      <div style={{ color: 'var(--text-sub)', fontSize: '0.72rem' }}>
                        {new Date(day.time).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                      </div>
                      <div style={{ color: 'var(--text-main)', fontSize: '0.82rem', lineHeight: 1.5 }}>{day.label}</div>
                      <div style={{ color: '#ea580c', fontWeight: 800 }}>{day.max}°C</div>
                      <div style={{ color: '#2563eb', fontWeight: 700, fontSize: '0.78rem' }}>ต่ำสุด {day.min}°C</div>
                      <div style={{ color: 'var(--text-sub)', fontSize: '0.74rem' }}>ฝน {day.rainChance}%</div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard>
              <CardTitle title="ลิงก์ต้นทาง" desc="เปิดดูข่าวหรือประกาศฉบับเต็มจากหน่วยงานโดยตรง" />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {sourceLinkGroups.map((item) => (
                  <a
                    key={item.label}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      textDecoration: 'none',
                      color: '#0284c7',
                      fontWeight: 700,
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '999px',
                      padding: '10px 14px',
                      fontSize: '0.8rem',
                    }}
                  >
                    {item.label} →
                  </a>
                ))}
              </div>
            </SectionCard>
          </>
        ) : null}

        {!loading && !error && data && activeTab === 'thailand' ? (
          <SectionCard>
            <CardTitle
              title="ข่าวและประกาศในประเทศไทย"
              desc="รวมประกาศเตือน พายุ แผ่นดินไหว และเหตุจาก ReliefWeb ที่เกี่ยวข้องกับประเทศไทย"
            />
            {!thaiItems.length ? (
              <EmptyState title="ยังไม่พบข่าวในหมวดประเทศไทย" desc="ตอนนี้ยังไม่มีประเด็นใหม่ในหมวดนี้" />
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {thaiItems.map((item, index) => (
                  <NewsItem key={`${item.source || 'th'}-${item.title}-${index}`} item={item} />
                ))}
              </div>
            )}
          </SectionCard>
        ) : null}

        {!loading && !error && data && activeTab === 'global' ? (
          <SectionCard>
            <CardTitle
              title="ข่าวและเหตุการณ์ต่างประเทศ"
              desc="รวม alert จาก GDACS เหตุแผ่นดินไหวจาก USGS และรายงานภัยพิบัติจาก ReliefWeb"
            />
            {!globalItems.length ? (
              <EmptyState title="ยังไม่พบข่าวต่างประเทศ" desc="ตอนนี้ยังไม่มีประเด็นใหม่ในหมวดนี้" />
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {globalItems.map((item, index) => (
                  <NewsItem key={`${item.source || 'global'}-${item.title}-${index}`} item={item} />
                ))}
              </div>
            )}
          </SectionCard>
        ) : null}
      </div>
    </div>
  );
}
