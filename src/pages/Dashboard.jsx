// src/pages/Dashboard.jsx
import React, { useContext, useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom'; 
import { WeatherContext } from '../context/WeatherContext';
import { extractProvince, getPM25Color, getDistanceFromLatLonInKm } from '../utils/helpers';

// 🌟 ฟังก์ชันแยก "อำเภอ/เขต" จากชื่อสถานี
const extractDistrict = (areaTH) => {
  if (!areaTH) return 'ทั่วไป';
  const match = areaTH.match(/(เขต|อ\.|อำเภอ)\s*([a-zA-Zก-ฮะ-์]+)/);
  if (match) return match[2];
  const parts = areaTH.split(' ');
  return parts[0]; 
};

// 🌟 สถานะสุขภาพ 
const getHealthStatus = (pm) => {
  if (pm == null || isNaN(pm)) return { level: 0, text: 'ไม่มีข้อมูล', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)', warning: '' };
  if (pm <= 15.0) return { level: 1, text: 'คุณภาพอากาศดีมาก', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', warning: '' }; 
  if (pm <= 25.0) return { level: 2, text: 'คุณภาพอากาศดี', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)', warning: '' }; 
  if (pm <= 37.5) return { level: 3, text: 'คุณภาพปานกลาง', color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)', warning: '' }; 
  if (pm <= 75.0) return { level: 4, text: 'เริ่มมีผลกระทบ', color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)', warning: '⚠️ ควรสวมหน้ากากอนามัย' }; 
  return { level: 5, text: 'มีผลกระทบสุขภาพ', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', warning: '⚠️ อันตราย! งดกิจกรรมกลางแจ้ง' }; 
};

// 🌟 สถานะความร้อน
const getHeatStatus = (val) => {
  if (val == null || isNaN(val)) return { level: 0, text: 'ไม่มีข้อมูล', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)', warning: '' };
  if (val >= 52) return { level: 5, text: 'อันตรายมาก (ฮีทสโตรก)', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', warning: '⚠️ อันตรายถึงชีวิต' };
  if (val >= 41) return { level: 4, text: 'อันตราย (เลี่ยงแดด)', color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)', warning: '⚠️ ระวังเพลียแดดรุนแรง' };
  if (val >= 32) return { level: 3, text: 'เฝ้าระวัง (เตือนภัย)', color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)', warning: '⚠️ ดื่มน้ำให้เพียงพอ' };
  return { level: 1, text: 'ปกติ (ปลอดภัย)', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)', warning: '' };
};

const getStatColor = (type, val) => {
  if (type === 'pm25') return getPM25Color(val);
  if (type === 'heat') return getHeatStatus(val).color;
  if (type === 'temp') return val >= 35 ? '#ef4444' : val >= 30 ? '#f97316' : '#22c55e';
  if (type === 'rain') return '#3b82f6';
  if (type === 'uv') return val >= 11 ? '#a855f7' : val >= 8 ? '#ef4444' : val >= 6 ? '#f97316' : val >= 3 ? '#eab308' : '#22c55e';
  if (type === 'wind') return val >= 30 ? '#ef4444' : val >= 15 ? '#eab308' : '#0ea5e9';
  return '#94a3b8';
};

const getWindArrow = (dir) => {
  if (dir == null || dir === '-') return null;
  let deg = 0;
  if (typeof dir === 'number') deg = dir;
  else {
    const d = dir.toString().toUpperCase();
    if (d==='N') deg=0; else if (d==='NE') deg=45; else if (d==='E') deg=90; else if (d==='SE') deg=135; else if (d==='S') deg=180; else if (d==='SW') deg=225; else if (d==='W') deg=270; else if (d==='NW') deg=315;
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: `rotate(${deg}deg)`, marginLeft: '2px', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))' }}>
      <line x1="12" y1="19" x2="12" y2="5"></line>
      <polyline points="5 12 12 5 19 12"></polyline>
    </svg>
  );
};

const SVGFace = ({ level }) => {
  let eyes = <g><circle cx="35" cy="40" r="7" fill="#fff"/><circle cx="65" cy="40" r="7" fill="#fff"/></g>;
  let mouth = "M 35 65 Q 50 80 65 65"; 
  if (level === 0) { eyes = <g><line x1="30" y1="40" x2="40" y2="40" stroke="#fff" strokeWidth="5" strokeLinecap="round"/><line x1="60" y1="40" x2="70" y2="40" stroke="#fff" strokeWidth="5" strokeLinecap="round"/></g>; mouth = "M 35 65 L 65 65"; } 
  else if (level === 1) { mouth = "M 30 60 Q 50 85 70 60"; } 
  else if (level === 2) { mouth = "M 35 65 Q 50 75 65 65"; } 
  else if (level === 3) { mouth = "M 35 65 L 65 65"; } 
  else if (level === 4) { mouth = "M 35 70 Q 50 55 65 70"; } 
  else if (level === 5) { eyes = <g><line x1="28" y1="33" x2="42" y2="47" stroke="#fff" strokeWidth="5" strokeLinecap="round"/><line x1="28" y1="47" x2="42" y2="33" stroke="#fff" strokeWidth="5" strokeLinecap="round"/><line x1="58" y1="33" x2="72" y2="47" stroke="#fff" strokeWidth="5" strokeLinecap="round"/><line x1="58" y1="47" x2="72" y2="33" stroke="#fff" strokeWidth="5" strokeLinecap="round"/></g>; mouth = "M 35 75 Q 50 55 65 75"; }
  return <svg viewBox="0 0 100 100" width="100%" height="100%">{eyes}<path d={mouth} fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" /></svg>;
};

function MiniMapUpdate({ lat, lon }) {
  const map = useMap();
  useEffect(() => { if (lat && lon && !isNaN(lat) && !isNaN(lon)) map.flyTo([lat, lon], 10); }, [lat, lon, map]);
  return null;
}

export default function Dashboard() {
  const navigate = useNavigate(); 
  const { stations, stationTemps, loading, darkMode, lastUpdateText } = useContext(WeatherContext);
  
  const [selectedProv, setSelectedProv] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [activeStation, setActiveStation] = useState(null);
  const [isLocating, setIsLocating] = useState(false); 
  
  const [greeting, setGreeting] = useState('สวัสดี');
  const [timeOfDay, setTimeOfDay] = useState('morning'); 
  
  const [statFilter, setStatFilter] = useState('pm25');
  const [historicalData, setHistoricalData] = useState([]);
  const [forecastGraphData, setForecastGraphData] = useState([]);
  const [masterTableData, setMasterTableData] = useState([]);
  
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);

  const safeStations = stations || [];
  const allProvinces = [...new Set(safeStations.map(s => extractProvince(s.areaTH)))].sort((a, b) => a.localeCompare(b, 'th'));
  const availableDistricts = [...new Set(safeStations.filter(s => extractProvince(s.areaTH) === selectedProv).map(s => extractDistrict(s.areaTH)))].sort();

  useEffect(() => {
    const handleResize = () => { setIsMobile(window.innerWidth < 768); setIsDesktop(window.innerWidth >= 1024); };
    window.addEventListener('resize', handleResize); return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) { setGreeting('สวัสดีตอนเช้า ⛅'); setTimeOfDay('morning'); }
    else if (hour >= 12 && hour < 18) { setGreeting('สวัสดีตอนบ่าย ☀️'); setTimeOfDay('afternoon'); }
    else { setGreeting('สวัสดีตอนเย็น 🌙'); setTimeOfDay('evening'); }
  }, []);

  // 🌟 Auto-select จังหวัดและอำเภอเมื่อโหลดแอป (แก้บั๊ก กทม.)
  useEffect(() => {
    if (safeStations.length > 0 && !selectedProv) {
      const bkkStations = safeStations.filter(s => extractProvince(s.areaTH) === 'กรุงเทพมหานคร');
      // เลือกสถานีที่มีข้อมูล PM2.5 แน่ๆ ป้องกันหน้าจอว่าง
      const validBkk = bkkStations.find(s => s.AQILast?.PM25?.value != null) || bkkStations[0] || safeStations[0];
      
      const prov = extractProvince(validBkk.areaTH);
      const dist = extractDistrict(validBkk.areaTH);
      setSelectedProv(prov);
      setSelectedDistrict(dist);
    }
  }, [safeStations, selectedProv]);

  // 🌟 เมื่อเลือก อำเภอ ให้ไปดึงสถานีที่อยู่ในอำเภอนั้นมาแสดงเงียบๆ
  useEffect(() => {
    if (safeStations.length > 0 && selectedProv && selectedDistrict) {
      const distStations = safeStations.filter(s => extractProvince(s.areaTH) === selectedProv && extractDistrict(s.areaTH) === selectedDistrict);
      // เลือกจุดที่มีข้อมูลสมบูรณ์ที่สุด
      const bestStation = distStations.find(s => s.AQILast?.PM25?.value != null) || distStations[0];
      if (bestStation) setActiveStation(bestStation);
    }
  }, [selectedProv, selectedDistrict, safeStations]);

  const handleGPS = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          let nearest = null; let minD = Infinity;
          safeStations.forEach(s => { 
            const lat = parseFloat(s.lat); const lon = parseFloat(s.long);
            if(!isNaN(lat) && !isNaN(lon)){
              const d = getDistanceFromLatLonInKm(pos.coords.latitude, pos.coords.longitude, lat, lon); 
              if (d < minD) { minD = d; nearest = s; } 
            }
          });
          if (nearest) { 
            setSelectedProv(extractProvince(nearest.areaTH));
            setSelectedDistrict(extractDistrict(nearest.areaTH));
          }
          setIsLocating(false);
        }, 
        () => { alert("⚠️ กรุณาอนุญาตการเข้าถึงพิกัด (Location)"); setIsLocating(false); },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setIsLocating(false);
    }
  };

  useEffect(() => {
    if (safeStations.length > 0) {
      const baseValue = statFilter === 'pm25' ? 30 : statFilter === 'heat' ? 40 : statFilter === 'temp' ? 32 : statFilter === 'rain' ? 20 : statFilter === 'uv' ? 6 : 15;
      
      const historyMock = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        const days = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
        const randomVal = baseValue + (Math.random() * (baseValue * 0.5) - (baseValue * 0.25));
        return { day: i === 6 ? 'วันนี้' : days[d.getDay()], val: Math.max(0, Math.round(randomVal)), avg10Year: Math.max(0, Math.round(baseValue + (statFilter==='pm25'?2:0))), dir: statFilter === 'wind' ? Math.floor(Math.random() * 360) : null };
      });
      setHistoricalData(historyMock);

      const forecastMock = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() + i + 1);
        const days = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
        const randomVal = baseValue + (Math.random() * (baseValue * 0.6) - (baseValue * 0.3)); 
        return { day: i === 0 ? 'พรุ่งนี้' : days[d.getDay()], val: Math.max(0, Math.round(randomVal)), avg10Year: Math.max(0, Math.round(baseValue + (statFilter==='pm25'?2:0))), dir: statFilter === 'wind' ? Math.floor(Math.random() * 360) : null };
      });
      setForecastGraphData(forecastMock);

      const tableArr = allProvinces.map(prov => {
        const provStations = safeStations.filter(s => extractProvince(s.areaTH) === prov);
        let sumPm = 0, sumTemp = 0, sumHeat = 0, sumRain = 0, sumUv = 0, sumWind = 0; let validPm = 0, validTemp = 0;
        provStations.forEach(s => {
          const pm = s.AQILast?.PM25?.value ? Number(s.AQILast.PM25.value) : NaN;
          if (!isNaN(pm)) { sumPm += pm; validPm++; }
          const tObj = stationTemps[s.stationID];
          if (tObj) {
            if (tObj.temp != null) { sumTemp += tObj.temp; validTemp++; }
            if (tObj.feelsLike != null) sumHeat += tObj.feelsLike;
            if (tObj.rainProb != null) sumRain += tObj.rainProb;
            if (tObj.uv != null) sumUv += tObj.uv; else sumUv += Math.floor(Math.random()*12); 
            if (tObj.windSpeed != null) sumWind += tObj.windSpeed;
          }
        });
        const avgPm = validPm > 0 ? Math.round(sumPm / validPm) : 0;
        const trendMock = Array.from({ length: 7 }, () => ({ val: Math.max(0, avgPm + (Math.random() * 20 - 10)) }));
        return { prov, pm25: avgPm, temp: validTemp > 0 ? Math.round(sumTemp / validTemp) : 0, heat: validTemp > 0 ? Math.round(sumHeat / validTemp) : 0, rain: validTemp > 0 ? Math.round(sumRain / validTemp) : 0, uv: validTemp > 0 ? Math.round(sumUv / validTemp) : 0, wind: validTemp > 0 ? Math.round(sumWind / validTemp) : 0, trend: trendMock };
      });
      setMasterTableData(tableArr.sort((a, b) => b.pm25 - a.pm25));
    }
  }, [safeStations, stationTemps, statFilter]);

  const todayStr = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
  const themeBg = darkMode ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' : (timeOfDay === 'morning' ? 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)' : (timeOfDay === 'afternoon' ? 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)' : 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)')); 
  const cardBg = darkMode ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.85)';
  const innerCardBg = darkMode ? 'rgba(0,0,0,0.2)' : 'rgba(241,245,249,0.7)';
  const textColor = darkMode ? '#f8fafc' : '#0f172a';
  const subTextColor = darkMode ? '#94a3b8' : '#64748b'; 
  const borderColor = darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)'; 
  
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', background: themeBg, color: textColor, fontWeight: 'bold' }}>กำลังโหลดข้อมูล... ⏳</div>;

  const pmRaw = activeStation?.AQILast?.PM25?.value;
  const pmVal = (pmRaw !== undefined && pmRaw !== null) ? Number(pmRaw) : null;
  const tObj = activeStation ? stationTemps[activeStation.stationID] : null;
  
  const tempVal = tObj?.temp != null ? tObj.temp : null;
  const humidityVal = tObj?.humidity != null ? tObj.humidity : '-';
  const windVal = tObj?.windSpeed != null ? tObj.windSpeed : null;
  const heatVal = tObj?.feelsLike != null ? tObj.feelsLike : null;
  const rainVal = tObj?.rainProb != null ? tObj.rainProb : null;
  const uvVal = tObj?.uv != null ? tObj.uv : '-'; 
  const windDirVal = tObj?.windDir || '-'; 

  const health = getHealthStatus(pmVal);
  const heatStatus = getHeatStatus(heatVal);
  const pmColor = getStatColor('pm25', pmVal);

  const renderFaceBadge = (level, color) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: isMobile ? '70px' : '90px', height: isMobile ? '70px' : '90px', background: `radial-gradient(circle at 30% 30%, ${color} 0%, ${color}dd 100%)`, borderRadius: '50%', boxShadow: `0 8px 20px ${color}60, inset 0 2px 5px rgba(255,255,255,0.4)`, border: `3px solid ${darkMode ? 'rgba(255,255,255,0.1)' : '#fff'}` }}>
      <div style={{ width: '65%', height: '65%', filter: 'drop-shadow(0 4px 4px rgba(0,0,0,0.2))' }}><SVGFace level={level} /></div>
    </div>
  );

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const unit = statFilter === 'wind' ? 'km/h' : statFilter === 'rain' ? '%' : statFilter === 'temp' || statFilter === 'heat' ? '°C' : statFilter === 'uv' ? '' : 'µg/m³';
      return (
        <div style={{ background: cardBg, border: `1px solid ${borderColor}`, padding: '10px 15px', borderRadius: '12px', color: textColor, boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', color: subTextColor, fontSize: '0.85rem' }}>{label}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '900', fontSize: '1.2rem', color: getStatColor(statFilter, data.val) }}>
            {data.val} <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>{unit}</span>
            {statFilter === 'wind' && getWindArrow(data.dir)}
          </div>
        </div>
      );
    } return null;
  };

  return (
    <div style={{ height: '100%', width: '100%', maxWidth: '100vw', padding: !isDesktop ? '15px' : '30px', paddingBottom: !isDesktop ? '100px' : '40px', display: 'flex', flexDirection: 'column', gap: !isDesktop ? '15px' : '25px', boxSizing: 'border-box', overflowY: 'auto', overflowX: 'hidden', background: themeBg, fontFamily: 'Kanit, sans-serif' }} className="hide-scrollbar">
      
      <div style={{ display: !isDesktop ? 'none' : 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div><h1 style={{ fontSize: '2rem', color: textColor, margin: 0, fontWeight: '800' }}>{greeting}</h1><p style={{ margin: '2px 0 0 0', color: subTextColor, fontSize: '0.95rem' }}>{todayStr}</p></div>
        <div style={{ background: innerCardBg, backdropFilter: 'blur(10px)', padding: '6px 12px', borderRadius: '12px', color: subTextColor, fontSize: '0.75rem', fontWeight: 'bold', border: `1px solid ${borderColor}` }}>⏱️ อัปเดต: {lastUpdateText || '-'}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1.4fr 1fr' : '1fr', gap: '20px', width: '100%', flexShrink: 0 }}>
        
        <div style={{ background: cardBg, backdropFilter: 'blur(20px)', borderRadius: isMobile ? '20px' : '24px', padding: !isDesktop ? '15px' : '30px', border: `1px solid ${borderColor}`, boxShadow: '0 10px 40px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', width: '100%', boxSizing: 'border-box' }}>
          
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '8px', width: '100%', marginBottom: isMobile ? '15px' : '25px' }}>
            <div style={{ display: 'flex', gap: '8px', flex: isDesktop ? 0.4 : 1 }}>
              <button onClick={handleGPS} disabled={isLocating} style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '14px', padding: '0 15px', cursor: isLocating ? 'wait' : 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isLocating ? 0.7 : 1 }}>
                {isLocating ? <svg width="22" height="22" stroke="currentColor" viewBox="0 0 24 24"><style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style><g style={{ animation: 'spin 1.5s linear infinite', transformOrigin: 'center' }}><circle cx="12" cy="12" r="10" fill="none" strokeWidth="2.5" strokeDasharray="30 30" strokeLinecap="round"></circle></g></svg> : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="7"></circle><line x1="12" y1="1" x2="12" y2="5"></line><line x1="12" y1="19" x2="12" y2="23"></line><line x1="1" y1="12" x2="5" y2="12"></line><line x1="19" y1="12" x2="23" y2="12"></line></svg>}
              </button>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: innerCardBg, padding: '10px 15px', borderRadius: '14px', border: `1px solid ${borderColor}` }}>
                <span style={{ marginRight: '8px', fontSize: '1.1rem' }}>📍</span>
                <select value={selectedProv} onChange={e => { setSelectedProv(e.target.value); setSelectedDistrict(''); }} style={{ flex: 1, background: 'transparent', color: textColor, border: 'none', fontWeight: 'bold', fontSize: '0.95rem', outline: 'none', cursor: 'pointer', appearance: 'none' }}>
                  {allProvinces.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <span style={{ color: subTextColor, fontSize: '0.8rem' }}>▼</span>
              </div>
            </div>
            <div style={{ flex: isDesktop ? 0.6 : 1, display: 'flex', alignItems: 'center', background: innerCardBg, padding: '10px 15px', borderRadius: '14px', border: `1px solid ${borderColor}` }}>
              <span style={{ marginRight: '8px', fontSize: '1.1rem' }}>🏙️</span>
              <select value={selectedDistrict} onChange={e => setSelectedDistrict(e.target.value)} style={{ flex: 1, background: 'transparent', color: textColor, border: 'none', fontWeight: 'bold', fontSize: '0.95rem', outline: 'none', cursor: 'pointer', appearance: 'none', textOverflow: 'ellipsis' }}>
                <option value="">เลือกอำเภอ/เขต</option>
                {availableDistricts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <span style={{ color: subTextColor, fontSize: '0.8rem' }}>▼</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '15px', width: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', background: innerCardBg, padding: isMobile ? '15px' : '20px', borderRadius: '20px', border: `1px solid ${borderColor}`, gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '15px' }}>
                {renderFaceBadge(health.level, health.color)}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flex: 1, minWidth: 0 }}>
                   <span style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold' }}>PM2.5 (µg/m³)</span>
                   <span style={{ fontSize: isMobile ? '2.8rem' : '3.5rem', fontWeight: '900', color: health.color, lineHeight: 1 }}>{pmVal != null ? pmVal : '-'}</span>
                   <span style={{ background: health.bg, color: health.color, padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', marginTop: '4px', textAlign: 'center', wordBreak: 'break-word', maxWidth: '100%' }}>{health.text}</span>
                </div>
              </div>
              {health.warning && <div style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.75rem', color: '#ef4444', fontWeight: 'bold', background: 'rgba(239, 68, 68, 0.15)', padding: '8px 10px', borderRadius: '12px', textAlign: 'center', wordBreak: 'break-word' }}>{health.warning}</div>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', background: innerCardBg, padding: isMobile ? '15px' : '20px', borderRadius: '20px', border: `1px solid ${borderColor}`, gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '15px' }}>
                {renderFaceBadge(heatStatus.level, heatStatus.color)}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flex: 1, minWidth: 0 }}>
                   <span style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold' }}>ดัชนีความร้อน (°C)</span>
                   <span style={{ fontSize: isMobile ? '2.8rem' : '3.5rem', fontWeight: '900', color: heatStatus.color, lineHeight: 1 }}>{heatVal != null ? Math.round(heatVal) : '-'}</span>
                   <span style={{ background: heatStatus.bg, color: heatStatus.color, padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', marginTop: '4px', textAlign: 'center', wordBreak: 'break-word', maxWidth: '100%' }}>{heatStatus.text}</span>
                </div>
              </div>
              {heatStatus.warning && <div style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.75rem', color: '#ef4444', fontWeight: 'bold', background: 'rgba(239, 68, 68, 0.15)', padding: '8px 10px', borderRadius: '12px', textAlign: 'center', wordBreak: 'break-word' }}>{heatStatus.warning}</div>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(6, 1fr)', gap: '10px', marginTop: isMobile ? '15px' : '20px', paddingTop: '15px', borderTop: `1px dashed ${borderColor}` }}>
            {[
              { icon: '🌡️', label: 'อุณหภูมิ', val: tempVal != null ? <span style={{fontWeight:'900'}}>{Math.round(tempVal)}<span style={{fontSize:'0.7rem'}}>°C</span></span> : '-' },
              { icon: '💧', label: 'ความชื้น', val: humidityVal !== '-' ? <span style={{fontWeight:'900'}}>{humidityVal}<span style={{fontSize:'0.7rem'}}>%</span></span> : '-' },
              { icon: '🌬️', label: 'ความเร็วลม', val: windVal != null ? <span style={{fontWeight:'900'}}>{Math.round(windVal)}<span style={{fontSize:'0.6rem'}}> km/h</span></span> : '-' },
              { icon: '🧭', label: 'ทิศทางลม', val: windDirVal !== '-' ? <div style={{display:'flex', alignItems:'center', gap:'2px'}}><span style={{fontWeight:'900'}}>{windDirVal}</span>{getWindArrow(windDirVal)}</div> : '-' },
              { icon: '☔', label: 'โอกาสฝน', val: rainVal != null ? <span style={{fontWeight:'900'}}>{Math.round(rainVal)}<span style={{fontSize:'0.7rem'}}>%</span></span> : '-' },
              { icon: '☀️', label: 'UV Index', val: uvVal !== '-' ? <span style={{fontWeight:'900'}}>{uvVal}</span> : '-' },
            ].map((item, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: innerCardBg, padding: '10px 5px', borderRadius: '14px', border: `1px solid ${borderColor}` }}>
                <span style={{ fontSize: '1.2rem', marginBottom: '2px', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.1))' }}>{item.icon}</span>
                <span style={{ fontSize: '0.65rem', color: subTextColor, fontWeight: 'bold' }}>{item.label}</span>
                <span style={{ fontSize: '0.9rem', color: textColor, marginTop: '2px' }}>{item.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 📍 แผนที่ย่อ (แสดงเฉพาะคอม) */}
        {isDesktop && (
          <div style={{ background: cardBg, backdropFilter: 'blur(20px)', borderRadius: '24px', padding: '15px', border: `1px solid ${borderColor}`, boxShadow: '0 10px 40px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '0.9rem', color: subTextColor, fontWeight: 'bold', margin: '0 0 10px 5px' }}>🗺️ ตำแหน่งพื้นที่</h3>
            <div style={{ flex: 1, borderRadius: '15px', overflow: 'hidden', background: innerCardBg, position: 'relative' }}>
              {activeStation && !isNaN(parseFloat(activeStation.lat)) ? (
                <MapContainer center={[parseFloat(activeStation.lat), parseFloat(activeStation.long)]} zoom={10} style={{ height: '100%', width: '100%', zIndex: 1 }} zoomControl={false} dragging={true} scrollWheelZoom={false}>
                  <TileLayer url={darkMode ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"} />
                  <MiniMapUpdate lat={parseFloat(activeStation.lat)} lon={parseFloat(activeStation.long)} />
                  <CircleMarker center={[parseFloat(activeStation.lat), parseFloat(activeStation.long)]} radius={25} pathOptions={{ color: pmColor, fillColor: pmColor, fillOpacity: 0.3, weight: 0 }} />
                  <CircleMarker center={[parseFloat(activeStation.lat), parseFloat(activeStation.long)]} radius={6} pathOptions={{ color: '#fff', fillColor: pmColor, fillOpacity: 1, weight: 2 }} />
                </MapContainer>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: subTextColor }}>ไม่มีข้อมูลแผนที่</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 🌟🌟 ส่วนสถิติเชิงลึก 🌟🌟 */}
      <div style={{ background: cardBg, backdropFilter: 'blur(20px)', borderRadius: isMobile ? '20px' : '24px', padding: isMobile ? '15px' : '25px', border: `1px solid ${borderColor}`, boxShadow: '0 10px 40px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: isMobile ? '15px' : '25px', flexShrink: 0 }}>
        
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', borderBottom: `1px solid ${borderColor}`, paddingBottom: '15px', gap: '15px' }}>
          <h3 style={{ fontSize: '1.2rem', color: textColor, fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            📊 วิเคราะห์สถิติข้อมูล
          </h3>
          <div style={{ display: 'flex', gap: '8px', background: innerCardBg, padding: '4px', borderRadius: '12px', width: isMobile ? '100%' : 'auto', overflowX: 'auto', whiteSpace: 'nowrap' }} className="hide-scrollbar">
            {[{ id: 'pm25', label: 'ฝุ่น PM2.5' }, { id: 'heat', label: 'ดัชนีร้อน' }, { id: 'temp', label: 'อุณหภูมิ' }, { id: 'rain', label: 'ฝน' }, { id: 'uv', label: 'UV' }, { id: 'wind', label: 'ลม' }].map(f => (
              <button 
                key={f.id} onClick={() => setStatFilter(f.id)}
                style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', flexShrink: 0, background: statFilter === f.id ? '#0ea5e9' : 'transparent', color: statFilter === f.id ? '#fff' : subTextColor, boxShadow: statFilter === f.id ? '0 2px 5px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
          <div style={{ height: '300px', width: '100%', background: innerCardBg, borderRadius: '16px', padding: '20px 20px 20px 0', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '0.85rem', color: subTextColor, fontWeight: 'bold', marginBottom: '15px', paddingLeft: '20px', display: 'flex', justifyContent: 'space-between' }}>
              <span>⏪ สถิติย้อนหลัง 7 วัน</span><span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: '15px', height: '3px', background: darkMode ? '#cbd5e1' : '#64748b', borderStyle: 'dashed' }}></div> ค่าเฉลี่ย 10 ปี</span>
            </div>
            <div style={{ flex: 1, minHeight: 0, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historicalData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                  <defs><linearGradient id="colorPast" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4}/><stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/></linearGradient></defs>
                  <XAxis dataKey="day" stroke={subTextColor} fontSize={11} tickLine={false} axisLine={false} dy={10} /><YAxis stroke={subTextColor} fontSize={11} tickLine={false} axisLine={false} /><Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="val" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorPast)" />
                  <Line type="monotone" dataKey="avg10Year" stroke={darkMode ? '#cbd5e1' : '#64748b'} strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={{ height: '300px', width: '100%', background: innerCardBg, borderRadius: '16px', padding: '20px 20px 20px 0', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '0.85rem', color: subTextColor, fontWeight: 'bold', marginBottom: '15px', paddingLeft: '20px', display: 'flex', justifyContent: 'space-between' }}>
              <span>🔮 พยากรณ์ล่วงหน้า 7 วัน</span>
            </div>
            <div style={{ flex: 1, minHeight: 0, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastGraphData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                  <defs><linearGradient id="colorFuture" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient></defs>
                  <XAxis dataKey="day" stroke={subTextColor} fontSize={11} tickLine={false} axisLine={false} dy={10} /><YAxis stroke={subTextColor} fontSize={11} tickLine={false} axisLine={false} /><Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="val" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorFuture)" />
                  <Line type="monotone" dataKey="avg10Year" stroke={darkMode ? '#cbd5e1' : '#64748b'} strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '10px' }}>
          <h3 style={{ fontSize: '1rem', color: textColor, fontWeight: 'bold', margin: '0 0 15px 0' }}>📋 ตารางข้อมูลระดับจังหวัด (77 จังหวัด)</h3>
          <div style={{ overflowX: 'auto', background: innerCardBg, borderRadius: '16px', border: `1px solid ${borderColor}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem', color: textColor, minWidth: '800px' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${borderColor}`, color: subTextColor }}>
                  <th style={{ padding: '15px 20px', fontWeight: 'bold' }}>จังหวัด</th>
                  <th style={{ padding: '15px', fontWeight: 'bold', textAlign: 'center' }}>PM2.5</th>
                  <th style={{ padding: '15px', fontWeight: 'bold', textAlign: 'center' }}>ความร้อน</th>
                  <th style={{ padding: '15px', fontWeight: 'bold', textAlign: 'center' }}>อุณหภูมิ</th>
                  <th style={{ padding: '15px', fontWeight: 'bold', textAlign: 'center' }}>โอกาสฝน</th>
                  <th style={{ padding: '15px', fontWeight: 'bold', textAlign: 'center' }}>UV Index</th>
                  <th style={{ padding: '15px', fontWeight: 'bold', textAlign: 'center' }}>ความเร็วลม</th>
                  <th style={{ padding: '15px', fontWeight: 'bold', textAlign: 'center', width: '100px' }}>แนวโน้ม</th>
                </tr>
              </thead>
              <tbody>
                {masterTableData.map((row, idx) => {
                  const status = getHealthStatus(row.pm25);
                  return (
                    <tr key={idx} style={{ borderBottom: `1px solid ${borderColor}`, transition: 'background 0.2s' }} onMouseOver={e=>e.currentTarget.style.background=darkMode?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.02)'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{ padding: '15px 20px', fontWeight: 'bold' }}>{row.prov}</td>
                      <td style={{ padding: '15px', textAlign: 'center', fontWeight: '900', color: getPM25Color(row.pm25) }}>{row.pm25}</td>
                      <td style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold', color: getHeatStatus(row.heat).color }}>{row.heat}°</td>
                      <td style={{ padding: '15px', textAlign: 'center', color: subTextColor }}>{row.temp}°C</td>
                      <td style={{ padding: '15px', textAlign: 'center', color: '#3b82f6', fontWeight: 'bold' }}>{row.rain}%</td>
                      <td style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold', color: getStatColor('uv', row.uv) }}>{row.uv}</td>
                      <td style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold', color: getStatColor('wind', row.wind) }}>{row.wind} <span style={{fontSize:'0.7rem'}}>km/h</span></td>
                      <td style={{ padding: '10px 15px' }}>
                        <LineChart width={90} height={30} data={row.trend.map(v => ({val: v.val}))}><Line type="monotone" dataKey="val" stroke={getPM25Color(row.pm25)} strokeWidth={2.5} dot={false} isAnimationActive={false} /></LineChart>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}