import React, { useContext, useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { WeatherContext } from '../context/WeatherContext';

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

const legendConfigs = {
  pm25: [ { c: '#ef4444', t: '> 75 (มีผลกระทบ)' }, { c: '#f97316', t: '37.6 - 75 (เริ่มมีผล)' }, { c: '#eab308', t: '25.1 - 37.5 (ปานกลาง)' }, { c: '#22c55e', t: '15.1 - 25.0 (ดี)' }, { c: '#0ea5e9', t: '0 - 15.0 (ดีมาก)' } ],
  heat: [ { c: '#ef4444', t: '> 39°C' }, { c: '#f97316', t: '35-39°C' }, { c: '#eab308', t: '29-34°C' }, { c: '#22c55e', t: '23-28°C' }, { c: '#3b82f6', t: '< 23°C' } ],
  temp: [ { c: '#ef4444', t: '> 39°C' }, { c: '#f97316', t: '35-39°C' }, { c: '#eab308', t: '29-34°C' }, { c: '#22c55e', t: '23-28°C' }, { c: '#3b82f6', t: '< 23°C' } ],
  uv: [ { c: '#a855f7', t: '> 10' }, { c: '#ef4444', t: '8-10' }, { c: '#ea580c', t: '6-7' }, { c: '#eab308', t: '3-5' }, { c: '#22c55e', t: '0-2' } ],
  rain: [ { c: '#1e3a8a', t: '> 70%' }, { c: '#3b82f6', t: '41-70%' }, { c: '#60a5fa', t: '11-40%' }, { c: '#94a3b8', t: '0-10%' } ],
  humidity: [ { c: '#1e3a8a', t: '> 80%' }, { c: '#3b82f6', t: '61-80%' }, { c: '#60a5fa', t: '31-60%' }, { c: '#94a3b8', t: '0-30%' } ],
  wind: [ { c: '#ef4444', t: '> 40' }, { c: '#f97316', t: '21-40' }, { c: '#eab308', t: '11-20' }, { c: '#22c55e', t: '0-10' } ]
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
  const [selectedProvForecast, setSelectedProvForecast] = useState(null);
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
                  // 🌟 แก้ตรงนี้: ดึงค่า PM2.5 แบบ "รายชั่วโมง" (hourly) แทน
                  fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${station.lat}&longitude=${station.long}&hourly=pm2_5&timezone=Asia/Bangkok`)
                ])
                .then(async ([wRes, aRes]) => {
                  const wData = await wRes.json();
                  const aData = await aRes.json();

                  // 🌟 คำนวณหาค่าฝุ่นสูงสุดของแต่ละวัน
                  const dailyPm25 = [];
                  if (aData.hourly && aData.hourly.pm2_5) {
                      for (let i = 0; i < 7; i++) {
                          const startIdx = i * 24;
                          // ตัดมาเฉพาะ 24 ชั่วโมงของวันนั้นๆ
                          const dayData = aData.hourly.pm2_5.slice(startIdx, startIdx + 24).filter(v => v !== null);
                          if (dayData.length > 0) {
                              dailyPm25.push(Math.round(Math.max(...dayData))); // เอาค่าสูงสูด
                          } else {
                              // ถ้า OpenMeteo ให้ข้อมูลไม่ถึง 7 วัน ให้เอาค่าของวันก่อนหน้ามาใช้
                              dailyPm25.push(dailyPm25[i - 1] || station.AQILast?.PM25?.value || 0);
                          }
                      }
                  }

                  setSelectedProvForecast({ 
                    loading: false, 
                    name: station.areaTH, 
                    mode: activeMode,
                    daily: wData.daily,
                    aqiDaily: { pm2_5_max: dailyPm25 } // โยนค่าที่คำนวณเสร็จแล้วเข้าไป
                  });
                })
                .catch(() => setSelectedProvForecast({ loading: false, error: true }));
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
                                <option value="default">มาตรฐาน</option>
                                <option value="osm">ถนน</option>
                                <option value="satellite">ดาวเทียม</option>
                            </select>
                            <input type="range" min="0.1" max="1" step="0.1" value={polyOpacity} onChange={(e) => setPolyOpacity(parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#0ea5e9', marginTop: '10px' }} />
                        </div>

                        {isMobile && (
                            <div style={{ background: darkMode ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)', padding: '12px', borderRadius: '16px', border: `1px solid ${borderColor}`, width: '150px' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '5px' }}>เกณฑ์สี</div>
                                {legendConfigs[activeMode].map((item, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.65rem', marginBottom: '3px' }}>
                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.c }}></span>
                                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.t}</span>
                                    </div>
                                ))}
                            </div>
                        )}
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
                       <div key={st.stationID} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 15px', background: darkMode ? '#1e293b' : '#f1f5f9', borderRadius: '15px', marginBottom: '8px', borderLeft: `5px solid ${st.color}` }}>
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

      {selectedProvForecast && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }} onClick={() => setSelectedProvForecast(null)}>
              <div style={{ background: cardBg, padding: '25px', borderRadius: '25px', width: '100%', maxWidth: '400px', border: `1px solid ${borderColor}`, boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', paddingBottom: '10px', borderBottom: `1px solid ${borderColor}` }}>
                      <h3 style={{ margin: 0, color: textColor, fontSize: '1.1rem' }}>📍 จ.{selectedProvForecast.name.replace('จังหวัด','')}</h3>
                      <div style={{ fontSize: '0.8rem', background: '#0ea5e9', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontWeight: 'bold' }}>พยากรณ์ 7 วัน</div>
                  </div>

                  {selectedProvForecast.loading ? (
                      <div style={{ textAlign: 'center', padding: '30px 0', color: subTextColor }}>กำลังดึงข้อมูล...</div>
                  ) : (
                      <div style={{ maxHeight: '50vh', overflowY: 'auto' }} className="hide-scrollbar">
                          {selectedProvForecast.daily?.time.map((t, idx) => {
                              let displayContent = null;
                              const isRain = selectedProvForecast.daily.weathercode[idx] > 50;
                              
                              if (activeMode === 'pm25') {
                                  const pmVal = selectedProvForecast.aqiDaily?.pm2_5_max?.[idx] || 0;
                                  displayContent = <span style={{ color: getColor(pmVal, 'pm25'), fontWeight: '900' }}>😷 {pmVal} µg/m³</span>;
                              } else if (activeMode === 'rain') {
                                  const rainProb = selectedProvForecast.daily.precipitation_probability_max?.[idx] || 0;
                                  displayContent = <span style={{ color: getColor(rainProb, 'rain'), fontWeight: '900' }}>☔ {rainProb}%</span>;
                              } else if (activeMode === 'uv') {
                                  const uvIdx = Math.round(selectedProvForecast.daily.uv_index_max?.[idx] || 0);
                                  displayContent = <span style={{ color: getColor(uvIdx, 'uv'), fontWeight: '900' }}>☀️ UV {uvIdx}</span>;
                              } else if (activeMode === 'wind') {
                                  const windSpd = Math.round(selectedProvForecast.daily.wind_speed_10m_max?.[idx] || 0);
                                  displayContent = <span style={{ color: getColor(windSpd, 'wind'), fontWeight: '900' }}>🌬️ {windSpd} km/h</span>;
                              } else {
                                  const tMax = Math.round(selectedProvForecast.daily.temperature_2m_max[idx]);
                                  const tMin = Math.round(selectedProvForecast.daily.temperature_2m_min[idx]);
                                  displayContent = <span style={{ fontWeight: '900', color: textColor }}><span style={{color:'#f97316'}}>{tMax}°</span> / <span style={{color:'#3b82f6'}}>{tMin}°</span></span>;
                              }

                              return (
                                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 5px', borderBottom: idx !== 6 ? `1px solid ${borderColor}` : 'none' }}>
                                      <span style={{ fontWeight: 'bold', color: textColor, width: '60px' }}>
                                          {idx === 0 ? 'วันนี้' : new Date(t).toLocaleDateString('th-TH', {weekday:'short'})}
                                      </span>
                                      <span style={{ fontSize: '1.4rem' }}>{isRain ? '🌧️' : '🌤️'}</span>
                                      <div style={{ textAlign: 'right', minWidth: '100px' }}>
                                          {displayContent}
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
}