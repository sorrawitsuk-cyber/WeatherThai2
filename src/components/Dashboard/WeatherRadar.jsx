import React from 'react';

export default function WeatherRadar({ coords, isMobile, cardBg, borderColor, textColor }) {
  return (
    <div style={{ background: cardBg, borderRadius: isMobile ? '20px' : '25px', padding: isMobile ? '15px' : '20px', border: `1px solid ${borderColor}`, overflow: 'hidden', flexShrink: 0 }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: textColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>⛈️</span> เรดาร์สภาพอากาศ
        </h3>
        <div style={{ width: '100%', height: isMobile ? '250px' : '350px', minHeight: isMobile ? '250px' : '350px', borderRadius: '12px', overflow: 'hidden' }}>
            <iframe 
                width="100%" height="100%" 
                src={`https://embed.windy.com/embed2.html?lat=${coords?.lat || 13.75}&lon=${coords?.lon || 100.5}&detailLat=${coords?.lat || 13.75}&detailLon=${coords?.lon || 100.5}&zoom=8&level=surface&overlay=rain&product=ecmwf&menu=&message=true&marker=true`} 
                style={{ border: 'none' }}   // <-- ใช้ style แทน
                title="Radar Map"
            ></iframe>
        </div>
    </div>
  );
}
