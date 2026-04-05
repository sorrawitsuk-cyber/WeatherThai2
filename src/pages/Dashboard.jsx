// src/pages/Dashboard.jsx
import React, { useContext, useState, useEffect } from 'react';
import { WeatherContext } from '../context/WeatherContext';
import { AreaChart, Area, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis } from 'recharts';

// รายชื่อ 77 จังหวัดหลักสำหรับ Dropdown
const thaiProvinces = [
  { name: 'กรุงเทพมหานคร', lat: 13.7563, lon: 100.5018 }, { name: 'นนทบุรี', lat: 13.8591, lon: 100.5217 },
  { name: 'เชียงใหม่', lat: 18.7883, lon: 98.9853 }, { name: 'ภูเก็ต', lat: 7.8804, lon: 98.3923 },
  { name: 'ขอนแก่น', lat: 16.4322, lon: 102.8236 }, { name: 'ชลบุรี', lat: 13.3611, lon: 100.9847 }
  // (ใส่จังหวัดเพิ่มเติมได้ตามต้องการ)
];

const getAQILevel = (pm25) => {
  if (pm25 == null) return { text: 'ไม่มีข้อมูล', color: '#94a3b8', bg: 'rgba(148,163,184,0.2)' };
  if (pm25 <= 15) return { text: 'ดีเยี่ยม', color: '#00e400', bg: 'rgba(0,228,0,0.9)', font: '#000' };
  if (pm25 <= 25) return { text: 'ดี', color: '#ffff00', bg: 'rgba(255,255,0,0.9)', font: '#000' };
  if (pm25 <= 37.5) return { text: 'ปานกลาง', color: '#ff7e00', bg: 'rgba(255,126,0,0.9)', font: '#fff' };
  if (pm25 <= 75) return { text: 'เริ่มมีผลกระทบ', color: '#ff0000', bg: 'rgba(255,0,0,0.9)', font: '#fff' };
  return { text: 'อันตราย', color: '#8f3f97', bg: 'rgba(143,63,151,0.9)', font: '#fff' };
};

export default function Dashboard() {
  const { weatherData, fetchWeatherByCoords, loading, darkMode, lastUpdateText } = useContext(WeatherContext);
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [locationName, setLocationName] = useState('กำลังค้นหาตำแหน่ง...');
  const [selectedProv, setSelectedProv] = useState('');

  // เช็กขนาดหน้าจอ
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // แปลงพิกัดเป็นชื่อสถานที่ (Reverse Geocoding)
  const fetchLocationName = async (lat, lon) => {
    try {
      const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=th`);
      const data = await res.json();
      setLocationName(data.locality || data.city || data.principalSubdivision || 'ตำแหน่งปัจจุบัน');
    } catch (e) {
      setLocationName('ตำแหน่งปัจจุบัน');
    }
  };

  // ดึงพิกัด GPS อัตโนมัติเมื่อเปิดแอป
  useEffect(() => {
    if (!weatherData && !loading) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
          fetchLocationName(pos.coords.latitude, pos.coords.longitude);
        }, () => {
          fetchWeatherByCoords(13.7563, 100.5018); // Default กทม
          setLocationName('กรุงเทพมหานคร');
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // เมื่อผู้ใช้เลือก Dropdown
  const handleProvinceChange = (e) => {
    const provName = e.target.value;
    setSelectedProv(provName);
    const provObj = thaiProvinces.find(p => p.name === provName);
    if (provObj) {
      fetchWeatherByCoords(provObj.lat, provObj.lon);
      setLocationName(provObj.name);
    }
  };

  if (loading || !weatherData) {
    return <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100%',background: darkMode ? '#020617' : '#f1f5f9', color: darkMode ? '#fff' : '#000'}}>📍 กำลังเตรียมข้อมูลสภาพอากาศ...</div>;
  }

  const { current, hourly, daily, coords } = weatherData;
  const aqiInfo = getAQILevel(current.pm25);
  
  const isRaining = current.rain > 0;
  const isHot = current.feelsLike >= 38;
  const weatherIcon = isRaining ? '🌧️' : (isHot ? '☀️' : '🌤️');
  const weatherText = isRaining ? 'มีโอกาสฝนตก' : (isHot ? 'แดดจัดและร้อนมาก' : 'ท้องฟ้าโปร่ง มีเมฆบางส่วน');

  let bgGradient = darkMode ? 'linear-gradient(135deg, #1e3a8a, #0f172a)' : 'linear-gradient(135deg, #0ea5e9, #38bdf8)';
  if (isRaining) bgGradient = 'linear-gradient(135deg, #334155, #0f172a)';
  else if (isHot) bgGradient = 'linear-gradient(135deg, #ea580c, #9a3412)';

  const appBg = darkMode ? '#020617' : '#f8fafc';
  const cardBg = darkMode ? '#0f172a' : '#ffffff';
  const textColor = darkMode ? '#f8fafc' : '#0f172a';
  const borderColor = darkMode ? '#1e293b' : '#e2e8f0';

  return (
    <div style={{ height: '100%', width: '100%', background: appBg, display: 'flex', justifyContent: 'center', overflowY: 'auto', fontFamily: 'Kanit, sans-serif' }} className="hide-scrollbar">
      <style dangerouslySetInlineStyle={{__html: `.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}} />

      <div style={{ width: '100%', maxWidth: isMobile ? '600px' : '1200px', display: 'flex', flexDirection: 'column', gap: '20px', padding: isMobile ? '15px' : '30px', paddingBottom: '100px' }}>

        {/* 🌟 ตัวกรองพิกัดแบบใหม่ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: cardBg, padding: '15px 20px', borderRadius: '16px', border: `1px solid ${borderColor}` }}>
          <span style={{ fontSize: '1.1rem', color: textColor }}>📍 ระบุพื้นที่:</span>
          <select value={selectedProv} onChange={handleProvinceChange} style={{ flex: 1, background: darkMode ? '#1e293b' : '#f1f5f9', color: '#0ea5e9', border: 'none', fontWeight: 'bold', fontSize: '1rem', padding: '10px 15px', borderRadius: '12px', outline: 'none', cursor: 'pointer' }}>
            <option value="">ค้นหาจังหวัด...</option>
            {thaiProvinces.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px' }}>
          
          {/* 📱 ฝั่งซ้าย: Hero Widget */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '1.8rem', fontWeight: '900', color: textColor }}>{locationName}</span>
                <div style={{ fontSize: '0.8rem', color: '#0ea5e9', fontWeight: 'bold' }}>📡 พิกัด: {coords.lat.toFixed(4)}, {coords.lon.toFixed(4)}</div>
              </div>
              {!isMobile && <div style={{ color: '#64748b', fontSize: '0.8rem' }}>อัปเดต: {lastUpdateText}</div>}
            </div>

            <div style={{ background: bgGradient, borderRadius: '30px', padding: '30px 20px', color: '#fff', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span style={{ fontSize: '5rem' }}>{weatherIcon}</span>
                  <span style={{ fontSize: '6rem', fontWeight: '900', lineHeight: 1 }}>{Math.round(current.temp)}°</span>
               </div>
               <div style={{ fontSize: '1.4rem', fontWeight: 'bold', marginTop: '10px' }}>{weatherText}</div>
               <div style={{ fontSize: '1rem', opacity: 0.9 }}>รู้สึกเหมือน {Math.round(current.feelsLike)}°C</div>

               <div style={{ marginTop: '20px', background: aqiInfo.bg, color: aqiInfo.font, padding: '8px 25px', borderRadius: '50px', fontWeight: '900', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
                  😷 ฝุ่น PM2.5: {current.pm25 || '-'} µg/m³ ({aqiInfo.text})
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', width: '100%', marginTop: '30px', background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(10px)', borderRadius: '20px', padding: '15px 10px' }}>
                  <div style={{ textAlign: 'center' }}><div style={{fontSize:'1.2rem'}}>☔</div><div style={{fontSize:'0.7rem'}}>ฝนตก</div><b>{current.rain} mm</b></div>
                  <div style={{ textAlign: 'center' }}><div style={{fontSize:'1.2rem'}}>💧</div><div style={{fontSize:'0.7rem'}}>ความชื้น</div><b>{current.humidity}%</b></div>
                  <div style={{ textAlign: 'center' }}><div style={{fontSize:'1.2rem'}}>🌬️</div><div style={{fontSize:'0.7rem'}}>ลม</div><b>{current.windSpeed} km/h</b></div>
                  <div style={{ textAlign: 'center' }}><div style={{fontSize:'1.2rem'}}>☀️</div><div style={{fontSize:'0.7rem'}}>UV Index</div><b>{current.uv}</b></div>
               </div>
            </div>
          </div>

          {/* 💻 ฝั่งขวา: Analytics */}
          <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
            
            {/* กราฟ 24 ชม. */}
            <div style={{ background: cardBg, borderRadius: '25px', padding: '20px', border: `1px solid ${borderColor}` }}>
               <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: textColor }}>⏱️ แนวโน้มอุณหภูมิ 24 ชั่วโมง</h3>
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

            {/* พยากรณ์ 7 วัน จัดเต็มเหมือนเดิม */}
            <div style={{ background: cardBg, borderRadius: '25px', padding: '25px', border: `1px solid ${borderColor}`, flex: 1 }}>
               <h3 style={{ margin: '0 0 20px 0', fontSize: '1rem', color: textColor }}>📅 พยากรณ์ล่วงหน้า 7 วัน</h3>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {daily.time.map((t, idx) => (
                     <div key={idx} style={{ display: 'grid', gridTemplateColumns: '50px 50px 1fr', alignItems: 'center', paddingBottom: idx !== 6 ? '15px' : '0', borderBottom: idx !== 6 ? `1px solid ${borderColor}` : 'none' }}>
                        <div style={{ fontSize: '1rem', fontWeight: 'bold', color: textColor }}>{idx === 0 ? 'วันนี้' : new Date(t).toLocaleDateString('th-TH', {weekday:'short'})}</div>
                        <div style={{ fontSize: '1.5rem', textAlign: 'center' }}>{daily.weathercode[idx] > 50 ? '🌧️' : '🌤️'}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                           <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 'bold', width: '30px', textAlign: 'right' }}>{Math.round(daily.temperature_2m_min[idx])}°</span>
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