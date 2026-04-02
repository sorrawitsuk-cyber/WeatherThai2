// src/pages/ForecastPage.jsx
import React, { useContext, useState, useEffect } from 'react';
import { WeatherContext } from '../context/WeatherContext';
import { extractProvince, getPM25Color, getTempColor } from '../utils/helpers';

export default function ForecastPage() {
  const { stations, stationTemps, loading, darkMode, lastUpdateText } = useContext(WeatherContext);
  
  const [alertsLocationName, setAlertsLocationName] = useState('');
  const [activeStation, setActiveStation] = useState(null);
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

  // 🌟 จำลองข้อมูล AI ให้เป็นแบบ Array อาร์เรย์ของการ์ดสวยๆ
  const handleGenerateAI = () => {
    setIsGenerating(true);
    const dateLabel = formatDateLabel(forecastDates[selectedDateOffset], selectedDateOffset).split(' ')[0]; 

    setTimeout(() => {
      setAiSummaryJson({
        summary: [
          { icon: '🌅', title: 'ช่วงเช้า (06:00 - 10:00 น.)', desc: `อากาศเย็นสบายและโปร่งใสสุดๆ เหมาะกับการเปิดหน้าต่างรับลม หรือออกกำลังกายเบาๆ ใน ${alertsLocationName} ครับ`, color: '#10b981' },
          { icon: '☀️', title: 'ช่วงบ่าย (12:00 - 16:00 น.)', desc: 'แดดค่อนข้างแรงและดัชนีความร้อนพุ่งสูงปรี๊ด! แถมฝุ่นอาจจะเริ่มสะสมตัว แนะนำให้หลบแดดอยู่ในที่ร่มนะครับ', color: '#f97316' },
          { icon: '🌙', title: 'ช่วงค่ำ (18:00 น. เป็นต้นไป)', desc: 'อากาศจะเริ่มเย็นลงและกลับมาโปร่งอีกครั้ง ออกมาเดินเล่นรับลม หรือหาของอร่อยๆ ทานมื้อค่ำได้สบายเลยครับ', color: '#6366f1' }
        ],
        hourly: [
          { icon: '🏃‍♂️', title: '06:00 - 09:00 น.', desc: 'อากาศดีที่สุดในรอบวัน! ฝุ่นน้อย แดดอ่อนๆ เหมาะกับการทำกิจกรรมนอกบ้านทุกชนิดเลยครับ', color: '#0ea5e9' },
          { icon: '🥵', title: '10:00 - 15:00 น.', desc: 'แดดแรงจัด อุณหภูมิพุ่งสูง ควรหลีกเลี่ยงการอยู่กลางแจ้งนานๆ ระวังผิวไหม้และฮีทสโตรกนะครับ', color: '#ef4444' },
          { icon: '🚗', title: '16:00 - 19:00 น.', desc: 'ช่วงเวลารถติด ฝุ่น PM2.5 อาจจะหนาแน่นขึ้นตามแนวถนนหลัก ใครเดินทางช่วงนี้ใส่หน้ากากไว้หน่อยก็ดีครับ', color: '#f59e0b' },
          { icon: '🛋️', title: '20:00 น. เป็นต้นไป', desc: 'อากาศเริ่มเย็นลงและลมสงบ เหมาะกับการพักผ่อนอยู่บ้านชิลๆ แล้วครับ', color: '#8b5cf6' }
        ],
        health: [
          { icon: '🫁', title: 'ผู้ที่เป็นภูมิแพ้หรือหอบหืด', desc: 'ช่วงบ่ายถึงเย็นฝุ่นจะเริ่มก่อตัว แนะนำให้พกยาพ่นและสวมหน้ากากอนามัย (N95 ยิ่งดี) เมื่อต้องออกไปข้างนอกนะครับ', color: '#f43f5e' },
          { icon: '💧', title: 'การป้องกันฮีทสโตรก', desc: 'วันนี้อากาศร้อนเอาเรื่อง! อย่าลืมจิบน้ำเปล่าบ่อยๆ ตลอดวัน และใส่เสื้อผ้าสีอ่อนที่ระบายอากาศได้ดีนะครับ', color: '#06b6d4' }
        ],
        recommendation: [
          { icon: '🏠', title: 'การจัดการในบ้าน', desc: 'ช่วงบ่ายที่อากาศร้อนและฝุ่นเยอะ แนะนำให้ปิดหน้าต่างและเปิดเครื่องฟอกอากาศเพื่อให้อากาศในบ้านสะอาดที่สุดครับ', color: '#14b8a6' },
          { icon: '😷', title: 'ไอเทมที่ต้องพกติดตัว', desc: 'ร่มกันแดด แว่นตากันแดด ขวดน้ำดื่ม และหน้ากากอนามัย คือ 4 ทหารเสือที่คุณขาดไม่ได้ในวันนี้!', color: '#eab308' }
        ],
        pets: [
          { icon: '🐕', title: 'ช่วงเวลาเดินเล่นที่แนะนำ (เช้า/ค่ำ)', desc: 'พาน้องๆ ไปเดินดมกลิ่นได้สบายใจในช่วงเช้าตรู่ (ก่อน 08:00 น.) หรือช่วงค่ำ (หลัง 18:00 น.) อากาศกำลังดี ไม่ร้อนเท้าครับ', color: '#10b981' },
          { icon: '🚫', title: 'ข้อห้ามเด็ดขาด! (10:00 - 16:00 น.)', desc: 'งดพาออกไปเดินเด็ดขาด! พื้นถนนร้อนมากอาจลวกอุ้งเท้าได้ และ **ห้ามทิ้งน้องไว้ในรถกลางแจ้ง** แม้จะแง้มหน้าต่างไว้ก็ตาม อันตรายถึงชีวิตเลยนะ!', color: '#ef4444' }
        ],
        travel: [
          { icon: '📸', title: 'สายถ่ายรูป / เที่ยวธรรมชาติ', desc: 'จัดทริปหรือถ่ายรูปช่วง 07:00-10:00 น. แสงจะสวยละมุนและหน้าไม่มันเยิ้มครับ', color: '#ec4899' },
          { icon: '☕', title: 'สายคาเฟ่ / เดินห้าง', desc: 'ช่วงบ่าย (12:00-16:00 น.) แนะนำหลบแดดเข้าคาเฟ่ชิคๆ ห้างสรรพสินค้า หรือพิพิธภัณฑ์แอร์เย็นๆ ดีที่สุดครับ', color: '#8b5cf6' },
          { icon: '🌃', title: 'สายตลาดนัดกลางคืน', desc: 'ออกมาเดินตลาดนัดกลางคืนหรือชมวิวริมน้ำได้ชิลๆ ตั้งแต่ 17:30 น. เป็นต้นไป อากาศกำลังเป็นใจเลย', color: '#f59e0b' }
        ],
        agriculture: [
          { icon: '💦', title: 'การรดน้ำและใส่ปุ๋ย', desc: 'ได้ผลดีและพืชดูดซึมได้ดีที่สุดในช่วงเช้ามืด (05:00-08:00 น.) ตอนที่แดดยังไม่แรง น้ำจะได้ไม่ระเหยเร็วเกินไปครับ', color: '#3b82f6' },
          { icon: '👨‍🌾', title: 'ความปลอดภัยของเกษตรกร', desc: 'ควรเลี่ยงการทำงานกลางแปลงเกษตรในช่วง 11:00-15:00 น. เพื่อป้องกันโรคลมแดด (ฮีทสโตรก) ถ้าจำเป็นต้องทำ ควรหาหมวกปีกกว้างมาใส่นะครับ', color: '#ea580c' }
        ],
        construction: [
          { icon: '🏗️', title: 'ช่วงเวลาลุยงานหนัก', desc: 'ผู้รับเหมาควรจัดตารางงานเทปูน ขึ้นโครงสร้าง หรืองานที่ต้องตากแดดจัดๆ ไว้ช่วงเช้า (07:00-11:00 น.) ครับ', color: '#f59e0b' },
          { icon: '🥤', title: 'ช่วงเวลาพักและงานในร่ม', desc: 'ให้คนงานพักเบรกยาวขึ้นในช่วงบ่าย หรือสลับไปทำงานในร่มที่อากาศถ่ายเทสะดวกแทน เพื่อลดความตึงเครียดจากความร้อนครับ', color: '#6366f1' }
        ],
        commerce: [
          { icon: '🧊', title: 'ร้านค้าช่วงกลางวัน', desc: 'สำหรับร้านค้าเปิดโล่ง แดดวันนี้ร้อนจัดมาก! ควรเตรียมร่มเงา พัดลมระบายอากาศ และระวังสินค้าที่อาจละลายหรือเสียรูปง่ายครับ', color: '#ef4444' },
          { icon: '🛍️', title: 'ตลาดนัดช่วงเย็น', desc: 'พ่อค้าแม่ค้าเตรียมยิ้มรับทรัพย์! ช่วงเย็น (16:30 น. เป็นต้นไป) อากาศจะเริ่มเย็นลง ลูกค้าจะออกมาเดินช้อปปิ้งเยอะขึ้นแน่นอนครับ', color: '#10b981' }
        ]
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
                    style={{ padding: '8px 15px', borderRadius: '12px', border: isActive ? `2px solid ${topic.color}` : `1px solid ${borderColor}`, fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap', background: isActive ? `${topic.color}15` : innerCardBg, color: isActive ? topic.color : subTextColor, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {topic.icon} {topic.label}
                  </button>
                );
              })}
            </div>

            {/* 🌟 กล่องข้อความ AI (แบบการ์ดสีสันสวยงาม) */}
            <div style={{ background: innerCardBg, padding: isMobile ? '15px' : '20px', borderRadius: '16px', border: `1px solid ${borderColor}`, minHeight: '140px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {isGenerating ? (
                <div style={{ textAlign: 'center', color: subTextColor }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '10px', animation: 'spin 2s linear infinite' }}>⏳</div>
                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>AI กำลังประมวลผล...</div>
                  <div style={{ fontSize: '0.85rem', marginTop: '5px' }}>กรุณารอสักครู่ครับ</div>
                </div>
              ) : aiSummaryJson ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* วนลูปสร้างการ์ดย่อยตามข้อมูลที่ AI ตอบกลับมา */}
                  {aiSummaryJson[activeAiTopic].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '15px', background: darkMode ? `${item.color}15` : `${item.color}10`, padding: '15px', borderRadius: '16px', border: `1px solid ${item.color}30` }}>
                      <div style={{ fontSize: '2.2rem', lineHeight: 1 }}>{item.icon}</div>
                      <div>
                        <div style={{ fontWeight: 'bold', color: item.color, fontSize: '1rem', marginBottom: '4px' }}>{item.title}</div>
                        <div style={{ color: textColor, fontSize: '0.9rem', lineHeight: '1.6' }}>{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: subTextColor, fontSize: '0.95rem' }}>
                  เลือกสถานที่ วันที่ และกดปุ่ม <strong style={{color: '#3b82f6'}}>เริ่มวิเคราะห์</strong> ด้านบน 👆 <br/>เพื่อให้ AI ช่วยสรุปสภาพอากาศ และให้คำแนะนำแบบชิลๆ ครับ
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

      </div>
    </div>
  );
}