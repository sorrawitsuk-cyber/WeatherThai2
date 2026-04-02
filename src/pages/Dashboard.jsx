// src/pages/Dashboard.jsx
import React, { useContext, useState, useEffect } from 'react';
import { WeatherContext } from '../context/WeatherContext';
import { extractProvince, formatLocationName, getPM25Color, getTempColor, getDistanceFromLatLonInKm } from '../utils/helpers';

export default function Dashboard() {
  // 🌟 ดึง nationwideSummary มาใช้งานเพื่อทำ Top 5
  const { stations, stationTemps, loading, darkMode, favLocations, lastUpdateText, nationwideSummary } = useContext(WeatherContext);
  
  const [selectedStationId, setSelectedStationId] = useState(() => localStorage.getItem('lastStationId') || '');
  const [activeStation, setActiveStation] = useState(null);
  const [greeting, setGreeting] = useState('สวัสดี');
  const [timeOfDay, setTimeOfDay] = useState('morning'); 
  const [gpsAttempted, setGpsAttempted] = useState(false);
  
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024); // ปรับเบรกพอยต์เป็น 1024px สำหรับ Desktop Layout
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) { setGreeting('สวัสดีตอนเช้า ⛅'); setTimeOfDay('morning'); } 
    else if (hour >= 12 && hour < 18) { setGreeting('สวัสดีตอนบ่าย ☀️'); setTimeOfDay('afternoon'); } 
    else { setGreeting('สวัสดีตอนเย็น 🌙'); setTimeOfDay('evening'); }
  }, []);

  useEffect(() => {
    if (stations && stations.length > 0 && !selectedStationId && !gpsAttempted) {
      setGpsAttempted(true);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            let nearest = null; let minD = Infinity;
            stations.forEach(s => { 
              const d = getDistanceFromLatLonInKm(pos.coords.latitude, pos.coords.longitude, parseFloat(s.lat), parseFloat(s.long)); 
              if (d < minD) { minD = d; nearest = s; } 
            });
            if (nearest) { setSelectedStationId(nearest.stationID); localStorage.setItem('lastStationId', nearest.stationID); }
          }, 
          () => {
            const bkk = stations.find(s => s.areaTH && s.areaTH.includes('กรุงเทพ'));
            const fallbackId = bkk ? bkk.stationID : stations[0].stationID;
            setSelectedStationId(fallbackId); localStorage.setItem('lastStationId', fallbackId);
          }
        );
      } else {
        const bkk = stations.find(s => s.areaTH && s.areaTH.includes('กรุงเทพ'));
        const fallbackId = bkk ? bkk.stationID : stations[0].stationID;
        setSelectedStationId(fallbackId); localStorage.setItem('lastStationId', fallbackId);
      }
    }
  }, [stations, selectedStationId, gpsAttempted]);

  const handleStationChange = (e) => {
    const newId = e.target.value;
    setSelectedStationId(newId);
    localStorage.setItem('lastStationId', newId);
  };

  useEffect(() => {
    if (stations && stations.length > 0 && selectedStationId) {
      const target = stations.find(s => s.stationID === selectedStationId);
      if (target) { setActiveStation(target); } 
      else {
         const bkk = stations.find(s => s.areaTH && s.areaTH.includes('กรุงเทพ'));
         setSelectedStationId(bkk ? bkk.stationID : stations[0].stationID);
      }
    }
  }, [selectedStationId, stations]);

  const todayStr = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
  
  const allLocations = [...(stations || [])].map(s => ({
    id: s.stationID, name: formatLocationName(s.areaTH)
  })).sort((a, b) => a.name.localeCompare(b.name, 'th'));

  const bgGradient = darkMode ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' : 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)'; 
  const dynamicCardBg = darkMode ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)' : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.95) 100%)';
  const textColor = darkMode ? '#f8fafc' : '#1e293b';
  const subTextColor = darkMode ? '#94a3b8' : '#475569'; 
  const borderColor = darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'; 
  const backdropBlur = 'blur(20px)';

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', background: bgGradient, color: textColor }}>กำลังโหลดข้อมูล... ⏳</div>;

  const pmVal = activeStation && activeStation.AQILast && activeStation.AQILast.PM25 ? Number(activeStation.AQILast.PM25.value) : null;
  const tObj = activeStation ? stationTemps[activeStation.stationID] : null;
  const tempVal = tObj ? tObj.temp : null;
  const heatVal = tObj ? tObj.feelsLike : null;
  const rainVal = tObj ? tObj.rainProb : null;
  const windVal = tObj ? tObj.windSpeed : null;

  const pmBg = getPM25Color(pmVal);
  const pmTextColor = (pmBg === '#ffff00' || pmBg === '#00e400') ? '#222' : '#fff';
  const tempBg = getTempColor(tempVal).bg;
  const tempTextColor = getTempColor(tempVal).text;

  // วิเคราะห์คำแนะนำสุขภาพ
  let healthAdvice = { icon: '😊', text: 'คุณภาพอากาศดีเยี่ยม เหมาะกับการทำกิจกรรมกลางแจ้ง', color: '#22c55e', bg: darkMode ? 'rgba(34, 197, 94, 0.1)' : '#dcfce7' };
  if (pmVal > 75 || heatVal >= 41) healthAdvice = { icon: '🚨', text: 'อันตราย! ควรงดกิจกรรมกลางแจ้งและสวมหน้ากาก N95', color: '#ef4444', bg: darkMode ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2' };
  else if (pmVal > 37.5 || heatVal >= 35) healthAdvice = { icon: '😷', text: 'เริ่มมีผลกระทบต่อสุขภาพ ควรลดเวลาอยู่กลางแจ้งและสวมหน้ากาก', color: '#f59e0b', bg: darkMode ? 'rgba(245, 158, 11, 0.15)' : '#fef9c3' };

  const mainProvinceName = activeStation ? extractProvince(activeStation.areaTH) : '';
  const displayMainTitle = mainProvinceName === 'กรุงเทพมหานคร' ? mainProvinceName : `จ.${mainProvinceName}`;

  return (
    <div style={{ background: bgGradient, minHeight: '100%', padding: isMobile ? '12px' : '20px', paddingBottom: isMobile ? '90px' : '40px', display: 'flex', flexDirection: 'column', gap: isMobile ? '10px' : '20px', boxSizing: 'border-box', overflowY: 'auto' }} className="hide-scrollbar">
      
      {/* 🟢 HEADER */}
      <div style={{ display: 'flex', justifyContent: isMobile ? 'flex-end' : 'space-between', alignItems: 'center' }}>
        {!isMobile && (
          <div>
            <h1 style={{ fontSize: '2.2rem', color: textColor, margin: 0, fontWeight: 'bold' }}>{greeting}</h1>
            <p style={{ margin: '5px 0 0 0', color: subTextColor, fontSize: '1rem' }}>{todayStr}</p>
          </div>
        )}
        <div style={{ background: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', padding: '6px 12px', borderRadius: '10px', color: subTextColor, fontSize: isMobile ? '0.75rem' : '0.85rem', fontWeight: 'bold' }}>
          ⏱️ อัปเดต: {lastUpdateText || '-'}
        </div>
      </div>

      {/* 🌟 1. MAIN WEATHER CARD (กล่องหลัก) */}
      <div style={{ background: dynamicCardBg, backdropFilter: backdropBlur, borderRadius: '20px', padding: isMobile ? '15px' : '30px', border: `1px solid ${borderColor}`, boxShadow: '0 8px 30px rgba(0,0,0,0.05)' }}>
        
        <div style={{ display: 'flex', marginBottom: isMobile ? '15px' : '25px' }}>
          <select value={selectedStationId} onChange={handleStationChange} style={{ width: isMobile ? '100%' : '350px', padding: isMobile ? '10px' : '12px 15px', borderRadius: '12px', background: darkMode ? '#1e293b' : '#fff', color: textColor, border: `1px solid ${borderColor}`, fontWeight: 'bold', fontSize: '0.95rem', outline: 'none' }}>
            {allLocations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '15px' : '30px' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: isMobile ? '1.5rem' : '2.8rem', color: textColor, margin: 0, fontWeight: 'bold', lineHeight: 1.2 }}>{displayMainTitle}</h2>
            <p style={{ margin: '5px 0 15px 0', color: subTextColor, fontSize: isMobile ? '0.8rem' : '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📍 {activeStation ? formatLocationName(activeStation.areaTH) : ''}</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: isMobile ? '8px' : '15px', maxWidth: '400px' }}>
              <div style={{ background: darkMode ? 'rgba(0,0,0,0.2)' : '#f8fafc', padding: '12px 5px', borderRadius: '12px', textAlign: 'center', border: `1px solid ${borderColor}` }}>
                <div style={{ fontSize: '1.4rem', marginBottom: '5px' }}>💧</div>
                <div style={{ fontSize: '0.75rem', color: subTextColor }}>ฝน</div>
                <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{rainVal != null ? `${Math.round(rainVal)}%` : '-'}</div>
              </div>
              <div style={{ background: darkMode ? 'rgba(0,0,0,0.2)' : '#f8fafc', padding: '12px 5px', borderRadius: '12px', textAlign: 'center', border: `1px solid ${borderColor}` }}>
                <div style={{ fontSize: '1.4rem', marginBottom: '5px' }}>🌬️</div>
                <div style={{ fontSize: '0.75rem', color: subTextColor }}>ลม</div>
                <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{windVal != null ? `${Math.round(windVal)}` : '-'}</div>
              </div>
              <div style={{ background: darkMode ? 'rgba(0,0,0,0.2)' : '#f8fafc', padding: '12px 5px', borderRadius: '12px', textAlign: 'center', border: `1px solid ${borderColor}` }}>
                <div style={{ fontSize: '1.4rem', marginBottom: '5px' }}>🥵</div>
                <div style={{ fontSize: '0.75rem', color: subTextColor }}>รู้สึก</div>
                <div style={{ fontWeight: 'bold', fontSize: '1rem', color: heatVal >= 40 ? '#ef4444' : textColor }}>{heatVal != null ? `${Math.round(heatVal)}°` : '-'}</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px', flex: isMobile ? 'none' : 1, minWidth: isMobile ? 'auto' : '400px' }}>
            <div style={{ flex: 1, background: pmBg, color: pmTextColor, padding: '20px 10px', borderRadius: '20px', textAlign: 'center', boxShadow: `0 8px 25px ${pmBg}40`, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', opacity: 0.9 }}>PM 2.5</div>
              <div style={{ fontSize: isMobile ? '1.8rem' : '3rem', fontWeight: 'bold', lineHeight: 1.1, margin: '10px 0' }}>{pmVal || '-'}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>µg/m³</div>
            </div>
            <div style={{ flex: 1, background: tempBg, color: tempTextColor, padding: '20px 10px', borderRadius: '20px', textAlign: 'center', boxShadow: `0 8px 25px ${tempBg}40`, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', opacity: 0.9 }}>อุณหภูมิ</div>
              <div style={{ fontSize: isMobile ? '1.8rem' : '3rem', fontWeight: 'bold', lineHeight: 1.1, margin: '10px 0' }}>{tempVal ? Math.round(tempVal) : '-'}°</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>เซลเซียส</div>
            </div>
          </div>
        </div>
      </div>

      {/* 🌟 2. BOTTOM SECTION: แบ่ง Grid ซ้ายขวา สำหรับหน้าจอคอม */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: '20px', alignItems: 'start' }}>
        
        {/* 🌟 2.1 ฝั่งซ้าย: พื้นที่โปรด */}
        <div style={{ background: dynamicCardBg, backdropFilter: backdropBlur, borderRadius: '20px', padding: '20px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <h3 style={{ fontSize: '1.1rem', color: textColor, fontWeight: 'bold', margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⭐ พื้นที่โปรดของคุณ
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
            {favLocations.length > 0 ? favLocations.map((fav, i) => {
              const target = stations.find(s => extractProvince(s.areaTH) === fav.name);
              if (!target) return null;
              const fPm = target.AQILast && target.AQILast.PM25 ? Number(target.AQILast.PM25.value) : NaN;
              const fTemp = stationTemps[target.stationID] ? stationTemps[target.stationID].temp : null;

              return (
                <div key={i} onClick={() => setSelectedStationId(target.stationID)} style={{ background: darkMode ? 'rgba(255,255,255,0.05)' : '#fff', padding: '12px 15px', borderRadius: '15px', border: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'none'}>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: textColor }}>{fav.name}</div>
                    <div style={{ fontSize: '0.75rem', color: subTextColor, marginTop: '2px' }}>{fTemp != null ? `${Math.round(fTemp)}°C` : '-'}</div>
                  </div>
                  <span style={{ background: getPM25Color(fPm), color: (getPM25Color(fPm)==='#ffff00'||getPM25Color(fPm)==='#00e400')?'#222':'#fff', padding: '4px 10px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 'bold' }}>{isNaN(fPm) ? '-' : fPm}</span>
                </div>
              );
            }) : (
              <div style={{ padding: '20px', textAlign: 'center', color: subTextColor, border: `2px dashed ${borderColor}`, borderRadius: '15px', fontSize: '0.9rem' }}>
                กดเมนูแผนที่ 🗺️ แล้วกดถูกใจ ⭐ เพื่อเพิ่มพื้นที่โปรดไว้ดูด่วน
              </div>
            )}
          </div>
        </div>

        {/* 🌟 2.2 ฝั่งขวา: Widgets เสริม (คำแนะนำ + อันดับฝุ่น) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Widget 1: Health Advice */}
          <div style={{ background: healthAdvice.bg, borderRadius: '20px', padding: '20px', border: `1px solid ${healthAdvice.color}40`, display: 'flex', gap: '15px', alignItems: 'center' }}>
            <div style={{ fontSize: '2.5rem' }}>{healthAdvice.icon}</div>
            <div>
              <div style={{ color: healthAdvice.color, fontWeight: 'bold', fontSize: '1rem', marginBottom: '4px' }}>คำแนะนำสุขภาพ ณ เวลานี้</div>
              <div style={{ color: textColor, fontSize: '0.85rem', lineHeight: 1.4 }}>{healthAdvice.text}</div>
            </div>
          </div>

          {/* Widget 2: Top 5 PM2.5 */}
          <div style={{ background: dynamicCardBg, backdropFilter: backdropBlur, borderRadius: '20px', padding: '20px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: '1rem', color: textColor, fontWeight: 'bold', margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📊 5 อันดับฝุ่น PM2.5 สูงสุด
            </h3>
            {nationwideSummary && nationwideSummary.pm25 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {nationwideSummary.pm25.map((item, idx) => (
                  <div key={idx} onClick={() => {
                    const target = stations.find(s => extractProvince(s.areaTH) === item.prov);
                    if(target) setSelectedStationId(target.stationID);
                  }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: darkMode ? 'rgba(0,0,0,0.2)' : '#f8fafc', borderRadius: '10px', cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={e=>e.currentTarget.style.background=darkMode?'rgba(0,0,0,0.4)':'#e2e8f0'} onMouseOut={e=>e.currentTarget.style.background=darkMode?'rgba(0,0,0,0.2)':'#f8fafc'}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold', width: '15px' }}>{idx+1}.</span>
                      <span style={{ fontSize: '0.9rem', color: textColor, fontWeight: '500' }}>{item.prov}</span>
                    </div>
                    <span style={{ color: getPM25Color(item.val), fontWeight: 'bold', fontSize: '0.9rem' }}>{item.val}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: subTextColor, textAlign: 'center' }}>กำลังประมวลผลข้อมูล...</div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}