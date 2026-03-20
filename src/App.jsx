import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './App.css';

// ==============================================================
// 1. ฟังก์ชันคำนวณสีและข้อความ
// ==============================================================
const getAqiDetails = (aqiValue) => {
  const aqi = Number(aqiValue);
  if (isNaN(aqi) || aqi === 0) return { color: '#cccccc', text: 'ไม่มีข้อมูล', level: 0 };
  if (aqi <= 25) return { color: '#00b0f0', text: 'คุณภาพอากาศดีมาก', level: 1 };
  if (aqi <= 50) return { color: '#92d050', text: 'คุณภาพอากาศดี', level: 2 };
  if (aqi <= 100) return { color: '#ffff00', text: 'ปานกลาง', level: 3 };
  if (aqi <= 200) return { color: '#ffc000', text: 'เริ่มมีผลกระทบฯ', level: 4 };
  return { color: '#ff0000', text: 'มีผลกระทบต่อสุขภาพ', level: 5 };
};

const getPM25Color = (val) => {
  const num = Number(val);
  if (isNaN(num)) return '#cccccc';
  if (num <= 15.0) return '#00b0f0'; 
  if (num <= 25.0) return '#92d050'; 
  if (num <= 37.5) return '#ffff00'; 
  if (num <= 75.0) return '#ffc000'; 
  return '#ff0000'; 
};

const getPM25HealthAdvice = (val) => {
  const num = Number(val);
  if (isNaN(num) || num === 0) return null;
  if (num <= 25.0) return { text: "อากาศดีเยี่ยม เหมาะกับการทำกิจกรรมกลางแจ้ง", icon: "🏃‍♂️" };
  if (num <= 37.5) return { text: "ประชาชนทั่วไปทำกิจกรรมได้ปกติ กลุ่มเสี่ยงควรสังเกตอาการ", icon: "🚶‍♀️" };
  if (num <= 75.0) return { text: "ลดระยะเวลาการทำกิจกรรมกลางแจ้ง หรือใช้อุปกรณ์ป้องกัน (หน้ากาก N95)", icon: "😷" };
  return { text: "งดกิจกรรมกลางแจ้ง และใช้อุปกรณ์ป้องกัน หากจำเป็นต้องออกนอกอาคาร", icon: "🚨" };
};

const getTempColor = (val) => {
  if (isNaN(val) || val === null) return { bg: '#cccccc', text: '#333', bar: '#cccccc' };
  if (val < 27) return { bg: '#3498db', text: '#fff', bar: '#3498db' }; 
  if (val <= 32) return { bg: '#2ecc71', text: '#222', bar: '#2ecc71' }; 
  if (val <= 35) return { bg: '#f1c40f', text: '#222', bar: '#f1c40f' }; 
  if (val <= 38) return { bg: '#e67e22', text: '#fff', bar: '#e67e22' }; 
  return { bg: '#e74c3c', text: '#fff', bar: '#e74c3c' }; 
};

const getHeatIndexAlert = (feelsLike) => {
  if (isNaN(feelsLike) || feelsLike === null) return { text: 'ไม่มีข้อมูล', color: '#666', bg: '#eee', bar: '#ccc', icon: '❓' };
  if (feelsLike >= 52.0) return { text: 'อันตรายมาก (เสี่ยงฮีทสโตรกสูง)', color: '#dc2626', bg: '#fee2e2', bar: '#ef4444', icon: '🚨' };
  if (feelsLike >= 42.0) return { text: 'อันตราย (หลีกเลี่ยงกลางแจ้ง)', color: '#ea580c', bg: '#ffedd5', bar: '#f97316', icon: '🥵' };
  if (feelsLike >= 33.0) return { text: 'เตือนภัย (ลดกิจกรรมกลางแจ้ง)', color: '#ca8a04', bg: '#fef9c3', bar: '#eab308', icon: '😰' };
  if (feelsLike >= 27.0) return { text: 'เฝ้าระวัง (ดูแลสุขภาพทั่วไป)', color: '#16a34a', bg: '#dcfce7', bar: '#22c55e', icon: '😅' };
  return { text: 'ปกติ', color: '#0284c7', bg: '#e0f2fe', bar: '#3b82f6', icon: '😊' };
};

const getHeatHealthAdvice = (val) => {
  if (isNaN(val) || val === null) return null;
  if (val >= 52.0) return { text: "อันตรายมาก! งดกิจกรรมกลางแจ้งโดยเด็ดขาด มีความเสี่ยงเกิดโรคลมร้อน (Heat Stroke) สูงมาก", icon: "🚑" };
  if (val >= 42.0) return { text: "อันตราย! ควรหลีกเลี่ยงกิจกรรมกลางแจ้งเป็นเวลานาน", icon: "⛔" };
  if (val >= 33.0) return { text: "เตือนภัย! ควรลดระยะเวลากิจกรรมกลางแจ้ง และดื่มน้ำให้เพียงพอ", icon: "💧" };
  if (val >= 27.0) return { text: "เฝ้าระวัง! อากาศเริ่มร้อน ควรดูแลสุขภาพทั่วไปและสังเกตอาการตนเอง", icon: "🥤" };
  return null;
};

const getUvColor = (val) => {
  if (isNaN(val) || val === null) return { bg: '#cccccc', text: '#333', bar: '#cccccc', label: 'ไม่มีข้อมูล' };
  if (val <= 2) return { bg: '#2ecc71', text: '#fff', bar: '#2ecc71', label: 'ต่ำ (Low)' };
  if (val <= 5) return { bg: '#f1c40f', text: '#222', bar: '#f1c40f', label: 'ปานกลาง (Mod)' };
  if (val <= 7) return { bg: '#e67e22', text: '#fff', bar: '#e67e22', label: 'สูง (High)' };
  if (val <= 10) return { bg: '#e74c3c', text: '#fff', bar: '#e74c3c', label: 'สูงมาก (V.High)' };
  return { bg: '#9b59b6', text: '#fff', bar: '#9b59b6', label: 'อันตราย (Extreme)' };
};

const getUvHealthAdvice = (val) => {
  if (isNaN(val) || val === null) return null;
  if (val > 10) return { text: "หลีกเลี่ยงการออกแดดเด็ดขาด ผิวหนังและดวงตาอาจไหม้ได้ในเวลาไม่กี่นาที", icon: "⛔" };
  if (val >= 8) return { text: "ควรอยู่ในที่ร่ม หากต้องออกแดดต้องทาครีมกันแดด SPF50+ ใส่เสื้อแขนยาว หมวก และแว่นตากันแดด", icon: "☂️" };
  if (val >= 6) return { text: "ควรทาครีมกันแดด สวมหมวก หรือกางร่มเมื่อออกแดด", icon: "🧢" };
  return null;
};

const getRainColor = (val) => {
  if (isNaN(val) || val === null) return { bg: '#cccccc', text: '#333', bar: '#cccccc', label: 'ไม่มีข้อมูล' };
  if (val === 0) return { bg: '#95a5a6', text: '#fff', bar: '#95a5a6', label: 'ไม่มีฝน' };
  if (val <= 30) return { bg: '#74b9ff', text: '#222', bar: '#74b9ff', label: 'โอกาสต่ำ' };
  if (val <= 60) return { bg: '#0984e3', text: '#fff', bar: '#0984e3', label: 'โอกาสปานกลาง' };
  if (val <= 80) return { bg: '#273c75', text: '#fff', bar: '#273c75', label: 'โอกาสสูง' };
  return { bg: '#192a56', text: '#fff', bar: '#192a56', label: 'โอกาสสูงมาก' };
};

const getWindColor = (val) => {
  if (isNaN(val) || val === null) return { bg: '#cccccc', text: '#333', bar: '#cccccc', label: 'ไม่มีข้อมูล' };
  if (val <= 10) return { bg: '#00b0f0', text: '#fff', bar: '#00b0f0', label: 'ลมอ่อน' };
  if (val <= 25) return { bg: '#2ecc71', text: '#fff', bar: '#2ecc71', label: 'ลมปานกลาง' };
  if (val <= 40) return { bg: '#f1c40f', text: '#222', bar: '#f1c40f', label: 'ลมแรง' };
  if (val <= 60) return { bg: '#e67e22', text: '#fff', bar: '#e67e22', label: 'ลมแรงมาก' };
  return { bg: '#e74c3c', text: '#fff', bar: '#e74c3c', label: 'พายุ' };
};

const getWeatherIcon = (code) => {
  if (code === undefined || code === null) return { icon: '❓', text: 'ไม่ทราบ' };
  switch (true) {
    case code === 0: return { icon: '☀️', text: 'แจ่มใส' };
    case code === 1: return { icon: '🌤️', text: 'มีเมฆบางส่วน' };
    case code === 2: return { icon: '⛅', text: 'มีเมฆ' };
    case code === 3: return { icon: '☁️', text: 'มีเมฆมาก' };
    case code === 45 || code === 48: return { icon: '🌫️', text: 'มีหมอก' };
    case [51, 53, 55, 56, 57].includes(code): return { icon: '🌧️', text: 'ฝนปรอย' };
    case [61, 63, 65, 66, 67].includes(code): return { icon: '🌧️', text: 'ฝนตก' };
    case [71, 73, 75, 77, 85, 86].includes(code): return { icon: '❄️', text: 'หิมะ' };
    case [80, 81, 82].includes(code): return { icon: '🌦️', text: 'ฝนตกหย่อมๆ' };
    case [95, 96, 99].includes(code): return { icon: '⛈️', text: 'พายุฝน' };
    default: return { icon: '🌤️', text: 'ปกติ' };
  }
};

const extractProvince = (areaTH) => {
  if (!areaTH) return 'ไม่ระบุ';
  if (areaTH.includes('กรุงเทพ') || areaTH.includes('กทม') || areaTH.includes('เขต')) return 'กรุงเทพมหานคร';
  let province = areaTH;
  if (areaTH.includes(',')) {
    const parts = areaTH.split(',');
    province = parts[parts.length - 1];
  } else {
    const parts = areaTH.trim().split(/\s+/);
    province = parts[parts.length - 1];
  }
  return province.replace(/^(จ\.|จังหวัด)/, '').trim();
};

const legendData = {
  pm25: { title: 'ระดับ PM2.5 (µg/m³)', items: [{ color: '#00b0f0', label: '0-15.0 (ดีมาก)' },{ color: '#92d050', label: '15.1-25.0 (ดี)' },{ color: '#ffff00', label: '25.1-37.5 (ปานกลาง)' },{ color: '#ffc000', label: '37.6-75.0 (เริ่มมีผลกระทบฯ)' },{ color: '#ff0000', label: '> 75.0 (มีผลกระทบฯ)' }]},
  temp: { title: 'อุณหภูมิ (°C)', items: [{ color: '#3498db', label: '< 27 (เย็นสบาย)' },{ color: '#2ecc71', label: '27-32 (ปกติ)' },{ color: '#f1c40f', label: '33-35 (ร้อน)' },{ color: '#e67e22', label: '36-38 (ร้อนมาก)' },{ color: '#e74c3c', label: '> 38 (ร้อนจัด)' }]},
  heat: { title: 'ดัชนีความร้อน (°C)', items: [{ color: '#3b82f6', label: '< 27.0 (ปกติ)' },{ color: '#22c55e', label: '27.0-32.9 (เฝ้าระวัง)' },{ color: '#eab308', label: '33.0-41.9 (เตือนภัย)' },{ color: '#f97316', label: '42.0-51.9 (อันตราย)' },{ color: '#ef4444', label: '≥ 52.0 (อันตรายมาก)' }]},
  uv: { title: 'รังสี UV', items: [{ color: '#2ecc71', label: '0-2 (ต่ำ)' },{ color: '#f1c40f', label: '3-5 (ปานกลาง)' },{ color: '#e67e22', label: '6-7 (สูง)' },{ color: '#e74c3c', label: '8-10 (สูงมาก)' },{ color: '#9b59b6', label: '> 10 (อันตราย)' }]},
  rain: { title: 'โอกาสเกิดฝน (%)', items: [{ color: '#95a5a6', label: '0 (ไม่มีฝน)' },{ color: '#74b9ff', label: '1-30 (โอกาสต่ำ)' },{ color: '#0984e3', label: '31-60 (ปานกลาง)' },{ color: '#273c75', label: '61-80 (โอกาสสูง)' },{ color: '#192a56', label: '> 80 (ตกหนัก)' }]},
  wind: { title: 'ความเร็วลม (km/h)', items: [{ color: '#00b0f0', label: '0-10 (ลมอ่อน)' },{ color: '#2ecc71', label: '11-25 (ลมปานกลาง)' },{ color: '#f1c40f', label: '26-40 (ลมแรง)' },{ color: '#e67e22', label: '41-60 (ลมแรงมาก)' },{ color: '#e74c3c', label: '> 60 (พายุ)' }]}
};

const chartConfigs = {
  pm25: { key: 'pm25', name: 'PM2.5', unit: 'µg/m³', color: '#f59e0b', hasLY: false, type: 'area' },
  temp: { key: 'temp', keyLY: 'tempLY', name: 'อุณหภูมิสูงสุด', unit: '°C', color: '#ef4444', hasLY: true, type: 'line' },
  heat: { key: 'heat', keyLY: 'heatLY', name: 'Heat Index สูงสุด', unit: '°C', color: '#ea580c', hasLY: true, type: 'line' },
  uv:   { key: 'uv', keyLY: null, name: 'ดัชนีรังสี UV', unit: 'UV', color: '#a855f7', hasLY: false, type: 'area' },
  rain: { key: 'rain', keyLY: 'rainLY', name: 'ปริมาณฝนสะสม', unit: 'mm', color: '#3b82f6', hasLY: true, type: 'bar' },
  wind: { key: 'wind', keyLY: 'windLY', name: 'ความเร็วลมสูงสุด', unit: 'km/h', color: '#64748b', hasLY: true, type: 'line' },
};

// ==============================================================
// 2. Map Components
// ==============================================================
const createCustomMarker = (viewMode, value, extraData) => {
  let bg, textColor, displayValue;
  const fontSize = String(value).length > 2 ? '9px' : '11px';

  if (viewMode === 'pm25') { 
    bg = getPM25Color(value);
    textColor = (value > 25.0 && value <= 37.5) ? '#222' : '#fff';
    displayValue = (value === 0 || isNaN(value)) ? '-' : value;
  } else if (viewMode === 'temp') {
    const tempInfo = getTempColor(value);
    bg = tempInfo.bg;
    textColor = tempInfo.text;
    displayValue = (value === 0 || isNaN(value) || value === null) ? '-' : Math.round(value);
  } else if (viewMode === 'heat') {
    const heatInfo = getHeatIndexAlert(value);
    bg = value ? heatInfo.bar : '#cccccc';
    textColor = '#fff'; 
    displayValue = (value === 0 || isNaN(value) || value === null) ? '-' : Math.round(value);
  } else if (viewMode === 'uv') {
    const uvInfo = getUvColor(value);
    bg = value !== null ? uvInfo.bar : '#cccccc';
    textColor = (value > 2 && value <= 5) ? '#222' : '#fff'; 
    displayValue = (value === 0 || isNaN(value) || value === null) ? '-' : Math.round(value);
  } else if (viewMode === 'rain') {
    const rainInfo = getRainColor(value);
    bg = value !== null ? rainInfo.bar : '#cccccc';
    textColor = (value <= 30 && value > 0) ? '#222' : '#fff';
    displayValue = (value === null || isNaN(value)) ? '-' : `${Math.round(value)}%`;
  } else if (viewMode === 'wind') {
    const windInfo = getWindColor(value);
    bg = value !== null ? windInfo.bar : '#cccccc';
    textColor = (value > 10 && value <= 40) ? '#222' : '#fff';
    const dir = extraData?.windDir || 0;
    displayValue = value === null ? '-' : `<div style="display:flex; flex-direction:column; align-items:center; line-height:1;"><span style="transform: rotate(${dir}deg); font-size: 14px; margin-bottom: -1px; font-weight: bold;">↓</span><span style="font-size: 9px;">${Math.round(value)}</span></div>`;
  }

  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${bg}; width: 34px; height: 34px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.4); display: flex; justify-content: center; align-items: center; color: ${textColor}; font-weight: bold; font-size: ${fontSize}; font-family: 'Kanit', sans-serif; transition: all 0.3s ease;">${displayValue}</div>`,
    iconSize: [38, 38], iconAnchor: [19, 19] 
  });
};

function FitBounds({ stations, activeStation, selectedProvince }) {
  const map = useMap();
  useEffect(() => {
    if (activeStation) return; 
    if (stations && stations.length > 0) {
      if (!selectedProvince) {
        map.flyTo([13.5, 101.0], 6, { duration: 1.5 });
      } else {
        const bounds = L.latLngBounds(stations.map(s => [parseFloat(s.lat), parseFloat(s.long)]));
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 }); 
      }
    }
  }, [stations, map, activeStation, selectedProvince]);
  return null;
}

function FlyToActiveStation({ activeStation }) {
  const map = useMap();
  useEffect(() => {
    if (activeStation) {
      map.flyTo([parseFloat(activeStation.lat), parseFloat(activeStation.long)], 13, { duration: 1.5 });
    }
  }, [activeStation, map]);
  return null;
}

function RadarMapHandler({ showRadar }) {
  const map = useMap();
  useEffect(() => {
    if (showRadar) {
      if (map.getZoom() > 8) map.flyTo([13.5, 101.0], 6, { duration: 1.2 });
    }
  }, [showRadar, map]);
  return null;
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  var R = 6371; var dLat = deg2rad(lat2-lat1); var dLon = deg2rad(lon2-lon1); 
  var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
}
function deg2rad(deg) { return deg * (Math.PI/180) }
// ==============================================================
// 3. Main App Component
// ==============================================================
export default function App() {
  const [allStations, setAllStations] = useState([]);
  const [filteredStations, setFilteredStations] = useState([]);
  const [provinces, setProvinces] = useState([]);
  
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedStationId, setSelectedStationId] = useState('');
  
  const [viewMode, setViewMode] = useState('pm25'); 
  const [sortOrder, setSortOrder] = useState('desc'); 
  
  const [stationTemps, setStationTemps] = useState({});
  const [activeStation, setActiveStation] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [lastUpdateText, setLastUpdateText] = useState('');
  const [locating, setLocating] = useState(false);

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === 'true' ? true : false;
  });

  const [showRadar, setShowRadar] = useState(false);
  const [radarTime, setRadarTime] = useState(null);

  const [activeWeather, setActiveWeather] = useState(null); 
  const [activeForecast, setActiveForecast] = useState(null); 

  const [dashHistory, setDashHistory] = useState([]);
  const [dashForecast, setDashForecast] = useState([]);
  const [dashLoading, setDashLoading] = useState(false);
  const [dashTitle, setDashTitle] = useState('ภาพรวมทั้งประเทศ');

  // 🚀 สเตทสำหรับการสลับแท็บและการแจ้งเตือน
  const [currentPage, setCurrentPage] = useState('map'); // 'map' หรือ 'alerts'
  const [alertsData, setAlertsData] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsLocationName, setAlertsLocationName] = useState('');

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
    if(darkMode) document.body.classList.add('dark-theme');
    else document.body.classList.remove('dark-theme');
  }, [darkMode]);

  const cardRefs = useRef({});
  const markerRefs = useRef({});

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    if (mode === 'temp') setSortOrder('asc'); else setSortOrder('desc'); 
    setShowRadar(false);
  };

  const toggleRadar = async () => {
    if (!showRadar) {
      try {
        const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        const data = await res.json();
        setRadarTime(data.radar.past[data.radar.past.length - 1].time);
      } catch (err) { console.error("Error fetching radar:", err); }
    }
    setShowRadar(!showRadar);
  };

  const fetchAirQuality = async (isBackgroundLoad = false) => {
    if (!isBackgroundLoad) setLoading(true);
    try {
      const response = await fetch(`/api-air/services/getNewAQI_JSON.php?_t=${new Date().getTime()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Network error');
      const data = await response.json();
      
      if (data && data.stations) {
        setAllStations(data.stations);
        setProvinces([...new Set(data.stations.map(s => extractProvince(s.areaTH)))].sort((a, b) => a.localeCompare(b, 'th')));
        if (data.stations.length > 0) setLastUpdateText(`${data.stations[0].AQILast?.date || ''} เวลา ${data.stations[0].AQILast?.time || ''} น.`);
        fetchAdvancedTemperatures(data.stations);
      }
    } catch (err) { console.error("Fetch error:", err); } 
    finally { if (!isBackgroundLoad) setLoading(false); }
  };

  const fetchAdvancedTemperatures = async (stations) => {
    const newTemps = {};
    const chunkSize = 25; 
    for (let i = 0; i < stations.length; i += chunkSize) {
      const chunk = stations.slice(i, i + chunkSize);
      const lats = chunk.map(s => s.lat).join(',');
      const lons = chunk.map(s => s.long).join(',');
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,uv_index_max,precipitation_probability_max,wind_speed_10m_max&past_days=1&forecast_days=1&timezone=Asia%2FBangkok`;
        const res = await fetch(url);
        if (!res.ok) continue; 
        const weatherData = await res.json();
        const results = Array.isArray(weatherData) ? weatherData : [weatherData];
        results.forEach((r, idx) => {
          if (r && r.current && r.daily) {
            newTemps[chunk[idx].stationID] = {
              temp: r.current.temperature_2m, feelsLike: r.current.apparent_temperature, humidity: r.current.relative_humidity_2m, windSpeed: r.current.wind_speed_10m, windDir: r.current.wind_direction_10m, weatherCode: r.current.weather_code,
              tempMin: r.daily.temperature_2m_min[1], tempMax: r.daily.temperature_2m_max[1], heatMin: r.daily.apparent_temperature_min[1], heatMax: r.daily.apparent_temperature_max[1], tempYesterdayMax: r.daily.temperature_2m_max[0], uvMax: r.daily.uv_index_max ? (r.daily.uv_index_max[1] || 0) : 0, rainProb: r.daily.precipitation_probability_max[1], windMax: r.daily.wind_speed_10m_max[1] 
            };
          }
        });
      } catch (err) { console.error("Batch Temp fetch error", err); }
      await new Promise(resolve => setTimeout(resolve, 800)); 
    }
    setStationTemps(prev => ({...prev, ...newTemps}));
  };

  useEffect(() => {
    fetchAirQuality();
    const intervalId = setInterval(() => { fetchAirQuality(true); }, 1800000); 
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let result = [...allStations];
    if (selectedProvince) result = result.filter(s => extractProvince(s.areaTH) === selectedProvince);
    if (selectedStationId) result = result.filter(s => s.stationID === selectedStationId);
    result.sort((a, b) => {
      let valA, valB;
      if (viewMode === 'pm25') { valA = Number(a.AQILast?.PM25?.value); valB = Number(b.AQILast?.PM25?.value); }
      else if (viewMode === 'temp') { valA = stationTemps[a.stationID]?.temp; valB = stationTemps[b.stationID]?.temp; }
      else if (viewMode === 'heat') { valA = stationTemps[a.stationID]?.feelsLike; valB = stationTemps[b.stationID]?.feelsLike; }
      else if (viewMode === 'uv') { valA = stationTemps[a.stationID]?.uvMax; valB = stationTemps[b.stationID]?.uvMax; }
      else if (viewMode === 'rain') { valA = stationTemps[a.stationID]?.rainProb; valB = stationTemps[b.stationID]?.rainProb; }
      else if (viewMode === 'wind') { valA = stationTemps[a.stationID]?.windSpeed; valB = stationTemps[b.stationID]?.windSpeed; }

      const isValidA = valA !== undefined && valA !== null && !isNaN(valA) && (viewMode === 'rain' ? true : valA !== 0);
      const isValidB = valB !== undefined && valB !== null && !isNaN(valB) && (viewMode === 'rain' ? true : valB !== 0);
      if (!isValidA && isValidB) return 1; if (isValidA && !isValidB) return -1; if (!isValidA && !isValidB) return 0;
      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });
    setFilteredStations(result);
  }, [selectedProvince, selectedStationId, allStations, viewMode, sortOrder, stationTemps]);

  useEffect(() => {
    if (activeStation && currentPage === 'map') {
      if (cardRefs.current[activeStation.stationID]) cardRefs.current[activeStation.stationID].scrollIntoView({ behavior: 'smooth', block: 'center' });
      const marker = markerRefs.current[activeStation.stationID];
      if (marker && !showRadar) marker.openPopup(); 

      setActiveWeather(null); setActiveForecast(null);

      const fetchCardDetails = async () => {
        try {
          const urlWeather = `https://api.open-meteo.com/v1/forecast?latitude=${activeStation.lat}&longitude=${activeStation.long}&daily=temperature_2m_max,apparent_temperature_max,uv_index_max,precipitation_probability_max,wind_speed_10m_max&timezone=auto&forecast_days=7`;
          const resW = await fetch(urlWeather);
          const wData = await resW.json();
          let tempF = [], heatF = [], uvF = [], rainF = [], windF = [];
          if (wData.daily && wData.daily.time) {
            for (let i = 0; i < wData.daily.time.length; i++) {
              const tDate = new Date(wData.daily.time[i]);
              const days = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
              let timeLabel = i === 0 ? 'วันนี้' : i === 1 ? 'พรุ่งนี้' : days[tDate.getDay()];
              tempF.push({ time: timeLabel, val: Math.round(wData.daily.temperature_2m_max[i] || 0), colorInfo: getTempColor(wData.daily.temperature_2m_max[i]) });
              heatF.push({ time: timeLabel, val: Math.round(wData.daily.apparent_temperature_max[i] || 0), colorInfo: getHeatIndexAlert(wData.daily.apparent_temperature_max[i]) });
              uvF.push({ time: timeLabel, val: Math.round(wData.daily.uv_index_max[i] || 0), colorInfo: getUvColor(wData.daily.uv_index_max[i]) });
              rainF.push({ time: timeLabel, val: Math.round(wData.daily.precipitation_probability_max[i] || 0), colorInfo: getRainColor(wData.daily.precipitation_probability_max[i]) });
              windF.push({ time: timeLabel, val: Math.round(wData.daily.wind_speed_10m_max[i] || 0), colorInfo: getWindColor(wData.daily.wind_speed_10m_max[i]) });
            }
          }
          setActiveWeather({ tempForecast: tempF, heatForecast: heatF, uvForecast: uvF, rainForecast: rainF, windForecast: windF });

          const urlAqi = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${activeStation.lat}&longitude=${activeStation.long}&hourly=pm2_5&timezone=auto&forecast_days=4`;
          const resAqi = await fetch(urlAqi);
          const aData = await resAqi.json();
          
          if (aData && aData.hourly) {
            const nowTime = new Date().getTime();
            let startIndex = aData.hourly.time.findIndex(tStr => new Date(tStr).getTime() >= nowTime);
            if (startIndex === -1) startIndex = 0;
            const currentRealPm25 = Number(activeStation.AQILast?.PM25?.value);
            let offset = (!isNaN(currentRealPm25) && aData.hourly.pm2_5[startIndex] !== undefined) ? currentRealPm25 - aData.hourly.pm2_5[startIndex] : 0;
            const pmForecastList = [];
            for (let i = startIndex; i < aData.hourly.time.length && pmForecastList.length < 24; i += 3) {
              let calibratedVal = Math.max(0, (aData.hourly.pm2_5[i] || 0) + offset);
              pmForecastList.push({ time: `${new Date(aData.hourly.time[i]).getHours().toString().padStart(2, '0')}`, val: Math.round(calibratedVal), color: getPM25Color(calibratedVal) });
            }
            setActiveForecast(pmForecastList);
          }
        } catch (err) { console.error("Fetch card detail error", err); setActiveWeather('error'); }
      };
      fetchCardDetails();
    }
  }, [activeStation, showRadar, currentPage]);

  const fetchDashboardData = async (lat, lon, titleText) => {
    setDashTitle(titleText);
    setDashLoading(true);
    try {
      const today = new Date();
      const lyEnd = new Date(); lyEnd.setFullYear(today.getFullYear() - 1); lyEnd.setDate(lyEnd.getDate() - 1);
      const lyEndStr = lyEnd.toISOString().split('T')[0];
      const lyStart = new Date(lyEnd); lyStart.setDate(lyStart.getDate() - 13);
      const lyStartStr = lyStart.toISOString().split('T')[0];

      const urlWeather = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,apparent_temperature_max,precipitation_sum,wind_speed_10m_max,uv_index_max&past_days=14&forecast_days=7&timezone=Asia%2FBangkok`;
      const urlAqi = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm2_5&past_days=14&forecast_days=7&timezone=Asia%2FBangkok`;
      const urlArchive = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${lyStartStr}&end_date=${lyEndStr}&daily=temperature_2m_max,apparent_temperature_max,precipitation_sum,wind_speed_10m_max&timezone=Asia%2FBangkok`;

      const [resW, resA, resArc] = await Promise.all([fetch(urlWeather), fetch(urlAqi), fetch(urlArchive)]);
      const [dataW, dataA, dataArc] = await Promise.all([resW.json(), resA.json(), resArc.json()]);

      let histArray = [];
      let foreArray = [];

      if (dataW.daily && dataW.daily.time) {
        for (let i = 0; i < dataW.daily.time.length; i++) {
          let dateObj = new Date(dataW.daily.time[i]);
          let dateStr = dateObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
          let dayName = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'][dateObj.getDay()];

          let avgPm25 = 0; 
          if (dataA.hourly && dataA.hourly.pm2_5) {
            const startIdx = i * 24;
            const hours = dataA.hourly.pm2_5.slice(startIdx, startIdx + 24).filter(v => v !== null);
            avgPm25 = hours.length > 0 ? Math.round(hours.reduce((a, b) => a + b, 0) / hours.length) : 0;
          }

          let dayData = {
            date: dateStr,
            dayName: dayName,
            temp: dataW.daily.temperature_2m_max[i] || 0,
            heat: dataW.daily.apparent_temperature_max[i] || 0,
            rain: dataW.daily.precipitation_sum[i] || 0,
            wind: dataW.daily.wind_speed_10m_max[i] || 0,
            uv: dataW.daily.uv_index_max ? (dataW.daily.uv_index_max[i] || 0) : 0,
            pm25: avgPm25
          };

          if (i < 14) {
            dayData.tempLY = dataArc.daily?.temperature_2m_max ? (dataArc.daily.temperature_2m_max[i] || 0) : 0;
            dayData.heatLY = dataArc.daily?.apparent_temperature_max ? (dataArc.daily.apparent_temperature_max[i] || 0) : 0;
            dayData.rainLY = dataArc.daily?.precipitation_sum ? (dataArc.daily.precipitation_sum[i] || 0) : 0;
            dayData.windLY = dataArc.daily?.wind_speed_10m_max ? (dataArc.daily.wind_speed_10m_max[i] || 0) : 0;
            histArray.push(dayData);
          } else {
            if (i === 14) dayData.date = 'วันนี้';
            if (i === 15) dayData.date = 'พรุ่งนี้';
            foreArray.push(dayData);
          }
        }
      }
      setDashHistory(histArray);
      setDashForecast(foreArray);
    } catch (error) { console.error("Dashboard fetch error:", error); } 
    finally { setDashLoading(false); }
  };

  useEffect(() => {
    if (currentPage === 'map') {
      if (activeStation) {
        fetchDashboardData(activeStation.lat, activeStation.long, `สถานี${activeStation.nameTH} (${extractProvince(activeStation.areaTH)})`);
      } else if (selectedProvince) {
        const provStations = allStations.filter(s => extractProvince(s.areaTH) === selectedProvince);
        if (provStations.length > 0) {
          const avgLat = provStations.reduce((sum, s) => sum + parseFloat(s.lat), 0) / provStations.length;
          const avgLon = provStations.reduce((sum, s) => sum + parseFloat(s.long), 0) / provStations.length;
          fetchDashboardData(avgLat, avgLon, `ค่าเฉลี่ยรวม จังหวัด${selectedProvince}`);
        }
      } else {
        if (allStations.length > 0) {
          const avgLat = allStations.reduce((sum, s) => sum + parseFloat(s.lat), 0) / allStations.length;
          const avgLon = allStations.reduce((sum, s) => sum + parseFloat(s.long), 0) / allStations.length;
          fetchDashboardData(avgLat, avgLon, 'ภาพรวมทั้งประเทศ');
        }
      }
    }
  }, [activeStation, selectedProvince, allStations, currentPage]);

  const handleReset = () => { setSelectedProvince(''); setSelectedStationId(''); setActiveStation(null); setShowRadar(false); setCurrentPage('map'); };

  const handleFindNearest = () => {
    if (!navigator.geolocation) { alert('เบราว์เซอร์ไม่รองรับการค้นหาตำแหน่ง'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition((position) => {
        let nearest = null; let minDistance = Infinity;
        allStations.forEach(station => {
          const d = getDistanceFromLatLonInKm(position.coords.latitude, position.coords.longitude, parseFloat(station.lat), parseFloat(station.long));
          if (d < minDistance) { minDistance = d; nearest = station; }
        });
        if (nearest) { setSelectedProvince(extractProvince(nearest.areaTH)); setSelectedStationId(nearest.stationID); setActiveStation(nearest); setShowRadar(false); setCurrentPage('map'); }
        setLocating(false);
      }, () => { alert('ไม่สามารถดึงตำแหน่งได้'); setLocating(false); }
    );
  };

  // 🚀 ฟังก์ชันประมวลผลข้อมูลสำหรับหน้า "แจ้งเตือน (Alerts)" ใหม่ล่าสุด (มีฝน 3 ชม.)
  const fetchAlertsData = async (lat, lon, locName) => {
    setAlertsLoading(true);
    setAlertsLocationName(locName);
    try {
      const urlW = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,uv_index&forecast_days=2&timezone=Asia%2FBangkok`;
      const urlA = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm2_5&forecast_days=2&timezone=Asia%2FBangkok`;
      
      const [resW, resA] = await Promise.all([fetch(urlW), fetch(urlA)]);
      const [dataW, dataA] = await Promise.all([resW.json(), resA.json()]);

      let generatedAlerts = [];
      const nowIdx = new Date().getHours(); 
      const formatTime = (iso) => { const d = new Date(iso); return `${d.getHours()}:00 น.`; };

      // 🌧️ 1. วิเคราะห์ฝนล่วงหน้า 3 ชั่วโมง (Nowcast)
      let rain3hProb = 0; let rain3hVol = 0; let rain3hTime = '';
      if (dataW.hourly && dataW.hourly.time) {
        dataW.hourly.time.slice(nowIdx, nowIdx + 3).forEach((t, i) => {
          const idx = nowIdx + i;
          if (dataW.hourly.precipitation_probability[idx] > rain3hProb) { 
            rain3hProb = dataW.hourly.precipitation_probability[idx]; 
            rain3hVol = dataW.hourly.precipitation[idx]; 
            rain3hTime = t; 
          }
        });
      }

      // ☀️ 2. วิเคราะห์อากาศอื่นๆ ใน 24 ชั่วโมงข้างหน้า
      let maxHeat = 0; let heatTime = '';
      let maxUv = 0; let uvTime = '';
      let maxPm = 0; let pmTime = '';
      if (dataW.hourly && dataW.hourly.time) {
        dataW.hourly.time.slice(nowIdx, nowIdx + 24).forEach((t, i) => {
          const idx = nowIdx + i;
          if (dataW.hourly.apparent_temperature[idx] > maxHeat) { maxHeat = dataW.hourly.apparent_temperature[idx]; heatTime = t; }
          if (dataW.hourly.uv_index[idx] > maxUv) { maxUv = dataW.hourly.uv_index[idx]; uvTime = t; }
          if (dataA.hourly && dataA.hourly.pm2_5 && dataA.hourly.pm2_5[idx] > maxPm) { maxPm = dataA.hourly.pm2_5[idx]; pmTime = t; }
        });
      }

      // 🛠️ 3. จัดเรียงการ์ดแจ้งเตือนลงใน Array
      
      // การ์ดที่ 1: สถานการณ์ฝน (มีฝน หรือ ไม่มีฝน) แสดงเป็นอันดับแรกเสมอ
      if (rain3hProb >= 30 || rain3hVol > 0.1) {
        generatedAlerts.push({ type: 'rain', icon: '🌧️', color: '#3b82f6', title: 'เตรียมพกร่ม! (ฝนใน 3 ชม.)', desc: `พบกลุ่มฝนบริเวณของคุณ โอกาสตก ${rain3hProb}% (ปริมาณคาดการณ์ ${rain3hVol.toFixed(1)} mm.) คาดว่าจะตกช่วงเวลา ${formatTime(rain3hTime)}` });
      } else {
        generatedAlerts.push({ type: 'norain', icon: '🌤️', color: '#10b981', title: 'ไม่มีฝน (ใน 3 ชม. ข้างหน้า)', desc: `โอกาสเกิดฝนต่ำมาก (${rain3hProb}%) ท้องฟ้าโปร่ง สามารถทำกิจกรรมกลางแจ้งหรือเดินทางได้ตามปกติ` });
      }

      // การ์ดอื่นๆ (แสดงเฉพาะเมื่อมีความเสี่ยง)
      if (maxHeat >= 33) {
        let levelText = maxHeat >= 42 ? 'อันตราย!' : 'เตือนภัย';
        let act = maxHeat >= 42 ? 'หลีกเลี่ยงกิจกรรมกลางแจ้งเด็ดขาด' : 'ลดระยะเวลากิจกรรมกลางแจ้ง';
        generatedAlerts.push({ type: 'heat', icon: '🥵', color: '#ea580c', title: `อากาศร้อน${levelText}`, desc: `ดัชนีความร้อนสูงสุดคาดว่าจะแตะ ${maxHeat.toFixed(1)}°C (ช่วงเวลา: ${formatTime(heatTime)}) ${act} และดื่มน้ำให้เพียงพอ` });
      }
      if (maxPm >= 37.5) {
        let pmAct = maxPm >= 75 ? 'งดกิจกรรมกลางแจ้ง' : 'ควรสวมหน้ากาก N95';
        generatedAlerts.push({ type: 'pm25', icon: '😷', color: '#f59e0b', title: 'เฝ้าระวังฝุ่น PM2.5', desc: `ค่าฝุ่นมีแนวโน้มเพิ่มสูงขึ้นแตะ ${maxPm.toFixed(1)} µg/m³ (ช่วงเวลา: ${formatTime(pmTime)}) ${pmAct} หากออกนอกอาคาร` });
      }
      if (maxUv >= 8) {
        generatedAlerts.push({ type: 'uv', icon: '☀️', color: '#a855f7', title: 'รังสี UV สูงมาก', desc: `ดัชนีรังสี UV คาดว่าจะสูงถึงระดับ ${maxUv} (ช่วงเวลา: ${formatTime(uvTime)}) ระวังผิวไหม้ ควรทาครีมกันแดดและกางร่ม` });
      }

      setAlertsData(generatedAlerts);
    } catch (e) { console.error("Alerts error:", e); }
    finally { setAlertsLoading(false); }
  };

  const handleScanLocation = () => {
    if (!navigator.geolocation) { alert('เบราว์เซอร์ไม่รองรับการค้นหาตำแหน่ง'); return; }
    navigator.geolocation.getCurrentPosition((position) => {
        fetchAlertsData(position.coords.latitude, position.coords.longitude, '📍 พิกัดปัจจุบันของคุณ');
    }, () => { alert('ไม่สามารถดึงพิกัดได้ กรุณาอนุญาตการเข้าถึงตำแหน่ง'); });
  };

  useEffect(() => {
    if (currentPage === 'alerts' && alertsLocationName === '') {
      if (activeStation) fetchAlertsData(activeStation.lat, activeStation.long, `สถานี${activeStation.nameTH}`);
      else if (allStations.length > 0) fetchAlertsData(13.75, 100.5, 'กรุงเทพมหานคร (ค่าเริ่มต้น)');
    }
  }, [currentPage, activeStation, allStations, alertsLocationName]);


  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '1.5rem', color: '#555' }}>กำลังโหลดข้อมูลสถานีทั่วประเทศ...</div>;

  const isPm25Mode = viewMode === 'pm25'; const isTempMode = viewMode === 'temp'; const isHeatMode = viewMode === 'heat';
  const isUvMode = viewMode === 'uv'; const isRainMode = viewMode === 'rain'; const isWindMode = viewMode === 'wind';
  
  const themeBg = darkMode ? '#0f172a' : '#f1f5f9'; const cardBg = darkMode ? '#1e293b' : '#ffffff';
  const textColor = darkMode ? '#f8fafc' : '#1e293b'; const subTextColor = darkMode ? '#94a3b8' : '#64748b';
  const borderColor = darkMode ? '#334155' : '#e2e8f0';

  const activeChart = chartConfigs[viewMode] || chartConfigs['pm25']; 

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', backgroundColor: themeBg, fontFamily: "'Kanit', sans-serif", transition: 'background-color 0.3s', overflowY: 'auto', overflowX: 'hidden' }}>
      
      {/* ======================= HEADER ======================= */}
      <header style={{ background: darkMode ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' : 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)', color: '#fff', padding: '12px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', zIndex: 1000, flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ fontSize: '1.8rem', background: '#fff', borderRadius: '50%', padding: '5px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.15)' }}>{darkMode ? '🌙' : '🌤️'}</div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', textShadow: '1px 1px 2px rgba(0,0,0,0.2)', whiteSpace: 'nowrap' }}>Thailand Environment Dashboard</h1>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#cbd5e1', whiteSpace: 'nowrap' }}>ระบบเฝ้าระวังคุณภาพอากาศและสภาพอากาศ</p>
            </div>
          </div>
          
          {/* ซ่อนตัวกรองเมื่ออยู่ในหน้า Alerts เพื่อความสะอาดตา */}
          {currentPage === 'map' && (
            <>
              <div style={{ width: '1px', height: '35px', backgroundColor: 'rgba(255,255,255,0.3)', display: window.innerWidth < 1024 ? 'none' : 'block' }}></div>
              <div className="hide-scrollbar" style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'rgba(255,255,255,0.15)', padding: '6px 15px', borderRadius: '30px', backdropFilter: 'blur(5px)', border: '1px solid rgba(255,255,255,0.3)', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.9rem' }}>🗺️</label>
                  <select value={selectedProvince} onChange={(e) => { setSelectedProvince(e.target.value); setSelectedStationId(''); setActiveStation(null); setShowRadar(false); }} style={{ padding: '8px 12px', borderRadius: '20px', border: 'none', backgroundColor: '#ffffff', color: '#1e293b', fontSize: '0.95rem', minWidth: '150px', outline: 'none', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                    <option value="">ทุกจังหวัด</option>{provinces.map(prov => (<option key={prov} value={prov}>{prov}</option>))}
                  </select>
                </div>
                <div style={{ width: '2px', height: '20px', backgroundColor: 'rgba(255,255,255,0.3)', margin: '0 5px' }}></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.9rem' }}>📍</label>
                  <select value={selectedStationId} onChange={(e) => { setSelectedStationId(e.target.value); const stat = allStations.find(s => s.stationID === e.target.value); if(stat) {setActiveStation(stat); setShowRadar(false);} }} style={{ padding: '8px 12px', borderRadius: '20px', border: 'none', backgroundColor: '#ffffff', color: '#1e293b', fontSize: '0.95rem', minWidth: '220px', outline: 'none', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                    <option value="">-- เลือกสถานี --</option>
                    {filteredStations.slice().sort((a, b) => a.nameTH.localeCompare(b.nameTH, 'th')).map(station => (<option key={station.stationID} value={station.stationID}>{station.nameTH}</option>))}
                  </select>
                </div>
                <button onClick={handleReset} style={{ padding: '8px 16px', backgroundColor: '#ffffff', color: '#0ea5e9', border: 'none', borderRadius: '20px', fontSize: '0.95rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', marginLeft: '5px' }}>🏠 หน้าแรก</button>
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '25px', padding: '4px' }}>
            <button onClick={() => setCurrentPage('map')} style={{ padding: '6px 16px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem', backgroundColor: currentPage === 'map' ? '#fff' : 'transparent', color: currentPage === 'map' ? '#0ea5e9' : '#fff', transition: '0.3s', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🗺️ แผนที่ & สถิติ
            </button>
            <button onClick={() => setCurrentPage('alerts')} style={{ padding: '6px 16px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem', backgroundColor: currentPage === 'alerts' ? '#fff' : 'transparent', color: currentPage === 'alerts' ? '#0ea5e9' : '#fff', transition: '0.3s', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🔔 แจ้งเตือนภัย
            </button>
          </div>
          
          <button onClick={() => setDarkMode(!darkMode)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.3s' }}>{darkMode ? '☀️' : '🌙'}</button>
        </div>
      </header>

      {/* ======================= MAIN CONTENT (DYNAMIC BASED ON TAB) ======================= */}
      {currentPage === 'map' ? (
        // 🌍 แสดงหน้าแผนที่และสถิติ
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: '15px', flexDirection: window.innerWidth < 768 ? 'column' : 'row', padding: '15px' }}>
            
            {/* MAP */}
            <div style={{ flex: 7, borderRadius: '12px', overflow: 'hidden', position: 'relative', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: `1px solid ${borderColor}`, height: window.innerWidth < 768 ? '60vh' : 'calc(100vh - 120px)' }}>
              <div className="hide-scrollbar" style={{ position: 'absolute', top: '15px', right: '15px', zIndex: 500, background: darkMode ? 'rgba(30,41,59,0.9)' : 'rgba(255,255,255,0.9)', padding: '5px 10px', borderRadius: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '8px', backdropFilter: 'blur(4px)', maxWidth: '85%', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                <button onClick={() => handleViewModeChange('pm25')} style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem', backgroundColor: isPm25Mode ? '#0ea5e9' : 'transparent', color: isPm25Mode ? '#fff' : subTextColor }}>☁️ PM2.5</button>
                <button onClick={() => handleViewModeChange('temp')} style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem', backgroundColor: isTempMode ? '#22c55e' : 'transparent', color: isTempMode ? '#fff' : subTextColor }}>🌡️ อุณหภูมิ</button>
                <button onClick={() => handleViewModeChange('heat')} style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem', backgroundColor: isHeatMode ? '#f97316' : 'transparent', color: isHeatMode ? '#fff' : subTextColor }}>🥵 Heat Index</button>
                <button onClick={() => handleViewModeChange('uv')} style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem', backgroundColor: isUvMode ? '#a855f7' : 'transparent', color: isUvMode ? '#fff' : subTextColor }}>☀️ UV</button>
                <button onClick={() => handleViewModeChange('rain')} style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem', backgroundColor: isRainMode ? '#3b82f6' : 'transparent', color: isRainMode ? '#fff' : subTextColor }}>🌧️ ฝน</button>
                <button onClick={() => handleViewModeChange('wind')} style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem', backgroundColor: isWindMode ? '#475569' : 'transparent', color: isWindMode ? '#fff' : subTextColor }}>🌬️ ลม</button>
                <div style={{ width: '2px', height: '20px', backgroundColor: borderColor, margin: '0 4px' }}></div>
                <button onClick={toggleRadar} style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem', backgroundColor: showRadar ? '#ef4444' : 'transparent', color: showRadar ? '#fff' : subTextColor, boxShadow: showRadar ? '0 2px 8px rgba(239,68,68,0.4)' : 'none', transition: '0.2s' }}>{showRadar ? '📡 ปิดเรดาร์' : '📡 เรดาร์ฝน'}</button>
              </div>

              <button onClick={handleFindNearest} disabled={locating} title="ค้นหาสถานีใกล้ฉัน" style={{ position: 'absolute', bottom: '25px', right: '15px', zIndex: 500, width: '44px', height: '44px', borderRadius: '50%', backgroundColor: cardBg, color: textColor, border: `1px solid ${borderColor}`, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem', cursor: locating ? 'wait' : 'pointer', padding: 0 }}>{locating ? '⏳' : '🎯'}</button>

              {!showRadar && (
                <div style={{ position: 'absolute', bottom: '25px', left: '60px', zIndex: 500, background: darkMode ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.95)', padding: '12px', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', backdropFilter: 'blur(4px)', border: `1px solid ${borderColor}` }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: textColor, fontWeight: 'bold' }}>{legendData[viewMode].title}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {legendData[viewMode].items.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ width: '14px', height: '14px', backgroundColor: item.color, borderRadius: '50%', border: '1px solid rgba(0,0,0,0.1)' }}></span><span style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: '500' }}>{item.label}</span></div>
                    ))}
                  </div>
                </div>
              )}

              <MapContainer center={[13.5, 101.0]} zoom={6} style={{ height: '100%', width: '100%', backgroundColor: darkMode ? '#1a202c' : '#bae6fd', zIndex: 1 }}>
                
                <LayersControl position="bottomleft">
                  <LayersControl.BaseLayer checked name="🗺️ แผนที่ปกติ (Default)">
                    <TileLayer attribution='&copy; OpenStreetMap' url={darkMode ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"} />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name="🛰️ ภาพดาวเทียม (Satellite)">
                    <TileLayer attribution='&copy; Esri' url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                  </LayersControl.BaseLayer>
                </LayersControl>

                {showRadar && radarTime && <TileLayer url={`https://tilecache.rainviewer.com/v2/radar/${radarTime}/256/{z}/{x}/{y}/2/1_1.png`} opacity={0.65} attribution='&copy; RainViewer' zIndex={10} maxNativeZoom={12} />}
                <FitBounds stations={filteredStations} activeStation={activeStation} selectedProvince={selectedProvince} />
                <FlyToActiveStation activeStation={activeStation} />
                <RadarMapHandler showRadar={showRadar} />
                {!showRadar && filteredStations.map((station) => {
                  const pm25Value = Number(station.AQILast?.PM25?.value); const tObj = stationTemps[station.stationID];
                  let markerVal = null;
                  if (isPm25Mode) markerVal = pm25Value; else if (isTempMode) markerVal = tObj?.temp; else if (isHeatMode) markerVal = tObj?.feelsLike; else if (isUvMode) markerVal = tObj?.uvMax; else if (isRainMode) markerVal = tObj?.rainProb; else if (isWindMode) markerVal = tObj?.windSpeed;
                  return (
                    <Marker key={station.stationID} position={[parseFloat(station.lat), parseFloat(station.long)]} icon={createCustomMarker(viewMode, markerVal, tObj)} ref={(ref) => markerRefs.current[station.stationID] = ref} eventHandlers={{ click: () => setActiveStation(station) }}>
                      <Popup minWidth={260}>
                        <div style={{ textAlign: 'center', fontFamily: 'Kanit', color: '#1e293b' }}>
                          <strong style={{ fontSize: '1.1rem' }}>{station.nameTH}</strong><br/>
                          <div style={{ margin: '10px 0', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                            <span style={{ fontSize: '1.2rem', color: getPM25Color(pm25Value) === '#ffff00' ? '#d4b500' : getPM25Color(pm25Value), fontWeight: 'bold' }}>PM2.5: {isNaN(pm25Value) ? '-' : pm25Value} µg/m³</span>
                            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>(AQI: <span style={{color: getAqiDetails(station.AQILast?.AQI?.aqi).color === '#ffff00' ? '#d4b500' : getAqiDetails(station.AQILast?.AQI?.aqi).color, fontWeight: 'bold'}}>{station.AQILast?.AQI?.aqi || '-'}</span>)</div>
                          </div>
                          {tObj && (
                            <div style={{ marginTop: '10px', padding: '12px', backgroundColor: '#f1f5f9', borderRadius: '8px', color: '#334155', fontWeight: 'bold', fontSize: '0.85rem' }}>
                              <div style={{ textAlign: 'center', marginBottom: '8px', fontSize: '1.1rem', color: '#1e293b' }}>{getWeatherIcon(tObj.weatherCode).icon} <span style={{fontSize: '0.95rem'}}>{getWeatherIcon(tObj.weatherCode).text}</span></div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', textAlign: 'left' }}>
                                  <span>🌡️ {tObj.temp?.toFixed(1) || '-'} °C</span><span>🥵 รู้สึก: {tObj.feelsLike?.toFixed(1) || '-'} °C</span>
                                  <span style={{color: '#0ea5e9'}}>💧 ชื้น: {tObj.humidity || '-'}%</span><span style={{color: '#0ea5e9'}}>🌧️ ฝน: {tObj.rainProb || '0'}%</span>
                                  <span style={{color: '#a855f7'}}>☀️ UV: {tObj.uvMax || '-'}</span><span style={{color: '#34495e', display: 'flex', alignItems: 'center', gap: '2px'}}>🌬️ ลม: {tObj.windSpeed || '-'} <span style={{ transform: `rotate(${tObj.windDir}deg)`, display: 'inline-block' }}>↓</span></span>
                              </div>
                            </div>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>

            {/* SIDEBAR RIGHT LIST */}
            <div style={{ flex: 3, minWidth: window.innerWidth < 768 ? '100%' : '380px', maxWidth: window.innerWidth < 768 ? '100%' : '450px', backgroundColor: cardBg, borderRadius: '12px', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: `1px solid ${borderColor}`, height: window.innerWidth < 768 ? '500px' : 'calc(100vh - 120px)' }}>
              <div style={{ padding: '15px 20px', background: darkMode ? '#0f172a' : (isPm25Mode ? '#f0f9ff' : isTempMode ? '#f0fdf4' : isUvMode ? '#faf5ff' : isRainMode ? '#eff6ff' : isWindMode ? '#f8fafc' : '#fff7ed'), borderBottom: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1rem', color: textColor, margin: 0, fontWeight: 'bold' }}>{activeChart.name} <span style={{fontSize: '0.85rem', fontWeight: 'normal', color: subTextColor}}>({filteredStations.length} จุด)</span></h2>
                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={{ padding: '4px 8px', borderRadius: '6px', border: `1px solid ${borderColor}`, fontSize: '0.8rem', cursor: 'pointer', outline: 'none', backgroundColor: cardBg, fontWeight: 'bold', color: textColor }}>
                  <option value="desc">⬇️ มากไปน้อย</option><option value="asc">⬆️ น้อยไปมาก</option>
                </select>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '15px', scrollBehavior: 'smooth' }}>
                {filteredStations.map((station) => {
                  const pm25Value = Number(station.AQILast?.PM25?.value); const aqiValue = station.AQILast?.AQI?.aqi || '--'; const aqiInfo = getAqiDetails(station.AQILast?.AQI?.aqi);
                  const isActive = activeStation?.stationID === station.stationID; const tObj = stationTemps[station.stationID];
                  let displayMainVal = '-', unitLabel = '', boxBgColor = '#ccc';
                  
                  if (isPm25Mode) { displayMainVal = isNaN(pm25Value) ? '-' : pm25Value; unitLabel = 'µg/m³'; boxBgColor = getPM25Color(pm25Value); }
                  else if (isTempMode) { displayMainVal = tObj?.temp !== undefined ? tObj.temp.toFixed(1) : '-'; unitLabel = '°C'; boxBgColor = getTempColor(tObj?.temp).bar; }
                  else if (isHeatMode) { displayMainVal = tObj?.feelsLike !== undefined ? tObj.feelsLike.toFixed(1) : '-'; unitLabel = '°C'; boxBgColor = tObj ? getHeatIndexAlert(tObj.feelsLike).bar : '#ccc'; }
                  else if (isUvMode) { displayMainVal = tObj?.uvMax !== undefined ? tObj.uvMax : '-'; unitLabel = 'UV'; boxBgColor = tObj ? getUvColor(tObj.uvMax).bar : '#ccc'; }
                  else if (isRainMode) { displayMainVal = tObj?.rainProb !== undefined ? `${tObj.rainProb}%` : '-'; unitLabel = 'ตก'; boxBgColor = tObj ? getRainColor(tObj.rainProb).bar : '#ccc'; }
                  else if (isWindMode) { displayMainVal = tObj?.windSpeed !== undefined ? tObj.windSpeed : '-'; unitLabel = 'km/h'; boxBgColor = tObj ? getWindColor(tObj.windSpeed).bar : '#ccc'; }
                  
                  let healthAdvice = null;
                  if (isPm25Mode) healthAdvice = getPM25HealthAdvice(pm25Value); else if (isHeatMode) healthAdvice = getHeatHealthAdvice(tObj?.feelsLike); else if (isUvMode) healthAdvice = getUvHealthAdvice(tObj?.uvMax);

                  return (
                    <div key={station.stationID} ref={el => cardRefs.current[station.stationID] = el} onClick={() => { setActiveStation(station); setShowRadar(false); }} style={{ display: 'flex', flexDirection: 'column', background: isActive ? (darkMode ? '#334155' : '#f8fafc') : cardBg, border: isActive ? '1px solid #3b82f6' : `1px solid ${borderColor}`, borderLeft: `6px solid ${boxBgColor}`, borderRadius: '10px', padding: '15px', marginBottom: '15px', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: isActive ? '0 4px 10px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                        <div style={{ flex: 1, paddingRight: '10px' }}>
                          <h4 style={{ fontSize: '1rem', color: textColor, marginBottom: '2px', fontWeight: 'bold' }}>{station.nameTH}</h4>
                          <p style={{ fontSize: '0.8rem', color: '#3b82f6', marginBottom: '8px', fontWeight: 'bold', margin: 0 }}>{extractProvince(station.areaTH)}</p>
                          <div style={{ minHeight: '35px', display: 'flex', alignItems: 'center', marginTop: '10px' }}>
                            {isPm25Mode ? (
                              <div style={{ display: 'flex', gap: '15px', fontSize: '0.85rem', color: subTextColor }}><span>AQI: <strong style={{ color: getAqiDetails(aqiValue).color === '#ffff00' ? '#d4b500' : getAqiDetails(aqiValue).color }}>{aqiValue}</strong></span><span>ผลกระทบ: <strong style={{ color: aqiInfo.color === '#ffff00' ? '#d4b500' : aqiInfo.color }}>{aqiInfo.text}</strong></span></div>
                            ) : (
                              <div style={{ width: '100%' }}>
                                {tObj ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: subTextColor, fontWeight: 'bold' }}>
                                    {isUvMode ? (<span style={{ color: getUvColor(tObj?.uvMax).bar }}>ระดับ: {getUvColor(tObj?.uvMax).label}</span>) 
                                    : isRainMode ? (<><span style={{color: '#0ea5e9'}}>💧 ชื้น: {tObj.humidity}%</span><span style={{color: darkMode ? '#475569' : '#cbd5e1'}}>|</span><span style={{color: '#0ea5e9'}}>{getRainColor(tObj.rainProb).label}</span></>) 
                                    : isHeatMode ? (<><span><span style={{color: '#3b82f6'}}>●</span>ต่ำ {tObj.heatMin?.toFixed(1)}°</span><span style={{color: darkMode ? '#475569' : '#cbd5e1'}}>|</span><span><span style={{color: '#ef4444'}}>●</span>สูง {tObj.heatMax?.toFixed(1)}°</span></>) 
                                    : isWindMode ? (<><span style={{color: subTextColor}}>ลม: <span style={{ transform: `rotate(${tObj.windDir}deg)`, display: 'inline-block' }}>↓</span></span><span style={{color: darkMode ? '#475569' : '#cbd5e1'}}>|</span><span style={{color: subTextColor}}>แรงสุด: {tObj.windMax} km/h</span></>) 
                                    : (<><span><span style={{color: '#3b82f6'}}>●</span>ต่ำ {tObj.tempMin?.toFixed(1)}°</span><span style={{color: darkMode ? '#475569' : '#cbd5e1'}}>|</span><span><span style={{color: '#ef4444'}}>●</span>สูง {tObj.tempMax?.toFixed(1)}°</span></>)}
                                  </div>
                                ) : (<span style={{ fontSize: '0.8rem', color: subTextColor }}>ไม่มีข้อมูล</span>)}
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ backgroundColor: boxBgColor, color: (isPm25Mode && pm25Value > 25.0 && pm25Value <= 37.5) || (isUvMode && tObj?.uvMax <= 5) ? '#1e293b' : '#fff', minWidth: '60px', height: '60px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', flexShrink: 0 }}>
                          <span style={{ fontSize: '1.3rem', fontWeight: 'bold', lineHeight: 1 }}>{displayMainVal}</span><span style={{ fontSize: '0.65rem', opacity: 0.9, marginTop: '2px', fontWeight: 'bold' }}>{unitLabel}</span>
                        </div>
                      </div>
                      
                      {healthAdvice && (isActive || healthAdvice.icon === "🚨" || healthAdvice.icon === "🚑" || healthAdvice.icon === "⛔") && (
                        <div style={{ marginTop: '12px', padding: '10px', backgroundColor: darkMode ? '#334155' : '#f8fafc', borderRadius: '8px', border: `1px dashed ${boxBgColor}`, display: 'flex', gap: '8px', alignItems: 'flex-start' }}><span style={{ fontSize: '1.2rem' }}>{healthAdvice.icon}</span><span style={{ fontSize: '0.8rem', color: textColor, lineHeight: 1.4 }}>{healthAdvice.text}</span></div>
                      )}

                      {/* 🚀 กราฟแท่งจิ๋วพยากรณ์ล่วงหน้า (ในการ์ด) */}
                      {isActive && (
                        <div style={{ borderTop: `1px solid ${borderColor}`, marginTop: '15px', paddingTop: '15px' }}>
                          {isPm25Mode ? (
                            <div>
                              <h5 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: subTextColor, marginBottom: '5px' }}>📈 แนวโน้ม PM2.5 ล่วงหน้า 72 ชม.</h5>
                              {activeForecast === null ? <p style={{ fontSize: '0.8rem', color: subTextColor, textAlign: 'center' }}>กำลังโหลด...</p> : (
                                <div style={{ height: '120px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '2px', paddingTop: '10px' }}>
                                  {activeForecast.map((data, index) => {
                                    const heightPercent = Math.max((data.val / (Math.max(...activeForecast.map(d => d.val)) + 15)) * 100, 5); 
                                    return (
                                      <div key={index} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }} title={`${data.time} น. = ${data.val} µg/m³`}>
                                        <span style={{ fontSize: '8.5px', color: subTextColor, marginBottom: '3px', fontWeight: 'bold' }}>{data.val}</span>
                                        <div style={{ width: '100%', height: `${heightPercent}%`, backgroundColor: data.color, borderRadius: '2px 2px 0 0', opacity: 0.9 }}></div>
                                        <div style={{ fontSize: '8px', color: subTextColor, marginTop: '4px', height: '12px' }}>{index % 3 === 0 ? data.time : ''}</div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              {activeWeather === null ? <p style={{ fontSize: '0.8rem', color: subTextColor, textAlign: 'center' }}>กำลังโหลดข้อมูลพยากรณ์...</p> : (
                                <>
                                  <h5 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: subTextColor, marginBottom: '5px' }}>
                                    📈 คาดการณ์{isUvMode ? ' UV สูงสุด' : isRainMode ? 'โอกาสเกิดฝน' : isHeatMode ? ' Heat Index สูงสุด' : isWindMode ? 'ความเร็วลมสูงสุด' : 'อุณหภูมิสูงสุด'} 7 วัน
                                  </h5>
                                  <div style={{ height: '110px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '6px', paddingTop: '10px' }}>
                                    {(() => {
                                      let forecastData = isHeatMode ? activeWeather.heatForecast : isUvMode ? activeWeather.uvForecast : isRainMode ? activeWeather.rainForecast : isWindMode ? activeWeather.windForecast : activeWeather.tempForecast;
                                      if(!forecastData) return null;
                                      const maxVal = Math.max(...forecastData.map(d => d.val)) + (isRainMode ? 10 : 5);
                                      return forecastData.map((data, index) => {
                                        const heightPercent = Math.max((data.val / maxVal) * 100, 5); 
                                        return (
                                          <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', height: '100%' }}>
                                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: data.colorInfo.color || subTextColor, marginBottom: '4px' }}>
                                              {data.val}{isRainMode ? '%' : isTempMode || isHeatMode ? '°' : ''}
                                            </span>
                                            <div title={`${data.time}: ${data.val}`} style={{ width: '100%', height: `${heightPercent}%`, backgroundColor: data.colorInfo.bar, borderRadius: '4px 4px 0 0' }}></div>
                                            <div style={{ fontSize: '11px', color: index <= 1 ? '#0ea5e9' : subTextColor, marginTop: '6px', fontWeight: index <= 1 ? 'bold' : 'normal' }}>
                                              {data.time}
                                            </div>
                                          </div>
                                        );
                                      });
                                    })()}
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ======================= DYNAMIC DASHBOARD BOTTOM ======================= */}
          <div style={{ padding: '15px', paddingTop: '5px', paddingBottom: '30px' }}>
            <div style={{ backgroundColor: cardBg, borderRadius: '12px', padding: window.innerWidth < 768 ? '15px' : '25px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: `1px solid ${borderColor}` }}>
              
              <div style={{ marginBottom: '20px', borderBottom: `1px solid ${borderColor}`, paddingBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h2 style={{ fontSize: '1.4rem', color: textColor, margin: '0 0 5px 0', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    📊 ข้อมูลเชิงลึก: {activeChart.name}
                  </h2>
                  <p style={{ margin: 0, color: subTextColor, fontSize: '0.9rem' }}>
                    วิเคราะห์ข้อมูลของพื้นที่: <strong style={{color: '#0ea5e9', fontSize: '1rem'}}>{dashTitle}</strong> 
                  </p>
                </div>
              </div>

              {dashLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '350px', color: subTextColor }}>
                  <span style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</span>กำลังประมวลผลข้อมูลจากดาวเทียม...
                </div>
              ) : dashHistory.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 1024 ? '1fr' : '1fr 1fr', gap: '20px' }}>
                  
                  {/* กราฟซ้าย: ข้อมูลอดีต 14 วัน */}
                  <div style={{ backgroundColor: darkMode ? '#0f172a' : '#f8fafc', padding: '20px', borderRadius: '12px', border: `1px solid ${borderColor}` }}>
                    <h3 style={{ fontSize: '1.1rem', color: textColor, marginBottom: '15px', textAlign: 'center' }}>
                      ⏳ สถิติย้อนหลัง 14 วัน {activeChart.hasLY ? '(ปีนี้ vs ปีที่แล้ว)' : ''}
                    </h3>
                    <div style={{ width: '100%', height: '280px' }}>
                      <ResponsiveContainer>
                        {activeChart.type === 'bar' ? (
                          <BarChart data={dashHistory} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
                            <XAxis dataKey="date" stroke={subTextColor} fontSize={11} tickMargin={10} />
                            <YAxis stroke={subTextColor} fontSize={11} />
                            <Tooltip contentStyle={{ backgroundColor: cardBg, borderColor: borderColor, color: textColor, borderRadius: '8px' }} formatter={(val) => [val, activeChart.name]} />
                            <Legend wrapperStyle={{ paddingTop: '15px' }} />
                            <Bar dataKey={activeChart.key} name={`ปีนี้ (${activeChart.unit})`} fill={activeChart.color} radius={[4, 4, 0, 0]} />
                            {activeChart.hasLY && <Bar dataKey={activeChart.keyLY} name={`ปีที่แล้ว (${activeChart.unit})`} fill="#94a3b8" radius={[4, 4, 0, 0]} />}
                          </BarChart>
                        ) : activeChart.type === 'area' ? (
                          <AreaChart data={dashHistory} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                            <defs>
                              <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={activeChart.color} stopOpacity={0.8}/>
                                <stop offset="95%" stopColor={activeChart.color} stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
                            <XAxis dataKey="date" stroke={subTextColor} fontSize={11} tickMargin={10} />
                            <YAxis stroke={subTextColor} fontSize={11} />
                            <Tooltip contentStyle={{ backgroundColor: cardBg, borderColor: borderColor, color: textColor, borderRadius: '8px' }} formatter={(val) => [val, activeChart.name]} />
                            <Legend wrapperStyle={{ paddingTop: '15px' }} />
                            <Area type="monotone" dataKey={activeChart.key} name={`${activeChart.name} (${activeChart.unit})`} stroke={activeChart.color} strokeWidth={2} fillOpacity={1} fill="url(#colorArea)" />
                          </AreaChart>
                        ) : (
                          <LineChart data={dashHistory} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
                            <XAxis dataKey="date" stroke={subTextColor} fontSize={11} tickMargin={10} />
                            <YAxis stroke={subTextColor} fontSize={11} domain={['auto', 'auto']} />
                            <Tooltip contentStyle={{ backgroundColor: cardBg, borderColor: borderColor, color: textColor, borderRadius: '8px' }} formatter={(val) => [val, activeChart.name]} />
                            <Legend wrapperStyle={{ paddingTop: '15px' }} />
                            <Line type="monotone" dataKey={activeChart.key} name={`ปีนี้ (${activeChart.unit})`} stroke={activeChart.color} strokeWidth={3} activeDot={{ r: 6 }} />
                            {activeChart.hasLY && <Line type="monotone" dataKey={activeChart.keyLY} name={`ปีที่แล้ว (${activeChart.unit})`} stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" />}
                          </LineChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* กราฟขวา: พยากรณ์ล่วงหน้า 7 วัน */}
                  <div style={{ backgroundColor: darkMode ? '#0f172a' : '#f8fafc', padding: '20px', borderRadius: '12px', border: `1px solid ${borderColor}` }}>
                    <h3 style={{ fontSize: '1.1rem', color: textColor, marginBottom: '15px', textAlign: 'center' }}>
                      🔮 พยากรณ์ล่วงหน้า 7 วัน (Forecast)
                    </h3>
                    <div style={{ width: '100%', height: '280px' }}>
                      <ResponsiveContainer>
                        {activeChart.type === 'bar' ? (
                          <BarChart data={dashForecast} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
                            <XAxis dataKey="date" stroke={subTextColor} fontSize={11} tickMargin={10} />
                            <YAxis stroke={subTextColor} fontSize={11} />
                            <Tooltip contentStyle={{ backgroundColor: cardBg, borderColor: borderColor, color: textColor, borderRadius: '8px' }} labelFormatter={(l, p) => (p && p.length > 0 && p[0].payload) ? p[0].payload.dayName : l} formatter={(val) => [val, activeChart.name]} />
                            <Legend wrapperStyle={{ paddingTop: '15px' }} />
                            <Bar dataKey={activeChart.key} name={`พยากรณ์ ${activeChart.unit}`} fill={activeChart.color} radius={[4, 4, 0, 0]} />
                          </BarChart>
                        ) : (
                          <AreaChart data={dashForecast} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                            <defs>
                              <linearGradient id="colorFore" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={activeChart.color} stopOpacity={0.6}/>
                                <stop offset="95%" stopColor={activeChart.color} stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
                            <XAxis dataKey="date" stroke={subTextColor} fontSize={11} tickMargin={10} />
                            <YAxis stroke={subTextColor} fontSize={11} domain={['auto', 'auto']} />
                            <Tooltip contentStyle={{ backgroundColor: cardBg, borderColor: borderColor, color: textColor, borderRadius: '8px' }} labelFormatter={(l, p) => (p && p.length > 0 && p[0].payload) ? p[0].payload.dayName : l} formatter={(val) => [val, activeChart.name]} />
                            <Legend wrapperStyle={{ paddingTop: '15px' }} />
                            <Area type="monotone" dataKey={activeChart.key} name={`พยากรณ์ ${activeChart.unit}`} stroke={activeChart.color} strokeWidth={3} fillOpacity={1} fill="url(#colorFore)" />
                          </AreaChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  </div>

                </div>
              ) : (
                <div style={{ textAlign: 'center', color: subTextColor, padding: '50px' }}>ไม่พบข้อมูลสถิติของพื้นที่นี้</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        // ======================= ALERTS TAB =======================
        <div style={{ flex: 1, padding: '20px', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
          <div style={{ backgroundColor: cardBg, borderRadius: '16px', padding: '30px', boxShadow: '0 8px 25px rgba(0,0,0,0.08)', border: `1px solid ${borderColor}`, textAlign: 'center' }}>
            
            <h2 style={{ fontSize: '1.8rem', color: textColor, marginBottom: '10px', fontWeight: 'bold' }}>
              🔔 ศูนย์แจ้งเตือนภัยอัจฉริยะ
            </h2>
            <p style={{ color: subTextColor, fontSize: '1rem', marginBottom: '25px' }}>
              สรุปสถานการณ์อากาศและฝุ่นรอบตัวคุณใน 24 ชั่วโมงข้างหน้า
            </p>

            <button 
              onClick={handleScanLocation}
              disabled={alertsLoading}
              style={{ 
                backgroundColor: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '30px', 
                padding: '15px 30px', fontSize: '1.2rem', fontWeight: 'bold', cursor: alertsLoading ? 'wait' : 'pointer', 
                boxShadow: '0 4px 15px rgba(14, 165, 233, 0.4)', transition: 'transform 0.2s, box-shadow 0.2s',
                display: 'inline-flex', alignItems: 'center', gap: '10px', width: window.innerWidth < 768 ? '100%' : 'auto', justifyContent: 'center'
              }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(14, 165, 233, 0.6)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(14, 165, 233, 0.4)'; }}
            >
              {alertsLoading ? '⏳ กำลังประมวลผลพิกัดดาวเทียม...' : '📍 ตรวจสอบพิกัดปัจจุบันของฉัน'}
            </button>

            {alertsLocationName && !alertsLoading && (
              <div style={{ marginTop: '20px', padding: '10px', backgroundColor: darkMode ? '#0f172a' : '#f0f9ff', borderRadius: '10px', display: 'inline-block', color: '#0ea5e9', fontWeight: 'bold' }}>
                กำลังวิเคราะห์พิกัด: {alertsLocationName}
              </div>
            )}

            <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '15px', textAlign: 'left' }}>
              {alertsLoading ? null : alertsData.length > 0 && (
                alertsData.map((alert, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '15px', backgroundColor: darkMode ? '#1e293b' : '#fff', padding: '20px', borderRadius: '12px', borderLeft: `6px solid ${alert.color}`, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '2.5rem', display: 'flex', alignItems: 'center' }}>{alert.icon}</div>
                    <div>
                      <h4 style={{ margin: '0 0 5px 0', fontSize: '1.2rem', color: alert.color, fontWeight: 'bold' }}>{alert.title}</h4>
                      <p style={{ margin: 0, color: textColor, fontSize: '1rem', lineHeight: 1.5 }}>{alert.desc}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}