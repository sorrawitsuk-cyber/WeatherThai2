import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';

// ==============================================================
// 1. ฟังก์ชันคำนวณสีและข้อความตามเกณฑ์ต่างๆ
// ==============================================================
const getAqiDetails = (aqiValue) => {
  const aqi = Number(aqiValue);
  if (isNaN(aqi) || aqi === 0) return { color: '#cccccc', text: 'ไม่มีข้อมูล', level: 0 };
  if (aqi <= 25) return { color: '#00b0f0', text: 'ดีมาก', level: 1 };
  if (aqi <= 50) return { color: '#92d050', text: 'ดี', level: 2 };
  if (aqi <= 100) return { color: '#ffff00', text: 'ปานกลาง', level: 3 };
  if (aqi <= 200) return { color: '#ffc000', text: 'เริ่มมีผลกระทบ', level: 4 };
  return { color: '#ff0000', text: 'มีผลกระทบ', level: 5 };
};

const getPM25Color = (val) => {
  const num = Number(val);
  if (isNaN(num)) return '#333333';
  if (num <= 15.0) return '#008bbf'; 
  if (num <= 25.0) return '#6aa84f'; 
  if (num <= 37.5) return '#d4b500'; 
  if (num <= 75.0) return '#e67e22'; 
  return '#e74c3c'; 
};

const getPM10Color = (val) => {
  const num = Number(val);
  if (isNaN(num)) return '#333333';
  if (num <= 50) return '#008bbf';
  if (num <= 80) return '#6aa84f';
  if (num <= 120) return '#d4b500';
  if (num <= 180) return '#e67e22';
  return '#e74c3c';
};

const getTempColor = (val) => {
  if (isNaN(val) || val === null) return { bg: '#cccccc', text: '#333' };
  if (val < 27) return { bg: '#3498db', text: '#fff' }; 
  if (val <= 32) return { bg: '#2ecc71', text: '#222' }; 
  if (val <= 35) return { bg: '#f1c40f', text: '#222' }; 
  if (val <= 38) return { bg: '#e67e22', text: '#fff' }; 
  return { bg: '#e74c3c', text: '#fff' }; 
};

// ฟังก์ชันคำนวณดัชนีความร้อนและให้สีแจ้งเตือน
const getHeatIndexAlert = (feelsLike) => {
  if (feelsLike >= 41) return { text: 'อันตราย (เสี่ยงฮีทสโตรก)', color: '#dc2626', bg: '#fee2e2', bar: '#ef4444', icon: '🥵' };
  if (feelsLike >= 32) return { text: 'เตือนภัย (เพลียแดด)', color: '#ea580c', bg: '#ffedd5', bar: '#f97316', icon: '😰' };
  if (feelsLike >= 27) return { text: 'เฝ้าระวัง', color: '#ca8a04', bg: '#fef9c3', bar: '#eab308', icon: '😅' };
  return { text: 'ปกติ', color: '#16a34a', bg: '#dcfce7', bar: '#22c55e', icon: '😊' };
};

const extractProvince = (areaTH) => {
  if (!areaTH) return 'ไม่ระบุ';
  const parts = areaTH.split(',');
  return parts[parts.length - 1].trim();
};

// ==============================================================
// 2. Map Components
// ==============================================================
const createCustomMarker = (viewMode, value, level) => {
  let bg, textColor, displayValue;

  if (viewMode === 'aqi') {
    bg = getAqiDetails(value).color;
    textColor = (level >= 2 && level <= 4) ? '#222' : '#fff';
    displayValue = (value === 0 || isNaN(value)) ? '-' : value;
  } else {
    const tempInfo = getTempColor(value);
    bg = tempInfo.bg;
    textColor = tempInfo.text;
    displayValue = (value === 0 || isNaN(value) || value === null) ? '-' : value.toFixed(1);
  }

  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div style="
        background-color: ${bg}; 
        width: 32px; height: 32px; 
        border-radius: 50%; 
        border: 2px solid white; 
        box-shadow: 0 2px 5px rgba(0,0,0,0.4); 
        display: flex; justify-content: center; align-items: center; 
        color: ${textColor}; font-weight: bold; font-size: 11px;
        font-family: 'Kanit', sans-serif;
        transition: all 0.3s ease;
      ">
        ${displayValue}
      </div>
    `,
    iconSize: [36, 36], 
    iconAnchor: [18, 18] 
  });
};

function FitBounds({ stations, activeStation }) {
  const map = useMap();
  useEffect(() => {
    if (activeStation) return; 
    if (stations && stations.length > 0) {
      const bounds = L.latLngBounds(stations.map(s => [parseFloat(s.lat), parseFloat(s.long)]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
    }
  }, [stations, map, activeStation]);
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

// ==============================================================
// 3. Main App Component
// ==============================================================
export default function App() {
  const [allStations, setAllStations] = useState([]);
  const [filteredStations, setFilteredStations] = useState([]);
  const [provinces, setProvinces] = useState([]);
  
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedStationId, setSelectedStationId] = useState('');
  
  const [viewMode, setViewMode] = useState('aqi');
  const [stationTemps, setStationTemps] = useState({});
  const [activeStation, setActiveStation] = useState(null);
  
  // เก็บข้อมูลสภาพอากาศปัจจุบัน + กราฟดัชนีความร้อน
  const [activeWeather, setActiveWeather] = useState(null); 
  // เก็บข้อมูลกราฟฝุ่น PM2.5
  const [activeForecast, setActiveForecast] = useState(null); 
  
  const [loading, setLoading] = useState(true);
  const [lastUpdateText, setLastUpdateText] = useState('');
  
  const cardRefs = useRef({});
  const markerRefs = useRef({});

  // 1. ดึงข้อมูล Air4Thai
  const fetchAirQuality = async (isBackgroundLoad = false) => {
    if (!isBackgroundLoad) setLoading(true);
    try {
      const response = await fetch('/api-air/services/getNewAQI_JSON.php');
      if (!response.ok) throw new Error('Network error');
      const data = await response.json();
      
      if (data && data.stations) {
        setAllStations(data.stations);
        const provs = [...new Set(data.stations.map(s => extractProvince(s.areaTH)))];
        setProvinces(provs.sort());

        if (data.stations.length > 0) {
          const updateDate = data.stations[0].AQILast?.date || '';
          const updateTime = data.stations[0].AQILast?.time || '';
          setLastUpdateText(`${updateDate} เวลา ${updateTime} น.`);
        }
        fetchAdvancedTemperatures(data.stations);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      if (!isBackgroundLoad) setLoading(false);
    }
  };

  // 2. ดึงอุณหภูมิขั้นสูง (Min/Max/Yesterday) สำหรับทุกสถานี
  const fetchAdvancedTemperatures = async (stations) => {
    const newTemps = {};
    const chunkSize = 40; 
    
    for (let i = 0; i < stations.length; i += chunkSize) {
      const chunk = stations.slice(i, i + chunkSize);
      const lats = chunk.map(s => s.lat).join(',');
      const lons = chunk.map(s => s.long).join(',');
      
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current_weather=true&daily=temperature_2m_max,temperature_2m_min&past_days=1&forecast_days=1&timezone=Asia%2FBangkok`;
        const res = await fetch(url);
        const weatherData = await res.json();
        
        const results = Array.isArray(weatherData) ? weatherData : [weatherData];
        results.forEach((r, idx) => {
          if (r && r.current_weather && r.daily) {
            newTemps[chunk[idx].stationID] = {
              temp: r.current_weather.temperature,
              tempMin: r.daily.temperature_2m_min[1],
              tempMax: r.daily.temperature_2m_max[1],
              tempYesterdayMax: r.daily.temperature_2m_max[0]
            };
          }
        });
      } catch (err) {
        console.error("Batch Temp fetch error", err);
      }
    }
    setStationTemps(prev => ({...prev, ...newTemps}));
  };

  useEffect(() => {
    fetchAirQuality();
    const intervalId = setInterval(() => { fetchAirQuality(true); }, 600000); 
    return () => clearInterval(intervalId);
  }, []);

  // กรองและจัดเรียง
  useEffect(() => {
    let result = [...allStations];
    if (selectedProvince) result = result.filter(s => extractProvince(s.areaTH) === selectedProvince);
    if (selectedStationId) result = result.filter(s => s.stationID === selectedStationId);
    
    result.sort((a, b) => {
      if (viewMode === 'aqi') {
        const aqiA = Number(a.AQILast?.AQI?.aqi) || 0;
        const aqiB = Number(b.AQILast?.AQI?.aqi) || 0;
        return aqiB - aqiA; 
      } else {
        const tempA = stationTemps[a.stationID]?.temp || -99;
        const tempB = stationTemps[b.stationID]?.temp || -99;
        return tempB - tempA;
      }
    });
    setFilteredStations(result);
  }, [selectedProvince, selectedStationId, allStations, viewMode, stationTemps]);

  // เมื่อคลิกสถานี ให้ดึงข้อมูลลึกๆ (ดัชนีความร้อน + พยากรณ์ฝุ่น)
  useEffect(() => {
    if (activeStation) {
      if (cardRefs.current[activeStation.stationID]) {
        cardRefs.current[activeStation.stationID].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      const marker = markerRefs.current[activeStation.stationID];
      if (marker) marker.openPopup();

      setActiveWeather(null); 
      setActiveForecast(null);

      const fetchDetails = async () => {
        try {
          // ดึงสภาพอากาศปัจจุบัน (รวม Feels Like) + กราฟพยากรณ์ความร้อนรายชั่วโมง
          const urlWeather = `https://api.open-meteo.com/v1/forecast?latitude=${activeStation.lat}&longitude=${activeStation.long}&current=temperature_2m,apparent_temperature,wind_speed_10m,wind_direction_10m&hourly=apparent_temperature&timezone=auto&forecast_days=2`;
          const resW = await fetch(urlWeather);
          const wData = await resW.json();
          
          let heatForecastList = [];
          if (wData.hourly) {
            const nowTime = new Date().getTime();
            let startIndex = wData.hourly.time.findIndex(tStr => new Date(tStr).getTime() >= nowTime);
            if (startIndex === -1) startIndex = 0;
            
            for (let i = startIndex; i < wData.hourly.time.length && heatForecastList.length < 12; i += 2) {
              const val = wData.hourly.apparent_temperature[i] || 0;
              const tDate = new Date(wData.hourly.time[i]);
              heatForecastList.push({
                time: `${tDate.getHours().toString().padStart(2, '0')}:00`,
                val: Math.round(val),
                colorInfo: getHeatIndexAlert(val) // ดึงสีแท่งกราฟมาเตรียมไว้เลย
              });
            }
          }

          if (wData.current) {
            setActiveWeather({
              temp: wData.current.temperature_2m,
              feelsLike: wData.current.apparent_temperature,
              windSpeed: wData.current.wind_speed_10m,
              windDir: wData.current.wind_direction_10m,
              heatForecast: heatForecastList
            });
          }

          // ดึงพยากรณ์ PM2.5
          const urlAqi = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${activeStation.lat}&longitude=${activeStation.long}&hourly=pm2_5&timezone=auto&forecast_days=2`;
          const resAqi = await fetch(urlAqi);
          const aData = await resAqi.json();
          
          if (aData && aData.hourly) {
            const nowTime = new Date().getTime();
            let startIndex = aData.hourly.time.findIndex(tStr => new Date(tStr).getTime() >= nowTime);
            if (startIndex === -1) startIndex = 0;
            
            const pmForecastList = [];
            for (let i = startIndex; i < aData.hourly.time.length && pmForecastList.length < 12; i += 2) {
              const val = aData.hourly.pm2_5[i] || 0;
              const tDate = new Date(aData.hourly.time[i]);
              pmForecastList.push({
                time: `${tDate.getHours().toString().padStart(2, '0')}:00`,
                val: Math.round(val),
                color: getPM25Color(val)
              });
            }
            setActiveForecast(pmForecastList);
          }
        } catch (err) {
          console.error("Fetch detail error", err);
          setActiveWeather('error');
        }
      };
      fetchDetails();
    }
  }, [activeStation]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '1.5rem', color: '#555' }}>กำลังโหลดข้อมูลสถานีทั่วประเทศ...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', backgroundColor: '#f4f6f9', fontFamily: "'Kanit', sans-serif" }}>
      
      {/* ------------------------------------------- */}
      {/* แถบด้านบน (Filter) */}
      {/* ------------------------------------------- */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '15px 30px', backgroundColor: '#ffffff', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontWeight: 'bold', color: '#2c3e50', fontSize: '0.95rem' }}>🗺️ เลือกจังหวัด:</label>
          <select 
            style={{ padding: '8px 15px', borderRadius: '8px', border: '1px solid #ccc', fontFamily: 'inherit', fontSize: '0.95rem', minWidth: '250px', outline: 'none', cursor: 'pointer' }}
            value={selectedProvince} 
            onChange={(e) => { setSelectedProvince(e.target.value); setSelectedStationId(''); setActiveStation(null); }}
          >
            <option value="">-- แสดงทุกจังหวัด (ทั่วประเทศ) --</option>
            {provinces.map(prov => (<option key={prov} value={prov}>{prov}</option>))}
          </select>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontWeight: 'bold', color: '#2c3e50', fontSize: '0.95rem' }}>📍 เลือกสถานี:</label>
          <select 
            style={{ padding: '8px 15px', borderRadius: '8px', border: '1px solid #ccc', fontFamily: 'inherit', fontSize: '0.95rem', minWidth: '250px', outline: 'none', cursor: 'pointer' }}
            value={selectedStationId} 
            onChange={(e) => {
              setSelectedStationId(e.target.value);
              const stat = allStations.find(s => s.stationID === e.target.value);
              if(stat) setActiveStation(stat);
            }}
            disabled={!selectedProvince && filteredStations.length > 50}
          >
            <option value="">-- ทุกสถานีในพื้นที่ --</option>
            {filteredStations.map(station => (<option key={station.stationID} value={station.stationID}>{station.nameTH}</option>))}
          </select>
        </div>

        <div style={{ marginLeft: 'auto', fontSize: '0.95rem', color: '#555', fontWeight: 'bold' }}>
          ข้อมูลอัปเดตล่าสุด: <span style={{ color: '#0984e3' }}>{lastUpdateText || 'กำลังโหลด...'}</span>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* ------------------------------------------- */}
        {/* แผนที่ (ซ้าย) */}
        {/* ------------------------------------------- */}
        <div style={{ flex: 7, height: '100%', position: 'relative', zIndex: 1 }}>
          <div style={{ position: 'absolute', top: '15px', right: '15px', zIndex: 1000, background: '#fff', padding: '4px', borderRadius: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', display: 'flex', gap: '5px' }}>
            <button 
              onClick={() => setViewMode('aqi')}
              style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s', backgroundColor: viewMode === 'aqi' ? '#0984e3' : 'transparent', color: viewMode === 'aqi' ? '#fff' : '#666' }}
            >
              ☁️ AQI
            </button>
            <button 
              onClick={() => setViewMode('temp')}
              style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s', backgroundColor: viewMode === 'temp' ? '#e67e22' : 'transparent', color: viewMode === 'temp' ? '#fff' : '#666' }}
            >
              🌡️ อุณหภูมิ
            </button>
          </div>

          <MapContainer center={[13.0, 100.0]} zoom={6} style={{ height: '100%', width: '100%', backgroundColor: '#aad3df' }}>
            <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <FitBounds stations={filteredStations} activeStation={activeStation} />
            <FlyToActiveStation activeStation={activeStation} />

            {filteredStations.map((station) => {
              const aqiValue = station.AQILast?.AQI?.aqi || 0;
              const aqiInfo = getAqiDetails(aqiValue);
              const markerValue = viewMode === 'aqi' ? aqiValue : (stationTemps[station.stationID]?.temp || null);

              return (
                <Marker 
                  key={station.stationID} 
                  position={[parseFloat(station.lat), parseFloat(station.long)]}
                  icon={createCustomMarker(viewMode, markerValue, aqiInfo.level)}
                  ref={(ref) => markerRefs.current[station.stationID] = ref}
                  eventHandlers={{ click: () => setActiveStation(station) }}
                >
                  <Popup minWidth={240}>
                    <div style={{ textAlign: 'center', fontFamily: 'Kanit' }}>
                      <strong style={{ fontSize: '1.1rem' }}>{station.nameTH}</strong><br/>
                      
                      <div style={{ margin: '10px 0', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                        <span style={{ fontSize: '1.2rem', color: aqiInfo.color === '#ffff00' ? '#d4b500' : aqiInfo.color, fontWeight: 'bold' }}>
                          AQI: {aqiValue} ({aqiInfo.text})
                        </span>
                      </div>
                      
                      {activeStation?.stationID === station.stationID && (
                        <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fff7e6', borderRadius: '8px', color: '#d35400', fontWeight: 'bold' }}>
                          {activeWeather === null ? (
                            <span>กำลังดึงข้อมูล...</span>
                          ) : activeWeather === 'error' ? (
                            <span>ดึงข้อมูลล้มเหลว</span>
                          ) : (
                            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                              <span style={{ fontSize: '1.1rem' }}>🌡️ {activeWeather.temp} °C</span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem' }}>
                                🌬️ {activeWeather.windSpeed} km/h
                                <div style={{ transform: `rotate(${activeWeather.windDir}deg)`, display: 'inline-block', fontSize: '1.2rem', transition: 'transform 0.5s ease' }}>↓</div>
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* ------------------------------------------- */}
        {/* Sidebar (ขวา) */}
        {/* ------------------------------------------- */}
        <div style={{ flex: 3, minWidth: '380px', maxWidth: '450px', backgroundColor: '#ffffff', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 15px rgba(0,0,0,0.05)', zIndex: 2 }}>
          <div style={{ padding: '20px', background: viewMode === 'aqi' ? '#fff' : '#fffaf0', borderBottom: '1px solid #eee', transition: 'background 0.3s' }}>
            <h2 style={{ fontSize: '1.2rem', color: '#2c3e50', margin: 0, fontWeight: 'bold' }}>
              {viewMode === 'aqi' ? `มลพิษสูงสุด (${filteredStations.length})` : `อุณหภูมิสูงสุด (${filteredStations.length})`}
            </h2>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '15px', scrollBehavior: 'smooth' }}>
            {filteredStations.map((station) => {
              const aqiValue = station.AQILast?.AQI?.aqi || '--';
              const aqiInfo = getAqiDetails(station.AQILast?.AQI?.aqi);
              const isActive = activeStation?.stationID === station.stationID;
              
              const tempObj = stationTemps[station.stationID];
              const currentTemp = tempObj ? tempObj.temp : null;
              
              const isAqiMode = viewMode === 'aqi';
              const displayMainVal = isAqiMode ? aqiValue : (currentTemp !== null ? currentTemp.toFixed(1) : '-');
              const boxColorInfo = isAqiMode ? { bg: aqiInfo.color, text: aqiInfo.level === 3 ? '#000' : '#fff' } : getTempColor(currentTemp);

              const pm25Val = station.AQILast?.PM25?.value || '-';
              const pm10Val = station.AQILast?.PM10?.value || '-';

              return (
                <div 
                  key={station.stationID}
                  ref={el => cardRefs.current[station.stationID] = el}
                  onClick={() => setActiveStation(station)}
                  style={{ 
                    display: 'flex', flexDirection: 'column',
                    background: isActive ? '#f8fbff' : '#fff', 
                    border: isActive ? '1px solid #007bff' : '1px solid #eee', 
                    borderLeft: `6px solid ${boxColorInfo.bg}`, 
                    borderRadius: '10px', padding: '15px', marginBottom: '15px', 
                    cursor: 'pointer', transition: 'all 0.2s ease',
                    boxShadow: isActive ? '0 5px 15px rgba(0,123,255,0.1)' : '0 2px 5px rgba(0,0,0,0.02)'
                  }}
                >
                  {/* หัวการ์ดและข้อมูลพื้นฐาน */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                    <div style={{ flex: 1, paddingRight: '10px' }}>
                      <h4 style={{ fontSize: '1rem', color: '#333', marginBottom: '2px', fontWeight: 'bold' }}>{station.nameTH}</h4>
                      <p style={{ fontSize: '0.8rem', color: '#007bff', marginBottom: '8px', fontWeight: 'bold', margin: 0 }}>{extractProvince(station.areaTH)}</p>
                      
                      <div style={{ minHeight: '35px', display: 'flex', alignItems: 'center', marginTop: '10px' }}>
                        {isAqiMode ? (
                          // ===================================
                          // โหมด AQI: แสดงค่าฝุ่น
                          // ===================================
                          <div style={{ display: 'flex', gap: '15px', fontSize: '0.85rem', color: '#555' }}>
                            <span>PM2.5: <strong style={{ color: getPM25Color(pm25Val), fontSize: '1rem' }}>{pm25Val}</strong></span>
                            <span>PM10: <strong style={{ color: getPM10Color(pm10Val), fontSize: '1rem' }}>{pm10Val}</strong></span>
                          </div>
                        ) : (
                          // ===================================
                          // โหมดอุณหภูมิ: แสดง Min/Max และ เทียบเมื่อวาน
                          // ===================================
                          <div style={{ width: '100%' }}>
                            {tempObj ? (
                              <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#666', marginBottom: '6px', fontWeight: 'bold' }}>
                                  <span><span style={{color: '#3498db', marginRight: '4px'}}>●</span>ต่ำสุด {tempObj.tempMin.toFixed(1)}°</span>
                                  <span style={{color: '#ccc'}}>|</span>
                                  <span><span style={{color: '#e74c3c', marginRight: '4px'}}>●</span>สูงสุด {tempObj.tempMax.toFixed(1)}°</span>
                                </div>
                                {(() => {
                                  const diff = (tempObj.tempMax - tempObj.tempYesterdayMax).toFixed(1);
                                  if (diff > 0) return <div style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: '#fee2e2', color: '#ef4444' }}>↑ ร้อนกว่าเมื่อวาน {diff}°C</div>;
                                  if (diff < 0) return <div style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: '#e0f2fe', color: '#3b82f6' }}>↓ เย็นกว่าเมื่อวาน {Math.abs(diff)}°C</div>;
                                  return <div style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: '#f3f4f6', color: '#6b7280' }}>อุณหภูมิเท่ากับเมื่อวาน</div>;
                                })()}
                              </>
                            ) : (
                              <span style={{ fontSize: '0.8rem', color: '#999' }}>ไม่มีข้อมูลอุณหภูมิ</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ backgroundColor: boxColorInfo.bg, color: boxColorInfo.text, minWidth: '65px', height: '65px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', flexShrink: 0 }}>
                      <span style={{ fontSize: '1.4rem', fontWeight: 'bold', lineHeight: 1 }}>{displayMainVal}</span>
                      <span style={{ fontSize: '0.7rem', opacity: 0.9, marginTop: '2px', fontWeight: 'bold' }}>{isAqiMode ? 'AQI' : '°C'}</span>
                    </div>
                  </div>

                  {/* ========================================================== */}
                  {/* แผงข้อมูลเสริมเมื่อการ์ดนี้ถูกคลิก (แยกตาม Mode ชัดเจน) */}
                  {/* ========================================================== */}
                  {isActive && (
                    <div style={{ borderTop: '1px solid #eee', marginTop: '15px', paddingTop: '15px' }}>
                      
                      {isAqiMode ? (
                        // ============================
                        // Expanded: โหมด AQI (กราฟฝุ่น)
                        // ============================
                        <div>
                          <h5 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#666', marginBottom: '10px' }}>📈 คาดการณ์ PM2.5 ล่วงหน้า 24 ชม.</h5>
                          {activeForecast === null ? (
                            <p style={{ fontSize: '0.8rem', color: '#999', textAlign: 'center' }}>กำลังดึงข้อมูลพยากรณ์ฝุ่น...</p>
                          ) : (
                            <div style={{ height: '90px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '3px', borderBottom: '1px solid #ddd', paddingBottom: '2px' }}>
                              {(() => {
                                const maxVal = Math.max(...activeForecast.map(d => d.val)) + 15;
                                return activeForecast.map((data, index) => {
                                  const heightPercent = Math.max((data.val / maxVal) * 100, 5); 
                                  return (
                                    <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }} title={`เวลา ${data.time} = ${data.val} µg/m³`}>
                                      <div style={{ width: '100%', height: `${heightPercent}%`, backgroundColor: data.color, borderRadius: '2px 2px 0 0', opacity: 0.85, transition: '0.3s' }}></div>
                                      <span style={{ fontSize: '9px', color: '#999', marginTop: '4px', display: index % 2 === 0 ? 'block' : 'none' }}>{data.time.split(':')[0]}</span>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          )}
                        </div>
                      ) : (
                        // ============================
                        // Expanded: โหมดอุณหภูมิ (Feels Like + กราฟความร้อน)
                        // ============================
                        <div>
                          {activeWeather === null ? (
                            <p style={{ fontSize: '0.8rem', color: '#999', textAlign: 'center' }}>กำลังดึงข้อมูลอุณหภูมิเชิงลึก...</p>
                          ) : activeWeather === 'error' ? (
                            <p style={{ fontSize: '0.8rem', color: 'red', textAlign: 'center' }}>ดึงข้อมูลล้มเหลว</p>
                          ) : (
                            <>
                              {/* 1. กล่อง Current Weather + Feels Like Alert */}
                              <div style={{ backgroundColor: '#fff7e6', borderRadius: '8px', padding: '12px', border: '1px solid #ffedd5', marginBottom: '15px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', fontWeight: 'bold', color: '#4b5563', marginBottom: '10px' }}>
                                  <span>🌡️ ปัจจุบัน {activeWeather.temp} °C</span>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    🌬️ ลม: {activeWeather.windSpeed} km/h
                                    <span style={{ transform: `rotate(${activeWeather.windDir}deg)`, display: 'inline-block', fontSize: '1rem' }}>↓</span>
                                  </span>
                                </div>
                                
                                {(() => {
                                  const alertInfo = getHeatIndexAlert(activeWeather.feelsLike);
                                  return (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: alertInfo.bg, color: alertInfo.color, padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.5)' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                                        <span style={{ fontSize: '1.2rem' }}>{alertInfo.icon}</span>
                                        <span>รู้สึกเหมือน: <span style={{ fontSize: '1.1rem' }}>{activeWeather.feelsLike.toFixed(1)} °C</span></span>
                                      </div>
                                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: 'rgba(255,255,255,0.6)', padding: '2px 8px', borderRadius: '10px' }}>
                                        {alertInfo.text}
                                      </span>
                                    </div>
                                  );
                                })()}
                              </div>

                              {/* 2. กราฟพยากรณ์ดัชนีความร้อน */}
                              <h5 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#666', marginBottom: '10px' }}>📈 คาดการณ์ความร้อน (Feels Like) ล่วงหน้า 24 ชม.</h5>
                              {activeWeather.heatForecast && activeWeather.heatForecast.length > 0 && (
                                <div style={{ height: '90px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '3px', borderBottom: '1px solid #ddd', paddingBottom: '2px' }}>
                                  {(() => {
                                    const maxVal = Math.max(...activeWeather.heatForecast.map(d => d.val)) + 5;
                                    return activeWeather.heatForecast.map((data, index) => {
                                      const heightPercent = Math.max((data.val / maxVal) * 100, 5); 
                                      return (
                                        <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }} title={`รู้สึกเหมือน: ${data.val}°C`}>
                                          <div style={{ width: '100%', height: `${heightPercent}%`, backgroundColor: data.colorInfo.bar, borderRadius: '2px 2px 0 0', opacity: 0.85, transition: '0.3s' }}></div>
                                          <span style={{ fontSize: '9px', color: '#999', marginTop: '4px', display: index % 2 === 0 ? 'block' : 'none' }}>{data.time.split(':')[0]}</span>
                                        </div>
                                      );
                                    });
                                  })()}
                                </div>
                              )}
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
    </div>
  );
}