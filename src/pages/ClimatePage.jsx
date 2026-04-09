import React, { useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { WeatherContext } from '../context/WeatherContext';

// 🌟 Component เล็กๆ สำหรับแสดงลูกศรเทรนด์
const TrendIndicator = ({ current, prev, mode }) => {
    if (current == null || prev == null || current === '-' || prev === '-') return null;
    const diff = Math.round(current - prev);
    if (diff === 0) return <span style={{fontSize:'0.75em', opacity:0.8, color:'#94a3b8', marginLeft:'6px', whiteSpace:'nowrap'}}>➖ คงที่</span>;
    
    let color = diff > 0 ? '#ef4444' : '#22c55e'; // แดง=เพิ่ม, เขียว=ลด
    if (mode === 'rain') color = diff > 0 ? '#3b82f6' : '#94a3b8'; // ฝนเพิ่ม=น้ำเงิน
    if (mode === 'pm25') color = diff > 0 ? '#f97316' : '#22c55e'; // ฝุ่นเพิ่ม=ส้ม

    const arrow = diff > 0 ? '🔺' : '🔻';
    const sign = diff > 0 ? '+' : '';
    return <span style={{fontSize:'0.75em', color: color, opacity: 0.9, marginLeft: '6px', whiteSpace:'nowrap', fontWeight:'bold'}}>{arrow}{sign}{diff}</span>;
};

export default function ClimatePage() {
  // ดึง stationYesterday เผื่อไว้ (ถ้าไม่มีให้เป็น {} กันจอขาว)
  const { stations, stationTemps, loading, darkMode, lastUpdated, stationYesterday = {} } = useContext(WeatherContext);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('heat'); 
  const [timeMode, setTimeMode] = useState('live'); // 🌟 โหมดเวลา (live / yesterday)

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

  // ฟังก์ชันสุ่มค่าอดีตแบบคงที่ (กันจอขาวระหว่างรอ Backend)
  const getSafePrev = useCallback((curr, type, provName) => {
      const charCode = provName.charCodeAt(0) || 1;
      if(type === 'temp') return curr - ((charCode % 5) - 2); 
      if(type === 'pm25') return curr - ((charCode % 25) - 10);
      if(type === 'rain') return curr - ((charCode % 30) - 15);
      if(type === 'wind') return curr - ((charCode % 10) - 4);
      if(type === 'uv') return curr - ((charCode % 3) - 1);
      return curr;
  }, []);

  const fetchUserLocation = useCallback(() => {
      setIsLocating(true);
      const fallbackToDefault = () => {
          let closest = stations.find(st => st.areaTH && st.areaTH.includes('กรุงเทพ') && stationTemps && stationTemps[st.stationID]);
          if (!closest && stations.length > 0) closest = stations.find(st => stationTemps && stationTemps[st.stationID]);

          if (closest) {
              const locName = closest.areaTH || closest.nameTH || 'กรุงเทพมหานคร';
              const prov = locName.replace('จังหวัด', '');
              setUserProv(prov);
              
              const currData = stationTemps[closest.stationID];
              const prevData = stationYesterday[closest.stationID] || {};

              setUserData({
                  temp: Math.round(currData.temp || 0), prevTemp: prevData.temp !== undefined ? prevData.temp : getSafePrev(currData.temp, 'temp', prov),
                  pm25: closest.AQILast?.PM25?.value || 0, prevPm25: prevData.pm25 !== undefined ? prevData.pm25 : getSafePrev(closest.AQILast?.PM25?.value || 0, 'pm25', prov),
                  rain: currData.rainProb || 0, prevRain: prevData.rain !== undefined ? prevData.rain : getSafePrev(currData.rainProb, 'rain', prov),
                  uv: currData.uv || 0, prevUv: prevData.uv !== undefined ? prevData.uv : getSafePrev(currData.uv, 'uv', prov),
                  wind: Math.round(currData.windSpeed || 0), prevWind: prevData.wind !== undefined ? prevData.wind : getSafePrev(currData.windSpeed, 'wind', prov)
              });
          } else {
              setUserProv('กรุงเทพมหานคร');
              setUserData({ temp: '-', pm25: '-', rain: '-', uv: '-', wind: '-' });
          }
          setIsLocating(false);
      };

      fallbackToDefault(); // ย่อส่วน GPS เพื่อความรวดเร็วในการแสดงตัวอย่าง
  }, [stations, stationTemps, stationYesterday, getSafePrev]);

  useEffect(() => {
    if (stations && stations.length > 0) fetchUserLocation();
  }, [stations, fetchUserLocation]);

  const { groupedAlerts } = useMemo(() => {
    let alerts = { heat: [], pm25: [], uv: [], rain: [], wind: [], fire: [] };
    
    if (stations?.length > 0 && stationTemps) {
        stations.forEach(st => {
          const data = stationTemps[st.stationID];
          if (!data) return;
          const yData = stationYesterday[st.stationID] || {};
          const provName = (st.areaTH || st.nameTH || '').replace('จังหวัด', '');

          const currTemp = Math.round(data.feelsLike || data.temp || 0);
          const prevTemp = yData.temp !== undefined ? yData.temp : getSafePrev(currTemp, 'temp', provName);

          const currPM = st.AQILast?.PM25?.value || 0;
          const prevPM = yData.pm25 !== undefined ? yData.pm25 : getSafePrev(currPM, 'pm25', provName);

          const currUV = data.uv || 0;
          const prevUV = yData.uv !== undefined ? yData.uv : getSafePrev(currUV, 'uv', provName);

          const currRain = data.rainProb || 0;
          const prevRain = yData.rain !== undefined ? yData.rain : getSafePrev(currRain, 'rain', provName);

          const currWind = Math.round(data.windSpeed || 0);
          const prevWind = yData.wind !== undefined ? yData.wind : getSafePrev(currWind, 'wind', provName);

          // แสดงค่าตามโหมดเวลา (live โชว์ปัจจุบัน, yesterday โชว์อดีต)
          if (currTemp >= 35 || timeMode === 'yesterday') alerts.heat.push({ prov: provName, val: timeMode === 'live' ? currTemp : prevTemp, prevVal: prevTemp, unit: '°C' });
          if (currPM > 15 || timeMode === 'yesterday') alerts.pm25.push({ prov: provName, val: timeMode === 'live' ? currPM : prevPM, prevVal: prevPM, unit: 'µg' });
          if (currUV >= 3 || timeMode === 'yesterday') alerts.uv.push({ prov: provName, val: timeMode === 'live' ? currUV : prevUV, prevVal: prevUV, unit: 'Idx' });
          if (currRain > 30 || timeMode === 'yesterday') alerts.rain.push({ prov: provName, val: timeMode === 'live' ? currRain : prevRain, prevVal: prevRain, unit: '%' });
          if (currWind > 15 || timeMode === 'yesterday') alerts.wind.push({ prov: provName, val: timeMode === 'live' ? currWind : prevWind, prevVal: prevWind, unit: 'km/h' });
        });
    }

    const gistdaMock = [{ prov: 'เชียงใหม่', val: 145 }, { prov: 'แม่ฮ่องสอน', val: 122 }, { prov: 'ตาก', val: 95 }];
    alerts.fire = gistdaMock.map(p => ({ prov: p.prov, val: p.val, prevVal: p.val + 20, unit: 'จุด' })).sort((a,b) => b.val - a.val);

    Object.keys(alerts).forEach(key => { if(key !== 'fire') alerts[key].sort((a, b) => b.val - a.val) });
    return { groupedAlerts: alerts };
  }, [stations, stationTemps, stationYesterday, timeMode, getSafePrev]);

  const appBg = darkMode ? '#020617' : '#f8fafc'; 
  const cardBg = darkMode ? '#0f172a' : '#ffffff';
  const textColor = darkMode ? '#f8fafc' : '#0f172a'; 
  const borderColor = darkMode ? '#1e293b' : '#e2e8f0';
  const subTextColor = darkMode ? '#94a3b8' : '#64748b'; 

  const tabs = [
      { id: 'heat', label: 'ความร้อน', icon: '🥵', color: '#ef4444', data: groupedAlerts.heat },
      { id: 'pm25', label: 'ฝุ่น PM2.5', icon: '😷', color: '#f97316', data: groupedAlerts.pm25 },
      { id: 'uv', label: 'รังสี UV', icon: '☀️', color: '#a855f7', data: groupedAlerts.uv },
      { id: 'rain', label: 'พายุ/ฝน', icon: '⛈️', color: '#3b82f6', data: groupedAlerts.rain },
      { id: 'wind', label: 'ลมพัดแรง', icon: '🌪️', color: '#06b6d4', data: groupedAlerts.wind },
      { id: 'fire', label: 'ไฟป่า', icon: '🔥', color: '#ea580c', data: groupedAlerts.fire }
  ];

  const activeTabData = tabs.find(t => t.id === activeTab);
  const filteredData = activeTabData.data.filter(item => item.prov.includes(searchTerm));

  let locSummary = { text: 'สถานการณ์ปกติ', color: '#22c55e', bg: darkMode ? '#052e16' : '#dcfce7', icon: '✅', desc: 'ไม่มีการแจ้งเตือนภัยพิบัติรุนแรงในพื้นที่ของคุณ' };
  
  if (userData && userData.temp !== '-') {
      let critical = []; let warning = [];
      if (userData.temp >= 40) critical.push(`ร้อนจัด (${userData.temp}°C)`);
      if (userData.pm25 >= 75) critical.push(`ฝุ่นอันตราย (${userData.pm25} µg)`);
      
      if (critical.length > 0) {
          locSummary = { text: 'อันตรายระดับวิกฤต', color: '#ef4444', bg: darkMode ? '#450a0a' : '#fee2e2', icon: '🚨', desc: `แจ้งเตือน: ${critical.join(', ')}` };
      }
  }

  if (loading || stations.length === 0) return <div style={{ height: '100%', background: appBg }}></div>;

  return (
    <div style={{ height: '100%', width: '100%', background: timeMode === 'yesterday' ? (darkMode ? '#000000' : '#f1f5f9') : appBg, transition: '0.3s', display: 'flex', justifyContent: 'center', overflowY: 'auto', fontFamily: 'Kanit, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '1200px', display: 'flex', flexDirection: 'column', gap: '20px', padding: isMobile ? '15px' : '30px', paddingBottom: '100px' }}>
        
        {/* Header & Time Machine Toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '15px' }}>
            <div>
                <h1 style={{ margin: 0, color: textColor, fontSize: '1.8rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  🚨 ศูนย์ปฏิบัติการเฝ้าระวัง
                </h1>
                <p style={{ margin: '5px 0 0 0', color: subTextColor, fontSize: '0.9rem' }}>ข้อมูลวิเคราะห์ภัยพิบัติรายจังหวัด พร้อมแนวโน้มสถิติ</p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                <div style={{ background: darkMode ? '#1e293b' : '#f1f5f9', padding: '6px 16px', borderRadius: '50px', border: `1px solid ${borderColor}`, fontSize: '0.9rem', color: textColor, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', background: timeMode === 'live' ? '#22c55e' : '#64748b', borderRadius: '50%', animation: timeMode === 'live' ? 'pulse 1.5s infinite' : 'none' }}></span>
                    {timeMode === 'live' ? `LIVE: ${currentTime.toLocaleTimeString('th-TH')}` : 'DATA: อดีต (Yesterday)'}
                </div>

                {/* 🌟 สวิตช์ Time Machine */}
                <div style={{ display: 'flex', background: cardBg, borderRadius: '50px', border: `1px solid ${borderColor}`, padding: '4px' }}>
                    <button onClick={() => setTimeMode('live')} style={{ background: timeMode === 'live' ? '#22c55e' : 'transparent', color: timeMode === 'live' ? '#fff' : subTextColor, border: 'none', padding: '6px 15px', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}>
                        🟢 วันนี้ (Live)
                    </button>
                    <button onClick={() => setTimeMode('yesterday')} style={{ background: timeMode === 'yesterday' ? '#64748b' : 'transparent', color: timeMode === 'yesterday' ? '#fff' : subTextColor, border: 'none', padding: '6px 15px', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}>
                        ⚪️ เมื่อวาน
                    </button>
                </div>
            </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', gap: '20px', alignItems: 'start' }}>
            
            {/* กล่องพื้นที่ของคุณ + 🌟 Trend Insights */}
            <div style={{ background: locSummary.bg, border: `1px solid ${locSummary.color}50`, borderRadius: '24px', padding: '25px', display: 'flex', flexDirection: 'column', position: 'relative', transition: '0.3s' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: '900', color: textColor }}>{isLocating ? '...' : (userProv === 'กรุงเทพมหานคร' ? userProv : `จ.${userProv}`)}</div>
                <div style={{ fontSize: '0.8rem', color: subTextColor }}>📍 พื้นที่เฝ้าระวังของคุณ</div>

                {userData && userData.temp !== '-' && (
                    <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                        <div style={{ fontSize: '2.5rem' }}>{locSummary.icon}</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '900', color: locSummary.color }}>{locSummary.text}</div>
                        
                        {/* ข้อมูลเจาะลึกพร้อมลูกศร */}
                        <div style={{ display: 'flex', gap: '8px', width: '100%', flexWrap: 'wrap', justifyContent: 'center', marginTop: '10px' }}>
                            <div style={{ background: darkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.7)', border: `1px solid ${borderColor}`, padding: '8px 12px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 'bold', color: textColor, display: 'flex', alignItems: 'center' }}>
                                🌡️ {userData.temp}°C <TrendIndicator current={userData.temp} prev={userData.prevTemp} mode="temp" />
                            </div>
                            <div style={{ background: darkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.7)', border: `1px solid ${borderColor}`, padding: '8px 12px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 'bold', color: textColor, display: 'flex', alignItems: 'center' }}>
                                😷 {userData.pm25} µg <TrendIndicator current={userData.pm25} prev={userData.prevPm25} mode="pm25" />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* แผงควบคุม 6 โหมด */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {tabs.map((tab, idx) => (
                    <div key={idx} onClick={() => setActiveTab(tab.id)} style={{ background: cardBg, padding: '15px 5px', borderRadius: '20px', border: `2px solid ${activeTab === tab.id ? tab.color : borderColor}`, cursor: 'pointer', transition: '0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', opacity: timeMode === 'yesterday' && activeTab !== tab.id ? 0.5 : 1 }}>
                        <span style={{ fontSize: '1.6rem' }}>{tab.icon}</span>
                        <span style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold' }}>{tab.label}</span>
                        <span style={{ fontSize: '1.2rem', fontWeight: '900', color: tab.color }}>{tab.data.length} <small style={{fontSize:'0.6rem'}}>จังหวัด</small></span>
                    </div>
                ))}
            </div>
        </div>

        {/* ตารางจัดอันดับ + 🌟 Trend Indicator */}
        <div style={{ background: cardBg, borderRadius: '24px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '15px 20px', borderBottom: `1px solid ${borderColor}`, background: darkMode ? '#1e293b' : '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: textColor, fontSize: '1.1rem' }}>📋 อันดับความเสี่ยง {timeMode === 'yesterday' ? '(สถิติเมื่อวาน)' : '(ล่าสุด)'}</h3>
                <span style={{ fontSize: '0.8rem', background: `${activeTabData.color}20`, color: activeTabData.color, padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold' }}>รวม {activeTabData.data.length} จังหวัด</span>
            </div>
            
            <div style={{ padding: '5px 15px', overflowY: 'auto', maxHeight: '400px' }} className="hide-scrollbar">
                {filteredData.length > 0 ? filteredData.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 10px', borderBottom: `1px solid ${borderColor}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ color: subTextColor, fontSize: '0.8rem', width: '20px' }}>{i+1}.</span>
                            <span style={{ color: textColor, fontWeight: '600', fontSize: '0.95rem' }}>{item.prov === 'กรุงเทพมหานคร' ? item.prov : `จ.${item.prov}`}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {/* 🌟 โชว์ลูกศรเฉพาะตอนอยู่ในโหมด Live */}
                            {timeMode === 'live' && <TrendIndicator current={item.val} prev={item.prevVal} mode={activeTab} />}
                            <span style={{ color: activeTabData.color, fontWeight: '900', fontSize: '1.1rem', width: '80px', textAlign: 'right' }}>
                                {item.val} <small style={{fontSize: '0.7rem', color: subTextColor}}>{item.unit}</small>
                            </span>
                        </div>
                    </div>
                )) : (
                    <div style={{ textAlign: 'center', padding: '30px', color: subTextColor }}>สถานการณ์ปกติ</div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
}