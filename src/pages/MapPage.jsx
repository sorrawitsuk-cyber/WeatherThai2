import React, { useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
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

function MapChangeView({ center }) {
  const map = useMap();
  useEffect(() => { 
      if (center && center.pos) {
          map.flyTo(center.pos, center.zoom, { animate: true, duration: 1.5 }); 
      }
  }, [center, map]);
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

const getProvTier = (provName) => {
    const p = provName.replace('จังหวัด', '').trim();
    const tier1 = ['กรุงเทพมหานคร', 'เชียงใหม่', 'ขอนแก่น', 'นครราชสีมา', 'ชลบุรี', 'สงขลา', 'ภูเก็ต', 'สุราษฎร์ธานี', 'พิษณุโลก', 'ประจวบคีรีขันธ์'];
    const tier2 = ['เชียงราย', 'อุดรธานี', 'อุบลราชธานี', 'นครสวรรค์', 'ระยอง', 'พระนครศรีอยุธยา', 'นครศรีธรรมราช', 'กระบี่', 'ตาก', 'กาญจนบุรี', 'สุรินทร์', 'เพชรบูรณ์'];
    const tier3 = ['แม่ฮ่องสอน', 'น่าน', 'ลำปาง', 'หนองคาย', 'สกลนคร', 'ร้อยเอ็ด', 'สระบุรี', 'ลพบุรี', 'สุพรรณบุรี', 'จันทบุรี', 'ตราด', 'ชุมพร', 'ตรัง', 'นครปฐม', 'สมุทรปราการ', 'บุรีรัมย์', 'ชัยภูมิ', 'พะเยา', 'ราชบุรี', 'เพชรบุรี', 'ศรีสะเกษ', 'ยโสธร', 'นนทบุรี', 'ปทุมธานี', 'เลย', 'อุตรดิตถ์', 'แพร่'];
    if (tier1.includes(p)) return 1;
    if (tier2.includes(p)) return 2;
    if (tier3.includes(p)) return 3;
    return 4;
};

// 🔧 Utility: หาสถานีที่ใกล้ที่สุดจากพิกัด GPS
const findClosestStation = (lat, lng, stationList) => {
    let closest = null; let minDistance = Infinity;
    stationList.forEach(st => {
        if (st.lat && st.long) {
            const dist = Math.sqrt(Math.pow(st.lat - lat, 2) + Math.pow(st.long - lng, 2));
            if (dist < minDistance) { minDistance = dist; closest = st; }
        }
    });
    return closest;
};

// 🩺 คำแนะนำเชิงปฏิบัติตามสถานการณ์
const getActionableAdvice = (pm25, temp, rain, uv, wind) => {
    const tips = [];
    if (pm25 > 75) tips.push({ icon: '😷', text: 'สวมหน้ากาก N95 เมื่อออกกลางแจ้ง', color: '#ef4444' });
    else if (pm25 >= 37.6) tips.push({ icon: '😷', text: 'ผู้ป่วยโรคทางเดินหายใจควรหลีกเลี่ยงกิจกรรมกลางแจ้ง', color: '#f97316' });
    if (temp > 39) tips.push({ icon: '🥤', text: 'ดื่มน้ำบ่อยๆ หลีกเลี่ยงแดดจัด เสี่ยงลมแดด', color: '#ef4444' });
    else if (temp >= 35) tips.push({ icon: '🧴', text: 'ทาครีมกันแดด สวมหมวก ดื่มน้ำเพียงพอ', color: '#f97316' });
    if (rain > 70) tips.push({ icon: '🌧️', text: 'พกร่ม เตรียมรับฝนตกหนัก ระวังน้ำท่วมฉับพลัน', color: '#1e3a8a' });
    if (uv > 7) tips.push({ icon: '🕶️', text: 'หลีกเลี่ยงแสงแดดช่วง 10:00-15:00 สวมแว่นกันแดด', color: '#a855f7' });
    if (wind > 40) tips.push({ icon: '⚠️', text: 'ลมแรงมาก ยึดของให้แน่น ระวังวัตถุปลิวมา', color: '#ef4444' });
    if (tips.length === 0) tips.push({ icon: '✅', text: 'สภาพอากาศเหมาะแก่การทำกิจกรรมปกติ', color: '#22c55e' });
    return tips;
};

export default function MapPage() {
  const { stations, stationTemps, stationDaily, darkMode, gistdaSummary, lastUpdated, amphoeData, tmdAvailable } = useContext(WeatherContext);
  
  const [geoData, setGeoData] = useState(null);
  const [geoError, setGeoError] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [mapZoom, setMapZoom] = useState(window.innerWidth < 1024 ? 5 : 6);
  const [polyOpacity, setPolyOpacity] = useState(0.7);
  
  const [mapCategory, setMapCategory] = useState('basic'); 
  const [activeBasicMode, setActiveBasicMode] = useState('pm25'); 
  const [activeRiskMode, setActiveRiskMode] = useState('respiratory');
  const [activeGistdaMode, setActiveGistdaMode] = useState('hotspots');
  const [dayOffset, setDayOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedHotspot, setSelectedHotspot] = useState(null); 
  const [showReferenceModal, setShowReferenceModal] = useState(false); 
  
  const [basemapStyle, setBasemapStyle] = useState('dark'); 
  const [flyToPos, setFlyToPos] = useState(null);
  const [showControls, setShowControls] = useState(window.innerWidth >= 1024);
  const [isLocating, setIsLocating] = useState(false);
  const [activePanel, setActivePanel] = useState(null); // 'legend' | 'layer' | 'time' | 'rank'

  const [flashProv, setFlashProv] = useState(null);
  const hasAutoLocated = useRef(false);
  const flashTimeoutRef = useRef(null);
  const geoJsonRef = useRef(null);

  const basemapUrls = {
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    osm: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
  };

  useEffect(() => { setBasemapStyle(darkMode ? 'dark' : 'light'); }, [darkMode]);

  // ✅ setFlash: ตั้ง flash province พร้อม auto-clear และ cleanup ป้องกัน memory leak
  const setFlash = useCallback((provName) => {
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    setFlashProv(provName);
    if (provName) {
      flashTimeoutRef.current = setTimeout(() => setFlashProv(null), 3000);
    }
  }, []);

  useEffect(() => () => { if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current); }, []);

  // ✅ handleLocateMe: รวม geolocation logic ที่ซ้ำกันใน mobile/desktop ไว้ที่เดียว
  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const closest = findClosestStation(p.coords.latitude, p.coords.longitude, stations);
        if (closest) {
          setFlyToPos({ pos: [closest.lat, closest.long], zoom: 8 });
          setFlash(closest.areaTH.replace('จังหวัด', '').trim());
        } else {
          setFlyToPos({ pos: [p.coords.latitude, p.coords.longitude], zoom: 8 });
        }
        setIsLocating(false);
      },
      () => { setIsLocating(false); }
    );
  }, [stations, setFlash]);

  // ✅ handleFocusTrap: ดัก Tab/Shift+Tab ไม่ให้หลุดออกจาก modal
  const handleFocusTrap = useCallback((e) => {
    if (e.key !== 'Tab') return;
    const focusable = Array.from(e.currentTarget.querySelectorAll(
      'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )).filter(el => !el.disabled);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }, []);

  // 🔑 ESC key ปิด Modal ทุกตัว
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (showReferenceModal) setShowReferenceModal(false);
        else if (selectedHotspot) setSelectedHotspot(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [selectedHotspot, showReferenceModal]);

  const fetchGeoData = useCallback(() => {
    setGeoError(false);
    fetch('/thailand.json')
      .then(res => { if (!res.ok) throw new Error('Network error'); return res.json(); })
      .then(data => setGeoData(data))
      .catch(e => { console.error(e); setGeoError(true); });
  }, []);

  useEffect(() => {
    const handleResize = () => { setIsMobile(window.innerWidth < 1024); if (window.innerWidth >= 1024) setShowControls(true); };
    window.addEventListener('resize', handleResize);
    fetchGeoData();
    return () => window.removeEventListener('resize', handleResize);
  }, [fetchGeoData]);

  // 🌟 UX แบ่งตามอุปกรณ์: มือถือออโต้ซูม (Portable) / คอมอยู่เฉยๆ (Monitor)
  useEffect(() => {
    if (stations && stations.length > 0 && !hasAutoLocated.current) {
        hasAutoLocated.current = true; 
        if (isMobile && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (p) => {
                    const closest = findClosestStation(p.coords.latitude, p.coords.longitude, stations);
                    if (closest) {
                        setFlyToPos({ pos: [closest.lat, closest.long], zoom: 8 });
                        setFlash(closest.areaTH.replace('จังหวัด', '').trim());
                    }
                },
                () => { console.log('Geolocation denied by user'); }
            );
        }
    }
  }, [stations, isMobile, setFlash]);

  useEffect(() => { 
      setSelectedHotspot(null); 
      if (mapCategory === 'gistda') setDayOffset(0);
  }, [mapCategory]);

  const basicModes = [
    { id: 'pm25', name: '😷 PM2.5', color: '#f97316', unit: 'µg/m³', desc: 'ความหนาแน่นของฝุ่นละอองขนาดเล็ก' },
    { id: 'temp', name: '🌡️ อุณหภูมิ', color: '#ef4444', unit: '°C', desc: 'อุณหภูมิอากาศปัจจุบัน' },
    { id: 'heat', name: '🥵 ดัชนีความร้อน', color: '#ea580c', unit: '°C', desc: 'อุณหภูมิที่ร่างกายรู้สึกจริง (รวมความชื้น)' },
    { id: 'rain', name: '☔ โอกาสฝน', color: '#3b82f6', unit: '%', desc: 'ความน่าจะเป็นในการเกิดฝนตก' },
    { id: 'wind', name: '🌬️ ลมกระโชก', color: '#0ea5e9', unit: 'km/h', desc: 'ความเร็วลมกระโชกสูงสุด' },
    { id: 'uv', name: '☀️ รังสี UV', color: '#a855f7', unit: 'ดัชนี', desc: 'ดัชนีรังสีอัลตราไวโอเลต' }
  ];

  const riskModes = [
    { id: 'respiratory', name: '🫁 สุขภาพและทางเดินหายใจ', color: '#ec4899', desc: 'คำนวณจาก: ฝุ่น PM2.5 (60%), ความชื้นสูง (20%), และความร้อน (20%)' },
    { id: 'outdoor', name: '🏕️ กิจกรรมกลางแจ้ง', color: '#3b82f6', desc: 'คำนวณจาก: ฝน (40%), ลม (30%), และความร้อน/UV (30%)' },
    { id: 'wildfire', name: '🔥 ความเสี่ยงไฟป่า', color: '#ea580c', desc: 'คำนวณจาก: ลมแรง (35%), อากาศแห้ง (30%), ไม่มีฝน (20%), และความร้อน (15%)' },
    { id: 'heatstroke', name: '🥵 เฝ้าระวังโรคลมแดด', color: '#ef4444', desc: 'คำนวณจาก: อุณหภูมิความร้อน (45%), ความชื้นสูง (30%), และรังสี UV (25%)' }
  ];

  const gistdaModes = [
    { id: 'hotspots', name: '🔥 จุดความร้อน (7 วัน)', color: '#ef4444', unit: 'จุด', desc: '🟢 ข้อมูลสดจาก GISTDA — จุดความร้อนสะสม 7 วันย้อนหลัง (Top 5)' },
    { id: 'burntArea', name: '🔥 พื้นที่เผาไหม้', color: '#ea580c', unit: 'ไร่', desc: '🟢 ข้อมูลสดจาก GISTDA — พื้นที่เผาไหม้สะสม 10 วัน (Top 5)' },
    { id: 'lowSoilMoisture', name: '🏜️ ความชื้นในดินต่ำ', color: '#f59e0b', unit: '%vol', desc: '🔴 ยังไม่มี API เชื่อมต่อ — รอระบบเชื่อมต่อ GISTDA ดาวเทียม', noApi: true },
    { id: 'lowVegetationMoisture', name: '🍂 ความชื้นพืชพรรณต่ำ', color: '#d97706', unit: 'ดัชนี', desc: '🔴 ยังไม่มี API เชื่อมต่อ — รอระบบเชื่อมต่อ GISTDA ดาวเทียม', noApi: true },
    { id: 'floodArea', name: '🌊 พื้นที่น้ำท่วม', color: '#3b82f6', unit: 'ไร่', desc: '🔴 ยังไม่มี API เชื่อมต่อ — รอระบบเชื่อมต่อ GISTDA ดาวเทียม', noApi: true }
  ];

  const getGistdaColor = useCallback((val, mode, rank) => {
    if (!val) return darkMode ? '#334155' : '#cbd5e1';
    const modeObj = gistdaModes.find(m => m.id === mode);
    const baseColor = modeObj ? modeObj.color : '#ef4444';
    // 🎨 FIX: ใช้ opacity ตามอันดับ (อันดับ 1 = เข้มสุด)
    if (rank !== undefined && rank >= 0) {
      const opacities = ['ff', 'cc', 'aa', '88', '66'];
      return baseColor + (opacities[rank] || 'ff');
    }
    return baseColor;
  }, [darkMode]);

  const getBasicVal = useCallback((station, mode) => {
    if (!station) return null;
    if (dayOffset === 0 || !stationDaily[station.stationID]?.temp) {
        const data = stationTemps[station.stationID] || {};
        switch(mode) {
            case 'pm25': return station.AQILast?.PM25?.value || 0;
            case 'temp': return Math.round(data.temp || 0);
            case 'heat': return Math.round(data.feelsLike || 0);
            case 'rain': return data.rainProb || 0;
            case 'wind': return Math.round(data.windSpeed || 0);
            case 'uv': return data.uv || 0;
            default: return 0;
        }
    } else {
        const idx = dayOffset + 7;
        const daily = stationDaily[station.stationID] || {};
        switch(mode) {
            case 'pm25': return daily.pm25?.[idx] || 0;
            case 'temp': return daily.temp?.[idx] || 0;
            case 'heat': return daily.heat?.[idx] || 0;
            case 'rain': return daily.rain?.[idx] || 0;
            case 'wind': return daily.wind?.[idx] || 0;
            case 'uv': return daily.uv?.[idx] || 0;
            default: return 0;
        }
    }
  }, [stationTemps, stationDaily, dayOffset]);

  const getBasicColor = useCallback((val, mode) => {
    if (val === null || val === undefined || val === '') return darkMode ? '#334155' : '#cbd5e1';
    if (mode === 'pm25') return val > 75 ? '#ef4444' : val >= 37.6 ? '#f97316' : val >= 25.1 ? '#eab308' : val >= 15.1 ? '#22c55e' : '#0ea5e9';
    if (mode === 'temp' || mode === 'heat') return val > 39 ? '#ef4444' : val >= 35 ? '#f97316' : val >= 29 ? '#eab308' : val >= 23 ? '#22c55e' : '#3b82f6';
    if (mode === 'rain') return val > 70 ? '#1e3a8a' : val >= 41 ? '#3b82f6' : val >= 11 ? '#60a5fa' : '#94a3b8';
    if (mode === 'wind') return val > 40 ? '#ef4444' : val >= 21 ? '#f97316' : val >= 11 ? '#eab308' : '#22c55e';
    if (mode === 'uv') return val > 10 ? '#a855f7' : val >= 8 ? '#ef4444' : val >= 6 ? '#ea580c' : val >= 3 ? '#eab308' : '#22c55e';
    return darkMode ? '#334155' : '#cbd5e1';
  }, [darkMode]);

  const calculateRisk = useCallback((station) => {
      let pm25 = 0, temp = 0, wind = 0, rain = 0, uv = 0, hum = 50;
      let humEstimated = false;

      if (dayOffset === 0 || !stationDaily[station.stationID]?.temp) {
          const data = stationTemps[station.stationID] || {};
          pm25 = station.AQILast?.PM25?.value || 0;
          temp = data.temp || 0;
          wind = data.windSpeed || 0;
          rain = data.rainProb || 0;
          uv = data.uv || 0;
          hum = data.humidity || 50;
      } else {
          const idx = dayOffset + 7;
          const daily = stationDaily[station.stationID] || {};
          pm25 = daily.pm25?.[idx] || 0;
          temp = daily.temp?.[idx] || 0;
          wind = daily.wind?.[idx] || 0;
          rain = daily.rain?.[idx] || 0;
          uv = daily.uv?.[idx] || 0;
          // ✅ FIX: ใช้ humidity จาก daily หากมี / ถ้าไม่มีจะประมาณจากข้อมูล real-time
          if (daily.humidity?.[idx]) {
              hum = daily.humidity[idx];
          } else {
              // Fallback: ใช้ค่าความชื้น real-time ปัจจุบัน (ดีกว่าค่า default 50)
              const currentData = stationTemps[station.stationID] || {};
              hum = currentData.humidity || 50;
              humEstimated = true;
          }
      }

      const nPm = Math.min(pm25 / 75 * 10, 10); 
      const nTemp = Math.max(0, Math.min((temp - 28) / 12 * 10, 10)); 
      const nWind = Math.min(wind / 40 * 10, 10); 
      const nRain = Math.min(rain / 80 * 10, 10); 
      const nUv = Math.min(uv / 11 * 10, 10); 
      const nHumDry = Math.max(0, 10 - (hum / 100 * 10)); 
      const nHumWet = Math.min(hum / 100 * 10, 10);
      const nNoRain = Math.max(0, 10 - (rain / 100 * 10));

      let score = 0;
      let factors = [];

      if (activeRiskMode === 'respiratory') {
          score = (nPm * 0.6) + (nHumWet * 0.2) + (nTemp * 0.2);
          factors = [{ label: 'มลพิษฝุ่น PM2.5', val: pm25, unit: 'µg/m³', risk: nPm, weight: 60, color: '#f97316' }, { label: `ความชื้นสัมพัทธ์สูง${humEstimated ? ' (ค่าประมาณ)' : ''}`, val: hum, unit: '%', risk: nHumWet, weight: 20, color: '#3b82f6' }, { label: 'อุณหภูมิความร้อน', val: temp, unit: '°C', risk: nTemp, weight: 20, color: '#ef4444' }];
      } else if (activeRiskMode === 'outdoor') {
          score = (nRain * 0.4) + (nWind * 0.3) + (nTemp * 0.2) + (nUv * 0.1);
          factors = [{ label: 'โอกาสเกิดฝนตก', val: rain, unit: '%', risk: nRain, weight: 40, color: '#3b82f6' }, { label: 'ความเร็วลมกระโชก', val: wind, unit: 'km/h', risk: nWind, weight: 30, color: '#0ea5e9' }, { label: 'อุณหภูมิความร้อน', val: temp, unit: '°C', risk: nTemp, weight: 20, color: '#ef4444' }, { label: 'ความเข้มรังสี UV', val: uv, unit: 'ดัชนี', risk: nUv, weight: 10, color: '#a855f7' }];
      } else if (activeRiskMode === 'wildfire') {
          score = (nWind * 0.35) + (nHumDry * 0.30) + (nNoRain * 0.20) + (nTemp * 0.15);
          factors = [{ label: 'ความเร็วลมกระโชก', val: wind, unit: 'km/h', risk: nWind, weight: 35, color: '#0ea5e9' }, { label: `ความแห้งแล้งของอากาศ${humEstimated ? ' (ประมาณ)' : ''}`, val: hum, unit: '%', risk: nHumDry, weight: 30, color: '#eab308' }, { label: 'ไม่มีฝนตก (เชื้อเพลิงแห้ง)', val: rain, unit: '%', risk: nNoRain, weight: 20, color: '#94a3b8' }, { label: 'อุณหภูมิความร้อน', val: temp, unit: '°C', risk: nTemp, weight: 15, color: '#ef4444' }];
      } else if (activeRiskMode === 'heatstroke') {
          score = (nTemp * 0.45) + (nHumWet * 0.30) + (nUv * 0.25);
          factors = [{ label: 'อุณหภูมิความร้อน', val: temp, unit: '°C', risk: nTemp, weight: 45, color: '#ef4444' }, { label: `ความชื้นสัมพัทธ์สูง${humEstimated ? ' (ประมาณ)' : ''} (เหงื่อไม่ระเหย)`, val: hum, unit: '%', risk: nHumWet, weight: 30, color: '#3b82f6' }, { label: 'ความเข้มรังสี UV', val: uv, unit: 'ดัชนี', risk: nUv, weight: 25, color: '#a855f7' }];
      }

      return { score: Math.min(Math.round(score * 10) / 10, 10), factors, humEstimated };
  }, [activeRiskMode, stationTemps, stationDaily, dayOffset]);

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
        let val = null, color = null;
        if (mapCategory === 'basic') {
            val = getBasicVal(st, activeBasicMode);
            color = getBasicColor(val, activeBasicMode);
        } else if (mapCategory === 'risk') {
            const risk = calculateRisk(st);
            val = risk.score;
            color = getRiskColor(risk.score);
        } else if (mapCategory === 'gistda') {
            if (gistdaSummary && gistdaSummary[activeGistdaMode]) {
                const provName = st.areaTH.replace('จังหวัด', '').trim();
                const foundIdx = gistdaSummary[activeGistdaMode].findIndex(item => item.province === provName);
                if (foundIdx >= 0) {
                    val = gistdaSummary[activeGistdaMode][foundIdx].value;
                    color = getGistdaColor(val, activeGistdaMode, foundIdx);
                } else {
                    val = 0;
                    color = darkMode ? '#334155' : '#cbd5e1';
                }
            } else {
                val = 0;
                color = darkMode ? '#334155' : '#cbd5e1';
            }
        }
        return { ...st, displayVal: val, color };
    }).filter(st => st.displayVal !== null && st.displayVal !== undefined);
  }, [stations, mapCategory, activeBasicMode, activeGistdaMode, calculateRisk, getBasicVal, getBasicColor, getRiskColor, getGistdaColor, gistdaSummary, darkMode]);

  const rankedSidebarData = useMemo(() => {
    if (mapCategory === 'gistda' && gistdaSummary && gistdaSummary[activeGistdaMode]) {
        return gistdaSummary[activeGistdaMode].filter(g => g.value > 0).map(gItem => {
            const st = allMapData.find(s => s.areaTH.replace('จังหวัด', '').trim() === gItem.province);
            return st || { stationID: gItem.province, areaTH: `จังหวัด${gItem.province}`, displayVal: gItem.value, color: getGistdaColor(gItem.value, activeGistdaMode) };
        });
    }
    return [...allMapData].sort((a, b) => b.displayVal - a.displayVal).slice(0, 15);
  }, [allMapData, mapCategory, activeGistdaMode, gistdaSummary, getGistdaColor]);



  const styleGeoJSON = (feature) => {
    const props = Object.values(feature.properties || {}).map(v => String(v).trim());
    let thaiNameFromMap = "";
    for (let p of props) if (provMap[p]) { thaiNameFromMap = provMap[p]; break; }
    
    const station = stations.find(s => {
        const cleanName = s.areaTH.replace('จังหวัด', '').trim();
        return cleanName === thaiNameFromMap || props.includes(cleanName);
    });

    let color = 'var(--border-color)';
    if (station) {
        const mapDataNode = allMapData.find(d => d.stationID === station.stationID);
        if (mapDataNode && mapDataNode.color) {
            color = mapDataNode.color;
        } else {
            if (mapCategory === 'basic') color = getBasicColor(getBasicVal(station, activeBasicMode), activeBasicMode);
            else if (mapCategory === 'risk') color = getRiskColor(calculateRisk(station).score);
        }
    }
    
    const cleanStationName = station ? station.areaTH.replace('จังหวัด', '').trim() : '';
    const isFlashed = cleanStationName !== '' && cleanStationName === flashProv;

    return { 
        fillColor: color, 
        weight: isFlashed ? 3 : 1,
        opacity: 1, 
        color: isFlashed ? '#0ea5e9' : (darkMode ? '#0f172a' : '#ffffff'),
        fillOpacity: polyOpacity,
        className: isFlashed ? 'arcgis-flash-polygon' : '' 
    };
  };

  const handleRegionClick = (station) => {
      if (mapCategory === 'risk') {
          const risk = calculateRisk(station);
          setSelectedHotspot({ type: 'risk', station, riskScore: risk.score, factors: risk.factors, color: getRiskColor(risk.score) });
      } else if (mapCategory === 'gistda') {
          const mapDataNode = allMapData.find(d => d.stationID === station.stationID);
          const val = mapDataNode ? mapDataNode.displayVal : 0;
          if (val > 0) {
              setSelectedHotspot({ type: 'gistda', station, val, color: mapDataNode.color });
          } else {
              const data = stationTemps[station.stationID] || {};
              const pm25 = station.AQILast?.PM25?.value || 0;
              setSelectedHotspot({ type: 'basic', station, data, pm25 });
          }
      } else {
          // Send raw daily values matching what we evaluated for dayOffset
          const daily = stationDaily[station.stationID] || {};
          const idx = dayOffset + 7;
          const data = dayOffset === 0 ? (stationTemps[station.stationID] || {}) : {
              temp: daily.temp?.[idx], feelsLike: daily.heat?.[idx], 
              rainProb: daily.rain?.[idx], windSpeed: daily.wind?.[idx], uv: daily.uv?.[idx]
          };
          const pm25 = dayOffset === 0 ? (station.AQILast?.PM25?.value || 0) : (daily.pm25?.[idx] || 0);
          setSelectedHotspot({ type: 'basic', station, data, pm25 });
      }
      
      setFlyToPos({ pos: [station.lat, station.long], zoom: 8 });
      setFlash(station.areaTH.replace('จังหวัด', '').trim());
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

  // ✅ อัป style flash โดยตรงบน layer ที่มีอยู่ — ไม่ต้อง remount GeoJSON ทั้งหมด
  useEffect(() => {
    if (!geoJsonRef.current) return;
    geoJsonRef.current.eachLayer(layer => {
      const props = Object.values(layer.feature?.properties || {}).map(v => String(v).trim());
      let thaiName = '';
      for (const p of props) if (provMap[p]) { thaiName = provMap[p]; break; }
      const cleanName = thaiName.replace('จังหวัด', '').trim();
      const isFlashed = !!flashProv && cleanName === flashProv;
      layer.setStyle({
        weight: isFlashed ? 3 : 1,
        color: isFlashed ? '#0ea5e9' : (darkMode ? '#0f172a' : '#ffffff'),
      });
    });
  }, [flashProv, darkMode]);

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

  const appBg = 'var(--bg-app)'; 
  const cardBg = 'var(--bg-card)';
  const textColor = 'var(--text-main)'; 
  const borderColor = 'var(--border-color)';
  const subTextColor = 'var(--text-sub)'; 

  const activeModeObj = mapCategory === 'basic' ? basicModes.find(m => m.id === activeBasicMode) : 
                        mapCategory === 'risk' ? riskModes.find(m => m.id === activeRiskMode) : 
                        gistdaModes.find(m => m.id === activeGistdaMode);

  const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const getDateLabel = (offset) => {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      const day = d.getDate();
      const month = thaiMonths[d.getMonth()];
      const year = d.getFullYear() + 543;
      const shortYear = String(year).slice(-2);
      return `${day} ${month} ${shortYear}`;
  };

  const getLastUpdatedText = () => {
      if (!lastUpdated) return 'ไม่ทราบวันที่อัปเดต';
      const d = new Date(lastUpdated);
      // Convert to Bangkok time
      const bkk = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
      const day = bkk.getDate();
      const month = thaiMonths[bkk.getMonth()];
      const year = bkk.getFullYear() + 543;
      const hh = String(bkk.getHours()).padStart(2, '0');
      const mm = String(bkk.getMinutes()).padStart(2, '0');
      return `${day} ${month} ${year}, ${hh}:${mm} น.`;
  };

  const getPm25QualityText = (val) => {
      if (val > 75) return { text: 'มีผลกระทบต่อสุขภาพ', color: '#ef4444' };
      if (val >= 37.6) return { text: 'เริ่มมีผลกระทบเล็กน้อย', color: '#f97316' };
      if (val >= 25.1) return { text: 'ปานกลาง', color: '#eab308' };
      if (val >= 15.1) return { text: 'คุณภาพดี', color: '#22c55e' };
      return { text: 'คุณภาพดีมาก', color: '#0ea5e9' };
  };

  const getDynamicLegendContent = () => {
    if (mapCategory === 'risk') {
        return [
            { c: '#ef4444', l: 'วิกฤต/อันตราย', r: '8-10' },
            { c: '#f97316', l: 'ควรเฝ้าระวัง', r: '6-7.9' },
            { c: '#eab308', l: 'ปานกลาง', r: '4-5.9' },
            { c: '#22c55e', l: 'สถานการณ์ปกติ', r: '0-3.9' }
        ];
    }
    if (mapCategory === 'gistda') {
        return [
            { c: activeModeObj?.color || '#ef4444', l: 'ติดอันดับ Top 5 ที่เฝ้าระวัง', r: 'สูงสุด' },
            { c: darkMode ? '#334155' : '#cbd5e1', l: 'ไม่มีรายงาน / สภาพปกติ', r: '-' }
        ];
    }
    switch (activeBasicMode) {
        case 'pm25': return [{ c: '#ef4444', l: isMobile ? 'มีผลกระทบฯ' : 'มีผลกระทบต่อสุขภาพ', r: '> 75' }, { c: '#f97316', l: isMobile ? 'เริ่มมีผลกระทบฯ' : 'เริ่มมีผลกระทบต่อสุขภาพ', r: '37.6-75.0' }, { c: '#eab308', l: 'ปานกลาง', r: '25.1-37.5' }, { c: '#22c55e', l: 'ดี', r: '15.1-25.0' }, { c: '#0ea5e9', l: 'ดีมาก', r: '0-15.0' }];
        case 'temp':
        case 'heat': return [{ c: '#ef4444', l: 'ร้อนจัด', r: '> 39' }, { c: '#f97316', l: 'ร้อน', r: '35-39' }, { c: '#eab308', l: 'อบอ้าว', r: '29-34' }, { c: '#22c55e', l: 'ปกติ/อบอุ่น', r: '23-28' }, { c: '#3b82f6', l: 'เย็นสบาย', r: '< 23' }];
        case 'rain': return [{ c: '#1e3a8a', l: 'ตกหนัก/พายุ', r: '> 70%' }, { c: '#3b82f6', l: 'โอกาสตกสูง', r: '41-70%' }, { c: '#60a5fa', l: 'โอกาสตกต่ำ', r: '11-40%' }, { c: '#94a3b8', l: 'ไม่มีฝน', r: '0-10%' }];
        case 'wind': return [{ c: '#ef4444', l: 'พายุ/อันตราย', r: '> 40' }, { c: '#f97316', l: 'ลมแรง', r: '21-40' }, { c: '#eab308', l: 'ลมกำลังดี', r: '11-20' }, { c: '#22c55e', l: 'ลมสงบ', r: '0-10' }];
        case 'uv': return [{ c: '#a855f7', l: 'อันตรายรุนแรง', r: '> 10' }, { c: '#ef4444', l: 'สูงมาก', r: '8-10' }, { c: '#ea580c', l: 'สูง', r: '6-7' }, { c: '#eab308', l: 'ปานกลาง', r: '3-5' }, { c: '#22c55e', l: 'ต่ำ', r: '0-2' }];
        default: return [];
    }
  };

  if (geoError) return (
    <div className="loading-container" style={{ background: appBg, color: textColor }}>
        <div style={{ fontSize: '3rem', marginBottom: '15px' }}>⚠️</div>
        <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>ไม่สามารถโหลดข้อมูลแผนที่ได้</div>
        <div style={{ fontSize: '0.85rem', color: subTextColor, marginTop: '5px', marginBottom: '20px' }}>กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่</div>
        <button onClick={fetchGeoData} style={{ background: '#0ea5e9', color: '#fff', border: 'none', padding: '10px 25px', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}>🔄 ลองใหม่อีกครั้ง</button>
    </div>
  );

  if (!geoData || Object.keys(stationTemps).length === 0) return (
    <div className="loading-container" style={{ background: appBg, color: textColor }}>
        <div className="loading-spinner"></div>
        <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>กำลังเตรียมแผนที่เฝ้าระวังภัย...</div>
        <div style={{ fontSize: '0.85rem', color: subTextColor, marginTop: '5px' }}>ประมวลผลข้อมูลทั้ง 77 จังหวัด</div>
    </div>
  );

  return (
    <div style={{ height: '100%', width: '100%', background: appBg, display: 'flex', flexDirection: 'column', fontFamily: 'Kanit, sans-serif', padding: isMobile ? '0' : '20px', boxSizing: 'border-box' }}>
      
      {/* === DESKTOP HEADER (ซ่อนบนมือถือ) === */}
      {!isMobile && (
        <>
          <div style={{ display: 'flex', flexDirection: 'row', gap: '15px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px', flexShrink: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                          <div>
                              <h2 style={{ margin: 0, color: textColor, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>🗺️ แผนที่เฝ้าระวังภัย</h2>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 8px #22c55e', animation: 'pulse 2s infinite' }}></span>
                                  <span style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold' }}>ข้อมูลตามเวลาจริง {tmdAvailable && '• 📡 TMD'} • อัปเดตล่าสุด: {getLastUpdatedText()}</span>
                              </div>
                          </div>
                          <div style={{ display: 'flex', background: cardBg, borderRadius: '50px', border: `1px solid ${borderColor}`, padding: '4px' }}>
                              <button onClick={() => setMapCategory('basic')} style={{ background: mapCategory === 'basic' ? '#0ea5e9' : 'transparent', color: mapCategory === 'basic' ? '#fff' : subTextColor, border: 'none', padding: '6px 20px', borderRadius: '50px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', fontFamily: 'Kanit' }}>📊 ข้อมูลทั่วไป</button>
                              <button onClick={() => setMapCategory('risk')} style={{ background: mapCategory === 'risk' ? '#8b5cf6' : 'transparent', color: mapCategory === 'risk' ? '#fff' : subTextColor, border: 'none', padding: '6px 20px', borderRadius: '50px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', fontFamily: 'Kanit' }}>🧠 วิเคราะห์ความเสี่ยง</button>
                              <button onClick={() => setMapCategory('gistda')} style={{ background: mapCategory === 'gistda' ? '#ef4444' : 'transparent', color: mapCategory === 'gistda' ? '#fff' : subTextColor, border: 'none', padding: '6px 20px', borderRadius: '50px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', fontFamily: 'Kanit' }}>🛰️ พิบัติภัย (GISTDA)</button>
                          </div>
                      </div>
                      {mapCategory === 'risk' && (
                          <button onClick={() => setShowReferenceModal(true)} style={{ background: 'var(--bg-secondary)', color: '#8b5cf6', border: `1px solid #8b5cf6`, padding: '6px 15px', borderRadius: '50px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Kanit', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}>
                              📚 แหล่งอ้างอิงทางวิชาการ
                          </button>
                      )}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {mapCategory === 'basic' ? basicModes.map(m => (
                        <button key={m.id} onClick={() => setActiveBasicMode(m.id)} style={{ padding: '8px 15px', borderRadius: '12px', border: `1px solid ${activeBasicMode === m.id ? m.color : borderColor}`, background: activeBasicMode === m.id ? (darkMode ? `${m.color}20` : `${m.color}15`) : cardBg, color: activeBasicMode === m.id ? m.color : textColor, fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Kanit', fontSize: '0.9rem' }}>{m.name}</button>
                    )) : mapCategory === 'risk' ? riskModes.map(m => (
                        <button key={m.id} onClick={() => setActiveRiskMode(m.id)} style={{ padding: '8px 15px', borderRadius: '12px', border: `1px solid ${activeRiskMode === m.id ? m.color : borderColor}`, background: activeRiskMode === m.id ? (darkMode ? `${m.color}20` : `${m.color}15`) : cardBg, color: activeRiskMode === m.id ? m.color : textColor, fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Kanit', fontSize: '0.9rem' }}>{m.name}</button>
                    )) : gistdaModes.map(m => (
                        <button key={m.id} onClick={() => setActiveGistdaMode(m.id)} style={{ padding: '8px 15px', borderRadius: '12px', border: `1px solid ${activeGistdaMode === m.id ? m.color : borderColor}`, background: activeGistdaMode === m.id ? (darkMode ? `${m.color}20` : `${m.color}15`) : cardBg, color: activeGistdaMode === m.id ? m.color : textColor, fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Kanit', fontSize: '0.9rem' }}>{m.name}</button>
                    ))}
                  </div>
              </div>
          </div>

          {mapCategory !== 'gistda' ? (
              <div style={{ background: cardBg, padding: '10px 15px', borderRadius: '12px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px', flexShrink: 0, boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold', cursor: 'pointer' }} onClick={()=>setDayOffset(-7)}>◀ {getDateLabel(-7)}</span>
                      <span style={{ fontSize: '0.85rem', color: dayOffset === 0 ? textColor : dayOffset < 0 ? '#60a5fa' : '#c084fc', fontWeight: 'bold', background: 'var(--bg-secondary)', padding: '4px 15px', borderRadius: '50px', border: `1px solid ${borderColor}`, display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: dayOffset !== 0 ? 'pointer' : 'default' }} onClick={() => setDayOffset(0)}>
                      {dayOffset === 0 ? `📅 วันนี้ ${getDateLabel(0)} • ข้อมูลสด` : dayOffset < 0 ? `🕒 ${getDateLabel(dayOffset)}` : `🔮 ${getDateLabel(dayOffset)}`}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold', cursor: 'pointer' }} onClick={()=>setDayOffset(7)}>{getDateLabel(7)} ▶</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input type="range" min="-7" max="7" step="1" value={dayOffset} onChange={(e) => setDayOffset(parseInt(e.target.value))} aria-label="เลือกวันที่ดูข้อมูล" style={{ flex: 1, accentColor: activeModeObj?.color || '#0ea5e9', cursor: 'pointer', height: '6px' }} />
                      {dayOffset !== 0 && (
                          <button onClick={() => setDayOffset(0)} style={{ background: 'var(--bg-secondary)', color: activeModeObj?.color || '#0ea5e9', border: `1px solid ${borderColor}`, padding: '3px 10px', borderRadius: '50px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Kanit', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>⏱ วันนี้</button>
                      )}
                  </div>
                  {Math.abs(dayOffset) >= 4 && (
                      <div style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>⚠️ ข้อมูล{dayOffset > 0 ? 'พยากรณ์ระยะไกล' : 'ย้อนหลังระยะไกล'} — ความแม่นยำอาจลดลงอย่างมีนัยสำคัญ</div>
                  )}
                  {dayOffset !== 0 && mapCategory === 'risk' && (
                      <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>⚠ หมายเหตุ: ค่าความชื้นใช้ค่าประมาณจากข้อมูลล่าสุด เนื่องจากไม่มีข้อมูลพยากรณ์ความชื้น</div>
                  )}
              </div>
          ) : (
              <div style={{ background: cardBg, padding: '8px 15px', borderRadius: '12px', border: `1px solid ${borderColor}`, marginBottom: '15px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold' }}>
                  ℹ️ ข้อมูลจากดาวเทียม GISTDA แสดงค่าสะสมล่าสุดเท่านั้น — ไม่สามารถเลือกดูย้อนหลังหรือพยากรณ์ได้
              </div>
          )}
        </>
      )}

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', flex: 1, gap: isMobile ? '0' : '15px', overflow: 'hidden' }}>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: isMobile ? '0' : '15px' }}>
              <div style={{ flex: 1, borderRadius: isMobile ? '0' : '20px', overflow: 'hidden', border: isMobile ? 'none' : `1px solid ${borderColor}`, position: 'relative', minHeight: isMobile ? 'calc(100vh - 120px)' : 'auto', background: cardBg }}>
                
                <MapContainer center={[13.5, 100.5]} zoom={isMobile ? 5 : 6} style={{ height: '100%', width: '100%', background: appBg }} zoomControl={false}>
                    <TileLayer url={basemapUrls[basemapStyle]} />
                    <MapZoomListener setMapZoom={setMapZoom} />
                    <MapChangeView center={flyToPos} />
                    
                    {geoData && <GeoJSON ref={geoJsonRef} key={`${mapCategory}-${activeRiskMode}-${activeBasicMode}-${activeGistdaMode}-${dayOffset}-${polyOpacity}-${basemapStyle}`} data={geoData} style={styleGeoJSON} onEachFeature={onEachFeature} />}
                    
                    {allMapData.map(st => {
                        let isVisible = false;

                        if (mapCategory === 'gistda') {
                            isVisible = st.displayVal > 0;
                        } else {
                            const name = st.areaTH.replace('จังหวัด', '').trim();
                            const tier = getProvTier(name);
                            if (mapZoom >= 8) {
                                isVisible = true;
                            } else if (mapZoom === 7) {
                                isVisible = tier <= 3;
                            } else if (mapZoom === 6) {
                                isVisible = tier <= 2;
                            } else {
                                isVisible = tier <= 1; // mapZoom <= 5
                            }
                        }

                        if (!isVisible) return null;
                        return <Marker key={st.stationID} position={[st.lat, st.long]} icon={createMapIcon(st.areaTH.replace('จังหวัด',''), st.displayVal, st.color)} interactive={false} />;
                    })}
                    
                    {/* 🆕 Amphoe markers — แสดงเมื่อซูมเข้าไประดับอำเภอ (zoom >= 9) */}
                    {mapZoom >= 9 && mapCategory === 'basic' && amphoeData?.provinces && (() => {
                        const amphoeMarkers = [];
                        Object.entries(amphoeData.provinces).forEach(([provName, provData]) => {
                            (provData.amphoes || []).forEach((a, i) => {
                                if (!a.lat || !a.lon) return;
                                let val = 0, color = '#94a3b8';
                                if (activeBasicMode === 'temp' && a.tc != null) {
                                    val = Math.round(a.tc);
                                    color = getBasicColor(val, 'temp');
                                } else if (activeBasicMode === 'rain' && a.rain != null) {
                                    val = Math.round(a.rain);
                                    color = a.rain > 5 ? '#1e3a8a' : a.rain > 1 ? '#3b82f6' : a.rain > 0 ? '#60a5fa' : '#94a3b8';
                                } else if (activeBasicMode === 'wind' && a.ws != null) {
                                    val = Math.round(a.ws);
                                    color = getBasicColor(val, 'wind');
                                } else {
                                    return; // ไม่แสดงอำเภอในโหมดที่ TMD ไม่มีข้อมูล
                                }
                                const label = a.n || 'อำเภอ';
                                amphoeMarkers.push(
                                    <Marker key={`amp-${provName}-${i}`} position={[a.lat, a.lon]} icon={L.divIcon({
                                        className: 'custom-amphoe-icon',
                                        html: `<div style="background: ${color}cc; color: ${color === '#eab308' || color === '#cbd5e1' ? '#0f172a' : '#fff'}; font-weight: 700; font-size: 8px; padding: 2px 5px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.4); box-shadow: 0 2px 6px rgba(0,0,0,0.2); display: flex; flex-direction: column; align-items: center; line-height: 1.1; white-space: nowrap;"><span style='font-size:6px;opacity:0.85'>${label}</span><span>${val}</span></div>`,
                                        iconSize: [44, 24], iconAnchor: [22, 12]
                                    })} interactive={false} />
                                );
                            });
                        });
                        return amphoeMarkers;
                    })()}
                </MapContainer>

                {/* === LEGEND: เล็กลงบนมือถือ / collapsible === */}
                {isMobile ? (
                  <>
                    {/* Legend toggle chip */}
                    <button
                      onClick={() => setActivePanel(p => p === 'legend' ? null : 'legend')}
                      style={{ position: 'absolute', bottom: '16px', left: '12px', zIndex: 1001, background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '20px', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 10px rgba(0,0,0,0.25)', cursor: 'pointer', fontFamily: 'Kanit', fontSize: '0.7rem', color: textColor, fontWeight: 'bold' }}
                      aria-label="แสดง/ซ่อนสัญลักษณ์แผนที่"
                    >
                      <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: activeModeObj?.color || '#0ea5e9', display: 'inline-block', flexShrink: 0 }}></span>
                      {activePanel === 'legend' ? '✕' : '📋 สัญลักษณ์'}
                    </button>
                    {activePanel === 'legend' && (
                      <div className="fade-in" style={{ position: 'absolute', bottom: '48px', left: '12px', zIndex: 1001, background: cardBg, padding: '10px 12px', borderRadius: '12px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 15px rgba(0,0,0,0.2)', maxWidth: 'calc(100vw - 80px)' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: subTextColor, marginBottom: '6px' }}>เกณฑ์ระดับ {activeModeObj?.name}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {getDynamicLegendContent().map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: textColor }}>
                              <span style={{ display: 'inline-block', width: '9px', height: '9px', background: item.c, borderRadius: '50%', flexShrink: 0 }}></span>
                              <span style={{ fontWeight: 'bold' }}>{item.r}</span>
                              <span style={{ opacity: 0.75 }}>({item.l})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ position: 'absolute', bottom: '15px', left: '15px', zIndex: 1000, background: cardBg, padding: '10px', borderRadius: '12px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 15px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: subTextColor }}>เกณฑ์ระดับ {activeModeObj?.name}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 15px' }}>
                      {getDynamicLegendContent().map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: textColor }}>
                          <span style={{ display: 'inline-block', width: '10px', height: '10px', background: item.c, borderRadius: '50%', border: `1px solid var(--border-color)` }}></span>
                          <span style={{ fontWeight: 'bold' }}>{item.r}</span> <span style={{ opacity: 0.8 }}>({item.l})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* === FLOATING MAP CONTROLS (top-right) === */}
                <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>

                  {isMobile ? (
                    /* ---- MOBILE floating icon row ---- */
                    <>
                      {/* Row of quick icon buttons */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

                        {/* 📍 Locate me */}
                        <button
                          aria-label="พิกัดของฉัน"
                          onClick={handleLocateMe}
                          style={{ width: '40px', height: '40px', borderRadius: '50%', background: cardBg, border: `1px solid ${borderColor}`, fontSize: '1.1rem', boxShadow: '0 2px 10px rgba(0,0,0,0.3)', cursor: isLocating ? 'wait' : 'pointer', opacity: isLocating ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >{isLocating ? '⏳' : '📍'}</button>

                        {/* 🗂️ Layer panel toggle */}
                        <button
                          aria-label="เลือกเลเยอร์แผนที่"
                          onClick={() => setActivePanel(p => p === 'layer' ? null : 'layer')}
                          style={{ width: '40px', height: '40px', borderRadius: '50%', background: activePanel === 'layer' ? '#0ea5e9' : cardBg, border: `1px solid ${activePanel === 'layer' ? '#0ea5e9' : borderColor}`, fontSize: '1.1rem', boxShadow: '0 2px 10px rgba(0,0,0,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >🗂️</button>

                        {/* ⏱️ Time panel toggle */}
                        {mapCategory !== 'gistda' && (
                          <button
                            aria-label="เลือกช่วงเวลา"
                            onClick={() => setActivePanel(p => p === 'time' ? null : 'time')}
                            style={{ width: '40px', height: '40px', borderRadius: '50%', background: activePanel === 'time' ? (dayOffset !== 0 ? (dayOffset < 0 ? '#3b82f6' : '#a855f7') : cardBg) : cardBg, border: `1px solid ${activePanel === 'time' || dayOffset !== 0 ? (dayOffset < 0 ? '#3b82f6' : dayOffset > 0 ? '#a855f7' : borderColor) : borderColor}`, fontSize: '1.1rem', boxShadow: '0 2px 10px rgba(0,0,0,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
                          >
                            {dayOffset !== 0 && <span style={{ position: 'absolute', top: '-3px', right: '-3px', width: '10px', height: '10px', borderRadius: '50%', background: dayOffset < 0 ? '#3b82f6' : '#a855f7', border: `2px solid ${cardBg}` }}></span>}
                            📅
                          </button>
                        )}

                        {/* 📊 Rank panel toggle */}
                        <button
                          aria-label="อันดับจังหวัด"
                          onClick={() => setActivePanel(p => p === 'rank' ? null : 'rank')}
                          style={{ width: '40px', height: '40px', borderRadius: '50%', background: activePanel === 'rank' ? '#f97316' : cardBg, border: `1px solid ${activePanel === 'rank' ? '#f97316' : borderColor}`, fontSize: '1.1rem', boxShadow: '0 2px 10px rgba(0,0,0,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >📊</button>

                        {/* 📚 Reference (risk mode only) */}
                        {mapCategory === 'risk' && (
                          <button
                            aria-label="แหล่งอ้างอิง"
                            onClick={() => setShowReferenceModal(true)}
                            style={{ width: '40px', height: '40px', borderRadius: '50%', background: cardBg, border: `1px solid #8b5cf6`, fontSize: '1.1rem', boxShadow: '0 2px 10px rgba(0,0,0,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >📚</button>
                        )}
                      </div>

                      {/* === LAYER PANEL dropdown === */}
                      {activePanel === 'layer' && (
                        <div className="fade-in" style={{ position: 'absolute', top: '0', right: '52px', background: 'var(--bg-nav-blur)', backdropFilter: 'blur(12px)', padding: '12px', borderRadius: '16px', border: `1px solid ${borderColor}`, width: '220px', boxShadow: '0 4px 20px rgba(0,0,0,0.25)', zIndex: 1002 }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: textColor, marginBottom: '10px' }}>🗺️ ประเภทแผนที่</div>
                          <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '12px', padding: '3px', marginBottom: '10px' }}>
                            <button onClick={() => { setMapCategory('basic'); setActivePanel(null); }} style={{ flex: 1, background: mapCategory === 'basic' ? '#0ea5e9' : 'transparent', color: mapCategory === 'basic' ? '#fff' : subTextColor, border: 'none', padding: '5px 2px', borderRadius: '10px', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Kanit' }}>📊<br/>ทั่วไป</button>
                            <button onClick={() => { setMapCategory('risk'); setActivePanel(null); }} style={{ flex: 1, background: mapCategory === 'risk' ? '#8b5cf6' : 'transparent', color: mapCategory === 'risk' ? '#fff' : subTextColor, border: 'none', padding: '5px 2px', borderRadius: '10px', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Kanit' }}>🧠<br/>ความเสี่ยง</button>
                            <button onClick={() => { setMapCategory('gistda'); setActivePanel(null); }} style={{ flex: 1, background: mapCategory === 'gistda' ? '#ef4444' : 'transparent', color: mapCategory === 'gistda' ? '#fff' : subTextColor, border: 'none', padding: '5px 2px', borderRadius: '10px', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Kanit' }}>🛰️<br/>พิบัติภัย</button>
                          </div>
                          <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: subTextColor, marginBottom: '6px' }}>ชั้นข้อมูล</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '200px', overflowY: 'auto' }} className="custom-scrollbar">
                            {mapCategory === 'basic' ? basicModes.map(m => (
                              <button key={m.id} onClick={() => { setActiveBasicMode(m.id); setActivePanel(null); }} style={{ padding: '6px 10px', borderRadius: '10px', border: `1px solid ${activeBasicMode === m.id ? m.color : borderColor}`, background: activeBasicMode === m.id ? (darkMode ? `${m.color}25` : `${m.color}18`) : 'var(--bg-secondary)', color: activeBasicMode === m.id ? m.color : textColor, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Kanit', fontSize: '0.75rem', textAlign: 'left' }}>{m.name}</button>
                            )) : mapCategory === 'risk' ? riskModes.map(m => (
                              <button key={m.id} onClick={() => { setActiveRiskMode(m.id); setActivePanel(null); }} style={{ padding: '6px 10px', borderRadius: '10px', border: `1px solid ${activeRiskMode === m.id ? m.color : borderColor}`, background: activeRiskMode === m.id ? (darkMode ? `${m.color}25` : `${m.color}18`) : 'var(--bg-secondary)', color: activeRiskMode === m.id ? m.color : textColor, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Kanit', fontSize: '0.75rem', textAlign: 'left' }}>{m.name}</button>
                            )) : gistdaModes.map(m => (
                              <button key={m.id} onClick={() => { setActiveGistdaMode(m.id); setActivePanel(null); }} style={{ padding: '6px 10px', borderRadius: '10px', border: `1px solid ${activeGistdaMode === m.id ? m.color : borderColor}`, background: activeGistdaMode === m.id ? (darkMode ? `${m.color}25` : `${m.color}18`) : 'var(--bg-secondary)', color: activeGistdaMode === m.id ? m.color : textColor, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Kanit', fontSize: '0.75rem', textAlign: 'left' }}>{m.name}</button>
                            ))}
                          </div>
                          <div style={{ borderTop: `1px solid ${borderColor}`, marginTop: '10px', paddingTop: '10px' }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: textColor, marginBottom: '6px' }}>รูปแบบแผนที่</div>
                            <select value={basemapStyle} onChange={(e) => setBasemapStyle(e.target.value)} style={{ width: '100%', background: 'var(--bg-secondary)', color: textColor, border: `1px solid ${borderColor}`, padding: '6px', borderRadius: '8px', fontSize: '0.75rem', outline: 'none', fontFamily: 'Kanit' }}>
                              <option value="dark">สีเข้ม (Dark)</option><option value="light">สีสว่าง (Light)</option><option value="osm">ถนน (Street)</option><option value="satellite">ดาวเทียม</option>
                            </select>
                            <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: textColor, marginTop: '8px', marginBottom: '4px' }}>ความทึบ</div>
                            <input type="range" min="0.1" max="1" step="0.1" value={polyOpacity} onChange={(e) => setPolyOpacity(parseFloat(e.target.value))} style={{ width: '100%', accentColor: activeModeObj?.color }} />
                          </div>
                        </div>
                      )}

                      {/* === TIME PANEL dropdown === */}
                      {activePanel === 'time' && mapCategory !== 'gistda' && (
                        <div className="fade-in" style={{ position: 'absolute', top: '96px', right: '52px', background: 'var(--bg-nav-blur)', backdropFilter: 'blur(12px)', padding: '12px', borderRadius: '16px', border: `1px solid ${borderColor}`, width: '240px', boxShadow: '0 4px 20px rgba(0,0,0,0.25)', zIndex: 1002 }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: textColor, marginBottom: '8px' }}>📅 เลือกช่วงเวลา</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.65rem', color: subTextColor, cursor: 'pointer' }} onClick={() => setDayOffset(-7)}>◀ {getDateLabel(-7)}</span>
                            <span style={{ fontSize: '0.75rem', color: dayOffset === 0 ? textColor : dayOffset < 0 ? '#60a5fa' : '#c084fc', fontWeight: 'bold', background: 'var(--bg-secondary)', padding: '3px 10px', borderRadius: '20px', border: `1px solid ${borderColor}`, cursor: dayOffset !== 0 ? 'pointer' : 'default' }} onClick={() => setDayOffset(0)}>
                              {dayOffset === 0 ? '📅 วันนี้' : dayOffset < 0 ? `🕒 ${getDateLabel(dayOffset)}` : `🔮 ${getDateLabel(dayOffset)}`}
                            </span>
                            <span style={{ fontSize: '0.65rem', color: subTextColor, cursor: 'pointer' }} onClick={() => setDayOffset(7)}>{getDateLabel(7)} ▶</span>
                          </div>
                          <input type="range" min="-7" max="7" step="1" value={dayOffset} onChange={(e) => setDayOffset(parseInt(e.target.value))} aria-label="เลือกวันที่" style={{ width: '100%', accentColor: activeModeObj?.color || '#0ea5e9', cursor: 'pointer' }} />
                          {Math.abs(dayOffset) >= 4 && (
                            <div style={{ fontSize: '0.65rem', color: '#f59e0b', fontWeight: 'bold', marginTop: '6px' }}>⚠️ ความแม่นยำน้อยลง</div>
                          )}
                        </div>
                      )}

                      {/* === RANK PANEL (slide up from bottom on mobile) === */}
                      {activePanel === 'rank' && (
                        <div className="fade-in" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 2000, background: cardBg, borderRadius: '20px 20px 0 0', border: `1px solid ${borderColor}`, boxShadow: '0 -4px 30px rgba(0,0,0,0.3)', maxHeight: '65vh', display: 'flex', flexDirection: 'column', padding: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', color: textColor }}>📍 {mapCategory === 'risk' ? 'พื้นที่เสี่ยงสูงสุด' : mapCategory === 'gistda' ? 'พื้นที่วิกฤต' : 'อันดับสูงสุด'}</h3>
                            <button onClick={() => setActivePanel(null)} style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', color: textColor, cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}>✕</button>
                          </div>
                          <p style={{ margin: '0 0 8px 0', fontSize: '0.7rem', color: activeModeObj?.color, fontWeight: 'bold' }}>{activeModeObj?.desc}</p>
                          <input type="text" placeholder="🔍 ค้นหาจังหวัด..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: `1px solid ${borderColor}`, background: 'var(--bg-secondary)', color: textColor, fontSize: '0.85rem', fontFamily: 'Kanit', outline: 'none', marginBottom: '10px', boxSizing: 'border-box' }} />
                          <div style={{ flex: 1, overflowY: 'auto' }} className="custom-scrollbar">
                            {mapCategory === 'gistda' && activeModeObj?.noApi && (
                              <div style={{ textAlign: 'center', padding: '20px', color: subTextColor }}>
                                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🛰️</div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#f59e0b' }}>ยังไม่มีข้อมูลจาก API</div>
                              </div>
                            )}
                            {mapCategory === 'gistda' && !activeModeObj?.noApi && rankedSidebarData.length === 0 && !searchQuery.trim() && (
                              <div style={{ textAlign: 'center', padding: '20px', color: subTextColor }}>
                                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📡</div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#f59e0b' }}>ไม่พบข้อมูลจาก GISTDA</div>
                              </div>
                            )}
                            {!(mapCategory === 'gistda' && activeModeObj?.noApi) && rankedSidebarData.filter(st => {
                              if (!searchQuery.trim()) return true;
                              return st.areaTH.replace('จังหวัด', '').trim().includes(searchQuery.trim());
                            }).map((st, idx) => (
                              <div key={st.stationID} onClick={() => { handleRegionClick(st); setActivePanel(null); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-tertiary)', borderRadius: '12px', marginBottom: '8px', borderLeft: `5px solid ${st.color}`, cursor: 'pointer', border: `1px solid ${borderColor}` }}>
                                <div>
                                  <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: textColor }}>{idx+1}. จ.{st.areaTH.replace('จังหวัด', '')}</div>
                                  {mapCategory === 'risk' && <div style={{ fontSize: '0.65rem', color: subTextColor, marginTop: '2px' }}>สถานะ: {getRiskLabel(st.displayVal)}</div>}
                                </div>
                                <div style={{ background: cardBg, padding: '4px 10px', borderRadius: '10px', textAlign: 'center', border: `1px solid ${borderColor}` }}>
                                  <div style={{ fontSize: '1rem', fontWeight: '900', color: st.color }}>{st.displayVal} <span style={{ fontSize: '0.6rem', color: subTextColor, fontWeight: 'normal' }}>{mapCategory === 'basic' ? activeModeObj?.unit : ''}</span></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    /* ---- DESKTOP controls (original style) ---- */
                    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end' }}>
                      <button aria-label="ค้นหาตำแหน่งของฉัน" onClick={handleLocateMe} style={{ background: cardBg, color: textColor, border: `1px solid ${borderColor}`, padding: '8px 12px', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.85rem', cursor: isLocating ? 'wait' : 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', fontFamily: 'Kanit', opacity: isLocating ? 0.7 : 1, transition: 'all 0.2s' }}>{isLocating ? '⏳ กำลังหา...' : '📍 พิกัดของฉัน'}</button>
                      
                      <div style={{ background: 'var(--bg-nav-blur)', backdropFilter: 'blur(10px)', padding: '12px', borderRadius: '16px', border: `1px solid ${borderColor}`, width: '140px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
                          <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: textColor, marginBottom: '8px' }}>รูปแบบแผนที่</div>
                          <select value={basemapStyle} onChange={(e) => setBasemapStyle(e.target.value)} style={{ width: '100%', background: 'var(--bg-secondary)', color: textColor, border: 'none', padding: '6px', borderRadius: '8px', fontSize: '0.75rem', outline: 'none', fontFamily: 'Kanit' }}>
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

          {/* === DESKTOP SIDEBAR (ซ่อนบนมือถือ — ใช้ Bottom Sheet แทน) === */}
          {!isMobile && (
            <div style={{ width: '320px', background: cardBg, borderRadius: '20px', padding: '15px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column', zIndex: 10, flexShrink: 0 }}>
               <h3 style={{ margin: '0 0 5px 0', fontSize: '1rem', color: textColor }}>
                  📍 {mapCategory === 'risk' ? 'พื้นที่เสี่ยงสูงสุด (Top 15)' : mapCategory === 'gistda' ? 'พื้นที่วิกฤต (Top 5)' : 'จัดอันดับค่าสูงสุด (Top 15)'}
               </h3>
               <p style={{ margin: '0 0 10px 0', fontSize: '0.75rem', color: activeModeObj?.color, fontWeight: 'bold' }}>{activeModeObj?.desc}</p>
               <input type="text" placeholder="🔍 ค้นหาจังหวัด..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: `1px solid ${borderColor}`, background: 'var(--bg-secondary)', color: textColor, fontSize: '0.85rem', fontFamily: 'Kanit', outline: 'none', marginBottom: '10px', boxSizing: 'border-box' }} />
               
               <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }} className="custom-scrollbar">
                  {mapCategory === 'gistda' && activeModeObj?.noApi && (
                      <div style={{ textAlign: 'center', padding: '30px 15px', color: subTextColor }}>
                          <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🛰️</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#f59e0b' }}>ยังไม่มีข้อมูลจาก API</div>
                          <div style={{ fontSize: '0.75rem', marginTop: '8px', lineHeight: 1.6 }}>ข้อมูล{activeModeObj.name.replace(/[^\u0E00-\u0E7F\s]/g, '').trim()} ยังไม่มี Public API จาก GISTDA<br/>ระบบกำลังหาช่องทางเชื่อมต่อข้อมูลดาวเทียม</div>
                          <div style={{ fontSize: '0.65rem', marginTop: '12px', color: '#94a3b8', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${borderColor}` }}>💡 ข้อมูลจุดความร้อนและพื้นที่เผาไหม้ใช้งานได้ปกติ</div>
                      </div>
                  )}
                  {mapCategory === 'gistda' && !activeModeObj?.noApi && rankedSidebarData.length === 0 && !searchQuery.trim() && (
                      <div style={{ textAlign: 'center', padding: '30px 15px', color: subTextColor }}>
                          <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📡</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#f59e0b' }}>ไม่พบข้อมูลจาก GISTDA</div>
                          <div style={{ fontSize: '0.75rem', marginTop: '8px', lineHeight: 1.6 }}>API GISTDA อาจกำลังปิดปรับปรุง<br/>หรือไม่มีข้อมูลในช่วงเวลานี้</div>
                      </div>
                  )}
                  {!(mapCategory === 'gistda' && activeModeObj?.noApi) && rankedSidebarData.filter(st => {
                      if (!searchQuery.trim()) return true;
                      const name = st.areaTH.replace('จังหวัด', '').trim();
                      return name.includes(searchQuery.trim());
                  }).map((st, idx) => (
                     <div key={st.stationID} onClick={() => handleRegionClick(st)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-tertiary)', borderRadius: '12px', marginBottom: '8px', borderLeft: `5px solid ${st.color}`, cursor: 'pointer', transition: 'all 0.1s', border: `1px solid ${borderColor}` }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.1)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                        <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: textColor }}>{idx+1}. จ.{st.areaTH.replace('จังหวัด', '')}</div>
                            {mapCategory === 'risk' && <div style={{ fontSize: '0.65rem', color: subTextColor, marginTop: '2px' }}>สถานะ: {getRiskLabel(st.displayVal)}</div>}
                        </div>
                        <div style={{ background: cardBg, padding: '4px 10px', borderRadius: '10px', textAlign: 'center', border: `1px solid ${borderColor}` }}>
                            <div style={{ fontSize: '1rem', fontWeight: '900', color: st.color }}>{st.displayVal} <span style={{fontSize:'0.6rem', color: subTextColor, fontWeight:'normal'}}>{mapCategory==='basic' ? activeModeObj?.unit : ''}</span></div>
                        </div>
                     </div>
                  ))}
                  {searchQuery.trim() && rankedSidebarData.filter(st => {
                      const name = st.areaTH.replace('จังหวัด', '').trim();
                      return name.includes(searchQuery.trim());
                  }).length === 0 && (
                      <div style={{ textAlign: 'center', padding: '30px 15px', color: subTextColor }}>
                          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🔍</div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>ไม่พบจังหวัด "{searchQuery}"</div>
                          <div style={{ fontSize: '0.75rem', marginTop: '5px' }}>ลองค้นหาด้วยชื่อจังหวัดภาษาไทย</div>
                      </div>
                  )}
               </div>
            </div>
          )}
      </div>

      {/* POPUP 1: DIAGNOSTIC MODAL */}
      {selectedHotspot && selectedHotspot.type === 'risk' && (
        <div role="dialog" aria-modal="true" aria-label="วิเคราะห์ความเสี่ยงรายจังหวัด" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }} onClick={() => setSelectedHotspot(null)}>
            <div className="fade-in" onKeyDown={handleFocusTrap} tabIndex="-1" style={{ background: cardBg, padding: '25px', borderRadius: '20px', width: '100%', maxWidth: '420px', border: `1px solid ${borderColor}`, boxShadow: '0 20px 50px rgba(0,0,0,0.5)', position: 'relative', outline: 'none' }} onClick={e => e.stopPropagation()}>
                <button autoFocus aria-label="ปิด" onClick={() => setSelectedHotspot(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'var(--bg-secondary)', border: 'none', width: '30px', height: '30px', borderRadius: '50%', color: textColor, cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                
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
                            {selectedHotspot.riskScore >= 8 ? '⚠️ วิกฤต: หลีกเลี่ยงกิจกรรมกลางแจ้งทั้งหมด ติดตามประกาศจากหน่วยงานที่เกี่ยวข้อง' :
                             selectedHotspot.riskScore >= 6 ? '🟠 ควรเฝ้าระวัง: จำกัดกิจกรรมกลางแจ้ง ไม่เกิน 2 ชั่วโมง กลุ่มเสี่ยงควรอยู่ในอาคาร' :
                             selectedHotspot.riskScore >= 4 ? '🟡 ปานกลาง: สามารถทำกิจกรรมได้ แต่ควรดื่มน้ำเพียงพอและพักเป็นระยะ' :
                             '✅ สถานการณ์ปกติ: สามารถทำกิจกรรมกลางแจ้งได้ตามปกติ'}
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
                            <div style={{ width: '100%', height: '6px', background: 'var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
                                <div style={{ width: `${(factor.risk / 10) * 100}%`, height: '100%', background: factor.color, borderRadius: '10px', transition: 'width 1s ease-out' }}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* POPUP 1.5: GISTDA DASHBOARD MODAL */}
      {selectedHotspot && selectedHotspot.type === 'gistda' && (
        <div role="dialog" aria-modal="true" aria-label="รายงาน GISTDA รายจังหวัด" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }} onClick={() => setSelectedHotspot(null)}>
            <div className="fade-in" onKeyDown={handleFocusTrap} tabIndex="-1" style={{ background: cardBg, padding: '25px', borderRadius: '20px', width: '100%', maxWidth: '420px', border: `1px solid ${borderColor}`, boxShadow: '0 20px 50px rgba(0,0,0,0.5)', position: 'relative', outline: 'none' }} onClick={e => e.stopPropagation()}>
                <button autoFocus aria-label="ปิด" onClick={() => setSelectedHotspot(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'var(--bg-secondary)', border: 'none', width: '30px', height: '30px', borderRadius: '50%', color: textColor, cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                
                <div style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: `1px solid ${borderColor}` }}>
                    <div style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold', marginBottom: '5px' }}>รายงานสถานการณ์ภัยพิบัติ GISTDA</div>
                    <h2 style={{ margin: 0, color: textColor, fontSize: isMobile ? '1.1rem' : '1.3rem', fontWeight: 'bold' }}>📍 จ.{selectedHotspot.station.areaTH.replace('จังหวัด','')}</h2>
                </div>

                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: selectedHotspot.color, color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', border: `4px solid ${cardBg}`, outline: `2px solid ${selectedHotspot.color}`, flexShrink: 0 }}>
                        <span style={{ fontSize: '1.4rem', fontWeight: '900', lineHeight: 1 }}>{selectedHotspot.val.toLocaleString()}</span>
                        <span style={{ fontSize: '0.6rem', fontWeight: 'bold', marginTop: '2px' }}>{activeModeObj?.unit}</span>
                    </div>
                    <div>
                        <div style={{ fontSize: '1rem', fontWeight: 'bold', color: selectedHotspot.color }}>{activeModeObj?.name}</div>
                        <div style={{ fontSize: '0.85rem', color: textColor, marginTop: '5px' }}>สถานะ: <span style={{fontWeight:'bold'}}>เฝ้าระวังพิเศษ (Top 5)</span></div>
                        <div style={{ fontSize: '0.7rem', color: subTextColor, marginTop: '5px', lineHeight: 1.4 }}>
                            {activeGistdaMode === 'hotspots' ? 'จุดความร้อนที่ตรวจพบจากดาวเทียม VIIRS สะสม 7 วัน บ่งชี้การเผาไหม้ในพื้นที่' :
                             activeGistdaMode === 'burntArea' ? 'พื้นที่ที่พบร่องรอยการเผาไหม้จากภาพถ่ายดาวเทียม สะสมรอบ 10 วัน' :
                             activeGistdaMode === 'lowSoilMoisture' ? 'ค่าความชื้นในดินต่ำกว่าเกณฑ์ปกติ เสี่ยงต่อภัยแล้งและพืชผลเสียหาย' :
                             activeGistdaMode === 'lowVegetationMoisture' ? 'ค่าดัชนีน้ำในพืช (NDWI) ต่ำ บ่งชี้ว่าพืชขาดน้ำและเสี่ยงเป็นเชื้อเพลิงไฟป่า' :
                             'พื้นที่น้ำท่วมสะสมที่ตรวจพบจากภาพถ่ายดาวเทียม Sentinel-1'}
                        </div>
                    </div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: '10px', fontSize: '0.75rem', color: subTextColor, lineHeight: 1.5 }}>
                    ℹ️ ข้อมูลจากสำนักงานพัฒนาเทคโนโลยีอวกาศและภูมิสารสนเทศ (GISTDA) อัปเดตอัตโนมัติจากดาวเทียม
                </div>
            </div>
        </div>
      )}

      {/* POPUP 2: WEATHER DASHBOARD MODAL */}
      {selectedHotspot && selectedHotspot.type === 'basic' && (
        <div role="dialog" aria-modal="true" aria-label="ข้อมูลสภาพอากาศรายจังหวัด" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }} onClick={() => setSelectedHotspot(null)}>
          <div className="fade-in" onKeyDown={handleFocusTrap} tabIndex="-1" style={{ background: cardBg, padding: '25px', borderRadius: '20px', width: '100%', maxWidth: '420px', border: `1px solid ${borderColor}`, boxShadow: '0 20px 50px rgba(0,0,0,0.5)', position: 'relative', outline: 'none' }} onClick={e => e.stopPropagation()}>
              <button autoFocus aria-label="ปิด" onClick={() => setSelectedHotspot(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'var(--bg-secondary)', border: 'none', width: '30px', height: '30px', borderRadius: '50%', color: textColor, cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
              
              <div style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: `1px solid ${borderColor}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                          <div style={{ fontSize: '0.75rem', color: dayOffset === 0 ? '#22c55e' : dayOffset < 0 ? '#60a5fa' : '#c084fc', fontWeight: 'bold', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {dayOffset === 0 ? `● ข้อมูลล่าสุด • ${getLastUpdatedText()}` : dayOffset < 0 ? `🕒 ข้อมูลวันที่ ${getDateLabel(dayOffset)}` : `🔮 พยากรณ์วันที่ ${getDateLabel(dayOffset)}`}
                          </div>
                          <h2 style={{ margin: 0, color: textColor, fontSize: isMobile ? '1.2rem' : '1.4rem', fontWeight: 'bold' }}>📍 จ.{selectedHotspot.station.areaTH.replace('จังหวัด','')}</h2>
                      </div>
                      {dayOffset !== 0 && (
                          <div style={{ fontSize: '0.65rem', color: subTextColor, textAlign: 'right', lineHeight: 1.4, marginTop: '2px' }}>
                              (ค่าสูงสุด<br/>ของวัน)
                          </div>
                      )}
                  </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ background: 'var(--bg-secondary)', padding: '15px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '5px', borderLeft: `4px solid ${getBasicColor(selectedHotspot.pm25, 'pm25')}` }}>
                      <span style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold' }}>😷 ฝุ่น PM2.5</span>
                      <span style={{ fontSize: '1.4rem', fontWeight: '900', color: getBasicColor(selectedHotspot.pm25, 'pm25') }}>{selectedHotspot.pm25} <span style={{fontSize: '0.7rem', color: subTextColor, fontWeight:'normal'}}>µg/m³</span></span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: getPm25QualityText(selectedHotspot.pm25).color }}>{getPm25QualityText(selectedHotspot.pm25).text}</span>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', padding: '15px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '5px', borderLeft: `4px solid ${getBasicColor(selectedHotspot.data.temp, 'temp')}` }}>
                      <span style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold' }}>🌡️ อุณหภูมิ</span>
                      <span style={{ fontSize: '1.4rem', fontWeight: '900', color: getBasicColor(selectedHotspot.data.temp, 'temp') }}>{Math.round(selectedHotspot.data.temp || 0)}°C</span>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', padding: '15px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '5px', borderLeft: `4px solid ${getBasicColor(selectedHotspot.data.feelsLike, 'heat')}` }}>
                      <span style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold' }}>🥵 ดัชนีความร้อน</span>
                      <span style={{ fontSize: '1.4rem', fontWeight: '900', color: getBasicColor(selectedHotspot.data.feelsLike, 'heat') }}>{Math.round(selectedHotspot.data.feelsLike || 0)}°C</span>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', padding: '15px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '5px', borderLeft: `4px solid ${getBasicColor(selectedHotspot.data.rainProb, 'rain')}` }}>
                      <span style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold' }}>☔ โอกาสฝนตก</span>
                      <span style={{ fontSize: '1.4rem', fontWeight: '900', color: getBasicColor(selectedHotspot.data.rainProb, 'rain') }}>{selectedHotspot.data.rainProb || 0} <span style={{fontSize: '0.7rem', color: subTextColor, fontWeight:'normal'}}>%</span></span>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', padding: '15px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '5px', gridColumn: '1 / -1', borderLeft: `4px solid ${getBasicColor(selectedHotspot.data.windSpeed, 'wind')}` }}>
                      <span style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold' }}>🌬️ ลมกระโชกสูงสุด{dayOffset === 0 ? ' และทิศทางลม' : ''}</span>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '1.4rem', fontWeight: '900', color: getBasicColor(selectedHotspot.data.windSpeed, 'wind') }}>{Math.round(selectedHotspot.data.windSpeed || 0)} <span style={{fontSize: '0.7rem', color: subTextColor, fontWeight:'normal'}}>km/h</span></span>
                          {dayOffset === 0 && selectedHotspot.data.windDir !== undefined && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: cardBg, padding: '4px 10px', borderRadius: '8px', border: `1px solid ${borderColor}` }}>
                                  <span style={{ fontSize: '1.2rem' }}>{getWindDirection(selectedHotspot.data.windDir).arrow}</span>
                                  <span style={{ fontSize: '0.8rem', color: textColor, fontWeight: 'bold' }}>ลม{getWindDirection(selectedHotspot.data.windDir).name}</span>
                              </div>
                          )}
                      </div>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', padding: '15px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '5px', gridColumn: '1 / -1', borderLeft: `4px solid ${getBasicColor(selectedHotspot.data.uv, 'uv')}` }}>
                      <span style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold' }}>☀️ รังสี UV</span>
                      <span style={{ fontSize: '1.4rem', fontWeight: '900', color: getBasicColor(selectedHotspot.data.uv, 'uv') }}>{Math.round(selectedHotspot.data.uv || 0)} <span style={{fontSize: '0.8rem', color: textColor, fontWeight:'normal'}}>- {getUvText(selectedHotspot.data.uv)}</span></span>
                  </div>

                  {/* 🩺 คำแนะนำเชิงปฏิบัติ */}
                  <div style={{ gridColumn: '1 / -1', background: 'var(--bg-overlay)', padding: '12px', borderRadius: '12px', border: `1px solid ${borderColor}`, marginTop: '4px' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: textColor, marginBottom: '8px' }}>💡 คำแนะนำ</div>
                      {getActionableAdvice(
                          selectedHotspot.pm25,
                          selectedHotspot.data.temp || 0,
                          selectedHotspot.data.rainProb || 0,
                          selectedHotspot.data.uv || 0,
                          selectedHotspot.data.windSpeed || 0
                      ).map((tip, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: textColor, marginBottom: '4px' }}>
                              <span>{tip.icon}</span>
                              <span style={{ color: tip.color, fontWeight: 'bold' }}>{tip.text}</span>
                          </div>
                      ))}
                      {dayOffset !== 0 && activeBasicMode === 'pm25' && (
                          <div style={{ fontSize: '0.65rem', color: '#f59e0b', marginTop: '6px', fontWeight: 'bold' }}>⚠ ค่า PM2.5 พยากรณ์มีความแม่นยำต่ำ ใช้เป็นข้อมูลอ้างอิงเบื้องต้นเท่านั้น</div>
                      )}
                  </div>
              </div>
          </div>
        </div>
      )}

      {/* POPUP 3: แหล่งอ้างอิงทางวิชาการ */}
      {showReferenceModal && (
        <div role="dialog" aria-modal="true" aria-label="แหล่งอ้างอิงทางวิชาการ" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }} onClick={() => setShowReferenceModal(false)}>
            <div className="fade-in custom-scrollbar" onKeyDown={handleFocusTrap} tabIndex="-1" style={{ background: cardBg, padding: '25px', borderRadius: '20px', width: '100%', maxWidth: '550px', maxHeight: '85vh', overflowY: 'auto', border: `1px solid ${borderColor}`, boxShadow: '0 20px 50px rgba(0,0,0,0.5)', position: 'relative', outline: 'none' }} onClick={e => e.stopPropagation()}>
                <button autoFocus aria-label="ปิด" onClick={() => setShowReferenceModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'var(--bg-secondary)', border: 'none', width: '30px', height: '30px', borderRadius: '50%', color: textColor, cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                
                <h2 style={{ margin: '0 0 5px 0', color: textColor, fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>📚 หลักการและทฤษฎีอ้างอิง</h2>
                <p style={{ color: subTextColor, fontSize: '0.85rem', marginBottom: '20px', lineHeight: 1.5 }}>การประเมินดัชนีความเสี่ยงในระบบ อ้างอิงจากแบบจำลองและมาตรฐานทางวิทยาศาสตร์ระดับสากล เพื่อความแม่นยำในการเตือนภัย</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ background: 'var(--bg-secondary)', padding: '15px', borderRadius: '12px', borderLeft: '4px solid #ec4899' }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: textColor, marginBottom: '5px' }}>🫁 สุขภาพและทางเดินหายใจ</div>
                        <div style={{ fontSize: '0.8rem', color: subTextColor, marginBottom: '5px' }}><strong>อ้างอิง:</strong> งานวิจัยอาชีวเวชศาสตร์, EPA Air Quality Index, และ WHO Hygroscopic PM Guidelines</div>
                        <div style={{ fontSize: '0.85rem', color: textColor, lineHeight: 1.5 }}>ฝุ่น PM2.5 เมื่อรวมกับความชื้นสูงจะเกิดปรากฏการณ์ Hygroscopic Growth ทำให้อนุภาคฝุ่นขยายตัวและสะสมในปอดมากขึ้น ดัชนีนี้จึงผสาน PM2.5 (60%) กับ ความชื้นสัมพัทธ์ (20%) และอุณหภูมิ (20%) เพื่อประเมินภาระต่อระบบทางเดินหายใจอย่างครอบคลุม</div>
                    </div>
                    <div style={{ background: 'var(--bg-secondary)', padding: '15px', borderRadius: '12px', borderLeft: '4px solid #3b82f6' }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: textColor, marginBottom: '5px' }}>🏕️ กิจกรรมกลางแจ้ง</div>
                        <div style={{ fontSize: '0.8rem', color: subTextColor, marginBottom: '5px' }}><strong>อ้างอิง:</strong> มาตรฐานความปลอดภัย OSHA (Occupational Safety)</div>
                        <div style={{ fontSize: '0.85rem', color: textColor, lineHeight: 1.5 }}>การดำเนินกิจกรรมหรืองานกลางแจ้ง ไม่ได้ขึ้นอยู่กับฝนเพียงอย่างเดียว ดัชนีนี้ประเมินความปลอดภัยครอบคลุมทั้งอุปสรรคทางกายภาพ (ฝน 40%, ลม 30%) และภัยคุกคามทางสุขภาพ (ความร้อน 20%, UV 10%)</div>
                    </div>
                    <div style={{ background: 'var(--bg-secondary)', padding: '15px', borderRadius: '12px', borderLeft: '4px solid #ea580c' }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: textColor, marginBottom: '5px' }}>🔥 ความเสี่ยงไฟป่า</div>
                        <div style={{ fontSize: '0.8rem', color: subTextColor, marginBottom: '5px' }}><strong>อ้างอิง:</strong> แบบจำลอง Canadian Forest Fire Weather Index (FWI) + Fine Fuel Moisture Code</div>
                        <div style={{ fontSize: '0.85rem', color: textColor, lineHeight: 1.5 }}>ดัชนี FWI แท้จริงใช้ข้อมูลฝนในการคำนวณ Fine Fuel Moisture Code (FFMC) ดัชนีนี้จึงครอบคลุม 4 ปัจจัย: ลมที่เป็นตัวพัดพาไฟ (35%), ความแห้งแล้งของอากาศ (30%), การไม่มีฝนตกซึ่งทำให้เชื้อเพลิงแห้ง (20%), และอุณหภูมิที่ทำให้จุดติดไฟง่ายขึ้น (15%)</div>
                    </div>
                    <div style={{ background: 'var(--bg-secondary)', padding: '15px', borderRadius: '12px', borderLeft: '4px solid #ef4444' }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: textColor, marginBottom: '5px' }}>🥵 เฝ้าระวังโรคลมแดด</div>
                        <div style={{ fontSize: '0.8rem', color: subTextColor, marginBottom: '5px' }}><strong>อ้างอิง:</strong> องค์การอนามัยโลก (WHO), ดัชนี WBGT (Wet Bulb Globe Temperature)</div>
                        <div style={{ fontSize: '0.85rem', color: textColor, lineHeight: 1.5 }}>ดัชนี WBGT ใช้ <b>อุณหภูมิกระเปาะเปียก (Wet-Bulb)</b> เป็นแกนหลัก ซึ่งสะท้อนทั้งความร้อนและความชื้น สูตรนี้จึงผสานอุณหภูมิ (45%) กับความชื้นสัมพัทธ์สูงที่ทำให้เหงื่อไม่ระเหยและร่างกายระบายความร้อนไม่ได้ (30%) และรังสี UV (25%) เพื่อประเมินความเสี่ยงต่อภาวะลมแดดอย่างแม่นยำ</div>
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}