import React, { useContext } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { WeatherContext } from '../context/WeatherContext';

export default function Layout() {
  const { darkMode, setDarkMode } = useContext(WeatherContext);

  // เมนูทั้งหมดของคุณ
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

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: appBg, color: textColor, fontFamily: 'Kanit, sans-serif' }}>
      
      {/* 🟢 Sidebar ด้านซ้าย */}
      <div style={{ width: '260px', background: sidebarBg, borderRight: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column', padding: '20px', zIndex: 10 }}>
        
        {/* โลโก้ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '40px' }}>
          <span style={{ fontSize: '2rem' }}>🌙</span>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#0ea5e9' }}>Thai Weather</div>
            <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>Dashboard</div>
          </div>
        </div>

        {/* ลิงก์เมนู */}
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

        {/* ปุ่มสลับโหมดมืด (ลบปุ่ม Sync ออกแล้ว) */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button 
            onClick={() => setDarkMode(!darkMode)} 
            style={{ padding: '12px', borderRadius: '12px', border: `1px solid ${borderColor}`, background: darkMode ? '#1e293b' : '#f1f5f9', color: textColor, fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}
          >
            {darkMode ? '☀️ สลับโหมดสว่าง' : '🌙 สลับโหมดมืด'}
          </button>
        </div>

      </div>

      {/* 🟢 Main Content ตรงกลาง */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <Outlet />
      </div>

    </div>
  );
}