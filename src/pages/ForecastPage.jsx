// src/pages/AIPage.jsx
import React, { useContext, useState, useEffect, useMemo } from 'react';
import { WeatherContext } from '../context/WeatherContext';

export default function AIPage() {
  // 🌟 ดึง Context
  const { stations, weatherData, fetchWeatherByCoords, loadingWeather, darkMode } = useContext(WeatherContext);
  
  // 🌟 States
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [locationName, setLocationName] = useState('กำลังโหลด...');
  const [selectedProv, setSelectedProv] = useState('');
  const [targetDateIdx, setTargetDateIdx] = useState(0); 
  const [activeTab, setActiveTab] = useState('summary'); 
  const [showFilters, setShowFilters] = useState(window.innerWidth >= 1024);

  // 🌟 Rules of Hooks: ต้องอยู่บนสุดเสมอ
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setShowFilters(true);
    };
    window.addEventListener('resize', handleResize);

    // 🛑 ป้องกัน 429 Error: ดึงพิกัดเฉพาะเมื่อไม่มีข้อมูลเท่านั้น
    if (!weatherData) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
          setLocationName('ตำแหน่งปัจจุบัน');
        }, () => {
          setLocationName('กรุงเทพมหานคร');
          fetchWeatherByCoords(13.75, 100.5);
        }, { timeout: 5000 });
      }
    } else {
      setLocationName('ข้อมูลล่าสุด');
    }
    return () => window.removeEventListener('resize', handleResize);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🌟 AI Logic Engine (ใส่ Check ป้องกัน Crash)
  const aiReport = useMemo(() => {
    if (!weatherData || !weatherData.daily || !weatherData.daily.time) return null;

    const d = weatherData.daily;
    const tMax = Math.round(d.temperature_2m_max?.[targetDateIdx] || 0);
    const rain = d.precipitation_probability_max?.[targetDateIdx] || 0;
    const pm25 = d.pm25_max ? Math.round(d.pm25_max[targetDateIdx] || 0) : (weatherData.current?.pm25 || 0);
    
    let score = 10;
    if (rain > 50) score -= 3;
    if (tMax > 37) score -= 3;
    if (pm25 > 50) score -= 4;
    if (score < 1) score = 1;

    const configs = {
      summary: { morning: 'อากาศแจ่มใส', afternoon: tMax > 35 ? 'ร้อนจัด เลี่ยงแดด' : 'ท้องฟ้าโปร่ง', evening: 'พักผ่อนสบายๆ' },
      travel: { morning: 'แสงสวย ถ่ายรูปดี', afternoon: 'แดดแรง พกครีมกันแดด', evening: 'อากาศเย็นลง' },
      health: { morning: 'เหมาะกับการวิ่ง', afternoon: 'จิบน้ำบ่อยๆ', evening: 'ยืดเหยียดในร่ม' },
      driving: { morning: 'ทัศนวิสัยดี', afternoon: 'ระวังแดดแยงตา', evening: rain > 40 ? 'ถนนลื่น ระวัง' : 'ปกติ' },
      home: { morning: 'เริ่มซักผ้าได้', afternoon: 'ตากผ้าแห้งไว', evening: 'ปิดหน้าต่างกันฝุ่น' },
      farm: { morning: 'ฉีดพ่นปุ๋ยได้', afternoon: 'หยุดรดน้ำแดดจัด', evening: 'รดน้ำรอบค่ำ' }
    };

    const c = configs[activeTab] || configs.summary;
    return {
      score,
      timeline: [
        { label: 'เช้า', icon: '🌅', time: '06:00-12:00', text: c.morning },
        { label: 'บ่าย', icon: '☀️', time: '12:00-18:00', text: c.afternoon },
        { label: 'ค่ำ', icon: '🌙', time: '18:00+', text: c.evening }
      ]
    };
  }, [activeTab, targetDateIdx, weatherData]);

  // สไตล์
  const tabConfigs = [
    { id: 'summary', icon: '📋', label: 'ภาพรวม', color: '#8b5cf6' },
    { id: 'travel', icon: '🎒', label: 'ท่องเที่ยว', color: '#ec4899' },
    { id: 'health', icon: '🏃‍♂️', label: 'สุขภาพ', color: '#22c55e' },
    { id: 'driving', icon: '🚘', label: 'ขับขี่', color: '#f97316' },
    { id: 'home', icon: '🧺', label: 'งานบ้าน', color: '#0ea5e9' },
    { id: 'farm', icon: '🌾', label: 'เกษตร', color: '#10b981' }
  ];

  const appBg = darkMode ? '#020617' : '#f8fafc'; 
  const cardBg = darkMode ? '#0f172a' : '#ffffff';
  const textColor = darkMode ? '#f8fafc' : '#0f172a'; 
  const borderColor = darkMode ? '#1e293b' : '#e2e8f0';
  const subTextColor = darkMode ? '#94a3b8' : '#64748b'; 
  const activeColor = tabConfigs.find(t => t.id === activeTab)?.color || '#8b5cf6';

  // 🌟 Render Loading หรือ Error
  if (loadingWeather) return <div style={{ height: '100vh', background: appBg, display: 'flex', justifyContent: 'center', alignItems: 'center', color: textColor }}>🤖 AI กำลังคิดวิเคราะห์...</div>;
  
  if (!weatherData) return (
    <div style={{ height: '100vh', background: appBg, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: textColor, padding: '20px', textAlign: 'center' }}>
      <div style={{ fontSize: '3rem' }}>⚠️</div>
      <h3 style={{ margin: '15px 0' }}>ไม่สามารถดึงข้อมูลได้ชั่วคราว</h3>
      <p style={{ color: subTextColor }}>คุณส่งคำขอถี่เกินไป กรุณารอ 1-2 นาทีแล้วรีเฟรชหน้าจอใหม่ค่ะ</p>
      <button onClick={() => window.location.reload()} style={{ marginTop: '20px', padding: '10px 20px', borderRadius: '12px', background: '#0ea5e9', color: '#fff', border: 'none', cursor: 'pointer' }}>ลองอีกครั้ง</button>
    </div>
  );

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: appBg, display: 'flex', justifyContent: 'center', overflowY: 'auto', WebkitOverflowScrolling: 'touch', fontFamily: 'Kanit, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '1100px', display: 'flex', flexDirection: 'column', gap: '15px', padding: isMobile ? '15px' : '30px', paddingBottom: '120px' }}>

        {/* 🌟 1. FILTER SECTION */}
        <div style={{ background: cardBg, borderRadius: '24px', padding: '18px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', color: textColor }}>📍 พื้นที่: <span style={{color: '#0ea5e9'}}>{locationName}</span></h3>
                {isMobile && <button onClick={() => setShowFilters(!showFilters)} style={{ background: 'rgba(14,165,233,0.1)', color: '#0ea5e9', border: 'none', padding: '6px 15px', borderRadius: '50px', fontWeight: 'bold' }}>{showFilters ? '▲ ปิด' : '▼ ตั้งค่า'}</button>}
            </div>
            {showFilters && (
                <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr auto', gap: '10px' }}>
                        <select value={selectedProv} onChange={(e) => { setSelectedProv(e.target.value); setLocationName(e.target.value); }} style={{ padding: '10px', borderRadius: '12px', background: darkMode ? '#1e293b' : '#f1f5f9', color: textColor, border: 'none' }}>
                            <option value="">เลือกจังหวัด</option>
                            {stations.map(s => <option key={s.stationID} value={s.areaTH}>{s.areaTH}</option>)}
                        </select>
                        <button onClick={() => window.location.reload()} style={{ background: '#0ea5e9', color: '#fff', border: 'none', padding: '10px', borderRadius: '12px', fontWeight: 'bold' }}>อัปเดต GPS</button>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '5px' }} className="hide-scrollbar">
                        {[0,1,2,3,4,5,6].map(idx => (
                            <button key={idx} onClick={() => setTargetDateIdx(idx)} style={{ flexShrink: 0, minWidth: '65px', padding: '8px', borderRadius: '12px', border: `1px solid ${targetDateIdx === idx ? activeColor : borderColor}`, background: targetDateIdx === idx ? activeColor : 'transparent', color: targetDateIdx === idx ? '#fff' : textColor, fontWeight: 'bold', fontSize: '0.8rem' }}>
                                {idx === 0 ? 'วันนี้' : idx === 1 ? 'พรุ่งนี้' : `+${idx} วัน`}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* 🌟 2. MAIN LAYOUT */}
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px', alignItems: 'flex-start' }}>
            
            {/* TABS (สลับที่ไปไว้บนในมือถือ) */}
            <div style={{ 
                display: 'flex', 
                flexDirection: isMobile ? 'row' : 'column', 
                gap: '10px', 
                width: isMobile ? '100%' : '240px',
                overflowX: isMobile ? 'auto' : 'visible',
                order: isMobile ? 1 : 2
            }} className="hide-scrollbar">
                {tabConfigs.map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                            flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px', padding: '15px', borderRadius: '16px', border: 'none',
                            background: isActive ? (darkMode ? `${tab.color}30` : `${tab.color}15`) : (darkMode ? '#1e293b' : '#f8fafc'),
                            color: isActive ? (darkMode ? '#fff' : tab.color) : subTextColor,
                            fontWeight: 'bold', cursor: 'pointer', textAlign: 'left', width: isMobile ? 'auto' : '100%'
                        }}>
                            <span style={{ fontSize: '1.4rem' }}>{tab.icon}</span>
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* AI CONTENT */}
            <div className="fade-in" style={{ flex: 1, background: cardBg, borderRadius: '24px', padding: isMobile ? '20px' : '30px', border: `1px solid ${borderColor}`, boxShadow: '0 10px 30px rgba(0,0,0,0.05)', order: isMobile ? 2 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.3rem', color: textColor }}>{tabConfigs.find(t=>t.id===activeTab)?.icon} AI วางแผนให้คุณ</h2>
                    <div style={{ background: darkMode ? '#1e293b' : '#f8fafc', padding: '10px 15px', borderRadius: '15px', border: `1px solid ${borderColor}` }}>
                        <span style={{ fontSize: '1.2rem', fontWeight: '900', color: activeColor }}>{aiReport?.score}/10</span>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {aiReport?.timeline.map((item, i) => (
                        <div key={i} style={{ display: 'flex', gap: '15px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: activeColor }}></div>
                                {i < 2 && <div style={{ width: '2px', flex: 1, background: borderColor }}></div>}
                            </div>
                            <div style={{ flex: 1, background: darkMode ? 'rgba(255,255,255,0.03)' : '#f8fafc', padding: '15px', borderRadius: '16px', border: `1px solid ${borderColor}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                    <span style={{ fontWeight: 'bold', color: activeColor }}>{item.icon} {item.label}</span>
                                    <span style={{ fontSize: '0.75rem', color: subTextColor }}>{item.time}</span>
                                </div>
                                <div style={{ fontSize: '0.95rem', color: textColor }}>{item.text}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}