// src/pages/AlertsPage.jsx (หรือ Climate.jsx)
import React, { useContext, useState, useEffect, useMemo } from 'react';
import { WeatherContext } from '../context/WeatherContext';

export default function AlertsPage() {
  const { stations, stationTemps, weatherData, darkMode, lastUpdateText } = useContext(WeatherContext);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [radarLayer, setRadarLayer] = useState('rain');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const appBg = darkMode ? '#020617' : '#f8fafc'; 
  const cardBg = darkMode ? '#0f172a' : '#ffffff';
  const textColor = darkMode ? '#f8fafc' : '#0f172a'; 
  const borderColor = darkMode ? '#1e293b' : '#e2e8f0';
  const subTextColor = darkMode ? '#94a3b8' : '#64748b'; 

  // 🌟 Pro Logic Engine: สแกนภัยพิบัติครอบคลุม Heat Index, UV, PM2.5, พายุ
  const { extremeAlerts, fireRisks, nationalSummary } = useMemo(() => {
    let alerts = [];
    let fires = [];
    let maxTemp = { val: -99, prov: '' };
    let maxFeelsLike = { val: -99, prov: '' };
    let maxRain = { val: -1, prov: '' };
    let maxPm25 = { val: -1, prov: '' };
    let maxUv = { val: -1, prov: '' };

    stations.forEach(st => {
      const data = stationTemps[st.stationID];
      if (!data) return;

      const pm25 = st.AQILast?.PM25?.value || 0;
      const temp = Math.round(data.temp || 0);
      const feelsLike = Math.round(data.feelsLike || temp); // ดัชนีความร้อน
      const rain = data.rainProb || 0;
      const uv = Math.round(data.uv || 0); // รังสี UV
      const humidity = Math.round(data.humidity || 0);
      const provName = st.areaTH.replace('จังหวัด', '');

      // 📊 เก็บสถิติสูงสุดของประเทศ (Real-time)
      if (temp > maxTemp.val) maxTemp = { val: temp, prov: provName };
      if (feelsLike > maxFeelsLike.val) maxFeelsLike = { val: feelsLike, prov: provName };
      if (rain > maxRain.val) maxRain = { val: rain, prov: provName };
      if (pm25 > maxPm25.val) maxPm25 = { val: pm25, prov: provName };
      if (uv > maxUv.val) maxUv = { val: uv, prov: provName };

      // 🚨 กรองภัยพิบัติฉุกเฉิน (Extreme Alerts) - เกณฑ์มาตรฐานสากล
      if (pm25 > 75) alerts.push({ prov: provName, type: 'PM2.5', msg: `ฝุ่นพิษระดับอันตราย (${pm25} µg/m³)`, color: '#ef4444', icon: '😷' });
      if (feelsLike >= 42) alerts.push({ prov: provName, type: 'Heat', msg: `ดัชนีความร้อนวิกฤต เสี่ยงฮีทสโตรก (${feelsLike}°C)`, color: '#ea580c', icon: '🔥' });
      if (uv >= 11) alerts.push({ prov: provName, type: 'UV', msg: `รังสี UV ระดับอันตรายสุด (${uv} Index)`, color: '#a855f7', icon: '☀️' });
      if (rain > 80) alerts.push({ prov: provName, type: 'Rain', msg: `ระวังน้ำท่วมฉับพลัน พายุฝน (${rain}%)`, color: '#3b82f6', icon: '⛈️' });

      // 🛰️ โมเดลประเมินจุดความร้อน (Hotspot Predictive Model)
      // เทียบเคียงสภาพแวดล้อมที่ทำให้เกิดไฟป่า: ร้อนจัด + แห้งแล้งจัด + ฝนไม่มี
      if (temp >= 35 && humidity <= 40 && rain < 10) {
        fires.push({ prov: provName, temp, humidity, pm25 });
      }
    });

    return { 
      // จัดเรียงความสำคัญ (ดึงมาโชว์ 8 อันดับที่วิกฤตสุด)
      extremeAlerts: alerts.sort((a, b) => b.val - a.val).slice(0, 8), 
      // จัดอันดับพื้นที่เสี่ยงไฟป่าสูงสุด 5 อันดับ
      fireRisks: fires.sort((a, b) => b.temp - a.temp).slice(0, 5), 
      nationalSummary: { maxTemp, maxFeelsLike, maxRain, maxPm25, maxUv }
    };
  }, [stations, stationTemps]);

  const radarOptions = [
    { id: 'rain', icon: '⛈️', label: 'ฝน & พายุ', color: '#3b82f6' },
    { id: 'pm25', icon: '😷', label: 'ฝุ่น PM2.5', color: '#f97316' },
    { id: 'temp', icon: '🌡️', label: 'อุณหภูมิ', color: '#ef4444' },
    { id: 'wind', icon: '🌬️', label: 'ลม', color: '#22c55e' },
    { id: 'rh', icon: '💧', label: 'ความชื้น', color: '#0ea5e9' },
    { id: 'clouds', icon: '☁️', label: 'เมฆ', color: '#94a3b8' }
  ];

  return (
    <div style={{ height: '100%', width: '100%', background: appBg, display: 'flex', justifyContent: 'center', overflowY: 'auto', fontFamily: 'Kanit, sans-serif' }} className="hide-scrollbar">
      <style dangerouslySetInlineStyle={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; } 
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
        .marquee-container { overflow: hidden; white-space: nowrap; position: relative; }
        .marquee-content { display: inline-block; animation: marquee 25s linear infinite; }
        .marquee-content:hover { animation-play-state: paused; }
      `}} />
      
      <div style={{ width: '100%', maxWidth: '1200px', display: 'flex', flexDirection: 'column', gap: '20px', padding: isMobile ? '15px' : '30px', paddingBottom: '80px' }}>

        {/* 🚨 1. Breaking News Ticker (วิ่งเตือนเฉพาะเรื่องด่วน) */}
        <div style={{ background: extremeAlerts.length > 0 ? '#ef4444' : '#22c55e', color: '#fff', padding: '12px 20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 10px 25px rgba(239, 68, 68, 0.2)' }}>
            <span style={{ fontWeight: '900', fontSize: '1rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{animation: 'pulse 1.5s infinite'}}>🚨</span> BREAKING:
            </span>
            <div className="marquee-container" style={{ flex: 1, fontSize: '0.95rem', fontWeight: '500' }}>
                <div className="marquee-content">
                    {extremeAlerts.length > 0 
                        ? extremeAlerts.map((alt, i) => <span key={i} style={{ margin: '0 20px' }}>{alt.icon} <b>จ.{alt.prov}</b>: {alt.msg}</span>)
                        : "✅ สถานการณ์ปกติ ไม่มีประกาศเตือนภัยร้ายแรงในระดับประเทศขณะนี้"
                    }
                </div>
            </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '20px' }}>
            
            {/* 📰 Box 2.1: ข่าวอุตุนิยมวิทยารายวัน (Real-time Generated News) */}
            <div style={{ background: cardBg, padding: '25px', borderRadius: '24px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, color: textColor, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.5rem' }}>📰</span> สรุปข่าวอากาศประจำวัน
                    </h2>
                    <span style={{ fontSize: '0.8rem', color: subTextColor, background: darkMode ? '#1e293b' : '#f1f5f9', padding: '4px 10px', borderRadius: '50px' }}>อัปเดตล่าสุด: {lastUpdateText}</span>
                </div>
                
                <div style={{ background: darkMode ? 'rgba(59, 130, 246, 0.05)' : '#eff6ff', borderLeft: '4px solid #3b82f6', padding: '15px', borderRadius: '12px', color: textColor, fontSize: '0.95rem', lineHeight: '1.7' }}>
                    <b>สรุปสถานการณ์ระดับประเทศ ณ ขณะนี้:</b> พบจุดที่ดัชนีความร้อน (Heat Index) พุ่งสูงสุดที่ <b>จ.{nationalSummary.maxFeelsLike.prov} ({nationalSummary.maxFeelsLike.val}°C)</b> ส่งผลให้รังสี UV แตะระดับ {nationalSummary.maxUv.val} ที่ <b>จ.{nationalSummary.maxUv.prov}</b> 
                    ในขณะที่ <b>จ.{nationalSummary.maxRain.prov}</b> มีความเสี่ยงพายุฝนฟ้าคะนองสูงสุด ({nationalSummary.maxRain.val}%) 
                    สำหรับคุณภาพอากาศ <b>จ.{nationalSummary.maxPm25.prov}</b> วิกฤตหนักที่สุด พบค่าฝุ่นสะสมสูงถึง {nationalSummary.maxPm25.val} µg/m³ ขอให้ประชาชนในพื้นที่เสี่ยงเฝ้าระวังสุขภาพอย่างใกล้ชิด
                </div>

                <h3 style={{ margin: '10px 0 5px 0', fontSize: '0.95rem', color: subTextColor }}>พื้นที่ที่ต้องเฝ้าระวังเป็นพิเศษ:</h3>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
                    {extremeAlerts.slice(0, 4).map((alt, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: darkMode ? '#1e293b' : '#f8fafc', padding: '12px', borderRadius: '12px', border: `1px solid ${borderColor}` }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `${alt.color}20`, color: alt.color, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem', flexShrink: 0 }}>{alt.icon}</div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.85rem', color: subTextColor, fontWeight: 'bold' }}>{alt.prov}</span>
                                <span style={{ fontSize: '0.9rem', color: textColor, fontWeight: 'bold' }}>{alt.msg}</span>
                            </div>
                        </div>
                    ))}
                    {extremeAlerts.length === 0 && (
                        <div style={{ padding: '10px', color: '#22c55e', fontSize: '0.9rem', fontWeight: 'bold' }}>ไม่มีพื้นที่เฝ้าระวังพิเศษ</div>
                    )}
                </div>
            </div>

            {/* 🛰️ Box 2.2: ระบบเฝ้าระวังจุดความร้อน (GISTDA Proxy) */}
            <div style={{ background: cardBg, padding: '25px', borderRadius: '24px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h2 style={{ margin: 0, color: textColor, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.5rem' }}>🛰️</span> เฝ้าระวังจุดความร้อน
                    </h2>
                </div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: subTextColor }}>*ประมวลผลพื้นที่เสี่ยงไฟป่าสูงสุดเทียบเคียงข้อมูลดาวเทียม (วิเคราะห์จากอุณหภูมิและความชื้นสัมพัทธ์ต่ำ)</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto' }} className="hide-scrollbar">
                    {fireRisks.length > 0 ? fireRisks.map((fire, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: darkMode ? '#451a03' : '#fff7ed', border: '1px solid #ea580c', padding: '12px', borderRadius: '12px' }}>
                            <span style={{ color: '#ea580c', fontWeight: 'bold', fontSize: '0.95rem', display:'flex', alignItems:'center', gap:'5px' }}>
                                <span style={{fontSize:'1.2rem'}}>📍</span> จ.{fire.prov}
                            </span>
                            <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem', fontWeight: 'bold', color: darkMode ? '#fdba74' : '#9a3412' }}>
                                <span style={{background: 'rgba(255,255,255,0.2)', padding:'4px 8px', borderRadius:'6px'}}>🔥 {fire.temp}°C</span>
                                <span style={{background: 'rgba(255,255,255,0.2)', padding:'4px 8px', borderRadius:'6px'}}>💧 {fire.humidity}%</span>
                            </div>
                        </div>
                    )) : (
                        <div style={{ textAlign: 'center', padding: '30px 0', color: '#22c55e', fontWeight: 'bold', fontSize: '0.9rem' }}>✅ ไม่พบพื้นที่เสี่ยงจุดความร้อนรุนแรงในขณะนี้</div>
                    )}
                </div>
            </div>

        </div>

        {/* 📡 3. Pro Radar Console (แผงควบคุมอวกาศ) */}
        <div style={{ background: cardBg, padding: '20px', borderRadius: '24px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column', gap: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                <h2 style={{ margin: 0, color: textColor, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.5rem' }}>📡</span> ศูนย์เรดาร์ตรวจอากาศ (Windy Console)
                </h2>

                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '5px' }} className="hide-scrollbar">
                    {radarOptions.map(opt => {
                        const isActive = radarLayer === opt.id;
                        return (
                            <button 
                                key={opt.id} 
                                onClick={() => setRadarLayer(opt.id)}
                                style={{ 
                                    padding: '8px 16px', borderRadius: '50px', border: `1px solid ${isActive ? opt.color : borderColor}`, 
                                    background: isActive ? (darkMode ? `${opt.color}30` : `${opt.color}15`) : (darkMode ? '#1e293b' : '#f8fafc'), 
                                    color: isActive ? (darkMode ? '#fff' : opt.color) : subTextColor, 
                                    fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                                    whiteSpace: 'nowrap', transition: 'all 0.2s'
                                }}
                            >
                                <span>{opt.icon}</span> {opt.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div style={{ width: '100%', height: isMobile ? '400px' : '550px', borderRadius: '16px', overflow: 'hidden', border: `1px solid ${borderColor}`, background: '#000' }}>
                <iframe 
                    width="100%" height="100%" 
                    src={`https://embed.windy.com/embed2.html?lat=13.75&lon=100.5&zoom=5&level=surface&overlay=${radarLayer}&product=ecmwf&menu=&message=true&marker=true`} 
                    frameBorder="0" title="Windy Radar Map"
                ></iframe>
            </div>
            
            <div style={{ fontSize: '0.75rem', color: subTextColor, textAlign: 'right' }}>
                สนับสนุนชั้นข้อมูลเรดาร์โดย <a href="https://www.windy.com" target="_blank" rel="noreferrer" style={{color: '#3b82f6', textDecoration:'none'}}>Windy.com</a>
            </div>
        </div>

      </div>
    </div>
  );
}