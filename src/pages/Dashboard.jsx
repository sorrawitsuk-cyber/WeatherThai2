import React, { useContext, useState, useEffect, useMemo, useRef } from 'react';
import { WeatherContext } from '../context/WeatherContext';
import { useWeatherData } from '../hooks/useWeatherData';
import { useDraggableScroll } from '../hooks/useDraggableScroll';
import { getAqiTheme, getAlertBanner, getWeatherBackground, getBriefingText } from '../utils/weatherHelpers';

import WeatherMetrics from '../components/Dashboard/WeatherMetrics';
import ForecastChart from '../components/Dashboard/ForecastChart';
import DailyForecast from '../components/Dashboard/DailyForecast';
import ActivityRecommendations from '../components/Dashboard/ActivityRecommendations';
import TopStats from '../components/Dashboard/TopStats';
import WeatherRadar from '../components/Dashboard/WeatherRadar';

export default function Dashboard() {
  const { stations, stationTemps, darkMode, lastUpdated } = useContext(WeatherContext);
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [locationName, setLocationName] = useState('กำลังระบุตำแหน่ง...');
  
  const { weatherData, loadingWeather, fetchWeatherByCoords } = useWeatherData();

  const [geoData, setGeoData] = useState([]);
  const [geoError, setGeoError] = useState(false);
  const [selectedProv, setSelectedProv] = useState('');
  const [selectedDist, setSelectedDist] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  const scrollRef = useRef(null);
  const { isDragging, events: scrollEvents } = useDraggableScroll(scrollRef);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setShowFilter(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetch('/thai_geo.json')
      .then(res => res.json())
      .then(data => setGeoData(Array.isArray(data) ? data : (data.data || [])))
      .catch(e => setGeoError(true));
  }, []);

  const sortedStations = useMemo(() => {
    return [...(stations || [])].sort((a, b) => a.areaTH.localeCompare(b.areaTH, 'th'));
  }, [stations]);

  const currentAmphoes = useMemo(() => {
    if (!geoData || geoData.length === 0 || !selectedProv) return [];
    const cleanProv = selectedProv.replace('จังหวัด', '').trim();
    const pObj = geoData.find(p => {
      const pName = String(p.name_th || p.nameTh || p.name || '').replace('จังหวัด', '').trim();
      return pName === cleanProv || pName.includes(cleanProv);
    });

    if (pObj) {
      const distArray = pObj.amphure || pObj.amphures || pObj.district || [];
      return [...distArray].map(a => ({
        id: a.id || Math.random(), 
        name: String(a.name_th || a.nameTh || a.name || '').trim()
      })).filter(a => a.name !== "").sort((a, b) => a.name.localeCompare(b.name, 'th'));
    }
    return [];
  }, [geoData, selectedProv]);

  // --- 🇹🇭 ระบบคำนวณ Top 5 จาก Firebase ---
  const { top5Heat, top5Cool, top5PM25, top5Rain } = useMemo(() => {
    const heat = [], cool = [], pm25 = [], rain = [];
    (stations || []).forEach(st => {
      const name = st.areaTH.replace('จังหวัด','');
      const temp = Math.round(stationTemps?.[st.stationID]?.temp || -99);
      const coolTemp = Math.round(stationTemps?.[st.stationID]?.temp || 999);
      const pmVal = st.AQILast?.PM25?.value || 0;
      const rainVal = stationTemps?.[st.stationID]?.rainProb || 0;

      if (temp !== -99) heat.push({ name, val: temp });
      if (coolTemp !== 999) cool.push({ name, val: coolTemp });
      if (pmVal > 0) pm25.push({ name, val: pmVal });
      if (rainVal > 0) rain.push({ name, val: rainVal });
    });

    return {
      top5Heat: heat.sort((a, b) => b.val - a.val).slice(0, 5),
      top5Cool: cool.sort((a, b) => a.val - b.val).slice(0, 5),
      top5PM25: pm25.sort((a, b) => b.val - a.val).slice(0, 5),
      top5Rain: rain.sort((a, b) => b.val - a.val).slice(0, 5)
    };
  }, [stations, stationTemps]);

  useEffect(() => {
    const useDefaultLocation = () => {
      fetchWeatherByCoords(13.75, 100.5); 
      setLocationName('กรุงเทพมหานคร');
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
          fetchLocationName(pos.coords.latitude, pos.coords.longitude);
        }, 
        (err) => { 
          console.warn("Geolocation error/timeout:", err.message);
          useDefaultLocation(); 
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
      );
    } else {
      useDefaultLocation();
    }
  }, [fetchWeatherByCoords]);

  const fetchLocationName = async (lat, lon) => {
    try {
      const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=th`);
      const data = await res.json();
      setLocationName(data?.locality || data?.city || 'ตำแหน่งปัจจุบัน');
    } catch (e) { setLocationName('ตำแหน่งปัจจุบัน'); }
  };

  const handleProvChange = (e) => {
    const pName = e.target.value;
    setSelectedProv(pName); setSelectedDist('');
    const found = stations?.find(s => s.areaTH === pName);
    if (found) { 
      fetchWeatherByCoords(found.lat, found.long); 
      setLocationName(pName); 
    }
  };

  const handleDistChange = async (e) => {
    const dName = e.target.value;
    setSelectedDist(dName);
    if (!dName) return;
    setLocationName(`${dName}, ${selectedProv}`);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(dName + ' ' + selectedProv)}&limit=1`);
      const data = await res.json();
      if (data?.[0]) fetchWeatherByCoords(parseFloat(data[0].lat), parseFloat(data[0].lon));
    } catch (err) { console.error(err); }
  };

  // --- 🎨 UI Theme ---
  const appBg = 'var(--bg-app)'; 
  const cardBg = 'var(--bg-card)';
  const textColor = 'var(--text-main)'; 
  const borderColor = 'var(--border-color)';
  const subTextColor = 'var(--text-sub)'; 

  const lastUpdateText = lastUpdated ? new Date(lastUpdated).toLocaleString('th-TH') : '-';

  if (loadingWeather || !weatherData) return (
    <div className="loading-container" style={{ background: appBg, color: textColor }}>
        <div className="loading-spinner"></div>
        <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>กำลังประมวลผลข้อมูลสภาพอากาศ...</div>
        <div style={{ fontSize: '0.85rem', color: subTextColor, marginTop: '5px' }}>เตรียมพร้อมข้อมูลพื้นที่ของคุณ</div>
    </div>
  );

  const { current, hourly, daily, coords } = weatherData;
  
  const aqiTheme = getAqiTheme(current?.pm25);
  
  const isRaining = current?.rainProb > 30;
  const isHot = current?.feelsLike >= 38;
  const currentHour = new Date().getHours();
  const isNight = currentHour >= 18 || currentHour < 6; 

  const weatherIcon = isRaining ? '🌧️' : (isNight ? '🌙' : (isHot ? '☀️' : '🌤️'));
  const weatherText = isRaining ? 'มีโอกาสฝนตก' : (isNight ? 'ท้องฟ้าโปร่งยามค่ำคืน' : (isHot ? 'แดดร้อนจัด' : 'อากาศดี มีเมฆบางส่วน'));
  
  const bgGradient = getWeatherBackground(isNight, isRaining, isHot);
  const alertBanner = getAlertBanner(current);

  const nowMs = Date.now();
  const startIdx = hourly?.time?.findIndex(t => new Date(t).getTime() >= nowMs - 3600000) || 0;
  const chartData = (hourly?.time?.slice(startIdx, startIdx + 24) || []).map((t, i) => {
    const rIdx = startIdx + i;
    return {
      time: new Date(t).getHours().toString().padStart(2, '0') + ':00',
      temp: Math.round(hourly?.temperature_2m?.[rIdx] || 0),
      rain: hourly?.precipitation_probability?.[rIdx] || 0,
      rainAmount: hourly?.precipitation?.[rIdx] || 0,
      pm25: Math.round(hourly?.pm25?.[rIdx] || 0)
    };
  });

  const maxTemp = Math.round(daily?.temperature_2m_max?.[0] || 0);
  const dailyRainProb = daily?.precipitation_probability_max?.[0] || 0;
  const briefingText = getBriefingText(weatherText, maxTemp, dailyRainProb, current?.pm25);

  return (
    <div style={{ height: '100%', width: '100%', background: appBg, display: 'flex', justifyContent: 'center', overflowY: 'auto', fontFamily: 'Kanit, sans-serif' }} className="hide-scrollbar">
      <style dangerouslySetInnerHTML={{__html: `.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } .fade-in { animation: fadeIn 0.3s ease-in-out; } @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }`}} />
      
      <div style={{ width: '100%', maxWidth: isMobile ? '600px' : '1200px', display: 'flex', flexDirection: 'column', gap: isMobile ? '12px' : '15px', padding: isMobile ? '15px' : '30px', paddingBottom: '30px' }}>

        {alertBanner && (
            <div style={{ background: alertBanner.color, color: '#fff', padding: '10px 15px', borderRadius: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', fontSize: '0.9rem', flexShrink: 0 }}>
                <span style={{ fontSize: '1.2rem' }}>{alertBanner.icon}</span> {alertBanner.text}
            </div>
        )}

        {showFilter && (
            <div className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: cardBg, padding: '10px', borderRadius: '16px', border: `1px solid ${borderColor}`, flexWrap: 'wrap', flexShrink: 0 }}>
              <select value={selectedProv} onChange={handleProvChange} style={{ flex: 1, minWidth: '130px', background: 'var(--bg-secondary)', color: '#0ea5e9', border: 'none', fontWeight: 'bold', fontSize: '0.95rem', padding: '10px', borderRadius: '12px', outline: 'none', cursor: 'pointer' }}>
                <option value="">-- เลือกจังหวัด --</option>
                {sortedStations.map(p => <option key={p.stationID} value={p.areaTH}>{p.areaTH}</option>)}
              </select>
              <select value={selectedDist} onChange={handleDistChange} disabled={!selectedProv || geoData.length === 0 || currentAmphoes.length === 0} style={{ flex: 1, minWidth: '130px', background: 'var(--bg-secondary)', color: textColor, border: 'none', fontWeight: 'bold', fontSize: '0.95rem', padding: '10px', borderRadius: '12px', outline: 'none', cursor: 'pointer', opacity: (!selectedProv || currentAmphoes.length === 0) ? 0.5 : 1 }}>
                <option value="">
                  {geoError ? '⚠️ โหลดไฟล์ล้มเหลว' : geoData.length === 0 ? 'กำลังดึงข้อมูล...' : (!selectedProv ? '-- เลือกอำเภอ --' : (currentAmphoes.length === 0 ? '⚠️ ไม่พบข้อมูล' : '-- เลือกอำเภอ --'))}
                </option>
                {currentAmphoes.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
              </select>
            </div>
        )}

        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : '20px', flexShrink: 0 }}>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: isMobile ? '12px' : '20px', minWidth: 0 }}>
            
            {/* Weather Hero Card */}
            <div style={{ background: bgGradient, borderRadius: isMobile ? '24px' : '30px', padding: isMobile ? '20px' : '30px 20px', color: '#fff', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', transition: 'background 0.5s ease', position: 'relative', flexShrink: 0 }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: '15px' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: isMobile ? '1.3rem' : '1.8rem', fontWeight: '900', lineHeight: 1.2 }}>{locationName}</h2>
                    <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '2px' }}>{coords?.lat?.toFixed(2)}, {coords?.lon?.toFixed(2)}</div>
                  </div>
                  <button onClick={() => setShowFilter(!showFilter)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '35px', height: '35px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', flexShrink: 0, backdropFilter: 'blur(5px)' }}>
                     <span style={{ fontSize: '1.2rem' }}>{showFilter ? '✖️' : '🔍'}</span>
                  </button>
               </div>

               <div style={{ display: 'flex', alignItems: 'center', gap: '15px', alignSelf: 'center' }}>
                  <span style={{ fontSize: isMobile ? '4.5rem' : '5.5rem', lineHeight: 1 }}>{weatherIcon}</span>
                  <span style={{ fontSize: isMobile ? '5rem' : '6.5rem', fontWeight: '900', lineHeight: 1 }}>{Math.round(current?.temp || 0)}°</span>
               </div>
               <div style={{ fontSize: isMobile ? '1.2rem' : '1.4rem', fontWeight: 'bold', marginTop: '10px', alignSelf: 'center' }}>{weatherText}</div>
               <div style={{ fontSize: '0.9rem', opacity: 0.9, alignSelf: 'center' }}>รู้สึกเหมือน {Math.round(current?.feelsLike || 0)}°C</div>
               <div style={{ marginTop: '15px', background: aqiTheme.bg, color: '#fff', padding: '6px 20px', borderRadius: '50px', fontWeight: '900', fontSize: '0.85rem', boxShadow: '0 4px 10px rgba(0,0,0,0.2)', alignSelf: 'center' }}>
                 😷 PM2.5: {current?.pm25 || '-'} µg/m³ ({aqiTheme.text})
               </div>
            </div>
            
            <WeatherMetrics 
              current={current} 
              chartData={chartData} 
              cardBg={cardBg} 
              borderColor={borderColor} 
              subTextColor={subTextColor} 
              textColor={textColor} 
            />
          </div>

          <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: isMobile ? '12px' : '20px', minWidth: 0, flexShrink: 0 }}>
            <ForecastChart 
               chartData={chartData} 
               isMobile={isMobile}
               cardBg={cardBg}
               borderColor={borderColor}
               textColor={textColor}
               subTextColor={subTextColor}
               scrollRef={scrollRef}
               isDragging={isDragging}
               scrollEvents={scrollEvents}
            />

            <DailyForecast 
               daily={daily}
               isMobile={isMobile}
               cardBg={cardBg}
               borderColor={borderColor}
               textColor={textColor}
               subTextColor={subTextColor}
            />
          </div>
        </div>

        <div style={{ background: cardBg, padding: '20px', borderRadius: isMobile ? '20px' : '25px', border: `1px solid ${borderColor}`, display: 'flex', alignItems: 'flex-start', gap: '15px', marginBottom: '15px', flexShrink: 0 }}>
            <span style={{ fontSize: '2.5rem' }}>🤖</span>
            <div>
                <h4 style={{ margin: '0 0 5px 0', color: textColor, fontSize: '1rem' }}>สรุปสภาพอากาศวันนี้</h4>
                <p style={{ margin: 0, color: subTextColor, fontSize: '0.9rem', lineHeight: 1.6 }}>{briefingText}</p>
            </div>
        </div>

        {/* UV & PM2.5 Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '15px', flexShrink: 0, marginBottom: '15px' }}>
            <div style={{ background: cardBg, borderRadius: isMobile ? '20px' : '25px', padding: '20px', border: `1px solid ${borderColor}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: subTextColor, fontWeight: 'bold', fontSize: '0.9rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>☀️</span> รังสีอัลตราไวโอเลต (UV)
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '900', color: textColor, marginTop: '5px' }}>
                    {current?.uv || 0} <span style={{ fontSize: '1rem', color: subTextColor, fontWeight: 'normal' }}>
                        {current?.uv > 8 ? 'สูงมาก' : current?.uv > 5 ? 'สูง' : current?.uv > 2 ? 'ปานกลาง' : 'ต่ำ'}
                    </span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'linear-gradient(to right, #22c55e, #eab308, #ea580c, #ef4444, #a855f7)', borderRadius: '10px', marginTop: '15px', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '-4px', left: `${Math.min(((current?.uv || 0) / 11) * 100, 100)}%`, width: '16px', height: '16px', background: '#fff', border: '3px solid #0f172a', borderRadius: '50%', transform: 'translateX(-50%)', boxShadow: '0 2px 5px rgba(0,0,0,0.3)' }}></div>
                </div>
            </div>

            <div style={{ background: cardBg, borderRadius: isMobile ? '20px' : '25px', padding: '20px', border: `1px solid ${borderColor}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: subTextColor, fontWeight: 'bold', fontSize: '0.9rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>😷</span> คุณภาพอากาศ (PM2.5)
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '900', color: textColor, marginTop: '5px' }}>
                    {current?.pm25 || 0} <span style={{ fontSize: '1rem', color: subTextColor, fontWeight: 'normal' }}>
                        {aqiTheme.text}
                    </span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'linear-gradient(to right, #0ea5e9, #22c55e, #eab308, #f97316, #ef4444)', borderRadius: '10px', marginTop: '15px', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '-4px', left: `${Math.min(((current?.pm25 || 0) / 100) * 100, 100)}%`, width: '16px', height: '16px', background: '#fff', border: '3px solid #0f172a', borderRadius: '50%', transform: 'translateX(-50%)', boxShadow: '0 2px 5px rgba(0,0,0,0.3)' }}></div>
                </div>
            </div>
        </div>

        <ActivityRecommendations 
           current={current}
           isMobile={isMobile}
           cardBg={cardBg}
           borderColor={borderColor}
           subTextColor={subTextColor}
        />

        <TopStats 
           top5Heat={top5Heat}
           top5Cool={top5Cool}
           top5PM25={top5PM25}
           top5Rain={top5Rain}
           isMobile={isMobile}
           cardBg={cardBg}
           borderColor={borderColor}
           textColor={textColor}
        />

        <WeatherRadar 
           coords={coords}
           isMobile={isMobile}
           cardBg={cardBg}
           borderColor={borderColor}
           textColor={textColor}
        />

        <div style={{ textAlign: 'center', marginTop: '10px', padding: '20px 0', borderTop: `1px solid ${borderColor}`, opacity: 0.7, flexShrink: 0 }}>
           <div style={{ fontSize: '0.85rem', color: subTextColor, fontWeight: 'bold' }}>อุตุนิยมวิทยาโดย Open-Meteo API • พิกัดโดย OpenStreetMap</div>
           <div style={{ fontSize: '0.75rem', color: subTextColor, marginTop: '5px' }}>อัปเดตข้อมูลระบบล่าสุด: {lastUpdateText}</div>
        </div>

        <div style={{ height: isMobile ? '80px' : '0px', flexShrink: 0, width: '100%' }}></div>

      </div>
    </div>
  );
}