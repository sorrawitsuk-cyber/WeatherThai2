import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './App.css';

// ==============================================================
// 1. ฟังก์ชันคำนวณสีและข้อความ
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

// 📍 ฐานข้อมูลภูมิภาคและจังหวัด
const regionMapping = {
  "ภาคเหนือ": ["เชียงใหม่", "เชียงราย", "แพร่", "น่าน", "พะเยา", "ลำปาง", "ลำพูน", "แม่ฮ่องสอน", "อุตรดิตถ์"],
  "ภาคตะวันออกเฉียงเหนือ": ["กาฬสินธุ์", "ขอนแก่น", "ชัยภูมิ", "นครพนม", "นครราชสีมา", "บึงกาฬ", "บุรีรัมย์", "มหาสารคาม", "มุกดาหาร", "ยโสธร", "ร้อยเอ็ด", "เลย", "สกลนคร", "สุรินทร์", "ศรีสะเกษ", "หนองคาย", "หนองบัวลำภู", "อุดรธานี", "อุบลราชธานี", "อำนาจเจริญ"],
  "ภาคกลาง": ["กรุงเทพมหานคร", "กำแพงเพชร", "ชัยนาท", "นครนายก", "นครปฐม", "นครสวรรค์", "นนทบุรี", "ปทุมธานี", "พระนครศรีอยุธยา", "พิจิตร", "พิษณุโลก", "เพชรบูรณ์", "ลพบุรี", "สมุทรปราการ", "สมุทรสงคราม", "สมุทรสาคร", "สิงห์บุรี", "สุโขทัย", "สุพรรณบุรี", "สระบุรี", "อ่างทอง", "อุทัยธานี"],
  "ภาคตะวันออก": ["จันทบุรี", "ฉะเชิงเทรา", "ชลบุรี", "ตราด", "ปราจีนบุรี", "ระยอง", "สระแก้ว"],
  "ภาคตะวันตก": ["กาญจนบุรี", "ตาก", "ประจวบคีรีขันธ์", "เพชรบุรี", "ราชบุรี"],
  "ภาคใต้": ["กระบี่", "ชุมพร", "ตรัง", "นครศรีธรรมราช", "นราธิวาส", "ปัตตานี", "พังงา", "พัทลุง", "ภูเก็ต", "ระนอง", "สตูล", "สงขลา", "สุราษฎร์ธานี", "ยะลา"]
};

const thaiProvinces = Object.values(regionMapping).flat();

const getRegion = (province) => {
  for (const [region, provinces] of Object.entries(regionMapping)) {
    if (provinces.includes(province)) return region;
  }
  return "อื่นๆ";
};

const extractProvince = (area) => { 
  if(!area) return 'ไม่ระบุ'; 
  if (area.includes('กรุงเทพ') || area.includes('กทม')) return 'กรุงเทพมหานคร';
  for (let i = 0; i < thaiProvinces.length; i++) {
    if (area.includes(thaiProvinces[i])) return thaiProvinces[i];
  }
  if (area.includes('เขต')) return 'กรุงเทพมหานคร';
  let p = area.includes(',') ? area.split(',').pop() : area.trim().split(/\s+/).pop(); 
  p = p.trim().replace(/^(จ\.|จังหวัด)/, '').trim();
  if (p.includes('จ.')) p = p.split('จ.').pop().trim();
  return p; 
};

const legendData = {
  pm25: { title: 'ระดับ PM2.5 (µg/m³)', items: [{color:'#00b0f0',label:'0-15.0 (ดีมาก)'},{color:'#92d050',label:'15.1-25.0 (ดี)'},{color:'#ffff00',label:'25.1-37.5 (ปานกลาง)'},{color:'#ffc000',label:'37.6-75.0 (เริ่มมีผลกระทบฯ)'},{color:'#ff0000',label:'> 75.0 (มีผลกระทบฯ)'}] },
  temp: { title: 'อุณหภูมิ (°C)', items: [{color:'#3498db',label:'< 27 (เย็นสบาย)'},{color:'#2ecc71',label:'27-32 (ปกติ)'},{color:'#f1c40f',label:'33-35 (ร้อน)'},{color:'#e67e22',label:'36-38 (ร้อนมาก)'},{color:'#e74c3c',label:'> 38 (ร้อนจัด)'}] },
  heat: { title: 'ดัชนีความร้อน (°C)', items: [{color:'#3b82f6',label:'< 27.0 (ปกติ)'},{color:'#22c55e',label:'27.0-32.9 (เฝ้าระวัง)'},{color:'#eab308',label:'33.0-41.9 (เตือนภัย)'},{color:'#f97316',label:'42.0-51.9 (อันตราย)'},{color:'#ef4444',label:'≥ 52.0 (อันตรายมาก)'}] },
  uv: { title: 'รังสี UV สูงสุดของวัน', items: [{color:'#2ecc71',label:'0-2 (ต่ำ)'},{color:'#f1c40f',label:'3-5 (ปานกลาง)'},{color:'#e67e22',label:'6-7 (สูง)'},{color:'#e74c3c',label:'8-10 (สูงมาก)'},{color:'#9b59b6',label:'> 10 (อันตราย)'}] },
  rain: { title: 'โอกาสเกิดฝน (%)', items: [{color:'#95a5a6',label:'0 (ไม่มีฝน)'},{color:'#74b9ff',label:'1-30 (โอกาสต่ำ)'},{color:'#0984e3',label:'31-60 (ปานกลาง)'},{color:'#273c75',label:'61-80 (โอกาสสูง)'},{color:'#192a56',label:'> 80 (ตกหนัก)'}] },
  wind: { title: 'ความเร็วลม (km/h)', items: [{color:'#00b0f0',label:'0-10 (ลมอ่อน)'},{color:'#2ecc71',label:'11-25 (ลมปานกลาง)'},{color:'#f1c40f',label:'26-40 (ลมแรง)'},{color:'#e67e22',label:'41-60 (ลมแรงมาก)'},{color:'#e74c3c',label:'> 60 (พายุ)'}] }
};

const chartConfigs = {
  pm25: { key: 'pm25', name: 'PM2.5', unit: 'µg/m³', color: '#f59e0b', hasLY: false, type: 'area' },
  temp: { key: 'temp', keyLY: 'tempLY', name: 'อุณหภูมิสูงสุด', unit: '°C', color: '#ef4444', hasLY: true, type: 'line' },
  heat: { key: 'heat', keyLY: 'heatLY', name: 'Heat Index สูงสุด', unit: '°C', color: '#ea580c', hasLY: true, type: 'line' },
  uv:   { key: 'uv', keyLY: null, name: 'รังสี UV สูงสุดของวัน', unit: 'UV', color: '#a855f7', hasLY: false, type: 'area' },
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
  else if (viewMode === 'temp') { const tInfo = getTempColor(value); bg = tInfo.bg; textColor = tInfo.text; displayValue = (value == null || isNaN(value)) ? '-' : Math.round(value); }
  else if (viewMode === 'heat') { const hInfo = getHeatIndexAlert(value); bg = value != null ? hInfo.bar : '#cccccc'; textColor = '#fff'; displayValue = (value == null || isNaN(value)) ? '-' : Math.round(value); }
  else if (viewMode === 'uv') { const uInfo = getUvColor(value); bg = value != null ? uInfo.bar : '#cccccc'; textColor = (value > 2 && value <= 5) ? '#222' : '#fff'; displayValue = (value == null || isNaN(value)) ? '-' : Math.round(value); }
  else if (viewMode === 'rain') { const rInfo = getRainColor(value); bg = value != null ? rInfo.bar : '#cccccc'; textColor = (value <= 30 && value > 0) ? '#222' : '#fff'; displayValue = (value == null || isNaN(value)) ? '-' : `${Math.round(value)}%`; }
  else if (viewMode === 'wind') { const wInfo = getWindColor(value); bg = value != null ? wInfo.bar : '#cccccc'; textColor = (value > 10 && value <= 40) ? '#222' : '#fff'; const dir = extraData?.windDir || 0; displayValue = value == null ? '-' : `<div style="display:flex; flex-direction:column; align-items:center; line-height:1;"><span style="transform: rotate(${dir}deg); font-size: 14px; margin-bottom: -1px; font-weight: bold;">↓</span><span style="font-size: 9px;">${Math.round(value)}</span></div>`; }

  return L.divIcon({ className: 'custom-div-icon', html: `<div style="background-color: ${bg}; width: 34px; height: 34px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.4); display: flex; justify-content: center; align-items: center; color: ${textColor}; font-weight: bold; font-size: ${fontSize}; font-family: 'Kanit', sans-serif; transition: all 0.3s ease;">${displayValue}</div>`, iconSize: [38, 38], iconAnchor: [19, 19] });
};

function FitBounds({ stations, activeStation, selectedProvince, selectedRegion }) {
  const map = useMap();
  useEffect(() => {
    if (activeStation) return; 
    if (stations && stations.length > 0) {
      if (!selectedProvince && !selectedRegion) { map.flyTo([13.5, 101.0], 6, { duration: 1.5 }); } 
      else { 
        const validStations = stations.filter(s => s.lat && s.long && !isNaN(parseFloat(s.lat)) && !isNaN(parseFloat(s.long)) && parseFloat(s.lat) !== 0);
        if (validStations.length > 0) {
          const bounds = L.latLngBounds(validStations.map(s => [parseFloat(s.lat), parseFloat(s.long)])); 
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
        }
      }
    }
  }, [stations, map, activeStation, selectedProvince, selectedRegion]);
  return null;
}

function FlyToActiveStation({ activeStation }) {
  const map = useMap();
  useEffect(() => { if (activeStation && !isNaN(parseFloat(activeStation.lat))) map.flyTo([parseFloat(activeStation.lat), parseFloat(activeStation.long)], 13, { duration: 1.5 }); }, [activeStation, map]);
  return null;
}

function RadarMapHandler({ showRadar }) {
  const map = useMap();
  useEffect(() => { if (showRadar && map.getZoom() > 8) map.flyTo([13.5, 101.0], 6, { duration: 1.2 }); }, [showRadar, map]);
  return null;
}

function MapFix() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => { map.invalidateSize(); }, 400);
    return () => clearTimeout(timer);
  }, [map]);
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
  const [stations, setStations] = useState([]); 
  const [filteredStations, setFilteredStations] = useState([]);
  
  const [provinces, setProvinces] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState('');
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

  const [currentPage, setCurrentPage] = useState(window.innerWidth < 768 ? 'alerts' : 'map'); 
  const [showStats, setShowStats] = useState(window.innerWidth >= 768);

  const [alertsData, setAlertsData] = useState({ urgent: [], daily: [] });
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsLocationName, setAlertsLocationName] = useState('');
  const [nationwideSummary, setNationwideSummary] = useState(null);

  // 🤖 State สำหรับ AI (อัปเดตเป็น JSON)
  const [aiSummaryJson, setAiSummaryJson] = useState(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const cardRefs = useRef({});
  const markerRefs = useRef({});

  const availableProvinces = selectedRegion ? provinces.filter(p => getRegion(p) === selectedRegion) : provinces;

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
    if(darkMode) document.body.classList.add('dark-theme');
    else document.body.classList.remove('dark-theme');
  }, [darkMode]);

  // ล้างค่า AI เวลาย้ายพื้นที่
  useEffect(() => { setAiSummaryJson(null); }, [alertsLocationName, activeStation]);

  const handleViewModeChange = (mode) => { 
    setViewMode(mode); setSortOrder(mode === 'temp' ? 'asc' : 'desc'); setShowRadar(false); setSelectedStationId(''); setActiveStation(null);
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

  const fetchOpenMeteoBulk = async (stationsList) => {
    try {
      let allWeather = {};
      const chunkSize = 50; 
      for (let i = 0; i < stationsList.length; i += chunkSize) {
        const chunk = stationsList.slice(i, i + chunkSize);
        if(chunk.length === 0) continue;
        const lats = chunk.map(s => s.lat).join(',');
        const lons = chunk.map(s => s.long).join(',');
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,uv_index_max,precipitation_probability_max,wind_speed_10m_max&timezone=Asia%2FBangkok`;
        
        const res = await fetch(url); const data = await res.json();
        const results = Array.isArray(data) ? data : [data];
        
        results.forEach((r, idx) => {
           if (r && r.current && r.daily) {
             allWeather[chunk[idx].stationID] = {
               temp: r.current.temperature_2m, feelsLike: r.current.apparent_temperature, humidity: r.current.relative_humidity_2m, windSpeed: r.current.wind_speed_10m, windDir: r.current.wind_direction_10m, weatherCode: r.current.weather_code, tempMin: r.daily.temperature_2m_min[0], tempMax: r.daily.temperature_2m_max[0], heatMin: r.daily.temperature_2m_min[0], heatMax: r.daily.apparent_temperature_max[0], uvMax: r.daily.uv_index_max[0], rainProb: r.daily.precipitation_probability_max[0], windMax: r.daily.wind_speed_10m_max[0]
             };
           }
        });
      }
      return allWeather;
    } catch (error) { console.error("Open-Meteo fetch error:", error); return {}; }
  };

  const fetchAirQuality = async (isBackgroundLoad = false) => {
    if (!isBackgroundLoad) setLoading(true);
    try {
      const PROJECT_ID = "thai-env-dashboard"; 
      const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/weatherData/latest?t=${new Date().getTime()}`;
      
      const firebaseRes = await fetch(url, { cache: 'no-store' }).then(res => res.json());
      const parsedData = JSON.parse(firebaseRes.fields.jsonData.stringValue);
      const stData = parsedData.stations || [];
      
      if (stData.length > 0) {
        const validStations = stData.filter(s => !isNaN(parseFloat(s.lat)) && !isNaN(parseFloat(s.long)) && parseFloat(s.lat) !== 0);
        const openMeteoData = await fetchOpenMeteoBulk(validStations);
        setStations(validStations);
        setProvinces([...new Set(validStations.map(s => extractProvince(s.areaTH)))].sort((a, b) => a.localeCompare(b, 'th')));
        setLastUpdateText(`${validStations[0]?.AQILast?.date || ''} เวลา ${validStations[0]?.AQILast?.time || ''} น.`);
        setStationTemps(openMeteoData); 
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
    if (stations.length === 0 || Object.keys(stationTemps).length === 0) return;
    let pm25Risks = []; let stormRisks = []; let heatRisks = [];
    stations.forEach(s => {
      const pm = Number(s.AQILast?.PM25?.value);
      if(pm >= 37.5) pm25Risks.push({ prov: extractProvince(s.areaTH), val: pm });
      const t = stationTemps[s.stationID];
      if(t) {
        if(t.rainProb >= 40 || t.windMax >= 30) stormRisks.push({ prov: extractProvince(s.areaTH), rain: t.rainProb, wind: t.windMax });
        if(t.heatMax >= 40) heatRisks.push({ prov: extractProvince(s.areaTH), val: t.heatMax });
      }
    });

    pm25Risks.sort((a,b)=>b.val - a.val); stormRisks.sort((a,b)=>Math.max(b.rain, b.wind) - Math.max(a.rain, a.wind)); heatRisks.sort((a,b)=>b.val - a.val);
    const uniquePm = []; const pmSet = new Set(); pm25Risks.forEach(item => { if(!pmSet.has(item.prov)){ pmSet.add(item.prov); uniquePm.push(item); }});
    const uniqueStorm = []; const stormSet = new Set(); stormRisks.forEach(item => { if(!stormSet.has(item.prov)){ stormSet.add(item.prov); uniqueStorm.push(item); }});
    const uniqueHeat = []; const heatSet = new Set(); heatRisks.forEach(item => { if(!heatSet.has(item.prov)){ heatSet.add(item.prov); uniqueHeat.push(item); }});

    setNationwideSummary({ pm25: uniquePm.slice(0, 5), storm: uniqueStorm.slice(0, 5), heat: uniqueHeat.slice(0, 5) });
  }, [stations, stationTemps]);

  useEffect(() => {
    let result = [...stations];
    if (selectedRegion) result = result.filter(s => getRegion(extractProvince(s.areaTH)) === selectedRegion);
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
      
      const validA = vA!=null && !isNaN(vA) && (viewMode==='rain'?true:vA!==0);
      const validB = vB!=null && !isNaN(vB) && (viewMode==='rain'?true:vB!==0);
      if (!validA && validB) return 1; if (validA && !validB) return -1; if (!validA && !validB) return 0;
      return sortOrder === 'desc' ? vB - vA : vA - vB;
    });
    setFilteredStations(result);
  }, [selectedRegion, selectedProvince, selectedStationId, stations, viewMode, sortOrder, stationTemps]);

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
              if(wData.daily.uv_index_max[i] != null){ uvF.push({ time: tLabel, val: Math.round(wData.daily.uv_index_max[i]||0), colorInfo: getUvColor(wData.daily.uv_index_max[i]) }); }
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
              if(aData.hourly.pm2_5[i] != null){
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
            temp: dW.daily.temperature_2m_max[i] ?? null, heat: dW.daily.apparent_temperature_max[i] ?? null,
            rain: dW.daily.precipitation_sum[i] ?? null, wind: dW.daily.wind_speed_10m_max[i] ?? null,
            uv: dW.daily.uv_index_max ? (dW.daily.uv_index_max[i] ?? null) : null, pm25: avgPm
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
      if (activeStation) fetchDashboardData(activeStation.lat, activeStation.long, `พื้นที่: ${activeStation.nameTH}`);
      else if (selectedProvince) {
        const pStat = stations.filter(s => extractProvince(s.areaTH) === selectedProvince);
        if (pStat.length > 0) fetchDashboardData(pStat.reduce((a,b)=>a+parseFloat(b.lat),0)/pStat.length, pStat.reduce((a,b)=>a+parseFloat(b.long),0)/pStat.length, `ค่าเฉลี่ย จ.${selectedProvince}`);
      } else if (stations.length > 0) {
        fetchDashboardData(13.75, 100.5, 'ภาพรวมประเทศ (อ้างอิงตอนกลาง)');
      }
    }
  }, [activeStation, selectedProvince, stations, currentPage]);

  const handleReset = () => { setSelectedRegion(''); setSelectedProvince(''); setSelectedStationId(''); setActiveStation(null); setShowRadar(false); setCurrentPage('map'); window.scrollTo({top:0, behavior:'smooth'}); };
  
  const handleFindNearest = () => {
    if (!navigator.geolocation) return alert('ไม่รองรับ GPS'); setLocating(true);
    navigator.geolocation.getCurrentPosition((pos) => {
      let nearest = null; let minD = Infinity;
      stations.forEach(s => { const d = getDistanceFromLatLonInKm(pos.coords.latitude, pos.coords.longitude, parseFloat(s.lat), parseFloat(s.long)); if (d<minD){minD=d; nearest=s;} });
      if (nearest) { 
        const prov = extractProvince(nearest.areaTH);
        setSelectedRegion(getRegion(prov)); setSelectedProvince(prov); setSelectedStationId(nearest.stationID); 
        setActiveStation(nearest); setShowRadar(false); setCurrentPage('map'); window.scrollTo({top:0, behavior:'smooth'}); 
      }
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

      let urgent = []; let daily = []; const nIdx = new Date().getHours(); const fmt = (iso) => `${new Date(iso).getHours()}:00 น.`;

      // 1. วิเคราะห์ 3 ชม. ข้างหน้า
      let rain3hP = 0, rain3hV = 0, rain3hT = ''; let heat3h = 0, heat3hT = ''; let pm3h = 0, pm3hT = ''; let wind3h = 0, wind3hT = ''; let uv3h = 0, uv3hT = ''; 
      if(dW.hourly && dW.hourly.time && dA.hourly && dA.hourly.pm2_5) {
        for (let i=0; i<3; i++) {
          const idx = nIdx + i;
          if (dW.hourly.precipitation_probability[idx] > rain3hP) { rain3hP=dW.hourly.precipitation_probability[idx]; rain3hV=dW.hourly.precipitation[idx]; rain3hT=dW.hourly.time[idx]; }
          if (dW.hourly.apparent_temperature[idx] > heat3h) { heat3h=dW.hourly.apparent_temperature[idx]; heat3hT=dW.hourly.time[idx]; }
          if (dA.hourly.pm2_5[idx] > pm3h) { pm3h=dA.hourly.pm2_5[idx]; pm3hT=dA.hourly.time[idx]; }
          if (dW.hourly.wind_speed_10m[idx] > wind3h) { wind3h=dW.hourly.wind_speed_10m[idx]; wind3hT=dW.hourly.time[idx]; }
          if (dW.hourly.uv_index[idx] > uv3h) { uv3h=dW.hourly.uv_index[idx]; uv3hT=dW.hourly.time[idx]; } 
        }
      }

      if (rain3hP >= 30 || rain3hV > 0.1) { urgent.push({ icon:'🌧️', color:'#3b82f6', title:'ฝนกำลังจะตก!', desc:`โอกาสตก ${rain3hP}% ปริมาณ ${rain3hV.toFixed(1)}mm เวลาประมาณ ${fmt(rain3hT)}`, level: 2 }); }
      else { urgent.push({ icon:'🌤️', color:'#10b981', title:'โอกาสฝนตกต่ำ', desc:'ไม่มีแนวโน้มฝนตกใน 3 ชั่วโมงนี้ สามารถเดินทางได้ปกติ', level: 1 }); }

      if (heat3h >= 42) { urgent.push({ icon:'🔥', color:'#ef4444', title:'ร้อนจัดระวังฮีทสโตรก', desc:`ดัชนีความร้อนพุ่งถึง ${heat3h.toFixed(1)}°C (${fmt(heat3hT)}) ควรงดกิจกรรมกลางแจ้ง`, level: 3}); }
      else if (heat3h >= 33) { urgent.push({ icon:'🥵', color:'#f59e0b', title:'อากาศค่อนข้างร้อน', desc:`ดัชนีความร้อน ${heat3h.toFixed(1)}°C ควรดื่มน้ำบ่อยๆ`, level: 2}); }
      else { urgent.push({ icon:'😎', color:'#10b981', title:'อุณหภูมิปกติ', desc:`ดัชนีความร้อนสูงสุด ${heat3h.toFixed(1)}°C อากาศกำลังดี`, level: 1}); }

      if (pm3h >= 75) { urgent.push({ icon:'☠️', color:'#dc2626', title:'ฝุ่น PM2.5 ระดับอันตราย', desc:`ระดับฝุ่น ${pm3h.toFixed(1)} µg/m³ ควรงดออกนอกอาคารเด็ดขาด`, level: 3}); }
      else if (pm3h >= 37.5) { urgent.push({ icon:'😷', color:'#f59e0b', title:'ฝุ่น PM2.5 เริ่มหนาแน่น', desc:`ระดับฝุ่น ${pm3h.toFixed(1)} µg/m³ ควรสวมหน้ากาก N95`, level: 2}); }
      else { urgent.push({ icon:'🌿', color:'#10b981', title:'คุณภาพอากาศดี', desc:`ระดับฝุ่น ${pm3h.toFixed(1)} µg/m³ หายใจได้เต็มปอด`, level: 1}); }

      if (uv3h >= 8) { urgent.push({ icon:'🔆', color:'#a855f7', title:'รังสี UV แรงจัด', desc:`ดัชนี UV แตะระดับ ${uv3h} ควรหลีกเลี่ยงการออกแดดจัด`, level: 3}); }
      else if (uv3h >= 6) { urgent.push({ icon:'☀️', color:'#f59e0b', title:'รังสี UV ปานกลาง', desc:`ดัชนี UV ระดับ ${uv3h} ควรทากันแดดหรือกางร่ม`, level: 2}); }
      else { urgent.push({ icon:'🌙', color:'#10b981', title:'รังสี UV ต่ำ', desc:`ดัชนี UV ระดับ ${uv3h} ปลอดภัยต่อผิวหนัง`, level: 1}); }

      if (wind3h >= 40) { urgent.push({ icon:'🌪️', color:'#8b5cf6', title:'ลมกระโชกแรง', desc:`ความเร็วลม ${wind3h.toFixed(1)} km/h (${fmt(wind3hT)}) ระวังสิ่งของปลิว`, level: 2}); }
      urgent.sort((a, b) => b.level - a.level); // เรียงความเสี่ยงด่วนไว้บนสุด

      // 2. วิเคราะห์ 24 ชม.
      let rain24P = 0, rain24T = ''; let heat24 = 0, heat24T = ''; let pm24 = 0, pm24T = ''; let uv24 = 0, uv24T = '';
      if(dW.hourly && dW.hourly.time && dA.hourly && dA.hourly.pm2_5) {
        for (let i=0; i<24; i++) {
          const idx = nIdx + i;
          if (dW.hourly.precipitation_probability[idx] > rain24P) { rain24P=dW.hourly.precipitation_probability[idx]; rain24T=dW.hourly.time[idx]; }
          if (dW.hourly.apparent_temperature[idx] > heat24) { heat24=dW.hourly.apparent_temperature[idx]; heat24T=dW.hourly.time[idx]; }
          if (dA.hourly.pm2_5[idx] > pm24) { pm24=dA.hourly.pm2_5[idx]; pm24T=dA.hourly.time[idx]; }
          if (dW.hourly.uv_index[idx] > uv24) { uv24=dW.hourly.uv_index[idx]; uv24T=dW.hourly.time[idx]; }
        }
      }

      if (rain24P >= 40) daily.push({ icon:'🌦️', color:'#0ea5e9', title:`แนวโน้มฝนตก (${rain24P}%)`, desc:`คาดว่าจะมีฝนช่วง ${fmt(rain24T)} เผื่อเวลาเดินทางด้วยนะครับ`, level: 2 });
      else daily.push({ icon:'☀️', color:'#10b981', title:'โอกาสฝนตกต่ำ', desc:'วันนี้ท้องฟ้าโปร่ง โอกาสเกิดฝนมีน้อยมาก', level: 1 });

      if (heat24 >= 42) daily.push({ icon:'🔥', color:'#ef4444', title:'อากาศร้อนอันตราย', desc:`พุ่งสูงสุด ${heat24.toFixed(1)}°C ช่วง ${fmt(heat24T)}`, level: 3 });
      else daily.push({ icon:'😎', color:'#f59e0b', title:`อากาศร้อนปานกลาง`, desc:`อุณหภูมิสูงสุดช่วง ${fmt(heat24T)} รู้สึกเหมือน ${heat24.toFixed(1)}°C`, level: 2 });

      if (pm24 >= 50) daily.push({ icon:'🌫️', color:'#dc2626', title:'แนวโน้มฝุ่น PM2.5 สูง', desc:`จะหนาแน่นสุด ${pm24.toFixed(1)} µg/m³ ช่วง ${fmt(pm24T)}`, level: 3 });
      else if (pm24 >= 25) daily.push({ icon:'🤧', color:'#f59e0b', title:'แนวโน้มฝุ่น PM2.5 ปานกลาง', desc:`สูงสุด ${pm24.toFixed(1)} µg/m³ ช่วง ${fmt(pm24T)}`, level: 2 });
      else daily.push({ icon:'🌿', color:'#10b981', title:'คุณภาพอากาศดี', desc:`ฝุ่นสูงสุดในวันนี้เพียง ${pm24.toFixed(1)} µg/m³`, level: 1 });

      if (uv24 >= 8) daily.push({ icon:'🔆', color:'#a855f7', title:`รังสี UV อันตราย (ระดับ ${uv24})`, desc:`แดดแรงจัดช่วง ${fmt(uv24T)} ควรทากันแดด SPF50+`, level: 3 });
      else daily.push({ icon:'🌤️', color:'#10b981', title:`รังสี UV ปลอดภัย (ระดับ ${uv24})`, desc:`แดดไม่แรงมากในช่วง ${fmt(uv24T)} สามารถทำกิจกรรมกลางแจ้งได้`, level: 1 });
      daily.sort((a, b) => b.level - a.level);

      setAlertsData({ urgent, daily });
    } catch(e) { console.error("Alert err:", e); } finally { setAlertsLoading(false); }
  };

  const handleScanLocation = () => {
    if (!navigator.geolocation) return alert('ไม่รองรับ GPS');
    navigator.geolocation.getCurrentPosition((pos) => fetchAlertsData(pos.coords.latitude, pos.coords.longitude, '📍 พิกัดปัจจุบันของคุณ'), () => alert('ไม่อนุญาต GPS'));
  };

  useEffect(() => {
    if (currentPage==='alerts' && !alertsLocationName) {
      if(activeStation) fetchAlertsData(activeStation.lat, activeStation.long, `พื้นที่: ${activeStation.nameTH}`);
      else fetchAlertsData(13.75, 100.5, 'กรุงเทพมหานคร (เริ่มต้น)');
    }
  }, [currentPage, activeStation, alertsLocationName]);

  // 🤖 ฟังก์ชันให้ AI สรุปสภาพอากาศ (เวอร์ชันอัปเกรด JSON-to-UI)
  const generateAISummary = async (topic = 'general') => {
    setIsGeneratingAI(true);
    setAiSummaryJson(null); // ล้างข้อมูลเก่า
    try {
      const loc = alertsLocationName || "ประเทศไทย";
      let contextData = `พิกัด/พื้นที่: ${loc}\n\n[ข้อมูลพยากรณ์ด่วน 3 ชม.]\n`;
      alertsData.urgent.forEach(a => contextData += `- ${a.title}: ${a.desc}\n`);
      contextData += `\n[ข้อมูลภาพรวม 24 ชั่วโมง]\n`;
      alertsData.daily.forEach(a => contextData += `- ${a.title}: ${a.desc}\n`);

      //🧠 กำหนดคำสั่งวิเคราะห์ แต่ให้หลังบ้านบังคับ JSON
      let promptText = '';
      if (topic === 'general') {
        promptText = `คุณคือผู้ช่วยส่วนตัว สรุปภาพรวมสภาพอากาศจากข้อมูลต่อไปนี้ (เน้นความเสี่ยงช่วง 3 ชม.นี้) เป็น JSON วิเคราะห์หัวข้อ: 1.ภาพรวมสภาพอากาศ 2.ความปลอดภัยในการเดินทาง 3.สุขภาพ/ภูมิแพ้:\n\n${contextData}`;
      } else if (topic === 'lifestyle') {
        promptText = `คุณคือผู้ช่วยแม่บ้าน วิเคราะห์ข้อมูลสภาพอากาศต่อไปนี้ เป็น JSON เพื่อตอบโจทย์ชีวิตประจำวัน: 1.วันนี้เหมาะจะตากผ้าไหม? 2.เหมาะจะล้างรถไหม? 3.ควรเตรียมร่มก่อนออกจากบ้านไหม?:\n\n${contextData}`;
      } else if (topic === 'exercise') {
        promptText = `คุณคือเทรนเนอร์ฟิตเนส วิเคราะห์ข้อมูลต่อไปนี้ (PM2.5,อุณหภูมิ,UV) เป็น JSON เพื่อแนะนำ: 1.ออกกำลังกายกลางแจ้งได้ไหม? 2.ช่วงเวลาที่ดีที่สุดคือเมื่อไหร่? 3.สิ่งที่ควรระวังมากที่สุด:\n\n${contextData}`;
      } else if (topic === 'health') {
        promptText = `คุณคือแพทย์ผู้เชี่ยวชาญภูมิแพ้ วิเคราะห์ข้อมูลต่อไปนี้ เป็น JSON เพื่อให้คำแนะนำแพทย์: 1.ความปลอดภัยของระบบทางเดินหายใจวันนี้ 2.ชนิดหน้ากากที่ควรใส่ 3.การงดออกจากบ้าน:\n\n${contextData}`;
      }

      const response = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText, topic: topic }) 
      });
      
      const data = await response.json();
      if (data.jsonText) {
        // 🧩 Parse JSON ที่ได้มา ถ้าผิดพลาด ให้แสดง Error
        try {
          const parsedData = JSON.parse(data.jsonText);
          setAiSummaryJson(parsedData);
        } catch (e) {
          setAiSummaryJson([{ label: "Error", icon: "❌", status: "no", reason: "AI ส่งข้อมูลผิดรูปแบบ ลองกดปุ่มใหม่อีกครั้ง" }]);
        }
      } else {
        setAiSummaryJson([{ label: "No Summary", icon: "😶", status: "warning", reason: "AI ไม่สามารถสรุปได้ในขณะนี้" }]);
      }
    } catch (error) {
      console.error(error);
      setAiSummaryJson([{ label: "Server Error", icon: "🚑", status: "no", reason: "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์" }]);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  if (loading) return <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', fontSize:'1.5rem', color:'#555' }}>กำลังโหลด...</div>;

  const isPm25Mode = viewMode === 'pm25'; const isTempMode = viewMode === 'temp'; const isHeatMode = viewMode === 'heat';
  const isUvMode = viewMode === 'uv'; const isRainMode = viewMode === 'rain'; const isWindMode = viewMode === 'wind';
  const themeBg = darkMode ? '#0f172a' : '#f1f5f9'; const cardBg = darkMode ? '#1e293b' : '#ffffff';
  const textColor = darkMode ? '#f8fafc' : '#1e293b'; const subTextColor = darkMode ? '#94a3b8' : '#64748b';
  const borderColor = darkMode ? '#334155' : '#e2e8f0';
  const activeChart = chartConfigs[viewMode] || chartConfigs['pm25']; 

  const validForecast = dashForecast.filter(d => d[activeChart.key] != null);
  const todayDateText = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

  const currentHr = new Date().getHours();
  const next3Hr = (currentHr + 3) % 24;
  const timeStr3h = `${String(currentHr).padStart(2, '0')}:00 - ${String(next3Hr).padStart(2, '0')}:00 น.`;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', width:'100vw', backgroundColor:themeBg, fontFamily:"'Kanit', sans-serif", overflowY:'auto', overflowX:'hidden' }}>
      
      {/* HEADER */}
      <header style={{ flexShrink: 0, minHeight: '65px', background: darkMode ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' : '#1da1f2', color: '#fff', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '15px', flexWrap: 'nowrap', overflowX: 'auto' }} className="hide-scrollbar">
        
        {/* โซนด้านซ้าย (โลโก้ + ชื่อแอป) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <div style={{ fontSize: '1.8rem', background: '#fff', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.15)' }}>
            {darkMode ? '🌙' : '🌤️'}
          </div>
          <div style={{ display: window.innerWidth < 1024 ? 'none' : 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 'bold', whiteSpace: 'nowrap', lineHeight: '1.1', textShadow: '1px 1px 2px rgba(0,0,0,0.1)' }}>Thai Env Dashboard</h1>
            <span style={{ fontSize: '0.8rem', color: darkMode ? '#94a3b8' : '#e0f2fe', whiteSpace: 'nowrap', fontWeight: 'normal' }}>ระบบพยากรณ์และเตือนภัย</span>
          </div>
        </div>

        {/* ตรงกลาง: ตัวกรอง + ปุ่ม Home (แสดงเฉพาะหน้าแผนที่) */}
        {currentPage === 'map' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0, maxWidth: window.innerWidth >= 768 ? '65%' : '100%' }}>
            <div className="hide-scrollbar" style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(255,255,255,0.15)', padding: '5px 12px', borderRadius: '30px', overflowX: 'auto', whiteSpace: 'nowrap', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>📍</label>
                <select value={selectedRegion} onChange={(e) => { setSelectedRegion(e.target.value); setSelectedProvince(''); setSelectedStationId(''); setActiveStation(null); setShowRadar(false); }} style={{ padding: '5px 10px', borderRadius: '15px', border: 'none', backgroundColor: '#fff', color: '#1e293b', outline: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <option value="">ทุกภูมิภาค</option>
                  {Object.keys(regionMapping).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div style={{ width: '1px', height: '15px', backgroundColor: 'rgba(255,255,255,0.3)' }}></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>🗺️</label>
                <select value={selectedProvince} onChange={(e) => { setSelectedProvince(e.target.value); setSelectedStationId(''); setActiveStation(null); setShowRadar(false); }} style={{ padding: '5px 10px', borderRadius: '15px', border: 'none', backgroundColor: '#fff', color: '#1e293b', outline: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <option value="">ทุกจังหวัด</option>{availableProvinces.map(p => (<option key={p} value={p}>{p}</option>))}
                </select>
              </div>
              <div style={{ width: '1px', height: '15px', backgroundColor: 'rgba(255,255,255,0.3)' }}></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>📌</label>
                <select value={selectedStationId} onChange={(e) => { setSelectedStationId(e.target.value); const stat = filteredStations.find(s => s.stationID === e.target.value); if(stat) {setActiveStation(stat); setShowRadar(false);} }} style={{ width: '100%', minWidth: '150px', padding: '5px 10px', borderRadius: '15px', border: 'none', backgroundColor: '#fff', color: '#1e293b', outline: 'none', cursor: 'pointer', fontSize: '0.85rem', textOverflow: 'ellipsis' }}>
                  <option value="">-- เลือกสถานี --</option>
                  {filteredStations.slice().sort((a, b) => a.nameTH.localeCompare(b.nameTH, 'th')).map(s => (<option key={s.stationID} value={s.stationID}>{s.nameTH}</option>))}
                </select>
              </div>
            </div>
            <button onClick={handleReset} title="รีเซ็ตแผนที่ / กลับหน้าแรก" style={{ flexShrink: 0, backgroundColor: '#fff', border: 'none', borderRadius: '50%', width: '38px', height: '38px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.15)', fontSize: '1.2rem', color: '#0ea5e9' }}>🏠</button>
          </div>
        )}

        {/* โซนด้านขวา (ปุ่มเมนูสลับหน้า + Dark Mode) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, marginLeft: 'auto' }}>
          <div style={{ display: 'flex', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '25px', padding: '4px' }}>
            <button onClick={() => { setCurrentPage('map'); window.scrollTo({top:0, behavior:'smooth'}); }} style={{ padding: '5px 14px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem', backgroundColor: currentPage === 'map' ? '#fff' : 'transparent', color: currentPage === 'map' ? '#0ea5e9' : '#fff' }}>🗺️ แผนที่</button>
            <button onClick={() => { setCurrentPage('alerts'); window.scrollTo({top:0, behavior:'smooth'}); }} style={{ padding: '5px 14px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem', backgroundColor: currentPage === 'alerts' ? '#fff' : 'transparent', color: currentPage === 'alerts' ? '#0ea5e9' : '#fff' }}>🔔 แจ้งเตือน</button>
          </div>
          <button onClick={() => setDarkMode(!darkMode)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{darkMode ? '☀️' : '🌙'}</button>
        </div>
      </header>

      {/* BODY CONTENT */}
      {currentPage === 'map' ? (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ display: 'flex', gap: '15px', flexDirection: window.innerWidth < 768 ? 'column' : 'row', padding: '15px' }}>
            
            {/* MAP AREA */}
            <div style={{ flex: 7, width: '100%', minHeight: window.innerWidth < 768 ? '500px' : 'auto', borderRadius: '12px', overflow: 'hidden', position: 'relative', border: `1px solid ${borderColor}`, height: window.innerWidth < 768 ? '60vh' : 'calc(100vh - 120px)' }}>
              
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

              <div style={{ position: 'absolute', bottom: '25px', right: '70px', zIndex: 500, background: darkMode ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.95)', padding: '6px 14px', borderRadius: '20px', fontSize: '0.75rem', color: subTextColor, backdropFilter: 'blur(4px)', border: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <span style={{ fontSize: '1rem' }}>⏱️</span> อัปเดต: {lastUpdateText || 'กำลังโหลด...'}
                <button onClick={() => fetchAirQuality(false)} style={{ background: 'none', border: 'none', padding: '0 0 0 4px', cursor: 'pointer', fontSize: '1rem', color: '#0ea5e9' }} title="โหลดข้อมูลล่าสุดเดี๋ยวนี้">🔄</button>
              </div>

              {/* 🎯 ปุ่ม Crosshair ค้นหาพิกัด */}
              <button onClick={handleFindNearest} disabled={locating} title="ตำแหน่งปัจจุบันของฉัน" style={{ position: 'absolute', bottom: '25px', right: '15px', zIndex: 500, width: '44px', height: '44px', borderRadius: '50%', backgroundColor: cardBg, color: locating ? subTextColor : '#0ea5e9', border: `1px solid ${borderColor}`, cursor: locating ? 'wait' : 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'all 0.2s' }}>
                {locating ? ( <span style={{ fontSize: '1.2rem' }}>⏳</span> ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="6"></circle><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line></svg>
                )}
              </button>

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
                
                <MapFix /> 
                <FitBounds stations={filteredStations} activeStation={activeStation} selectedProvince={selectedProvince} selectedRegion={selectedRegion} />
                <FlyToActiveStation activeStation={activeStation} />
                <RadarMapHandler showRadar={showRadar} />
                
                {/* หมุดจังหวัดอื่นๆ ทั่วประเทศ */}
                {!showRadar && filteredStations.filter(s => extractProvince(s.areaTH) !== 'กรุงเทพมหานคร').map((station) => {
                  const lat = parseFloat(station.lat); const lon = parseFloat(station.long); if (isNaN(lat) || isNaN(lon)) return null;
                  const pmVal = Number(station.AQILast?.PM25?.value); const tObj = stationTemps[station.stationID];
                  let mVal = null;
                  if(isPm25Mode) mVal=pmVal; else if(isTempMode) mVal=tObj?.temp; else if(isHeatMode) mVal=tObj?.feelsLike; else if(isUvMode) mVal=tObj?.uvMax; else if(isRainMode) mVal=tObj?.rainProb; else if(isWindMode) mVal=tObj?.windSpeed;
                  return (
                    <Marker key={station.stationID} position={[lat, lon]} icon={createCustomMarker(viewMode, mVal, tObj)} ref={el => markerRefs.current[station.stationID]=el} eventHandlers={{ click: () => setActiveStation(station) }}>
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
                                <span>🌡️ {tObj.temp != null ? Number(tObj.temp).toFixed(1) : '-'}°C</span><span>🥵 {tObj.feelsLike != null ? Number(tObj.feelsLike).toFixed(1) : '-'}°C</span>
                                <span style={{color:'#0ea5e9'}}>💧 {tObj.humidity||'-'}%</span><span style={{color:'#0ea5e9'}}>🌧️ {tObj.rainProb||'0'}%</span>
                                <span style={{color:'#a855f7'}}>☀️ UV สูงสุด: {tObj.uvMax||'-'}</span><span>🌬️ {tObj.windSpeed||'-'}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

                {/* หมุดเฉพาะ "กรุงเทพมหานคร" จัดกลุ่มด้วย Cluster */}
                {!showRadar && (
                  <MarkerClusterGroup chunkedLoading maxClusterRadius={45} disableClusteringAtZoom={11} spiderfyOnMaxZoom={true}>
                    {filteredStations.filter(s => extractProvince(s.areaTH) === 'กรุงเทพมหานคร').map((station) => {
                      const lat = parseFloat(station.lat); const lon = parseFloat(station.long); if (isNaN(lat) || isNaN(lon)) return null;
                      const pmVal = Number(station.AQILast?.PM25?.value); const tObj = stationTemps[station.stationID];
                      let mVal = null;
                      if(isPm25Mode) mVal=pmVal; else if(isTempMode) mVal=tObj?.temp; else if(isHeatMode) mVal=tObj?.feelsLike; else if(isUvMode) mVal=tObj?.uvMax; else if(isRainMode) mVal=tObj?.rainProb; else if(isWindMode) mVal=tObj?.windSpeed;
                      return (
                        <Marker key={station.stationID} position={[lat, lon]} icon={createCustomMarker(viewMode, mVal, tObj)} ref={el => markerRefs.current[station.stationID]=el} eventHandlers={{ click: () => setActiveStation(station) }}>
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
                                    <span>🌡️ {tObj.temp != null ? Number(tObj.temp).toFixed(1) : '-'}°C</span><span>🥵 {tObj.feelsLike != null ? Number(tObj.feelsLike).toFixed(1) : '-'}°C</span>
                                    <span style={{color:'#0ea5e9'}}>💧 {tObj.humidity||'-'}%</span><span style={{color:'#0ea5e9'}}>🌧️ {tObj.rainProb||'0'}%</span>
                                    <span style={{color:'#a855f7'}}>☀️ UV สูงสุด: {tObj.uvMax||'-'}</span><span>🌬️ {tObj.windSpeed||'-'}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}
                  </MarkerClusterGroup>
                )}
              </MapContainer>
            </div>

            {/* SIDEBAR RIGHT LIST */}
            <div style={{ flex: 3, minWidth: window.innerWidth < 768 ? '100%' : '380px', maxWidth: window.innerWidth < 768 ? '100%' : '450px', backgroundColor: cardBg, borderRadius: '12px', display: 'flex', flexDirection: 'column', border: `1px solid ${borderColor}`, height: window.innerWidth < 768 ? 'auto' : 'calc(100vh - 120px)', maxHeight: window.innerWidth < 768 ? '50vh' : 'none' }}>
              <div style={{ padding: '15px', background: darkMode ? '#0f172a' : '#f0f9ff', borderBottom: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
                <h2 style={{ fontSize: '1rem', color: textColor, margin: 0, fontWeight: 'bold' }}>{activeChart.name} <span style={{fontSize:'0.85rem', color:subTextColor}}>({filteredStations.length} จุด)</span></h2>
                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={{ padding: '4px', borderRadius: '6px', backgroundColor: cardBg, color: textColor, outline:'none' }}>
                  <option value="desc">⬇️ มากไปน้อย</option><option value="asc">⬆️ น้อยไปมาก</option>
                </select>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
                {filteredStations.map((station) => {
                  const pmVal = Number(station.AQILast?.PM25?.value); 
                  const tObj = stationTemps[station.stationID];
                  const isActive = activeStation?.stationID === station.stationID;
                  
                  let disp = '-', unit = '', boxBg = '#ccc';
                  if(isPm25Mode){ disp=isNaN(pmVal)?'-':pmVal; unit='µg/m³'; boxBg=getPM25Color(pmVal); }
                  else if(isTempMode){ disp=tObj?.temp!=null?Number(tObj.temp).toFixed(1):'-'; unit='°C'; boxBg=getTempColor(tObj?.temp).bar; }
                  else if(isHeatMode){ disp=tObj?.feelsLike!=null?Number(tObj.feelsLike).toFixed(1):'-'; unit='°C'; boxBg=tObj?getHeatIndexAlert(tObj.feelsLike).bar:'#ccc'; }
                  else if(isUvMode){ disp=tObj?.uvMax!=null?tObj.uvMax:'-'; unit='UV'; boxBg=tObj?getUvColor(tObj.uvMax).bar:'#ccc'; }
                  else if(isRainMode){ disp=tObj?.rainProb!=null?`${tObj.rainProb}%`:'-'; unit='ตก'; boxBg=tObj?getRainColor(tObj.rainProb).bar:'#ccc'; }
                  else if(isWindMode){ disp=tObj?.windSpeed!=null?tObj.windSpeed:'-'; unit='km/h'; boxBg=tObj?getWindColor(tObj.windSpeed).bar:'#ccc'; }
                  
                  let hAdv = isPm25Mode?getPM25HealthAdvice(pmVal):isHeatMode?getHeatHealthAdvice(tObj?.feelsLike):isUvMode?getUvHealthAdvice(tObj?.uvMax):null;

                  return (
                    <div key={station.stationID} ref={el=>cardRefs.current[station.stationID]=el} onClick={()=>setActiveStation(station)} style={{ display:'flex', flexDirection:'column', background:isActive?(darkMode?'#334155':'#f8fafc'):cardBg, border:isActive?'1px solid #3b82f6':`1px solid ${borderColor}`, borderLeft:`6px solid ${boxBg}`, borderRadius:'10px', padding:'15px', marginBottom:'15px', cursor:'pointer', boxShadow: isActive ? '0 4px 10px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.02)' }}>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <div style={{ flex:1 }}>
                          <h4 style={{ margin:'0 0 2px 0', color:textColor, fontSize:'1rem' }}>{station.nameTH}</h4>
                          <p style={{ margin:0, color:'#3b82f6', fontSize:'0.8rem', fontWeight:'bold' }}>{extractProvince(station.areaTH)}</p>
                          <div style={{ marginTop:'10px', fontSize:'0.85rem', color:subTextColor, fontWeight:'bold' }}>
                            {isPm25Mode ? `AQI: ${station.AQILast?.AQI?.aqi||'--'}` : tObj ? (isUvMode?`ระดับ: ${getUvColor(tObj?.uvMax).label}`:isRainMode?`💧 ชื้น: ${tObj.humidity}%`:isWindMode?`ลมสูงสุด: ${tObj.windMax} km/h`:`ต่ำ ${tObj.tempMin!=null?Number(tObj.tempMin).toFixed(1):'-'}° | สูง ${tObj.tempMax!=null?Number(tObj.tempMax).toFixed(1):'-'}°`) : 'ไม่มีข้อมูล'}
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
                            fData = fData.filter(d => d.val != null && !isNaN(d.val)); 
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

          {/* DASHBOARD BOTTOM */}
          <div style={{ padding: '15px' }}>
            <div style={{ backgroundColor: cardBg, borderRadius: '12px', padding: '20px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <div onClick={() => setShowStats(!showStats)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}>
                <div>
                  <h2 style={{ fontSize: '1.3rem', color: textColor, margin: '0 0 5px 0', fontWeight:'bold' }}>📊 ข้อมูลเชิงลึก: {activeChart.name}</h2>
                  <p style={{ margin: 0, color: subTextColor, fontSize: '0.9rem' }}>พื้นที่วิเคราะห์: <strong style={{color: '#0ea5e9'}}>{dashTitle}</strong></p>
                </div>
                <div style={{ padding: '8px 15px', backgroundColor: darkMode ? '#334155' : '#f1f5f9', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 'bold', color: textColor }}>
                  {showStats ? '🔼 ซ่อนสถิติ' : '🔽 ดูกราฟสถิติ'}
                </div>
              </div>
              
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
        <div style={{ flex: 1, padding: '20px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h2 style={{ fontSize: '2rem', color: textColor, marginBottom: '5px', fontWeight:'bold' }}>🔔 ศูนย์พยากรณ์และแจ้งเตือนภัย</h2>
            <p style={{ color: subTextColor, fontSize:'1.1rem', marginBottom: '20px' }}>อัปเดตสถานการณ์สภาพอากาศ ประจำวันที่ <strong style={{color: '#0ea5e9'}}>{todayDateText}</strong></p>
            
            {/* 🚀 โซนเลือกพื้นที่ดูแจ้งเตือน */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={handleScanLocation} disabled={alertsLoading} style={{ backgroundColor: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '30px', padding: '10px 20px', fontSize: '0.95rem', fontWeight: 'bold', cursor: alertsLoading?'wait':'pointer', boxShadow: '0 4px 15px rgba(14,165,233,0.3)', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {alertsLoading ? '⏳ กำลังสแกน...' : '📍 ใช้พิกัดปัจจุบัน'}
              </button>
              <span style={{ color: subTextColor, fontWeight: 'bold', fontSize: '0.9rem' }}>หรือ</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 15px', backgroundColor: darkMode ? '#1e293b' : '#f0f9ff', borderRadius: '30px', border: `1px solid ${borderColor}` }}>
                <label style={{ fontWeight: 'bold', color: '#0ea5e9', fontSize: '0.95rem' }}>🎯 ค้นหา:</label>
                <select 
                  value={activeStation ? activeStation.stationID : ''} 
                  onChange={(e) => {
                    const stat = stations.find(s => s.stationID === e.target.value);
                    if (stat) {
                      setActiveStation(stat); setSelectedProvince(extractProvince(stat.areaTH)); setSelectedStationId(stat.stationID); 
                      fetchAlertsData(stat.lat, stat.long, `พื้นที่: ${stat.nameTH}`);
                    }
                  }} 
                  style={{ padding: '6px 12px', borderRadius: '20px', border: `1px solid ${borderColor}`, backgroundColor: darkMode ? '#0f172a' : '#fff', color: textColor, outline: 'none', cursor: 'pointer', fontSize: '0.9rem', maxWidth: window.innerWidth < 768 ? '160px' : '300px', textOverflow: 'ellipsis' }}
                >
                  <option value="">-- เลือกพื้นที่ / สถานี --</option>
                  {stations.slice().sort((a, b) => extractProvince(a.areaTH).localeCompare(extractProvince(b.areaTH), 'th')).map(s => (
                    <option key={s.stationID} value={s.stationID}>จ.{extractProvince(s.areaTH)} - {s.nameTH}</option>
                  ))}
                </select>
              </div>
              {alertsLocationName && !alertsLocationName.includes('พื้นที่:') && !alertsLoading && (
                <div style={{ padding: '8px 15px', backgroundColor: darkMode ? '#0f172a' : '#f0fdf4', borderRadius: '30px', color: '#16a34a', fontWeight: 'bold', border: `1px solid #bbf7d0`, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ✅ {alertsLocationName}
                </div>
              )}
            </div>
          </div>

          {alertsLoading ? (
             <div style={{ textAlign:'center', padding:'50px', color:subTextColor, fontSize:'1.2rem' }}>กำลังประมวลผลข้อมูลดาวเทียม...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
              
              {/* 🤖 ส่วนที่อัปเกรด: ผู้ช่วย AI อัจฉริยะ (แบบ Checklist สีสันสวยงาม) */}
              {(alertsData?.urgent?.length > 0 || alertsData?.daily?.length > 0) && (
                <div style={{ backgroundColor: cardBg, borderRadius: '16px', padding: '20px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)', position: 'relative', overflow: 'hidden' }}>
                  
                  {/* แถบสีตกแต่งด้านบน */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)' }}></div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' }}>
                    <h3 style={{ fontSize: '1.2rem', color: textColor, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                      <span style={{ fontSize: '1.5rem' }}>✨</span> AI ผู้ช่วยส่วนตัว
                    </h3>
                  </div>

                  {/* 🎯 ปุ่มตัวเลือกให้ AI ทำงาน (Prompt Chips) */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '15px' }}>
                    <button onClick={() => generateAISummary('general')} disabled={isGeneratingAI} style={{ padding: '6px 12px', borderRadius: '20px', border: `1px solid #3b82f6`, backgroundColor: darkMode ? 'rgba(59,130,246,0.1)' : '#eff6ff', color: '#3b82f6', fontSize: '0.85rem', cursor: isGeneratingAI?'wait':'pointer', fontWeight:'bold' }}>
                      🌤️ สรุปภาพรวม
                    </button>
                    <button onClick={() => generateAISummary('lifestyle')} disabled={isGeneratingAI} style={{ padding: '6px 12px', borderRadius: '20px', border: `1px solid #10b981`, backgroundColor: darkMode ? 'rgba(16,185,129,0.1)' : '#f0fdf4', color: '#10b981', fontSize: '0.85rem', cursor: isGeneratingAI?'wait':'pointer', fontWeight:'bold' }}>
                      👕 ซักผ้า/ล้างรถ
                    </button>
                    <button onClick={() => generateAISummary('exercise')} disabled={isGeneratingAI} style={{ padding: '6px 12px', borderRadius: '20px', border: `1px solid #f59e0b`, backgroundColor: darkMode ? 'rgba(245,158,11,0.1)' : '#fffbeb', color: '#f59e0b', fontSize: '0.85rem', cursor: isGeneratingAI?'wait':'pointer', fontWeight:'bold' }}>
                      🏃‍♂️ ออกกำลังกาย
                    </button>
                    <button onClick={() => generateAISummary('health')} disabled={isGeneratingAI} style={{ padding: '6px 12px', borderRadius: '20px', border: `1px solid #ef4444`, backgroundColor: darkMode ? 'rgba(239,68,68,0.1)' : '#fef2f2', color: '#ef4444', fontSize: '0.85rem', cursor: isGeneratingAI?'wait':'pointer', fontWeight:'bold' }}>
                      😷 สุขภาพ/ภูมิแพ้
                    </button>
                  </div>

                  {/* 📊 โชว์ข้อมูลที่ AI สรุปมาเป็น UI สวยๆ (JSON-to-UI) */}
                  <div style={{ backgroundColor: darkMode ? '#1e293b' : '#f8fafc', padding: isGeneratingAI || aiSummaryJson ? '15px' : '0', borderRadius: '12px', border: aiSummaryJson ? `1px dashed #8b5cf6` : 'none', transition: 'all 0.3s' }}>
                    
                    {isGeneratingAI ? (
                       <div style={{ textAlign: 'center', color: '#8b5cf6', padding: '15px', fontWeight: 'bold' }}>⏳ AI กำลังคิดวิเคราะห์ข้อมูลอย่างละเอียด...</div>
                    ) : aiSummaryJson ? (
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                         {aiSummaryJson.map((item, i) => {
                           let statusColor, statusBg, statusIcon, statusText;
                           if (item.status === 'yes') { 
                             statusColor = '#16a34a'; statusBg = darkMode ? 'rgba(22,163,74,0.15)' : '#dcfce7'; statusIcon = '✅'; statusText = 'เหมาะสม';
                           } else if (item.status === 'no') { 
                             statusColor = '#dc2626'; statusBg = darkMode ? 'rgba(220,38,38,0.15)' : '#fee2e2'; statusIcon = '❌'; statusText = 'ควรเลี่ยง';
                           } else { 
                             statusColor = '#d97706'; statusBg = darkMode ? 'rgba(217,119,6,0.15)' : '#fffbeb'; statusIcon = '⚠️'; statusText = 'เฝ้าระวัง';
                           }
                           
                           return (
                              <div key={i} style={{ display: 'flex', gap: '15px', backgroundColor: darkMode ? 'rgba(0,0,0,0.2)' : '#fff', padding: '15px', borderRadius: '10px', border: `1px solid ${borderColor}`, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                                <div style={{ fontSize: '1.8rem', width: '45px', height: '45px', background: statusBg, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  {item.icon}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '5px' }}>
                                    <h4 style={{ margin: '0', fontSize: '1.05rem', color: textColor, fontWeight: 'bold' }}>{item.label}</h4>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: statusColor, display: 'flex', alignItems: 'center', gap: '4px', background: statusBg, padding: '4px 10px', borderRadius: '12px' }}>
                                      {statusIcon} {statusText}
                                    </span>
                                  </div>
                                  <p style={{ margin: 0, color: subTextColor, lineHeight: 1.5, fontSize: '0.9rem' }}>{item.reason}</p>
                                </div>
                              </div>
                           );
                         })}
                       </div>
                    ) : (
                       <div style={{ color: subTextColor, fontSize: '0.9rem', textAlign: 'center', padding: '10px' }}>
                         👆 กดปุ่มด้านบนเพื่อให้ AI วิเคราะห์สภาพอากาศตามที่คุณต้องการได้เลยครับ
                       </div>
                    )}
                  </div>

                </div>
              )}

              {/* ส่วนที่ 1: แจ้งเตือนพิกัดปัจจุบัน (แบ่ง 3 ชม. กับ 24 ชม.) */}
              {(alertsData?.urgent?.length > 0 || alertsData?.daily?.length > 0) && (
                <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '1fr 1fr', gap: '20px' }}>
                  
                  {/* คอลัมน์ 1: พยากรณ์ 3 ชม. (Urgent) */}
                  <div style={{ backgroundColor: cardBg, borderRadius: '16px', padding: '20px', border: `1px solid ${borderColor}`, borderTop: alertsData?.urgent?.some(a => a.level >= 2) ? '4px solid #ef4444' : '4px solid #10b981', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                    <h3 style={{ fontSize: '1.2rem', color: alertsData?.urgent?.some(a => a.level >= 2) ? '#ef4444' : '#10b981', margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {alertsData?.urgent?.some(a => a.level >= 2) ? `🚨 พยากรณ์ 3 ชม. (${timeStr3h})` : `✅ พยากรณ์ 3 ชม. (${timeStr3h})`}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {alertsData?.urgent?.map((al, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '15px', backgroundColor: darkMode?'#0f172a':'#fff', padding: '15px', borderRadius: '10px', borderLeft: `4px solid ${al.color}`, border: darkMode ? '1px solid #334155' : '1px solid #f1f5f9' }}>
                          <div style={{ fontSize: '1.8rem', display:'flex', alignItems:'center' }}>{al.icon}</div>
                          <div><h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: al.color, fontWeight:'bold' }}>{al.title}</h4><p style={{ margin: 0, color: textColor, lineHeight:1.4, fontSize:'0.85rem' }}>{al.desc}</p></div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* คอลัมน์ 2: ภาพรวม 24 ชม. (Daily) */}
                  <div style={{ backgroundColor: cardBg, borderRadius: '16px', padding: '20px', border: `1px solid ${borderColor}`, borderTop: '4px solid #0ea5e9', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                    <h3 style={{ fontSize: '1.2rem', color: '#0ea5e9', margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>📅 ภาพรวมสภาพอากาศ (24 ชั่วโมง)</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {alertsData?.daily?.map((al, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '15px', backgroundColor: darkMode?'#0f172a':'#f8fafc', padding: '15px', borderRadius: '10px' }}>
                          <div style={{ fontSize: '1.5rem', display:'flex', alignItems:'center' }}>{al.icon}</div>
                          <div><h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', color: al.color, fontWeight:'bold' }}>{al.title}</h4><p style={{ margin: 0, color: subTextColor, lineHeight:1.4, fontSize:'0.85rem' }}>{al.desc}</p></div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* ส่วนที่ 2: สรุปภาพรวมความเสี่ยงระดับประเทศ (Top 5 Ranking) */}
              {nationwideSummary && (
                <div style={{ backgroundColor: cardBg, borderRadius: '16px', padding: '25px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '1.4rem', color: textColor, margin: '0 0 5px 0', fontWeight:'bold' }}>🏆 5 อันดับจังหวัดเฝ้าระวังสูงสุด (ทั่วประเทศ)</h3>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 1024 ? '1fr' : '1fr 1fr 1fr', gap: '15px' }}>
                    {/* Ranking: ฝน/ลม */}
                    <div style={{ padding: '15px', backgroundColor: darkMode ? '#0f172a' : '#eff6ff', borderRadius: '12px', border: `1px solid ${darkMode?'#1e3a8a':'#bfdbfe'}` }}>
                      <h4 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span>⛈️ เสี่ยงพายุฝน</span></h4>
                      <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                        {nationwideSummary.storm.length > 0 ? nationwideSummary.storm.map((item, i) => (
                          <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'0.9rem', color:textColor, padding:'8px', background:darkMode?'#1e293b':'#fff', borderRadius:'6px' }}>
                            <span><strong style={{color:'#94a3b8'}}>{i+1}.</strong> {item.prov}</span>
                            <span style={{ fontWeight:'bold', color: item.rain >= 70 ? '#dc2626' : '#2563eb' }}>{item.rain >= 50 ? `ฝน ${item.rain}%` : `ลม ${item.wind} km/h`}</span>
                          </div>
                        )) : <div style={{ fontSize:'0.85rem', color:'#16a34a', textAlign:'center', padding:'10px' }}>ไม่มีจังหวัดที่เสี่ยงรุนแรง</div>}
                      </div>
                    </div>

                    {/* Ranking: PM2.5 */}
                    <div style={{ padding: '15px', backgroundColor: darkMode ? '#0f172a' : '#fffbeb', borderRadius: '12px', border: `1px solid ${darkMode?'#78350f':'#fde68a'}` }}>
                      <h4 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span>😷 ฝุ่น PM2.5 สะสม</span></h4>
                      <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                        {nationwideSummary.pm25.length > 0 ? nationwideSummary.pm25.map((item, i) => (
                          <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'0.9rem', color:textColor, padding:'8px', background:darkMode?'#1e293b':'#fff', borderRadius:'6px' }}>
                            <span><strong style={{color:'#94a3b8'}}>{i+1}.</strong> {item.prov}</span>
                            <span style={{ fontWeight:'bold', color: item.val >= 75 ? '#dc2626' : '#d97706' }}>{item.val} µg/m³</span>
                          </div>
                        )) : <div style={{ fontSize:'0.85rem', color:'#16a34a', textAlign:'center', padding:'10px' }}>อากาศดีทั่วประเทศ</div>}
                      </div>
                    </div>

                    {/* Ranking: อากาศร้อน */}
                    <div style={{ padding: '15px', backgroundColor: darkMode ? '#0f172a' : '#fef2f2', borderRadius: '12px', border: `1px solid ${darkMode?'#7f1d1d':'#fecaca'}` }}>
                      <h4 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span>🥵 ดัชนีความร้อนสูงสุด</span></h4>
                      <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                        {nationwideSummary.heat.length > 0 ? nationwideSummary.heat.map((item, i) => (
                          <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'0.9rem', color:textColor, padding:'8px', background:darkMode?'#1e293b':'#fff', borderRadius:'6px' }}>
                            <span><strong style={{color:'#94a3b8'}}>{i+1}.</strong> {item.prov}</span>
                            <span style={{ fontWeight:'bold', color: '#dc2626' }}>{item.val}°C</span>
                          </div>
                        )) : <div style={{ fontSize:'0.85rem', color:'#16a34a', textAlign:'center', padding:'10px' }}>อุณหภูมิปกติทั่วประเทศ</div>}
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}