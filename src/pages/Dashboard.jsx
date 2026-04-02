// src/pages/Dashboard.jsx
import React, { useContext, useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import { WeatherContext } from '../context/WeatherContext';
import { extractProvince, formatLocationName, getPM25Color, getTempColor, getDistanceFromLatLonInKm } from '../utils/helpers';

export default function Dashboard() {
  const { stations, stationTemps, loading, darkMode, favLocations, lastUpdateText } = useContext(WeatherContext);
  
  const [selectedStationId, setSelectedStationId] = useState('');
  const [activeStation, setActiveStation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [greeting, setGreeting] = useState('สวัสดี');
  const [timeOfDay, setTimeOfDay] = useState('morning'); 
  
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) {
      setGreeting('สวัสดีตอนเช้า ⛅'); setTimeOfDay('morning');
    } else if (hour >= 12 && hour < 18) {
      setGreeting('สวัสดีตอนบ่าย ☀️'); setTimeOfDay('afternoon');
    } else {
      setGreeting('สวัสดีตอนเย็น 🌙'); setTimeOfDay('evening');
    }
  }, []);

  useEffect(() => {
    if (stations && stations.length > 0 && !selectedStationId) {
      const bkk = stations.find(s => s.areaTH && s.areaTH.includes('กรุงเทพ'));
      setSelectedStationId(bkk ? bkk.stationID : stations[0].stationID);
    }
  }, [stations, selectedStationId]);

  useEffect(() => {
    if (stations && selectedStationId) {
      const target = stations.find(s => s.stationID === selectedStationId);
      if (target) setActiveStation(target);
    }
  }, [selectedStationId, stations]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) return alert('อุปกรณ์ไม่รองรับ GPS');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        let nearest = null; let minD = Infinity;
        (stations || []).forEach(s => { 
          const d = getDistanceFromLatLonInKm(pos.coords.latitude, pos.coords.longitude, parseFloat(s.lat), parseFloat(s.long)); 
          if (d < minD) { minD = d; nearest = s; } 
        });
        if (nearest) setSelectedStationId(nearest.stationID);
        setLocating(false);
      }, 
      () => { alert('ไม่สามารถระบุพิกัดได้'); setLocating(false); }
    );
  };

  const todayStr = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
  
  const allLocations = [...(stations || [])].map(s => ({
    id: s.stationID,
    name: formatLocationName(s.areaTH)
  })).sort((a, b) => a.name.localeCompare(b.name, 'th'));

  const bgGradient = darkMode 
    ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' 
    : 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)'; 

  let dynamicCardBg = darkMode 
    ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)'
    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.95) 100%)';

  const textColor = darkMode ? '#f8fafc' : '#1e293b';
  const subTextColor = darkMode ? '#94a3b8' : '#475569'; 
  const borderColor = darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'; 
  const backdropBlur = 'blur(20px)';

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: bgGradient, color: textColor }}>กำลังโหลดข้อมูล... ⏳</div>;

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

  let alertBanner = null;
  if (heatVal >= 41) alertBanner = { text: 'เสี่ยงฮีทสโตรก: เลี่ยงแดดจัด', color: '#ef4444', bg: darkMode ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2' };
  else if (pmVal > 75) alertBanner = { text: 'ฝุ่นวิกฤต: สวม N95', color: '#ef4444', bg: darkMode ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2' };
  else if (pmVal > 37.5) alertBanner = { text: 'ฝุ่นเริ่มเยอะ: สวมหน้ากาก', color: '#f59e0b', bg: darkMode ? 'rgba(245, 158, 11, 0.15)' : '#fef9c3' };

  const mainProvinceName = activeStation ? extractProvince(activeStation.areaTH) : '';
  const displayMainTitle = mainProvinceName === 'กรุงเทพมหานคร' ? mainProvinceName : `จ.${mainProvinceName}`;

  return (
    <div style={{ background: bgGradient, minHeight: '100%', padding: isMobile ? '12px' : '20px', paddingBottom: isMobile ? '90px' : '40px', display: 'flex', flexDirection: 'column', gap: isMobile ? '10px' : '15px', boxSizing: 'border-box', overflowY: 'auto' }} className="hide-scrollbar">
      
      {/* 🟢 HEADER - ลบข้อความสวัสดีออกในมือถือ และดันเวลาอัปเดตไปขวาสุด */}
      <div style={{ display: 'flex', justifyContent: isMobile ? 'flex-end' : 'space-between', alignItems: 'center' }}>
        {!isMobile && (
          <div>
            <h1 style={{ fontSize: '2rem', color: textColor, margin: 0, fontWeight: 'bold' }}>{greeting}</h1>
            <p style={{ margin: 0, color: subTextColor, fontSize: '0.95rem' }}>{todayStr}</p>
          </div>
        )}
        <div style={{ background: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', padding: '4px 10px', borderRadius: '10px', color: subTextColor, fontSize: '0.75rem', fontWeight: 'bold' }}>
          ⏱️ {lastUpdateText ? lastUpdateText.split(' ')[1] : '-'}
        </div>
      </div>

      {/* 🌟 MAIN WEATHER CARD */}
      <div style={{ background: dynamicCardBg, backdropFilter: backdropBlur, borderRadius: '20px', padding: isMobile ? '15px' : '25px', border: `1px solid ${borderColor}`, boxShadow: '0 8px 30px rgba(0,0,0,0.05)' }}>
        
        {/* ตัวเลือกพื้นที่และปุ่ม GPS */}
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '10px', marginBottom: isMobile ? '15px' : '20px' }}>
          <select 
            value={selectedStationId} 
            onChange={(e) => setSelectedStationId(e.target.value)} 
            style={{ flex: 1, padding: isMobile ? '10px' : '12px', borderRadius: '12px', background: darkMode ? '#1e293b' : '#fff', color: textColor, border: `1px solid ${borderColor}`, fontWeight: 'bold', fontSize: '0.9rem', outline: 'none' }}
          >
            {allLocations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
          </select>
          <button onClick={handleLocateMe} style={{ background: '#0ea5e9', color: '#fff', border: 'none', padding: isMobile ? '10px' : '12px', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.9rem', cursor: locating ? 'wait' : 'pointer' }}>
            {locating ? '⏳...' : '📍 พิกัดปัจจุบัน'}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '15px' : '20px' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: isMobile ? '1.5rem' : '2.5rem', color: textColor, margin: 0, fontWeight: 'bold' }}>{displayMainTitle}</h2>
            <p style={{ margin: '2px 0 12px 0', color: subTextColor, fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📍 {activeStation ? formatLocationName(activeStation.areaTH) : ''}</p>
            
            {/* 📊 MINI STATS GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <div style={{ background: darkMode ? 'rgba(0,0,0,0.2)' : '#f8fafc', padding: '8px 5px', borderRadius: '12px', textAlign: 'center', border: `1px solid ${borderColor}` }}>
                <div style={{ fontSize: '1.2rem', marginBottom: '2px' }}>💧</div>
                <div style={{ fontSize: '0.65rem', color: subTextColor }}>ฝน</div>
                <div style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{rainVal != null ? `${Math.round(rainVal)}%` : '-'}</div>
              </div>
              <div style={{ background: darkMode ? 'rgba(0,0,0,0.2)' : '#f8fafc', padding: '8px 5px', borderRadius: '12px', textAlign: 'center', border: `1px solid ${borderColor}` }}>
                <div style={{ fontSize: '1.2rem', marginBottom: '2px' }}>🌬️</div>
                <div style={{ fontSize: '0.65rem', color: subTextColor }}>ลม</div>
                <div style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{windVal != null ? `${Math.round(windVal)}` : '-'}</div>
              </div>
              <div style={{ background: darkMode ? 'rgba(0,0,0,0.2)' : '#f8fafc', padding: '8px 5px', borderRadius: '12px', textAlign: 'center', border: `1px solid ${borderColor}` }}>
                <div style={{ fontSize: '1.2rem', marginBottom: '2px' }}>🥵</div>
                <div style={{ fontSize: '0.65rem', color: subTextColor }}>รู้สึก</div>
                <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: heatVal >= 40 ? '#ef4444' : textColor }}>{heatVal != null ? `${Math.round(heatVal)}°` : '-'}</div>
              </div>
            </div>
          </div>

          {/* 🌡️ PM2.5 & TEMP BOX */}
          <div style={{ display: 'flex', gap: '10px', flex: isMobile ? 'none' : 1 }}>
            <div style={{ flex: 1, background: pmBg, color: pmTextColor, padding: '12px', borderRadius: '15px', textAlign: 'center', boxShadow: `0 4px 15px ${pmBg}40`, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 'bold', opacity: 0.9 }}>PM 2.5</div>
              <div style={{ fontSize: isMobile ? '1.8rem' : '2rem', fontWeight: 'bold', lineHeight: 1.2 }}>{pmVal || '-'}</div>
            </div>
            <div style={{ flex: 1, background: tempBg, color: tempTextColor, padding: '12px', borderRadius: '15px', textAlign: 'center', boxShadow: `0 4px 15px ${tempBg}40`, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 'bold', opacity: 0.9 }}>อุณหภูมิ</div>
              <div style={{ fontSize: isMobile ? '1.8rem' : '2rem', fontWeight: 'bold', lineHeight: 1.2 }}>{tempVal ? Math.round(tempVal) : '-'}°</div>
            </div>
          </div>
        </div>

        {alertBanner && (
          <div style={{ marginTop: '12px', background: alertBanner.bg, color: alertBanner.color, padding: '8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 'bold', textAlign: 'center' }}>
            🚨 {alertBanner.text}
          </div>
        )}
      </div>

      {/* ⭐ FAVORITES */}
      <div>
        <h3 style={{ fontSize: '0.95rem', color: textColor, fontWeight: 'bold', marginBottom: '8px' }}>⭐ พื้นที่โปรด</h3>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
          {favLocations.length > 0 ? favLocations.map((fav, i) => {
            const target = stations.find(s => extractProvince(s.areaTH) === fav.name);
            if (!target) return null;
            const fPm = target.AQILast && target.AQILast.PM25 ? Number(target.AQILast.PM25.value) : NaN;
            return (
              <div key={i} onClick={() => setSelectedStationId(target.stationID)} style={{ background: darkMode ? 'rgba(255,255,255,0.05)' : '#fff', padding: '10px 15px', borderRadius: '12px', border: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '500', color: textColor }}>{fav.name}</span>
                <span style={{ background: getPM25Color(fPm), color: '#fff', padding: '2px 8px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold' }}>{isNaN(fPm) ? '-' : fPm}</span>
              </div>
            );
          }) : (
            <p style={{ fontSize: '0.8rem', color: subTextColor, textAlign: 'center' }}>ยังไม่มีพื้นที่โปรด</p>
          )}
        </div>
      </div>

    </div>
  );
}