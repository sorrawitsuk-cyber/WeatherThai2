// src/pages/MapPage.jsx
import React, { useContext, useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, Popup, WMSTileLayer, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { WeatherContext } from '../context/WeatherContext';
import { extractProvince, getPM25Color } from '../utils/helpers';
import 'leaflet/dist/leaflet.css';

// 🌟 ดึง API Key จาก Vercel
const NASA_API_KEY = import.meta.env.VITE_NASA_API_KEY || ''; 
const THAILAND_BOUNDS = [13.5, 101.5];

// ฟังก์ชันหาพิกัดระยะห่าง
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

const extractDistrict = (areaTH) => {
  if (!areaTH) return 'ทั่วไป';
  const match = areaTH.match(/(เขต|อ\.|อำเภอ)\s*([a-zA-Zก-ฮะ-์]+)/);
  if (match) return match[2];
  return areaTH.split(' ')[0]; 
};

// ฟังก์ชันสี
const getReadableTextColor = (color, darkMode) => {
  if (!darkMode) {
    if (color === '#ffff00' || color === '#eab308') return '#ca8a04';
    if (color === '#00e400') return '#16a34a';
  } else {
    if (color === '#ffff00' || color === '#eab308') return '#fde047';
    if (color === '#00e400') return '#4ade80';
    if (color === '#e0f2fe') return '#60a5fa';
  }
  return color === '#94a3b8' ? (darkMode ? '#f8fafc' : '#0f172a') : color;
};

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

// ข้อมูล 6 โซน กทม.
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
  // 1. Context & State
  const { stations, stationTemps, loading, darkMode } = useContext(WeatherContext);
  const [activeMode, setActiveMode] = useState('pm25');
  const [mapStyle, setMapStyle] = useState('standard'); 
  const [zoomLevel, setZoomLevel] = useState(6); 
  const [selectedStation, setSelectedStation] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [selectedProv, setSelectedProv] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [isRankingOpen, setIsRankingOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [realHotspots, setRealHotspots] = useState([]);

  // 2. ข้อมูลตั้งต้น (ย้ายขึ้นมาก่อน return)
  const safeStations = stations || [];
  const allProvinces = useMemo(() => [...new Set(safeStations.map(s => extractProvince(s.areaTH)))].sort((a, b) => a.localeCompare(b, 'th')), [safeStations]);
  const availableDistricts = useMemo(() => [...new Set(safeStations.filter(s => extractProvince(s.areaTH) === selectedProv).map(s => extractDistrict(s.areaTH)))].sort(), [safeStations, selectedProv]);

  const modes = [
    { id: 'pm25', label: 'ฝุ่น PM2.5', icon: '😷', color: '#0ea5e9', unit: 'µg/m³', type: 'leaflet' },
    { id: 'heat', label: 'Heat Index', icon: '🥵', color: '#f97316', unit: '°C', type: 'leaflet' },
    { id: 'temp', label: 'อุณหภูมิ', icon: '🌡️', color: '#eab308', unit: '°C', type: 'leaflet' },
    { id: 'rain', label: 'โอกาสฝน', icon: '☔', color: '#3b82f6', unit: '%' },
    { id: 'humidity', label: 'ความชื้น', icon: '💧', color: '#10b981', unit: '%' },
    { id: 'wind', label: 'ความเร็วลม', icon: '🌬️', color: '#db2777', unit: 'km/h' },
    { id: 'fires', label: 'จุดความร้อน', icon: '🔥', color: '#ef4444', unit: 'จุด', type: 'leaflet' },
    { id: 'radar', label: 'เรดาร์ฝน', icon: '⛈️', color: '#8b5cf6', type: 'windy', layer: 'rain' }
  ];

  const currentModeObj = modes.find(m => m.id === activeMode) || modes[0];
  const isLeaflet = currentModeObj.type === 'leaflet';
  const isWindy = currentModeObj.type === 'windy';

  // 3. Effects (ทุก Hook ต้องอยู่ก่อน if loading return)
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchHotspotData = async () => {
      try {
        if (NASA_API_KEY && NASA_API_KEY !== '') {
          const response = await fetch(`https://firms.modaps.eosdis.nasa.gov/api/country/csv/${NASA_API_KEY}/VIIRS_SNPP_NRT/THA/1`);
          if (response.ok) {
            const text = await response.text();
            const rows = text.split('\n').slice(1); 
            const points = rows.map(row => {
              const cols = row.split(',');
              if (cols.length >= 2) {
                const lat = parseFloat(cols[0]); const lon = parseFloat(cols[1]);
                let nearestProv = 'ไม่ระบุ', nearestDist = 'ไม่ระบุ', minD = Infinity;
                safeStations.forEach(st => {
                  const d = getDistance(lat, lon, parseFloat(st.lat), parseFloat(st.long));
                  if (d < minD) { minD = d; nearestProv = extractProvince(st.areaTH); nearestDist = extractDistrict(st.areaTH); }
                });
                return { lat, lon, province: nearestProv, district: nearestDist, confidence: cols[6] || 'N/A' };
              }
              return null;
            }).filter(Boolean);
            setRealHotspots(points);
            return;
          }
        }
        
        // Mock data
        const mockPoints = [];
        safeStations.forEach(st => {
          const pm = Number(st.AQILast?.PM25?.value);
          if (pm > 40) {
            const count = Math.floor(pm / 20);
            for(let i=0; i<count; i++) {
              mockPoints.push({
                lat: parseFloat(st.lat) + (Math.random() * 0.1 - 0.05),
                lon: parseFloat(st.long) + (Math.random() * 0.1 - 0.05),
                province: extractProvince(st.areaTH), district: extractDistrict(st.areaTH),
                confidence: Math.floor(Math.random() * 50) + 50
              });
            }
          }
        });
        setRealHotspots(mockPoints);
      } catch (e) { console.error("Hotspot fetch error", e); }
    };

    if (safeStations.length > 0 && realHotspots.length === 0) fetchHotspotData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeStations]);

  const rankingData = useMemo(() => {
    if (isWindy) return [];
    const dataMap = new Map();

    if (activeMode === 'fires') {
      realHotspots.forEach(pt => {
        if (selectedProv && pt.province !== selectedProv) return;
        const key = selectedProv ? pt.district : pt.province;
        if (!dataMap.has(key)) dataMap.set(key, { name: key, value: 0 });
        dataMap.get(key).value += 1;
      });
    } else {
      safeStations.forEach(st => {
        const prov = extractProvince(st.areaTH);
        if (selectedProv && prov !== selectedProv) return;
        const key = selectedProv ? extractDistrict(st.areaTH) : prov;
        const tObj = stationTemps[st.stationID] || {};
        let val = activeMode === 'pm25' ? Number(st.AQILast?.PM25?.value) : (activeMode === 'heat' ? tObj.feelsLike : (activeMode === 'temp' ? tObj.temp : (activeMode === 'rain' ? tObj.rainProb : (activeMode === 'humidity' ? tObj.humidity : tObj.windSpeed))));
        
        if (val != null && !isNaN(val)) {
          if (!dataMap.has(key)) dataMap.set(key, { name: key, sum: 0, count: 0 });
          const entry = dataMap.get(key); entry.sum += val; entry.count += 1;
        }
      });
    }

    return Array.from(dataMap.values())
      .map(d => ({ 
        name: d.name, 
        value: d.value !== undefined ? d.value : Math.round(d.sum / d.count),
        trend: Array.from({length: 7}, () => ({ val: Math.max(0, (d.value || (d.sum/d.count)) + (Math.random() * 20 - 10)) })) 
      }))
      .sort((a, b) => b.value - a.value);
  }, [activeMode, realHotspots, safeStations, stationTemps, selectedProv, isWindy]);

  // 4. 🌟 ป้องกันจอขาว (Early Return ต้องอยู่ตรงนี้เท่านั้น ห้ามมี Hook อีก)
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', background: darkMode ? '#0f172a' : '#f0f9ff', color: darkMode ? '#fff' : '#000' }}>กำลังโหลดแผนที่... ⏳</div>;

  const handleResetView = () => {
    setSelectedProv(''); setSelectedDistrict(''); setSelectedStation(null);
    if (mapInstance) mapInstance.flyTo(THAILAND_BOUNDS, 6, { animate: true }); 
  };

  const handleLocateUser = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude; const lon = pos.coords.longitude;
          if (mapInstance) mapInstance.flyTo([lat, lon], 11, { animate: true });
          
          let nearest = null; let minD = Infinity;
          safeStations.forEach(s => {
            const stLat = parseFloat(s.lat); const stLon = parseFloat(s.long);
            if(!isNaN(stLat) && !isNaN(stLon)){
              const d = getDistance(lat, lon, stLat, stLon);
              if (d < minD) { minD = d; nearest = s; }
            }
          });
          if (nearest) {
            setSelectedProv(extractProvince(nearest.areaTH));
            setSelectedDistrict(extractDistrict(nearest.areaTH));
          }
        },
        () => alert("⚠️ ไม่สามารถเข้าถึงพิกัดได้ กรุณาเปิด GPS"),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  const mapBg = darkMode ? '#0f172a' : '#f8fafc';
  const cardBg = darkMode ? 'rgba(30, 41, 59, 0.98)' : 'rgba(255, 255, 255, 0.98)';
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

  if (isLeaflet && activeMode !== 'fires') {
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

  const windyLat = (mapInstance && mapInstance.getCenter()) ? mapInstance.getCenter().lat : THAILAND_BOUNDS[0];
  const windyLon = (mapInstance && mapInstance.getCenter()) ? mapInstance.getCenter().lng : THAILAND_BOUNDS[1];
  const windyZoom = (mapInstance && mapInstance.getZoom()) ? mapInstance.getZoom() : 6;

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%', background: mapBg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      <style dangerouslySetInlineStyle={{__html: `
        .leaflet-popup-content-wrapper { background: ${cardBg} !important; border-radius: 20px !important; border: 1px solid ${borderColor} !important; box-shadow: 0 10px 30px rgba(0,0,0,0.15) !important; }
        .leaflet-popup-content { color: ${textColor} !important; width: 300px !important; margin: 0 !important; }
        .leaflet-popup-tip { background: ${cardBg} !important; }
        .leaflet-container a.leaflet-popup-close-button { color: ${subTextColor} !important; top: 15px !important; right: 15px !important; font-size: 20px !important; }
        @media (max-width: 768px) { .leaflet-popup-content { width: 280px !important; } }
      `}} />

      {/* 🗺️ แผนที่ Leaflet หลัก */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: isLeaflet ? 1 : -1, opacity: isLeaflet ? 1 : 0, pointerEvents: isLeaflet ? 'auto' : 'none' }}>
        <MapContainer center={THAILAND_BOUNDS} zoom={6} style={{ height: '100%', width: '100%' }} zoomControl={false} ref={setMapInstance}>
          <TileLayer url={getTileUrl()} />
          <MapZoomListener setZoomLevel={setZoomLevel} />

          {/* แสดง WMS ข้อมูลจุดความร้อนจริงทับแผนที่ */}
          {activeMode === 'fires' && (
            <WMSTileLayer url="https://fire.gistda.or.th/cgi-bin/mapserv?map=/v3/hotspot/hotspot_all.map" layers="hotspot_today" format="image/png" transparent={true} version="1.1.1" opacity={0.6} />
          )}

          {/* จุดความร้อน (วงกลมแดงๆ) สำหรับนับแยกรายจุด */}
          {activeMode === 'fires' && realHotspots.map((fire, i) => (
             <CircleMarker key={`fire-${i}`} center={[fire.lat, fire.lon]} radius={4} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.8, weight: 0 }}>
               <Tooltip direction="top">🔥 ความน่าจะเป็น: {fire.confidence}%<br/><span style={{fontSize:'0.75rem'}}>{fire.district}, {fire.province}</span></Tooltip>
             </CircleMarker>
          ))}

          {/* Marker สถานีปกติ */}
          {activeMode !== 'fires' && renderStations.map(st => {
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

            const showText = zoomLevel >= 8;
            const size = showText ? 36 : 16;
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
                  <svg viewBox="0 0 24 24" width="100%" height="100%" style="position: absolute; top: 0; left: 0; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));"><path d="M12 2 L22 20 L12 16 L2 20 Z" fill="${circleColor}" stroke="#fff" stroke-width="1.5" /></svg>
                  ${showText ? `<span style="position: absolute; transform: rotate(-${arrowDeg}deg); color: #fff; font-weight: 900; font-size: ${fontSize}; z-index: 2; text-shadow: 0 1px 2px #000; margin-top: 2px;">${valToShow}</span>` : ''}
                </div>
              `;
            } else {
              htmlContent = showText
                ? `<div style="background-color: ${circleColor}; color: ${numColor}; width: 100%; height: 100%; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: ${fontSize}; font-family: 'Kanit', sans-serif; border: 2px solid #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">${valToShow}</div>`
                : `<div style="background-color: ${circleColor}; width: 100%; height: 100%; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`;
            }

            const iconSize = activeMode === 'wind' ? (showText ? [42, 42] : [28, 28]) : [size, size];
            const dynamicIcon = L.divIcon({ html: htmlContent, className: 'custom-div-icon', iconSize: iconSize, iconAnchor: [iconSize[0]/2, iconSize[1]/2] });

            return (
              <Marker key={st.stationID} position={[lat, lon]} icon={dynamicIcon} eventHandlers={{ click: () => { setSelectedStation(st); if(mapInstance) mapInstance.flyTo([lat, lon], 12); } }}>
                <Tooltip direction="top" offset={[0, -(iconSize[1]/2)]} opacity={1} permanent={false}>
                  <div style={{ textAlign: 'center', fontWeight: 'bold', fontFamily: 'Kanit' }}>
                    <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{extractDistrict(st.areaTH)}, {extractProvince(st.areaTH)}</div>
                    <div style={{ fontSize: '1.1rem' }}>{valToShow} <span style={{fontSize: '0.7rem'}}>{modes.find(m => m.id === activeMode)?.unit}</span></div>
                  </div>
                </Tooltip>
                
                <Popup closeButton={true}>
                  <div style={{ padding: '20px', fontFamily: 'Kanit, sans-serif' }}>
                    <div style={{ marginBottom: '15px' }}>
                      <div style={{ fontSize: '0.8rem', color: '#0ea5e9', fontWeight: 'bold', marginBottom: '2px' }}>📍 {extractProvince(st.areaTH)}</div>
                      <h3 style={{ margin: 0, fontSize: '1.2rem', color: textColor, lineHeight: 1.3 }}>เขตพื้นที่ {extractDistrict(st.areaTH)}</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {[
                        { label: 'PM2.5', val: pmVal != null ? pmVal : '-', unit: 'µg/m³', icon: '😷', color: getPM25Color(pmVal) },
                        { label: 'Heat Index', val: tObj.feelsLike != null ? Math.round(tObj.feelsLike) : '-', unit: '°C', icon: '🥵', color: getHeatColor(tObj.feelsLike) },
                        { label: 'อุณหภูมิ', val: tObj.temp != null ? Math.round(tObj.temp) : '-', unit: '°C', icon: '🌡️', color: getTempColor(tObj.temp) },
                        { label: 'โอกาสฝน', val: tObj.rainProb != null ? Math.round(tObj.rainProb) : '-', unit: '%', icon: '☔', color: getRainColor(tObj.rainProb) },
                        { label: 'ความชื้น', val: tObj.humidity != null ? tObj.humidity : '-', unit: '%', icon: '💧', color: getHumidityColor(tObj.humidity) },
                        { label: 'ลม', val: tObj.windSpeed != null ? Math.round(tObj.windSpeed) : '-', unit: 'km/h', icon: '🌬️', color: getWindColor(tObj.windSpeed) },
                      ].map((item, idx) => (
                        <div key={idx} style={{ background: innerCardBg, padding: '10px 12px', borderRadius: '12px', border: `1px solid ${borderColor}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                            <span style={{ fontSize: '1.1rem' }}>{item.icon}</span><span style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold' }}>{item.label}</span>
                          </div>
                          <div style={{ fontSize: '1.3rem', fontWeight: '900', color: getReadableTextColor(item.color, darkMode), lineHeight: 1 }}>
                            {item.val} <span style={{ fontSize: '0.7rem', color: subTextColor, fontWeight: 'normal' }}>{item.unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* 🌟 แผนที่ Windy */}
      {isWindy && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2, background: mapBg }}>
          <iframe width="100%" height="100%" src={`https://embed.windy.com/embed2.html?lat=${windyLat}&lon=${windyLon}&zoom=${windyZoom}&level=surface&overlay=${currentModeObj.layer}&product=ecmwf&menu=&message=true&marker=true&calendar=now&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`} frameBorder="0" title="Windy Map"></iframe>
        </div>
      )}

      {/* 🎛️ แผงควบคุมแถวเดียวด้านบน (Top Bar) */}
      <div style={{ position: 'absolute', top: isMobile ? 15 : 20, left: isMobile ? 15 : 20, right: isMobile ? 15 : 20, zIndex: 1000, pointerEvents: 'none' }}>
        <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', pointerEvents: 'auto', paddingBottom: '10px' }} className="hide-scrollbar">
          
          <div style={{ display: 'flex', alignItems: 'center', background: cardBg, backdropFilter: 'blur(15px)', borderRadius: '50px', padding: '6px 8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', border: `1px solid ${borderColor}`, flexShrink: 0 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: subTextColor, margin: '0 8px 0 8px' }}>📍 พิกัด:</span>
            <select value={selectedProv} onChange={e => { setSelectedProv(e.target.value); setSelectedDistrict(''); }} style={{ background: innerCardBg, color: textColor, border: 'none', fontWeight: 'bold', fontSize: '0.85rem', outline: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: '50px', marginRight: '5px' }}>
              <option value="">ทุกจังหวัด</option>{allProvinces.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={selectedDistrict} onChange={e => setSelectedDistrict(e.target.value)} style={{ background: innerCardBg, color: textColor, border: 'none', fontWeight: 'bold', fontSize: '0.85rem', outline: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: '50px' }}>
              <option value="">ทุกเขต/อำเภอ</option>{availableDistricts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', background: cardBg, backdropFilter: 'blur(15px)', borderRadius: '50px', padding: '6px 8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', border: `1px solid ${borderColor}`, flexShrink: 0 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: subTextColor, margin: '0 8px 0 8px' }}>🎛️ เลเยอร์:</span>
            {modes.map(mode => (
              <button key={mode.id} onClick={() => setActiveMode(mode.id)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 14px', borderRadius: '50px', border: 'none', flexShrink: 0, background: activeMode === mode.id ? mode.color : 'transparent', color: activeMode === mode.id ? '#fff' : textColor, fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s', marginRight: '4px' }}>
                <span style={{ fontSize: '1rem' }}>{mode.icon}</span>{mode.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 🌟 ปุ่มนำทาง และ จัดอันดับด้านขวา */}
      <div style={{ position: 'absolute', top: isMobile ? 80 : 80, right: isMobile ? 15 : 20, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleResetView} style={{ background: cardBg, color: textColor, border: `1px solid ${borderColor}`, padding: '8px 15px', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', fontWeight: 'bold' }}>🇹🇭 ทั้งประเทศ</button>
          <button onClick={handleLocateUser} style={{ background: '#0ea5e9', color: '#fff', border: `1px solid #0284c7`, padding: '8px 15px', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(14,165,233,0.3)', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', fontWeight: 'bold' }}>🎯 ตำแหน่งฉัน</button>
        </div>
        {isLeaflet && (
          <button onClick={() => setIsRankingOpen(!isRankingOpen)} style={{ background: isRankingOpen ? '#8b5cf6' : cardBg, color: isRankingOpen ? '#fff' : textColor, border: `1px solid ${borderColor}`, padding: '10px 15px', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 'bold', transition: 'all 0.3s' }}>
            <span style={{ fontSize: '1.2rem' }}>📈</span> {isRankingOpen ? 'ซ่อนจัดอันดับ' : 'เปิดจัดอันดับ'}
          </button>
        )}
      </div>

      {/* 🌟 ปุ่มเปลี่ยนหน้าตาแผนที่ (ล่างขวา) */}
      <div style={{ position: 'absolute', bottom: '110px', right: isMobile ? 15 : 20, zIndex: 1000, display: isLeaflet ? 'flex' : 'none', flexDirection: 'column', gap: '8px' }}>
        <button onClick={() => setMapStyle('standard')} style={{ background: mapStyle==='standard'?'#e2e8f0':cardBg, color: textColor, border: `1px solid ${borderColor}`, padding: '8px', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', width: '45px', height: '45px', fontSize: '1.3rem' }} title="แผนที่ปกติ">🗺️</button>
        <button onClick={() => setMapStyle('dark')} style={{ background: mapStyle==='dark'?'#e2e8f0':cardBg, color: textColor, border: `1px solid ${borderColor}`, padding: '8px', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', width: '45px', height: '45px', fontSize: '1.3rem' }} title="โหมดมืด">🌙</button>
        <button onClick={() => setMapStyle('satellite')} style={{ background: mapStyle==='satellite'?'#e2e8f0':cardBg, color: textColor, border: `1px solid ${borderColor}`, padding: '8px', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', width: '45px', height: '45px', fontSize: '1.3rem' }} title="ดาวเทียม">🛰️</button>
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
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: textColor, display: 'flex', alignItems: 'center', gap: '8px' }}>🏆 อันดับ{currentModeObj.label}</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: subTextColor }}>{selectedProv ? `เรียงตามเขต/อำเภอ ใน${selectedProv}` : 'เรียงตามระดับจังหวัดทั่วประเทศ'}</p>
          </div>
          <button onClick={() => setIsRankingOpen(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', color: subTextColor, cursor: 'pointer' }}>✖</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '15px 20px' }} className="hide-scrollbar">
          {rankingData.length > 0 ? rankingData.map((item, idx) => {
            const rawColor = activeMode === 'fires' ? (item.value >= 50 ? '#991b1b' : item.value >= 20 ? '#ef4444' : '#f97316') : getColorByMode(activeMode, item.value);
            const readableColor = getReadableTextColor(rawColor, darkMode);
            
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: innerCardBg, padding: '12px 15px', borderRadius: '16px', marginBottom: '10px', border: `1px solid ${borderColor}` }}>
                <div style={{ fontSize: '1.2rem', fontWeight: '900', color: subTextColor, width: '25px', textAlign: 'center' }}>{idx + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '900', color: readableColor, lineHeight: 1, marginTop: '2px' }}>
                    {item.value} <span style={{ fontSize: '0.7rem', color: subTextColor, fontWeight: 'normal' }}>{currentModeObj.unit}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: darkMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.6)', padding: '5px', borderRadius: '10px', border: `1px solid ${borderColor}` }}>
                  <span style={{ fontSize: '0.6rem', color: subTextColor, fontWeight: 'bold', marginBottom: '2px' }}>📉 พยากรณ์</span>
                  <div style={{ width: '70px', height: '25px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={item.trend}><Line type="monotone" dataKey="val" stroke={rawColor} strokeWidth={2} dot={false} isAnimationActive={false} /></LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            );
          }) : (
            <div style={{ textAlign: 'center', color: subTextColor, marginTop: '50px' }}>ไม่มีข้อมูลสำหรับการจัดอันดับในพื้นที่นี้</div>
          )}
        </div>
      </div>

      {/* 🌟 Legend กล่องอธิบายสี */}
      <div style={{ position: 'absolute', bottom: '30px', left: isMobile ? '15px' : '30px', zIndex: 1000, background: cardBg, padding: '12px 20px', borderRadius: '16px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', display: isLeaflet ? 'block' : 'none' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: textColor, marginBottom: '8px' }}>ระดับสี ({currentModeObj.label})</div>
        <div style={{ display: 'flex', gap: '2px', height: '12px', width: '180px', borderRadius: '6px', overflow: 'hidden' }}>
          {activeMode === 'pm25' && <><div style={{flex:1, background:'#00e400'}}></div><div style={{flex:1, background:'#ffff00'}}></div><div style={{flex:1, background:'#ff7e00'}}></div><div style={{flex:1, background:'#ff0000'}}></div><div style={{flex:1, background:'#8f3f97'}}></div><div style={{flex:1, background:'#7e0023'}}></div></>}
          {activeMode === 'heat' && <><div style={{flex:1, background:'#22c55e'}}></div><div style={{flex:1, background:'#eab308'}}></div><div style={{flex:1, background:'#f97316'}}></div><div style={{flex:1, background:'#ef4444'}}></div></>}
          {activeMode === 'temp' && <><div style={{flex:1, background:'#3b82f6'}}></div><div style={{flex:1, background:'#22c55e'}}></div><div style={{flex:1, background:'#f97316'}}></div><div style={{flex:1, background:'#ef4444'}}></div></>}
          {activeMode === 'rain' && <><div style={{flex:1, background:'#e0f2fe'}}></div><div style={{flex:1, background:'#93c5fd'}}></div><div style={{flex:1, background:'#3b82f6'}}></div><div style={{flex:1, background:'#1e3a8a'}}></div></>}
          {activeMode === 'humidity' && <><div style={{flex:1, background:'#a7f3d0'}}></div><div style={{flex:1, background:'#34d399'}}></div><div style={{flex:1, background:'#059669'}}></div><div style={{flex:1, background:'#064e3b'}}></div></>}
          {activeMode === 'wind' && <><div style={{flex:1, background:'#fbcfe8'}}></div><div style={{flex:1, background:'#f472b6'}}></div><div style={{flex:1, background:'#db2777'}}></div><div style={{flex:1, background:'#831843'}}></div></>}
          {activeMode === 'fires' && <><div style={{flex:1, background:'#f97316'}}></div><div style={{flex:1, background:'#ef4444'}}></div><div style={{flex:1, background:'#991b1b'}}></div></>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: subTextColor, marginTop: '4px', fontWeight: 'bold' }}>
          <span>น้อย/ปลอดภัย</span><span>มาก/อันตราย</span>
        </div>
      </div>
    </div>
  );
}