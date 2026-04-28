import React from 'react';

export default function LoadingScreen({
  title = 'กำลังซิงค์ข้อมูลล่าสุด',
  subtitle = 'เชื่อมต่อข้อมูลอากาศ ฝุ่น และเรดาร์แบบเรียลไทม์',
  compact = false,
}) {
  const containerStyle = compact
    ? {
        minHeight: 320,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        background: 'var(--bg-app, #0f172a)',
      }
    : {
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        background: 'var(--bg-app, #0f172a)',
      };

  return (
    <div style={containerStyle}>
      <div style={{ position: 'relative', width: 72, height: 72 }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: '4px solid transparent',
          borderTopColor: '#a855f7', borderBottomColor: '#ec4899',
          animation: 'spin 1.5s linear infinite',
        }} />
        <div style={{
          position: 'absolute', inset: 10, borderRadius: '50%',
          border: '4px solid transparent',
          borderLeftColor: '#0ea5e9', borderRightColor: '#10b981',
          animation: 'spinReverse 2s linear infinite',
        }} />
      </div>
      <div style={{ textAlign: 'center', color: 'var(--text-main, #f1f5f9)' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#0ea5e9', letterSpacing: '0.1em', marginBottom: 6 }}>
          ThaiWeather
        </div>
        <div style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: '0.85rem', opacity: 0.6 }}>{subtitle}</div>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes spinReverse { to { transform: rotate(-360deg); } }
      `}</style>
    </div>
  );
}
