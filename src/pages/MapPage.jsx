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

export default function MapPage() {
  const { stations, stationTemps, darkMode } = useContext(WeatherContext);
  
  const [geoData, setGeoData] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [mapZoom, setMapZoom] = useState(window.innerWidth < 1024 ? 5 : 6);
  const [polyOpacity, setPolyOpacity] = useState(0.85);
  
  const [activeRiskMode, setActiveRiskMode] = useState('respiratory');
  const [selectedHotspot, setSelectedHotspot] = useState(null); 
  
  const [basemapStyle, setBasemapStyle] = useState('dark'); 
  const [flyToPos, setFlyToPos] = useState(null);
  const [showControls, setShowControls] = useState(window.innerWidth >= 1024);

  const basemapUrls = {
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    osm: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
  };

  useEffect(() => {
    setBasemapStyle(darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    const handleResize = () => { setIsMobile(window.innerWidth < 1024); if (window.innerWidth >= 1024) setShowControls(true); };
    window.addEventListener('resize', handleResize);
    fetch('/thailand.json').then(res => res.json()).then(data => setGeoData(data)).catch(e => console.error(e));
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 🌟 ปรับภาษาให้เข้าใจง่าย ไม่ซับซ้อน
  const riskModes = [
    { id: 'respiratory', name: '🫁 สุขภาพและทางเดินหายใจ', color: '#ec4899', desc: 'คำนวณจาก: ฝุ่น PM2.5 (70%) และ ความร้อน (30%)' },
    { id: 'outdoor', name: '🏕️ กิจกรรมกลางแจ้ง', color: '#3b82f6', desc: 'คำนวณจาก: ฝน (40%), ลม (30%), และความร้อน/UV (30%)' },
    { id: 'wildfire', name: '🔥 ความเสี่ยงไฟป่า', color: '#ea580c', desc: 'คำนวณจาก: ลมแรง (45%), อากาศแห้ง (35%), และความร้อน (20%)' },
    { id: 'heatstroke', name: '🥵 เฝ้าระวังโรคลมแดด', color: '#ef4444', desc: 'คำนวณจาก: อุณหภูมิความร้อน (60%) และ รังสี UV (40%)' }
  ];

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
          factors = [
              { label: 'มลพิษฝุ่น PM2.5', val: pm25, unit: 'µg', risk: nPm, weight: 70, color: '#f97316' },
              { label: 'อุณหภูมิความร้อน', val: temp, unit: '°C', risk: nTemp, weight: 30, color: '#ef4444' }
          ];
      } else if (activeRiskMode === 'outdoor') {
          score = (nRain * 0.4) + (nWind * 0.3) + (nTemp * 0.2) + (nUv * 0.1);
          factors = [
              { label: 'โอกาสเกิดฝนตก', val: rain, unit: '%', risk: nRain, weight: 40, color: '#3b82f6' },
              { label: 'ความเร็วลมกระโชก', val: wind, unit: 'km/h', risk: nWind, weight: 30, color: '#0ea5e9' },
              { label: 'อุณหภูมิความร้อน', val: temp, unit: '°C', risk: nTemp, weight: 20, color: '#ef4444' },
              { label: 'ความเข้มรังสี UV', val: uv, unit: 'Idx', risk: nUv, weight: 10, color: '#a855f7' }
          ];
      } else if (activeRiskMode === 'wildfire') {
          score = (nWind * 0.45) + (nHumDry * 0.35) + (nTemp * 0.20);
          factors = [
              { label: 'ความเร็วลมกระโชก', val: wind, unit: 'km/h', risk: nWind, weight: 45, color: '#0ea5e9' },
              { label: 'ความแห้งแล้งของอากาศ', val: hum, unit: '%', risk: nHumDry, weight: 35, color: '#eab308' },
              { label: 'อุณหภูมิความร้อน', val: temp, unit: '°C', risk: nTemp, weight: 20, color: '#ef4444' }
          ];
      } else if (activeRiskMode === 'heatstroke') {
          score = (nTemp * 0.6) + (nUv * 0.4);
          factors = [
              { label: 'อุณหภูมิความร้อน', val: temp, unit: '°C', risk: nTemp, weight: 60, color: '#ef4444' },
              { label: 'ความเข้มรังสี UV', val: uv, unit: 'Idx', risk: nUv, weight: 40, color: '#a855f7' }
          ];
      }

      return { score: Math.min(Math.round(score * 10) / 10, 10), factors };
  }, [activeRiskMode, stationTemps]);

  const getRiskColor = (score) => {
      if (score >= 8) return '#ef4444'; 
      if (score >= 6) return '#f97316'; 
      if (score >= 4) return '#eab308'; 
      if (score > 0)  return '#22c55e'; 
      return darkMode ? '#334155' : '#cbd5e1'; 
  };

  const getRiskLabel = (score) => {
      if (score >= 8) return 'ความเสี่ยงสูงมาก';
      if (score >= 6) return 'ควรเฝ้าระวัง';
      if (score >= 4) return 'ปานกลาง';
      return 'สถานการณ์ปกติ';
  };

  const rankedHotspots = useMemo(() => {
    return (stations || [])
      .map(st => {
          const risk = calculateRisk(st);
          return { ...st, riskScore: risk.score, factors: risk.factors, color: getRiskColor(risk.score) };
      })
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 15); 
  }, [stations, calculateRisk]);

  const styleGeoJSON = (feature) => {
    const props = Object.values(feature.properties || {}).map(v => String(v).trim());
    let thaiNameFromMap = "";
    for (let p of props) if (provMap[p]) { thaiNameFromMap = provMap[p]; break; }
    
    const station = stations.find(s => {
        const cleanName = s.areaTH.replace('จังหวัด', '').trim();
        return cleanName === thaiNameFromMap || props.includes(cleanName);
    });

    const risk = station ? calculateRisk(station) : { score: 0 };
    const color = station ? getRiskColor(risk.score) : (darkMode ? '#1e293b' : '#e2e8f0');
    
    return { fillColor: color, weight: 1, opacity: 1, color: darkMode ? '#0f172a' : '#ffffff', fillOpacity: polyOpacity };
  };

  const handleRegionClick = (station) => {
      const risk = calculateRisk(station);
      setSelectedHotspot({ station, riskScore: risk.score, factors: risk.factors, color: getRiskColor(risk.score) });
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

  const createRiskIcon = (stationName, score, color) => {
    return L.divIcon({
        className: 'custom-risk-icon',
        html: `<div style="background: ${color}; color: #fff; font-weight: 900; font-size: 12px; padding: 4px 8px; border-radius: 8px; border: 2px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; flex-direction: column; align-items: center; line-height: 1.1;">
                 <span style="font-size: 0.7em; opacity: 0.9;">${stationName}</span>
                 <span>${score}</span>
               </div>`,
        iconSize: [60, 40], iconAnchor: [30, 20]
    });
  };

  const appBg = darkMode ? '#020617' : '#f8fafc'; 
  const cardBg = darkMode ? '#0f172a' : '#ffffff';
  const textColor = darkMode ? '#f8fafc' : '#0f172a'; 
  const borderColor = darkMode ? '#1e293b' : '#e2e8f0';
  const subTextColor = darkMode ? '#94a3b8' : '#64748b'; 

  const activeModeObj = riskModes.find(m => m.id === activeRiskMode);

  if (!geoData || Object.keys(stationTemps).length === 0) return <div style={{ height: '100vh', background: appBg, display: 'flex', justifyContent:'center', alignItems:'center', color: subTextColor, fontFamily: 'Kanit' }}>กำลังโหลดแผนที่เฝ้าระวังภัย...</div>;

  return (
    <div style={{ height: '100%', width: '100%', background: appBg, display: 'flex', flexDirection: 'column', fontFamily: 'Kanit, sans-serif', padding: isMobile ? '10px' : '20px', boxSizing: 'border-box' }}>
      
      <style dangerouslySetInlineStyle={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${darkMode ? '#334155' : '#cbd5e1'}; border-radius: 10px; }
      `}} />

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '15px', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', marginBottom: '15px', flexShrink: 0 }}>
          <div>
              <h2 style={{ margin: 0, color: textColor, fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '10px' }}>🗺️ แผนที่เฝ้าระวังภัยสภาพอากาศ</h2>
              <div style={{ fontSize: '0.85rem', color: subTextColor, marginTop: '2px' }}>วิเคราะห์พื้นที่เสี่ยงเชิงลึกจากหลายปัจจัย</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '5px' }} className="custom-scrollbar">
            {riskModes.map(m => (
                <button key={m.id} onClick={() => setActiveRiskMode(m.id)} style={{ flexShrink: 0, padding: '10px 15px', borderRadius: '12px', border: `1px solid ${activeRiskMode === m.id ? m.color : borderColor}`, background: activeRiskMode === m.id ? (darkMode ? `${m.color}20` : `${m.color}15`) : cardBg, color: activeRiskMode === m.id ? m.color : textColor, fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Kanit' }}>
                    {m.name}
                </button>
            ))}
          </div>
      </div>

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', flex: 1, gap: '15px', overflow: 'hidden' }}>
          
          <div style={{ flex: 1, borderRadius: '25px', overflow: 'hidden', border: `1px solid ${borderColor}`, position: 'relative', minHeight: isMobile ? '450px' : 'auto', background: cardBg }}>
            <MapContainer center={[13.5, 100.5]} zoom={isMobile ? 5 : 6} style={{ height: '100%', width: '100%', background: appBg }} zoomControl={false}>
                <TileLayer url={basemapUrls[basemapStyle]} />
                <MapZoomListener setMapZoom={setMapZoom} />
                <MapChangeView center={flyToPos} zoom={8} />
                
                {geoData && <GeoJSON key={`${activeRiskMode}-${polyOpacity}-${basemapStyle}`} data={geoData} style={styleGeoJSON} onEachFeature={onEachFeature} />}
                
                {mapZoom >= 6 && rankedHotspots.filter(st => st.riskScore >= 4).map(st => (
                    <Marker key={st.stationID} position={[st.lat, st.long]} icon={createRiskIcon(st.areaTH.replace('จังหวัด',''), st.riskScore, st.color)} interactive={false} />
                ))}
            </MapContainer>

            <div style={{ position: 'absolute', top: '15px', right: '15px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end' }}>
                {isMobile && (
                    <button onClick={() => setShowControls(!showControls)} style={{ width: '45px', height: '45px', borderRadius: '50%', background: '#1e293b', color: '#fff', border: `1px solid ${borderColor}`, fontSize: '1.2rem', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>{showControls ? '✕' : '⚙️'}</button>
                )}

                {(showControls || !isMobile) && (
                    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end' }}>
                        <button onClick={() => { if(navigator.geolocation) navigator.geolocation.getCurrentPosition(p => setFlyToPos([p.coords.latitude, p.coords.longitude])); }} style={{ background: cardBg, color: textColor, border: `1px solid ${borderColor}`, padding: '10px 15px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', fontFamily: 'Kanit' }}>📍 พิกัดของฉัน</button>
                        <div style={{ background: darkMode ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', padding: '15px', borderRadius: '16px', border: `1px solid ${borderColor}`, width: '160px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: textColor, marginBottom: '8px' }}>รูปแบบแผนที่</div>
                            <select value={basemapStyle} onChange={(e) => setBasemapStyle(e.target.value)} style={{ width: '100%', background: darkMode ? '#1e293b' : '#f1f5f9', color: textColor, border: 'none', padding: '8px', borderRadius: '8px', fontSize: '0.8rem', outline: 'none', fontFamily: 'Kanit' }}>
                                <option value="dark">สีเข้ม (Dark)</option><option value="light">สีสว่าง (Light)</option><option value="osm">ถนน (Street)</option><option value="satellite">ดาวเทียม</option>
                            </select>
                            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: textColor, marginTop: '15px', marginBottom: '8px' }}>ความทึบเลเยอร์</div>
                            <input type="range" min="0.1" max="1" step="0.1" value={polyOpacity} onChange={(e) => setPolyOpacity(parseFloat(e.target.value))} style={{ width: '100%', accentColor: activeModeObj?.color }} />
                        </div>
                    </div>
                )}
            </div>

            <div style={{ position: 'absolute', bottom: '20px', left: '20px', zIndex: 1000, background: cardBg, padding: '12px', borderRadius: '16px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 15px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: subTextColor, marginBottom: '2px' }}>ระดับความเสี่ยง (0-10)</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: textColor }}><span style={{display:'inline-block', width:'12px', height:'12px', background:'#ef4444', borderRadius:'50%'}}></span> 8-10 (สูงมาก)</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: textColor }}><span style={{display:'inline-block', width:'12px', height:'12px', background:'#f97316', borderRadius:'50%'}}></span> 6-7.9 (เฝ้าระวัง)</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: textColor }}><span style={{display:'inline-block', width:'12px', height:'12px', background:'#eab308', borderRadius:'50%'}}></span> 4-5.9 (ปานกลาง)</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: textColor }}><span style={{display:'inline-block', width:'12px', height:'12px', background:'#22c55e', borderRadius:'50%'}}></span> 0-3.9 (ปกติ)</div>
            </div>
          </div>

          <div style={{ width: isMobile ? '100%' : '340px', background: cardBg, borderRadius: '25px', padding: '20px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column', zIndex: 10, flexShrink: 0 }}>
             <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem', color: textColor }}>📍 พื้นที่เสี่ยงสูงสุด (Top 15)</h3>
             <p style={{ margin: '0 0 15px 0', fontSize: '0.8rem', color: activeModeObj?.color, fontWeight: 'bold' }}>{activeModeObj?.desc}</p>
             
             <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }} className="custom-scrollbar">
                {rankedHotspots.map((st, idx) => (
                   <div 
                       key={st.stationID} 
                       onClick={() => handleRegionClick(st)} 
                       style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 15px', background: darkMode ? '#1e293b' : '#f8fafc', borderRadius: '16px', marginBottom: '10px', borderLeft: `6px solid ${st.color}`, cursor: 'pointer', transition: 'all 0.1s', border: `1px solid ${borderColor}` }}
                       onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.1)'; }}
                       onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                   >
                      <div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: textColor }}>{idx+1}. จ.{st.areaTH.replace('จังหวัด', '')}</div>
                          <div style={{ fontSize: '0.7rem', color: subTextColor, marginTop: '2px' }}>สถานะ: {getRiskLabel(st.riskScore)}</div>
                      </div>
                      <div style={{ background: cardBg, padding: '5px 12px', borderRadius: '12px', textAlign: 'center', border: `1px solid ${borderColor}` }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: '900', color: st.color }}>{st.riskScore}</div>
                      </div>
                   </div>
                ))}
             </div>
          </div>
      </div>

      {selectedHotspot && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }} onClick={() => setSelectedHotspot(null)}>
            <div className="fade-in" style={{ background: cardBg, padding: '25px', borderRadius: '25px', width: '100%', maxWidth: '450px', border: `1px solid ${borderColor}`, boxShadow: '0 20px 50px rgba(0,0,0,0.5)', position: 'relative' }} onClick={e => e.stopPropagation()}>
                <button onClick={() => setSelectedHotspot(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: darkMode ? '#1e293b' : '#f1f5f9', border: 'none', width: '35px', height: '35px', borderRadius: '50%', color: textColor, cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                
                <div style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: `1px solid ${borderColor}` }}>
                    <div style={{ fontSize: '0.85rem', color: subTextColor, fontWeight: 'bold', marginBottom: '5px' }}>ข้อมูลวิเคราะห์ความเสี่ยงรายพื้นที่</div>
                    <h2 style={{ margin: 0, color: textColor, fontSize: '1.4rem' }}>📍 จ.{selectedHotspot.station.areaTH.replace('จังหวัด','')}</h2>
                </div>

                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '25px' }}>
                    <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: selectedHotspot.color, color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', border: `5px solid ${cardBg}`, outline: `2px solid ${selectedHotspot.color}`, flexShrink: 0 }}>
                        <span style={{ fontSize: '2.2rem', fontWeight: '900', lineHeight: 1 }}>{selectedHotspot.riskScore}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>คะแนน</span>
                    </div>
                    <div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: selectedHotspot.color }}>{activeModeObj?.name}</div>
                        <div style={{ fontSize: '0.9rem', color: textColor, marginTop: '5px' }}>สถานะ: <span style={{fontWeight:'bold'}}>{getRiskLabel(selectedHotspot.riskScore)}</span></div>
                        <div style={{ fontSize: '0.75rem', color: subTextColor, marginTop: '5px', lineHeight: 1.5 }}>
                            {selectedHotspot.riskScore >= 6 ? 'หากคะแนนตั้งแต่ 6 ขึ้นไป แนะนำให้เตรียมรับมือและดูแลสุขภาพเป็นพิเศษ' : 'สภาพอากาศอยู่ในเกณฑ์ปกติ สามารถทำกิจกรรมได้ตามความเหมาะสม'}
                        </div>
                    </div>
                </div>

                <h4 style={{ margin: '0 0 15px 0', color: textColor, fontSize: '1rem' }}>🔬 ปัจจัยหลักที่ส่งผลต่อความเสี่ยง:</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {selectedHotspot.factors.map((factor, i) => (
                        <div key={i}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '5px', color: textColor }}>
                                <span style={{fontWeight: 'bold'}}>{factor.label} <span style={{color:subTextColor, fontWeight:'normal'}}>(สัดส่วน {factor.weight}%)</span></span>
                                <span>{factor.val} <span style={{color:subTextColor}}>{factor.unit}</span></span>
                            </div>
                            <div style={{ width: '100%', height: '8px', background: darkMode ? '#1e293b' : '#e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                                <div style={{ width: `${(factor.risk / 10) * 100}%`, height: '100%', background: factor.color, borderRadius: '10px', transition: 'width 1s ease-out' }}></div>
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </div>
      )}

    </div>
  );
}