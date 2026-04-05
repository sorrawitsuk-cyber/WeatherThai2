// src/pages/ForecastPage.jsx
import React, { useContext, useState, useEffect } from 'react';
import { WeatherContext } from '../context/WeatherContext';

export default function ForecastPage() {
  const { weatherData, loadingWeather, darkMode } = useContext(WeatherContext);
  
  const [activeTopic, setActiveTopic] = useState('summary');
  const [isThinking, setIsThinking] = useState(false);

  const topics = [
    { id: 'summary', icon: '📝', label: 'สรุปภาพรวม' },
    { id: 'health', icon: '🏃‍♂️', label: 'สุขภาพ & กีฬา' },
    { id: 'farm', icon: '🌾', label: 'การเกษตร' },
    { id: 'travel', icon: '🎒', label: 'การท่องเที่ยว' }
  ];

  // ให้ AI คิดนิดนึงตอนเปลี่ยนแท็บ เพื่อความสมจริง
  useEffect(() => {
    setIsThinking(true);
    const timer = setTimeout(() => setIsThinking(false), 600);
    return () => clearTimeout(timer);
  }, [activeTopic, weatherData]);

  const appBg = darkMode ? '#020617' : '#f8fafc'; 
  const cardBg = darkMode ? '#0f172a' : '#ffffff';
  const textColor = darkMode ? '#f8fafc' : '#0f172a'; 
  const borderColor = darkMode ? '#1e293b' : '#e2e8f0';
  const subTextColor = darkMode ? '#94a3b8' : '#64748b';

  if (loadingWeather || !weatherData) {
    return <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100%',background:appBg,color:textColor}}>✨ กำลังปลุก AI ผู้ช่วย... ⏳</div>;
  }

  const { current } = weatherData;
  const isRaining = current.rain > 0;
  const isHot = current.feelsLike >= 38;
  const pmBad = current.pm25 > 37.5;

  // 🧠 ตรรกะสมองของ AI (วิเคราะห์ตามสภาพอากาศจริง)
  const generateAiContent = () => {
    switch (activeTopic) {
      case 'summary':
        return (
          <>
            <h3 style={{color: '#0ea5e9'}}>ภาพรวมสภาพอากาศวันนี้ ✨</h3>
            <p>ขณะนี้อุณหภูมิ <b>{Math.round(current.temp)}°C</b> แต่ความรู้สึกจริงจะอยู่ที่ประมาณ <b>{Math.round(current.feelsLike)}°C</b> ค่าฝุ่น PM2.5 อยู่ที่ <b>{current.pm25} µg/m³</b></p>
            {isRaining && <p style={{color: '#3b82f6'}}>☔ <b>คำเตือน:</b> มีรายงานกลุ่มฝนตกในพื้นที่ของคุณ อย่าลืมพกร่มด้วยนะคะ</p>}
            {isHot && <p style={{color: '#ea580c'}}>🥵 <b>คำเตือน:</b> อากาศร้อนจัด ระวังโรคลมแดด หลีกเลี่ยงแสงแดดช่วงเที่ยงถึงบ่ายสามนะคะ</p>}
            {pmBad && <p style={{color: '#ef4444'}}>😷 <b>คำเตือน:</b> ฝุ่น PM2.5 ค่อนข้างสูง แนะนำให้สวมหน้ากากอนามัย N95 ก่อนออกจากบ้านค่ะ</p>}
            {!isRaining && !isHot && !pmBad && <p style={{color: '#22c55e'}}>🌿 วันนี้อากาศเป็นใจสุดๆ ท้องฟ้าโปร่ง ฝุ่นน้อย ออกไปใช้ชีวิตให้สนุกนะคะ!</p>}
          </>
        );
      case 'health':
        return (
          <>
            <h3 style={{color: '#ec4899'}}>สุขภาพและการออกกำลังกาย 🏃‍♂️</h3>
            <p>สภาพอากาศตอนนี้ มีผลต่อร่างกายของคุณดังนี้ค่ะ:</p>
            <ul>
              <li><b>ฝุ่น PM2.5 ({current.pm25}):</b> {pmBad ? 'ไม่ควรวิ่งหรือปั่นจักรยานกลางแจ้ง แนะนำให้ออกกำลังกายในร่ม (ฟิตเนส) แทนค่ะ' : 'อากาศสะอาด สามารถออกกำลังกาย วิ่ง หรือทำกิจกรรมกลางแจ้งได้อย่างเต็มที่เลยค่ะ'}</li>
              <li><b>ความร้อน ({Math.round(current.feelsLike)}°C):</b> {isHot ? 'อากาศร้อนมาก เสี่ยงต่อภาวะขาดน้ำ ควรจิบน้ำทุกๆ 15 นาทีระหว่างออกกำลังกาย' : 'อุณหภูมิกำลังดี ไม่ทำให้เหนื่อยหอบจนเกินไป'}</li>
            </ul>
          </>
        );
      case 'farm':
        return (
          <>
            <h3 style={{color: '#10b981'}}>คำแนะนำสำหรับการเกษตร 🌾</h3>
            <p>จากข้อมูลความชื้นที่ <b>{current.humidity}%</b> และโอกาสฝนตก:</p>
            <ul>
              {isRaining ? 
                <li><b>การรดน้ำ:</b> ดินมีความชื้นสูง ไม่จำเป็นต้องรดน้ำต้นไม้หรือแปลงเกษตรในวันนี้ค่ะ ☔</li> : 
                <li><b>การรดน้ำ:</b> ดินอาจจะเริ่มแห้ง แนะนำให้รดน้ำช่วงเช้าตรู่หรือช่วงเย็น เพื่อลดการระเหยของน้ำค่ะ 💧</li>
              }
              <li><b>การฉีดพ่นยา:</b> {isRaining || current.windSpeed > 15 ? '❌ ไม่แนะนำให้ฉีดพ่นปุ๋ยหรือยาในตอนนี้ เพราะลมแรง/ฝนตก อาจจะพัดพาสารเคมีหายไปหมดค่ะ' : '✅ ลมสงบ สามารถฉีดพ่นปุ๋ยทางใบหรือฮอร์โมนพืชได้อย่างมีประสิทธิภาพค่ะ'}</li>
            </ul>
          </>
        );
      case 'travel':
        return (
          <>
            <h3 style={{color: '#eab308'}}>คำแนะนำการเดินทางและท่องเที่ยว 🎒</h3>
            {isRaining ? (
              <p>☔ <b>สภาพเส้นทาง:</b> ฝนตก ถนนลื่น ทัศนวิสัยอาจลดลง แนะนำให้ขับรถอย่างระมัดระวัง เปิดไฟหน้ารถ และเว้นระยะห่างจากคันหน้าให้มากขึ้นนะคะ แผนเที่ยวคาเฟ่ในร่มน่าจะตอบโจทย์ที่สุดวันนี้ค่ะ ☕</p>
            ) : (
              <p>☀️ <b>การเดินทางราบรื่น:</b> วันนี้เส้นทางปกติ ไม่มีฝนกวนใจ เหมาะกับการขับรถออกทริปไกลๆ หรือแวะถ่ายรูปตามจุดชมวิวต่างๆ ค่ะ อย่าลืมทาครีมกันแดดด้วยนะคะ 🕶️</p>
            )}
          </>
        );
      default: return <p>พร้อมให้คำแนะนำค่ะ</p>;
    }
  };

  return (
    <div style={{ height: '100%', padding: '20px 30px', background: appBg, color: textColor, fontFamily: 'Kanit, sans-serif', overflowY: 'auto' }} className="hide-scrollbar">
      <style dangerouslySetInlineStyle={{__html: `.hide-scrollbar::-webkit-scrollbar { display: none; }`}} />
      
      <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '25px', padding: '30px', color: '#fff', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
          <h1 style={{ margin: '0 0 10px 0', fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '3rem' }}>✨</span> AI ผู้ช่วยส่วนตัวของคุณ
          </h1>
          <p style={{ margin: 0, fontSize: '1.1rem', opacity: 0.9 }}>วิเคราะห์สดๆ จากสภาพอากาศ ณ จุดที่คุณอยู่ เพื่อการตัดสินใจที่ดีที่สุดในแต่ละวัน</p>
        </div>

        {/* Content Layout */}
        <div style={{ display: 'flex', flexDirection: window.innerWidth < 768 ? 'column' : 'row', gap: '25px' }}>
          
          {/* เมนูซ้าย */}
          <div style={{ flex: '0 0 250px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {topics.map(t => (
              <button 
                key={t.id} onClick={() => setActiveTopic(t.id)}
                style={{ background: activeTopic === t.id ? '#8b5cf6' : cardBg, color: activeTopic === t.id ? '#fff' : textColor, border: `1px solid ${borderColor}`, padding: '15px 20px', borderRadius: '16px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: activeTopic === t.id ? '0 4px 15px rgba(139, 92, 246, 0.3)' : 'none' }}
              >
                <span style={{ fontSize: '1.4rem' }}>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>

          {/* กรอบแชทขวา */}
          <div style={{ flex: 1, background: cardBg, borderRadius: '25px', padding: '30px', border: `1px solid ${borderColor}`, boxShadow: '0 10px 30px rgba(0,0,0,0.05)', minHeight: '350px' }}>
            {isThinking ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', color: subTextColor, fontWeight: 'bold' }}>
                <span style={{ fontSize: '2rem', animation: 'spin 2s linear infinite' }}>⚙️</span> 
                กำลังประมวลผลคำแนะนำ...
              </div>
            ) : (
              <div style={{ lineHeight: '1.8', fontSize: '1.1rem' }}>
                {generateAiContent()}
              </div>
            )}
          </div>

        </div>
      </div>
      <style dangerouslySetInlineStyle={{__html:`@keyframes spin { 100% { transform: rotate(360deg); } }`}} />
    </div>
  );
}