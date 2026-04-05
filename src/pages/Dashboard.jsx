// src/pages/Dashboard.jsx
import React, { useContext, useState, useEffect } from 'react';
import { WeatherContext } from '../context/WeatherContext';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

export default function Dashboard() {
  const { weatherData, fetchWeatherByCoords, loading, darkMode } = useContext(WeatherContext);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    
    // ดึงพิกัดปัจจุบันทันทีเมื่อเข้าแอป
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
      }, () => {
        fetchWeatherByCoords(13.7563, 100.5018); // Default กรุงเทพฯ
      });
    }

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading || !weatherData) return <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100%',background:darkMode?'#020617':'#f8fafc',color:darkMode?'#fff':'#000'}}>📍 กำลังหาพิกัดของคุณ...</div>;

  const { current, hourly, daily } = weatherData;
  const aqiColor = current.pm25 > 37.5 ? '#ef4444' : current.pm25 > 15 ? '#f59e0b' : '#10b981';

  // สไตล์สำหรับ Desktop vs Mobile
  const containerStyle = {
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    gap: '25px',
    padding: isMobile ? '15px' : '30px',
    height: '100%',
    overflowY: 'auto',
    background: darkMode ? '#020617' : '#f1f5f9',
    fontFamily: 'Kanit, sans-serif'
  };

  const cardStyle = {
    background: darkMode ? '#0f172a' : '#fff',
    borderRadius: '24px',
    padding: '25px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
    border: `1px solid ${darkMode ? '#1e293b' : '#e2e8f0'}`,
    color: darkMode ? '#f8fafc' : '#0f172a'
  };

  return (
    <div style={containerStyle} className="hide-scrollbar">
      
      {/* 📱 ฝั่งซ้าย (Hero Widget): ข้อมูลปัจจุบัน */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #0ea5e9, #3b82f6)', color: '#fff', textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>📍 ตำแหน่งปัจจุบัน</h2>
          <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>พิกัด: {weatherData.coords.lat.toFixed(4)}, {weatherData.coords.lon.toFixed(4)}</div>
          
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '20px 0' }}>
            <span style={{ fontSize: '5rem' }}>🌤️</span>
            <span style={{ fontSize: '6rem', fontWeight: '900' }}>{Math.round(current.temp)}°</span>
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>รู้สึกเหมือน {Math.round(current.feelsLike)}°C</div>
          
          <div style={{ marginTop: '20px', background: aqiColor, padding: '8px 20px', borderRadius: '50px', display: 'inline-block', fontWeight: 'bold' }}>
            😷 ฝุ่น PM2.5: {current.pm25} µg/m³
          </div>
        </div>

        {/* ข้อมูลเสริม 4 ช่อง */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div style={cardStyle}>☔ ฝนตก: <b>{current.rain} mm</b></div>
          <div style={cardStyle}>🌬️ ลม: <b>{current.windSpeed} km/h</b></div>
          <div style={cardStyle}>💧 ความชื้น: <b>{current.humidity}%</b></div>
          <div style={cardStyle}>☀️ UV: <b>{current.uv}</b></div>
        </div>
      </div>

      {/* 💻 ฝั่งขวา (Analytics): กราฟและพยากรณ์ล่วงหน้า */}
      <div style={{ flex: isMobile ? 'none' : 1.5, display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 15px 0' }}>📈 แนวโน้มอุณหภูมิ (24 ชม.)</h3>
          <div style={{ height: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourly.time.slice(0, 24).map((t, i) => ({ time: t.split('T')[1], temp: hourly.temperature_2m[i] }))}>
                <defs><linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
                <XAxis dataKey="time" hide />
                <Tooltip />
                <Area type="monotone" dataKey="temp" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTemp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 15px 0' }}>📅 พยากรณ์ 7 วัน</h3>
          {daily.time.map((t, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i<6?`1px solid ${darkMode?'#1e293b':'#f1f5f9'}`:'none' }}>
              <span>{new Date(t).toLocaleDateString('th-TH', {weekday:'short'})}</span>
              <span style={{ fontWeight: 'bold' }}>{Math.round(daily.temperature_2m_max[i])}° / {Math.round(daily.temperature_2m_min[i])}°</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}