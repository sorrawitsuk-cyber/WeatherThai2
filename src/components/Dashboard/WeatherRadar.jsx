import React, { useState } from 'react';

export default function WeatherRadar({ coords, isMobile, cardBg, borderColor, textColor }) {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const defaultOverlay = 'radar';
  const defaultProduct = 'radar';
  
  return (
    <div style={{ background: cardBg, borderRadius: isMobile ? '20px' : '25px', padding: isMobile ? '15px' : '20px', border: `1px solid ${borderColor}`, overflow: 'hidden', flexShrink: 0 }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: textColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>⛈️</span> เรดาร์สภาพอากาศ
        </h3>
        <div style={{ width: '100%', height: isMobile ? '250px' : '350px', minHeight: isMobile ? '250px' : '350px', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
            {!iframeLoaded && (
                <div style={{ 
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
                    background: 'var(--bg-secondary, rgba(255,255,255,0.05))', 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px',
                    borderRadius: '12px', zIndex: 1
                }}>
                    <div style={{ 
                        width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', 
                        borderTopColor: '#0ea5e9', borderRadius: '50%', 
                        animation: 'spin 1s linear infinite' 
                    }} />
                    <span style={{ color: 'var(--text-sub)', fontSize: '0.85rem', fontWeight: 'bold' }}>กำลังโหลดเรดาร์...</span>
                    <style dangerouslySetInnerHTML={{__html: `@keyframes spin { to { transform: rotate(360deg); } }`}} />
                </div>
            )}
            <iframe 
                width="100%" height="100%" 
                src={`https://embed.windy.com/embed2.html?lat=${coords?.lat || 13.75}&lon=${coords?.lon || 100.5}&detailLat=${coords?.lat || 13.75}&detailLon=${coords?.lon || 100.5}&zoom=8&level=surface&overlay=${defaultOverlay}&product=${defaultProduct}&menu=&message=true&marker=true`} 
                style={{ border: 'none', opacity: iframeLoaded ? 1 : 0, transition: 'opacity 0.5s ease' }}
                title="Radar Map"
                onLoad={() => setIframeLoaded(true)}
            ></iframe>
        </div>
    </div>
  );
}
