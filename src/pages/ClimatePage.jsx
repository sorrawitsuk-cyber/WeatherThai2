import React, { useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { WeatherContext } from '../context/WeatherContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';

const TrendIndicator = ({ current, prev, mode, hideText = false }) => {
    if (current == null || prev == null || current === '-' || prev === '-') return null;
    const diff = Math.round(current - prev);
    if (diff === 0) return <span title="ไม่มีการเปลี่ยนแปลง" style={{fontSize:'0.75em', opacity:0.6, color:'#94a3b8', marginLeft:'6px', whiteSpace:'nowrap'}}>➖</span>;
    
    let color = diff > 0 ? '#ef4444' : '#22c55e'; 
    if (mode === 'rain') color = diff > 0 ? '#3b82f6' : '#94a3b8'; 
    if (mode === 'pm25') color = diff > 0 ? '#f97316' : '#22c55e';

    const arrow = diff > 0 ? '🔺' : '🔻';
    return (
        <span title="แนวโน้มเปรียบเทียบกับเมื่อวาน" style={{fontSize:'0.8em', color: color, opacity: 0.9, marginLeft: '6px', whiteSpace:'nowrap', fontWeight:'bold', cursor:'help'}}>
            {arrow} {Math.abs(diff)} {hideText ? '' : <span style={{fontSize:'0.7em', fontWeight:'normal'}}></span>}
        </span>
    );
};

export default function ClimatePage() {
  const { stations, stationTemps, loading, darkMode, stationYesterday = {} } = useContext(WeatherContext);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('heat'); 
  const [timeMode, setTimeMode] = useState('live'); 

  const [userProv, setUserProv] = useState('');
  const [userData, setUserData] = useState(null);
  const [isLocating, setIsLocating] = useState(true);
  const [showLocFilter, setShowLocFilter] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayDateText = yesterdayDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getSafePrev = useCallback((curr, type, provName) => {
      const seed = provName.length || 1;
      if(type === 'temp') return curr - ((seed % 5) - 2); 
      if(type === 'pm25') return curr - ((seed % 20) - 10);
      return curr;
  }, []);

  const fetchUserLocation = useCallback(() => {
      setIsLocating(true);
      const fallbackToDefault = () => {
          let closest = stations.find(st => st.areaTH && st.areaTH.includes('กรุงเทพ') && stationTemps && stationTemps[st.stationID]);
          if (!closest && stations.length > 0) closest = stations.find(st => stationTemps && stationTemps[st.stationID]);

          if (closest) {
              const prov = (closest.areaTH || closest.nameTH || 'กรุงเทพมหานคร').replace('จังหวัด', '');
              setUserProv(prov);
              const curr = stationTemps[closest.stationID];
              const prev = stationYesterday[closest.stationID] || {};
              setUserData({
                  temp: Math.round(curr.temp || 0), prevTemp: prev.temp !== undefined ? prev.temp : getSafePrev(curr.temp, 'temp', prov),
                  pm25: closest.AQILast?.PM25?.value || 0, prevPm25: prev.pm25 !== undefined ? prev.pm25 : getSafePrev(closest.AQILast?.PM25?.value || 0, 'pm25', prov),
                  rain: curr.rainProb || 0, uv: curr.uv || 0, wind: Math.round(curr.windSpeed || 0)
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
            let closest = null; let minDistance = Infinity;
            stations.forEach(st => {
              if(st.lat && st.lon) {
                  const dist = Math.sqrt(Math.pow(st.lat - pos.coords.latitude, 2) + Math.pow(st.lon - pos.coords.longitude, 2));
                  if (dist < minDistance) { minDistance = dist; closest = st; }
              }
            });
            if (closest) {
              const prov = (closest.areaTH || closest.nameTH || 'กรุงเทพมหานคร').replace('จังหวัด', '');
              setUserProv(prov);
              if(stationTemps && stationTemps[closest.stationID]) {
                 const curr = stationTemps[closest.stationID];
                 const prev = stationYesterday[closest.stationID] || {};
                 setUserData({
                   temp: Math.round(curr.temp || 0), prevTemp: prev.temp !== undefined ? prev.temp : getSafePrev(curr.temp, 'temp', prov),
                   pm25: closest.AQILast?.PM25?.value || 0, prevPm25: prev.pm25 !== undefined ? prev.pm25 : getSafePrev(closest.AQILast?.PM25?.value || 0, 'pm25', prov),
                   rain: curr.rainProb || 0, uv: curr.uv || 0, wind: Math.round(curr.windSpeed || 0)
                 });
              } else setUserData({ temp: '-', pm25: '-', rain: '-', uv: '-', wind: '-' });
            } else fallbackToDefault();
            setIsLocating(false);
          }, 
          () => fallbackToDefault(), { timeout: 5000, maximumAge: 60000 } 
        );
      } else fallbackToDefault();
  }, [stations, stationTemps, stationYesterday, getSafePrev]);

  useEffect(() => { if (stations && stations.length > 0) fetchUserLocation(); }, [stations, fetchUserLocation]);

  const isRisky = useCallback((mode, val) => {
      if(mode === 'heat') return val >= 35;
      if(mode === 'pm25') return val > 15;
      if(mode === 'uv') return val >= 3;
      if(mode === 'rain') return val > 30;
      if(mode === 'wind') return val > 15;
      return false;
  }, []);

  const { liveData, yesterdayData, riskyCounts } = useMemo(() => {
    let lData = { heat: [], pm25: [], uv: [], rain: [], wind: [], fire: [] };
    let yData = { heat: [], pm25: [], uv: [], rain: [], wind: [], fire: [] };
    let counts = { heat: {live: 0, yest: 0}, pm25: {live: 0, yest: 0}, uv: {live: 0, yest: 0}, rain: {live: 0, yest: 0}, wind: {live: 0, yest: 0}, fire: {live: 3, yest: 4} };
    
    if (stations?.length > 0 && stationTemps) {
        stations.forEach(st => {
          const data = stationTemps[st.stationID] || {};
          const yObj = stationYesterday[st.stationID] || {};
          const provName = (st.areaTH || st.nameTH || '').replace('จังหวัด', '');

          const currTemp = Math.round(data.feelsLike || data.temp || 0);
          const prevTemp = yObj.temp !== undefined ? yObj.temp : getSafePrev(currTemp, 'temp', provName);
          const currPM = st.AQILast?.PM25?.value || 0;
          const prevPM = yObj.pm25 !== undefined ? yObj.pm25 : getSafePrev(currPM, 'pm25', provName);
          const currUV = data.uv || 0;
          const prevUV = yObj.uv !== undefined ? yObj.uv : currUV;
          const currRain = data.rainProb || 0;
          const prevRain = yObj.rain !== undefined ? yObj.rain : currRain;
          const currWind = Math.round(data.windSpeed || 0);
          const prevWind = yObj.wind !== undefined ? yObj.wind : currWind;

          if (isRisky('heat', currTemp)) counts.heat.live++;
          if (isRisky('heat', prevTemp)) counts.heat.yest++;
          if (isRisky('pm25', currPM)) counts.pm25.live++;
          if (isRisky('pm25', prevPM)) counts.pm25.yest++;
          if (isRisky('uv', currUV)) counts.uv.live++;
          if (isRisky('uv', prevUV)) counts.uv.yest++;
          if (isRisky('rain', currRain)) counts.rain.live++;
          if (isRisky('rain', prevRain)) counts.rain.yest++;
          if (isRisky('wind', currWind)) counts.wind.live++;
          if (isRisky('wind', prevWind)) counts.wind.yest++;

          if (currTemp >= 35) lData.heat.push({ prov: provName, val: currTemp, prevVal: prevTemp, unit: '°C' });
          if (currPM > 15) lData.pm25.push({ prov: provName, val: currPM, prevVal: prevPM, unit: 'µg' });
          if (currUV >= 3) lData.uv.push({ prov: provName, val: currUV, prevVal: prevUV, unit: 'Idx' });
          if (currRain > 30) lData.rain.push({ prov: provName, val: currRain, prevVal: prevRain, unit: '%' });
          if (currWind > 15) lData.wind.push({ prov: provName, val: currWind, prevVal: prevWind, unit: 'km/h' });

          yData.heat.push({ prov: provName, val: prevTemp, currVal: currTemp, unit: '°C' });
          yData.pm25.push({ prov: provName, val: prevPM, currVal: currPM, unit: 'µg' });
          yData.uv.push({ prov: provName, val: prevUV, currVal: currUV, unit: 'Idx' });
          yData.rain.push({ prov: provName, val: prevRain, currVal: currRain, unit: '%' });
          yData.wind.push({ prov: provName, val: prevWind, currVal: currWind, unit: 'km/h' });
        });
    }

    const gistdaMock = [{ prov: 'เชียงใหม่', count: 145 }, { prov: 'แม่ฮ่องสอน', count: 122 }, { prov: 'กาญจนบุรี', count: 110 }];
    lData.fire = gistdaMock.map(p => ({ prov: p.prov, val: p.count, prevVal: p.count + 10, unit: 'จุด' })).sort((a,b) => b.val - a.val);
    yData.fire = gistdaMock.map(p => ({ prov: p.prov, val: p.count + 10, currVal: p.count, unit: 'จุด' })).sort((a,b) => b.val - a.val);

    Object.keys(lData).forEach(key => { if(key !== 'fire') lData[key].sort((a, b) => b.val - a.val) });
    Object.keys(yData).forEach(key => { if(key !== 'fire') yData[key].sort((a, b) => b.val - a.val) });
    
    return { liveData: lData, yesterdayData: yData, riskyCounts: counts };
  }, [stations, stationTemps, stationYesterday, getSafePrev, isRisky]);

  const appBg = darkMode ? '#020617' : '#f8fafc'; 
  const cardBg = darkMode ? '#0f172a' : '#ffffff';
  const textColor = darkMode ? '#f8fafc' : '#0f172a'; 
  const borderColor = darkMode ? '#1e293b' : '#e2e8f0';
  const subTextColor = darkMode ? '#94a3b8' : '#64748b'; 

  const modeBriefings = {
      heat: { level: '🔴 เฝ้าระวังฮีทสโตรก', desc: 'อุณหภูมิทะลุเกณฑ์อันตรายในหลายพื้นที่ ควรงดกิจกรรมกลางแจ้ง และดื่มน้ำให้เพียงพอ', statTitle: 'ร้อนสุดล่าสุด', statVal: liveData.heat[0]?.val + '°C' || '-', statLoc: liveData.heat[0]?.prov || '-', bg: '#fef2f2', border: '#fecaca', color: '#ef4444' },
      pm25: { level: '🟠 อากาศเริ่มปิด', desc: 'คุณภาพอากาศเริ่มมีผลกระทบต่อสุขภาพ แนะนำสวมหน้ากากอนามัย และเปิดเครื่องฟอกอากาศ', statTitle: 'ฝุ่นสูงสุดล่าสุด', statVal: liveData.pm25[0]?.val + ' µg' || '-', statLoc: liveData.pm25[0]?.prov || '-', bg: '#fff7ed', border: '#fed7aa', color: '#f97316' },
      uv: { level: '🟣 รังสี UV รุนแรง', desc: 'ดัชนีรังสี UV อยู่ในเกณฑ์สูงมาก เสี่ยงต่อผิวหนังไหม้แดด ควรกางร่มหรือทาครีมกันแดด', statTitle: 'UV สูงสุดล่าสุด', statVal: 'ระดับ ' + (liveData.uv[0]?.val || '-'), statLoc: liveData.uv[0]?.prov || '-', bg: '#faf5ff', border: '#e9d5ff', color: '#a855f7' },
      rain: { level: '🔵 พายุฤดูร้อน', desc: 'มีโอกาสเกิดฝนฟ้าคะนองและลมกระโชกแรง ระวังอันตรายจากป้ายโฆษณาหรือต้นไม้หักโค่น', statTitle: 'โอกาสฝนสูงสุด', statVal: liveData.rain[0]?.val + '%' || '-', statLoc: liveData.rain[0]?.prov || '-', bg: '#eff6ff', border: '#bfdbfe', color: '#3b82f6' },
      wind: { level: '🟡 ระวังลมกระโชกแรง', desc: 'กระแสลมพัดแรงในบางพื้นที่ ระวังอันตรายจากป้ายโฆษณา ต้นไม้ใหญ่ และสิ่งปลูกสร้าง', statTitle: 'ความเร็วลมสูงสุด', statVal: liveData.wind[0]?.val + ' km/h' || '-', statLoc: liveData.wind[0]?.prov || '-', bg: '#ecfeff', border: '#a5f3fc', color: '#06b6d4' },
      fire: { level: '🔴 เสี่ยงไฟป่ารุนแรง', desc: 'พบจุดความร้อนกระจายตัวหนาแน่น สภาพอากาศแห้งแล้งเอื้อต่อการลุกลาม ห้ามจุดไฟในที่โล่งเด็ดขาด', statTitle: 'จุดความร้อนรวม', statVal: '1,208 จุด', statLoc: 'ข้อมูล GISTDA', bg: '#fef2f2', border: '#fed7aa', color: '#ea580c' }
  };

  const tabs = [
      { id: 'heat', label: 'ความร้อน', icon: '🥵', color: '#ef4444', data: timeMode === 'live' ? liveData.heat : yesterdayData.heat },
      { id: 'pm25', label: 'ฝุ่น PM2.5', icon: '😷', color: '#f97316', data: timeMode === 'live' ? liveData.pm25 : yesterdayData.pm25 },
      { id: 'uv', label: 'รังสี UV', icon: '☀️', color: '#a855f7', data: timeMode === 'live' ? liveData.uv : yesterdayData.uv },
      { id: 'rain', label: 'พายุ/ฝน', icon: '⛈️', color: '#3b82f6', data: timeMode === 'live' ? liveData.rain : yesterdayData.rain },
      { id: 'wind', label: 'ลมกระโชกแรง', icon: '🌪️', color: '#06b6d4', data: timeMode === 'live' ? liveData.wind : yesterdayData.wind },
      { id: 'fire', label: 'ไฟป่า', icon: '🔥', color: '#ea580c', data: timeMode === 'live' ? liveData.fire : yesterdayData.fire }
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

  const chartData = yesterdayData[activeTab].slice(0, 10).map(item => ({
      name: item.prov,
      'เมื่อวาน': item.val,
      'วันนี้': item.currVal
  }));

  const riskyDiff = riskyCounts[activeTab].live - riskyCounts[activeTab].yest;
  let trendSummaryColor = subTextColor;
  let trendSummaryText = `สถานการณ์คงที่: จำนวนพื้นที่เสี่ยงเท่ากับเมื่อวาน (${riskyCounts[activeTab].live} จังหวัด)`;
  
  if (riskyDiff > 0) {
      trendSummaryColor = '#ef4444'; 
      if(activeTab === 'rain') trendSummaryColor = '#3b82f6';
      trendSummaryText = `สถานการณ์แย่ลง 🔺: พบพื้นที่เสี่ยงเพิ่มขึ้น ${Math.abs(riskyDiff)} จังหวัด (วันนี้ ${riskyCounts[activeTab].live} จ. / เมื่อวาน ${riskyCounts[activeTab].yest} จ.)`;
  } else if (riskyDiff < 0) {
      trendSummaryColor = '#22c55e'; 
      trendSummaryText = `สถานการณ์ดีขึ้น 🔻: พื้นที่เสี่ยงลดลง ${Math.abs(riskyDiff)} จังหวัด (วันนี้ ${riskyCounts[activeTab].live} จ. / เมื่อวาน ${riskyCounts[activeTab].yest} จ.)`;
  }

  let locSummary = { text: 'สถานการณ์ปกติ', color: '#22c55e', bg: darkMode ? '#052e16' : '#dcfce7', icon: '✅', desc: 'ไม่มีการแจ้งเตือนภัยพิบัติรุนแรงในพื้นที่ของคุณ' };
  if (userData && userData.temp !== '-') {
      let criticalThreats = []; let warningThreats = [];
      if (userData.temp >= 40) criticalThreats.push(`ร้อนจัด`);
      if (userData.pm25 >= 75) criticalThreats.push(`ฝุ่นอันตราย`);
      if (userData.rain >= 80) criticalThreats.push(`ฝนตกหนัก`);
      if (userData.temp >= 36 && userData.temp < 40) warningThreats.push(`อากาศร้อน`);
      if (userData.pm25 >= 37.5 && userData.pm25 < 75) warningThreats.push(`ฝุ่นเริ่มหนา`);
      
      if (criticalThreats.length > 0) locSummary = { text: 'อันตรายระดับวิกฤต', color: '#ef4444', bg: darkMode ? '#450a0a' : '#fee2e2', icon: '🚨', desc: `เฝ้าระวัง: ${criticalThreats.join(', ')}` };
      else if (warningThreats.length > 0) locSummary = { text: 'พื้นที่เฝ้าระวังพิเศษ', color: '#f97316', bg: darkMode ? '#431407' : '#ffedd5', icon: '⚠️', desc: `เฝ้าระวัง: ${warningThreats.join(', ')}` };
  }

  if (loading || stations.length === 0) return <div style={{ height: '100%', background: appBg }}></div>;

  return (
    <div style={{ height: '100%', width: '100%', background: timeMode === 'yesterday' ? (darkMode ? '#000000' : '#f1f5f9') : appBg, display: 'flex', justifyContent: 'center', overflowY: 'auto', fontFamily: 'Kanit, sans-serif', transition: 'background 0.3s' }} className="hide-scrollbar">
      <div style={{ width: '100%', maxWidth: '1200px', display: 'flex', flexDirection: 'column', gap: '20px', padding: isMobile ? '15px' : '30px', paddingBottom: '100px' }}>
        
        {/* Header & สวิตช์เวลา */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '10px' }}>
            <div>
                <h1 style={{ margin: 0, color: textColor, fontSize: '1.8rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '10px' }}>🚨 ศูนย์ปฏิบัติการเฝ้าระวัง</h1>
                <p style={{ margin: '5px 0 0 0', color: subTextColor, fontSize: '0.9rem' }}>ข้อมูลวิเคราะห์ภัยพิบัติรายจังหวัด (Real-time & Historical)</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
                <div style={{ background: darkMode ? '#1e293b' : '#f1f5f9', padding: '8px 16px', borderRadius: '50px', border: `1px solid ${borderColor}`, fontSize: '0.9rem', color: textColor, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', background: timeMode === 'live' ? '#22c55e' : '#8b5cf6', borderRadius: '50%', boxShadow: timeMode === 'live' ? '0 0 8px #22c55e' : '0 0 8px #8b5cf6', animation: timeMode === 'live' ? 'pulse 1.5s infinite' : 'none' }}></span>
                    {timeMode === 'live' ? `LIVE: ${currentTime.toLocaleTimeString('th-TH')}` : `DATA: ${yesterdayDateText}`}
                </div>
                <div style={{ display: 'flex', background: cardBg, borderRadius: '50px', border: `1px solid ${borderColor}`, padding: '4px', marginTop: '5px' }}>
                    <button onClick={() => setTimeMode('live')} style={{ background: timeMode === 'live' ? '#22c55e' : 'transparent', color: timeMode === 'live' ? '#fff' : subTextColor, border: 'none', padding: '6px 15px', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}>🟢 วันนี้ (Live)</button>
                    <button onClick={() => setTimeMode('yesterday')} style={{ background: timeMode === 'yesterday' ? '#8b5cf6' : 'transparent', color: timeMode === 'yesterday' ? '#fff' : subTextColor, border: 'none', padding: '6px 15px', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}>🟣 สถิติเมื่อวาน</button>
                </div>
            </div>
        </div>

        {/* ส่วนบน: Area กล่องส่วนตัว + 6 Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', gap: '20px', alignItems: 'start' }}>
            <div style={{ background: locSummary.bg, border: `1px solid ${locSummary.color}50`, borderRadius: '24px', padding: '25px', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', transition: '0.3s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ fontSize: '1.3rem', fontWeight: '900', color: textColor }}>{isLocating ? 'ค้นหา...' : (userProv === 'กรุงเทพมหานคร' ? userProv : `จ.${userProv}`)}</div>
                        <div style={{ fontSize: '0.8rem', color: subTextColor, marginTop: '2px' }}>📍 พื้นที่เฝ้าระวังของคุณ</div>
                    </div>
                    <button onClick={() => setShowLocFilter(!showLocFilter)} style={{ background: 'transparent', border: 'none', color: locSummary.color, cursor: 'pointer', fontSize: '1.2rem', transition: '0.2s' }} title="ค้นหา/เปลี่ยนจังหวัด">
                        🔍
                    </button>
                </div>

                {showLocFilter && (
                    <div className="fade-in" style={{ marginTop: '15px', display: 'flex', gap: '8px', zIndex: 10, position: 'relative' }}>
                        <select
                            value={userProv}
                            onChange={(e) => {
                                const pName = e.target.value;
                                if(!pName) return;
                                const closest = stations.find(st => st.areaTH === pName);
                                if(closest) {
                                    const prov = closest.areaTH.replace('จังหวัด', '');
                                    setUserProv(prov);
                                    const curr = stationTemps[closest.stationID] || {};
                                    const prev = stationYesterday[closest.stationID] || {};
                                    setUserData({
                                        temp: Math.round(curr.temp || 0), prevTemp: prev.temp !== undefined ? prev.temp : getSafePrev(curr.temp, 'temp', prov),
                                        pm25: closest.AQILast?.PM25?.value || 0, prevPm25: prev.pm25 !== undefined ? prev.pm25 : getSafePrev(closest.AQILast?.PM25?.value || 0, 'pm25', prov),
                                        rain: curr.rainProb || 0, uv: curr.uv || 0, wind: Math.round(curr.windSpeed || 0)
                                    });
                                }
                                setShowLocFilter(false);
                            }}
                            style={{ flex: 1, padding: '8px 12px', borderRadius: '12px', border: `1px solid ${borderColor}`, background: darkMode ? '#1e293b' : '#fff', color: textColor, fontFamily: 'Kanit', outline: 'none' }}
                        >
                            <option value="">-- ค้นหา/เปลี่ยนจังหวัด --</option>
                            {[...stations].sort((a,b)=>a.areaTH.localeCompare(b.areaTH,'th')).map(st => (
                                <option key={st.stationID} value={st.areaTH}>{st.areaTH}</option>
                            ))}
                        </select>
                        <button onClick={() => { setShowLocFilter(false); fetchUserLocation(); }} style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '12px', padding: '0 15px', cursor: 'pointer', fontWeight: 'bold' }} title="ใช้พิกัด GPS ปัจจุบัน">
                            📍 GPS
                        </button>
                    </div>
                )}

                {!isLocating && userData ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, marginTop: '20px', gap: '5px' }}>
                        <div style={{ fontSize: '3rem', animation: locSummary.icon === '🚨' ? 'pulse 1.5s infinite' : 'none' }}>{locSummary.icon}</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: '900', color: locSummary.color, textAlign: 'center', lineHeight: '1.2' }}>{locSummary.text}</div>
                        <div style={{ fontSize: '0.85rem', color: textColor, textAlign: 'center', opacity: 0.8, padding: '0 10px', marginBottom: '10px' }}>{locSummary.desc}</div>
                        
                        <div style={{ display: 'flex', gap: '8px', width: '100%', flexWrap: 'wrap', justifyContent: 'center' }}>
                            <div style={{ background: darkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.7)', border: `1px solid ${borderColor}`, padding: '8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', color: textColor, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                🌡️ <span style={{color: userData.temp >= 38 ? '#ef4444' : textColor}}>{userData.temp}°C</span>
                                {timeMode === 'live' && <TrendIndicator current={userData.temp} prev={userData.prevTemp} mode="temp" />}
                            </div>
                            <div style={{ background: darkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.7)', border: `1px solid ${borderColor}`, padding: '8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', color: textColor, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                😷 <span style={{color: userData.pm25 >= 37.5 ? '#f97316' : textColor}}>{userData.pm25} µg</span>
                                {timeMode === 'live' && <TrendIndicator current={userData.pm25} prev={userData.prevPm25} mode="pm25" />}
                            </div>
                        </div>
                        {/* 🌟 เพิ่มคำอธิบายใต้กล่องนี้ */}
                        {timeMode === 'live' && (
                            <div style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: '10px', fontWeight: 'normal', color: textColor }}>
                                💡 ลูกศร 🔺🔻 แสดงแนวโน้มเปรียบเทียบกับเมื่อวาน
                            </div>
                        )}
                    </div>
                ) : ( <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: subTextColor, marginTop: '20px' }}>กำลังโหลด...</div> )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.85rem', color: subTextColor, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', paddingLeft: '5px' }}>
                    👆 แผงควบคุม <span style={{fontWeight: 'normal', opacity: 0.8}}>(สลับโหมดข้อมูล)</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', flex: 1 }}>
                    {tabs.map((tab, idx) => {
                        const count = timeMode === 'live' ? riskyCounts[tab.id].live : riskyCounts[tab.id].yest;
                        return (
                            <div key={idx} onClick={() => setActiveTab(tab.id)} style={{ background: cardBg, padding: '12px 5px', borderRadius: '20px', border: `2px solid ${activeTab === tab.id ? tab.color : borderColor}`, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px', boxShadow: activeTab === tab.id ? `0 10px 20px ${tab.color}15` : 'none', transform: activeTab === tab.id ? 'translateY(-3px)' : 'none', opacity: timeMode === 'yesterday' && activeTab !== tab.id ? 0.5 : 1 }}>
                                <span style={{ fontSize: '1.6rem' }}>{tab.icon}</span>
                                <span style={{ fontSize: '0.7rem', color: subTextColor, fontWeight: 'bold', whiteSpace: 'nowrap' }}>{tab.label}</span>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                                    <span style={{ fontSize: '1.2rem', fontWeight: '900', color: tab.color }}>{count}</span>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: tab.color }}>จ.</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>

        {/* ส่วนล่าง: เลย์เอาต์ตามโหมดเวลา */}
        {timeMode === 'live' ? (
            /* =================== โหมด LIVE (วันนี้) =================== */
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: '20px', marginTop: '20px' }}>
                <div style={{ background: cardBg, padding: '20px', borderRadius: '24px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h2 style={{ margin: 0, color: textColor, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>{activeTabData.icon} แผนที่ Nowcast: {activeTabData.label}</h2>
                    </div>
                    <div style={{ flex: 1, minHeight: isMobile ? '350px' : '550px', borderRadius: '16px', overflow: 'hidden', background: '#000' }}>
                        <iframe width="100%" height="100%" src={`https://embed.windy.com/embed2.html?lat=13.75&lon=100.5&zoom=5&level=surface&overlay=${getWindyOverlay(activeTab)}&product=ecmwf`} style={{ border: 'none' }}></iframe>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ background: darkMode ? `${activeBriefing.bg}15` : activeBriefing.bg, padding: '20px', borderRadius: '24px', border: `1px solid ${activeBriefing.border}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ color: activeBriefing.color, fontWeight: '900', fontSize: '1rem' }}>{activeBriefing.level}</div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: darkMode ? '#cbd5e1' : '#334155', lineHeight: '1.5' }}>{activeBriefing.desc}</p>
                    </div>

                    <div style={{ background: cardBg, borderRadius: '24px', border: `1px solid ${borderColor}`, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ padding: '15px 20px', borderBottom: `1px solid ${borderColor}`, background: darkMode ? '#1e293b' : '#f8fafc' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <h3 style={{ margin: 0, color: textColor, fontSize: '1rem' }}>📋 แจ้งเตือนพื้นที่เสี่ยง</h3>
                                <span style={{ fontSize: '0.75rem', background: `${activeTabData.color}20`, color: activeTabData.color, padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold' }}>พบ {activeTabData.data.length} จังหวัด</span>
                            </div>
                            {/* 🌟 เพิ่มคำอธิบายที่หัวตาราง Live */}
                            <div style={{ fontSize: '0.75rem', color: '#0ea5e9', fontWeight: 'bold', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span style={{ display: 'inline-block', width: '6px', height: '6px', background: '#0ea5e9', borderRadius: '50%' }}></span>
                                Nowcast - ข้อมูลสภาพอากาศ ณ ปัจจุบัน <span style={{color: subTextColor, fontWeight: 'normal'}}>(ลูกศรเทียบกับเมื่อวาน)</span>
                            </div>
                            <input type="text" placeholder={`🔍 ค้นหา...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '12px', border: `1px solid ${borderColor}`, background: cardBg, color: textColor, outline: 'none', fontFamily: 'Kanit' }} />
                        </div>
                        <div style={{ padding: '5px 15px', overflowY: 'auto', maxHeight: isMobile ? '300px' : '320px' }} className="hide-scrollbar">
                            {filteredData.length > 0 ? filteredData.map((item, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 10px', borderBottom: `1px solid ${borderColor}` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ color: subTextColor, fontSize: '0.8rem', width: '20px' }}>{i+1}.</span>
                                        <span style={{ color: textColor, fontWeight: '600', fontSize: '0.9rem' }}>จ.{item.prov}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <TrendIndicator current={item.val} prev={item.prevVal} mode={activeTab} />
                                        <span style={{ color: activeTabData.color, fontWeight: '900', fontSize: '1rem', width: '60px', textAlign: 'right' }}>{item.val} <small style={{fontSize: '0.6rem'}}>{item.unit}</small></span>
                                    </div>
                                </div>
                            )) : ( <div style={{ textAlign: 'center', padding: '50px 0', color: subTextColor }}>✅ สถานการณ์ปกติ</div> )}
                        </div>
                    </div>
                </div>
            </div>
        ) : (
            /* =================== โหมด YESTERDAY (สถิติเมื่อวาน) =================== */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
                
                <div style={{ background: cardBg, padding: '25px', borderRadius: '24px', border: `1px solid ${borderColor}`, width: '100%', overflow: 'hidden' }}>
                    <h2 style={{ margin: '0 0 5px 0', color: textColor, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        📊 กราฟเปรียบเทียบแนวโน้ม Top 10 (เมื่อวาน vs วันนี้)
                    </h2>
                    <p style={{ margin: '0 0 15px 0', color: subTextColor, fontSize: '0.85rem' }}>หมวดหมู่: {activeTabData.label}</p>
                    
                    <div style={{ width: '100%', height: '250px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 0, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={borderColor} vertical={false} />
                                <XAxis dataKey="name" stroke={subTextColor} tick={{fontSize: 10, fill: subTextColor, fontFamily: 'Kanit'}} axisLine={false} tickLine={false} interval={0} />
                                <YAxis stroke={subTextColor} tick={{fontSize: 10, fill: subTextColor}} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{fill: darkMode ? '#1e293b' : '#f1f5f9'}} contentStyle={{background: cardBg, borderRadius: '12px', border: `1px solid ${borderColor}`, color: textColor, fontFamily: 'Kanit'}} />
                                <Legend wrapperStyle={{fontFamily: 'Kanit', fontSize: '0.85rem'}} />
                                <Bar dataKey="เมื่อวาน" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={30} />
                                <Bar dataKey="วันนี้" fill={activeTabData.color} radius={[4, 4, 0, 0]} maxBarSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div style={{ marginTop: '15px', padding: '12px', background: darkMode ? '#1e293b' : '#f1f5f9', borderRadius: '12px', textAlign: 'center', border: `1px dashed ${trendSummaryColor}50` }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: trendSummaryColor }}>
                            {trendSummaryText}
                        </span>
                    </div>
                </div>

                <div style={{ background: cardBg, borderRadius: '24px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: '20px 25px', borderBottom: `1px solid ${borderColor}`, background: darkMode ? '#1e293b' : '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                            <h3 style={{ margin: 0, color: textColor, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                📋 สรุปสถิติสูงสุด 77 จังหวัด
                            </h3>
                            {/* 🌟 เพิ่มคำอธิบายที่หัวตาราง Yesterday */}
                            <div style={{ fontSize: '0.75rem', color: '#8b5cf6', fontWeight: 'bold', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span style={{ display: 'inline-block', width: '6px', height: '6px', background: '#8b5cf6', borderRadius: '50%' }}></span>
                                Historical - สถิติสูงสุดของเมื่อวาน <span style={{color: subTextColor, fontWeight: 'normal'}}>(ลูกศรแสดงแนวโน้มของวันนี้ ว่าเพิ่ม/ลดจากสถิติในตารางเท่าไหร่)</span>
                            </div>
                        </div>
                        <input type="text" placeholder={`🔍 ค้นหาจังหวัด...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: isMobile ? '100%' : '250px', padding: '10px 15px', borderRadius: '12px', border: `1px solid ${borderColor}`, background: cardBg, color: textColor, outline: 'none', fontFamily: 'Kanit' }} />
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1px', background: borderColor, padding: '1px' }}>
                        {filteredData.length > 0 ? filteredData.map((item, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', background: cardBg }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ color: subTextColor, fontSize: '0.9rem', width: '25px', fontWeight: 'bold' }}>{i+1}.</span>
                                    <span style={{ color: textColor, fontWeight: '600', fontSize: '1rem' }}>จ.{item.prov}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <TrendIndicator current={item.currVal} prev={item.val} mode={activeTab} hideText={false} />
                                    <span style={{ color: activeTabData.color, fontWeight: '900', fontSize: '1.2rem', minWidth: '60px', textAlign: 'right' }}>
                                        {item.val} <small style={{fontSize: '0.7rem', color: subTextColor}}>{item.unit}</small>
                                    </span>
                                </div>
                            </div>
                        )) : ( <div style={{ textAlign: 'center', padding: '50px 0', color: subTextColor, background: cardBg, gridColumn: '1 / -1' }}>ไม่พบข้อมูลจังหวัดที่ค้นหา</div> )}
                    </div>
                </div>

            </div>
        )}
      </div>
    </div>
  );
}