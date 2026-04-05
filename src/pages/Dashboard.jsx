// src/pages/Dashboard.jsx
import React, { useContext, useState, useEffect, useMemo } from 'react';
import { WeatherContext } from '../context/WeatherContext';
import { extractProvince, getPM25Color } from '../utils/helpers';
import { AreaChart, Area, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

// --- ฟังก์ชันช่วยเหลือ (Helpers) ---
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

const extractDistrict = (areaTH) => {
  if (!areaTH) return 'ทั่วไป';
  const match = areaTH.match(/(เขต|อ\.|อำเภอ)\s*([a-zA-Zก-ฮะ-์]+)/);
  if (match) return match[2];
  return areaTH.split(' ')[0]; 
};

// คำนวณสีและข้อความของ PM2.5
const getAQILevel = (pm25) => {
  if (pm25 == null) return { text: 'ไม่มีข้อมูล', color: '#94a3b8', bg: 'rgba(148,163,184,0.2)' };
  if (pm25 <= 15) return { text: 'ดีเยี่ยม', color: '#00e400', bg: 'rgba(0,228,0,0.9)', font: '#000' };
  if (pm25 <= 25) return { text: 'ดี', color: '#ffff00', bg: 'rgba(255,255,0,0.9)', font: '#000' };
  if (pm25 <= 37.5) return { text: 'ปานกลาง', color: '#ff7e00', bg: 'rgba(255,126,0,0.9)', font: '#fff' };
  if (pm25 <= 75) return { text: 'เริ่มมีผลกระทบ', color: '#ff0000', bg: 'rgba(255,0,0,0.9)', font: '#fff' };
  return { text: 'อันตราย', color: '#8f3f97', bg: 'rgba(143,63,151,0.9)', font: '#fff' };
};

export default function Dashboard() {
  const { stations, stationTemps, loading, darkMode, lastUpdateText } = useContext(WeatherContext);
  
  const [selectedProv, setSelectedProv] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedStation, setSelectedStation] = useState(null);
  
  const [userCoords, setUserCoords] = useState(null);
  const [isLocating, setIsLocating] = useState(true);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);

  const safeStations = stations || [];
  const provinces = useMemo(() => [...new Set(safeStations.map(s => extractProvince(s.areaTH)))].sort((a, b) => a.localeCompare(b, 'th')), [safeStations]);
  const availableDistricts = useMemo(() => [...new Set(safeStations.filter(s => extractProvince(s.areaTH) === selectedProv).map(s => extractDistrict(s.areaTH)))].sort(), [safeStations, selectedProv]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 🌟 ระบบ Auto-Location ตอนเริ่มแอป
  useEffect(() => {
    if (safeStations.length > 0 && !selectedStation) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude; const lon = pos.coords.longitude;
            setUserCoords({ lat, lon });
            
            let nearest = safeStations[0]; let minD = Infinity;
            safeStations.forEach(st => {
              const d = getDistance(lat, lon, parseFloat(st.lat), parseFloat(st.long));
              if (d < minD) { minD = d; nearest = st; }
            });
            
            // Set ค่าทั้งสถานี และตัวกรองให้ตรงกัน
            setSelectedStation(nearest);
            setSelectedProv(extractProvince(nearest.areaTH));
            setSelectedDistrict(extractDistrict(nearest.areaTH));
            setIsLocating(false);
          },
          () => {
            const defaultStation = safeStations.find(s => extractProvince(s.areaTH) === 'กรุงเทพมหานคร') || safeStations[0];
            setSelectedStation(defaultStation);
            setSelectedProv(extractProvince(defaultStation.areaTH));
            setIsLocating(false);
          },
          { timeout: 5000 }
        );
      } else {
        const defaultStation = safeStations.find(s => extractProvince(s.areaTH) === 'กรุงเทพมหานคร') || safeStations[0];
        setSelectedStation(defaultStation);
        setSelectedProv(extractProvince(defaultStation.areaTH));
        setIsLocating(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeStations]);

  if (loading || isLocating) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', background: darkMode ? '#020617' : '#f1f5f9', color: darkMode ? '#fff' : '#000' }}>📍 กำลังระบุตำแหน่งของคุณ... ⏳</div>;
  }

  if (!selectedStation) return <div>ไม่มีข้อมูลสถานี</div>;

  // --- 🛠️ ดึงข้อมูลตัวเลขจากสถานีที่เลือก ---
  const tObj = stationTemps[selectedStation.stationID] || {};
  const pmVal = selectedStation.AQILast?.PM25?.value ? Number(selectedStation.AQILast.PM25.value) : null;
  const aqiInfo = getAQILevel(pmVal);
  
  const tempVal = tObj.temp != null ? Math.round(tObj.temp) : 30;
  const heatVal = tObj.feelsLike != null ? Math.round(tObj.feelsLike) : tempVal + 2;
  const rainProb = tObj.rainProb != null ? Math.round(tObj.rainProb) : 0;
  const humidity = tObj.humidity != null ? tObj.humidity : 60;
  const windVal = tObj.windSpeed != null ? Math.round(tObj.windSpeed) : 5;

  const isRaining = rainProb > 50;
  const isHot = heatVal >= 38;
  const weatherIcon = isRaining ? '🌧️' : (isHot ? '☀️' : '🌤️');
  const weatherText = isRaining ? 'มีโอกาสฝนตกหนัก' : (isHot ? 'แดดจัดและร้อนมาก' : 'ท้องฟ้าโปร่ง มีเมฆบางส่วน');

  let bgGradient = darkMode ? 'linear-gradient(135deg, #1e3a8a, #0f172a)' : 'linear-gradient(135deg, #0ea5e9, #38bdf8)';
  if (isRaining) bgGradient = 'linear-gradient(135deg, #334155, #0f172a)';
  else if (isHot) bgGradient = 'linear-gradient(135deg, #ea580c, #9a3412)';

  // --- 🔮 จำลองพยากรณ์ล่วงหน้า ---
  const currentHour = new Date().getHours();
  const hourlyForecast = Array.from({length: 24}, (_, i) => {
    const hr = (currentHour + i) % 24;
    const tempVar = Math.sin((hr - 6) * Math.PI / 12) * 5; 
    const fTemp = Math.max(20, Math.round(tempVal + tempVar));
    return {
      time: i === 0 ? 'ตอนนี้' : `${hr.toString().padStart(2, '0')}:00`,
      temp: fTemp,
      icon: (hr >= 18 || hr <= 5) ? '🌙' : (fTemp > 33 ? '☀️' : '🌤️'),
      chartVal: fTemp
    };
  });

  const daysTh = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  const dailyForecast = Array.from({length: 7}, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i);
    return {
      day: i === 0 ? 'วันนี้' : daysTh[d.getDay()],
      min: Math.round(tempVal - 4 - Math.random() * 2),
      max: Math.round(tempVal + 3 + Math.random() * 3),
      icon: Math.random() > 0.7 ? '🌧️' : (Math.random() > 0.5 ? '🌤️' : '☀️')
    };
  });

  const appBg = darkMode ? '#020617' : '#f8fafc';
  const cardBg = darkMode ? '#0f172a' : '#ffffff';
  const innerCardBg = darkMode ? 'rgba(0,0,0,0.3)' : 'rgba(241,245,249,0.8)';
  const textColor = darkMode ? '#f8fafc' : '#0f172a';
  const subTextColor = darkMode ? '#94a3b8' : '#64748b';
  const borderColor = darkMode ? '#1e293b' : '#e2e8f0';

  return (
    <div style={{ height: '100%', width: '100%', background: appBg, display: 'flex', justifyContent: 'center', overflowY: 'auto' }} className="hide-scrollbar">
      
      <style dangerouslySetInlineStyle={{__html: `.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}} />

      <div style={{ 
        width: '100%', 
        maxWidth: isMobile ? '600px' : '1200px', 
        minHeight: '100%', 
        display: 'flex', 
        flexDirection: 'column', // เปลี่ยนเป็นแนวตั้งเพื่อวางตัวกรองไว้บนสุด
        gap: '20px', 
        padding: isMobile ? '15px' : '30px', 
        paddingBottom: '100px', 
        fontFamily: 'Kanit, sans-serif' 
      }}>

        {/* 🌟 1. ตัวกรองพิกัด (นำกลับมาไว้ด้านบนสุด) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: cardBg, padding: '15px 20px', borderRadius: '16px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)', flexShrink: 0 }}>
          <span style={{ fontSize: '1.2rem', display: isMobile ? 'none' : 'block' }}>📍 ระบุพื้นที่:</span>
          
          <select 
            value={selectedProv} 
            onChange={(e) => {
              setSelectedProv(e.target.value);
              setSelectedDistrict('');
              const target = safeStations.find(s => extractProvince(s.areaTH) === e.target.value);
              if(target) setSelectedStation(target);
            }} 
            style={{ flex: 1, background: innerCardBg, color: '#0ea5e9', border: 'none', fontWeight: '900', fontSize: '1rem', padding: '10px 15px', borderRadius: '12px', outline: 'none', cursor: 'pointer' }}
          >
            <option value="">เลือกจังหวัด</option>
            {provinces.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <select 
            value={selectedDistrict} 
            onChange={(e) => {
              setSelectedDistrict(e.target.value);
              const target = safeStations.find(s => extractProvince(s.areaTH) === selectedProv && extractDistrict(s.areaTH) === e.target.value);
              if(target) setSelectedStation(target);
            }} 
            style={{ flex: 1, background: innerCardBg, color: textColor, border: 'none', fontWeight: 'bold', fontSize: '1rem', padding: '10px 15px', borderRadius: '12px', outline: 'none', cursor: 'pointer' }}
          >
            <option value="">ทุกเขต/อำเภอ</option>
            {availableDistricts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {/* 🌟 ส่วนล่างแบ่ง 2 ฝั่งแบบปลอดภัย (minWidth: 0 ป้องกันตกขอบ) */}
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px', width: '100%' }}>
          
          {/* ========================================= */}
          {/* 📱 ฝั่งซ้าย: Hero Widget */}
          {/* ========================================= */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* สถานะพิกัดย่อย */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '1.4rem', fontWeight: '900', color: textColor }}>{extractDistrict(selectedStation.areaTH)}</span>
                {userCoords && <span style={{ fontSize: '0.8rem', color: '#0ea5e9', fontWeight: 'bold' }}>📡 ตรวจพบ GPS: {userCoords.lat.toFixed(2)}, {userCoords.lon.toFixed(2)}</span>}
              </div>
              {!isMobile && <div style={{ color: subTextColor, fontSize: '0.8rem', fontWeight: 'bold' }}>อัปเดต: {lastUpdateText || '-'}</div>}
            </div>

            {/* การ์ดอากาศหลัก */}
            <div style={{ background: bgGradient, borderRadius: '30px', padding: isMobile ? '25px 20px' : '40px 30px', color: '#fff', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
                  <span style={{ fontSize: isMobile ? '4.5rem' : '6rem', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }}>{weatherIcon}</span>
                  <span style={{ fontSize: isMobile ? '5.5rem' : '7rem', fontWeight: '900', letterSpacing: '-0.05em', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))', lineHeight: 1 }}>{tempVal}°</span>
               </div>
               
               <div style={{ fontSize: isMobile ? '1.2rem' : '1.5rem', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.3)', marginTop: '10px' }}>
                  {weatherText}
               </div>
               <div style={{ fontSize: '1rem', opacity: 0.9, marginTop: '2px' }}>
                  รู้สึกเหมือน (Heat Index) {heatVal}°C
               </div>

               <div style={{ marginTop: '20px', background: aqiInfo.bg, color: aqiInfo.font, padding: '8px 25px', borderRadius: '50px', fontSize: '1rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
                  😷 ฝุ่น PM2.5: {pmVal || '-'} µg/m³ ({aqiInfo.text})
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', width: '100%', marginTop: '30px', background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(10px)', borderRadius: '20px', padding: '15px 10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                     <span style={{ fontSize: '1.4rem' }}>☔</span>
                     <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>โอกาสฝน</span>
                     <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{rainProb}%</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                     <span style={{ fontSize: '1.4rem' }}>💧</span>
                     <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>ความชื้น</span>
                     <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{humidity}%</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                     <span style={{ fontSize: '1.4rem' }}>🌬️</span>
                     <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>ลม</span>
                     <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{windVal} <span style={{fontSize:'0.6rem'}}>km/h</span></span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                     <span style={{ fontSize: '1.4rem' }}>☀️</span>
                     <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>UV</span>
                     <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{isHot ? 'สูง' : 'ปานกลาง'}</span>
                  </div>
               </div>
            </div>

            {/* AI แนะนำ */}
            <div style={{ background: cardBg, padding: '20px', borderRadius: '25px', border: `1px solid ${borderColor}`, display: 'flex', alignItems: 'flex-start', gap: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
              <span style={{ fontSize: '2rem' }}>🤖</span>
              <div>
                 <h4 style={{ margin: '0 0 5px 0', color: textColor, fontSize: '1rem' }}>คำแนะนำจาก AI</h4>
                 <p style={{ margin: 0, color: subTextColor, fontSize: '0.9rem', lineHeight: 1.5 }}>
                   {isRaining ? "เตรียมร่มและเสื้อกันฝนให้พร้อม โอกาสฝนตกสูงในพื้นที่นี้ การจราจรอาจติดขัดเผื่อเวลาเดินทางด้วยนะครับ" 
                    : (isHot ? "แดดร้อนจัด ดื่มน้ำเยอะๆ และหลีกเลี่ยงการทำกิจกรรมกลางแจ้งเป็นเวลานานเพื่อป้องกันฮีทสโตรก" 
                    : "อากาศค่อนข้างเป็นใจ เหมาะกับการทำกิจกรรมนอกบ้านครับ")}
                 </p>
              </div>
            </div>
          </div>

          {/* ========================================= */}
          {/* 💻 ฝั่งขวา: Pro Data Monitor (แก้ปัญหาตกขอบ) */}
          {/* ========================================= */}
          <div style={{ flex: 1.2, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* กราฟ 24 ชั่วโมง */}
            <div style={{ background: cardBg, borderRadius: '25px', padding: '20px', border: `1px solid ${borderColor}`, boxShadow: '0 10px 30px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
               <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: textColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
                 ⏱️ แนวโน้มอุณหภูมิ 24 ชั่วโมง
               </h3>
               
               {!isMobile && (
                 <div style={{ height: '120px', width: '100%', marginBottom: '15px' }}>
                   <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={hourlyForecast.slice(0, 12)} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                       <defs>
                         <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                           <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                         </linearGradient>
                       </defs>
                       <RechartsTooltip contentStyle={{ background: cardBg, borderColor: borderColor, borderRadius: '10px', color: textColor }} />
                       <Area type="monotone" dataKey="chartVal" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorTemp)" />
                     </AreaChart>
                   </ResponsiveContainer>
                 </div>
               )}

               <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '10px' }} className="hide-scrollbar">
                  {hourlyForecast.map((hr, idx) => (
                     <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minWidth: '65px', background: idx === 0 ? (darkMode ? '#1e293b' : '#f1f5f9') : 'transparent', padding: '12px 10px', borderRadius: '16px' }}>
                        <span style={{ fontSize: '0.85rem', color: subTextColor, fontWeight: idx===0?'bold':'normal' }}>{hr.time}</span>
                        <span style={{ fontSize: '1.6rem' }}>{hr.icon}</span>
                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: textColor }}>{hr.temp}°</span>
                     </div>
                  ))}
               </div>
            </div>

            {/* 7-Day Forecast (จัด Grid ป้องกันตกขอบ) */}
            <div style={{ background: cardBg, borderRadius: '25px', padding: '25px', border: `1px solid ${borderColor}`, boxShadow: '0 10px 30px rgba(0,0,0,0.02)', flex: 1 }}>
               <h3 style={{ margin: '0 0 20px 0', fontSize: '1rem', color: textColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
                 📅 พยากรณ์ล่วงหน้า 7 วัน
               </h3>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {dailyForecast.map((day, idx) => (
                     <div key={idx} style={{ display: 'grid', gridTemplateColumns: '50px 50px 1fr', alignItems: 'center', paddingBottom: idx !== 6 ? '18px' : '0', borderBottom: idx !== 6 ? `1px solid ${borderColor}` : 'none' }}>
                        
                        <div style={{ fontSize: '1rem', fontWeight: 'bold', color: textColor }}>{day.day}</div>
                        <div style={{ fontSize: '1.5rem', textAlign: 'center' }}>{day.icon}</div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                           <span style={{ fontSize: '1rem', color: subTextColor, fontWeight: 'bold', width: '30px', textAlign: 'right' }}>{day.min}°</span>
                           <div style={{ flex: 1, height: '6px', background: darkMode ? '#1e293b' : '#e2e8f0', borderRadius: '10px', position: 'relative', overflow: 'hidden' }}>
                              <div style={{ position: 'absolute', left: '20%', right: '20%', top: 0, bottom: 0, background: 'linear-gradient(to right, #3b82f6, #f97316)', borderRadius: '10px' }}></div>
                           </div>
                           <span style={{ fontSize: '1rem', color: textColor, fontWeight: '900', width: '30px', textAlign: 'left' }}>{day.max}°</span>
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