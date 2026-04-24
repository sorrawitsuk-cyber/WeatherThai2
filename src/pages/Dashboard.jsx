import React, { useContext, useState, useEffect, useMemo, useRef } from 'react';
import { WeatherContext } from '../context/WeatherContext';
import { useWeatherData } from '../hooks/useWeatherData';
import { useDraggableScroll } from '../hooks/useDraggableScroll';
import { getAqiTheme, getAlertBanner, getWeatherBackground, getBriefingText } from '../utils/weatherHelpers';
import heroBg from '../assets/hero.png';

import WeatherMetrics from '../components/Dashboard/WeatherMetrics';
import DailyForecast from '../components/Dashboard/DailyForecast';
import SunriseSunsetArc from '../components/Dashboard/SunriseSunsetArc';
import ActivityRecommendations from '../components/Dashboard/ActivityRecommendations';
import TopStats from '../components/Dashboard/TopStats';
import WeatherRadar from '../components/Dashboard/WeatherRadar';
import DisasterSummary from '../components/Dashboard/DisasterSummary';

function normalizeGeoData(data) {
  return Array.isArray(data) ? data : (data?.data || []);
}

export default function Dashboard() {
  const { stations, stationTemps, lastUpdated, amphoeData, tmdAvailable } = useContext(WeatherContext);
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [locationName, setLocationName] = useState('กำลังระบุตำแหน่ง...');
  
  const { weatherData, loadingWeather, fetchWeatherByCoords } = useWeatherData();

  const [geoData, setGeoData] = useState([]);
  const [geoError, setGeoError] = useState(false);
  const [selectedProv, setSelectedProv] = useState('');
  const [selectedDist, setSelectedDist] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [activeDetail, setActiveDetail] = useState(null);

  const hourlyScrollRef = useRef(null);
  const mainScrollRef = useRef(null);
  const forecastRef = useRef(null);
  const dailyRef = useRef(null);
  const warningsRef = useRef(null);
  const newsRef = useRef(null);
  const bottomStatsRef = useRef(null);
  const { isDragging: isHourlyDragging, events: hourlyScrollEvents } = useDraggableScroll(hourlyScrollRef);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setShowFilter(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Back to top scroll listener
  useEffect(() => {
    const container = mainScrollRef.current;
    if (!container) return;
    const handleScroll = () => {
      setShowBackToTop(container.scrollTop > 600);
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [loadingWeather]);

  useEffect(() => {
    if (amphoeData?.provinces || !selectedProv || geoData.length > 0 || geoError) return;

    let cancelled = false;
    fetch('/thai_geo.json')
      .then(res => res.json())
      .then(data => {
        if (!cancelled) setGeoData(normalizeGeoData(data));
      })
      .catch(() => {
        if (!cancelled) setGeoError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [amphoeData, selectedProv, geoData.length, geoError]);

  const sortedStations = useMemo(() => {
    return [...(stations || [])].sort((a, b) => a.areaTH.localeCompare(b.areaTH, 'th'));
  }, [stations]);

  // 🆕 ใช้ข้อมูลอำเภอจาก TMD API (ผ่าน Firebase) แทน thai_geo.json
  const currentAmphoes = useMemo(() => {
    if (!selectedProv) return [];
    // เข้า amphoeData จาก Firebase (ข้อมูล TMD)
    if (amphoeData?.provinces) {
      const cleanProv = selectedProv.replace('จังหวัด', '').trim();
      const provData = amphoeData.provinces[cleanProv] || amphoeData.provinces[selectedProv];
      if (provData?.amphoes) {
        return provData.amphoes.map((a, i) => ({
          id: i,
          name: String(a.n || '').trim(),
          lat: a.lat,
          lon: a.lon,
          tc: a.tc,
          rh: a.rh,
          ws: a.ws,
          rain: a.rain
        })).filter(a => a.name !== '').sort((a, b) => a.name.localeCompare(b.name, 'th'));
      }
    }
    // Fallback: thai_geo.json (เดิม)
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

  // --- 🇹🇭 ระบบคำนวณ Top 5 จาก Firebase (Today) ---
  const { top5Heat, top5Cool, top5PM25, top5Rain } = useMemo(() => {
    const heat = [], cool = [], pm25 = [], rain = [];
    (stations || []).forEach(st => {
      const name = st.areaTH.replace('จังหวัด','');
      const temp = Math.round(stationTemps?.[st.stationID]?.temp || -99);
      const coolTemp = Math.round(stationTemps?.[st.stationID]?.temp || 999);
      const pmVal = st.AQILast?.PM25?.value || 0;
      const rainVal = stationTemps?.[st.stationID]?.rainProb || 0;

      if (temp !== -99) heat.push({ name, val: temp });
      if (coolTemp !== 999) cool.push({ name, val: coolTemp });
      if (pmVal > 0) pm25.push({ name, val: pmVal });
      if (rainVal > 0) rain.push({ name, val: rainVal });
    });

    return {
      top5Heat: heat.sort((a, b) => b.val - a.val).slice(0, 5),
      top5Cool: cool.sort((a, b) => a.val - b.val).slice(0, 5),
      top5PM25: pm25.sort((a, b) => b.val - a.val).slice(0, 5),
      top5Rain: rain.sort((a, b) => b.val - a.val).slice(0, 5)
    };
  }, [stations, stationTemps]);

  // --- 🇹🇭 ระบบคำนวณ Top 5 (Yesterday) ---
  const { stationMaxYesterday } = useContext(WeatherContext);
  const { top5HeatY, top5CoolY, top5PM25Y, top5RainY } = useMemo(() => {
    const heat = [], cool = [], pm25 = [], rain = [];
    (stations || []).forEach(st => {
      const name = st.areaTH.replace('จังหวัด','');
      const maxObj = stationMaxYesterday?.[st.stationID] || {};
      
      const temp = maxObj.temp !== undefined ? Math.round(maxObj.temp) : -99;
      const coolTemp = maxObj.temp !== undefined ? Math.round(maxObj.temp) : 999;
      const pmVal = maxObj.pm25 !== undefined ? Math.round(maxObj.pm25) : 0;
      const rainVal = maxObj.rain !== undefined ? maxObj.rain : 0;

      if (temp !== -99) heat.push({ name, val: temp });
      if (coolTemp !== 999) cool.push({ name, val: coolTemp });
      if (pmVal > 0) pm25.push({ name, val: pmVal });
      if (rainVal > 0) rain.push({ name, val: rainVal });
    });

    return {
      top5HeatY: heat.sort((a, b) => b.val - a.val).slice(0, 5),
      top5CoolY: cool.sort((a, b) => a.val - b.val).slice(0, 5),
      top5PM25Y: pm25.sort((a, b) => b.val - a.val).slice(0, 5),
      top5RainY: rain.sort((a, b) => b.val - a.val).slice(0, 5)
    };
  }, [stations, stationMaxYesterday]);

  useEffect(() => {
    const fallbackToDefaultLocation = () => {
      fetchWeatherByCoords(13.75, 100.5); 
      setLocationName('กรุงเทพมหานคร');
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
          fetchLocationName(pos.coords.latitude, pos.coords.longitude);
        }, 
        (err) => { 
          console.warn("Geolocation error/timeout:", err.message);
          fallbackToDefaultLocation(); 
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
      );
    } else {
      fallbackToDefaultLocation();
    }
  }, [fetchWeatherByCoords]);

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
    } catch (e) { setLocationName('ตำแหน่งปัจจุบัน'); }
  };

  const handleProvChange = (e) => {
    const pName = e.target.value;
    setSelectedProv(pName); setSelectedDist('');
    const found = stations?.find(s => s.areaTH === pName);
    if (found) { 
      fetchWeatherByCoords(found.lat, found.long); 
      setLocationName(pName); 
    }
  };

  const handleDistChange = async (e) => {
    const dName = e.target.value;
    setSelectedDist(dName);
    if (!dName) return;
    setLocationName(`${dName}, ${selectedProv}`);
    
    // 🆕 ถ้าอำเภอมาจาก TMD — ใช้พิกัดตรงจาก TMD ไม่ต้อง geocode
    const amphoe = currentAmphoes.find(a => a.name === dName);
    if (amphoe?.lat && amphoe?.lon) {
      fetchWeatherByCoords(amphoe.lat, amphoe.lon);
      return;
    }
    // Fallback: Nominatim
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(dName + ' ' + selectedProv)}&limit=1`);
      const data = await res.json();
      if (data?.[0]) fetchWeatherByCoords(parseFloat(data[0].lat), parseFloat(data[0].lon));
    } catch (err) { console.error(err); }
  };

  // --- 🎨 UI Theme ---
  const appBg = 'var(--bg-app)'; 
  const cardBg = 'var(--bg-card)';
  const textColor = 'var(--text-main)'; 
  const borderColor = 'var(--border-color)';
  const subTextColor = 'var(--text-sub)'; 

  const lastUpdateText = lastUpdated ? new Date(lastUpdated).toLocaleString('th-TH') : '-';

  if (loadingWeather || !weatherData) return (
    <div className="loading-container" style={{ background: appBg, color: textColor }}>
        <div className="loading-spinner"></div>
        <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>กำลังประมวลผลข้อมูลสภาพอากาศ...</div>
        <div style={{ fontSize: '0.85rem', color: subTextColor, marginTop: '5px' }}>เตรียมพร้อมข้อมูลพื้นที่ของคุณ</div>
    </div>
  );

  const { current, hourly, daily, coords } = weatherData;
  
  const aqiTheme = getAqiTheme(current?.pm25);
  
  const isRaining = current?.rainProb > 30;
  const isHot = current?.feelsLike >= 38;
  const currentHour = new Date().getHours();
  const isNight = currentHour >= 18 || currentHour < 6; 

  const weatherIcon = isRaining ? '🌧️' : (isNight ? '🌙' : (isHot ? '☀️' : '🌤️'));
  const weatherText = isRaining ? 'มีโอกาสฝนตก' : (isNight ? 'ท้องฟ้าโปร่งยามค่ำคืน' : (isHot ? 'แดดร้อนจัด' : 'อากาศดี มีเมฆบางส่วน'));
  
  const bgGradient = getWeatherBackground(isNight, isRaining, isHot);
  const alertBanner = getAlertBanner(current);
  const nowMs = Date.now();
  const startIdx = hourly?.time?.findIndex(t => new Date(t).getTime() >= nowMs - 3600000) || 0;
  const chartData = (hourly?.time?.slice(startIdx, startIdx + 24) || []).map((t, i) => {
    const rIdx = startIdx + i;
    const hour = new Date(t).getHours();
    const isNightHour = hour >= 18 || hour < 6;
    const rainP = hourly?.precipitation_probability?.[rIdx] || 0;
    const rainA = hourly?.precipitation?.[rIdx] || 0;
    
    let icon = isNightHour ? '🌙' : '☀️';
    if (rainP > 70 || rainA > 5) icon = '⛈️';
    else if (rainP > 30 || rainA > 1) icon = '🌧️';
    else if (rainP > 10 || rainA > 0) icon = isNightHour ? '☁️' : '🌥️';
    else if (rainP > 0) icon = isNightHour ? '☁️' : '🌤️';

    return {
      time: hour.toString().padStart(2, '0') + ':00',
      temp: Math.round(hourly?.temperature_2m?.[rIdx] || 0),
      feelsLike: Math.round(hourly?.apparent_temperature?.[rIdx] || 0),
      rain: rainP,
      rainAmount: rainA,
      pm25: Math.round(hourly?.pm25?.[rIdx] || 0),
      icon: icon
    };
  });

  const maxTemp = Math.round(daily?.temperature_2m_max?.[0] || 0);
  const dailyRainProb = daily?.precipitation_probability_max?.[0] || 0;
  
  const tomorrowMaxTemp = daily?.temperature_2m_max?.[1] ? Math.round(daily.temperature_2m_max[1]) : null;
  const tomorrowRainProb = daily?.precipitation_probability_max?.[1] || 0;

  const briefingText = getBriefingText(weatherText, current?.temp, current?.feelsLike, maxTemp, dailyRainProb, current?.pm25, currentHour, tomorrowMaxTemp, tomorrowRainProb);

  // Date/time formatting
  const now = new Date();
  const thaiDate = now.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const thaiTime = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  const currentRainProb = Math.round(current?.rainProb || chartData?.[0]?.rain || 0);
  const currentRainAmount = chartData?.[0]?.rainAmount || current?.precipitation || 0;
  const heroStatusChips = [
    { label: 'โอกาสฝนวันนี้', value: `${currentRainProb}%`, tone: '#2563eb' },
    { label: 'คุณภาพอากาศ', value: aqiTheme.text, tone: current?.pm25 > 37.5 ? '#f97316' : current?.pm25 > 25 ? '#eab308' : '#22c55e' },
    { label: 'รู้สึกเหมือน', value: `${Math.round(current?.feelsLike || 0)}°C`, tone: current?.feelsLike >= 38 ? '#ef4444' : '#0ea5e9' },
  ];
  const surfaceCardStyle = {
    background: `linear-gradient(180deg, color-mix(in srgb, ${cardBg} 98%, #ffffff), color-mix(in srgb, ${cardBg} 94%, var(--bg-secondary)))`,
    border: `1px solid ${borderColor}`,
    borderRadius: '22px',
    boxShadow: isMobile ? '0 14px 28px rgba(2, 6, 23, 0.08)' : '0 18px 42px rgba(15, 23, 42, 0.07)',
  };
  const warningCards = [
    {
      title: isHot ? 'คลื่นความร้อน' : 'อากาศร้อน',
      level: isHot ? 'ระดับเฝ้าระวัง: สูงมาก' : 'ระดับเฝ้าระวัง: ปานกลาง',
      area: 'พื้นที่: ภาคกลาง ภาคตะวันออก',
      time: 'ถึง 17:00 น.',
      icon: '🌡️',
      tone: '#ef4444',
    },
    {
      title: dailyRainProb >= 50 ? 'ฝนฟ้าคะนอง' : 'ฝนบางพื้นที่',
      level: dailyRainProb >= 50 ? 'ระดับเฝ้าระวัง: ปานกลาง' : 'ระดับเฝ้าระวัง: ต่ำ',
      area: `พื้นที่: ${locationName}`,
      time: 'ถึง 22:00 น.',
      icon: '⚡',
      tone: '#f59e0b',
    },
  ];
  const newsItems = [
    { title: 'กรมอุตุฯ เตือน 16-18 พ.ค. ฝนตกหนักหลายพื้นที่', date: '16 พ.ค. 2567 08:30 น.', image: 'linear-gradient(135deg, #475569, #cbd5e1)' },
    { title: 'อากาศร้อนจัดต่อเนื่อง แนะนำเลี่ยงกิจกรรมกลางแจ้ง', date: '16 พ.ค. 2567 07:15 น.', image: 'linear-gradient(135deg, #f97316, #fde68a)' },
    { title: 'เช็กค่าฝุ่น PM2.5 รายพื้นที่ ประจำวันที่ 16 พ.ค. 2567', date: '16 พ.ค. 2567 06:45 น.', image: 'linear-gradient(135deg, #94a3b8, #334155)' },
  ];
  const bottomInsightCards = [
    { title: 'คุณภาพอากาศทั่วประเทศ', items: (top5PM25 || []).slice(0, 5).map((item) => ({ label: item.name, value: item.val, suffix: '', tone: item.val > 37 ? '#f97316' : '#22c55e' })) },
    { title: 'จังหวัดที่ร้อนที่สุดวันนี้', items: (top5Heat || []).slice(0, 5).map((item) => ({ label: item.name, value: item.val, suffix: '°C', tone: '#ef4444' })) },
    { title: 'ฝนมากที่สุด (24 ชม.)', items: (top5Rain || []).slice(0, 5).map((item) => ({ label: item.name, value: item.val, suffix: '%', tone: '#2563eb' })) },
  ];
  const quickStatCards = [
    { label: 'อุณหภูมิสูงสุด/ต่ำสุด', value: `${maxTemp}° / ${Math.round(daily?.temperature_2m_min?.[0] || current?.temp || 0)}°`, note: 'วันนี้', icon: '🌡️', tone: '#ef4444' },
    { label: 'UV Index', value: Math.round(current?.uv || 0), note: current?.uv > 8 ? 'สูงมาก' : current?.uv > 5 ? 'สูง' : 'ปานกลาง', icon: '☀️', tone: '#f59e0b' },
    { label: 'Heat Index', value: `${Math.round(current?.feelsLike || 0)}°C`, note: isHot ? 'ร้อนจัด' : 'เฝ้าระวัง', icon: '🔥', tone: '#f97316' },
    { label: 'ฝนวันนี้', value: `${Number(currentRainAmount || 0).toFixed(1)} mm`, note: `โอกาส ${dailyRainProb}%`, icon: '💧', tone: '#3b82f6' },
    { label: 'ลม', value: `${Math.round(current?.windSpeed || 0)} km/h`, note: current?.windDirection != null ? `ทิศ ${current.windDirection}°` : 'ข้อมูลล่าสุด', icon: '💨', tone: '#06b6d4' },
    { label: 'ความชื้น', value: `${Math.round(current?.humidity || 0)}%`, note: current?.humidity > 75 ? 'ชื้น' : 'สมดุล', icon: '💦', tone: '#0ea5e9' },
  ];
  const aiInsightCards = [
    {
      title: dailyRainProb >= 50 ? 'ฝนหนักช่วงเย็นวันนี้' : 'ฝนยังไม่เด่นมาก',
      text: dailyRainProb >= 50 ? 'ควรเผื่อเวลาเดินทางช่วงเย็นและเตรียมร่มไว้ใกล้มือ' : 'ยังเดินทางได้ตามปกติ แต่เช็กเมฆฝนอีกครั้งก่อนออกจากบ้าน',
      meta: `${currentRainProb}% วันนี้`,
      icon: '🌧️',
      tone: '#2563eb',
    },
    {
      title: current?.pm25 > 37.5 ? 'PM2.5 สูงกว่าปกติ' : 'PM2.5 อยู่ในเกณฑ์รับได้',
      text: current?.pm25 > 37.5 ? 'ลดกิจกรรมกลางแจ้งช่วงเช้า โดยเฉพาะกลุ่มเสี่ยงและเด็กเล็ก' : 'กิจกรรมกลางแจ้งทำได้ แต่ยังควรติดตามค่าฝุ่นรายชั่วโมง',
      meta: `${Math.round(current?.pm25 || 0)} µg/m³`,
      icon: '😷',
      tone: current?.pm25 > 37.5 ? '#f97316' : '#22c55e',
    },
    {
      title: isHot ? 'ความร้อนสูง' : 'ความร้อนปานกลาง',
      text: isHot ? 'หลีกเลี่ยงแดดจัดช่วงบ่าย ดื่มน้ำบ่อย และพักในที่ร่ม' : 'อากาศยังใช้งานชีวิตประจำวันได้ แต่อุณหภูมิช่วงบ่ายยังควรระวัง',
      meta: `Heat Index ${Math.round(current?.feelsLike || 0)}°C`,
      icon: '🌡️',
      tone: '#ef4444',
    },
  ];
  const techStackItems = ['Next.js', 'Tailwind CSS', 'Chart.js / Recharts', 'Mapbox / Leaflet', 'OpenWeather API', 'Air Quality API'];

  const scrollToTop = () => {
    mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openSection = (section, detail = section) => {
    setActiveDetail(detail);
    const refs = {
      forecast: forecastRef,
      daily: dailyRef,
      warnings: warningsRef,
      news: newsRef,
      stats: bottomStatsRef,
    };
    window.setTimeout(() => {
      refs[section]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const detailPanels = {
    forecast: {
      title: 'พยากรณ์รายชั่วโมงแบบละเอียด',
      text: 'แสดงอุณหภูมิ โอกาสฝน สัญลักษณ์สภาพอากาศ และแนวโน้มฝนใน 24 ชั่วโมงถัดไปแบบเลื่อนดูได้',
      items: chartData.slice(0, 12).map((item) => `${item.time}: ${item.temp}°C, ฝน ${item.rain}%, PM2.5 ${item.pm25}`),
    },
    daily: {
      title: 'รายละเอียดพยากรณ์ 7 วัน',
      text: 'สรุปแนวโน้มอุณหภูมิ ฝน ค่าความร้อน และ PM2.5 รายวันสำหรับวางแผนล่วงหน้า',
      items: Array.from({ length: 7 }, (_, index) => {
        const fallbackDate = new Date();
        fallbackDate.setDate(fallbackDate.getDate() + index);
        const time = daily?.time?.[index] || fallbackDate.toISOString();
        const day = index === 0 ? 'วันนี้' : new Date(time).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'short' });
        return `${day}: ${Math.round(daily?.temperature_2m_min?.[index] || 0)}-${Math.round(daily?.temperature_2m_max?.[index] || 0)}°C, ฝน ${daily?.precipitation_probability_max?.[index] || 0}%`;
      }),
    },
    warnings: {
      title: 'เตือนภัยทั้งหมด',
      text: 'รวมคำเตือนที่ระบบประเมินจากความร้อน โอกาสฝน และพื้นที่ปัจจุบัน',
      items: warningCards.map((item) => `${item.title}: ${item.level} ${item.area} ${item.time}`),
    },
    news: {
      title: 'ข่าวและบทความทั้งหมด',
      text: 'รายการข่าวเด่นจำลองสำหรับหน้า dashboard เพื่อให้ปุ่มดูทั้งหมดใช้งานได้ในหน้าเดียว',
      items: newsItems.map((item) => `${item.title} (${item.date})`),
    },
    stats: {
      title: 'สรุปสถิติทั้งหมด',
      text: 'รวมจังหวัดเด่นด้าน PM2.5 อุณหภูมิ และฝนจากข้อมูลสถานีล่าสุด',
      items: bottomInsightCards.flatMap((card) => card.items.map((item) => `${card.title}: ${item.label} ${item.value}${item.suffix}`)),
    },
  };
  const currentDetail = activeDetail ? detailPanels[activeDetail] : null;

  const heroCard = (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{ background: isMobile ? bgGradient : `linear-gradient(135deg, rgba(7, 89, 174, 0.94) 0%, rgba(37, 99, 235, 0.88) 52%, rgba(14, 165, 233, 0.52) 100%), url(${heroBg})`, backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: isMobile ? '22px' : '20px', padding: isMobile ? '20px' : '24px', color: '#fff', boxShadow: isMobile ? '0 20px 40px rgba(0,0,0,0.2)' : 'none', display: 'flex', flexDirection: 'column', transition: 'background 0.5s ease', position: 'relative', flex: 1, minHeight: isMobile ? 'auto' : 300, overflow: 'hidden' }}>
        {!isMobile && (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.7))', pointerEvents: 'none' }} />
        )}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr auto' : 'minmax(220px, 1fr) minmax(240px, 0.82fr) auto', alignItems: 'start', width: '100%', marginBottom: isMobile ? '5px' : '14px', gap: '12px', position: 'relative', zIndex: 1 }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: isMobile ? '1.3rem' : '1.45rem', fontWeight: '900', lineHeight: 1.2, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: isMobile ? '1rem' : '1.25rem' }}>📍</span>{locationName}
              {!isMobile && <span style={{ fontSize: '0.86rem' }}>⌄</span>}
            </h2>
            <div style={{ fontSize: isMobile ? '0.75rem' : '0.86rem', color: 'rgba(255,255,255,0.78)', marginTop: '5px', fontWeight: 700 }}>
              {selectedDist || selectedProv || 'เขตปัจจุบัน'} • {thaiDate}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.72)', marginTop: '8px' }}>อัปเดตล่าสุด {thaiTime} น.</div>
          </div>
          {!isMobile && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', minWidth: 0 }}>
              {warningCards.map((item) => (
                <button type="button" onClick={() => openSection('warnings')} key={item.title} style={{ textAlign: 'left', padding: '10px 12px', borderRadius: '14px', background: `${item.tone}12`, border: `1px solid ${item.tone}55`, color: item.tone, cursor: 'pointer', minWidth: 0 }}>
                  <div style={{ fontSize: '0.76rem', fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.icon} {item.title}</div>
                  <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: 5 }}>{item.time}</div>
                </button>
              ))}
            </div>
          )}
          <button onClick={() => setShowFilter(!showFilter)} style={{ background: isMobile ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.78)', border: isMobile ? 'none' : `1px solid ${borderColor}`, borderRadius: '999px', width: isMobile ? '35px' : '38px', height: isMobile ? '35px' : '38px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', flexShrink: 0, backdropFilter: 'blur(5px)', position: 'relative', zIndex: 1, color: textColor }}>
            <span style={{ fontSize: '1.2rem' }}>{showFilter ? '✖️' : '🔍'}</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '15px' : '22px', alignSelf: isMobile ? 'center' : 'flex-start', position: 'relative', zIndex: 1, marginTop: isMobile ? 0 : '6px' }}>
          <span style={{ fontSize: isMobile ? '4.5rem' : '5.1rem', lineHeight: 1, animation: 'pulseGlow 3s infinite ease-in-out', filter: isMobile ? undefined : 'drop-shadow(0 18px 24px rgba(59,130,246,0.18))' }}>{weatherIcon}</span>
          <span style={{ fontSize: isMobile ? '5rem' : '5.7rem', fontWeight: '900', lineHeight: 1, color: isMobile ? '#fff' : '#14244d' }}>{Math.round(current?.temp || 0)}<span style={{ fontSize: isMobile ? '2.5rem' : '2.2rem', verticalAlign: 'top' }}>°C</span></span>
        </div>
        <div style={{ fontSize: isMobile ? '1.2rem' : '1rem', fontWeight: '900', marginTop: isMobile ? '10px' : '8px', alignSelf: isMobile ? 'center' : 'flex-start', position: 'relative', zIndex: 1, color: '#fff' }}>{weatherText}</div>
        <div style={{ fontSize: isMobile ? '0.9rem' : '1rem', color: 'rgba(255,255,255,0.9)', alignSelf: isMobile ? 'center' : 'flex-start', marginTop: '6px', background: isMobile ? 'rgba(0,0,0,0.15)' : 'transparent', padding: isMobile ? '4px 12px' : 0, borderRadius: '20px', position: 'relative', zIndex: 1, fontWeight: 800 }}>
          รู้สึกเหมือน <span style={{ color: '#fff' }}>{Math.round(current?.feelsLike || 0)}°C</span>
        </div>

        {!isMobile && (
          <div style={{ marginTop: '18px', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px', maxWidth: '560px', position: 'relative', zIndex: 1 }}>
            {heroStatusChips.map((chip) => (
              <div key={chip.label} style={{ display: 'grid', gridTemplateColumns: '30px 1fr', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '16px', border: `1px solid ${borderColor}`, background: 'rgba(255,255,255,0.74)', backdropFilter: 'blur(8px)' }}>
                <span style={{ width: 30, height: 30, borderRadius: '999px', background: `${chip.tone}16`, color: chip.tone, display: 'grid', placeItems: 'center', fontSize: '1rem' }}>{chip.label.includes('ฝน') ? '☔' : chip.label.includes('อากาศ') ? '🌿' : '🌡️'}</span>
                <div>
                  <div style={{ fontSize: '0.67rem', color: subTextColor, fontWeight: 800 }}>{chip.label}</div>
                  <div style={{ fontSize: '0.84rem', color: textColor, fontWeight: 900, marginTop: 2 }}>{chip.value}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {isMobile && (
          <div style={{ fontSize: '0.9rem', opacity: 0.9, alignSelf: 'center', marginTop: '6px', background: 'rgba(0,0,0,0.15)', padding: '4px 12px', borderRadius: '20px', position: 'relative', zIndex: 1 }}>
            สูงสุด {Math.round(daily?.temperature_2m_max?.[0] || current?.temp)}° <span style={{ opacity: 0.5, margin: '0 5px' }}>|</span> ต่ำสุด {Math.round(daily?.temperature_2m_min?.[0] || current?.temp)}°
          </div>
        )}

        {isMobile && (
          <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', position: 'relative', zIndex: 1 }}>
            {heroStatusChips.map((chip) => (
              <div key={chip.label} style={{ padding: '9px 10px', borderRadius: '14px', background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.22)' }}>
                <div style={{ fontSize: '0.66rem', opacity: 0.72, fontWeight: 800 }}>{chip.label}</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 900, marginTop: 2 }}>{chip.value}</div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
  );

  const briefingCard = (
    <div style={{ background: cardBg, padding: isMobile ? '20px' : '22px 24px', borderRadius: isMobile ? '20px' : '25px', border: `1px solid ${borderColor}`, display: 'flex', alignItems: 'flex-start', gap: '15px', flexShrink: 0 }}>
      <span style={{ fontSize: '2.5rem' }}>🤖</span>
      <div>
        <h4 style={{ margin: '0 0 5px 0', color: textColor, fontSize: '1rem' }}>สรุปสภาพอากาศวันนี้</h4>
        <p style={{ margin: 0, color: subTextColor, fontSize: '0.9rem', lineHeight: 1.8 }}>{briefingText}</p>
      </div>
    </div>
  );

  const hourlyForecastCard = (
    <div ref={forecastRef} style={{ ...surfaceCardStyle, padding: isMobile ? '18px' : '20px 22px', overflow: 'hidden', scrollMarginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
        <h3 style={{ margin: 0, fontSize: isMobile ? '1rem' : '1.05rem', color: textColor, fontWeight: 900 }}>
          พยากรณ์อากาศ 24 ชั่วโมงข้างหน้า
        </h3>
        <button type="button" onClick={() => openSection('forecast')} style={{ border: `1px solid ${borderColor}`, background: 'var(--bg-secondary)', color: '#2563eb', borderRadius: '999px', padding: '7px 12px', fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer' }}>
          ดูพยากรณ์รายชั่วโมงเต็ม
        </button>
      </div>

      <div
        ref={hourlyScrollRef}
        {...hourlyScrollEvents}
        style={{ overflowX: 'auto', overflowY: 'hidden', paddingBottom: '8px', cursor: isHourlyDragging ? 'grabbing' : 'grab', userSelect: 'none' }}
        className="hide-scrollbar"
      >
        <div style={{ minWidth: isMobile ? '980px' : '100%', display: 'grid', gridTemplateColumns: `repeat(${Math.min(chartData.length, 12)}, minmax(70px, 1fr))`, gap: '0', alignItems: 'end', position: 'relative', padding: '8px 4px 0' }}>
          <div style={{ position: 'absolute', left: 24, right: 24, top: 80, height: 2, background: '#ff5b45', borderRadius: 999 }} />
          {chartData.slice(0, 12).map((item, idx) => {
            const rainHeight = Math.max(8, Math.min(item.rain, 90) * 0.62);
            return (
              <div key={`${item.time}-${idx}`} style={{ minHeight: 176, display: 'grid', gridTemplateRows: '22px 30px 34px 42px 26px', justifyItems: 'center', alignItems: 'center', color: textColor, position: 'relative', zIndex: 1 }}>
                <div style={{ color: subTextColor, fontSize: '0.72rem', fontWeight: 800 }}>{idx === 0 ? 'ตอนนี้' : item.time}</div>
                <div style={{ fontWeight: 900, fontSize: '0.9rem' }}>{item.temp}°</div>
                <div style={{ width: 9, height: 9, borderRadius: 999, border: '2px solid #ff5b45', background: '#fff', boxShadow: '0 0 0 3px rgba(255,91,69,0.08)' }} />
                <div style={{ fontSize: '1.25rem', alignSelf: 'end' }}>{item.icon}</div>
                <div style={{ alignSelf: 'end', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div style={{ width: 28, height: rainHeight, borderRadius: '9px 9px 3px 3px', background: `linear-gradient(180deg, ${item.rain > 50 ? '#2563eb' : '#93c5fd'}, rgba(147,197,253,0.2))` }} />
                  <div style={{ color: item.rain > 50 ? '#2563eb' : '#3b82f6', fontWeight: 900, fontSize: '0.72rem' }}>{item.rain}%</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', borderTop: `1px solid ${borderColor}`, paddingTop: '10px', marginTop: '4px', color: subTextColor, fontSize: '0.72rem', fontWeight: 800 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 14, height: 2, background: '#ff5b45' }} /> อุณหภูมิ (°C)</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: '#93c5fd' }} /> โอกาสฝน (%)</span>
      </div>
    </div>
  );

  const desktopOverviewLayout = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '1180px', minWidth: 0, margin: '0 auto' }}>
      <div style={{ ...surfaceCardStyle, overflow: 'hidden', padding: 0 }}>
        <div style={{ height: 56, background: '#08234d', color: '#fff', display: 'grid', gridTemplateColumns: 'auto minmax(240px, 1fr) auto auto', alignItems: 'center', gap: '16px', padding: '0 18px', borderRadius: '20px 20px 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 900 }}>
            <img src="/icon-192x192.png" alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} />
            Thai Weather
          </div>
          <button type="button" onClick={() => setShowFilter(!showFilter)} style={{ height: 36, border: 0, borderRadius: '10px', background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.82)', textAlign: 'left', padding: '0 14px', cursor: 'pointer', fontWeight: 700 }}>
            🔍 ค้นหาเมือง, จังหวัด หรือสถานที่
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 800, color: 'rgba(255,255,255,0.85)' }}>
            📍 {locationName}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.72)' }}>{thaiTime} น.</div>
        </div>

        <div style={{ padding: '14px' }}>
          {heroCard}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: '12px' }}>
        {quickStatCards.map((item) => (
          <div key={item.label} style={{ ...surfaceCardStyle, padding: '16px 14px', minHeight: 116, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ color: subTextColor, fontSize: '0.72rem', fontWeight: 800, marginBottom: 8 }}>{item.label}</div>
            <div style={{ fontSize: '1.6rem', lineHeight: 1 }}>{item.icon}</div>
            <div style={{ color: textColor, fontSize: '1.05rem', fontWeight: 900, marginTop: 8 }}>{item.value}</div>
            <div style={{ color: item.tone, fontSize: '0.7rem', fontWeight: 900, marginTop: 5 }}>{item.note}</div>
          </div>
        ))}
      </div>

      {hourlyForecastCard}

      <div style={{ ...surfaceCardStyle, padding: '16px', overflow: 'hidden' }}>
        <WeatherRadar
          coords={coords}
          isMobile={false}
          cardBg="transparent"
          borderColor="transparent"
          textColor={textColor}
          frameHeightOverride="320px"
          title="เรดาร์ฝนและสภาพอากาศ"
        />
      </div>

      <div ref={dailyRef} style={{ scrollMarginTop: '20px' }}>
        <DailyForecast
          daily={daily}
          isMobile={false}
          cardBg={cardBg}
          borderColor={borderColor}
          textColor={textColor}
          subTextColor={subTextColor}
          onShowDetails={() => openSection('daily')}
        />
      </div>

      <div ref={bottomStatsRef} style={{ ...surfaceCardStyle, padding: '16px', scrollMarginTop: '20px' }}>
        <h3 style={{ margin: '0 0 12px', color: textColor, fontSize: '1rem', fontWeight: 900 }}>AI Insight & คำแนะนำ</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
          {aiInsightCards.map((item) => (
            <button key={item.title} type="button" onClick={() => openSection('stats')} style={{ textAlign: 'left', border: `1px solid ${borderColor}`, background: 'var(--bg-secondary)', borderRadius: '16px', padding: '16px', cursor: 'pointer', minHeight: 120 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 8 }}>
                <span style={{ width: 42, height: 42, borderRadius: '14px', background: `${item.tone}16`, display: 'grid', placeItems: 'center', fontSize: '1.45rem' }}>{item.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: textColor, fontSize: '0.9rem', fontWeight: 900 }}>{item.title}</div>
                  <div style={{ color: item.tone, fontSize: '0.68rem', fontWeight: 900, marginTop: 3 }}>{item.meta}</div>
                </div>
              </div>
              <div style={{ color: subTextColor, fontSize: '0.78rem', lineHeight: 1.55 }}>{item.text}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div ref={warningsRef} style={{ ...surfaceCardStyle, padding: '16px', scrollMarginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ fontSize: '1rem', color: '#b91c1c', fontWeight: '900' }}>⚠️ ประกาศเตือนภัย</div>
            <button type="button" onClick={() => openSection('warnings')} style={{ border: `1px solid #fecaca`, background: '#fff5f5', color: '#ef4444', borderRadius: '999px', padding: '7px 12px', fontSize: '0.72rem', fontWeight: 900, cursor: 'pointer' }}>อ่านเพิ่มเติม</button>
          </div>
          <div style={{ display: 'grid', gap: '10px' }}>
            {warningCards.map((item) => (
              <div key={item.title} style={{ padding: '14px 16px', borderRadius: '16px', border: `1px solid ${item.tone}35`, background: `color-mix(in srgb, ${item.tone} 7%, ${cardBg})`, display: 'grid', gridTemplateColumns: '44px minmax(0, 1fr) auto', gap: '12px', alignItems: 'center' }}>
                <span style={{ width: 44, height: 44, borderRadius: '14px', background: '#fff', display: 'grid', placeItems: 'center', fontSize: '1.35rem' }}>{item.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.86rem', color: item.tone, fontWeight: '900' }}>{item.title}</div>
                  <div style={{ fontSize: '0.74rem', color: textColor, marginTop: 4 }}>{item.level}</div>
                  <div style={{ fontSize: '0.68rem', color: subTextColor, marginTop: 3 }}>{item.area}</div>
                </div>
                <div style={{ color: subTextColor, fontSize: '0.68rem', fontWeight: 800, whiteSpace: 'nowrap' }}>{item.time}</div>
              </div>
            ))}
          </div>
        </div>

        <div ref={newsRef} style={{ ...surfaceCardStyle, padding: '16px', scrollMarginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ fontSize: '1rem', color: '#1d4ed8', fontWeight: '900' }}>📰 ข่าวสารและบทความ</div>
            <button type="button" onClick={() => openSection('news')} style={{ border: 0, background: 'transparent', color: '#2563eb', fontSize: '0.72rem', fontWeight: 900, cursor: 'pointer' }}>ดูทั้งหมด →</button>
          </div>
          <div style={{ display: 'grid', gap: '10px' }}>
            {newsItems.map((item) => (
              <div key={item.title} style={{ display: 'grid', gridTemplateColumns: '92px minmax(0, 1fr)', gap: '12px', alignItems: 'center', padding: '10px', borderRadius: '14px', background: 'var(--bg-secondary)', border: `1px solid ${borderColor}` }}>
                <div style={{ height: 56, borderRadius: '10px', background: item.image, overflow: 'hidden' }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: textColor, fontSize: '0.82rem', lineHeight: 1.35, fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                  <div style={{ color: subTextColor, fontSize: '0.68rem', marginTop: 4 }}>{item.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ ...surfaceCardStyle, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ color: textColor, fontSize: '0.86rem', fontWeight: 900, marginRight: 4 }}>เทคโนโลยีที่แนะนำ</div>
        {techStackItems.map((item) => (
          <span key={item} style={{ border: `1px solid ${borderColor}`, background: 'var(--bg-secondary)', color: subTextColor, borderRadius: '999px', padding: '7px 11px', fontSize: '0.74rem', fontWeight: 800 }}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );

  const mobileOverviewLayout = (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', flexShrink: 0, width: '100%', alignItems: 'stretch', minWidth: 0 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', flexShrink: 0, alignItems: 'stretch' }}>
          {heroCard}
          <WeatherMetrics
            current={current}
            chartData={chartData}
            cardBg={cardBg}
            borderColor={borderColor}
            subTextColor={subTextColor}
            textColor={textColor}
          />
        </div>

        {briefingCard}

        <ActivityRecommendations
          current={current}
          chartData={chartData}
          isMobile={isMobile}
          cardBg={cardBg}
          borderColor={borderColor}
          subTextColor={subTextColor}
        />

        <WeatherRadar
          coords={coords}
          isMobile={isMobile}
          cardBg={cardBg}
          borderColor={borderColor}
          textColor={textColor}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0, alignSelf: 'start' }}>
        {hourlyForecastCard}
      </div>
    </div>
  );

  return (
    <div ref={mainScrollRef} style={{ height: '100%', width: '100%', background: appBg, display: 'flex', justifyContent: 'center', overflowY: 'auto', fontFamily: 'Kanit, sans-serif', position: 'relative' }} className="hide-scrollbar">
      <style dangerouslySetInnerHTML={{__html: `.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } .fade-in { animation: fadeIn 0.3s ease-in-out; } @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } } @keyframes pulseGlow { 0% { filter: drop-shadow(0 0 10px rgba(255,255,255,0.1)); transform: scale(1); } 50% { filter: drop-shadow(0 0 25px rgba(255,255,255,0.4)); transform: scale(1.05); } 100% { filter: drop-shadow(0 0 10px rgba(255,255,255,0.1)); transform: scale(1); } }`}} />
      
      <div style={{ width: '100%', maxWidth: isMobile ? '600px' : 'none', display: 'flex', flexDirection: 'column', gap: isMobile ? '12px' : '20px', padding: isMobile ? '15px' : '24px', paddingBottom: '40px', margin: '0 auto' }}>

        {/* === SECTION 1: Alert Banner === */}
        {alertBanner && (
            <div style={{ background: alertBanner.color, color: '#fff', padding: '12px 20px', borderRadius: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', fontSize: '1rem', flexShrink: 0 }}>
                <span style={{ fontSize: '1.4rem' }}>{alertBanner.icon}</span> {alertBanner.text}
            </div>
        )}

        {/* === SECTION 2: Location Filter === */}
        {showFilter && (
            <div className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: '15px', background: cardBg, padding: '15px', borderRadius: '20px', border: `1px solid ${borderColor}`, flexWrap: 'wrap', flexShrink: 0 }}>
              <select value={selectedProv} onChange={handleProvChange} style={{ flex: 1, minWidth: '130px', background: 'var(--bg-secondary)', color: '#0ea5e9', border: 'none', fontWeight: 'bold', fontSize: '0.95rem', padding: '10px', borderRadius: '12px', outline: 'none', cursor: 'pointer' }}>
                <option value="">-- เลือกจังหวัด --</option>
                {sortedStations.map(p => <option key={p.stationID} value={p.areaTH}>{p.areaTH}</option>)}
              </select>
              <select value={selectedDist} onChange={handleDistChange} disabled={!selectedProv || geoData.length === 0 || currentAmphoes.length === 0} style={{ flex: 1, minWidth: '130px', background: 'var(--bg-secondary)', color: textColor, border: 'none', fontWeight: 'bold', fontSize: '0.95rem', padding: '10px', borderRadius: '12px', outline: 'none', cursor: 'pointer', opacity: (!selectedProv || currentAmphoes.length === 0) ? 0.5 : 1 }}>
                <option value="">
                  {geoError ? '⚠️ โหลดไฟล์ล้มเหลว' : geoData.length === 0 ? 'กำลังดึงข้อมูล...' : (!selectedProv ? '-- เลือกอำเภอ --' : (currentAmphoes.length === 0 ? '⚠️ ไม่พบข้อมูล' : '-- เลือกอำเภอ --'))}
                </option>
                {currentAmphoes.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
              </select>
            </div>
        )}

        
        {isMobile ? mobileOverviewLayout : desktopOverviewLayout}

        {currentDetail && (
          <div style={{ ...surfaceCardStyle, padding: isMobile ? '16px' : '18px 20px', scrollMarginTop: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px', marginBottom: '12px' }}>
              <div>
                <div style={{ color: '#2563eb', fontSize: '0.74rem', fontWeight: 900 }}>รายละเอียดที่เลือก</div>
                <h3 style={{ margin: '4px 0 0', color: textColor, fontSize: '1.02rem', fontWeight: 900 }}>{currentDetail.title}</h3>
              </div>
              <button type="button" onClick={() => setActiveDetail(null)} style={{ border: `1px solid ${borderColor}`, background: 'var(--bg-secondary)', color: subTextColor, borderRadius: '12px', width: 34, height: 34, cursor: 'pointer', fontWeight: 900 }}>×</button>
            </div>
            <p style={{ margin: '0 0 12px', color: subTextColor, lineHeight: 1.65, fontSize: '0.86rem' }}>{currentDetail.text}</p>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
              {(currentDetail.items.length ? currentDetail.items : ['ยังไม่มีข้อมูลรายละเอียดสำหรับหัวข้อนี้']).map((item) => (
                <div key={item} style={{ border: `1px solid ${borderColor}`, background: 'var(--bg-secondary)', borderRadius: '14px', padding: '11px 12px', color: textColor, fontSize: '0.78rem', lineHeight: 1.5, fontWeight: 700 }}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        )}

{/* === SECTION 8: Mobile-only UV and PM2.5 cards === */}
        {isMobile && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px', flexShrink: 0 }}>
            <div style={{ background: cardBg, borderRadius: '20px', padding: '20px', border: `1px solid ${borderColor}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: subTextColor, fontWeight: 'bold', fontSize: '0.9rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>😷</span> คุณภาพอากาศ (PM2.5)
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '900', color: textColor, marginTop: '5px' }}>
                    {current?.pm25 || 0} <span style={{ fontSize: '1rem', color: subTextColor, fontWeight: 'normal' }}>
                        {aqiTheme.text}
                    </span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'linear-gradient(to right, #0ea5e9, #22c55e, #eab308, #f97316, #ef4444)', borderRadius: '10px', marginTop: '15px', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '-4px', left: `${Math.min(((current?.pm25 || 0) / 100) * 100, 100)}%`, width: '16px', height: '16px', background: '#fff', border: '3px solid #0f172a', borderRadius: '50%', transform: 'translateX(-50%)', boxShadow: '0 2px 5px rgba(0,0,0,0.3)' }}></div>
                </div>
            </div>

            <SunriseSunsetArc 
               current={current} 
               cardBg={cardBg} 
               borderColor={borderColor} 
               textColor={textColor} 
               subTextColor={subTextColor} 
               isMobile={isMobile} 
            />
          </div>
        )}

        {/* === SECTION 9: Daily Forecast 7 days (full width) === */}
        {isMobile && (
          <div ref={dailyRef} style={{ scrollMarginTop: '20px' }}>
            <DailyForecast 
               daily={daily}
               isMobile={isMobile}
               cardBg={cardBg}
               borderColor={borderColor}
               textColor={textColor}
               subTextColor={subTextColor}
               onShowDetails={() => openSection('daily')}
            />
          </div>
        )}

        {/* === SECTION 10-11: Mobile extended stats === */}
        {isMobile && (
          <>
            <TopStats 
               top5Heat={top5Heat}
               top5Cool={top5Cool}
               top5PM25={top5PM25}
               top5Rain={top5Rain}
               top5HeatY={top5HeatY}
               top5CoolY={top5CoolY}
               top5PM25Y={top5PM25Y}
               top5RainY={top5RainY}
               isMobile={isMobile}
               cardBg={cardBg}
               borderColor={borderColor}
               textColor={textColor}
            />

            <DisasterSummary 
               isMobile={isMobile}
               cardBg={cardBg}
               borderColor={borderColor}
               textColor={textColor}
               subTextColor={subTextColor}
            />
          </>
        )}

        {/* === Footer === */}
        <div style={{ textAlign: 'center', marginTop: '10px', padding: '20px 0', borderTop: `1px solid ${borderColor}`, opacity: 0.7, flexShrink: 0 }}>
           <div style={{ fontSize: '0.85rem', color: subTextColor, fontWeight: 'bold' }}>อุตุนิยมวิทยาโดย {tmdAvailable ? 'กรมอุตุนิยมวิทยา (TMD)' : 'Open-Meteo API'} • พิกัดโดย OpenStreetMap</div>
           <div style={{ fontSize: '0.75rem', color: subTextColor, marginTop: '5px' }}>อัปเดตข้อมูลระบบล่าสุด: {lastUpdateText}</div>
        </div>

        <div style={{ height: isMobile ? '80px' : '0px', flexShrink: 0, width: '100%' }}></div>

      </div>

      {/* === Back to Top Button (mobile) === */}
      {isMobile && showBackToTop && (
        <button 
          onClick={scrollToTop}
          style={{ 
            position: 'fixed', bottom: '90px', right: '20px', 
            width: '48px', height: '48px', borderRadius: '50%', 
            background: 'var(--bg-card)', border: `1px solid ${borderColor}`,
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            cursor: 'pointer', zIndex: 100, 
            animation: 'fadeIn 0.3s ease-in-out',
            backdropFilter: 'blur(10px)'
          }}
        >
          <span style={{ fontSize: '1.4rem' }}>⬆️</span>
        </button>
      )}
    </div>
  );
}
