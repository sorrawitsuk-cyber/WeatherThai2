import React, { useContext, useState, useEffect, useMemo } from 'react';
import { WeatherContext } from '../context/WeatherContext';

export default function ClimatePage() {
  const { stations, stationTemps, loading, darkMode, lastUpdated } = useContext(WeatherContext);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 🌟 ระบบ Tab สำหรับจัดการข้อมูลไม่ให้รก
  const [activeTab, setActiveTab] = useState('heat'); 

  // State สำหรับ Auto Location
  const [userProv, setUserProv] = useState(null);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
                if (dist < minDistance) { minDistance = dist; closest = st; }
            }
          });
          if (closest) {
            setUserProv(closest.areaTH.replace('จังหวัด', ''));
            if(stationTemps && stationTemps[closest.stationID]) {
               setUserData({
                 temp: Math.round(stationTemps[closest.stationID].temp || 0),
                 pm25: closest.AQILast?.PM25?.value || 0,
                 rain: stationTemps[closest.stationID].rainProb || 0
               });
            }
          }
        }, () => {} 
      );
    }
  }, [stations, stationTemps]);

  const { groupedAlerts, gistdaAlerts } = useMemo(() => {
    let alerts = { heat: [], pm25: [], rain: [], fire: [] };
    
    if (stations?.length > 0 && stationTemps) {
        stations.forEach(st => {
          const data = stationTemps[st.stationID];
          if (!data) return;
          const pm25 = st.AQILast?.PM25?.value || 0;
          const temp = Math.round(data.temp || 0);
          const feelsLike = Math.round(data.feelsLike || temp || 0); 
          const rain = data.rainProb || 0;
          const provName = st.areaTH.replace('จังหวัด', '');

          if (feelsLike >= 35) alerts.heat.push({ prov: provName, val: feelsLike, unit: '°C' });
          if (pm25 > 15) alerts.pm25.push({ prov: provName, val: pm25, unit: 'µg/m³' });
          if (rain > 30) alerts.rain.push({ prov: provName, val: rain, unit: '%' });
        });
    }

    // Mock GISTDA Data
    const gistdaMock = [
        { prov: 'เชียงใหม่', count: 145 }, { prov: 'แม่ฮ่องสอน', count: 122 }, { prov: 'กาญจนบุรี', count: 110 },
        { prov: 'ตาก', count: 95 }, { prov: 'เชียงราย', count: 85 }, { prov: 'ลำปาง', count: 54 }
    ];
    alerts.fire = gistdaMock.map(p => ({ prov: p.prov, val: p.count, unit: 'จุด' })).sort((a,b) => b.val - a.val);

    Object.keys(alerts).forEach(key => { if(key !== 'fire') alerts[key].sort((a, b) => b.val - a.val) });
    return { groupedAlerts: alerts, gistdaAlerts: alerts.fire };
  }, [stations, stationTemps]);

  const appBg = darkMode ? '#020617' : '#f8fafc'; 
  const cardBg = darkMode ? '#0f172a' : '#ffffff';
  const textColor = darkMode ? '#f8fafc' : '#0f172a'; 
  const borderColor = darkMode ? '#1e293b' : '#e2e8f0';
  const subTextColor = darkMode ? '#94a3b8' : '#64748b'; 

  // ข้อมูลสถิติย้อนหลัง (ผูกกับ Tab)
  const historyStats = {
      heat: { title: 'อุณหภูมิสูงสุดวานนี้', val: '44.2 °C', loc: 'จ.สุโขทัย', icon: '📈' },
      pm25: { title: 'ฝุ่นสูงสุดวานนี้', val: '115 µg', loc: 'จ.เชียงใหม่', icon: '🌫️' },
      rain: { title: 'ปริมาณฝนสะสมวานนี้', val: '85 mm', loc: 'จ.ตราด', icon: '🌧️' },
      fire: { title: 'จุดความร้อนรวมวานนี้', val: '1,208 จุด', loc: 'ทั่วประเทศ', icon: '🛰️' }
  };

  const tabs = [
      { id: 'heat', label: 'ความร้อน', icon: '🥵', color: '#ef4444', data: groupedAlerts.heat },
      { id: 'pm25', label: 'ฝุ่น PM2.5', icon: '😷', color: '#f97316', data: groupedAlerts.pm25 },
      { id: 'rain', label: 'พายุ/ฝน', icon: '⛈️', color: '#3b82f6', data: groupedAlerts.rain },
      { id: 'fire', label: 'ไฟป่า', icon: '🔥', color: '#ea580c', data: groupedAlerts.fire }
  ];

  const activeTabData = tabs.find(t => t.id === activeTab);
  const filteredData = activeTabData.data.filter(item => item.prov.includes(searchTerm));

  if (loading || stations.length === 0) return <div style={{ height: '100%', background: appBg }}></div>;

  return (
    <div style={{ height: '100%', width: '100%', background: appBg, display: 'flex', justifyContent: 'center', overflowY: 'auto', fontFamily: 'Kanit, sans-serif' }} className="hide-scrollbar">
      <div style={{ width: '100%', maxWidth: '1200px', display: 'flex', flexDirection: 'column', gap: '20px', padding: isMobile ? '15px' : '30px', paddingBottom: '100px' }}>
        
        {/* 🚀 1. Mission Control Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '10px' }}>
            <div>
                <h1 style={{ margin: 0, color: textColor, fontSize: '1.8rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  🚨 ศูนย์ปฏิบัติการเฝ้าระวัง
                </h1>
                <p style={{ margin: '5px 0 0 0', color: subTextColor, fontSize: '0.9rem' }}>ข้อมูลวิเคราะห์ภัยพิบัติรายจังหวัด (Real-time & Historical)</p>
            </div>
            <div style={{ background: darkMode ? '#1e293b' : '#f1f5f9', padding: '8px 16px', borderRadius: '50px', border: `1px solid ${borderColor}`, fontSize: '0.8rem', color: textColor, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%', boxShadow: '0 0 8px #22c55e' }}></span>
                LIVE: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString('th-TH') : '-'}
            </div>
        </div>

        {/* 🍱 2. Bento Grid: พิกัด + สรุปภาพรวม */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', gap: '20px' }}>
            
            {/* กล่อง Auto Location (Personalized) */}
            <div style={{ background: darkMode ? 'linear-gradient(135deg, #1e3a8a40, #3b82f610)' : 'linear-gradient(135deg, #eff6ff, #ffffff)', border: `1px solid ${darkMode ? '#1e3a8a' : '#bfdbfe'}`, padding: '25px', borderRadius: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                {userProv && userData ? (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
                            <div style={{ background: '#3b82f6', color: '#fff', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: '0 4px 10px rgba(59,130,246,0.3)' }}>📍</div>
                            <div>
                                <div style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: 'bold' }}>พื้นที่ของคุณตอนนี้</div>
                                <div style={{ fontSize: '1.4rem', fontWeight: '900', color: textColor }}>จ.{userProv}</div>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', background: darkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.8)', padding: '15px', borderRadius: '16px', border: `1px solid ${borderColor}` }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '0.7rem', color: subTextColor }}>อุณหภูมิ</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: userData.temp >= 38 ? '#ef4444' : textColor }}>{userData.temp}°</div>
                            </div>
                            <div style={{ textAlign: 'center', borderLeft: `1px solid ${borderColor}`, borderRight: `1px solid ${borderColor}` }}>
                                <div style={{ fontSize: '0.7rem', color: subTextColor }}>ฝุ่น PM2.5</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: userData.pm25 >= 37.5 ? '#f97316' : textColor }}>{userData.pm25}</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '0.7rem', color: subTextColor }}>โอกาสฝน</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: userData.rain >= 40 ? '#3b82f6' : textColor }}>{userData.rain}%</div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div style={{ textAlign: 'center', padding: '30px 0', color: subTextColor }}>กำลังค้นหาพิกัดของคุณ...</div>
                )}
            </div>

            {/* กล่อง Summary Counters (National Status) */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '15px' }}>
                {tabs.map((tab, idx) => (
                    <div key={idx} onClick={() => setActiveTab(tab.id)} style={{ background: cardBg, padding: '20px', borderRadius: '24px', border: `2px solid ${activeTab === tab.id ? tab.color : borderColor}`, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', boxShadow: activeTab === tab.id ? `0 10px 20px ${tab.color}15` : 'none', transform: activeTab === tab.id ? 'translateY(-3px)' : 'none' }}>
                        <span style={{ fontSize: '2rem' }}>{tab.icon}</span>
                        <span style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold' }}>{tab.label}</span>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                            <span style={{ fontSize: '1.6rem', fontWeight: '900', color: tab.color }}>{tab.data.length}</span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: tab.color }}>จ.</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* 🗺️ 3. แผนที่เรดาร์ และ รายละเอียดการเตือนภัย (Tab Content) */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: '20px' }}>
            
            {/* ด้านซ้าย: Windy Radar */}
            <div style={{ background: cardBg, padding: '20px', borderRadius: '24px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column' }}>
                <h2 style={{ margin: '0 0 15px 0', color: textColor, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📡 ศูนย์บัญชาการแผนที่ (Threat Map)
                </h2>
                <div style={{ flex: 1, minHeight: isMobile ? '350px' : '500px', borderRadius: '16px', overflow: 'hidden', background: '#000' }}>
                    <iframe width="100%" height="100%" src={`https://embed.windy.com/embed2.html?lat=13.75&lon=100.5&zoom=5&level=surface&overlay=${activeTab === 'rain' ? 'rain' : (activeTab === 'pm25' ? 'pm25' : 'temp')}&product=ecmwf&menu=&message=true&marker=true`} style={{ border: 'none' }}></iframe>
                </div>
            </div>

            {/* ด้านขวา: ข้อมูลเจาะลึกตาม Tab ที่เลือก */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                
                {/* 📊 Contextual History (เปลี่ยนตาม Tab) */}
                <div style={{ background: `${activeTabData.color}10`, padding: '20px', borderRadius: '24px', border: `1px solid ${activeTabData.color}30`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold', marginBottom: '4px' }}>📅 สถิติสูงสุดเมื่อวานนี้</div>
                        <div style={{ fontSize: '1.2rem', color: activeTabData.color, fontWeight: '900' }}>{historyStats[activeTab].val}</div>
                        <div style={{ fontSize: '0.8rem', color: textColor }}>{historyStats[activeTab].loc}</div>
                    </div>
                    <div style={{ fontSize: '2.5rem', opacity: 0.8 }}>{historyStats[activeTab].icon}</div>
                </div>

                {/* 📋 รายการพื้นที่เสี่ยง (มี Search) */}
                <div style={{ background: cardBg, borderRadius: '24px', border: `1px solid ${borderColor}`, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    
                    <div style={{ padding: '15px 20px', borderBottom: `1px solid ${borderColor}`, background: darkMode ? '#1e293b' : '#f8fafc' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <h3 style={{ margin: 0, color: activeTabData.color, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {activeTabData.icon} เฝ้าระวัง{activeTabData.label}
                            </h3>
                            <span style={{ fontSize: '0.8rem', background: `${activeTabData.color}20`, color: activeTabData.color, padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold' }}>
                                {activeTabData.data.length} พื้นที่
                            </span>
                        </div>
                        <input 
                            type="text" 
                            placeholder={`🔍 ค้นหาจังหวัด...`} 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '100%', padding: '10px 15px', borderRadius: '12px', border: `1px solid ${borderColor}`, background: cardBg, color: textColor, outline: 'none', fontFamily: 'Kanit' }}
                        />
                    </div>

                    <div style={{ padding: '10px 15px', overflowY: 'auto', maxHeight: isMobile ? '350px' : '350px' }} className="hide-scrollbar">
                        {filteredData.length > 0 ? filteredData.map((item, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 10px', borderBottom: `1px solid ${borderColor}`, transition: 'background 0.2s' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ color: subTextColor, fontSize: '0.8rem', width: '20px' }}>{i+1}.</span>
                                    <span style={{ color: textColor, fontWeight: '600' }}>จ.{item.prov}</span>
                                </div>
                                <span style={{ color: activeTabData.color, fontWeight: '900', fontSize: '1.1rem' }}>
                                    {item.val} <small style={{fontSize: '0.7rem'}}>{item.unit}</small>
                                </span>
                            </div>
                        )) : (
                            <div style={{ textAlign: 'center', padding: '50px 0', color: subTextColor }}>
                                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>✅</div>
                                สถานการณ์ปกติ / ไม่พบข้อมูล
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>

      </div>
    </div>
  );
}