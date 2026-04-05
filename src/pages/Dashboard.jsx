// src/pages/Dashboard.jsx
import React, { useContext, useState, useEffect, useMemo } from 'react';
import { WeatherContext } from '../context/WeatherContext';
import { AreaChart, Area, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis } from 'recharts';

export default function Dashboard() {
  const { stations, weatherData, fetchWeatherByCoords, loadingWeather, darkMode, lastUpdateText } = useContext(WeatherContext);
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [locationName, setLocationName] = useState('กำลังระบุตำแหน่ง...');
  
  const [geoData, setGeoData] = useState([]);
  const [selectedProv, setSelectedProv] = useState('');
  const [selectedDist, setSelectedDist] = useState('');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 🌟 1. ระบบโหลดอำเภอแบบ 4 ลิงก์สำรอง (ทะลุบล็อก & กันเน็ตค้าง)
  useEffect(() => {
    const loadAmphoes = async () => {
      const urls = [
        'https://raw.githubusercontent.com/kongvut/thai-province-data/master/api_province_with_amphure_tambon.json',
        'https://cdn.jsdelivr.net/gh/kongvut/thai-province-data@master/api_province_with_amphure_tambon.json',
        'https://raw.githack.com/kongvut/thai-province-data/master/api_province_with_amphure_tambon.json',
        'https://api.allorigins.win/raw?url=https://raw.githubusercontent.com/kongvut/thai-province-data/master/api_province_with_amphure_tambon.json' // Proxy ทะลุบล็อก
      ];

      for (let url of urls) {
        try {
          // กำหนดเวลาให้รอแค่ 5 วินาทีต่อ 1 ลิงก์ ถ้าช้าให้เปลี่ยนลิงก์ทันที
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              setGeoData(data);
              return; // โหลดสำเร็จ หยุดลูปทันที
            }
          }
        } catch (e) {
          console.warn(`[ระบบสำรอง] ข้ามลิงก์ ${url} เนื่องจากเน็ตบล็อกหรือตอบสนองช้า`);
        }
      }
      // ถ้าพังหมดทุกลิงก์ ให้ขึ้นสถานะ Error เพื่อปลดล็อกปุ่ม
      setGeoData([{ id: 'ERROR', name_th: 'โหลดล้มเหลว' }]);
    };
    
    loadAmphoes();
  }, []);

  // 🌟 2. เรียงลำดับ 77 จังหวัด ก-ฮ
  const sortedStations = useMemo(() => {
    return [...stations].sort((a, b) => a.areaTH.localeCompare(b.areaTH, 'th'));
  }, [stations]);

  // 🌟 3. เรียงลำดับอำเภอ ก-ฮ และป้องกันการค้าง
  const isGeoError = geoData.length > 0 && geoData[0].id === 'ERROR';
  const isLoadingGeo = geoData.length === 0;

  const currentAmphoes = useMemo(() => {
    if (isLoadingGeo || isGeoError || !selectedProv) return [];
    const pObj = geoData.find(p => p.name_th === selectedProv || (p.name_th && p.name_th.includes(selectedProv)));
    if (pObj && pObj.amphure) {
      return [...pObj.amphure].sort((a, b) => a.name_th.localeCompare(b.name_th, 'th'));
    }
    return [];
  }, [geoData, selectedProv, isLoadingGeo, isGeoError]);

  const fetchLocationName = async (lat, lon) => {
    try {
      const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=th`);
      const data = await res.json();
      setLocationName(data.locality || data.city || 'ตำแหน่งปัจจุบัน');
    } catch (e) { setLocationName('ตำแหน่งปัจจุบัน'); }
  };

  useEffect(() => {
    if (!weatherData) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
            fetchLocationName(pos.coords.latitude, pos.coords.longitude);
          }, 
          () => { fetchWeatherByCoords(13.75, 100.5); setLocationName('กรุงเทพมหานคร'); },
          { enableHighAccuracy: false, timeout: 3000, maximumAge: 300000 }
        );
      } else {
        fetchWeatherByCoords(13.75, 100.5); setLocationName('กรุงเทพมหานคร');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleProvChange = (e) => {
    const pName = e.target.value;
    setSelectedProv(pName); setSelectedDist('');
    
    const fallbackProv = stations.find(s => s.areaTH === pName);
    if (fallbackProv) { 
      fetchWeatherByCoords(fallbackProv.lat, fallbackProv.long); 
      setLocationName(pName); 
    }
  };

  const handleDistChange = (e) => {
    const dName = e.target.value;
    setSelectedDist(dName);
    setLocationName(`อ.${dName}, ${selectedProv}`);
    
    fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${dName} ${selectedProv}&count=1&language=th`)
      .then(r => r.json()).then(d => { if(d.results) fetchWeatherByCoords(d.results[0].latitude, d.results[0].longitude); });
  };

  const appBg = darkMode ? '#020617' : '#f8fafc'; 
  const cardBg = darkMode ? '#0f172a' : '#ffffff';
  const textColor = darkMode ? '#f8fafc' : '#0f172a'; 
  const borderColor = darkMode ? '#1e293b' : '#e2e8f0';
  const subTextColor = darkMode ? '#94a3b8' : '#64748b'; 

  if (loadingWeather || !weatherData) return <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100%',background:appBg,color:textColor, fontWeight:'bold', fontSize:'1.2rem'}}>📍 กำลังโหลดสภาพอากาศล่าสุด... ⏳</div>;

  const { current, hourly, daily, coords } = weatherData;
  const aqiBg = current.pm25 > 75 ? '#ef4444' : current.pm25 > 37.5 ? '#f97316' : current.pm25 > 25 ? '#eab308' : '#22c55e';
  const aqiText = current.pm25 > 75 ? 'เริ่มมีผลกระทบ' : current.pm25 > 37.5 ? 'ปานกลาง' : 'อากาศดี';
  
  const isRaining = current.rain > 0; const isHot = current.feelsLike >= 38;
  const weatherIcon = isRaining ? '🌧️' : (isHot ? '☀️' : '🌤️');
  const weatherText = isRaining ? 'มีฝนตกในพื้นที่' : (isHot ? 'แดดร้อนจัด' : 'อากาศดี มีเมฆบางส่วน');
  
  let bgGradient = darkMode ? 'linear-gradient(135deg, #1e3a8a, #0f172a)' : 'linear-gradient(135deg, #0ea5e9, #38bdf8)';
  if (isRaining) bgGradient = 'linear-gradient(135deg, #334155, #0f172a)'; else if (isHot) bgGradient = 'linear-gradient(135deg, #ea580c, #9a3412)';

  return (
    <div style={{ height: '100%', width: '100%', background: appBg, display: 'flex', justifyContent: 'center', overflowY: 'auto', fontFamily: 'Kanit, sans-serif' }} className="hide-scrollbar">
      <style dangerouslySetInlineStyle={{__html: `.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}} />
      <div style={{ width: '100%', maxWidth: isMobile ? '600px' : '1200px', display: 'flex', flexDirection: 'column', gap: '20px', padding: isMobile ? '15px' : '30px', paddingBottom: '100px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: cardBg, padding: '15px 20px', borderRadius: '16px', border: `1px solid ${borderColor}`, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '1.1rem', color: textColor, display: isMobile ? 'none' : 'block' }}>📍 ระบุพื้นที่:</span>
          
          <select value={selectedProv} onChange={handleProvChange} style={{ flex: 1, minWidth: '150px', background: darkMode?'#1e293b':'#f1f5f9', color: '#0ea5e9', border: 'none', fontWeight: 'bold', fontSize: '1rem', padding: '10px 15px', borderRadius: '12px', outline: 'none', cursor: 'pointer' }}>
            <option value="">-- เลือก 77 จังหวัด --</option>
            {sortedStations.map(p => <option key={p.stationID} value={p.areaTH}>{p.areaTH}</option>)}
          </select>

          {/* 🌟 Dropdown อำเภอแบบฉลาด ไม่ค้างแน่นอน */}
          <select 
            value={selectedDist} 
            onChange={handleDistChange} 
            disabled={!selectedProv || isLoadingGeo || isGeoError} 
            style={{ flex: 1, minWidth: '150px', background: darkMode?'#1e293b':'#f1f5f9', color: textColor, border: 'none', fontWeight: 'bold', fontSize: '1rem', padding: '10px 15px', borderRadius: '12px', outline: 'none', cursor: 'pointer', opacity: (!selectedProv || isLoadingGeo || isGeoError) ? 0.5 : 1 }}
          >
            <option value="">
              {isLoadingGeo ? 'กำลังโหลดข้อมูลอำเภอ...' : 
               isGeoError ? '⚠️ ระบบเครือข่ายขัดข้อง' : 
               '-- เลือกอำเภอ --'}
            </option>
            {currentAmphoes.map(a => <option key={a.id} value={a.name_th}>{a.name_th}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '1.6rem', fontWeight: '900', color: textColor }}>{locationName}</span>
                <div style={{ fontSize: '0.8rem', color: '#0ea5e9', fontWeight: 'bold' }}>📡 พิกัด: {coords.lat.toFixed(4)}, {coords.lon.toFixed(4)}</div>
              </div>
              {!isMobile && <div style={{ color: subTextColor, fontSize: '0.8rem' }}>อัปเดตเมื่อ: {lastUpdateText}</div>}
            </div>

            <div style={{ background: bgGradient, borderRadius: '30px', padding: '30px 20px', color: '#fff', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}><span style={{ fontSize: '5rem' }}>{weatherIcon}</span><span style={{ fontSize: '6rem', fontWeight: '900', lineHeight: 1 }}>{Math.round(current.temp)}°</span></div>
               <div style={{ fontSize: '1.4rem', fontWeight: 'bold', marginTop: '10px' }}>{weatherText}</div>
               <div style={{ fontSize: '1rem', opacity: 0.9 }}>รู้สึกเหมือน {Math.round(current.feelsLike)}°C</div>
               <div style={{ marginTop: '20px', background: aqiBg, color: '#fff', padding: '8px 25px', borderRadius: '50px', fontWeight: '900', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>😷 ฝุ่น PM2.5: {current.pm25 || '-'} µg/m³ ({aqiText})</div>

               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', width: '100%', marginTop: '30px', background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(10px)', borderRadius: '20px', padding: '15px 10px' }}>
                  <div style={{ textAlign: 'center' }}><div style={{fontSize:'1.2rem'}}>☔</div><div style={{fontSize:'0.7rem'}}>ปริมาณฝน</div><b>{current.rain} mm</b></div>
                  <div style={{ textAlign: 'center' }}><div style={{fontSize:'1.2rem'}}>💧</div><div style={{fontSize:'0.7rem'}}>ความชื้น</div><b>{current.humidity}%</b></div>
                  <div style={{ textAlign: 'center' }}><div style={{fontSize:'1.2rem'}}>🌬️</div><div style={{fontSize:'0.7rem'}}>ลม</div><b>{current.windSpeed} km/h</b></div>
                  <div style={{ textAlign: 'center' }}><div style={{fontSize:'1.2rem'}}>☀️</div><div style={{fontSize:'0.7rem'}}>UV Index</div><b>{current.uv}</b></div>
               </div>
            </div>
            
            <div style={{ background: cardBg, padding: '20px', borderRadius: '25px', border: `1px solid ${borderColor}`, display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
              <span style={{ fontSize: '2.5rem' }}>💡</span>
              <div>
                 <h4 style={{ margin: '0 0 5px 0', color: textColor, fontSize: '1.1rem' }}>คำแนะนำวันนี้</h4>
                 <p style={{ margin: 0, color: subTextColor, fontSize: '0.95rem', lineHeight: 1.5 }}>
                   {isRaining ? "วันนี้มีโอกาสฝนตกนะคะ ก่อนออกจากบ้านอย่าลืมพกร่มหรือเสื้อกันฝนติดกระเป๋าไว้ด้วย ขับขี่ระมัดระวังถนนลื่นค่ะ ☔" 
                    : (isHot ? "อากาศข้างนอกร้อนจัดเลยค่ะ แนะนำให้ดื่มน้ำบ่อยๆ และพยายามอยู่ในที่ร่มเพื่อป้องกันโรคลมแดด (ฮีทสโตรก) นะคะ 🥤" 
                    : "วันนี้อากาศค่อนข้างดีเลยค่ะ ท้องฟ้าโปร่ง เหมาะกับการซักผ้า หรือออกไปทำกิจกรรมนอกบ้านชิลๆ ค่ะ ✨")}
                 </p>
              </div>
            </div>
          </div>

          <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
            <div style={{ background: cardBg, borderRadius: '25px', padding: '20px', border: `1px solid ${borderColor}` }}>
               <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: textColor }}>⏱️ แนวโน้มอุณหภูมิวันนี้ (24 ชั่วโมง)</h3>
               <div style={{ height: '140px', width: '100%' }}>
                 <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={hourly.time.slice(0, 24).map((t, i) => ({ time: t.split('T')[1], temp: Math.round(hourly.temperature_2m[i]) }))}>
                     <defs><linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/><stop offset="95%" stopColor="#f97316" stopOpacity={0}/></linearGradient></defs>
                     <RechartsTooltip contentStyle={{ background: cardBg, borderRadius: '10px', color: textColor }} />
                     <Area type="monotone" dataKey="temp" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorTemp)" />
                   </AreaChart>
                 </ResponsiveContainer>
               </div>
            </div>

            <div style={{ background: cardBg, borderRadius: '25px', padding: '25px', border: `1px solid ${borderColor}`, flex: 1 }}>
               <h3 style={{ margin: '0 0 20px 0', fontSize: '1rem', color: textColor }}>📅 พยากรณ์อากาศล่วงหน้า 7 วัน</h3>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {daily.time.map((t, idx) => (
                     <div key={idx} style={{ display: 'grid', gridTemplateColumns: '50px 50px 1fr', alignItems: 'center', paddingBottom: idx !== 6 ? '15px' : '0', borderBottom: idx !== 6 ? `1px solid ${borderColor}` : 'none' }}>
                        <div style={{ fontSize: '1rem', fontWeight: 'bold', color: textColor }}>{idx === 0 ? 'วันนี้' : new Date(t).toLocaleDateString('th-TH', {weekday:'short'})}</div>
                        <div style={{ fontSize: '1.5rem', textAlign: 'center' }}>{daily.weathercode[idx] > 50 ? '🌧️' : '🌤️'}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                           <span style={{ fontSize: '1rem', color: subTextColor, fontWeight: 'bold', width: '30px', textAlign: 'right' }}>{Math.round(daily.temperature_2m_min[idx])}°</span>
                           <div style={{ flex: 1, height: '6px', background: darkMode ? '#1e293b' : '#e2e8f0', borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
                              <div style={{ position: 'absolute', left: '20%', right: '20%', top: 0, bottom: 0, background: 'linear-gradient(to right, #3b82f6, #f97316)' }}></div>
                           </div>
                           <span style={{ fontSize: '1rem', color: textColor, fontWeight: '900', width: '30px' }}>{Math.round(daily.temperature_2m_max[idx])}°</span>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}