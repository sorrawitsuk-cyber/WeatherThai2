// src/pages/MapPage.jsx (หรือชื่อไฟล์แผนที่ของคุณ)
import React, { useContext, useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { WeatherContext } from '../context/WeatherContext';

export default function MapPage() {
  const { stations, stationTemps, darkMode } = useContext(WeatherContext);
  const [geoData, setGeoData] = useState(null);
  const [activeMode, setActiveMode] = useState('pm25');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 🌟 ดึงไฟล์จากโฟลเดอร์ public ในเครื่องตัวเอง ปลอดภัย 100%
  useEffect(() => {
    fetch('/thailand.json')
      .then(res => {
          if(!res.ok) throw new Error("หาไฟล์ไม่เจอ เช็กว่าใส่ไฟล์ถูกที่ไหม");
          return res.json();
      })
      .then(data => setGeoData(data))
      .catch(e => console.error('Error loading GeoJSON:', e));
  }, []);

  const modes = [
    { id: 'pm25', name: '😷 ฝุ่น PM2.5' },
    { id: 'heat', name: '🥵 ดัชนีความร้อน' },
    { id: 'temp', name: '🌡️ อุณหภูมิ' },
    { id: 'rain', name: '☔ โอกาสฝนตก' },
    { id: 'humidity', name: '💧 ความชื้น' },
    { id: 'wind', name: '🌬️ ความเร็วลม' }
  ];

  const getVal = (station) => {
    if (!station || !stationTemps[station.stationID]) return 0;
    const data = stationTemps[station.stationID];
    switch(activeMode) {
        case 'pm25': return station.AQILast?.PM25?.value || 0;
        case 'heat': return Math.round(data.feelsLike);
        case 'temp': return Math.round(data.temp);
        case 'rain': return data.rainProb || 0;
        case 'humidity': return Math.round(data.humidity);
        case 'wind': return Math.round(data.windSpeed);
        default: return 0;
    }
  };

  const getColor = (val, mode) => {
    if (mode === 'pm25') return val > 75 ? '#ef4444' : val > 37.5 ? '#f97316' : val > 25 ? '#eab308' : '#22c55e';
    if (mode === 'temp' || mode === 'heat') return val > 39 ? '#ef4444' : val > 34 ? '#f97316' : val > 28 ? '#eab308' : val > 22 ? '#22c55e' : '#3b82f6';
    if (mode === 'rain' || mode === 'humidity') return val > 70 ? '#1e3a8a' : val > 40 ? '#3b82f6' : val > 10 ? '#60a5fa' : '#94a3b8';
    if (mode === 'wind') return val > 40 ? '#ef4444' : val > 20 ? '#f97316' : val > 10 ? '#eab308' : '#22c55e';
    return '#94a3b8';
  };

  // ... (โค้ดส่วนบนเหมือนเดิม) ...

  // 🌟 4. ฟังก์ชันจับคู่ GeoJSON กับข้อมูลอุตุนิยมวิทยาของเรา
  const styleGeoJSON = (feature) => {
    const props = Object.values(feature.properties || {}).map(v => String(v).replace('จ.', '').replace('จังหวัด', '').trim());
    
    const station = stations.find(s => {
        const cleanName = s.areaTH.replace('จังหวัด', '').trim();
        return props.includes(cleanName) || props.some(p => p.includes(cleanName) || cleanName.includes(p));
    });

    const val = getVal(station);
    const color = station ? getColor(val, activeMode) : (darkMode ? '#334155' : '#cbd5e1');

    return {
        fillColor: color,
        weight: 1.5,
        opacity: 1,
        // 🌟 เปลี่ยนสีกรอบเป็นสีขาวตามรีเควส
        color: '#ffffff', 
        fillOpacity: 0.75 
    };
  };

  // 🌟 5. สร้างไอคอนตัวเลขลอยๆ ตรงกลางจังหวัด
  const createLabelIcon = (val) => {
    return L.divIcon({
        className: 'custom-text-icon',
        // 🌟 ปรับขนาดฟอนต์ให้เล็กลง และเปลี่ยนสีเป็นเทาดำ (#334155) พร้อมขอบขาวบางๆ ให้อ่านง่ายบนทุกสีพื้นหลัง
        html: `<div style="color: #334155; font-weight: 900; font-size: ${isMobile ? '10px' : '12px'}; text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff; text-align: center;">${val}</div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20] 
    });
  };

  // ... (โค้ดส่วนล่างเหมือนเดิม) ...

  const appBg = darkMode ? '#020617' : '#f8fafc'; 
  const cardBg = darkMode ? '#0f172a' : '#ffffff';
  const textColor = darkMode ? '#f8fafc' : '#0f172a'; 
  const subTextColor = darkMode ? '#94a3b8' : '#64748b'; 
  
  const mapUrl = darkMode 
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' 
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  if (!geoData || Object.keys(stationTemps).length === 0) return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', background: appBg, color: textColor, fontFamily: 'Kanit, sans-serif' }}>
        <style dangerouslySetInlineStyle={{__html: `@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(0.95); } }`}} />
        <div style={{ fontSize: '4rem', animation: 'pulse 1.5s infinite ease-in-out' }}>🗺️</div>
        <div style={{ marginTop: '20px', fontSize: '1.2rem', fontWeight: 'bold' }}>กำลังประมวลผลแผนที่</div>
        <div style={{ fontSize: '0.9rem', color: subTextColor, marginTop: '8px' }}>กรุณารอสักครู่...</div>
    </div>
  );

  return (
    <div style={{ height: '100%', width: '100%', background: appBg, display: 'flex', flexDirection: 'column', fontFamily: 'Kanit, sans-serif', padding: isMobile ? '10px' : '20px' }}>
      
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', padding: '15px', background: cardBg, borderRadius: '20px', marginBottom: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} className="hide-scrollbar">
        <style dangerouslySetInlineStyle={{__html: `.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}} />
        {modes.map(m => (
           <button 
             key={m.id} 
             onClick={() => setActiveMode(m.id)} 
             style={{ 
                padding: '10px 20px', 
                borderRadius: '12px', 
                border: 'none', 
                background: activeMode === m.id ? '#0ea5e9' : (darkMode ? '#1e293b' : '#f1f5f9'), 
                color: activeMode === m.id ? '#fff' : textColor, 
                fontWeight: 'bold', 
                cursor: 'pointer', 
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                boxShadow: activeMode === m.id ? '0 4px 10px rgba(14, 165, 233, 0.3)' : 'none'
             }}
           >
              {m.name}
           </button>
        ))}
      </div>

      <div style={{ flex: 1, borderRadius: '25px', overflow: 'hidden', border: `1px solid ${darkMode ? '#1e293b' : '#e2e8f0'}`, boxShadow: '0 10px 30px rgba(0,0,0,0.15)', position: 'relative' }}>
        <MapContainer 
            center={[13.5, 100.5]} 
            zoom={isMobile ? 5 : 6} 
            style={{ height: '100%', width: '100%', background: darkMode ? '#020617' : '#f8fafc' }}
            zoomControl={false}
        >
            <TileLayer url={mapUrl} attribution='&copy; OpenStreetMap & CartoDB' />

            {/* วาดและระบายสีจังหวัดตามข้อมูล */}
            {geoData && <GeoJSON data={geoData} style={styleGeoJSON} />}

            {/* ตัวเลขข้อมูลแต่ละจังหวัด */}
            {stations.map(st => {
                const val = getVal(st);
                if (val === 0 && activeMode === 'rain') return null; 
                return (
                    <Marker 
                        key={st.stationID} 
                        position={[st.lat, st.long]} 
                        icon={createLabelIcon(val)} 
                        interactive={false} 
                    />
                );
            })}
        </MapContainer>
      </div>
      
      <div style={{ height: isMobile ? '80px' : '20px', flexShrink: 0 }}></div>
    </div>
  );
}