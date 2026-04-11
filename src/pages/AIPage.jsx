import React, { useContext, useState, useEffect, useMemo } from 'react';
import { WeatherContext } from '../context/WeatherContext';

export default function AIPage() {
  const { stations, weatherData, fetchWeatherByCoords, loadingWeather, darkMode } = useContext(WeatherContext);
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [locationName, setLocationName] = useState('กำลังระบุตำแหน่ง...');
  const [selectedProv, setSelectedProv] = useState('');
  const [targetDateIdx, setTargetDateIdx] = useState(0); 
  const [activeTab, setActiveTab] = useState('summary'); 

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);

    // ดึงพิกัดอัตโนมัติเฉพาะตอนเปิดหน้าครั้งแรก (และตอนที่ weatherData ยังว่าง)
    if (!weatherData && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
        fetchLocationName(pos.coords.latitude, pos.coords.longitude);
      }, () => {
        if (!weatherData) fetchWeatherByCoords(13.75, 100.5); 
        setLocationName('กรุงเทพมหานคร');
      }, { timeout: 5000 });
    }
    return () => window.removeEventListener('resize', handleResize);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchLocationName = async (lat, lon) => {
    try {
      const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=th`);
      const data = await res.json();
      setLocationName(data?.locality || data?.city || 'ตำแหน่งปัจจุบัน');
    } catch (e) { setLocationName('ตำแหน่งปัจจุบัน'); }
  };

  // 🧠 AI Engine: ดึงข้อมูลและคำนวณตามวันที่เลือก
  const aiReport = useMemo(() => {
    if (!weatherData || !weatherData.daily) return null;

    const d = weatherData.daily;
    // ดึงข้อมูลตาม Index ของวันที่ผู้ใช้เลือก (0 = วันนี้, 1 = พรุ่งนี้, ...)
    const tMax = Math.round(d.temperature_2m_max?.[targetDateIdx] ?? 0);
    const tMin = Math.round(d.temperature_2m_min?.[targetDateIdx] ?? 0);
    const rain = d.precipitation_probability_max?.[targetDateIdx] ?? 0;
    // API ฟรีอาจไม่มีฝุ่นล่วงหน้า 7 วัน ให้ใช้ค่าปัจจุบันแทนในกรณีที่ไม่มีข้อมูล
    const pm25 = d.pm25_max?.[targetDateIdx] !== undefined ? Math.round(d.pm25_max[targetDateIdx]) : Math.round(weatherData.current?.pm25 ?? 0);

    // 💡 1. สรุปด่วน (TL;DR) สำหรับ 3 คำถามยอดฮิต
    const getQuickAnswers = () => {
      let rainAns = { icon: '☀️', title: 'ฝนตกไหม?', text: 'รอด! ไม่มีฝนชัวร์', color: '#22c55e' };
      if (rain > 60) rainAns = { icon: '☔', title: 'ฝนตกไหม?', text: `ตกแน่ โอกาส ${rain}%`, color: '#ef4444' };
      else if (rain > 20) rainAns = { icon: '⛅', title: 'ฝนตกไหม?', text: `อาจมีหยิมๆ ${rain}%`, color: '#f97316' };

      let heatAns = { icon: '😊', title: 'ร้อนไหม?', text: `สบายๆ ${tMax}°C`, color: '#22c55e' };
      if (tMax >= 39) heatAns = { icon: '🥵', title: 'ร้อนไหม?', text: `นรกส่งเข้าประกวด ${tMax}°C`, color: '#ef4444' };
      else if (tMax >= 35) heatAns = { icon: '🔥', title: 'ร้อนไหม?', text: `ร้อนเอาเรื่อง ${tMax}°C`, color: '#f97316' };

      let dustAns = { icon: '🍃', title: 'ฝุ่นเยอะไหม?', text: `อากาศดี ${pm25} µg`, color: '#22c55e' };
      if (pm25 > 50) dustAns = { icon: '😷', title: 'ฝุ่นเยอะไหม?', text: `อันตราย! ${pm25} µg`, color: '#ef4444' };
      else if (pm25 > 25) dustAns = { icon: '🤧', title: 'ฝุ่นเยอะไหม?', text: `เริ่มมีฝุ่น ${pm25} µg`, color: '#f97316' };

      return [rainAns, heatAns, dustAns];
    };

    // 💡 2. คำนวณคะแนนตามบริบท (Contextual Score)
    const calculateScore = () => {
      let baseScore = 10;
      switch (activeTab) {
        case 'home': // ซักผ้า เกลียดฝน
          if (rain > 40) baseScore -= 5;
          if (tMax > 33) baseScore += 1; // แดดแรงซักผ้าดี
          break;
        case 'travel': // เที่ยว เกลียดฝนและร้อน
          if (rain > 30) baseScore -= 3;
          if (tMax > 36) baseScore -= 3;
          if (pm25 > 37.5) baseScore -= 2;
          break;
        case 'health': // สุขภาพ เกลียดฝุ่นและร้อนจัด
          if (pm25 > 37.5) baseScore -= 4;
          if (tMax > 38) baseScore -= 3;
          break;
        case 'driving': // ขับรถ เกลียดฝนหนัก
          if (rain > 60) baseScore -= 4;
          break;
        default: // ภาพรวม
          if (rain > 50) baseScore -= 2;
          if (tMax > 37) baseScore -= 2;
          if (pm25 > 50) baseScore -= 2;
      }
      return Math.max(1, Math.min(10, baseScore)); // บังคับให้อยู่ระหว่าง 1-10
    };
    const finalScore = calculateScore();

    // 💡 3. ข้อความแนะนำหลัก
    const getMainAdvice = () => {
      if (activeTab === 'home' && rain > 40) return `คำแนะนำจาก AI: วันนี้มีความเสี่ยงฝนตก ${rain}% เลี่ยงการซักผ้านวมหรือผ้าชิ้นใหญ่ไปก่อนนะคะ ถ้ารีบซักแนะนำให้อบแห้งหรือตากในที่ร่มค่ะ`;
      if (activeTab === 'health' && pm25 > 37.5) return `คำแนะนำจาก AI: ค่าฝุ่นสูงถึง ${pm25} µg/m³ งดวิ่งสวนสาธารณะชั่วคราว เปลี่ยนมาคาร์ดิโอในบ้าน เปิดเครื่องฟอกอากาศเพื่อสุขภาพปอดที่ดีนะคะ`;
      if (activeTab === 'travel' && tMax > 37) return `คำแนะนำจาก AI: แดดแรงมากทะลุ ${tMax}°C! ถ้ามีแพลนเที่ยว แนะนำจัดคิวคาเฟ่ห้องแอร์ช่วงบ่าย แล้วค่อยไปเดินเล่นที่เปิดโล่งตอนเย็นนะคะ`;
      if (finalScore >= 8) return `คำแนะนำจาก AI: สภาพอากาศวันนี้เป็นใจสุดๆ ค่ะ! ${tMax > 35 ? 'ถึงแดดจะแรงไปนิด' : 'อากาศโปร่งสบาย'} ลุยแพลนที่คุณตั้งใจไว้ได้เต็มที่เลยค่ะ ✨`;
      return `คำแนะนำจาก AI: สภาพอากาศวันนี้อยู่ในเกณฑ์ปานกลาง มีสลับเปลี่ยนระหว่างวัน เตรียมตัวให้พร้อมและเผื่อเวลาแผนสำรองไว้ด้วยนะคะ`;
    };

    // 💡 4. Timeline เช้า บ่าย ค่ำ
    const getTimeline = () => {
      const isRainy = rain > 40;
      const isHot = tMax > 35;
      
      const lines = {
        summary: [
          { time: 'เช้า (06:00 - 12:00)', icon: '🌅', text: `อุณหภูมิเริ่มที่ ${tMin}°C อากาศยังพอสบาย ทำธุระช่วงนี้จะดีที่สุดค่ะ` },
          { time: 'บ่าย (12:00 - 18:00)', icon: '☀️', text: isHot ? `แดดพีคสุดที่ ${tMax}°C ทาครีมกันแดดด้วยนะคะ` : `แดดร่มลมตก อุณหภูมิสูงสุด ${tMax}°C` },
          { time: 'ค่ำ (18:00 เป็นต้นไป)', icon: '🌙', text: isRainy ? `ระวังฝนหลงหลงช่วงค่ำ พกร่มไว้สักนิดค่ะ` : `อากาศเริ่มเย็นลง เหมาะกับการพักผ่อน` }
        ],
        home: [
          { time: 'เช้า', icon: '🧺', text: isRainy ? 'เช็คเมฆก่อนซักผ้า ถ้าครึ้มรอไปก่อนค่ะ' : 'แดดมาแล้ว! รีบเอาผ้าลงเครื่องด่วนเลย' },
          { time: 'บ่าย', icon: '🧹', text: isHot ? 'ความร้อนช่วยฆ่าเชื้อโรค ตากหมอน ตากผ้านวมได้เลย' : 'ทำความสะอาดบ้าน ถูพื้นช่วงนี้แห้งไวค่ะ' },
          { time: 'ค่ำ', icon: '🪟', text: pm25 > 25 ? 'ฝุ่นเริ่มมา ปิดหน้าต่างให้มิดชิดนะคะ' : 'เปิดหน้าต่างรับลม ระบายอากาศในบ้านได้ค่ะ' }
        ]
      };
      
      return lines[activeTab] || lines.summary; // ถ้าแท็บไหนยังไม่เขียนลอจิกเฉพาะ ให้ใช้ summary แทน
    };

    return { 
      score: finalScore, 
      quickAnswers: getQuickAnswers(),
      advice: getMainAdvice(), 
      timeline: getTimeline() 
    };
  }, [activeTab, targetDateIdx, weatherData]);

  const tabConfigs = [
    { id: 'summary', icon: '📋', label: 'ภาพรวม', color: '#8b5cf6' },
    { id: 'travel', icon: '🎒', label: 'ท่องเที่ยว', color: '#ec4899' },
    { id: 'health', icon: '🏃‍♂️', label: 'สุขภาพ', color: '#22c55e' },
    { id: 'driving', icon: '🚘', label: 'ขับขี่', color: '#f97316' },
    { id: 'home', icon: '🧺', label: 'งานบ้าน', color: '#0ea5e9' }
  ];

  const appBg = darkMode ? '#020617' : '#f8fafc'; 
  const cardBg = darkMode ? '#0f172a' : '#ffffff';
  const textColor = darkMode ? '#f8fafc' : '#0f172a'; 
  const borderColor = darkMode ? '#1e293b' : '#e2e8f0';
  const subTextColor = darkMode ? '#94a3b8' : '#64748b'; 
  const activeColor = tabConfigs.find(t => t.id === activeTab)?.color || '#8b5cf6';

  if (loadingWeather) return (
    <div className="loading-container" style={{ background: appBg, color: textColor }}>
        <div className="loading-spinner" style={{ borderTopColor: '#8b5cf6' }}></div>
        <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>AI กำลังคำนวณแผนชีวิตให้คุณ...</div>
        <div style={{ fontSize: '0.85rem', color: subTextColor, marginTop: '5px' }}>วิเคราะห์ฝน แดด และฝุ่น</div>
    </div>
  );
  
  if (!weatherData) return (
    <div style={{ minHeight: '100dvh', background: appBg, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: subTextColor, fontFamily: 'Kanit', padding: '20px', textAlign: 'center' }}>
      <div style={{fontSize: '3rem'}}>⚠️</div>
      <p style={{fontWeight: 'bold'}}>ไม่สามารถโหลดข้อมูลได้ชั่วคราว</p>
      <button onClick={() => window.location.reload()} style={{marginTop: '15px', padding: '10px 25px', borderRadius: '50px', background: '#0ea5e9', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer'}}>ลองใหม่อีกครั้ง</button>
    </div>
  );

  return (
    <div style={{ width: '100%', minHeight: '100dvh', background: appBg, display: 'block', overflowY: 'auto', WebkitOverflowScrolling: 'touch', fontFamily: 'Kanit, sans-serif' }} className="hide-scrollbar">
      
      {/* ซ่อน Scrollbar ของหน้าต่าง */}
      <style dangerouslySetInlineStyle={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .fade-in { animation: fadeIn 0.4s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}} />

      <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', padding: isMobile ? '15px' : '30px', paddingBottom: '120px' }}>

        {/* 📍 Header & Date Selector */}
        <div style={{ background: cardBg, borderRadius: '24px', padding: '20px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.4rem', color: textColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        ✨ AI ผู้ช่วยส่วนตัว
                    </h1>
                    <div style={{ fontSize: '0.85rem', color: subTextColor, marginTop: '2px' }}>วิเคราะห์: <span style={{color: '#0ea5e9', fontWeight: 'bold'}}>{locationName}</span></div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <select value={selectedProv} onChange={(e) => { 
                        const val = e.target.value;
                        setSelectedProv(val); 
                        if(val){
                            const st = stations.find(s => s.areaTH === val);
                            if(st) { fetchWeatherByCoords(st.lat, st.long); fetchLocationName(st.lat, st.long); }
                        }
                    }} style={{ padding: '8px 12px', borderRadius: '12px', background: darkMode ? '#1e293b' : '#f1f5f9', color: textColor, border: `1px solid ${borderColor}`, fontFamily: 'Kanit', outline: 'none' }}>
                        <option value="">เปลี่ยนพื้นที่</option>
                        {stations.map(s => <option key={s.stationID} value={s.areaTH}>{s.areaTH}</option>)}
                    </select>
                </div>
            </div>

            {/* แถบเลือกวันที่ (เลื่อนซ้ายขวาได้) */}
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginTop: '20px', paddingBottom: '5px' }} className="hide-scrollbar">
                {[0,1,2,3,4,5,6].map(idx => {
                    const date = new Date(weatherData?.daily?.time?.[idx] || Date.now());
                    const dateStr = idx === 0 ? 'วันนี้' : idx === 1 ? 'พรุ่งนี้' : date.toLocaleDateString('th-TH', {weekday:'short', day:'numeric'});
                    return (
                        <button key={idx} onClick={() => setTargetDateIdx(idx)} style={{ 
                            flexShrink: 0, padding: '10px 15px', borderRadius: '14px', 
                            border: `1px solid ${targetDateIdx === idx ? activeColor : borderColor}`, 
                            background: targetDateIdx === idx ? activeColor : 'transparent', 
                            color: targetDateIdx === idx ? '#fff' : textColor, 
                            fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: '0.2s' 
                        }}>
                            {dateStr}
                        </button>
                    );
                })}
            </div>
        </div>

        {/* ⚡ TL;DR Quick Summary Cards (3 คำถามยอดฮิต) */}
        {aiReport && (
            <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px' }}>
                {aiReport.quickAnswers.map((item, idx) => (
                    <div key={idx} style={{ background: cardBg, border: `1px solid ${item.color}50`, borderRadius: '20px', padding: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '5px' }}>{item.icon}</div>
                        <div style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold' }}>{item.title}</div>
                        <div style={{ fontSize: '0.95rem', color: item.color, fontWeight: '900', marginTop: '2px', lineHeight: 1.3 }}>{item.text}</div>
                    </div>
                ))}
            </div>
        )}

        {/* 📑 หมวดหมู่ไลฟ์สไตล์ */}
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '5px' }} className="hide-scrollbar">
            {tabConfigs.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                        flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '50px', border: 'none',
                        background: isActive ? (darkMode ? `${tab.color}30` : `${tab.color}15`) : cardBg,
                        color: isActive ? tab.color : subTextColor,
                        border: `1px solid ${isActive ? tab.color : borderColor}`,
                        fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s'
                    }}>
                        <span style={{ fontSize: '1.2rem' }}>{tab.icon}</span> {tab.label}
                    </button>
                );
            })}
        </div>

        {/* 🤖 AI Detailed Report */}
        {aiReport && (
            <div className="fade-in" key={activeTab + targetDateIdx} style={{ background: cardBg, borderRadius: '24px', padding: isMobile ? '20px' : '30px', border: `1px solid ${borderColor}`, boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.3rem', color: textColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {tabConfigs.find(t=>t.id===activeTab)?.icon} วางแผน {tabConfigs.find(t=>t.id===activeTab)?.label}
                    </h2>
                    <div style={{ background: darkMode ? '#1e293b' : '#f8fafc', padding: '8px 15px', borderRadius: '15px', border: `1px solid ${borderColor}`, textAlign: 'center' }}>
                        <div style={{ fontSize: '0.65rem', color: subTextColor, fontWeight: 'bold' }}>ความเหมาะสม</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '900', color: aiReport.score >= 8 ? '#22c55e' : aiReport.score >= 5 ? '#eab308' : '#ef4444' }}>
                            {aiReport.score}/10
                        </div>
                    </div>
                </div>

                <div style={{ padding: '20px', background: darkMode ? 'rgba(0,0,0,0.2)' : '#f8fafc', borderRadius: '20px', borderLeft: `5px solid ${activeColor}`, marginBottom: '30px' }}>
                    <p style={{ margin: 0, fontSize: '1rem', color: textColor, lineHeight: 1.6 }}>{aiReport.advice}</p>
                </div>

                <h4 style={{ margin: '0 0 15px 0', color: textColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🕒</span> ไทม์ไลน์แนะนำ
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {aiReport.timeline.map((item, i) => (
                        <div key={i} style={{ display: 'flex', gap: '15px', position: 'relative' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: activeColor, zIndex: 1, border: `3px solid ${cardBg}` }}></div>
                                {i < 2 && <div style={{ width: '2px', flex: 1, background: borderColor, marginTop: '-5px', marginBottom: '-5px' }}></div>}
                            </div>
                            <div style={{ flex: 1, paddingBottom: i < 2 ? '15px' : '0' }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '5px' }}>
                                    <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                                    <span style={{ fontWeight: 'bold', color: textColor, fontSize: '0.95rem' }}>{item.time}</span>
                                </div>
                                <div style={{ fontSize: '0.9rem', color: subTextColor, lineHeight: 1.5, background: darkMode ? '#1e293b' : '#f1f5f9', padding: '12px 15px', borderRadius: '15px' }}>
                                    {item.text}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

      </div>
    </div>
  );
}