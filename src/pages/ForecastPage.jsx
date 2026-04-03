// src/pages/ForecastPage.jsx
import React, { useContext, useState, useEffect } from 'react';
import { WeatherContext } from '../context/WeatherContext';
import { extractProvince, getPM25Color } from '../utils/helpers';

export default function ForecastPage() {
  const { stations, stationTemps, loading, darkMode, lastUpdateText } = useContext(WeatherContext);
  
  const [alertsLocationName, setAlertsLocationName] = useState('');
  const [activeStation, setActiveStation] = useState(null);
  const [selectedDateOffset, setSelectedDateOffset] = useState(0); 

  // 🌟 กำหนดหัวข้อเริ่มต้นเป็น "summary"
  const [activeAiTopic, setActiveAiTopic] = useState('summary');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSummaryJson, setAiSummaryJson] = useState(null);

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
    const d = new Date(); d.setDate(d.getDate() + i); return d;
  });

  const formatDateLabel = (d, index) => {
    if (index === 0) return `วันนี้ (${d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })})`;
    if (index === 1) return `พรุ่งนี้ (${d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })})`;
    return `${d.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })}`;
  };

  // 🌟 ฟังก์ชันสร้างเนื้อหา AI อัจฉริยะ (ภาษาเป็นกันเองสุดๆ)
  const generateAIContent = () => {
    const dateLabel = formatDateLabel(forecastDates[selectedDateOffset], selectedDateOffset).split(' ')[0];
    const prov = alertsLocationName;
    
    // ดึงค่าปัจจุบันมาใช้ในบทสนทนา (จำลอง)
    const pmVal = activeStation?.AQILast?.PM25?.value ? Number(activeStation.AQILast.PM25.value) : 25;
    const tObj = activeStation ? stationTemps[activeStation.stationID] : {};
    const rainProb = tObj?.rainProb || 0;
    const temp = tObj?.temp ? Math.round(tObj.temp) : 33;

    return {
      summary: [
        { icon: '🌅', title: `เช้านี้ที่ ${prov} (${dateLabel})`, desc: `ตื่นมาสูดอากาศได้ชิลๆ ลมเย็นเบาๆ อุณหภูมิประมาณ ${temp-3}°C รีบออกไปทำธุระตอนเช้าดีที่สุดครับ!`, color: '#10b981' },
        { icon: '☀️', title: 'เที่ยงถึงบ่าย', desc: `แดดเปรี้ยงมากแม่! อุณหภูมิพุ่งปรี๊ดแตะ ${temp}°C ร้อนจนเหงื่อตก แนะนำให้หลบอยู่ในห้องแอร์ฉ่ำๆ ดีกว่านะ`, color: '#f97316' },
        { icon: '🌙', title: 'ตกเย็นค่ำๆ', desc: `ลมเริ่มสงบ อากาศเย็นลงนิดหน่อย ออกมาหาของอร่อยกินที่ตลาดนัดกลางคืนได้สบายใจเลยครับ`, color: '#6366f1' }
      ],
      dust: [
        { icon: '😷', title: `สถานการณ์ฝุ่น PM2.5`, desc: pmVal > 37 ? `ตอนนี้ฝุ่นอยู่ที่ ${pmVal} ถือว่าเริ่มเยอะแล้วนะ ใครจมูกไวหรือเป็นภูมิแพ้ เตรียมพ่นยาและใส่ N95 ด่วนๆ!` : `ฝุ่นอยู่ที่ ${pmVal} อากาศค่อนข้างเคลียร์เลย ถอดหน้ากากสูดอากาศได้เต็มปอดครับ!`, color: pmVal > 37 ? '#f43f5e' : '#22c55e' },
        { icon: '🏠', title: 'คำแนะนำการอยู่บ้าน', desc: pmVal > 37 ? 'ปิดหน้าต่างแน่นๆ แล้วเปิดเครื่องฟอกอากาศด่วนๆ เลยครับ ปล่อยให้เครื่องกรองทำงานไปยาวๆ' : 'เปิดหน้าต่างระบายอากาศให้ลมโกรกได้เลยครับ บ้านจะได้ไม่อับชื้น', color: '#0ea5e9' }
      ],
      rain: [
        { icon: rainProb > 40 ? '☔' : '🌤️', title: 'สรุปฝนตกมั้ย?', desc: rainProb > 40 ? `โอกาสฝนตกตั้ง ${rainProb}% แหนะ! พกร่มติดกระเป๋าไว้เถอะ เชื่อผม ไม่เปียกแน่นอน` : `โอกาสฝนตกแค่ ${rainProb}% เอง วันนี้ฟ้าโปร่งแดดแรง ซักผ้าตากทิ้งไว้ได้สบายใจ หายห่วง!`, color: rainProb > 40 ? '#3b82f6' : '#eab308' },
        { icon: '🚗', title: 'การเดินทาง', desc: rainProb > 40 ? 'ถ้าฝนตกรถติดแน่นอน เผื่อเวลาเดินทางไว้สัก 30 นาทีด้วยนะครับ' : 'ขับรถเปิดประทุนหรือขี่มอเตอร์ไซค์รับลมชิลๆ ได้เลย ถนนแห้งชัวร์', color: '#8b5cf6' }
      ],
      recommendation: [
        { icon: '💧', title: 'ทริคเอาตัวรอดวันนี้', desc: `อากาศร้อนแตะ ${temp}°C แบบนี้ พกขวดน้ำจิบเรื่อยๆ ระวังเพลียแดด (ฮีทสโตรก) นะครับ`, color: '#06b6d4' },
        { icon: '🕶️', title: 'ไอเทมของมันต้องมี', desc: 'ครีมกันแดด SPF50+ แว่นตาดำ และทิชชู่เปียกซับเหงื่อ คือ 3 สิ่งที่ขาดไม่ได้!', color: '#eab308' }
      ],
      pets: [
        { icon: '🐶', title: 'เวลาพาน้องหมาเที่ยว', desc: 'พาไปเดินดมกลิ่นช่วงเช้าตรู่ก่อน 8 โมง หรือหลัง 6 โมงเย็นไปเลยครับ พื้นถนนจะได้ไม่ลวกอุ้งเท้าน้อยๆ', color: '#10b981' },
        { icon: '🚫', title: 'คำเตือนถึงนุด!', desc: 'ช่วงบ่ายห้ามพาน้องออกไปเดินตากแดดเด็ดขาด! และ **ห้ามทิ้งน้องไว้ในรถที่ดับเครื่อง** แม้จะแง้มกระจกไว้ก็ตามนะ!', color: '#ef4444' }
      ],
      travel: [
        { icon: '📸', title: 'สายคาเฟ่ทำคอนเทนต์', desc: 'แสงเช้า 7-10 โมงคือที่สุด! หน้าเนียนกริบกริบ พอตกบ่ายปุ๊บ มุดเข้าห้างหรือคาเฟ่แอร์เย็นๆ เถอะ เชื่อสิ', color: '#ec4899' },
        { icon: '⛺', title: 'สายตั้งแคมป์ / ธรรมชาติ', desc: `กลางคืนลมเย็นโอเคเลย แต่อย่าลืมพกพัดลมพกพาไปเปิดตอนบ่ายด้วย ร้อนเอาเรื่องอยู่ครับ`, color: '#14b8a6' }
      ],
      agriculture: [
        { icon: '💦', title: 'รดน้ำต้นไม้', desc: `วันนี้โอกาสฝน ${rainProb}% ถ้าน้อยกว่า 30% ก็รดน้ำตอนเช้ามืด (ตี 5 - 8 โมง) ได้เลยครับ น้ำจะได้ไม่ระเหยทิ้งเปล่าๆ`, color: '#3b82f6' },
        { icon: '👨‍🌾', title: 'เตือนภัยชาวสวน', desc: 'พักเบรกช่วง 11:00 - 15:00 น. ก่อนนะ ลุยงานตากแดดเปรี้ยงๆ ระวังจะเป็นลมแดดเอาได้ครับ', color: '#ea580c' }
      ],
      construction: [
        { icon: '🏗️', title: 'ลุยไซต์งาน', desc: 'งานเทปูน เทพื้น รีบทำจัดเต็มช่วงเช้าเลยครับ แดดยังไม่ดุมาก', color: '#f59e0b' },
        { icon: '🥤', title: 'พักเบรกลูกน้อง', desc: 'ช่วงบ่ายที่แดดจัดๆ ให้ลูกน้องสลับไปทำงานในร่ม หรือแจกน้ำหวาน/น้ำแข็งไสคลายร้อนกันหน่อยครับ', color: '#6366f1' }
      ],
      commerce: [
        { icon: '🛍️', title: 'ตลาดนัดช่วงเย็น', desc: 'เตรียมรับทรัพย์! อากาศตอนเย็นเป็นใจ ลูกค้าเดินช้อปเพลินแน่นอน จัดร้านรอได้เลย', color: '#10b981' },
        { icon: '🧊', title: 'ร้านเปิดโล่งกลางวัน', desc: 'ร้อนทะลุปรอท! พ่อค้าแม่ค้าต้องกางร่มเงาให้ลูกค้าเยอะๆ และระวังของสด/ขนมละลายด้วยนะครับ', color: '#ef4444' }
      ]
    };
  };

  // 🌟 ฟังก์ชันจัดการเวลากดปุ่มแล้วให้วิเคราะห์ทันที
  const handleTopicClick = (topicId) => {
    setActiveAiTopic(topicId);
    setIsGenerating(true);
    // ทำท่า AI กำลังคิด 0.8 วินาที
    setTimeout(() => {
      setAiSummaryJson(generateAIContent());
      setIsGenerating(false);
    }, 800);
  };

  // สร้างข้อมูล AI ครั้งแรกที่เข้ามาหน้านี้ (ดึงค่าเริ่มต้นเป็น summary)
  useEffect(() => {
    if (activeStation && !aiSummaryJson) {
      setAiSummaryJson(generateAIContent());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStation]);

  const bgGradient = darkMode ? '#0f172a' : '#f8fafc'; 
  const cardBg = darkMode ? 'rgba(30, 41, 59, 0.95)' : '#ffffff';
  const innerCardBg = darkMode ? 'rgba(0,0,0,0.2)' : '#f1f5f9';
  const textColor = darkMode ? '#f8fafc' : '#0f172a';
  const subTextColor = darkMode ? '#94a3b8' : '#64748b'; 
  const borderColor = darkMode ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0'; 

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', background: bgGradient, color: textColor, fontWeight: 'bold' }}>กำลังโหลดข้อมูล... ⏳</div>;

  const pmVal = activeStation?.AQILast?.PM25?.value ? Number(activeStation.AQILast.PM25.value) : null;
  const tObj = activeStation ? stationTemps[activeStation.stationID] : null;
  const tempVal = tObj?.temp;
  const heatVal = tObj?.feelsLike;
  const humidityVal = tObj?.humidity != null ? tObj.humidity : '-';
  const pmBg = getPM25Color(pmVal);
  const pmTextColor = (pmBg === '#ffff00' || pmBg === '#00e400') ? '#222' : '#fff';

  // 🌟 ปรับรายชื่อเมนูให้เป็นกันเอง
  const aiTopics = [
    { id: 'summary', icon: '🌤️', label: 'สรุปให้ฟังหน่อย', color: '#8b5cf6' },
    { id: 'dust', icon: '😷', label: 'ฝุ่นเป็นไงบ้าง', color: '#ef4444' },
    { id: 'rain', icon: '☔', label: 'ฝนตกป่าว', color: '#3b82f6' },
    { id: 'recommendation', icon: '💡', label: 'ทริคแนะนำ', color: '#10b981' },
    { id: 'pets', icon: '🐶', label: 'พาน้องเที่ยว', color: '#f43f5e' },
    { id: 'travel', icon: '⛺', label: 'สายเที่ยว', color: '#14b8a6' },
    { id: 'agriculture', icon: '🌾', label: 'ทำสวน/เกษตร', color: '#84cc16' },
    { id: 'construction', icon: '🏗️', label: 'ลุยไซต์งาน', color: '#f59e0b' },
    { id: 'commerce', icon: '🛒', label: 'ค้าขาย', color: '#6366f1' },
  ];

  return (
    // 🌟 แก้ปัญหา Scroll ไม่ลง! โดยเพิ่ม overflowY: 'auto' และ flex: 1 ให้ครอบคลุมการเลื่อน
    <div style={{ height: '100%', width: '100%', padding: isMobile ? '12px' : '30px', paddingBottom: isMobile ? '100px' : '40px', display: 'flex', flexDirection: 'column', gap: isMobile ? '12px' : '20px', boxSizing: 'border-box', overflowY: 'auto', overflowX: 'hidden', background: bgGradient, fontFamily: 'Kanit, sans-serif' }} className="hide-scrollbar">
      
      {/* 🟢 HEADER */}
      {!isMobile && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <h1 style={{ fontSize: '2rem', color: textColor, margin: 0, fontWeight: '800' }}>✨ AI ผู้ช่วยอัจฉริยะ</h1>
            <p style={{ margin: '2px 0 0 0', color: subTextColor, fontSize: '0.95rem' }}>วิเคราะห์สภาพอากาศแบบชิลๆ</p>
          </div>
          <div style={{ background: innerCardBg, padding: '6px 12px', borderRadius: '12px', color: subTextColor, fontSize: '0.75rem', fontWeight: 'bold', border: `1px solid ${borderColor}` }}>
            ⏱️ ข้อมูลล่าสุด: {lastUpdateText || '-'}
          </div>
        </div>
      )}

      {/* 📍 ตัวเลือกสถานที่ & วันที่ (🌟 ยุบรวมเหลือบรรทัดเดียวเล็กๆ) */}
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '5px', background: cardBg, padding: '8px 12px', borderRadius: '14px', border: `1px solid ${borderColor}`, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '1rem' }}>📍</span>
          <select value={alertsLocationName} onChange={(e) => { setAlertsLocationName(e.target.value); handleTopicClick(activeAiTopic); }} style={{ flex: 1, background: 'transparent', color: textColor, border: 'none', fontWeight: 'bold', fontSize: '0.9rem', outline: 'none', cursor: 'pointer', appearance: 'none', textOverflow: 'ellipsis' }}>
            {provinces.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <span style={{ color: subTextColor, fontSize: '0.7rem' }}>▼</span>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '5px', background: cardBg, padding: '8px 12px', borderRadius: '14px', border: `1px solid ${borderColor}`, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '1rem' }}>📅</span>
          <select value={selectedDateOffset} onChange={(e) => { setSelectedDateOffset(Number(e.target.value)); handleTopicClick(activeAiTopic); }} style={{ flex: 1, background: 'transparent', color: textColor, border: 'none', fontWeight: 'bold', fontSize: '0.9rem', outline: 'none', cursor: 'pointer', appearance: 'none', textOverflow: 'ellipsis' }}>
            {forecastDates.map((d, i) => (
              <option key={i} value={i}>{formatDateLabel(d, i)}</option>
            ))}
          </select>
          <span style={{ color: subTextColor, fontSize: '0.7rem' }}>▼</span>
        </div>
      </div>

      {/* 🌟 1. AI HERO SECTION */}
      <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', padding: '2px', borderRadius: '24px', boxShadow: '0 10px 30px rgba(139, 92, 246, 0.2)', flexShrink: 0 }}>
        <div style={{ background: cardBg, borderRadius: '22px', padding: isMobile ? '15px' : '30px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.1rem', color: textColor, margin: 0, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.4rem' }}>🤖</span> คุยกับ AI
            </h2>
            {isMobile && (
              <span style={{ fontSize: '0.7rem', color: subTextColor, animation: 'pulse 2s infinite' }}>👈 เลื่อนดูโหมดอื่น 👉</span>
            )}
          </div>

          {/* 🌟 ปุ่มหมวดหมู่ (กดแล้ววิเคราะห์เลย) */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', WebkitOverflowScrolling: 'touch' }} className="hide-scrollbar">
            {aiTopics.map((topic) => {
              const isActive = activeAiTopic === topic.id;
              return (
                <button 
                  key={topic.id}
                  onClick={() => handleTopicClick(topic.id)} 
                  style={{ 
                    padding: '8px 12px', 
                    borderRadius: '12px', 
                    border: isActive ? `2px solid ${topic.color}` : `1px solid ${borderColor}`, 
                    fontWeight: 'bold', 
                    fontSize: '0.85rem', 
                    cursor: 'pointer', 
                    whiteSpace: 'nowrap', 
                    background: isActive ? `${topic.color}15` : innerCardBg, 
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
          <div style={{ background: innerCardBg, padding: isMobile ? '15px' : '20px', borderRadius: '16px', border: `1px solid ${borderColor}`, minHeight: '160px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {isGenerating ? (
              <div style={{ textAlign: 'center', color: subTextColor }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '10px', animation: 'spin 2s linear infinite' }}>🤔</div>
                <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: '#8b5cf6' }}>AI กำลังวิเคราะห์...</div>
                <div style={{ fontSize: '0.8rem', marginTop: '5px' }}>รอแป๊บนึงนะ แป๊บเดียว!</div>
              </div>
            ) : aiSummaryJson && aiSummaryJson[activeAiTopic] ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {aiSummaryJson[activeAiTopic].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: darkMode ? `${item.color}15` : `${item.color}10`, padding: '12px', borderRadius: '14px', border: `1px solid ${item.color}30` }}>
                    <div style={{ fontSize: '1.8rem', lineHeight: 1 }}>{item.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', color: item.color, fontSize: '0.95rem', marginBottom: '2px' }}>{item.title}</div>
                      <div style={{ color: textColor, fontSize: '0.85rem', lineHeight: '1.6' }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: subTextColor, fontSize: '0.9rem' }}>
                กดเลือกหัวข้อด้านบน 👆 <br/>เดี๋ยว AI สรุปให้ฟังแบบเพื่อนคุยกัน!
              </div>
            )}
          </div>

        </div>
      </div>

      {/* 🌟 2. MINI METRICS */}
      <div style={{ flexShrink: 0 }}>
        <h3 style={{ fontSize: '0.9rem', color: subTextColor, fontWeight: 'bold', margin: '0 0 8px 5px' }}>📍 สภาพอากาศ ณ ปัจจุบัน</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          <div style={{ background: pmBg, borderRadius: '16px', padding: '10px 5px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: pmTextColor, opacity: 0.9 }}>PM2.5</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '900', color: pmTextColor, lineHeight: 1.2 }}>{pmVal != null && !isNaN(pmVal) ? pmVal : '-'}</div>
          </div>
          <div style={{ background: cardBg, borderRadius: '16px', padding: '10px 5px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', border: `1px solid ${borderColor}`, boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: subTextColor }}>อุณหภูมิ</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '900', color: textColor, lineHeight: 1.2 }}>{tempVal ? Math.round(tempVal) : '-'}°</div>
          </div>
          <div style={{ background: cardBg, borderRadius: '16px', padding: '10px 5px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', border: `1px solid ${borderColor}`, boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: subTextColor }}>ดัชนีร้อน</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '900', color: heatVal >= 41 ? '#ef4444' : textColor, lineHeight: 1.2 }}>{heatVal ? Math.round(heatVal) : '-'}°</div>
          </div>
          <div style={{ background: cardBg, borderRadius: '16px', padding: '10px 5px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', border: `1px solid ${borderColor}`, boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: subTextColor }}>ความชื้น</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '900', color: textColor, lineHeight: 1.2 }}>{humidityVal}%</div>
          </div>
        </div>
      </div>

    </div>
  );
}