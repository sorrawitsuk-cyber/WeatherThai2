import React, { useContext, useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { WeatherContext } from '../context/WeatherContext';
import InstallPrompt from './InstallPrompt';
import UpdateNotification from './UpdateNotification';
import { useGeolocation } from '../hooks/useGeolocation';
import { usePushNotification } from '../hooks/usePushNotification';

export default function Layout() {
  const { darkMode, setDarkMode } = useContext(WeatherContext);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { location: gpsLocation, loading: gpsLoading, permission: gpsPermission, getLocation } = useGeolocation();
  const { permission: notifPermission, requestPermission: requestNotif, isSupported: notifSupported } = usePushNotification();

  // ✅ ให้ GPS location พร้อมใน context ทั่วทั้งแอป
  const [userLocation, setUserLocation] = useState(null);
  useEffect(() => {
    if (gpsLocation) setUserLocation(gpsLocation);
  }, [gpsLocation]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems = [
    { path: '/', icon: '📊', label: 'ภาพรวม' },
    { path: '/map', icon: '🗺️', label: 'แผนที่' },
    { path: '/ai', icon: '✨', label: 'วิเคราะห์' },
    { path: '/news', icon: '📰', label: 'ข่าวสาร' },
  ];

  const appBg = 'var(--bg-app)';
  const sidebarBg = 'var(--bg-card)';
  const textColor = 'var(--text-main)';
  const borderColor = 'var(--border-color)';
  const subTextColor = 'var(--text-sub)';

  const gpsColor = gpsPermission === 'granted' && gpsLocation ? '#22c55e' : gpsPermission === 'denied' ? '#ef4444' : '#0ea5e9';
  const gpsIcon = gpsLoading ? '⏳' : gpsPermission === 'granted' && gpsLocation ? '📍' : '📡';

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100vh', width: '100vw', overflow: 'hidden', background: appBg, color: textColor, fontFamily: 'Kanit, sans-serif' }}>

      {/* PWA: Update banner (top) */}
      <UpdateNotification />

      {/* PWA: Install prompt (bottom) */}
      <InstallPrompt />

      {/* 💻 Sidebar สำหรับ Desktop */}
      {!isMobile && (
        <div style={{ width: '260px', background: sidebarBg, borderRight: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column', padding: '20px', zIndex: 10, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '40px' }}>
            <img src="/icon-192x192.png" alt="App Icon" style={{ width: '40px', height: '40px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(14,165,233,0.3)' }} />
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#0ea5e9' }}>AirQuality Thai</div>
              <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>ตรวจสอบคุณภาพอากาศ</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
            {navItems.map(item => (
              <NavLink key={item.path} to={item.path} style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '15px', padding: '12px 20px', borderRadius: '12px', textDecoration: 'none',
                background: isActive ? '#0ea5e9' : 'transparent',
                color: isActive ? '#ffffff' : textColor,
                fontWeight: 'bold', transition: 'all 0.2s'
              })}>
                <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>

          {/* Desktop: GPS + Notification + Dark Mode */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
            {/* GPS Button */}
            <button
              onClick={getLocation}
              disabled={gpsLoading}
              title={gpsLocation ? `ตำแหน่ง: ${gpsLocation.lat.toFixed(4)}, ${gpsLocation.lng.toFixed(4)}` : 'คลิกเพื่อระบุตำแหน่ง GPS'}
              style={{ width: '100%', padding: '10px', borderRadius: '12px', border: `1px solid ${borderColor}`, background: 'var(--bg-secondary)', color: gpsColor, fontFamily: 'Kanit, sans-serif', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s', fontSize: '0.85rem' }}
            >
              {gpsIcon} {gpsLoading ? 'กำลังค้นหา...' : gpsLocation ? 'พบตำแหน่งแล้ว' : 'ระบุตำแหน่ง GPS'}
            </button>

            {/* Notification Button */}
            {notifSupported && notifPermission !== 'granted' && (
              <button
                onClick={requestNotif}
                style={{ width: '100%', padding: '10px', borderRadius: '12px', border: `1px solid rgba(234,179,8,0.3)`, background: 'rgba(234,179,8,0.1)', color: '#eab308', fontFamily: 'Kanit, sans-serif', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s', fontSize: '0.85rem' }}
              >
                🔔 เปิดการแจ้งเตือน
              </button>
            )}

            {/* Dark Mode */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              style={{ width: '100%', padding: '10px', borderRadius: '12px', border: `1px solid ${borderColor}`, background: 'var(--bg-secondary)', color: textColor, fontFamily: 'Kanit, sans-serif', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}
            >
              {darkMode ? '☀️ โหมดสว่าง' : '🌙 โหมดมืด'}
            </button>
          </div>
        </div>
      )}

      {/* 🟢 Main Content */}
      <div
        style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', position: 'relative', paddingBottom: isMobile ? '80px' : '0' }}
      >
        <Outlet context={{ userLocation }} />
      </div>

      {/* 📱 Bottom Navigation Bar สำหรับมือถือ */}
      {isMobile && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '70px', background: sidebarBg, borderTop: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-around', alignItems: 'center', zIndex: 9999, paddingBottom: 'env(safe-area-inset-bottom)', boxShadow: '0 -4px 20px rgba(0,0,0,0.15)' }}>

          {/* เมนูหลัก 4 อัน */}
          {navItems.map(item => (
            <NavLink key={item.path} to={item.path} style={({ isActive }) => ({
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', gap: '2px', flex: 1, height: '100%',
              color: isActive ? '#0ea5e9' : subTextColor,
              transform: isActive ? 'translateY(-2px)' : 'none', transition: 'all 0.2s'
            })}>
              {({ isActive }) => (
                <>
                  {/* Active indicator dot */}
                  {isActive && (
                    <div style={{ position: 'absolute', top: '6px', width: '4px', height: '4px', borderRadius: '50%', background: '#0ea5e9', boxShadow: '0 0 6px #0ea5e9' }} />
                  )}
                  <span style={{ fontSize: '1.4rem', opacity: isActive ? 1 : 0.55 }}>{item.icon}</span>
                  <span style={{ fontSize: '0.62rem', fontWeight: 'bold', opacity: isActive ? 1 : 0.65 }}>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* GPS button (mobile) */}
          <div
            onClick={getLocation}
            title="ระบุตำแหน่ง GPS"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', flex: 1, height: '100%', color: gpsColor, cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}
          >
            <span style={{ fontSize: '1.4rem', opacity: gpsLoading ? 0.5 : 0.85 }}>{gpsIcon}</span>
            <span style={{ fontSize: '0.62rem', fontWeight: 'bold', opacity: 0.75 }}>
              {gpsLoading ? 'ค้นหา...' : gpsLocation ? 'GPS ✓' : 'GPS'}
            </span>
          </div>

          {/* Dark Mode button (mobile) */}
          <div
            onClick={() => setDarkMode(!darkMode)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', flex: 1, height: '100%', color: subTextColor, cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <span style={{ fontSize: '1.4rem', opacity: 0.6 }}>{darkMode ? '☀️' : '🌙'}</span>
            <span style={{ fontSize: '0.62rem', fontWeight: 'bold', opacity: 0.7 }}>{darkMode ? 'สว่าง' : 'มืด'}</span>
          </div>

        </div>
      )}

    </div>
  );
}
