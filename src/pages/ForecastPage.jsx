// src/pages/AIPage.jsx
import React, { useContext, useState, useEffect, useMemo } from 'react';
import { WeatherContext } from '../context/WeatherContext';

export default function AIPage() {
  const { stations, weatherData, fetchWeatherByCoords, loadingWeather, darkMode } = useContext(WeatherContext);
  
  // 1. Hooks (States) - ต้องอยู่บนสุดเสมอ
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [locationName, setLocationName] = useState('กำลังระบุตำแหน่ง...');
  const [geoData, setGeoData] = useState([]);
  const [selectedProv, setSelectedProv] = useState('');
  const [selectedDist, setSelectedDist] = useState('');
  const [targetDateIdx, setTargetDateIdx] = useState(0); 
  const [activeTab, setActiveTab] = useState('summary'); 
  const [showFilters, setShowFilters] = useState(window.innerWidth >= 1024);

  // 2. ฟังก์ชันช่วยเหลือ (Helpers) - ต้องประกาศก่อนถูกเรียกใช้ใน useMemo
  const generateAIReport = () => {
      if (!weatherData || !weatherData.daily) return null;
      const daily = weatherData.daily;
      const tMax = Math.round(daily.temperature_2m_max[targetDateIdx] || 0);
      const rain = daily.precipitation_probability_max[targetDateIdx] || 0;
      const pm25 = daily.pm25_max ? Math.round(daily.pm25_max[targetDateIdx] || 0) : (weatherData.current?.pm25 || 0);
      const wind = daily.windspeed_10m_max ? Math.round(daily.windspeed_10m_max[targetDateIdx] || 0) : (weatherData.current?.windSpeed || 0);
      
      let report = { score: 10, title: '', text: '', icon: '', tips: [], timeline: [] };
      if (rain > 70) report.score -= 4; else if (rain > 40) report.score -= 2;
      if (tMax > 38) report.score -= 3; else if (tMax > 35) report.score -= 1;
      if (pm25 > 75) report.score -= 4; else if (pm25 > 37.5) report.score -= 2;
      if (report.score < 1) report.score = 1;

      // รายละเอียดข้อความตาม Tab (ย่อสั้นๆ เพื่อให้ดูง่าย)
      const dateName = targetDateIdx === 0 ? 'วันนี้' : 'วันดังกล่าว';
      if (activeTab === 'summary') {
          report.title = `สรุปภาพรวม ${dateName}`;
          report.text = report.score >= 7 ? `อากาศดี เหมาะแก่กิจกรรมนอกบ้านค่ะ` : `อากาศไม่ค่อยดี โปรดระวังสุขภาพด้วยนะคะ`;
      } else {
          report.title = `วิเคราะห์ตามโหมดที่เลือก`;
          report.text = `AI กำลังวิเคราะห์ข้อมูลพยากรณ์อากาศสำหรับกิจกรรมของคุณ...`;
      }
      
      report.tips = [`🌡️ สูงสุด ${tMax}°C`, `☔ ฝน ${rain}%`, `😷 ฝุ่น ${pm25} µg/m³` ];
      report.timeline = [
          { label: 'เช้า', icon: '🌅', text: 'อากาศแจ่มใส' },
          { label: 'บ่าย', icon: '☀️', text: tMax > 35 ? 'แดดร้อนจัด' : 'เหมาะแก่การเดินทาง' },
          { label: 'ค่ำ', icon: '🌙', text: 'พักผ่อนสบายๆ' }
      ];
      return report;
  };

  // 3. useMemo - เรียกใช้ฟังก์ชันที่ประกาศไว้แล้วด้านบน (กันจอขาว)
  const aiReport = useMemo(() => generateAIReport(), [activeTab, targetDateIdx, weatherData]);

  const tabConfigs = [
    { id: 'summary', icon: '📋', label: 'ภาพรวม', color: '#8b5cf6' },
    { id: 'travel', icon: '🎒', label: 'ท่องเที่ยว', color: '#ec4899' },
    { id: 'health', icon: '🏃‍♂️', label: 'สุขภาพ', color: '#22c55e' },
    { id: 'driving', icon: '🚘', label: 'ขับขี่', color: '#f97316' },
    { id: 'home', icon: '🧺', label: 'งานบ้าน', color: '#0ea5e9' },
    { id: 'farm', icon: '🌾', label: 'เกษตร', color: '#10b981' }
  ];

  // 4. Effects
  useEffect(() => {
    const handleResize = () => {
        const mobile = window.innerWidth < 1024;
        setIsMobile(mobile);
        if (!mobile) setShowFilters(true);
    };
    window.addEventListener('resize', handleResize);
    fetch('/thai_geo.json').then(res => res.json()).then(data => setGeoData(Array.isArray(data) ? data : (data.data || [])));
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLocateMe = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
            setLocationName('ตำแหน่งปัจจุบัน');
        });
    }
  };

  // Styles
  const appBg = darkMode ? '#020617' : '#f8fafc'; 
  const cardBg = darkMode ? '#0f172a' : '#ffffff';
  const textColor = darkMode ? '#f8fafc' : '#0f172a'; 
  const borderColor = darkMode ? '#1e293b' : '#e2e8f0';
  const subTextColor = darkMode ? '#94a3b8' : '#64748b'; 
  const activeColor = tabConfigs.find(t => t.id === activeTab)?.color || '#8b5cf6';

  if (loadingWeather || !weatherData) return <div style={{ height: '100vh', background: appBg }} />;

  return (
    <div style={{ height: '100%', width: '100%', background: appBg, display: 'flex', justifyContent: 'center', overflowY: 'auto', fontFamily: 'Kanit, sans-serif' }} className="hide-scrollbar">
      <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '15px', padding: isMobile ? '10px' : '30px', paddingBottom: '100px' }}>

        {/* 🌟 1. AI CONTENT (ขึ้นบนสุดในมือถือ) */}
        <div style={{ order: isMobile ? 1 : 2 }} className="fade-in">
            {aiReport && (
                <div style={{ background: cardBg, borderRadius: '24px', padding: isMobile ? '20px' : '30px', border: `1px solid ${borderColor}`, boxShadow: '0 20px 40px rgba(0,0,0,0.08)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: activeColor, fontWeight: 'bold', letterSpacing: '1px' }}>AI ANALYSIS ✨</div>
                            <h2 style={{ margin: 0, fontSize: isMobile ? '1.2rem' : '1.5rem', color: textColor }}>{aiReport.title}</h2>
                            <div style={{ fontSize: '0.85rem', color: subTextColor }}>📍 {locationName}</div>
                        </div>
                        <div style={{ background: darkMode ? '#1e293b' : '#f8fafc', padding: '10px', borderRadius: '16px', textAlign: 'center', minWidth: '60px' }}>
                            <span style={{ fontSize: '0.7rem', color: subTextColor }}>AI Score</span>
                            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: activeColor }}>{aiReport.score}/10</div>
                        </div>
                    </div>

                    <div style={{ padding: '15px', background: `${activeColor}10`, borderRadius: '16px', borderLeft: `4px solid ${activeColor}`, marginBottom: '20px' }}>
                        <p style={{ margin: 0, fontSize: '1rem', color: textColor, lineHeight: 1.5 }}>{aiReport.text}</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {aiReport.timeline.map((item, i) => (
                            <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center', background: darkMode ? 'rgba(255,255,255,0.03)' : '#f8fafc', padding: '10px 15px', borderRadius: '12px' }}>
                                <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                                <span style={{ fontSize: '0.9rem', fontWeight: 'bold', width: '40px' }}>{item.label}</span>
                                <span style={{ fontSize: '0.85rem', color: subTextColor }}>{item.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* 🌟 2. TAB SELECTORS (สลับโหมด) */}
        <div style={{ order: isMobile ? 2 : 3, display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '5px' }} className="hide-scrollbar">
            {tabConfigs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                    flexShrink: 0, padding: '10px 18px', borderRadius: '14px', border: 'none',
                    background: activeTab === tab.id ? activeColor : (darkMode ? '#1e293b' : '#e2e8f0'),
                    color: activeTab === tab.id ? '#fff' : subTextColor,
                    fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem'
                }}>
                    {tab.icon} {isMobile ? tab.label : tab.label}
                </button>
            ))}
        </div>

        {/* 🌟 3. FILTER SECTION (ตัวเลือกสถานที่/วันที่) */}
        <div style={{ order: isMobile ? 3 : 1, background: cardBg, borderRadius: '20px', padding: '15px', border: `1px solid ${borderColor}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '0.9rem' }}>📍 ตั้งค่าวิเคราะห์</h3>
                    <button onClick={handleLocateMe} style={{ background: 'none', border: 'none', color: '#0ea5e9', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}>📍 ใช้ GPS</button>
                </div>
                {isMobile && (
                    <button onClick={() => setShowFilters(!showFilters)} style={{ background: 'none', border: 'none', color: activeColor, fontSize: '0.75rem', fontWeight: 'bold' }}>
                        {showFilters ? '🔼 ปิดตัวกรอง' : '🔽 เปลี่ยนพื้นที่/วัน'}
                    </button>
                )}
            </div>

            {showFilters && (
                <div className="fade-in" style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <select value={selectedProv} onChange={(e) => setSelectedProv(e.target.value)} style={{ padding: '8px', borderRadius: '10px', background: darkMode ? '#1e293b' : '#f1f5f9', color: textColor, border: 'none', fontSize: '0.8rem' }}>
                            <option value="">เลือกจังหวัด</option>
                            {stations.map(s => <option key={s.stationID} value={s.areaTH}>{s.areaTH}</option>)}
                        </select>
                        <select disabled style={{ padding: '8px', borderRadius: '10px', background: darkMode ? '#1e293b' : '#f1f5f9', color: textColor, border: 'none', fontSize: '0.8rem', opacity: 0.5 }}>
                            <option>เลือกอำเภอ</option>
                        </select>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }} className="hide-scrollbar">
                        {[0,1,2,3,4,5,6].map(idx => (
                            <button key={idx} onClick={() => setTargetDateIdx(idx)} style={{
                                flexShrink: 0, width: '45px', height: '45px', borderRadius: '12px', border: `1px solid ${targetDateIdx === idx ? activeColor : borderColor}`,
                                background: targetDateIdx === idx ? activeColor : 'transparent',
                                color: targetDateIdx === idx ? '#fff' : textColor, fontSize: '0.75rem', fontWeight: 'bold'
                            }}>
                                {idx === 0 ? 'วันนี้' : idx === 1 ? 'พรุ่งนี้' : `+${idx}`}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>

      </div>
    </div>
  );
}