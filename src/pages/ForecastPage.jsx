// src/pages/AIPage.jsx
import React, { useContext, useState, useEffect, useMemo } from 'react';
import { WeatherContext } from '../context/WeatherContext';

export default function AIPage() {
  const { stations, weatherData, fetchWeatherByCoords, loadingWeather, darkMode } = useContext(WeatherContext);
  
  // --- 1. Hooks (States) ---
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [locationName, setLocationName] = useState('กรุงเทพมหานคร');
  const [selectedProv, setSelectedProv] = useState('');
  const [targetDateIdx, setTargetDateIdx] = useState(0); 
  const [activeTab, setActiveTab] = useState('summary'); 
  const [showFilters, setShowFilters] = useState(window.innerWidth >= 1024);

  // --- 2. Effects ---
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setShowFilters(true);
    };
    window.addEventListener('resize', handleResize);

    // ดึงพิกัดเฉพาะเมื่อยังไม่มีข้อมูลพยากรณ์
    if (!weatherData && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
        setLocationName('ตำแหน่งปัจจุบัน');
      }, () => {
        if (!weatherData) fetchWeatherByCoords(13.75, 100.5); // Fallback BKK
      }, { timeout: 5000 });
    }
    return () => window.removeEventListener('resize', handleResize);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- 3. AI Logic Engine (แก้บั๊ก ReferenceError: pm25) ---
  const aiReport = useMemo(() => {
    // เช็กความปลอดภัยของข้อมูลก่อนเริ่มคำนวณ
    if (!weatherData || !weatherData.daily || !weatherData.daily.time) return null;

    const d = weatherData.daily;
    const tMax = Math.round(d.temperature_2m_max?.[targetDateIdx] ?? 0);
    const rain = d.precipitation_probability_max?.[targetDateIdx] ?? 0;
    
    // ดึงค่า PM2.5 อย่างปลอดภัย
    const currentPm25 = d.pm25_max 
      ? Math.round(d.pm25_max[targetDateIdx] ?? 0) 
      : (weatherData.current?.pm25 ?? 0);
    
    let score = 10;
    if (rain > 50) score -= 3;
    if (tMax > 37) score -= 3;
    if (currentPm25 > 50) score -= 4;
    if (score < 1) score = 1;

    // ระบบสร้างประโยค Dynamic
    const getMoodText = () => {
      if (currentPm25 > 50) return `วันนี้ฝุ่น PM2.5 ค่อนข้างสูงนะคะ แนะนำให้สวมหน้ากากและเลี่ยงที่โล่งแจ้งค่ะ 😷`;
      if (rain > 60) return `ฝุ่นน้อยแต่ฝนหนัก! โอกาสตกถึง ${rain}% พกร่มติดตัวไว้อุ่นใจกว่านะคะ ☔`;
      if (tMax > 38) return `อากาศร้อนจัดระดับวิกฤต ${tMax}°C ระวังเพลียแดด ดื่มน้ำบ่อยๆ นะคะ 🥵`;
      if (score >= 8) return `สภาพอากาศเป็นใจมากค่ะ ท้องฟ้าเปิด เหมาะกับทุกกิจกรรมเลย ✨`;
      return `สภาพอากาศอยู่ในเกณฑ์ปานกลาง มีปัจจัยรบกวนเล็กน้อย เตรียมตัวให้พร้อมนะคะ`;
    };

    const getTimeline = () => {
      const configs = {
        summary: { m: 'อากาศสดชื่น เริ่มต้นวันได้ดี', a: tMax > 35 ? 'ร้อนจัด เลี่ยงแดดจ้า' : 'อากาศโปร่ง เดินทางสะดวก', e: 'พักผ่อนสบายๆ ในที่ร่ม' },
        travel: { m: 'แสงสวย ถ่ายรูปขึ้นกล้องมาก', a: 'แดดแรง พกหมวกและแว่นกันแดด', e: 'เหมาะกับการเดินตลาดนัดชิลๆ' },
        health: { m: currentPm25 > 40 ? 'ฝุ่นเยอะ งดวิ่งกลางแจ้ง' : 'อากาศดี เหมาะกับการวิ่งเช้า', a: 'จิบน้ำบ่อยๆ ระวังฮีทสโตรก', e: 'ยืดเหยียดกล้ามเนื้อในร่ม' },
        driving: { m: 'ทัศนวิสัยชัดเจน ขับขี่ปลอดภัย', a: 'ระวังแสงแดดสะท้อนเข้าตา', e: rain > 40 ? 'ถนนลื่น ลดความเร็วทิ้งระยะ' : 'การจราจรปกติ' },
        home: { m: 'แดดดี เริ่มซักผ้าได้เลย', a: 'ผ้านวมผืนใหญ่แห้งไวแน่นอน', e: 'ปิดหน้าต่างกันฝุ่นเข้าบ้าน' },
        farm: { m: 'เหมาะกับการพ่นปุ๋ยทางใบ', a: 'งดรดน้ำช่วงแดดจัด กันรากไหม้', e: 'รดน้ำให้ชุ่มชื่นรับวันถัดไป' }
      };
      const c = configs[activeTab] || configs.summary;
      return [
        { label: 'ช่วงเช้า', icon: '🌅', time: '06:00-12:00', text: c.m },
        { label: 'ช่วงบ่าย', icon: '☀️', time: '12:00-18:00', text: c.a },
        { label: 'ช่วงค่ำ', icon: '🌙', time: '18:00+', text: c.e }
      ];
    };

    return { score, text: getMoodText(), timeline: getTimeline() };
  }, [activeTab, targetDateIdx, weatherData]);

  // --- 4. Configs & Styles ---
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

  // --- 5. Render Logic ---
  if (loadingWeather) return <div style={{ height: '100vh', background: appBg, display: 'flex', justifyContent: 'center', alignItems: 'center', color: textColor, fontFamily: 'Kanit' }}>🤖 AI กำลังวิเคราะห์ข้อมูล...</div>;
  
  if (!weatherData) return <div style={{ height: '100vh', background: appBg, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: subTextColor, fontFamily: 'Kanit', padding: '20px', textAlign: 'center' }}>
    <div style={{fontSize: '3rem'}}>⚠️</div>
    <p>ไม่สามารถโหลดข้อมูลพยากรณ์ได้ (Too Many Requests)</p>
    <button onClick={() => window.location.reload()} style={{marginTop: '15px', padding: '10px 20px', borderRadius: '12px', background: '#0ea5e9', color: '#fff', border: 'none'}}>ลองอีกครั้ง</button>
  </div>;

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: appBg, display: 'flex', justifyContent: 'center', overflowY: 'auto', WebkitOverflowScrolling: 'touch', fontFamily: 'Kanit, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '1100px', display: 'flex', flexDirection: 'column', gap: '20px', padding: isMobile ? '15px' : '30px', paddingBottom: '120px' }}>

        {/* 🌟 1. FILTER SECTION (ตั้งค่า) */}
        <div style={{ background: cardBg, borderRadius: '24px', padding: '18px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', color: textColor }}>📍 วิเคราะห์พื้นที่: <span style={{color: '#0ea5e9'}}>{locationName}</span></h3>
                {isMobile && <button onClick={() => setShowFilters(!showFilters)} style={{ background: 'rgba(14,165,233,0.1)', color: '#0ea5e9', border: 'none', padding: '6px 15px', borderRadius: '50px', fontWeight: 'bold', fontSize: '0.75rem' }}>{showFilters ? '▲ ปิด' : '▼ ตั้งค่า'}</button>}
            </div>
            {showFilters && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr auto', gap: '10px' }}>
                        <select value={selectedProv} onChange={(e) => { setSelectedProv(e.target.value); setLocationName(e.target.value); }} style={{ padding: '10px', borderRadius: '12px', background: darkMode ? '#1e293b' : '#f1f5f9', color: textColor, border: 'none', fontSize: '0.9rem' }}>
                            <option value="">เลือกจังหวัด</option>
                            {stations.map(s => <option key={s.stationID} value={s.areaTH}>{s.areaTH}</option>)}
                        </select>
                        <button onClick={() => window.location.reload()} style={{ background: '#0ea5e9', color: '#fff', border: 'none', padding: '10px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>อัปเดต GPS</button>
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
            
            {/* TABS (โหมดกิจกรรม) */}
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
                            fontWeight: 'bold', cursor: 'pointer', textAlign: 'left', width: isMobile ? 'auto' : '100%', transition: 'all 0.2s'
                        }}>
                            <span style={{ fontSize: '1.4rem' }}>{tab.icon}</span>
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* AI CONTENT (ผลวิเคราะห์) */}
            <div style={{ flex: 1, background: cardBg, borderRadius: '24px', padding: isMobile ? '20px' : '30px', border: `1px solid ${borderColor}`, boxShadow: '0 10px 30px rgba(0,0,0,0.05)', order: isMobile ? 2 : 1, width: '100%' }}>
                {aiReport ? (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                            <h2 style={{ margin: 0, fontSize: '1.3rem', color: textColor }}>{tabConfigs.find(t=>t.id===activeTab)?.icon} AI วางแผน{tabConfigs.find(t=>t.id===activeTab)?.label}</h2>
                            <div style={{ background: darkMode ? '#1e293b' : '#f8fafc', padding: '10px 15px', borderRadius: '15px', border: `1px solid ${borderColor}` }}>
                                <div style={{ fontSize: '0.7rem', color: subTextColor, fontWeight: 'bold' }}>AI Score</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: '900', color: activeColor }}>{aiReport.score}/10</div>
                            </div>
                        </div>

                        <div style={{ padding: '18px', background: `${activeColor}10`, borderRadius: '20px', borderLeft: `5px solid ${activeColor}`, marginBottom: '30px' }}>
                            <p style={{ margin: 0, fontSize: '1.05rem', color: textColor, lineHeight: 1.6 }}>{aiReport.text}</p>
                        </div>

                        <h4 style={{ margin: '0 0 20px 0', color: textColor }}>🕒 กิจกรรมแนะนำประจำวัน</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {aiReport.timeline.map((item, i) => (
                                <div key={i} style={{ display: 'flex', gap: '15px', position: 'relative' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: activeColor, zIndex: 1 }}></div>
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
                    </>
                ) : (
                    <div style={{textAlign: 'center', padding: '40px', color: subTextColor}}>
                        กำลังเตรียมข้อมูลวิเคราะห์...
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
}