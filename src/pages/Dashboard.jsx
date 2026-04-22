import React, { useContext, useState, useEffect, useMemo, useRef } from 'react';
import { WeatherContext } from '../context/WeatherContext';
import { useWeatherData } from '../hooks/useWeatherData';
import { useDraggableScroll } from '../hooks/useDraggableScroll';
import { getAqiTheme, getAlertBanner, getWeatherBackground, getBriefingText } from '../utils/weatherHelpers';

import WeatherMetrics from '../components/Dashboard/WeatherMetrics';
import ForecastChart from '../components/Dashboard/ForecastChart';
import DailyForecast from '../components/Dashboard/DailyForecast';
import SunriseSunsetArc from '../components/Dashboard/SunriseSunsetArc';
import ActivityRecommendations from '../components/Dashboard/ActivityRecommendations';
import TopStats from '../components/Dashboard/TopStats';
import WeatherRadar from '../components/Dashboard/WeatherRadar';
import DisasterSummary from '../components/Dashboard/DisasterSummary';

function normalizeGeoData(data) {
  return Array.isArray(data) ? data : (data?.data || []);
}

export default function Dashboard() {
  const { stations, stationTemps, lastUpdated, amphoeData, tmdAvailable } = useContext(WeatherContext);
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [locationName, setLocationName] = useState('กำลังระบุตำแหน่ง...');
  
  const { weatherData, loadingWeather, fetchWeatherByCoords } = useWeatherData();

  const [geoData, setGeoData] = useState([]);
  const [geoError, setGeoError] = useState(false);
  const [selectedProv, setSelectedProv] = useState('');
  const [selectedDist, setSelectedDist] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const scrollRef = useRef(null);
  const hourlyScrollRef = useRef(null);
  const mainScrollRef = useRef(null);
  const { isDragging, events: scrollEvents } = useDraggableScroll(scrollRef);
  const { isDragging: isHourlyDragging, events: hourlyScrollEvents } = useDraggableScroll(hourlyScrollRef);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setShowFilter(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Back to top scroll listener
  useEffect(() => {
    const container = mainScrollRef.current;
    if (!container) return;
    const handleScroll = () => {
      setShowBackToTop(container.scrollTop > 600);
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [loadingWeather]);

  useEffect(() => {
    if (amphoeData?.provinces || !selectedProv || geoData.length > 0 || geoError) return;

    let cancelled = false;
    fetch('/thai_geo.json')
      .then(res => res.json())
      .then(data => {
        if (!cancelled) setGeoData(normalizeGeoData(data));
      })
      .catch(() => {
        if (!cancelled) setGeoError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [amphoeData, selectedProv, geoData.length, geoError]);

  const sortedStations = useMemo(() => {
    return [...(stations || [])].sort((a, b) => a.areaTH.localeCompare(b.areaTH, 'th'));
  }, [stations]);

  // 🆕 ใช้ข้อมูลอำเภอจาก TMD API (ผ่าน Firebase) แทน thai_geo.json
  const currentAmphoes = useMemo(() => {
    if (!selectedProv) return [];
    // เข้า amphoeData จาก Firebase (ข้อมูล TMD)
    if (amphoeData?.provinces) {
      const cleanProv = selectedProv.replace('จังหวัด', '').trim();
      const provData = amphoeData.provinces[cleanProv] || amphoeData.provinces[selectedProv];
      if (provData?.amphoes) {
        return provData.amphoes.map((a, i) => ({
          id: i,
          name: String(a.n || '').trim(),
          lat: a.lat,
          lon: a.lon,
          tc: a.tc,
          rh: a.rh,
          ws: a.ws,
          rain: a.rain
        })).filter(a => a.name !== '').sort((a, b) => a.name.localeCompare(b.name, 'th'));
      }
    }
    // Fallback: thai_geo.json (เดิม)
    if (!geoData || geoData.length === 0) return [];
    const cleanProv = selectedProv.replace('จังหวัด', '').trim();
    const pObj = geoData.find(p => {
      const pName = String(p.name_th || p.nameTh || p.name || '').replace('จังหวัด', '').trim();
      return pName === cleanProv || pName.includes(cleanProv);
    });

    if (pObj) {
      const distArray = pObj.amphure || pObj.amphures || pObj.district || pObj.districts || [];
      return [...distArray].map(a => ({
        id: a.id || Math.random(), 
        name: String(a.name_th || a.nameTh || a.name || '').trim()
      })).filter(a => a.name !== "").sort((a, b) => a.name.localeCompare(b.name, 'th'));
    }
    return [];
  }, [amphoeData, geoData, selectedProv]);

  // --- 🇹🇭 ระบบคำนวณ Top 5 จาก Firebase (Today) ---
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

  // --- 🇹🇭 ระบบคำนวณ Top 5 (Yesterday) ---
  const { stationMaxYesterday } = useContext(WeatherContext);
  const { top5HeatY, top5CoolY, top5PM25Y, top5RainY } = useMemo(() => {
    const heat = [], cool = [], pm25 = [], rain = [];
    (stations || []).forEach(st => {
      const name = st.areaTH.replace('จังหวัด','');
      const maxObj = stationMaxYesterday?.[st.stationID] || {};
      
      const temp = maxObj.temp !== undefined ? Math.round(maxObj.temp) : -99;
      const coolTemp = maxObj.temp !== undefined ? Math.round(maxObj.temp) : 999;
      const pmVal = maxObj.pm25 !== undefined ? Math.round(maxObj.pm25) : 0;
      const rainVal = maxObj.rain !== undefined ? maxObj.rain : 0;

      if (temp !== -99) heat.push({ name, val: temp });
      if (coolTemp !== 999) cool.push({ name, val: coolTemp });
      if (pmVal > 0) pm25.push({ name, val: pmVal });
      if (rainVal > 0) rain.push({ name, val: rainVal });
    });

    return {
      top5HeatY: heat.sort((a, b) => b.val - a.val).slice(0, 5),
      top5CoolY: cool.sort((a, b) => a.val - b.val).slice(0, 5),
      top5PM25Y: pm25.sort((a, b) => b.val - a.val).slice(0, 5),
      top5RainY: rain.sort((a, b) => b.val - a.val).slice(0, 5)
    };
  }, [stations, stationMaxYesterday]);

  useEffect(() => {
    const fallbackToDefaultLocation = () => {
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
          fallbackToDefaultLocation(); 
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
      );
    } else {
      fallbackToDefaultLocation();
    }
  }, [fetchWeatherByCoords]);

  const fetchLocationName = async (lat, lon) => {
    try {
      const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=th`);
      const data = await res.json();
      
      const admin = data?.localityInfo?.administrative || [];
      const prov = admin.find(a => a.adminLevel === 4 && a.isoCode)?.name || data?.principalSubdivision;
      const dist = admin.find(a => a.adminLevel === 6 && (a.name.includes('อำเภอ') || a.name.includes('เขต')) )?.name;
      
      if (dist && prov) {
        const cleanProv = prov.startsWith('จังหวัด') ? prov : (prov === 'กรุงเทพมหานคร' ? prov : `จังหวัด${prov}`);
        setLocationName(`${dist} ${cleanProv}`);
      } else {
        setLocationName(data?.locality || data?.city || 'ตำแหน่งปัจจุบัน');
      }
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
    
    // 🆕 ถ้าอำเภอมาจาก TMD — ใช้พิกัดตรงจาก TMD ไม่ต้อง geocode
    const amphoe = currentAmphoes.find(a => a.name === dName);
    if (amphoe?.lat && amphoe?.lon) {
      fetchWeatherByCoords(amphoe.lat, amphoe.lon);
      return;
    }
    // Fallback: Nominatim
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
  const desktopMainColumns = 'minmax(0, 1.7fr) minmax(340px, 0.9fr)';
  const desktopHeroColumns = 'minmax(0, 1.08fr) minmax(300px, 0.92fr)';
  const desktopActivityColumns = 'minmax(0, 1.25fr) minmax(250px, 0.75fr)';
  const hourlyNowCardBg = 'linear-gradient(180deg, color-mix(in srgb, #0ea5e9 16%, var(--bg-card)), color-mix(in srgb, #0ea5e9 6%, var(--bg-secondary)))';
  const hourlyNowBadgeBg = 'color-mix(in srgb, #0ea5e9 14%, transparent)';
  const hourlyBarTrackBg = 'color-mix(in srgb, var(--text-main) 10%, transparent)';

  const nowMs = Date.now();
  const startIdx = hourly?.time?.findIndex(t => new Date(t).getTime() >= nowMs - 3600000) || 0;
  const chartData = (hourly?.time?.slice(startIdx, startIdx + 24) || []).map((t, i) => {
    const rIdx = startIdx + i;
    const hour = new Date(t).getHours();
    const isNightHour = hour >= 18 || hour < 6;
    const rainP = hourly?.precipitation_probability?.[rIdx] || 0;
    const rainA = hourly?.precipitation?.[rIdx] || 0;
    
    let icon = isNightHour ? '🌙' : '☀️';
    if (rainP > 70 || rainA > 5) icon = '⛈️';
    else if (rainP > 30 || rainA > 1) icon = '🌧️';
    else if (rainP > 10 || rainA > 0) icon = isNightHour ? '☁️' : '🌥️';
    else if (rainP > 0) icon = isNightHour ? '☁️' : '🌤️';

    return {
      time: hour.toString().padStart(2, '0') + ':00',
      temp: Math.round(hourly?.temperature_2m?.[rIdx] || 0),
      feelsLike: Math.round(hourly?.apparent_temperature?.[rIdx] || 0),
      rain: rainP,
      rainAmount: rainA,
      pm25: Math.round(hourly?.pm25?.[rIdx] || 0),
      icon: icon
    };
  });

  const maxTemp = Math.round(daily?.temperature_2m_max?.[0] || 0);
  const dailyRainProb = daily?.precipitation_probability_max?.[0] || 0;
  
  const tomorrowMaxTemp = daily?.temperature_2m_max?.[1] ? Math.round(daily.temperature_2m_max[1]) : null;
  const tomorrowRainProb = daily?.precipitation_probability_max?.[1] || 0;

  const briefingText = getBriefingText(weatherText, current?.temp, current?.feelsLike, maxTemp, dailyRainProb, current?.pm25, currentHour, tomorrowMaxTemp, tomorrowRainProb);

  // Date/time formatting
  const now = new Date();
  const thaiDate = now.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const thaiTime = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

  const scrollToTop = () => {
    mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div ref={mainScrollRef} style={{ height: '100%', width: '100%', background: appBg, display: 'flex', justifyContent: 'center', overflowY: 'auto', fontFamily: 'Kanit, sans-serif', position: 'relative' }} className="hide-scrollbar">
      <style dangerouslySetInnerHTML={{__html: `.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } .fade-in { animation: fadeIn 0.3s ease-in-out; } @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } } @keyframes pulseGlow { 0% { filter: drop-shadow(0 0 10px rgba(255,255,255,0.1)); transform: scale(1); } 50% { filter: drop-shadow(0 0 25px rgba(255,255,255,0.4)); transform: scale(1.05); } 100% { filter: drop-shadow(0 0 10px rgba(255,255,255,0.1)); transform: scale(1); } }`}} />
      
      <div style={{ width: '100%', maxWidth: isMobile ? '600px' : '1280px', display: 'flex', flexDirection: 'column', gap: isMobile ? '12px' : '20px', padding: isMobile ? '15px' : '30px', paddingBottom: '40px', margin: '0 auto' }}>

        {/* === SECTION 1: Alert Banner === */}
        {alertBanner && (
            <div style={{ background: alertBanner.color, color: '#fff', padding: '12px 20px', borderRadius: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', fontSize: '1rem', flexShrink: 0 }}>
                <span style={{ fontSize: '1.4rem' }}>{alertBanner.icon}</span> {alertBanner.text}
            </div>
        )}

        {/* === SECTION 2: Location Filter === */}
        {showFilter && (
            <div className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: '15px', background: cardBg, padding: '15px', borderRadius: '20px', border: `1px solid ${borderColor}`, flexWrap: 'wrap', flexShrink: 0 }}>
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

        
        {/* === MAIN LAYOUT GRID (Figma Style) === */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : desktopMainColumns, gap: isMobile ? '12px' : '20px', flexShrink: 0, width: '100%', alignItems: 'stretch' }}>
           
           {/* LEFT COLUMN: Hero + Metrics + Briefing */}
           <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '12px' : '20px', minWidth: 0 }}>
              
              {/* --- Hero Card --- */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : desktopHeroColumns, gap: isMobile ? '12px' : '20px', flexShrink: 0, alignItems: 'stretch' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <div style={{ background: bgGradient, borderRadius: isMobile ? '24px' : '30px', padding: isMobile ? '20px' : '28px 24px', color: '#fff', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', transition: 'background 0.5s ease', position: 'relative', flex: 1, minHeight: isMobile ? 'auto' : '318px' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: '5px' }}>
                          <div>
                            <h2 style={{ margin: 0, fontSize: isMobile ? '1.3rem' : '1.8rem', fontWeight: '900', lineHeight: 1.2 }}>{locationName}</h2>
                            <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '2px' }}>{thaiDate} • {thaiTime} น.</div>
                          </div>
                          <button onClick={() => setShowFilter(!showFilter)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '35px', height: '35px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', flexShrink: 0, backdropFilter: 'blur(5px)' }}>
                             <span style={{ fontSize: '1.2rem' }}>{showFilter ? '✖️' : '🔍'}</span>
                          </button>
                       </div>

                       <div style={{ display: 'flex', alignItems: 'center', gap: '15px', alignSelf: 'center' }}>
                          <span style={{ fontSize: isMobile ? '4.5rem' : '5.5rem', lineHeight: 1, animation: 'pulseGlow 3s infinite ease-in-out' }}>{weatherIcon}</span>
                          <span style={{ fontSize: isMobile ? '5rem' : '6.5rem', fontWeight: '900', lineHeight: 1 }}>{Math.round(current?.temp || 0)}°</span>
                       </div>
                       <div style={{ fontSize: isMobile ? '1.2rem' : '1.4rem', fontWeight: 'bold', marginTop: '10px', alignSelf: 'center' }}>{weatherText}</div>
                       <div style={{ fontSize: '0.9rem', opacity: 0.9, alignSelf: 'center', marginTop: '6px', background: 'rgba(0,0,0,0.15)', padding: '4px 12px', borderRadius: '20px' }}>
                         รู้สึกเหมือน {Math.round(current?.feelsLike || 0)}°C <span style={{ opacity: 0.5, margin: '0 5px' }}>|</span> สูงสุด {Math.round(daily?.temperature_2m_max?.[0] || current?.temp)}° <span style={{ opacity: 0.5, margin: '0 5px' }}>|</span> ต่ำสุด {Math.round(daily?.temperature_2m_min?.[0] || current?.temp)}°
                       </div>
                    </div>
                  </div>

                  {/* --- Key Metrics (Left Column) --- */}
                  {isMobile ? (
                    <WeatherMetrics 
                      current={current} 
                      chartData={chartData} 
                      cardBg={cardBg} 
                      borderColor={borderColor} 
                      subTextColor={subTextColor} 
                      textColor={textColor} 
                    />
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '15px', minWidth: 0 }}>
                        <div style={{ background: cardBg, borderRadius: '20px', padding: '16px', border: `1px solid ${borderColor}`, minHeight: '150px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: subTextColor, fontWeight: 'bold', fontSize: '0.95rem' }}>
                                <span style={{ fontSize: '1.2rem' }}>☀️</span> รังสี UV
                            </div>
                            <div style={{ fontSize: '2rem', fontWeight: '900', color: textColor, marginTop: '5px' }}>
                                {current?.uv || 0} <span style={{ fontSize: '0.9rem', color: subTextColor, fontWeight: 'normal' }}>
                                    {current?.uv > 8 ? 'สูงมาก' : current?.uv > 5 ? 'สูง' : current?.uv > 2 ? 'ปานกลาง' : 'ต่ำ'}
                                </span>
                            </div>
                            <div style={{ width: '100%', height: '8px', background: 'linear-gradient(to right, #22c55e, #eab308, #ea580c, #ef4444, #a855f7)', borderRadius: '10px', marginTop: '15px', position: 'relative' }}>
                                <div style={{ position: 'absolute', top: '-4px', left: `${Math.min(((current?.uv || 0) / 11) * 100, 100)}%`, width: '16px', height: '16px', background: '#fff', border: '3px solid #0f172a', borderRadius: '50%', transform: 'translateX(-50%)', boxShadow: '0 2px 5px rgba(0,0,0,0.3)' }}></div>
                            </div>
                        </div>

                        <div style={{ background: cardBg, borderRadius: '20px', padding: '16px', border: `1px solid ${borderColor}`, minHeight: '150px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: subTextColor, fontWeight: 'bold', fontSize: '0.95rem' }}>
                                <span style={{ fontSize: '1.2rem' }}>🌫️</span> ระดับฝุ่น
                            </div>
                            <div style={{ fontSize: '2rem', fontWeight: '900', color: textColor, marginTop: '5px' }}>
                                {current?.pm25 || 0} <span style={{ fontSize: '0.9rem', color: subTextColor, fontWeight: 'normal' }}>µg/m³</span>
                            </div>
                            <div style={{ width: '100%', height: '8px', background: 'linear-gradient(to right, #0ea5e9 0%, #22c55e 15%, #eab308 30%, #f97316 50%, #ef4444 75%, #7f1d1d 100%)', borderRadius: '10px', marginTop: '15px', position: 'relative' }}>
                                <div style={{ position: 'absolute', top: '-4px', left: `${Math.min(((current?.pm25 || 0) / 250) * 100, 100)}%`, width: '16px', height: '16px', background: '#fff', border: '3px solid #0f172a', borderRadius: '50%', transform: 'translateX(-50%)', boxShadow: '0 2px 5px rgba(0,0,0,0.3)' }}></div>
                            </div>
                        </div>

                        <div style={{ background: cardBg, borderRadius: '20px', padding: '16px', border: `1px solid ${borderColor}`, minHeight: '128px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: subTextColor, fontSize: '0.85rem', fontWeight: 'bold' }}>
                                <span style={{ fontSize: '1.2rem' }}>💨</span> ลม
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                                <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: textColor }}>
                                    {current?.windSpeed || 0} <span style={{ fontSize: '0.9rem', fontWeight: 'normal' }}>กม./ชม.</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ background: cardBg, borderRadius: '20px', padding: '16px', border: `1px solid ${borderColor}`, minHeight: '128px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: subTextColor, fontSize: '0.85rem', fontWeight: 'bold' }}>
                                <span style={{ fontSize: '1.2rem' }}>💧</span> ความชื้น
                            </div>
                            <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: textColor, marginTop: '8px' }}>
                                {current?.humidity || 0}%
                            </div>
                        </div>
                    </div>
                  )}
              </div>

              {/* --- AI Briefing --- */}
              <div style={{ background: cardBg, padding: isMobile ? '20px' : '22px 24px', borderRadius: isMobile ? '20px' : '25px', border: `1px solid ${borderColor}`, display: 'flex', alignItems: 'flex-start', gap: '15px', flexShrink: 0 }}>
                  <span style={{ fontSize: '2.5rem' }}>🤖</span>
                  <div>
                      <h4 style={{ margin: '0 0 5px 0', color: textColor, fontSize: '1rem' }}>สรุปสภาพอากาศวันนี้</h4>
                      <p style={{ margin: 0, color: subTextColor, fontSize: '0.9rem', lineHeight: 1.8 }}>{briefingText}</p>
                  </div>
              </div>

              {/* --- Activity & Sun --- */}
              {!isMobile ? (
                <div style={{ display: 'grid', gridTemplateColumns: desktopActivityColumns, gap: '20px', flexShrink: 0, alignItems: 'stretch' }}>
                  <ActivityRecommendations 
                     current={current}
                     chartData={chartData}
                     isMobile={isMobile}
                     cardBg={cardBg}
                     borderColor={borderColor}
                     subTextColor={subTextColor}
                  />
                  <div style={{ minWidth: 0, display: 'flex' }}>
                    <SunriseSunsetArc 
                       current={current} 
                       cardBg={cardBg} 
                       borderColor={borderColor} 
                       textColor={textColor} 
                       subTextColor={subTextColor} 
                       isMobile={isMobile} 
                    />
                  </div>
                </div>
              ) : (
                <ActivityRecommendations 
                   current={current}
                   chartData={chartData}
                   isMobile={isMobile}
                   cardBg={cardBg}
                   borderColor={borderColor}
                   subTextColor={subTextColor}
                />
              )}

              {/* --- Weather Radar --- */}
              <WeatherRadar 
                 coords={coords}
                 isMobile={isMobile}
                 cardBg={cardBg}
                 borderColor={borderColor}
                 textColor={textColor}
              />

           </div> {/* END LEFT COLUMN */}

           {/* RIGHT COLUMN: Hourly Forecast */}
           <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
              <div style={{ background: cardBg, borderRadius: '25px', padding: isMobile ? '20px' : '22px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column', height: isMobile ? 'auto' : '100%', minHeight: isMobile ? 'auto' : '980px' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', color: textColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.4rem' }}>🕒</span> พยากรณ์รายชั่วโมง
                      </h3>
                      <div style={{ fontSize: '0.78rem', color: subTextColor, lineHeight: 1.5 }}>
                        รูปแบบเลื่อนซ้ายขวาแบบแอปอากาศ ดูเวลา อุณหภูมิ ฝน และดัชนีสำคัญได้ในแถวเดียว
                      </div>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: subTextColor, fontWeight: 'bold', background: 'var(--bg-secondary)', border: `1px solid ${borderColor}`, borderRadius: '999px', padding: '6px 10px' }}>
                      ↔ ลากเพื่อเลื่อนดูชั่วโมงถัดไป
                    </div>
                 </div>

                 <div
                    ref={hourlyScrollRef}
                    {...hourlyScrollEvents}
                    style={{ overflowX: 'auto', overflowY: 'hidden', paddingBottom: '10px', cursor: isHourlyDragging ? 'grabbing' : 'grab', userSelect: 'none' }}
                    className="hide-scrollbar"
                 >
                    <div style={{ display: 'flex', gap: '12px', minWidth: 'max-content', paddingRight: '8px' }}>
                      {chartData.map((item, idx) => {
                        const isNowCard = idx === 0;
                        const rainColor = item.rain > 60 ? '#2563eb' : item.rain > 30 ? '#0ea5e9' : '#7dd3fc';
                        const pmColor = item.pm25 > 75 ? '#ef4444' : item.pm25 > 37.5 ? '#f97316' : item.pm25 > 25 ? '#eab308' : item.pm25 > 15 ? '#22c55e' : '#0ea5e9';
                        return (
                          <div
                            key={idx}
                            style={{
                              width: isMobile ? '132px' : '146px',
                              minHeight: isMobile ? '192px' : '204px',
                              padding: '14px 12px',
                              background: isNowCard
                                ? hourlyNowCardBg
                                : 'var(--bg-secondary)',
                              borderRadius: '22px',
                              border: `1px solid ${isNowCard ? '#0ea5e955' : borderColor}`,
                              boxShadow: isNowCard ? '0 10px 24px rgba(14,165,233,0.18)' : 'none',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              flexShrink: 0,
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                              <div>
                                <div style={{ fontSize: '0.82rem', color: textColor, fontWeight: '900' }}>{isNowCard ? 'ตอนนี้' : item.time}</div>
                                <div style={{ fontSize: '0.68rem', color: subTextColor, marginTop: '2px' }}>{isNowCard ? item.time : 'รายชั่วโมง'}</div>
                              </div>
                              {isNowCard && (
                                <span style={{ fontSize: '0.62rem', color: '#0ea5e9', background: hourlyNowBadgeBg, borderRadius: '999px', padding: '3px 8px', fontWeight: 'bold' }}>
                                  สด
                                </span>
                              )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '6px 0' }}>
                              <div style={{ fontSize: isMobile ? '2rem' : '2.2rem', lineHeight: 1 }}>{item.icon}</div>
                              <div style={{ fontSize: isMobile ? '1.65rem' : '1.85rem', fontWeight: '900', color: textColor, lineHeight: 1 }}>{item.temp}°</div>
                              <div style={{ fontSize: '0.74rem', color: subTextColor, fontWeight: 'bold' }}>รู้สึกเหมือน {item.feelsLike}°</div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '0.72rem' }}>
                                <span style={{ color: subTextColor }}>ฝน</span>
                                <span style={{ color: rainColor, fontWeight: '900' }}>{item.rain}%</span>
                              </div>
                              <div style={{ width: '100%', height: '6px', background: hourlyBarTrackBg, borderRadius: '999px', overflow: 'hidden' }}>
                                <div style={{ width: `${Math.min(item.rain, 100)}%`, height: '100%', background: `linear-gradient(90deg, ${rainColor}, #60a5fa)` }}></div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '0.72rem' }}>
                                <span style={{ color: subTextColor }}>PM2.5</span>
                                <span style={{ color: pmColor, fontWeight: '900' }}>{item.pm25}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                 </div>
                 
              </div>
           </div> {/* END RIGHT COLUMN */}

        </div> {/* END MAIN GRID */}

{/* === SECTION 8: Mobile-only UV and PM2.5 cards === */}
        {isMobile && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px', flexShrink: 0 }}>
            <div style={{ background: cardBg, borderRadius: '20px', padding: '20px', border: `1px solid ${borderColor}` }}>
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

            <SunriseSunsetArc 
               current={current} 
               cardBg={cardBg} 
               borderColor={borderColor} 
               textColor={textColor} 
               subTextColor={subTextColor} 
               isMobile={isMobile} 
            />
          </div>
        )}

        {/* === SECTION 9: Daily Forecast 7 days (full width) === */}
        <DailyForecast 
           daily={daily}
           isMobile={isMobile}
           cardBg={cardBg}
           borderColor={borderColor}
           textColor={textColor}
           subTextColor={subTextColor}
        />

        {/* === SECTION 10: Top 5 Stats (collapsible) === */}
        <TopStats 
           top5Heat={top5Heat}
           top5Cool={top5Cool}
           top5PM25={top5PM25}
           top5Rain={top5Rain}
           top5HeatY={top5HeatY}
           top5CoolY={top5CoolY}
           top5PM25Y={top5PM25Y}
           top5RainY={top5RainY}
           isMobile={isMobile}
           cardBg={cardBg}
           borderColor={borderColor}
           textColor={textColor}
        />

        {/* === SECTION 11: GISTDA Disaster Summary === */}
        <DisasterSummary 
           isMobile={isMobile}
           cardBg={cardBg}
           borderColor={borderColor}
           textColor={textColor}
           subTextColor={subTextColor}
        />

        {/* === Footer === */}
        <div style={{ textAlign: 'center', marginTop: '10px', padding: '20px 0', borderTop: `1px solid ${borderColor}`, opacity: 0.7, flexShrink: 0 }}>
           <div style={{ fontSize: '0.85rem', color: subTextColor, fontWeight: 'bold' }}>อุตุนิยมวิทยาโดย {tmdAvailable ? 'กรมอุตุนิยมวิทยา (TMD)' : 'Open-Meteo API'} • พิกัดโดย OpenStreetMap</div>
           <div style={{ fontSize: '0.75rem', color: subTextColor, marginTop: '5px' }}>อัปเดตข้อมูลระบบล่าสุด: {lastUpdateText}</div>
        </div>

        <div style={{ height: isMobile ? '80px' : '0px', flexShrink: 0, width: '100%' }}></div>

      </div>

      {/* === Back to Top Button (mobile) === */}
      {isMobile && showBackToTop && (
        <button 
          onClick={scrollToTop}
          style={{ 
            position: 'fixed', bottom: '90px', right: '20px', 
            width: '48px', height: '48px', borderRadius: '50%', 
            background: 'var(--bg-card)', border: `1px solid ${borderColor}`,
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            cursor: 'pointer', zIndex: 100, 
            animation: 'fadeIn 0.3s ease-in-out',
            backdropFilter: 'blur(10px)'
          }}
        >
          <span style={{ fontSize: '1.4rem' }}>⬆️</span>
        </button>
      )}
    </div>
  );
}
