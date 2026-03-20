import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './App.css';

// ==============================================================
// 1. ฟังก์ชันคำนวณสีและข้อความ (Minified)
// ==============================================================
const getAqiDetails = (val) => { const v=Number(val); return isNaN(v)||v===0?{color:'#ccc',text:'ไม่มีข้อมูล',level:0}:v<=25?{color:'#00b0f0',text:'คุณภาพอากาศดีมาก',level:1}:v<=50?{color:'#92d050',text:'คุณภาพอากาศดี',level:2}:v<=100?{color:'#ffff00',text:'ปานกลาง',level:3}:v<=200?{color:'#ffc000',text:'เริ่มมีผลกระทบฯ',level:4}:{color:'#ff0000',text:'มีผลกระทบต่อสุขภาพ',level:5};};
const getPM25Color = (val) => { const v=Number(val); return isNaN(v)?'#ccc':v<=15?'#00b0f0':v<=25?'#92d050':v<=37.5?'#ffff00':v<=75?'#ffc000':'#ff0000'; };
const getPM25HealthAdvice = (val) => { const v=Number(val); return isNaN(v)||v===0?null:v<=25?{text:"อากาศดีเยี่ยม เหมาะกับการทำกิจกรรมกลางแจ้ง",icon:"🏃‍♂️"}:v<=37.5?{text:"ประชาชนทั่วไปทำกิจกรรมได้ปกติ",icon:"🚶‍♀️"}:v<=75?{text:"ลดระยะเวลาการทำกิจกรรมกลางแจ้ง (หน้ากาก N95)",icon:"😷"}:{text:"งดกิจกรรมกลางแจ้งเด็ดขาด",icon:"🚨"}; };
const getTempColor = (val) => { return (isNaN(val)||val===null)?{bg:'#ccc',text:'#333',bar:'#ccc'}:val<27?{bg:'#3498db',text:'#fff',bar:'#3498db'}:val<=32?{bg:'#2ecc71',text:'#222',bar:'#2ecc71'}:val<=35?{bg:'#f1c40f',text:'#222',bar:'#f1c40f'}:val<=38?{bg:'#e67e22',text:'#fff',bar:'#e67e22'}:{bg:'#e74c3c',text:'#fff',bar:'#e74c3c'}; };
const getHeatIndexAlert = (val) => { return (isNaN(val)||val===null)?{text:'ไม่มีข้อมูล',color:'#666',bg:'#eee',bar:'#ccc',icon:'❓'}:val>=52?{text:'อันตรายมาก (เสี่ยงฮีทสโตรกสูง)',color:'#dc2626',bg:'#fee2e2',bar:'#ef4444',icon:'🚨'}:val>=42?{text:'อันตราย (หลีกเลี่ยงกลางแจ้ง)',color:'#ea580c',bg:'#ffedd5',bar:'#f97316',icon:'🥵'}:val>=33?{text:'เตือนภัย (ลดกิจกรรมกลางแจ้ง)',color:'#ca8a04',bg:'#fef9c3',bar:'#eab308',icon:'😰'}:val>=27?{text:'เฝ้าระวัง (ดูแลสุขภาพทั่วไป)',color:'#16a34a',bg:'#dcfce7',bar:'#22c55e',icon:'😅'}:{text:'ปกติ',color:'#0284c7',bg:'#e0f2fe',bar:'#3b82f6',icon:'😊'}; };
const getHeatHealthAdvice = (val) => { return (isNaN(val)||val===null)?null:val>=52?{text:"งดกิจกรรมกลางแจ้งเด็ดขาด (Heat Stroke)",icon:"🚑"}:val>=42?{text:"หลีกเลี่ยงกิจกรรมกลางแจ้งเป็นเวลานาน",icon:"⛔"}:val>=33?{text:"ลดระยะเวลากิจกรรม ดื่มน้ำให้เพียงพอ",icon:"💧"}:val>=27?{text:"อากาศเริ่มร้อน ดูแลสุขภาพทั่วไป",icon:"🥤"}:null; };
const getUvColor = (val) => { return (isNaN(val)||val===null)?{bg:'#ccc',text:'#333',bar:'#ccc',label:'ไม่มีข้อมูล'}:val<=2?{bg:'#2ecc71',text:'#fff',bar:'#2ecc71',label:'ต่ำ'}:val<=5?{bg:'#f1c40f',text:'#222',bar:'#f1c40f',label:'ปานกลาง'}:val<=7?{bg:'#e67e22',text:'#fff',bar:'#e67e22',label:'สูง'}:val<=10?{bg:'#e74c3c',text:'#fff',bar:'#e74c3c',label:'สูงมาก'}:{bg:'#9b59b6',text:'#fff',bar:'#9b59b6',label:'อันตราย'}; };
const getUvHealthAdvice = (val) => { return (isNaN(val)||val===null)?null:val>10?{text:"หลีกเลี่ยงการออกแดดเด็ดขาด ผิวหนังและดวงตาอาจไหม้ได้",icon:"⛔"}:val>=8?{text:"ควรอยู่ในที่ร่ม หากต้องออกแดดต้องทากันแดด SPF50+",icon:"☂️"}:val>=6?{text:"ควรทาครีมกันแดด สวมหมวก หรือกางร่มเมื่อออกแดด",icon:"🧢"}:null; };
const getRainColor = (val) => { return (isNaN(val)||val===null)?{bg:'#ccc',text:'#333',bar:'#ccc',label:'ไม่มีข้อมูล'}:val===0?{bg:'#95a5a6',text:'#fff',bar:'#95a5a6',label:'ไม่มีฝน'}:val<=30?{bg:'#74b9ff',text:'#222',bar:'#74b9ff',label:'โอกาสต่ำ'}:val<=60?{bg:'#0984e3',text:'#fff',bar:'#0984e3',label:'ปานกลาง'}:val<=80?{bg:'#273c75',text:'#fff',bar:'#273c75',label:'โอกาสสูง'}:{bg:'#192a56',text:'#fff',bar:'#192a56',label:'โอกาสสูงมาก'}; };
const getWindColor = (val) => { return (isNaN(val)||val===null)?{bg:'#ccc',text:'#333',bar:'#ccc',label:'ไม่มีข้อมูล'}:val<=10?{bg:'#00b0f0',text:'#fff',bar:'#00b0f0',label:'ลมอ่อน'}:val<=25?{bg:'#2ecc71',text:'#fff',bar:'#2ecc71',label:'ลมปานกลาง'}:val<=40?{bg:'#f1c40f',text:'#222',bar:'#f1c40f',label:'ลมแรง'}:val<=60?{bg:'#e67e22',text:'#fff',bar:'#e67e22',label:'ลมแรงมาก'}:{bg:'#e74c3c',text:'#fff',bar:'#e74c3c',label:'พายุ'}; };
const getWeatherIcon = (c) => { if(c===undefined||c===null)return{icon:'❓',text:'ไม่ทราบ'}; if(c===0)return{icon:'☀️',text:'แจ่มใส'}; if(c===1)return{icon:'🌤️',text:'มีเมฆบางส่วน'}; if(c===2)return{icon:'⛅',text:'มีเมฆ'}; if(c===3)return{icon:'☁️',text:'มีเมฆมาก'}; if([45,48].includes(c))return{icon:'🌫️',text:'มีหมอก'}; if([51,53,55,56,57].includes(c))return{icon:'🌧️',text:'ฝนปรอย'}; if([61,63,65,66,67].includes(c))return{icon:'🌧️',text:'ฝนตก'}; if([71,73,75,77,85,86].includes(c))return{icon:'❄️',text:'หิมะ'}; if([80,81,82].includes(c))return{icon:'🌦️',text:'ฝนตกหย่อมๆ'}; if([95,96,99].includes(c))return{icon:'⛈️',text:'พายุฝน'}; return{icon:'🌤️',text:'ปกติ'}; };
const extractProvince = (area) => { if(!area)return'ไม่ระบุ'; if(area.includes('กรุงเทพ')||area.includes('กทม')||area.includes('เขต'))return'กรุงเทพมหานคร'; let p=area.includes(',')?area.split(',').pop():area.trim().split(/\s+/).pop(); return p.replace(/^(จ\.|จังหวัด)/,'').trim(); };
const getWindDirTxt = (d) => { if(d===null||d===undefined)return'ไม่ทราบทิศ'; if(d>=337.5||d<22.5)return'เหนือ'; if(d>=22.5&&d<67.5)return'ตะวันออกเฉียงเหนือ'; if(d>=67.5&&d<112.5)return'ตะวันออก'; if(d>=112.5&&d<157.5)return'ตะวันออกเฉียงใต้'; if(d>=157.5&&d<202.5)return'ใต้'; if(d>=202.5&&d<247.5)return'ตะวันตกเฉียงใต้'; if(d>=247.5&&d<292.5)return'ตะวันตก'; return'ตะวันตกเฉียงเหนือ'; };

const legendData = {
  pm25: { title: 'ระดับ PM2.5 (µg/m³)', items: [{color:'#00b0f0',label:'0-15.0 (ดีมาก)'},{color:'#92d050',label:'15.1-25.0 (ดี)'},{color:'#ffff00',label:'25.1-37.5 (ปานกลาง)'},{color:'#ffc000',label:'37.6-75.0 (เริ่มมีผลกระทบฯ)'},{color:'#ff0000',label:'> 75.0 (มีผลกระทบฯ)'}] },
  temp: { title: 'อุณหภูมิ (°C)', items: [{color:'#3498db',label:'< 27 (เย็นสบาย)'},{color:'#2ecc71',label:'27-32 (ปกติ)'},{color:'#f1c40f',label:'33-35 (ร้อน)'},{color:'#e67e22',label:'36-38 (ร้อนมาก)'},{color:'#e74c3c',label:'> 38 (ร้อนจัด)'}] },
  heat: { title: 'ดัชนีความร้อน (°C)', items: [{color:'#3b82f6',label:'< 27.0 (ปกติ)'},{color:'#22c55e',label:'27.0-32.9 (เฝ้าระวัง)'},{color:'#eab308',label:'33.0-41.9 (เตือนภัย)'},{color:'#f97316',label:'42.0-51.9 (อันตราย)'},{color:'#ef4444',label:'≥ 52.0 (อันตรายมาก)'}] },
  uv: { title: 'รังสี UV', items: [{color:'#2ecc71',label:'0-2 (ต่ำ)'},{color:'#f1c40f',label:'3-5 (ปานกลาง)'},{color:'#e67e22',label:'6-7 (สูง)'},{color:'#e74c3c',label:'8-10 (สูงมาก)'},{color:'#9b59b6',label:'> 10 (อันตราย)'}] },
  rain: { title: 'โอกาสเกิดฝน (%)', items: [{color:'#95a5a6',label:'0 (ไม่มีฝน)'},{color:'#74b9ff',label:'1-30 (โอกาสต่ำ)'},{color:'#0984e3',label:'31-60 (ปานกลาง)'},{color:'#273c75',label:'61-80 (โอกาสสูง)'},{color:'#192a56',label:'> 80 (ตกหนัก)'}] },
  wind: { title: 'ความเร็วลม (km/h)', items: [{color:'#00b0f0',label:'0-10 (ลมอ่อน)'},{color:'#2ecc71',label:'11-25 (ลมปานกลาง)'},{color:'#f1c40f',label:'26-40 (ลมแรง)'},{color:'#e67e22',label:'41-60 (ลมแรงมาก)'},{color:'#e74c3c',label:'> 60 (พายุ)'}] }
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
  if (viewMode === 'pm25') { bg = getPM25Color(value); textColor = (value > 25.0 && value <= 37.5) ? '#222' : '#fff'; displayValue = (value === 0 || isNaN(value)) ? '-' : value; }
  else if (viewMode === 'temp') { const tInfo = getTempColor(value); bg = tInfo.bg; textColor = tInfo.text; displayValue = (value === 0 || isNaN(value) || value === null) ? '-' : Math.round(value); }
  else if (viewMode === 'heat') { const hInfo = getHeatIndexAlert(value); bg = value ? hInfo.bar : '#cccccc'; textColor = '#fff'; displayValue = (value === 0 || isNaN(value) || value === null) ? '-' : Math.round(value); }
  else if (viewMode === 'uv') { const uInfo = getUvColor(value); bg = value !== null ? uInfo.bar : '#cccccc'; textColor = (value > 2 && value <= 5) ? '#222' : '#fff'; displayValue = (value === 0 || isNaN(value) || value === null) ? '-' : Math.round(value); }
  else if (viewMode === 'rain') { const rInfo = getRainColor(value); bg = value !== null ? rInfo.bar : '#cccccc'; textColor = (value <= 30 && value > 0) ? '#222' : '#fff'; displayValue = (value === null || isNaN(value)) ? '-' : `${Math.round(value)}%`; }
  else if (viewMode === 'wind') { const wInfo = getWindColor(value); bg = value !== null ? wInfo.bar : '#cccccc'; textColor = (value > 10 && value <= 40) ? '#222' : '#fff'; const dir = extraData?.windDir || 0; displayValue = value === null ? '-' : `<div style="display:flex; flex-direction:column; align-items:center; line-height:1;"><span style="transform: rotate(${dir}deg); font-size: 14px; margin-bottom: -1px; font-weight: bold;">↓</span><span style="font-size: 9px;">${Math.round(value)}</span></div>`; }

  return L.divIcon({ className: 'custom-div-icon', html: `<div style="background-color: ${bg}; width: 34px; height: 34px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.4); display: flex; justify-content: center; align-items: center; color: ${textColor}; font-weight: bold; font-size: ${fontSize}; font-family: 'Kanit', sans-serif; transition: all 0.3s ease;">${displayValue}</div>`, iconSize: [38, 38], iconAnchor: [19, 19] });
};

function FitBounds({ stations, activeStation, selectedProvince }) {
  const map = useMap();
  useEffect(() => {
    if (activeStation) return; 
    if (stations && stations.length > 0) {
      if (!selectedProvince) map.flyTo([13.5, 101.0], 6, { duration: 1.5 });
      else { const bounds = L.latLngBounds(stations.map(s => [parseFloat(s.lat), parseFloat(s.long)])); map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 }); }
    }
  }, [stations, map, activeStation, selectedProvince]);
  return null;
}

function FlyToActiveStation({ activeStation }) {
  const map = useMap();
  useEffect(() => { if (activeStation) map.flyTo([parseFloat(activeStation.lat), parseFloat(activeStation.long)], 13, { duration: 1.5 }); }, [activeStation, map]);
  return null;
}

function RadarMapHandler({ showRadar }) {
  const map = useMap();
  useEffect(() => { if (showRadar && map.getZoom() > 8) map.flyTo([13.5, 101.0], 6, { duration: 1.2 }); }, [showRadar, map]);
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
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [showRadar, setShowRadar] = useState(false);
  const [radarTime, setRadarTime] = useState(null);
  
  const [activeWeather, setActiveWeather] = useState(null); 
  const [activeForecast, setActiveForecast] = useState(null); 

  const [dashHistory, setDashHistory] = useState([]);
  const [dashForecast, setDashForecast] = useState([]);
  const [dashLoading, setDashLoading] = useState(false);
  const [dashTitle, setDashTitle] = useState('ภาพรวมทั้งประเทศ');

  const [currentPage, setCurrentPage] = useState('map'); 
  
  // 🚀 เพิ่ม State สำหรับซ่อน/โชว์กราฟสถิติ (เปิดบนคอม, ซ่อนบนมือถือ)
  const [showStats, setShowStats] = useState(window.innerWidth >= 768);

  const [alertsData, setAlertsData] = useState({ warnings: [], normals: [] });
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsLocationName, setAlertsLocationName] = useState('');

  const cardRefs = useRef({});
  const markerRefs = useRef({});

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
    if(darkMode) document.body.classList.add('dark-theme');
    else document.body.classList.remove('dark-theme');
  }, [darkMode]);

  const handleViewModeChange = (mode) => { setViewMode(mode); setSortOrder(mode === 'temp' ? 'asc' : 'desc'); setShowRadar(false); };

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
    const cachedData = localStorage.getItem('dashboard_cache');
    if (cachedData && !isBackgroundLoad) {
      try {
        const parsedCache = JSON.parse(cachedData);
        setAllStations(parsedCache.stations);
        setProvinces([...new Set(parsedCache.stations.map(s => extractProvince(s.areaTH)))].sort((a, b) => a.localeCompare(b, 'th')));
        setLastUpdateText(`${parsedCache.stations[0].AQILast?.date || ''} เวลา ${parsedCache.stations[0].AQILast?.time || ''} น.`);
        setStationTemps(parsedCache.weather);
      } catch (e) { console.error("Cache error", e); }
    } else if (!isBackgroundLoad) {
      setLoading(true);
    }

    try {
      const PROJECT_ID = "thai-env-dashboard"; 
      const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/weatherData/latest`;
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error('Network error');
      
      const rawData = await response.json();
      const payloadString = rawData.fields.jsonData.stringValue;
      const parsedData = JSON.parse(payloadString);
      
      const stations = parsedData.stations;
      const weather = parsedData.weather;
      
      if (stations && stations.length > 0) {
        localStorage.setItem('dashboard_cache', JSON.stringify({ stations, weather }));
        setAllStations(stations);
        setProvinces([...new Set(stations.map(s => extractProvince(s.areaTH)))].sort((a, b) => a.localeCompare(b, 'th')));
        setLastUpdateText(`${stations[0].AQILast?.date || ''} เวลา ${stations[0].AQILast?.time || ''} น.`);
        setStationTemps(weather); 
      }
    } catch (err) { console.error("Fetch error:", err); } 
    finally { if (!isBackgroundLoad) setLoading(false); }
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
      let vA, vB;
      if (viewMode==='pm25') { vA = Number(a.AQILast?.PM25?.value); vB = Number(b.AQILast?.PM25?.value); }
      else if (viewMode==='temp') { vA = stationTemps[a.stationID]?.temp; vB = stationTemps[b.stationID]?.temp; }
      else if (viewMode==='heat') { vA = stationTemps[a.stationID]?.feelsLike; vB = stationTemps[b.stationID]?.feelsLike; }
      else if (viewMode==='uv') { vA = stationTemps[a.stationID]?.uvMax; vB = stationTemps[b.stationID]?.uvMax; }
      else if (viewMode==='rain') { vA = stationTemps[a.stationID]?.rainProb; vB = stationTemps[b.stationID]?.rainProb; }
      else if (viewMode==='wind') { vA = stationTemps[a.stationID]?.windSpeed; vB = stationTemps[b.stationID]?.windSpeed; }
      const validA = vA!==undefined && vA!==null && !isNaN(vA) && (viewMode==='rain'?true:vA!==0);
      const validB = vB!==undefined && vB!==null && !isNaN(vB) && (viewMode==='rain'?true:vB!==0);
      if (!validA && validB) return 1; if (validA && !validB) return -1; if (!validA && !validB) return 0;
      return sortOrder === 'desc' ? vB - vA : vA - vB;
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
          const urlWeather = `https://api.open-meteo.com/v1/forecast?latitude=${activeStation.lat}&longitude=${activeStation.long}&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,uv_index_max,precipitation_probability_max,wind_speed_10m_max&timezone=auto&forecast_days=7`;
          const resW = await fetch(urlWeather); const wData = await resW.json();
          let tempF=[], heatF=[], uvF=[], rainF=[], windF=[];
          if (wData.daily && wData.daily.time) {
            for (let i = 0; i < wData.daily.time.length; i++) {
              const days = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
              let tLabel = i===0?'วันนี้':i===1?'พรุ่งนี้':days[new Date(wData.daily.time[i]).getDay()];
              tempF.push({ time: tLabel, val: Math.round(wData.daily.temperature_2m_max[i]||0), minVal: Math.round(wData.daily.temperature_2m_min[i]||0), colorInfo: getTempColor(wData.daily.temperature_2m_max[i]) });
              heatF.push({ time: tLabel, val: Math.round(wData.daily.apparent_temperature_max[i]||0), colorInfo: getHeatIndexAlert(wData.daily.apparent_temperature_max[i]) });
              if(wData.daily.uv_index_max[i] !== null && wData.daily.uv_index_max[i] !== undefined){ uvF.push({ time: tLabel, val: Math.round(wData.daily.uv_index_max[i]||0), colorInfo: getUvColor(wData.daily.uv_index_max[i]) }); }
              rainF.push({ time: tLabel, val: Math.round(wData.daily.precipitation_probability_max[i]||0), colorInfo: getRainColor(wData.daily.precipitation_probability_max[i]) });
              windF.push({ time: tLabel, val: Math.round(wData.daily.wind_speed_10m_max[i]||0), colorInfo: getWindColor(wData.daily.wind_speed_10m_max[i]) });
            }
          }
          setActiveWeather({ tempForecast:tempF, heatForecast:heatF, uvForecast:uvF, rainForecast:rainF, windForecast:windF });

          const urlAqi = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${activeStation.lat}&longitude=${activeStation.long}&hourly=pm2_5&timezone=auto&forecast_days=4`;
          const resAqi = await fetch(urlAqi); const aData = await resAqi.json();
          if (aData && aData.hourly && aData.hourly.pm2_5) {
            const now = new Date().getTime(); let sIdx = aData.hourly.time.findIndex(t => new Date(t).getTime()>=now); if (sIdx===-1) sIdx=0;
            const currentReal = Number(activeStation.AQILast?.PM25?.value);
            let offset = (!isNaN(currentReal) && aData.hourly.pm2_5[sIdx] !== undefined) ? currentReal - aData.hourly.pm2_5[sIdx] : 0;
            const pmF = [];
            for (let i = sIdx; i < aData.hourly.time.length && pmF.length < 24; i += 3) {
              if(aData.hourly.pm2_5[i] !== null){
                let cVal = Math.max(0, (aData.hourly.pm2_5[i] || 0) + offset);
                pmF.push({ time: `${new Date(aData.hourly.time[i]).getHours().toString().padStart(2, '0')}`, val: Math.round(cVal), color: getPM25Color(cVal) });
              }
            }
            setActiveForecast(pmF);
          }
        } catch (err) { console.error("Card detail error", err); setActiveWeather('error'); }
      };
      fetchCardDetails();
    }
  }, [activeStation, showRadar, currentPage]);

  const fetchDashboardData = async (lat, lon, titleText) => {
    setDashTitle(titleText); setDashLoading(true);
    try {
      const today = new Date(); const lyEnd = new Date(); lyEnd.setFullYear(today.getFullYear() - 1); lyEnd.setDate(lyEnd.getDate() - 1);
      const lyStart = new Date(lyEnd); lyStart.setDate(lyStart.getDate() - 13);
      const urlW = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,apparent_temperature_max,precipitation_sum,wind_speed_10m_max,uv_index_max&past_days=14&forecast_days=7&timezone=Asia%2FBangkok`;
      const urlA = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm2_5&past_days=14&forecast_days=7&timezone=Asia%2FBangkok`;
      const urlArc = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${lyStart.toISOString().split('T')[0]}&end_date=${lyEnd.toISOString().split('T')[0]}&daily=temperature_2m_max,apparent_temperature_max,precipitation_sum,wind_speed_10m_max&timezone=Asia%2FBangkok`;
      
      const [rW, rA, rArc] = await Promise.all([fetch(urlW), fetch(urlA), fetch(urlArc)]);
      const [dW, dA, dArc] = await Promise.all([rW.json(), rA.json(), rArc.json()]);

      let hArr = [], fArr = [];
      if (dW.daily && dW.daily.time) {
        for (let i=0; i<dW.daily.time.length; i++) {
          let dObj = new Date(dW.daily.time[i]);
          
          let avgPm = null;
          if (dA.hourly && dA.hourly.pm2_5) { 
            const startIdx = i*24;
            if(dA.hourly.pm2_5.length > startIdx){
              const hrs = dA.hourly.pm2_5.slice(startIdx, startIdx+24).filter(v=>v!==null); 
              if(hrs.length > 0) avgPm = Math.round(hrs.reduce((a,b)=>a+b,0)/hrs.length); 
            }
          }

          let item = {
            date: dObj.toLocaleDateString('th-TH',{day:'numeric',month:'short'}),
            dayName: ['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.'][dObj.getDay()],
            temp: dW.daily.temperature_2m_max[i] ?? null, 
            heat: dW.daily.apparent_temperature_max[i] ?? null,
            rain: dW.daily.precipitation_sum[i] ?? null, 
            wind: dW.daily.wind_speed_10m_max[i] ?? null,
            uv: dW.daily.uv_index_max ? (dW.daily.uv_index_max[i] ?? null) : null, 
            pm25: avgPm
          };
          
          if (i<14) {
            item.tempLY = dArc.daily?.temperature_2m_max?(dArc.daily.temperature_2m_max[i]||0):0;
            item.heatLY = dArc.daily?.apparent_temperature_max?(dArc.daily.apparent_temperature_max[i]||0):0;
            item.rainLY = dArc.daily?.precipitation_sum?(dArc.daily.precipitation_sum[i]||0):0;
            item.windLY = dArc.daily?.wind_speed_10m_max?(dArc.daily.wind_speed_10m_max[i]||0):0;
            hArr.push(item);
          } else {
            if(i===14) item.date='วันนี้'; if(i===15) item.date='พรุ่งนี้';
            fArr.push(item);
          }
        }
      }
      setDashHistory(hArr); setDashForecast(fArr);
    } catch (e) { console.error("Dash error:", e); } finally { setDashLoading(false); }
  };

  useEffect(() => {
    if (currentPage === 'map') {
      if (activeStation) fetchDashboardData(activeStation.lat, activeStation.long, `สถานี${activeStation.nameTH} (${extractProvince(activeStation.areaTH)})`);
      else if (selectedProvince) {
        const pStat = allStations.filter(s => extractProvince(s.areaTH) === selectedProvince);
        if (pStat.length > 0) fetchDashboardData(pStat.reduce((a,b)=>a+parseFloat(b.lat),0)/pStat.length, pStat.reduce((a,b)=>a+parseFloat(b.long),0)/pStat.length, `ค่าเฉลี่ย ${selectedProvince}`);
      } else if (allStations.length > 0) {
        fetchDashboardData(allStations.reduce((a,b)=>a+parseFloat(b.lat),0)/allStations.length, allStations.reduce((a,b)=>a+parseFloat(b.long),0)/allStations.length, 'ภาพรวมประเทศ');
      }
    }
  }, [activeStation, selectedProvince, allStations, currentPage]);

  const handleReset = () => { setSelectedProvince(''); setSelectedStationId(''); setActiveStation(null); setShowRadar(false); setCurrentPage('map'); };
  
  const handleFindNearest = () => {
    if (!navigator.geolocation) return alert('ไม่รองรับ GPS'); setLocating(true);
    navigator.geolocation.getCurrentPosition((pos) => {
      let nearest = null; let minD = Infinity;
      allStations.forEach(s => { const d = getDistanceFromLatLonInKm(pos.coords.latitude, pos.coords.longitude, parseFloat(s.lat), parseFloat(s.long)); if (d<minD){minD=d; nearest=s;} });
      if (nearest) { setSelectedProvince(extractProvince(nearest.areaTH)); setSelectedStationId(nearest.stationID); setActiveStation(nearest); setShowRadar(false); setCurrentPage('map'); }
      setLocating(false);
    }, () => { alert('ดึงพิกัดไม่ได้'); setLocating(false); });
  };

  const fetchAlertsData = async (lat, lon, locName) => {
    setAlertsLoading(true); setAlertsLocationName(locName);
    try {
      const urlW = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,uv_index,wind_speed_10m,wind_direction_10m&forecast_days=2&timezone=Asia%2FBangkok`;
      const urlA = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm2_5&forecast_days=2&timezone=Asia%2FBangkok`;
      
      const [rW, rA] = await Promise.all([fetch(urlW), fetch(urlA)]);
      const [dW, dA] = await Promise.all([rW.json(), rA.json()]);

      let warns = [];
      let norms = [];
      const nIdx = new Date().getHours();
      const fmt = (iso) => `${new Date(iso).getHours()}:00 น.`;

      let rain3hP = 0, rain3hV = 0, rain3hT = '';
      let rain24hList = [];
      if(dW.hourly && dW.hourly.time) {
        dW.hourly.time.slice(nIdx, nIdx+3).forEach((t, i) => {
          const idx = nIdx+i;
          if (dW.hourly.precipitation_probability[idx] > rain3hP) { rain3hP=dW.hourly.precipitation_probability[idx]; rain3hV=dW.hourly.precipitation[idx]; rain3hT=t; }
        });
        dW.hourly.time.slice(nIdx, nIdx+24).forEach((t, i) => {
           const idx = nIdx+i;
           if(dW.hourly.precipitation_probability[idx] >= 20) {
               rain24hList.push({ t, p: dW.hourly.precipitation_probability[idx], v: dW.hourly.precipitation[idx] });
           }
        });
      }

      if (rain3hP >= 30 || rain3hV > 0.1) {
          warns.push({ icon:'🌧️', color:'#3b82f6', title:'เตรียมพกร่ม! (ฝนใน 3 ชม.)', desc:`พบกลุ่มฝน โอกาสตก ${rain3hP}% ปริมาณ ${rain3hV.toFixed(1)}mm ช่วงเวลา ${fmt(rain3hT)}` });
      } else if (rain24hList.length > 0) {
          let peak = rain24hList.reduce((max, obj) => obj.p > max.p ? obj : max, rain24hList[0]);
          if (peak.p >= 50) warns.push({ icon:'🌦️', color:'#0ea5e9', title:'แนวโน้มฝนตกใน 24 ชม.', desc:`วันนี้มีโอกาสฝนตก ${peak.p}% ช่วงเวลาประมาณ ${fmt(peak.t)} เตรียมตัวและเผื่อเวลาเดินทาง` });
          else norms.push({ icon:'🌥️', color:'#0ea5e9', title:'โอกาสเกิดฝนเล็กน้อย (24 ชม.)', desc:`อาจมีละอองฝนช่วง ${fmt(peak.t)} (${peak.p}%) แต่โดยรวมสามารถทำกิจกรรมได้ตามปกติ` });
      } else {
          norms.push({ icon:'☀️', color:'#10b981', title:'ไม่มีฝน (ตลอด 24 ชม.)', desc:`โอกาสเกิดฝนต่ำมาก ท้องฟ้าโปร่ง สามารถทำกิจกรรมกลางแจ้ง ซักผ้า หรือเดินทางได้เต็มที่` });
      }

      let mWindS = 0, mWindD = 0, windT = '';
      if(dW.hourly && dW.hourly.time) {
          dW.hourly.time.slice(nIdx, nIdx+24).forEach((t, i) => {
              const idx = nIdx+i;
              if(dW.hourly.wind_speed_10m[idx] > mWindS) { mWindS = dW.hourly.wind_speed_10m[idx]; mWindD = dW.hourly.wind_direction_10m[idx]; windT = t; }
          });
      }
      let windDirTxt = getWindDirTxt(mWindD);
      if (mWindS >= 40) warns.push({ icon:'🌪️', color:'#f59e0b', title:'เตือนภัยลมกระโชกแรง', desc:`ลมพัดแรงจากทิศ${windDirTxt} ความเร็วสูงสุด ${mWindS} km/h (${fmt(windT)}) ระวังสิ่งของปลิวหรือกิ่งไม้หัก`});
      else norms.push({ icon:'🍃', color:'#10b981', title:'สภาพลมปกติ', desc:`ลมพัดเบาถึงปานกลาง จากทิศ${windDirTxt} ความเร็วสูงสุด ${mWindS} km/h (${fmt(windT)}) อากาศถ่ายเทได้ดี`});

      let mHeat = 0, hTime = '';
      if(dW.hourly && dW.hourly.time) {
         dW.hourly.time.slice(nIdx, nIdx+24).forEach((t, i) => {
             const idx = nIdx+i; if (dW.hourly.apparent_temperature[idx] > mHeat) { mHeat = dW.hourly.apparent_temperature[idx]; hTime = t; }
         });
      }
      if (mHeat >= 42) warns.push({ icon:'🥵', color:'#ef4444', title:'อากาศร้อนอันตราย!', desc:`ดัชนีความร้อนจะแตะ ${mHeat.toFixed(1)}°C (${fmt(hTime)}) ควรงดกิจกรรมกลางแจ้งเด็ดขาด`});
      else if (mHeat >= 33) warns.push({ icon:'😰', color:'#ea580c', title:'เตือนภัยอากาศร้อน', desc:`ดัชนีความร้อนแตะ ${mHeat.toFixed(1)}°C (${fmt(hTime)}) ควรลดระยะเวลากิจกรรมและดื่มน้ำบ่อยๆ`});
      else norms.push({ icon:'😎', color:'#22c55e', title:'อุณหภูมิเกณฑ์ปลอดภัย', desc:`ดัชนีความร้อนสูงสุด ${mHeat.toFixed(1)}°C (${fmt(hTime)}) อากาศกำลังดี ไม่เป็นอันตรายต่อสุขภาพ`});

      let mPm = 0, pTime = '';
      if(dA.hourly && dA.hourly.pm2_5) {
         dA.hourly.time.slice(nIdx, nIdx+24).forEach((t, i) => {
             const idx = nIdx+i; if(dA.hourly.pm2_5[idx] > mPm) { mPm = dA.hourly.pm2_5[idx]; pTime = t; }
         });
      }
      if (mPm >= 75) warns.push({ icon:'☠️', color:'#dc2626', title:'ฝุ่น PM2.5 ระดับอันตราย', desc:`ฝุ่นสูงสุด ${mPm.toFixed(1)} µg/m³ (${fmt(pTime)}) ควรงดออกจากบ้าน หรือใส่หน้ากาก N95 ตลอดเวลา`});
      else if (mPm >= 37.5) warns.push({ icon:'😷', color:'#f59e0b', title:'ฝุ่น PM2.5 เริ่มมีผลกระทบ', desc:`ฝุ่นจะแตะ ${mPm.toFixed(1)} µg/m³ (${fmt(pTime)}) กลุ่มเสี่ยงควรหลีกเลี่ยงพื้นที่โล่งแจ้ง`});
      else norms.push({ icon:'🌿', color:'#10b981', title:'คุณภาพอากาศดี', desc:`ปริมาณฝุ่นสูงสุดเพียง ${mPm.toFixed(1)} µg/m³ หายใจได้เต็มปอด ไร้กังวลเรื่องฝุ่น`});

      let mUv = 0, uTime = '';
      if(dW.hourly && dW.hourly.time) {
         dW.hourly.time.slice(nIdx, nIdx+24).forEach((t, i) => {
             const idx = nIdx+i; if(dW.hourly.uv_index[idx] > mUv) { mUv = dW.hourly.uv_index[idx]; uTime = t; }
         });
      }
      if (mUv >= 8) warns.push({ icon:'☀️', color:'#a855f7', title:'รังสี UV สูงมาก', desc:`ดัชนี UV ถึงระดับ ${mUv} (${fmt(uTime)}) เสี่ยงผิวไหม้รุนแรง ควรทากันแดด SPF50+ และกางร่ม`});
      else norms.push({ icon:'🌤️', color:'#3b82f6', title:'รังสี UV ระดับปลอดภัย', desc:`ดัชนี UV สูงสุดระดับ ${mUv} (${fmt(uTime)}) สามารถออกแดดได้ ไม่เป็นอันตรายรุนแรง`});

      setAlertsData({ warnings: warns, normals: norms });
    } catch(e) { console.error("Alert err:", e); } finally { setAlertsLoading(false); }
  };

  const handleScanLocation = () => {
    if (!navigator.geolocation) return alert('ไม่รองรับ GPS');
    navigator.geolocation.getCurrentPosition((pos) => fetchAlertsData(pos.coords.latitude, pos.coords.longitude, '📍 พิกัดปัจจุบันของคุณ'), () => alert('ไม่อนุญาต GPS'));
  };

  useEffect(() => {
    if (currentPage==='alerts' && !alertsLocationName) {
      if(activeStation) fetchAlertsData(activeStation.lat, activeStation.long, `สถานี${activeStation.nameTH}`);
      else if(allStations.length>0) fetchAlertsData(13.75, 100.5, 'กรุงเทพมหานคร (เริ่มต้น)');
    }
  }, [currentPage, activeStation, allStations, alertsLocationName]);

  if (loading) return <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', fontSize:'1.5rem', color:'#555' }}>กำลังโหลด...</div>;

  const isPm25Mode = viewMode === 'pm25'; const isTempMode = viewMode === 'temp'; const isHeatMode = viewMode === 'heat';
  const isUvMode = viewMode === 'uv'; const isRainMode = viewMode === 'rain'; const isWindMode = viewMode === 'wind';
  const themeBg = darkMode ? '#0f172a' : '#f1f5f9'; const cardBg = darkMode ? '#1e293b' : '#ffffff';
  const textColor = darkMode ? '#f8fafc' : '#1e293b'; const subTextColor = darkMode ? '#94a3b8' : '#64748b';
  const borderColor = darkMode ? '#334155' : '#e2e8f0';
  const activeChart = chartConfigs[viewMode] || chartConfigs['pm25']; 

  const validForecast = dashForecast.filter(d => d[activeChart.key] !== null && d[activeChart.key] !== undefined);

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', width:'100vw', backgroundColor:themeBg, fontFamily:"'Kanit', sans-serif", overflowY:'auto', overflowX:'hidden' }}>
      
      {/* HEADER */}
      <header style={{ background: darkMode ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' : 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)', color: '#fff', padding: '12px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ fontSize: '1.8rem', background: '#fff', borderRadius: '50%', padding: '5px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{darkMode ? '🌙' : '🌤️'}</div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>Thailand Environment Dashboard</h1>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#cbd5e1' }}>ระบบเฝ้าระวังคุณภาพอากาศและสภาพอากาศ</p>
            </div>
          </div>
          {currentPage === 'map' && (
            <>
              <div style={{ width: '1px', height: '35px', backgroundColor: 'rgba(255,255,255,0.3)', display: window.innerWidth < 1024 ? 'none' : 'block' }}></div>
              <div className="hide-scrollbar" style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'rgba(255,255,255,0.15)', padding: '6px 15px', borderRadius: '30px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>🗺️</label>
                  <select value={selectedProvince} onChange={(e) => { setSelectedProvince(e.target.value); setSelectedStationId(''); setActiveStation(null); setShowRadar(false); }} style={{ padding: '8px 12px', borderRadius: '20px', border: 'none', backgroundColor: '#fff', color: '#1e293b', minWidth: '150px', outline: 'none', cursor: 'pointer' }}>
                    <option value="">ทุกจังหวัด</option>{provinces.map(p => (<option key={p} value={p}>{p}</option>))}
                  </select>
                </div>
                <div style={{ width: '2px', height: '20px', backgroundColor: 'rgba(255,255,255,0.3)' }}></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>📍</label>
                  <select value={selectedStationId} onChange={(e) => { setSelectedStationId(e.target.value); const stat = allStations.find(s => s.stationID === e.target.value); if(stat) {setActiveStation(stat); setShowRadar(false);} }} style={{ padding: '8px 12px', borderRadius: '20px', border: 'none', backgroundColor: '#fff', color: '#1e293b', minWidth: '220px', outline: 'none', cursor: 'pointer' }}>
                    <option value="">-- เลือกสถานี --</option>
                    {filteredStations.slice().sort((a, b) => a.nameTH.localeCompare(b.nameTH, 'th')).map(s => (<option key={s.stationID} value={s.stationID}>{s.nameTH}</option>))}
                  </select>
                </div>
                <button onClick={handleReset} style={{ padding: '8px 16px', backgroundColor: '#fff', color: '#0ea5e9', border: 'none', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>🏠 หน้าแรก</button>
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '25px', padding: '4px' }}>
            <button onClick={() => setCurrentPage('map')} style={{ padding: '6px 16px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: currentPage === 'map' ? '#fff' : 'transparent', color: currentPage === 'map' ? '#0ea5e9' : '#fff' }}>🗺️ แผนที่ & สถิติ</button>
            <button onClick={() => setCurrentPage('alerts')} style={{ padding: '6px 16px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: currentPage === 'alerts' ? '#fff' : 'transparent', color: currentPage === 'alerts' ? '#0ea5e9' : '#fff' }}>🔔 แจ้งเตือนภัย</button>
          </div>
          <button onClick={() => setDarkMode(!darkMode)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', fontSize: '1.2rem' }}>{darkMode ? '☀️' : '🌙'}</button>
        </div>
      </header>

      {/* BODY CONTENT */}
      {currentPage === 'map' ? (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ display: 'flex', gap: '15px', flexDirection: window.innerWidth < 768 ? 'column' : 'row', padding: '15px' }}>
            
            {/* MAP AREA (ปรับความสูงบนมือถือให้เหลือ 50vh เพื่อให้เลื่อนดูลิสต์ง่ายขึ้น) */}
            <div style={{ flex: 7, borderRadius: '12px', overflow: 'hidden', position: 'relative', border: `1px solid ${borderColor}`, height: window.innerWidth < 768 ? '50vh' : 'calc(100vh - 120px)' }}>
              
              <div className="hide-scrollbar" style={{ position: 'absolute', top: '15px', right: '15px', zIndex: 500, background: darkMode ? 'rgba(30,41,59,0.9)' : 'rgba(255,255,255,0.9)', padding: '5px 10px', borderRadius: '30px', display: 'flex', gap: '8px', overflowX: 'auto', whiteSpace: 'nowrap', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                <button onClick={() => handleViewModeChange('pm25')} style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: isPm25Mode ? '#0ea5e9' : 'transparent', color: isPm25Mode ? '#fff' : subTextColor }}>☁️ PM2.5</button>
                <button onClick={() => handleViewModeChange('temp')} style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: isTempMode ? '#22c55e' : 'transparent', color: isTempMode ? '#fff' : subTextColor }}>🌡️ อุณหภูมิ</button>
                <button onClick={() => handleViewModeChange('heat')} style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: isHeatMode ? '#f97316' : 'transparent', color: isHeatMode ? '#fff' : subTextColor }}>🥵 Heat</button>
                <button onClick={() => handleViewModeChange('uv')} style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: isUvMode ? '#a855f7' : 'transparent', color: isUvMode ? '#fff' : subTextColor }}>☀️ UV</button>
                <button onClick={() => handleViewModeChange('rain')} style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: isRainMode ? '#3b82f6' : 'transparent', color: isRainMode ? '#fff' : subTextColor }}>🌧️ ฝน</button>
                <button onClick={() => handleViewModeChange('wind')} style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: isWindMode ? '#475569' : 'transparent', color: isWindMode ? '#fff' : subTextColor }}>🌬️ ลม</button>
                <div style={{ width: '2px', backgroundColor: borderColor, margin: '0 4px' }}></div>
                <button onClick={toggleRadar} style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: showRadar ? '#ef4444' : 'transparent', color: showRadar ? '#fff' : subTextColor }}>{showRadar ? '📡 ปิดเรดาร์' : '📡 เรดาร์ฝน'}</button>
              </div>

              <div style={{ position: 'absolute', bottom: '25px', right: '70px', zIndex: 500, background: darkMode ? 'rgba(30,41,59,0.85)' : 'rgba(255,255,255,0.85)', padding: '6px 14px', borderRadius: '20px', fontSize: '0.75rem', color: subTextColor, backdropFilter: 'blur(4px)', border: `1px solid ${borderColor}`, pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <span style={{ fontSize: '1rem' }}>⏱️</span> อัปเดต: {lastUpdateText || 'กำลังโหลด...'}
              </div>

              <button onClick={handleFindNearest} disabled={locating} style={{ position: 'absolute', bottom: '25px', right: '15px', zIndex: 500, width: '44px', height: '44px', borderRadius: '50%', backgroundColor: cardBg, color: textColor, border: `1px solid ${borderColor}`, cursor: locating ? 'wait' : 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>{locating ? '⏳' : '🎯'}</button>

              {!showRadar && (
                <div style={{ position: 'absolute', bottom: '25px', left: window.innerWidth < 768 ? '15px' : '60px', zIndex: 500, background: darkMode ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.95)', padding: '12px', borderRadius: '10px', border: `1px solid ${borderColor}` }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: textColor }}>{legendData[viewMode].title}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {legendData[viewMode].items.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ width: '14px', height: '14px', backgroundColor: item.color, borderRadius: '50%' }}></span><span style={{ fontSize: '0.8rem', color: subTextColor }}>{item.label}</span></div>
                    ))}
                  </div>
                </div>
              )}

              <MapContainer center={[13.5, 101.0]} zoom={6} style={{ height: '100%', width: '100%', zIndex: 1, backgroundColor: darkMode ? '#1a202c' : '#bae6fd' }}>
                <LayersControl position="bottomleft">
                  <LayersControl.BaseLayer checked name="🗺️ แผนที่ปกติ (Default)">
                    <TileLayer url={darkMode ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"} />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name="🛰️ ภาพดาวเทียม (Satellite)">
                    <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                  </LayersControl.BaseLayer>
                </LayersControl>
                {showRadar && radarTime && <TileLayer url={`https://tilecache.rainviewer.com/v2/radar/${radarTime}/256/{z}/{x}/{y}/2/1_1.png`} opacity={0.65} zIndex={10} maxNativeZoom={12} />}
                <FitBounds stations={filteredStations} activeStation={activeStation} selectedProvince={selectedProvince} />
                <FlyToActiveStation activeStation={activeStation} />
                <RadarMapHandler showRadar={showRadar} />
                {!showRadar && filteredStations.map((station) => {
                  const pmVal = Number(station.AQILast?.PM25?.value); const tObj = stationTemps[station.stationID];
                  let mVal = null;
                  if(isPm25Mode) mVal=pmVal; else if(isTempMode) mVal=tObj?.temp; else if(isHeatMode) mVal=tObj?.feelsLike; else if(isUvMode) mVal=tObj?.uvMax; else if(isRainMode) mVal=tObj?.rainProb; else if(isWindMode) mVal=tObj?.windSpeed;
                  return (
                    <Marker key={station.stationID} position={[parseFloat(station.lat), parseFloat(station.long)]} icon={createCustomMarker(viewMode, mVal, tObj)} ref={el => markerRefs.current[station.stationID]=el} eventHandlers={{ click: () => setActiveStation(station) }}>
                      <Popup minWidth={260}>
                        <div style={{ textAlign: 'center', fontFamily: 'Kanit', color: '#1e293b' }}>
                          <strong>{station.nameTH}</strong>
                          <div style={{ margin: '10px 0', padding: '10px', background: '#f8f9fa', borderRadius: '8px' }}>
                            <span style={{ fontSize: '1.2rem', color: getPM25Color(pmVal)==='#ffff00'?'#d4b500':getPM25Color(pmVal), fontWeight: 'bold' }}>PM2.5: {isNaN(pmVal)?'-':pmVal} µg/m³</span>
                            <div style={{ fontSize: '0.85rem', color: '#666' }}>(AQI: {station.AQILast?.AQI?.aqi||'-'})</div>
                          </div>
                          {tObj && (
                            <div style={{ padding: '12px', background: '#f1f5f9', borderRadius: '8px', fontSize: '0.85rem', color: '#334155', fontWeight:'bold' }}>
                              <div style={{ marginBottom: '8px', fontSize: '1.1rem', color:'#1e293b' }}>{getWeatherIcon(tObj.weatherCode).icon} {getWeatherIcon(tObj.weatherCode).text}</div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', textAlign: 'left' }}>
                                <span>🌡️ {tObj.temp?.toFixed(1)||'-'}°C</span><span>🥵 {tObj.feelsLike?.toFixed(1)||'-'}°C</span>
                                <span style={{color:'#0ea5e9'}}>💧 {tObj.humidity||'-'}%</span><span style={{color:'#0ea5e9'}}>🌧️ {tObj.rainProb||'0'}%</span>
                                <span style={{color:'#a855f7'}}>☀️ UV: {tObj.uvMax||'-'}</span><span>🌬️ {tObj.windSpeed||'-'}</span>
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

            {/* SIDEBAR RIGHT LIST (ปรับบนมือถือให้เลื่อนได้อิสระ) */}
            <div style={{ flex: 3, minWidth: window.innerWidth < 768 ? '100%' : '380px', maxWidth: window.innerWidth < 768 ? '100%' : '450px', backgroundColor: cardBg, borderRadius: '12px', display: 'flex', flexDirection: 'column', border: `1px solid ${borderColor}`, height: window.innerWidth < 768 ? 'auto' : 'calc(100vh - 120px)', maxHeight: window.innerWidth < 768 ? '50vh' : 'none' }}>
              <div style={{ padding: '15px', background: darkMode ? '#0f172a' : '#f0f9ff', borderBottom: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
                <h2 style={{ fontSize: '1rem', color: textColor, margin: 0, fontWeight: 'bold' }}>{activeChart.name} <span style={{fontSize:'0.85rem', color:subTextColor}}>({filteredStations.length} จุด)</span></h2>
                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={{ padding: '4px', borderRadius: '6px', backgroundColor: cardBg, color: textColor, outline:'none' }}>
                  <option value="desc">⬇️ มากไปน้อย</option><option value="asc">⬆️ น้อยไปมาก</option>
                </select>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
                {filteredStations.map((station) => {
                  const pmVal = Number(station.AQILast?.PM25?.value); const tObj = stationTemps[station.stationID];
                  const isActive = activeStation?.stationID === station.stationID;
                  let disp = '-', unit = '', boxBg = '#ccc';
                  if(isPm25Mode){ disp=isNaN(pmVal)?'-':pmVal; unit='µg/m³'; boxBg=getPM25Color(pmVal); }
                  else if(isTempMode){ disp=tObj?.temp!==undefined?tObj.temp.toFixed(1):'-'; unit='°C'; boxBg=getTempColor(tObj?.temp).bar; }
                  else if(isHeatMode){ disp=tObj?.feelsLike!==undefined?tObj.feelsLike.toFixed(1):'-'; unit='°C'; boxBg=tObj?getHeatIndexAlert(tObj.feelsLike).bar:'#ccc'; }
                  else if(isUvMode){ disp=tObj?.uvMax!==undefined?tObj.uvMax:'-'; unit='UV'; boxBg=tObj?getUvColor(tObj.uvMax).bar:'#ccc'; }
                  else if(isRainMode){ disp=tObj?.rainProb!==undefined?`${tObj.rainProb}%`:'-'; unit='ตก'; boxBg=tObj?getRainColor(tObj.rainProb).bar:'#ccc'; }
                  else if(isWindMode){ disp=tObj?.windSpeed!==undefined?tObj.windSpeed:'-'; unit='km/h'; boxBg=tObj?getWindColor(tObj.windSpeed).bar:'#ccc'; }
                  let hAdv = isPm25Mode?getPM25HealthAdvice(pmVal):isHeatMode?getHeatHealthAdvice(tObj?.feelsLike):isUvMode?getUvHealthAdvice(tObj?.uvMax):null;

                  return (
                    <div key={station.stationID} ref={el=>cardRefs.current[station.stationID]=el} onClick={()=>setActiveStation(station)} style={{ display:'flex', flexDirection:'column', background:isActive?(darkMode?'#334155':'#f8fafc'):cardBg, border:isActive?'1px solid #3b82f6':`1px solid ${borderColor}`, borderLeft:`6px solid ${boxBg}`, borderRadius:'10px', padding:'15px', marginBottom:'15px', cursor:'pointer', boxShadow: isActive ? '0 4px 10px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.02)' }}>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <div style={{ flex:1 }}>
                          <h4 style={{ margin:'0 0 2px 0', color:textColor, fontSize:'1rem' }}>{station.nameTH}</h4>
                          <p style={{ margin:0, color:'#3b82f6', fontSize:'0.8rem', fontWeight:'bold' }}>{extractProvince(station.areaTH)}</p>
                          <div style={{ marginTop:'10px', fontSize:'0.85rem', color:subTextColor, fontWeight:'bold' }}>
                            {isPm25Mode ? `AQI: ${station.AQILast?.AQI?.aqi||'--'}` : tObj ? (isUvMode?`ระดับ: ${getUvColor(tObj?.uvMax).label}`:isRainMode?`💧 ชื้น: ${tObj.humidity}%`:isWindMode?`ลมสูงสุด: ${tObj.windMax} km/h`:`ต่ำ ${tObj.tempMin?.toFixed(1)}° | สูง ${tObj.tempMax?.toFixed(1)}°`) : 'ไม่มีข้อมูล'}
                          </div>
                        </div>
                        <div style={{ backgroundColor:boxBg, color:(isPm25Mode && pmVal>25&&pmVal<=37.5) || (isUvMode&&tObj?.uvMax<=5)?'#1e293b':'#fff', width:'60px', height:'60px', borderRadius:'12px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                          <span style={{ fontSize:'1.3rem', fontWeight:'bold' }}>{disp}</span><span style={{ fontSize:'0.65rem', fontWeight:'bold' }}>{unit}</span>
                        </div>
                      </div>
                      
                      {hAdv && (isActive || ['🚨','🚑','⛔'].includes(hAdv.icon)) && (
                        <div style={{ marginTop:'12px', padding:'10px', background:darkMode?'#1e293b':'#f8fafc', borderRadius:'8px', display:'flex', gap:'8px', border: `1px dashed ${boxBg}` }}><span>{hAdv.icon}</span><span style={{fontSize:'0.8rem',color:textColor}}>{hAdv.text}</span></div>
                      )}

                      {/* MINI CHARTS */}
                      {isActive && (
                        <div style={{ borderTop:`1px solid ${borderColor}`, marginTop:'15px', paddingTop:'15px' }}>
                          {activeWeather ? (() => {
                            if (isTempMode) {
                              return (
                                <div>
                                  <h5 style={{ fontSize:'0.85rem', fontWeight:'bold', color:subTextColor, marginBottom:'10px' }}>📈 คาดการณ์อุณหภูมิ 7 วัน (ต่ำสุด - สูงสุด)</h5>
                                  <div style={{ height:'110px', display:'flex', alignItems:'flex-end', gap:'6px' }}>
                                    {activeWeather.tempForecast.map((d,i)=>{
                                      const globalMax = Math.max(...activeWeather.tempForecast.map(x=>x.val)) + 1;
                                      const globalMin = Math.min(...activeWeather.tempForecast.map(x=>x.minVal)) - 1;
                                      const range = globalMax - globalMin || 1;
                                      const bottomP = Math.max(0, ((d.minVal - globalMin) / range) * 100);
                                      const heightP = Math.max(8, ((d.val - d.minVal) / range) * 100);

                                      return (
                                        <div key={i} style={{flex:1, height:'100%', display:'flex', flexDirection:'column', justifyContent:'flex-end', alignItems:'center'}}>
                                          <span style={{fontSize:'10px', color:textColor, fontWeight:'bold', marginBottom:'4px'}}>{d.val}°</span>
                                          <div style={{width:'8px', flex:1, position:'relative', backgroundColor: darkMode?'#334155':'#e2e8f0', borderRadius:'4px', margin:'2px 0'}}>
                                            <div style={{position:'absolute', bottom:`${bottomP}%`, height:`${heightP}%`, width:'100%', backgroundColor:d.colorInfo.bar, borderRadius:'4px', backgroundImage: `linear-gradient(to top, #60a5fa, ${d.colorInfo.bar})`}}></div>
                                          </div>
                                          <span style={{fontSize:'10px', color:'#3b82f6', fontWeight:'bold', marginTop:'4px'}}>{d.minVal}°</span>
                                          <span style={{fontSize:'10px', color:i<=1?'#0ea5e9':subTextColor, marginTop:'4px'}}>{d.time}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            } else if (isPm25Mode) {
                               return (
                                <div>
                                  <h5 style={{ fontSize:'0.85rem', fontWeight:'bold', color:subTextColor, marginBottom:'10px' }}>📈 แนวโน้ม PM2.5 ล่วงหน้า 72 ชม.</h5>
                                  <div style={{ height:'100px', display:'flex', alignItems:'flex-end', gap:'3px' }}>
                                    {activeForecast ? activeForecast.map((d,i)=>{
                                      const maxVal = Math.max(...activeForecast.map(x=>x.val)) || 1;
                                      const h = Math.max((d.val / maxVal) * 100, 5); 
                                      return (
                                        <div key={i} style={{flex:1, height:'100%', display:'flex', flexDirection:'column', justifyContent:'flex-end', alignItems:'center'}}>
                                          <span style={{fontSize:'9px', color:subTextColor, fontWeight:'bold', marginBottom:'4px'}}>{d.val}</span>
                                          <div style={{width:'100%', flex:1, display:'flex', alignItems:'flex-end'}}>
                                            <div style={{width:'100%', height:`${h}%`, backgroundColor:d.color, borderRadius:'3px 3px 0 0'}}></div>
                                          </div>
                                          <span style={{fontSize:'8px', color:subTextColor, marginTop:'4px', height:'12px'}}>{i%3===0?d.time:''}</span>
                                        </div>
                                      );
                                    }) : <div style={{width:'100%',textAlign:'center',color:subTextColor,fontSize:'0.8rem'}}>กำลังโหลด...</div>}
                                  </div>
                                </div>
                              );
                            }

                            let fData = isHeatMode?activeWeather.heatForecast:isUvMode?activeWeather.uvForecast:isRainMode?activeWeather.rainForecast:isWindMode?activeWeather.windForecast:[];
                            fData = fData.filter(d => d.val !== null && !isNaN(d.val)); 
                            if(fData.length === 0) return null;
                            
                            return (
                              <div>
                                <h5 style={{ fontSize:'0.85rem', fontWeight:'bold', color:subTextColor, marginBottom:'10px' }}>📈 คาดการณ์ {fData.length} วัน</h5>
                                <div style={{ height:'100px', display:'flex', alignItems:'flex-end', gap:'6px' }}>
                                  {fData.map((d,i)=>{
                                    const maxVal = Math.max(...fData.map(x=>x.val)) + (isRainMode?10:5) || 1;
                                    const h = Math.max((d.val / maxVal) * 100, 5);
                                    return (
                                      <div key={i} style={{flex:1, height:'100%', display:'flex', flexDirection:'column', justifyContent:'flex-end', alignItems:'center'}}>
                                        <span style={{fontSize:'10px', color:d.colorInfo.color||subTextColor, fontWeight:'bold', marginBottom:'4px'}}>{d.val}</span>
                                        <div style={{width:'100%', flex:1, display:'flex', alignItems:'flex-end'}}>
                                          <div style={{width:'100%', height:`${h}%`, backgroundColor:d.colorInfo.bar, borderRadius:'3px 3px 0 0'}}></div>
                                        </div>
                                        <span style={{fontSize:'10px', color:i<=1?'#0ea5e9':subTextColor, marginTop:'4px'}}>{d.time}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })() : <div style={{width:'100%',textAlign:'center',color:subTextColor,fontSize:'0.8rem'}}>กำลังโหลด...</div>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 🚀 DASHBOARD BOTTOM (แบบพับเก็บได้ เพื่อประหยัดพื้นที่มือถือ) */}
          <div style={{ padding: '15px' }}>
            <div style={{ backgroundColor: cardBg, borderRadius: '12px', padding: '20px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              
              {/* ส่วนหัวที่กดพับ/กางได้ */}
              <div 
                onClick={() => setShowStats(!showStats)} 
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
              >
                <div>
                  <h2 style={{ fontSize: '1.3rem', color: textColor, margin: '0 0 5px 0', fontWeight:'bold' }}>📊 ข้อมูลเชิงลึก: {activeChart.name}</h2>
                  <p style={{ margin: 0, color: subTextColor, fontSize: '0.9rem' }}>พื้นที่วิเคราะห์: <strong style={{color: '#0ea5e9'}}>{dashTitle}</strong></p>
                </div>
                <div style={{ padding: '8px 15px', backgroundColor: darkMode ? '#334155' : '#f1f5f9', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 'bold', color: textColor }}>
                  {showStats ? '🔼 ซ่อนสถิติ' : '🔽 ดูกราฟสถิติ'}
                </div>
              </div>
              
              {/* ส่วนกราฟที่จะแสดงเมื่อ showStats เป็น true */}
              {showStats && (
                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: `1px solid ${borderColor}` }}>
                  {dashLoading ? <div style={{ textAlign:'center', color:subTextColor, padding:'50px' }}>⏳ กำลังประมวลผลข้อมูลดาวเทียม...</div> : dashHistory.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 1024 ? '1fr' : '1fr 1fr', gap: '20px' }}>
                      <div style={{ background: darkMode?'#0f172a':'#f8fafc', padding: '15px', borderRadius: '10px', border: `1px solid ${borderColor}` }}>
                        <h3 style={{ fontSize: '1rem', color: textColor, textAlign: 'center', fontWeight:'bold' }}>⏳ ย้อนหลัง 14 วัน</h3>
                        <div style={{ height: '220px', marginTop:'15px' }}>
                          <ResponsiveContainer>
                            {activeChart.type === 'bar' ? (
                              <BarChart data={dashHistory} margin={{ top:5, right:10, bottom:5, left:-20 }}><CartesianGrid strokeDasharray="3 3" stroke={borderColor} /><XAxis dataKey="date" stroke={subTextColor} fontSize={10} /><YAxis stroke={subTextColor} fontSize={10} /><Tooltip /><Bar dataKey={activeChart.key} fill={activeChart.color} radius={[4,4,0,0]} />{activeChart.hasLY && <Bar dataKey={activeChart.keyLY} fill="#94a3b8" radius={[4,4,0,0]} />}</BarChart>
                            ) : activeChart.type === 'area' ? (
                              <AreaChart data={dashHistory} margin={{ top:5, right:10, bottom:5, left:-20 }}><CartesianGrid strokeDasharray="3 3" stroke={borderColor} /><XAxis dataKey="date" stroke={subTextColor} fontSize={10} /><YAxis stroke={subTextColor} fontSize={10} /><Tooltip /><Area type="monotone" dataKey={activeChart.key} stroke={activeChart.color} fill={activeChart.color} fillOpacity={0.4} strokeWidth={2} /></AreaChart>
                            ) : (
                              <LineChart data={dashHistory} margin={{ top:5, right:10, bottom:5, left:-20 }}><CartesianGrid strokeDasharray="3 3" stroke={borderColor} /><XAxis dataKey="date" stroke={subTextColor} fontSize={10} /><YAxis stroke={subTextColor} fontSize={10} /><Tooltip /><Line type="monotone" dataKey={activeChart.key} stroke={activeChart.color} strokeWidth={3} />{activeChart.hasLY && <Line type="monotone" dataKey={activeChart.keyLY} stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={2} />}</LineChart>
                            )}
                          </ResponsiveContainer>
                        </div>
                      </div>
                      <div style={{ background: darkMode?'#0f172a':'#f8fafc', padding: '15px', borderRadius: '10px', border: `1px solid ${borderColor}` }}>
                        <h3 style={{ fontSize: '1rem', color: textColor, textAlign: 'center', fontWeight:'bold' }}>🔮 พยากรณ์ล่วงหน้า {validForecast.length} วัน (Forecast)</h3>
                        <div style={{ height: '220px', marginTop:'15px' }}>
                          <ResponsiveContainer>
                            {activeChart.type === 'bar' ? (
                              <BarChart data={validForecast} margin={{ top:5, right:10, bottom:5, left:-20 }}><CartesianGrid strokeDasharray="3 3" stroke={borderColor} /><XAxis dataKey="date" stroke={subTextColor} fontSize={10} /><YAxis stroke={subTextColor} fontSize={10} /><Tooltip /><Bar dataKey={activeChart.key} fill={activeChart.color} radius={[4,4,0,0]} /></BarChart>
                            ) : (
                              <AreaChart data={validForecast} margin={{ top:5, right:10, bottom:5, left:-20 }}><CartesianGrid strokeDasharray="3 3" stroke={borderColor} /><XAxis dataKey="date" stroke={subTextColor} fontSize={10} /><YAxis stroke={subTextColor} fontSize={10} domain={['auto', 'auto']} /><Tooltip /><Area type="monotone" dataKey={activeChart.key} stroke={activeChart.color} fill={activeChart.color} fillOpacity={0.4} strokeWidth={3} /></AreaChart>
                            )}
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  ) : <div style={{ textAlign:'center', color:subTextColor, padding:'50px' }}>ไม่มีข้อมูลสถิติของพื้นที่นี้</div>}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        // ======================= ALERTS TAB =======================
        <div style={{ flex: 1, padding: '20px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h2 style={{ fontSize: '2rem', color: textColor, marginBottom: '10px', fontWeight:'bold' }}>🔔 ศูนย์พยากรณ์และแจ้งเตือนภัย</h2>
            <p style={{ color: subTextColor, fontSize:'1.1rem', marginBottom: '25px' }}>วิเคราะห์ข้อมูลเชิงลึก 24 ชั่วโมงข้างหน้า เพื่อให้คุณวางแผนชีวิตได้ง่ายขึ้น</p>
            <button onClick={handleScanLocation} disabled={alertsLoading} style={{ backgroundColor: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '30px', padding: '15px 30px', fontSize: '1.1rem', fontWeight: 'bold', cursor: alertsLoading?'wait':'pointer', boxShadow: '0 4px 15px rgba(14,165,233,0.4)', transition: '0.2s' }}>
              {alertsLoading ? '⏳ กำลังประมวลผลผ่านดาวเทียม...' : '📍 ตรวจสอบพิกัดปัจจุบัน'}
            </button>
            {alertsLocationName && !alertsLoading && <div style={{ marginTop: '20px', padding: '8px 15px', backgroundColor: darkMode?'#0f172a':'#f0f9ff', borderRadius: '20px', color: '#0ea5e9', fontWeight: 'bold', display:'inline-block' }}>พิกัดที่กำลังวิเคราะห์: {alertsLocationName}</div>}
          </div>

          {alertsLoading ? null : (alertsData.warnings.length > 0 || alertsData.normals.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '1fr 1fr', gap: '25px' }}>
              
              <div style={{ backgroundColor: cardBg, borderRadius: '16px', padding: '25px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: '1.3rem', color: '#ef4444', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: `2px solid #fecaca`, paddingBottom: '10px' }}>🚨 สิ่งที่ต้องเฝ้าระวัง</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {alertsData.warnings.length > 0 ? (
                    alertsData.warnings.map((al, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '15px', backgroundColor: darkMode?'#1e293b':'#fff', padding: '20px', borderRadius: '12px', borderLeft: `6px solid ${al.color}`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                        <div style={{ fontSize: '2.2rem', display:'flex', alignItems:'center' }}>{al.icon}</div>
                        <div><h4 style={{ margin: '0 0 5px 0', fontSize: '1.1rem', color: al.color, fontWeight:'bold' }}>{al.title}</h4><p style={{ margin: 0, color: textColor, lineHeight:1.5, fontSize:'0.9rem' }}>{al.desc}</p></div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '20px', borderRadius: '12px', backgroundColor: darkMode ? '#0f172a' : '#f0fdf4', color: '#16a34a', border: '1px dashed #22c55e', textAlign: 'center' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🎉</div>
                      <strong style={{ fontSize: '1.1rem' }}>ไม่มีเหตุการณ์รุนแรง</strong><br/><span style={{fontSize:'0.9rem'}}>ทุกอย่างใน 24 ชั่วโมงข้างหน้าอยู่ในเกณฑ์ปกติครับ</span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ backgroundColor: cardBg, borderRadius: '16px', padding: '25px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: '1.3rem', color: '#10b981', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: `2px solid #bbf7d0`, paddingBottom: '10px' }}>✅ สภาวะปลอดภัย</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {alertsData.normals.length > 0 ? (
                    alertsData.normals.map((al, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '15px', backgroundColor: darkMode?'#1e293b':'#f8fafc', padding: '15px', borderRadius: '12px', borderLeft: `4px solid ${al.color}` }}>
                        <div style={{ fontSize: '1.8rem', display:'flex', alignItems:'center' }}>{al.icon}</div>
                        <div><h4 style={{ margin: '0 0 5px 0', fontSize: '1rem', color: al.color, fontWeight:'bold' }}>{al.title}</h4><p style={{ margin: 0, color: subTextColor, lineHeight:1.4, fontSize:'0.85rem' }}>{al.desc}</p></div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '20px', borderRadius: '12px', backgroundColor: darkMode ? '#0f172a' : '#fef2f2', color: '#ef4444', border: '1px dashed #ef4444', textAlign: 'center' }}>
                      <span style={{fontSize:'0.9rem'}}>กรุณาระมัดระวังเป็นพิเศษในช่วงนี้</span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
}