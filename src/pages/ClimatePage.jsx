// src/pages/AlertsPage.jsx (หรือ ClimatePage.jsx)
import React, { useContext, useState, useEffect, useMemo } from 'react';
import { WeatherContext } from '../context/WeatherContext';

export default function AlertsPage() {
  const { stations, stationTemps, weatherData, loadingWeather, darkMode, lastUpdateText } = useContext(WeatherContext);
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [radarLayer, setRadarLayer] = useState('rain');
  
  const [timeMode, setTimeMode] = useState('current'); 
  const [fireMode, setFireMode] = useState('actual'); 
  
  const [expandedRegion, setExpandedRegion] = useState(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { extremeAlerts, fireRisks, nationalSummary } = useMemo(() => {
    let alerts = [];
    let fires = [];
    let maxTemp = { val: -99, prov: '-' };
    let maxFeelsLike = { val: -99, prov: '-' };
    let maxRain = { val: -1, prov: '-' };
    let maxPm25 = { val: -1, prov: '-' };
    let maxUv = { val: -1, prov: '-' };

    if (stations && stations.length > 0 && stationTemps) {
        stations.forEach(st => {
          const data = stationTemps[st.stationID];
          if (!data) return;

          const pm25 = st.AQILast?.PM25?.value || 0;
          const temp = Math.round(data.temp || 0);
          const feelsLike = Math.round(data.feelsLike || temp); 
          const rain = data.rainProb || 0;
          const uv = Math.round(data.uv || 0); 
          const humidity = Math.round(data.humidity || 0);
          const provName = st.areaTH.replace('จังหวัด', '');

          if (temp > maxTemp.val) maxTemp = { val: temp, prov: provName };
          if (feelsLike > maxFeelsLike.val) maxFeelsLike = { val: feelsLike, prov: provName };
          if (rain > maxRain.val) maxRain = { val: rain, prov: provName };
          if (pm25 > maxPm25.val) maxPm25 = { val: pm25, prov: provName };
          if (uv > maxUv.val) maxUv = { val: uv, prov: provName };

          if (pm25 > 75) alerts.push({ prov: provName, type: 'PM2.5', msg: `ฝุ่นระดับอันตราย (${pm25} µg/m³)`, color: '#ef4444', icon: '😷' });
          if (feelsLike >= 42) alerts.push({ prov: provName, type: 'Heat', msg: `วิกฤตฮีทสโตรก (${feelsLike}°C)`, color: '#ea580c', icon: '🔥' });
          if (uv >= 11) alerts.push({ prov: provName, type: 'UV', msg: `UV อันตรายสุด (${uv} Index)`, color: '#a855f7', icon: '☀️' });
          if (rain > 80) alerts.push({ prov: provName, type: 'Rain', msg: `ระวังน้ำท่วม/พายุ (${rain}%)`, color: '#3b82f6', icon: '⛈️' });

          if (temp >= 35 && humidity <= 40 && rain < 10) {
            fires.push({ prov: provName, temp, humidity, pm25 });
          }
        });
    }

    return { 
      extremeAlerts: alerts.sort((a, b) => b.val - a.val).slice(0, 8), 
      fireRisks: fires.sort((a, b) => b.temp - a.temp).slice(0, 6), 
      nationalSummary: { maxTemp, maxFeelsLike, maxRain, maxPm25, maxUv }
    };
  }, [stations, stationTemps]);

  const mockGistdaHotspots = useMemo(() => [
    { region: 'ภาคเหนือ', count: 452, color: '#ef4444', trend: 'up', provinces: [{name: 'เชียงใหม่', count: 150}, {name: 'แม่ฮ่องสอน', count: 120}, {name: 'ตาก', count: 100}, {name: 'เชียงราย', count: 82}] },
    { region: 'ภาคตะวันตก', count: 142, color: '#f97316', trend: 'up', provinces: [{name: 'กาญจนบุรี', count: 80}, {name: 'ราชบุรี', count: 40}, {name: 'เพชรบุรี', count: 22}] },
    { region: 'ภาคตะวันออกเฉียงเหนือ', count: 128, color: '#f97316', trend: 'down', provinces: [{name: 'เลย', count: 50}, {name: 'ชัยภูมิ', count: 45}, {name: 'หนองคาย', count: 33}] },
    { region: 'ภาคกลาง', count: 85, color: '#eab308', trend: 'down', provinces: [{name: 'นครสวรรค์', count: 40}, {name: 'อุทัยธานี', count: 25}, {name: 'ลพบุรี', count: 20}] },
    { region: 'ภาคตะวันออก', count: 12, color: '#22c55e', trend: 'down', provinces: [{name: 'ปราจีนบุรี', count: 8}, {name: 'สระแก้ว', count: 4}] },
    { region: 'ภาคใต้', count: 5, color: '#22c55e', trend: 'down', provinces: [{name: 'สุราษฎร์ธานี', count: 3}, {name: 'นครศรีธรรมราช', count: 2}] }
  ], []);

  const totalHotspots = useMemo(() => mockGistdaHotspots.reduce((sum, item) => sum + item.count, 0), [mockGistdaHotspots]);

  // 🌟 ข้อมูลจำลองสถิติเมื่อวาน (Yesterday's Records)
  const yesterdayRecords = useMemo(() => [
    { id: 'pm25', title: 'ฝุ่น PM2.5 สูงสุด', value: '124 µg/m³', loc: 'อ.เชียงดาว, จ.เชียงใหม่', color: '#ef4444', icon: '😷', bgLight: '#fef2f2', borderDark: '#7f1d1d' },
    { id: 'heat', title: 'ดัชนีความร้อนสูงสุด', value: '42.1 °C', loc: 'อ.เมือง, จ.ตาก', color: '#ea580c', icon: '🔥', bgLight: '#fff7ed', borderDark: '#7c2d12' },
    { id: 'rain', title: 'ปริมาณฝนสะสมสูงสุด', value: '45 มม.', loc: 'อ.เกาะสมุย, จ.สุราษฎร์ธานี', color: '#3b82f6', icon: '⛈️', bgLight: '#eff6ff', borderDark: '#1e3a8a' },
    { id: 'uv', title: 'รังสี UV สูงสุด', value: '11 (อันตราย)', loc: 'เขตบางนา, กรุงเทพฯ', color: '#a855f7', icon: '☀️', bgLight: '#faf5ff', borderDark: '#4c1d95' }
  ], []);

  const radarOptions = [
    { id: 'rain', icon: '⛈️', label: 'ฝน & พายุ', color: '#3b82f6' },
    { id: 'pm25', icon: '😷', label: 'ฝุ่น PM2.5', color: '#f97316' },
    { id: 'temp', icon: '🌡️', label: 'อุณหภูมิ', color: '#ef4444' },
    { id: 'wind', icon: '🌬️', label: 'ลม', color: '#22c55e' },
    { id: 'rh', icon: '💧', label: 'ความชื้น', color: '#0ea5e9' },
    { id: 'clouds', icon: '☁️', label: 'เมฆ', color: '#94a3b8' }
  ];

  const appBg = darkMode ? '#020617' : '#f8fafc'; 
  const cardBg = darkMode ? '#0f172a' : '#ffffff';
  const textColor = darkMode ? '#f8fafc' : '#0f172a'; 
  const borderColor = darkMode ? '#1e293b' : '#e2e8f0';
  const subTextColor = darkMode ? '#94a3b8' : '#64748b'; 

  if (loadingWeather || !weatherData) return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', background: appBg, color: textColor, fontFamily: 'Kanit, sans-serif' }}>
        <style dangerouslySetInlineStyle={{__html: `@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(0.95); } }`}} />
        <div style={{ fontSize: '4rem', animation: 'pulse 1.5s infinite ease-in-out' }}>🚨</div>
        <div style={{ marginTop: '20px', fontSize: '1.2rem', fontWeight: 'bold' }}>กำลังเชื่อมต่อศูนย์ข้อมูลเตือนภัย...</div>
    </div>
  );

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const fullDateOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  const shortDateOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  const yesterdayShortStr = yesterday.toLocaleDateString('th-TH', shortDateOptions); 
  const yesterdayFullStr = yesterday.toLocaleDateString('th-TH', fullDateOptions); 

  return (
    <div style={{ height: '100%', width: '100%', background: appBg, display: 'flex', justifyContent: 'center', overflowY: 'auto', fontFamily: 'Kanit, sans-serif' }} className="hide-scrollbar">
      <style dangerouslySetInlineStyle={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; } 
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
        .marquee-container { overflow: hidden; white-space: nowrap; position: relative; }
        .marquee-content { display: inline-block; animation: marquee 25s linear infinite; }
        .marquee-content:hover { animation-play-state: paused; }
        .fade-in { animation: fadeIn 0.3s ease-in-out; } 
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
      
      <div style={{ width: '100%', maxWidth: '1200px', display: 'flex', flexDirection: 'column', gap: '20px', padding: isMobile ? '15px' : '30px', paddingBottom: '80px' }}>

        <div style={{ background: extremeAlerts.length > 0 ? '#ef4444' : '#22c55e', color: '#fff', padding: '12px 20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 10px 25px rgba(239, 68, 68, 0.2)' }}>
            <span style={{ fontWeight: '900', fontSize: '1rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{animation: 'pulse 1.5s infinite'}}>🚨</span> BREAKING:
            </span>
            <div className="marquee-container" style={{ flex: 1, fontSize: '0.95rem', fontWeight: '500' }}>
                <div className="marquee-content">
                    {extremeAlerts.length > 0 
                        ? extremeAlerts.map((alt, i) => <span key={i} style={{ margin: '0 20px' }}>{alt.icon} <b>จ.{alt.prov}</b>: {alt.msg}</span>)
                        : "✅ สถานการณ์ปกติ ไม่มีประกาศเตือนภัยร้ายแรงระดับประเทศในขณะนี้"
                    }
                </div>
            </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1.2fr', gap: '20px' }}>
            
            {/* 📰 ข่าวอุตุนิยมวิทยา (แบบการ์ดสถิติ) */}
            <div style={{ background: cardBg, padding: '25px', borderRadius: '24px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column', gap: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <h2 style={{ margin: 0, color: textColor, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.5rem' }}>📰</span> ข่าวกรองสภาพอากาศ
                    </h2>
                    
                    <div style={{ display: 'flex', background: darkMode ? '#1e293b' : '#f1f5f9', borderRadius: '50px', padding: '4px' }}>
                        <button onClick={() => setTimeMode('yesterday')} style={{ padding: '6px 16px', borderRadius: '50px', border: 'none', background: timeMode === 'yesterday' ? cardBg : 'transparent', color: timeMode === 'yesterday' ? textColor : subTextColor, fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: timeMode === 'yesterday' ? '0 2px 10px rgba(0,0,0,0.1)' : 'none' }}>
                            {yesterdayShortStr} (เมื่อวาน)
                        </button>
                        <button onClick={() => setTimeMode('current')} style={{ padding: '6px 16px', borderRadius: '50px', border: 'none', background: timeMode === 'current' ? '#0ea5e9' : 'transparent', color: timeMode === 'current' ? '#fff' : subTextColor, fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: timeMode === 'current' ? '0 2px 10px rgba(14,165,233,0.3)' : 'none' }}>
                            ปัจจุบัน (Nowcast)
                        </button>
                    </div>
                </div>
                
                {timeMode === 'current' ? (
                    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={{ fontSize: '0.85rem', color: '#0ea5e9', fontWeight: 'bold', marginBottom: '-5px' }}>อัปเดตล่าสุด: {lastUpdateText}</div>
                        
                        {/* 🌟 การ์ดสถิติปัจจุบัน (Nowcast Cards) */}
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                            {/* การ์ดความร้อน */}
                            <div style={{ background: darkMode ? '#1e293b' : '#fff7ed', border: `1px solid ${darkMode ? '#7c2d12' : '#fed7aa'}`, padding: '15px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ fontSize: '2rem', flexShrink: 0 }}>🔥</div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold' }}>ดัชนีความร้อนสูงสุด</span>
                                    <span style={{ fontSize: '1.2rem', fontWeight: '900', color: '#ea580c' }}>{nationalSummary.maxFeelsLike.val}°C</span>
                                    <span style={{ fontSize: '0.8rem', color: textColor }}>📍 จ.{nationalSummary.maxFeelsLike.prov}</span>
                                </div>
                            </div>
                            {/* การ์ดฝุ่น */}
                            <div style={{ background: darkMode ? '#1e293b' : '#fef2f2', border: `1px solid ${darkMode ? '#7f1d1d' : '#fecaca'}`, padding: '15px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ fontSize: '2rem', flexShrink: 0 }}>😷</div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold' }}>ฝุ่น PM2.5 แย่ที่สุด</span>
                                    <span style={{ fontSize: '1.2rem', fontWeight: '900', color: '#ef4444' }}>{nationalSummary.maxPm25.val} µg/m³</span>
                                    <span style={{ fontSize: '0.8rem', color: textColor }}>📍 จ.{nationalSummary.maxPm25.prov}</span>
                                </div>
                            </div>
                            {/* การ์ดฝน */}
                            <div style={{ background: darkMode ? '#1e293b' : '#eff6ff', border: `1px solid ${darkMode ? '#1e3a8a' : '#bfdbfe'}`, padding: '15px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ fontSize: '2rem', flexShrink: 0 }}>⛈️</div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold' }}>เสี่ยงพายุฝนฟ้าคะนอง</span>
                                    <span style={{ fontSize: '1.2rem', fontWeight: '900', color: '#3b82f6' }}>{nationalSummary.maxRain.val}%</span>
                                    <span style={{ fontSize: '0.8rem', color: textColor }}>📍 จ.{nationalSummary.maxRain.prov}</span>
                                </div>
                            </div>
                            {/* การ์ด UV */}
                            <div style={{ background: darkMode ? '#1e293b' : '#faf5ff', border: `1px solid ${darkMode ? '#4c1d95' : '#e9d5ff'}`, padding: '15px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ fontSize: '2rem', flexShrink: 0 }}>☀️</div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold' }}>รังสี UV แรงที่สุด</span>
                                    <span style={{ fontSize: '1.2rem', fontWeight: '900', color: '#a855f7' }}>ระดับ {nationalSummary.maxUv.val}</span>
                                    <span style={{ fontSize: '0.8rem', color: textColor }}>📍 จ.{nationalSummary.maxUv.prov}</span>
                                </div>
                            </div>
                        </div>

                        <h3 style={{ margin: '10px 0 0 0', fontSize: '0.95rem', color: subTextColor }}>พื้นที่ที่ต้องเฝ้าระวังด่วนพิเศษ:</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
                            {extremeAlerts.slice(0, 4).map((alt, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: darkMode ? 'rgba(0,0,0,0.2)' : '#f8fafc', padding: '12px', borderRadius: '12px', border: `1px solid ${borderColor}` }}>
                                    <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: `${alt.color}20`, color: alt.color, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.1rem', flexShrink: 0 }}>{alt.icon}</div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold' }}>จ.{alt.prov}</span>
                                        <span style={{ fontSize: '0.85rem', color: textColor, fontWeight: 'bold' }}>{alt.msg}</span>
                                    </div>
                                </div>
                            ))}
                            {extremeAlerts.length === 0 && <div style={{ padding: '10px', color: '#22c55e', fontSize: '0.9rem', fontWeight: 'bold' }}>ไม่มีพื้นที่เฝ้าระวังพิเศษ</div>}
                        </div>
                    </div>
                ) : (
                    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={{ fontSize: '0.85rem', color: '#8b5cf6', fontWeight: 'bold', marginBottom: '-5px' }}>สถิติประเทศประจำวันที่: {yesterdayFullStr}</div>
                        
                        {/* 🌟 การ์ดสถิติเมื่อวาน (Yesterday's Cards) */}
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                            {yesterdayRecords.map((rec, idx) => (
                                <div key={idx} style={{ background: darkMode ? '#1e293b' : rec.bgLight, border: `1px solid ${darkMode ? rec.borderDark : 'transparent'}`, padding: '15px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ fontSize: '2rem', flexShrink: 0 }}>{rec.icon}</div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold' }}>{rec.title}</span>
                                        <span style={{ fontSize: '1.2rem', fontWeight: '900', color: rec.color }}>{rec.value}</span>
                                        <span style={{ fontSize: '0.8rem', color: textColor }}>📍 {rec.loc}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div style={{ background: darkMode ? 'rgba(139, 92, 246, 0.05)' : '#f5f3ff', borderLeft: '4px solid #8b5cf6', padding: '12px 15px', borderRadius: '12px', color: textColor, fontSize: '0.9rem', lineHeight: '1.6' }}>
                            <b>วิเคราะห์ย้อนหลัง:</b> สภาพอากาศเมื่อวานมีความแปรปรวนสูง หลายพื้นที่มีค่าดัชนีความร้อนและ PM2.5 แตะระดับอันตราย โปรดเปรียบเทียบสถิติเพื่อการวางแผนในวันนี้
                        </div>
                    </div>
                )}
            </div>

            {/* 🛰️ ระบบเฝ้าระวังจุดความร้อน */}
            <div style={{ background: cardBg, padding: '25px', borderRadius: '24px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column', gap: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <h2 style={{ margin: 0, color: textColor, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.5rem' }}>🛰️</span> ศูนย์ควบคุมไฟป่า
                    </h2>
                </div>
                
                <div style={{ display: 'flex', background: darkMode ? '#1e293b' : '#f1f5f9', borderRadius: '12px', padding: '4px' }}>
                    <button onClick={() => setFireMode('actual')} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: fireMode === 'actual' ? cardBg : 'transparent', color: fireMode === 'actual' ? '#ea580c' : subTextColor, fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: fireMode === 'actual' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none' }}>
                        🔥 จุดความร้อนจริง (GISTDA)
                    </button>
                    <button onClick={() => setFireMode('risk')} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: fireMode === 'risk' ? cardBg : 'transparent', color: fireMode === 'risk' ? '#a855f7' : subTextColor, fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: fireMode === 'risk' ? '0 2px 5px rgba(0,0,0,0.1)' : 'none' }}>
                        🎯 ดัชนีพื้นที่เสี่ยง
                    </button>
                </div>
                
                {fireMode === 'actual' ? (
                    <div className="fade-in hide-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                            <span style={{ fontSize: '0.75rem', color: subTextColor }}>*ดาวเทียม Suomi NPP ({yesterdayShortStr})</span>
                            <span style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: 'bold', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>ยอดรวม {totalHotspots} จุด</span>
                        </div>
                        
                        <div className="hide-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '350px', paddingRight: '5px' }}>
                            {mockGistdaHotspots.map((hs, idx) => {
                                const isExpanded = expandedRegion === hs.region;
                                return (
                                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', background: darkMode ? '#1e293b' : '#f8fafc', borderRadius: '10px', borderLeft: `3px solid ${hs.color}`, overflow: 'hidden', borderTop: `1px solid ${borderColor}`, borderRight: `1px solid ${borderColor}`, borderBottom: `1px solid ${borderColor}` }}>
                                        <div onClick={() => setExpandedRegion(isExpanded ? null : hs.region)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', cursor: 'pointer', background: isExpanded ? (darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)') : 'transparent' }}>
                                            <span style={{ color: textColor, fontWeight: 'bold', fontSize: '0.9rem' }}>{hs.region}</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ color: hs.color, fontWeight: '900', fontSize: '1.1rem' }}>{hs.count}</span>
                                                <span style={{ fontSize: '0.8rem', color: hs.trend === 'up' ? '#ef4444' : '#22c55e' }}>{hs.trend === 'up' ? '▲' : '▼'}</span>
                                                <span style={{ fontSize: '1.2rem', color: subTextColor, transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}>⌄</span>
                                            </div>
                                        </div>
                                        
                                        {isExpanded && (
                                            <div style={{ padding: '0 12px 12px 12px', display: 'flex', flexDirection: 'column', gap: '8px', animation: 'fadeIn 0.2s ease-out' }}>
                                                <div style={{ height: '1px', background: borderColor, marginBottom: '4px' }}></div>
                                                {hs.provinces.map((prov, i) => (
                                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: subTextColor }}>
                                                        <span>จ.{prov.name}</span>
                                                        <span style={{ fontWeight: 'bold', color: textColor }}>{prov.count} จุด</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="fade-in hide-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
                        <p style={{ margin: '0 0 5px 0', fontSize: '0.75rem', color: subTextColor }}>*วิเคราะห์จากพื้นที่ ร้อนจัด+แห้งแล้ง+ไร้ฝน ณ ปัจจุบัน</p>
                        {fireRisks.length > 0 ? fireRisks.map((fire, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: darkMode ? '#451a03' : '#fff7ed', border: '1px solid #ea580c', padding: '10px 12px', borderRadius: '10px' }}>
                                <span style={{ color: '#ea580c', fontWeight: 'bold', fontSize: '0.9rem' }}>{idx+1}. จ.{fire.prov}</span>
                                <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem', fontWeight: 'bold', color: darkMode ? '#fdba74' : '#9a3412' }}>
                                    <span style={{background: 'rgba(255,255,255,0.2)', padding:'2px 6px', borderRadius:'6px'}}>🔥 {fire.temp}°</span>
                                    <span style={{background: 'rgba(255,255,255,0.2)', padding:'2px 6px', borderRadius:'6px'}}>💧 {fire.humidity}%</span>
                                </div>
                            </div>
                        )) : (
                            <div style={{ textAlign: 'center', padding: '30px 0', color: '#22c55e', fontWeight: 'bold', fontSize: '0.9rem' }}>✅ ไม่พบพื้นที่เสี่ยงรุนแรง</div>
                        )}
                    </div>
                )}
            </div>

        </div>

        {/* 📡 3. Pro Radar Console */}
        <div style={{ background: cardBg, padding: '20px', borderRadius: '24px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column', gap: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                <h2 style={{ margin: 0, color: textColor, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.5rem' }}>📡</span> แผงควบคุมเรดาร์ (Windy)
                </h2>

                <div className="hide-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '5px' }}>
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
            
        </div>

      </div>
    </div>
  );
}