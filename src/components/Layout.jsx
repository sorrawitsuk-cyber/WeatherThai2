import React, { useContext, useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { WeatherContext } from '../context/WeatherContext';

export default function Layout() {
  const { darkMode, setDarkMode } = useContext(WeatherContext);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems = [
    { path: '/', icon: '📊', label: 'ภาพรวม' },
    { path: '/map', icon: '🗺️', label: 'แผนที่' },
    { path: '/forecast', icon: '✨', label: 'AI ผู้ช่วย' },
    { path: '/alerts', icon: '🚨', label: 'เตือนภัย' },
  ];

  const appBg = darkMode ? '#020617' : '#f8fafc';
  const sidebarBg = darkMode ? '#0f172a' : '#ffffff';
  const textColor = darkMode ? '#f8fafc' : '#0f172a';
  const borderColor = darkMode ? '#1e293b' : '#e2e8f0';
  const subTextColor = darkMode ? '#94a3b8' : '#64748b';

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100vh', width: '100vw', overflow: 'hidden', background: appBg, color: textColor, fontFamily: 'Kanit, sans-serif' }}>
      
      {/* 💻 Sidebar สำหรับคอมพิวเตอร์ */}
      {!isMobile && (
        <div style={{ width: '260px', background: sidebarBg, borderRight: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column', padding: '20px', zIndex: 10, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '40px' }}>
            <span style={{ fontSize: '2rem' }}>🌙</span>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#0ea5e9' }}>Thai Weather</div>
              <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>Dashboard</div>
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

          <div style={{ marginTop: 'auto' }}>
            <button 
              onClick={() => setDarkMode(!darkMode)} 
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${borderColor}`, background: darkMode ? '#1e293b' : '#f1f5f9', color: textColor, fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}
            >
              {darkMode ? '☀️ โหมดสว่าง' : '🌙 โหมดมืด'}
            </button>
          </div>
        </div>
      )}

      {/* 📱 Header สำหรับมือถือ */}
      {isMobile && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', background: sidebarBg, borderBottom: `1px solid ${borderColor}`, zIndex: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.5rem' }}>🌙</span>
            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#0ea5e9' }}>Thai Weather</div>
          </div>
          <button onClick={() => setDarkMode(!darkMode)} style={{ background: darkMode ? '#1e293b' : '#f1f5f9', border: `1px solid ${borderColor}`, padding: '8px 12px', borderRadius: '10px', fontSize: '1.2rem', cursor: 'pointer', color: textColor }}>
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      )}

      {/* 🟢 Main Content */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', position: 'relative', paddingBottom: isMobile ? '80px' : '0' }}>
        <Outlet />
      </div>

      {/* 📱 Bottom Navigation Bar สำหรับมือถือ (แก้บั๊ก isActive แล้ว) */}
      {isMobile && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '70px', background: sidebarBg, borderTop: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-around', alignItems: 'center', zIndex: 9999, paddingBottom: 'env(safe-area-inset-bottom)', boxShadow: '0 -4px 10px rgba(0,0,0,0.1)' }}>
          {navItems.map(item => (
            <NavLink key={item.path} to={item.path} style={({ isActive }) => ({
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', gap: '4px', width: '25%', height: '100%',
              color: isActive ? '#0ea5e9' : subTextColor,
              transform: isActive ? 'translateY(-2px)' : 'none', transition: 'all 0.2s'
            })}>
              {({ isActive }) => (
                <>
                  <span style={{ fontSize: '1.4rem', opacity: isActive ? 1 : 0.6 }}>{item.icon}</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 'bold', opacity: isActive ? 1 : 0.7 }}>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      )}

    </div>
  );
}