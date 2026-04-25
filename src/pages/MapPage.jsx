import React, { useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { WeatherContext } from '../context/WeatherContext';
import LoadingScreen from '../components/LoadingScreen';

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
  const { stations, stationTemps, stationYesterday, stationMaxYesterday, stationDaily, darkMode, gistdaSummary, lastUpdated, amphoeData, tmdAvailable } = useContext(WeatherContext);
  
  const [geoData, setGeoData] = useState(null);
  const [geoError, setGeoError] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [mapZoom, setMapZoom] = useState(window.innerWidth < 1024 ? 6 : 6);
  const [polyOpacity, setPolyOpacity] = useState(0.7);
  
  const [mapCategory, setMapCategory] = useState('basic'); 
  const [activeBasicMode, setActiveBasicMode] = useState('pm25'); 
  const [activeRiskMode, setActiveRiskMode] = useState('respiratory');
  const [activeGistdaMode, setActiveGistdaMode] = useState('hotspots');
  const [timeMode, setTimeMode] = useState('today'); // 'today' | 'tomorrow' | 'avg7'
  const [activeYesterdayMode, setActiveYesterdayMode] = useState('maxTemp');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedHotspot, setSelectedHotspot] = useState(null); 
  const [showReferenceModal, setShowReferenceModal] = useState(false); 
  
  const [basemapStyle, setBasemapStyle] = useState('dark'); 
  const [flyToPos, setFlyToPos] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [activePanel, setActivePanel] = useState(null); // 'legend' | 'filter' | 'category' | 'layer' | 'time' | 'rank'

  const [flashProv, setFlashProv] = useState(null);
  const hasAutoLocated = useRef(false);
  const flashTimeoutRef = useRef(null);
  const geoJsonRef = useRef(null);
  const desktopViewportHeight = 'calc(100vh - 12px)';

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
    const handleResize = () => { setIsMobile(window.innerWidth < 1024); };
    window.addEventListener('resize', handleResize);

    let cancelled = false;
    const startFetch = () => {
      if (!cancelled) fetchGeoData();
    };

    const idleId = typeof window !== 'undefined' && 'requestIdleCallback' in window
      ? window.requestIdleCallback(startFetch, { timeout: 800 })
      : window.setTimeout(startFetch, 0);

    return () => {
      cancelled = true;
      window.removeEventListener('resize', handleResize);
      if (typeof idleId === 'number') {
        window.clearTimeout(idleId);
      } else if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
    };
  }, [fetchGeoData]);

  // 🌟 UX: ไม่ auto-zoom บนมือถือ — แสดงแผนที่ทั้งประเทศเมื่อเปิด
  useEffect(() => {
    if (stations && stations.length > 0 && !hasAutoLocated.current) {
        hasAutoLocated.current = true;
        // ไม่ทำอะไร — ไม่ zoom บนมือถือ, ผู้ใช้กด "📍 พิกัดของฉัน" เองได้
    }
  }, [stations]);

  useEffect(() => {
      setSelectedHotspot(null);
      if (mapCategory === 'gistda' || mapCategory === 'yesterday') setTimeMode('today');
  }, [mapCategory]);

  const basicModes = [
    { id: 'pm25', name: '😷 PM2.5', color: '#f97316', unit: 'µg/m³', desc: 'ความหนาแน่นของฝุ่นละอองขนาดเล็ก' },
    { id: 'temp', name: '🌡️ อุณหภูมิ', color: '#ef4444', unit: '°C', desc: 'อุณหภูมิอากาศปัจจุบัน' },
    { id: 'heat', name: '🥵 ดัชนีความร้อน', color: '#ea580c', unit: '°C', desc: 'อุณหภูมิที่ร่างกายรู้สึกจริง (รวมความชื้น)' },
    { id: 'rain', name: '☔ โอกาสฝน', color: '#3b82f6', unit: '%', desc: 'ความน่าจะเป็นในการเกิดฝนตก' },
    { id: 'wind', name: '🌬️ ลมกระโชก', color: '#0ea5e9', unit: 'km/h', desc: 'ความเร็วลมกระโชกสูงสุด' },
    { id: 'uv', name: '☀️ รังสี UV', color: '#a855f7', unit: 'ดัชนี', desc: 'ดัชนีรังสีอัลตราไวโอเลต' },
    { id: 'pressure', name: '🧭 ความกดอากาศ', color: '#64748b', unit: 'hPa', desc: 'ความกดบรรยากาศ (ระดับน้ำทะเล)' }
  ];

  const yesterdayModes = [
    { id: 'maxTemp', name: '🌡️ อุณหภูมิสูงสุด', color: '#ef4444', unit: '°C', desc: 'อุณหภูมิสูงสุดของเมื่อวาน (กรมอุตุฯ)' },
    { id: 'minTemp', name: '❄️ อุณหภูมิต่ำสุด', color: '#3b82f6', unit: '°C', desc: 'อุณหภูมิต่ำสุดของเมื่อวาน (กรมอุตุฯ)' },
    { id: 'rain', name: '🌧️ ปริมาณฝน', color: '#1e3a8a', unit: 'mm', desc: 'ปริมาณฝนที่ตกจริงเมื่อวาน (กรมอุตุฯ)' },
    { id: 'heat', name: '🥵 ดัชนีความร้อน', color: '#ea580c', unit: '°C', desc: 'ดัชนีความร้อนสูงสุดเมื่อวาน' },
    { id: 'uv', name: '☀️ รังสี UV', color: '#a855f7', unit: 'ดัชนี', desc: 'รังสี UV สูงสุดเมื่อวาน' },
    { id: 'pm25', name: '😷 PM2.5', color: '#f97316', unit: 'µg/m³', desc: 'ค่า PM2.5 สูงสุดเมื่อวาน' },
  ];

  const riskModes = [
    { id: 'respiratory', name: '🫁 สุขภาพและทางเดินหายใจ', color: '#ec4899', desc: 'คำนวณจาก: ฝุ่น PM2.5 (60%), ความชื้นสูง (20%), และความร้อน (20%)' },
    { id: 'outdoor', name: '🏕️ กิจกรรมกลางแจ้ง', color: '#3b82f6', desc: 'คำนวณจาก: ฝน (40%), ลม (30%), และความร้อน/UV (30%)' },
    { id: 'wildfire', name: '🔥 ความเสี่ยงไฟป่า', color: '#ea580c', desc: 'คำนวณจาก: ลมแรง (35%), อากาศแห้ง (30%), ไม่มีฝน (20%), และความร้อน (15%)' },
    { id: 'heatstroke', name: '🥵 เฝ้าระวังโรคลมแดด', color: '#ef4444', desc: 'คำนวณจาก: อุณหภูมิความร้อน (45%), ความชื้นสูง (30%), และรังสี UV (25%)' }
  ];

  const gistdaModes = useMemo(() => [
    { id: 'hotspots', name: '🔥 จุดความร้อน (7 วัน)', color: '#ef4444', unit: 'จุด', desc: '🟢 ข้อมูลสดจาก GISTDA — จุดความร้อนสะสม 7 วันย้อนหลัง (Top 5)' },
    { id: 'burntArea', name: '🔥 พื้นที่เผาไหม้', color: '#ea580c', unit: 'ไร่', desc: '🟢 ข้อมูลสดจาก GISTDA — พื้นที่เผาไหม้สะสม 10 วัน (Top 5)' },
    { id: 'lowSoilMoisture', name: '🏜️ ความชื้นในดินต่ำ', color: '#f59e0b', unit: '%vol', desc: '🔴 ยังไม่มี API เชื่อมต่อ — รอระบบเชื่อมต่อ GISTDA ดาวเทียม', noApi: true },
    { id: 'lowVegetationMoisture', name: '🍂 ความชื้นพืชพรรณต่ำ', color: '#d97706', unit: 'ดัชนี', desc: '🔴 ยังไม่มี API เชื่อมต่อ — รอระบบเชื่อมต่อ GISTDA ดาวเทียม', noApi: true },
    { id: 'floodArea', name: '🌊 พื้นที่น้ำท่วม', color: '#3b82f6', unit: 'ไร่', desc: '🔴 ยังไม่มี API เชื่อมต่อ — รอระบบเชื่อมต่อ GISTDA ดาวเทียม', noApi: true }
  ], []);

  const getGistdaColor = useCallback((val, mode, rank) => {
    if (!val) return darkMode ? '#1a3050' : '#b8d9f5';
    const modeObj = gistdaModes.find(m => m.id === mode);
    const baseColor = modeObj ? modeObj.color : '#ef4444';
    // 🎨 FIX: ใช้ opacity ตามอันดับ (อันดับ 1 = เข้มสุด)
    if (rank !== undefined && rank >= 0) {
      const opacities = ['ff', 'cc', 'aa', '88', '66'];
      return baseColor + (opacities[rank] || 'ff');
    }
    return baseColor;
  }, [darkMode, gistdaModes]);

  // Derived from timeMode — backward compat for popup labels
  const effectiveDayOffset = timeMode === 'today' ? 0 : timeMode === 'tomorrow' ? 1 : 0;
  const isAvg7Mode = timeMode === 'avg7';

  const getBasicVal = useCallback((station, mode) => {
    if (!station) return null;
    const daily = stationDaily[station.stationID] || {};
    // avg7: average of forecast days +1..+7 (indices 8-14)
    if (isAvg7Mode && daily.temp) {
        const idxArr = [8, 9, 10, 11, 12, 13, 14];
        const avg = (arr) => { const v = idxArr.map(i => arr?.[i] || 0); return Math.round(v.reduce((a,b)=>a+b,0)/v.length); };
        switch(mode) {
            case 'pm25': return avg(daily.pm25);
            case 'temp': return avg(daily.temp);
            case 'heat': return avg(daily.heat);
            case 'rain': return idxArr.reduce((s,i)=>s+(daily.rain?.[i]||0),0); // cumulative
            case 'wind': return avg(daily.wind);
            case 'uv': return avg(daily.uv);
            case 'pressure': return avg(daily.pressure);
            default: return 0;
        }
    }
    if (effectiveDayOffset === 0 || !daily.temp) {
        const data = stationTemps[station.stationID] || {};
        switch(mode) {
            case 'pm25': return station.AQILast?.PM25?.value || 0;
            case 'temp': return Math.round(data.temp || 0);
            case 'heat': return Math.round(data.feelsLike || 0);
            case 'rain': return data.rainProb || 0;
            case 'wind': return Math.round(data.windSpeed || 0);
            case 'uv': return data.uv || 0;
            case 'pressure': return Math.round(data.pressure || 0);
            default: return 0;
        }
    } else {
        const idx = effectiveDayOffset + 7;
        switch(mode) {
            case 'pm25': return daily.pm25?.[idx] || 0;
            case 'temp': return daily.temp?.[idx] || 0;
            case 'heat': return daily.heat?.[idx] || 0;
            case 'rain': return daily.rain?.[idx] || 0;
            case 'wind': return daily.wind?.[idx] || 0;
            case 'uv': return daily.uv?.[idx] || 0;
            case 'pressure': return daily.pressure?.[idx] || 0;
            default: return 0;
        }
    }
  }, [stationTemps, stationDaily, effectiveDayOffset, isAvg7Mode]);

  const getBasicColor = useCallback((val, mode) => {
    if (val === null || val === undefined || val === '' || val === 0) return darkMode ? '#1a3050' : '#b8d9f5';
    if (mode === 'pm25') return val > 75 ? '#ef4444' : val >= 37.6 ? '#f97316' : val >= 25.1 ? '#eab308' : val >= 15.1 ? '#22c55e' : '#0ea5e9';
    if (mode === 'temp' || mode === 'heat' || mode === 'maxTemp' || mode === 'minTemp') return val > 39 ? '#ef4444' : val >= 35 ? '#f97316' : val >= 29 ? '#eab308' : val >= 23 ? '#22c55e' : '#3b82f6';
    if (mode === 'rain') return val > 50 ? '#1e3a8a' : val >= 20 ? '#3b82f6' : val >= 5 ? '#60a5fa' : '#94a3b8';
    if (mode === 'wind') return val > 40 ? '#ef4444' : val >= 21 ? '#f97316' : val >= 11 ? '#eab308' : '#22c55e';
    if (mode === 'uv') return val > 10 ? '#a855f7' : val >= 8 ? '#ef4444' : val >= 6 ? '#ea580c' : val >= 3 ? '#eab308' : '#22c55e';
    if (mode === 'pressure') return val > 1015 ? '#3b82f6' : val >= 1010 ? '#22c55e' : val >= 1005 ? '#eab308' : '#ef4444';
    return darkMode ? '#1a3050' : '#b8d9f5';
  }, [darkMode]);

  const calculateRisk = useCallback((station) => {
      let pm25 = 0, temp = 0, feelsLike = 0, wind = 0, rain = 0, uv = 0, hum = 50;
      let humEstimated = false;
      const daily = stationDaily[station.stationID] || {};

      if (isAvg7Mode && daily.temp) {
          const idxArr = [8, 9, 10, 11, 12, 13, 14];
          const avg = (arr) => { const v = idxArr.map(i => arr?.[i] || 0); return v.reduce((a,b)=>a+b,0)/v.length; };
          pm25 = avg(daily.pm25);
          temp = avg(daily.temp);
          wind = avg(daily.wind);
          rain = avg(daily.rain);
          uv = avg(daily.uv);
          hum = daily.humidity ? avg(daily.humidity) : (stationTemps[station.stationID]?.humidity || 50);
          humEstimated = !daily.humidity;
      } else if (effectiveDayOffset === 0 || !daily.temp) {
          const data = stationTemps[station.stationID] || {};
          pm25 = station.AQILast?.PM25?.value || 0;
          temp = data.temp || 0;
          feelsLike = data.feelsLike || temp;
          wind = data.windSpeed || 0;
          rain = data.rainProb || 0;
          uv = data.uv || 0;
          hum = data.humidity || 50;
      } else {
          const idx = effectiveDayOffset + 7;
          pm25 = daily.pm25?.[idx] || 0;
          temp = daily.temp?.[idx] || 0;
          feelsLike = daily.heat?.[idx] || temp;
          wind = daily.wind?.[idx] || 0;
          rain = daily.rain?.[idx] || 0;
          uv = daily.uv?.[idx] || 0;
          if (daily.humidity?.[idx]) {
              hum = daily.humidity[idx];
          } else {
              const currentData = stationTemps[station.stationID] || {};
              hum = currentData.humidity || 50;
              humEstimated = true;
          }
      }

      const nPm = Math.min(pm25 / 75 * 10, 10);
      const nTemp = Math.max(0, Math.min((temp - 28) / 12 * 10, 10));
      const nHeat = Math.max(0, Math.min((feelsLike - 28) / 12 * 10, 10));
      const nWind = Math.min(wind / 40 * 10, 10);
      const nRain = Math.min(rain / 80 * 10, 10);
      const nUv = Math.min(uv / 11 * 10, 10);
      const nHumDry = Math.max(0, 10 - (hum / 100 * 10));
      const nHumWet = Math.min(hum / 100 * 10, 10);
      const nNoRain = Math.max(0, 10 - (rain / 100 * 10));

      let score = 0;
      let factors = [];

      if (activeRiskMode === 'respiratory') {
          score = (nPm * 0.6) + (nHumWet * 0.2) + (nHeat * 0.2);
          factors = [{ label: 'มลพิษฝุ่น PM2.5', val: pm25, unit: 'µg/m³', risk: nPm, weight: 60, color: '#f97316' }, { label: `ความชื้นสัมพัทธ์สูง${humEstimated ? ' (ค่าประมาณ)' : ''}`, val: hum, unit: '%', risk: nHumWet, weight: 20, color: '#3b82f6' }, { label: 'ดัชนีความร้อน', val: feelsLike, unit: '°C', risk: nHeat, weight: 20, color: '#ef4444' }];
      } else if (activeRiskMode === 'outdoor') {
          score = (nRain * 0.4) + (nWind * 0.3) + (nTemp * 0.2) + (nUv * 0.1);
          factors = [{ label: 'โอกาสเกิดฝนตก', val: rain, unit: '%', risk: nRain, weight: 40, color: '#3b82f6' }, { label: 'ความเร็วลมกระโชก', val: wind, unit: 'km/h', risk: nWind, weight: 30, color: '#0ea5e9' }, { label: 'อุณหภูมิอากาศ', val: temp, unit: '°C', risk: nTemp, weight: 20, color: '#ef4444' }, { label: 'ความเข้มรังสี UV', val: uv, unit: 'ดัชนี', risk: nUv, weight: 10, color: '#a855f7' }];
      } else if (activeRiskMode === 'wildfire') {
          score = (nWind * 0.35) + (nHumDry * 0.30) + (nNoRain * 0.20) + (nTemp * 0.15);
          factors = [{ label: 'ความเร็วลมกระโชก', val: wind, unit: 'km/h', risk: nWind, weight: 35, color: '#0ea5e9' }, { label: `ความแห้งแล้งของอากาศ${humEstimated ? ' (ประมาณ)' : ''}`, val: hum, unit: '%', risk: nHumDry, weight: 30, color: '#eab308' }, { label: 'ไม่มีฝนตก (เชื้อเพลิงแห้ง)', val: rain, unit: '%', risk: nNoRain, weight: 20, color: '#94a3b8' }, { label: 'อุณหภูมิอากาศ', val: temp, unit: '°C', risk: nTemp, weight: 15, color: '#ef4444' }];
      } else if (activeRiskMode === 'heatstroke') {
          score = (nHeat * 0.45) + (nHumWet * 0.30) + (nUv * 0.25);
          factors = [{ label: 'ดัชนีความร้อน (feels like)', val: feelsLike, unit: '°C', risk: nHeat, weight: 45, color: '#ef4444' }, { label: `ความชื้นสัมพัทธ์สูง${humEstimated ? ' (ประมาณ)' : ''} (เหงื่อไม่ระเหย)`, val: hum, unit: '%', risk: nHumWet, weight: 30, color: '#3b82f6' }, { label: 'ความเข้มรังสี UV', val: uv, unit: 'ดัชนี', risk: nUv, weight: 25, color: '#a855f7' }];
      }

      return { score: Math.min(Math.round(score * 10) / 10, 10), factors, humEstimated };
  }, [activeRiskMode, stationTemps, stationDaily, effectiveDayOffset, isAvg7Mode]);

  const getRiskColor = useCallback((score) => {
      if (score === null || score === undefined) return darkMode ? '#1a3050' : '#b8d9f5';
      if (score >= 8) return '#ef4444'; 
      if (score >= 6) return '#f97316'; 
      if (score >= 4) return '#eab308'; 
      if (score >= 0) return '#22c55e'; 
      return darkMode ? '#1a3050' : '#b8d9f5'; 
  }, [darkMode]);

  const getRiskLabel = (score) => {
      if (score >= 8) return 'ความเสี่ยงสูงมาก';
      if (score >= 6) return 'ควรเฝ้าระวัง';
      if (score >= 4) return 'ปานกลาง';
      return 'สถานการณ์ปกติ';
  };

  // ===== Yesterday data helpers =====
  const getYesterdayVal = useCallback((station, mode) => {
      if (!station) return null;
      const maxObj = stationMaxYesterday?.[station.stationID] || {};
      const minObj = stationYesterday?.[station.stationID] || {};
      switch(mode) {
          case 'maxTemp': return maxObj.temp != null ? Math.round(maxObj.temp) : null;
          case 'minTemp': return minObj.minTemp != null ? Math.round(minObj.minTemp) : (minObj.temp != null ? Math.round(minObj.temp) : null);
          case 'rain': return maxObj.rain != null ? Math.round(maxObj.rain * 10) / 10 : null;
          case 'heat': return maxObj.heat != null ? Math.round(maxObj.heat) : (maxObj.temp != null ? Math.round(maxObj.temp) : null);
          case 'uv': return maxObj.uv != null ? Math.round(maxObj.uv * 10) / 10 : null;
          case 'pm25': return maxObj.pm25 != null ? Math.round(maxObj.pm25) : null;
          default: return null;
      }
  }, [stationMaxYesterday, stationYesterday]);

  const getYesterdayColor = useCallback((val, mode) => {
      if (val === null || val === undefined) return darkMode ? '#1a3050' : '#b8d9f5';
      if (mode === 'maxTemp') return val > 39 ? '#ef4444' : val >= 35 ? '#f97316' : val >= 29 ? '#eab308' : val >= 23 ? '#22c55e' : '#3b82f6';
      if (mode === 'minTemp') return val < 15 ? '#3b82f6' : val < 20 ? '#60a5fa' : val < 25 ? '#22c55e' : val < 30 ? '#eab308' : '#f97316';
      if (mode === 'rain') return val > 50 ? '#1e3a8a' : val > 20 ? '#3b82f6' : val > 5 ? '#60a5fa' : val > 0 ? '#93c5fd' : (darkMode ? '#1a3050' : '#b8d9f5');
      if (mode === 'heat') return val > 39 ? '#ef4444' : val >= 35 ? '#f97316' : val >= 29 ? '#eab308' : '#22c55e';
      if (mode === 'uv') return val > 10 ? '#a855f7' : val >= 8 ? '#ef4444' : val >= 6 ? '#ea580c' : val >= 3 ? '#eab308' : '#22c55e';
      if (mode === 'pm25') return val > 75 ? '#ef4444' : val >= 37.6 ? '#f97316' : val >= 25.1 ? '#eab308' : val >= 15.1 ? '#22c55e' : '#0ea5e9';
      return darkMode ? '#1a3050' : '#b8d9f5';
  }, [darkMode]);

  // ===== 7-day summary stats for popup =====
  const get7DaySummary = useCallback((station) => {
      if (!station) return null;
      const daily = stationDaily[station.stationID] || {};
      if (!daily.temp) return null;
      const histIdx = [1, 2, 3, 4, 5, 6, 7]; // past 7 days (idx 0 = 7 days ago, idx 7 = today)
      const fcastIdx = [8, 9, 10, 11, 12, 13, 14]; // next 7 days
      const nonZero = (arr, idxs) => idxs.map(i => arr?.[i]).filter(v => v != null && v > 0);
      const avg = arr => arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : null;
      const max = arr => arr.length ? Math.max(...arr) : null;
      const min = arr => arr.length ? Math.min(...arr) : null;
      const sum = (arr, idxs) => Math.round(idxs.reduce((s,i) => s + (arr?.[i] || 0), 0) * 10) / 10;

      return {
          // History (7 days back)
          hist7RainSum: sum(daily.rain, histIdx),
          hist7TempMax: max(nonZero(daily.temp, histIdx)),
          hist7TempMin: min(nonZero(daily.temp, histIdx)),
          hist7UvMax: max(nonZero(daily.uv, histIdx)),
          // Forecast (7 days ahead)
          fcast7RainSum: sum(daily.rain, fcastIdx),
          fcast7TempAvg: avg(nonZero(daily.temp, fcastIdx)),
          fcast7HeatAvg: avg(nonZero(daily.heat, fcastIdx)),
          fcast7UvAvg: avg(nonZero(daily.uv, fcastIdx)),
          // Tomorrow specific
          tomorrowTemp: daily.temp?.[8] ? Math.round(daily.temp[8]) : null,
          tomorrowRain: daily.rain?.[8] ? Math.round(daily.rain[8]) : null,
          tomorrowHeat: daily.heat?.[8] ? Math.round(daily.heat[8]) : null,
          tomorrowUv: daily.uv?.[8] ? Math.round(daily.uv[8] * 10) / 10 : null,
          tomorrowWind: daily.wind?.[8] ? Math.round(daily.wind[8]) : null,
      };
  }, [stationDaily]);

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
        } else if (mapCategory === 'yesterday') {
            val = getYesterdayVal(st, activeYesterdayMode);
            color = getYesterdayColor(val, activeYesterdayMode);
        } else if (mapCategory === 'gistda') {
            if (gistdaSummary && gistdaSummary[activeGistdaMode]) {
                const provName = st.areaTH.replace('จังหวัด', '').trim();
                const foundIdx = gistdaSummary[activeGistdaMode].findIndex(item => item.province === provName);
                if (foundIdx >= 0) {
                    val = gistdaSummary[activeGistdaMode][foundIdx].value;
                    color = getGistdaColor(val, activeGistdaMode, foundIdx);
                } else {
                    val = 0;
                    color = darkMode ? '#1a3050' : '#b8d9f5';
                }
            } else {
                val = 0;
                color = darkMode ? '#1a3050' : '#b8d9f5';
            }
        }
        return { ...st, displayVal: val, color };
    }).filter(st => st.displayVal !== null && st.displayVal !== undefined);
  }, [stations, mapCategory, activeBasicMode, activeGistdaMode, activeYesterdayMode, calculateRisk, getBasicVal, getBasicColor, getRiskColor, getGistdaColor, getYesterdayVal, getYesterdayColor, gistdaSummary, darkMode]);

  const rankedSidebarData = useMemo(() => {
    if (mapCategory === 'gistda' && gistdaSummary && gistdaSummary[activeGistdaMode]) {
        return gistdaSummary[activeGistdaMode].filter(g => g.value > 0).map(gItem => {
            const st = allMapData.find(s => s.areaTH.replace('จังหวัด', '').trim() === gItem.province);
            return st || { stationID: gItem.province, areaTH: `จังหวัด${gItem.province}`, displayVal: gItem.value, color: getGistdaColor(gItem.value, activeGistdaMode) };
        });
    }
    if (mapCategory === 'yesterday') {
        // For minTemp sort ascending; others descending
        const sorted = [...allMapData].filter(st => st.displayVal != null);
        return activeYesterdayMode === 'minTemp'
            ? sorted.sort((a, b) => a.displayVal - b.displayVal).slice(0, 15)
            : sorted.sort((a, b) => b.displayVal - a.displayVal).slice(0, 15);
    }
    return [...allMapData].sort((a, b) => b.displayVal - a.displayVal).slice(0, 15);
  }, [allMapData, mapCategory, activeGistdaMode, activeYesterdayMode, gistdaSummary, getGistdaColor]);



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
        color: isFlashed ? '#0ea5e9' : (darkMode ? '#050d1a' : '#ffffff'),
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
      } else if (mapCategory === 'yesterday') {
          const maxObj = stationMaxYesterday?.[station.stationID] || {};
          const minObj = stationYesterday?.[station.stationID] || {};
          setSelectedHotspot({ type: 'yesterday', station, maxObj, minObj });
      } else {
          const daily = stationDaily[station.stationID] || {};
          const idx = effectiveDayOffset + 7;
          const data = effectiveDayOffset === 0 ? (stationTemps[station.stationID] || {}) : (isAvg7Mode ? (() => {
              const idxArr = [8,9,10,11,12,13,14];
              const av = (arr) => { const v = idxArr.map(i=>arr?.[i]||0); return v.reduce((a,b)=>a+b,0)/v.length; };
              return { temp: av(daily.temp), feelsLike: av(daily.heat), rainProb: av(daily.rain), windSpeed: av(daily.wind), uv: av(daily.uv) };
          })() : {
              temp: daily.temp?.[idx], feelsLike: daily.heat?.[idx],
              rainProb: daily.rain?.[idx], windSpeed: daily.wind?.[idx], uv: daily.uv?.[idx]
          });
          const pm25 = effectiveDayOffset === 0 && !isAvg7Mode ? (station.AQILast?.PM25?.value || 0) : (daily.pm25?.[8] || 0);
          const summary7 = get7DaySummary(station);
          setSelectedHotspot({ type: 'basic', station, data, pm25, summary7 });
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
        color: isFlashed ? '#0ea5e9' : (darkMode ? '#050d1a' : '#ffffff'),
      });
    });
  }, [flashProv, darkMode]);

  useEffect(() => {
    if (!geoJsonRef.current) return;
    geoJsonRef.current.eachLayer(layer => {
      layer.setStyle(styleGeoJSON(layer.feature));
    });
  }, [
    geoData,
    allMapData,
    mapCategory,
    activeBasicMode,
    activeRiskMode,
    activeGistdaMode,
    activeYesterdayMode,
    timeMode,
    polyOpacity,
    darkMode,
    flashProv,
    stations,
  ]);

  const createMapIcon = (stationName, val, color) => {
    return L.divIcon({
        className: 'custom-risk-icon',
        html: `<div style="background: ${color}; color: ${color === '#eab308' || color === '#b8d9f5' ? '#0c1f3d' : '#fff'}; font-weight: 900; font-size: ${isMobile ? '9px' : '11px'}; padding: ${isMobile ? '2px 4px' : '4px 8px'}; border-radius: 8px; border: 2px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; flex-direction: column; align-items: center; line-height: 1.1;">
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
                        mapCategory === 'yesterday' ? yesterdayModes.find(m => m.id === activeYesterdayMode) :
                        gistdaModes.find(m => m.id === activeGistdaMode);
  const activeModeList = mapCategory === 'basic' ? basicModes :
                         mapCategory === 'risk' ? riskModes :
                         mapCategory === 'yesterday' ? yesterdayModes :
                         gistdaModes;
  const activeModeIndex = Math.max(0, activeModeList.findIndex(m => m.id === activeModeObj?.id));
  const activeCategoryLabel = mapCategory === 'basic' ? 'ข้อมูลทั่วไป' :
                              mapCategory === 'risk' ? 'วิเคราะห์ความเสี่ยง' :
                              'พิบัติภัย GISTDA';

  const setActiveModeById = useCallback((modeId) => {
    if (mapCategory === 'basic') setActiveBasicMode(modeId);
    else if (mapCategory === 'risk') setActiveRiskMode(modeId);
    else setActiveGistdaMode(modeId);
  }, [mapCategory]);

  const cycleActiveMode = useCallback((direction) => {
    if (!activeModeList.length) return;
    const nextIndex = (activeModeIndex + direction + activeModeList.length) % activeModeList.length;
    setActiveModeById(activeModeList[nextIndex].id);
  }, [activeModeIndex, activeModeList, setActiveModeById]);

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
            { c: darkMode ? '#1a3050' : '#b8d9f5', l: 'ไม่มีรายงาน / สภาพปกติ', r: '-' }
        ];
    }
    if (mapCategory === 'yesterday') {
        switch(activeYesterdayMode) {
            case 'maxTemp': return [{ c: '#ef4444', l: 'ร้อนจัด', r: '> 39°' }, { c: '#f97316', l: 'ร้อน', r: '35-39°' }, { c: '#eab308', l: 'อบอ้าว', r: '29-34°' }, { c: '#22c55e', l: 'ปกติ', r: '23-28°' }, { c: '#3b82f6', l: 'เย็น', r: '< 23°' }];
            case 'minTemp': return [{ c: '#3b82f6', l: 'เย็นมาก', r: '< 15°' }, { c: '#60a5fa', l: 'เย็น', r: '15-20°' }, { c: '#22c55e', l: 'สบาย', r: '20-25°' }, { c: '#eab308', l: 'อุ่น', r: '25-30°' }, { c: '#f97316', l: 'ร้อน', r: '> 30°' }];
            case 'rain': return [{ c: '#1e3a8a', l: 'ตกหนักมาก', r: '> 50mm' }, { c: '#3b82f6', l: 'ตกปานกลาง', r: '20-50mm' }, { c: '#60a5fa', l: 'ตกเล็กน้อย', r: '5-20mm' }, { c: '#93c5fd', l: 'หยิมๆ', r: '0.1-5mm' }, { c: darkMode ? '#1a3050' : '#b8d9f5', l: 'ไม่มีฝน', r: '0mm' }];
            case 'uv': return [{ c: '#a855f7', l: 'อันตรายรุนแรง', r: '> 10' }, { c: '#ef4444', l: 'สูงมาก', r: '8-10' }, { c: '#ea580c', l: 'สูง', r: '6-7' }, { c: '#eab308', l: 'ปานกลาง', r: '3-5' }, { c: '#22c55e', l: 'ต่ำ', r: '0-2' }];
            default: return [{ c: '#ef4444', l: 'ร้อนจัด', r: '> 39' }, { c: '#f97316', l: 'ร้อน', r: '35-39' }, { c: '#22c55e', l: 'ปกติ', r: '< 35' }];
        }
    }
    switch (activeBasicMode) {
        case 'pm25': return [{ c: '#ef4444', l: isMobile ? 'มีผลกระทบฯ' : 'มีผลกระทบต่อสุขภาพ', r: '> 75' }, { c: '#f97316', l: isMobile ? 'เริ่มมีผลกระทบฯ' : 'เริ่มมีผลกระทบต่อสุขภาพ', r: '37.6-75.0' }, { c: '#eab308', l: 'ปานกลาง', r: '25.1-37.5' }, { c: '#22c55e', l: 'ดี', r: '15.1-25.0' }, { c: '#0ea5e9', l: 'ดีมาก', r: '0-15.0' }];
        case 'temp':
        case 'heat': return [{ c: '#ef4444', l: 'ร้อนจัด', r: '> 39' }, { c: '#f97316', l: 'ร้อน', r: '35-39' }, { c: '#eab308', l: 'อบอ้าว', r: '29-34' }, { c: '#22c55e', l: 'ปกติ/อบอุ่น', r: '23-28' }, { c: '#3b82f6', l: 'เย็นสบาย', r: '< 23' }];
        case 'rain': return [{ c: '#1e3a8a', l: 'ตกหนัก/พายุ', r: '> 70%' }, { c: '#3b82f6', l: 'โอกาสตกสูง', r: '41-70%' }, { c: '#60a5fa', l: 'โอกาสตกต่ำ', r: '11-40%' }, { c: '#94a3b8', l: 'ไม่มีฝน', r: '0-10%' }];
        case 'wind': return [{ c: '#ef4444', l: 'พายุ/อันตราย', r: '> 40' }, { c: '#f97316', l: 'ลมแรง', r: '21-40' }, { c: '#eab308', l: 'ลมกำลังดี', r: '11-20' }, { c: '#22c55e', l: 'ลมสงบ', r: '0-10' }];
        case 'uv': return [{ c: '#a855f7', l: 'อันตรายรุนแรง', r: '> 10' }, { c: '#ef4444', l: 'สูงมาก', r: '8-10' }, { c: '#ea580c', l: 'สูง', r: '6-7' }, { c: '#eab308', l: 'ปานกลาง', r: '3-5' }, { c: '#22c55e', l: 'ต่ำ', r: '0-2' }];
        case 'pressure': return [{ c: '#3b82f6', l: 'ความกดสูง', r: '> 1015' }, { c: '#22c55e', l: 'ปกติ', r: '1010-1015' }, { c: '#eab308', l: 'ค่อนข้างต่ำ', r: '1005-1009' }, { c: '#ef4444', l: 'ต่ำ/พายุ', r: '< 1005' }];
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
    <LoadingScreen title="กำลังเตรียมแผนที่" subtitle="ประมวลผลข้อมูลเฝ้าระวังทั้ง 77 จังหวัด" />
  );

  const mapCategoryOptions = [
    { id: 'basic', label: 'อากาศ', shortLabel: 'อากาศ', icon: '🌤️', color: '#0ea5e9', desc: 'PM2.5 ฝน ลม UV', useFor: 'เช็กค่าปัจจุบันและพยากรณ์' },
    { id: 'risk', label: 'ความเสี่ยง', shortLabel: 'เสี่ยง', icon: '⚠️', color: '#8b5cf6', desc: 'สุขภาพ กลางแจ้ง ไฟป่า', useFor: 'ดูพื้นที่ที่ควรระวัง' },
    { id: 'yesterday', label: 'ย้อนหลัง', shortLabel: 'ย้อนหลัง', icon: '🕘', color: '#f59e0b', desc: 'ค่าสูงสุด/ต่ำสุดเมื่อวาน', useFor: 'เทียบสถิติที่เกิดขึ้นจริง' },
    { id: 'gistda', label: 'ภัยพิบัติ', shortLabel: 'ภัยพิบัติ', icon: '🛰️', color: '#ef4444', desc: 'จุดความร้อน พื้นที่ไหม้', useFor: 'ข้อมูลดาวเทียมล่าสุด' }
  ];

  const activeModeId = mapCategory === 'basic' ? activeBasicMode :
    mapCategory === 'risk' ? activeRiskMode :
    mapCategory === 'yesterday' ? activeYesterdayMode :
    activeGistdaMode;

  const setActiveModeByCategory = (id) => {
    if (mapCategory === 'basic') setActiveBasicMode(id);
    else if (mapCategory === 'risk') setActiveRiskMode(id);
    else if (mapCategory === 'yesterday') setActiveYesterdayMode(id);
    else setActiveGistdaMode(id);
  };

  const activeCategoryOption = mapCategoryOptions.find(opt => opt.id === mapCategory);
  const activeDataSourceMeta = mapCategory === 'basic'
    ? (timeMode === 'today'
        ? { label: 'สด', icon: '🟢', color: '#22c55e', detail: 'AIR4Thai + TMD อัปเดตล่าสุด' }
        : timeMode === 'tomorrow'
          ? { label: 'พยากรณ์', icon: '🔮', color: '#a855f7', detail: 'TMD คาดการณ์รายวัน' }
          : { label: 'ล่วงหน้า', icon: '📊', color: '#0ea5e9', detail: 'แนวโน้ม 7 วันข้างหน้า' })
    : mapCategory === 'risk'
      ? (timeMode === 'today'
          ? { label: 'วิเคราะห์สด', icon: '⚠️', color: '#8b5cf6', detail: 'คำนวณจากข้อมูลล่าสุด' }
          : timeMode === 'tomorrow'
            ? { label: 'วิเคราะห์พรุ่งนี้', icon: '🔮', color: '#a855f7', detail: 'คำนวณจากค่าพยากรณ์' }
            : { label: 'วิเคราะห์ล่วงหน้า', icon: '📊', color: '#0ea5e9', detail: 'แนวโน้มความเสี่ยง 7 วัน' })
      : mapCategory === 'yesterday'
        ? { label: 'ย้อนหลัง', icon: '🕘', color: '#f59e0b', detail: 'ค่าที่เกิดขึ้นจริงของเมื่อวาน' }
        : { label: 'ดาวเทียม', icon: '🛰️', color: '#ef4444', detail: 'ข้อมูล GISTDA ล่าสุด' };

  const timeHelperText = mapCategory === 'basic' || mapCategory === 'risk'
    ? (timeMode === 'today'
        ? 'ตอนนี้ = ใช้ค่าล่าสุดที่ระบบมีอยู่ในขณะนี้'
        : timeMode === 'tomorrow'
          ? 'พรุ่งนี้ = ค่าพยากรณ์รายวันของวันถัดไป'
          : '7 วันข้างหน้า = ฝนเป็นค่าสะสม ส่วนค่าอื่นเป็นค่าเฉลี่ยแนวโน้มล่วงหน้า')
    : '';

  const quickPresetOptions = [
    {
      id: 'pm-now',
      label: 'ดูฝุ่นตอนนี้',
      icon: '😷',
      color: '#f97316',
      onClick: () => { setMapCategory('basic'); setActiveBasicMode('pm25'); setTimeMode('today'); }
    },
    {
      id: 'rain-tomorrow',
      label: 'ดูฝนพรุ่งนี้',
      icon: '🌧️',
      color: '#3b82f6',
      onClick: () => { setMapCategory('basic'); setActiveBasicMode('rain'); setTimeMode('tomorrow'); }
    },
    {
      id: 'risk-health',
      label: 'ดูเสี่ยงสุขภาพ',
      icon: '⚠️',
      color: '#8b5cf6',
      onClick: () => { setMapCategory('risk'); setActiveRiskMode('respiratory'); setTimeMode('today'); }
    }
  ];

  const canChooseTimeMode = mapCategory === 'basic' || mapCategory === 'risk';
  const timeModeSections = [
    {
      id: 'history',
      title: 'สถิติย้อนหลัง',
      helper: 'ค่าที่เกิดขึ้นจริง',
      options: [
        { id: 'yesterday', label: `🕘 เมื่อวาน ${getDateLabel(-1)}`, sub: 'สถิติสูงสุด/ต่ำสุด', color: '#f59e0b' },
      ],
    },
    {
      id: 'now',
      title: 'ขณะนี้',
      helper: 'ข้อมูลล่าสุด',
      options: [
        { id: 'today', label: `📍 ตอนนี้ ${getDateLabel(0)}`, sub: 'ข้อมูลล่าสุด', color: '#22c55e' },
      ],
    },
    {
      id: 'forecast',
      title: 'พยากรณ์',
      helper: 'มองล่วงหน้า',
      options: [
        { id: 'tomorrow', label: `🔮 พรุ่งนี้ ${getDateLabel(1)}`, sub: 'พยากรณ์รายวัน', color: '#a855f7' },
        { id: 'avg7', label: '📊 7 วันข้างหน้า', sub: 'แนวโน้มรวม', color: '#0ea5e9' },
      ],
    },
  ];
  const flatTimeOptions = timeModeSections.flatMap(section => section.options);
  const activeTimeKey = mapCategory === 'yesterday' ? 'yesterday' : (canChooseTimeMode ? timeMode : 'latest');
  const activeTimeOption = flatTimeOptions.find(opt => opt.id === activeTimeKey) || { label: '🛰️ ล่าสุด', sub: 'ข้อมูลสะสมล่าสุด', color: activeCategoryOption?.color || '#64748b' };
  const handleTimeOptionSelect = (id) => {
    if (id === 'yesterday') {
      setMapCategory('yesterday');
      setTimeMode('today');
      return;
    }

    if (mapCategory === 'yesterday' || mapCategory === 'gistda') {
      setMapCategory('basic');
    }
    setTimeMode(id);
  };
  const timeContextNote = mapCategory === 'gistda'
    ? 'โหมดดาวเทียมเป็นข้อมูลสะสมล่าสุดจาก GISTDA หากเลือกช่วงเวลาอื่นจะสลับไปแผนที่อากาศ'
    : mapCategory === 'yesterday'
      ? `กำลังดูสถิติย้อนหลังของเมื่อวาน ${getDateLabel(-1)}`
      : timeHelperText;
  const timeControlCard = (
    <div style={{ background: cardBg, padding: '7px 10px', borderRadius: '14px', border: `1px solid ${borderColor}`, marginBottom: '6px', flexShrink: 0, boxShadow: '0 4px 14px rgba(15,23,42,0.07)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto', gap: '8px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: textColor, fontSize: '0.75rem', fontWeight: 900, whiteSpace: 'nowrap' }}>
          <span>🗓️</span>
          <span>3. เลือกช่วงเวลา</span>
        </div>
        <div className="hide-scrollbar" style={{ display: 'flex', gap: '6px', overflowX: 'auto', minWidth: 0 }}>
          {timeModeSections.flatMap(section => section.options.map(opt => ({ ...opt, sectionTitle: section.title }))).map(opt => {
            const active = activeTimeKey === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => handleTimeOptionSelect(opt.id)}
                style={{
                  padding: '6px 11px',
                  borderRadius: '999px',
                  border: `1px solid ${active ? opt.color : borderColor}`,
                  background: active ? (darkMode ? `${opt.color}24` : `${opt.color}16`) : 'var(--bg-secondary)',
                  color: active ? opt.color : textColor,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontFamily: 'Kanit',
                  fontSize: '0.72rem',
                  transition: 'all 0.2s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  minWidth: 0,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
                title={`${opt.sectionTitle}: ${opt.sub}`}
              >
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: darkMode ? `${activeDataSourceMeta.color}22` : `${activeDataSourceMeta.color}14`, color: activeDataSourceMeta.color, border: `1px solid ${darkMode ? `${activeDataSourceMeta.color}55` : `${activeDataSourceMeta.color}35`}`, borderRadius: '999px', padding: '4px 9px', fontSize: '0.64rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
          <span>{activeDataSourceMeta.icon}</span>
          <span>{activeDataSourceMeta.label}</span>
        </span>
      </div>
    </div>
  );
  const mobileDockButtons = [
    {
      id: 'category',
      icon: activeCategoryOption?.icon || '🗺️',
      label: 'ประเภท',
      value: activeCategoryOption?.shortLabel || activeCategoryOption?.label || '-',
      color: activeCategoryOption?.color || '#0ea5e9',
      disabled: false,
    },
    {
      id: 'layer',
      icon: '🧩',
      label: 'ชั้นข้อมูล',
      value: activeModeObj?.name || '-',
      color: activeModeObj?.color || '#0ea5e9',
      disabled: false,
    },
    {
      id: 'time',
      icon: activeTimeKey === 'yesterday' ? '🕘' : activeTimeOption?.color === '#a855f7' ? '🔮' : activeTimeOption?.color === '#0ea5e9' ? '📊' : '📅',
      label: 'วันที่',
      value: activeTimeOption?.sub || activeTimeOption?.label || '-',
      color: activeTimeOption?.color || '#22c55e',
      disabled: false,
    },
    {
      id: 'rank',
      icon: '📊',
      label: 'อันดับ',
      value: 'จังหวัด',
      color: '#f97316',
      disabled: false,
    }
  ];
  const mobileBottomNavHeight = 70;
  const mobileDockGap = 14;
  const mobilePanelGap = 88;
  const mobileDockBottom = `calc(env(safe-area-inset-bottom, 0px) + ${mobileBottomNavHeight + mobileDockGap}px)`;
  const mobilePanelBottom = `calc(env(safe-area-inset-bottom, 0px) + ${mobileBottomNavHeight + mobilePanelGap}px)`;

  return (
    <div style={{ height: isMobile ? '100%' : desktopViewportHeight, width: '100%', background: appBg, display: 'flex', flexDirection: 'column', fontFamily: 'Kanit, sans-serif', padding: isMobile ? '0' : '8px', boxSizing: 'border-box', overflow: 'hidden' }}>
      
      {/* === DESKTOP HEADER (ซ่อนบนมือถือ) === */}
      {!isMobile && (
        <>
          <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexShrink: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flexWrap: 'wrap', flex: 1 }}>
                          <div>
                              <h2 style={{ margin: 0, color: textColor, fontSize: '1.12rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', lineHeight: 1.15 }}>🗺️ แผนที่เฝ้าระวังภัย</h2>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 8px #22c55e', animation: 'pulse 2s infinite' }}></span>
                                  <span style={{ fontSize: '0.72rem', color: subTextColor, fontWeight: 'bold', lineHeight: 1.3 }}>ข้อมูลตามเวลาจริง {tmdAvailable && '• 📡 TMD'} • อัปเดตล่าสุด: {getLastUpdatedText()}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '5px', flexWrap: 'wrap' }}>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: darkMode ? `${activeDataSourceMeta.color}22` : `${activeDataSourceMeta.color}14`, color: activeDataSourceMeta.color, border: `1px solid ${darkMode ? `${activeDataSourceMeta.color}55` : `${activeDataSourceMeta.color}35`}`, borderRadius: '999px', padding: '4px 10px', fontSize: '0.72rem', fontWeight: 'bold' }}>
                                    <span>{activeDataSourceMeta.icon}</span>
                                    <span>{activeDataSourceMeta.label}</span>
                                  </span>
                                  <span style={{ fontSize: '0.72rem', color: subTextColor }}>{activeDataSourceMeta.detail}</span>
                              </div>
                          </div>
                          <div className="hide-scrollbar" style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px', maxWidth: '100%', alignItems: 'center' }}>
                              <span style={{ color: subTextColor, fontSize: '0.68rem', fontWeight: 900, whiteSpace: 'nowrap', flexShrink: 0 }}>1. เลือกมุมมอง</span>
                              {mapCategoryOptions.map(opt => (
                                <button
                                  key={opt.id}
                                  onClick={() => setMapCategory(opt.id)}
                                  style={{
                                    background: mapCategory === opt.id ? opt.color : 'transparent',
                                    color: mapCategory === opt.id ? '#fff' : subTextColor,
                                    border: `1px solid ${mapCategory === opt.id ? opt.color : borderColor}`,
                                    padding: '6px 10px',
                                    borderRadius: '12px',
                                    fontSize: '0.76rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transition: '0.2s',
                                    fontFamily: 'Kanit',
                                    lineHeight: 1.2,
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                  }}
                                  title={opt.useFor}
                                >
                                  <span>{opt.icon}</span>
                                  <span>{opt.shortLabel || opt.label}</span>
                                </button>
                              ))}
                          </div>
                          </div>
                      </div>
                      {mapCategory === 'risk' && (
                          <button onClick={() => setShowReferenceModal(true)} style={{ background: 'var(--bg-secondary)', color: '#8b5cf6', border: `1px solid #8b5cf6`, padding: '5px 12px', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Kanit', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', flexShrink: 0 }}>
                              📚 แหล่งอ้างอิงทางวิชาการ
                          </button>
                      )}
                  </div>
                  <div className="hide-scrollbar" style={{ display: 'flex', gap: '7px', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '2px', alignItems: 'center' }}>
                    <span style={{ color: subTextColor, fontSize: '0.68rem', fontWeight: 900, whiteSpace: 'nowrap', flexShrink: 0 }}>2. เลือกชั้นข้อมูล</span>
                    {mapCategory === 'basic' ? basicModes.map(m => (
                        <button key={m.id} onClick={() => setActiveBasicMode(m.id)} style={{ padding: '5px 10px', borderRadius: '12px', border: `1px solid ${activeBasicMode === m.id ? m.color : borderColor}`, background: activeBasicMode === m.id ? (darkMode ? `${m.color}20` : `${m.color}15`) : cardBg, color: activeBasicMode === m.id ? m.color : textColor, fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Kanit', fontSize: '0.78rem', whiteSpace: 'nowrap', flexShrink: 0 }}>{m.name}</button>
                    )) : mapCategory === 'risk' ? riskModes.map(m => (
                        <button key={m.id} onClick={() => setActiveRiskMode(m.id)} style={{ padding: '5px 10px', borderRadius: '12px', border: `1px solid ${activeRiskMode === m.id ? m.color : borderColor}`, background: activeRiskMode === m.id ? (darkMode ? `${m.color}20` : `${m.color}15`) : cardBg, color: activeRiskMode === m.id ? m.color : textColor, fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Kanit', fontSize: '0.78rem', whiteSpace: 'nowrap', flexShrink: 0 }}>{m.name}</button>
                    )) : mapCategory === 'yesterday' ? yesterdayModes.map(m => (
                        <button key={m.id} onClick={() => setActiveYesterdayMode(m.id)} style={{ padding: '5px 10px', borderRadius: '12px', border: `1px solid ${activeYesterdayMode === m.id ? m.color : borderColor}`, background: activeYesterdayMode === m.id ? (darkMode ? `${m.color}20` : `${m.color}15`) : cardBg, color: activeYesterdayMode === m.id ? m.color : textColor, fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Kanit', fontSize: '0.78rem', whiteSpace: 'nowrap', flexShrink: 0 }}>{m.name}</button>
                    )) : gistdaModes.map(m => (
                        <button key={m.id} onClick={() => setActiveGistdaMode(m.id)} style={{ padding: '5px 10px', borderRadius: '12px', border: `1px solid ${activeGistdaMode === m.id ? m.color : borderColor}`, background: activeGistdaMode === m.id ? (darkMode ? `${m.color}20` : `${m.color}15`) : cardBg, color: activeGistdaMode === m.id ? m.color : textColor, fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Kanit', fontSize: '0.78rem', whiteSpace: 'nowrap', flexShrink: 0 }}>{m.name}</button>
                    ))}
                  </div>
               </div>

          {timeControlCard}
        </>
      )}

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', flex: 1, gap: isMobile ? '0' : '10px', overflow: 'hidden', minHeight: 0 }}>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: isMobile ? '0' : '10px', minHeight: 0 }}>
              <div style={{ flex: 1, borderRadius: isMobile ? '0' : '18px', overflow: 'hidden', border: isMobile ? 'none' : `1px solid ${borderColor}`, position: 'relative', minHeight: isMobile ? 'calc(100vh - 120px)' : 0, background: cardBg }}>

                <MapContainer center={[13.5, 100.5]} zoom={isMobile ? 6 : 6} style={{ height: '100%', width: '100%', background: appBg }} zoomControl={false}>
                    <TileLayer url={basemapUrls[basemapStyle]} />
                    <MapZoomListener setMapZoom={setMapZoom} />
                    <MapChangeView center={flyToPos} />
                    
                    {geoData && <GeoJSON ref={geoJsonRef} data={geoData} style={styleGeoJSON} onEachFeature={onEachFeature} />}
                    
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
                                        html: `<div style="background: ${color}cc; color: ${color === '#eab308' || color === '#b8d9f5' ? '#0c1f3d' : '#fff'}; font-weight: 700; font-size: 8px; padding: 2px 5px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.4); box-shadow: 0 2px 6px rgba(0,0,0,0.2); display: flex; flex-direction: column; align-items: center; line-height: 1.1; white-space: nowrap;"><span style='font-size:6px;opacity:0.85'>${label}</span><span>${val}</span></div>`,
                                        iconSize: [44, 24], iconAnchor: [22, 12]
                                    })} interactive={false} />
                                );
                            });
                        });
                        return amphoeMarkers;
                    })()}
                </MapContainer>

                {false && isMobile && (
                  <div
                    className="fade-in"
                    onClick={() => setActivePanel(p => p === 'layer' ? null : 'layer')}
                    onTouchStart={handleMobileLayerSwipeStart}
                    onTouchEnd={handleMobileLayerSwipeEnd}
                    style={{ position: 'absolute', top: '12px', left: '12px', right: '64px', zIndex: 1001, background: 'var(--bg-nav-blur)', backdropFilter: 'blur(12px)', border: `1px solid ${borderColor}`, borderRadius: '16px', padding: '8px 10px', boxShadow: '0 4px 16px rgba(0,0,0,0.22)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                  >
                    <button
                      aria-label="เลื่อนชั้นข้อมูลก่อนหน้า"
                      onClick={(e) => { e.stopPropagation(); cycleActiveMode(-1); }}
                      style={{ width: '24px', height: '24px', borderRadius: '50%', border: 'none', background: 'var(--bg-secondary)', color: textColor, fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    >
                      ‹
                    </button>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px', minWidth: 0 }}>
                        <span style={{ background: activeModeObj?.color || '#0ea5e9', color: '#fff', borderRadius: '999px', padding: '2px 8px', fontSize: '0.6rem', fontWeight: 'bold', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {activeCategoryLabel}
                        </span>
                        <span style={{ fontSize: '0.58rem', color: subTextColor, fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                          {activeModeIndex + 1}/{activeModeList.length}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: textColor, fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {activeModeObj?.name}
                      </div>
                      <div style={{ fontSize: '0.6rem', color: subTextColor, fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        ปัดซ้ายขวาเพื่อเปลี่ยนชั้นข้อมูล
                      </div>
                    </div>
                    <button
                      aria-label="เลื่อนชั้นข้อมูลถัดไป"
                      onClick={(e) => { e.stopPropagation(); cycleActiveMode(1); }}
                      style={{ width: '24px', height: '24px', borderRadius: '50%', border: 'none', background: 'var(--bg-secondary)', color: textColor, fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    >
                      ›
                    </button>
                  </div>
                )}

                {/* === LEGEND: เล็กลงบนมือถือ / collapsible === */}
                {isMobile ? (
                  <>
                    {/* Legend toggle chip */}
                    <button
                      onClick={() => setActivePanel(p => p === 'legend' ? null : 'legend')}
                      style={{ position: 'absolute', bottom: mobilePanelBottom, right: '12px', zIndex: 1001, background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '20px', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 10px rgba(0,0,0,0.25)', cursor: 'pointer', fontFamily: 'Kanit', fontSize: '0.7rem', color: textColor, fontWeight: 'bold' }}
                      aria-label="แสดง/ซ่อนสัญลักษณ์แผนที่"
                    >
                      <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: activeModeObj?.color || '#0ea5e9', display: 'inline-block', flexShrink: 0 }}></span>
                      {activePanel === 'legend' ? '✕' : '📋 สัญลักษณ์'}
                    </button>
                    {activePanel === 'legend' && (
                      <div className="fade-in" style={{ position: 'absolute', bottom: `calc(${mobilePanelBottom} + 36px)`, right: '12px', zIndex: 1001, background: cardBg, padding: '10px 12px', borderRadius: '12px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 15px rgba(0,0,0,0.2)', maxWidth: 'min(240px, calc(100vw - 32px))' }}>
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
                      <div style={{ position: 'fixed', left: '12px', right: '12px', bottom: mobileDockBottom, zIndex: 1002, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '8px' }}>
                        {mobileDockButtons.map(btn => {
                          const isActive = activePanel === btn.id;
                          return (
                            <button
                              key={btn.id}
                              aria-label={btn.label}
                              disabled={btn.disabled}
                              onClick={() => !btn.disabled && setActivePanel(p => p === btn.id ? null : btn.id)}
                              style={{
                                minWidth: 0,
                                background: isActive ? btn.color : 'var(--bg-nav-blur)',
                                color: isActive ? '#fff' : (btn.disabled ? subTextColor : textColor),
                                border: `1px solid ${isActive ? btn.color : borderColor}`,
                                backdropFilter: 'blur(12px)',
                                borderRadius: '16px',
                                padding: '8px 6px 9px',
                                boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '3px',
                                fontFamily: 'Kanit',
                                cursor: btn.disabled ? 'default' : 'pointer',
                                opacity: btn.disabled ? 0.65 : 1
                              }}
                            >
                              <span style={{ fontSize: '0.95rem', lineHeight: 1 }}>{btn.icon}</span>
                              <span style={{ fontSize: '0.64rem', fontWeight: 'bold', lineHeight: 1.1 }}>{btn.label}</span>
                              <span style={{ fontSize: '0.56rem', lineHeight: 1.15, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{btn.value}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Row of quick icon buttons */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

                        {/* 📍 Locate me */}
                        <button
                          aria-label="พิกัดของฉัน"
                          onClick={handleLocateMe}
                          style={{ width: '40px', height: '40px', borderRadius: '50%', background: cardBg, border: `1px solid ${borderColor}`, fontSize: '1.1rem', boxShadow: '0 2px 10px rgba(0,0,0,0.3)', cursor: isLocating ? 'wait' : 'pointer', opacity: isLocating ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >{isLocating ? '⏳' : '📍'}</button>

                        {/* 📊 Rank panel toggle */}
                        <button
                          aria-label="อันดับจังหวัด"
                          onClick={() => setActivePanel(p => p === 'filter' ? null : 'filter')}
                          style={{ width: '40px', height: '40px', borderRadius: '50%', background: activePanel === 'filter' ? '#0ea5e9' : cardBg, color: activePanel === 'filter' ? '#fff' : textColor, border: `1px solid ${activePanel === 'filter' ? '#0ea5e9' : borderColor}`, fontSize: '1rem', boxShadow: '0 2px 10px rgba(0,0,0,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >⚙️</button>

                        {/* 📚 Reference (risk mode only) */}
                        {mapCategory === 'risk' && (
                          <button
                            aria-label="แหล่งอ้างอิง"
                            onClick={() => setShowReferenceModal(true)}
                            style={{ width: '40px', height: '40px', borderRadius: '50%', background: cardBg, border: `1px solid #8b5cf6`, fontSize: '1.1rem', boxShadow: '0 2px 10px rgba(0,0,0,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >📚</button>
                        )}
                      </div>

                      {/* === FILTER PANEL dropdown === */}
                      {activePanel === 'filter' && (
                        <div className="fade-in" style={{ position: 'fixed', left: '12px', right: '12px', bottom: mobilePanelBottom, background: 'var(--bg-nav-blur)', backdropFilter: 'blur(14px)', padding: '14px', borderRadius: '18px', border: `1px solid ${borderColor}`, boxShadow: '0 12px 30px rgba(0,0,0,0.25)', zIndex: 1003 }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: textColor, marginBottom: '10px' }}>⚙️ ตัวกรองแผนที่</div>
                          <div style={{ borderTop: `1px solid ${borderColor}`, paddingTop: '2px' }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: textColor, marginBottom: '6px' }}>รูปแบบแผนที่</div>
                            <select value={basemapStyle} onChange={(e) => setBasemapStyle(e.target.value)} style={{ width: '100%', background: 'var(--bg-secondary)', color: textColor, border: `1px solid ${borderColor}`, padding: '6px', borderRadius: '8px', fontSize: '0.75rem', outline: 'none', fontFamily: 'Kanit' }}>
                              <option value="dark">สีเข้ม (Dark)</option><option value="light">สีสว่าง (Light)</option><option value="osm">ถนน (Street)</option><option value="satellite">ดาวเทียม</option>
                            </select>
                            <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: textColor, marginTop: '8px', marginBottom: '4px' }}>ความทึบ</div>
                            <input type="range" min="0.1" max="1" step="0.1" value={polyOpacity} onChange={(e) => setPolyOpacity(parseFloat(e.target.value))} style={{ width: '100%', accentColor: activeModeObj?.color }} />
                          </div>
                        </div>
                      )}

                      {/* === CATEGORY PANEL dropdown === */}
                      {activePanel === 'category' && (
                        <div className="fade-in" style={{ position: 'fixed', left: '12px', right: '12px', bottom: mobilePanelBottom, background: 'var(--bg-nav-blur)', backdropFilter: 'blur(14px)', padding: '14px', borderRadius: '18px', border: `1px solid ${borderColor}`, boxShadow: '0 12px 30px rgba(0,0,0,0.25)', zIndex: 1003, maxHeight: '52vh', overflowY: 'auto' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
                            <div>
                              <div style={{ fontSize: '0.78rem', fontWeight: 900, color: textColor }}>🗺️ เลือกมุมมองแผนที่</div>
                              <div style={{ fontSize: '0.62rem', color: subTextColor, marginTop: '2px', lineHeight: 1.35 }}>เลือกก่อนว่าอยากดูอะไร แล้วค่อยเลือกชั้นข้อมูล</div>
                            </div>
                            <span style={{ flexShrink: 0, color: activeCategoryOption?.color, background: darkMode ? `${activeCategoryOption?.color}20` : `${activeCategoryOption?.color}12`, border: `1px solid ${activeCategoryOption?.color}35`, borderRadius: '999px', padding: '4px 9px', fontSize: '0.62rem', fontWeight: 900 }}>
                              {activeCategoryOption?.shortLabel}
                            </span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
                            {mapCategoryOptions.map(opt => {
                              const active = mapCategory === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  onClick={() => { setMapCategory(opt.id); setActivePanel(null); }}
                                  style={{
                                    padding: '11px 10px',
                                    minHeight: '112px',
                                    borderRadius: '16px',
                                    border: `1px solid ${active ? opt.color : borderColor}`,
                                    background: active ? (darkMode ? `${opt.color}28` : `${opt.color}16`) : 'var(--bg-secondary)',
                                    color: active ? opt.color : textColor,
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    fontFamily: 'Kanit',
                                    fontSize: '0.72rem',
                                    lineHeight: 1.2,
                                    textAlign: 'left',
                                    boxShadow: active ? `0 8px 20px ${opt.color}24` : 'none',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    gap: '8px',
                                    minWidth: 0,
                                  }}
                                >
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.84rem', fontWeight: 900 }}>
                                      <span style={{ width: '28px', height: '28px', borderRadius: '11px', background: `${opt.color}18`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{opt.icon}</span>
                                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{opt.label}</span>
                                    </div>
                                    <div style={{ color: active ? opt.color : subTextColor, fontSize: '0.62rem', fontWeight: 800, marginTop: '8px', lineHeight: 1.35 }}>{opt.useFor}</div>
                                  </div>
                                  <div style={{ color: active ? opt.color : subTextColor, fontSize: '0.6rem', fontWeight: 800, background: active ? `${opt.color}12` : (darkMode ? 'rgba(148,163,184,0.12)' : 'rgba(148,163,184,0.1)'), borderRadius: '999px', padding: '4px 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {opt.desc}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* === LAYER PANEL dropdown === */}
                      {activePanel === 'layer' && (
                        <div className="fade-in" style={{ position: 'fixed', left: '12px', right: '12px', bottom: mobilePanelBottom, background: 'var(--bg-nav-blur)', backdropFilter: 'blur(14px)', padding: '14px', borderRadius: '18px', border: `1px solid ${borderColor}`, boxShadow: '0 12px 30px rgba(0,0,0,0.25)', zIndex: 1003, maxHeight: '52vh', overflowY: 'auto' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: textColor, marginBottom: '8px' }}>🧩 ชั้นข้อมูล</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflowY: 'auto' }} className="custom-scrollbar">
                            {activeModeList.map(m => (
                              <button
                                key={m.id}
                                onClick={() => { setActiveModeByCategory(m.id); setActivePanel(null); }}
                                style={{ padding: '8px 10px', borderRadius: '10px', border: `1px solid ${activeModeId === m.id ? m.color : borderColor}`, background: activeModeId === m.id ? (darkMode ? `${m.color}25` : `${m.color}18`) : 'var(--bg-secondary)', color: activeModeId === m.id ? m.color : textColor, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Kanit', fontSize: '0.75rem', textAlign: 'left', opacity: m.noApi ? 0.5 : 1 }}
                              >
                                {m.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* === TIME PANEL dropdown === */}
                      {activePanel === 'time' && (
                        <div className="fade-in" style={{ position: 'fixed', left: '12px', right: '12px', bottom: mobilePanelBottom, background: 'var(--bg-nav-blur)', backdropFilter: 'blur(14px)', padding: '14px', borderRadius: '18px', border: `1px solid ${borderColor}`, boxShadow: '0 12px 30px rgba(0,0,0,0.25)', zIndex: 1003, maxHeight: '58vh', overflowY: 'auto' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 'bold', color: textColor }}>📅 ช่วงเวลา</div>
                            <span style={{ color: activeTimeOption?.color, fontSize: '0.66rem', fontWeight: 900 }}>{activeTimeOption?.sub}</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {timeModeSections.map(section => (
                              <div key={section.id} style={{ border: `1px solid ${borderColor}`, borderRadius: '14px', padding: '9px', background: 'var(--bg-secondary)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '7px' }}>
                                  <span style={{ color: textColor, fontSize: '0.7rem', fontWeight: 900 }}>{section.title}</span>
                                  <span style={{ color: subTextColor, fontSize: '0.6rem', fontWeight: 800 }}>{section.helper}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {section.options.map(opt => {
                                    const active = activeTimeKey === opt.id;
                                    return (
                                      <button
                                        key={opt.id}
                                        onClick={() => { handleTimeOptionSelect(opt.id); setActivePanel(null); }}
                                        style={{ padding: '9px 11px', borderRadius: '11px', border: `1px solid ${active ? opt.color : borderColor}`, background: active ? (darkMode ? `${opt.color}25` : `${opt.color}18`) : cardBg, color: active ? opt.color : textColor, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Kanit', fontSize: '0.78rem', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}
                                      >
                                        <span>{opt.label}</span>
                                        <span style={{ fontSize: '0.62rem', opacity: 0.75, whiteSpace: 'nowrap' }}>{opt.sub}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div style={{ color: subTextColor, fontSize: '0.64rem', lineHeight: 1.5, marginTop: '10px' }}>{timeContextNote}</div>
                        </div>
                      )}

                      {/* === RANK PANEL (slide up from bottom on mobile) === */}
                      {activePanel === 'rank' && (
                        <div className="fade-in" style={{ position: 'fixed', bottom: mobilePanelBottom, left: '12px', right: '12px', zIndex: 2000, background: cardBg, borderRadius: '20px', border: `1px solid ${borderColor}`, boxShadow: '0 12px 30px rgba(0,0,0,0.3)', maxHeight: '62vh', display: 'flex', flexDirection: 'column', padding: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', color: textColor }}>📍 {mapCategory === 'risk' ? 'พื้นที่เสี่ยงสูงสุด' : mapCategory === 'gistda' ? 'พื้นที่วิกฤต' : mapCategory === 'yesterday' ? 'สถิติเมื่อวาน' : 'อันดับสูงสุด'}</h3>
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
                    /* ---- DESKTOP compact map tools ---- */
                    <div className="fade-in" style={{ background: 'var(--bg-nav-blur)', backdropFilter: 'blur(12px)', padding: '8px', borderRadius: '16px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 20px rgba(0,0,0,0.14)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button aria-label="ค้นหาตำแหน่งของฉัน" onClick={handleLocateMe} style={{ background: cardBg, color: textColor, border: `1px solid ${borderColor}`, padding: '7px 10px', borderRadius: '999px', fontWeight: 'bold', fontSize: '0.76rem', cursor: isLocating ? 'wait' : 'pointer', fontFamily: 'Kanit', opacity: isLocating ? 0.7 : 1, transition: 'all 0.2s', whiteSpace: 'nowrap' }}>{isLocating ? '⏳ กำลังหา...' : '📍 พิกัด'}</button>
                      <select aria-label="รูปแบบแผนที่" value={basemapStyle} onChange={(e) => setBasemapStyle(e.target.value)} style={{ background: cardBg, color: textColor, border: `1px solid ${borderColor}`, padding: '7px 9px', borderRadius: '999px', fontSize: '0.72rem', outline: 'none', fontFamily: 'Kanit', fontWeight: 800 }}>
                          <option value="dark">เข้ม</option><option value="light">สว่าง</option><option value="osm">ถนน</option><option value="satellite">ดาวเทียม</option>
                      </select>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: subTextColor, fontSize: '0.66rem', fontWeight: 900, whiteSpace: 'nowrap' }}>
                        เลเยอร์
                        <input aria-label="ความทึบเลเยอร์" type="range" min="0.1" max="1" step="0.1" value={polyOpacity} onChange={(e) => setPolyOpacity(parseFloat(e.target.value))} style={{ width: '74px', accentColor: activeModeObj?.color }} />
                      </label>
                    </div>
                  )}
                </div>
              </div>
          </div>

          {/* === DESKTOP SIDEBAR (ซ่อนบนมือถือ — ใช้ Bottom Sheet แทน) === */}
          {!isMobile && (
            <div style={{ width: '280px', background: cardBg, borderRadius: '18px', padding: '12px', border: `1px solid ${borderColor}`, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', zIndex: 10, flexShrink: 0, minHeight: 0 }}>
               <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: textColor, display: 'flex', alignItems: 'center' }}>
                  📍 {mapCategory === 'risk' ? 'พื้นที่เสี่ยงสูงสุด (Top 5)' : mapCategory === 'gistda' ? 'พื้นที่วิกฤต (Top 5)' : mapCategory === 'yesterday' ? `สถิติเมื่อวาน ${getDateLabel(-1)}` : 'จังหวัดที่น่าสนใจ (Top 5)'}
               </h3>
               <p style={{ margin: '0 0 8px 0', fontSize: '0.68rem', color: activeModeObj?.color, fontWeight: 'bold', lineHeight: 1.35 }}>{activeModeObj?.desc}</p>
               {mapCategory === 'yesterday' && (
                 <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '8px' }}>
                   {yesterdayModes.map(m => (
                     <button key={m.id} onClick={() => setActiveYesterdayMode(m.id)} style={{ padding: '3px 8px', borderRadius: '8px', border: `1px solid ${activeYesterdayMode === m.id ? m.color : borderColor}`, background: activeYesterdayMode === m.id ? (darkMode ? `${m.color}25` : `${m.color}18`) : 'var(--bg-secondary)', color: activeYesterdayMode === m.id ? m.color : subTextColor, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Kanit', fontSize: '0.65rem' }}>{m.name}</button>
                   ))}
                 </div>
               )}
               <input type="text" placeholder="🔍 ค้นหาจังหวัด..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: `1px solid ${borderColor}`, background: 'var(--bg-secondary)', color: textColor, fontSize: '0.85rem', fontFamily: 'Kanit', outline: 'none', marginBottom: '8px', boxSizing: 'border-box' }} />

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
                  }).slice(0, 5).map((st, idx) => (
                     <div key={st.stationID} onClick={() => handleRegionClick(st)} style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '16px', marginBottom: '9px', cursor: 'pointer', transition: 'all 0.3s ease', border: `1px solid ${borderColor}`, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '1.05rem', fontWeight: '900', color: textColor }}>จ.{st.areaTH.replace('จังหวัด', '')}</div>
                            <div style={{ fontSize: '1.45rem', fontWeight: '900', color: st.color }}>
                               {st.displayVal} <span style={{fontSize:'0.8rem', color: subTextColor, fontWeight:'bold'}}>{(mapCategory==='basic' || mapCategory==='yesterday') ? activeModeObj?.unit : ''}</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '0.76rem', color: subTextColor, fontWeight: 'bold' }}>
                                อันดับ {idx+1} {mapCategory === 'risk' && <span style={{ marginLeft: '5px' }}>• สถานะ: {getRiskLabel(st.displayVal)}</span>}
                            </div>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: st.color, boxShadow: `0 0 8px ${st.color}` }}></div>
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
          <div className="fade-in custom-scrollbar" onKeyDown={handleFocusTrap} tabIndex="-1" style={{ background: cardBg, padding: '20px', borderRadius: '20px', width: '100%', maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto', border: `1px solid ${borderColor}`, boxShadow: '0 20px 50px rgba(0,0,0,0.5)', position: 'relative', outline: 'none' }} onClick={e => e.stopPropagation()}>
              <button autoFocus aria-label="ปิด" onClick={() => setSelectedHotspot(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'var(--bg-secondary)', border: 'none', width: '30px', height: '30px', borderRadius: '50%', color: textColor, cursor: 'pointer', fontWeight: 'bold', zIndex: 1 }}>✕</button>

              <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: `1px solid ${borderColor}` }}>
                  <div style={{ fontSize: '0.72rem', color: timeMode === 'today' ? '#22c55e' : timeMode === 'tomorrow' ? '#a855f7' : '#0ea5e9', fontWeight: 'bold', marginBottom: '3px' }}>
                      {timeMode === 'today' ? `● ข้อมูลตอนนี้ • ${getLastUpdatedText()}` : timeMode === 'tomorrow' ? `🔮 พยากรณ์พรุ่งนี้ ${getDateLabel(1)}` : `📊 ภาพรวมพยากรณ์ 7 วันข้างหน้า`}
                  </div>
                  <h2 style={{ margin: 0, color: textColor, fontSize: isMobile ? '1.1rem' : '1.3rem', fontWeight: 'bold' }}>📍 จ.{selectedHotspot.station.areaTH.replace('จังหวัด','')}</h2>
              </div>

              {/* === ข้อมูลปัจจุบัน/พยากรณ์ === */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: `4px solid ${getBasicColor(selectedHotspot.pm25, 'pm25')}` }}>
                      <span style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold' }}>😷 PM2.5</span>
                      <span style={{ fontSize: '1.3rem', fontWeight: '900', color: getBasicColor(selectedHotspot.pm25, 'pm25') }}>{selectedHotspot.pm25} <span style={{fontSize: '0.65rem', color: subTextColor, fontWeight:'normal'}}>µg/m³</span></span>
                      <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: getPm25QualityText(selectedHotspot.pm25).color }}>{getPm25QualityText(selectedHotspot.pm25).text}</span>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: `4px solid ${getBasicColor(selectedHotspot.data.temp, 'temp')}` }}>
                      <span style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold' }}>🌡️ อุณหภูมิ</span>
                      <span style={{ fontSize: '1.3rem', fontWeight: '900', color: getBasicColor(selectedHotspot.data.temp, 'temp') }}>{Math.round(selectedHotspot.data.temp || 0)}°C</span>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: `4px solid ${getBasicColor(selectedHotspot.data.feelsLike, 'heat')}` }}>
                      <span style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold' }}>🥵 ความร้อน</span>
                      <span style={{ fontSize: '1.3rem', fontWeight: '900', color: getBasicColor(selectedHotspot.data.feelsLike, 'heat') }}>{Math.round(selectedHotspot.data.feelsLike || 0)}°C</span>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: `4px solid ${getBasicColor(selectedHotspot.data.rainProb, 'rain')}` }}>
                      <span style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold' }}>☔ โอกาสฝน</span>
                      <span style={{ fontSize: '1.3rem', fontWeight: '900', color: getBasicColor(selectedHotspot.data.rainProb, 'rain') }}>{Math.round(selectedHotspot.data.rainProb || 0)} <span style={{fontSize: '0.65rem', color: subTextColor, fontWeight:'normal'}}>%</span></span>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: `4px solid ${getBasicColor(selectedHotspot.data.windSpeed, 'wind')}` }}>
                      <span style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold' }}>🌬️ ลมกระโชก{timeMode === 'today' ? '/ทิศ' : ''}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '1.3rem', fontWeight: '900', color: getBasicColor(selectedHotspot.data.windSpeed, 'wind') }}>{Math.round(selectedHotspot.data.windSpeed || 0)} <span style={{fontSize: '0.65rem', color: subTextColor, fontWeight:'normal'}}>km/h</span></span>
                          {timeMode === 'today' && selectedHotspot.data.windDir !== undefined && (
                              <span style={{ fontSize: '1rem' }}>{getWindDirection(selectedHotspot.data.windDir).arrow}</span>
                          )}
                      </div>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: `4px solid ${getBasicColor(selectedHotspot.data.uv, 'uv')}` }}>
                      <span style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold' }}>☀️ UV</span>
                      <span style={{ fontSize: '1.3rem', fontWeight: '900', color: getBasicColor(selectedHotspot.data.uv, 'uv') }}>{Math.round(selectedHotspot.data.uv || 0)} <span style={{fontSize: '0.65rem', color: textColor, fontWeight:'normal'}}>{getUvText(selectedHotspot.data.uv)}</span></span>
                  </div>
              </div>

              {/* === ความกดอากาศ === */}
              {(() => {
                const pCur = stationTemps[selectedHotspot.station.stationID]?.pressure;
                const daily = stationDaily[selectedHotspot.station.stationID] || {};
                const pressureArr = daily.pressure;
                const yMax = stationMaxYesterday?.[selectedHotspot.station.stationID]?.pressure;
                const yMin = stationYesterday?.[selectedHotspot.station.stationID]?.minPressure;
                const avg7 = pressureArr ? Math.round([8,9,10,11,12,13,14].map(i=>pressureArr[i]||0).filter(v=>v>0).reduce((a,b,_,ar)=>a+b/ar.length,0)) : null;
                if (!pCur && !yMax && !avg7) return null;
                return (
                  <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '14px', marginBottom: '12px', borderLeft: '4px solid #64748b' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: subTextColor, marginBottom: '8px' }}>🧭 ความกดอากาศ (hPa)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                      {[
                        { label: 'ตอนนี้', val: pCur ? Math.round(pCur) : null },
                        { label: 'เมื่อวาน ต่ำ', val: yMin ? Math.round(yMin) : null },
                        { label: 'เมื่อวาน สูง', val: yMax ? Math.round(yMax) : null },
                        { label: '7 วันข้างหน้า', val: avg7 || null },
                      ].map((item, i) => (
                        <div key={i} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.6rem', color: subTextColor, marginBottom: '2px' }}>{item.label}</div>
                          <div style={{ fontSize: '0.9rem', fontWeight: '900', color: item.val ? getBasicColor(item.val, 'pressure') : subTextColor }}>{item.val ?? '--'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* === 7-day summary stats === */}
              {selectedHotspot.summary7 && (
                <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '14px', marginBottom: '12px', border: `1px solid ${borderColor}` }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: subTextColor, marginBottom: '8px' }}>📊 สรุปย้อนหลัง 7 วัน</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', fontSize: '0.72rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', background: cardBg, padding: '5px 8px', borderRadius: '8px' }}><span style={{ color: subTextColor }}>🌧️ ฝนสะสม 7 วัน</span><span style={{ fontWeight: 'bold', color: '#3b82f6' }}>{selectedHotspot.summary7.hist7RainSum}%</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', background: cardBg, padding: '5px 8px', borderRadius: '8px' }}><span style={{ color: subTextColor }}>🌡️ สูงสุด 7 วัน</span><span style={{ fontWeight: 'bold', color: '#ef4444' }}>{selectedHotspot.summary7.hist7TempMax ?? '--'}°</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', background: cardBg, padding: '5px 8px', borderRadius: '8px' }}><span style={{ color: subTextColor }}>❄️ ต่ำสุด 7 วัน</span><span style={{ fontWeight: 'bold', color: '#3b82f6' }}>{selectedHotspot.summary7.hist7TempMin ?? '--'}°</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', background: cardBg, padding: '5px 8px', borderRadius: '8px' }}><span style={{ color: subTextColor }}>☀️ UV สูงสุด 7 วัน</span><span style={{ fontWeight: 'bold', color: '#a855f7' }}>{selectedHotspot.summary7.hist7UvMax ?? '--'}</span></div>
                  </div>
                </div>
              )}

              {/* === พรุ่งนี้ + เฉลี่ย 7 วันข้างหน้า === */}
              {selectedHotspot.summary7 && (
                <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '14px', marginBottom: '12px', border: `1px solid #a855f740` }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#a855f7', marginBottom: '8px' }}>🔮 พยากรณ์ข้างหน้า</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.72rem' }}>
                    <div style={{ background: cardBg, padding: '8px', borderRadius: '10px', border: `1px solid #a855f720` }}>
                      <div style={{ color: '#a855f7', fontWeight: 'bold', marginBottom: '4px' }}>🌅 พรุ่งนี้ {getDateLabel(1)}</div>
                      <div style={{ color: textColor }}>🌡️ {selectedHotspot.summary7.tomorrowTemp ?? '--'}° | 🥵 {selectedHotspot.summary7.tomorrowHeat ?? '--'}°</div>
                      <div style={{ color: textColor }}>☔ {selectedHotspot.summary7.tomorrowRain ?? '--'}% | 🌬️ {selectedHotspot.summary7.tomorrowWind ?? '--'} km/h</div>
                      <div style={{ color: textColor }}>☀️ UV {selectedHotspot.summary7.tomorrowUv ?? '--'}</div>
                    </div>
                    <div style={{ background: cardBg, padding: '8px', borderRadius: '10px', border: `1px solid #0ea5e920` }}>
                      <div style={{ color: '#0ea5e9', fontWeight: 'bold', marginBottom: '4px' }}>📊 7 วันข้างหน้า</div>
                      <div style={{ color: textColor }}>🌡️ {selectedHotspot.summary7.fcast7TempAvg ?? '--'}° | 🥵 {selectedHotspot.summary7.fcast7HeatAvg ?? '--'}°</div>
                      <div style={{ color: textColor }}>☔ ฝนสะสม {selectedHotspot.summary7.fcast7RainSum ?? '--'}%</div>
                      <div style={{ color: textColor }}>☀️ UV เฉลี่ย {selectedHotspot.summary7.fcast7UvAvg ?? '--'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* 🩺 คำแนะนำเชิงปฏิบัติ */}
              <div style={{ background: 'var(--bg-overlay)', padding: '12px', borderRadius: '12px', border: `1px solid ${borderColor}` }}>
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
              </div>
          </div>
        </div>
      )}

      {/* POPUP 2.5: YESTERDAY STATS MODAL */}
      {selectedHotspot && selectedHotspot.type === 'yesterday' && (
        <div role="dialog" aria-modal="true" aria-label="สถิติเมื่อวานรายจังหวัด" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }} onClick={() => setSelectedHotspot(null)}>
          <div className="fade-in custom-scrollbar" onKeyDown={handleFocusTrap} tabIndex="-1" style={{ background: cardBg, padding: '20px', borderRadius: '20px', width: '100%', maxWidth: '420px', maxHeight: '90vh', overflowY: 'auto', border: `1px solid ${borderColor}`, boxShadow: '0 20px 50px rgba(0,0,0,0.5)', position: 'relative', outline: 'none' }} onClick={e => e.stopPropagation()}>
              <button autoFocus aria-label="ปิด" onClick={() => setSelectedHotspot(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'var(--bg-secondary)', border: 'none', width: '30px', height: '30px', borderRadius: '50%', color: textColor, cursor: 'pointer', fontWeight: 'bold', zIndex: 1 }}>✕</button>

              <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: `1px solid ${borderColor}` }}>
                  <div style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 'bold', marginBottom: '3px' }}>📋 สถิติเมื่อวาน {getDateLabel(-1)} — กรมอุตุนิยมวิทยา</div>
                  <h2 style={{ margin: 0, color: textColor, fontSize: isMobile ? '1.1rem' : '1.3rem', fontWeight: 'bold' }}>📍 จ.{selectedHotspot.station.areaTH.replace('จังหวัด','')}</h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  { icon: '🌡️', label: 'อุณหภูมิสูงสุด', val: selectedHotspot.maxObj.temp != null ? `${Math.round(selectedHotspot.maxObj.temp)}°C` : '--', color: getBasicColor(selectedHotspot.maxObj.temp, 'temp') },
                  { icon: '❄️', label: 'อุณหภูมิต่ำสุด', val: (selectedHotspot.minObj.minTemp ?? selectedHotspot.minObj.temp) != null ? `${Math.round(selectedHotspot.minObj.minTemp ?? selectedHotspot.minObj.temp)}°C` : '--', color: '#3b82f6' },
                  { icon: '🥵', label: 'ดัชนีความร้อน', val: (selectedHotspot.maxObj.heat ?? selectedHotspot.maxObj.temp) != null ? `${Math.round(selectedHotspot.maxObj.heat ?? selectedHotspot.maxObj.temp)}°C` : '--', color: getBasicColor(selectedHotspot.maxObj.heat ?? selectedHotspot.maxObj.temp, 'heat') },
                  { icon: '🌧️', label: 'ปริมาณฝน', val: selectedHotspot.maxObj.rain != null ? `${Math.round(selectedHotspot.maxObj.rain * 10)/10} mm` : '--', color: getBasicColor(selectedHotspot.maxObj.rain, 'rain') },
                  { icon: '☀️', label: 'UV สูงสุด', val: selectedHotspot.maxObj.uv != null ? String(Math.round(selectedHotspot.maxObj.uv * 10)/10) : '--', color: getBasicColor(selectedHotspot.maxObj.uv, 'uv') },
                  { icon: '😷', label: 'PM2.5 สูงสุด', val: selectedHotspot.maxObj.pm25 != null ? `${Math.round(selectedHotspot.maxObj.pm25)} µg/m³` : '--', color: getBasicColor(selectedHotspot.maxObj.pm25, 'pm25') },
                  { icon: '🌬️', label: 'ลมกระโชกสูงสุด', val: selectedHotspot.maxObj.windSpeed != null ? `${Math.round(selectedHotspot.maxObj.windSpeed)} km/h` : '--', color: getBasicColor(selectedHotspot.maxObj.windSpeed, 'wind') },
                  { icon: '🧭', label: 'ความกดอากาศ', val: selectedHotspot.maxObj.pressure != null ? `${Math.round(selectedHotspot.maxObj.pressure)} hPa` : '--', color: getBasicColor(selectedHotspot.maxObj.pressure, 'pressure') },
                ].map((item, i) => (
                  <div key={i} style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '14px', borderLeft: `4px solid ${item.color}` }}>
                    <div style={{ fontSize: '0.72rem', color: subTextColor, fontWeight: 'bold', marginBottom: '4px' }}>{item.icon} {item.label}</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '900', color: item.color }}>{item.val}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '12px', background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: '10px', fontSize: '0.7rem', color: subTextColor }}>
                  ℹ️ ข้อมูลค่าสูงสุดและต่ำสุดของเมื่อวาน จากกรมอุตุนิยมวิทยา (TMD) อัปเดตทุกเช้า
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
