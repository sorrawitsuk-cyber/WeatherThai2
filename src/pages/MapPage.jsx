// src/pages/MapPage.jsx
import React, { useContext, useState, useEffect } from 'react';
// 🌟 นำเข้า useMapEvents เพื่อใช้ตรวจจับการซูม
import { MapContainer, TileLayer, Marker, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { WeatherContext } from '../context/WeatherContext';
import { extractProvince, getPM25Color } from '../utils/helpers';
import 'leaflet/dist/leaflet.css';

// ฟังก์ชันจัดการสี
const getHeatColor = (val) => {
  if (val == null) return '#94a3b8';
  if (val >= 41) return '#ef4444'; 
  if (val >= 32) return '#f97316'; 
  if (val >= 27) return '#eab308'; 
  return '#22c55e'; 
};

const getTempColor = (val) => {
  if (val == null) return '#94a3b8';
  if (val >= 35) return '#ef4444';
  if (val >= 30) return '#f97316';
  if (val >= 25) return '#eab308';
  if (val >= 20) return '#22c55e';
  return '#3b82f6'; 
};

const getRainColor = (val) => {
  if (val == null) return '#94a3b8';
  if (val >= 80) return '#1e3a8a'; 
  if (val >= 50) return '#3b82f6'; 
  if (val >= 20) return '#93c5fd'; 
  return '#e0f2fe'; 
};

const getHumidityColor = (val) => {
  if (val == null) return '#94a3b8';
  if (val >= 80) return '#064e3b'; 
  if (val >= 60) return '#059669'; 
  if (val >= 40) return '#34d399'; 
  return '#a7f3d0'; 
};

const getWindColor = (val) => {
  if (val == null) return '#94a3b8';
  if (val >= 30) return '#831843'; 
  if (val >= 15) return '#db2777'; 
  if (val >= 5) return '#f472b6'; 
  return '#fbcfe8'; 
};

const formatAreaName = (areaTH) => areaTH ? areaTH.split(',')[0].trim() : '';

// สร้าง Custom Icon ลูกศรลม
const createWindArrowIcon = (dir) => {
  let deg = 0;
  if (typeof dir === 'number') deg = dir;
  else if (typeof dir === 'string') {
    const d = dir.toUpperCase();
    if (d==='N') deg=0; else if (d==='NE') deg=45; else if (d==='E') deg=90; else if (d==='SE') deg=135; else if (d==='S') deg=180; else if (d==='SW') deg=225; else if (d==='W') deg=270; else if (d==='NW') deg=315;
  }
  return L.divIcon({
    html: `<div style="transform: rotate(${deg}deg); font-size: 16px; text-align: center; line-height: 16px; color: #fff; text-shadow: 0 0 4px #000; font-weight: bold;">⬆</div>`,
    className: 'custom-wind-arrow',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

// 🌟 Component ใหม่: ตรวจจับระยะการซูมแผนที่
function MapZoomListener({ setZoomLevel }) {
  const map = useMapEvents({
    zoomend: () => setZoomLevel(map.getZoom()),
  });
  useEffect(() => { setZoomLevel(map.getZoom()); }, [map, setZoomLevel]);
  return null;
}

function MapUpdater({ lat, lon }) {
  const map = useMap();
  useEffect(() => { if (lat && lon && !isNaN(lat) && !isNaN(lon)) map.flyTo([lat, lon], 10, { animate: true }); }, [lat, lon, map]);
  return null;
}

export default function MapPage() {
  const { stations, stationTemps, loading, darkMode } = useContext(WeatherContext);
  
  const [activeMode, setActiveMode] = useState('pm25');
  const [selectedStation, setSelectedStation] = useState(null);
  const [mapStyle, setMapStyle] = useState('standard'); 
  const [zoomLevel, setZoomLevel] = useState(6); // 🌟 State เก็บค่าความซูม
  
  const [isMobileCardOpen, setIsMobileCardOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => { if (selectedStation && isMobile) setIsMobileCardOpen(true); }, [selectedStation, isMobile]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', background: darkMode ? '#0f172a' : '#f0f9ff', color: darkMode ? '#fff' : '#000' }}>กำลังโหลดแผนที่... ⏳</div>;

  const safeStations = stations || [];
  
  const modes = [
    { id: 'pm25', label: 'ฝุ่น PM2.5', icon: '😷', color: '#0ea5e9', unit: 'µg/m³' },
    { id: 'heat', label: 'ดัชนีร้อน', icon: '🥵', color: '#f97316', unit: '°C' },
    { id: 'temp', label: 'อุณหภูมิ', icon: '🌡️', color: '#eab308', unit: '°C' },
    { id: 'rain', label: 'โอกาสฝน', icon: '☔', color: '#3b82f6', unit: '%' },
    { id: 'humidity', label: 'ความชื้น', icon: '💧', color: '#10b981', unit: '%' },
    { id: 'wind', label: 'ความเร็วลม', icon: '🌬️', color: '#db2777', unit: 'km/h' },
  ];

  const mapBg = darkMode ? '#0f172a' : '#f8fafc';
  const cardBg = darkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)';
  const innerCardBg = darkMode ? 'rgba(0,0,0,0.3)' : 'rgba(241, 245, 249, 0.8)';
  const textColor = darkMode ? '#f8fafc' : '#0f172a';
  const subTextColor = darkMode ? '#94a3b8' : '#64748b';
  const borderColor = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  const getTileUrl = () => {
    if (mapStyle === 'dark' || (mapStyle === 'standard' && darkMode)) return "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
    if (mapStyle === 'satellite') return "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
    return "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  };

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%', background: mapBg, display: 'flex', flexDirection: 'column' }}>
      
      {/* 🗺️ แผนที่หลัก */}
      <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
        <MapContainer center={[13.7563, 100.5018]} zoom={6} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer url={getTileUrl()} />
          {/* ตรวจจับการซูม */}
          <MapZoomListener setZoomLevel={setZoomLevel} />
          
          {selectedStation && !isNaN(parseFloat(selectedStation.lat)) && (
            <MapUpdater lat={parseFloat(selectedStation.lat)} lon={parseFloat(selectedStation.long)} />
          )}

          {safeStations.map(st => {
            const lat = parseFloat(st.lat); const lon = parseFloat(st.long);
            if (isNaN(lat) || isNaN(lon)) return null;

            const tObj = stationTemps[st.stationID] || {};
            const pmVal = st.AQILast?.PM25?.value ? Number(st.AQILast.PM25.value) : null;
            
            let valToShow = '-'; let circleColor = '#94a3b8'; let windDir = null;

            if (activeMode === 'pm25') { valToShow = pmVal; circleColor = getPM25Color(pmVal); }
            else if (activeMode === 'heat') { valToShow = tObj.feelsLike != null ? Math.round(tObj.feelsLike) : '-'; circleColor = getHeatColor(tObj.feelsLike); }
            else if (activeMode === 'temp') { valToShow = tObj.temp != null ? Math.round(tObj.temp) : '-'; circleColor = getTempColor(tObj.temp); }
            else if (activeMode === 'rain') { valToShow = tObj.rainProb != null ? Math.round(tObj.rainProb) : '-'; circleColor = getRainColor(tObj.rainProb); }
            else if (activeMode === 'humidity') { valToShow = tObj.humidity != null ? tObj.humidity : '-'; circleColor = getHumidityColor(tObj.humidity); }
            else if (activeMode === 'wind') { valToShow = tObj.windSpeed != null ? Math.round(tObj.windSpeed) : '-'; circleColor = getWindColor(tObj.windSpeed); windDir = tObj.windDir; }

            const isSelected = selectedStation?.stationID === st.stationID;
            
            // 🌟 ระบบซูมแล้วโชว์ตัวเลข (ถ้าซูมเกินระดับ 8 ให้โชว์เลข)
            const showText = zoomLevel >= 8;
            const size = showText ? 36 : (isSelected ? 24 : 14);
            const fontSize = String(valToShow).length > 2 ? '11px' : '13px';
            
            // จัดสีตัวอักษรให้อ่านง่าย ถ้าพื้นหลังเป็นสีเหลือง/เขียวอ่อน ให้ใช้ตัวหนังสือสีดำ
            const isLightBg = ['#ffff00', '#eab308', '#a7f3d0', '#22c55e', '#e0f2fe', '#fbcfe8'].includes(circleColor);
            const numColor = isLightBg ? '#1e293b' : '#ffffff';

            const htmlContent = showText
              ? `<div style="background-color: ${circleColor}; color: ${numColor}; width: 100%; height: 100%; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: ${fontSize}; font-family: 'Kanit', sans-serif; border: 2px solid #fff; box-shadow: 0 0 15px ${circleColor}90, 0 4px 6px rgba(0,0,0,0.3); text-shadow: ${isLightBg ? 'none' : '0 1px 2px rgba(0,0,0,0.5)'};">${valToShow}</div>`
              : `<div style="background-color: ${circleColor}; width: 100%; height: 100%; border-radius: 50%; border: ${isSelected ? '3px' : '2px'} solid #fff; box-shadow: 0 0 10px ${circleColor}90;"></div>`;

            const dynamicIcon = L.divIcon({
              html: htmlContent,
              className: 'dynamic-marker-icon',
              iconSize: [size, size],
              iconAnchor: [size / 2, size / 2]
            });

            return (
              <React.Fragment key={st.stationID}>
                {/* ใช้ Marker ตัวเดียววาดไอคอนแบบ Dynamic (ใส่เลขได้) */}
                <Marker position={[lat, lon]} icon={dynamicIcon} eventHandlers={{ click: () => setSelectedStation(st) }}>
                  {/* Tooltip เล็กๆ ไว้โชว์ตอนเอาเมาส์ชี้ */}
                  <Tooltip direction="top" offset={[0, -(size/2)]} opacity={1} permanent={false}>
                    <div style={{ textAlign: 'center', fontWeight: 'bold', fontFamily: 'Kanit' }}>
                      <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{extractProvince(st.areaTH)}</div>
                      <div style={{ fontSize: '1.1rem' }}>{valToShow} <span style={{fontSize: '0.7rem'}}>{modes.find(m => m.id === activeMode)?.unit}</span></div>
                    </div>
                  </Tooltip>
                </Marker>

                {/* ลูกศรลม */}
                {activeMode === 'wind' && windDir && (
                   <Marker position={[lat, lon]} icon={createWindArrowIcon(windDir)} eventHandlers={{ click: () => setSelectedStation(st) }} />
                )}
              </React.Fragment>
            );
          })}
        </MapContainer>
      </div>

      {/* 🎛️ แถบควบคุมโหมดด้านบน (🌟 เอาแถบขาวออก เหลือแต่ปุ่มสวยๆ ลอยๆ) */}
      <div style={{ position: 'absolute', top: isMobile ? 15 : 20, left: isMobile ? 15 : 20, right: isMobile ? 15 : 20, zIndex: 1000, pointerEvents: 'none' }}>
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px', pointerEvents: 'auto', WebkitOverflowScrolling: 'touch' }} className="hide-scrollbar">
          {modes.map(mode => {
            const isActive = activeMode === mode.id;
            return (
              <button 
                key={mode.id} onClick={() => setActiveMode(mode.id)}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '50px', border: 'none', flexShrink: 0,
                  background: isActive ? mode.color : (darkMode ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.9)'), 
                  color: isActive ? '#fff' : textColor,
                  fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s',
                  backdropFilter: 'blur(10px)',
                  boxShadow: isActive ? `0 6px 15px ${mode.color}50` : '0 4px 10px rgba(0,0,0,0.1)',
                  transform: isActive ? 'translateY(-2px)' : 'none'
                }}>
                <span style={{ fontSize: '1.2rem' }}>{mode.icon}</span>
                {mode.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 🌟 ปุ่มเปลี่ยนโหมดแผนที่ (Basemap Toggle) */}
      <div style={{ position: 'absolute', top: isMobile ? 80 : 20, right: isMobile ? 15 : 20, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button onClick={() => setMapStyle('standard')} style={{ background: cardBg, color: textColor, border: `1px solid ${borderColor}`, padding: '8px 12px', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 'bold' }}>🗺️ ปกติ</button>
        <button onClick={() => setMapStyle('dark')} style={{ background: cardBg, color: textColor, border: `1px solid ${borderColor}`, padding: '8px 12px', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 'bold' }}>🌙 มืด</button>
        <button onClick={() => setMapStyle('satellite')} style={{ background: cardBg, color: textColor, border: `1px solid ${borderColor}`, padding: '8px 12px', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 'bold' }}>🛰️ ดาวเทียม</button>
      </div>

      {/* 🌟 กล่อง Legend (คำอธิบายสีแผนที่) */}
      <div style={{ position: 'absolute', bottom: isMobile ? (isMobileCardOpen ? '420px' : '100px') : '30px', left: isMobile ? '15px' : '30px', zIndex: 1000, background: cardBg, padding: '12px 20px', borderRadius: '16px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', transition: 'bottom 0.3s' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: textColor, marginBottom: '8px' }}>คำอธิบายสี ({modes.find(m => m.id === activeMode)?.label})</div>
        <div style={{ display: 'flex', gap: '2px', height: '12px', width: '160px', borderRadius: '6px', overflow: 'hidden' }}>
          {activeMode === 'pm25' && <><div style={{flex:1, background:'#00e400'}}></div><div style={{flex:1, background:'#ffff00'}}></div><div style={{flex:1, background:'#ff7e00'}}></div><div style={{flex:1, background:'#ff0000'}}></div></>}
          {activeMode === 'heat' && <><div style={{flex:1, background:'#22c55e'}}></div><div style={{flex:1, background:'#eab308'}}></div><div style={{flex:1, background:'#f97316'}}></div><div style={{flex:1, background:'#ef4444'}}></div></>}
          {activeMode === 'temp' && <><div style={{flex:1, background:'#3b82f6'}}></div><div style={{flex:1, background:'#22c55e'}}></div><div style={{flex:1, background:'#f97316'}}></div><div style={{flex:1, background:'#ef4444'}}></div></>}
          {activeMode === 'rain' && <><div style={{flex:1, background:'#e0f2fe'}}></div><div style={{flex:1, background:'#93c5fd'}}></div><div style={{flex:1, background:'#3b82f6'}}></div><div style={{flex:1, background:'#1e3a8a'}}></div></>}
          {activeMode === 'humidity' && <><div style={{flex:1, background:'#a7f3d0'}}></div><div style={{flex:1, background:'#34d399'}}></div><div style={{flex:1, background:'#059669'}}></div><div style={{flex:1, background:'#064e3b'}}></div></>}
          {activeMode === 'wind' && <><div style={{flex:1, background:'#fbcfe8'}}></div><div style={{flex:1, background:'#f472b6'}}></div><div style={{flex:1, background:'#db2777'}}></div><div style={{flex:1, background:'#831843'}}></div></>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: subTextColor, marginTop: '4px', fontWeight: 'bold' }}>
          <span>น้อย</span><span>มาก</span>
        </div>
      </div>

      {/* 📱 ปุ่ม Toggle เปิด/ซ่อน การ์ดข้อมูล */}
      {isMobile && selectedStation && (
        <div style={{ position: 'absolute', bottom: isMobileCardOpen ? '320px' : '90px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, transition: 'bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
          <button onClick={() => setIsMobileCardOpen(!isMobileCardOpen)} style={{ background: '#0f172a', color: '#fff', border: `2px solid rgba(255,255,255,0.2)`, borderRadius: '50px', padding: '10px 20px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)' }}>
            {isMobileCardOpen ? <><span style={{ fontSize: '1.2rem' }}>⬇️</span> ซ่อนข้อมูล</> : <><span style={{ fontSize: '1.2rem' }}>📊</span> ดูข้อมูลพื้นที่นี้</>}
          </button>
        </div>
      )}

      {/* 📋 การ์ดแสดงข้อมูลสถานีที่เลือก */}
      {selectedStation && (
        <div style={{ 
          position: 'absolute', zIndex: 1000, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          ...(isMobile 
            ? { bottom: isMobileCardOpen ? '0' : '-100%', left: 0, right: 0, borderTopLeftRadius: '24px', borderTopRightRadius: '24px', paddingBottom: '90px' } 
            : { top: '20px', right: '100px', width: '340px', borderRadius: '24px', maxHeight: 'calc(100vh - 40px)', overflowY: 'auto' }), // ปรับ right ให้ไม่บังปุ่ม mapStyle
          background: cardBg, backdropFilter: 'blur(20px)', border: `1px solid ${borderColor}`, padding: '20px', boxShadow: '0 -10px 40px rgba(0,0,0,0.15)', fontFamily: 'Kanit, sans-serif'
        }} className="hide-scrollbar">
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#0ea5e9', fontWeight: 'bold', marginBottom: '4px' }}>📍 {extractProvince(selectedStation.areaTH)}</div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: textColor, lineHeight: 1.3 }}>{formatAreaName(selectedStation.areaTH)}</h3>
            </div>
            {!isMobile && <button onClick={() => setSelectedStation(null)} style={{ background: innerCardBg, border: 'none', width: '30px', height: '30px', borderRadius: '50%', color: subTextColor, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✖</button>}
          </div>

          {(() => {
            const tObj = stationTemps[selectedStation.stationID] || {};
            const pmVal = selectedStation.AQILast?.PM25?.value ? Number(selectedStation.AQILast.PM25.value) : '-';
            const gridItems = [
              { label: 'PM2.5', val: pmVal, unit: 'µg/m³', icon: '😷', color: getPM25Color(pmVal) },
              { label: 'ดัชนีร้อน', val: tObj.feelsLike != null ? Math.round(tObj.feelsLike) : '-', unit: '°C', icon: '🥵', color: getHeatColor(tObj.feelsLike) },
              { label: 'อุณหภูมิ', val: tObj.temp != null ? Math.round(tObj.temp) : '-', unit: '°C', icon: '🌡️', color: getTempColor(tObj.temp) },
              { label: 'โอกาสฝน', val: tObj.rainProb != null ? Math.round(tObj.rainProb) : '-', unit: '%', icon: '☔', color: getRainColor(tObj.rainProb) },
              { label: 'ความชื้น', val: tObj.humidity != null ? tObj.humidity : '-', unit: '%', icon: '💧', color: getHumidityColor(tObj.humidity) },
              { label: 'ความเร็วลม', val: tObj.windSpeed != null ? Math.round(tObj.windSpeed) : '-', unit: 'km/h', icon: '🌬️', color: getWindColor(tObj.windSpeed) },
            ];

            return (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {gridItems.map((item, idx) => (
                  <div key={idx} style={{ background: innerCardBg, padding: '12px', borderRadius: '16px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}><span style={{ fontSize: '1.2rem', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.1))' }}>{item.icon}</span><span style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold' }}>{item.label}</span></div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '900', color: item.color === '#94a3b8' ? textColor : item.color, lineHeight: 1 }}>{item.val} <span style={{ fontSize: '0.7rem', color: subTextColor, fontWeight: 'normal' }}>{item.unit}</span></div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      <style dangerouslySetInlineStyle={{__html: ` @keyframes pulse { 0% { opacity: 0.5; transform: scale(0.95); } 50% { opacity: 1; transform: scale(1.05); } 100% { opacity: 0.5; transform: scale(0.95); } } `}} />
    </div>
  );
}