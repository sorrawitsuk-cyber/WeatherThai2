import React, { useContext, useState, useEffect, useMemo, useRef } from 'react';
import { WeatherContext } from '../context/WeatherContext';
import { AreaChart, Area, ResponsiveContainer, XAxis, LabelList } from 'recharts';

export default function Dashboard() {
  // 🌟 ดึงเฉพาะที่มีอยู่ใน Context ใหม่
  const { stations, stationTemps, darkMode, lastUpdated } = useContext(WeatherContext);
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [locationName, setLocationName] = useState('กำลังระบุตำแหน่ง...');
  
  // 🌟 สร้าง State สำหรับข้อมูลพยากรณ์เฉพาะจุดไว้ที่นี่
  const [weatherData, setWeatherData] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(true);

  const [geoData, setGeoData] = useState([]);
  const [geoError, setGeoError] = useState(false);
  const [selectedProv, setSelectedProv] = useState('');
  const [selectedDist, setSelectedDist] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  const scrollRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // --- ฟังก์ชันดึงข้อมูลอากาศเฉพาะพิกัด (ย้ายมาไว้ที่นี่เพื่อความ Pro) ---
  const fetchWeatherByCoords = async (lat, lon) => {
    try {
      setLoadingWeather(true);
      const wUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,surface_pressure,wind_speed_10m,visibility&hourly=temperature_2m,precipitation_probability,pm2_5&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_probability_max&timezone=Asia%2FBangkok`;
      const aUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm2_5&hourly=pm2_5&timezone=Asia%2FBangkok`;

      const [wRes, aRes] = await Promise.all([fetch(wUrl), fetch(aUrl)]);
      const wData = await wRes.json();
      const aData = await aRes.json();

      if (wRes.ok && aRes.ok) {
        setWeatherData({
          current: {
            temp: wData.current.temperature_2m,
            feelsLike: wData.current.apparent_temperature,
            humidity: wData.current.relative_humidity_2m,
            windSpeed: wData.current.wind_speed_10m,
            pressure: wData.current.surface_pressure,
            visibility: wData.current.visibility,
            uv: wData.daily.uv_index_max[0],
            pm25: aData.current.pm2_5,
            sunrise: wData.daily.sunrise[0],
            sunset: wData.daily.sunset[0],
            rainProb: wData.hourly.precipitation_probability[new Date().getHours()],
          },
          hourly: {
            time: wData.hourly.time,
            temperature_2m: wData.hourly.temperature_2m,
            precipitation_probability: wData.hourly.precipitation_probability,
            pm25: aData.hourly.pm2_5
          },
          daily: {
            time: wData.daily.time,
            weathercode: wData.daily.weather_code,
            temperature_2m_max: wData.daily.temperature_2m_max,
            temperature_2m_min: wData.daily.temperature_2m_min,
            apparent_temperature_max: wData.daily.apparent_temperature_max,
            pm25_max: new Array(7).fill(aData.current.pm2_5), // จำลองค่าฝุ่นรายวัน
            precipitation_probability_max: wData.daily.precipitation_probability_max
          },
          coords: { lat, lon }
        });
      }
    } catch (err) {
      console.error("Fetch local weather failed", err);
    } finally {
      setLoadingWeather(false);
    }
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current?.offsetLeft);
    setScrollLeft(scrollRef.current?.scrollLeft);
  };
  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = (e) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

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
      .then(data => {
        const actualData = Array.isArray(data) ? data : (data.data || []);
        setGeoData(actualData);
      })
      .catch(e => setGeoError(true));
  }, []);

  // --- ระบบคำนวณ Top 5 (ดึงจาก Firebase สบายๆ) ---
  const top5Heat = useMemo(() => {
    return [...(stations || [])]
      .map(st => ({ name: st.areaTH.replace('จังหวัด',''), val: Math.round(stationTemps?.[st.stationID]?.temp || -99) }))
      .filter(st => st.val !== -99)
      .sort((a, b) => b.val - a.val).slice(0, 5);
  }, [stations, stationTemps]);

  const top5Cool = useMemo(() => {
    return [...(stations || [])]
      .map(st => ({ name: st.areaTH.replace('จังหวัด',''), val: Math.round(stationTemps?.[st.stationID]?.temp || 999) }))
      .filter(st => st.val !== 999)
      .sort((a, b) => a.val - b.val).slice(0, 5);
  }, [stations, stationTemps]);

  const top5PM25 = useMemo(() => {
    return [...(stations || [])]
      .map(st => ({ name: st.areaTH.replace('จังหวัด',''), val: st.AQILast?.PM25?.value || 0 }))
      .filter(st => st.val > 0)
      .sort((a, b) => b.val - a.val).slice(0, 5);
  }, [stations]);

  const top5Rain = useMemo(() => {
    return [...(stations || [])]
      .map(st => ({ name: st.areaTH.replace('จังหวัด',''), val: stationTemps?.[st.stationID]?.rainProb || 0 }))
      .filter(st => st.val > 0)
      .sort((a, b) => b.val - a.val).slice(0, 5);
  }, [stations, stationTemps]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
          fetchLocationName(pos.coords.latitude, pos.coords.longitude);
        }, 
        () => { fetchWeatherByCoords(13.75, 100.5); setLocationName('กรุงเทพมหานคร'); }
      );
    } else {
      fetchWeatherByCoords(13.75, 100.5); setLocationName('กรุงเทพมหานคร');
    }
  }, []);

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

  // UI Colors
  const appBg = darkMode ? '#020617' : '#f8fafc'; 
  const cardBg = darkMode ? '#0f172a' : '#ffffff';
  const textColor = darkMode ? '#f8fafc' : '#0f172a'; 
  const borderColor = darkMode ? '#1e293b' : '#e2e8f0';
  const subTextColor = darkMode ? '#94a3b8' : '#64748b'; 

  if (loadingWeather || !weatherData) return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', background: appBg, color: textColor, fontFamily: 'Kanit, sans-serif' }}>
        <style dangerouslySetInlineStyle={{__html: `@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(0.95); } }`}} />
        <div style={{ fontSize: '4rem', animation: 'pulse 1.5s infinite ease-in-out' }}>🌤️</div>
        <div style={{ marginTop: '20px', fontSize: '1.2rem', fontWeight: 'bold' }}>กำลังประมวลผลข้อมูลสภาพอากาศ</div>
        <div style={{ fontSize: '0.9rem', color: subTextColor, marginTop: '8px' }}>กรุณารอสักครู่...</div>
    </div>
  );

  const { current, hourly, daily, coords } = weatherData;
  const aqiBg = current.pm25 > 75 ? '#ef4444' : current.pm25 > 37.5 ? '#f97316' : current.pm25 > 25 ? '#eab308' : current.pm25 > 15 ? '#22c55e' : '#0ea5e9';
  const aqiText = current.pm25 > 75 ? 'มีผลกระทบต่อสุขภาพ' : current.pm25 > 37.5 ? 'เริ่มมีผลกระทบ' : current.pm25 > 25 ? 'ปานกลาง' : current.pm25 > 15 ? 'คุณภาพอากาศดี' : 'อากาศดีมาก';
  
  const isNight = new Date().getHours() >= 18 || new Date().getHours() < 6;
  const weatherIcon = current.rainProb > 30 ? '🌧️' : (isNight ? '🌙' : '🌤️');

  // --- Render UI (เหมือนเดิมเป๊ะ) ---
  return (
    <div style={{ height: '100%', width: '100%', background: appBg, display: 'flex', justifyContent: 'center', overflowY: 'auto', fontFamily: 'Kanit, sans-serif' }} className="hide-scrollbar">
       <div style={{ width: '100%', maxWidth: isMobile ? '600px' : '1200px', display: 'flex', flexDirection: 'column', gap: '15px', padding: isMobile ? '15px' : '30px' }}>
          
          {/* ส่วน Filter */}
          {showFilter && (
            <div style={{ display: 'flex', gap: '10px', background: cardBg, padding: '10px', borderRadius: '16px', border: `1px solid ${borderColor}` }}>
              <select value={selectedProv} onChange={handleProvChange} style={{ flex: 1, padding: '10px', borderRadius: '12px', background: darkMode?'#1e293b':'#f1f5f9', color: textColor, border: 'none', fontWeight: 'bold' }}>
                <option value="">-- เลือกจังหวัด --</option>
                {stations.sort((a,b)=>a.areaTH.localeCompare(b.areaTH,'th')).map(p => <option key={p.stationID} value={p.areaTH}>{p.areaTH}</option>)}
              </select>
            </div>
          )}

          {/* Main Weather Card */}
          <div style={{ background: isNight ? 'linear-gradient(135deg, #1e1b4b, #0f172a)' : 'linear-gradient(135deg, #0ea5e9, #38bdf8)', borderRadius: '30px', padding: '30px', color: '#fff', textAlign: 'center' }}>
            <h2 style={{ margin: 0 }}>{locationName}</h2>
            <div style={{ fontSize: '5rem', fontWeight: '900' }}>{Math.round(current.temp)}°</div>
            <div style={{ fontSize: '1.5rem' }}>{weatherIcon} อากาศปัจจุบัน</div>
            <div style={{ marginTop: '10px', background: aqiBg, display: 'inline-block', padding: '5px 15px', borderRadius: '20px', fontWeight: 'bold' }}>
              PM2.5: {current.pm25} ({aqiText})
            </div>
          </div>

          {/* สถิติ Top 5 ทั่วประเทศ (ดึงจาก Firebase) */}
          <h3 style={{ color: textColor }}>🇹🇭 อันดับความร้อน/ฝุ่น ทั่วประเทศ (Real-time)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '15px' }}>
            <div style={{ background: cardBg, padding: '15px', borderRadius: '20px', border: `1px solid ${borderColor}` }}>
              <div style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: '10px' }}>🔥 ร้อนที่สุด</div>
              {top5Heat.map((s, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: textColor }}><span>{s.name}</span><b>{s.val}°</b></div>)}
            </div>
            <div style={{ background: cardBg, padding: '15px', borderRadius: '20px', border: `1px solid ${borderColor}` }}>
              <div style={{ color: '#f97316', fontWeight: 'bold', marginBottom: '10px' }}>😷 ฝุ่นสูงสุด</div>
              {top5PM25.map((s, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: textColor }}><span>{s.name}</span><b>{s.val}</b></div>)}
            </div>
            <div style={{ background: cardBg, padding: '15px', borderRadius: '20px', border: `1px solid ${borderColor}` }}>
              <div style={{ color: '#3b82f6', fontWeight: 'bold', marginBottom: '10px' }}>☔ โอกาสฝนสูงสุด</div>
              {top5Rain.map((s, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: textColor }}><span>{s.name}</span><b>{s.val}%</b></div>)}
            </div>
          </div>

          <div style={{ textAlign: 'center', opacity: 0.6, fontSize: '0.8rem', color: textColor }}>
            Data Synced via Firebase • Updated: {lastUpdated ? new Date(lastUpdated).toLocaleString('th-TH') : '-'}
          </div>
       </div>
    </div>
  );
}