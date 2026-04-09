import React, { useContext, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { WeatherContext } from '../context/WeatherContext';
import { AreaChart, Area, ResponsiveContainer, XAxis, LabelList } from 'recharts';

// 🌟 [เพิ่มใหม่] Component สำหรับแสดงลูกศรแนวโน้ม (Trend Indicator)
const TrendIndicator = ({ current, prev, mode, size = '0.7em' }) => {
    if (current == null || prev == null || current === '-' || prev === '-') return null;
    const diff = Math.round(current - prev);
    if (diff === 0) return <span style={{fontSize: size, opacity:0.8, color:'#94a3b8', marginLeft:'6px', whiteSpace:'nowrap'}}>➖</span>;
    
    let color = diff > 0 ? '#ef4444' : '#22c55e'; 
    if (mode === 'rain') color = diff > 0 ? '#3b82f6' : '#94a3b8'; 
    if (mode === 'pm25') color = diff > 0 ? '#f97316' : '#22c55e';

    const arrow = diff > 0 ? '🔺' : '🔻';
    return <span style={{fontSize: size, color: color, opacity: 0.9, marginLeft: '6px', whiteSpace:'nowrap', fontWeight:'bold'}}>{arrow}{Math.abs(diff)}</span>;
};

export default function Dashboard() {
  // 🌟 [แทรกใหม่] ดึง stationYesterday มาจาก Context เพื่อใช้เปรียบเทียบ
  const { stations, stationTemps, stationYesterday = {}, darkMode, lastUpdated } = useContext(WeatherContext);
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [locationName, setLocationName] = useState('กำลังระบุตำแหน่ง...');
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

  // ฟังก์ชันดึงพยากรณ์รายพิกัด (Original Logic)
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
    } catch (err) { console.error(err); } finally { setLoadingWeather(false); }
  };

  // 🌟 [แทรกใหม่] ค้นหาข้อมูล "เมื่อวาน" ของสถานีที่ใกล้พิกัดปัจจุบันที่สุด เพื่อแสดง Trend ในการ์ดหลัก
  const localTrend = useMemo(() => {
    if (!weatherData?.coords || stations.length === 0) return { temp: null, pm25: null };
    let closest = null; let minD = Infinity;
    stations.forEach(st => {
      const d = Math.pow(st.lat - weatherData.coords.lat, 2) + Math.pow(st.long - weatherData.coords.lon, 2);
      if (d < minD) { minD = d; closest = st; }
    });
    return closest ? stationYesterday[closest.stationID] || {} : {};
  }, [weatherData, stations, stationYesterday]);

  // ระบบ Scroll, Resize และ GeoData (Original)
  const handleMouseDown = (e) => { setIsDragging(true); setStartX(e.pageX - scrollRef.current?.offsetLeft); setScrollLeft(scrollRef.current?.scrollLeft); };
  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = (e) => { if (!isDragging || !scrollRef.current) return; e.preventDefault(); const x = e.pageX - scrollRef.current.offsetLeft; const walk = (x - startX) * 2; scrollRef.current.scrollLeft = scrollLeft - walk; };

  useEffect(() => {
    const handleResize = () => { const mobile = window.innerWidth < 1024; setIsMobile(mobile); if (!mobile) setShowFilter(true); };
    window.addEventListener('resize', handleResize);
    fetch('/thai_geo.json').then(res => res.json()).then(data => setGeoData(Array.isArray(data) ? data : (data.data || []))).catch(() => setGeoError(true));
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sortedStations = useMemo(() => [...(stations || [])].sort((a, b) => a.areaTH.localeCompare(b.areaTH, 'th')), [stations]);
  const currentAmphoes = useMemo(() => {
    if (!geoData.length || !selectedProv) return [];
    const cleanProv = selectedProv.replace('จังหวัด', '').trim();
    const pObj = geoData.find(p => (p.name_th || p.nameTh || p.name || '').includes(cleanProv));
    return pObj ? [...(pObj.amphure || pObj.amphures || pObj.district || [])].map(a => ({ id: a.id, name: (a.name_th || a.nameTh || a.name || '').trim() })).sort((a,b) => a.name.localeCompare(b.name, 'th')) : [];
  }, [geoData, selectedProv]);

  // ระบบคำนวณ Top 5 (Original + 🌟 Trend)
  const top5Heat = useMemo(() => [...stations].map(st => ({ name: st.areaTH.replace('จังหวัด',''), val: Math.round(stationTemps?.[st.stationID]?.temp || -99), prev: stationYesterday?.[st.stationID]?.temp })).filter(st => st.val !== -99).sort((a, b) => b.val - a.val).slice(0, 5), [stations, stationTemps, stationYesterday]);
  const top5PM25 = useMemo(() => [...stations].map(st => ({ name: st.areaTH.replace('จังหวัด',''), val: st.AQILast?.PM25?.value || 0, prev: stationYesterday?.[st.stationID]?.pm25 })).filter(st => st.val > 0).sort((a, b) => b.val - a.val).slice(0, 5), [stations, stationYesterday]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude); fetchLocationName(pos.coords.latitude, pos.coords.longitude); }, 
        () => { fetchWeatherByCoords(13.75, 100.5); setLocationName('กรุงเทพมหานคร'); }
      );
    } else { fetchWeatherByCoords(13.75, 100.5); setLocationName('กรุงเทพมหานคร'); }
  }, []);

  const fetchLocationName = async (lat, lon) => {
    try {
      const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=th`);
      const data = await res.json(); setLocationName(data?.locality || data?.city || 'ตำแหน่งปัจจุบัน');
    } catch { setLocationName('ตำแหน่งปัจจุบัน'); }
  };

  const handleProvChange = (e) => {
    const pName = e.target.value; setSelectedProv(pName); setSelectedDist('');
    const found = stations?.find(s => s.areaTH === pName);
    if (found) { fetchWeatherByCoords(found.lat, found.long); setLocationName(pName); }
  };

  const handleDistChange = async (e) => {
    const dName = e.target.value; setSelectedDist(dName); if (!dName) return;
    setLocationName(`${dName}, ${selectedProv}`);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(dName + ' ' + selectedProv)}&limit=1`);
      const data = await res.json(); if (data?.[0]) fetchWeatherByCoords(parseFloat(data[0].lat), parseFloat(data[0].lon));
    } catch (err) { console.error(err); }
  };

  // UI Theme & Logic (Original)
  const appBg = darkMode ? '#020617' : '#f8fafc'; 
  const cardBg = darkMode ? '#0f172a' : '#ffffff';
  const textColor = darkMode ? '#f8fafc' : '#0f172a'; 
  const borderColor = darkMode ? '#1e293b' : '#e2e8f0';
  const subTextColor = darkMode ? '#94a3b8' : '#64748b'; 

  if (loadingWeather || !weatherData) return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', background: appBg, color: textColor, fontFamily: 'Kanit, sans-serif' }}>
        <div style={{ fontSize: '4rem' }}>🌤️</div>
        <div style={{ marginTop: '20px', fontSize: '1.2rem', fontWeight: 'bold' }}>กำลังวิเคราะห์ข้อมูล...</div>
    </div>
  );

  const { current, hourly, daily, coords } = weatherData;
  const aqiBg = current?.pm25 > 75 ? '#ef4444' : current?.pm25 > 37.5 ? '#f97316' : current?.pm25 > 25 ? '#eab308' : current?.pm25 > 15 ? '#22c55e' : '#0ea5e9';
  const aqiText = current?.pm25 > 75 ? 'มีผลกระทบต่อสุขภาพ' : current?.pm25 > 37.5 ? 'เริ่มมีผลกระทบ' : current?.pm25 > 25 ? 'ปานกลาง' : current?.pm25 > 15 ? 'คุณภาพอากาศดี' : 'อากาศดีมาก';
  const isNight = new Date().getHours() >= 18 || new Date().getHours() < 6; 
  const weatherIcon = current?.rainProb > 30 ? '🌧️' : (isNight ? '🌙' : (current?.feelsLike >= 38 ? '☀️' : '🌤️'));
  
  let bgGradient = isNight ? 'linear-gradient(135deg, #1e1b4b, #0f172a)' : 'linear-gradient(135deg, #0ea5e9, #38bdf8)';
  if (current?.feelsLike >= 38 && !isNight) bgGradient = 'linear-gradient(135deg, #ea580c, #9a3412)';

  const startIdx = hourly?.time?.findIndex(t => new Date(t).getTime() >= Date.now() - 3600000) || 0;
  const chartData = (hourly?.time?.slice(startIdx, startIdx + 24) || []).map((t, i) => ({
      time: new Date(t).getHours().toString().padStart(2, '0') + ':00',
      temp: Math.round(hourly?.temperature_2m?.[startIdx+i] || 0),
      rain: hourly?.precipitation_probability?.[startIdx+i] || 0,
      pm25: Math.round(hourly?.pm25?.[startIdx+i] || 0)
  }));

  const CustomXAxisTick = ({ x, y, payload }) => {
    const item = chartData[payload.index]; if (!item) return null;
    return (
      <g transform={`translate(${x},${y})`}><foreignObject x={-30} y={10} width={60} height={80}><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '0.7rem', fontWeight: 'bold', fontFamily: 'Kanit', color: subTextColor }}>
        <span>{item.time}</span><span style={{ color: '#3b82f6' }}>☔{item.rain}%</span>
      </div></foreignObject></g>
    );
  };

  return (
    <div style={{ height: '100%', width: '100%', background: appBg, display: 'flex', justifyContent: 'center', overflowY: 'auto', fontFamily: 'Kanit, sans-serif' }} className="hide-scrollbar">
      <div style={{ width: '100%', maxWidth: isMobile ? '600px' : '1200px', display: 'flex', flexDirection: 'column', gap: '15px', padding: isMobile ? '15px' : '30px' }}>

        {/* ระบบ Filter จังหวัด */}
        {showFilter && (
            <div style={{ display: 'flex', gap: '10px', background: cardBg, padding: '10px', borderRadius: '16px', border: `1px solid ${borderColor}`, flexWrap: 'wrap' }}>
              <select value={selectedProv} onChange={handleProvChange} style={{ flex: 1, minWidth: '130px', background: darkMode?'#1e293b':'#f1f5f9', color: '#0ea5e9', border: 'none', fontWeight: 'bold', padding: '10px', borderRadius: '12px', outline: 'none' }}>
                <option value="">-- เลือกจังหวัด --</option>
                {sortedStations.map(p => <option key={p.stationID} value={p.areaTH}>{p.areaTH}</option>)}
              </select>
              <select value={selectedDist} onChange={handleDistChange} disabled={!selectedProv} style={{ flex: 1, minWidth: '130px', background: darkMode?'#1e293b':'#f1f5f9', color: textColor, border: 'none', padding: '10px', borderRadius: '12px', outline: 'none' }}>
                <option value="">-- เลือกอำเภอ --</option>
                {currentAmphoes.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
              </select>
            </div>
        )}

        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px' }}>
          
          {/* การ์ดอากาศหลัก 🌟 แทรก Trend 🔺🔻 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ background: bgGradient, borderRadius: '30px', padding: '30px 20px', color: '#fff', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', position: 'relative' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div><h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '900' }}>{locationName}</h2><div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{coords?.lat?.toFixed(2)}, {coords?.lon?.toFixed(2)}</div></div>
                  <button onClick={() => setShowFilter(!showFilter)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '35px', height: '35px', color: '#fff' }}>🔍</button>
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '15px', justifyContent: 'center', margin: '20px 0' }}>
                  <span style={{ fontSize: '5.5rem' }}>{weatherIcon}</span>
                  <span style={{ fontSize: '6.5rem', fontWeight: '900' }}>{Math.round(current?.temp || 0)}°</span>
                  {/* 🌟 แสดงลูกศรเทียบเมื่อวาน */}
                  <TrendIndicator current={current?.temp} prev={localTrend.temp} mode="temp" size="1.5rem" />
               </div>
               <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{current?.rainProb > 30 ? 'มีโอกาสฝนตก' : 'อากาศดี'}</div>
                  <div style={{ marginTop: '15px', background: aqiBg, padding: '6px 20px', borderRadius: '50px', fontWeight: '900', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    😷 PM2.5: {current?.pm25} <TrendIndicator current={current?.pm25} prev={localTrend.pm25} mode="pm25" size="0.9rem" />
                  </div>
               </div>
            </div>
            
            {/* รายละเอียดปลีกย่อย (Original) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: cardBg, padding: '12px', borderRadius: '16px', border: `1px solid ${borderColor}` }}>
                    <div style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold' }}>👁️ ทัศนวิสัย</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '900', color: textColor }}>{(current?.visibility / 1000).toFixed(1)} กม.</div>
                </div>
                <div style={{ background: cardBg, padding: '12px', borderRadius: '16px', border: `1px solid ${borderColor}` }}>
                    <div style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold' }}>☔ โอกาสฝน</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '900', color: textColor }}>{current?.rainProb}%</div>
                </div>
            </div>
          </div>

          {/* กราฟ และ พยากรณ์ 7 วัน (Original) */}
          <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ background: cardBg, borderRadius: '25px', padding: '20px', border: `1px solid ${borderColor}` }}>
               <h3 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: textColor }}>⏱️ 24 ชั่วโมงข้างหน้า</h3>
               <div ref={scrollRef} onMouseDown={handleMouseDown} onMouseLeave={handleMouseLeave} onMouseUp={handleMouseUp} onMouseMove={handleMouseMove} style={{ overflowX: 'auto', cursor: 'grab' }} className="hide-scrollbar">
                  <div style={{ width: '1000px', height: '180px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 20, right: 15, left: 15, bottom: 40 }}>
                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={<CustomXAxisTick />} />
                        <Area type="monotone" dataKey="temp" stroke="#f97316" strokeWidth={4} fill="rgba(249, 115, 22, 0.1)">
                          <LabelList dataKey="temp" position="top" style={{ fill: textColor, fontWeight: 'bold' }} formatter={(v) => `${v}°`} />
                        </Area>
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
               </div>
            </div>

            <div style={{ background: cardBg, borderRadius: '25px', padding: '20px', border: `1px solid ${borderColor}`, flex: 1 }}>
               <h3 style={{ margin: '0 0 15px 0', fontSize: '0.95rem', color: textColor }}>📅 พยากรณ์ 7 วัน</h3>
               {daily?.time?.map((t, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: idx !== 6 ? `1px solid ${borderColor}` : 'none', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', width: '45px', color: textColor }}>{idx === 0 ? 'วันนี้' : new Date(t).toLocaleDateString('th-TH', {weekday:'short'})}</span>
                    <span>{daily.weathercode[idx] > 50 ? '🌧️' : '🌤️'}</span>
                    <span style={{ fontWeight: '900', color: textColor }}>{Math.round(daily?.temperature_2m_max?.[idx])}° / <small style={{color:subTextColor}}>{Math.round(daily?.temperature_2m_min?.[idx])}°</small></span>
                  </div>
               ))}
            </div>
          </div>
        </div>

        {/* 🌟 ท็อป 5 ระดับประเทศ แทรก Trend 🔺🔻 */}
        <h3 style={{ margin: '10px 0 0 0', fontSize: '1.1rem', color: textColor }}>🇹🇭 อันดับประเทศวันนี้ (เทียบสถิติเมื่อวาน)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '15px' }}>
            <div style={{ background: cardBg, borderRadius: '20px', padding: '15px', border: `1px solid ${borderColor}` }}>
                <div style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: '10px' }}>🔥 ร้อนจัดที่สุด</div>
                {top5Heat.map((st, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                        <span style={{ color: textColor }}>{i+1}. {st.name}</span>
                        <div style={{display:'flex', alignItems:'center'}}>
                          <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{st.val}°</span>
                          <TrendIndicator current={st.val} prev={st.prev} mode="temp" />
                        </div>
                    </div>
                ))}
            </div>
            <div style={{ background: cardBg, borderRadius: '20px', padding: '15px', border: `1px solid ${borderColor}` }}>
                <div style={{ color: '#f97316', fontWeight: 'bold', marginBottom: '10px' }}>😷 ฝุ่น PM2.5 สูงสุด</div>
                {top5PM25.map((st, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                        <span style={{ color: textColor }}>{i+1}. {st.name}</span>
                        <div style={{display:'flex', alignItems:'center'}}>
                          <span style={{ color: '#f97316', fontWeight: 'bold' }}>{st.val}</span>
                          <TrendIndicator current={st.val} prev={st.prev} mode="pm25" />
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* เรดาร์ Windy (Original) */}
        <div style={{ background: cardBg, borderRadius: '25px', padding: '20px', border: `1px solid ${borderColor}`, overflow: 'hidden' }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: textColor }}>⛈️ เรดาร์สภาพอากาศ</h3>
            <div style={{ width: '100%', height: '350px', borderRadius: '12px', overflow: 'hidden' }}>
                <iframe width="100%" height="100%" src={`https://embed.windy.com/embed2.html?lat=${coords?.lat || 13.75}&lon=${coords?.lon || 100.5}&zoom=8&level=surface&overlay=rain&product=ecmwf`} style={{ border: 'none' }}></iframe>
            </div>
        </div>

      </div>
    </div>
  );
}