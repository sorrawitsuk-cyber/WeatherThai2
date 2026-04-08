import React, { useContext, useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { WeatherContext } from '../context/WeatherContext';

export default function Layout() {
  // 🌟 ดึงข้อมูลและฟังก์ชันทั้งหมดมาใช้จาก WeatherContext รวมไว้ตรงนี้ที่เดียว
  const { 
    darkMode, 
    setDarkMode, 
    lastUpdateText, 
    syncDataToFirebase, 
    lastUpdated 
  } = useContext(WeatherContext);

  const location = useLocation();

  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const [vh, setVh] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
      setVh(window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const themeBg = darkMode 
    ? '#0f172a' 
    : 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)'; 

  const sidebarBg = darkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.85)';
  const headerBg = darkMode ? 'rgba(15, 23, 42, 0.95)' : '#0ea5e9'; 
  const textColor = darkMode ? '#f8fafc' : '#1e293b';
  const borderColor = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255, 255, 255, 0.5)';

  const isMapPage = location.pathname === '/map';

  return (
    <div style={{ display: 'flex', height: `${vh}px`, width: '100vw', background: themeBg, color: textColor, overflow: 'hidden' }}>
      
      {/* 💻 SIDEBAR สำหรับ Desktop */}
      <aside 
        style={{ 
          display: isDesktop ? 'flex' : 'none', flexDirection: 'column', width: '260px', 
          borderRight: `1px solid ${borderColor}`, position: 'relative', zIndex: 50, 
          background: sidebarBg, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: '4px 0 15px rgba(0,0,0,0.05)', flexShrink: 0
        }}
      >
        <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: `1px solid ${borderColor}` }}>
          <div style={{ fontSize: '2.2rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}>{darkMode ? '🌙' : '🌤️'}</div>
          <div>
            <h1 style={{ fontWeight: 'bold', fontSize: '1.3rem', margin: 0, lineHeight: 1.2, color: darkMode ? '#38bdf8' : '#0ea5e9' }}>Thai Weather</h1>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', opacity: 0.7, color: textColor }}>Dashboard</span>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }} className="hide-scrollbar">
          <NavItem to="/" icon="📊" label="ภาพรวม" darkMode={darkMode} />
          <NavItem to="/map" icon="🗺️" label="แผนที่" darkMode={darkMode} />
          <NavItem to="/forecast" icon="✨" label="AI ผู้ช่วย" darkMode={darkMode} />
          <NavItem to="/climate" icon="🚨" label="เตือนภัย" darkMode={darkMode} />
        </nav>

        {/* 🌟 ส่วนปุ่มด้านล่าง Sidebar */}
        <div style={{ padding: '16px', borderTop: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          <button 
            onClick={() => setDarkMode(!darkMode)} 
            style={{ 
              width: '100%', padding: '12px 0', borderRadius: '15px', cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.95rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : '#ffffff',
              border: `1px solid ${darkMode ? 'transparent' : '#e0f2fe'}`, color: darkMode ? '#fff' : '#0ea5e9',
              boxShadow: darkMode ? 'none' : '0 4px 10px rgba(14,165,233,0.1)'
            }}
          >
            {darkMode ? '☀️ สลับโหมดสว่าง' : '🌙 สลับโหมดมืด'}
          </button>


        </div>
      </aside>

      {/* 📱 พื้นที่แสดงเนื้อหาหลัก */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', position: 'relative' }}>
        
        {/* HEADER สำหรับ Mobile */}
        {!isDesktop && !isMapPage && (
          <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', zIndex: 50, borderBottom: `1px solid ${borderColor}`, background: headerBg, color: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.8rem', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))' }}>{darkMode ? '🌙' : '🌤️'}</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h1 style={{ fontWeight: 'bold', fontSize: '1.2rem', margin: 0, lineHeight: 1.2 }}>Thai Weather</h1>
                {/* 🌟 ย้ายเวลาอัปเดตมาไว้ตรงนี้ */}
                <span style={{ fontSize: '0.7rem', opacity: 0.9, fontWeight: 'normal' }}>
                  อัปเดต: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-'}
                </span>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              {/* ปุ่ม Sync สำหรับ Mobile ซ่อนไว้เล็กๆ */}
              <button onClick={syncDataToFirebase} style={{ fontSize: '1.2rem', background: 'transparent', border: 'none', cursor: 'pointer', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))' }}>
                🔄
              </button>
              <button onClick={() => setDarkMode(!darkMode)} style={{ fontSize: '1.4rem', background: 'transparent', border: 'none', cursor: 'pointer', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))' }}>
                {darkMode ? '☀️' : '🌙'}
              </button>
            </div>
          </header>
        )}

        <div style={{ flex: 1, overflow: 'hidden', position: 'relative', zIndex: 10 }}>
          <Outlet /> 
        </div>

        {/* BOTTOM NAV สำหรับ Mobile */}
        {!isDesktop && (
          <nav style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '75px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', borderTop: `1px solid ${borderColor}`, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', zIndex: 50, paddingBottom: 'env(safe-area-inset-bottom)', background: darkMode ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.85)' }}>
            <MobileNavItem to="/" icon="📊" label="ภาพรวม" />
            <MobileNavItem to="/map" icon="🗺️" label="แผนที่" />
            <MobileNavItem to="/forecast" icon="✨" label="AI ผู้ช่วย" />
            <MobileNavItem to="/climate" icon="🚨" label="เตือนภัย" />
          </nav>
        )}
      </main>
    </div>
  );
}

const NavItem = ({ to, icon, label, darkMode }) => (
  <NavLink 
    to={to} 
    style={({ isActive }) => ({
      display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: '15px', transition: 'all 0.2s', fontWeight: 'bold', fontSize: '1rem', textDecoration: 'none',
      backgroundColor: isActive ? '#0ea5e9' : 'transparent',
      color: isActive ? '#ffffff' : (darkMode ? '#cbd5e1' : '#475569'),
      boxShadow: isActive ? '0 4px 12px rgba(14,165,233,0.3)' : 'none',
      transform: isActive ? 'scale(1.02)' : 'scale(1)'
    })}
  >
    <span style={{ fontSize: '1.4rem' }}>{icon}</span>
    <span>{label}</span>
  </NavLink>
);

const MobileNavItem = ({ to, icon, label }) => (
  <NavLink 
    to={to} 
    style={({ isActive }) => ({
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', transition: 'all 0.2s', textDecoration: 'none',
      color: isActive ? '#0ea5e9' : '#64748b',
      transform: isActive ? 'translateY(-3px)' : 'none'
    })}
  >
    {({ isActive }) => (
      <>
        <span style={{ fontSize: '1.6rem', marginBottom: '4px', filter: isActive ? 'drop-shadow(0 2px 4px rgba(14,165,233,0.3))' : 'grayscale(100%) opacity(60%)' }}>{icon}</span>
        <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{label}</span>
      </>
    )}
  </NavLink>
);