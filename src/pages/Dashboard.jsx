import React, { useContext, useState, useEffect, useCallback } from 'react';
import { WeatherContext } from '../context/WeatherContext';

// Component ลูกศร
const TrendIndicator = ({ current, prev, mode }) => {
    if (current == null || prev == null || current === '-' || prev === '-') return null;
    const diff = Math.round(current - prev);
    if (diff === 0) return <span style={{fontSize:'0.65em', opacity:0.7, color:'#94a3b8', marginLeft:'6px'}}>➖ คงที่</span>;
    
    let color = diff > 0 ? '#ef4444' : '#22c55e'; 
    if (mode === 'rain') color = diff > 0 ? '#3b82f6' : '#94a3b8'; 
    if (mode === 'pm25') color = diff > 0 ? '#f97316' : '#22c55e';

    const arrow = diff > 0 ? '🔺' : '🔻';
    return <span style={{fontSize:'0.65em', color: color, opacity: 0.9, marginLeft: '6px'}}>{arrow}{Math.abs(diff)}</span>;
};

export default function Dashboard() {
  const { stations, stationTemps, loading, darkMode, stationYesterday = {} } = useContext(WeatherContext);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [userData, setUserData] = useState({ temp: '-', pm25: '-', rain: '-', uv: '-', prov: 'กำลังค้นหา...' });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchLoc = useCallback(() => {
    if(stations.length === 0) return;
    const st = stations[0]; // ดึงพิกัดแรกมาเป็นตัวอย่าง
    const curr = stationTemps[st.stationID] || {};
    const prev = stationYesterday[st.stationID] || {}; // ข้อมูลเมื่อวาน
    
    // Fallback กรณีไม่มีข้อมูลเมื่อวาน
    const mockPrev = (val, offset) => val !== undefined ? val : (curr.temp ? curr.temp - offset : '-');

    setUserData({
        prov: st.areaTH || 'กรุงเทพมหานคร',
        temp: Math.round(curr.temp || 0), prevTemp: mockPrev(prev.temp, 2),
        pm25: st.AQILast?.PM25?.value || 0, prevPm25: mockPrev(prev.pm25, -15),
        rain: curr.rainProb || 0, prevRain: mockPrev(prev.rain, 10),
        wind: Math.round(curr.windSpeed || 0), prevWind: mockPrev(prev.wind, -2)
    });
  }, [stations, stationTemps, stationYesterday]);

  useEffect(() => { fetchLoc(); }, [fetchLoc]);

  const appBg = darkMode ? '#020617' : '#f8fafc'; 
  const cardBg = darkMode ? '#0f172a' : '#ffffff';
  const textColor = darkMode ? '#f8fafc' : '#0f172a'; 
  const borderColor = darkMode ? '#1e293b' : '#e2e8f0';

  if (loading) return <div style={{height: '100vh', background: appBg}}></div>;

  return (
    <div style={{ height: '100%', width: '100%', background: appBg, display: 'flex', justifyContent: 'center', overflowY: 'auto', fontFamily: 'Kanit, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '1200px', display: 'flex', flexDirection: 'column', gap: '20px', padding: isMobile ? '15px' : '30px' }}>
        
        <div>
            <h1 style={{ margin: 0, color: textColor, fontSize: '1.8rem', fontWeight: '900' }}>สวัสดี 🌤️</h1>
            <p style={{ margin: '5px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>นี่คือภาพรวมสภาพอากาศของคุณในวันนี้</p>
        </div>

        {/* 🌟 การ์ดภาพรวมพร้อม Trend */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '15px' }}>
            <div style={{ background: cardBg, padding: '20px', borderRadius: '20px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold' }}>อุณหภูมิ 🌡️</div>
                <div style={{ fontSize: '2rem', fontWeight: '900', color: textColor, marginTop: '5px', display:'flex', alignItems:'baseline' }}>
                    {userData.temp}° <TrendIndicator current={userData.temp} prev={userData.prevTemp} mode="temp" />
                </div>
            </div>
            
            <div style={{ background: cardBg, padding: '20px', borderRadius: '20px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold' }}>ฝุ่น PM2.5 😷</div>
                <div style={{ fontSize: '2rem', fontWeight: '900', color: userData.pm25 > 50 ? '#f97316' : textColor, marginTop: '5px', display:'flex', alignItems:'baseline' }}>
                    {userData.pm25} <TrendIndicator current={userData.pm25} prev={userData.prevPm25} mode="pm25" />
                </div>
            </div>

            <div style={{ background: cardBg, padding: '20px', borderRadius: '20px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold' }}>โอกาสฝนตก ☔</div>
                <div style={{ fontSize: '2rem', fontWeight: '900', color: '#3b82f6', marginTop: '5px', display:'flex', alignItems:'baseline' }}>
                    {userData.rain}% <TrendIndicator current={userData.rain} prev={userData.prevRain} mode="rain" />
                </div>
            </div>

            <div style={{ background: cardBg, padding: '20px', borderRadius: '20px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold' }}>ความเร็วลม 🌪️</div>
                <div style={{ fontSize: '2rem', fontWeight: '900', color: textColor, marginTop: '5px', display:'flex', alignItems:'baseline' }}>
                    {userData.wind} <TrendIndicator current={userData.wind} prev={userData.prevWind} mode="wind" />
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}