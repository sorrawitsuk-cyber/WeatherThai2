// src/pages/Dashboard.jsx
import React, { useContext, useState, useEffect } from 'react';
import { WeatherContext } from '../context/WeatherContext';
import { extractProvince, formatLocationName, getPM25Color, getTempColor, getDistanceFromLatLonInKm } from '../utils/helpers';

// ฟังก์ชันช่วยคำนวณ US AQI และทิศทางลม
const calculateUSAQI = (pm) => {
  if (pm == null || isNaN(pm) || pm < 0) return '-';
  if (pm <= 12.0) return Math.round(((50 - 0) / (12.0 - 0)) * (pm - 0) + 0);
  if (pm <= 35.4) return Math.round(((100 - 51) / (35.4 - 12.1)) * (pm - 12.1) + 51);
  if (pm <= 55.4) return Math.round(((150 - 101) / (55.4 - 35.5)) * (pm - 35.5) + 101);
  if (pm <= 150.4) return Math.round(((200 - 151) / (150.4 - 55.5)) * (pm - 55.5) + 151);
  if (pm <= 250.4) return Math.round(((300 - 201) / (250.4 - 150.5)) * (pm - 150.5) + 201);
  if (pm <= 350.4) return Math.round(((400 - 301) / (350.4 - 250.5)) * (pm - 250.5) + 301);
  if (pm <= 500.4) return Math.round(((500 - 401) / (500.4 - 350.5)) * (pm - 350.5) + 401);
  return '>500';
};

const getWindDirectionText = (degree) => {
  if (degree == null) return '-';
  if (degree >= 337.5 || degree < 22.5) return 'เหนือ';
  if (degree >= 22.5 && degree < 67.5) return 'ตะวันออกเฉียงเหนือ';
  if (degree >= 67.5 && degree < 112.5) return 'ตะวันออก';
  if (degree >= 112.5 && degree < 157.5) return 'ตะวันออกเฉียงใต้';
  if (degree >= 157.5 && degree < 202.5) return 'ใต้';
  if (degree >= 202.5 && degree < 247.5) return 'ตะวันตกเฉียงใต้';
  if (degree >= 247.5 && degree < 292.5) return 'ตะวันตก';
  if (degree >= 292.5 && degree < 337.5) return 'ตะวันตกเฉียงเหนือ';
  return 'ลมสงบ';
};

export default function Dashboard() {
  const { stations, stationTemps, loading, darkMode, lastUpdateText, nationwideSummary } = useContext(WeatherContext);
  
  const [selectedStationId, setSelectedStationId] = useState(() => localStorage.getItem('lastStationId') || '');
  const [activeStation, setActiveStation] = useState(null);
  const [greeting, setGreeting] = useState('สวัสดี');
  const [timeOfDay, setTimeOfDay] = useState('morning'); 
  const [gpsAttempted, setGpsAttempted] = useState(false);
  
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
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
  const innerCardBg = darkMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.7)';
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

  // ข้อมูลเชิงลึก (Detailed Metrics)
  const humidityVal = tObj && tObj.humidity != null ? tObj.humidity : '-';
  const uvVal = tObj && tObj.uvMax != null ? Math.round(tObj.uvMax) : '-';
  const tempMinVal = tObj && tObj.tempMin != null ? Math.round(tObj.tempMin) : '-';
  const tempMaxVal = tObj && tObj.tempMax != null ? Math.round(tObj.tempMax) : '-';
  const windDirVal = tObj && tObj.windDir != null ? tObj.windDir : null;

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
              <div style={{ background: innerCardBg, padding: '12px 5px', borderRadius: '12px', textAlign: 'center', border: `1px solid ${borderColor}` }}>
                <div style={{ fontSize: '1.4rem', marginBottom: '5px' }}>💧</div>
                <div style={{ fontSize: '0.75rem', color: subTextColor }}>ฝน</div>
                <div style={{ fontWeight: 'bold', fontSize: '1rem', color: textColor }}>{rainVal != null ? `${Math.round(rainVal)}%` : '-'}</div>
              </div>
              <div style={{ background: innerCardBg, padding: '12px 5px', borderRadius: '12px', textAlign: 'center', border: `1px solid ${borderColor}` }}>
                <div style={{ fontSize: '1.4rem', marginBottom: '5px' }}>🌬️</div>
                <div style={{ fontSize: '0.75rem', color: subTextColor }}>ลม</div>
                <div style={{ fontWeight: 'bold', fontSize: '1rem', color: textColor }}>{windVal != null ? `${Math.round(windVal)}` : '-'}</div>
              </div>
              <div style={{ background: innerCardBg, padding: '12px 5px', borderRadius: '12px', textAlign: 'center', border: `1px solid ${borderColor}` }}>
                <div style={{ fontSize: '1.4rem', marginBottom: '5px' }}>🥵</div>
                <div style={{ fontSize: '0.75rem', color: subTextColor }}>รู้สึก</div>
                <div style={{ fontWeight: 'bold', fontSize: '1rem', color: heatVal >= 40 ? '#ef4444' : textColor }}>{heatVal != null ? `${Math.round(heatVal)}°` : '-'}</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px', flex: isMobile ? 'none' : 1, minWidth: isMobile ? 'auto' : '400px' }}>
            <div style={{ flex: 1, background: pmBg, color: pmTextColor, padding: '20px 10px', borderRadius: '20px', textAlign: 'center', boxShadow: `0 8px 25px ${pmBg}40`, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', opacity: 0.9 }}>PM 2.5</div>
              <div style={{ fontSize: isMobile ? '2rem' : '3rem', fontWeight: 'bold', lineHeight: 1.1, margin: '10px 0' }}>{pmVal || '-'}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>µg/m³</div>
            </div>
            <div style={{ flex: 1, background: tempBg, color: tempTextColor, padding: '20px 10px', borderRadius: '20px', textAlign: 'center', boxShadow: `0 8px 25px ${tempBg}40`, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', opacity: 0.9 }}>อุณหภูมิ</div>
              <div style={{ fontSize: isMobile ? '2rem' : '3rem', fontWeight: 'bold', lineHeight: 1.1, margin: '10px 0' }}>{tempVal ? Math.round(tempVal) : '-'}°</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>เซลเซียส</div>
            </div>
          </div>
        </div>
      </div>

      {/* 🌟 2. BOTTOM SECTION: แบ่ง Grid ซ้ายขวา สำหรับหน้าจอคอม */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: '20px', alignItems: 'start' }}>
        
        {/* 🌟 2.1 ฝั่งซ้าย: ข้อมูลเชิงลึก (แทนที่ Favorite) */}
        <div style={{ background: dynamicCardBg, backdropFilter: backdropBlur, borderRadius: '20px', padding: '20px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <h3 style={{ fontSize: '1.1rem', color: textColor, fontWeight: 'bold', margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔍 ข้อมูลเชิงลึก ณ จุดตรวจวัด
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            
            {/* Box 1: ความชื้น */}
            <div style={{ background: innerCardBg, padding: '15px', borderRadius: '15px', border: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ fontSize: '1.8rem' }}>🌫️</span>
              <div>
                <div style={{ fontSize: '0.75rem', color: subTextColor }}>ความชื้นสัมพัทธ์</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: textColor }}>{humidityVal}{humidityVal !== '-' ? '%' : ''}</div>
              </div>
            </div>

            {/* Box 2: รังสี UV */}
            <div style={{ background: innerCardBg, padding: '15px', borderRadius: '15px', border: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ fontSize: '1.8rem' }}>☀️</span>
              <div>
                <div style={{ fontSize: '0.75rem', color: subTextColor }}>รังสี UV สูงสุด</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: uvVal > 7 ? '#ef4444' : textColor }}>{uvVal}</div>
              </div>
            </div>

            {/* Box 3: อุณหภูมิต่ำสุด-สูงสุด */}
            <div style={{ background: innerCardBg, padding: '15px', borderRadius: '15px', border: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ fontSize: '1.8rem' }}>📉</span>
              <div>
                <div style={{ fontSize: '0.75rem', color: subTextColor }}>อุณหภูมิ (ต่ำ-สูง)</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: textColor }}>{tempMinVal}° - {tempMaxVal}°</div>
              </div>
            </div>

            {/* Box 4: ทิศทางลม */}
            <div style={{ background: innerCardBg, padding: '15px', borderRadius: '15px', border: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ fontSize: '1.8rem' }}>🧭</span>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.75rem', color: subTextColor }}>ทิศทางลม</div>
                <div style={{ fontSize: '1rem', fontWeight: 'bold', color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getWindDirectionText(windDirVal)}</div>
              </div>
            </div>

            {/* Box 5: US AQI */}
            <div style={{ background: innerCardBg, padding: '15px', borderRadius: '15px', border: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ fontSize: '1.8rem' }}>🇺🇸</span>
              <div>
                <div style={{ fontSize: '0.75rem', color: subTextColor }}>ดัชนี US AQI</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: textColor }}>{calculateUSAQI(pmVal)}</div>
              </div>
            </div>

            {/* Box 6: มาตรฐานไทย */}
            <div style={{ background: innerCardBg, padding: '15px', borderRadius: '15px', border: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ fontSize: '1.8rem' }}>🇹🇭</span>
              <div>
                <div style={{ fontSize: '0.75rem', color: subTextColor }}>มาตรฐานไทย</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: getPM25Color(pmVal) }}>{pmVal || '-'}</div>
              </div>
            </div>

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
                    if(target) {
                      setSelectedStationId(target.stationID);
                      localStorage.setItem('lastStationId', target.stationID);
                    }
                  }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: innerCardBg, borderRadius: '10px', cursor: 'pointer', transition: 'background 0.2s', border: `1px solid ${borderColor}` }} onMouseOver={e=>e.currentTarget.style.background=darkMode?'rgba(0,0,0,0.4)':'rgba(226, 232, 240, 0.5)'} onMouseOut={e=>e.currentTarget.style.background=innerCardBg}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold', width: '15px' }}>{idx+1}.</span>
                      <span style={{ fontSize: '0.9rem', color: textColor, fontWeight: '500' }}>{item.prov}</span>
                    </div>
                    <span style={{ color: getPM25Color(item.val), fontWeight: 'bold', fontSize: '0.9rem' }}>{item.val}</span>
                  </div>
                ))}
              </div>
            ) : (
               <div style={{ fontSize: '0.85rem', color: subTextColor, textAlign: 'center', padding: '20px' }}>กำลังประมวลผลข้อมูล...</div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}