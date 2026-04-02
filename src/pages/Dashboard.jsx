// src/pages/Dashboard.jsx
import React, { useContext, useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom'; // 🌟 เพิ่ม useNavigate
import { WeatherContext } from '../context/WeatherContext';
import { extractProvince, formatLocationName, getPM25Color, getDistanceFromLatLonInKm } from '../utils/helpers';

const getHealthStatus = (pm) => {
  if (pm == null || isNaN(pm)) return { face: '😶', text: 'ไม่มีข้อมูล', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' };
  if (pm <= 15.0) return { face: '😁', text: 'คุณภาพอากาศดีมาก', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' }; 
  if (pm <= 25.0) return { face: '🙂', text: 'คุณภาพอากาศดี', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' }; 
  if (pm <= 37.5) return { face: '😐', text: 'คุณภาพปานกลาง', color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)' }; 
  if (pm <= 75.0) return { face: '😷', text: 'เริ่มมีผลกระทบ', color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)' }; 
  return { face: '🤢', text: 'มีผลกระทบสุขภาพ', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' }; 
};

const getHeatStatus = (val) => {
  if (val == null || isNaN(val)) return { face: '😶', text: 'ไม่มีข้อมูล', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' };
  if (val >= 52) return { face: '🥵', text: 'อันตรายมาก (ฮีทสโตรก)', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' };
  if (val >= 41) return { face: '😰', text: 'อันตราย (เลี่ยงแดดจัด)', color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)' };
  if (val >= 32) return { face: '😅', text: 'เฝ้าระวัง (เตือนภัย)', color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)' };
  return { face: '😎', text: 'ปกติ (ปลอดภัย)', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' };
};

function MiniMapUpdate({ lat, lon }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lon && !isNaN(lat) && !isNaN(lon)) map.flyTo([lat, lon], 10);
  }, [lat, lon, map]);
  return null;
}

export default function Dashboard() {
  const navigate = useNavigate(); // 🌟 สำหรับการเปลี่ยนหน้า
  const { stations, stationTemps, loading, darkMode, lastUpdateText } = useContext(WeatherContext);
  
  const [selectedStationId, setSelectedStationId] = useState(() => localStorage.getItem('lastStationId') || '');
  const [activeStation, setActiveStation] = useState(null);
  const [greeting, setGreeting] = useState('สวัสดี');
  const [timeOfDay, setTimeOfDay] = useState('morning'); 
  const [gpsAttempted, setGpsAttempted] = useState(false);
  const [forecastData, setForecastData] = useState([]);
  
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);

  // 🌟 ระบบตรวจสอบ: ถ้าเป็นคอมพิวเตอร์และเพิ่งเข้าแอปครั้งแรก ให้เด้งไปหน้าแผนที่เลย
  useEffect(() => {
    if (window.innerWidth >= 1024 && !sessionStorage.getItem('hasRedirectedToMap')) {
      sessionStorage.setItem('hasRedirectedToMap', 'true');
      navigate('/map', { replace: true });
    }
  }, [navigate]);

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

  useEffect(() => {
    if (activeStation && activeStation.lat && activeStation.long) {
      const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${activeStation.lat}&longitude=${activeStation.long}&hourly=pm2_5&timezone=auto&forecast_days=2`;
      fetch(url).then(r=>r.json()).then(data => {
        if (data && data.hourly && data.hourly.pm2_5) {
          const now = new Date().getTime();
          let sIdx = data.hourly.time.findIndex(t => new Date(t).getTime() >= now);
          if (sIdx === -1) sIdx = 0;
          const pmF = [];
          for (let i = sIdx; i < sIdx + 24; i += 2) { 
            if (data.hourly.pm2_5[i] != null) {
              pmF.push({ time: `${new Date(data.hourly.time[i]).getHours().toString().padStart(2, '0')}:00`, val: Math.round(data.hourly.pm2_5[i]) });
            }
          }
          setForecastData(pmF);
        }
      }).catch(() => setForecastData([]));
    }
  }, [activeStation]);

  const todayStr = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
  
  const allLocations = [...(stations || [])].map(s => ({
    id: s.stationID, name: formatLocationName(s.areaTH)
  })).sort((a, b) => a.name.localeCompare(b.name, 'th'));

  let dynamicBg = '';
  if (darkMode) {
    dynamicBg = 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)';
  } else {
    if (timeOfDay === 'morning') dynamicBg = 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)'; 
    else if (timeOfDay === 'afternoon') dynamicBg = 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)'; 
    else dynamicBg = 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)'; 
  }

  const cardBg = darkMode ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.85)';
  const innerCardBg = darkMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.7)';
  const textColor = darkMode ? '#f8fafc' : '#0f172a';
  const subTextColor = darkMode ? '#94a3b8' : '#64748b'; 
  const borderColor = darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)'; 
  
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', background: dynamicBg, color: textColor, fontWeight: 'bold' }}>กำลังโหลดข้อมูล... ⏳</div>;

  const pmVal = activeStation && activeStation.AQILast && activeStation.AQILast.PM25 ? Number(activeStation.AQILast.PM25.value) : null;
  const tObj = activeStation ? stationTemps[activeStation.stationID] : null;
  
  const tempVal = tObj ? tObj.temp : null;
  const humidityVal = tObj && tObj.humidity != null ? tObj.humidity : '-';
  const windVal = tObj ? tObj.windSpeed : null;
  const heatVal = tObj ? tObj.feelsLike : null;

  const health = getHealthStatus(pmVal);
  const heatStatus = getHeatStatus(heatVal);
  const pmColor = getPM25Color(pmVal);

  return (
    <div style={{ background: dynamicBg, minHeight: '100%', padding: isMobile ? '15px' : '30px', paddingBottom: isMobile ? '90px' : '40px', display: 'flex', flexDirection: 'column', gap: isMobile ? '15px' : '20px', boxSizing: 'border-box', overflowY: 'auto', fontFamily: 'Kanit, sans-serif' }} className="hide-scrollbar">
      
      <div style={{ display: 'flex', justifyContent: isMobile ? 'flex-end' : 'space-between', alignItems: 'center' }}>
        {!isMobile && (
          <div>
            <h1 style={{ fontSize: '2rem', color: textColor, margin: 0, fontWeight: '800', filter: darkMode ? 'none' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.05))' }}>{greeting}</h1>
            <p style={{ margin: '2px 0 0 0', color: subTextColor, fontSize: '0.95rem' }}>{todayStr}</p>
          </div>
        )}
        <div style={{ background: innerCardBg, backdropFilter: 'blur(10px)', padding: '6px 12px', borderRadius: '12px', color: subTextColor, fontSize: '0.75rem', fontWeight: 'bold', border: `1px solid ${borderColor}`, boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
          ⏱️ อัปเดต: {lastUpdateText || '-'}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap: '20px' }}>
        
        <div style={{ background: cardBg, backdropFilter: 'blur(20px)', borderRadius: '24px', padding: isMobile ? '15px' : '30px', border: `1px solid ${borderColor}`, boxShadow: '0 10px 40px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: innerCardBg, padding: '8px 10px 8px 15px', borderRadius: '50px', marginBottom: isMobile ? '15px' : '25px', border: `1px solid ${borderColor}` }}>
            <span style={{ fontSize: '1.2rem' }}>📍</span>
            <select value={selectedStationId} onChange={handleStationChange} style={{ flex: 1, background: 'transparent', color: textColor, border: 'none', fontWeight: 'bold', fontSize: '0.95rem', outline: 'none', cursor: 'pointer', appearance: 'none', textOverflow: 'ellipsis' }}>
              {allLocations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
            </select>
          </div>

          {/* 🌟 2 ดัชนีหลัก - ปรับ UI ให้กระชับบนมือถือ ซ้าย(หน้า) ขวา(เลข) */}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '15px' : '20px', flex: 1, alignItems: 'stretch', justifyContent: 'space-around', padding: isMobile ? '0' : '10px 0' }}>
            
            {/* PM2.5 */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'space-between' : 'center', gap: '15px', background: isMobile ? innerCardBg : 'transparent', padding: isMobile ? '15px 20px' : '0', borderRadius: '20px', border: isMobile ? `1px solid ${borderColor}` : 'none' }}>
              <div style={{ fontSize: isMobile ? '4.5rem' : '6.5rem', filter: `drop-shadow(0 15px 25px ${health.color}50)`, lineHeight: 1, transform: isMobile ? 'none' : 'scale(1.05)' }}>{health.face}</div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'flex-end' : 'flex-start' }}>
                 <span style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold', letterSpacing: '0.5px' }}>PM2.5 (µg/m³)</span>
                 <span style={{ fontSize: isMobile ? '3rem' : '4.5rem', fontWeight: '900', color: health.color, lineHeight: 1.1, filter: darkMode ? `drop-shadow(0 0 10px ${health.color}30)` : 'none' }}>{pmVal != null && !isNaN(pmVal) ? pmVal : '-'}</span>
                 <span style={{ background: health.bg, color: health.color, padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', marginTop: '5px' }}>{health.text}</span>
              </div>
            </div>

            {/* เส้นแบ่งกลาง (แสดงเฉพาะคอม) */}
            {!isMobile && <div style={{ width: '1px', height: '100px', background: borderColor }}></div>}

            {/* ดัชนีความร้อน */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'space-between' : 'center', gap: '15px', background: isMobile ? innerCardBg : 'transparent', padding: isMobile ? '15px 20px' : '0', borderRadius: '20px', border: isMobile ? `1px solid ${borderColor}` : 'none' }}>
              <div style={{ fontSize: isMobile ? '4.5rem' : '6.5rem', filter: `drop-shadow(0 15px 25px ${heatStatus.color}50)`, lineHeight: 1, transform: isMobile ? 'none' : 'scale(1.05)' }}>{heatStatus.face}</div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'flex-end' : 'flex-start' }}>
                 <span style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold', letterSpacing: '0.5px' }}>ดัชนีความร้อน (°C)</span>
                 <span style={{ fontSize: isMobile ? '3rem' : '4.5rem', fontWeight: '900', color: heatStatus.color, lineHeight: 1.1, filter: darkMode ? `drop-shadow(0 0 10px ${heatStatus.color}30)` : 'none' }}>{heatVal != null ? Math.round(heatVal) : '-'}</span>
                 <span style={{ background: heatStatus.bg, color: heatStatus.color, padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', marginTop: '5px' }}>{heatStatus.text}</span>
              </div>
            </div>

          </div>

          {/* แถบข้อมูลรองด้านล่าง */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: isMobile ? '15px' : '30px', paddingTop: isMobile ? '15px' : '20px', borderTop: `1px dashed ${borderColor}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <span style={{ fontSize: '1.2rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}>🌡️</span>
              <div><div style={{ fontSize: '0.65rem', color: subTextColor }}>อุณหภูมิ</div><div style={{ fontWeight: 'bold', color: textColor, fontSize: '0.85rem' }}>{tempVal ? Math.round(tempVal) : '-'}°C</div></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', borderLeft: `1px solid ${borderColor}`, borderRight: `1px solid ${borderColor}` }}>
              <span style={{ fontSize: '1.2rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}>💧</span>
              <div><div style={{ fontSize: '0.65rem', color: subTextColor }}>ความชื้น</div><div style={{ fontWeight: 'bold', color: textColor, fontSize: '0.85rem' }}>{humidityVal}%</div></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <span style={{ fontSize: '1.2rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}>🌬️</span>
              <div><div style={{ fontSize: '0.65rem', color: subTextColor }}>ลม</div><div style={{ fontWeight: 'bold', color: textColor, fontSize: '0.85rem' }}>{windVal != null ? Math.round(windVal) : '-'} <span style={{fontSize: '0.6rem'}}>km/h</span></div></div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ background: cardBg, backdropFilter: 'blur(20px)', borderRadius: '24px', padding: '15px', border: `1px solid ${borderColor}`, boxShadow: '0 10px 40px rgba(0,0,0,0.05)', flex: 1, minHeight: '180px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '0.9rem', color: subTextColor, fontWeight: 'bold', margin: '0 0 10px 5px' }}>🗺️ ตำแหน่งจุดตรวจวัด</h3>
            <div style={{ flex: 1, borderRadius: '15px', overflow: 'hidden', background: innerCardBg, position: 'relative' }}>
              {activeStation && !isNaN(parseFloat(activeStation.lat)) ? (
                <MapContainer center={[parseFloat(activeStation.lat), parseFloat(activeStation.long)]} zoom={10} style={{ height: '100%', width: '100%', zIndex: 1 }} zoomControl={false} dragging={!isMobile} scrollWheelZoom={false}>
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

          <div style={{ background: cardBg, backdropFilter: 'blur(20px)', borderRadius: '24px', padding: '15px', border: `1px solid ${borderColor}`, boxShadow: '0 10px 40px rgba(0,0,0,0.05)', height: isMobile ? '180px' : '220px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '0.9rem', color: subTextColor, fontWeight: 'bold', margin: '0 0 15px 5px' }}>📊 แนวโน้มฝุ่น PM2.5 ล่วงหน้า</h3>
            <div style={{ flex: 1 }}>
              {forecastData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={forecastData} margin={{ top: 5, right: 5, bottom: -5, left: -25 }}>
                    <XAxis dataKey="time" stroke={subTextColor} fontSize={9} tickLine={false} axisLine={false} />
                    <YAxis stroke={subTextColor} fontSize={9} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: innerCardBg }} contentStyle={{ borderRadius: '10px', border: `1px solid ${borderColor}`, background: cardBg, color: textColor, boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="val" radius={[4, 4, 0, 0]}>
                      {forecastData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getPM25Color(entry.val)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: subTextColor, fontSize: '0.85rem' }}>กำลังคำนวณโมเดลพยากรณ์...</div>
              )}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}