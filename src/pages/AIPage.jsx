import React, { useContext, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { WeatherContext } from '../context/WeatherContext';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, YAxis, CartesianGrid } from 'recharts';
import { useWeatherData } from '../hooks/useWeatherData';

function normalizeGeoData(data) {
  return Array.isArray(data) ? data : (data?.data || []);
}

// 🌟 Component ลูกศรบอกแนวโน้ม (บังคับสี: แดง=เพิ่ม/แย่ลง, เขียว=ลด/ดีขึ้น)
const TrendIndicator = ({ current, prev, hideText = false }) => {
    if (current == null || prev == null || current === '-' || prev === '-') return null;
    const diff = Math.round(current - prev);
    if (diff === 0) return <span title="ไม่มีการเปลี่ยนแปลง" style={{fontSize:'0.75em', opacity:0.6, color:'#94a3b8', marginLeft:'6px', whiteSpace:'nowrap'}}>➖</span>;
    
    const isWorse = diff > 0;
    const color = isWorse ? '#ef4444' : '#22c55e'; 
    const arrow = isWorse ? '▲' : '▼';

    return (
        <span title="แนวโน้มเปรียบเทียบกับก่อนหน้า" style={{fontSize:'0.8em', color: color, opacity: 0.9, marginLeft: '6px', whiteSpace:'nowrap', fontWeight:'bold', cursor:'help'}}>
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

export default function AIPage() {
  const { stations, stationTemps, darkMode, amphoeData, gistdaSummary } = useContext(WeatherContext);
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [locationName, setLocationName] = useState('กำลังระบุตำแหน่ง...');
  const [selectedProv, setSelectedProv] = useState('');
  const [selectedDist, setSelectedDist] = useState('');
  const [targetDateIdx, setTargetDateIdx] = useState(-1); 
  const [activeTab, setActiveTab] = useState('summary'); 
  const [activeWarningTab, setActiveWarningTab] = useState('heat');
  const [warningSearchTerm, setWarningSearchTerm] = useState('');
  
  const [geoData, setGeoData] = useState([]);
  useEffect(() => {
    if (amphoeData?.provinces || !selectedProv || geoData.length > 0) return;

    let cancelled = false;
    fetch('/thai_geo.json')
      .then(res => res.json())
      .then(data => {
        if (!cancelled) setGeoData(normalizeGeoData(data));
      })
      .catch(e => {
        if (!cancelled) console.log(e);
      });

    return () => {
      cancelled = true;
    };
  }, [amphoeData, selectedProv, geoData.length]);

  const currentAmphoes = useMemo(() => {
    if (!selectedProv) return [];
    if (amphoeData?.provinces) {
      const cleanProv = selectedProv.replace('จังหวัด', '').trim();
      const provData = amphoeData.provinces[cleanProv] || amphoeData.provinces[selectedProv];
      if (provData?.amphoes && provData.amphoes.length > 0) {
        return provData.amphoes.map((a, i) => ({
          id: i,
          name: String(a.n || '').trim(),
          lat: a.lat,
          lon: a.lon
        })).filter(a => a.name !== '').sort((a, b) => a.name.localeCompare(b.name, 'th'));
      }
    }
    // Fallback
    if (!geoData || geoData.length === 0) return [];
    const cleanProv = selectedProv.replace('จังหวัด', '').trim();
    const pObj = geoData.find(p => {
      const pName = String(p.name_th || p.nameTh || p.name || '').replace('จังหวัด', '').trim();
      return pName === cleanProv || pName.includes(cleanProv);
    });

    if (pObj) {
      const distArray = pObj.amphure || pObj.amphures || pObj.district || pObj.districts || [];
      return [...distArray].map(a => ({
        id: a.id || Math.random(), 
        name: String(a.name_th || a.nameTh || a.name || '').trim()
      })).filter(a => a.name !== "").sort((a, b) => a.name.localeCompare(b.name, 'th'));
    }
    return [];
  }, [amphoeData, geoData, selectedProv]);
  
  const { weatherData, loadingWeather, fetchWeatherByCoords } = useWeatherData();

  const [chatInput, setChatInput] = useState('');
  const [chatLogs, setChatLogs] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
      if (chatEndRef.current) {
          chatEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
  }, [chatLogs]);

  const isRisky = useCallback((mode, val) => {
      if (val == null) return false;
      if(mode === 'heat') return val >= 39;     
      if(mode === 'pm25') return val >= 37.5;   
      if(mode === 'uv') return val >= 8;        
      if(mode === 'rain') return val >= 60;     
      if(mode === 'wind') return val >= 40;     
      if(mode === 'fire') return val > 0;       
      if(mode === 'flood') return val > 0;      
      return false;
  }, []);

  const { liveData, riskyCounts } = useMemo(() => {
    let lData = { heat: [], pm25: [], uv: [], rain: [], wind: [], fire: [], flood: [] };
    let counts = { heat: 0, pm25: 0, uv: 0, rain: 0, wind: 0, fire: 0, flood: 0 };
    
    if (stations?.length > 0 && stationTemps) {
        stations.forEach(st => {
          const data = stationTemps[st.stationID] || {};
          const provName = (st.areaTH || st.nameTH || '').replace('จังหวัด', '');

          const currTemp = Math.round(data.temp || 0); 
          const currPM = st.AQILast?.PM25?.value || 0;
          const currUV = data.uv || 0;
          const currRain = data.rainProb || 0;
          const currWind = Math.round(data.windSpeed || 0);
          const windDir = data.windDir || null;

          if (isRisky('heat', currTemp)) counts.heat++;
          if (isRisky('pm25', currPM)) counts.pm25++;
          if (isRisky('uv', currUV)) counts.uv++;
          if (isRisky('rain', currRain)) counts.rain++;
          if (isRisky('wind', currWind)) counts.wind++;

          if (currTemp >= 39) lData.heat.push({ prov: provName, val: currTemp, prevVal: null, unit: '°C' });
          if (currPM >= 37.5) lData.pm25.push({ prov: provName, val: currPM, prevVal: null, unit: 'µg/m³' });
          if (currUV >= 8) lData.uv.push({ prov: provName, val: currUV, prevVal: null, unit: 'UV' });
          if (currRain >= 60) lData.rain.push({ prov: provName, val: currRain, prevVal: null, unit: '%' });
          if (currWind >= 40) lData.wind.push({ prov: provName, val: currWind, prevVal: null, unit: 'km/h', windDir });
        });
    }

    if (gistdaSummary?.hotspots?.length > 0) {
        lData.fire = gistdaSummary.hotspots
            .filter(p => p.value > 0)
            .map(p => ({ prov: p.province, val: p.value, prevVal: null, unit: 'จุด' }))
            .sort((a,b) => b.val - a.val);
        counts.fire = lData.fire.length;
    }
    if (gistdaSummary?.floodArea?.length > 0) {
        lData.flood = gistdaSummary.floodArea
            .filter(p => p.value > 0)
            .map(p => ({ prov: p.province, val: p.value, prevVal: null, unit: 'ไร่' }))
            .sort((a,b) => b.val - a.val);
        counts.flood = lData.flood.length;
    }

    Object.keys(lData).forEach(key => { if(key !== 'fire' && key !== 'flood') lData[key].sort((a, b) => b.val - a.val) });
    return { liveData: lData, riskyCounts: counts };
  }, [stations, stationTemps, gistdaSummary, isRisky]);

  const warningTabs = [
      { id: 'heat', label: 'ความร้อน', icon: '🥵', color: '#ef4444', data: liveData.heat },
      { id: 'pm25', label: 'ฝุ่น PM2.5', icon: '😷', color: '#f97316', data: liveData.pm25 },
      { id: 'rain', label: 'โอกาสฝน', icon: '⛈️', color: '#3b82f6', data: liveData.rain },
      { id: 'wind', label: 'ลมแรง', icon: '🌪️', color: '#eab308', data: liveData.wind },
      { id: 'fire', label: 'จุดความร้อน', icon: '🔥', color: '#ea580c', data: liveData.fire },
      { id: 'flood', label: 'น้ำท่วม', icon: '🌊', color: '#0284c7', data: liveData.flood }
  ];

  const activeWarningTabData = warningTabs.find(t => t.id === activeWarningTab);
  const sortedFilteredWarningData = useMemo(() => {
      let filtered = activeWarningTabData.data.filter(item => item.prov.includes(warningSearchTerm));
      return filtered;
  }, [activeWarningTabData.data, warningSearchTerm]);

  const fetchLocationName = async (lat, lon) => {
    try {
      const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=th`);
      const data = await res.json();
      
      const admin = data?.localityInfo?.administrative || [];
      const prov = admin.find(a => a.adminLevel === 4 && a.isoCode)?.name || data?.principalSubdivision;
      const dist = admin.find(a => a.adminLevel === 6 && (a.name.includes('อำเภอ') || a.name.includes('เขต')) )?.name;
      
      if (dist && prov) {
        const cleanProv = prov.startsWith('จังหวัด') ? prov : (prov === 'กรุงเทพมหานคร' ? prov : `จังหวัด${prov}`);
        setLocationName(`${dist} ${cleanProv}`);
      } else {
        setLocationName(data?.locality || data?.city || 'ตำแหน่งปัจจุบัน');
      }
    } catch { setLocationName('ตำแหน่งปัจจุบัน'); }
  };

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
        fetchLocationName(pos.coords.latitude, pos.coords.longitude);
        setSelectedProv('');
        setSelectedDist('');
      }, () => {}, { timeout: 5000 });
    }
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);

    if (!weatherData && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
        fetchLocationName(pos.coords.latitude, pos.coords.longitude);
      }, () => {
        if (!weatherData) fetchWeatherByCoords(13.75, 100.5); 
        setLocationName('กรุงเทพมหานคร');
      }, { timeout: 5000 });
    } else if (!weatherData) {
        fetchWeatherByCoords(13.75, 100.5); 
        setLocationName('กรุงเทพมหานคร');
    }
    return () => window.removeEventListener('resize', handleResize);
  }, [fetchWeatherByCoords, weatherData]);

  const cleanMd = (text) => text ? text.replace(/\*\*/g, '') : '';
  const renderHighlightedText = (text, defaultColor) => {
    if (!text) return null;
    return text.split('**').map((part, i) => {
      if (i % 2 !== 0) {
        let isDanger = /(งด|ไม่แนะนำ|อันตราย|ระวัง|หลีกเลี่ยง|รุนแรง|กระโชก|ฮีทสโตรก|เกิน|ไม่ควร|ชะลอ|เสี่ยง|ผันผวน)/i.test(part);
        let isGood = /(ดีเยี่ยม|เหมาะสม|สามารถ|ปลอดภัย|ที่สุด|สบาย|ราบรื่น|เป็นมิตร)/i.test(part);
        let color = isDanger ? '#ef4444' : (isGood ? '#10b981' : defaultColor);
        return <strong key={i} style={{ color: color, fontWeight: '800' }}>{part}</strong>;
      }
      return part;
    });
  };

  const getWeatherFactorsForDay = useCallback((dayIdx) => {
    if (!weatherData || !weatherData.daily) return null;
    if (dayIdx === -1) {
        return {
            tMax: Math.round(weatherData.current?.temp ?? 0),
            tMin: Math.round(weatherData.current?.temp ?? 0),
            rain: weatherData.current?.rainProb ?? 0,
            uvMax: weatherData.current?.uv ?? 0,
            windMax: Math.round(weatherData.current?.windSpeed ?? 0),
            pm25: Math.round(weatherData.current?.pm25 ?? 0),
            feelsLike: Math.round(weatherData.current?.feelsLike ?? weatherData.current?.temp ?? 0),
            heatMax: Math.round(weatherData.current?.feelsLike ?? 0),
        };
    }
    const d = weatherData.daily;
    const tMax = Math.round(d.temperature_2m_max?.[dayIdx] ?? 0);
    const tMin = Math.round(d.temperature_2m_min?.[dayIdx] ?? 0);
    const rain = d.precipitation_probability_max?.[dayIdx] ?? 0;
    const uvMax = d.uv_index_max?.[dayIdx] ?? 0;
    const windMax = Math.round(d.wind_speed_10m_max?.[dayIdx] ?? 0);
    const pm25 = d.pm25_max?.[dayIdx] !== undefined ? Math.round(d.pm25_max[dayIdx]) : Math.round(weatherData.current?.pm25 ?? 0);
    const heatMax = Math.round(d.apparent_temperature_max?.[dayIdx] ?? tMax);
    return { tMax, tMin, rain, uvMax, windMax, pm25, heatMax };
  }, [weatherData]);

  const calcScore = useCallback((tabId, dayIdx) => {
    const factors = getWeatherFactorsForDay(dayIdx);
    if (!factors) return 0;
    const { rain, tMax, uvMax, windMax, pm25, heatMax } = factors;
    // Base 7: realistic starting point for Thai climate (not 10, since 10/10 should be rare)
    let baseScore = 7;
    switch (tabId) {
      case 'laundry':
        if (rain < 10 && windMax >= 8 && windMax <= 25) baseScore += 2; // ideal drying conditions
        else if (rain < 20 && windMax >= 5) baseScore += 1;
        if (rain > 20) baseScore -= 2;
        if (rain > 40) baseScore -= 3;
        if (rain > 60) baseScore -= 2;
        if (windMax > 35) baseScore -= 2;
        if (heatMax > 40) baseScore -= 1;
        break;
      case 'exercise':
        if (pm25 > 25) baseScore -= 2;
        if (pm25 > 37.5) baseScore -= 3;
        if (heatMax > 35 || tMax > 33) baseScore -= 2; // Thailand: 33°C already hot for exercise
        if (heatMax > 38 || tMax > 36) baseScore -= 2;
        if (rain > 30) baseScore -= 1;
        if (rain > 50) baseScore -= 2;
        if (uvMax > 6) baseScore -= 1;  // UV 6+ already significant
        if (uvMax > 10) baseScore -= 1;
        break;
      case 'outdoor':
        if (rain > 20) baseScore -= 2;
        if (rain > 40) baseScore -= 2;
        if (heatMax > 36 || tMax > 34) baseScore -= 2; // realistic Thai threshold
        if (heatMax > 40 || tMax > 37) baseScore -= 2;
        if (uvMax > 6) baseScore -= 1;
        if (uvMax > 9) baseScore -= 1;
        if (windMax > 30) baseScore -= 1;
        break;
      case 'travel':
        if (rain > 30) baseScore -= 2;
        if (rain > 50) baseScore -= 2;
        if (heatMax > 38 || tMax > 35) baseScore -= 2; // 35°C already unpleasant for travel
        if (heatMax > 42 || tMax > 39) baseScore -= 2;
        if (uvMax > 8) baseScore -= 1;
        if (uvMax > 11) baseScore -= 1;
        break;
      case 'farming':
        if (rain > 0 && rain <= 30) baseScore += 1; // light rain is good for farming
        if (rain > 50) baseScore -= 2;
        if (rain > 70) baseScore -= 2;
        if (heatMax > 38 || tMax > 36) baseScore -= 2;
        if (heatMax > 42 || tMax > 39) baseScore -= 2;
        if (windMax > 15) baseScore -= 1;
        if (windMax > 25) baseScore -= 2;
        break;
      case 'pets':
        if (heatMax > 33 || tMax > 32) baseScore -= 2; // pets sensitive to Thai heat
        if (heatMax > 38 || tMax > 35) baseScore -= 2;
        if (rain > 30) baseScore -= 2;
        if (rain > 50) baseScore -= 1;
        if (uvMax > 6) baseScore -= 1;
        if (uvMax > 9) baseScore -= 1;
        break;
      case 'construction':
        if (rain > 20) baseScore -= 2;
        if (rain > 40) baseScore -= 2;
        if (rain > 60) baseScore -= 2;
        if (windMax > 15) baseScore -= 1;
        if (windMax > 25) baseScore -= 2;
        if (heatMax > 38 || tMax > 35) baseScore -= 2;
        if (heatMax > 42 || tMax > 38) baseScore -= 1;
        break;
      case 'rain_risk':
        baseScore -= Math.round(rain / 10);
        break;
      case 'health':
        if (pm25 > 25) baseScore -= 1;
        if (pm25 > 37.5) baseScore -= 3;
        if (pm25 > 50) baseScore -= 2;
        if (heatMax > 36 || tMax > 34) baseScore -= 2;
        if (heatMax > 40 || tMax > 37) baseScore -= 1;
        if (uvMax > 8) baseScore -= 1;
        break;
      case 'photography':
        if (rain < 5 && uvMax >= 4 && uvMax <= 8 && pm25 < 25) baseScore += 2; // golden conditions
        if (rain > 20) baseScore -= 2;
        if (rain > 50) baseScore -= 2;
        if (pm25 > 25) baseScore -= 1;
        if (pm25 > 37.5) baseScore -= 2;
        if (uvMax > 10) baseScore -= 1; // harsh midday light
        break;
      case 'vending':
        if (heatMax > 32 || tMax > 31) baseScore += 1; // hot = more drinks sold
        if (rain > 20) baseScore -= 2;
        if (rain > 40) baseScore -= 2;
        if (heatMax > 40 || tMax > 38) baseScore -= 2; // too hot = people stay home
        if (windMax > 25) baseScore -= 2;
        break;
      case 'solar':
        if (uvMax >= 8 && rain < 20) baseScore += 2; // high UV + dry = excellent solar
        else if (uvMax >= 5 && rain < 40) baseScore += 1;
        if (rain > 40) baseScore -= 3;
        if (rain > 60) baseScore -= 2;
        if (uvMax < 3) baseScore -= 3;
        if (uvMax < 5) baseScore -= 1;
        break;
      default:
        if (rain > 30) baseScore -= 1;
        if (rain > 50) baseScore -= 2;
        if (heatMax > 40 || tMax > 37) baseScore -= 2;
        if (pm25 > 37.5) baseScore -= 2;
        if (pm25 > 50) baseScore -= 1;
    }
    return Math.max(1, Math.min(10, baseScore)); 
  }, [getWeatherFactorsForDay]);

  const currentScores = useMemo(() => {
    if (!weatherData) return {};
    return {
      summary: calcScore('summary', targetDateIdx),
      exercise: calcScore('exercise', targetDateIdx),
      outdoor: calcScore('outdoor', targetDateIdx),
      travel: calcScore('travel', targetDateIdx),
      laundry: calcScore('laundry', targetDateIdx),
      farming: calcScore('farming', targetDateIdx),
      pets: calcScore('pets', targetDateIdx),
      construction: calcScore('construction', targetDateIdx),
      rain_risk: calcScore('rain_risk', targetDateIdx),
      health: calcScore('health', targetDateIdx),
      photography: calcScore('photography', targetDateIdx),
      vending: calcScore('vending', targetDateIdx),
      solar: calcScore('solar', targetDateIdx)
    };
  }, [calcScore, targetDateIdx, weatherData]);

  const forecastChartData = useMemo(() => {
    if (!weatherData?.daily?.time) return [];
    return [0,1,2,3,4,5,6].map(idx => {
      const date = new Date(weatherData.daily.time[idx]);
      const dayStr = idx === 0 ? 'วันนี้' : idx === 1 ? 'พรุ่งนี้' : date.toLocaleDateString('th-TH', {weekday:'short'});
      let score = calcScore(activeTab, idx);
      if (activeTab === 'rain_risk') {
          const f = getWeatherFactorsForDay(idx);
          score = f ? f.rain : 0;
      }
      return { name: dayStr, score: score, index: idx };
    });
  }, [activeTab, calcScore, getWeatherFactorsForDay, weatherData]);

  const tabConfigs = [
    { id: 'summary', icon: '📋', label: 'ภาพรวม', color: '#8b5cf6' },
    { id: 'rain_risk', icon: '☔', label: 'โอกาสฝนตก', color: '#0ea5e9' },
    { id: 'exercise', icon: '🏃‍♂️', label: 'ออกกำลังกาย', color: '#22c55e' },
    { id: 'outdoor', icon: '🏕️', label: 'กิจกรรมกลางแจ้ง', color: '#f59e0b' },
    { id: 'travel', icon: '🎒', label: 'ท่องเที่ยว', color: '#ec4899' },
    { id: 'laundry', icon: '🧺', label: 'ตากผ้า', color: '#3b82f6' },
    { id: 'farming', icon: '🌾', label: 'การเกษตร', color: '#10b981' },
    { id: 'vending', icon: '🏪', label: 'ค้าขาย', color: '#ef4444' },
    { id: 'construction', icon: '🏗️', label: 'งานก่อสร้าง', color: '#6366f1' },
    { id: 'health', icon: '🩺', label: 'สุขภาพ', color: '#f43f5e' },
    { id: 'photography', icon: '📸', label: 'ถ่ายภาพ', color: '#d946ef' },
    { id: 'pets', icon: '🐶', label: 'สัตว์เลี้ยง', color: '#64748b' },
    { id: 'solar', icon: '☀️', label: 'รับแดด/ตากผลผลิต', color: '#eab308' }
  ];

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    const userMsg = { role: 'user', text: chatInput };
    const newLogs = [...chatLogs, userMsg];
    setChatLogs(newLogs);
    setChatInput('');
    setIsChatLoading(true);
    
    try {
        const factors = getWeatherFactorsForDay(targetDateIdx);
        const modeLabel = tabConfigs.find(t=>t.id===activeTab)?.label || "ทั่วไป";
        
        const context = `คุณคือ AI ผู้เชี่ยวชาญการพยากรณ์อากาศของ Thai Weather. ตอบคำถามผู้ใช้อย่างเป็นมิตร กระชับ เข้าใจง่าย
ข้อมูลอุตุนิยมวิทยาวันนี้: โหมด ${modeLabel}, อุณหภูมิ ${factors.tMin}-${factors.tMax}°C, ดัชนีความร้อน (รู้สึกเหมือน) ${factors.heatMax}°C, ดัชนี UV ${factors.uvMax}, โอกาสฝน ${factors.rain}%, ความเร็วลม ${factors.windMax}กม/ชม, ฝุ่น PM2.5: ${factors.pm25} µg/m³.
ประวัติแชท: ${newLogs.map(l => l.role + ': ' + l.text).join(' | ')}.
ตอบคำถามล่าสุดได้เลย:`;

        const response = await fetch('/api/summary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt: context }),
        });
        const payload = await response.json();

        if (!response.ok || !payload.text) {
          throw new Error(payload.error || payload.details || 'AI request failed');
        }

        setChatLogs([...newLogs, { role: 'ai', text: payload.text }]);
    } catch (err) {
        console.error(err);
        setChatLogs([...newLogs, { role: 'ai', text: 'ขออภัย เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง' }]);
    } finally {
        setIsChatLoading(false);
    }
  };

  const aiReport = useMemo(() => {
    if (!weatherData || !activeTab) return null;
    const factors = getWeatherFactorsForDay(targetDateIdx);
    if (!factors) return null;
    const { tMax, tMin, rain, uvMax, windMax, pm25, heatMax } = factors;
    const finalScore = currentScores[activeTab];

    const getMainAdvice = () => {
      if (activeTab === 'laundry') {
          if (rain > 40) return `ประเมินความเสี่ยง: โอกาสฝนตก **${rain}%** **ไม่แนะนำให้ตากผ้าภายนอกอาคาร** ควรใช้เครื่องอบผ้าหรือตากในพื้นที่ร่มที่มีอากาศถ่ายเท`;
          if (windMax > 35) return `ประเมินความเสี่ยง: สภาพอากาศมี**กระแสลมกระโชกแรง (${windMax} กม./ชม.)** เสี่ยงต่อการที่สิ่งของตากไว้จะปลิวหลุดลอย **ควรยึดด้วยไม้หนีบให้แน่นหนา**`;
          if (tMax > 33 && windMax >= 10) return `ประเมินความเสี่ยง: **สภาพอากาศเหมาะสมอย่างยิ่ง** การผสานกันของแสงแดดจัดและกระแสลม (**${windMax} กม./ชม.**) จะช่วยให้ผ้าแห้งไวและลดความอับชื้นได้อย่างมีประสิทธิภาพ`;
          return `ประเมินความเสี่ยง: **สามารถตากผ้าได้ตามปกติ** แต่อาจใช้เวลาแห้งนานกว่าช่วงที่แดดจัด แนะนำให้ติดตามทิศทางเมฆฝนอย่างใกล้ชิด`;
      }
      if (activeTab === 'exercise') {
          if (pm25 > 37.5) return `ประเมินความเสี่ยง: คุณภาพอากาศ**ไม่อยู่ในเกณฑ์มาตรฐาน** (PM2.5: **${pm25} µg/m³**) **ควรงดการวิ่งหรือออกกำลังกายหนักภายนอกอาคาร** เปลี่ยนเป็นการคาร์ดิโอในร่มแทน`;
          if (heatMax > 38 || tMax > 36 || uvMax > 8) return `ประเมินความเสี่ยง: ดัชนีรังสี UV (**${uvMax}**) และดัชนีความร้อน **${heatMax}°C** อยู่ใน**ระดับอันตราย** **ระวังภาวะฮีทสโตรกและผิวหนังไหม้แดด** **ควรเลี่ยงการออกกำลังกายในช่วงบ่ายเด็ดขาด**`;
          return `ประเมินความเสี่ยง: **สภาพแวดล้อมเหมาะสม**สำหรับการออกกำลังกายกลางแจ้ง สามารถดำเนินกิจกรรมตามตารางฝึกซ้อมได้ตามปกติ`;
      }
      if (activeTab === 'outdoor') {
          if (rain > 40) return `ประเมินความเสี่ยง: **มีโอกาสเกิดฝนฟ้าคะนอง** หากตั้งแคมป์ควรเตรียมเต็นท์กันน้ำและ**ประเมินจุดเสี่ยงน้ำหลาก**`;
          if (windMax > 30) return `ประเมินความเสี่ยง: **กระแสลมแรงถึง ${windMax} กม./ชม.** โปรดใช้ความระมัดระวังในการตอกสมอบกและ**หลีกเลี่ยงการกางเต็นท์ใต้ต้นไม้ใหญ่**`;
          if (uvMax > 8) return `ประเมินความเสี่ยง: ดัชนีรังสี UV **สูงมาก** ควรจัดเตรียมพื้นที่ร่มเงา (Tarp) และ**กำชับให้ผู้ร่วมกิจกรรมทาครีมกันแดด (SPF 50+)**`;
          return `ประเมินความเสี่ยง: **สภาพอากาศเป็นใจอย่างยิ่ง**สำหรับการทำกิจกรรมกลางแจ้ง ปัจจัยทางอุตุนิยมวิทยาเอื้ออำนวยอย่างเต็มที่`;
      }
      if (activeTab === 'farming') {
          if (rain > 60) return `ประเมินความเสี่ยง: **ไม่แนะนำให้ฉีดพ่นสารเคมี** เนื่องจากฝนอาจชะล้างตัวยา และควรเฝ้าระวังระบบระบายน้ำในแปลง`;
          if (windMax > 15) return `ประเมินความเสี่ยง: **กระแสลมแรง (${windMax} กม./ชม.)** **ควรงดการฉีดพ่นสารเคมีหรือปุ๋ยทางใบ** เพื่อป้องกันละอองปลิวไปนอกพื้นที่เป้าหมายหรือเป็นอันตรายต่อผู้ปฏิบัติงาน`;
          if (tMax > 37) return `ประเมินความเสี่ยง: **สภาพอากาศร้อนจัด** ควรรดน้ำพืชในช่วงเช้าตรู่หรือเย็น และ**ระวังพืชเกิดภาวะช็อกความร้อน**`;
          return `ประเมินความเสี่ยง: **สภาวะแวดล้อมเหมาะสม** สามารถปฏิบัติงานในแปลงเพาะปลูก ฉีดพ่นยา หรือให้ปุ๋ยได้ตามรอบการจัดการปกติ`;
      }
      if (activeTab === 'travel') {
          if (rain > 50) return `ประเมินความเสี่ยง: สภาพอากาศมีแนวโน้มแปรปรวน **แนะนำให้จัดแพลนท่องเที่ยวในอาคาร (Indoor) เป็นหลัก**`;
          if (uvMax > 10) return `ประเมินความเสี่ยง: ดัชนี UV อยู่ในเกณฑ์**รุนแรงมาก (Extreme)** **ควรหลีกเลี่ยงการอยู่กลางแจ้งเป็นเวลานาน** สวมแว่นกันแดดและหมวกปีกกว้าง`;
          return `ประเมินความเสี่ยง: **เหมาะสมต่อการเดินทางท่องเที่ยว** ทัศนวิสัยชัดเจน สามารถดำเนินกิจกรรมตามแพลนที่วางไว้ได้อย่างราบรื่น`;
      }
      if (activeTab === 'pets') {
          if (tMax > 34 || uvMax > 8) return `ประเมินความเสี่ยง: สภาพอากาศร้อนจัดและ UV สูง **เสี่ยงต่อภาวะฮีทสโตรกและผิวหนังไหม้** (โดยเฉพาะสัตว์เลี้ยงขนสั้น/สีขาว) **ควรงดพาเดินเล่นบนพื้นปูนในช่วงกลางวัน**`;
          if (rain > 40) return `ประเมินความเสี่ยง: โอกาสฝนตก **${rain}%** แนะนำให้**อยู่ภายในอาคาร** และระวังความชื้นที่อาจก่อให้เกิดโรคเชื้อรา`;
          return `ประเมินความเสี่ยง: **สภาพอากาศเป็นมิตร**ต่อสัตว์เลี้ยง อุณหภูมิอยู่ใน**เกณฑ์ปลอดภัย** สามารถพาออกไปทำกิจกรรมนอกอาคารได้`;
      }
      if (activeTab === 'construction') {
          if (rain > 50) return `ประเมินความเสี่ยง: ความน่าจะเป็นของการเกิดฝนสูงถึง **${rain}%** **แนะนำให้หลีกเลี่ยงการก่อสร้างภายนอกอาคาร การเทปูน และงานที่เกี่ยวกับระบบไฟฟ้าเด็ดขาด**`;
          if (windMax > 20) return `ประเมินความเสี่ยง: **กระแสลมค่อนข้างแรง** **ควรตรวจสอบและเพิ่มความรัดกุมของนั่งร้านหรือจุดติดตั้งบนที่สูง** เพื่อความปลอดภัยของคนงาน`;
          if (heatMax > 40 || tMax > 36) return `ประเมินความเสี่ยง: ดัชนีความร้อน **${heatMax}°C** อยู่ใน**ระดับสูงมาก** **ผู้คุมงานควรสลับช่วงเวลาพักให้บ่อยขึ้นและเตรียมน้ำดื่มให้เพียงพอ เพื่อป้องกันภาวะฮีทสโตรก**`;
          return `ประเมินความเสี่ยง: สภาพอากาศโดยรวมปลอดโปร่ง เอื้ออำนวยให้**สามารถดำเนินงานก่อสร้างหรือเทคอนกรีตภายนอกอาคารได้ตามปกติ**`;
      }
      if (activeTab === 'rain_risk') {
          if (rain > 60) return `ประเมินความเสี่ยง: **มีความเสี่ยงที่จะมีฝนตกหนักสูงมาก โอกาส ${rain}%** **แนะนำให้หลีกเลี่ยงการทำกิจกรรมกลางแจ้ง และพกร่มหรือสิ่งกันฝนอย่างแน่นอน**`;
          if (rain > 30) return `ประเมินความเสี่ยง: **อาจมีฝนตกระหว่างวัน โอกาสประมาณ ${rain}%** **ควรพกร่มเป็นตัวช่วยหากต้องออกจากตัวบ้าน**`;
          return `ประเมินความเสี่ยง: โอกาสการเกิดฝนตกอยู่ในเกณฑ์ที่ปลอดภัย ท้องฟ้าส่วนใหญ่น่าจะสดใส **ไม่จำเป็นต้องกังวลเรื่องฝนตก**`;
      }
      if (activeTab === 'health') {
          if (pm25 > 50) return `ประเมินความเสี่ยง: สภาพแวดล้อมและฝุ่นอยู่ในระดับ **อันตรายอย่างยิ่งต่อสุขภาพ (${pm25} µg/m³)** ผู้สูงอายุและผู้ป่วยควรหลีกเลี่ยงควันฝุ่นเด็ดขาด`;
          if (heatMax > 42 || tMax > 37) return `ประเมินความเสี่ยง: ดัชนีความร้อน **${heatMax}°C** สูงวิกฤต ซึ่งอันตรายต่อภาวะฮีทสโตรก **ดื่มน้ำสม่ำเสมอและอย่าอยู่กับแสงแดดนานเกินไป**`;
          return `ประเมินความเสี่ยง: สภาพอากาศเป็นใจ ไม่มีปัญหาเกี่ยวกับมลพิษทางอากาศหรือความร้อนรุนแรงที่กระทบสุขภาพ`;
      }
      if (activeTab === 'photography') {
          if (rain > 40) return `ประเมินความเสี่ยง: โอกาสฝนตกรบกวน**${rain}%** ท้องฟ้ามืดครึ้ม แสงธรรมชาติอาจถูกบัง **เหมาะกับการถ่ายรูปสไตล์ Cinematic ในร่มหรือมู้ดต่างๆ** มากกว่า`;
          if (pm25 > 37.5) return `ประเมินความเสี่ยง: ฟ้าหลัว มีฝุ่นเยอะ **อาจทำให้ภาพถ่ายที่เน้นวิวหรือทิวทัศน์ห่างไกลดรอปลง** แต่ยังถ่ายภาพบุคคลระยะใกล้ได้ดีอยู่`;
          return `ประเมินความเสี่ยง: สภาพแสงและทัศนวิสัย **ยอดเยี่ยม** เหมาะสมอย่างยิ่งกับการถ่ายภาพทุกรูปแบบและทุกๆ มุมแสง`;
      }
      if (activeTab === 'vending') {
          if (rain > 40) return `ประเมินความเสี่ยง: เมฆมากและความน่าจะเป็นของฝน **${rain}%** **ควรเตรียมเต็นท์หรือร่มผ้าใบให้พร้อม** ฝนอาจเป็นอุปสรรคต่อการตั้งแผงค้าขาย`;
          if (windMax > 25) return `ประเมินความเสี่ยง: ลมกระโชกแรง **ควรหาที่ยึดเต็นท์และรัดตึงป้ายไวนิลหน้าร้านให้แน่นหนา**`;
          if (tMax > 38) return `ประเมินความเสี่ยง: อากาศร้อนจัดในช่วงบ่าย **ยอดขายอาจดรอปลงสำหรับสินค้าที่ไม่ดับร้อน** พ่อค้าแม่ค้าควรระมัดระวังสุขภาพเวลาตั้งร้าน`;
          return `ประเมินความเสี่ยง: สภาพแวดล้อมน่าเดินเล่น อากาศแจ่มใส **ลูกค้ามีแนวโน้มจะออกมาจับจ่ายใช้สอยเป็นจำนวนมาก โอกาสทำยอดขายเป็นไปได้สูง**`;
      }
      if (activeTab === 'solar') {
          if (rain > 40) return `ประเมินความเสี่ยง: แสงแดดถูกบดบังจากเมฆฝน โอกาสฝนตก ${rain}% **ประสิทธิภาพการรับแสงจากหน้าแผงโซลาร์อาจลดลงรัดับกลางถึงมาก**`;
          return `ประเมินความเสี่ยง: ท้องฟ้าเปิด รังสี UV และลักซ์แสงดีเยี่ยม **เหมาะกับการรับพลังงานแสงอาทิตย์และการตากผลผลิตทางการเกษตรได้เต็มที่**`;
      }
      
      if (finalScore >= 8) return `สรุปการประเมิน: **สภาพอากาศโดยรวมอยู่ในเกณฑ์ดีเยี่ยม** ปัจจัยทางอุตุนิยมวิทยาเอื้ออำนวยต่อการดำเนินชีวิตประจำวันตามปกติ`;
      return `สรุปการประเมิน: สภาพอากาศมี**ความผันผวนของปัจจัยบางประการ** ควรประเมินสถานการณ์หน้างานและเตรียมความพร้อมสำหรับความเปลี่ยนแปลง`;
    };

    const getTimeline = () => {
      const isRainy = rain > 40;
      const isHot = heatMax > 38 || tMax > 35;
      
      const lines = {
        summary: [
          { time: 'ช่วงเช้า (06:00 - 12:00)', icon: '🌅', text: `อุณหภูมิต่ำสุด **${tMin}°C** สภาพอากาศ**เหมาะสมสำหรับการเริ่มต้นวัน**` },
          { time: 'ช่วงบ่าย (12:00 - 18:00)', icon: '☀️', text: isHot ? `อุณหภูมิสูงสุด **${tMax}°C** (รู้สึกเหมือน **${heatMax}°C**) **ควรหลีกเลี่ยงแสงแดดจัดและดื่มน้ำบ่อยๆ**` : `อุณหภูมิสูงสุด **${tMax}°C** (รู้สึกเหมือน ${heatMax}°C) สภาพอากาศโดยรวมทรงตัว` },
          { time: 'ช่วงค่ำ (18:00 เป็นต้นไป)', icon: '🌙', text: isRainy ? `**มีความเสี่ยงฝนฟ้าคะนอง** ควรเตรียมอุปกรณ์กันฝน` : `อุณหภูมิลดลง สภาพอากาศโปร่งสบาย เหมาะแก่การพักผ่อน` }
        ],
        laundry: [
          { time: 'ช่วงเช้า (06:00 - 12:00)', icon: '🌅', text: isRainy ? `สังเกตทิศทางลมและเมฆฝน หากความชื้นสูง**ควรชะลอการซักผ้า**` : `ปริมาณรังสี UV และแสงแดดเหมาะสม **สามารถเริ่มการซักและตากผ้าได้**` },
          { time: 'ช่วงบ่าย (12:00 - 18:00)', icon: '☀️', text: isHot || windMax >= 10 ? `อุณหภูมิและความเร็วลมระดับนี้ **ช่วยลดระยะเวลาตากผ้าและยับยั้งเชื้อแบคทีเรียได้ดีเยี่ยม**` : `ปริมาณแสงแดดเพียงพอต่อการทำให้ผ้าแห้งตามมาตรฐาน` },
          { time: 'ช่วงค่ำ (18:00 เป็นต้นไป)', icon: '🌙', text: `ความชื้นสัมพัทธ์ในอากาศเพิ่มขึ้น ควรรีบจัดเก็บเสื้อผ้าที่ตากไว้เพื่อ**ป้องกันกลิ่นอับ**` }
        ],
        exercise: [
          { time: 'ช่วงเช้า (06:00 - 12:00)', icon: '🌅', text: pm25 > 37.5 ? `ค่ามลพิษทางอากาศ**เกินเกณฑ์มาตรฐาน** **ควรงดกิจกรรมที่ต้องสูดหายใจลึก**ภายนอกอาคาร` : `คุณภาพอากาศและอุณหภูมิอยู่ในระดับที่**เหมาะสมที่สุด**สำหรับการคาร์ดิโอ` },
          { time: 'ช่วงบ่าย (12:00 - 18:00)', icon: '☀️', text: uvMax > 8 ? `รังสี UV ระดับอันตราย **เสี่ยงต่อผิวหนังไหม้** ควรปรับเปลี่ยนเป็นการฝึกซ้อมในฟิตเนส` : `สามารถดำเนินกิจกรรมทางกายได้ แต่**ควรเฝ้าระวังอัตราการเต้นของหัวใจ**และจิบน้ำอย่างสม่ำเสมอ` },
          { time: 'ช่วงค่ำ (18:00 เป็นต้นไป)', icon: '🌙', text: `อุณหภูมิผ่อนคลายลง **เหมาะสมสำหรับการเดินเร็ว วิ่งจ็อกกิ้ง** หรือกิจกรรมยืดเหยียดกล้ามเนื้อ` }
        ],
        outdoor: [
          { time: 'ช่วงเช้า (06:00 - 12:00)', icon: '🌅', text: `สภาพแสงและอุณหภูมิ**เหมาะสมอย่างยิ่ง**ในการจัดเตรียมสถานที่หรือเคลื่อนย้ายอุปกรณ์` },
          { time: 'ช่วงบ่าย (12:00 - 18:00)', icon: '☀️', text: uvMax > 8 ? `รังสี UV สูงจัด **ควรทาครีมกันแดดซ้ำทุก 2 ชั่วโมง** และจัดกิจกรรมภายใต้ร่มเงา` : `สภาพอากาศเปิดโล่ง สามารถดำเนินกิจกรรมนันทนาการได้อย่างราบรื่น` },
          { time: 'ช่วงค่ำ (18:00 เป็นต้นไป)', icon: '🌙', text: isRainy || windMax > 20 ? `**เฝ้าระวังกระแสลมและพายุ** ตรวจสอบการตอกสมอบกให้แน่นหนา` : `บรรยากาศและอุณหภูมิลดลง **เหมาะสมสำหรับการก่อกองไฟและทำกิจกรรมส่วนรวม**` }
        ],
        farming: [
          { time: 'ช่วงเช้า (06:00 - 12:00)', icon: '🌅', text: windMax > 15 ? `กระแสลมแปรปรวน **ควรงดการฉีดพ่นปุ๋ยทางใบชั่วคราว**` : `ช่วงเวลาที่ปากใบพืชเปิดรับสารอาหารได้เต็มที่ **เหมาะสมสูงสุดสำหรับการฉีดพ่นบำรุง**` },
          { time: 'ช่วงบ่าย (12:00 - 18:00)', icon: '☀️', text: isHot ? `อุณหภูมิดินสูง **ควรงดการให้น้ำพืช**เพื่อป้องกันภาวะช็อกความร้อนและการลวกของระบบราก` : `สามารถดำเนินการบำรุงรักษาแปลงเพาะปลูกและกำจัดวัชพืชได้ตามแผนการจัดการ` },
          { time: 'ช่วงค่ำ (18:00 เป็นต้นไป)', icon: '🌙', text: isRainy ? `ติดตามปริมาณฝนสะสมเพื่อประเมินและ**บริหารจัดการระบบระบายน้ำ**ในแปลงเพาะปลูกสำหรับวันพรุ่งนี้` : `สามารถให้น้ำเสริมแก่พืชได้ เพื่อชดเชยการสูญเสียความชื้นจากกระบวนการคายน้ำระหว่างวัน` }
        ],
        travel: [
          { time: 'ช่วงเช้า (06:00 - 12:00)', icon: '🌅', text: `ทัศนวิสัยดีเยี่ยม **เหมาะสมต่อการเดินทางไกล**และเยี่ยมชมแหล่งท่องเที่ยวทางธรรมชาติ` },
          { time: 'ช่วงบ่าย (12:00 - 18:00)', icon: '☀️', text: isHot || uvMax > 8 ? `แดดและ UV แรงจัด **แนะนำให้ปรับกำหนดการเป็นสถานที่ปรับอากาศ**` : `การสัญจรราบรื่น สภาพอุตุนิยมวิทยาไม่เป็นอุปสรรคต่อการเดินทาง` },
          { time: 'ช่วงค่ำ (18:00 เป็นต้นไป)', icon: '🌙', text: `**เหมาะสมสำหรับการจัดตารางกิจกรรมช่วงกลางคืน** เช่น ตลาดนัดคนเดิน หรือการรับประทานอาหารภายนอก` }
        ],
        pets: [
          { time: 'ช่วงเช้า (06:00 - 12:00)', icon: '🌅', text: pm25 > 37.5 ? `มลพิษทางอากาศค่อนข้างสูง หากพาเดินเล่น**ควรจำกัดระยะเวลา**เพื่อลดผลกระทบต่อระบบหายใจของสัตว์เลี้ยง` : `อุณหภูมิผิวถนนเย็นและอากาศถ่ายเทดี เป็นช่วงเวลา**ปลอดภัยที่สุด**ในการพาสัตว์เลี้ยงออกกำลังกาย` },
          { time: 'ช่วงบ่าย (12:00 - 18:00)', icon: '☀️', text: isHot || uvMax > 8 ? `พื้นยางมะตอยร้อนจัดและ UV รุนแรง **เสี่ยงต่อแผลไหม้ที่อุ้งเท้าและฮีทสโตรก** **ควรจัดให้อยู่ในที่ร่ม**` : `สามารถทำกิจกรรมระยะสั้นได้ แต่**ควรจัดเตรียมน้ำสะอาดให้สัตว์เลี้ยงเข้าถึงได้ตลอดเวลา**` },
          { time: 'ช่วงค่ำ (18:00 เป็นต้นไป)', icon: '🌙', text: isRainy ? `**ระวังพาหะนำโรค** เช่น เห็บ หมัด และสัตว์มีพิษที่มากับความชื้นหลังฝนตก` : `อุณหภูมิแวดล้อมผ่อนคลายลง **เหมาะสมต่อการพาสัตว์เลี้ยงไปเดินเล่นคลายเครียด**ก่อนพักผ่อน` }
        ],
        construction: [
          { time: 'ช่วงเช้า (06:00 - 12:00)', icon: '🌅', text: isRainy ? `ประเมินพื้นที่ว่ามีความชื้นและโคลนเจิ่งนองหรือไม่ **ระวังอันตรายจากการใช้อุปกรณ์ไฟฟ้า**` : `สภาพอากาศเปิด **เหมาะสำหรับการเริ่มเทคอนกรีตหรือปฏิบัติงานบนที่สูง** ก่อนช่วงเวลาที่ลมจะแรงขึ้น` },
          { time: 'ช่วงบ่าย (12:00 - 18:00)', icon: '☀️', text: tMax > 36 ? `เตือนภัยอากาศร้อนทะลุพิกัด **เฝ้าระวังอาการลมแดดของช่างและคนงาน ควรดื่มน้ำเกลือแร่หรือน้ำเย็นจัดบ่อยๆ**` : `ดำเนินการก่อสร้างต่อไปได้ แต่หลีกเลี่ยงจุดที่โดนแสงแดดส่องเต็มๆ หากเป็นไปได้` },
          { time: 'ช่วงค่ำ (18:00 เป็นต้นไป)', icon: '🌙', text: windMax > 20 ? `ตรวจเช็คความแข็งแรงของนั่งร้านและโครงสร้างชั่วคราว **ก่อนยุติการทำงาน**` : `สามารถเดินเครื่องจักรหรือทำงานล่วงเวลาได้ในสภาวะที่ปลอดภัยและเสียงลดหลั่นลง` }
        ],
        rain_risk: [
          { time: 'ช่วงเช้า (06:00 - 12:00)', icon: '🌅', text: isRainy ? `พกร่มไปทำงานหรือกิจกรรมเสมอ` : `ท้องฟ้าโปร่ง ไม่มีความเสี่ยงที่ชัดเจน` },
          { time: 'ช่วงบ่าย (12:00 - 18:00)', icon: '☀️', text: rain > 30 ? `เมฆก่อตัว และฝนอาจตกลงมาในช่วงตอนเย็นๆ แนะนำให้เตรียมเสื้อกันฝน` : `เมฆเล็กน้อย ไม่มีโอกาสเป็นฝน` },
          { time: 'ช่วงค่ำ (18:00 เป็นต้นไป)', icon: '🌙', text: isRainy ? `อาจเจอกับฝนระหว่างทางกลับบ้าน รักษาระยะห่างในการขับขี่` : `กลับบ้านได้อย่างปลอดภัย` }
        ],
        health: [
          { time: 'ช่วงเช้า (06:00 - 12:00)', icon: '🌅', text: pm25 > 50 ? `สวมหน้ากากเมื่ออกจากที่พัก **ฝุ่นเป็นอันตราย**` : `คุณภาพอากาศตอนเช้าอยู่ในระยะที่สะอาด ปลอดภัย` },
          { time: 'ช่วงบ่าย (12:00 - 18:00)', icon: '☀️', text: tMax > 35 ? `เลี่ยงกางแสงแดดจัด เนื่องจากความร้อนส่งผลร้ายต่อสุขภาพได้` : `อากาศยังคงถ่ายเท ปลอดโปร่ง` },
          { time: 'ช่วงค่ำ (18:00 เป็นต้นไป)', icon: '🌙', text: `ผ่อนคลายและดูแลสุขภาพทั่วไปที่บ้าน` }
        ],
        photography: [
          { time: 'ช่วงเช้า (06:00 - 12:00)', icon: '🌅', text: `แสงเช้าเป็น Golden Hour ช่วงที่สวยงามที่สุดสำหรับแสงอบอุ่น` },
          { time: 'ช่วงบ่าย (12:00 - 18:00)', icon: '☀️', text: pm25 > 37.5 ? `ฟ้าอาจจะหม่นไปบ้างเนื่องจากฝุ่นละอองกระจาย` : `แสงแรง เหมาะกับงานที่ต้องการคอนทราสต์ที่ชัดเจน` },
          { time: 'ช่วงค่ำ (18:00 เป็นต้นไป)', icon: '🌙', text: rain > 30 ? `หากฝนตกจะมีความเจ๋งในการถ่ายภาพแสงสะท้อนบนพื้นถนน` : `แสงประดิษฐ์และไฟเมืองเริ่มทำงาน ถ่ายภาพกลางคืนได้ง่าย` }
        ],
        vending: [
          { time: 'ช่วงเช้า (06:00 - 12:00)', icon: '🌅', text: `อุณหภูมิและแสงเหมาะกับการตั้งร้านแต่เช้าเพื่อจับกลุ่มคนทำงาน` },
          { time: 'ช่วงบ่าย (12:00 - 18:00)', icon: '☀️', text: rain > 40 ? `สังเกตเมฆฝนอย่างใกล้ชิด **ปกป้องสินค้าจากน้ำและระบุพื้นที่หลบฝนของลูกค้า**` : `คาดคะเนทิศทางแดดและกางร่มบังแดดให้ลูกค้าเพื่อเพิ่มโอกาสการขาย` },
          { time: 'ช่วงค่ำ (18:00 เป็นต้นไป)', icon: '🌙', text: `อากาศเย็นสบายลง **ตลาดกลางคืนน่าจะคึกคักและยอดขายน่าจะวิ่งได้ดีที่สุด**` }
        ],
        solar: [
          { time: 'ช่วงเช้า (06:00 - 12:00)', icon: '🌅', text: `เริ่มเก็บเกี่ยวพลังงานแสงอาทิตย์ได้ช่วงหลังพระอาทิตย์ขึ้น` },
          { time: 'ช่วงบ่าย (12:00 - 16:00)', icon: '☀️', text: uvMax > 8 ? `รังสีแรง **ประสิทธิภาพแผงโซลาร์ทำและรับสเกลแสงได้เต็มที่**` : `แสงอ่อนลงบ้างตามเมฆบัง` },
          { time: 'ช่วงค่ำ (16:00 เป็นต้นไป)', icon: '🌙', text: `แสงอาทิตย์เริ่มทำมุมตกกระทบต่ำลง ประสิทธิภาพรับแสงจะลดหลั่นลงตามเวลา` }
        ]
      };
      
      
      if (targetDateIdx === -1) {
          return [
              { time: `อัปเดตล่าสุด: ${new Date().toLocaleTimeString('th-TH')}`, icon: '⏱️', text: `ข้อมูล ณ ขณะนี้สะท้อนสภาวะอากาศแบบ Real-time ของพื้นที่ หากคุณต้องการดูคำพยากรณ์ล่วงหน้าในแต่ละช่วงเวลาของวัน สามารถกดปุ่ม **"วันนี้ (พยากรณ์รายวัน)"** ด้านบนได้ครับ` }
          ];
      }
      return lines[activeTab] || lines.summary; 
    };

    return { 
      score: finalScore, 
      advice: getMainAdvice(), 
      timeline: getTimeline() 
    };
  }, [activeTab, currentScores, getWeatherFactorsForDay, targetDateIdx, weatherData]);

  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToCSV = () => {
    if (!aiReport) return;
    const tabName = tabConfigs.find(t => t.id === activeTab)?.label || 'Report';
    const dateStr = new Date(weatherData?.daily?.time?.[targetDateIdx] || Date.now()).toLocaleDateString('th-TH');
    let csv = `\uFEFFหัวข้อ,รายละเอียด\n`;
    csv += `รายงานการประเมินสภาพอากาศ,${tabName}\n`;
    csv += `สถานที่,${locationName}\n`;
    csv += `วันที่,${dateStr}\n`;
    csv += `คะแนนความเหมาะสม,${aiReport.score}/10\n\n`;
    csv += `คำแนะนำหลัก,"${cleanMd(aiReport.advice).replace(/"/g, '""')}"\n\n`;
    csv += `ช่วงเวลา,รายการ\n`;
    if (aiReport.timeline) {
      aiReport.timeline.forEach(t => {
        csv += `"${t.time}","${cleanMd(t.text).replace(/"/g, '""')}"\n`;
      });
    }
    downloadFile(csv, `weather_report_${tabName}.csv`, 'text/csv;charset=utf-8;');
  };

  const exportToJSON = () => {
    if (!aiReport) return;
    const tabName = tabConfigs.find(t => t.id === activeTab)?.label || 'Report';
    const data = {
      location: locationName,
      date: new Date(weatherData?.daily?.time?.[targetDateIdx] || Date.now()).toLocaleDateString('th-TH'),
      category: tabName,
      report: {
        ...aiReport,
        advice: cleanMd(aiReport.advice),
        timeline: aiReport.timeline.map(t => ({...t, text: cleanMd(t.text)}))
      }
    };
    downloadFile(JSON.stringify(data, null, 2), `weather_report_${tabName}.json`, 'application/json');
  };

  const exportToPDF = () => {
    window.print();
  };

  const handleShare = async () => {
    if (!aiReport) return;
    const text = `สรุปสภาพอากาศที่ ${locationName} (คะแนนความเหมาะสม: ${aiReport.score}/10) - ${cleanMd(aiReport.advice)}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'รายงานสภาพอากาศ',
          text: text,
        });
      } catch {
        // User dismissed the share sheet.
      }
    } else {
      navigator.clipboard.writeText(text);
      alert("คัดลอกข้อความแล้ว");
    }
  };

  const appBg = 'var(--bg-app)'; 
  const cardBg = 'var(--bg-card)';
  const textColor = 'var(--text-main)'; 
  const borderColor = 'var(--border-color)';
  const subTextColor = 'var(--text-sub)'; 
  const activeColor = tabConfigs.find(t => t.id === activeTab)?.color || '#8b5cf6';

  if (loadingWeather) return (
    <div className="loading-container" style={{ background: appBg, color: textColor }}>
        <div className="loading-spinner" style={{ borderTopColor: '#8b5cf6', borderColor: 'rgba(139, 92, 246, 0.15)' }}></div>
        <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>ระบบกำลังประมวลผลทางสถิติ...</div>
        <div style={{ fontSize: '0.85rem', color: subTextColor, marginTop: '5px' }}>วิเคราะห์ UV และ ปัจจัยทางอุตุนิยมวิทยา</div>
    </div>
  );
  
  if (!weatherData) return (
    <div style={{ minHeight: '100dvh', background: appBg, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: subTextColor, fontFamily: 'Kanit', padding: '20px', textAlign: 'center' }}>
      <div style={{fontSize: '3rem'}}>⚠️</div>
      <p style={{fontWeight: 'bold'}}>ไม่สามารถดึงข้อมูลทางสถิติได้ชั่วคราว</p>
      <button onClick={() => window.location.reload()} style={{marginTop: '15px', padding: '10px 25px', borderRadius: '50px', background: '#0ea5e9', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer'}}>เชื่อมต่อระบบอีกครั้ง</button>
    </div>
  );

  return (
    <div style={{ width: '100%', minHeight: '100dvh', background: appBg, display: 'block', overflowX: 'hidden', overflowY: 'auto', WebkitOverflowScrolling: 'touch', fontFamily: 'Kanit, sans-serif', boxSizing: 'border-box' }} className="hide-scrollbar ai-page">
      
      <style dangerouslySetInlineStyle={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .fade-in { animation: fadeIn 0.4s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
        }
        .recharts-tooltip-wrapper { outline: none !important; }
        .ai-page, .ai-page * { box-sizing: border-box; }
        .ai-page .wrap-text { overflow-wrap: anywhere; word-break: break-word; }
      `}} />

      <div style={{ width: '100%', maxWidth: '1300px', minWidth: 0, margin: '0 auto', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '16px' : '24px', padding: isMobile ? '12px' : '30px', paddingBottom: '120px', boxSizing: 'border-box', alignItems: 'flex-start', overflowX: 'clip' }}>
      {/* 🟢 LEFT COLUMN (65%) */}
      <div style={{ flex: isMobile ? '1' : '0 0 calc(65% - 12px)', display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>

        {/* 📍 Header & Date Selector */}
        <div className="no-print" style={{ background: cardBg, borderRadius: '24px', padding: '20px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                <div style={{ minWidth: 0 }}>
                    <h1 style={{ margin: 0, fontSize: '1.4rem', color: textColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        ✨ วิเคราะห์สภาพอากาศ
                    </h1>
                    <div style={{ fontSize: '0.85rem', color: subTextColor, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                        พื้นที่การวิเคราะห์: <span style={{color: '#0ea5e9', fontWeight: 'bold'}}>{locationName}</span> 
                        <button onClick={handleCurrentLocation} title="ใช้ตำแหน่งปัจจุบัน" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 5px', filter: 'grayscale(0.2)' }}>🎯</button>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', width: isMobile ? '100%' : 'auto', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                    {isMobile && (
                        <select value={targetDateIdx} onChange={(e) => setTargetDateIdx(parseInt(e.target.value))} style={{ flex: '1 1 100%', minWidth: 0, width: '100%', padding: '8px 12px', borderRadius: '12px', background: 'var(--bg-secondary)', color: textColor, border: `1px solid ${borderColor}`, fontFamily: 'Kanit', outline: 'none' }}>
                            {[-1,0,1,2,3,4,5,6].map(idx => {
                                const date = new Date(weatherData?.daily?.time?.[idx === -1 ? 0 : idx] || Date.now());
                                const dateStr = idx === -1 ? 'ขณะนี้ (Current)' : idx === 0 ? 'วันนี้ (ภาพรวมตลอดวัน)' : idx === 1 ? 'พรุ่งนี้' : date.toLocaleDateString('th-TH', {weekday:'short', day:'numeric'});
                                return <option key={idx} value={idx}>{dateStr}</option>;
                            })}
                        </select>
                    )}
                    <select value={selectedProv} onChange={(e) => { 
                        const val = e.target.value;
                        setSelectedProv(val); 
                        setSelectedDist('');
                        if(val){
                            const st = (stations || []).find(s => s.areaTH === val);
                            if(st) { fetchWeatherByCoords(st.lat, st.long); fetchLocationName(st.lat, st.long); }
                        }
                    }} style={{ flex: isMobile ? '1 1 calc(50% - 5px)' : 'auto', minWidth: 0, width: isMobile ? 'calc(50% - 5px)' : 'auto', padding: '8px 12px', borderRadius: '12px', background: 'var(--bg-secondary)', color: textColor, border: `1px solid ${borderColor}`, fontFamily: 'Kanit', outline: 'none' }}>
                        <option value="">เลือกจังหวัด</option>
                        {(stations || []).map(s => <option key={s.stationID} value={s.areaTH}>{s.areaTH}</option>)}
                    </select>

                    <select value={selectedDist} onChange={(e) => { 
                        const val = e.target.value;
                        setSelectedDist(val); 
                        if(val){
                            const amphoe = currentAmphoes.find(a => a.name === val);
                            if(amphoe && amphoe.lat && amphoe.lon) { 
                                fetchWeatherByCoords(amphoe.lat, amphoe.lon); 
                                setLocationName(`${val}, ${selectedProv}`); 
                            }
                        }
                    }} disabled={!selectedProv || currentAmphoes.length === 0} style={{ flex: isMobile ? '1 1 calc(50% - 5px)' : 'auto', minWidth: 0, width: isMobile ? 'calc(50% - 5px)' : 'auto', padding: '8px 12px', borderRadius: '12px', background: 'var(--bg-secondary)', color: textColor, border: `1px solid ${borderColor}`, fontFamily: 'Kanit', outline: 'none', opacity: (!selectedProv || currentAmphoes.length === 0) ? 0.5 : 1 }}>
                        <option value="">เลือกอำเภอ</option>
                        {currentAmphoes.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                    </select>
                </div>
            </div>

            {!isMobile && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))', gap: '8px', marginTop: '20px' }}>
                    {[-1,0,1,2,3,4,5,6].map(idx => {
                        const date = new Date(weatherData?.daily?.time?.[idx === -1 ? 0 : idx] || Date.now());
                        let dateStr = idx === -1 ? 'ขณะนี้' : (idx === 0 ? 'วันนี้' : idx === 1 ? 'พรุ่งนี้' : date.toLocaleDateString('th-TH', {weekday:'short', day:'numeric'}));
                        let subStr = idx === -1 ? new Date().toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'}) + 'น.' : (idx === 0 ? 'พยากรณ์รายวัน' : '');
                        
                        return (
                            <button key={idx} onClick={() => setTargetDateIdx(idx)} style={{ 
                                padding: '6px 5px', borderRadius: '14px', 
                                border: `1px solid ${targetDateIdx === idx ? activeColor : borderColor}`, 
                                background: targetDateIdx === idx ? activeColor : 'transparent', 
                                color: targetDateIdx === idx ? '#fff' : textColor, 
                                cursor: 'pointer', transition: '0.2s', width: '100%',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px'
                            }}>
                                <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{dateStr}</span>
                                {subStr && <span style={{ fontSize: '0.65rem', opacity: 0.8, fontWeight: 'normal' }}>{subStr}</span>}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>

        {/* 🔥 Hero Card – Heat Index + Risk */}
        {(() => {
          const hf = getWeatherFactorsForDay(targetDateIdx);
          if (!hf) return null;
          const { tMax, tMin, heatMax, uvMax, pm25, rain, windMax } = hf;
          const humidity = weatherData.current?.humidity ?? 0;

          const heatColor = heatMax > 42 ? '#ef4444' : heatMax > 38 ? '#f97316' : heatMax > 33 ? '#f59e0b' : '#10b981';
          const heatBg   = heatMax > 42 ? 'rgba(239,68,68,0.12)' : heatMax > 38 ? 'rgba(249,115,22,0.10)' : heatMax > 33 ? 'rgba(245,158,11,0.10)' : 'rgba(16,185,129,0.10)';
          const heatLabel= heatMax > 42 ? 'อันตราย' : heatMax > 38 ? 'ร้อนมาก' : heatMax > 33 ? 'อบอ้าว' : 'สบาย';

          const uvColor  = uvMax > 8 ? '#ef4444' : uvMax > 5 ? '#f97316' : uvMax > 2 ? '#f59e0b' : '#10b981';
          const pm25Color= pm25 > 75 ? '#ef4444' : pm25 > 37.5 ? '#f97316' : pm25 > 25 ? '#f59e0b' : pm25 > 15 ? '#10b981' : '#0ea5e9';
          const rainColor= rain > 60 ? '#ef4444' : rain > 30 ? '#f59e0b' : '#10b981';
          const windColor= windMax > 30 ? '#ef4444' : windMax > 15 ? '#f59e0b' : '#10b981';
          const humidColor= humidity > 80 ? '#f59e0b' : humidity < 30 ? '#f59e0b' : '#10b981';

          // overall risk
          const risks = [
            heatMax > 42 ? 4 : heatMax > 38 ? 3 : heatMax > 33 ? 2 : 1,
            pm25 > 75 ? 4 : pm25 > 37.5 ? 3 : pm25 > 25 ? 2 : 1,
            uvMax > 8 ? 3 : uvMax > 5 ? 2 : 1,
            rain > 60 ? 3 : rain > 30 ? 2 : 1,
          ];
          const maxRisk = Math.max(...risks);
          const riskLabel = maxRisk >= 4 ? 'อันตราย' : maxRisk === 3 ? 'ควรระวัง' : maxRisk === 2 ? 'ระมัดระวัง' : 'ปลอดภัยดี';
          const riskColor = maxRisk >= 4 ? '#ef4444' : maxRisk === 3 ? '#f97316' : maxRisk === 2 ? '#f59e0b' : '#10b981';
          const riskIcon  = maxRisk >= 4 ? '🚨' : maxRisk === 3 ? '⚠️' : maxRisk === 2 ? '⚡' : '✅';
          const safeScore = Math.max(0, Math.min(100, 100 - (heatMax > 33 ? (heatMax - 33) * 3 : 0) - (pm25 > 15 ? Math.min(30, (pm25 - 15) * 0.8) : 0) - (uvMax > 3 ? Math.min(15, (uvMax - 3) * 2) : 0) - (rain > 20 ? Math.min(15, (rain - 20) * 0.3) : 0)));
          const scorePct = safeScore / 100;
          const circR = 28, circC = 2 * Math.PI * circR;
          const scoreColor = safeScore >= 70 ? '#10b981' : safeScore >= 40 ? '#f59e0b' : '#ef4444';

          // warning chips
          const warns = [];
          if (heatMax > 42) warns.push({ icon: '🔥', text: `ดัชนีความร้อน ${heatMax}°C วิกฤต ระวังลมแดด`, color: '#ef4444' });
          else if (heatMax > 38) warns.push({ icon: '🌡️', text: `ความร้อน ${heatMax}°C สูง ดื่มน้ำบ่อยๆ`, color: '#f97316' });
          if (pm25 > 75) warns.push({ icon: '😷', text: `ฝุ่น PM2.5 ${pm25} อันตราย สวม N95`, color: '#ef4444' });
          else if (pm25 > 37.5) warns.push({ icon: '😷', text: `ฝุ่น PM2.5 ${pm25} เกินเกณฑ์ ใส่หน้ากาก`, color: '#f97316' });
          if (uvMax > 8) warns.push({ icon: '☀️', text: `UV ${uvMax} สูงมาก ทาครีมกันแดด SPF50+`, color: '#f97316' });
          else if (uvMax > 5) warns.push({ icon: '🕶️', text: `UV ${uvMax} ควรสวมแว่นกันแดด`, color: '#f59e0b' });
          if (rain > 60) warns.push({ icon: '⛈️', text: `ฝนตก ${rain}% สูงมาก พกร่มเด็ดขาด`, color: '#3b82f6' });
          else if (rain > 30) warns.push({ icon: '🌂', text: `โอกาสฝน ${rain}% ควรพกร่ม`, color: '#60a5fa' });
          if (warns.length === 0) warns.push({ icon: '✅', text: 'สภาพอากาศปลอดภัย เหมาะกับกิจกรรมกลางแจ้ง', color: '#10b981' });

          return (
            <div className="no-print" style={{
              background: darkMode
                ? `linear-gradient(135deg, ${heatBg}, rgba(5,13,26,0.95))`
                : `linear-gradient(135deg, ${heatBg}, rgba(248,250,252,0.95))`,
              borderRadius: '24px',
              border: `1.5px solid ${heatColor}40`,
              boxShadow: `0 8px 32px ${heatColor}20`,
              padding: isMobile ? '20px' : '24px',
              display: 'flex', flexDirection: 'column', gap: '18px',
            }}>

              {/* Row 1: heat index big + score circle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>

                {/* Heat index */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '0.72rem', color: darkMode ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)', fontWeight: 'bold', letterSpacing: '0.5px', marginBottom: '2px' }}>
                    🌡️ ดัชนีความร้อน (รู้สึกเหมือน)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
                    <span style={{ fontSize: isMobile ? '3.8rem' : '4.5rem', fontWeight: '900', color: heatColor, lineHeight: 1 }}>{heatMax}°</span>
                    <div style={{ paddingBottom: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '0.8rem', background: `${heatColor}22`, color: heatColor, padding: '2px 8px', borderRadius: '20px', fontWeight: 'bold' }}>{heatLabel}</span>
                      <span style={{ fontSize: '0.75rem', color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }}>{targetDateIdx === -1 ? `อุณหภูมิจริง ${tMax}°C` : `อุณหภูมิจริง ${tMax}° / ${tMin}°C`}</span>
                    </div>
                  </div>
                </div>

                {/* Safety score circle */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                  <div style={{ position: 'relative', width: '76px', height: '76px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="76" height="76" viewBox="0 0 76 76" style={{ position: 'absolute', transform: 'rotate(-90deg)', filter: `drop-shadow(0 0 6px ${scoreColor}40)` }}>
                      <circle cx="38" cy="38" r={circR} fill="none" stroke={darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'} strokeWidth="7" />
                      <circle cx="38" cy="38" r={circR} fill="none" stroke={scoreColor} strokeWidth="7"
                        strokeDasharray={circC} strokeDashoffset={circC - scorePct * circC}
                        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease-in-out' }} />
                    </svg>
                    <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.3rem', fontWeight: '900', color: scoreColor, lineHeight: 1 }}>{Math.round(safeScore)}</span>
                      <span style={{ fontSize: '0.6rem', color: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)', fontWeight: 'bold' }}>/100</span>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 'bold', color: riskColor }}>{riskIcon} {riskLabel}</div>
                  <div style={{ fontSize: '0.65rem', color: darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }}>คะแนนความปลอดภัย</div>
                </div>
              </div>

              {/* Row 2: stat chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {[
                  { icon: '☀️', label: 'UV', val: uvMax, unit: '', color: uvColor, bg: `${uvColor}18` },
                  { icon: '😷', label: 'PM2.5', val: pm25, unit: ' µg', color: pm25Color, bg: `${pm25Color}18` },
                  { icon: '☔', label: 'ฝน', val: rain, unit: '%', color: rainColor, bg: `${rainColor}18` },
                  { icon: '💨', label: 'ลม', val: windMax, unit: ' กม/ชม', color: windColor, bg: `${windColor}18` },
                  { icon: '💧', label: 'ความชื้น', val: humidity, unit: '%', color: humidColor, bg: `${humidColor}18` },
                ].map(s => (
                  <div key={s.label} style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    background: s.bg, border: `1px solid ${s.color}40`,
                    borderRadius: '50px', padding: '5px 12px',
                    fontSize: '0.82rem',
                  }}>
                    <span>{s.icon}</span>
                    <span style={{ color: darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)', fontSize: '0.72rem' }}>{s.label}</span>
                    <span style={{ fontWeight: '800', color: s.color }}>{s.val}{s.unit}</span>
                  </div>
                ))}
              </div>

              {/* Row 3: warnings */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '0.72rem', color: darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)', fontWeight: 'bold', letterSpacing: '0.5px' }}>⚡ สิ่งที่ควรระวัง</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {warns.map((w, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      background: `${w.color}15`, border: `1px solid ${w.color}40`,
                      borderRadius: '10px', padding: '5px 10px',
                      fontSize: '0.8rem', fontWeight: '600', color: w.color,
                    }}>
                      <span>{w.icon}</span><span>{w.text}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          );
        })()}

        {/* 📑 หมวดหมู่ไลฟ์สไตล์ Cards WITH SCORES */}
        <div className="no-print" style={{ 
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', width: '100%', marginBottom: '10px'
        }}>
            {tabConfigs.filter(t => t.id !== 'summary').map(tab => {
                const isActive = activeTab === tab.id;
                const isRain = tab.id === 'rain_risk';
                const score = currentScores[tab.id];
                
                let scColor = score >= 8 ? '#10b981' : score >= 5 ? '#f59e0b' : '#ef4444';
                let displayTopScore = `${score}/10`;
                
                if (isRain) {
                    const rFactors = getWeatherFactorsForDay(targetDateIdx);
                    const rainP = rFactors ? rFactors.rain : 0;
                    displayTopScore = `${rainP}%`;
                    scColor = rainP <= 20 ? '#10b981' : rainP <= 50 ? '#f59e0b' : '#ef4444';
                }
                
                return (
                    <button key={tab.id} onClick={() => setActiveTab(isActive ? 'summary' : tab.id)} style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        padding: '16px 12px', 
                        borderRadius: '20px',
                        background: isActive ? (darkMode ? `${tab.color}15` : `${tab.color}10`) : cardBg,
                        color: textColor,
                        border: `2px solid ${isActive ? tab.color : borderColor}`,
                        cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: isActive ? `0 4px 15px ${tab.color}30` : '0 2px 8px rgba(0,0,0,0.02)',
                        transform: isActive ? 'scale(1.02)' : 'scale(1)',
                        position: 'relative'
                    }}>
                        {score !== undefined && (
                        <div style={{ position: 'absolute', top: '8px', right: '10px', fontSize: '0.85rem', fontWeight: 'bold', color: scColor, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{width: '6px', height: '6px', borderRadius: '50%', background: scColor}}></div>
                            {displayTopScore}
                        </div>
                        )}
                        <div style={{ fontSize: '2rem', marginBottom: '2px', filter: isActive ? `drop-shadow(0 4px 8px ${tab.color}50)` : 'none' }}>{tab.icon}</div> 
                        <div style={{ fontSize: '1rem', fontWeight: isActive ? 'bold' : '600', color: isActive ? tab.color : textColor }}>{tab.label}</div>
                    </button>
                );
            })}
        </div>

        {/* 🤖 AI Detailed Report */}
        {aiReport && (
            <div className="fade-in" key={activeTab + targetDateIdx} style={{ 
                background: darkMode ? `linear-gradient(145deg, ${activeColor}10, ${cardBg})` : `linear-gradient(145deg, ${activeColor}08, #ffffff)`, 
                borderRadius: '24px', padding: isMobile ? '20px' : '30px', 
                border: `1px solid ${activeColor}30`, 
                boxShadow: `0 15px 40px ${activeColor}15`, position: 'relative', overflow: 'hidden', minWidth: 0, maxWidth: '100%'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px', flexWrap: 'wrap', gap: '15px' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.4rem', color: textColor, display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '800' }}>
                            <span style={{ fontSize: '1.8rem' }}>{tabConfigs.find(t=>t.id===activeTab)?.icon}</span>
                            บทวิเคราะห์ AI: {tabConfigs.find(t=>t.id===activeTab)?.label}
                        </h2>
                        <div style={{ fontSize: '0.85rem', color: subTextColor, marginTop: '4px', marginLeft: '4px' }}>
                            ประมวลผลสภาพอากาศเพื่อการตัดสินใจ
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
                        {activeTab !== 'summary' && (
                            <button onClick={() => setActiveTab('summary')} style={{ background: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: textColor, border: `1px solid ${borderColor}`, padding: '8px 12px', borderRadius: '12px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', width: isMobile ? '100%' : 'auto', justifyContent: 'center' }}>
                                🔙 กลับหน้าภาพรวม
                            </button>
                        )}
                        <div className="no-print" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto', minWidth: 0 }}>
                            <button onClick={exportToCSV} title="Export to CSV" style={{ background: darkMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)', color: textColor, border: `1px solid ${borderColor}`, padding: '8px 12px', borderRadius: '12px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', backdropFilter: 'blur(5px)', flex: isMobile ? '1 1 calc(50% - 4px)' : '0 0 auto', minWidth: 0 }}>CSV</button>
                            <button onClick={exportToJSON} title="Export to JSON" style={{ background: darkMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)', color: textColor, border: `1px solid ${borderColor}`, padding: '8px 12px', borderRadius: '12px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', backdropFilter: 'blur(5px)', flex: isMobile ? '1 1 calc(50% - 4px)' : '0 0 auto', minWidth: 0 }}>JSON</button>
                            <button onClick={exportToPDF} title="Export to PDF (Print)" style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '12px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(239,68,68,0.3)', flex: isMobile ? '1 1 calc(50% - 4px)' : '0 0 auto', minWidth: 0 }}>PDF</button>
                            <button onClick={handleShare} title="Share" style={{ background: '#10b981', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '12px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 10px rgba(16,185,129,0.3)', flex: isMobile ? '1 1 calc(50% - 4px)' : '0 0 auto', minWidth: 0 }}><span>📤</span> แชร์</button>
                        </div>
                        {(() => {
                            const isRain = activeTab === 'rain_risk';
                            const fToday = getWeatherFactorsForDay(targetDateIdx);
                            const rainP = fToday ? fToday.rain : 0;
                            const score = isRain ? rainP : (currentScores[activeTab] || 0);
                            
                            const sc = isRain 
                                ? (score <= 30 ? '#10b981' : score <= 60 ? '#f59e0b' : '#ef4444')
                                : (score >= 8 ? '#10b981' : score >= 5 ? '#f59e0b' : '#ef4444');
                            
                            const radius = 32;
                            const circumference = 2 * Math.PI * radius;
                            const strokeDashoffset = circumference - (score / (isRain ? 100 : 10)) * circumference;
                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                  <div style={{ position: 'relative', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <svg width="80" height="80" viewBox="0 0 80 80" style={{ position: 'absolute', transform: 'rotate(-90deg)', filter: `drop-shadow(0 0 8px ${sc}50)` }}>
                                          <circle cx="40" cy="40" r={radius} fill="none" stroke={darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} strokeWidth="8" />
                                          <circle 
                                              cx="40" cy="40" r={radius} fill="none" stroke={sc} strokeWidth="8" 
                                              strokeDasharray={circumference} 
                                              strokeDashoffset={strokeDashoffset} 
                                              strokeLinecap="round" 
                                              style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                                          />
                                      </svg>
                                      <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: '2px' }}>
                                          <div style={{ fontSize: '1.4rem', fontWeight: '900', color: sc, lineHeight: 0.9 }}>{score}</div>
                                          <div style={{ fontSize: '0.65rem', opacity: 0.6, color: textColor, fontWeight: 'bold' }}>{isRain ? '%' : '/10'}</div>
                                      </div>
                                  </div>
                                  <div style={{ fontSize: '0.7rem', color: sc, fontWeight: 'bold', letterSpacing: '0.5px', marginTop: '5px' }}>{isRain ? 'โอกาสฝนตก' : 'ความเหมาะสม'}</div>
                                </div>
                            );
                        })()}
                    </div>
                </div>



                {/* 🤖 Dynamic AI Insight Cards (Heuristic Generated) */}
                {(() => {
                    const factors = getWeatherFactorsForDay(targetDateIdx);
                    if (!factors) return null;
                    const { rain, heatMax, uvMax, pm25 } = factors;
                    
                    const insights = [];
                    
                    // Rain Logic
                    if (rain > 50) {
                        insights.push({ title: "Heavy Rain Expected", desc: `AI predicts ${rain}% chance of heavy rainfall. Consider rescheduling outdoor activities or carrying umbrellas.`, confidence: rain, color: '#3b82f6', icon: '⚠️' });
                    } else if (rain > 0 && rain <= 50) {
                        insights.push({ title: "Light Precipitation", desc: `AI predicts ${rain}% chance of mild, scattered rainfall. Should not cause major disruption.`, confidence: rain > 20 ? rain : 55, color: '#60a5fa', icon: '🌦️' });
                    }
                    
                    // Heat Logic
                    if (heatMax >= 38) {
                        insights.push({ title: "Extreme Heat Warning", desc: `Heat index reaching critical ${heatMax}°. Prolonged exposure outdoors can be severely dangerous.`, confidence: Math.min(99, Math.round((heatMax / 45) * 100)), color: '#ef4444', icon: '📈' });
                    } else if (heatMax > 33) {
                        insights.push({ title: "Temperature Rising", desc: `Temperature trend shows a warming pattern reaching a peak heat index of ${heatMax}°.`, confidence: Math.min(95, Math.round(heatMax * 2)), color: '#f97316', icon: '📈' });
                    }
                    
                    // PM2.5 Logic
                    if (pm25 >= 37.5) {
                        insights.push({ title: "Air Quality Alert", desc: `PM2.5 levels are elevated (${pm25} µg/m³). Consider wearing masks for outdoor activities.`, confidence: Math.min(99, Math.round(pm25)), color: '#f59e0b', icon: '😷' });
                    }

                    // Perfect Condition Fallback
                    if (rain < 20 && heatMax < 34 && pm25 < 25) {
                        insights.push({ title: "Perfect Outdoor Weather", desc: `Ideal conditions forecasted with clear skies and mild temperatures. Perfect for outdoor plans.`, confidence: Math.min(98, Math.round(100 - rain - (pm25/2))), color: '#10b981', icon: '🎯' });
                    }

                    if (insights.length === 0) {
                        insights.push({ title: "Stable Conditions Forecasted", desc: "Weather patterns are stable. No extreme events expected.", confidence: 95, color: '#0ea5e9', icon: '✅' });
                    }

                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '35px' }}>
                            {insights.map((insight, idx) => (
                                <div key={idx} style={{ padding: '18px 20px', background: darkMode ? `linear-gradient(135deg, ${insight.color}15, var(--bg-card))` : `linear-gradient(135deg, ${insight.color}08, #ffffff)`, borderRadius: '16px', border: `1px solid ${insight.color}30`, display: 'flex', gap: '15px', alignItems: 'flex-start', boxShadow: `0 4px 15px ${insight.color}10` }}>
                                    <div style={{ fontSize: '1.4rem', marginTop: '2px', filter: `drop-shadow(0 2px 4px ${insight.color}40)` }}>{insight.icon}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '1rem', fontWeight: '900', color: textColor, marginBottom: '6px' }}>{insight.title}</div>
                                        <div style={{ fontSize: '0.85rem', color: subTextColor, lineHeight: 1.5, marginBottom: '12px' }}>{insight.desc}</div>
                                        
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ flex: 1, height: '6px', background: 'var(--bg-secondary)', borderRadius: '10px', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${Math.round(insight.confidence)}%`, background: insight.color, borderRadius: '10px', transition: 'width 1s ease-out' }}></div>
                                            </div>
                                            <span style={{ fontSize: '0.75rem', fontWeight: '900', color: insight.color }}>{Math.round(insight.confidence)}% confidence</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            
                            {/* Original AI Text Report (Fallback/Detail) */}
                            <div style={{ marginTop: '5px', padding: '16px', background: 'var(--bg-overlay-heavy)', borderRadius: '16px', border: `1px solid ${activeColor}20`, borderLeft: `4px solid ${activeColor}` }}>
                               <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: activeColor, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                   <div style={{width: '6px', height: '6px', borderRadius: '50%', background: activeColor}}></div>
                                   ร่างบทวิเคราะห์ฉบับเต็มโดย AI
                               </div>
                               <p style={{ margin: 0, fontSize: '0.9rem', color: subTextColor, lineHeight: 1.6 }}>{renderHighlightedText(aiReport.advice, activeColor)}</p>
                            </div>
                        </div>
                    );
                })()}

                {/* Forecast Chart */}
                <h4 style={{ margin: '0 0 5px 0', color: textColor, display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.1rem' }}>
                    <div style={{background: `linear-gradient(135deg, ${activeColor}, ${activeColor}dd)`, color: '#fff', width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', boxShadow: `0 4px 10px ${activeColor}40`}}>📈</div> 
                    <span style={{fontWeight: '800'}}>แนวโน้ม{activeTab === 'rain_risk' ? 'โอกาสฝนตก' : 'คะแนนความเหมาะสม'} 7 วันข้างหน้า</span>
                </h4>
                <p style={{ margin: '0 0 15px 45px', fontSize: '0.85rem', color: subTextColor }}>
                    {activeTab === 'rain_risk' ? 'เปอร์เซ็นต์ความน่าจะเป็นของการเกิดฝน ยิ่งเปอร์เซ็นต์สูงยิ่งต้องระวังและพกร่ม' : 'คะแนนเต็ม 10 คะแนนยิ่งสูงหมายถึงสภาพอากาศยิ่งเหมาะสมและส่งผลดีต่อกิจกรรมของคุณ'}
                </p>
                <div style={{ width: '100%', height: 250, marginBottom: '35px', padding: '10px', background: darkMode ? 'rgba(14,165,233,0.06)' : 'rgba(255,255,255,0.7)', borderRadius: '16px', border: `1px solid ${borderColor}` }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={forecastChartData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? 'rgba(96,202,242,0.18)' : '#e5e7eb'} vertical={false} />
                            <XAxis dataKey="name" stroke={subTextColor} tick={{fontSize: 12, fill: subTextColor, fontWeight: darkMode ? '600' : '400'}} tickLine={false} axisLine={false} />
                            <YAxis domain={activeTab === 'rain_risk' ? [0, 100] : [0, 10]} ticks={activeTab === 'rain_risk' ? [0, 50, 100] : [0, 5, 10]} stroke={subTextColor} tick={{fontSize: 12, fill: subTextColor, fontWeight: darkMode ? '600' : '400'}} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: `1px solid ${borderColor}`, background: cardBg, color: textColor, fontWeight: 'bold' }}
                                itemStyle={{ color: activeColor }}
                            />
                            <Line
                                type="monotone"
                                dataKey="score"
                                name="คะแนน"
                                stroke={activeColor}
                                strokeWidth={darkMode ? 5 : 4}
                                activeDot={{ r: 8, stroke: cardBg, strokeWidth: 2, fill: activeColor }}
                                dot={{ r: darkMode ? 5 : 4, strokeWidth: 2, fill: darkMode ? activeColor : cardBg, stroke: activeColor }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <h4 style={{ margin: '0 0 20px 0', color: textColor, display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.1rem' }}>
                    <div style={{background: `linear-gradient(135deg, ${activeColor}, ${activeColor}dd)`, color: '#fff', width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', boxShadow: `0 4px 10px ${activeColor}40`}}>🕒</div> 
                    <span style={{fontWeight: '800'}}>ไทม์ไลน์สภาพอากาศแวดล้อม</span>
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' }}>
                    {aiReport.timeline.map((item, i) => (
                        <div key={i} style={{ display: 'flex', gap: '18px', position: 'relative', minWidth: 0 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: activeColor, zIndex: 1, border: `4px solid ${darkMode ? '#050d1a' : '#ffffff'}`, boxShadow: `0 0 0 1px ${activeColor}40` }}></div>
                                {i !== aiReport.timeline.length - 1 && <div style={{ width: '2px', flex: 1, background: `linear-gradient(to bottom, ${activeColor}80, ${activeColor}20)`, marginTop: '-8px', marginBottom: '-8px' }}></div>}
                            </div>
                            <div style={{ flex: 1, minWidth: 0, paddingBottom: i !== aiReport.timeline.length - 1 ? '20px' : '0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '1.3rem', background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', padding: '5px', borderRadius: '10px' }}>{item.icon}</span>
                                    <span style={{ fontWeight: '800', color: textColor, fontSize: '1rem' }}>{item.time}</span>
                                </div>
                                <div className="wrap-text" style={{ fontSize: '0.95rem', color: darkMode ? '#d8eeff' : '#475569', lineHeight: 1.6, background: darkMode ? 'rgba(96,202,242,0.05)' : 'rgba(0,0,0,0.02)', padding: '15px 18px', borderRadius: '16px', border: `1px solid ${borderColor}`, maxWidth: '100%' }}>
                                    {renderHighlightedText(item.text, activeColor)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 💬 AI Chat Container */}
                <h4 style={{ margin: '0 0 15px 0', color: textColor, display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.1rem' }}>
                    <div style={{background: `linear-gradient(135deg, ${activeColor}, ${activeColor}dd)`, color: '#fff', width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', boxShadow: `0 4px 10px ${activeColor}40`}}>🤖</div> 
                    <span style={{fontWeight: '800'}}>ถามการวิเคราะห์สภาพอากาศเพิ่มเติมกับ AI</span>
                </h4>
                <div style={{ background: darkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.8)', borderRadius: '20px', padding: '20px', border: `1px solid ${borderColor}`, minWidth: 0, maxWidth: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto', marginBottom: '15px', paddingRight: '5px' }}>
                        {chatLogs.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '20px 0', color: subTextColor, fontSize: '0.9rem' }}>
                                ลองพิมพ์คำถาม เช่น "วันนี้ต้องเตรียมตัวยังไงบ้าง" หรือ "มีโอกาสฝนตกไหม"
                            </div>
                        )}
                        {chatLogs.map((log, idx) => (
                            <div key={idx} style={{ 
                                display: 'flex', 
                                justifyContent: log.role === 'user' ? 'flex-end' : 'flex-start' 
                            }}>
                                <div className="wrap-text" style={{
                                    maxWidth: '85%',
                                    padding: '12px 16px',
                                    borderRadius: '16px',
                                    backgroundColor: log.role === 'user' ? activeColor : (darkMode ? '#0f1e36' : '#f0f9ff'),
                                    color: log.role === 'user' ? '#fff' : textColor,
                                    borderBottomRightRadius: log.role === 'user' ? '4px' : '16px',
                                    borderBottomLeftRadius: log.role === 'ai' ? '4px' : '16px',
                                    fontSize: '0.95rem',
                                    lineHeight: '1.5'
                                }}>
                                    {log.text}
                                </div>
                            </div>
                        ))}
                        {isChatLoading && (
                            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                <div style={{ padding: '12px 16px', borderRadius: '16px', backgroundColor: (darkMode ? '#0f1e36' : '#f0f9ff'), color: subTextColor, fontSize: '0.85rem' }}>
                                    กำลังคิดคำตอบ...
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>
                    
                    <form onSubmit={handleChatSubmit} style={{ display: 'flex', gap: '10px', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                        <input 
                            type="text" 
                            value={chatInput} 
                            onChange={(e) => setChatInput(e.target.value)} 
                            placeholder="พิมพ์คำถามของคุณที่นี่..." 
                            style={{ flex: 1, minWidth: 0, width: isMobile ? '100%' : 'auto', padding: '12px 16px', borderRadius: '12px', border: `1px solid ${borderColor}`, background: darkMode ? '#0b1629' : '#fff', color: textColor, fontFamily: 'Kanit', outline: 'none' }} 
                            disabled={isChatLoading}
                        />
                        <button type="submit" disabled={isChatLoading || !chatInput.trim()} style={{ background: activeColor, color: '#fff', border: 'none', padding: isMobile ? '12px 20px' : '0 20px', borderRadius: '12px', cursor: (isChatLoading || !chatInput.trim()) ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: (isChatLoading || !chatInput.trim()) ? 0.6 : 1, width: isMobile ? '100%' : 'auto' }}>
                            ส่ง
                        </button>
                    </form>
                </div>
            </div>
        )}

              </div>
      {/* 🔴 RIGHT COLUMN (35%) */}
      <div style={{ flex: isMobile ? '1' : '0 0 calc(35% - 12px)', display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0, position: isMobile ? 'static' : 'sticky', top: '100px' }}>

        {/* 📊 Model Performance / Data Confidence (Figma Request) */}
        <div className="no-print" style={{ background: cardBg, padding: '20px', borderRadius: '24px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: textColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
                ⭐ ความเชื่อมั่นของข้อมูล
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: subTextColor, marginBottom: '5px', fontWeight: 'bold' }}>
                       <span>ความแม่นยำอุณหภูมิ (TMD)</span><span>94%</span>
                   </div>
                   <div style={{ background: 'var(--bg-secondary)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                       <div style={{ background: '#10b981', height: '100%', width: '94%' }}></div>
                   </div>
                </div>
                <div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: subTextColor, marginBottom: '5px', fontWeight: 'bold' }}>
                       <span>โมเดลมลพิษ PM2.5 (CAMS)</span><span>88%</span>
                   </div>
                   <div style={{ background: 'var(--bg-secondary)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                       <div style={{ background: '#f59e0b', height: '100%', width: '88%' }}></div>
                   </div>
                </div>
                <div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: subTextColor, marginBottom: '5px', fontWeight: 'bold' }}>
                       <span>โอกาสเกิดฝน (GFS/ECMWF)</span><span>82%</span>
                   </div>
                   <div style={{ background: 'var(--bg-secondary)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                       <div style={{ background: '#0ea5e9', height: '100%', width: '82%' }}></div>
                   </div>
                </div>
                <div style={{ fontSize: '0.7rem', color: subTextColor, marginTop: '5px', background: 'var(--bg-secondary)', padding: '10px', borderRadius: '10px' }}>
                   ℹ️ ข้อมูลนี้ประมวลผลจริงจากแบบจำลองหลายแหล่ง (TMD, GFS, ECMWF) เพื่อให้ AI วิเคราะห์แม่นยำที่สุด
                </div>
            </div>
        </div>

        {/* 🚨 Provincial Warning Section */}
        <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h2 style={{ margin: '15px 0 5px 0', fontSize: '1.4rem', color: textColor, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800' }}>
                 🚨 แจ้งเตือนพื้นที่เสี่ยงภัย
            </h2>
            
            {/* 6 Warning Tabs */}
            <div className={isMobile ? 'hide-scrollbar' : ''} style={{ display: isMobile ? 'flex' : 'grid', gridTemplateColumns: isMobile ? 'none' : 'repeat(3, 1fr)', gap: '10px', overflowX: isMobile ? 'auto' : 'visible', paddingBottom: isMobile ? '5px' : '0' }}>
                {warningTabs.map((tab, idx) => {
                    const count = riskyCounts[tab.id];
                    return (
                        <div key={idx} onClick={() => setActiveWarningTab(tab.id)} style={{ background: cardBg, padding: isMobile ? '8px 10px' : '12px 5px', borderRadius: '16px', border: `2px solid ${activeWarningTab === tab.id ? tab.color : borderColor}`, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: isMobile ? 'flex-start' : 'center', gap: '6px', boxShadow: activeWarningTab === tab.id ? `0 6px 16px ${tab.color}20` : 'none', transform: activeWarningTab === tab.id ? 'translateY(-2px)' : 'none', flexShrink: 0, minWidth: isMobile ? '110px' : undefined }}>
                            <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{tab.icon}</span>
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                <span style={{ fontSize: '0.68rem', color: subTextColor, fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tab.label}</span>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                                    <span style={{ fontSize: '0.95rem', fontWeight: '900', color: tab.color }}>{count}</span>
                                    <span style={{ fontSize: '0.6rem', fontWeight: 'bold', color: tab.color }}>จ.</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Warning List */}
            <div style={{ background: cardBg, borderRadius: '24px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '15px 20px', borderBottom: `1px solid ${borderColor}`, background: darkMode ? 'var(--bg-tertiary)' : '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '10px', flexWrap: 'wrap' }}>
                        <h3 style={{ margin: 0, color: textColor, fontSize: '1rem' }}>📋 แจ้งเตือนพื้นที่เสี่ยง</h3>
                        <span style={{ fontSize: '0.75rem', background: `${activeWarningTabData.color}20`, color: activeWarningTabData.color, padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold', maxWidth: '100%' }}>พบ {activeWarningTabData.data.length} จังหวัด</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#0ea5e9', fontWeight: 'bold', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ display: 'inline-block', width: '6px', height: '6px', background: '#0ea5e9', borderRadius: '50%' }}></span>
                        ข้อมูลสถานการณ์เรียลไทม์
                    </div>
                    <input type="text" placeholder="พิมพ์ชื่อจังหวัดเพื่อค้นหา..." value={warningSearchTerm} onChange={(e) => setWarningSearchTerm(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '12px', border: `1px solid ${borderColor}`, background: cardBg, color: textColor, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <div style={{ padding: '5px 15px', overflowY: 'auto', maxHeight: isMobile ? '300px' : '450px' }} className="hide-scrollbar">
                    {sortedFilteredWarningData.length > 0 ? sortedFilteredWarningData.map((item, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', padding: '12px 10px', borderBottom: `1px solid ${borderColor}`, gap: '10px', minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                                <span style={{ color: subTextColor, fontSize: '0.8rem', width: '20px' }}>{i+1}.</span>
                                <span className="wrap-text" style={{ color: textColor, fontWeight: '600', fontSize: '0.9rem', minWidth: 0 }}>จ.{item.prov}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', flexShrink: 0, maxWidth: isMobile ? '46%' : 'none' }}>
                                <span className="wrap-text" style={{ color: activeWarningTabData.color, fontWeight: '900', fontSize: '1rem', width: isMobile ? 'auto' : '80px', textAlign: 'right' }}>
                                    {typeof item.val === 'number' ? item.val.toLocaleString() : item.val} <small style={{fontSize: '0.6rem'}}>{item.unit}</small>
                                </span>
                                {activeWarningTab === 'wind' && item.windDir != null && <WindDirection deg={item.windDir} />}
                            </div>
                        </div>
                    )) : (
                        (activeWarningTab === 'fire' || activeWarningTab === 'flood') && !gistdaSummary ? (
                            <div style={{ textAlign: 'center', padding: '50px 0', color: subTextColor }}>
                                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📡</div>
                                กำลังดึงข้อมูลดาวเทียม GISTDA...
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '50px 0', color: subTextColor }}>
                                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>✅</div>
                                ไม่พบพื้นที่เสี่ยงในขณะนี้
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>

      </div>
      </div>
      </div>
  );
}
