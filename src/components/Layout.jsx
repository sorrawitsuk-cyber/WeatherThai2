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
  const desktopShellBg = darkMode ? 'linear-gradient(180deg, rgba(13,28,56,0.92), rgba(13,28,56,0.82))' : 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,255,255,0.92))';
  const desktopInnerBg = darkMode ? 'rgba(6,15,30,0.5)' : 'rgba(255,255,255,0.7)';

  const utilityButtonStyle = {
    width: '40px',
    height: '40px',
    borderRadius: '14px',
    border: `1px solid ${borderColor}`,
    background: 'var(--bg-secondary)',
    color: textColor,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '1rem',
    boxShadow: '0 8px 18px rgba(2,6,23,0.08)',
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: appBg,
        color: textColor,
        fontFamily: 'Kanit, sans-serif',
        padding: isMobile ? '0' : '14px',
        gap: isMobile ? 0 : '14px',
      }}
    >
      <UpdateNotification />
      <InstallPrompt />

      {!isMobile && (
        <div
          style={{
            width: '272px',
            background: desktopShellBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '28px',
            display: 'flex',
            flexDirection: 'column',
            padding: '18px',
            zIndex: 10,
            flexShrink: 0,
            boxShadow: '0 24px 60px rgba(2,6,23,0.12)',
            backdropFilter: 'blur(18px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '24px', padding: '6px 4px 0' }}>
            <img src="/icon-192x192.png" alt="App Icon" style={{ width: '46px', height: '46px', borderRadius: '14px', boxShadow: '0 8px 20px rgba(14,165,233,0.28)' }} />
            <div>
              <div style={{ fontWeight: '900', fontSize: '1.15rem', color: '#0ea5e9' }}>AirQuality Thai</div>
              <div style={{ fontSize: '0.72rem', opacity: 0.72 }}>แดชบอร์ดคุณภาพอากาศและพยากรณ์</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', background: desktopInnerBg, border: `1px solid ${borderColor}`, borderRadius: '20px', padding: '10px 12px', marginBottom: '18px' }}>
            <div>
              <div style={{ fontSize: '0.68rem', color: subTextColor, fontWeight: 'bold' }}>สถานะธีม</div>
              <div style={{ fontSize: '0.84rem', color: textColor, fontWeight: '900', marginTop: '2px' }}>{darkMode ? 'โหมดกลางคืน' : 'โหมดกลางวัน'}</div>
            </div>
            <button onClick={() => setDarkMode(!darkMode)} style={utilityButtonStyle} title="สลับธีม">
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '14px 16px',
                  borderRadius: '18px',
                  textDecoration: 'none',
                  background: isActive ? 'linear-gradient(135deg, #2563eb, #4f46e5)' : desktopInnerBg,
                  color: isActive ? '#ffffff' : textColor,
                  fontWeight: 'bold',
                  transition: 'all 0.2s',
                  border: `1px solid ${isActive ? 'transparent' : borderColor}`,
                  boxShadow: isActive ? '0 12px 28px rgba(37,99,235,0.28)' : 'none',
                })}
              >
                <span style={{ fontSize: '1.18rem', width: '24px', textAlign: 'center' }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>›</span>
              </NavLink>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto' }}>
            <div style={{ background: desktopInnerBg, border: `1px solid ${borderColor}`, borderRadius: '20px', padding: '14px' }}>
              <div style={{ fontSize: '0.7rem', color: subTextColor, fontWeight: 'bold' }}>ตำแหน่งของคุณ</div>
              <div style={{ fontSize: '0.92rem', color: textColor, fontWeight: '900', marginTop: '6px' }}>
                {gpsLocation ? `${gpsLocation.lat.toFixed(3)}, ${gpsLocation.lng.toFixed(3)}` : 'ยังไม่ได้ระบุตำแหน่ง'}
              </div>
              <div style={{ fontSize: '0.68rem', color: gpsColor, fontWeight: 'bold', marginTop: '4px' }}>
                {gpsLoading ? 'กำลังค้นหาตำแหน่ง...' : gpsPermission === 'denied' ? 'การเข้าถึงถูกปฏิเสธ' : gpsLocation ? 'เชื่อมต่อพร้อมใช้' : 'พร้อมระบุตำแหน่ง'}
              </div>
            </div>

            <button
              onClick={getLocation}
              disabled={gpsLoading}
              title={gpsLocation ? `ตำแหน่ง: ${gpsLocation.lat.toFixed(4)}, ${gpsLocation.lng.toFixed(4)}` : 'คลิกเพื่อระบุตำแหน่ง GPS'}
              style={{ width: '100%', padding: '12px', borderRadius: '16px', border: `1px solid ${borderColor}`, background: 'var(--bg-secondary)', color: gpsColor, fontFamily: 'Kanit, sans-serif', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s', fontSize: '0.85rem' }}
            >
              {gpsIcon} {gpsLoading ? 'กำลังค้นหา...' : gpsLocation ? 'พบตำแหน่งแล้ว' : 'ระบุตำแหน่ง GPS'}
            </button>

            {notifSupported && notifPermission !== 'granted' && (
              <button
                onClick={requestNotif}
                style={{ width: '100%', padding: '12px', borderRadius: '16px', border: '1px solid rgba(234,179,8,0.3)', background: 'rgba(234,179,8,0.1)', color: '#eab308', fontFamily: 'Kanit, sans-serif', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s', fontSize: '0.85rem' }}
              >
                🔔 เปิดการแจ้งเตือน
              </button>
            )}
          </div>
        </div>
      )}

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          position: 'relative',
          paddingBottom: isMobile ? '80px' : '0',
          background: isMobile ? 'transparent' : desktopShellBg,
          border: isMobile ? 'none' : `1px solid ${borderColor}`,
          borderRadius: isMobile ? '0' : '30px',
          boxShadow: isMobile ? 'none' : '0 24px 60px rgba(2,6,23,0.10)',
        }}
      >
        <Outlet context={{ userLocation }} />
      </div>

      {isMobile && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '70px', background: sidebarBg, borderTop: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-around', alignItems: 'center', zIndex: 9999, paddingBottom: 'env(safe-area-inset-bottom)', boxShadow: '0 -4px 20px rgba(0,0,0,0.15)' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
                gap: '2px',
                flex: 1,
                height: '100%',
                color: isActive ? '#0ea5e9' : subTextColor,
                transform: isActive ? 'translateY(-2px)' : 'none',
                transition: 'all 0.2s',
              })}
            >
              {({ isActive }) => (
                <>
                  {isActive && <div style={{ position: 'absolute', top: '6px', width: '4px', height: '4px', borderRadius: '50%', background: '#0ea5e9', boxShadow: '0 0 6px #0ea5e9' }} />}
                  <span style={{ fontSize: '1.4rem', opacity: isActive ? 1 : 0.55 }}>{item.icon}</span>
                  <span style={{ fontSize: '0.62rem', fontWeight: 'bold', opacity: isActive ? 1 : 0.65 }}>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}

          <div onClick={getLocation} title="ระบุตำแหน่ง GPS" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', flex: 1, height: '100%', color: gpsColor, cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}>
            <span style={{ fontSize: '1.4rem', opacity: gpsLoading ? 0.5 : 0.85 }}>{gpsIcon}</span>
            <span style={{ fontSize: '0.62rem', fontWeight: 'bold', opacity: 0.75 }}>{gpsLoading ? 'ค้นหา...' : gpsLocation ? 'GPS ✓' : 'GPS'}</span>
          </div>

          <div onClick={() => setDarkMode(!darkMode)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', flex: 1, height: '100%', color: subTextColor, cursor: 'pointer', transition: 'all 0.2s' }}>
            <span style={{ fontSize: '1.4rem', opacity: 0.6 }}>{darkMode ? '☀️' : '🌙'}</span>
            <span style={{ fontSize: '0.62rem', fontWeight: 'bold', opacity: 0.7 }}>{darkMode ? 'สว่าง' : 'มืด'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
