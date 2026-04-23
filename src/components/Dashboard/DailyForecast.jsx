import React from 'react';

export default function DailyForecast({ daily, isMobile, cardBg, borderColor, textColor, subTextColor }) {
  return (
    <div style={{ background: cardBg, borderRadius: isMobile ? '20px' : '25px', padding: isMobile ? '15px' : '25px', border: `1px solid ${borderColor}`, flex: 1, flexShrink: 0, minWidth: 0, overflow: 'hidden' }}>
       <h3 style={{ margin: '0 0 15px 0', fontSize: '0.95rem', color: textColor }}>📅 พยากรณ์ 7 วัน</h3>
       <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {daily?.time?.map((t, idx) => (
             <div key={idx} style={{ display: 'flex', flexDirection: 'column', paddingBottom: idx !== 6 ? '12px' : '0', borderBottom: idx !== 6 ? `1px solid ${borderColor}` : 'none' }}>
                
                <div style={isMobile ? { display: 'grid', gridTemplateColumns: '40px 40px 1fr', alignItems: 'center' } : { display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: isMobile ? '0.9rem' : '0.95rem', fontWeight: 'bold', color: textColor, width: isMobile ? 'auto' : '45px' }}>{idx === 0 ? 'วันนี้' : new Date(t).toLocaleDateString('th-TH', {weekday:'short'})}</div>
                    <div style={{ fontSize: isMobile ? '1.2rem' : '1.4rem', textAlign: 'center', width: isMobile ? 'auto' : '30px' }}>{daily.weathercode[idx] > 50 ? '🌧️' : '🌤️'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                       <span style={{ fontSize: '0.85rem', color: subTextColor, fontWeight: 'bold', width: '25px', textAlign: 'right' }}>{Math.round(daily?.temperature_2m_min?.[idx] || 0)}°</span>
                       <div style={{ flex: 1, height: '4px', background: 'var(--border-color)', borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
                          <div style={{ position: 'absolute', left: '20%', right: '20%', top: 0, bottom: 0, background: 'linear-gradient(to right, #3b82f6, #f97316)' }}></div>
                       </div>
                       <span style={{ fontSize: '0.85rem', color: textColor, fontWeight: '900', width: '25px' }}>{Math.round(daily?.temperature_2m_max?.[idx] || 0)}°</span>
                    </div>
                </div>

                <div style={isMobile ? { marginTop: '8px', background: 'var(--bg-overlay)', padding: '8px 10px', borderRadius: '10px', fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold', display: 'grid', gridTemplateColumns: '1fr', gap: '6px' } : { marginLeft: '55px', display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginTop: '8px', background: 'var(--bg-overlay)', padding: '6px 10px', borderRadius: '10px', fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                     <span style={{fontSize:'0.9rem'}}>☔</span> 
                     {daily?.precipitation_probability_max?.[idx] || 0}% 
                     {daily?.precipitation_sum?.[idx] > 0 && <span style={{ opacity: 0.7, marginLeft: '2px' }}>({daily.precipitation_sum[idx]}mm)</span>}
                   </div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{fontSize:'0.9rem'}}>🥵</span> {Math.round(daily?.apparent_temperature_max?.[idx] || 0)}°</div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{fontSize:'0.9rem'}}>😷</span> 
                      <span style={{ color: daily?.pm25_max?.[idx] > 75 ? '#ef4444' : daily?.pm25_max?.[idx] > 37.5 ? '#f97316' : daily?.pm25_max?.[idx] > 25 ? '#eab308' : daily?.pm25_max?.[idx] > 15 ? '#22c55e' : '#0ea5e9' }}>
                        {daily?.pm25_max?.[idx] || 0} <span style={{fontSize:'0.6rem'}}>µg/m³</span>
                      </span>
                   </div>
                </div>

             </div>
          ))}
       </div>
    </div>
  );
}
