import React from 'react';

function buildRows(daily) {
  const rowCount = Math.max(
    daily?.time?.length || 0,
    daily?.temperature_2m_max?.length || 0,
    daily?.temperature_2m_min?.length || 0,
    daily?.precipitation_probability_max?.length || 0,
    7
  );

  return Array.from({ length: rowCount }, (_, idx) => {
    const fallbackDate = new Date();
    fallbackDate.setDate(fallbackDate.getDate() + idx);

    const weatherCode = daily?.weathercode?.[idx] ?? 0;
    const rainProb = daily?.precipitation_probability_max?.[idx] || 0;

    return {
      time: daily?.time?.[idx] || fallbackDate.toISOString(),
      weatherCode,
      minTemp: Math.round(daily?.temperature_2m_min?.[idx] || daily?.temperature_2m_min?.[0] || 0),
      maxTemp: Math.round(daily?.temperature_2m_max?.[idx] || daily?.temperature_2m_max?.[0] || 0),
      rainProb,
      rainSum: daily?.precipitation_sum?.[idx] || 0,
      feelsLikeMax: Math.round(daily?.apparent_temperature_max?.[idx] || daily?.temperature_2m_max?.[idx] || daily?.temperature_2m_max?.[0] || 0),
      pm25Max: daily?.pm25_max?.[idx] || 0,
      icon: rainProb >= 60 || weatherCode > 60 ? '⛈️' : rainProb >= 35 || weatherCode > 50 ? '🌧️' : rainProb >= 15 ? '🌦️' : '🌤️',
    };
  });
}

export default function DailyForecast({ daily, isMobile, cardBg, borderColor, textColor, subTextColor, onShowDetails }) {
  const rows = buildRows(daily);

  return (
    <div style={{ background: cardBg, borderRadius: isMobile ? '20px' : '25px', padding: isMobile ? '15px' : '22px', border: `1px solid ${borderColor}`, flex: 1, flexShrink: 0, minWidth: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '15px' }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem', color: textColor }}>📅 พยากรณ์ 7 วัน</h3>
        {onShowDetails && (
          <button type="button" onClick={onShowDetails} style={{ border: `1px solid ${borderColor}`, background: 'var(--bg-secondary)', color: '#2563eb', borderRadius: '999px', padding: '7px 12px', fontSize: '0.72rem', fontWeight: 900, cursor: 'pointer' }}>
            ดูรายละเอียด ›
          </button>
        )}
      </div>
      <div style={isMobile ? { display: 'flex', flexDirection: 'column', gap: '15px' } : { display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '10px' }}>
        {rows.length > 0 ? (
          rows.map((row, idx) => (
            <div key={`${row.time}-${idx}`} style={isMobile ? { display: 'flex', flexDirection: 'column', paddingBottom: idx !== rows.length - 1 ? '12px' : '0', borderBottom: idx !== rows.length - 1 ? `1px solid ${borderColor}` : 'none' } : { border: `1px solid ${borderColor}`, borderRadius: '16px', padding: '13px 10px', background: 'var(--bg-secondary)', minHeight: 168, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', textAlign: 'center' }}>
              <div style={isMobile ? { display: 'grid', gridTemplateColumns: '40px 40px 1fr', alignItems: 'center' } : { display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: isMobile ? '0.9rem' : '0.78rem', fontWeight: 'bold', color: textColor, width: isMobile ? 'auto' : 'auto' }}>
                  {idx === 0 ? 'วันนี้' : new Date(row.time).toLocaleDateString('th-TH', { weekday: 'short' })}
                </div>
                <div style={{ fontSize: isMobile ? '1.2rem' : '1.75rem', textAlign: 'center', width: isMobile ? 'auto' : 'auto' }}>
                  {row.icon}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <span style={{ fontSize: '0.85rem', color: subTextColor, fontWeight: 'bold', width: '25px', textAlign: 'right' }}>{row.minTemp}°</span>
                  <div style={{ flex: 1, height: '4px', background: 'var(--border-color)', borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '20%', right: '20%', top: 0, bottom: 0, background: 'linear-gradient(to right, #3b82f6, #f97316)' }}></div>
                  </div>
                  <span style={{ fontSize: '0.85rem', color: textColor, fontWeight: '900', width: '25px' }}>{row.maxTemp}°</span>
                </div>
              </div>

              <div style={isMobile ? { marginTop: '8px', background: 'var(--bg-overlay)', padding: '8px 10px', borderRadius: '10px', fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold', display: 'grid', gridTemplateColumns: '1fr', gap: '6px' } : { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '7px', marginTop: '8px', background: 'transparent', padding: 0, borderRadius: '10px', fontSize: '0.7rem', color: subTextColor, fontWeight: 'bold' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.9rem' }}>☔</span>
                  {row.rainProb}%
                  {row.rainSum > 0 && <span style={{ opacity: 0.7, marginLeft: '2px' }}>({row.rainSum}mm)</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.9rem' }}>🥵</span> {row.feelsLikeMax}°
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.9rem' }}>😷</span>
                  <span style={{ color: row.pm25Max > 75 ? '#ef4444' : row.pm25Max > 37.5 ? '#f97316' : row.pm25Max > 25 ? '#eab308' : row.pm25Max > 15 ? '#22c55e' : '#0ea5e9' }}>
                    {row.pm25Max} <span style={{ fontSize: '0.6rem' }}>µg/m³</span>
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div style={{ padding: '12px 0 2px', color: subTextColor, fontSize: '0.85rem' }}>
            ยังไม่มีข้อมูลพยากรณ์รายวันสำหรับตำแหน่งนี้
          </div>
        )}
      </div>
    </div>
  );
}
