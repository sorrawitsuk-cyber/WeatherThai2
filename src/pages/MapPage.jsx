// src/pages/MapPage.jsx
import React, { useContext, useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl, WMSTileLayer, useMapEvents } from 'react-leaflet';
import { divIcon, latLngBounds } from 'leaflet'; 
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom'; 
import { WeatherContext } from '../context/WeatherContext';
import { extractProvince, chartConfigs, getDistanceFromLatLonInKm } from '../utils/helpers';

// ==========================================
// 🌟 ส่วนที่ 1: ระบบควบคุมสีและสูตรคำนวณ
// ==========================================

const calculateUSAQI = (pm) => {
  if (pm == null || isNaN(pm) || pm < 0) return '-';
  if (pm <= 12.0) return Math.round(((50 - 0) / (12.0 - 0)) * (pm - 0) + 0);
  if (pm <= 35.4) return Math.round(((100 - 51) / (35.4 - 12.1)) * (pm - 12.1) + 51);
  if (pm <= 55.4) return Math.round(((150 - 101) / (55.4 - 35.5)) * (pm - 35.5) + 101);
  if (pm <= 150.4) return Math.round(((200 - 151) / (150.4 - 55.5)) * (pm - 55.5) + 151);
  if (pm <= 250.4) return Math.round(((300 - 201) / (250.4 - 150.5)) * (pm - 150.5) + 201);
  if (pm <= 350.4) return Math.round(((400 - 301) / (350.4 - 250.5)) * (pm - 250.5) + 301);
  if (pm <= 500.4) return Math.round(((500 - 401) / (500.4 - 350.5)) * (pm - 350.5) + 401);
  return '>500';
};

const getLocalPM25Color = (value) => {
  if (value == null || isNaN(value)) return '#cbd5e1'; 
  if (value > 250) return '#9f1239'; 
  if (value > 150) return '#a855f7'; 
  if (value > 55)  return '#ef4444'; 
  if (value > 35)  return '#f97316'; 
  if (value > 15)  return '#eab308'; 
  return '#22c55e';                  
};

const getLocalTempColor = (val) => {
  if (val == null || isNaN(val)) return { bg: '#cbd5e1', text: '#475569' };
  if (val >= 40) return { bg: '#ef4444', text: '#fff' };       
  if (val >= 35) return { bg: '#f97316', text: '#fff' };       
  if (val >= 29) return { bg: '#eab308', text: '#1e293b' };    
  if (val >= 23) return { bg: '#22c55e', text: '#fff' };       
  if (val >= 15) return { bg: '#0ea5e9', text: '#fff' };       
  return { bg: '#1e3a8a', text: '#fff' };                      
};

const getLocalHeatColor = (val) => {
  if (val == null || isNaN(val)) return '#cbd5e1';
  if (val >= 54) return '#7f1d1d'; 
  if (val >= 41) return '#ef4444'; 
  if (val >= 32) return '#f97316'; 
  if (val >= 27) return '#eab308'; 
  return '#22c55e';                
};

const getLocalRainColor = (val) => {
  if (val == null || isNaN(val)) return '#cbd5e1';
  if (val >= 80) return '#1e3a8a'; 
  if (val >= 50) return '#0284c7'; 
  if (val >= 20) return '#38bdf8'; 
  if (val > 0)   return '#bae6fd'; 
  return '#f1f5f9';                
};

const getLocalWindColor = (val) => {
  if (val == null || isNaN(val)) return '#cbd5e1';
  if (val >= 40) return '#0f766e'; 
  if (val >= 20) return '#14b8a6'; 
  if (val >= 10) return '#2dd4bf'; 
  return '#ccfbf1';                
};

const getLocalUvColor = (val) => {
  if (val == null || isNaN(val)) return '#cbd5e1';
  if (val >= 11) return '#a855f7'; 
  if (val >= 8)  return '#ef4444'; 
  if (val >= 6)  return '#f97316'; 
  if (val >= 3)  return '#eab308'; 
  return '#22c55e';                
};

const getWindDirectionText = (degree) => {
  if (degree >= 337.5 || degree < 22.5) return 'ทิศเหนือ (พัดลงใต้)';
  if (degree >= 22.5 && degree < 67.5) return 'ทิศตะวันออกเฉียงเหนือ';
  if (degree >= 67.5 && degree < 112.5) return 'ทิศตะวันออก';
  if (degree >= 112.5 && degree < 157.5) return 'ทิศตะวันออกเฉียงใต้';
  if (degree >= 157.5 && degree < 202.5) return 'ทิศใต้';
  if (degree >= 202.5 && degree < 247.5) return 'ทิศตะวันตกเฉียงใต้';
  if (degree >= 247.5 && degree < 292.5) return 'ทิศตะวันตก';
  if (degree >= 292.5 && degree < 337.5) return 'ทิศตะวันตกเฉียงเหนือ';
  return 'ลมสงบ';
};

const regionMapping = {
  'ภาคเหนือ': ['เชียงใหม่', 'เชียงราย', 'แม่ฮ่องสอน', 'ลำพูน', 'ลำปาง', 'พะเยา', 'แพร่', 'น่าน', 'อุตรดิตถ์'],
  'ภาคอีสาน': ['นครราชสีมา', 'ขอนแก่น', 'อุบลราชธานี', 'อุดรธานี', 'บุรีรัมย์', 'ร้อยเอ็ด', 'ชัยภูมิ', 'สกลนคร', 'สุรินทร์', 'ศรีสะเกษ', 'หนองคาย', 'มหาสารคาม', 'เลย', 'หนองบัวลำภู', 'กาฬสินธุ์', 'มุกดาหาร', 'ยโสธร', 'อำนาจเจริญ', 'บึงกาฬ', 'นครพนม'],
  'ภาคกลาง': ['กรุงเทพมหานคร', 'สมุทรปราการ', 'นนทบุรี', 'ปทุมธานี', 'พระนครศรีอยุธยา', 'สมุทรสาคร', 'สมุทรสงคราม', 'นครปฐม', 'สระบุรี', 'ลพบุรี', 'สุพรรณบุรี', 'นครสวรรค์', 'อุทัยธานี', 'ชัยนาท', 'พิจิตร', 'กำแพงเพชร', 'สุโขทัย', 'พิษณุโลก', 'เพชรบูรณ์', 'อ่างทอง', 'สิงห์บุรี'],
  'ภาคตะวันออก': ['ชลบุรี', 'ระยอง', 'จันทบุรี', 'ตราด', 'ฉะเชิงเทรา', 'ปราจีนบุรี', 'สระแก้ว', 'นครนายก'],
  'ภาคตะวันตก': ['ตาก', 'กาญจนบุรี', 'ราชบุรี', 'เพชรบุรี', 'ประจวบคีรีขันธ์'],
  'ภาคใต้': ['ภูเก็ต', 'สุราษฎร์ธานี', 'สงขลา', 'นครศรีธรรมราช', 'ตรัง', 'พังงา', 'กระบี่', 'พัทลุง', 'ชุมพร', 'ระนอง', 'สตูล', 'ปัตตานี', 'ยะลา', 'นราธิวาส']
};

const createCustomMarker = (viewMode, value, extraData, currentZoom) => {
  const isZoomedOut = currentZoom < 8; 
  const size = isZoomedOut ? 16 : 34; 
  let bg, textColor, displayValue = ''; 
  const fontSize = String(value).length > 2 ? '9px' : '11px';

  if (viewMode === 'pm25' || viewMode === 'hotspot') { bg = getLocalPM25Color(value); textColor = (bg === '#eab308' || bg === '#22c55e') ? '#1e293b' : '#fff'; if(!isZoomedOut) displayValue = (value === 0 || isNaN(value)) ? '-' : value; } 
  else if (viewMode === 'temp') { const tInfo = getLocalTempColor(value); bg = tInfo.bg; textColor = tInfo.text; if(!isZoomedOut) displayValue = (value == null || isNaN(value)) ? '-' : Math.round(value); } 
  else if (viewMode === 'heat') { bg = getLocalHeatColor(value); textColor = (bg === '#eab308' || bg === '#22c55e') ? '#1e293b' : '#fff'; if(!isZoomedOut) displayValue = (value == null || isNaN(value)) ? '-' : Math.round(value); } 
  else if (viewMode === 'uv') { bg = getLocalUvColor(value); textColor = (bg === '#eab308' || bg === '#22c55e') ? '#1e293b' : '#fff'; if(!isZoomedOut) displayValue = (value == null || isNaN(value)) ? '-' : Math.round(value); } 
  else if (viewMode === 'rain') { bg = getLocalRainColor(value); textColor = (value <= 20) ? '#1e293b' : '#fff'; if(!isZoomedOut) displayValue = (value == null || isNaN(value)) ? '-' : `${Math.round(value)}%`; } 
  else if (viewMode === 'wind') { 
    bg = getLocalWindColor(value); textColor = (value <= 20) ? '#1e293b' : '#fff'; 
    const dir = extraData && extraData.windDir ? extraData.windDir : 0; 
    if(!isZoomedOut) displayValue = value == null ? '-' : `<div style="display:flex; flex-direction:column; align-items:center; line-height:1;"><span style="transform: rotate(${dir}deg); font-size: 14px; font-weight: bold;">↓</span><span style="font-size: 9px;">${Math.round(value)}</span></div>`; 
  }
  
  const boxShadow = isZoomedOut ? '0 1px 3px rgba(0,0,0,0.3)' : '0 2px 5px rgba(0,0,0,0.4)';

  return divIcon({ 
    className: 'custom-div-icon', 
    html: `<div style="position:relative; background-color: ${bg}; width: ${size}px; height: ${size}px; border-radius: 50%; border: ${isZoomedOut?'1px':'2px'} solid white; box-shadow: ${boxShadow}; display: flex; justify-content: center; align-items: center; color: ${textColor}; font-weight: bold; font-size: ${fontSize}; transition: all 0.3s ease;">${displayValue}</div>`, 
    iconSize: [size+4, size+4], iconAnchor: [size/2, size/2] 
  });
};

function FitBounds({ stations, activeStation, selectedProvince, selectedRegion, isPanelOpen }) { 
  const map = useMap(); 
  const filterKey = `${selectedRegion || 'all'}-${selectedProvince || 'all'}-${stations ? stations.length : 0}`;
  
  useEffect(() => { 
    if (activeStation) return; 
    const rightPadding = isPanelOpen && window.innerWidth >= 1024 ? 360 : 0; 
    
    if (!selectedProvince && !selectedRegion) { 
      const thaiBounds = latLngBounds([[5.6, 97.3], [20.4, 105.6]]);
      map.fitBounds(thaiBounds, { paddingTopLeft: [20, 20], paddingBottomRight: [rightPadding + 20, 20] }); 
    } else { 
      const validStations = stations.filter(s => s.lat && s.long && parseFloat(s.lat) !== 0); 
      if (validStations.length > 0) { 
        const bounds = latLngBounds(validStations.map(s => [parseFloat(s.lat), parseFloat(s.long)])); 
        map.fitBounds(bounds, { paddingTopLeft: [40, 40], paddingBottomRight: [rightPadding + 40, 40], maxZoom: 11 }); 
      } 
    } 
  }, [filterKey, map, activeStation, stations, isPanelOpen]); 
  return null; 
}

function FlyToActiveStation({ activeStation, isPanelOpen }) { 
  const map = useMap(); 
  useEffect(() => { 
    if (activeStation && activeStation.lat && !isNaN(parseFloat(activeStation.lat))) {
      const lat = parseFloat(activeStation.lat);
      const lon = parseFloat(activeStation.long);
      const offsetLon = isPanelOpen && window.innerWidth >= 1024 ? 0.05 : 0;
      map.flyTo([lat, lon + offsetLon], 13, { duration: 1.5 });
    } 
  }, [activeStation, map, isPanelOpen]); 
  return null; 
}

function MapFix({ isPanelOpen }) { 
  const map = useMap(); 
  useEffect(() => { const timer = setTimeout(() => { map.invalidateSize(); }, 300); return () => clearTimeout(timer); }, [map, isPanelOpen]); 
  return null; 
}

function MapZoomListener({ onZoomChange }) {
  useMapEvents({ zoomend: (e) => { onZoomChange(e.target.getZoom()); } });
  return null;
}

// ==========================================
// 🌟 ส่วนที่ 2: คอมโพเนนต์หลัก MapPage
// ==========================================

export default function MapPage() {
  const navigate = useNavigate(); 
  const { stations, stationTemps, loading, darkMode } = useContext(WeatherContext);
  
  const [viewMode, setViewMode] = useState('pm25');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showRadar, setShowRadar] = useState(false);
  const [activeStation, setActiveStation] = useState(null);
  
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [filteredStations, setFilteredStations] = useState([]); 
  const [mapZoom, setMapZoom] = useState(6); 
  
  const [showFirmsLayer, setShowFirmsLayer] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);

  const [isRightPanelOpen, setIsRightPanelOpen] = useState(window.innerWidth >= 1024);
  const [locating, setLocating] = useState(false);
  const [activeWeather, setActiveWeather] = useState(null); 
  const [activeForecast, setActiveForecast] = useState(null); 
  
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const cardRefs = useRef({});
  const markerRefs = useRef({});
  const allProvinces = useMemo(() => Object.values(regionMapping).flat().sort(), []);

  const legends = {
    pm25: { name: 'PM2.5 (µg/m³)', grad: 'linear-gradient(to right, #22c55e, #eab308, #f97316, #ef4444, #a855f7, #9f1239)', min: '0', max: '250+' },
    temp: { name: 'อุณหภูมิ (°C)', grad: 'linear-gradient(to right, #1e3a8a, #0ea5e9, #22c55e, #eab308, #f97316, #ef4444)', min: '<15', max: '40+' },
    heat: { name: 'ดัชนีความร้อน (°C)', grad: 'linear-gradient(to right, #22c55e, #eab308, #f97316, #ef4444, #7f1d1d)', min: '<27', max: '54+' },
    rain: { name: 'โอกาสฝน (%)', grad: 'linear-gradient(to right, #f1f5f9, #bae6fd, #38bdf8, #0284c7, #1e3a8a)', min: '0', max: '100' },
    wind: { name: 'ความเร็วลม (km/h)', grad: 'linear-gradient(to right, #ccfbf1, #2dd4bf, #14b8a6, #0f766e)', min: '0', max: '40+' },
    uv: { name: 'UV Index', grad: 'linear-gradient(to right, #22c55e, #eab308, #f97316, #ef4444, #a855f7)', min: '0', max: '11+' },
    hotspot: { name: 'ความเสี่ยงไฟป่า', grad: 'linear-gradient(to right, #10b981, #f59e0b, #ef4444)', min: 'ปกติ', max: 'เสี่ยงสูง' }
  };

  useEffect(() => {
    if (viewMode !== 'hotspot') {
      setShowMarkers(true); 
    } else {
      setShowFirmsLayer(true);
      setShowMarkers(true);
    }
  }, [viewMode]);

  useEffect(() => {
    let result = [...(stations || [])];
    
    if (selectedRegion) result = result.filter(s => {
       const prov = extractProvince(s.areaTH);
       return regionMapping[selectedRegion] && regionMapping[selectedRegion].includes(prov);
    });
    if (selectedProvince) result = result.filter(s => extractProvince(s.areaTH) === selectedProvince);
    
    result.sort((a, b) => {
      let vA, vB;
      const pmA = (a.AQILast && a.AQILast.PM25) ? Number(a.AQILast.PM25.value) : NaN;
      const pmB = (b.AQILast && b.AQILast.PM25) ? Number(b.AQILast.PM25.value) : NaN;
      const tA = stationTemps[a.stationID];
      const tB = stationTemps[b.stationID];

      if (viewMode==='pm25' || viewMode==='hotspot') { vA = pmA; vB = pmB; }
      else if (viewMode==='temp') { vA = tA ? tA.temp : null; vB = tB ? tB.temp : null; }
      else if (viewMode==='heat') { vA = tA ? tA.feelsLike : null; vB = tB ? tB.feelsLike : null; }
      else if (viewMode==='uv') { vA = tA ? (tA.uv != null ? tA.uv : tA.uvMax) : null; vB = tB ? (tB.uv != null ? tB.uv : tB.uvMax) : null; }
      else if (viewMode==='rain') { vA = tA ? tA.rainProb : null; vB = tB ? tB.rainProb : null; }
      else if (viewMode==='wind') { vA = tA ? tA.windSpeed : null; vB = tB ? tB.windSpeed : null; }
      
      const validA = vA!=null && !isNaN(vA) && (viewMode==='rain'?true:vA!==0); 
      const validB = vB!=null && !isNaN(vB) && (viewMode==='rain'?true:vB!==0);
      if (!validA && validB) return 1; 
      if (validA && !validB) return -1; 
      if (!validA && !validB) return 0;
      return sortOrder === 'desc' ? vB - vA : vA - vB;
    });
    setFilteredStations(result);
  }, [selectedRegion, selectedProvince, stations, viewMode, sortOrder, stationTemps]);

  const mapDisplayStations = useMemo(() => {
    if (viewMode === 'pm25' || viewMode === 'hotspot') return filteredStations;
    
    const largeProvinces = ['เชียงใหม่', 'ตาก', 'ประจวบคีรีขันธ์', 'นครราชสีมา', 'สุราษฎร์ธานี', 'นครศรีธรรมราช', 'สงขลา', 'กาญจนบุรี', 'แม่ฮ่องสอน', 'เชียงราย', 'เพชรบูรณ์', 'ยะลา'];
    const importantDistricts = ['ปากช่อง', 'วังน้ำเขียว', 'พิมาย', 'ทองผาภูมิ', 'สังขละบุรี', 'บางสะพาน', 'หัวหิน', 'แม่สอด', 'อุ้มผาง', 'แม่สาย', 'เชียงของ', 'หาดใหญ่', 'สะเดา', 'เกาะสมุย', 'เกาะพะงัน', 'เคียนซา', 'แม่สะเรียง', 'ปาย', 'ฝาง', 'ฮอด', 'แม่แจ่ม', 'ทุ่งสง', 'สิชล', 'หล่มสัก', 'เขาค้อ', 'เบตง'];
    
    const selectedStations = [];
    const provMap = {};

    filteredStations.forEach(s => {
      const p = extractProvince(s.areaTH);
      if (!provMap[p]) provMap[p] = [];
      provMap[p].push(s);
    });

    Object.keys(provMap).forEach(p => {
      const stationsInProv = provMap[p];
      let addedCount = 0;
      const limit = largeProvinces.includes(p) ? 4 : 1; 

      const mueangStation = stationsInProv.find(s => s.areaTH && s.areaTH.includes('เมือง'));
      if (mueangStation) { selectedStations.push(mueangStation); addedCount++; }

      if (limit > 1) {
        const importantStations = stationsInProv.filter(s => !selectedStations.some(sel => sel.stationID === s.stationID) && s.areaTH && importantDistricts.some(d => s.areaTH.includes(d)));
        for (let i = 0; i < importantStations.length && addedCount < limit; i++) { selectedStations.push(importantStations[i]); addedCount++; }
      }
      if (addedCount === 0 && stationsInProv.length > 0) { selectedStations.push(stationsInProv[0]); }
    });

    if (activeStation && filteredStations.some(s => s.stationID === activeStation.stationID)) {
       if (!selectedStations.some(s => s.stationID === activeStation.stationID)) { selectedStations.push(activeStation); }
    }
    return selectedStations;
  }, [filteredStations, viewMode, activeStation]);

  useEffect(() => {
    if (activeStation) {
      setIsRightPanelOpen(true);
      if (cardRefs.current[activeStation.stationID]) cardRefs.current[activeStation.stationID].scrollIntoView({ behavior: 'smooth', block: 'center' });
      const marker = markerRefs.current[activeStation.stationID]; 
      if (marker && !showRadar) marker.openPopup(); 
      setActiveWeather(null); setActiveForecast(null); 
      
      const fetchCardDetails = async () => {
        try {
          const urlWeather = `https://api.open-meteo.com/v1/forecast?latitude=${activeStation.lat}&longitude=${activeStation.long}&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,uv_index_max,precipitation_probability_max,wind_speed_10m_max&timezone=auto&forecast_days=7`;
          const wData = await fetch(urlWeather).then(r=>r.json()); let tempF=[], heatF=[], uvF=[], rainF=[], windF=[];
          if (wData.daily && wData.daily.time) {
            for (let i = 0; i < wData.daily.time.length; i++) {
              const days = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']; 
              let tLabel = i===0?'วันนี้':i===1?'พรุ่งนี้':days[new Date(wData.daily.time[i]).getDay()];
              tempF.push({ time: tLabel, val: Math.round(wData.daily.temperature_2m_max[i]||0) });
              heatF.push({ time: tLabel, val: Math.round(wData.daily.apparent_temperature_max[i]||0) });
              if(wData.daily.uv_index_max && wData.daily.uv_index_max[i] != null) uvF.push({ time: tLabel, val: Math.round(wData.daily.uv_index_max[i]||0) });
              if(wData.daily.precipitation_probability_max) rainF.push({ time: tLabel, val: Math.round(wData.daily.precipitation_probability_max[i]||0) });
              if(wData.daily.wind_speed_10m_max) windF.push({ time: tLabel, val: Math.round(wData.daily.wind_speed_10m_max[i]||0) });
            }
          }
          setActiveWeather({ tempForecast:tempF, heatForecast:heatF, uvForecast:uvF, rainForecast:rainF, windForecast:windF });

          const urlAqi = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${activeStation.lat}&longitude=${activeStation.long}&hourly=pm2_5&timezone=auto&forecast_days=4`;
          const aData = await fetch(urlAqi).then(r=>r.json());
          if (aData && aData.hourly && aData.hourly.pm2_5) {
            const now = new Date().getTime(); let sIdx = aData.hourly.time.findIndex(t => new Date(t).getTime()>=now); if (sIdx===-1) sIdx=0;
            const currentReal = Number(activeStation.AQILast && activeStation.AQILast.PM25 ? activeStation.AQILast.PM25.value : NaN); 
            let offset = (!isNaN(currentReal) && aData.hourly.pm2_5[sIdx] !== undefined) ? currentReal - aData.hourly.pm2_5[sIdx] : 0;
            const pmF = [];
            for (let i = sIdx; i < aData.hourly.time.length && pmF.length < 24; i += 3) {
              if(aData.hourly.pm2_5[i] != null){ 
                let cVal = Math.max(0, (aData.hourly.pm2_5[i] || 0) + offset); 
                pmF.push({ time: `${new Date(aData.hourly.time[i]).getHours().toString().padStart(2, '0')}`, val: Math.round(cVal) }); 
              }
            }
            setActiveForecast(pmF);
          }
        } catch (err) { setActiveWeather('error'); }
      };
      fetchCardDetails();
    }
  }, [activeStation, showRadar]);

  const handleFindNearest = () => {
    if (!navigator.geolocation) return alert('ไม่รองรับ GPS'); setLocating(true);
    navigator.geolocation.getCurrentPosition((pos) => {
      let nearest = null; let minD = Infinity;
      (stations || []).forEach(s => { const d = getDistanceFromLatLonInKm(pos.coords.latitude, pos.coords.longitude, parseFloat(s.lat), parseFloat(s.long)); if (d<minD){minD=d; nearest=s;} });
      if (nearest) { const prov = extractProvince(nearest.areaTH); setSelectedRegion(''); setSelectedProvince(prov); setActiveStation(nearest); setShowRadar(false); setViewMode('pm25'); setIsRightPanelOpen(true); }
      setLocating(false);
    }, () => { alert('ดึงพิกัดไม่ได้ กรุณาเปิด GPS'); setLocating(false); });
  };

  const handleResetMap = () => { setSelectedRegion(''); setSelectedProvince(''); setActiveStation(null); setViewMode('pm25'); setShowRadar(false); setIsRightPanelOpen(window.innerWidth >= 1024); };

  const cardBg = darkMode ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.9)';
  const textColor = darkMode ? '#f8fafc' : '#1e293b';
  const subTextColor = darkMode ? '#94a3b8' : '#475569';
  const borderColor = darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  const activeChart = chartConfigs[viewMode === 'hotspot' ? 'pm25' : viewMode] || chartConfigs['pm25']; 

  let radarLat = 13.75; let radarLon = isRightPanelOpen && !isMobile ? 101.5 : 100.5; let radarZoom = 6;
  if (activeStation && activeStation.lat && !isNaN(parseFloat(activeStation.lat))) { 
    radarLat = parseFloat(activeStation.lat); radarLon = parseFloat(activeStation.long) + (isRightPanelOpen && !isMobile ? 0.05 : 0); radarZoom = 10; 
  } else if (selectedProvince) { 
    const provStations = (stations || []).filter(s => extractProvince(s.areaTH) === selectedProvince); 
    if (provStations.length > 0) { 
      radarLat = provStations.reduce((sum, s) => sum + parseFloat(s.lat), 0) / provStations.length; 
      let baseLon = provStations.reduce((sum, s) => sum + parseFloat(s.long), 0) / provStations.length; radarLon = baseLon + (isRightPanelOpen && !isMobile ? 0.15 : 0); radarZoom = 8; 
    } 
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%' }}>กำลังโหลดแผนที่...</div>;

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%', overflow: 'hidden' }}>
      
      {/* 🌟 ปรับแต่ง UI อัตโนมัติ: ดันปุ่มสลับแผนที่ของ Leaflet ให้หลบลงมา ไม่ให้ชนเมนูด้านบน */}
      <style>{`
        .scroll-container::-webkit-scrollbar { display: none; }
        .scroll-container { -ms-overflow-style: none; scrollbar-width: none; }
        /* ดันปุ่มเปลี่ยน Map Layer ให้ต่ำลงมา 65px เพื่อหลบแถบเมนู */
        .leaflet-top.leaflet-right { top: 65px !important; right: 10px !important; }
        .leaflet-control-layers { border-radius: 12px !important; box-shadow: 0 4px 10px rgba(0,0,0,0.1) !important; border: 1px solid rgba(255,255,255,0.2) !important; }
      `}</style>

      {/* พื้นที่แผนที่ */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: isMobile ? '75px' : 0, zIndex: 1 }}>
        
        {/* 🌟 1. แถบตัวกรองและปุ่มสลับโหมด (บรรทัดเดียว เลื่อนปัดซ้ายขวาได้) - แกะบล็อก pointerEvents แล้ว! */}
        <div className="scroll-container" style={{ 
          position: 'absolute', top: '10px', left: isMobile ? '10px' : '50px', 
          right: isMobile ? '10px' : (isRightPanelOpen ? '395px' : '10px'), zIndex: 1000, 
          display: 'flex', flexWrap: 'nowrap', overflowX: 'auto', WebkitOverflowScrolling: 'touch',
          alignItems: 'center', gap: '8px', paddingBottom: '10px',
          pointerEvents: 'auto' // 🚨 สำคัญมาก! อนุญาตให้กดและปัดได้
        }}>
          
          {!showRadar && (
            <div style={{ display: 'flex', gap: '4px', background: cardBg, backdropFilter: 'blur(10px)', padding: '6px 10px', borderRadius: '12px', border: `1px solid ${borderColor}`, boxShadow: '0 2px 10px rgba(0,0,0,0.1)', flexShrink: 0 }}>
              <button onClick={handleResetMap} style={{ padding: '6px 10px', borderRadius: '8px', background: '#0ea5e9', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}>🔄 {isMobile ? '' : 'รีเซ็ต'}</button>
              <div style={{ width: '1px', backgroundColor: borderColor, margin: '0 2px' }}></div> 
              <select value={selectedRegion} onChange={e => { setSelectedRegion(e.target.value); setSelectedProvince(''); }} style={{ padding: '6px 10px', borderRadius: '8px', background: darkMode ? 'rgba(0,0,0,0.3)' : '#f8fafc', color: textColor, border: `1px solid ${borderColor}`, outline: 'none', fontWeight: 'bold', fontSize: '0.85rem' }}>
                <option value="">🗺️ ทุกภูมิภาค</option>
                {Object.keys(regionMapping).map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <select value={selectedProvince} onChange={e => setSelectedProvince(e.target.value)} style={{ padding: '6px 10px', borderRadius: '8px', background: darkMode ? 'rgba(0,0,0,0.3)' : '#f8fafc', color: textColor, border: `1px solid ${borderColor}`, outline: 'none', fontWeight: 'bold', fontSize: '0.85rem' }}>
                <option value="">📍 ทุกจังหวัด</option>
                {(selectedRegion ? regionMapping[selectedRegion] : allProvinces).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', gap: '4px', background: cardBg, backdropFilter: 'blur(10px)', padding: '6px 10px', borderRadius: '12px', alignItems: 'center', border: `1px solid ${borderColor}`, boxShadow: '0 2px 10px rgba(0,0,0,0.1)', flexShrink: 0 }}>
            {!showRadar ? (
              <>
                <button onClick={() => setViewMode('pm25')} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: viewMode === 'pm25' ? '#0ea5e9' : 'transparent', color: viewMode === 'pm25' ? '#fff' : textColor, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>☁️ PM2.5</button>
                <button onClick={() => setViewMode('temp')} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: viewMode === 'temp' ? '#22c55e' : 'transparent', color: viewMode === 'temp' ? '#fff' : textColor, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>🌡️ อุณหภูมิ</button>
                <button onClick={() => setViewMode('heat')} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: viewMode === 'heat' ? '#f97316' : 'transparent', color: viewMode === 'heat' ? '#fff' : textColor, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>🥵 Heat</button>
                <button onClick={() => setViewMode('uv')} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: viewMode === 'uv' ? '#a855f7' : 'transparent', color: viewMode === 'uv' ? '#fff' : textColor, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>☀️ UV</button>
                <div style={{ width: '1px', height: '15px', backgroundColor: borderColor, margin: '0 2px' }}></div>
                <button onClick={() => setViewMode(viewMode === 'hotspot' ? 'pm25' : 'hotspot')} style={{ padding: '6px 12px', borderRadius: '8px', border: viewMode === 'hotspot' ? 'none' : `1px solid ${borderColor}`, fontWeight: 'bold', cursor: 'pointer', backgroundColor: viewMode === 'hotspot' ? '#ef4444' : 'transparent', color: viewMode === 'hotspot' ? '#fff' : textColor, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>🔥 Hot spot</button>
              </>
            ) : ( 
              <div style={{ padding: '6px 12px', borderRadius: '8px', color: '#ef4444', fontWeight: 'bold', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>🔴 โหมดเรดาร์พายุ</div> 
            )}
            <div style={{ width: '1px', height: '15px', backgroundColor: borderColor, margin: '0 2px' }}></div>
            <button onClick={() => setShowRadar(!showRadar)} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: showRadar ? '#ef4444' : 'transparent', color: showRadar ? '#fff' : textColor, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
              {showRadar ? 'ปิดเรดาร์' : '📡 เรดาร์'}
            </button>
          </div>
        </div>

        {/* 🌟 2. ปุ่มค้นหาพิกัด GPS ปัจจุบัน (อยู่มุมขวาล่าง เลื่อนขึ้นมาหน่อยเพื่อไม่ให้ชนแถบเมนูแอป) */}
        {!showRadar && (
          <button onClick={handleFindNearest} title="ตำแหน่งปัจจุบัน" style={{ position: 'absolute', bottom: isMobile ? '95px' : '30px', right: isMobile ? '15px' : (isRightPanelOpen ? '395px' : '15px'), transition: 'right 0.3s ease', zIndex: 1000, width: '45px', height: '45px', borderRadius: '50%', backgroundColor: cardBg, backdropFilter: 'blur(10px)', color: locating ? subTextColor : '#0ea5e9', border: `2px solid ${borderColor}`, cursor: locating ? 'wait' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
            {locating ? '⏳' : '📍'}
          </button>
        )}

        {/* 🌟 3. กล่อง Legend (มุมซ้ายล่าง เล็กกะทัดรัด ไม่เกะกะ) */}
        {!showRadar && legends[viewMode] && (
          <div style={{ position: 'absolute', bottom: isMobile ? '90px' : '20px', left: isMobile ? '10px' : '15px', zIndex: 1000, background: cardBg, backdropFilter: 'blur(12px)', padding: '8px 12px', borderRadius: '12px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 15px rgba(0,0,0,0.1)', minWidth: isMobile ? '140px' : '180px' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: textColor, marginBottom: '4px', textAlign: 'center' }}>{legends[viewMode].name}</div>
            <div style={{ background: legends[viewMode].grad, height: '5px', borderRadius: '3px', width: '100%' }}></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: subTextColor, marginTop: '4px', fontWeight: 'bold' }}>
              <span>{legends[viewMode].min}</span>
              <span>{legends[viewMode].max}</span>
            </div>
          </div>
        )}

        {showRadar ? (
          <div style={{ width: '100%', height: '100%', backgroundColor: darkMode ? '#0f172a' : '#fff' }}>
            <iframe width="100%" height="100%" src={`https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=km/h&zoom=${radarZoom}&overlay=radar&product=radar&level=surface&lat=${radarLat}&lon=${radarLon}`} frameBorder="0"></iframe>
          </div>
        ) : (
          <MapContainer center={[13.75, 100.5]} zoom={6} style={{ height: '100%', width: '100%', zIndex: 1, backgroundColor: darkMode ? '#0f172a' : '#bae6fd' }} zoomControl={false}>
            
            {/* 🌟 4. ย้ายตัวสลับ Layer มาไว้มุมขวาบน (CSS จะช่วยดันให้มันหลบลงมาอยู่ใต้แถบเมนูพอดี) */}
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="🗺️ แผนที่ปกติ">
                <TileLayer url={darkMode ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"} />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="🛰️ ดาวเทียม">
                <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
              </LayersControl.BaseLayer>
            </LayersControl>
            
            <MapFix isPanelOpen={isRightPanelOpen} /> 
            <MapZoomListener onZoomChange={setMapZoom} />
            <FitBounds stations={filteredStations} activeStation={activeStation} selectedProvince={selectedProvince} selectedRegion={selectedRegion} isPanelOpen={isRightPanelOpen} /> 
            <FlyToActiveStation activeStation={activeStation} isPanelOpen={isRightPanelOpen} /> 
            
            {viewMode === 'hotspot' && showFirmsLayer && (
              <WMSTileLayer url="https://firms.modaps.eosdis.nasa.gov/mapserver/wms/fires/12acd7ab2d5fd883cc5b5e44576a62a8/" layers="fires_viirs_24,fires_modis_24" format="image/png" transparent={true} opacity={1.0} zIndex={1000} />
            )}

            {showMarkers && mapDisplayStations.map((station) => {
              const lat = parseFloat(station.lat); const lon = parseFloat(station.long); if (isNaN(lat) || isNaN(lon)) return null;
              const pmVal = Number(station.AQILast && station.AQILast.PM25 ? station.AQILast.PM25.value : NaN); 
              const tObj = stationTemps[station.stationID];
              
              let mVal;
              if (viewMode==='pm25'||viewMode==='hotspot') mVal = pmVal;
              else if (viewMode==='temp') mVal = tObj ? tObj.temp : null;
              else if (viewMode==='heat') mVal = tObj ? tObj.feelsLike : null;
              else if (viewMode==='uv') mVal = tObj ? (tObj.uv != null ? tObj.uv : tObj.uvMax) : null;
              else if (viewMode==='rain') mVal = tObj ? tObj.rainProb : null;
              else if (viewMode==='wind') mVal = tObj ? tObj.windSpeed : null;
              
              return (
                <Marker key={station.stationID} position={[lat, lon]} icon={createCustomMarker(viewMode, mVal, tObj, mapZoom)} ref={el => markerRefs.current[station.stationID]=el} eventHandlers={{ click: () => { setActiveStation(station); setIsRightPanelOpen(true); } }}>
                  <Popup minWidth={200}>
                    <div style={{ textAlign: 'center', fontFamily: 'Kanit' }}>
                      <strong>{station.nameTH}</strong><br/>
                      <span style={{ fontSize: '1.2rem', color: getLocalPM25Color(pmVal)==='#eab308'?'#ca8a04':getLocalPM25Color(pmVal), fontWeight: 'bold' }}>PM2.5: {isNaN(pmVal)?'-':pmVal}</span>
                      {tObj && <div><br/>🌡️ {tObj.temp}°C | 💧 {tObj.humidity}%</div>}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}
      </div>

      {/* 🌟 RIGHT SIDEBAR (การ์ดรายละเอียด) */}
      {!showRadar && (
        <div style={{ 
          position: 'absolute', top: '15px', bottom: isMobile ? '85px' : '15px', 
          right: isRightPanelOpen ? (isMobile ? '10px' : '15px') : (isMobile ? '-100%' : '-360px'), 
          width: isMobile ? 'calc(100% - 20px)' : '360px', 
          transition: 'right 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          backgroundColor: viewMode === 'hotspot' ? (darkMode ? 'rgba(15, 23, 42, 0.85)' : 'rgba(254, 242, 242, 0.85)') : cardBg, 
          backdropFilter: 'blur(20px)', border: `1px solid ${viewMode === 'hotspot' ? '#fca5a5' : borderColor}`, 
          zIndex: 1000, borderRadius: '20px', display: 'flex', flexDirection: 'column',
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)'
        }}>
          
          <button onClick={() => setIsRightPanelOpen(!isRightPanelOpen)} style={{ 
            position: 'absolute', top: '50%', left: '-30px', transform: 'translateY(-50%)', 
            width: '30px', height: '60px', backgroundColor: cardBg, backdropFilter: 'blur(10px)', 
            border: `1px solid ${borderColor}`, borderRight: 'none', borderRadius: '15px 0 0 15px', 
            cursor: 'pointer', display: isMobile ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', 
            fontSize: '1.2rem', color: textColor, boxShadow: '-4px 0 10px rgba(0,0,0,0.05)' 
          }}>
            {isRightPanelOpen ? '▶' : '◀'}
          </button>

          <div style={{ padding: '15px', borderBottom: `1px solid ${borderColor}`, background: viewMode === 'hotspot' ? 'linear-gradient(to right, rgba(239,68,68,0.8), rgba(249,115,22,0.8))' : 'transparent', borderRadius: '20px 20px 0 0' }}>
            {isMobile && <button onClick={() => setIsRightPanelOpen(false)} style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255,255,255,0.3)', color: viewMode==='hotspot'?'#fff':textColor, border: 'none', borderRadius: '10px', fontWeight: 'bold', marginBottom: '15px' }}>▶ ปิดหน้าต่าง</button>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1rem', color: viewMode==='hotspot'?'#fff':textColor, margin: '0', fontWeight: 'bold' }}>
                {viewMode === 'hotspot' ? '🔥 ศูนย์เฝ้าระวังไฟป่า' : activeChart.name} ({filteredStations.length})
              </h2>
              <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={{ padding: '4px', borderRadius: '6px', backgroundColor: darkMode?'rgba(0,0,0,0.5)':'rgba(255,255,255,0.7)', color: viewMode==='hotspot'?'#fff':textColor, outline: 'none', border: 'none', fontSize: '0.8rem' }}>
                <option value="desc">⬇️ มากไปน้อย</option><option value="asc">⬆️ น้อยไปมาก</option>
              </select>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }} className="hide-scrollbar">
            {filteredStations.map((station) => {
              const pmVal = Number(station.AQILast && station.AQILast.PM25 ? station.AQILast.PM25.value : NaN); 
              const tObj = stationTemps[station.stationID]; 
              const isActive = activeStation && activeStation.stationID === station.stationID;

              let warningNode = null;
              if(viewMode === 'pm25') {
                if (pmVal > 250) warningNode = <span style={{ color: '#9f1239', fontSize: '0.75rem', fontWeight: 'bold', display: 'block', marginTop: '5px' }}>⚠️ อันตรายมาก (งดกิจกรรมกลางแจ้ง)</span>;
                else if (pmVal > 150) warningNode = <span style={{ color: '#a855f7', fontSize: '0.75rem', fontWeight: 'bold', display: 'block', marginTop: '5px' }}>⚠️ อันตราย (ควรสวมหน้ากาก N95)</span>;
                else if (pmVal > 55) warningNode = <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 'bold', display: 'block', marginTop: '5px' }}>😷 เริ่มมีผลกระทบต่อสุขภาพ</span>;
              } else if (viewMode === 'heat' && tObj && tObj.feelsLike >= 41) {
                warningNode = <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 'bold', display: 'block', marginTop: '5px' }}>⚠️ อันตราย (ระวังฮีทสโตรก)</span>;
              }

              if (viewMode === 'hotspot') {
                const temp = (tObj && tObj.temp) ? tObj.temp : 0; 
                const rain = (tObj && tObj.rainProb) ? tObj.rainProb : 0; 
                const wind = (tObj && tObj.windSpeed) ? tObj.windSpeed : 0;
                const windDir = (tObj && tObj.windDir) ? tObj.windDir : 0;
                
                const riskScore = (temp >= 35 ? 1 : 0) + (rain <= 20 ? 1 : 0) + (wind >= 15 ? 1 : 0);
                const riskText = riskScore >= 2 ? '🔥 เสี่ยงสูง (ร้อน/แห้ง/ลมแรง)' : riskScore === 1 ? '⚠️ เฝ้าระวัง' : '✅ ปกติ';
                const riskColor = riskScore >= 2 ? '#ef4444' : riskScore === 1 ? '#f59e0b' : '#10b981';

                return (
                  <div key={station.stationID} ref={el=>cardRefs.current[station.stationID]=el} onClick={()=>setActiveStation(station)} style={{ display:'flex', flexDirection:'column', background: isActive ? (darkMode?'rgba(127, 29, 29, 0.8)':'#fee2e2') : (darkMode?'rgba(0,0,0,0.4)':'rgba(255,255,255,0.7)'), borderLeft:`6px solid ${riskColor}`, borderRadius:'12px', padding:'15px', marginBottom:'15px', cursor:'pointer', boxShadow: isActive ? '0 4px 10px rgba(239,68,68,0.2)' : '0 2px 5px rgba(0,0,0,0.05)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div style={{ flex:1 }}>
                        <h4 style={{ margin:'0 0 5px 0', color: viewMode==='hotspot' && !darkMode ? '#7f1d1d' : textColor, fontSize:'1rem' }}>{station.nameTH}</h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                          <p style={{ margin:0, color: riskColor, fontSize:'0.8rem', fontWeight:'bold' }}>{riskText}</p>
                          {!isNaN(pmVal) && (
                            <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '6px', background: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: subTextColor, fontWeight: 'bold' }}>
                              US AQI: {calculateUSAQI(pmVal)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ backgroundColor: getLocalPM25Color(pmVal), color: '#fff', padding: '5px 10px', borderRadius: '8px', textAlign: 'center' }}>
                        <span style={{ fontSize:'1rem', fontWeight:'bold' }}>{isNaN(pmVal)?'-':pmVal}</span><br/><span style={{ fontSize:'0.6rem' }}>PM2.5</span>
                      </div>
                    </div>
                    <div style={{ marginTop: '10px', padding: '10px', background: darkMode?'rgba(0,0,0,0.3)':'rgba(0,0,0,0.03)', borderRadius: '8px', fontSize: '0.8rem', color: subTextColor }}>
                      🌡️ อุณหภูมิ: <strong style={{color: temp>=35?'#ef4444':textColor}}>{temp}°C</strong> | 💧 โอกาสฝน: <strong>{rain}%</strong><br/>
                      🌬️ ลม: <strong>{wind} km/h</strong> ไปทาง <strong>{getWindDirectionText(windDir)}</strong>
                    </div>
                  </div>
                );
              }

              let disp = '-', unit = '', boxBg = '#ccc', boxText = '#fff';
              if(viewMode==='pm25'){ 
                disp = isNaN(pmVal)?'-':pmVal; unit='µg/m³'; boxBg=getLocalPM25Color(pmVal); 
                boxText = (boxBg==='#eab308'||boxBg==='#22c55e') ? '#1e293b' : '#fff'; 
              }
              else if(viewMode==='temp'){ 
                disp = (tObj && tObj.temp != null) ? Math.round(tObj.temp) : '-'; unit='°C'; 
                const tColor = getLocalTempColor(tObj ? tObj.temp : null); boxBg = tColor.bg; boxText = tColor.text; 
              }
              else if(viewMode==='heat'){ 
                disp = (tObj && tObj.feelsLike != null) ? Math.round(tObj.feelsLike) : '-'; unit='°C'; 
                boxBg = getLocalHeatColor(tObj ? tObj.feelsLike : null); 
                boxText = (boxBg==='#eab308'||boxBg==='#22c55e') ? '#1e293b' : '#fff'; 
              }
              else if(viewMode==='rain'){ 
                disp = (tObj && tObj.rainProb != null) ? Math.round(tObj.rainProb) : '-'; unit='%'; 
                boxBg = getLocalRainColor(tObj ? tObj.rainProb : null); 
                boxText = (tObj && tObj.rainProb <= 20) ? '#1e293b' : '#fff'; 
              }
              else if(viewMode==='uv'){ 
                let uvValToDisplay = tObj ? (tObj.uv != null ? tObj.uv : tObj.uvMax) : null;
                disp = uvValToDisplay != null ? Math.round(uvValToDisplay) : '-'; unit='Idx'; 
                boxBg = getLocalUvColor(uvValToDisplay); 
                boxText = (boxBg==='#eab308'||boxBg==='#22c55e') ? '#1e293b' : '#fff'; 
              }
              else if(viewMode==='wind'){ 
                disp = (tObj && tObj.windSpeed != null) ? Math.round(tObj.windSpeed) : '-'; unit='km/h'; 
                boxBg = getLocalWindColor(tObj ? tObj.windSpeed : null); 
                boxText = (tObj && tObj.windSpeed <= 20) ? '#1e293b' : '#fff'; 
              }

              return (
                <div key={station.stationID} ref={el=>cardRefs.current[station.stationID]=el} onClick={()=>setActiveStation(station)} style={{ display:'flex', flexDirection:'column', background:isActive?(darkMode?'rgba(51, 65, 85, 0.8)':'rgba(241, 245, 249, 0.9)'):(darkMode?'rgba(0,0,0,0.3)':'rgba(255,255,255,0.7)'), borderLeft:`6px solid ${boxBg}`, borderRadius:'12px', padding:'15px', marginBottom:'15px', cursor:'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <div style={{ flex:1 }}>
                      <h4 style={{ margin:'0 0 2px 0', color:textColor, fontSize:'0.95rem' }}>{station.nameTH}</h4>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <p style={{ margin:0, color:'#3b82f6', fontSize:'0.8rem', fontWeight:'bold' }}>{extractProvince(station.areaTH)}</p>
                        {viewMode === 'pm25' && !isNaN(pmVal) && (
                          <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '6px', background: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: subTextColor, fontWeight: 'bold' }}>
                            US AQI: {calculateUSAQI(pmVal)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ backgroundColor:boxBg, color:boxText, width:'55px', height:'55px', borderRadius:'12px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                      <span style={{ fontSize:'1.2rem', fontWeight:'bold' }}>{disp}</span><span style={{ fontSize:'0.6rem' }}>{unit}</span>
                    </div>
                  </div>

                  {isActive && typeof activeWeather === 'object' && activeWeather !== null && activeForecast && (
                    <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: `1px dashed ${borderColor}`, height: '120px' }}>
                      <ResponsiveContainer>
                        {viewMode === 'pm25' ? (
                          <BarChart data={activeForecast} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
                            <XAxis dataKey="time" stroke={subTextColor} fontSize={10} />
                            <YAxis stroke={subTextColor} fontSize={10} domain={activeChart.domain} />
                            <Bar dataKey="val" fill={activeChart.color} radius={[4, 4, 0, 0]} />
                          </BarChart>
                        ) : (
                          <AreaChart data={viewMode === 'temp' ? activeWeather.tempForecast : viewMode === 'rain' ? activeWeather.rainForecast : viewMode === 'wind' ? activeWeather.windForecast : viewMode === 'uv' ? activeWeather.uvForecast : activeWeather.heatForecast} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
                            <XAxis dataKey="time" stroke={subTextColor} fontSize={10} />
                            <YAxis stroke={subTextColor} fontSize={10} domain={activeChart.domain} />
                            <Area type="monotone" dataKey="val" stroke={activeChart.color} fill={activeChart.color} fillOpacity={0.3} />
                          </AreaChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}