import React from 'react';

function getRankBadge(index) {
  if (index === 0) return '#f59e0b';
  if (index === 1) return '#94a3b8';
  if (index === 2) return '#f97316';
  return 'var(--text-sub)';
}

function formatValue(value, suffix = '') {
  return `${value}${suffix}`;
}

function StatListCard({ title, icon, accentColor, items, suffix, cardBg, borderColor, textColor, subTextColor, modeLabel }) {
  return (
    <div
      style={{
        background: cardBg,
        borderRadius: '20px',
        padding: '16px',
        border: `1px solid ${borderColor}`,
        boxShadow: `inset 0 1px 0 ${accentColor}22`,
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: accentColor, fontWeight: '900', fontSize: '0.95rem' }}>
            <span style={{ fontSize: '1.1rem' }}>{icon}</span>
            <span>{title}</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: subTextColor, marginTop: '4px' }}>{modeLabel}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {items.map((st, i) => (
          <div
            key={`${title}-${st.name}-${i}`}
            style={{
              display: 'grid',
              gridTemplateColumns: '34px minmax(0, 1fr) auto',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              background: 'var(--bg-secondary)',
              borderRadius: '14px',
              border: `1px solid ${borderColor}`,
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '999px',
                background: `${getRankBadge(i)}22`,
                color: getRankBadge(i),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: '900',
              }}
            >
              {i + 1}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  color: textColor,
                  fontWeight: 'bold',
                  fontSize: '0.86rem',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {st.name}
              </div>
            </div>
            <div style={{ color: accentColor, fontWeight: '900', fontSize: '0.92rem', whiteSpace: 'nowrap' }}>
              {formatValue(st.val, suffix)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TopStats({
  top5Heat, top5Cool, top5PM25, top5Rain,
  top5HeatY, top5CoolY, top5PM25Y, top5RainY,
  isMobile, cardBg, borderColor, textColor
}) {
  const subTextColor = 'var(--text-sub)';

  const realtimeCards = [
    { title: 'ร้อนจัดที่สุด', icon: '🔥', accentColor: '#ef4444', items: top5Heat, suffix: '°', modeLabel: 'ข้อมูลเรียลไทม์ล่าสุด' },
    { title: 'เย็นสบายที่สุด', icon: '❄️', accentColor: '#3b82f6', items: top5Cool, suffix: '°', modeLabel: 'ข้อมูลเรียลไทม์ล่าสุด' },
    { title: 'ฝุ่น PM2.5 สูงสุด', icon: '😷', accentColor: '#f97316', items: top5PM25, suffix: '', modeLabel: 'ข้อมูลเรียลไทม์ล่าสุด' },
    { title: 'โอกาสฝนสูงสุด', icon: '☔', accentColor: '#0ea5e9', items: top5Rain, suffix: '%', modeLabel: 'ข้อมูลเรียลไทม์ล่าสุด' },
  ];

  const yesterdayCards = [
    { title: 'ร้อนจัดที่สุด', icon: '🔥', accentColor: '#ef4444', items: top5HeatY, suffix: '°', modeLabel: 'สถิติสูงสุดของเมื่อวาน' },
    { title: 'เย็นสบายที่สุด', icon: '❄️', accentColor: '#3b82f6', items: top5CoolY, suffix: '°', modeLabel: 'สถิติสูงสุดของเมื่อวาน' },
    { title: 'ฝุ่น PM2.5 สูงสุด', icon: '😷', accentColor: '#f97316', items: top5PM25Y, suffix: '', modeLabel: 'สถิติสูงสุดของเมื่อวาน' },
    { title: 'โอกาสฝนสูงสุด', icon: '☔', accentColor: '#0ea5e9', items: top5RainY, suffix: '%', modeLabel: 'สถิติสูงสุดของเมื่อวาน' },
  ].filter((card) => Array.isArray(card.items) && card.items.length > 0);

  return (
    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div
        style={{
          background: cardBg,
          border: `1px solid ${borderColor}`,
          borderRadius: '24px',
          padding: isMobile ? '18px' : '20px 22px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: isMobile ? '1rem' : '1.05rem', color: textColor, fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>🏆</span>
              Top 5 ระดับประเทศ
            </div>
            <div style={{ fontSize: '0.78rem', color: subTextColor, marginTop: '5px', lineHeight: 1.6 }}>
              สรุปจังหวัดเด่นแบบเรียลไทม์และเทียบกับสถิติสูงสุดของเมื่อวานในรูปแบบที่ดูง่ายขึ้น
            </div>
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--bg-secondary)',
              border: `1px solid ${borderColor}`,
              borderRadius: '999px',
              padding: '8px 12px',
              color: textColor,
              fontWeight: 'bold',
              fontSize: '0.76rem',
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '999px', background: '#22c55e' }}></span>
            แสดงผลตลอด ไม่ต้องกดเปิด
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: textColor, fontWeight: '900', fontSize: '0.92rem' }}>
          <span style={{ color: '#22c55e' }}>●</span> เรียลไทม์ตอนนี้
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, minmax(0, 1fr))', gap: '14px', alignItems: 'start' }}>
          {realtimeCards.map((card) => (
            <StatListCard
              key={`realtime-${card.title}`}
              {...card}
              cardBg={cardBg}
              borderColor={borderColor}
              textColor={textColor}
              subTextColor={subTextColor}
            />
          ))}
        </div>
      </div>

      {yesterdayCards.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: textColor, fontWeight: '900', fontSize: '0.92rem' }}>
            <span style={{ color: '#a855f7' }}>●</span> สถิติสูงสุดของเมื่อวาน
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, minmax(0, 1fr))', gap: '14px', alignItems: 'start' }}>
            {yesterdayCards.map((card) => (
              <StatListCard
                key={`yesterday-${card.title}`}
                {...card}
                cardBg={cardBg}
                borderColor={borderColor}
                textColor={textColor}
                subTextColor={subTextColor}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
