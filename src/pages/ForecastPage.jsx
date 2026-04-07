// src/pages/AIPage.jsx
import React, { useContext, useState, useEffect, useMemo } from 'react';
import { WeatherContext } from '../context/WeatherContext';

export default function AIPage() {
  const { stations, weatherData, fetchWeatherByCoords, loadingWeather, darkMode } = useContext(WeatherContext);
  
  // --- 1. States (Hooks) ---
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

    if (!weatherData && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
        setLocationName('ตำแหน่งปัจจุบัน');
      }, () => {
        if (!weatherData) fetchWeatherByCoords(13.75, 100.5); 
      }, { timeout: 5000 });
    }
    return () => window.removeEventListener('resize', handleResize);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- 3. AI Logic Engine ---
  const aiReport = useMemo(() => {
    if (!weatherData || !weatherData.daily || !weatherData.daily.time) return null;

    const d = weatherData.daily;
    const tMax = Math.round(d.temperature_2m_max?.[targetDateIdx] ?? 0);
    const rain = d.precipitation_probability_max?.[targetDateIdx] ?? 0;
    const currentPm25 = d.pm25_max ? Math.round(d.pm25_max[targetDateIdx] ?? 0) : (weatherData.current?.pm25 ?? 0);
    
    let score = 10;
    if (rain > 50) score -= 3;
    if (tMax > 37) score -= 3;
    if (currentPm25 > 50) score -= 4;
    if (score < 1) score = 1;

    const getMoodText = () => {
      if (currentPm25 > 50) return `วันนี้ฝุ่นเยอะระดับอันตราย (${currentPm25} µg/m³) ใส่แมสก์ด่วนๆ เลยนะคะ AI เป็นห่วง 😷`;
      if (rain > 60) return `ฟ้าหลังฝนอาจจะสวย แต่ตอนฝนตกแรง ${rain}% แบบนี้ พกเสื้อกันฝนไว้ดีกว่าค่ะ ☔`;
      if (tMax > 38) return `ร้อนระอุ ${tMax}°C เหมือนซ้อมตกนรก! หาเครื่องดื่มเย็นๆ และเลี่ยงแดดจัดนะคะ 🥵`;
      if (score >= 8) return `สภาพอากาศดีมากค่ะ เหมาะกับการออกไปใช้ชีวิตให้คุ้มที่สุดในวันหยุดนี้ ✨`;
      return `อากาศกลางๆ ค่ะ มีแดดสลับเมฆ เตรียมตัวให้พร้อมสำหรับทุกกิจกรรมนะคะ`;
    };

    const getTimeline = () => {
      const configs = {
        summary: { m: 'อากาศสดชื่น เริ่มต้นวันใหม่ด้วยรอยยิ้มค่ะ', a: tMax > 35 ? 'แดดแรงมาก หาที่หลบแดดในคาเฟ่ดีกว่า' : 'ท้องฟ้าเปิด เดินทางไปไหนมาไหนสะดวก', e: 'อากาศเย็นลง เหมาะกับการเดินเล่นรับลม' },
        travel: { m: 'แสงตอนเช้าถ่ายรูปสวยมาก เตรียมกล้องให้พร้อม!', a: 'แดดจัดแบบนี้ อย่าลืมแว่นกันแดดและครีมกันแดดนะคะ', e: 'เดินตลาดนัดหรือทานอาหารนอกบ้านได้ชิลๆ' },
        health: { m: currentPm25 > 40 ? 'ฝุ่นหนา เปลี่ยนมาเต้นแอโรบิกในบ้านแทนนะคะ' : 'อากาศดีมาก เหมาะกับการวิ่งในสวนสาธารณะ', a: 'ระวังฮีทสโตรก ดื่มน้ำเปล่าบ่อยๆ ช่วยได้เยอะค่ะ', e: 'โยคะเบาๆ ก่อนนอน ช่วยให้หลับสบายขึ้น' },
        driving: { m: 'ถนนแห้ง ทัศนวิสัยชัดเจน ขับขี่สบายใจค่ะ', a: 'ระวังแสงแดดแยงตา ใช้ที่บังแดดในรถช่วยนะคะ', e: rain > 40 ? 'ถนนลื่นเพราะฝนตก ขับช้าลงอีกนิดนะคะ' : 'การจราจรไหลลื่น เดินทางปลอดภัยค่ะ' },
        home: { m: 'แดดเริ่มมาแล้ว รีบเอาผ้าลงเครื่องซักด่วนเลย!', a: 'แดดจัดแบบนี้ ตากผ้านวมผืนใหญ่แห้งไวแน่นอนค่ะ', e: 'ปิดหน้าต่างกันฝุ่นและแมลงเข้าบ้านช่วงหัวค่ำ' },
        farm: { m: 'ช่วงเวลาทองของการฉีดพ่นปุ๋ย ต้นไม้ดูดซึมได้ดีค่ะ', a: 'งดรดน้ำช่วงนี้เด็ดขาด ป้องกันรากพืชสุกจากดินร้อน', e: 'รดน้ำให้ชุ่มชื่น เตรียมรับแดดในวันพรุ่งนี้ค่ะ' }
      };
      const c = configs[activeTab] || configs.summary;
      return [
        { label: 'เช้า', icon: '🌅', time: '06:00-12:00', text: c.m },
        { label: 'บ่าย', icon: '☀️', time: '12:00-18:00', text: c.a },
        { label: 'ค่ำ', icon: '🌙', time: '18:00+', text: c.e }
      ];
    };

    return { score, text: getMoodText(), timeline: getTimeline() };
  }, [activeTab, targetDateIdx, weatherData]);

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

  if (loadingWeather) return <div style={{ height: '100%', background: appBg, display: 'flex', justifyContent: 'center', alignItems: 'center', color: textColor, fontFamily: 'Kanit' }}>🤖 AI กำลังวิเคราะห์ข้อมูล...</div>;
  
  if (!weatherData) return <div style={{ height: '100%', background: appBg, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: subTextColor, fontFamily: 'Kanit', padding: '20px', textAlign: 'center' }}>
    <div style={{fontSize: '3rem'}}>⚠️</div>
    <p>ไม่สามารถโหลดข้อมูลได้ชั่วคราว (API Limit)</p>
    <button onClick={() => window.location.reload()} style={{marginTop: '15px', padding: '10px 20px', borderRadius: '12px', background: '#0ea5e9', color: '#fff', border: 'none'}}>ลองใหม่อีกครั้ง</button>
  </div>;

  return (
    /* 🌟 1. แก้ไข Container หลักให้ล็อค 100% แล้ว Scroll ภายในตัวมันเอง */
    <div style={{ 
      position: 'relative',
      height: '100%', 
      width: '100%', 
      background: appBg, 
      overflowY: 'auto', 
      WebkitOverflowScrolling: 'touch', 
      fontFamily: 'Kanit, sans-serif',
      boxSizing: 'border-box' // 🌟 ป้องกันการหลุดกรอบ
    }} className="hide-scrollbar">
      
      <div style={{ 
        width: '100%', 
        maxWidth: '1100px', 
        margin: '0 auto', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '20px', 
        padding: isMobile ? '15px' : '30px', 
        paddingBottom: '150px', // เผื่อที่ให้เมนูด้านล่างเยอะขึ้น
        boxSizing: 'border-box' // 🌟 ป้องกันการทะลุขอบ
      }}>

        {/* 1. FILTER SECTION */}
        <div style={{ width: '100%', background: cardBg, borderRadius: '24px', padding: '18px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', color: textColor }}>📍 วิเคราะห์พื้นที่: <span style={{color: '#0ea5e9'}}>{locationName}</span></h3>
                {isMobile && <button onClick={() => setShowFilters(!showFilters)} style={{ background: 'rgba(14,165,233,0.1)', color: '#0ea5e9', border: 'none', padding: '6px 15px', borderRadius: '50px', fontWeight: 'bold', fontSize: '0.75rem' }}>{showFilters ? '▲ ปิด' : '▼ ตั้งค่า'}</button>}
            </div>
            {showFilters && (
                <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px', width: '100%', boxSizing: 'border-box' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr auto', gap: '10px' }}>
                        <select value={selectedProv} onChange={(e) => { setSelectedProv(e.target.value); setLocationName(e.target.value); }} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: darkMode ? '#1e293b' : '#f1f5f9', color: textColor, border: 'none', boxSizing: 'border-box' }}>
                            <option value="">เลือกจังหวัด</option>
                            {stations.map(s => <option key={s.stationID} value={s.areaTH}>{s.areaTH}</option>)}
                        </select>
                        <button onClick={() => window.location.reload()} style={{ width: '100%', background: '#0ea5e9', color: '#fff', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', boxSizing: 'border-box' }}>อัปเดต GPS</button>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', width: '100%', boxSizing: 'border-box' }} className="hide-scrollbar">
                        {[0,1,2,3,4,5,6].map(idx => (
                            <button key={idx} onClick={() => setTargetDateIdx(idx)} style={{ flexShrink: 0, minWidth: '70px', padding: '10px', borderRadius: '12px', border: `1px solid ${targetDateIdx === idx ? activeColor : borderColor}`, background: targetDateIdx === idx ? activeColor : 'transparent', color: targetDateIdx === idx ? '#fff' : textColor, fontWeight: 'bold', fontSize: '0.8rem' }}>
                                {idx === 0 ? 'วันนี้' : idx === 1 ? 'พรุ่งนี้' : `+${idx} วัน`}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* 2. MAIN LAYOUT (Tabs + Content) */}
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px', alignItems: 'flex-start', width: '100%', boxSizing: 'border-box' }}>
            
            {/* TABS (โหมดต่างๆ) */}
            <div style={{ 
                display: 'flex', 
                flexDirection: isMobile ? 'row' : 'column', 
                gap: '10px', 
                width: isMobile ? '100%' : '240px',
                overflowX: isMobile ? 'auto' : 'visible',
                order: isMobile ? 1 : 2,
                boxSizing: 'border-box',
                paddingBottom: isMobile ? '5px' : '0' // กัน Scrollbar บังปุ่ม
            }} className="hide-scrollbar">
                {tabConfigs.map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                            flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px', padding: '15px', borderRadius: '16px', border: 'none',
                            background: isActive ? (darkMode ? `${tab.color}30` : `${tab.color}15`) : (darkMode ? '#1e293b' : '#f8fafc'),
                            color: isActive ? (darkMode ? '#fff' : tab.color) : subTextColor,
                            fontWeight: 'bold', cursor: 'pointer', textAlign: 'left', width: isMobile ? 'auto' : '100%', transition: 'all 0.2s', boxSizing: 'border-box'
                        }}>
                            <span style={{ fontSize: '1.4rem' }}>{tab.icon}</span>
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* AI REPORT BOX */}
            <div className="fade-in" key={activeTab} style={{ flex: 1, width: '100%', background: cardBg, borderRadius: '24px', padding: isMobile ? '20px' : '30px', border: `1px solid ${borderColor}`, boxShadow: '0 10px 30px rgba(0,0,0,0.05)', order: isMobile ? 2 : 1, boxSizing: 'border-box', overflow: 'hidden' }}>
                {aiReport && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                            <h2 style={{ margin: 0, fontSize: '1.3rem', color: textColor, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span>{tabConfigs.find(t=>t.id===activeTab)?.icon}</span>
                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>AI วางแผนให้คุณ</span>
                            </h2>
                            <div style={{ background: darkMode ? '#1e293b' : '#f8fafc', padding: '8px 12px', borderRadius: '15px', border: `1px solid ${borderColor}`, textAlign: 'center', flexShrink: 0 }}>
                                <div style={{ fontSize: '0.65rem', color: subTextColor, fontWeight: 'bold' }}>AI Score</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: '900', color: activeColor }}>{aiReport.score}/10</div>
                            </div>
                        </div>

                        <div style={{ padding: '18px', background: `${activeColor}10`, borderRadius: '20px', borderLeft: `5px solid ${activeColor}`, marginBottom: '30px', boxSizing: 'border-box' }}>
                            <p style={{ margin: 0, fontSize: '1.05rem', color: textColor, lineHeight: 1.6, wordBreak: 'break-word' }}>{aiReport.text}</p>
                        </div>

                        <h4 style={{ margin: '0 0 20px 0', color: textColor, fontSize: '1rem' }}>🕒 กิจกรรมแนะนำประจำวัน:</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%', boxSizing: 'border-box' }}>
                            {aiReport.timeline.map((item, i) => (
                                <div key={i} style={{ display: 'flex', gap: '15px', position: 'relative', width: '100%', boxSizing: 'border-box' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: activeColor, zIndex: 1 }}></div>
                                        {i < 2 && <div style={{ width: '2px', flex: 1, background: borderColor }}></div>}
                                    </div>
                                    <div style={{ flex: 1, background: darkMode ? 'rgba(255,255,255,0.03)' : '#f8fafc', padding: '18px', borderRadius: '18px', border: `1px solid ${borderColor}`, boxSizing: 'border-box', overflow: 'hidden' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '5px' }}>
                                            <span style={{ fontWeight: 'bold', color: activeColor, fontSize: '0.95rem' }}>{item.icon} {item.label}</span>
                                            <span style={{ fontSize: '0.75rem', color: subTextColor }}>{item.time}</span>
                                        </div>
                                        <div style={{ fontSize: '0.9rem', color: textColor, lineHeight: 1.5, wordBreak: 'break-word' }}>{item.text}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>

      </div>
    </div>
  );
}