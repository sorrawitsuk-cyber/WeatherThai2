import React, { useContext, useState, useEffect, useMemo } from 'react';
import { WeatherContext } from '../context/WeatherContext';

export default function ClimatePage() {
  const { stations, stationTemps, loading, darkMode, lastUpdated } = useContext(WeatherContext);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('heat'); 

  const [userProv, setUserProv] = useState(null);
  const [userData, setUserData] = useState(null);
  
  // 🌟 [ใหม่] สร้างระบบนาฬิกาเดินแบบวินาทีต่อวินาทีสำหรับปุ่ม LIVE
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 🌟 [ปรับปรุง] ระบบ Auto Location (เพิ่ม Timeout และกันค้าง)
  useEffect(() => {
    if (stations && stations.length > 0) {
      // ฟังก์ชันดึงค่า กทม. เป็นค่าเริ่มต้น ถ้าหา GPS ไม่เจอ
      const fallbackToDefault = () => {
          const closest = stations.find(st => st.areaTH.includes('กรุงเทพ'));
          if (closest) {
              setUserProv('กรุงเทพมหานคร');
              if(stationTemps && stationTemps[closest.stationID]) {
                 setUserData({
                   temp: Math.round(stationTemps[closest.stationID].temp || 0),
                   pm25: closest.AQILast?.PM25?.value || 0,
                   rain: stationTemps[closest.stationID].rainProb || 0
                 });
              }
          }
      };

      if (navigator.geolocation) {
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
          }, 
          () => { fallbackToDefault(); }, // ถ้ากดไม่อนุญาต ให้สลับไป กทม.
          { timeout: 5000 } // ถ้าเกิน 5 วินาที ให้เลิกหาแล้วสลับไป กทม. เลย
        );
      } else {
        fallbackToDefault();
      }
    }
  }, [stations, stationTemps]);

  const { groupedAlerts } = useMemo(() => {
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

    const gistdaMock = [
        { prov: 'เชียงใหม่', count: 145 }, { prov: 'แม่ฮ่องสอน', count: 122 }, { prov: 'กาญจนบุรี', count: 110 },
        { prov: 'ตาก', count: 95 }, { prov: 'เชียงราย', count: 85 }, { prov: 'ลำปาง', count: 54 },
        { prov: 'น่าน', count: 48 }, { prov: 'เลย', count: 45 }, { prov: 'ชัยภูมิ', count: 38 }
    ];
    alerts.fire = gistdaMock.map(p => ({ prov: p.prov, val: p.count, unit: 'จุด' })).sort((a,b) => b.val - a.val);

    Object.keys(alerts).forEach(key => { if(key !== 'fire') alerts[key].sort((a, b) => b.val - a.val) });
    return { groupedAlerts: alerts };
  }, [stations, stationTemps]);

  const appBg = darkMode ? '#020617' : '#f8fafc'; 
  const cardBg = darkMode ? '#0f172a' : '#ffffff';
  const textColor = darkMode ? '#f8fafc' : '#0f172a'; 
  const borderColor = darkMode ? '#1e293b' : '#e2e8f0';
  const subTextColor = darkMode ? '#94a3b8' : '#64748b'; 

  const modeBriefings = {
      heat: { 
          level: '🔴 เฝ้าระวังฮีทสโตรก', 
          desc: 'อุณหภูมิทะลุเกณฑ์อันตรายในหลายพื้นที่ ควรงดกิจกรรมกลางแจ้งช่วง 11:00-15:00 น. และดื่มน้ำให้เพียงพอ',
          statTitle: 'ร้อนสุดเมื่อวาน', statVal: '44.2 °C', statLoc: 'จ.สุโขทัย', bg: '#fef2f2', border: '#fecaca' 
      },
      pm25: { 
          level: '🟠 อากาศเริ่มปิด', 
          desc: 'คุณภาพอากาศเริ่มมีผลกระทบต่อสุขภาพ แนะนำสวมหน้ากากอนามัย และเปิดเครื่องฟอกอากาศเมื่ออยู่ในอาคาร',
          statTitle: 'ฝุ่นสูงสุดเมื่อวาน', statVal: '115 µg/m³', statLoc: 'จ.เชียงใหม่', bg: '#fff7ed', border: '#fed7aa' 
      },
      rain: { 
          level: '🔵 พายุฤดูร้อน', 
          desc: 'มีโอกาสเกิดฝนฟ้าคะนองและลมกระโชกแรง ระวังอันตรายจากป้ายโฆษณาหรือต้นไม้หักโค่น',
          statTitle: 'ฝนสะสมสูงสุดเมื่อวาน', statVal: '85 mm', statLoc: 'จ.ตราด', bg: '#eff6ff', border: '#bfdbfe' 
      },
      fire: { 
          level: '🔴 เสี่ยงไฟป่ารุนแรง', 
          desc: 'พบจุดความร้อนกระจายตัวหนาแน่น สภาพอากาศแห้งแล้งเอื้อต่อการลุกลาม ห้ามจุดไฟในที่โล่งเด็ดขาด',
          statTitle: 'จุดความร้อนรวมเมื่อวาน', statVal: '1,208 จุด', statLoc: 'ข้อมูล GISTDA', bg: '#fef2f2', border: '#fed7aa' 
      }
  };

  const tabs = [
      { id: 'heat', label: 'ความร้อน', icon: '🥵', color: '#ef4444', data: groupedAlerts.heat },
      { id: 'pm25', label: 'ฝุ่น PM2.5', icon: '😷', color: '#f97316', data: groupedAlerts.pm25 },
      { id: 'rain', label: 'พายุ/ฝน', icon: '⛈️', color: '#3b82f6', data: groupedAlerts.rain },
      { id: 'fire', label: 'ไฟป่า', icon: '🔥', color: '#ea580c', data: groupedAlerts.fire }
  ];

  const activeTabData = tabs.find(t => t.id === activeTab);
  const activeBriefing = modeBriefings[activeTab];
  const filteredData = activeTabData.data.filter(item => item.prov.includes(searchTerm));

  const getWindyOverlay = (tabId) => {
      if (tabId === 'rain') return 'rain';
      if (tabId === 'pm25') return 'pm2p5';
      return 'temp';
  };

  // 🌟 [ใหม่] วิเคราะห์สถานการณ์สำหรับพิกัดของผู้ใช้
  let locSummary = { text: 'สถานการณ์ปกติ', color: '#22c55e', icon: '✅' };
  if (userData) {
      if (userData.temp >= 38) { locSummary = { text: 'อากาศร้อนจัด ระวังฮีทสโตรก', color: '#ef4444', icon: '🥵' }; }
      else if (userData.pm25 >= 37.5) { locSummary = { text: 'ฝุ่นเริ่มหนา ควรสวมหน้ากาก', color: '#f97316', icon: '😷' }; }
      else if (userData.rain >= 40) { locSummary = { text: 'มีโอกาสฝนตก พกร่มเผื่อไว้', color: '#3b82f6', icon: '⛈️' }; }
  }

  if (loading || stations.length === 0) return <div style={{ height: '100%', background: appBg }}></div>;

  return (
    <div style={{ height: '100%', width: '100%', background: appBg, display: 'flex', justifyContent: 'center', overflowY: 'auto', fontFamily: 'Kanit, sans-serif' }} className="hide-scrollbar">
      <div style={{ width: '100%', maxWidth: '1200px', display: 'flex', flexDirection: 'column', gap: '20px', padding: isMobile ? '15px' : '30px', paddingBottom: '100px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '10px' }}>
            <div>
                <h1 style={{ margin: 0, color: textColor, fontSize: '1.8rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  🚨 ศูนย์ปฏิบัติการเฝ้าระวัง
                </h1>
                <p style={{ margin: '5px 0 0 0', color: subTextColor, fontSize: '0.9rem' }}>ข้อมูลวิเคราะห์ภัยพิบัติรายจังหวัด (Real-time & Historical)</p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
                {/* 🌟 นาฬิกา LIVE วินาทีต่อวินาที */}
                <div style={{ background: darkMode ? '#1e293b' : '#f1f5f9', padding: '8px 16px', borderRadius: '50px', border: `1px solid ${borderColor}`, fontSize: '0.9rem', color: textColor, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#22c55e', borderRadius: '50%', boxShadow: '0 0 8px #22c55e', animation: 'pulse 1.5s infinite' }}></span>
                    LIVE: {currentTime.toLocaleTimeString('th-TH')}
                </div>
                {/* บอกเวลาที่ข้อมูลหลังบ้านอัปเดตล่าสุด */}
                <div style={{ fontSize: '0.7rem', color: subTextColor, paddingRight: '5px' }}>
                    ข้อมูลอากาศล่าสุด: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'}) : '-'} น.
                </div>
            </div>
        </div>

        {/* พิกัด + แท็บเมนู */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', gap: '20px' }}>
            
            {/* 🌟 กล่อง Auto Location (เพิ่ม Summary) */}
            <div style={{ background: darkMode ? 'linear-gradient(135deg, #1e3a8a40, #3b82f610)' : 'linear-gradient(135deg, #eff6ff, #ffffff)', border: `1px solid ${darkMode ? '#1e3a8a' : '#bfdbfe'}`, padding: '25px', borderRadius: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
                {userProv && userData ? (
                    <>
                        {/* แถบสรุปสถานการณ์ด่วนของจังหวัดนี้ */}
                        <div style={{ position: 'absolute', top: 0, right: 0, background: locSummary.color, color: '#fff', padding: '4px 12px', borderBottomLeftRadius: '16px', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            {locSummary.icon} {locSummary.text}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px', marginTop: '10px' }}>
                            <div style={{ background: '#3b82f6', color: '#fff', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: '0 4px 10px rgba(59,130,246,0.3)' }}>📍</div>
                            <div>
                                <div style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: 'bold' }}>พิกัดปัจจุบัน (คาดคะเน)</div>
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
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: subTextColor, gap: '10px' }}>
                        <span style={{ fontSize: '2rem', animation: 'pulse 1.5s infinite' }}>📍</span>
                        กำลังค้นหาพิกัดของคุณ...
                    </div>
                )}
            </div>

            {/* กลุ่มแผงควบคุม (Tabs) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.85rem', color: subTextColor, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', paddingLeft: '5px' }}>
                    👆 แผงควบคุมและประเมินสถานการณ์ <span style={{fontWeight: 'normal', opacity: 0.8}}>(คลิกเพื่อสลับโหมดวิเคราะห์ข้อมูลเรียลไทม์)</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '15px', flex: 1 }}>
                    {tabs.map((tab, idx) => (
                        <div key={idx} onClick={() => setActiveTab(tab.id)} style={{ background: cardBg, padding: '15px 10px', borderRadius: '24px', border: `2px solid ${activeTab === tab.id ? tab.color : borderColor}`, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px', boxShadow: activeTab === tab.id ? `0 10px 20px ${tab.color}15` : 'none', transform: activeTab === tab.id ? 'translateY(-3px)' : 'none' }}>
                            <span style={{ fontSize: '2rem' }}>{tab.icon}</span>
                            <span style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold' }}>{tab.label}</span>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                                <span style={{ fontSize: '1.5rem', fontWeight: '900', color: tab.color }}>{tab.data.length}</span>
                                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: tab.color }}>จ.</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* แผนที่ + สรุปบริบท */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: '20px' }}>
            
            <div style={{ background: cardBg, padding: '20px', borderRadius: '24px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h2 style={{ margin: 0, color: textColor, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {activeTabData.icon} แผนที่ความเสี่ยง: {activeTabData.label}
                    </h2>
                </div>
                <div style={{ flex: 1, minHeight: isMobile ? '350px' : '550px', borderRadius: '16px', overflow: 'hidden', background: '#000' }}>
                    <iframe width="100%" height="100%" src={`https://embed.windy.com/embed2.html?lat=13.75&lon=100.5&zoom=5&level=surface&overlay=${getWindyOverlay(activeTab)}&product=ecmwf&menu=&message=true&marker=true`} style={{ border: 'none' }}></iframe>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                
                <div style={{ background: darkMode ? `${activeBriefing.bg}15` : activeBriefing.bg, padding: '20px', borderRadius: '24px', border: `1px solid ${activeBriefing.border}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: activeTabData.color, fontWeight: '900', fontSize: '1rem' }}>{activeBriefing.level}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: darkMode ? '#cbd5e1' : '#334155', lineHeight: '1.5' }}>
                        {activeBriefing.desc}
                    </p>
                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: `1px dashed ${activeTabData.color}50`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: '0.7rem', color: subTextColor, fontWeight: 'bold' }}>{activeBriefing.statTitle}</div>
                            <div style={{ fontSize: '1.1rem', color: activeTabData.color, fontWeight: '900' }}>{activeBriefing.statVal}</div>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: textColor, background: darkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.6)', padding: '4px 10px', borderRadius: '10px' }}>
                            📍 {activeBriefing.statLoc}
                        </div>
                    </div>
                </div>

                <div style={{ background: cardBg, borderRadius: '24px', border: `1px solid ${borderColor}`, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    
                    <div style={{ padding: '15px 20px', borderBottom: `1px solid ${borderColor}`, background: darkMode ? '#1e293b' : '#f8fafc' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <h3 style={{ margin: 0, color: textColor, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                📋 จัดอันดับพื้นที่เสี่ยง
                            </h3>
                            <span style={{ fontSize: '0.8rem', background: `${activeTabData.color}20`, color: activeTabData.color, padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold' }}>
                                รวม {activeTabData.data.length} จ.
                            </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#0ea5e9', fontWeight: 'bold', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ display: 'inline-block', width: '6px', height: '6px', background: '#0ea5e9', borderRadius: '50%' }}></span>
                            Nowcast - ข้อมูลสภาพอากาศ ณ ปัจจุบัน
                        </div>
                        <input 
                            type="text" 
                            placeholder={`🔍 ค้นหาจังหวัด...`} 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '100%', padding: '10px 15px', borderRadius: '12px', border: `1px solid ${borderColor}`, background: cardBg, color: textColor, outline: 'none', fontFamily: 'Kanit' }}
                        />
                    </div>

                    <div style={{ padding: '5px 15px', overflowY: 'auto', maxHeight: isMobile ? '300px' : '320px' }} className="hide-scrollbar">
                        {filteredData.length > 0 ? filteredData.map((item, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 10px', borderBottom: `1px solid ${borderColor}` }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ color: subTextColor, fontSize: '0.8rem', width: '20px', textAlign: 'right' }}>{i+1}.</span>
                                    <span style={{ color: textColor, fontWeight: '600', fontSize: '0.9rem' }}>จ.{item.prov}</span>
                                </div>
                                <span style={{ color: activeTabData.color, fontWeight: '900', fontSize: '1rem' }}>
                                    {item.val} <small style={{fontSize: '0.7rem', color: subTextColor}}>{item.unit}</small>
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