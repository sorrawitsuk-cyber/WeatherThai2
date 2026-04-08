import React, { useContext, useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { WeatherContext } from '../context/WeatherContext';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

const provMap = {
  "Bangkok Metropolis": "กรุงเทพมหานคร", "Bangkok": "กรุงเทพมหานคร", 
  "Samut Prakan": "สมุทรปราการ", "Nonthaburi": "นนทบุรี", "Pathum Thani": "ปทุมธานี",
  "Phra Nakhon Si Ayutthaya": "พระนครศรีอยุธยา", "Ayutthaya": "พระนครศรีอยุธยา", 
  "Ang Thong": "อ่างทอง", "Lop Buri": "ลพบุรี", "Sing Buri": "สิงห์บุรี", "Chai Nat": "ชัยนาท", 
  "Saraburi": "สระบุรี", "Chon Buri": "ชลบุรี", "Rayong": "ระยอง", "Chanthaburi": "จันทบุรี",
  "Trat": "ตราด", "Chachoengsao": "ฉะเชิงเทรา", "Prachin Buri": "ปราจีนบุรี", "Nakhon Nayok": "นครนายก", 
  "Sa Kaeo": "สระแก้ว", "Nakhon Ratchasima": "นครราชสีมา", "Buri Ram": "บุรีรัมย์", "Surin": "สุรินทร์", 
  "Si Sa Ket": "ศรีสะเกษ", "Ubon Ratchathani": "อุบลราชธานี", "Yasothon": "ยโสธร", "Chaiyaphum": "ชัยภูมิ", 
  "Amnat Charoen": "อำนาจเจริญ", "Bueng Kan": "บึงกาฬ", "Nong Bua Lam Phu": "หนองบัวลำภู", 
  "Khon Kaen": "ขอนแก่น", "Udon Thani": "อุดรธานี", "Loei": "เลย", "Nong Khai": "หนองคาย", 
  "Maha Sarakham": "มหาสารคาม", "Roi Et": "ร้อยเอ็ด", "Kalasin": "กาฬสินธุ์", "Sakon Nakhon": "สกลนคร", 
  "Nakhon Phanom": "นครพนม", "Mukdahan": "มุกดาหาร", "Chiang Mai": "เชียงใหม่", "Lamphun": "ลำพูน", 
  "Lampang": "ลำปาง", "Uttaradit": "อุตรดิตถ์", "Phrae": "แพร่", "Nan": "น่าน", "Phayao": "พะเยา",
  "Chiang Rai": "เชียงราย", "Mae Hong Son": "แม่ฮ่องสอน", "Nakhon Sawan": "นครสวรรค์", 
  "Uthai Thani": "อุทัยธานี", "Kamphaeng Phet": "กำแพงเพชร", "Tak": "ตาก", "Sukhothai": "สุโขทัย", 
  "Phitsanulok": "พิษณุโลก", "Phichit": "พิจิตร", "Phetchabun": "เพชรบูรณ์", "Ratchaburi": "ราชบุรี", 
  "Kanchanaburi": "กาญจนบุรี", "Suphan Buri": "สุพรรณบุรี", "Nakhon Pathom": "นครปฐม", 
  "Samut Sakhon": "สมุทรสาคร", "Samut Songkhram": "สมุทรสงคราม", "Phetchaburi": "เพชรบุรี",
  "Prachuap Khiri Khan": "ประจวบคีรีขันธ์", "Nakhon Si Thammarat": "นครศรีธรรมราช", "Krabi": "กระบี่",
  "Phangnga": "พังงา", "Phang Nga": "พังงา", "Phuket": "ภูเก็ต", "Surat Thani": "สุราษฎร์ธานี", 
  "Ranong": "ระนอง", "Chumphon": "ชุมพร", "Songkhla": "สงขลา", "Satun": "สตูล", "Trang": "ตรัง", 
  "Phatthalung": "พัทลุง", "Pattani": "ปัตตานี", "Yala": "ยะลา", "Narathiwat": "นราธิวาส"
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

export default function MapPage() {
  const { stations, stationTemps, darkMode } = useContext(WeatherContext);
  
  const [geoData, setGeoData] = useState(null);
  const [activeMode, setActiveMode] = useState('pm25');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [mapZoom, setMapZoom] = useState(window.innerWidth < 1024 ? 5 : 6);
  const [polyOpacity, setPolyOpacity] = useState(0.75);
  
  const [selectedProvForecast, setSelectedProvForecast] = useState(null); // สำหรับ Popup แผนที่ (7 วัน)
  const [stationDetailModal, setStationDetailModal] = useState(null); // 🌟 สำหรับ Popup การ์ด (Air4Thai Style)
  
  const [basemapStyle, setBasemapStyle] = useState('default'); 
  const [flyToPos, setFlyToPos] = useState(null);
  const [showControls, setShowControls] = useState(window.innerWidth >= 1024);

  const basemapUrls = {
    default: darkMode ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    osm: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
  };

  useEffect(() => {
    const handleResize = () => { setIsMobile(window.innerWidth < 1024); if (window.innerWidth >= 1024) setShowControls(true); };
    window.addEventListener('resize', handleResize);
    fetch('/thailand.json').then(res => res.json()).then(data => setGeoData(data)).catch(e => console.error(e));
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const modes = [
    { id: 'pm25', name: '😷 ฝุ่น PM2.5', unit: 'µg/m³', short: 'ฝุ่น PM2.5' },
    { id: 'heat', name: '🥵 ดัชนีความร้อน', unit: '°C', short: 'ความร้อน' },
    { id: 'temp', name: '🌡️ อุณหภูมิ', unit: '°C', short: 'อุณหภูมิ' },
    { id: 'uv', name: '☀️ รังสี UV', unit: 'Index', short: 'รังสี UV' },
    { id: 'rain', name: '☔ โอกาสฝนตก', unit: '%', short: 'โอกาสฝน' },
    { id: 'humidity', name: '💧 ความชื้น', unit: '%', short: 'ความชื้น' },
    { id: 'wind', name: '🌬️ ความเร็วลม', unit: 'km/h', short: 'ความเร็วลม' }
  ];

  const getVal = (station) => {
    if (!station || !stationTemps[station.stationID]) return null;
    const data = stationTemps[station.stationID];
    switch(activeMode) {
        case 'pm25': return station.AQILast?.PM25?.value || 0;
        case 'heat': return Math.round(data.feelsLike || 0);
        case 'temp': return Math.round(data.temp || 0);
        case 'rain': return data.rainProb || 0;
        case 'humidity': return Math.round(data.humidity || 0);
        case 'wind': return Math.round(data.windSpeed || 0);
        case 'uv': return Math.round(data.uv || 0);
        default: return 0;
    }
  };

  const getColor = (val, mode) => {
    if (val === null || val === undefined) return darkMode ? '#334155' : '#cbd5e1';
    if (mode === 'pm25') return val > 75 ? '#ef4444' : val > 37.5 ? '#f97316' : val > 25 ? '#eab308' : val > 15 ? '#22c55e' : '#0ea5e9';
    if (mode === 'temp' || mode === 'heat') return val > 39 ? '#ef4444' : val > 34 ? '#f97316' : val > 28 ? '#eab308' : val > 22 ? '#22c55e' : '#3b82f6';
    if (mode === 'rain') return val > 70 ? '#1e3a8a' : val > 40 ? '#3b82f6' : val > 10 ? '#60a5fa' : '#94a3b8';
    if (mode === 'humidity') return val > 80 ? '#1e3a8a' : val > 60 ? '#3b82f6' : val > 30 ? '#60a5fa' : '#94a3b8';
    if (mode === 'wind') return val > 40 ? '#ef4444' : val > 20 ? '#f97316' : val > 10 ? '#eab308' : '#22c55e';
    if (mode === 'uv') return val > 10 ? '#a855f7' : val > 7 ? '#ef4444' : val > 5 ? '#ea580c' : val > 2 ? '#eab308' : '#22c55e';
    return darkMode ? '#334155' : '#cbd5e1';
  };

  const getAqiText = (pm25) => {
    if (pm25 > 75) return 'มีผลกระทบต่อสุขภาพ';
    if (pm25 > 37.5) return 'เริ่มมีผลกระทบต่อสุขภาพ';
    if (pm25 > 25) return 'คุณภาพอากาศปานกลาง';
    if (pm25 > 15) return 'คุณภาพอากาศดี';
    return 'คุณภาพอากาศดีมาก';
  };

  const rankedStations = useMemo(() => {
    return (stations || [])
      .map(st => ({ ...st, val: getVal(st), color: getColor(getVal(st), activeMode) }))
      .filter(st => st.val !== null && st.val !== undefined)
      .sort((a, b) => b.val - a.val); 
  }, [stations, stationTemps, activeMode, darkMode]);

  const styleGeoJSON = (feature) => {
    const props = Object.values(feature.properties || {}).map(v => String(v).trim());
    let thaiNameFromMap = "";
    for (let p of props) if (provMap[p]) { thaiNameFromMap = provMap[p]; break; }
    const station = stations.find(s => {
        const cleanName = s.areaTH.replace('จังหวัด', '').trim();
        return cleanName === thaiNameFromMap || props.includes(cleanName);
    });
    const val = getVal(station);
    const color = station ? getColor(val, activeMode) : (darkMode ? '#334155' : '#cbd5e1');
    return { fillColor: color, weight: 1.5, opacity: 1, color: '#ffffff', fillOpacity: polyOpacity };
  };

  const onEachFeature = (feature, layer) => {
    layer.on({
        click: () => {
            const props = Object.values(feature.properties || {}).map(v => String(v).trim());
            let thaiNameFromMap = "";
            for (let p of props) if (provMap[p]) { thaiNameFromMap = provMap[p]; break; }
            const station = stations.find(s => s.areaTH.replace('จังหวัด', '').trim() === thaiNameFromMap);
            
            if (station) {
                setSelectedProvForecast({ loading: true, name: station.areaTH, mode: activeMode });
                Promise.all([
                  fetch(`https://api.open-meteo.com/v1/forecast?latitude=${station.lat}&longitude=${station.long}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max,uv_index_max,wind_speed_10m_max&timezone=Asia/Bangkok`),
                  fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${station.lat}&longitude=${station.long}&hourly=pm2_5&timezone=Asia/Bangkok`)
                ])
                .then(async ([wRes, aRes]) => {
                  const wData = await wRes.json();
                  const aData = await aRes.json();
                  const dailyPm25 = [];
                  if (aData.hourly && aData.hourly.pm2_5) {
                      for (let i = 0; i < 7; i++) {
                          const startIdx = i * 24;
                          const dayData = aData.hourly.pm2_5.slice(startIdx, startIdx + 24).filter(v => v !== null);
                          dailyPm25.push(dayData.length > 0 ? Math.round(Math.max(...dayData)) : (dailyPm25[i - 1] || station.AQILast?.PM25?.value || 0));
                      }
                  }
                  setSelectedProvForecast({ loading: false, name: station.areaTH, mode: activeMode, daily: wData.daily, aqiDaily: { pm2_5_max: dailyPm25 } });
                }).catch(() => setSelectedProvForecast({ loading: false, error: true }));
            }
        }
    });
  };

  const createLabelIcon = (station, val) => {
    return L.divIcon({
        className: 'custom-text-icon',
        html: `<div style="color: #1e293b; font-weight: 900; font-size: ${isMobile ? '10px' : '11px'}; text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff; text-align: center; line-height: 1.2;">
                 <div style="font-size: 0.8em; opacity: 0.85;">${station.areaTH.replace('จังหวัด', '')}</div>
                 <div style="font-size: 1.1em;">${val}</div>
               </div>`,
        iconSize: [60, 40], iconAnchor: [30, 20]
    });
  };

  // 🌟 ฟังก์ชันจัดการเมื่อคลิก "การ์ดจัดอันดับ" ด้านขวา
  const handleCardClick = async (station) => {
    setStationDetailModal({ loading: true, station, mode: activeMode });
    try {
        let wUrl = ''; let aUrl = '';
        
        if (activeMode === 'pm25') {
            aUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${station.lat}&longitude=${station.long}&current=pm2_5,pm10,ozone,nitrogen_dioxide,carbon_monoxide,us_aqi&hourly=pm2_5&past_days=1&timezone=Asia%2FBangkok`;
        } else {
            wUrl = `https://api.open-meteo.com/v1/forecast?latitude=${station.lat}&longitude=${station.long}&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,wind_speed_10m,uv_index&hourly=temperature_2m,precipitation_probability,uv_index,wind_speed_10m,relative_humidity_2m&past_days=1&timezone=Asia%2FBangkok`;
        }

        const res = await fetch(wUrl || aUrl);
        const data = await res.json();
        
        // จัดการข้อมูลกราฟ 24 ชม.
        const nowMs = Date.now();
        const startIdx = data.hourly?.time?.findIndex(t => new Date(t).getTime() >= nowMs - 24 * 3600000) || 0;
        const chartData = (data.hourly?.time?.slice(startIdx, startIdx + 24) || []).map((t, i) => {
            const rIdx = startIdx + i;
            let val = 0;
            if (activeMode === 'pm25') val = data.hourly.pm2_5[rIdx];
            else if (activeMode === 'temp' || activeMode === 'heat') val = data.hourly.temperature_2m[rIdx];
            else if (activeMode === 'rain') val = data.hourly.precipitation_probability[rIdx];
            else if (activeMode === 'uv') val = data.hourly.uv_index[rIdx];
            else if (activeMode === 'wind') val = data.hourly.wind_speed_10m[rIdx];
            else if (activeMode === 'humidity') val = data.hourly.relative_humidity_2m[rIdx];
            
            return { time: new Date(t).getHours().toString().padStart(2, '0') + ':00', value: Math.round(val || 0) };
        });

        setStationDetailModal({ loading: false, station, mode: activeMode, current: data.current, chartData });
    } catch (err) {
        setStationDetailModal({ loading: false, error: true });
    }
  };

  const appBg = darkMode ? '#020617' : '#f8fafc'; 
  const cardBg = darkMode ? '#0f172a' : '#ffffff';
  const textColor = darkMode ? '#f8fafc' : '#0f172a'; 
  const borderColor = darkMode ? '#1e293b' : '#e2e8f0';
  const subTextColor = darkMode ? '#94a3b8' : '#64748b'; 
  const currentModeObj = modes.find(m => m.id === activeMode);

  if (!geoData || Object.keys(stationTemps).length === 0) return <div style={{ height: '100vh', background: appBg }} />;

  return (
    <div style={{ height: '100%', width: '100%', background: appBg, display: 'flex', flexDirection: 'column', fontFamily: 'Kanit, sans-serif', padding: isMobile ? '10px' : '20px' }}>
      
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', padding: '15px', background: cardBg, borderRadius: '20px', marginBottom: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', flexShrink: 0 }} className="hide-scrollbar">
        {modes.map(m => (
           <button key={m.id} onClick={() => setActiveMode(m.id)} style={{ padding: '10px 20px', borderRadius: '12px', border: `1px solid ${activeMode === m.id ? 'transparent' : borderColor}`, background: activeMode === m.id ? '#0ea5e9' : (darkMode ? '#1e293b' : '#f1f5f9'), color: activeMode === m.id ? '#fff' : textColor, fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>{m.name}</button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', flex: 1, gap: '15px', overflow: 'hidden' }}>
          <div style={{ flex: 1, borderRadius: '25px', overflow: 'hidden', border: `1px solid ${borderColor}`, position: 'relative', minHeight: isMobile ? '500px' : 'auto' }}>
            <MapContainer center={[13.5, 100.5]} zoom={isMobile ? 5 : 6} style={{ height: '100%', width: '100%', background: appBg }} zoomControl={false}>
                <TileLayer url={basemapUrls[basemapStyle]} />
                <MapZoomListener setMapZoom={setMapZoom} />
                <MapChangeView center={flyToPos} zoom={8} />
                {geoData && <GeoJSON key={`${activeMode}-${polyOpacity}-${basemapStyle}`} data={geoData} style={styleGeoJSON} onEachFeature={onEachFeature} />}
                {mapZoom >= 7 && stations.map(st => {
                    const val = getVal(st);
                    return val !== null && <Marker key={st.stationID} position={[st.lat, st.long]} icon={createLabelIcon(st, val)} interactive={false} />;
                })}
            </MapContainer>

            <div style={{ position: 'absolute', top: '15px', right: '15px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end' }}>
                {isMobile && (
                    <button onClick={() => setShowControls(!showControls)} style={{ width: '45px', height: '45px', borderRadius: '50%', background: '#0ea5e9', color: '#fff', border: 'none', fontSize: '1.2rem', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>{showControls ? '✕' : '⚙️'}</button>
                )}

                {(showControls || !isMobile) && (
                    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end' }}>
                        <button onClick={() => { if(navigator.geolocation) navigator.geolocation.getCurrentPosition(p => setFlyToPos([p.coords.latitude, p.coords.longitude])); }} style={{ background: '#0ea5e9', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>📍 {isMobile ? '' : 'ตำแหน่งฉัน'}</button>
                        <div style={{ background: darkMode ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', padding: '12px', borderRadius: '16px', border: `1px solid ${borderColor}`, width: isMobile ? '150px' : 'auto' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: subTextColor }}>แผนที่ / ความทึบสี</span>
                            <select value={basemapStyle} onChange={(e) => setBasemapStyle(e.target.value)} style={{ width: '100%', background: darkMode ? '#1e293b' : '#f1f5f9', color: textColor, border: 'none', padding: '5px', borderRadius: '8px', fontSize: '0.8rem', marginTop: '5px' }}>
                                <option value="default">มาตรฐาน</option><option value="osm">ถนน</option><option value="satellite">ดาวเทียม</option>
                            </select>
                            <input type="range" min="0.1" max="1" step="0.1" value={polyOpacity} onChange={(e) => setPolyOpacity(parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#0ea5e9', marginTop: '10px' }} />
                        </div>
                    </div>
                )}
            </div>
          </div>

          {!isMobile && (
              <div style={{ width: '320px', background: cardBg, borderRadius: '25px', padding: '20px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column' }}>
                 <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: textColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🏆 จัดอันดับ{currentModeObj?.short}
                 </h3>
                 <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }} className="hide-scrollbar">
                    {rankedStations.map((st, idx) => (
                       <div 
                           key={st.stationID} 
                           onClick={() => handleCardClick(st)} // 🌟 เพิ่ม Event คลิกที่นี่
                           style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 15px', background: darkMode ? '#1e293b' : '#f1f5f9', borderRadius: '15px', marginBottom: '8px', borderLeft: `5px solid ${st.color}`, cursor: 'pointer', transition: 'transform 0.1s' }}
                           onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                           onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                       >
                          <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: textColor }}>{idx+1}. {st.areaTH.replace('จังหวัด', '')}</span>
                          <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '1rem', fontWeight: '900', color: st.color }}>{st.val}</div>
                              <div style={{ fontSize: '0.65rem', color: subTextColor, marginTop: '-3px' }}>{currentModeObj?.unit}</div>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
          )}
      </div>

      {/* 🌟 1. Popup พยากรณ์ 7 วัน (ของเดิมจากแผนที่) */}
      {selectedProvForecast && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }} onClick={() => setSelectedProvForecast(null)}>
              <div style={{ background: cardBg, padding: '25px', borderRadius: '25px', width: '100%', maxWidth: '400px', border: `1px solid ${borderColor}`, boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', paddingBottom: '10px', borderBottom: `1px solid ${borderColor}` }}>
                      <h3 style={{ margin: 0, color: textColor, fontSize: '1.1rem' }}>📍 จ.{selectedProvForecast.name.replace('จังหวัด','')}</h3>
                      <div style={{ fontSize: '0.8rem', background: '#0ea5e9', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontWeight: 'bold' }}>พยากรณ์ 7 วัน</div>
                  </div>
                  {selectedProvForecast.loading ? ( <div style={{ textAlign: 'center', padding: '30px 0', color: subTextColor }}>กำลังดึงข้อมูล...</div> ) : (
                      <div style={{ maxHeight: '50vh', overflowY: 'auto' }} className="hide-scrollbar">
                          {selectedProvForecast.daily?.time.map((t, idx) => {
                              let displayContent = null;
                              const isRain = selectedProvForecast.daily.weathercode[idx] > 50;
                              if (activeMode === 'pm25') {
                                  const pmVal = selectedProvForecast.aqiDaily?.pm2_5_max?.[idx] || 0;
                                  displayContent = <span style={{ color: getColor(pmVal, 'pm25'), fontWeight: '900' }}>😷 {pmVal} µg/m³</span>;
                              } else {
                                  const tMax = Math.round(selectedProvForecast.daily.temperature_2m_max[idx]);
                                  const tMin = Math.round(selectedProvForecast.daily.temperature_2m_min[idx]);
                                  displayContent = <span style={{ fontWeight: '900', color: textColor }}><span style={{color:'#f97316'}}>{tMax}°</span> / <span style={{color:'#3b82f6'}}>{tMin}°</span></span>;
                              }
                              return (
                                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 5px', borderBottom: idx !== 6 ? `1px solid ${borderColor}` : 'none' }}>
                                      <span style={{ fontWeight: 'bold', color: textColor, width: '60px' }}>{idx === 0 ? 'วันนี้' : new Date(t).toLocaleDateString('th-TH', {weekday:'short'})}</span>
                                      <span style={{ fontSize: '1.4rem' }}>{isRain ? '🌧️' : '🌤️'}</span>
                                      <div style={{ textAlign: 'right', minWidth: '100px' }}>{displayContent}</div>
                                  </div>
                              );
                          })}
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* 🌟 2. Popup เจาะลึกรายสถานี (Air4Thai Style) */}
      {stationDetailModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }} onClick={() => setStationDetailModal(null)}>
            <div style={{ background: cardBg, padding: '25px', borderRadius: '25px', width: '100%', maxWidth: '600px', border: `1px solid ${borderColor}`, boxShadow: '0 20px 50px rgba(0,0,0,0.5)', position: 'relative' }} onClick={e => e.stopPropagation()}>
                
                {/* ปุ่มปิด */}
                <button onClick={() => setStationDetailModal(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: darkMode ? '#1e293b' : '#f1f5f9', border: 'none', width: '35px', height: '35px', borderRadius: '50%', color: textColor, cursor: 'pointer', fontWeight: 'bold' }}>✕</button>

                <div style={{ marginBottom: '20px', borderBottom: `1px solid ${borderColor}`, paddingBottom: '15px' }}>
                    <h2 style={{ margin: 0, color: textColor, fontSize: '1.4rem' }}>📍 ข้อมูลเชิงลึก จ.{stationDetailModal.station.areaTH.replace('จังหวัด','')}</h2>
                    <div style={{ fontSize: '0.85rem', color: subTextColor, marginTop: '5px' }}>อัปเดตข้อมูลล่าสุด: {new Date().toLocaleString('th-TH', {hour: '2-digit', minute:'2-digit'})} น.</div>
                </div>

                {stationDetailModal.loading ? (
                    <div style={{ textAlign: 'center', padding: '50px 0', color: subTextColor }}>กำลังวิเคราะห์ข้อมูลเชิงลึก...</div>
                ) : stationDetailModal.error ? (
                    <div style={{ textAlign: 'center', padding: '50px 0', color: '#ef4444' }}>เกิดข้อผิดพลาดในการดึงข้อมูล</div>
                ) : (
                    <div className="fade-in">
                        
                        {/* ส่วนบน: วงกลมหลัก + ข้อมูลรอง */}
                        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px', alignItems: 'center', marginBottom: '30px' }}>
                            
                            {/* วงกลม AQI / Main Metric */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                                {activeMode === 'pm25' ? (
                                    <>
                                        <div style={{ width: '130px', height: '130px', borderRadius: '50%', background: getColor(stationDetailModal.current?.pm2_5, 'pm25'), color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', boxShadow: `0 0 20px ${getColor(stationDetailModal.current?.pm2_5, 'pm25')}50`, border: '6px solid rgba(255,255,255,0.2)' }}>
                                            <span style={{ fontSize: '2.5rem', fontWeight: '900', lineHeight: 1 }}>{Math.round(stationDetailModal.current?.pm2_5 || 0)}</span>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', opacity: 0.9 }}>PM2.5</span>
                                        </div>
                                        <div style={{ marginTop: '10px', fontWeight: 'bold', color: getColor(stationDetailModal.current?.pm2_5, 'pm25'), fontSize: '0.9rem' }}>
                                            {getAqiText(stationDetailModal.current?.pm2_5)}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ width: '130px', height: '130px', borderRadius: '50%', background: getColor(stationDetailModal.current?.temperature_2m, 'temp'), color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', boxShadow: `0 0 20px ${getColor(stationDetailModal.current?.temperature_2m, 'temp')}50`, border: '6px solid rgba(255,255,255,0.2)' }}>
                                            <span style={{ fontSize: '2.5rem', fontWeight: '900', lineHeight: 1 }}>{Math.round(stationDetailModal.current?.temperature_2m || 0)}°</span>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', opacity: 0.9 }}>อุณหภูมิ</span>
                                        </div>
                                        <div style={{ marginTop: '10px', fontWeight: 'bold', color: textColor, fontSize: '0.9rem' }}>
                                            รู้สึกเหมือน {Math.round(stationDetailModal.current?.apparent_temperature || 0)}°C
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* ข้อมูลรอง (Grid) */}
                            <div style={{ flex: 1, width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                {activeMode === 'pm25' ? (
                                    <>
                                        <div style={{ background: darkMode ? '#1e293b' : '#f1f5f9', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold' }}>AQI (US)</div>
                                            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: textColor }}>{stationDetailModal.current?.us_aqi || '-'}</div>
                                        </div>
                                        <div style={{ background: darkMode ? '#1e293b' : '#f1f5f9', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold' }}>PM10</div>
                                            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: textColor }}>{stationDetailModal.current?.pm10 || '-'} <span style={{fontSize:'0.6rem'}}>µg</span></div>
                                        </div>
                                        <div style={{ background: darkMode ? '#1e293b' : '#f1f5f9', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold' }}>O3 (โอโซน)</div>
                                            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: textColor }}>{stationDetailModal.current?.ozone || '-'} <span style={{fontSize:'0.6rem'}}>µg</span></div>
                                        </div>
                                        <div style={{ background: darkMode ? '#1e293b' : '#f1f5f9', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold' }}>CO (คาร์บอนฯ)</div>
                                            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: textColor }}>{stationDetailModal.current?.carbon_monoxide || '-'} <span style={{fontSize:'0.6rem'}}>µg</span></div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ background: darkMode ? '#1e293b' : '#f1f5f9', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold' }}>ความชื้น</div>
                                            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: textColor }}>{stationDetailModal.current?.relative_humidity_2m || '-'} <span style={{fontSize:'0.6rem'}}>%</span></div>
                                        </div>
                                        <div style={{ background: darkMode ? '#1e293b' : '#f1f5f9', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold' }}>โอกาสฝน</div>
                                            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#3b82f6' }}>{stationDetailModal.current?.precipitation || 0} <span style={{fontSize:'0.6rem'}}>mm</span></div>
                                        </div>
                                        <div style={{ background: darkMode ? '#1e293b' : '#f1f5f9', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold' }}>ลม (Wind)</div>
                                            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: textColor }}>{stationDetailModal.current?.wind_speed_10m || '-'} <span style={{fontSize:'0.6rem'}}>km/h</span></div>
                                        </div>
                                        <div style={{ background: darkMode ? '#1e293b' : '#f1f5f9', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold' }}>UV Index</div>
                                            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#a855f7' }}>{stationDetailModal.current?.uv_index || '-'}</div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* ส่วนล่าง: กราฟ 24 ชั่วโมง */}
                        <div style={{ background: darkMode ? 'rgba(0,0,0,0.2)' : '#f8fafc', borderRadius: '16px', padding: '15px', border: `1px solid ${borderColor}` }}>
                            <h4 style={{ margin: '0 0 15px 0', fontSize: '0.9rem', color: subTextColor }}>📈 กราฟแนวโน้ม 24 ชั่วโมง ({currentModeObj?.short})</h4>
                            <div style={{ width: '100%', height: '180px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={stationDetailModal.chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={activeMode === 'pm25' ? '#f97316' : '#0ea5e9'} stopOpacity={0.5}/>
                                                <stop offset="95%" stopColor={activeMode === 'pm25' ? '#f97316' : '#0ea5e9'} stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: subTextColor }} interval="preserveStartEnd" minTickGap={30} />
                                        <Tooltip 
                                            contentStyle={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '10px', fontSize: '0.8rem', color: textColor }} 
                                            itemStyle={{ fontWeight: 'bold', color: activeMode === 'pm25' ? '#f97316' : '#0ea5e9' }}
                                        />
                                        <Area type="monotone" dataKey="value" stroke={activeMode === 'pm25' ? '#f97316' : '#0ea5e9'} strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
}