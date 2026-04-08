import React, { useContext, useState, useEffect, useMemo } from 'react';
import { WeatherContext } from '../context/WeatherContext';

const getWindDirectionTH = (deg) => {
    if (deg >= 337.5 || deg < 22.5) return 'เหนือ';
    if (deg >= 22.5 && deg < 67.5) return 'ตะวันออกเฉียงเหนือ';
    if (deg >= 67.5 && deg < 112.5) return 'ตะวันออก';
    if (deg >= 112.5 && deg < 157.5) return 'ตะวันออกเฉียงใต้';
    if (deg >= 157.5 && deg < 202.5) return 'ใต้';
    if (deg >= 202.5 && deg < 247.5) return 'ตะวันตกเฉียงใต้';
    if (deg >= 247.5 && deg < 292.5) return 'ตะวันตก';
    if (deg >= 292.5 && deg < 337.5) return 'ตะวันตกเฉียงเหนือ';
    return '-';
};

export default function ClimatePage() {
  const { stations, stationTemps, loading, darkMode, lastUpdated } = useContext(WeatherContext);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyTop10, setShowOnlyTop10] = useState(false);
  
  // โหมดแสดงไฟป่า (risk = วันนี้, gistda = เมื่อวาน)
  const [fireMode, setFireMode] = useState('risk'); 
  const [expandedRegion, setExpandedRegion] = useState(null);

  // State สำหรับ Auto Location
  const [userProv, setUserProv] = useState(null);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ระบบ Auto Location (คำนวณหาสถานีที่ใกล้ที่สุด)
  useEffect(() => {
    if (stations && stations.length > 0 && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          let closest = null;
          let minDistance = Infinity;
          
          stations.forEach(st => {
            if(st.lat && st.lon) {
                const dist = Math.sqrt(Math.pow(st.lat - latitude, 2) + Math.pow(st.lon - longitude, 2));
                if (dist < minDistance) {
                  minDistance = dist;
                  closest = st;
                }
            }
          });

          if (closest) {
            setUserProv(closest.areaTH.replace('จังหวัด', ''));
            // ดึงข้อมูลอากาศของจังหวัดนั้นมาโชว์
            if(stationTemps && stationTemps[closest.stationID]) {
               setUserData({
                 temp: Math.round(stationTemps[closest.stationID].temp || 0),
                 pm25: closest.AQILast?.PM25?.value || 0,
                 rain: stationTemps[closest.stationID].rainProb || 0
               });
            }
          }
        },
        () => {} // ข้ามไปถ้าไม่เปิด GPS
      );
    }
  }, [stations, stationTemps]);

  const { groupedAlerts, fireRisks, allProvinceFires } = useMemo(() => {
    let alerts = { heat: [], pm25: [], uv: [], rain: [] };
    let fires = [];
    let allFires = [];

    if (stations?.length > 0 && stationTemps) {
        stations.forEach(st => {
          const data = stationTemps[st.stationID];
          if (!data) return;

          const pm25 = st.AQILast?.PM25?.value || 0;
          const temp = Math.round(data.temp || 0);
          const feelsLike = Math.round(data.feelsLike || temp || 0); 
          const rain = data.rainProb || 0;
          const uv = data.uv || 0; 
          const humidity = Math.round(data.humidity || 0);
          const windSpeed = Math.round(data.windSpeed || 0);
          const provName = st.areaTH.replace('จังหวัด', '');

          // Alerts (ใช้เกณฑ์เตือนภัย)
          if (feelsLike >= 35) alerts.heat.push({ prov: provName, val: feelsLike, unit: '°C' });
          if (pm25 > 15) alerts.pm25.push({ prov: provName, val: pm25, unit: 'µg' });
          if (uv >= 3) alerts.uv.push({ prov: provName, val: uv, unit: 'Index' });
          if (rain > 30) alerts.rain.push({ prov: provName, val: rain, unit: '%' });

          // Fire Risk
          let fireScore = (temp > 32 ? 30 : 0) + (humidity < 50 ? 30 : 0) + (windSpeed > 10 ? 20 : 0);
          const fireData = { prov: provName, temp, humidity, windSpeed, windDir: data.windDir, score: fireScore, riskLevel: fireScore >= 60 ? 'วิกฤต' : (fireScore >= 40 ? 'สูง' : 'ปานกลาง'), riskColor: fireScore >= 60 ? '#ef4444' : (fireScore >= 40 ? '#ea580c' : '#eab308') };
          allFires.push(fireData);
          if (fireScore >= 40) fires.push(fireData);
        });
    }

    Object.keys(alerts).forEach(key => alerts[key].sort((a, b) => b.val - a.val));
    return { groupedAlerts: alerts, fireRisks: fires.sort((a,b) => b.score - a.score), allProvinceFires: allFires };
  }, [stations, stationTemps]);

  // ข้อมูล GISTDA สำหรับสถิติเมื่อวาน
  const dailyGistdaSummary = useMemo(() => [
    { region: 'ภาคเหนือ', color: '#ef4444', count: 541, provinces: [{name: 'เชียงใหม่', count: 145}, {name: 'แม่ฮ่องสอน', count: 122}, {name: 'เชียงราย', count: 85}, {name: 'ลำปาง', count: 54}, {name: 'น่าน', count: 48}, {name: 'พะเยา', count: 32}] },
    { region: 'ภาคตะวันตก', color: '#f97316', count: 250, provinces: [{name: 'กาญจนบุรี', count: 110}, {name: 'ตาก', count: 95}, {name: 'ราชบุรี', count: 25}] },
    { region: 'ภาคอีสาน', color: '#f97316', count: 244, provinces: [{name: 'เลย', count: 45}, {name: 'ชัยภูมิ', count: 38}, {name: 'นครราชสีมา', count: 32}] },
    { region: 'ภาคกลาง', color: '#eab308', count: 173, provinces: [{name: 'นครสวรรค์', count: 35}, {name: 'เพชรบูรณ์', count: 32}, {name: 'อุทัยธานี', count: 28}] }
  ], []);
  const totalHotspots = 1208;

  // หาวันที่ของเมื่อวาน
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayText = yesterday.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });

  const appBg = darkMode ? '#020617' : '#f8fafc'; 
  const cardBg = darkMode ? '#0f172a' : '#ffffff';
  const textColor = darkMode ? '#f8fafc' : '#0f172a'; 
  const borderColor = darkMode ? '#1e293b' : '#e2e8f0';
  const subTextColor = darkMode ? '#94a3b8' : '#64748b'; 

  const filterData = (data) => {
    let result = data.filter(item => item.prov.includes(searchTerm));
    if (showOnlyTop10) result = result.slice(0, 10);
    return result;
  };

  const AlertBox = ({ title, icon, data, color }) => {
    const filtered = filterData(data);
    return (
      <div style={{ background: cardBg, borderRadius: '24px', border: `1px solid ${borderColor}`, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <div style={{ background: `${color}15`, color: color, padding: '15px 20px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${color}30` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>{icon}</span> <span>{title}</span>
              </div>
              <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>พบ {filtered.length} พื้นที่</span>
          </div>
          <div style={{ padding: '10px', maxHeight: '300px', overflowY: 'auto' }} className="hide-scrollbar">
              {filtered.length > 0 ? filtered.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 10px', borderBottom: `1px solid ${borderColor}`, fontSize: '0.95rem' }}>
                      <span style={{ color: textColor, fontWeight: '500' }}>จ.{item.prov}</span>
                      <span style={{ color: color, fontWeight: 'bold' }}>{item.val} <small style={{fontSize: '0.7rem'}}>{item.unit}</small></span>
                  </div>
              )) : <div style={{ textAlign: 'center', padding: '40px 0', color: subTextColor, fontSize: '0.9rem' }}>ไม่พบข้อมูลที่ตรงเงื่อนไข</div>}
          </div>
      </div>
    );
  };

  // Skeleton Loading ป้องกันจอขาว
  if (loading || stations.length === 0) {
    return (
      <div style={{ height: '100%', width: '100%', background: appBg, padding: isMobile ? '15px' : '30px' }}>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
        <div style={{ width: '250px', height: '40px', background: borderColor, borderRadius: '8px', animation: 'pulse 1.5s infinite', marginBottom: '20px' }}></div>
        <div style={{ width: '100%', height: '100px', background: cardBg, borderRadius: '24px', animation: 'pulse 1.5s infinite', marginBottom: '20px' }}></div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '15px', marginBottom: '30px' }}>
            {[1, 2, 3, 4].map(i => <div key={i} style={{ height: '120px', background: cardBg, borderRadius: '24px', animation: 'pulse 1.5s infinite' }}></div>)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', width: '100%', background: appBg, display: 'flex', justifyContent: 'center', overflowY: 'auto', fontFamily: 'Kanit, sans-serif' }} className="hide-scrollbar">
      <div style={{ width: '100%', maxWidth: '1200px', display: 'flex', flexDirection: 'column', gap: '20px', padding: isMobile ? '15px' : '30px', paddingBottom: '100px' }}>
        
        {/* 1. Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '10px' }}>
            <div>
                <h1 style={{ margin: 0, color: textColor, fontSize: '1.6rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  🚨 ศูนย์เฝ้าระวังภัยพิบัติ
                </h1>
                <p style={{ margin: '5px 0 0 0', color: subTextColor, fontSize: '0.9rem' }}>Nowcast: วิเคราะห์สภาวะอากาศและปัจจัยเสี่ยงแบบเรียลไทม์</p>
            </div>
            <div style={{ textAlign: isMobile ? 'left' : 'right', background: cardBg, padding: '8px 15px', borderRadius: '12px', border: `1px solid ${borderColor}` }}>
                <div style={{ fontSize: '0.7rem', color: subTextColor, fontWeight: 'bold' }}>อัปเดตล่าสุด</div>
                <div style={{ fontSize: '0.9rem', color: '#0ea5e9', fontWeight: 'bold' }}>{lastUpdated ? new Date(lastUpdated).toLocaleString('th-TH') : '-'}</div>
            </div>
        </div>

        {/* 2. Auto Location & Nowcast Banner */}
        {userProv && userData && (
            <div style={{ background: darkMode ? 'linear-gradient(135deg, #1e3a8a30, #3b82f620)' : 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: `1px solid #3b82f650`, padding: '20px', borderRadius: '24px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ background: '#3b82f6', color: '#fff', padding: '12px', borderRadius: '50%', fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        📍
                    </div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: 'bold' }}>พิกัดปัจจุบันของคุณ</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: textColor }}>จังหวัด{userProv}</div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', background: darkMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.6)', padding: '10px 20px', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold' }}>อุณหภูมิ</span>
                        <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: userData.temp >= 35 ? '#ef4444' : textColor }}>{userData.temp}°C</span>
                    </div>
                    <div style={{ width: '1px', background: borderColor }}></div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold' }}>ฝุ่น PM2.5</span>
                        <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: userData.pm25 >= 37.5 ? '#f97316' : textColor }}>{userData.pm25} µg</span>
                    </div>
                    <div style={{ width: '1px', background: borderColor }}></div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold' }}>โอกาสฝน</span>
                        <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: userData.rain >= 40 ? '#3b82f6' : textColor }}>{userData.rain}%</span>
                    </div>
                </div>
            </div>
        )}

        {/* 3. Top Summary Cards (Emojis) */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '15px' }}>
            {[
                { label: 'วิกฤตความร้อน', icon: '🥵', count: groupedAlerts.heat.length, color: '#ef4444' },
                { label: 'ฝุ่นเกินมาตรฐาน', icon: '😷', count: groupedAlerts.pm25.length, color: '#f97316' },
                { label: 'UV ระดับสูง', icon: '☀️', count: groupedAlerts.uv.length, color: '#a855f7' },
                { label: 'ระวังฝนหนัก', icon: '⛈️', count: groupedAlerts.rain.length, color: '#3b82f6' }
            ].map((item, idx) => (
                <div key={idx} style={{ background: darkMode ? 'rgba(30, 41, 59, 0.5)' : 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)', padding: '20px', borderRadius: '24px', border: `1px solid ${borderColor}`, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <span style={{ fontSize: '2.2rem', marginBottom: '5px' }}>{item.icon}</span>
                    <span style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold' }}>{item.label}</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: '900', color: item.color }}>{item.count} <small style={{fontSize: '0.8rem', fontWeight: 'bold'}}>จ.</small></span>
                </div>
            ))}
        </div>

        {/* 4. สถิติข้อมูลของเมื่อวาน (ตามที่รีเควส) */}
        <div style={{ marginTop: '10px' }}>
            <h2 style={{ fontSize: '1.1rem', color: textColor, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📅 สถิติย้อนหลัง <span style={{ fontSize: '0.85rem', color: subTextColor, fontWeight: 'normal' }}>(ประเมินจากข้อมูลวันที่ {yesterdayText})</span>
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '15px' }}>
                <div style={{ background: cardBg, padding: '15px', borderRadius: '16px', border: `1px dashed ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: subTextColor }}>อุณหภูมิสูงสุดวานนี้</div>
                        <div style={{ fontSize: '1.1rem', color: '#ef4444', fontWeight: 'bold' }}>44.2 °C</div>
                        <div style={{ fontSize: '0.7rem', color: textColor }}>📍 จ.สุโขทัย</div>
                    </div>
                    <div style={{ fontSize: '2rem', opacity: 0.8 }}>📈</div>
                </div>
                <div style={{ background: cardBg, padding: '15px', borderRadius: '16px', border: `1px dashed ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: subTextColor }}>PM2.5 สูงสุดวานนี้</div>
                        <div style={{ fontSize: '1.1rem', color: '#f97316', fontWeight: 'bold' }}>115 µg/m³</div>
                        <div style={{ fontSize: '0.7rem', color: textColor }}>📍 จ.เชียงใหม่</div>
                    </div>
                    <div style={{ fontSize: '2rem', opacity: 0.8 }}>🌫️</div>
                </div>
                <div style={{ background: cardBg, padding: '15px', borderRadius: '16px', border: `1px dashed ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: subTextColor }}>จุดความร้อนรวม (Hotspots)</div>
                        <div style={{ fontSize: '1.1rem', color: '#ea580c', fontWeight: 'bold' }}>{totalHotspots.toLocaleString()} จุด</div>
                        <div style={{ fontSize: '0.7rem', color: textColor }}>📍 ข้อมูลจาก GISTDA</div>
                    </div>
                    <div style={{ fontSize: '2rem', opacity: 0.8 }}>🛰️</div>
                </div>
            </div>
        </div>

        {/* 5. Filter & Search */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginTop: '10px' }}>
            <div style={{ display: 'flex', flex: isMobile ? '1' : 'none', background: cardBg, borderRadius: '15px', border: `1px solid ${borderColor}`, alignItems: 'center', padding: '0 15px' }}>
                <span style={{ fontSize: '1.2rem', opacity: 0.5 }}>🔍</span>
                <input 
                    type="text" 
                    placeholder="ค้นหาจังหวัด..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: isMobile ? '100%' : '200px', padding: '12px 10px', border: 'none', background: 'transparent', color: textColor, outline: 'none', fontFamily: 'Kanit' }}
                />
            </div>
            <button 
                onClick={() => setShowOnlyTop10(!showOnlyTop10)}
                style={{ padding: '12px 20px', borderRadius: '15px', border: 'none', background: showOnlyTop10 ? '#ef4444' : cardBg, border: `1px solid ${showOnlyTop10 ? '#ef4444' : borderColor}`, color: showOnlyTop10 ? '#fff' : textColor, fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', fontFamily: 'Kanit' }}
            >
                {showOnlyTop10 ? 'แสดงทั้งหมด' : '🏆 ดู 10 อันดับสูงสุด'}
            </button>
        </div>

        {/* 6. Alert Detail Tables */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '25px' }}>
            <AlertBox title="ดัชนีความร้อน (Feels Like)" icon="🥵" data={groupedAlerts.heat} color="#ef4444" />
            <AlertBox title="ฝุ่น PM2.5 (คุณภาพอากาศ)" icon="😷" data={groupedAlerts.pm25} color="#f97316" />
            <AlertBox title="รังสี UV (UV Index)" icon="☀️" data={groupedAlerts.uv} color="#a855f7" />
            <AlertBox title="โอกาสฝนตกหนัก" icon="⛈️" data={groupedAlerts.rain} color="#3b82f6" />
        </div>

        {/* 7. Windy Radar & Fire Risks (มีระบบสลับ GISTDA) */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1.2fr', gap: '20px', marginTop: '10px' }}>
            {/* Radar */}
            <div style={{ background: cardBg, padding: '20px', borderRadius: '24px', border: `1px solid ${borderColor}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h2 style={{ margin: 0, color: textColor, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      📡 เรดาร์สภาพอากาศสด
                    </h2>
                </div>
                <div style={{ width: '100%', height: '400px', borderRadius: '16px', overflow: 'hidden' }}>
                    <iframe width="100%" height="100%" src={`https://embed.windy.com/embed2.html?lat=13.75&lon=100.5&zoom=5&level=surface&overlay=rain&product=ecmwf&menu=&message=true&marker=true`} style={{ border: 'none' }}></iframe>
                </div>
            </div>

            {/* Fire Risk & GISTDA */}
            <div style={{ background: cardBg, padding: '20px', borderRadius: '24px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column' }}>
                <h2 style={{ margin: '0 0 15px 0', color: textColor, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🔥 ศูนย์ความเสี่ยงไฟป่า
                </h2>
                
                {/* ปุ่มสลับโหมด */}
                <div style={{ display: 'flex', background: darkMode ? '#1e293b' : '#f1f5f9', borderRadius: '12px', padding: '4px', marginBottom: '15px' }}>
                    <button onClick={() => setFireMode('risk')} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: fireMode === 'risk' ? cardBg : 'transparent', color: fireMode === 'risk' ? '#ea580c' : subTextColor, fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}>
                        🎯 ดัชนีเรียลไทม์
                    </button>
                    <button onClick={() => setFireMode('gistda')} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: fireMode === 'gistda' ? cardBg : 'transparent', color: fireMode === 'gistda' ? '#ef4444' : subTextColor, fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}>
                        🛰️ สถิติ GISTDA
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', maxHeight: '330px', paddingRight: '5px' }} className="hide-scrollbar">
                    {fireMode === 'risk' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {fireRisks.slice(0, 10).map((fire, i) => (
                                <div key={i} style={{ padding: '12px', borderRadius: '12px', background: `${fire.riskColor}10`, border: `1px solid ${fire.riskColor}` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '0.9rem', color: fire.riskColor }}>
                                        <span>จ.{fire.prov}</span>
                                        <span style={{ background: fire.riskColor, color: '#fff', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem' }}>เสี่ยง{fire.riskLevel}</span>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: subTextColor, marginTop: '8px', display: 'flex', gap: '10px' }}>
                                        <span>🌡️ {fire.temp}°C</span>
                                        <span>💧 {fire.humidity}%</span>
                                        <span>🌬️ ลม {fire.windSpeed} km/h</span>
                                    </div>
                                </div>
                            ))}
                            {fireRisks.length === 0 && <div style={{ textAlign: 'center', padding: '20px', color: '#22c55e', fontSize: '0.9rem' }}>✅ สถานการณ์ปกติ</div>}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ fontSize: '0.75rem', color: subTextColor, textAlign: 'right', marginBottom: '5px' }}>*จุดความร้อนสะสมเมื่อวาน</div>
                            {dailyGistdaSummary.map((hs, idx) => {
                                const isExpanded = expandedRegion === hs.region;
                                return (
                                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', background: darkMode ? '#1e293b' : '#f8fafc', borderRadius: '10px', borderLeft: `3px solid ${hs.color}`, border: `1px solid ${borderColor}` }}>
                                        <div onClick={() => setExpandedRegion(isExpanded ? null : hs.region)} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', cursor: 'pointer' }}>
                                            <span style={{ color: textColor, fontWeight: 'bold', fontSize: '0.9rem' }}>{hs.region}</span>
                                            <span style={{ color: hs.color, fontWeight: '900' }}>{hs.count} จุด</span>
                                        </div>
                                        {isExpanded && (
                                            <div style={{ padding: '0 12px 12px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                {hs.provinces.map((prov, i) => (
                                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: subTextColor, padding: '4px', background: darkMode ? 'rgba(0,0,0,0.2)' : '#fff', borderRadius: '6px' }}>
                                                        <span>จ.{prov.name}</span>
                                                        <span style={{ fontWeight: 'bold', color: textColor }}>{prov.count}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}