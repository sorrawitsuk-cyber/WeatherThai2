// src/pages/MapPage.jsx
import React, { useContext, useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { WeatherContext } from '../context/WeatherContext';
import { extractProvince, getPM25Color } from '../utils/helpers';
import 'leaflet/dist/leaflet.css';

// 🌟 ฟังก์ชันแยกอำเภอ
const extractDistrict = (areaTH) => {
  if (!areaTH) return 'ทั่วไป';
  const match = areaTH.match(/(เขต|อ\.|อำเภอ)\s*([a-zA-Zก-ฮะ-์]+)/);
  if (match) return match[2];
  return areaTH.split(' ')[0]; 
};

// 🌟 ฟังก์ชันตัดคำชื่อสถานที่ (ตัวที่ทำให้จอขาว ผมเติมกลับมาให้แล้วครับ!)
const formatAreaName = (areaTH) => {
  return areaTH ? areaTH.split(',')[0].trim() : '';
};

// ฟังก์ชันสี
const getHeatColor = (val) => {
  if (val == null) return '#94a3b8';
  if (val >= 41) return '#ef4444'; if (val >= 32) return '#f97316'; if (val >= 27) return '#eab308'; return '#22c55e'; 
};
const getTempColor = (val) => {
  if (val == null) return '#94a3b8';
  if (val >= 35) return '#ef4444'; if (val >= 30) return '#f97316'; if (val >= 25) return '#eab308'; if (val >= 20) return '#22c55e'; return '#3b82f6'; 
};
const getRainColor = (val) => {
  if (val == null) return '#94a3b8';
  if (val >= 80) return '#1e3a8a'; if (val >= 50) return '#3b82f6'; if (val >= 20) return '#93c5fd'; return '#e0f2fe'; 
};
const getHumidityColor = (val) => {
  if (val == null) return '#94a3b8';
  if (val >= 80) return '#064e3b'; if (val >= 60) return '#059669'; if (val >= 40) return '#34d399'; return '#a7f3d0'; 
};
const getWindColor = (val) => {
  if (val == null) return '#94a3b8';
  if (val >= 30) return '#831843'; if (val >= 15) return '#db2777'; if (val >= 5) return '#f472b6'; return '#fbcfe8'; 
};

// 🌟 ตัวจับระยะซูม
function MapZoomListener({ setZoomLevel }) {
  const map = useMapEvents({ zoomend: () => setZoomLevel(map.getZoom()) });
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
  const [zoomLevel, setZoomLevel] = useState(6); // เก็บค่าความซูม
  
  const [selectedProv, setSelectedProv] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [isMobileCardOpen, setIsMobileCardOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  const safeStations = stations || [];
  const allProvinces = [...new Set(safeStations.map(s => extractProvince(s.areaTH)))].sort((a, b) => a.localeCompare(b, 'th'));
  const availableDistricts = [...new Set(safeStations.filter(s => extractProvince(s.areaTH) === selectedProv).map(s => extractDistrict(s.areaTH)))].sort();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => { if (selectedStation && isMobile) setIsMobileCardOpen(true); }, [selectedStation, isMobile]);

  // ซูมไปยังจังหวัดที่เลือกจากตัวกรอง
  useEffect(() => {
    if (safeStations.length > 0 && selectedProv) {
      let targets = safeStations.filter(s => extractProvince(s.areaTH) === selectedProv);
      if (selectedDistrict) targets = targets.filter(s => extractDistrict(s.areaTH) === selectedDistrict);
      if (targets.length > 0) setSelectedStation(targets[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProv, selectedDistrict]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', background: darkMode ? '#0f172a' : '#f0f9ff', color: darkMode ? '#fff' : '#000' }}>กำลังโหลดแผนที่... ⏳</div>;

  const modes = [
    { id: 'pm25', label: 'ฝุ่น PM2.5', icon: '😷', color: '#0ea5e9', unit: 'µg/m³' },
    { id: 'heat', label: 'ดัชนีร้อน', icon: '🥵', color: '#f97316', unit: '°C' },
    { id: 'temp', label: 'อุณหภูมิ', icon: '🌡️', color: '#eab308', unit: '°C' },
    { id: 'rain', label: 'โอกาสฝน', icon: '☔', color: '#3b82f6', unit: '%' },
    { id: 'humidity', label: 'ความชื้น', icon: '💧', color: '#10b981', unit: '%' },
    { id: 'wind', label: 'ความเร็วลม', icon: '🌬️', color: '#db2777', unit: 'km/h' },
  ];

  const mapBg = darkMode ? '#0f172a' : '#f8fafc';
  const cardBg = darkMode ? (isMobile ? 'rgba(15, 23, 42, 0.95)' : 'rgba(30, 41, 59, 0.95)') : 'rgba(255, 255, 255, 0.95)';
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
            
            // ซูม >= 8 ให้โชว์ตัวเลข
            const showText = zoomLevel >= 8;
            const size = showText ? 36 : (isSelected ? 24 : 14);
            const fontSize = String(valToShow).length > 2 ? '11px' : '13px';
            const isLightBg = ['#ffff00', '#eab308', '#a7f3d0', '#22c55e', '#e0f2fe', '#fbcfe8'].includes(circleColor);
            const numColor = isLightBg ? '#1e293b' : '#ffffff';

            let htmlContent = '';

            if (activeMode === 'wind' && windDir && windDir !== '-') {
              // คำนวณองศาลูกศร (+180 ชี้ทิศที่ลมพัดไป)
              let arrowDeg = typeof windDir === 'number' ? windDir + 180 : 0;
              if (typeof windDir === 'string') {
                const d = windDir.toUpperCase();
                if (d==='N') arrowDeg=180; else if (d==='NE') arrowDeg=225; else if (d==='E') arrowDeg=270; else if (d==='SE') arrowDeg=315; else if (d==='S') arrowDeg=0; else if (d==='SW') arrowDeg=45; else if (d==='W') arrowDeg=90; else if (d==='NW') arrowDeg=135;
              }
              const triSize = showText ? '8px' : '5px';
              const triTop = showText ? '-12px' : '-8px';
              
              htmlContent = `
                <div style="position: relative; width: 100%; height: 100%; transform: rotate(${arrowDeg}deg);">
                   <div style="position: absolute; top: ${triTop}; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: ${triSize} solid transparent; border-right: ${triSize} solid transparent; border-bottom: ${showText?'14px':'10px'} solid ${circleColor};"></div>
                   <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: ${circleColor}; border-radius: 50%; border: 2px solid #fff; transform: rotate(-${arrowDeg}deg); display: flex; align-items: center; justify-content: center; color: ${numColor}; font-weight: 900; font-size: ${fontSize}; box-shadow: 0 0 10px rgba(0,0,0,0.3);">
                      ${showText ? valToShow : ''}
                   </div>
                </div>
              `;
            } else {
              htmlContent = showText
                ? `<div style="background-color: ${circleColor}; color: ${numColor}; width: 100%; height: 100%; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: ${fontSize}; font-family: 'Kanit', sans-serif; border: 2px solid #fff; box-shadow: 0 0 10px rgba(0,0,0,0.3);">${valToShow}</div>`
                : `<div style="background-color: ${circleColor}; width: 100%; height: 100%; border-radius: 50%; border: ${isSelected?'3px':'2px'} solid #fff; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>`;
            }

            const dynamicIcon = L.divIcon({ html: htmlContent, className: 'custom-div-icon', iconSize: [size, size], iconAnchor: [size/2, size/2] });

            return (
              <Marker key={st.stationID} position={[lat, lon]} icon={dynamicIcon} eventHandlers={{ click: () => setSelectedStation(st) }}>
                <Tooltip direction="top" offset={[0, -(size/2)]} opacity={1} permanent={false}>
                  <div style={{ textAlign: 'center', fontWeight: 'bold', fontFamily: 'Kanit' }}>
                    <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{extractDistrict(st.areaTH)}, {extractProvince(st.areaTH)}</div>
                    <div style={{ fontSize: '1.1rem' }}>{valToShow} <span style={{fontSize: '0.7rem'}}>{modes.find(m => m.id === activeMode)?.unit}</span></div>
                  </div>
                </Tooltip>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* 🎛️ ตัวกรองสถานที่ (ซ้ายบน) ลอยน้ำ */}
      <div style={{ position: 'absolute', top: isMobile ? 15 : 20, left: isMobile ? 15 : 20, zIndex: 1000, pointerEvents: 'none', maxWidth: 'calc(100% - 100px)' }}>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', pointerEvents: 'auto', paddingBottom: '5px' }} className="hide-scrollbar">
          <div style={{ background: cardBg, backdropFilter: 'blur(15px)', borderRadius: '50px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
            <span>📍</span>
            <select value={selectedProv} onChange={e => { setSelectedProv(e.target.value); setSelectedDistrict(''); }} style={{ background: 'transparent', color: textColor, border: 'none', fontWeight: 'bold', fontSize: '0.9rem', outline: 'none', cursor: 'pointer' }}>
              <option value="">เลือกจังหวัด</option>{allProvinces.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div style={{ background: cardBg, backdropFilter: 'blur(15px)', borderRadius: '50px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
            <span>🏙️</span>
            <select value={selectedDistrict} onChange={e => setSelectedDistrict(e.target.value)} style={{ background: 'transparent', color: textColor, border: 'none', fontWeight: 'bold', fontSize: '0.9rem', outline: 'none', cursor: 'pointer' }}>
              <option value="">เลือกอำเภอ</option>{availableDistricts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* 🎛️ โหมดแผนที่ (ซ้ายบน ถัดลงมา) เอาพื้นหลังขาวออก! */}
      <div style={{ position: 'absolute', top: isMobile ? 65 : 70, left: isMobile ? 15 : 20, right: isMobile ? 15 : 20, zIndex: 1000, pointerEvents: 'none' }}>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', pointerEvents: 'auto' }} className="hide-scrollbar">
          {modes.map(mode => {
            const isActive = activeMode === mode.id;
            return (
              <button 
                key={mode.id} onClick={() => setActiveMode(mode.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '50px', border: 'none', flexShrink: 0, background: isActive ? mode.color : cardBg, color: isActive ? '#fff' : textColor, fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(15px)', boxShadow: isActive ? `0 4px 15px ${mode.color}60` : '0 4px 15px rgba(0,0,0,0.1)' }}>
                <span style={{ fontSize: '1.1rem' }}>{mode.icon}</span>{mode.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 🌟 ปุ่มเปลี่ยนโหมดแผนที่ (ขวาบน) */}
      <div style={{ position: 'absolute', top: isMobile ? 115 : 20, right: isMobile ? 15 : 20, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button onClick={() => setMapStyle('standard')} style={{ background: cardBg, color: textColor, border: `1px solid ${borderColor}`, padding: '8px 12px', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 'bold' }}>🗺️ ปกติ</button>
        <button onClick={() => setMapStyle('dark')} style={{ background: cardBg, color: textColor, border: `1px solid ${borderColor}`, padding: '8px 12px', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 'bold' }}>🌙 มืด</button>
        <button onClick={() => setMapStyle('satellite')} style={{ background: cardBg, color: textColor, border: `1px solid ${borderColor}`, padding: '8px 12px', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 'bold' }}>🛰️ ดาวเทียม</button>
      </div>

      {/* 🌟 Legend กล่องอธิบายสี */}
      <div style={{ position: 'absolute', bottom: isMobile ? (isMobileCardOpen ? '380px' : '90px') : '30px', left: isMobile ? '15px' : '30px', zIndex: 1000, background: cardBg, padding: '12px 20px', borderRadius: '16px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', transition: 'bottom 0.3s' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: textColor, marginBottom: '8px' }}>ระดับสี ({modes.find(m => m.id === activeMode)?.label})</div>
        <div style={{ display: 'flex', gap: '2px', height: '12px', width: '180px', borderRadius: '6px', overflow: 'hidden' }}>
          {activeMode === 'pm25' && <><div style={{flex:1, background:'#00e400'}}></div><div style={{flex:1, background:'#ffff00'}}></div><div style={{flex:1, background:'#ff7e00'}}></div><div style={{flex:1, background:'#ff0000'}}></div><div style={{flex:1, background:'#8f3f97'}}></div><div style={{flex:1, background:'#7e0023'}}></div></>}
          {activeMode === 'heat' && <><div style={{flex:1, background:'#22c55e'}}></div><div style={{flex:1, background:'#eab308'}}></div><div style={{flex:1, background:'#f97316'}}></div><div style={{flex:1, background:'#ef4444'}}></div></>}
          {activeMode === 'temp' && <><div style={{flex:1, background:'#3b82f6'}}></div><div style={{flex:1, background:'#22c55e'}}></div><div style={{flex:1, background:'#f97316'}}></div><div style={{flex:1, background:'#ef4444'}}></div></>}
          {activeMode === 'rain' && <><div style={{flex:1, background:'#e0f2fe'}}></div><div style={{flex:1, background:'#93c5fd'}}></div><div style={{flex:1, background:'#3b82f6'}}></div><div style={{flex:1, background:'#1e3a8a'}}></div></>}
          {activeMode === 'humidity' && <><div style={{flex:1, background:'#a7f3d0'}}></div><div style={{flex:1, background:'#34d399'}}></div><div style={{flex:1, background:'#059669'}}></div><div style={{flex:1, background:'#064e3b'}}></div></>}
          {activeMode === 'wind' && <><div style={{flex:1, background:'#fbcfe8'}}></div><div style={{flex:1, background:'#f472b6'}}></div><div style={{flex:1, background:'#db2777'}}></div><div style={{flex:1, background:'#831843'}}></div></>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: subTextColor, marginTop: '4px', fontWeight: 'bold' }}>
          <span>ปลอดภัย</span><span>อันตราย</span>
        </div>
      </div>

      {/* 📱 ปุ่ม Toggle ในมือถือ */}
      {isMobile && selectedStation && (
        <div style={{ position: 'absolute', bottom: isMobileCardOpen ? '320px' : '90px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, transition: 'bottom 0.3s' }}>
          <button onClick={() => setIsMobileCardOpen(!isMobileCardOpen)} style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '50px', padding: '12px 25px', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 10px 25px rgba(14,165,233,0.4)' }}>
            {isMobileCardOpen ? <><span style={{ fontSize: '1.2rem' }}>⬇️</span> ปิดการ์ด</> : <><span style={{ fontSize: '1.2rem' }}>📊</span> ดูรายละเอียด</>}
          </button>
        </div>
      )}

      {/* 📋 การ์ดแสดงข้อมูลสถานี */}
      {selectedStation && (
        <div style={{ 
          position: 'absolute', zIndex: 1000, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          ...(isMobile 
            ? { bottom: isMobileCardOpen ? '0' : '-100%', left: 0, right: 0, borderTopLeftRadius: '30px', borderTopRightRadius: '30px', paddingBottom: '90px', maxHeight: '60vh' } 
            : { top: '20px', right: '120px', width: '340px', borderRadius: '24px', maxHeight: 'calc(100vh - 40px)' }), 
          background: cardBg, backdropFilter: 'blur(20px)', border: `1px solid ${borderColor}`, padding: '25px 20px', boxShadow: '0 -10px 40px rgba(0,0,0,0.15)', overflowY: 'auto'
        }} className="hide-scrollbar">
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#0ea5e9', fontWeight: 'bold', marginBottom: '4px' }}>📍 {extractDistrict(selectedStation.areaTH)}, {extractProvince(selectedStation.areaTH)}</div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: textColor, lineHeight: 1.3 }}>{formatAreaName(selectedStation.areaTH)}</h3>
            </div>
            {!isMobile && <button onClick={() => setSelectedStation(null)} style={{ background: innerCardBg, border: 'none', width: '32px', height: '32px', borderRadius: '50%', color: subTextColor, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✖</button>}
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
              { label: 'ลม', val: tObj.windSpeed != null ? Math.round(tObj.windSpeed) : '-', unit: 'km/h', icon: '🌬️', color: getWindColor(tObj.windSpeed) },
            ];

            return (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {gridItems.map((item, idx) => (
                  <div key={idx} style={{ background: innerCardBg, padding: '15px', borderRadius: '16px', border: `1px solid ${borderColor}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}><span style={{ fontSize: '1.2rem' }}>{item.icon}</span><span style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold' }}>{item.label}</span></div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '900', color: item.color === '#94a3b8' ? textColor : item.color, lineHeight: 1 }}>{item.val} <span style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'normal' }}>{item.unit}</span></div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}