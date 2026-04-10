import React, { useContext, useState, useEffect, useMemo, useRef } from 'react';
import { WeatherContext } from '../context/WeatherContext';
import { AreaChart, Area, ResponsiveContainer, XAxis, LabelList } from 'recharts';

export default function Dashboard() {
  // 🌟 ดึงข้อมูลจาก Firebase Context
  const { stations, stationTemps, darkMode, lastUpdated } = useContext(WeatherContext);
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [locationName, setLocationName] = useState('กำลังระบุตำแหน่ง...');
  
  // 🌟 State สำหรับข้อมูลพยากรณ์รายพิกัด
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

  // --- 📡 ฟังก์ชันดึง API พยากรณ์เฉพาะจุด (ย้ายมาไว้ที่นี่เพื่อกัน Error) ---
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
            pm25_max: new Array(7).fill(aData.current.pm2_5), 
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

  // --- 🖱️ ระบบ Scroll ด้วยเมาส์ ---
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

  // --- 🎨 UI Theme ---
  const appBg = darkMode ? '#020617' : '#f8fafc'; 
  const cardBg = darkMode ? '#0f172a' : '#ffffff';
  const textColor = darkMode ? '#f8fafc' : '#0f172a'; 
  const borderColor = darkMode ? '#1e293b' : '#e2e8f0';
  const subTextColor = darkMode ? '#94a3b8' : '#64748b'; 

  const lastUpdateText = lastUpdated ? new Date(lastUpdated).toLocaleString('th-TH') : '-';

  if (loadingWeather || !weatherData) return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', background: appBg, color: textColor, fontFamily: 'Kanit, sans-serif' }}>
        <style dangerouslySetInlineStyle={{__html: `@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(0.95); } }`}} />
        <div style={{ fontSize: '4rem', animation: 'pulse 1.5s infinite ease-in-out' }}>🌤️</div>
        <div style={{ marginTop: '20px', fontSize: '1.2rem', fontWeight: 'bold' }}>กำลังประมวลผลข้อมูลสภาพอากาศ</div>
        <div style={{ fontSize: '0.9rem', color: subTextColor, marginTop: '8px' }}>กรุณารอสักครู่...</div>
    </div>
  );

  const { current, hourly, daily, coords } = weatherData;
  
  // --- 🧮 การคำนวณ UI Logic เดิมทั้งหมด ---
  const aqiBg = current?.pm25 > 75 ? '#ef4444' : current?.pm25 > 37.5 ? '#f97316' : current?.pm25 > 25 ? '#eab308' : current?.pm25 > 15 ? '#22c55e' : '#0ea5e9';
  const aqiText = current?.pm25 > 75 ? 'มีผลกระทบต่อสุขภาพ' : current?.pm25 > 37.5 ? 'เริ่มมีผลกระทบ' : current?.pm25 > 25 ? 'ปานกลาง' : current?.pm25 > 15 ? 'คุณภาพอากาศดี' : 'อากาศดีมาก';
  
  const isRaining = current?.rainProb > 30;
  const isHot = current?.feelsLike >= 38;
  const currentHour = new Date().getHours();
  const isNight = currentHour >= 18 || currentHour < 6; 

  const weatherIcon = isRaining ? '🌧️' : (isNight ? '🌙' : (isHot ? '☀️' : '🌤️'));
  const weatherText = isRaining ? 'มีโอกาสฝนตก' : (isNight ? 'ท้องฟ้าโปร่งยามค่ำคืน' : (isHot ? 'แดดร้อนจัด' : 'อากาศดี มีเมฆบางส่วน'));
  
  let bgGradient = isNight ? 'linear-gradient(135deg, #1e1b4b, #0f172a)' : 'linear-gradient(135deg, #0ea5e9, #38bdf8)';
  if (isRaining) bgGradient = 'linear-gradient(135deg, #334155, #0f172a)'; 
  else if (isHot && !isNight) bgGradient = 'linear-gradient(135deg, #ea580c, #9a3412)';

  let alertBanner = null;
  if (current?.pm25 > 75) alertBanner = { type: 'PM2.5', color: '#ef4444', icon: '😷', text: 'มลพิษระดับอันตราย ควรสวมหน้ากาก N95 และงดกิจกรรมกลางแจ้ง' };
  else if (current?.rainProb > 70) alertBanner = { type: 'Rain', color: '#3b82f6', icon: '⛈️', text: 'มีพายุฝนฟ้าคะนองในพื้นที่' };
  else if (current?.feelsLike >= 42) alertBanner = { type: 'Heat', color: '#ea580c', icon: '🔥', text: 'ดัชนีความร้อนวิกฤต ระวังโรคลมแดด' };

  const nowMs = Date.now();
  const startIdx = hourly?.time?.findIndex(t => new Date(t).getTime() >= nowMs - 3600000) || 0;
  const chartData = (hourly?.time?.slice(startIdx, startIdx + 24) || []).map((t, i) => {
    const rIdx = startIdx + i;
    return {
      time: new Date(t).getHours().toString().padStart(2, '0') + ':00',
      temp: Math.round(hourly?.temperature_2m?.[rIdx] || 0),
      rain: hourly?.precipitation_probability?.[rIdx] || 0,
      pm25: Math.round(hourly?.pm25?.[rIdx] || 0)
    };
  });

  const CustomXAxisTick = ({ x, y, payload }) => {
    const item = chartData[payload.index];
    if (!item) return null;
    const pmColor = item.pm25 > 75 ? '#ef4444' : item.pm25 > 37.5 ? '#f97316' : item.pm25 > 25 ? '#eab308' : item.pm25 > 15 ? '#22c55e' : '#0ea5e9';
    return (
      <g transform={`translate(${x},${y})`}>
        <foreignObject x={-30} y={10} width={60} height={80}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '0.75rem', fontWeight: 'bold', fontFamily: 'Kanit' }}>
            <span style={{ color: subTextColor }}>{item.time}</span>
            <span style={{ color: '#3b82f6', marginTop: '4px' }}>☔ {item.rain}%</span>
            <span style={{ color: pmColor, marginTop: '2px' }}>😷 {item.pm25}</span>
          </div>
        </foreignObject>
      </g>
    );
  };

  const getSunTime = (dateStr) => dateStr ? new Date(dateStr).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'}) : '--:--';

  const maxTemp = Math.round(daily?.temperature_2m_max?.[0] || 0);
  const dailyRainProb = daily?.precipitation_probability_max?.[0] || 0;
  let briefingText = `วันนี้สภาพอากาศโดยรวม${weatherText.replace('อากาศดี ', '')} อุณหภูมิสูงสุดจะอยู่ที่ ${maxTemp}°C `;
  if (dailyRainProb > 40) briefingText += `และมีโอกาสเกิดฝนตก ${dailyRainProb}% แนะนำให้พกร่มหรืออุปกรณ์กันฝนก่อนออกจากบ้านครับ ☔`;
  else if (maxTemp >= 38) briefingText += `อากาศค่อนข้างร้อนจัด ควรดื่มน้ำบ่อยๆ และหลีกเลี่ยงการทำกิจกรรมกลางแจ้งเป็นเวลานานครับ 🥤`;
  else if (current?.pm25 > 37.5) briefingText += `ค่าฝุ่น PM2.5 ค่อนข้างสูง แนะนำให้สวมหน้ากากอนามัยเมื่อออกนอกอาคารครับ 😷`;
  else briefingText += `อากาศเป็นใจ เหมาะสำหรับการทำกิจกรรมนอกบ้านหรือซักผ้าครับ ✨`;

  let exercise = { text: 'ดีเยี่ยม', color: '#0ea5e9', desc: 'อากาศดีมาก ฝุ่นน้อย' };
  if (current?.pm25 > 75 || current?.feelsLike > 39 || current?.rainProb > 60) exercise = { text: 'งดกิจกรรม', color: '#ef4444', desc: 'สภาพอากาศไม่เหมาะสม' };
  else if (current?.pm25 > 37.5 || current?.feelsLike > 35) exercise = { text: 'ลดเวลา', color: '#f97316', desc: 'มีผลกระทบต่อสุขภาพ' };
  else if (current?.pm25 > 25) exercise = { text: 'พอใช้', color: '#eab308', desc: 'คุณภาพอากาศปานกลาง' };
  else if (current?.pm25 > 15) exercise = { text: 'ดี', color: '#22c55e', desc: 'คุณภาพอากาศดี' };

  let laundry = { text: 'ทำได้เลย', color: '#22c55e', desc: 'แดดดี ฝนไม่ตก' };
  if (current?.rainProb > 50 || current?.rain > 0) laundry = { text: 'ไม่แนะนำ', color: '#ef4444', desc: 'มีความเสี่ยงฝนตก' };
  else if (current?.rainProb > 20) laundry = { text: 'มีความเสี่ยง', color: '#eab308', desc: 'ควรจับตาดูเมฆฝน' };

  let watering = { text: 'ควรรดน้ำ', color: '#3b82f6', desc: 'ดินอาจแห้ง ดินขาดน้ำ' };
  if (current?.rainProb > 60 || current?.rain > 0) watering = { text: 'ไม่ต้องรด', color: '#94a3b8', desc: 'ฝนจะตกช่วยรดให้' };

  let spray = { text: 'ฉีดพ่นได้', color: '#22c55e', desc: 'ลมสงบ น้ำยาไม่ปลิว' };
  if (current?.windSpeed > 15) spray = { text: 'ลมแรงไป', color: '#ef4444', desc: 'น้ำยาอาจปลิวสูญเปล่า' };
  else if (current?.rainProb > 40) spray = { text: 'เสี่ยงฝนชะล้าง', color: '#f97316', desc: 'ฝนอาจชะล้างน้ำยา' };

  let driving = { text: 'ปลอดภัย', color: '#22c55e', desc: 'ทัศนวิสัยเคลียร์ ถนนแห้ง' };
  if ((current?.visibility / 1000) < 2 || current?.rainProb > 60) driving = { text: 'เพิ่มระมัดระวัง', color: '#ef4444', desc: 'ทัศนวิสัยต่ำ/ถนนลื่น' };
  else if ((current?.visibility / 1000) < 5 || current?.rainProb > 30) driving = { text: 'ระวังฝนระยะสั้น', color: '#eab308', desc: 'อาจมีฝนปรอย/หมอกลง' };

  let camping = { text: 'บรรยากาศดี', color: '#22c55e', desc: 'อากาศโปร่ง เหมาะจัดทริป' };
  if (current?.rainProb > 50 || current?.windSpeed > 25) camping = { text: 'เลื่อนไปก่อน', color: '#ef4444', desc: 'เสี่ยงพายุและลมแรง' };
  else if (current?.pm25 > 37.5 || current?.feelsLike > 38) camping = { text: 'ไม่น่าสบายนัก', color: '#f97316', desc: 'ฝุ่นหนาหรือร้อนจัด' };

  return (
    <div style={{ height: '100%', width: '100%', background: appBg, display: 'flex', justifyContent: 'center', overflowY: 'auto', fontFamily: 'Kanit, sans-serif' }} className="hide-scrollbar">
      <style dangerouslySetInlineStyle={{__html: `.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } .fade-in { animation: fadeIn 0.3s ease-in-out; } @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }`}} />
      
      <div style={{ width: '100%', maxWidth: isMobile ? '600px' : '1200px', display: 'flex', flexDirection: 'column', gap: isMobile ? '12px' : '15px', padding: isMobile ? '15px' : '30px', paddingBottom: '30px' }}>

        {alertBanner && (
            <div style={{ background: alertBanner.color, color: '#fff', padding: '10px 15px', borderRadius: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', fontSize: '0.9rem', flexShrink: 0 }}>
                <span style={{ fontSize: '1.2rem' }}>{alertBanner.icon}</span> {alertBanner.text}
            </div>
        )}

        {showFilter && (
            <div className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: cardBg, padding: '10px', borderRadius: '16px', border: `1px solid ${borderColor}`, flexWrap: 'wrap', flexShrink: 0 }}>
              <select value={selectedProv} onChange={handleProvChange} style={{ flex: 1, minWidth: '130px', background: darkMode?'#1e293b':'#f1f5f9', color: '#0ea5e9', border: 'none', fontWeight: 'bold', fontSize: '0.95rem', padding: '10px', borderRadius: '12px', outline: 'none', cursor: 'pointer' }}>
                <option value="">-- เลือกจังหวัด --</option>
                {sortedStations.map(p => <option key={p.stationID} value={p.areaTH}>{p.areaTH}</option>)}
              </select>
              <select value={selectedDist} onChange={handleDistChange} disabled={!selectedProv || geoData.length === 0 || currentAmphoes.length === 0} style={{ flex: 1, minWidth: '130px', background: darkMode?'#1e293b':'#f1f5f9', color: textColor, border: 'none', fontWeight: 'bold', fontSize: '0.95rem', padding: '10px', borderRadius: '12px', outline: 'none', cursor: 'pointer', opacity: (!selectedProv || currentAmphoes.length === 0) ? 0.5 : 1 }}>
                <option value="">
                  {geoError ? '⚠️ โหลดไฟล์ล้มเหลว' : geoData.length === 0 ? 'กำลังดึงข้อมูล...' : (!selectedProv ? '-- เลือกอำเภอ --' : (currentAmphoes.length === 0 ? '⚠️ ไม่พบข้อมูล' : '-- เลือกอำเภอ --'))}
                </option>
                {currentAmphoes.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
              </select>
            </div>
        )}

        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : '20px', flexShrink: 0 }}>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: isMobile ? '12px' : '20px', minWidth: 0 }}>
            
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
               <div style={{ marginTop: '15px', background: aqiBg, color: '#fff', padding: '6px 20px', borderRadius: '50px', fontWeight: '900', fontSize: '0.85rem', boxShadow: '0 4px 10px rgba(0,0,0,0.2)', alignSelf: 'center' }}>😷 PM2.5: {current?.pm25 || '-'} µg/m³ ({aqiText})</div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', flexShrink: 0 }}>
                <div style={{ background: cardBg, padding: '12px', borderRadius: '16px', border: `1px solid ${borderColor}` }}>
                    <div style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold' }}>👁️ ทัศนวิสัย</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '900', color: textColor }}>{(current?.visibility / 1000).toFixed(1)} <span style={{fontSize:'0.75rem'}}>กม.</span></div>
                    <div style={{ fontSize: '0.7rem', color: subTextColor }}>{current?.visibility < 2000 ? 'มีหมอกหนา' : 'เคลียร์'}</div>
                </div>
                <div style={{ background: cardBg, padding: '12px', borderRadius: '16px', border: `1px solid ${borderColor}` }}>
                    <div style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold' }}>☔ โอกาสฝนตก</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '900', color: textColor }}>{chartData[0]?.rain || 0} <span style={{fontSize:'0.75rem'}}>%</span></div>
                    <div style={{ fontSize: '0.7rem', color: subTextColor }}>{(chartData[0]?.rain || 0) > 40 ? 'ควรพกร่มติดตัว' : 'ฝนทิ้งช่วง'}</div>
                </div>
                <div style={{ background: cardBg, padding: '12px', borderRadius: '16px', border: `1px solid ${borderColor}` }}>
                    <div style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold' }}>🧭 ความกดอากาศ</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '900', color: textColor }}>{Math.round(current?.pressure || 0)} <span style={{fontSize:'0.75rem'}}>hPa</span></div>
                </div>
                <div style={{ background: cardBg, padding: '12px', borderRadius: '16px', border: `1px solid ${borderColor}` }}>
                    <div style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold' }}>🌅 ดวงอาทิตย์</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '900', color: textColor }}>ขึ้น {getSunTime(current?.sunrise)}</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '900', color: textColor }}>ตก {getSunTime(current?.sunset)}</div>
                </div>
            </div>
          </div>

          <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: isMobile ? '12px' : '20px', minWidth: 0, flexShrink: 0 }}>
            <div style={{ background: cardBg, borderRadius: isMobile ? '20px' : '25px', padding: isMobile ? '15px' : '20px', border: `1px solid ${borderColor}`, flexShrink: 0 }}>
               <h3 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: textColor }}>⏱️ 24 ชั่วโมงข้างหน้า</h3>
               <div 
                 ref={scrollRef}
                 onMouseDown={handleMouseDown} onMouseLeave={handleMouseLeave} onMouseUp={handleMouseUp} onMouseMove={handleMouseMove}
                 style={{ overflowX: 'auto', overflowY: 'hidden', paddingBottom: '5px', cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none' }} 
                 className="hide-scrollbar"
               >
                 <div style={{ width: '1400px', height: '200px' }}>
                   <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={chartData} margin={{ top: 20, right: 15, left: 15, bottom: 60 }}>
                       <defs>
                         <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8}/>
                           <stop offset="50%" stopColor="#f97316" stopOpacity={0.4}/>
                           <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.1}/>
                         </linearGradient>
                         <linearGradient id="lineTemp" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="0%" stopColor="#ef4444" stopOpacity={1}/>
                           <stop offset="50%" stopColor="#f97316" stopOpacity={1}/>
                           <stop offset="100%" stopColor="#3b82f6" stopOpacity={1}/>
                         </linearGradient>
                       </defs>
                       <XAxis dataKey="time" axisLine={false} tickLine={false} interval={0} tick={<CustomXAxisTick />} />
                       <Area type="monotone" dataKey="temp" stroke="url(#lineTemp)" strokeWidth={4} fillOpacity={1} fill="url(#colorTemp)">
                         <LabelList dataKey="temp" position="top" offset={10} style={{ fill: textColor, fontSize: '0.9rem', fontWeight: 'bold', fontFamily: 'Kanit' }} formatter={(val) => `${val}°`} />
                       </Area>
                     </AreaChart>
                   </ResponsiveContainer>
                 </div>
               </div>
            </div>

            <div style={{ background: cardBg, borderRadius: isMobile ? '20px' : '25px', padding: isMobile ? '15px' : '25px', border: `1px solid ${borderColor}`, flex: 1, flexShrink: 0 }}>
               <h3 style={{ margin: '0 0 15px 0', fontSize: '0.95rem', color: textColor }}>📅 พยากรณ์ 7 วัน</h3>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {daily?.time?.map((t, idx) => (
                     <div key={idx} style={{ display: 'flex', flexDirection: 'column', paddingBottom: idx !== 6 ? '12px' : '0', borderBottom: idx !== 6 ? `1px solid ${borderColor}` : 'none' }}>
                        
                        <div style={isMobile ? { display: 'grid', gridTemplateColumns: '40px 40px 1fr', alignItems: 'center' } : { display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ fontSize: isMobile ? '0.9rem' : '0.95rem', fontWeight: 'bold', color: textColor, width: isMobile ? 'auto' : '45px' }}>{idx === 0 ? 'วันนี้' : new Date(t).toLocaleDateString('th-TH', {weekday:'short'})}</div>
                            <div style={{ fontSize: isMobile ? '1.2rem' : '1.4rem', textAlign: 'center', width: isMobile ? 'auto' : '30px' }}>{daily.weathercode[idx] > 50 ? '🌧️' : '🌤️'}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                               <span style={{ fontSize: '0.85rem', color: subTextColor, fontWeight: 'bold', width: '25px', textAlign: 'right' }}>{Math.round(daily?.temperature_2m_min?.[idx] || 0)}°</span>
                               <div style={{ flex: 1, height: '4px', background: darkMode ? '#1e293b' : '#e2e8f0', borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
                                  <div style={{ position: 'absolute', left: '20%', right: '20%', top: 0, bottom: 0, background: 'linear-gradient(to right, #3b82f6, #f97316)' }}></div>
                               </div>
                               <span style={{ fontSize: '0.85rem', color: textColor, fontWeight: '900', width: '25px' }}>{Math.round(daily?.temperature_2m_max?.[idx] || 0)}°</span>
                            </div>
                        </div>

                        <div style={{ marginLeft: isMobile ? '0' : '55px', display: 'flex', justifyContent: 'space-between', marginTop: '8px', background: darkMode ? 'rgba(0,0,0,0.2)' : '#f1f5f9', padding: '6px 10px', borderRadius: '10px', fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold' }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{fontSize:'0.9rem'}}>☔</span> {daily?.precipitation_probability_max?.[idx] || 0}%</div>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{fontSize:'0.9rem'}}>🥵</span> {Math.round(daily?.apparent_temperature_max?.[idx] || 0)}°</div>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{fontSize:'0.9rem'}}>😷</span> 
                              <span style={{ color: daily?.pm25_max?.[idx] > 75 ? '#ef4444' : daily?.pm25_max?.[idx] > 37.5 ? '#f97316' : daily?.pm25_max?.[idx] > 25 ? '#eab308' : daily?.pm25_max?.[idx] > 15 ? '#22c55e' : '#0ea5e9' }}>
                                {daily?.pm25_max?.[idx] || 0} <span style={{fontSize:'0.6rem'}}>µg/m³</span>
                              </span>
                           </div>
                        </div>

                     </div>
                  ))}
               </div>
            </div>
          </div>
        </div>

        <div style={{ background: cardBg, padding: '20px', borderRadius: isMobile ? '20px' : '25px', border: `1px solid ${borderColor}`, display: 'flex', alignItems: 'flex-start', gap: '15px', marginBottom: '15px', flexShrink: 0 }}>
            <span style={{ fontSize: '2.5rem' }}>🤖</span>
            <div>
                <h4 style={{ margin: '0 0 5px 0', color: textColor, fontSize: '1rem' }}>สรุปสภาพอากาศวันนี้</h4>
                <p style={{ margin: 0, color: subTextColor, fontSize: '0.9rem', lineHeight: 1.6 }}>{briefingText}</p>
            </div>
        </div>

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
                        {aqiText}
                    </span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'linear-gradient(to right, #0ea5e9, #22c55e, #eab308, #f97316, #ef4444)', borderRadius: '10px', marginTop: '15px', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '-4px', left: `${Math.min(((current?.pm25 || 0) / 100) * 100, 100)}%`, width: '16px', height: '16px', background: '#fff', border: '3px solid #0f172a', borderRadius: '50%', transform: 'translateX(-50%)', boxShadow: '0 2px 5px rgba(0,0,0,0.3)' }}></div>
                </div>
            </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: '10px', flexShrink: 0, marginBottom: '20px' }}>
            <div style={{ background: cardBg, borderRadius: '20px', padding: '15px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '5px' }}>🏃‍♂️</div>
                <div style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold' }}>ออกกำลังกาย</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '900', color: exercise.color }}>{exercise.text}</div>
                <div style={{ fontSize: '0.7rem', color: subTextColor, marginTop: 'auto', paddingTop: '5px' }}>{exercise.desc}</div>
            </div>
            <div style={{ background: cardBg, borderRadius: '20px', padding: '15px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '5px' }}>👕</div>
                <div style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold' }}>ซักผ้า / ล้างรถ</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '900', color: laundry.color }}>{laundry.text}</div>
                <div style={{ fontSize: '0.7rem', color: subTextColor, marginTop: 'auto', paddingTop: '5px' }}>{laundry.desc}</div>
            </div>
            <div style={{ background: cardBg, borderRadius: '20px', padding: '15px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '5px' }}>💧</div>
                <div style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold' }}>รดน้ำต้นไม้</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '900', color: watering.color }}>{watering.text}</div>
                <div style={{ fontSize: '0.7rem', color: subTextColor, marginTop: 'auto', paddingTop: '5px' }}>{watering.desc}</div>
            </div>
            <div style={{ background: cardBg, borderRadius: '20px', padding: '15px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '5px' }}>🚁</div>
                <div style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold' }}>ฉีดพ่นยา/ปุ๋ย</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '900', color: spray.color }}>{spray.text}</div>
                <div style={{ fontSize: '0.7rem', color: subTextColor, marginTop: 'auto', paddingTop: '5px' }}>{spray.desc}</div>
            </div>
            <div style={{ background: cardBg, borderRadius: '20px', padding: '15px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '5px' }}>🚘</div>
                <div style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold' }}>ขับขี่เดินทาง</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '900', color: driving.color }}>{driving.text}</div>
                <div style={{ fontSize: '0.7rem', color: subTextColor, marginTop: 'auto', paddingTop: '5px' }}>{driving.desc}</div>
            </div>
            <div style={{ background: cardBg, borderRadius: '20px', padding: '15px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '5px' }}>⛺</div>
                <div style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold' }}>เที่ยว / ตั้งแคมป์</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '900', color: camping.color }}>{camping.text}</div>
                <div style={{ fontSize: '0.7rem', color: subTextColor, marginTop: 'auto', paddingTop: '5px' }}>{camping.desc}</div>
            </div>
        </div>

        <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', color: textColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span></span> สถิติ Top 5 ระดับประเทศ (อัปเดตเรียลไทม์)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '15px', flexShrink: 0, marginBottom: '20px' }}>
            
            <div style={{ background: cardBg, borderRadius: '20px', padding: '15px', border: `1px solid ${borderColor}` }}>
                <div style={{ fontSize: '0.9rem', color: '#ef4444', fontWeight: 'bold', marginBottom: '10px', borderBottom: `1px solid ${borderColor}`, paddingBottom: '5px' }}>🔥 ร้อนจัดที่สุด</div>
                {top5Heat.map((st, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                        <span style={{ color: textColor }}>{i+1}. {st.name}</span>
                        <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{st.val}°</span>
                    </div>
                ))}
            </div>

            <div style={{ background: cardBg, borderRadius: '20px', padding: '15px', border: `1px solid ${borderColor}` }}>
                <div style={{ fontSize: '0.9rem', color: '#3b82f6', fontWeight: 'bold', marginBottom: '10px', borderBottom: `1px solid ${borderColor}`, paddingBottom: '5px' }}>❄️ เย็นสบายที่สุด</div>
                {top5Cool.map((st, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                        <span style={{ color: textColor }}>{i+1}. {st.name}</span>
                        <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{st.val}°</span>
                    </div>
                ))}
            </div>

            <div style={{ background: cardBg, borderRadius: '20px', padding: '15px', border: `1px solid ${borderColor}` }}>
                <div style={{ fontSize: '0.9rem', color: '#f97316', fontWeight: 'bold', marginBottom: '10px', borderBottom: `1px solid ${borderColor}`, paddingBottom: '5px' }}>😷 ฝุ่น PM2.5 สูงสุด</div>
                {top5PM25.map((st, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                        <span style={{ color: textColor }}>{i+1}. {st.name}</span>
                        <span style={{ color: '#f97316', fontWeight: 'bold' }}>{st.val}</span>
                    </div>
                ))}
            </div>

            <div style={{ background: cardBg, borderRadius: '20px', padding: '15px', border: `1px solid ${borderColor}` }}>
                <div style={{ fontSize: '0.9rem', color: '#0ea5e9', fontWeight: 'bold', marginBottom: '10px', borderBottom: `1px solid ${borderColor}`, paddingBottom: '5px' }}>☔ โอกาสฝนตกสูงสุด</div>
                {top5Rain.map((st, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                        <span style={{ color: textColor }}>{i+1}. {st.name}</span>
                        <span style={{ color: '#0ea5e9', fontWeight: 'bold' }}>{st.val}%</span>
                    </div>
                ))}
            </div>

        </div>

        <div style={{ background: cardBg, borderRadius: isMobile ? '20px' : '25px', padding: isMobile ? '15px' : '20px', border: `1px solid ${borderColor}`, overflow: 'hidden', flexShrink: 0 }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: textColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>⛈️</span> เรดาร์สภาพอากาศ
            </h3>
            <div style={{ width: '100%', height: isMobile ? '250px' : '350px', minHeight: isMobile ? '250px' : '350px', borderRadius: '12px', overflow: 'hidden' }}>
                <iframe 
                    width="100%" height="100%" 
                    src={`https://embed.windy.com/embed2.html?lat=${coords?.lat || 13.75}&lon=${coords?.lon || 100.5}&detailLat=${coords?.lat || 13.75}&detailLon=${coords?.lon || 100.5}&zoom=8&level=surface&overlay=rain&product=ecmwf&menu=&message=true&marker=true`} 
                    style={{ border: 'none' }}   // <-- ใช้ style แทน
                    title="Radar Map"
                ></iframe>
            </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '10px', padding: '20px 0', borderTop: `1px solid ${borderColor}`, opacity: 0.7, flexShrink: 0 }}>
           <div style={{ fontSize: '0.85rem', color: subTextColor, fontWeight: 'bold' }}>อุตุนิยมวิทยาโดย Open-Meteo API • พิกัดโดย OpenStreetMap</div>
           <div style={{ fontSize: '0.75rem', color: subTextColor, marginTop: '5px' }}>อัปเดตข้อมูลระบบล่าสุด: {lastUpdateText}</div>
        </div>

        <div style={{ height: isMobile ? '80px' : '0px', flexShrink: 0, width: '100%' }}></div>

      </div>
    </div>
  );
}