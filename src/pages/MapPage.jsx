import React, { useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { WeatherContext } from '../context/WeatherContext';

const provMap = {
  "Bangkok Metropolis": "กรุงเทพมหานคร", "Bangkok": "กรุงเทพมหานคร", "Samut Prakan": "สมุทรปราการ", "Nonthaburi": "นนทบุรี", "Pathum Thani": "ปทุมธานี",
  "Phra Nakhon Si Ayutthaya": "พระนครศรีอยุธยา", "Ayutthaya": "พระนครศรีอยุธยา", "Ang Thong": "อ่างทอง", "Lop Buri": "ลพบุรี", "Sing Buri": "สิงห์บุรี", "Chai Nat": "ชัยนาท", 
  "Saraburi": "สระบุรี", "Chon Buri": "ชลบุรี", "Rayong": "ระยอง", "Chanthaburi": "จันทบุรี", "Trat": "ตราด", "Chachoengsao": "ฉะเชิงเทรา", "Prachin Buri": "ปราจีนบุรี", "Nakhon Nayok": "นครนายก", 
  "Sa Kaeo": "สระแก้ว", "Nakhon Ratchasima": "นครราชสีมา", "Buri Ram": "บุรีรัมย์", "Surin": "สุรินทร์", "Si Sa Ket": "ศรีสะเกษ", "Ubon Ratchathani": "อุบลราชธานี", "Yasothon": "ยโสธร", "Chaiyaphum": "ชัยภูมิ", 
  "Amnat Charoen": "อำนาจเจริญ", "Bueng Kan": "บึงกาฬ", "Nong Bua Lam Phu": "หนองบัวลำภู", "Khon Kaen": "ขอนแก่น", "Udon Thani": "อุดรธานี", "Loei": "เลย", "Nong Khai": "หนองคาย", 
  "Maha Sarakham": "มหาสารคาม", "Roi Et": "ร้อยเอ็ด", "Kalasin": "กาฬสินธุ์", "Sakon Nakhon": "สกลนคร", "Nakhon Phanom": "นครพนม", "Mukdahan": "มุกดาหาร", "Chiang Mai": "เชียงใหม่", "Lamphun": "ลำพูน", 
  "Lampang": "ลำปาง", "Uttaradit": "อุตรดิตถ์", "Phrae": "แพร่", "Nan": "น่าน", "Phayao": "พะเยา", "Chiang Rai": "เชียงราย", "Mae Hong Son": "แม่ฮ่องสอน", "Nakhon Sawan": "นครสวรรค์", 
  "Uthai Thani": "อุทัยธานี", "Kamphaeng Phet": "กำแพงเพชร", "Tak": "ตาก", "Sukhothai": "สุโขทัย", "Phitsanulok": "พิษณุโลก", "Phichit": "พิจิตร", "Phetchabun": "เพชรบูรณ์", "Ratchaburi": "ราชบุรี", 
  "Kanchanaburi": "กาญจนบุรี", "Suphan Buri": "สุพรรณบุรี", "Nakhon Pathom": "นครปฐม", "Samut Sakhon": "สมุทรสาคร", "Samut Songkhram": "สมุทรสงคราม", "Phetchaburi": "เพชรบุรี",
  "Prachuap Khiri Khan": "ประจวบคีรีขันธ์", "Nakhon Si Thammarat": "นครศรีธรรมราช", "Krabi": "กระบี่", "Phangnga": "พังงา", "Phang Nga": "พังงา", "Phuket": "ภูเก็ต", "Surat Thani": "สุราษฎร์ธานี", 
  "Ranong": "ระนอง", "Chumphon": "ชุมพร", "Songkhla": "สงขลา", "Satun": "สตูล", "Trang": "ตรัง", "Phatthalung": "พัทลุง", "Pattani": "ปัตตานี", "Yala": "ยะลา", "Narathiwat": "นราธิวาส"
};

function MapChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, zoom, { animate: true, duration: 1.5 }); }, [center, zoom, map]);
  return null;
}

function MapZoomListener({ setMapZoom }) {
  useMapEvents({ zoomend: (e) => setMapZoom(e.target.getZoom()) });
  return null;
}

const getWindDirection = (degree) => {
    if (degree === undefined || degree === null) return { name: '-', arrow: '🌀' };
    const val = Math.floor((degree / 45) + 0.5);
    const arr = ["เหนือ", "ตะวันออกเฉียงเหนือ", "ตะวันออก", "ตะวันออกเฉียงใต้", "ใต้", "ตะวันตกเฉียงใต้", "ตะวันตก", "ตะวันตกเฉียงเหนือ"];
    const arrows = ["⬇️", "↙️", "⬅️", "↖️", "⬆️", "↗️", "➡️", "↘️"]; 
    return { name: arr[(val % 8)], arrow: arrows[(val % 8)] };
};

const getUvText = (uv) => {
    if (uv > 10) return 'อันตรายรุนแรง';
    if (uv > 7) return 'สูงมาก';
    if (uv > 5) return 'สูง';
    if (uv > 2) return 'ปานกลาง';
    return 'ต่ำ';
}

export default function MapPage() {
  const { stations, stationTemps, darkMode } = useContext(WeatherContext);
  
  const [geoData, setGeoData] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [mapZoom, setMapZoom] = useState(window.innerWidth < 1024 ? 5 : 6);
  const [polyOpacity, setPolyOpacity] = useState(0.85);
  
  // 🌟 เปลี่ยนค่าเริ่มต้นเป็น 'basic' (ข้อมูลทั่วไป)
  const [mapCategory, setMapCategory] = useState('basic'); 
  const [activeBasicMode, setActiveBasicMode] = useState('pm25'); // ค่าเริ่มต้นย่อยเป็น pm25
  const [activeRiskMode, setActiveRiskMode] = useState('respiratory');
  
  const [selectedHotspot, setSelectedHotspot] = useState(null); 
  const [showReferenceModal, setShowReferenceModal] = useState(false); 
  
  const [basemapStyle, setBasemapStyle] = useState('dark'); 
  const [flyToPos, setFlyToPos] = useState(null);
  const [showControls, setShowControls] = useState(window.innerWidth >= 1024);

  const basemapUrls = {
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    osm: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
  };

  useEffect(() => { setBasemapStyle(darkMode ? 'dark' : 'light'); }, [darkMode]);

  useEffect(() => {
    const handleResize = () => { setIsMobile(window.innerWidth < 1024); if (window.innerWidth >= 1024) setShowControls(true); };
    window.addEventListener('resize', handleResize);
    fetch('/thailand.json').then(res => res.json()).then(data => setGeoData(data)).catch(e => console.error(e));
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => { setSelectedHotspot(null); }, [mapCategory]);

  const basicModes = [
    { id: 'pm25', name: '😷 PM2.5', color: '#f97316', unit: 'µg/m³', desc: 'ความหนาแน่นของฝุ่นละอองขนาดเล็ก' },
    { id: 'temp', name: '🌡️ อุณหภูมิ', color: '#ef4444', unit: '°C', desc: 'อุณหภูมิอากาศปัจจุบัน' },
    { id: 'heat', name: '🥵 ดัชนีความร้อน', color: '#ea580c', unit: '°C', desc: 'อุณหภูมิที่ร่างกายรู้สึกจริง (รวมความชื้น)' },
    { id: 'rain', name: '☔ โอกาสฝน', color: '#3b82f6', unit: '%', desc: 'ความน่าจะเป็นในการเกิดฝนตก' },
    { id: 'wind', name: '🌬️ ลมกระโชก', color: '#0ea5e9', unit: 'km/h', desc: 'ความเร็วลมกระโชกสูงสุด' },
    { id: 'uv', name: '☀️ รังสี UV', color: '#a855f7', unit: 'Idx', desc: 'ดัชนีรังสีอัลตราไวโอเลต' }
  ];

  const riskModes = [
    { id: 'respiratory', name: '🫁 สุขภาพและทางเดินหายใจ', color: '#ec4899', desc: 'คำนวณจาก: ฝุ่น PM2.5 (70%) และ ความร้อน (30%)' },
    { id: 'outdoor', name: '🏕️ กิจกรรมกลางแจ้ง', color: '#3b82f6', desc: 'คำนวณจาก: ฝน (40%), ลม (30%), และความร้อน/UV (30%)' },
    { id: 'wildfire', name: '🔥 ความเสี่ยงไฟป่า', color: '#ea580c', desc: 'คำนวณจาก: ลมแรง (45%), อากาศแห้ง (35%), และความร้อน (20%)' },
    { id: 'heatstroke', name: '🥵 เฝ้าระวังโรคลมแดด', color: '#ef4444', desc: 'คำนวณจาก: อุณหภูมิความร้อน (60%) และ รังสี UV (40%)' }
  ];

  const getBasicVal = useCallback((station, mode) => {
    if (!station || !stationTemps[station.stationID]) return null;
    const data = stationTemps[station.stationID];
    switch(mode) {
        case 'pm25': return station.AQILast?.PM25?.value || 0;
        case 'temp': return Math.round(data.temp || 0);
        case 'heat': return Math.round(data.feelsLike || 0);
        case 'rain': return data.rainProb || 0;
        case 'wind': return Math.round(data.windSpeed || 0);
        case 'uv': return data.uv || 0;
        default: return 0;
    }
  }, [stationTemps]);

  const getBasicColor = useCallback((val, mode) => {
    if (val === null || val === undefined || val === '') return darkMode ? '#334155' : '#cbd5e1';
    if (mode === 'pm25') return val >= 75 ? '#ef4444' : val >= 37.5 ? '#f97316' : val >= 25 ? '#eab308' : val >= 15 ? '#22c55e' : '#0ea5e9';
    if (mode === 'temp' || mode === 'heat') return val >= 39 ? '#ef4444' : val >= 35 ? '#f97316' : val >= 29 ? '#eab308' : val >= 23 ? '#22c55e' : '#3b82f6';
    if (mode === 'rain') return val >= 70 ? '#1e3a8a' : val >= 40 ? '#3b82f6' : val >= 10 ? '#60a5fa' : '#94a3b8';
    if (mode === 'wind') return val >= 40 ? '#ef4444' : val >= 20 ? '#f97316' : val >= 10 ? '#eab308' : '#22c55e';
    if (mode === 'uv') return val >= 8 ? '#a855f7' : val >= 6 ? '#ef4444' : val >= 3 ? '#ea580c' : val >= 1 ? '#eab308' : '#22c55e';
    return darkMode ? '#334155' : '#cbd5e1';
  }, [darkMode]);

  const calculateRisk = useCallback((station) => {
      const data = stationTemps[station.stationID] || {};
      const pm25 = station.AQILast?.PM25?.value || 0;
      const temp = data.temp || 0;
      const wind = data.windSpeed || 0;
      const rain = data.rainProb || 0;
      const uv = data.uv || 0;
      const hum = data.humidity || 50;

      const nPm = Math.min(pm25 / 75 * 10, 10); 
      const nTemp = Math.max(0, Math.min((temp - 28) / 12 * 10, 10)); 
      const nWind = Math.min(wind / 35 * 10, 10); 
      const nRain = Math.min(rain / 80 * 10, 10); 
      const nUv = Math.min(uv / 11 * 10, 10); 
      const nHumDry = Math.max(0, 10 - (hum / 100 * 10)); 

      let score = 0;
      let factors = [];

      if (activeRiskMode === 'respiratory') {
          score = (nPm * 0.7) + (nTemp * 0.3);
          factors = [{ label: 'มลพิษฝุ่น PM2.5', val: pm25, unit: 'µg', risk: nPm, weight: 70, color: '#f97316' }, { label: 'อุณหภูมิความร้อน', val: temp, unit: '°C', risk: nTemp, weight: 30, color: '#ef4444' }];
      } else if (activeRiskMode === 'outdoor') {
          score = (nRain * 0.4) + (nWind * 0.3) + (nTemp * 0.2) + (nUv * 0.1);
          factors = [{ label: 'โอกาสเกิดฝนตก', val: rain, unit: '%', risk: nRain, weight: 40, color: '#3b82f6' }, { label: 'ความเร็วลมกระโชก', val: wind, unit: 'km/h', risk: nWind, weight: 30, color: '#0ea5e9' }, { label: 'อุณหภูมิความร้อน', val: temp, unit: '°C', risk: nTemp, weight: 20, color: '#ef4444' }, { label: 'ความเข้มรังสี UV', val: uv, unit: 'Idx', risk: nUv, weight: 10, color: '#a855f7' }];
      } else if (activeRiskMode === 'wildfire') {
          score = (nWind * 0.45) + (nHumDry * 0.35) + (nTemp * 0.20);
          factors = [{ label: 'ความเร็วลมกระโชก', val: wind, unit: 'km/h', risk: nWind, weight: 45, color: '#0ea5e9' }, { label: 'ความแห้งแล้งของอากาศ', val: hum, unit: '%', risk: nHumDry, weight: 35, color: '#eab308' }, { label: 'อุณหภูมิความร้อน', val: temp, unit: '°C', risk: nTemp, weight: 20, color: '#ef4444' }];
      } else if (activeRiskMode === 'heatstroke') {
          score = (nTemp * 0.6) + (nUv * 0.4);
          factors = [{ label: 'อุณหภูมิความร้อน', val: temp, unit: '°C', risk: nTemp, weight: 60, color: '#ef4444' }, { label: 'ความเข้มรังสี UV', val: uv, unit: 'Idx', risk: nUv, weight: 40, color: '#a855f7' }];
      }

      return { score: Math.min(Math.round(score * 10) / 10, 10), factors };
  }, [activeRiskMode, stationTemps]);

  const getRiskColor = useCallback((score) => {
      if (score === null || score === undefined) return darkMode ? '#334155' : '#cbd5e1';
      if (score >= 8) return '#ef4444'; 
      if (score >= 6) return '#f97316'; 
      if (score >= 4) return '#eab308'; 
      if (score >= 0) return '#22c55e'; 
      return darkMode ? '#334155' : '#cbd5e1'; 
  }, [darkMode]);

  const getRiskLabel = (score) => {
      if (score >= 8) return 'ความเสี่ยงสูงมาก';
      if (score >= 6) return 'ควรเฝ้าระวัง';
      if (score >= 4) return 'ปานกลาง';
      return 'สถานการณ์ปกติ';
  };

  const allMapData = useMemo(() => {
    return (stations || []).map(st => {
        let val, color;
        if (mapCategory === 'basic') {
            val = getBasicVal(st, activeBasicMode);
            color = getBasicColor(val, activeBasicMode);
        } else {
            const risk = calculateRisk(st);
            val = risk.score;
            color = getRiskColor(risk.score);
        }
        return { ...st, displayVal: val, color };
    }).filter(st => st.displayVal !== null && st.displayVal !== undefined);
  }, [stations, mapCategory, activeBasicMode, calculateRisk, getBasicVal, getBasicColor, getRiskColor]);

  const rankedSidebarData = useMemo(() => {
    return [...allMapData].sort((a, b) => b.displayVal - a.displayVal).slice(0, 15);
  }, [allMapData]);

  const hasHighRisk = useMemo(() => allMapData.some(d => d.displayVal >= 8), [allMapData]);

  const styleGeoJSON = (feature) => {
    const props = Object.values(feature.properties || {}).map(v => String(v).trim());
    let thaiNameFromMap = "";
    for (let p of props) if (provMap[p]) { thaiNameFromMap = provMap[p]; break; }
    
    const station = stations.find(s => {
        const cleanName = s.areaTH.replace('จังหวัด', '').trim();
        return cleanName === thaiNameFromMap || props.includes(cleanName);
    });

    let color = darkMode ? '#1e293b' : '#e2e8f0';
    if (station) {
        if (mapCategory === 'basic') color = getBasicColor(getBasicVal(station, activeBasicMode), activeBasicMode);
        else color = getRiskColor(calculateRisk(station).score);
    }
    
    return { fillColor: color, weight: 1, opacity: 1, color: darkMode ? '#0f172a' : '#ffffff', fillOpacity: polyOpacity };
  };

  const handleRegionClick = (station) => {
      if (mapCategory === 'risk') {
          const risk = calculateRisk(station);
          setSelectedHotspot({ type: 'risk', station, riskScore: risk.score, factors: risk.factors, color: getRiskColor(risk.score) });
      } else {
          const data = stationTemps[station.stationID] || {};
          const pm25 = station.AQILast?.PM25?.value || 0;
          setSelectedHotspot({ type: 'basic', station, data, pm25 });
      }
      setFlyToPos([station.lat, station.long]);
  };

  const onEachFeature = (feature, layer) => {
    layer.on({
        click: () => {
            const props = Object.values(feature.properties || {}).map(v => String(v).trim());
            let thaiNameFromMap = "";
            for (let p of props) if (provMap[p]) { thaiNameFromMap = provMap[p]; break; }
            const station = stations.find(s => s.areaTH.replace('จังหวัด', '').trim() === thaiNameFromMap);
            if (station) handleRegionClick(station);
        }
    });
  };

  const createMapIcon = (stationName, val, color) => {
    return L.divIcon({
        className: 'custom-risk-icon',
        html: `<div style="background: ${color}; color: ${color === '#eab308' || color === '#cbd5e1' ? '#0f172a' : '#fff'}; font-weight: 900; font-size: ${isMobile ? '9px' : '11px'}; padding: ${isMobile ? '2px 4px' : '4px 8px'}; border-radius: 8px; border: 2px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; flex-direction: column; align-items: center; line-height: 1.1;">
                 <span style="font-size: 0.7em; opacity: 0.9;">${stationName}</span>
                 <span>${val}</span>
               </div>`,
        iconSize: isMobile ? [50, 30] : [60, 40], 
        iconAnchor: isMobile ? [25, 15] : [30, 20]
    });
  };

  const appBg = darkMode ? '#020617' : '#f8fafc'; 
  const cardBg = darkMode ? '#0f172a' : '#ffffff';
  const textColor = darkMode ? '#f8fafc' : '#0f172a'; 
  const borderColor = darkMode ? '#1e293b' : '#e2e8f0';
  const subTextColor = darkMode ? '#94a3b8' : '#64748b'; 

  const activeModeObj = mapCategory === 'basic' ? basicModes.find(m => m.id === activeBasicMode) : riskModes.find(m => m.id === activeRiskMode);

  const getDynamicLegendContent = () => {
    if (mapCategory === 'risk') {
        return [
            { c: '#ef4444', l: 'วิกฤต/อันตราย', r: '8-10' },
            { c: '#f97316', l: 'ควรเฝ้าระวัง', r: '6-7.9' },
            { c: '#eab308', l: 'ปานกลาง', r: '4-5.9' },
            { c: '#22c55e', l: 'สถานการณ์ปกติ', r: '0-3.9' }
        ];
    }
    switch (activeBasicMode) {
        case 'pm25': return [{ c: '#ef4444', l: 'มีผลกระทบฯ', r: '> 75' }, { c: '#f97316', l: 'เริ่มมีผลกระทบฯ', r: '38-75' }, { c: '#eab308', l: 'ปานกลาง', r: '26-37' }, { c: '#22c55e', l: 'ดี', r: '16-25' }, { c: '#0ea5e9', l: 'ดีมาก', r: '0-15' }];
        case 'temp':
        case 'heat': return [{ c: '#ef4444', l: 'ร้อนจัด', r: '> 39' }, { c: '#f97316', l: 'ร้อน', r: '35-39' }, { c: '#eab308', l: 'อบอ้าว', r: '29-34' }, { c: '#22c55e', l: 'ปกติ/อบอุ่น', r: '23-28' }, { c: '#3b82f6', l: 'เย็นสบาย', r: '< 23' }];
        case 'rain': return [{ c: '#1e3a8a', l: 'ตกหนัก/พายุ', r: '> 70%' }, { c: '#3b82f6', l: 'โอกาสตกสูง', r: '41-70%' }, { c: '#60a5fa', l: 'โอกาสตกต่ำ', r: '11-40%' }, { c: '#94a3b8', l: 'ไม่มีฝน', r: '0-10%' }];
        case 'wind': return [{ c: '#ef4444', l: 'พายุ/อันตราย', r: '> 40' }, { c: '#f97316', l: 'ลมแรง', r: '21-40' }, { c: '#eab308', l: 'ลมกำลังดี', r: '11-20' }, { c: '#22c55e', l: 'ลมสงบ', r: '0-10' }];
        case 'uv': return [{ c: '#a855f7', l: 'อันตรายรุนแรง', r: '> 10' }, { c: '#ef4444', l: 'สูงมาก', r: '8-10' }, { c: '#ea580c', l: 'สูง', r: '6-7' }, { c: '#eab308', l: 'ปานกลาง', r: '3-5' }, { c: '#22c55e', l: 'ต่ำ', r: '0-2' }];
        default: return [];
    }
  };

  if (!geoData || Object.keys(stationTemps).length === 0) return (
    <div className="loading-container" style={{ background: appBg, color: textColor }}>
        <div className="loading-spinner"></div>
        <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>กำลังเตรียมแผนที่เฝ้าระวังภัย...</div>
        <div style={{ fontSize: '0.85rem', color: subTextColor, marginTop: '5px' }}>ประมวลผลข้อมูลทั้ง 77 จังหวัด</div>
    </div>
  );

  return (
    <div style={{ height: '100%', width: '100%', background: appBg, display: 'flex', flexDirection: 'column', fontFamily: 'Kanit, sans-serif', padding: isMobile ? '10px' : '20px', boxSizing: 'border-box' }}>
      
      <style dangerouslySetInlineStyle={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${darkMode ? '#334155' : '#cbd5e1'}; border-radius: 10px; }
      `}} />

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '15px', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', marginBottom: '15px', flexShrink: 0 }}>
          {isMobile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h2 style={{ margin: 0, color: textColor, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>🗺️ แผนที่สภาพอากาศ</h2>
                      {mapCategory === 'risk' && (
                          <button onClick={() => setShowReferenceModal(true)} style={{ background: darkMode ? '#1e293b' : '#f1f5f9', color: '#8b5cf6', border: `1px solid #8b5cf6`, padding: '4px 10px', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Kanit', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              📚
                          </button>
                      )}
                  </div>
                  <div style={{ display: 'flex', background: cardBg, borderRadius: '50px', border: `1px solid ${borderColor}`, padding: '4px' }}>
                      <button onClick={() => setMapCategory('basic')} style={{ flex: 1, background: mapCategory === 'basic' ? '#0ea5e9' : 'transparent', color: mapCategory === 'basic' ? '#fff' : subTextColor, border: 'none', padding: '6px', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', fontFamily: 'Kanit' }}>📊 ข้อมูลทั่วไป</button>
                      <button onClick={() => setMapCategory('risk')} style={{ flex: 1, background: mapCategory === 'risk' ? '#8b5cf6' : 'transparent', color: mapCategory === 'risk' ? '#fff' : subTextColor, border: 'none', padding: '6px', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', fontFamily: 'Kanit' }}>🧠 วิเคราะห์ความเสี่ยง</button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '5px' }} className="custom-scrollbar">
                    {mapCategory === 'basic' ? basicModes.map(m => (
                        <button key={m.id} onClick={() => setActiveBasicMode(m.id)} style={{ flexShrink: 0, padding: '6px 12px', borderRadius: '12px', border: `1px solid ${activeBasicMode === m.id ? m.color : borderColor}`, background: activeBasicMode === m.id ? (darkMode ? `${m.color}20` : `${m.color}15`) : cardBg, color: activeBasicMode === m.id ? m.color : textColor, fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Kanit', fontSize: '0.75rem' }}>{m.name}</button>
                    )) : riskModes.map(m => (
                        <button key={m.id} onClick={() => setActiveRiskMode(m.id)} style={{ flexShrink: 0, padding: '6px 12px', borderRadius: '12px', border: `1px solid ${activeRiskMode === m.id ? m.color : borderColor}`, background: activeRiskMode === m.id ? (darkMode ? `${m.color}20` : `${m.color}15`) : cardBg, color: activeRiskMode === m.id ? m.color : textColor, fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Kanit', fontSize: '0.75rem' }}>{m.name}</button>
                    ))}
                  </div>
              </div>
          ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                          <h2 style={{ margin: 0, color: textColor, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>🗺️ แผนที่สภาพอากาศ</h2>
                          <div style={{ display: 'flex', background: cardBg, borderRadius: '50px', border: `1px solid ${borderColor}`, padding: '4px' }}>
                              <button onClick={() => setMapCategory('basic')} style={{ background: mapCategory === 'basic' ? '#0ea5e9' : 'transparent', color: mapCategory === 'basic' ? '#fff' : subTextColor, border: 'none', padding: '6px 20px', borderRadius: '50px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', fontFamily: 'Kanit' }}>📊 ข้อมูลทั่วไป</button>
                              <button onClick={() => setMapCategory('risk')} style={{ background: mapCategory === 'risk' ? '#8b5cf6' : 'transparent', color: mapCategory === 'risk' ? '#fff' : subTextColor, border: 'none', padding: '6px 20px', borderRadius: '50px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', fontFamily: 'Kanit' }}>🧠 วิเคราะห์ความเสี่ยง</button>
                          </div>
                      </div>
                      {mapCategory === 'risk' && (
                          <button onClick={() => setShowReferenceModal(true)} style={{ background: darkMode ? '#1e293b' : '#f1f5f9', color: '#8b5cf6', border: `1px solid #8b5cf6`, padding: '6px 15px', borderRadius: '50px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Kanit', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}>
                              📚 แหล่งอ้างอิงทางวิชาการ
                          </button>
                      )}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {mapCategory === 'basic' ? basicModes.map(m => (
                        <button key={m.id} onClick={() => setActiveBasicMode(m.id)} style={{ padding: '8px 15px', borderRadius: '12px', border: `1px solid ${activeBasicMode === m.id ? m.color : borderColor}`, background: activeBasicMode === m.id ? (darkMode ? `${m.color}20` : `${m.color}15`) : cardBg, color: activeBasicMode === m.id ? m.color : textColor, fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Kanit', fontSize: '0.9rem' }}>{m.name}</button>
                    )) : riskModes.map(m => (
                        <button key={m.id} onClick={() => setActiveRiskMode(m.id)} style={{ padding: '8px 15px', borderRadius: '12px', border: `1px solid ${activeRiskMode === m.id ? m.color : borderColor}`, background: activeRiskMode === m.id ? (darkMode ? `${m.color}20` : `${m.color}15`) : cardBg, color: activeRiskMode === m.id ? m.color : textColor, fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Kanit', fontSize: '0.9rem' }}>{m.name}</button>
                    ))}
                  </div>
              </div>
          )}
      </div>

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', flex: 1, gap: '15px', overflow: 'hidden' }}>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: isMobile ? '10px' : '15px' }}>
              <div style={{ flex: 1, borderRadius: isMobile ? '16px' : '20px', overflow: 'hidden', border: `1px solid ${borderColor}`, position: 'relative', minHeight: isMobile ? '400px' : 'auto', background: cardBg }}>
                
                <MapContainer center={[13.5, 100.5]} zoom={isMobile ? 5 : 6} style={{ height: '100%', width: '100%', background: appBg }} zoomControl={false}>
                    <TileLayer url={basemapUrls[basemapStyle]} />
                    <MapZoomListener setMapZoom={setMapZoom} />
                    <MapChangeView center={flyToPos} zoom={8} />
                    
                    {geoData && <GeoJSON key={`${mapCategory}-${activeRiskMode}-${activeBasicMode}-${polyOpacity}-${basemapStyle}`} data={geoData} style={styleGeoJSON} onEachFeature={onEachFeature} />}
                    
                    {allMapData.map(st => {
                        let isVisible = false;

                        if (mapZoom >= 8) { 
                            isVisible = true; 
                        } else if (mapZoom >= 6) {
                            if (mapCategory === 'risk') {
                                isVisible = st.displayVal >= 4; 
                            } else {
                                isVisible = rankedSidebarData.some(r => r.stationID === st.stationID);
                            }
                        } else {
                            if (mapCategory === 'risk') {
                                isVisible = st.displayVal >= 6; 
                                if (!hasHighRisk) {
                                    isVisible = rankedSidebarData.slice(0, 3).some(r => r.stationID === st.stationID);
                                }
                            } else {
                                isVisible = rankedSidebarData.slice(0, 5).some(r => r.stationID === st.stationID);
                            }
                        }

                        if (!isVisible) return null;
                        return <Marker key={st.stationID} position={[st.lat, st.long]} icon={createMapIcon(st.areaTH.replace('จังหวัด',''), st.displayVal, st.color)} interactive={false} />;
                    })}
                </MapContainer>

                <div style={{ position: 'absolute', bottom: '15px', left: '15px', zIndex: 1000, background: cardBg, padding: '10px', borderRadius: '12px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 15px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: isMobile ? 'calc(100% - 30px)' : 'auto' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: subTextColor }}>
                        เกณฑ์ระดับ {activeModeObj?.name}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 15px' }}>
                        {getDynamicLegendContent().map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: textColor }}>
                                <span style={{display:'inline-block', width:'10px', height:'10px', background: item.c, borderRadius:'50%', border: `1px solid ${darkMode?'#1e293b':'#e2e8f0'}`}}></span>
                                <span style={{fontWeight: 'bold'}}>{item.r}</span> <span style={{opacity: 0.8}}>({item.l})</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ position: 'absolute', top: '15px', right: '15px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end' }}>
                    {isMobile && (
                        <button onClick={() => setShowControls(!showControls)} style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#1e293b', color: '#fff', border: `1px solid ${borderColor}`, fontSize: '1.1rem', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>{showControls ? '✕' : '⚙️'}</button>
                    )}

                    {(showControls || !isMobile) && (
                        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end' }}>
                            <button onClick={() => { if(navigator.geolocation) navigator.geolocation.getCurrentPosition(p => setFlyToPos([p.coords.latitude, p.coords.longitude])); }} style={{ background: cardBg, color: textColor, border: `1px solid ${borderColor}`, padding: '8px 12px', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', fontFamily: 'Kanit' }}>📍 พิกัดของฉัน</button>
                            <div style={{ background: darkMode ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', padding: '12px', borderRadius: '16px', border: `1px solid ${borderColor}`, width: '140px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: textColor, marginBottom: '8px' }}>รูปแบบแผนที่</div>
                                <select value={basemapStyle} onChange={(e) => setBasemapStyle(e.target.value)} style={{ width: '100%', background: darkMode ? '#1e293b' : '#f1f5f9', color: textColor, border: 'none', padding: '6px', borderRadius: '8px', fontSize: '0.75rem', outline: 'none', fontFamily: 'Kanit' }}>
                                    <option value="dark">สีเข้ม (Dark)</option><option value="light">สีสว่าง (Light)</option><option value="osm">ถนน (Street)</option><option value="satellite">ดาวเทียม</option>
                                </select>
                                <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: textColor, marginTop: '12px', marginBottom: '8px' }}>ความทึบเลเยอร์</div>
                                <input type="range" min="0.1" max="1" step="0.1" value={polyOpacity} onChange={(e) => setPolyOpacity(parseFloat(e.target.value))} style={{ width: '100%', accentColor: activeModeObj?.color }} />
                            </div>
                        </div>
                    )}
                </div>
              </div>
          </div>

          <div style={{ width: isMobile ? '100%' : '320px', background: cardBg, borderRadius: isMobile ? '16px' : '20px', padding: '15px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column', zIndex: 10, flexShrink: 0 }}>
             <h3 style={{ margin: '0 0 5px 0', fontSize: '1rem', color: textColor }}>
                📍 {mapCategory === 'risk' ? 'พื้นที่เสี่ยงสูงสุด (Top 15)' : 'จัดอันดับค่าสูงสุด (Top 15)'}
             </h3>
             <p style={{ margin: '0 0 10px 0', fontSize: '0.75rem', color: activeModeObj?.color, fontWeight: 'bold' }}>{activeModeObj?.desc}</p>
             
             <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }} className="custom-scrollbar">
                {rankedSidebarData.map((st, idx) => (
                   <div 
                       key={st.stationID} 
                       onClick={() => handleRegionClick(st)} 
                       style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: darkMode ? '#1e293b' : '#f8fafc', borderRadius: '12px', marginBottom: '8px', borderLeft: `5px solid ${st.color}`, cursor: 'pointer', transition: 'all 0.1s', border: `1px solid ${borderColor}` }}
                       onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.1)'; }}
                       onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                   >
                      <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: textColor }}>{idx+1}. จ.{st.areaTH.replace('จังหวัด', '')}</div>
                          {mapCategory === 'risk' && <div style={{ fontSize: '0.65rem', color: subTextColor, marginTop: '2px' }}>สถานะ: {getRiskLabel(st.displayVal)}</div>}
                      </div>
                      <div style={{ background: cardBg, padding: '4px 10px', borderRadius: '10px', textAlign: 'center', border: `1px solid ${borderColor}` }}>
                          <div style={{ fontSize: '1rem', fontWeight: '900', color: st.color }}>{st.displayVal} <span style={{fontSize:'0.6rem', color: subTextColor, fontWeight:'normal'}}>{mapCategory==='basic' ? activeModeObj?.unit : ''}</span></div>
                      </div>
                   </div>
                ))}
             </div>
          </div>
      </div>

      {/* POPUP 1: DIAGNOSTIC MODAL */}
      {selectedHotspot && selectedHotspot.type === 'risk' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }} onClick={() => setSelectedHotspot(null)}>
            <div className="fade-in" style={{ background: cardBg, padding: '25px', borderRadius: '20px', width: '100%', maxWidth: '420px', border: `1px solid ${borderColor}`, boxShadow: '0 20px 50px rgba(0,0,0,0.5)', position: 'relative' }} onClick={e => e.stopPropagation()}>
                <button onClick={() => setSelectedHotspot(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: darkMode ? '#1e293b' : '#f1f5f9', border: 'none', width: '30px', height: '30px', borderRadius: '50%', color: textColor, cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                
                <div style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: `1px solid ${borderColor}` }}>
                    <div style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold', marginBottom: '5px' }}>ข้อมูลวิเคราะห์ความเสี่ยงรายพื้นที่</div>
                    <h2 style={{ margin: 0, color: textColor, fontSize: isMobile ? '1.1rem' : '1.3rem', fontWeight: 'bold' }}>📍 จ.{selectedHotspot.station.areaTH.replace('จังหวัด','')}</h2>
                </div>

                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: selectedHotspot.color, color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', border: `4px solid ${cardBg}`, outline: `2px solid ${selectedHotspot.color}`, flexShrink: 0 }}>
                        <span style={{ fontSize: '1.8rem', fontWeight: '900', lineHeight: 1 }}>{selectedHotspot.riskScore}</span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>คะแนน</span>
                    </div>
                    <div>
                        <div style={{ fontSize: '1rem', fontWeight: 'bold', color: selectedHotspot.color }}>{activeModeObj?.name}</div>
                        <div style={{ fontSize: '0.85rem', color: textColor, marginTop: '5px' }}>สถานะ: <span style={{fontWeight:'bold'}}>{getRiskLabel(selectedHotspot.riskScore)}</span></div>
                        <div style={{ fontSize: '0.7rem', color: subTextColor, marginTop: '5px', lineHeight: 1.4 }}>
                            {selectedHotspot.riskScore >= 6 ? 'หากคะแนนตั้งแต่ 6 ขึ้นไป แนะนำให้เตรียมรับมือและดูแลสุขภาพเป็นพิเศษ' : 'สภาพอากาศอยู่ในเกณฑ์ปกติ สามารถทำกิจกรรมได้ตามความเหมาะสม'}
                        </div>
                    </div>
                </div>

                <h4 style={{ margin: '0 0 10px 0', color: textColor, fontSize: '0.95rem' }}>🔬 ปัจจัยหลักที่ส่งผลต่อความเสี่ยง:</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {selectedHotspot.factors.map((factor, i) => (
                        <div key={i}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '5px', color: textColor }}>
                                <span style={{fontWeight: 'bold'}}>{factor.label} <span style={{color:subTextColor, fontWeight:'normal'}}>(สัดส่วน {factor.weight}%)</span></span>
                                <span>{factor.val} <span style={{color:subTextColor}}>{factor.unit}</span></span>
                            </div>
                            <div style={{ width: '100%', height: '6px', background: darkMode ? '#1e293b' : '#e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                                <div style={{ width: `${(factor.risk / 10) * 100}%`, height: '100%', background: factor.color, borderRadius: '10px', transition: 'width 1s ease-out' }}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* POPUP 2: WEATHER DASHBOARD MODAL */}
      {selectedHotspot && selectedHotspot.type === 'basic' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }} onClick={() => setSelectedHotspot(null)}>
          <div className="fade-in" style={{ background: cardBg, padding: '25px', borderRadius: '20px', width: '100%', maxWidth: '420px', border: `1px solid ${borderColor}`, boxShadow: '0 20px 50px rgba(0,0,0,0.5)', position: 'relative' }} onClick={e => e.stopPropagation()}>
              <button onClick={() => setSelectedHotspot(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: darkMode ? '#1e293b' : '#f1f5f9', border: 'none', width: '30px', height: '30px', borderRadius: '50%', color: textColor, cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
              
              <div style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: `1px solid ${borderColor}` }}>
                  <div style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold', marginBottom: '5px' }}>ข้อมูลสภาพอากาศปัจจุบัน</div>
                  <h2 style={{ margin: 0, color: textColor, fontSize: isMobile ? '1.2rem' : '1.4rem', fontWeight: 'bold' }}>📍 จ.{selectedHotspot.station.areaTH.replace('จังหวัด','')}</h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ background: darkMode ? '#1e293b' : '#f1f5f9', padding: '15px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '5px', borderLeft: `4px solid ${getBasicColor(selectedHotspot.pm25, 'pm25')}` }}>
                      <span style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold' }}>😷 ฝุ่น PM2.5</span>
                      <span style={{ fontSize: '1.4rem', fontWeight: '900', color: getBasicColor(selectedHotspot.pm25, 'pm25') }}>{selectedHotspot.pm25} <span style={{fontSize: '0.7rem', color: subTextColor, fontWeight:'normal'}}>µg/m³</span></span>
                  </div>
                  <div style={{ background: darkMode ? '#1e293b' : '#f1f5f9', padding: '15px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '5px', borderLeft: `4px solid ${getBasicColor(selectedHotspot.data.temp, 'temp')}` }}>
                      <span style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold' }}>🌡️ อุณหภูมิ</span>
                      <span style={{ fontSize: '1.4rem', fontWeight: '900', color: getBasicColor(selectedHotspot.data.temp, 'temp') }}>{Math.round(selectedHotspot.data.temp || 0)}°C</span>
                  </div>
                  <div style={{ background: darkMode ? '#1e293b' : '#f1f5f9', padding: '15px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '5px', borderLeft: `4px solid ${getBasicColor(selectedHotspot.data.feelsLike, 'heat')}` }}>
                      <span style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold' }}>🥵 ดัชนีความร้อน</span>
                      <span style={{ fontSize: '1.4rem', fontWeight: '900', color: getBasicColor(selectedHotspot.data.feelsLike, 'heat') }}>{Math.round(selectedHotspot.data.feelsLike || 0)}°C</span>
                  </div>
                  <div style={{ background: darkMode ? '#1e293b' : '#f1f5f9', padding: '15px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '5px', borderLeft: `4px solid ${getBasicColor(selectedHotspot.data.rainProb, 'rain')}` }}>
                      <span style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold' }}>☔ โอกาสฝนตก</span>
                      <span style={{ fontSize: '1.4rem', fontWeight: '900', color: getBasicColor(selectedHotspot.data.rainProb, 'rain') }}>{selectedHotspot.data.rainProb || 0} <span style={{fontSize: '0.7rem', color: subTextColor, fontWeight:'normal'}}>%</span></span>
                  </div>
                  <div style={{ background: darkMode ? '#1e293b' : '#f1f5f9', padding: '15px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '5px', gridColumn: '1 / -1', borderLeft: `4px solid ${getBasicColor(selectedHotspot.data.windSpeed, 'wind')}` }}>
                      <span style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold' }}>🌬️ ลมกระโชกสูงสุด และทิศทางลม</span>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '1.4rem', fontWeight: '900', color: getBasicColor(selectedHotspot.data.windSpeed, 'wind') }}>{Math.round(selectedHotspot.data.windSpeed || 0)} <span style={{fontSize: '0.7rem', color: subTextColor, fontWeight:'normal'}}>km/h</span></span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: cardBg, padding: '4px 10px', borderRadius: '8px', border: `1px solid ${borderColor}` }}>
                              <span style={{ fontSize: '1.2rem' }}>{getWindDirection(selectedHotspot.data.windDir).arrow}</span>
                              <span style={{ fontSize: '0.8rem', color: textColor, fontWeight: 'bold' }}>ลม{getWindDirection(selectedHotspot.data.windDir).name}</span>
                          </div>
                      </div>
                  </div>
                  <div style={{ background: darkMode ? '#1e293b' : '#f1f5f9', padding: '15px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '5px', gridColumn: '1 / -1', borderLeft: `4px solid ${getBasicColor(selectedHotspot.data.uv, 'uv')}` }}>
                      <span style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold' }}>☀️ รังสี UV</span>
                      <span style={{ fontSize: '1.4rem', fontWeight: '900', color: getBasicColor(selectedHotspot.data.uv, 'uv') }}>{Math.round(selectedHotspot.data.uv || 0)} <span style={{fontSize: '0.8rem', color: textColor, fontWeight:'normal'}}>- {getUvText(selectedHotspot.data.uv)}</span></span>
                  </div>
              </div>
          </div>
        </div>
      )}

      {/* POPUP 3: แหล่งอ้างอิงทางวิชาการ */}
      {showReferenceModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }} onClick={() => setShowReferenceModal(false)}>
            <div className="fade-in custom-scrollbar" style={{ background: cardBg, padding: '25px', borderRadius: '20px', width: '100%', maxWidth: '550px', maxHeight: '85vh', overflowY: 'auto', border: `1px solid ${borderColor}`, boxShadow: '0 20px 50px rgba(0,0,0,0.5)', position: 'relative' }} onClick={e => e.stopPropagation()}>
                <button onClick={() => setShowReferenceModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: darkMode ? '#1e293b' : '#f1f5f9', border: 'none', width: '30px', height: '30px', borderRadius: '50%', color: textColor, cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                
                <h2 style={{ margin: '0 0 5px 0', color: textColor, fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>📚 หลักการและทฤษฎีอ้างอิง</h2>
                <p style={{ color: subTextColor, fontSize: '0.85rem', marginBottom: '20px', lineHeight: 1.5 }}>การประเมินดัชนีความเสี่ยงในระบบ อ้างอิงจากแบบจำลองและมาตรฐานทางวิทยาศาสตร์ระดับสากล เพื่อความแม่นยำในการเตือนภัย</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ background: darkMode ? '#1e293b' : '#f1f5f9', padding: '15px', borderRadius: '12px', borderLeft: '4px solid #ec4899' }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: textColor, marginBottom: '5px' }}>🫁 สุขภาพและทางเดินหายใจ</div>
                        <div style={{ fontSize: '0.8rem', color: subTextColor, marginBottom: '5px' }}><strong>อ้างอิง:</strong> งานวิจัยอาชีวเวชศาสตร์ และ EPA Air Quality Index</div>
                        <div style={{ fontSize: '0.85rem', color: textColor, lineHeight: 1.5 }}>การสัมผัสความร้อนสูงจะทำให้เยื่อบุทางเดินหายใจระคายเคือง กลไกการกรองฝุ่นตามธรรมชาติลดลง ดัชนีนี้จึงนำความเข้มข้นของ PM2.5 (70%) มาคูณร่วมกับ อุณหภูมิความร้อน (30%) เพื่อสะท้อนผลกระทบต่อปอดที่แท้จริง</div>
                    </div>
                    <div style={{ background: darkMode ? '#1e293b' : '#f1f5f9', padding: '15px', borderRadius: '12px', borderLeft: '4px solid #3b82f6' }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: textColor, marginBottom: '5px' }}>🏕️ กิจกรรมกลางแจ้ง</div>
                        <div style={{ fontSize: '0.8rem', color: subTextColor, marginBottom: '5px' }}><strong>อ้างอิง:</strong> มาตรฐานความปลอดภัย OSHA (Occupational Safety)</div>
                        <div style={{ fontSize: '0.85rem', color: textColor, lineHeight: 1.5 }}>การดำเนินกิจกรรมหรืองานกลางแจ้ง ไม่ได้ขึ้นอยู่กับฝนเพียงอย่างเดียว ดัชนีนี้ประเมินความปลอดภัยครอบคลุมทั้งอุปสรรคทางกายภาพ (ฝน 40%, ลม 30%) และภัยคุกคามทางสุขภาพ (ความร้อน 20%, UV 10%)</div>
                    </div>
                    <div style={{ background: darkMode ? '#1e293b' : '#f1f5f9', padding: '15px', borderRadius: '12px', borderLeft: '4px solid #ea580c' }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: textColor, marginBottom: '5px' }}>🔥 ความเสี่ยงไฟป่า</div>
                        <div style={{ fontSize: '0.8rem', color: subTextColor, marginBottom: '5px' }}><strong>อ้างอิง:</strong> แบบจำลอง Canadian Forest Fire Weather Index (FWI)</div>
                        <div style={{ fontSize: '0.85rem', color: textColor, lineHeight: 1.5 }}>ประเมินสภาวะที่เอื้อต่อการลุกลามของไฟ โดยคำนวณจากความเร็วลมที่เป็นตัวพัดพา (45%) ผสานกับสภาพอากาศที่ทำให้เชื้อเพลิงแห้งติดไฟง่าย คือ ความชื้นสัมพัทธ์ต่ำ (35%) และอุณหภูมิสูง (20%)</div>
                    </div>
                    <div style={{ background: darkMode ? '#1e293b' : '#f1f5f9', padding: '15px', borderRadius: '12px', borderLeft: '4px solid #ef4444' }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: textColor, marginBottom: '5px' }}>🥵 เฝ้าระวังโรคลมแดด</div>
                        <div style={{ fontSize: '0.8rem', color: subTextColor, marginBottom: '5px' }}><strong>อ้างอิง:</strong> องค์การอนามัยโลก (WHO) และดัชนี WBGT</div>
                        <div style={{ fontSize: '0.85rem', color: textColor, lineHeight: 1.5 }}>การประเมินโรคลมแดดที่แม่นยำ ต้องคำนวณ <b>"ภาระความร้อนรวม"</b> ที่ร่างกายได้รับ ดัชนีนี้จึงผสานอุณหภูมิอากาศ (60%) เข้ากับรังสีความร้อนจากดวงอาทิตย์หรือ UV (40%) เพื่อประเมินความเสี่ยงต่อภาวะหน้ามืดเฉียบพลัน</div>
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}