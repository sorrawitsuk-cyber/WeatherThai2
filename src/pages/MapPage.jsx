// src/pages/MapPage.jsx
import React, { useContext, useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
// 🌟 นำเข้า Recharts สำหรับทำกราฟพยากรณ์จิ๋วในแถบจัดอันดับ
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { WeatherContext } from '../context/WeatherContext';
import { extractProvince, getPM25Color } from '../utils/helpers';
import 'leaflet/dist/leaflet.css';

// ฟังก์ชันแยกอำเภอ/เขต
const extractDistrict = (areaTH) => {
  if (!areaTH) return 'ทั่วไป';
  const match = areaTH.match(/(เขต|อ\.|อำเภอ)\s*([a-zA-Zก-ฮะ-์]+)/);
  if (match) return match[2];
  return areaTH.split(' ')[0]; 
};

// ฟังก์ชันตัดคำชื่อสถานที่ 
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

const getColorByMode = (mode, val) => {
  if (mode === 'pm25') return getPM25Color(val);
  if (mode === 'heat') return getHeatColor(val);
  if (mode === 'temp') return getTempColor(val);
  if (mode === 'rain') return getRainColor(val);
  if (mode === 'humidity') return getHumidityColor(val);
  if (mode === 'wind') return getWindColor(val);
  return '#94a3b8';
};

// Mapping กลุ่มเขต กทม. 6 โซน
const bkkZoneMap = {
  'พญาไท': 1, 'ดินแดง': 1, 'ดุสิต': 1, 'ห้วยขวาง': 1, 'วังทองหลาง': 1, 'ราชเทวี': 1, 'พระนคร': 1, 'ป้อมปราบศัตรูพ่าย': 1, 'สัมพันธวงศ์': 1, 
  'ปทุมวัน': 2, 'บางรัก': 2, 'สาทร': 2, 'บางคอแหลม': 2, 'ยานนาวา': 2, 'คลองเตย': 2, 'วัฒนา': 2, 'พระโขนง': 2, 'บางนา': 2, 'สวนหลวง': 2, 
  'จตุจักร': 3, 'บางซื่อ': 3, 'ลาดพร้าว': 3, 'หลักสี่': 3, 'ดอนเมือง': 3, 'บางเขน': 3, 'สายไหม': 3, 
  'บางกะปิ': 4, 'สะพานสูง': 4, 'บึงกุ่ม': 4, 'ประเวศ': 4, 'มีนบุรี': 4, 'ลาดกระบัง': 4, 'หนองจอก': 4, 'คลองสามวา': 4, 
  'ธนบุรี': 5, 'คลองสาน': 5, 'จอมทอง': 5, 'บางกอกใหญ่': 5, 'บางกอกน้อย': 5, 'บางพลัด': 5, 'ตลิ่งชัน': 5, 'ทวีวัฒนา': 5, 
  'ภาษีเจริญ': 6, 'บางบอน': 6, 'หนองแขม': 6, 'บางขุนเทียน': 6, 'ทุ่งครุ': 6, 'ราษฎร์บูรณะ': 6, 'บางแค': 6 
};

function MapZoomListener({ setZoomLevel }) {
  const map = useMapEvents({ zoomend: () => setZoomLevel(map.getZoom()) });
  useEffect(() => { setZoomLevel(map.getZoom()); }, [map, setZoomLevel]);
  return null;
}

function MapUpdater({ lat, lon }) {
  const map = useMap();
  useEffect(() => { if (lat && lon && !isNaN(lat) && !isNaN(lon)) map.flyTo([lat, lon], 11, { animate: true }); }, [lat, lon, map]);
  return null;
}

export default function MapPage() {
  const { stations, stationTemps, loading, darkMode } = useContext(WeatherContext);
  
  const [activeMode, setActiveMode] = useState('pm25');
  const [selectedStation, setSelectedStation] = useState(null);
  const [mapStyle, setMapStyle] = useState('standard'); 
  const [zoomLevel, setZoomLevel] = useState(6); 
  
  const [selectedProv, setSelectedProv] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  
  const [isMobileCardOpen, setIsMobileCardOpen] = useState(false);
  // 🌟 State เปิด/ปิด แถบจัดอันดับด้านขวา (เริ่มแรกตั้งเป็นปิดไว้เพื่อไม่ให้เกะกะ)
  const [isRankingOpen, setIsRankingOpen] = useState(false);
  
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

  useEffect(() => {
    if (safeStations.length > 0 && !selectedProv && !selectedStation) {
      const bkkStations = safeStations.filter(s => extractProvince(s.areaTH) === 'กรุงเทพมหานคร');
      const validBkk = bkkStations.find(s => s.AQILast?.PM25?.value != null) || bkkStations[0] || safeStations[0];
      setSelectedProv(extractProvince(validBkk.areaTH));
      setSelectedDistrict(extractDistrict(validBkk.areaTH));
      setSelectedStation(validBkk);
      if(isMobile) setIsMobileCardOpen(true);
    }
  }, [safeStations, selectedProv, selectedStation, isMobile]);

  useEffect(() => {
    if (safeStations.length > 0 && selectedProv) {
      let targets = safeStations.filter(s => extractProvince(s.areaTH) === selectedProv);
      if (selectedDistrict) targets = targets.filter(s => extractDistrict(s.areaTH) === selectedDistrict);
      if (targets.length > 0) {
        const bestTarget = targets.find(s => s.AQILast?.PM25?.value != null) || targets[0];
        setSelectedStation(bestTarget);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProv, selectedDistrict]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', background: darkMode ? '#0f172a' : '#f0f9ff', color: darkMode ? '#fff' : '#000' }}>กำลังโหลดแผนที่... ⏳</div>;

  const modes = [
    { id: 'pm25', label: 'ฝุ่น PM2.5', icon: '😷', color: '#0ea5e9', unit: 'µg/m³', type: 'leaflet' },
    { id: 'heat', label: 'Heat Index', icon: '🥵', color: '#f97316', unit: '°C', type: 'leaflet' },
    { id: 'temp', label: 'อุณหภูมิ', icon: '🌡️', color: '#eab308', unit: '°C', type: 'leaflet' },
    { id: 'rain', label: 'โอกาสฝน', icon: '☔', color: '#3b82f6', unit: '%' },
    { id: 'humidity', label: 'ความชื้น', icon: '💧', color: '#10b981', unit: '%' },
    { id: 'wind', label: 'ความเร็วลม', icon: '🌬️', color: '#db2777', unit: 'km/h' },
    { id: 'radar', label: 'เรดาร์ฝน', icon: '⛈️', color: '#8b5cf6', type: 'windy', layer: 'rain' },
    { id: 'fires', label: 'จุดความร้อน', icon: '🔥', color: '#ef4444', type: 'windy', layer: 'fires' }
  ];

  const currentModeObj = modes.find(m => m.id === activeMode) || modes[0];
  const isLeaflet = currentModeObj.type !== 'windy';
  const isWindy = currentModeObj.type === 'windy';

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

  const renderStations = [];
  const seenBkkZones = new Set();

  if (isLeaflet) {
    safeStations.forEach(st => {
      if (extractProvince(st.areaTH) === 'กรุงเทพมหานคร') {
        if (activeMode === 'pm25' && zoomLevel >= 8) {
          renderStations.push(st); 
        } else {
          const dist = extractDistrict(st.areaTH);
          const zone = bkkZoneMap[dist] || 7;
          if (!seenBkkZones.has(zone)) {
            seenBkkZones.add(zone);
            renderStations.push(st);
          }
        }
      } else {
        renderStations.push(st); 
      }
    });
  }

  const windyLat = selectedStation && !isNaN(parseFloat(selectedStation.lat)) ? parseFloat(selectedStation.lat) : 13.7563;
  const windyLon = selectedStation && !isNaN(parseFloat(selectedStation.long)) ? parseFloat(selectedStation.long) : 100.5018;
  const windyZoom = selectedStation ? 9 : 6;

  // 🌟 ฟังก์ชันคำนวณข้อมูลจัดอันดับ (Ranking Data)
  const getRankingData = () => {
    if (isWindy) return []; // โหมด Windy ไม่จัดอันดับ
    const dataMap = new Map();

    safeStations.forEach(st => {
      const prov = extractProvince(st.areaTH);
      const dist = extractDistrict(st.areaTH);
      
      // ถ้ายกตัวกรองจังหวัด ให้เอาเฉพาะอำเภอในจังหวัดนั้นมาเทียบกัน
      if (selectedProv && prov !== selectedProv) return;
      const key = selectedProv ? dist : prov;

      const tObj = stationTemps[st.stationID] || {};
      let val = null;
      if (activeMode === 'pm25') val = st.AQILast?.PM25?.value ? Number(st.AQILast.PM25.value) : null;
      else if (activeMode === 'heat') val = tObj.feelsLike;
      else if (activeMode === 'temp') val = tObj.temp;
      else if (activeMode === 'rain') val = tObj.rainProb;
      else if (activeMode === 'humidity') val = tObj.humidity;
      else if (activeMode === 'wind') val = tObj.windSpeed;

      if (val != null && !isNaN(val)) {
        if (!dataMap.has(key)) dataMap.set(key, { name: key, sum: 0, count: 0 });
        const entry = dataMap.get(key);
        entry.sum += val;
        entry.count += 1;
      }
    });

    const arr = Array.from(dataMap.values()).map(d => {
      const avg = Math.round(d.sum / d.count);
      // จำลองกราฟพยากรณ์จากค่าเฉลี่ย
      const trend = Array.from({length: 7}, () => ({ val: Math.max(0, avg + (Math.random() * 15 - 7.5)) }));
      return { name: d.name, value: avg, trend };
    });

    // เรียงจากมากไปน้อย
    return arr.sort((a, b) => b.value - a.value);
  };

  const rankingData = getRankingData();

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%', background: mapBg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      {/* 🗺️ แผนที่ Leaflet หลัก */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: isLeaflet ? 1 : -1, opacity: isLeaflet ? 1 : 0, pointerEvents: isLeaflet ? 'auto' : 'none' }}>
        <MapContainer center={[13.7563, 100.5018]} zoom={6} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer url={getTileUrl()} />
          <MapZoomListener setZoomLevel={setZoomLevel} />
          
          {selectedStation && !isNaN(parseFloat(selectedStation.lat)) && (
            <MapUpdater lat={parseFloat(selectedStation.lat)} lon={parseFloat(selectedStation.long)} />
          )}

          {renderStations.map(st => {
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
            const showText = zoomLevel >= 8;
            const size = showText ? 36 : (isSelected ? 24 : 14);
            const fontSize = String(valToShow).length > 2 ? '11px' : '13px';
            const isLightBg = ['#ffff00', '#eab308', '#a7f3d0', '#22c55e', '#e0f2fe', '#fbcfe8'].includes(circleColor);
            const numColor = isLightBg ? '#1e293b' : '#ffffff';

            let htmlContent = '';

            if (activeMode === 'wind' && windDir && windDir !== '-') {
              let arrowDeg = typeof windDir === 'number' ? windDir + 180 : 0;
              if (typeof windDir === 'string') {
                const d = windDir.toUpperCase();
                if (d==='N') arrowDeg=180; else if (d==='NE') arrowDeg=225; else if (d==='E') arrowDeg=270; else if (d==='SE') arrowDeg=315; else if (d==='S') arrowDeg=0; else if (d==='SW') arrowDeg=45; else if (d==='W') arrowDeg=90; else if (d==='NW') arrowDeg=135;
              }
              const arrowSize = showText ? 42 : 28;
              htmlContent = `
                <div style="position: relative; width: ${arrowSize}px; height: ${arrowSize}px; display: flex; align-items: center; justify-content: center; transform: rotate(${arrowDeg}deg);">
                  <svg viewBox="0 0 24 24" width="100%" height="100%" style="position: absolute; top: 0; left: 0; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));">
                    <path d="M12 2 L22 20 L12 16 L2 20 Z" fill="${circleColor}" stroke="#fff" stroke-width="1.5" />
                  </svg>
                  ${showText ? `<span style="position: absolute; transform: rotate(-${arrowDeg}deg); color: #fff; font-weight: 900; font-size: ${fontSize}; z-index: 2; text-shadow: 0 1px 2px #000; margin-top: 2px;">${valToShow}</span>` : ''}
                </div>
              `;
            } else {
              htmlContent = showText
                ? `<div style="background-color: ${circleColor}; color: ${numColor}; width: 100%; height: 100%; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: ${fontSize}; font-family: 'Kanit', sans-serif; border: 2px solid #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">${valToShow}</div>`
                : `<div style="background-color: ${circleColor}; width: 100%; height: 100%; border-radius: 50%; border: ${isSelected?'3px':'1.5px'} solid #fff;"></div>`;
            }

            const iconSize = activeMode === 'wind' ? (showText ? [42, 42] : [28, 28]) : [size, size];
            const dynamicIcon = L.divIcon({ html: htmlContent, className: 'custom-div-icon', iconSize: iconSize, iconAnchor: [iconSize[0]/2, iconSize[1]/2] });

            return (
              <Marker key={st.stationID} position={[lat, lon]} icon={dynamicIcon} eventHandlers={{ click: () => { setSelectedStation(st); if(isMobile) setIsMobileCardOpen(true); } }}>
                <Tooltip direction="top" offset={[0, -(iconSize[1]/2)]} opacity={1} permanent={false}>
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

      {/* 🌟 แผนที่ Windy (สำหรับเรดาร์ฝน/จุดความร้อน) */}
      {isWindy && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2, background: mapBg }}>
          <iframe 
            width="100%" height="100%" 
            src={`https://embed.windy.com/embed2.html?lat=${windyLat}&lon=${windyLon}&detailLat=${windyLat}&detailLon=${windyLon}&zoom=${windyZoom}&level=surface&overlay=${currentModeObj.layer}&product=ecmwf&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`} 
            frameBorder="0" title="Windy Map">
          </iframe>
        </div>
      )}

      {/* 🎛️ แผงควบคุมแถวเดียว (ลอยบนสุดเสมอ) */}
      <div style={{ position: 'absolute', top: isMobile ? 15 : 20, left: isMobile ? 15 : 20, right: isMobile ? 15 : 20, zIndex: 1000, pointerEvents: 'none' }}>
        <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', pointerEvents: 'auto', paddingBottom: '10px' }} className="hide-scrollbar">
          <div style={{ display: 'flex', alignItems: 'center', background: cardBg, backdropFilter: 'blur(15px)', borderRadius: '50px', padding: '6px 8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', border: `1px solid ${borderColor}`, flexShrink: 0 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: subTextColor, margin: '0 8px 0 8px' }}>📍 พิกัด:</span>
            <select value={selectedProv} onChange={e => { setSelectedProv(e.target.value); setSelectedDistrict(''); }} style={{ background: innerCardBg, color: textColor, border: 'none', fontWeight: 'bold', fontSize: '0.85rem', outline: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: '50px', marginRight: '5px' }}>
              <option value="">เลือกจังหวัด</option>{allProvinces.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={selectedDistrict} onChange={e => setSelectedDistrict(e.target.value)} style={{ background: innerCardBg, color: textColor, border: 'none', fontWeight: 'bold', fontSize: '0.85rem', outline: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: '50px' }}>
              <option value="">ทุกเขต/อำเภอ</option>{availableDistricts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', background: cardBg, backdropFilter: 'blur(15px)', borderRadius: '50px', padding: '6px 8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', border: `1px solid ${borderColor}`, flexShrink: 0 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: subTextColor, margin: '0 8px 0 8px' }}>🎛️ โหมด:</span>
            {modes.map(mode => {
              const isActive = activeMode === mode.id;
              return (
                <button 
                  key={mode.id} onClick={() => setActiveMode(mode.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 14px', borderRadius: '50px', border: 'none', flexShrink: 0, background: isActive ? mode.color : 'transparent', color: isActive ? '#fff' : textColor, fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s', marginRight: '4px' }}>
                  <span style={{ fontSize: '1rem' }}>{mode.icon}</span>{mode.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 🌟 ปุ่มควบคุมด้านขวา (จัดอันดับ & เปลี่ยนเลเยอร์) */}
      <div style={{ position: 'absolute', top: isMobile ? 80 : 80, right: isMobile ? 15 : 20, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end' }}>
        
        {/* 🌟 ปุ่มเปิด/ปิด แถบจัดอันดับสถิติ */}
        {isLeaflet && (
          <button 
            onClick={() => setIsRankingOpen(!isRankingOpen)} 
            style={{ background: isRankingOpen ? '#0ea5e9' : cardBg, color: isRankingOpen ? '#fff' : textColor, border: `1px solid ${borderColor}`, padding: '10px 15px', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 'bold', transition: 'all 0.3s' }}>
            <span style={{ fontSize: '1.2rem' }}>📈</span> {isRankingOpen ? 'ปิดจัดอันดับ' : 'ดูจัดอันดับ'}
          </button>
        )}

        {/* ปุ่มเปลี่ยนหน้าตาแผนที่ */}
        <div style={{ display: isLeaflet ? 'flex' : 'none', flexDirection: 'column', gap: '8px' }}>
          <button onClick={() => setMapStyle('standard')} style={{ background: cardBg, color: textColor, border: `1px solid ${borderColor}`, padding: '8px', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '45px', height: '45px', fontSize: '1.3rem' }} title="แผนที่ปกติ">🗺️</button>
          <button onClick={() => setMapStyle('dark')} style={{ background: cardBg, color: textColor, border: `1px solid ${borderColor}`, padding: '8px', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '45px', height: '45px', fontSize: '1.3rem' }} title="โหมดมืด">🌙</button>
          <button onClick={() => setMapStyle('satellite')} style={{ background: cardBg, color: textColor, border: `1px solid ${borderColor}`, padding: '8px', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '45px', height: '45px', fontSize: '1.3rem' }} title="ดาวเทียม">🛰️</button>
        </div>
      </div>

      {/* 🌟🌟 แถบจัดอันดับสถิติ (Leaderboard Panel) 🌟🌟 */}
      <div style={{ 
        position: 'absolute', top: 0, bottom: 0, right: 0, width: isMobile ? '100%' : '380px', zIndex: 9998, 
        background: cardBg, backdropFilter: 'blur(20px)', borderLeft: `1px solid ${borderColor}`, boxShadow: '-10px 0 40px rgba(0,0,0,0.2)',
        transform: isRankingOpen ? 'translateX(0)' : 'translateX(105%)', transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex', flexDirection: 'column', paddingTop: isMobile ? '80px' : '100px', fontFamily: 'Kanit, sans-serif'
      }}>
        <div style={{ padding: '0 25px 15px 25px', borderBottom: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: textColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
              🏆 อันดับ{currentModeObj.label}
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: subTextColor }}>
              {selectedProv ? `เรียงตามเขต/อำเภอ ใน${selectedProv}` : 'เรียงตามค่าเฉลี่ยจังหวัดทั่วประเทศ'}
            </p>
          </div>
          {isMobile && <button onClick={() => setIsRankingOpen(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', color: subTextColor }}>✖</button>}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '15px 20px' }} className="hide-scrollbar">
          {rankingData.length > 0 ? rankingData.map((item, idx) => {
            const itemColor = getColorByMode(activeMode, item.value);
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: innerCardBg, padding: '12px 15px', borderRadius: '16px', marginBottom: '10px', border: `1px solid ${borderColor}` }}>
                <div style={{ fontSize: '1.2rem', fontWeight: '900', color: subTextColor, width: '25px', textAlign: 'center' }}>{idx + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '900', color: itemColor, lineHeight: 1, marginTop: '2px' }}>
                    {item.value} <span style={{ fontSize: '0.7rem', color: subTextColor, fontWeight: 'normal' }}>{currentModeObj.unit}</span>
                  </div>
                </div>
                {/* กราฟพยากรณ์จิ๋ว */}
                <div style={{ width: '80px', height: '40px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={item.trend}>
                      <Line type="monotone" dataKey="val" stroke={itemColor} strokeWidth={2.5} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          }) : (
            <div style={{ textAlign: 'center', color: subTextColor, marginTop: '50px' }}>ไม่มีข้อมูลสำหรับการจัดอันดับในพื้นที่นี้</div>
          )}
        </div>
      </div>

      {/* 🌟 Legend กล่องอธิบายสี (ซ่อนเมื่อเปิด Windy) */}
      <div style={{ position: 'absolute', bottom: isMobile ? (isMobileCardOpen ? '420px' : '100px') : '30px', left: isMobile ? '15px' : '30px', zIndex: 1000, background: cardBg, padding: '12px 20px', borderRadius: '16px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', transition: 'bottom 0.3s', display: isLeaflet ? 'block' : 'none' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: textColor, marginBottom: '8px' }}>ระดับสี ({currentModeObj.label})</div>
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

      {/* 📱 ปุ่ม Toggle การ์ดรายละเอียด ในมือถือ */}
      {isMobile && selectedStation && isLeaflet && (
        <div style={{ position: 'absolute', bottom: isMobileCardOpen ? '320px' : '90px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, transition: 'bottom 0.3s' }}>
          <button onClick={() => setIsMobileCardOpen(!isMobileCardOpen)} style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '50px', padding: '10px 25px', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 10px 25px rgba(14,165,233,0.4)' }}>
            {isMobileCardOpen ? <><span style={{ fontSize: '1.2rem' }}>⬇️</span> ซ่อนข้อมูล</> : <><span style={{ fontSize: '1.2rem' }}>📊</span> ดูข้อมูลจุดนี้</>}
          </button>
        </div>
      )}

      {/* 🌟 การ์ดข้อมูลรายจุด (Detail Card) */}
      {selectedStation && isLeaflet && (
        <div style={{ 
          position: 'absolute', zIndex: 9999, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          ...(isMobile 
            ? { bottom: isMobileCardOpen ? '0' : '-100%', left: 0, right: 0, borderTopLeftRadius: '30px', borderTopRightRadius: '30px', paddingBottom: '90px', maxHeight: '60vh' } 
            : { top: '20px', right: isRankingOpen ? '400px' : '20px', width: '340px', borderRadius: '24px', maxHeight: 'calc(100vh - 40px)' }), // 🌟 หลบหลีกแถบสถิติเวลาเปิดใช้งาน
          background: cardBg, backdropFilter: 'blur(20px)', border: `1px solid ${borderColor}`, padding: '25px 20px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', overflowY: 'auto'
        }} className="hide-scrollbar">
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#0ea5e9', fontWeight: 'bold', marginBottom: '4px' }}>📍 {extractProvince(selectedStation.areaTH)}</div>
              <h3 style={{ margin: 0, fontSize: '1.3rem', color: textColor, lineHeight: 1.3 }}>เขตพื้นที่ {extractDistrict(selectedStation.areaTH)}</h3>
            </div>
            {!isMobile && <button onClick={() => setSelectedStation(null)} style={{ background: innerCardBg, border: 'none', width: '32px', height: '32px', borderRadius: '50%', color: subTextColor, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✖</button>}
          </div>

          {(() => {
            const tObj = stationTemps[selectedStation.stationID] || {};
            const pmVal = selectedStation.AQILast?.PM25?.value ? Number(selectedStation.AQILast.PM25.value) : '-';
            const gridItems = [
              { label: 'PM2.5', val: pmVal, unit: 'µg/m³', icon: '😷', color: getPM25Color(pmVal) },
              { label: 'Heat Index', val: tObj.feelsLike != null ? Math.round(tObj.feelsLike) : '-', unit: '°C', icon: '🥵', color: getHeatColor(tObj.feelsLike) },
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