import React, { useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { WeatherContext } from '../context/WeatherContext';

export default function ClimatePage() {
  const { stations, stationTemps, loading, darkMode, lastUpdated } = useContext(WeatherContext);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('heat'); 

  const [userProv, setUserProv] = useState('');
  const [userData, setUserData] = useState(null);
  const [isLocating, setIsLocating] = useState(true);
  
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

  const fetchUserLocation = useCallback(() => {
      setIsLocating(true);

      const fallbackToDefault = () => {
          let closest = stations.find(st => st.areaTH && st.areaTH.includes('กรุงเทพ') && stationTemps && stationTemps[st.stationID]);
          if (!closest && stations.length > 0) closest = stations.find(st => stationTemps && stationTemps[st.stationID]);

          if (closest) {
              const locName = closest.areaTH || closest.nameTH || 'กรุงเทพมหานคร';
              setUserProv(locName.replace('จังหวัด', ''));
              setUserData({
                  temp: Math.round(stationTemps[closest.stationID].temp || 0),
                  pm25: closest.AQILast?.PM25?.value || 0,
                  rain: stationTemps[closest.stationID].rainProb || 0,
                  uv: stationTemps[closest.stationID].uv || 0,
                  wind: Math.round(stationTemps[closest.stationID].windSpeed || 0)
              });
          } else {
              setUserProv('กรุงเทพมหานคร');
              setUserData({ temp: '-', pm25: '-', rain: '-', uv: '-', wind: '-' });
          }
          setIsLocating(false);
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
              const locName = closest.areaTH || closest.nameTH || 'กรุงเทพมหานคร';
              setUserProv(locName.replace('จังหวัด', ''));
              if(stationTemps && stationTemps[closest.stationID]) {
                 setUserData({
                   temp: Math.round(stationTemps[closest.stationID].temp || 0),
                   pm25: closest.AQILast?.PM25?.value || 0,
                   rain: stationTemps[closest.stationID].rainProb || 0,
                   uv: stationTemps[closest.stationID].uv || 0,
                   wind: Math.round(stationTemps[closest.stationID].windSpeed || 0)
                 });
              } else {
                 setUserData({ temp: '-', pm25: '-', rain: '-', uv: '-', wind: '-' });
              }
            } else {
              fallbackToDefault();
            }
            setIsLocating(false);
          }, 
          () => { fallbackToDefault(); }, 
          { timeout: 5000, maximumAge: 60000 } 
        );
      } else {
        fallbackToDefault();
      }
  }, [stations, stationTemps]);

  useEffect(() => {
    if (stations && stations.length > 0) {
        fetchUserLocation();
    }
  }, [stations, fetchUserLocation]);

  const { groupedAlerts } = useMemo(() => {
    let alerts = { heat: [], pm25: [], uv: [], rain: [], wind: [], fire: [] };
    
    if (stations?.length > 0 && stationTemps) {
        stations.forEach(st => {
          const data = stationTemps[st.stationID];
          if (!data) return;
          const pm25 = st.AQILast?.PM25?.value || 0;
          const temp = Math.round(data.temp || 0);
          const feelsLike = Math.round(data.feelsLike || temp || 0); 
          const uv = data.uv || 0;
          const rain = data.rainProb || 0;
          const windSpeed = Math.round(data.windSpeed || 0);
          const provName = (st.areaTH || st.nameTH || '').replace('จังหวัด', '');

          if (feelsLike >= 35) alerts.heat.push({ prov: provName, val: feelsLike, unit: '°C' });
          if (pm25 > 15) alerts.pm25.push({ prov: provName, val: pm25, unit: 'µg/m³' });
          if (uv >= 3) alerts.uv.push({ prov: provName, val: uv, unit: 'Index' });
          if (rain > 30) alerts.rain.push({ prov: provName, val: rain, unit: '%' });
          if (windSpeed > 15) alerts.wind.push({ prov: provName, val: windSpeed, unit: 'km/h' });
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
          level: '🔴 เฝ้าระวังฮีทสโตรก', desc: 'อุณหภูมิทะลุเกณฑ์อันตรายในหลายพื้นที่ ควรงดกิจกรรมกลางแจ้งช่วง 11:00-15:00 น. และดื่มน้ำให้เพียงพอ',
          statTitle: 'ร้อนสุดเมื่อวาน', statVal: '44.2 °C', statLoc: 'จังหวัดสุโขทัย', bg: '#fef2f2', border: '#fecaca' 
      },
      pm25: { 
          level: '🟠 อากาศเริ่มปิด', desc: 'คุณภาพอากาศเริ่มมีผลกระทบต่อสุขภาพ แนะนำสวมหน้ากากอนามัย และเปิดเครื่องฟอกอากาศเมื่ออยู่ในอาคาร',
          statTitle: 'ฝุ่นสูงสุดเมื่อวาน', statVal: '115 µg/m³', statLoc: 'จังหวัดเชียงใหม่', bg: '#fff7ed', border: '#fed7aa' 
      },
      uv: { 
          level: '🟣 รังสี UV รุนแรง', desc: 'ดัชนีรังสี UV อยู่ในเกณฑ์สูงมาก เสี่ยงต่อผิวหนังไหม้แดด ควรกางร่มหรือทาครีมกันแดดหากต้องอยู่กลางแจ้ง',
          statTitle: 'UV สูงสุดเมื่อวาน', statVal: 'ระดับ 11', statLoc: 'ข้อมูล GISTDA', bg: '#faf5ff', border: '#e9d5ff' 
      },
      rain: { 
          level: '🔵 พายุฤดูร้อน', desc: 'มีโอกาสเกิดฝนฟ้าคะนองและลมกระโชกแรง ระวังอันตรายจากป้ายโฆษณาหรือต้นไม้หักโค่น',
          statTitle: 'ฝนสะสมสูงสุด', statVal: '85 mm', statLoc: 'จังหวัดตราด', bg: '#eff6ff', border: '#bfdbfe' 
      },
      wind: { 
          level: '🟡 ระวังลมกระโชกแรง', desc: 'กระแสลมพัดแรงในบางพื้นที่ ระวังอันตรายจากป้ายโฆษณา ต้นไม้ใหญ่ และสิ่งปลูกสร้างที่ไม่แข็งแรง',
          statTitle: 'ความเร็วลมสูงสุด', statVal: '35 km/h', statLoc: 'จังหวัดชลบุรี', bg: '#ecfeff', border: '#a5f3fc' 
      },
      fire: { 
          level: '🔴 เสี่ยงไฟป่ารุนแรง', desc: 'พบจุดความร้อนกระจายตัวหนาแน่น สภาพอากาศแห้งแล้งเอื้อต่อการลุกลาม ห้ามจุดไฟในที่โล่งเด็ดขาด',
          statTitle: 'จุดความร้อนรวม', statVal: '1,208 จุด', statLoc: 'ข้อมูล GISTDA', bg: '#fef2f2', border: '#fed7aa' 
      }
  };

  const tabs = [
      { id: 'heat', label: 'ความร้อน', icon: '🥵', color: '#ef4444', data: groupedAlerts.heat },
      { id: 'pm25', label: 'ฝุ่น PM2.5', icon: '😷', color: '#f97316', data: groupedAlerts.pm25 },
      { id: 'uv', label: 'รังสี UV', icon: '☀️', color: '#a855f7', data: groupedAlerts.uv },
      { id: 'rain', label: 'พายุ/ฝน', icon: '⛈️', color: '#3b82f6', data: groupedAlerts.rain },
      { id: 'wind', label: 'ลมกระโชกแรง', icon: '🌪️', color: '#06b6d4', data: groupedAlerts.wind },
      { id: 'fire', label: 'ไฟป่า', icon: '🔥', color: '#ea580c', data: groupedAlerts.fire }
  ];

  const activeTabData = tabs.find(t => t.id === activeTab);
  const activeBriefing = modeBriefings[activeTab];
  const filteredData = activeTabData.data.filter(item => item.prov.includes(searchTerm));

  const getWindyOverlay = (tabId) => {
      if (tabId === 'rain') return 'rain';
      if (tabId === 'pm25') return 'pm2p5';
      if (tabId === 'uv') return 'uvindex';
      if (tabId === 'wind') return 'wind'; 
      return 'temp';
  };

  // 🌟 [ใหม่] ฟังก์ชันระบุช่วงเวลาของข้อมูลแต่ละโหมด
  const getTimeframeLabel = (tabId) => {
      if (['heat', 'pm25', 'wind'].includes(tabId)) {
          return { text: `Nowcast - สภาพอากาศ ณ ปัจจุบัน (อัปเดตล่าสุด: ${lastUpdated ? new Date(lastUpdated).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'}) : '-'} น.)`, color: '#0ea5e9', dot: '#0ea5e9' };
      } else if (tabId === 'uv' || tabId === 'rain') {
          return { text: 'Forecast - พยากรณ์ค่าสูงสุดที่จะเกิดขึ้นในวันนี้', color: '#8b5cf6', dot: '#8b5cf6' };
      } else if (tabId === 'fire') {
          return { text: 'Historical - สถิติสะสมย้อนหลัง 24 ชั่วโมง', color: '#f59e0b', dot: '#f59e0b' };
      }
      return { text: 'Data Overview', color: '#0ea5e9', dot: '#0ea5e9' };
  };

  const timeframe = getTimeframeLabel(activeTab);

  // 🌟 ประเมินสถานการณ์แบบเจาะจงสาเหตุ (Smart Threat Detection)
  let locSummary = { text: 'สถานการณ์ปกติ', color: '#22c55e', bg: darkMode ? '#052e16' : '#dcfce7', icon: '✅', desc: 'ไม่มีการแจ้งเตือนภัยพิบัติรุนแรงในพื้นที่ของคุณ' };
  
  if (userData && userData.temp !== '-') {
      let criticalThreats = [];
      let warningThreats = [];

      if (userData.temp >= 40) criticalThreats.push(`ร้อนจัด (${userData.temp}°C)`);
      if (userData.pm25 >= 75) criticalThreats.push(`ฝุ่นอันตราย (${userData.pm25} µg)`);
      if (userData.rain >= 80) criticalThreats.push(`ฝนตกหนัก (${userData.rain}%)`);

      if (userData.temp >= 36 && userData.temp < 40) warningThreats.push(`อากาศร้อน (${userData.temp}°C)`);
      if (userData.pm25 >= 37.5 && userData.pm25 < 75) warningThreats.push(`ฝุ่นเริ่มหนา (${userData.pm25} µg)`);
      if (userData.rain >= 60 && userData.rain < 80) warningThreats.push(`โอกาสฝนตก (${userData.rain}%)`);
      if (userData.wind >= 20) warningThreats.push(`ลมพัดแรง (${userData.wind} km/h)`);

      if (criticalThreats.length > 0) {
          locSummary = { text: 'อันตรายระดับวิกฤต', color: '#ef4444', bg: darkMode ? '#450a0a' : '#fee2e2', icon: '🚨', desc: `แจ้งเตือน: ${criticalThreats.join(', ')} ควรระมัดระวังสุขภาพเป็นพิเศษ` };
      } else if (warningThreats.length > 0) {
          locSummary = { text: 'พื้นที่เฝ้าระวังพิเศษ', color: '#f97316', bg: darkMode ? '#431407' : '#ffedd5', icon: '⚠️', desc: `เฝ้าระวัง: ${warningThreats.join(', ')} แนะนำให้เตรียมพร้อมรับมือ` };
      }
  }

  if (loading || stations.length === 0) return <div style={{ height: '100%', background: appBg }}></div>;

  return (
    <div style={{ height: '100%', width: '100%', background: appBg, display: 'flex', justifyContent: 'center', overflowY: 'auto', fontFamily: 'Kanit, sans-serif' }} className="hide-scrollbar">
      <div style={{ width: '100%', maxWidth: '1200px', display: 'flex', flexDirection: 'column', gap: '20px', padding: isMobile ? '15px' : '30px', paddingBottom: '100px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '10px' }}>
            <div>
                <h1 style={{ margin: 0, color: textColor, fontSize: '1.8rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  🚨 ศูนย์ปฏิบัติการเฝ้าระวัง
                </h1>
                <p style={{ margin: '5px 0 0 0', color: subTextColor, fontSize: '0.9rem' }}>ข้อมูลวิเคราะห์ภัยพิบัติรายจังหวัด (Real-time & Historical)</p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
                <div style={{ background: darkMode ? '#1e293b' : '#f1f5f9', padding: '8px 16px', borderRadius: '50px', border: `1px solid ${borderColor}`, fontSize: '0.9rem', color: textColor, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#22c55e', borderRadius: '50%', boxShadow: '0 0 8px #22c55e', animation: 'pulse 1.5s infinite' }}></span>
                    LIVE: {currentTime.toLocaleTimeString('th-TH')}
                </div>
            </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', gap: '20px', alignItems: 'start' }}>
            
            {/* กล่อง Threat Assessment */}
            <div style={{ background: locSummary.bg, border: `1px solid ${locSummary.color}50`, borderRadius: '24px', padding: '25px', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', transition: '0.3s' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ fontSize: '1.3rem', fontWeight: '900', color: textColor }}>
                            {isLocating ? 'กำลังค้นหา...' : (userProv === 'กรุงเทพมหานคร' ? userProv : `จังหวัด${userProv}`)}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: subTextColor, marginTop: '2px' }}>
                            📍 พื้นที่เฝ้าระวังของคุณ
                        </div>
                    </div>
                    <button 
                        onClick={fetchUserLocation} disabled={isLocating}
                        style={{ background: 'transparent', border: 'none', color: locSummary.color, cursor: isLocating ? 'wait' : 'pointer', fontSize: '1.2rem', transition: '0.2s', opacity: isLocating ? 0.5 : 1 }} title="ค้นหาพิกัดใหม่"
                    >
                        {isLocating ? '⏳' : '🔍'}
                    </button>
                </div>

                {!isLocating && userData ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, marginTop: '20px', gap: '5px' }}>
                        <div style={{ fontSize: '3rem', animation: locSummary.icon === '🚨' ? 'pulse 1.5s infinite' : 'none' }}>{locSummary.icon}</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: '900', color: locSummary.color, textAlign: 'center', lineHeight: '1.2' }}>{locSummary.text}</div>
                        <div style={{ fontSize: '0.85rem', color: textColor, textAlign: 'center', opacity: 0.8, padding: '0 10px', marginBottom: '10px' }}>{locSummary.desc}</div>
                        
                        <div style={{ display: 'flex', gap: '8px', width: '100%', flexWrap: 'wrap', justifyContent: 'center' }}>
                            <div style={{ background: darkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.7)', border: `1px solid ${borderColor}`, padding: '8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', color: textColor, display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 auto', justifyContent: 'center' }}>
                                🌡️ <span style={{color: userData.temp >= 38 ? '#ef4444' : textColor}}>{userData.temp !== '-' ? `${userData.temp}°C` : '-'}</span>
                            </div>
                            <div style={{ background: darkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.7)', border: `1px solid ${borderColor}`, padding: '8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', color: textColor, display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 auto', justifyContent: 'center' }}>
                                😷 <span style={{color: userData.pm25 >= 37.5 ? '#f97316' : textColor}}>{userData.pm25 !== '-' ? `${userData.pm25} µg` : '-'}</span>
                            </div>
                            <div style={{ background: darkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.7)', border: `1px solid ${borderColor}`, padding: '8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', color: textColor, display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 auto', justifyContent: 'center' }}>
                                ☔ <span style={{color: userData.rain >= 40 ? '#3b82f6' : textColor}}>{userData.rain !== '-' ? `${userData.rain}%` : '-'}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: subTextColor, marginTop: '20px' }}>
                        กำลังโหลดข้อมูลพิกัด...
                    </div>
                )}
            </div>

            {/* แผงควบคุม 6 โหมด (3x2 Grid) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.85rem', color: subTextColor, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', paddingLeft: '5px' }}>
                    👆 แผงควบคุมและประเมินสถานการณ์ <span style={{fontWeight: 'normal', opacity: 0.8}}>(คลิกเพื่อสลับโหมด)</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', flex: 1 }}>
                    {tabs.map((tab, idx) => (
                        <div key={idx} onClick={() => setActiveTab(tab.id)} style={{ background: cardBg, padding: '12px 5px', borderRadius: '20px', border: `2px solid ${activeTab === tab.id ? tab.color : borderColor}`, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px', boxShadow: activeTab === tab.id ? `0 10px 20px ${tab.color}15` : 'none', transform: activeTab === tab.id ? 'translateY(-3px)' : 'none' }}>
                            <span style={{ fontSize: '1.6rem' }}>{tab.icon}</span>
                            <span style={{ fontSize: '0.7rem', color: subTextColor, fontWeight: 'bold', whiteSpace: 'nowrap' }}>{tab.label}</span>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                                <span style={{ fontSize: '1.2rem', fontWeight: '900', color: tab.color }}>{tab.data.length}</span>
                                <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: tab.color }}>จังหวัด</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: '20px', marginTop: '20px' }}>
            
            <div style={{ background: cardBg, padding: '20px', borderRadius: '24px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h2 style={{ margin: 0, color: textColor, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {activeTabData.icon} แผนที่ความเสี่ยง: {activeTabData.label}
                    </h2>
                </div>
                <div style={{ flex: 1, minHeight: isMobile ? '350px' : '550px', borderRadius: '16px', overflow: 'hidden', background: '#000' }}>
                    <iframe width="100%" height="100%" src={`https://embed.windy.com/embed2.html?lat=13.75&lon=100.5&zoom=5&level=surface&overlay=${getWindyOverlay(activeTab)}&product=ecmwf`} style={{ border: 'none' }}></iframe>
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
                                รวม {activeTabData.data.length} จังหวัด
                            </span>
                        </div>
                        
                        {/* 🌟 ป้ายกำกับข้อมูลแบบ Dynamic */}
                        <div style={{ fontSize: '0.75rem', color: timeframe.color, fontWeight: 'bold', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ display: 'inline-block', width: '6px', height: '6px', background: timeframe.dot, borderRadius: '50%', animation: timeframe.dot === '#0ea5e9' ? 'pulse 2s infinite' : 'none' }}></span>
                            {timeframe.text}
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
                                    <span style={{ color: textColor, fontWeight: '600', fontSize: '0.9rem' }}>
                                        {item.prov === 'กรุงเทพมหานคร' ? item.prov : `จังหวัด${item.prov}`}
                                    </span>
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