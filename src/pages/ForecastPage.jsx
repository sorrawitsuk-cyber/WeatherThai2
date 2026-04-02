// src/pages/ForecastPage.jsx
import React, { useContext, useState, useEffect } from 'react';
import { WeatherContext } from '../context/WeatherContext';
import { extractProvince, getPM25Color, getTempColor } from '../utils/helpers';

export default function ForecastPage() {
  const { stations, stationTemps, loading, darkMode, lastUpdateText } = useContext(WeatherContext);
  
  const [alertsLocationName, setAlertsLocationName] = useState('');
  const [activeStation, setActiveStation] = useState(null);
  
  // 🌟 เพิ่ม State สำหรับเก็บ "วันที่พยากรณ์" (0 = วันนี้, 1 = พรุ่งนี้, ...)
  const [selectedDateOffset, setSelectedDateOffset] = useState(0); 

  const [aiSummaryJson, setAiSummaryJson] = useState(null);
  const [activeAiTopic, setActiveAiTopic] = useState('summary');
  const [isGenerating, setIsGenerating] = useState(false);

  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const provinces = [...new Set((stations || []).map(s => extractProvince(s.areaTH)))].sort((a, b) => a.localeCompare(b, 'th'));

  useEffect(() => {
    if (provinces.length > 0 && !alertsLocationName) {
      setAlertsLocationName(provinces.includes('กรุงเทพมหานคร') ? 'กรุงเทพมหานคร' : provinces[0]);
    }
  }, [provinces, alertsLocationName]);

  useEffect(() => {
    if (stations && alertsLocationName) {
      const target = stations.find(s => extractProvince(s.areaTH) === alertsLocationName);
      if (target) setActiveStation(target);
    }
  }, [alertsLocationName, stations]);

  // 🌟 สร้าง Array วันที่ล่วงหน้า 7 วัน สำหรับ Dropdown
  const forecastDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  const formatDateLabel = (d, index) => {
    if (index === 0) return `วันนี้ (${d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })})`;
    if (index === 1) return `พรุ่งนี้ (${d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })})`;
    return `${d.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })}`;
  };

  // 🌟 อัปเดตข้อมูล AI ให้แสดงวันที่ด้วย
  const handleGenerateAI = () => {
    setIsGenerating(true);
    const dateLabel = formatDateLabel(forecastDates[selectedDateOffset], selectedDateOffset).split(' ')[0]; // ดึงคำว่า วันนี้/พรุ่งนี้/วัน...

    setTimeout(() => {
      setAiSummaryJson({
        summary: `สภาพอากาศใน ${alertsLocationName} ประจำ${dateLabel}: ช่วงเช้า (06:00-10:00 น.) อากาศเย็นสบายและโปร่งใส ช่วงบ่าย (12:00-16:00 น.) ดัชนีความร้อนจะพุ่งสูง และอาจมีฝุ่นสะสมตัวเพิ่มขึ้น ช่วงค่ำ (ตั้งแต่ 18:00 น.) อากาศจะเริ่มเย็นลงและกลับมาโปร่งอีกครั้ง`,
        hourly: `06:00-09:00: อากาศดีที่สุด เหมาะกับการทำกิจกรรมนอกบ้าน\n10:00-15:00: แดดแรงจัด อุณหภูมิพุ่งสูง ควรอยู่ในที่ร่ม\n16:00-19:00: ช่วงรถติด ฝุ่น PM2.5 อาจหนาแน่นขึ้นตามท้องถนน\n20:00 เป็นต้นไป: อากาศเริ่มเย็นลง เหมาะกับการพักผ่อน`,
        health: `ช่วงเช้าตรู่เหมาะกับการออกกำลังกายกลางแจ้งที่สุด แต่ช่วงบ่าย (13:00-16:00 น.) เสี่ยงฮีทสโตรกสูงมาก ควรงดกิจกรรมกลางแจ้งและดื่มน้ำบ่อยๆ หากต้องออกนอกบ้านช่วงเย็นที่ฝุ่นเริ่มหนา ควรสวมหน้ากากอนามัยป้องกัน`,
        recommendation: `ช่วงบ่ายควรเปิดแอร์หรือพัดลมและหลีกเลี่ยงการตากแดดโดยตรง หากใช้เครื่องฟอกอากาศ แนะนำให้เปิดโหมดสูงสุดในช่วงเวลา 16:00-19:00 น. ที่ฝุ่นภายนอกเริ่มพัดเข้ามา`,
        pets: `พาเดินเล่นได้ช่วงเช้าตรู่ (ก่อน 08:00 น.) หรือช่วงค่ำ (หลัง 18:00 น.) เท่านั้น! เลี่ยงเด็ดขาดช่วง 10:00-16:00 น. เพราะพื้นถนนจะร้อนจัดจนลวกอุ้งเท้า ห้ามทิ้งสัตว์ไว้ในรถกลางแจ้งเด็ดขาด`,
        travel: `ถ้าจัดทริปถ่ายรูปหรือเที่ยวสถานที่เปิด แนะนำช่วง 07:00-10:00 น. แสงจะสวยและไม่ร้อน ช่วงบ่ายแนะนำหลบเข้าคาเฟ่ ห้าง หรือพิพิธภัณฑ์แอร์เย็นๆ และออกมาเดินตลาดนัดกลางคืนได้สบายๆ ตั้งแต่ 17:30 น. เป็นต้นไป`,
        agriculture: `รดน้ำต้นไม้ ฉีดพ่นปุ๋ยหรือยา ได้ผลดีที่สุดในช่วงเช้ามืด (05:00-08:00 น.) ตอนที่แดดยังไม่แรง เกษตรกรควรเลี่ยงการทำงานกลางแจ้งในช่วง 11:00-15:00 น. เพื่อป้องกันโรคลมแดด (ฮีทสโตรก)`,
        construction: `ผู้รับเหมาควรจัดตารางงานเทปูน หรืองานที่ต้องตากแดดไว้ช่วงเช้า (07:00-11:00 น.) และให้คนงานพักเบรกยาวขึ้นในช่วงบ่าย หรือสลับไปทำงานในร่มที่อากาศถ่ายเทสะดวกแทน`,
        commerce: `พ่อค้าแม่ค้าตลาดนัดช่วงเย็น (16:30 น. เป็นต้นไป) อากาศจะเริ่มเป็นใจ ลูกค้าจะออกมาเดินเยอะขึ้น สำหรับร้านค้าช่วงกลางวันแบบเปิดโล่ง ควรเตรียมร่มเงา พัดลม และระวังสินค้าที่อาจละลาย`
      });
      setIsGenerating(false);
    }, 1500);
  };

  const bgGradient = darkMode ? '#0f172a' : '#f8fafc'; 
  const cardBg = darkMode ? 'rgba(30, 41, 59, 0.95)' : '#ffffff';
  const innerCardBg = darkMode ? 'rgba(0,0,0,0.2)' : '#f1f5f9';
  const textColor = darkMode ? '#f8fafc' : '#0f172a';
  const subTextColor = darkMode ? '#94a3b8' : '#64748b'; 
  const borderColor = darkMode ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0'; 

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', background: bgGradient, color: textColor, fontWeight: 'bold' }}>กำลังโหลดข้อมูล... ⏳</div>;

  const pmVal = activeStation && activeStation.AQILast && activeStation.AQILast.PM25 ? Number(activeStation.AQILast.PM25.value) : null;
  const tObj = activeStation ? stationTemps[activeStation.stationID] : null;
  const tempVal = tObj ? tObj.temp : null;
  const heatVal = tObj ? tObj.feelsLike : null;
  const humidityVal = tObj && tObj.humidity != null ? tObj.humidity : '-';
  const pmBg = getPM25Color(pmVal);
  const pmTextColor = (pmBg === '#ffff00' || pmBg === '#00e400') ? '#222' : '#fff';

  const aiTopics = [
    { id: 'summary', icon: '📝', label: 'ภาพรวม', color: '#8b5cf6' },
    { id: 'hourly', icon: '⏱️', label: 'รายชั่วโมง', color: '#0ea5e9' },
    { id: 'health', icon: '🏥', label: 'สุขภาพ', color: '#ef4444' },
    { id: 'recommendation', icon: '💡', label: 'คำแนะนำ', color: '#10b981' },
    { id: 'pets', icon: '🐾', label: 'สัตว์เลี้ยง', color: '#f43f5e' },
    { id: 'travel', icon: '⛺', label: 'ท่องเที่ยว', color: '#14b8a6' },
    { id: 'agriculture', icon: '🌾', label: 'เกษตร', color: '#84cc16' },
    { id: 'construction', icon: '🏗️', label: 'ก่อสร้าง', color: '#f59e0b' },
    { id: 'commerce', icon: '🛒', label: 'ค้าขาย', color: '#6366f1' },
  ];

  return (
    <div style={{ background: bgGradient, minHeight: '100%', width: '100%', padding: isMobile ? '12px' : '30px', paddingBottom: isMobile ? '100px' : '40px', display: 'flex', flexDirection: 'column', gap: isMobile ? '12px' : '20px', boxSizing: 'border-box', overflowY: 'auto', overflowX: 'hidden', fontFamily: 'Kanit, sans-serif' }} className="hide-scrollbar">
      
      {/* 🟢 HEADER */}
      <div style={{ display: 'flex', justifyContent: isMobile ? 'flex-end' : 'space-between', alignItems: 'center' }}>
        {!isMobile && (
          <div>
            <h1 style={{ fontSize: '2rem', color: textColor, margin: 0, fontWeight: '800' }}>✨ AI ผู้ช่วยอัจฉริยะ</h1>
            <p style={{ margin: '2px 0 0 0', color: subTextColor, fontSize: '0.95rem' }}>วิเคราะห์สภาพอากาศและพยากรณ์ล่วงหน้า</p>
          </div>
        )}
        <div style={{ background: innerCardBg, padding: '6px 12px', borderRadius: '12px', color: subTextColor, fontSize: '0.75rem', fontWeight: 'bold', border: `1px solid ${borderColor}` }}>
          ⏱️ ข้อมูลล่าสุด: {lastUpdateText || '-'}
        </div>
      </div>

      {/* 📍 ตัวเลือกสถานที่ & วันที่ (Grid แบ่งครึ่ง) */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: cardBg, padding: '10px 15px', borderRadius: '16px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '1.2rem' }}>📍</span>
          <select value={alertsLocationName} onChange={(e) => { setAlertsLocationName(e.target.value); setAiSummaryJson(null); setActiveAiTopic('summary'); }} style={{ flex: 1, background: 'transparent', color: textColor, border: 'none', fontWeight: 'bold', fontSize: '1rem', outline: 'none', cursor: 'pointer', appearance: 'none', textOverflow: 'ellipsis' }}>
            {provinces.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <span style={{ color: subTextColor, fontSize: '0.8rem' }}>▼</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: cardBg, padding: '10px 15px', borderRadius: '16px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '1.2rem' }}>📅</span>
          <select value={selectedDateOffset} onChange={(e) => { setSelectedDateOffset(Number(e.target.value)); setAiSummaryJson(null); setActiveAiTopic('summary'); }} style={{ flex: 1, background: 'transparent', color: textColor, border: 'none', fontWeight: 'bold', fontSize: '1rem', outline: 'none', cursor: 'pointer', appearance: 'none', textOverflow: 'ellipsis' }}>
            {forecastDates.map((d, i) => (
              <option key={i} value={i}>{formatDateLabel(d, i)}</option>
            ))}
          </select>
          <span style={{ color: subTextColor, fontSize: '0.8rem' }}>▼</span>
        </div>

      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* 🌟 1. AI HERO SECTION */}
        <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', padding: '2px', borderRadius: '24px', boxShadow: '0 10px 30px rgba(139, 92, 246, 0.2)' }}>
          <div style={{ background: cardBg, borderRadius: '22px', padding: isMobile ? '20px' : '30px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.2rem', color: textColor, margin: 0, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.5rem' }}>✨</span> วิเคราะห์ข้อมูล ({alertsLocationName})
              </h2>
              {!isGenerating && (
                <button onClick={handleGenerateAI} style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 10px rgba(59, 130, 246, 0.3)' }}>
                  {aiSummaryJson ? '🔄 เปลี่ยนเงื่อนไขใหม่' : 'เริ่มวิเคราะห์'}
                </button>
              )}
            </div>

            {/* ปุ่มหมวดหมู่ */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', WebkitOverflowScrolling: 'touch' }} className="hide-scrollbar">
              {aiTopics.map((topic) => {
                const isActive = activeAiTopic === topic.id;
                return (
                  <button 
                    key={topic.id}
                    onClick={() => setActiveAiTopic(topic.id)} 
                    style={{ 
                      padding: '8px 15px', 
                      borderRadius: '12px', 
                      border: isActive ? `2px solid ${topic.color}` : `1px solid ${borderColor}`, 
                      fontWeight: 'bold', 
                      fontSize: '0.85rem', 
                      cursor: 'pointer', 
                      whiteSpace: 'nowrap', 
                      background: isActive ? `${topic.color}20` : innerCardBg, 
                      color: isActive ? topic.color : subTextColor, 
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                    {topic.icon} {topic.label}
                  </button>
                );
              })}
            </div>

            {/* กล่องข้อความ AI */}
            <div style={{ background: innerCardBg, padding: '20px', borderRadius: '16px', border: `1px solid ${borderColor}`, minHeight: '140px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {isGenerating ? (
                <div style={{ textAlign: 'center', color: subTextColor }}>
                  <div style={{ fontSize: '2rem', marginBottom: '10px', animation: 'spin 2s linear infinite' }}>⏳</div>
                  <div style={{ fontWeight: 'bold' }}>AI กำลังประมวลผลข้อมูล...</div>
                  <div style={{ fontSize: '0.8rem' }}>กรุณารอสักครู่ครับ</div>
                </div>
              ) : aiSummaryJson ? (
                <div style={{ fontSize: '0.95rem', color: textColor, lineHeight: '1.7', whiteSpace: 'pre-line' }}>
                  {aiSummaryJson[activeAiTopic]}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: subTextColor, fontSize: '0.9rem' }}>
                  เลือกสถานที่ วันที่ และกดปุ่ม <strong style={{color: '#3b82f6'}}>เริ่มวิเคราะห์</strong> ด้านบน 👆 <br/>เพื่อให้ AI ทำนายสภาพอากาศล่วงหน้าให้คุณครับ
                </div>
              )}
            </div>

          </div>
        </div>

        {/* 🌟 2. MINI METRICS */}
        <h3 style={{ fontSize: '0.9rem', color: subTextColor, fontWeight: 'bold', margin: '0 0 -10px 5px' }}>📍 สภาพอากาศ ณ ปัจจุบัน (Real-time)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          <div style={{ background: pmBg, borderRadius: '16px', padding: '12px 5px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: pmTextColor, opacity: 0.9 }}>PM2.5</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '900', color: pmTextColor, lineHeight: 1.2 }}>{pmVal != null && !isNaN(pmVal) ? pmVal : '-'}</div>
          </div>
          <div style={{ background: cardBg, borderRadius: '16px', padding: '12px 5px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', border: `1px solid ${borderColor}`, boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: subTextColor }}>อุณหภูมิ</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '900', color: textColor, lineHeight: 1.2 }}>{tempVal ? Math.round(tempVal) : '-'}°</div>
          </div>
          <div style={{ background: cardBg, borderRadius: '16px', padding: '12px 5px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', border: `1px solid ${borderColor}`, boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: subTextColor }}>ดัชนีร้อน</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '900', color: heatVal >= 41 ? '#ef4444' : textColor, lineHeight: 1.2 }}>{heatVal ? Math.round(heatVal) : '-'}°</div>
          </div>
          <div style={{ background: cardBg, borderRadius: '16px', padding: '12px 5px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', border: `1px solid ${borderColor}`, boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: subTextColor }}>ความชื้น</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '900', color: textColor, lineHeight: 1.2 }}>{humidityVal}%</div>
          </div>
        </div>

        {/* 🌟 3. ข้อมูลสถิติเชิงลึก */}
        <div style={{ background: cardBg, borderRadius: '24px', padding: '20px', border: `1px solid ${borderColor}`, boxShadow: '0 10px 40px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
             <div style={{ background: innerCardBg, padding: '12px', borderRadius: '12px', border: `1px solid ${borderColor}` }}>
               <div style={{ fontSize: '0.75rem', color: subTextColor }}>มาตรฐาน PM2.5 (ไทย)</div>
               <div style={{ fontSize: '1rem', fontWeight: 'bold', color: textColor }}>{pmVal || '-'} µg/m³</div>
             </div>
             <div style={{ background: innerCardBg, padding: '12px', borderRadius: '12px', border: `1px solid ${borderColor}` }}>
               <div style={{ fontSize: '0.75rem', color: subTextColor }}>อุณหภูมิต่ำสุด-สูงสุด</div>
               <div style={{ fontSize: '1rem', fontWeight: 'bold', color: textColor }}>{tObj && tObj.tempMin ? Math.round(tObj.tempMin) : '-'}° - {tObj && tObj.tempMax ? Math.round(tObj.tempMax) : '-'}°</div>
             </div>
             <div style={{ background: innerCardBg, padding: '12px', borderRadius: '12px', border: `1px solid ${borderColor}` }}>
               <div style={{ fontSize: '0.75rem', color: subTextColor }}>โอกาสเกิดฝน</div>
               <div style={{ fontSize: '1rem', fontWeight: 'bold', color: textColor }}>{tObj && tObj.rainProb != null ? Math.round(tObj.rainProb) : '-'}%</div>
             </div>
             <div style={{ background: innerCardBg, padding: '12px', borderRadius: '12px', border: `1px solid ${borderColor}` }}>
               <div style={{ fontSize: '0.75rem', color: subTextColor }}>ความเร็วลมสูงสุด</div>
               <div style={{ fontSize: '1rem', fontWeight: 'bold', color: textColor }}>{tObj && tObj.windMax != null ? Math.round(tObj.windMax) : '-'} km/h</div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}