import React from 'react';

export default function LoadingScreen({
  title = 'กำลังซิงค์ข้อมูลล่าสุด',
  subtitle = 'เชื่อมต่อข้อมูลอากาศ ฝุ่น และเรดาร์แบบเรียลไทม์',
  compact = false,
}) {
  return (
    <div
      className="app-loading-screen"
      style={compact
        ? { minHeight: '320px' }
        : { position: 'fixed', inset: 0, zIndex: 9999 }
      }
    >
      <div className="app-loading-orbit" aria-hidden="true">
        <span className="app-loading-core" />
        <span className="app-loading-dot app-loading-dot-a" />
        <span className="app-loading-dot app-loading-dot-b" />
        <span className="app-loading-dot app-loading-dot-c" />
      </div>
      <div className="app-loading-copy">
        <div className="app-loading-kicker">ThaiWeather</div>
        <div className="app-loading-title">{title}</div>
        <div className="app-loading-subtitle">{subtitle}</div>
      </div>
      <div className="app-loading-bars" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
