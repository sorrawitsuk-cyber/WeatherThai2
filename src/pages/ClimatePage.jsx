import React, { useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { WeatherContext } from '../context/WeatherContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';

// 🌟 Component ลูกศรบอกแนวโน้ม (บังคับสี: แดง=เพิ่ม/แย่ลง, เขียว=ลด/ดีขึ้น)
const TrendIndicator = ({ current, prev, hideText = false }) => {
    if (current == null || prev == null || current === '-' || prev === '-') return null;
    const diff = Math.round(current - prev);
    if (diff === 0) return <span title="ไม่มีการเปลี่ยนแปลง" style={{fontSize:'0.75em', opacity:0.6, color:'#94a3b8', marginLeft:'6px', whiteSpace:'nowrap'}}>➖</span>;
    
    const isWorse = diff > 0;
    const color = isWorse ? '#ef4444' : '#22c55e'; 
    const arrow = isWorse ? '▲' : '▼';

    return (
        <span title="แนวโน้มเปรียบเทียบกับเวลาเดียวกันของเมื่อวาน" style={{fontSize:'0.8em', color: color, opacity: 0.9, marginLeft: '6px', whiteSpace:'nowrap', fontWeight:'bold', cursor:'help'}}>
            {arrow} {Math.abs(diff)} {hideText ? '' : <span style={{fontSize:'0.7em', fontWeight:'normal'}}></span>}
        </span>
    );
};

// 🌟 Component แสดงทิศลม
const WindDirection = ({ deg }) => {
    if (deg == null) return null;
    const dirs = ['เหนือ','ตอ.เหนือ','ตะวันออก','ตอ.ใต้','ใต้','ตก.ใต้','ตะวันตก','ตก.เหนือ'];
    const arrows = ['↑','↗','→','↘','↓','↙','←','↖'];
    const idx = Math.round(deg / 45) % 8;
    return <span style={{fontSize:'0.7rem', opacity:0.7, marginLeft:'4px'}} title={`ทิศ${dirs[idx]}`}>{arrows[idx]}</span>;
};

export default function ClimatePage() {
  const { stations, stationTemps, loading, darkMode, stationYesterday = {}, stationMaxYesterday = {}, lastUpdated, gistdaSummary, amphoeData, tmdAvailable } = useContext(WeatherContext);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('heat'); 
  const [timeMode, setTimeMode] = useState('live'); 

  const [sortOrder, setSortOrder] = useState('alpha'); 
  const [isMapInteractive, setIsMapInteractive] = useState(false);

  const [userProv, setUserProv] = useState('');
  const [userAmphoe, setUserAmphoe] = useState('');
  const [userAmphoeData, setUserAmphoeData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isLocating, setIsLocating] = useState(true);
  const [showLocFilter, setShowLocFilter] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [geoData, setGeoData] = useState([]);
  useEffect(() => {
    fetch('/thai_geo.json')
      .then(res => res.json())
      .then(data => setGeoData(Array.isArray(data) ? data : (data.data || [])))
      .catch(e => console.log(e));
  }, []);

  const currentAmphoes = useMemo(() => {
    if (!userProv) return [];
    if (amphoeData?.provinces) {
      const cleanProv = userProv.replace('จังหวัด', '').trim();
      const provData = amphoeData.provinces[cleanProv] || amphoeData.provinces[`จังหวัด${cleanProv}`];
      if (provData?.amphoes && provData.amphoes.length > 0) {
        return provData.amphoes.map((a, i) => ({
          id: i,
          name: String(a.n || '').trim(),
          lat: a.lat,
          lon: a.lon,
          rawData: a
        })).filter(a => a.name !== '').sort((a, b) => a.name.localeCompare(b.name, 'th'));
      }
    }
    // Fallback
    if (!geoData || geoData.length === 0) return [];
    const cleanProv = userProv.replace('จังหวัด', '').trim();
    const pObj = geoData.find(p => {
      const pName = String(p.name_th || p.nameTh || p.name || '').replace('จังหวัด', '').trim();
      return pName === cleanProv || pName.includes(cleanProv);
    });

    if (pObj) {
      const distArray = pObj.amphure || pObj.amphures || pObj.district || pObj.districts || [];
      return [...distArray].map(a => ({
        id: a.id || Math.random(), 
        name: String(a.name_th || a.nameTh || a.name || '').trim(),
        rawData: null
      })).filter(a => a.name !== "").sort((a, b) => a.name.localeCompare(b.name, 'th'));
    }
    return [];
  }, [amphoeData, geoData, userProv]);

  const yesterdayDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  }, []);
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

  const fetchUserLocation = useCallback(() => {
      setIsLocating(true);
      const fallbackToDefault = () => {
          let closest = stations.find(st => st.areaTH && st.areaTH.includes('กรุงเทพ') && stationTemps && stationTemps[st.stationID]);
          if (!closest && stations.length > 0) closest = stations.find(st => stationTemps && stationTemps[st.stationID]);

          if (closest) {
              const prov = (closest.areaTH || closest.nameTH || 'กรุงเทพมหานคร').replace('จังหวัด', '');
              setUserProv(prov);
              const curr = stationTemps[closest.stationID] || {};
              const prev = stationYesterday[closest.stationID] || {};
              setUserData({
                  temp: Math.round(curr.temp || 0), prevTemp: prev.temp !== undefined ? prev.temp : null,
                  pm25: closest.AQILast?.PM25?.value || 0, prevPm25: prev.pm25 !== undefined ? prev.pm25 : null,
                  rain: curr.rainProb || 0, uv: curr.uv || 0, wind: Math.round(curr.windSpeed || 0),
                  windDir: curr.windDir || null
              });
          } else {
              setUserProv('กรุงเทพมหานคร');
              setUserData({ temp: '-', pm25: '-', rain: '-', uv: '-', wind: '-', windDir: null });
          }
          setIsLocating(false);
      };

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            let closest = null; let minDistance = Infinity;
            stations.forEach(st => {
              if(st.lat && st.lon) {
                  // Euclidean distance ใช้งานได้สำหรับประเทศไทย (lat ~5-20°)
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
                   temp: Math.round(curr.temp || 0), prevTemp: prev.temp !== undefined ? prev.temp : null,
                   pm25: closest.AQILast?.PM25?.value || 0, prevPm25: prev.pm25 !== undefined ? prev.pm25 : null,
                   rain: curr.rainProb || 0, uv: curr.uv || 0, wind: Math.round(curr.windSpeed || 0),
                   windDir: curr.windDir || null
                 });
              } else setUserData({ temp: '-', pm25: '-', rain: '-', uv: '-', wind: '-', windDir: null });
            } else fallbackToDefault();
            setIsLocating(false);
          }, 
          () => fallbackToDefault(), { timeout: 5000, maximumAge: 60000 } 
        );
      } else fallbackToDefault();
  }, [stations, stationTemps, stationYesterday]);

  useEffect(() => { if (stations && stations.length > 0) fetchUserLocation(); }, [stations, fetchUserLocation]);

  // 🔴 เกณฑ์เสี่ยงตรงมาตรฐาน: กรมอุตุนิยมวิทยา / กรมควบคุมมลพิษ / WHO
  const isRisky = useCallback((mode, val) => {
      if (val == null) return false;
      if(mode === 'heat') return val >= 39;     // กรมอุตุฯ "ร้อนจัด"
      if(mode === 'pm25') return val >= 37.5;   // กรมควบคุมมลพิษ "เริ่มมีผลต่อสุขภาพ"
      if(mode === 'uv') return val >= 8;        // WHO "Very High"
      if(mode === 'rain') return val >= 60;     // ฝนตกหนัก
      if(mode === 'wind') return val >= 50;     // กรมอุตุฯ "ลมแรง"
      if(mode === 'fire') return val > 0;       // มีจุดความร้อน
      if(mode === 'flood') return val > 0;      // มีพื้นที่น้ำท่วม
      return false;
  }, []);

  const { liveData, yesterdayData, riskyCounts } = useMemo(() => {
    let lData = { heat: [], pm25: [], uv: [], rain: [], wind: [], fire: [], flood: [] };
    let yData = { heat: [], pm25: [], uv: [], rain: [], wind: [], fire: [], flood: [] };
    let counts = { heat: {live: 0, yest: 0}, pm25: {live: 0, yest: 0}, uv: {live: 0, yest: 0}, rain: {live: 0, yest: 0}, wind: {live: 0, yest: 0}, fire: {live: 0, yest: 0}, flood: {live: 0, yest: 0} };
    
    if (stations?.length > 0 && stationTemps) {
        stations.forEach(st => {
          const data = stationTemps[st.stationID] || {};
          const yObj = stationYesterday[st.stationID] || {}; 
          const maxObj = stationMaxYesterday[st.stationID] || yObj; 
          const provName = (st.areaTH || st.nameTH || '').replace('จังหวัด', '');

          const currTemp = Math.round(data.temp || 0); 
          const prevTempSameHour = yObj.temp !== undefined ? yObj.temp : null;
          const maxTemp = maxObj.temp !== undefined ? maxObj.temp : currTemp;
          
          const currPM = st.AQILast?.PM25?.value || 0;
          const prevPMSameHour = yObj.pm25 !== undefined ? yObj.pm25 : null;
          const maxPM = maxObj.pm25 !== undefined ? maxObj.pm25 : currPM;

          const currUV = data.uv || 0;
          const prevUVSameHour = yObj.uv !== undefined ? yObj.uv : null;
          const maxUV = maxObj.uv !== undefined ? maxObj.uv : currUV;

          const currRain = data.rainProb || 0;
          const prevRainSameHour = yObj.rain !== undefined ? yObj.rain : null;
          const maxRain = maxObj.rain !== undefined ? maxObj.rain : currRain;

          const currWind = Math.round(data.windSpeed || 0);
          const prevWindSameHour = yObj.wind !== undefined ? yObj.wind : null;
          const maxWind = maxObj.wind !== undefined ? maxObj.wind : currWind;
          const windDir = data.windDir || null;

          if (isRisky('heat', currTemp)) counts.heat.live++;
          if (isRisky('heat', prevTempSameHour)) counts.heat.yest++;
          if (isRisky('pm25', currPM)) counts.pm25.live++;
          if (isRisky('pm25', prevPMSameHour)) counts.pm25.yest++;
          if (isRisky('uv', currUV)) counts.uv.live++;
          if (isRisky('uv', prevUVSameHour)) counts.uv.yest++;
          if (isRisky('rain', currRain)) counts.rain.live++;
          if (isRisky('rain', prevRainSameHour)) counts.rain.yest++;
          if (isRisky('wind', currWind)) counts.wind.live++;
          if (isRisky('wind', prevWindSameHour)) counts.wind.yest++;

          // โหมด Live: คัดเฉพาะที่เกินเกณฑ์มาตรฐาน
          if (currTemp >= 39) lData.heat.push({ prov: provName, val: currTemp, prevVal: prevTempSameHour, unit: '°C' });
          if (currPM >= 37.5) lData.pm25.push({ prov: provName, val: currPM, prevVal: prevPMSameHour, unit: 'µg/m³' });
          if (currUV >= 8) lData.uv.push({ prov: provName, val: currUV, prevVal: prevUVSameHour, unit: 'UVI' });
          if (currRain >= 60) lData.rain.push({ prov: provName, val: currRain, prevVal: prevRainSameHour, unit: '%' });
          if (currWind >= 50) lData.wind.push({ prov: provName, val: currWind, prevVal: prevWindSameHour, unit: 'km/h', windDir });

          // โหมด Yesterday: เก็บทุกจังหวัด
          yData.heat.push({ prov: provName, val: maxTemp, currVal: currTemp, unit: '°C' });
          yData.pm25.push({ prov: provName, val: maxPM, currVal: currPM, unit: 'µg/m³' });
          yData.uv.push({ prov: provName, val: maxUV, currVal: currUV, unit: 'UVI' });
          yData.rain.push({ prov: provName, val: maxRain, currVal: currRain, unit: '%' });
          yData.wind.push({ prov: provName, val: maxWind, currVal: currWind, unit: 'km/h' });
        });
    }

    // 🔥 ไฟป่า — ข้อมูลดาวเทียม GISTDA (Firebase) แทน Hardcode
    if (gistdaSummary?.hotspots?.length > 0) {
        lData.fire = gistdaSummary.hotspots
            .filter(p => p.value > 0)
            .map(p => ({ prov: p.province, val: p.value, prevVal: null, unit: 'จุด' }))
            .sort((a,b) => b.val - a.val);
        counts.fire.live = lData.fire.length;
        counts.fire.yest = counts.fire.live; // ข้อมูลดาวเทียม = daily snapshot
    }
    yData.fire = lData.fire.map(p => ({ ...p, currVal: p.val }));

    // 🌊 น้ำท่วม — ข้อมูลดาวเทียม GISTDA (Firebase)
    if (gistdaSummary?.floodArea?.length > 0) {
        lData.flood = gistdaSummary.floodArea
            .filter(p => p.value > 0)
            .map(p => ({ prov: p.province, val: p.value, prevVal: null, unit: 'ไร่' }))
            .sort((a,b) => b.val - a.val);
        counts.flood.live = lData.flood.length;
        counts.flood.yest = counts.flood.live;
    }
    yData.flood = lData.flood.map(p => ({ ...p, currVal: p.val }));

    Object.keys(lData).forEach(key => { if(key !== 'fire' && key !== 'flood') lData[key].sort((a, b) => b.val - a.val) });
    
    return { liveData: lData, yesterdayData: yData, riskyCounts: counts };
  }, [stations, stationTemps, stationYesterday, stationMaxYesterday, gistdaSummary, isRisky]);

  const appBg = 'var(--bg-app)'; 
  const cardBg = 'var(--bg-card)';
  const textColor = 'var(--text-main)'; 
  const borderColor = 'var(--border-color)';
  const subTextColor = 'var(--text-sub)'; 

  // 🎯 Dynamic Briefing — แทรกจำนวนจังหวัดจริง (ไม่ใช่ static string)
  const getModeBriefing = useCallback((mode) => {
      const count = riskyCounts[mode]?.live || 0;
      const briefings = {
          heat: { level: '🔴 เฝ้าระวังฮีทสโตรก', desc: count > 0 ? `พบ ${count} จังหวัดที่อุณหภูมิเกิน 39°C — ควรงดกิจกรรมกลางแจ้ง ดื่มน้ำให้เพียงพอ` : 'ยังไม่พบพื้นที่อุณหภูมิเกินเกณฑ์ในขณะนี้', bg: '#fef2f2', border: '#fecaca', color: '#ef4444' },
          pm25: { level: '🟠 คุณภาพอากาศ', desc: count > 0 ? `พบ ${count} จังหวัดที่ฝุ่น PM2.5 เกิน 37.5 µg/m³ — แนะนำสวมหน้ากากและเปิดเครื่องฟอกอากาศ` : 'คุณภาพอากาศอยู่ในเกณฑ์ปลอดภัยทุกพื้นที่', bg: '#fff7ed', border: '#fed7aa', color: '#f97316' },
          uv: { level: '🟣 รังสี UV รุนแรง', desc: count > 0 ? `พบ ${count} จังหวัดที่ UV Index ≥ 8 (สูงมาก) — เสี่ยงต่อผิวหนังไหม้แดด ควรกางร่มหรือทาครีมกันแดด` : 'ดัชนี UV อยู่ในเกณฑ์ปลอดภัยทุกพื้นที่', bg: '#faf5ff', border: '#e9d5ff', color: '#a855f7' },
          rain: { level: '🔵 ฝนตกหนัก', desc: count > 0 ? `พบ ${count} จังหวัดที่โอกาสฝนเกิน 60% — ระวังน้ำท่วมฉับพลัน ฟ้าผ่า และลมกระโชกแรง` : 'โอกาสฝนตกต่ำในทุกพื้นที่', bg: '#eff6ff', border: '#bfdbfe', color: '#3b82f6' },
          wind: { level: '🟡 ระวังลมแรง', desc: count > 0 ? `พบ ${count} จังหวัดที่ลมแรงเกิน 50 km/h — ระวังป้ายโฆษณา ต้นไม้ใหญ่ และสิ่งปลูกสร้าง` : 'ความเร็วลมอยู่ในเกณฑ์ปกติทุกพื้นที่', bg: '#fefce8', border: '#fef08a', color: '#eab308' },
          fire: { level: '🔴 จุดความร้อน (Hotspot)', desc: count > 0 ? `พบ ${count} จังหวัดที่มีจุดความร้อนจากดาวเทียม GISTDA — ห้ามจุดไฟในที่โล่งเด็ดขาด` : 'ไม่พบจุดความร้อนในขณะนี้', bg: '#fef2f2', border: '#fed7aa', color: '#ea580c' },
          flood: { level: '🔵 พื้นที่น้ำท่วม', desc: count > 0 ? `พบ ${count} จังหวัดที่มีพื้นที่น้ำท่วมจากดาวเทียม GISTDA` : 'ไม่พบพื้นที่น้ำท่วมในขณะนี้', bg: '#eff6ff', border: '#bfdbfe', color: '#0284c7' }
      };
      return briefings[mode] || briefings.heat;
  }, [riskyCounts]);

  const tabs = [
      { id: 'heat', label: 'ความร้อน', icon: '🥵', color: '#ef4444', data: timeMode === 'live' ? liveData.heat : yesterdayData.heat },
      { id: 'pm25', label: 'ฝุ่น PM2.5', icon: '😷', color: '#f97316', data: timeMode === 'live' ? liveData.pm25 : yesterdayData.pm25 },
      { id: 'uv', label: 'รังสี UV', icon: '☀️', color: '#a855f7', data: timeMode === 'live' ? liveData.uv : yesterdayData.uv },
      { id: 'rain', label: 'ฝน/พายุ', icon: '⛈️', color: '#3b82f6', data: timeMode === 'live' ? liveData.rain : yesterdayData.rain },
      { id: 'wind', label: 'ลมแรง', icon: '🌪️', color: '#eab308', data: timeMode === 'live' ? liveData.wind : yesterdayData.wind },
      { id: 'fire', label: 'ไฟป่า', icon: '🔥', color: '#ea580c', data: timeMode === 'live' ? liveData.fire : yesterdayData.fire },
      { id: 'flood', label: 'น้ำท่วม', icon: '🌊', color: '#0284c7', data: timeMode === 'live' ? liveData.flood : yesterdayData.flood }
  ];

  const activeTabData = tabs.find(t => t.id === activeTab);
  const activeBriefing = getModeBriefing(activeTab);

  const sortedFilteredData = useMemo(() => {
      let filtered = activeTabData.data.filter(item => item.prov.includes(searchTerm));
      if (timeMode === 'yesterday') {
          if (sortOrder === 'desc') filtered.sort((a, b) => b.val - a.val); 
          else filtered.sort((a, b) => a.prov.localeCompare(b.prov, 'th')); 
      }
      return filtered;
  }, [activeTabData.data, searchTerm, timeMode, sortOrder]);

  const getWindyOverlay = (tabId) => {
      if (tabId === 'rain' || tabId === 'flood') return 'rain';
      if (tabId === 'pm25') return 'pm2p5';
      if (tabId === 'uv') return 'uvindex';
      if (tabId === 'wind') return 'wind'; 
      return 'temp'; // heat, fire
  };

  const chartData = useMemo(() => {
    return [...yesterdayData[activeTab]]
        .filter(item => item.val != null)
        .sort((a,b) => b.val - a.val)
        .slice(0, 10)
        .map(item => ({ name: item.prov, 'เมื่อวาน': item.val, 'วันนี้': item.currVal }));
  }, [yesterdayData, activeTab]);

  const riskyDiff = riskyCounts[activeTab].live - riskyCounts[activeTab].yest;
  let trendSummaryColor = subTextColor;
  let trendTitle = '➖ คงที่';
  let trendDetail = `จำนวนพื้นที่เสี่ยงเท่ากับเมื่อวาน (${riskyCounts[activeTab].live} จังหวัด)`;
  
  if (riskyDiff > 0) {
      trendSummaryColor = '#ef4444'; 
      trendTitle = '▲ สถานการณ์แย่ลง';
      trendDetail = `วันนี้ ${riskyCounts[activeTab].live} จ. / เมื่อวาน ${riskyCounts[activeTab].yest} จ. (+${riskyDiff})`;
  } else if (riskyDiff < 0) {
      trendSummaryColor = '#22c55e'; 
      trendTitle = '▼ สถานการณ์ดีขึ้น';
      trendDetail = `วันนี้ ${riskyCounts[activeTab].live} จ. / เมื่อวาน ${riskyCounts[activeTab].yest} จ. (${riskyDiff})`;
  }

  let locSummary = { text: 'สถานการณ์ปกติ', color: '#22c55e', bg: 'var(--bg-success)', icon: '✅', desc: 'ไม่มีการแจ้งเตือนสภาพอากาศรุนแรงในพื้นที่ของคุณ' };
  if (userData && userData.temp !== '-') {
      let criticalThreats = []; let warningThreats = [];
      if (userData.temp >= 42) criticalThreats.push('ร้อนจัดอันตราย');
      if (userData.pm25 >= 75) criticalThreats.push('ฝุ่นอันตราย');
      if (userData.rain >= 80) criticalThreats.push('ฝนตกหนักมาก');
      if (userData.temp >= 39 && userData.temp < 42) warningThreats.push('อากาศร้อนจัด');
      if (userData.pm25 >= 37.5 && userData.pm25 < 75) warningThreats.push('ฝุ่นเริ่มหนา');
      if (userData.uv >= 8) warningThreats.push('UV สูงมาก');
      if (userData.wind >= 50) warningThreats.push('ลมแรง');
      
      if (criticalThreats.length > 0) locSummary = { text: 'อันตรายระดับวิกฤต', color: '#ef4444', bg: 'var(--bg-danger)', icon: '🚨', desc: `เฝ้าระวัง: ${criticalThreats.join(', ')}` };
      else if (warningThreats.length > 0) locSummary = { text: 'พื้นที่เฝ้าระวังพิเศษ', color: '#f97316', bg: 'var(--bg-warning)', icon: '⚠️', desc: `เฝ้าระวัง: ${warningThreats.join(', ')}` };
  }

  // 🚨 Nowcast Situation Report — สรุปภาพรวมสถานการณ์ทั่วประเทศ
  const nowcastAlerts = useMemo(() => {
      const alerts = [];
      if (riskyCounts.heat.live > 0) alerts.push({ icon: '🥵', text: `${riskyCounts.heat.live} จ. ร้อนจัด`, color: '#ef4444' });
      if (riskyCounts.pm25.live > 0) alerts.push({ icon: '😷', text: `${riskyCounts.pm25.live} จ. ฝุ่นเกิน`, color: '#f97316' });
      if (riskyCounts.uv.live > 0) alerts.push({ icon: '☀️', text: `${riskyCounts.uv.live} จ. UV สูง`, color: '#a855f7' });
      if (riskyCounts.rain.live > 0) alerts.push({ icon: '⛈️', text: `${riskyCounts.rain.live} จ. ฝนหนัก`, color: '#3b82f6' });
      if (riskyCounts.wind.live > 0) alerts.push({ icon: '🌪️', text: `${riskyCounts.wind.live} จ. ลมแรง`, color: '#eab308' });
      if (riskyCounts.fire.live > 0) alerts.push({ icon: '🔥', text: `${riskyCounts.fire.live} จ. ไฟป่า`, color: '#ea580c' });
      if (riskyCounts.flood.live > 0) alerts.push({ icon: '🌊', text: `${riskyCounts.flood.live} จ. น้ำท่วม`, color: '#0284c7' });
      return alerts;
  }, [riskyCounts]);

  const nowcastLevel = nowcastAlerts.length >= 3 ? 'วิกฤต' : nowcastAlerts.length > 0 ? 'เฝ้าระวัง' : 'ปกติ';
  const nowcastColor = nowcastAlerts.length >= 3 ? '#ef4444' : nowcastAlerts.length > 0 ? '#f59e0b' : '#22c55e';

  const lastUpdateText = lastUpdated ? new Date(lastUpdated).toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit' }) : null;

  // 🌟 Loading Spinner
  if (loading || stations.length === 0) return (
    <div className="loading-container" style={{ background: appBg, color: textColor }}>
        <div className="loading-spinner" style={{ borderTopColor: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.15)' }}></div>
        <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>กำลังเตรียมศูนย์ปฏิบัติการ...</div>
        <div style={{ fontSize: '0.85rem', color: subTextColor, marginTop: '5px' }}>วิเคราะห์พื้นที่เสี่ยงทั่วประเทศ</div>
    </div>
  );

  return (
    <div style={{ height: '100%', width: '100%', background: timeMode === 'yesterday' ? (darkMode ? '#000000' : '#f1f5f9') : appBg, display: 'flex', justifyContent: 'center', overflowY: 'auto', fontFamily: 'Kanit, sans-serif', transition: 'background 0.3s' }} className="custom-scrollbar">
      
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 1024px) {
            .custom-scrollbar::-webkit-scrollbar { display: none; }
            .custom-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        }
      `}} />

      <div style={{ width: '100%', maxWidth: '1400px', display: 'flex', flexDirection: 'column', gap: '20px', padding: isMobile ? '15px' : '30px', paddingBottom: '100px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '10px' }}>
            <div>
                <h1 style={{ margin: 0, color: textColor, fontSize: '1.8rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '10px' }}>🚨 ศูนย์ปฏิบัติการเฝ้าระวัง</h1>
                <p style={{ margin: '5px 0 0 0', color: subTextColor, fontSize: '0.9rem' }}>ระบบติดตามและวิเคราะห์ความเสี่ยงสภาพอากาศ</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
                <div style={{ background: 'var(--bg-secondary)', padding: '8px 16px', borderRadius: '50px', border: `1px solid ${borderColor}`, fontSize: '0.9rem', color: textColor, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', background: timeMode === 'live' ? '#22c55e' : '#8b5cf6', borderRadius: '50%', boxShadow: timeMode === 'live' ? '0 0 8px #22c55e' : '0 0 8px #8b5cf6', animation: timeMode === 'live' ? 'pulse 1.5s infinite' : 'none' }}></span>
                    {timeMode === 'live' ? `LIVE: ${currentTime.toLocaleTimeString('th-TH')}` : `DATA: ${yesterdayDateText}`}
                </div>
                {/* แสดงเวลาอัปเดตข้อมูลจาก Firebase */}
                {lastUpdateText && timeMode === 'live' && (
                    <div style={{ fontSize: '0.7rem', color: subTextColor, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        📡 ข้อมูล: {lastUpdateText} น.
                    </div>
                )}
                <div style={{ display: 'flex', background: cardBg, borderRadius: '50px', border: `1px solid ${borderColor}`, padding: '4px', marginTop: '2px' }}>
                    <button onClick={() => setTimeMode('live')} style={{ background: timeMode === 'live' ? '#22c55e' : 'transparent', color: timeMode === 'live' ? '#fff' : subTextColor, border: 'none', padding: '6px 15px', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}>🟢 วันนี้ (Live)</button>
                    <button onClick={() => setTimeMode('yesterday')} style={{ background: timeMode === 'yesterday' ? '#8b5cf6' : 'transparent', color: timeMode === 'yesterday' ? '#fff' : subTextColor, border: 'none', padding: '6px 15px', borderRadius: '50px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}>🟣 สถิติเมื่อวาน</button>
                </div>
            </div>
        </div>

        {/* 🚨 Nowcast Situation Report Banner */}
        {timeMode === 'live' && (
            <div className="fade-in" style={{ background: `${nowcastColor}12`, border: `1px solid ${nowcastColor}40`, borderRadius: '16px', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', background: nowcastColor, borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></span>
                    <span style={{ fontWeight: '900', color: nowcastColor, fontSize: '0.95rem', whiteSpace: 'nowrap' }}>NOWCAST: สถานการณ์{nowcastLevel}</span>
                </div>
                {nowcastAlerts.length > 0 ? (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {nowcastAlerts.map((a, i) => (
                            <span key={i} style={{ background: `${a.color}15`, color: a.color, padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                {a.icon} {a.text}
                            </span>
                        ))}
                    </div>
                ) : (
                    <span style={{ fontSize: '0.85rem', color: subTextColor }}>ไม่มีการแจ้งเตือนสภาพอากาศรุนแรงในขณะนี้</span>
                )}
            </div>
        )}

        {/* ส่วนบน: กล่องส่วนตัว + 7 Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', gap: '20px', alignItems: 'start' }}>
            <div style={{ background: locSummary.bg, border: `1px solid ${locSummary.color}50`, borderRadius: '24px', padding: '25px', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', transition: '0.3s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ fontSize: '1.3rem', fontWeight: '900', color: textColor }}>
                            {isLocating ? 'กำลังประมวลผล...' : (userProv === 'กรุงเทพมหานคร' ? userProv : `จ.${userProv}`)}
                            {userAmphoe && <span style={{ fontSize: '0.85rem', fontWeight: 'bold', opacity: 0.8 }}> • อ.{userAmphoe}</span>}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: subTextColor, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            📍 พื้นที่เฝ้าระวังของคุณ
                            {tmdAvailable && <span style={{ background: '#0ea5e915', color: '#0ea5e9', padding: '1px 6px', borderRadius: '6px', fontSize: '0.6rem', fontWeight: 'bold', border: '1px solid #0ea5e930' }}>📡 TMD</span>}
                        </div>
                    </div>
                    <button onClick={() => setShowLocFilter(!showLocFilter)} style={{ background: 'transparent', border: 'none', color: locSummary.color, cursor: 'pointer', fontSize: '1.2rem', transition: '0.2s' }} title="ระบุตำแหน่ง">🔍</button>
                </div>

                {showLocFilter && (
                    <div className="fade-in" style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 10, position: 'relative' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <select
                                value={userProv}
                                onChange={(e) => {
                                    const pName = e.target.value;
                                    if(!pName) return;
                                    setUserAmphoe(''); setUserAmphoeData(null);
                                    const closest = stations.find(st => st.areaTH === pName);
                                    if(closest) {
                                        const prov = closest.areaTH.replace('จังหวัด', '');
                                        setUserProv(prov);
                                        const curr = stationTemps[closest.stationID] || {};
                                        const prev = stationYesterday[closest.stationID] || {};
                                        setUserData({
                                            temp: Math.round(curr.temp || 0), prevTemp: prev.temp !== undefined ? prev.temp : null,
                                            pm25: closest.AQILast?.PM25?.value || 0, prevPm25: prev.pm25 !== undefined ? prev.pm25 : null,
                                            rain: curr.rainProb || 0, uv: curr.uv || 0, wind: Math.round(curr.windSpeed || 0),
                                            windDir: curr.windDir || null
                                        });
                                    }
                                }}
                                style={{ flex: 1, padding: '8px 12px', borderRadius: '12px', border: `1px solid ${borderColor}`, background: darkMode ? '#1e293b' : '#fff', color: textColor, fontFamily: 'Kanit', outline: 'none' }}
                            >
                                <option value="">-- เลือกจังหวัด --</option>
                                {[...stations].sort((a,b)=>a.areaTH.localeCompare(b.areaTH,'th')).map(st => (
                                    <option key={st.stationID} value={st.areaTH}>{st.areaTH}</option>
                                ))}
                            </select>
                            <button onClick={() => { setShowLocFilter(false); fetchUserLocation(); }} style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '12px', padding: '0 15px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem', flexShrink: 0 }} title="อัปเดตตำแหน่งของฉัน">📍</button>
                        </div>
                        {/* 🆕 Dropdown อำเภอ — ข้อมูลจาก TMD API หรือ Geo Fallback */}
                        {userProv ? (
                            <select
                                value={userAmphoe}
                                onChange={(e) => {
                                    const aName = e.target.value;
                                    setUserAmphoe(aName);
                                    if (aName) {
                                        const aData = currentAmphoes.find(a => a.name === aName);
                                        if (aData && aData.rawData) {
                                            setUserAmphoeData(aData.rawData);
                                        } else {
                                            setUserAmphoeData(null);
                                        }
                                    } else {
                                        setUserAmphoeData(null);
                                    }
                                }}
                                disabled={currentAmphoes.length === 0}
                                style={{ padding: '8px 12px', borderRadius: '12px', border: `1px solid ${borderColor}`, background: darkMode ? '#1e293b' : '#fff', color: textColor, fontFamily: 'Kanit', outline: 'none' }}
                            >
                                <option value="">-- เลือกอำเภอ {currentAmphoes.length > 0 ? `(${currentAmphoes.length} อำเภอ)` : ''} --</option>
                                {currentAmphoes.map((a, i) => (
                                    <option key={i} value={a.name}>{a.name}</option>
                                ))}
                            </select>
                        ) : null}
                    </div>
                )}

                {!isLocating && userData ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, marginTop: '20px', gap: '5px' }}>
                        <div style={{ fontSize: '3rem', animation: locSummary.icon === '🚨' ? 'pulse 1.5s infinite' : 'none' }}>{locSummary.icon}</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: '900', color: locSummary.color, textAlign: 'center', lineHeight: '1.2' }}>{locSummary.text}</div>
                        <div style={{ fontSize: '0.85rem', color: textColor, textAlign: 'center', opacity: 0.8, padding: '0 10px', marginBottom: '10px' }}>{locSummary.desc}</div>
                        
                        {/* 🆕 แสดงข้อมูลอำเภอจาก TMD ถ้ามี */}
                        {userAmphoeData && (
                            <div className="fade-in" style={{ width: '100%', background: 'var(--bg-overlay-heavy)', borderRadius: '14px', padding: '10px 14px', border: `1px solid #0ea5e930`, marginBottom: '8px' }}>
                                <div style={{ fontSize: '0.7rem', color: '#0ea5e9', fontWeight: 'bold', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    📡 ข้อมูลอำเภอ {userAmphoeData.n} • กรมอุตุนิยมวิทยา
                                </div>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {userAmphoeData.tc != null && <span style={{ background: 'var(--bg-secondary)', padding: '3px 8px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 'bold', color: userAmphoeData.tc >= 39 ? '#ef4444' : textColor }}>🌡️ {userAmphoeData.tc}°C</span>}
                                    {userAmphoeData.rh != null && <span style={{ background: 'var(--bg-secondary)', padding: '3px 8px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 'bold', color: textColor }}>💧 {userAmphoeData.rh}%</span>}
                                    {userAmphoeData.rain != null && <span style={{ background: 'var(--bg-secondary)', padding: '3px 8px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 'bold', color: userAmphoeData.rain > 0 ? '#3b82f6' : textColor }}>🌧️ {userAmphoeData.rain} mm</span>}
                                    {userAmphoeData.ws != null && <span style={{ background: 'var(--bg-secondary)', padding: '3px 8px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 'bold', color: textColor }}>💨 {userAmphoeData.ws} m/s</span>}
                                </div>
                            </div>
                        )}
                        
                        {/* แสดงข้อมูลครบ 5 ค่า + ทิศลม */}
                        <div style={{ display: 'flex', gap: '6px', width: '100%', flexWrap: 'wrap', justifyContent: 'center' }}>
                            <div style={{ background: 'var(--bg-overlay-heavy)', border: `1px solid ${borderColor}`, padding: '6px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 'bold', color: textColor, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                🌡️ <span style={{color: userData.temp >= 39 ? '#ef4444' : textColor}}>{userData.temp}°C</span>
                                {timeMode === 'live' && <TrendIndicator current={userData.temp} prev={userData.prevTemp} />}
                            </div>
                            <div style={{ background: 'var(--bg-overlay-heavy)', border: `1px solid ${borderColor}`, padding: '6px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 'bold', color: textColor, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                😷 <span style={{color: userData.pm25 >= 37.5 ? '#f97316' : textColor}}>{userData.pm25} µg/m³</span>
                                {timeMode === 'live' && <TrendIndicator current={userData.pm25} prev={userData.prevPm25} />}
                            </div>
                            <div style={{ background: 'var(--bg-overlay-heavy)', border: `1px solid ${borderColor}`, padding: '6px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 'bold', color: textColor, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                ☂️ <span style={{color: userData.rain >= 60 ? '#3b82f6' : textColor}}>{userData.rain}%</span>
                            </div>
                            <div style={{ background: 'var(--bg-overlay-heavy)', border: `1px solid ${borderColor}`, padding: '6px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 'bold', color: textColor, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                ☀️ <span style={{color: userData.uv >= 8 ? '#a855f7' : textColor}}>UV {userData.uv}</span>
                            </div>
                            <div style={{ background: 'var(--bg-overlay-heavy)', border: `1px solid ${borderColor}`, padding: '6px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 'bold', color: textColor, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                💨 <span style={{color: userData.wind >= 50 ? '#eab308' : textColor}}>{userData.wind} km/h</span>
                                {userData.windDir != null && <WindDirection deg={userData.windDir} />}
                            </div>
                        </div>
                    </div>
                ) : ( <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: subTextColor, marginTop: '20px' }}>กำลังประมวลผลข้อมูล...</div> )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(4, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? '8px' : '12px', flex: 1 }}>
                    {tabs.map((tab, idx) => {
                        const count = timeMode === 'live' ? riskyCounts[tab.id].live : riskyCounts[tab.id].yest;
                        return (
                            <div key={idx} onClick={() => setActiveTab(tab.id)} style={{ background: cardBg, padding: isMobile ? '10px 4px' : '12px 5px', borderRadius: '20px', border: `2px solid ${activeTab === tab.id ? tab.color : borderColor}`, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', boxShadow: activeTab === tab.id ? `0 10px 20px ${tab.color}15` : 'none', transform: activeTab === tab.id ? 'translateY(-3px)' : 'none' }}>
                                <span style={{ fontSize: isMobile ? '1.3rem' : '1.6rem' }}>{tab.icon}</span>
                                <span style={{ fontSize: isMobile ? '0.6rem' : '0.7rem', color: subTextColor, fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{tab.label}</span>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                                    <span style={{ fontSize: isMobile ? '1rem' : '1.2rem', fontWeight: '900', color: tab.color }}>{count}</span>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: tab.color }}>จ.</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>

        {/* ส่วนล่าง */}
        {timeMode === 'live' ? (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: '20px', marginTop: '20px' }}>
                <div style={{ background: cardBg, padding: '20px', borderRadius: '24px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h2 style={{ margin: '0 0 10px 0', color: textColor, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>{activeTabData.icon} แผนที่ Nowcast: {activeTabData.label}</h2>
                    </div>
                    <div style={{ flex: 1, minHeight: isMobile ? '350px' : '550px', borderRadius: '16px', overflow: 'hidden', background: '#000', position: 'relative' }}>
                        {isMobile && !isMapInteractive && (
                            <div onClick={() => setIsMapInteractive(true)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 10, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', backdropFilter: 'blur(2px)' }}>
                                <div style={{ background: '#0ea5e9', color: '#fff', padding: '10px 20px', borderRadius: '50px', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>👆 แตะเพื่อเลื่อนแผนที่</div>
                            </div>
                        )}
                        {isMobile && isMapInteractive && (
                            <button onClick={() => setIsMapInteractive(false)} style={{ position: 'absolute', top: '10px', right: '10px', background: '#ef4444', color: '#fff', padding: '5px 15px', borderRadius: '50px', border: 'none', zIndex: 10, fontWeight: 'bold', boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>🔒 ล็อคแผนที่</button>
                        )}
                        <iframe width="100%" height="100%" src={`https://embed.windy.com/embed2.html?lat=13.75&lon=100.5&zoom=5&level=surface&overlay=${getWindyOverlay(activeTab)}&product=ecmwf`} style={{ border: 'none', pointerEvents: (isMobile && !isMapInteractive) ? 'none' : 'auto' }}></iframe>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ background: darkMode ? `${activeBriefing.bg}15` : activeBriefing.bg, padding: '20px', borderRadius: '24px', border: `1px solid ${activeBriefing.border}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ color: activeBriefing.color, fontWeight: '900', fontSize: '1rem' }}>{activeBriefing.level}</div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: darkMode ? '#cbd5e1' : '#334155', lineHeight: '1.5' }}>{activeBriefing.desc}</p>
                    </div>

                    <div style={{ background: cardBg, borderRadius: '24px', border: `1px solid ${borderColor}`, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ padding: '15px 20px', borderBottom: `1px solid ${borderColor}`, background: 'var(--bg-tertiary)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <h3 style={{ margin: 0, color: textColor, fontSize: '1rem' }}>📋 แจ้งเตือนพื้นที่เสี่ยง</h3>
                                <span style={{ fontSize: '0.75rem', background: `${activeTabData.color}20`, color: activeTabData.color, padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold' }}>พบ {activeTabData.data.length} จังหวัด</span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#0ea5e9', fontWeight: 'bold', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span style={{ display: 'inline-block', width: '6px', height: '6px', background: '#0ea5e9', borderRadius: '50%' }}></span>
                                ข้อมูลสถานการณ์เรียลไทม์
                            </div>
                            <input type="text" placeholder={`พิมพ์ชื่อจังหวัดเพื่อค้นหา...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '12px', border: `1px solid ${borderColor}`, background: cardBg, color: textColor, outline: 'none', fontFamily: 'Kanit' }} />
                        </div>
                        <div style={{ padding: '5px 15px', overflowY: 'auto', maxHeight: isMobile ? '300px' : '450px' }} className="custom-scrollbar">
                            {sortedFilteredData.length > 0 ? sortedFilteredData.map((item, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 10px', borderBottom: `1px solid ${borderColor}` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ color: subTextColor, fontSize: '0.8rem', width: '20px' }}>{i+1}.</span>
                                        <span style={{ color: textColor, fontWeight: '600', fontSize: '0.9rem' }}>จ.{item.prov}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <TrendIndicator current={item.val} prev={item.prevVal} />
                                        <span style={{ color: activeTabData.color, fontWeight: '900', fontSize: '1rem', width: '80px', textAlign: 'right' }}>
                                            {typeof item.val === 'number' ? item.val.toLocaleString() : item.val} <small style={{fontSize: '0.6rem'}}>{item.unit}</small>
                                        </span>
                                        {activeTab === 'wind' && item.windDir != null && <WindDirection deg={item.windDir} />}
                                    </div>
                                </div>
                            )) : (
                                // Empty state ที่แตกต่างสำหรับข้อมูล GISTDA vs ข้อมูลสถานี
                                (activeTab === 'fire' || activeTab === 'flood') && !gistdaSummary ? (
                                    <div style={{ textAlign: 'center', padding: '50px 0', color: subTextColor }}>
                                        <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📡</div>
                                        กำลังดึงข้อมูลดาวเทียม GISTDA...
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '50px 0', color: subTextColor }}>✅ ไม่พบพื้นที่เสี่ยงในขณะนี้</div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            </div>
        ) : (
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
                                <Tooltip cursor={{fill: 'var(--bg-secondary)'}} contentStyle={{background: cardBg, borderRadius: '12px', border: `1px solid ${borderColor}`, color: textColor, fontFamily: 'Kanit'}} />
                                <Legend wrapperStyle={{fontFamily: 'Kanit', fontSize: '0.85rem'}} />
                                <Bar dataKey="เมื่อวาน" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={30} />
                                <Bar dataKey="วันนี้" fill={activeTabData.color} radius={[4, 4, 0, 0]} maxBarSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ marginTop: '15px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '12px', textAlign: 'center', border: `1px dashed ${trendSummaryColor}50` }}>
                        <div style={{ fontWeight: '900', fontSize: '0.95rem', color: trendSummaryColor }}>{trendTitle}</div>
                        <div style={{ fontSize: '0.8rem', color: subTextColor, marginTop: '2px' }}>{trendDetail}</div>
                    </div>
                </div>

                <div style={{ background: cardBg, borderRadius: '24px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: '20px 25px', borderBottom: `1px solid ${borderColor}`, background: 'var(--bg-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                            <h3 style={{ margin: '0 0 5px 0', color: textColor, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                📋 สรุปสถิติสูงสุด 77 จังหวัด
                            </h3>
                            <div style={{ fontSize: '0.75rem', color: '#8b5cf6', fontWeight: 'bold', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span style={{ display: 'inline-block', width: '6px', height: '6px', background: '#8b5cf6', borderRadius: '50%' }}></span>
                                บันทึกสถิติสูงสุดตลอดวันของเมื่อวาน
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', width: isMobile ? '100%' : 'auto' }}>
                            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={{ padding: '10px 15px', borderRadius: '12px', border: `1px solid ${borderColor}`, background: cardBg, color: textColor, outline: 'none', fontFamily: 'Kanit', cursor: 'pointer' }}>
                                <option value="alpha">🔤 เรียงตามชื่อ (ก-ฮ)</option>
                                <option value="desc">🔥 เรียงตามความรุนแรง</option>
                            </select>
                            <input type="text" placeholder={`พิมพ์ชื่อจังหวัด...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ flex: 1, padding: '10px 15px', borderRadius: '12px', border: `1px solid ${borderColor}`, background: cardBg, color: textColor, outline: 'none', fontFamily: 'Kanit' }} />
                        </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1px', background: borderColor, padding: '1px', paddingBottom: '20px' }}>
                        {sortedFilteredData.length > 0 ? sortedFilteredData.map((item, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', background: cardBg }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ color: subTextColor, fontSize: '0.9rem', width: '25px', fontWeight: 'bold' }}>{i+1}.</span>
                                    <span style={{ color: textColor, fontWeight: '600', fontSize: '1rem' }}>จ.{item.prov}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ color: activeTabData.color, fontWeight: '900', fontSize: '1.2rem', minWidth: '60px', textAlign: 'right' }}>
                                        {item.val != null ? item.val.toLocaleString() : '-'} <small style={{fontSize: '0.7rem', color: subTextColor}}>{item.unit}</small>
                                    </span>
                                </div>
                            </div>
                        )) : ( 
                            <div style={{ textAlign: 'center', padding: '50px 0', color: subTextColor, background: cardBg, gridColumn: '1 / -1' }}>
                                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🔍</div>
                                ไม่พบข้อมูล กรุณาตรวจสอบการสะกดชื่อจังหวัดอีกครั้ง
                            </div> 
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* Source Attribution Footer */}
        <div style={{ textAlign: 'center', padding: '15px 0', borderTop: `1px solid ${borderColor}`, opacity: 0.7, marginTop: '10px' }}>
            <div style={{ fontSize: '0.75rem', color: subTextColor }}>ข้อมูลจาก: กรมอุตุนิยมวิทยา • กรมควบคุมมลพิษ • GISTDA</div>
            {lastUpdated && <div style={{ fontSize: '0.7rem', color: subTextColor, marginTop: '3px' }}>อัปเดตระบบล่าสุด: {new Date(lastUpdated).toLocaleString('th-TH')}</div>}
        </div>

      </div>
    </div>
  );
}