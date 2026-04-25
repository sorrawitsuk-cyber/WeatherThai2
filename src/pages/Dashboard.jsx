import React, { useContext, useState, useEffect, useMemo, useRef } from 'react';
import { WeatherContext } from '../context/WeatherContext';
import { useWeatherData } from '../hooks/useWeatherData';
import { useDraggableScroll } from '../hooks/useDraggableScroll';
import { getAqiTheme, getAlertBanner, getBriefingText } from '../utils/weatherHelpers';

import DailyForecast from '../components/Dashboard/DailyForecast';
import SunriseSunsetArc from '../components/Dashboard/SunriseSunsetArc';
import ActivityRecommendations from '../components/Dashboard/ActivityRecommendations';
import TopStats from '../components/Dashboard/TopStats';
import WeatherRadar from '../components/Dashboard/WeatherRadar';
import DisasterSummary from '../components/Dashboard/DisasterSummary';
import dashboardSkyline from '../assets/dashboard-skyline.png';
import LoadingScreen from '../components/LoadingScreen';

function normalizeGeoData(data) {
  return Array.isArray(data) ? data : (data?.data || []);
}

const provinceBackdrops = {
  city: {
    label: 'มหานครริมเจ้าพระยา',
    motif: 'city',
    tint: 'rgba(219,234,254,0.52)',
    accent: '#2563eb',
    text: '#0f2550',
    surface: 'rgba(255,255,255,0.88)',
    base: 'linear-gradient(135deg, #dbeafe 0%, #f8fbff 42%, #bfdbfe 100%)',
  },
  mountain: {
    label: 'ภูเขาและหมอกเหนือ',
    motif: 'mountain',
    tint: 'rgba(220,252,231,0.52)',
    accent: '#16a34a',
    text: '#123524',
    surface: 'rgba(255,255,255,0.86)',
    base: 'linear-gradient(135deg, #d9f99d 0%, #ecfeff 46%, #bae6fd 100%)',
  },
  coast: {
    label: 'ชายฝั่งทะเลไทย',
    motif: 'coast',
    tint: 'rgba(207,250,254,0.56)',
    accent: '#0891b2',
    text: '#083344',
    surface: 'rgba(255,255,255,0.88)',
    base: 'linear-gradient(135deg, #cffafe 0%, #f0fdfa 46%, #bae6fd 100%)',
  },
  heritage: {
    label: 'เมืองมรดกและวัฒนธรรม',
    motif: 'heritage',
    tint: 'rgba(254,243,199,0.5)',
    accent: '#d97706',
    text: '#451a03',
    surface: 'rgba(255,255,255,0.86)',
    base: 'linear-gradient(135deg, #fef3c7 0%, #fff7ed 45%, #fde68a 100%)',
  },
  plain: {
    label: 'ที่ราบลุ่มและทุ่งนา',
    motif: 'plain',
    tint: 'rgba(236,252,203,0.52)',
    accent: '#65a30d',
    text: '#1a2e05',
    surface: 'rgba(255,255,255,0.86)',
    base: 'linear-gradient(135deg, #ecfccb 0%, #f8fafc 45%, #bbf7d0 100%)',
  },
};

const provinceGroups = {
  city: ['กรุงเทพมหานคร', 'นนทบุรี', 'สมุทรปราการ', 'ปทุมธานี'],
  mountain: ['เชียงใหม่', 'เชียงราย', 'แม่ฮ่องสอน', 'น่าน', 'พะเยา', 'แพร่', 'ลำปาง', 'ลำพูน', 'ตาก', 'เพชรบูรณ์', 'เลย', 'อุตรดิตถ์'],
  coast: ['ภูเก็ต', 'กระบี่', 'พังงา', 'สุราษฎร์ธานี', 'ชุมพร', 'ระนอง', 'ตรัง', 'สตูล', 'สงขลา', 'ปัตตานี', 'นราธิวาส', 'ประจวบคีรีขันธ์', 'เพชรบุรี', 'ชลบุรี', 'ระยอง', 'จันทบุรี', 'ตราด', 'สมุทรสาคร', 'สมุทรสงคราม'],
  heritage: ['พระนครศรีอยุธยา', 'สุโขทัย', 'พิษณุโลก', 'นครปฐม', 'นครราชสีมา', 'บุรีรัมย์', 'สุรินทร์', 'อุบลราชธานี', 'ขอนแก่น', 'อุดรธานี', 'หนองคาย', 'สกลนคร', 'นครพนม', 'ร้อยเอ็ด', 'มหาสารคาม', 'กาฬสินธุ์'],
};

function cleanProvinceName(value = '') {
  return String(value)
    .replace(/จังหวัด|จ\.|เขต|อำเภอ|อ\./g, '')
    .replace(/[,\s]+/g, ' ')
    .trim();
}

function getProvinceBackdrop(selectedProv, locationName) {
  const source = cleanProvinceName(selectedProv || locationName || 'กรุงเทพมหานคร');
  const groupKey = Object.entries(provinceGroups).find(([, provinces]) => (
    provinces.some((province) => source.includes(province))
  ))?.[0] || 'plain';

  return {
    ...provinceBackdrops[groupKey],
    groupKey,
    provinceName: source || 'กรุงเทพมหานคร',
  };
}

function getWeatherBackdropOverlay({ isNight, isRaining, isHot, rainProb }) {
  if (isNight) {
    return {
      label: 'โทนกลางคืน',
      blend: 'linear-gradient(90deg, rgba(8,13,32,0.74) 0%, rgba(15,23,42,0.56) 38%, rgba(15,23,42,0.18) 100%), radial-gradient(circle at 74% 18%, rgba(255,255,255,0.52) 0 0.8rem, rgba(255,255,255,0.12) 0.9rem 1.8rem, transparent 1.9rem)',
      particles: 'radial-gradient(circle at 68% 24%, rgba(255,255,255,0.75) 0 1px, transparent 2px), radial-gradient(circle at 86% 32%, rgba(255,255,255,0.68) 0 1px, transparent 2px), radial-gradient(circle at 78% 12%, rgba(255,255,255,0.62) 0 1px, transparent 2px)',
      text: '#f8fafc',
      subText: 'rgba(226,232,240,0.82)',
      card: 'rgba(255,255,255,0.86)',
    };
  }

  if (isRaining || rainProb >= 40) {
    return {
      label: 'โทนฝน',
      blend: 'linear-gradient(90deg, rgba(240,249,255,0.94) 0%, rgba(219,234,254,0.72) 42%, rgba(148,163,184,0.3) 100%), linear-gradient(120deg, rgba(59,130,246,0.18), rgba(14,165,233,0.05))',
      particles: 'repeating-linear-gradient(105deg, rgba(37,99,235,0.0) 0 16px, rgba(37,99,235,0.22) 17px 19px, rgba(37,99,235,0.0) 20px 34px)',
      text: '#0f2550',
      subText: '#475569',
      card: 'rgba(255,255,255,0.9)',
    };
  }

  if (isHot) {
    return {
      label: 'โทนแดดร้อน',
      blend: 'linear-gradient(90deg, rgba(255,251,235,0.96) 0%, rgba(254,243,199,0.66) 42%, rgba(251,146,60,0.16) 100%), radial-gradient(circle at 80% 18%, rgba(251,191,36,0.72), rgba(251,191,36,0.08) 17%, transparent 28%)',
      particles: 'radial-gradient(circle at 78% 16%, rgba(253,186,116,0.55), transparent 22%)',
      text: '#451a03',
      subText: '#7c2d12',
      card: 'rgba(255,255,255,0.86)',
    };
  }

  return {
    label: 'โทนฟ้าโปร่ง',
    blend: 'linear-gradient(90deg, rgba(248,252,255,0.98) 0%, rgba(248,252,255,0.86) 38%, rgba(255,255,255,0.2) 100%)',
    particles: 'radial-gradient(ellipse at 72% 18%, rgba(255,255,255,0.78) 0 14%, transparent 15%), radial-gradient(ellipse at 84% 24%, rgba(255,255,255,0.66) 0 10%, transparent 11%)',
    text: '#0f2550',
    subText: '#475569',
    card: 'rgba(255,255,255,0.88)',
  };
}

const FAVORITE_LOCATION_KEY = 'airQualityThai.favoriteLocation';
const RAIN_ALERT_KEY = 'airQualityThai.rainAlertEnabled';

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
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('airQualityThai.viewMode') || 'general');
  const [favoriteLocation, setFavoriteLocation] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(FAVORITE_LOCATION_KEY) || 'null');
    } catch {
      return null;
    }
  });
  const [favoriteApplied, setFavoriteApplied] = useState(false);
  const [rainAlertEnabled, setRainAlertEnabled] = useState(() => localStorage.getItem(RAIN_ALERT_KEY) === 'true');

  const hourlyScrollRef = useRef(null);
  const mainScrollRef = useRef(null);
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
      const cleanProv = cleanProvinceName(selectedProv);
      const provData = amphoeData.provinces[cleanProv]
        || amphoeData.provinces[selectedProv]
        || Object.entries(amphoeData.provinces).find(([name]) => cleanProvinceName(name) === cleanProv)?.[1];
      if (provData?.amphoes) {
        return provData.amphoes.map((a, i) => ({
          id: i,
          name: String(a.n || a.name || '').trim(),
          lat: Number(a.lat),
          lon: Number(a.lon ?? a.lng ?? a.long),
          tc: a.tc,
          rh: a.rh,
          ws: a.ws,
          rain: a.rain
        })).filter(a => a.name !== '' && Number.isFinite(a.lat) && Number.isFinite(a.lon)).sort((a, b) => a.name.localeCompare(b.name, 'th'));
      }
    }
    // Fallback: thai_geo.json (เดิม)
    if (!geoData || geoData.length === 0) return [];
    const cleanProv = cleanProvinceName(selectedProv);
    const pObj = geoData.find(p => {
      const pName = cleanProvinceName(p.name_th || p.nameTh || p.name || '');
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

  useEffect(() => {
    if (favoriteLocation?.lat && favoriteLocation?.lon && !favoriteApplied) {
      setFavoriteApplied(true);
      setSelectedProv(favoriteLocation.province || '');
      setSelectedDist(favoriteLocation.district || '');
      setLocationName(favoriteLocation.label || favoriteLocation.province || 'พื้นที่โปรด');
      fetchWeatherByCoords(favoriteLocation.lat, favoriteLocation.lon);
      return;
    }

    const fallbackToDefaultLocation = () => {
      fetchWeatherByCoords(13.75, 100.5); 
      setLocationName('กรุงเทพมหานคร');
      setSelectedProv('กรุงเทพมหานคร');
    };

    fallbackToDefaultLocation();

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
        { enableHighAccuracy: false, timeout: 2500, maximumAge: 300000 }
      );
    }
  }, [favoriteApplied, favoriteLocation, fetchWeatherByCoords]);

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
        setSelectedProv(cleanProv);
        setSelectedDist(dist);
      } else {
        setLocationName(data?.locality || data?.city || 'ตำแหน่งปัจจุบัน');
        if (data?.principalSubdivision) {
          const cleanProv = data.principalSubdivision === 'กรุงเทพมหานคร' ? data.principalSubdivision : `จังหวัด${data.principalSubdivision.replace('จังหวัด', '')}`;
          setSelectedProv(cleanProv);
        }
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
    if (!dName) {
      const found = stations?.find(s => s.areaTH === selectedProv);
      if (found) {
        fetchWeatherByCoords(found.lat, found.long);
        setLocationName(selectedProv);
      }
      return;
    }
    setLocationName(`${dName}, ${selectedProv}`);
    
    // 🆕 ถ้าอำเภอมาจาก TMD — ใช้พิกัดตรงจาก TMD ไม่ต้อง geocode
    const targetDistrict = cleanProvinceName(dName);
    const amphoe = currentAmphoes.find(a => cleanProvinceName(a.name) === targetDistrict || cleanProvinceName(a.name).includes(targetDistrict));
    if (Number.isFinite(amphoe?.lat) && Number.isFinite(amphoe?.lon)) {
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

  const handleSaveFavorite = () => {
    const selectedStation = stations?.find(s => s.areaTH === selectedProv);
    const selectedAmphoe = currentAmphoes.find(a => a.name === selectedDist);
    const payload = {
      province: selectedProv,
      district: selectedDist,
      label: selectedDist ? `${selectedDist}, ${selectedProv}` : (selectedProv || locationName),
      lat: selectedAmphoe?.lat || selectedStation?.lat || coords?.lat || coords?.latitude,
      lon: selectedAmphoe?.lon || selectedStation?.long || coords?.lon || coords?.longitude,
      savedAt: Date.now(),
    };

    if (!payload.lat || !payload.lon) return;
    localStorage.setItem(FAVORITE_LOCATION_KEY, JSON.stringify(payload));
    setFavoriteLocation(payload);
  };

  const handleUseFavorite = () => {
    if (!favoriteLocation?.lat || !favoriteLocation?.lon) return;
    setSelectedProv(favoriteLocation.province || '');
    setSelectedDist(favoriteLocation.district || '');
    setLocationName(favoriteLocation.label || favoriteLocation.province || 'พื้นที่โปรด');
    fetchWeatherByCoords(favoriteLocation.lat, favoriteLocation.lon);
  };

  // --- 🎨 UI Theme ---
  const appBg = 'var(--bg-app)'; 
  const cardBg = 'var(--bg-card)';
  const textColor = 'var(--text-main)'; 
  const borderColor = 'var(--border-color)';
  const subTextColor = 'var(--text-sub)'; 

  const lastUpdateText = lastUpdated ? new Date(lastUpdated).toLocaleString('th-TH') : '-';

  if (!weatherData) return (
    <LoadingScreen title="กำลังโหลดภาพรวมอากาศ" subtitle="ดึงข้อมูลอากาศ ฝุ่น ฝน และพยากรณ์รายชั่วโมง" />
  );

  const { current, hourly, daily, coords, minutely } = weatherData;
  
  const aqiTheme = getAqiTheme(current?.pm25);
  
  const isRaining = current?.rainProb > 30;
  const isHot = current?.feelsLike >= 38;
  const currentHour = new Date().getHours();
  const isNight = currentHour >= 18 || currentHour < 6; 

  const weatherIcon = isRaining ? '🌧️' : (isNight ? '🌙' : (isHot ? '☀️' : '🌤️'));
  const weatherText = isRaining ? 'มีโอกาสฝนตก' : (isNight ? 'ท้องฟ้าโปร่งยามค่ำคืน' : (isHot ? 'แดดร้อนจัด' : 'อากาศดี มีเมฆบางส่วน'));
  
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
  const minChartTemp = Math.min(...chartData.map((item) => item.temp), Math.round(current?.temp || 0));
  const maxChartTemp = Math.max(...chartData.map((item) => item.temp), Math.round(current?.temp || 0));
  const chartTempRange = Math.max(maxChartTemp - minChartTemp, 4);
  const chartSlots = chartData.slice(0, isMobile ? 12 : 14);
  const mobileHeroHourlyStrip = isMobile ? (
    <div style={{ marginTop: '16px', position: 'relative', zIndex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <div style={{ color: '#0f2550', fontSize: '0.78rem', fontWeight: 900 }}>พยากรณ์รายชั่วโมง</div>
        <div style={{ color: '#64748b', fontSize: '0.62rem', fontWeight: 800 }}>เลื่อนดู 24 ชม.</div>
      </div>
      <div
        className="hide-scrollbar"
        ref={hourlyScrollRef}
        {...hourlyScrollEvents}
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          padding: '2px 0 4px',
          cursor: isHourlyDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
      >
        {chartData.map((item, idx) => (
          <div
            key={`hero-hour-${item.time}-${idx}`}
            style={{
              minWidth: '58px',
              padding: '9px 8px',
              borderRadius: '18px',
              background: 'rgba(255,255,255,0.74)',
              border: '1px solid rgba(226,232,240,0.76)',
              boxShadow: '0 10px 22px rgba(15,23,42,0.08)',
              textAlign: 'center',
              flexShrink: 0,
            }}
          >
            <div style={{ color: idx === 0 ? '#2563eb' : '#64748b', fontSize: '0.62rem', fontWeight: 900 }}>{idx === 0 ? 'ตอนนี้' : item.time}</div>
            <div style={{ fontSize: '1.25rem', lineHeight: 1, marginTop: '7px' }}>{item.icon}</div>
            <div style={{ color: '#0f2550', fontSize: '0.86rem', fontWeight: 900, marginTop: '7px' }}>{item.temp}°</div>
            <div style={{ color: item.rain >= 40 ? '#2563eb' : '#60a5fa', fontSize: '0.58rem', fontWeight: 900, marginTop: '4px' }}>{item.rain}%</div>
          </div>
        ))}
      </div>
    </div>
  ) : null;

  // Date/time formatting
  const now = new Date();
  const thaiDate = now.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const thaiTime = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  const currentRainProb = Math.round(current?.rainProb || chartData?.[0]?.rain || 0);
  const currentRainAmount = chartData?.[0]?.rainAmount || current?.precipitation || 0;
  const minutelyRows = (minutely?.time || [])
    .map((time, index) => {
      const at = new Date(time);
      return {
        time,
        at,
        label: at.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        minutesFromNow: Math.round((at.getTime() - nowMs) / 60000),
        rain: Number(minutely?.precipitation?.[index] || 0),
        probability: Math.round(minutely?.precipitation_probability?.[index] || 0),
      };
    })
    .filter((item) => item.minutesFromNow >= -15 && item.minutesFromNow <= 180)
    .slice(0, 13);
  const incomingRainCell = minutelyRows.find((item) => item.minutesFromNow >= 0 && (item.rain >= 0.1 || item.probability >= 45));
  const peakMinutelyRain = minutelyRows.reduce((best, item) => {
    const score = item.probability + item.rain * 28;
    const bestScore = (best?.probability || 0) + (best?.rain || 0) * 28;
    return score > bestScore ? item : best;
  }, minutelyRows[0]);
  const rainNow = Number(current?.rain || current?.precipitation || currentRainAmount || 0);
  const nowcastRainAlert = rainNow >= 0.1
    ? {
      key: `now-${Math.round(rainNow * 10)}`,
      level: 'danger',
      icon: '🌧️',
      title: 'ฝนกำลังตกใกล้พื้นที่',
      detail: `เรดาร์ควรจับตาใกล้บ้าน ปริมาณฝนล่าสุด ${rainNow.toFixed(1)} มม.`,
      time: 'ตอนนี้',
      tone: '#2563eb',
      bg: 'rgba(37,99,235,0.12)',
      progress: 100,
    }
    : incomingRainCell
      ? {
        key: `incoming-${incomingRainCell.time}`,
        level: incomingRainCell.probability >= 70 || incomingRainCell.rain >= 1 ? 'danger' : 'watch',
        icon: incomingRainCell.probability >= 70 || incomingRainCell.rain >= 1 ? '⛈️' : '☔',
        title: incomingRainCell.minutesFromNow <= 15 ? 'ฝนใกล้เข้ามามาก' : `อาจมีฝนในอีก ${incomingRainCell.minutesFromNow} นาที`,
        detail: `คาดช่วง ${incomingRainCell.label} โอกาส ${incomingRainCell.probability}%${incomingRainCell.rain ? ` · ${incomingRainCell.rain.toFixed(1)} มม.` : ''}`,
        time: incomingRainCell.label,
        tone: incomingRainCell.probability >= 70 || incomingRainCell.rain >= 1 ? '#ef4444' : '#f59e0b',
        bg: incomingRainCell.probability >= 70 || incomingRainCell.rain >= 1 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.13)',
        progress: Math.min(100, Math.max(18, incomingRainCell.probability)),
      }
      : {
        key: `clear-${peakMinutelyRain?.time || 'none'}`,
        level: 'clear',
        icon: '🌤️',
        title: 'ยังไม่พบฝนใกล้ตัว',
        detail: peakMinutelyRain ? `3 ชม.ข้างหน้าสูงสุด ${peakMinutelyRain.probability}% ช่วง ${peakMinutelyRain.label}` : 'ยังไม่มีข้อมูล nowcast ระยะสั้น',
        time: '0-3 ชม.',
        tone: '#16a34a',
        bg: 'rgba(22,163,74,0.1)',
        progress: Math.min(100, Math.max(8, peakMinutelyRain?.probability || 8)),
      };
  const rainAlertStatusText = rainAlertEnabled ? 'แจ้งเตือนเปิดอยู่' : 'เปิดแจ้งเตือนฝน';
  const handleRainAlertToggle = async () => {
    if (!rainAlertEnabled && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
    }

    const nextValue = !rainAlertEnabled;
    localStorage.setItem(RAIN_ALERT_KEY, String(nextValue));
    setRainAlertEnabled(nextValue);

    if (nextValue && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' && nowcastRainAlert.level !== 'clear') {
      new Notification(nowcastRainAlert.title, {
        body: nowcastRainAlert.detail,
        tag: 'rain-nowcast-alert',
      });
    }
  };
  const provinceBackdrop = getProvinceBackdrop(selectedProv, locationName);
  const weatherBackdrop = getWeatherBackdropOverlay({ isNight, isRaining, isHot, rainProb: currentRainProb });
  const heroBackgroundImage = [
    weatherBackdrop.blend,
    weatherBackdrop.particles,
    provinceBackdrop.motif === 'city'
      ? `linear-gradient(90deg, ${provinceBackdrop.tint}, rgba(255,255,255,0.08)), url(${dashboardSkyline})`
      : provinceBackdrop.base,
  ].join(', ');
  const heroTextColor = weatherBackdrop.text || provinceBackdrop.text;
  const heroSubTextColor = weatherBackdrop.subText || '#475569';
  const heroCardSurface = weatherBackdrop.card || provinceBackdrop.surface;
  const locationParts = locationName.split(',').map((part) => part.trim()).filter(Boolean);
  const locationDetailText = locationParts.length > 1 ? locationParts.slice(1).join(', ') : locationName;
  const surfaceCardStyle = {
    background: `linear-gradient(180deg, color-mix(in srgb, ${cardBg} 96%, #ffffff), color-mix(in srgb, ${cardBg} 92%, var(--bg-secondary)))`,
    border: `1px solid ${borderColor}`,
    borderRadius: '24px',
    boxShadow: isMobile ? '0 14px 28px rgba(2, 6, 23, 0.08)' : '0 20px 40px rgba(2, 6, 23, 0.08)',
  };

  const scrollToTop = () => {
    mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const districtLoading = Boolean(selectedProv && !amphoeData?.provinces && geoData.length === 0 && !geoError);
  const districtDisabled = !selectedProv || currentAmphoes.length === 0;
  const viewModes = [
    { id: 'general', label: 'ทั่วไป', icon: '🏠', hint: 'สรุปครบ' },
    { id: 'travel', label: 'เดินทาง', icon: '🚘', hint: 'ฝน + ทัศนวิสัย' },
    { id: 'health', label: 'สุขภาพ', icon: '😷', hint: 'ฝุ่น + UV' },
    { id: 'farm', label: 'เกษตร', icon: '🌾', hint: 'ฝน + ลม' },
  ];
  const handleViewModeChange = (modeId) => {
    setViewMode(modeId);
    localStorage.setItem('airQualityThai.viewMode', modeId);
  };
  const modeSpecificAction = {
    travel: {
      icon: currentRainProb >= 40 ? '🚗' : '🛣️',
      title: currentRainProb >= 40 ? 'เผื่อเวลาเดินทาง' : 'เดินทางได้ดี',
      detail: currentRainProb >= 40 ? `ฝน ${currentRainProb}% ถนนอาจลื่น` : 'ฝนต่ำ ทัศนวิสัยดี',
      tone: currentRainProb >= 40 ? '#f59e0b' : '#16a34a',
      bg: currentRainProb >= 40 ? 'rgba(245,158,11,0.13)' : 'rgba(22,163,74,0.1)',
      priority: 0,
    },
    health: {
      icon: current?.pm25 >= 37.5 ? '😷' : '💪',
      title: current?.pm25 >= 37.5 ? 'ลดเวลานอกอาคาร' : 'อากาศพอไหว',
      detail: `PM2.5 ${Math.round(current?.pm25 || 0)} · UV ${current?.uv || 0}`,
      tone: current?.pm25 >= 37.5 || current?.uv >= 8 ? '#f97316' : '#16a34a',
      bg: current?.pm25 >= 37.5 || current?.uv >= 8 ? 'rgba(249,115,22,0.13)' : 'rgba(22,163,74,0.1)',
      priority: 0,
    },
    farm: {
      icon: currentRainProb >= 40 || current?.windSpeed >= 14 ? '🌧️' : '🌾',
      title: currentRainProb >= 40 || current?.windSpeed >= 14 ? 'เลี่ยงพ่นยา' : 'ทำงานกลางแจ้งได้',
      detail: `ฝน ${currentRainProb}% · ลม ${Math.round(current?.windSpeed || 0)} กม./ชม.`,
      tone: currentRainProb >= 40 || current?.windSpeed >= 14 ? '#f59e0b' : '#16a34a',
      bg: currentRainProb >= 40 || current?.windSpeed >= 14 ? 'rgba(245,158,11,0.13)' : 'rgba(22,163,74,0.1)',
      priority: 0,
    },
  }[viewMode];
  const heroAdvisories = [
    {
      icon: '⚠️',
      label: isHot ? 'คลื่นความร้อน' : 'เฝ้าระวังอากาศ',
      value: `${Math.round(current?.feelsLike || 0)}° รู้สึกจริง`,
      bg: 'rgba(254, 226, 226, 0.92)',
      color: '#ef4444',
    },
    {
      icon: '⚡',
      label: currentRainProb >= 40 ? 'ฝนฟ้าคะนอง' : 'แดดฟ้าแจ่มใส',
      value: currentRainProb >= 40 ? `ฝน ${currentRainProb}% วันนี้` : `ฝน ${currentRainProb}% วันนี้`,
      bg: 'rgba(254, 243, 199, 0.92)',
      color: '#f59e0b',
    },
  ];
  const heroForecastCards = [
    { icon: '🌧️', label: 'โอกาสฝนวันนี้', value: `${currentRainProb}%`, note: currentRainAmount > 0 ? `${Number(currentRainAmount).toFixed(1)} มม.` : 'ยังไม่มีฝนตก' },
    { icon: '🕒', label: 'ฝนตกต่อช่วง', value: chartData.find((item) => item.rain >= 40)?.time || '13:00 - 18:00 น.', note: 'ช่วงเสี่ยงวันนี้' },
    { icon: '🌫️', label: 'คุณภาพอากาศ', value: `PM2.5 ${Math.round(current?.pm25 || 0)}`, note: aqiTheme.text },
    { icon: '☀️', label: 'รังสี UV', value: `${current?.uv || 0}`, note: current?.uv > 8 ? 'สูงมาก' : current?.uv > 5 ? 'สูง' : current?.uv > 2 ? 'ปานกลาง' : 'ต่ำ' },
  ];
  const highlightMetrics = [
    { label: 'ลม', value: `${Math.round(current?.windSpeed || 0)}`, unit: 'km/h', note: current?.windSpeed > 15 ? 'ลมแรง' : 'ค่อนข้างเบา', icon: '💨', tone: '#3b82f6' },
    { label: 'ความชื้น', value: `${Math.round(current?.humidity || 0)}%`, note: current?.humidity > 75 ? 'ค่อนข้างชื้น' : 'กำลังดี', icon: '💧', tone: '#0ea5e9' },
    { label: 'ทัศนวิสัย', value: `${Math.round((current?.visibility || 10000) / 1000)}`, unit: 'กม.', note: (current?.visibility || 10000) < 5000 ? 'มองเห็นลดลง' : 'มองเห็นชัด', icon: '👁️', tone: '#6366f1' },
    { label: 'ฝนสะสม', value: `${Number(currentRainAmount || 0).toFixed(1)}`, unit: 'มม.', note: currentRainAmount > 0 ? 'มีฝนแล้ว' : 'ยังไม่มีฝน', icon: '🌧️', tone: '#2563eb' },
  ];
  const quickActionItems = [
    modeSpecificAction,
    currentRainProb >= 45 && {
      icon: '☔',
      title: 'พกร่ม',
      detail: `ฝน ${currentRainProb}% วันนี้`,
      tone: '#2563eb',
      bg: 'rgba(37,99,235,0.1)',
      priority: 1,
    },
    current?.feelsLike >= 38 && {
      icon: '🥤',
      title: 'ดื่มน้ำบ่อย',
      detail: `รู้สึกเหมือน ${Math.round(current?.feelsLike || 0)}°`,
      tone: '#ef4444',
      bg: 'rgba(239,68,68,0.11)',
      priority: 2,
    },
    current?.uv >= 7 && {
      icon: '🧴',
      title: 'กันแดด',
      detail: `UV ${current?.uv} สูง`,
      tone: '#f59e0b',
      bg: 'rgba(245,158,11,0.13)',
      priority: 3,
    },
    current?.pm25 >= 37.5 && {
      icon: '😷',
      title: 'ใส่หน้ากาก',
      detail: `PM2.5 ${Math.round(current?.pm25 || 0)}`,
      tone: '#f97316',
      bg: 'rgba(249,115,22,0.13)',
      priority: 4,
    },
    currentRainProb < 35 && current?.pm25 < 37.5 && current?.feelsLike < 38 && {
      icon: '🚶',
      title: 'ออกไปข้างนอกได้',
      detail: 'สภาพอากาศพอเหมาะ',
      tone: '#16a34a',
      bg: 'rgba(22,163,74,0.1)',
      priority: 5,
    },
    {
      icon: '🕒',
      title: chartData.find((item) => item.rain >= 45)?.time ? 'เลี่ยงช่วงฝน' : 'เช็กช่วงบ่าย',
      detail: chartData.find((item) => item.rain >= 45)?.time ? `เสี่ยงฝน ${chartData.find((item) => item.rain >= 45)?.time}` : 'อากาศเปลี่ยนเร็ว',
      tone: '#8b5cf6',
      bg: 'rgba(139,92,246,0.11)',
      priority: 6,
    },
  ].filter(Boolean).sort((a, b) => a.priority - b.priority).slice(0, 3);
  const heroMotifLayer = (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
      {provinceBackdrop.motif === 'mountain' && (
        <>
          <div style={{ position: 'absolute', right: '-8%', bottom: '18%', width: '62%', height: '42%', background: 'linear-gradient(135deg, rgba(21,128,61,0.42), rgba(187,247,208,0.24))', clipPath: 'polygon(0 100%, 26% 34%, 44% 72%, 66% 18%, 100% 100%)' }} />
          <div style={{ position: 'absolute', right: '10%', bottom: '33%', width: '34%', height: '18%', background: 'rgba(255,255,255,0.52)', borderRadius: '999px', filter: 'blur(14px)' }} />
        </>
      )}
      {provinceBackdrop.motif === 'coast' && (
        <>
          <div style={{ position: 'absolute', right: '-3%', bottom: '0', width: '64%', height: '34%', background: 'linear-gradient(180deg, rgba(125,211,252,0.64), rgba(14,165,233,0.42))', clipPath: 'ellipse(70% 42% at 58% 80%)' }} />
          <div style={{ position: 'absolute', right: '4%', bottom: '17%', width: '58%', height: '34px', background: 'repeating-linear-gradient(170deg, rgba(255,255,255,0.88) 0 36px, rgba(255,255,255,0.25) 37px 70px)', borderRadius: '999px', opacity: 0.62 }} />
        </>
      )}
      {provinceBackdrop.motif === 'heritage' && (
        <>
          <div style={{ position: 'absolute', right: '4%', bottom: '16%', width: '46%', height: '46%', background: 'linear-gradient(180deg, rgba(217,119,6,0.28), rgba(146,64,14,0.18))', clipPath: 'polygon(5% 100%, 13% 48%, 24% 48%, 31% 24%, 38% 48%, 48% 48%, 56% 8%, 64% 48%, 76% 48%, 84% 32%, 92% 48%, 100% 100%)' }} />
          <div style={{ position: 'absolute', right: '6%', bottom: '16%', width: '45%', height: '9%', background: 'rgba(146,64,14,0.22)', borderRadius: '8px 8px 0 0' }} />
        </>
      )}
      {provinceBackdrop.motif === 'plain' && (
        <>
          <div style={{ position: 'absolute', right: '-4%', bottom: '0', width: '66%', height: '30%', background: 'linear-gradient(180deg, rgba(132,204,22,0.42), rgba(77,124,15,0.25))', clipPath: 'ellipse(72% 44% at 54% 84%)' }} />
          <div style={{ position: 'absolute', right: '1%', bottom: '8%', width: '62%', height: '22%', background: 'repeating-linear-gradient(160deg, rgba(101,163,13,0.28) 0 3px, transparent 4px 16px)', borderRadius: '999px' }} />
        </>
      )}
    </div>
  );

  const heroCard = (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div
        style={{
          backgroundImage: heroBackgroundImage,
          backgroundSize: 'cover',
          backgroundPosition: 'center right',
          borderRadius: isMobile ? '24px' : '18px',
          padding: isMobile ? '16px' : '22px',
          color: '#0f172a',
          border: '1px solid rgba(191, 219, 254, 0.9)',
          boxShadow: '0 18px 40px rgba(14, 116, 144, 0.14)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          flex: 1,
          minHeight: isMobile ? 'auto' : '360px',
          overflow: 'hidden',
        }}
      >
        {heroMotifLayer}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px', width: '100%', marginBottom: isMobile ? '20px' : '26px' }}>
          <div style={{ position: 'relative', zIndex: 1, minWidth: 0 }}>
            <button
              onClick={() => setShowFilter(!showFilter)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: heroCardSurface, color: '#475569', border: '1px solid rgba(148, 163, 184, 0.32)', borderRadius: '999px', padding: '7px 10px', fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer', marginBottom: '9px' }}
            >
              <span>📍</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isMobile ? '230px' : '360px' }}>{locationName}</span>
              <span style={{ fontSize: '0.64rem' }}>{showFilter ? '▲' : '▼'}</span>
            </button>
            <div style={{ fontSize: '0.78rem', color: heroSubTextColor, lineHeight: 1.5 }}>{locationDetailText}</div>
            <div style={{ fontSize: '0.68rem', color: heroSubTextColor, opacity: 0.74, lineHeight: 1.5, marginTop: '3px' }}>{thaiDate} • {thaiTime} น.</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '8px', padding: '5px 9px', borderRadius: '999px', background: heroCardSurface, color: '#64748b', fontSize: '0.64rem', fontWeight: '800', border: '1px solid rgba(148,163,184,0.2)' }}>
              ข้อมูลจากกรมอุตุนิยมวิทยา
            </div>
          </div>
          {!isMobile && (
            <div style={{ display: 'flex', gap: '12px', position: 'relative', zIndex: 1 }}>
              {heroAdvisories.map((item) => (
                <div key={item.label} style={{ minWidth: '132px', padding: '10px 13px', borderRadius: '14px', background: item.bg, border: '1px solid rgba(255,255,255,0.75)', boxShadow: '0 10px 24px rgba(15,23,42,0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.68rem', color: item.color, fontWeight: '900' }}>
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  <div style={{ marginTop: '4px', color: '#64748b', fontSize: '0.62rem', fontWeight: '800' }}>{item.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '18px', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: isMobile ? '4.2rem' : '6rem', fontWeight: '900', letterSpacing: 0, lineHeight: 0.9, color: heroTextColor }}>
            {Math.round(current?.temp || 0)}<span style={{ fontSize: isMobile ? '1.45rem' : '2rem', verticalAlign: 'top' }}>°C</span>
          </div>
          <span style={{ fontSize: isMobile ? '3.1rem' : '4.8rem', lineHeight: 1, filter: 'drop-shadow(0 10px 12px rgba(15,23,42,0.12))' }}>{weatherIcon}</span>
        </div>
        <div style={{ position: 'relative', zIndex: 1, marginTop: '9px' }}>
          <div style={{ fontSize: isMobile ? '0.95rem' : '1.08rem', color: heroTextColor, fontWeight: '900' }}>{weatherText}</div>
          <div style={{ fontSize: isMobile ? '0.82rem' : '0.92rem', color: heroSubTextColor, fontWeight: '800', marginTop: '4px' }}>รู้สึกเหมือน {Math.round(current?.feelsLike || 0)}°C</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))', gap: '10px', width: isMobile ? '100%' : '68%', marginTop: isMobile ? '18px' : '28px', position: 'relative', zIndex: 1 }}>
          {heroForecastCards.map((item) => (
            <div key={item.label} style={{ background: heroCardSurface, border: '1px solid rgba(226,232,240,0.88)', borderRadius: '14px', padding: '11px 12px', boxShadow: '0 10px 24px rgba(15,23,42,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: '#64748b', fontSize: '0.66rem', fontWeight: '900' }}>
                <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
              <div style={{ marginTop: '5px', color: '#0f2550', fontSize: '0.86rem', fontWeight: '900' }}>{item.value}</div>
              <div style={{ marginTop: '3px', color: '#94a3b8', fontSize: '0.62rem', fontWeight: '800' }}>{item.note}</div>
            </div>
          ))}
        </div>
        {mobileHeroHourlyStrip}
      </div>
    </div>
  );

  const quickActionBar = (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'auto repeat(3, minmax(0, 1fr))', gap: '10px', alignItems: 'stretch', marginTop: isMobile ? '0' : '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: textColor, fontSize: '0.86rem', fontWeight: 900, padding: isMobile ? '0 2px' : '0 12px 0 2px', whiteSpace: 'nowrap' }}>
        <span style={{ color: '#2563eb' }}>●</span>
        ควรทำตอนนี้
      </div>
      {quickActionItems.map((item) => (
        <div key={item.title} style={{ display: 'grid', gridTemplateColumns: '34px minmax(0, 1fr)', alignItems: 'center', gap: '9px', background: item.bg, border: `1px solid ${item.tone}33`, borderRadius: '14px', padding: '10px 12px', minWidth: 0 }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '12px', background: `${item.tone}18`, color: item.tone, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.15rem' }}>
            {item.icon}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: item.tone, fontSize: '0.78rem', fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
            <div style={{ color: subTextColor, fontSize: '0.64rem', fontWeight: 800, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.detail}</div>
          </div>
        </div>
      ))}
    </div>
  );

  const activeViewMode = viewModes.find((mode) => mode.id === viewMode) || viewModes[0];

  const preferencePanel = (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'minmax(180px, 0.8fr) minmax(320px, 1.55fr) minmax(220px, 0.9fr)',
        gap: '10px',
        alignItems: 'stretch',
        marginTop: isMobile ? '0' : '14px',
        padding: '10px',
        border: `1px solid ${borderColor}`,
        borderRadius: '16px',
        background: 'color-mix(in srgb, var(--bg-card) 94%, white)',
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '3px',
          minWidth: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: textColor, fontSize: '0.78rem', fontWeight: 900 }}>
          <span style={{ color: '#2563eb' }}>●</span>
          ปรับมุมมอง
        </div>
        <div style={{ color: subTextColor, fontSize: '0.65rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {activeViewMode.icon} {activeViewMode.hint}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))',
          gap: '8px',
          minWidth: 0,
        }}
      >
        {viewModes.map((mode) => {
          const active = viewMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => handleViewModeChange(mode.id)}
              style={{
                border: `1px solid ${active ? '#2563eb55' : borderColor}`,
                background: active ? 'rgba(37,99,235,0.1)' : 'var(--bg-secondary)',
                color: active ? '#2563eb' : textColor,
                borderRadius: '999px',
                padding: '8px 10px',
                fontSize: '0.72rem',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                minWidth: 0,
                whiteSpace: 'nowrap',
              }}
              title={mode.hint}
            >
              <span>{mode.icon}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{mode.label}</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: favoriteLocation?.lat && favoriteLocation?.lon && !isMobile ? '1fr 1fr' : '1fr', gap: '8px', alignContent: 'center', minWidth: 0 }}>
        <button
          type="button"
          onClick={handleSaveFavorite}
          style={{
            border: '1px solid rgba(245,158,11,0.32)',
            background: 'rgba(245,158,11,0.12)',
            color: '#d97706',
            borderRadius: '999px',
            padding: '8px 10px',
            fontSize: '0.72rem',
            fontWeight: 900,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          ⭐ ปักหมุดพื้นที่นี้
        </button>
        {favoriteLocation?.lat && favoriteLocation?.lon && (
          <button
            type="button"
            onClick={handleUseFavorite}
            style={{
              border: '1px solid rgba(37,99,235,0.3)',
              background: 'rgba(37,99,235,0.1)',
              color: '#2563eb',
              borderRadius: '999px',
              padding: '8px 10px',
              fontSize: '0.72rem',
              fontWeight: 900,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={favoriteLocation.label}
          >
            📍 ไปพื้นที่โปรด
          </button>
        )}
        {favoriteLocation?.label && (
          <div style={{ color: subTextColor, fontSize: '0.64rem', fontWeight: 800, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', gridColumn: '1 / -1', padding: '0 4px' }}>
            พื้นที่โปรด: {favoriteLocation.label}
          </div>
        )}
      </div>
    </div>
  );

  const pmValue = Math.round(current?.pm25 || 0);
  const uvValue = Number(current?.uv || 0);
  const pmAdvice = pmValue >= 75
    ? { text: 'ฝุ่นสูงมาก เลี่ยงกิจกรรมกลางแจ้ง', tone: '#ef4444' }
    : pmValue >= 37.5
      ? { text: 'ฝุ่นเริ่มสูง ใส่หน้ากากเมื่อต้องอยู่นอกอาคาร', tone: '#f97316' }
      : pmValue >= 25
        ? { text: 'ฝุ่นปานกลาง คนแพ้ง่ายควรระวัง', tone: '#f59e0b' }
        : { text: 'ฝุ่นอยู่ในเกณฑ์ดี', tone: '#16a34a' };
  const uvAdvice = uvValue >= 8
    ? { text: 'UV สูงมาก เลี่ยงแดด 11:00-15:00', tone: '#ef4444' }
    : uvValue >= 6
      ? { text: 'UV สูง ควรทากันแดด', tone: '#f59e0b' }
      : uvValue >= 3
        ? { text: 'UV ปานกลาง กันแดดเมื่อต้องอยู่นาน', tone: '#2563eb' }
        : { text: 'UV ต่ำ', tone: '#16a34a' };

  const healthAdviceBar = (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: '10px', marginTop: isMobile ? '0' : '12px', minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
      {[
        { icon: '😷', label: `PM2.5 ${pmValue}`, ...pmAdvice },
        { icon: '☀️', label: `UV ${uvValue}`, ...uvAdvice },
      ].map((item) => (
        <div key={item.label} style={{ display: 'grid', gridTemplateColumns: '34px minmax(0, 1fr)', gap: '9px', alignItems: 'center', padding: '10px 12px', borderRadius: '14px', border: `1px solid ${item.tone}33`, background: `linear-gradient(180deg, ${item.tone}10, var(--bg-secondary))`, minWidth: 0 }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${item.tone}18`, color: item.tone, fontSize: '1.1rem' }}>{item.icon}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: item.tone, fontSize: '0.76rem', fontWeight: 900 }}>{item.label}</div>
            <div style={{ color: subTextColor, fontSize: '0.66rem', fontWeight: 800, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.text}</div>
          </div>
        </div>
      ))}
    </div>
  );

  const highlightMetricsGrid = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: isMobile ? '0' : '14px' }}>
      <div style={{ color: subTextColor, fontSize: '0.72rem', fontWeight: 900 }}>รายละเอียดเสริม</div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))', gap: isMobile ? '10px' : '12px' }}>
        {highlightMetrics.map((metric) => (
          <div key={metric.label} style={{ background: 'color-mix(in srgb, var(--bg-card) 94%, white)', border: `1px solid ${borderColor}`, borderRadius: '14px', padding: isMobile ? '12px' : '13px 12px', boxShadow: '0 10px 22px rgba(15,23,42,0.08)', minHeight: isMobile ? '82px' : '88px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: subTextColor, fontSize: '0.68rem', fontWeight: '900', minWidth: 0 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '999px', background: `color-mix(in srgb, ${metric.tone} 13%, white)`, color: metric.tone, flexShrink: 0 }}>{metric.icon}</span>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{metric.label}</span>
            </div>
            <div style={{ marginTop: '8px', color: textColor, fontSize: isMobile ? '1.25rem' : '1.38rem', fontWeight: '900', lineHeight: 1 }}>
              {metric.value}
              {metric.unit && <span style={{ marginLeft: '4px', color: subTextColor, fontSize: '0.68rem', fontWeight: '800' }}>{metric.unit}</span>}
            </div>
            <div style={{ marginTop: '6px', color: metric.tone, fontSize: '0.62rem', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{metric.note}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const briefingChips = [
    {
      label: 'ฝนวันนี้',
      value: `${dailyRainProb}%`,
      tone: dailyRainProb >= 60 ? '#ef4444' : dailyRainProb >= 35 ? '#f59e0b' : '#2563eb',
      bg: dailyRainProb >= 60 ? 'rgba(239,68,68,0.12)' : dailyRainProb >= 35 ? 'rgba(245,158,11,0.14)' : 'rgba(37,99,235,0.1)',
    },
    {
      label: 'รู้สึกเหมือน',
      value: `${Math.round(current?.feelsLike || 0)}°`,
      tone: current?.feelsLike >= 38 ? '#ef4444' : current?.feelsLike >= 34 ? '#f97316' : '#16a34a',
      bg: current?.feelsLike >= 38 ? 'rgba(239,68,68,0.12)' : current?.feelsLike >= 34 ? 'rgba(249,115,22,0.13)' : 'rgba(22,163,74,0.1)',
    },
    {
      label: 'PM2.5',
      value: `${Math.round(current?.pm25 || 0)}`,
      tone: current?.pm25 >= 50 ? '#ef4444' : current?.pm25 >= 25 ? '#f59e0b' : '#16a34a',
      bg: current?.pm25 >= 50 ? 'rgba(239,68,68,0.12)' : current?.pm25 >= 25 ? 'rgba(245,158,11,0.14)' : 'rgba(22,163,74,0.1)',
    },
    {
      label: 'พรุ่งนี้',
      value: tomorrowRainProb >= 40 ? `ฝน ${tomorrowRainProb}%` : `${tomorrowMaxTemp || '-'}°`,
      tone: tomorrowRainProb >= 40 ? '#2563eb' : '#16a34a',
      bg: tomorrowRainProb >= 40 ? 'rgba(37,99,235,0.1)' : 'rgba(22,163,74,0.1)',
    },
  ];

  const conciseBriefingText = [
    currentRainProb >= 50 ? `วันนี้ฝนเด่นช่วง ${chartData.find((item) => item.rain >= 45)?.time || 'บ่าย-เย็น'}` : 'วันนี้ฝนยังไม่เด่นมาก',
    current?.feelsLike >= 38 ? `อากาศร้อน รู้สึกเหมือน ${Math.round(current?.feelsLike || 0)}°` : `อุณหภูมิประมาณ ${Math.round(current?.temp || 0)}°`,
    current?.pm25 >= 37.5 ? 'ฝุ่นเริ่มสูง ควรลดเวลานอกอาคาร' : 'คุณภาพอากาศยังพอใช้',
    tomorrowRainProb >= 40 ? `พรุ่งนี้มีโอกาสฝน ${tomorrowRainProb}%` : 'พรุ่งนี้ยังวางแผนกลางแจ้งได้',
  ].join(' · ');

  const briefingCard = (
    <div style={{ background: cardBg, padding: isMobile ? '16px' : '20px', borderRadius: isMobile ? '18px' : '22px', border: `1px solid ${borderColor}`, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '54px minmax(0, 1fr)', alignItems: 'start', gap: isMobile ? '12px' : '14px', flexShrink: 0 }}>
      <div style={{ width: '54px', height: '54px', borderRadius: '18px', background: 'linear-gradient(135deg, rgba(14,165,233,0.16), rgba(139,92,246,0.16))', border: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', lineHeight: 1, flexShrink: 0 }}>
        🤖
      </div>
      <div style={{ minWidth: 0 }}>
        <h4 style={{ margin: '0 0 7px 0', color: textColor, fontSize: '1rem', fontWeight: 900 }}>สรุปสภาพอากาศวันนี้</h4>
        <p style={{ margin: 0, color: textColor, fontSize: '0.86rem', lineHeight: 1.65, fontWeight: 600 }}>{conciseBriefingText}</p>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, minmax(0, 1fr))', gap: '8px', marginTop: '13px' }}>
          {briefingChips.map((chip) => (
            <div key={chip.label} style={{ background: chip.bg, border: `1px solid ${chip.tone}33`, borderRadius: '13px', padding: '8px 10px', minWidth: 0 }}>
              <div style={{ color: subTextColor, fontSize: '0.64rem', fontWeight: 900 }}>{chip.label}</div>
              <div style={{ color: chip.tone, fontSize: '0.9rem', fontWeight: 900, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chip.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const hourlyForecastCard = (
    <div style={{ background: cardBg, borderRadius: '18px', padding: isMobile ? '16px' : '18px', border: `1px solid ${borderColor}`, boxShadow: '0 14px 30px rgba(15,23,42,0.08)', display: 'flex', flexDirection: 'column', height: 'auto', minHeight: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontSize: isMobile ? '1rem' : '1.08rem', color: textColor, fontWeight: '900' }}>
          พยากรณ์อากาศ 24 ชั่วโมงข้างหน้า
        </h3>
        <div style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: '900', background: 'rgba(219,234,254,0.68)', borderRadius: '999px', padding: '6px 10px' }}>
          ดูพยากรณ์รายชั่วโมงเต็ม
        </div>
      </div>

      <div
        ref={hourlyScrollRef}
        {...hourlyScrollEvents}
        style={{ overflowX: 'auto', overflowY: 'hidden', cursor: isHourlyDragging ? 'grabbing' : 'grab', userSelect: 'none' }}
        className="hide-scrollbar"
      >
        <div style={{ position: 'relative', minWidth: isMobile ? '780px' : '100%', height: isMobile ? '222px' : '238px', padding: '2px 0 26px' }}>
          <svg viewBox={`0 0 ${Math.max(chartSlots.length - 1, 1) * 64 + 64} 84`} preserveAspectRatio="none" style={{ position: 'absolute', left: 0, right: 0, top: '43px', width: '100%', height: '84px', pointerEvents: 'none', overflow: 'visible' }}>
            <polyline
              fill="none"
              stroke="#ff5a3c"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={chartSlots.map((item, idx) => {
                const x = idx * 64 + 32;
                const y = 12 + ((maxChartTemp - item.temp) / chartTempRange) * 52;
                return `${x},${y}`;
              }).join(' ')}
            />
            {chartSlots.map((item, idx) => {
              const x = idx * 64 + 32;
              const y = 12 + ((maxChartTemp - item.temp) / chartTempRange) * 52;
              return <circle key={`${item.time}-dot`} cx={x} cy={y} r="3.8" fill="#fff" stroke="#ff5a3c" strokeWidth="2" />;
            })}
          </svg>

          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${chartSlots.length}, minmax(56px, 1fr))`, alignItems: 'end', height: '100%', minWidth: 'max-content' }}>
            {chartSlots.map((item, idx) => {
              const yOffset = ((maxChartTemp - item.temp) / chartTempRange) * 52;
              const rainBar = Math.max(8, Math.min(48, item.rain * 0.48));
              return (
                <div key={`${item.time}-${idx}`} style={{ height: '100%', display: 'grid', gridTemplateRows: '24px 74px 36px 54px 22px', justifyItems: 'center', alignItems: 'center', minWidth: '56px', position: 'relative' }}>
                  <div style={{ color: idx === 0 ? '#2563eb' : subTextColor, fontSize: '0.62rem', fontWeight: '900' }}>{idx === 0 ? 'ตอนนี้' : item.time}</div>
                  <div style={{ alignSelf: 'start', paddingTop: `${Math.max(0, yOffset)}px`, color: '#ef4444', fontSize: '0.68rem', fontWeight: '900' }}>{item.temp}°</div>
                  <div style={{ fontSize: '1.15rem', lineHeight: 1 }}>{item.icon}</div>
                  <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'center', width: '100%', height: '54px' }}>
                    <div style={{ width: '22px', height: `${rainBar}px`, borderRadius: '7px 7px 3px 3px', background: `linear-gradient(180deg, rgba(147,197,253,0.95), rgba(59,130,246,${Math.max(0.32, item.rain / 100)}))`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.55)' }} />
                  </div>
                  <div style={{ color: item.rain >= 40 ? '#2563eb' : '#60a5fa', fontSize: '0.64rem', fontWeight: '900' }}>{item.rain}%</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: subTextColor, fontSize: '0.67rem', fontWeight: '800', flexWrap: 'wrap', paddingTop: '10px', borderTop: `1px solid ${borderColor}` }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '16px', height: '3px', background: '#ff5a3c', borderRadius: '999px' }} /> อุณหภูมิ (°C)</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '14px', background: '#60a5fa', borderRadius: '4px 4px 2px 2px' }} /> โอกาสฝน (%)</span>
      </div>
    </div>
  );

  const getHourlyIcon = (hour, rainP = 0, rainA = 0) => {
    const isNightHour = hour >= 18 || hour < 6;
    if (rainP > 70 || rainA > 5) return '⛈️';
    if (rainP > 30 || rainA > 1) return '🌧️';
    if (rainP > 10 || rainA > 0) return isNightHour ? '☁️' : '🌥️';
    if (rainP > 0) return isNightHour ? '☁️' : '🌤️';
    return isNightHour ? '🌙' : '☀️';
  };

  const buildOverviewSlotsForDate = (dayOffset) => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + dayOffset);
    const sameDate = (date) => (
      date.getFullYear() === targetDate.getFullYear()
      && date.getMonth() === targetDate.getMonth()
      && date.getDate() === targetDate.getDate()
    );

    const dayItems = (hourly?.time || []).map((t, idx) => {
      const date = new Date(t);
      const hour = date.getHours();
      const rain = hourly?.precipitation_probability?.[idx] || 0;
      const rainAmount = hourly?.precipitation?.[idx] || 0;
      return {
        time: hour.toString().padStart(2, '0') + ':00',
        hour,
        temp: Math.round(hourly?.temperature_2m?.[idx] || 0),
        feelsLike: Math.round(hourly?.apparent_temperature?.[idx] || hourly?.temperature_2m?.[idx] || 0),
        rain,
        rainAmount,
        pm25: Math.round(hourly?.pm25?.[idx] || 0),
        icon: getHourlyIcon(hour, rain, rainAmount),
        date,
      };
    }).filter((item) => sameDate(item.date));

    if (dayItems.length === 0) {
      const minTemp = Math.round(daily?.temperature_2m_min?.[dayOffset] || daily?.temperature_2m_min?.[0] || 0);
      const maxTempForDay = Math.round(daily?.temperature_2m_max?.[dayOffset] || daily?.temperature_2m_max?.[0] || 0);
      const heatForDay = Math.round(daily?.apparent_temperature_max?.[dayOffset] || maxTempForDay);
      const rainForDay = Math.round(daily?.precipitation_probability_max?.[dayOffset] || 0);
      const codeForDay = daily?.weather_code?.[dayOffset] || 0;
      const icon = codeForDay >= 95 ? '⛈️' : codeForDay >= 61 || rainForDay >= 50 ? '🌧️' : rainForDay >= 25 ? '🌦️' : '🌤️';
      return [
        { label: 'เช้า', range: '06:00-11:00', data: { temp: minTemp, feelsLike: heatForDay, rain: rainForDay, icon } },
        { label: 'บ่าย', range: '12:00-16:00', data: { temp: maxTempForDay, feelsLike: heatForDay, rain: rainForDay, icon } },
        { label: 'เย็น', range: '17:00-20:00', data: { temp: Math.round((minTemp + maxTempForDay) / 2), feelsLike: heatForDay, rain: rainForDay, icon } },
        { label: 'กลางคืน', range: '21:00-05:00', data: { temp: minTemp, feelsLike: Math.round((minTemp + heatForDay) / 2), rain: rainForDay, icon: rainForDay >= 40 ? '🌧️' : '🌙' } },
      ];
    }

    const pickWindow = (start, end, fallbackIndex = 0) => {
      const matched = dayItems.filter((item) => (
        start <= end ? item.hour >= start && item.hour <= end : item.hour >= start || item.hour <= end
      ));
      if (matched.length > 0) {
        const maxRainItem = [...matched].sort((a, b) => b.rain - a.rain)[0];
        const minTemp = Math.min(...matched.map((item) => item.temp));
        const maxFeels = Math.max(...matched.map((item) => item.feelsLike || item.temp));
        return { ...maxRainItem, temp: minTemp, feelsLike: maxFeels };
      }
      return dayItems[fallbackIndex] || null;
    };

    return [
      { label: 'เช้า', range: '06:00-11:00', data: pickWindow(6, 11, 6) },
      { label: 'บ่าย', range: '12:00-16:00', data: pickWindow(12, 16, 12) },
      { label: 'เย็น', range: '17:00-20:00', data: pickWindow(17, 20, 17) },
      { label: 'กลางคืน', range: '21:00-05:00', data: pickWindow(21, 5, 21) },
    ];
  };

  const todayOverviewSlots = [
    { label: 'เช้า', range: '06:00-11:00', data: chartData.find((item) => Number(item.time.slice(0, 2)) >= 6 && Number(item.time.slice(0, 2)) <= 11) || chartData[0] },
    { label: 'บ่าย', range: '12:00-16:00', data: chartData.find((item) => Number(item.time.slice(0, 2)) >= 12 && Number(item.time.slice(0, 2)) <= 16) || chartData[4] || chartData[0] },
    { label: 'เย็น', range: '17:00-20:00', data: chartData.find((item) => Number(item.time.slice(0, 2)) >= 17 && Number(item.time.slice(0, 2)) <= 20) || chartData[8] || chartData[0] },
    { label: 'กลางคืน', range: '21:00-05:00', data: chartData.find((item) => {
      const hour = Number(item.time.slice(0, 2));
      return hour >= 21 || hour <= 5;
    }) || chartData[12] || chartData[0] },
  ];

  const tomorrowOverviewSlots = buildOverviewSlotsForDate(1);

  const renderOverviewCard = (title, slots, accent = '#2563eb') => (
    <div style={{ background: cardBg, borderRadius: '18px', padding: isMobile ? '14px' : '16px', border: `1px solid ${borderColor}`, boxShadow: '0 12px 26px rgba(15,23,42,0.06)' }}>
      <h3 style={{ margin: '0 0 12px', color: textColor, fontSize: '0.98rem', fontWeight: 900 }}>
        <span style={{ color: accent }}>●</span> {title}
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, minmax(0, 1fr))', gap: '10px' }}>
        {slots.map((slot) => {
          const item = slot.data || {};
          return (
            <div key={slot.label} style={{ background: 'color-mix(in srgb, var(--bg-card) 92%, white)', border: `1px solid ${borderColor}`, borderRadius: '12px', padding: '12px', minHeight: '96px' }}>
              <div style={{ color: subTextColor, fontSize: '0.66rem', fontWeight: 900 }}>{slot.label}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                <div>
                  <div style={{ color: textColor, fontSize: '1rem', fontWeight: 900 }}>{Math.round(item.temp || 0)}° - {Math.round(item.feelsLike || item.temp || 0)}°</div>
                  <div style={{ color: subTextColor, fontSize: '0.62rem', fontWeight: 800, marginTop: '4px' }}>{slot.range}</div>
                </div>
                <span style={{ fontSize: '1.7rem', lineHeight: 1 }}>{item.icon || '🌤️'}</span>
              </div>
              <div style={{ color: item.rain >= 40 ? '#2563eb' : '#60a5fa', fontSize: '0.62rem', fontWeight: 900, marginTop: '8px' }}>ฝน {item.rain || 0}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const todayOverviewCard = renderOverviewCard('วันนี้ภาพรวม', todayOverviewSlots, '#2563eb');
  const tomorrowOverviewCard = renderOverviewCard('พรุ่งนี้ภาพรวม', tomorrowOverviewSlots, '#8b5cf6');

  const peakRainHour = [...chartData].sort((a, b) => (b.rain || 0) - (a.rain || 0))[0];
  const peakHeatHour = [...chartData].sort((a, b) => (b.feelsLike || b.temp || 0) - (a.feelsLike || a.temp || 0))[0];
  const firstDryEvening = chartData.find((item) => {
    const hour = Number(item.time.slice(0, 2));
    return hour >= 17 && hour <= 20 && item.rain < 40;
  });
  const nightStart = chartData.find((item) => {
    const hour = Number(item.time.slice(0, 2));
    return hour >= 21 || hour <= 4;
  });
  const todayTimelineItems = [
    {
      time: peakRainHour?.time || 'ช่วงบ่าย',
      title: (peakRainHour?.rain || 0) >= 50 ? 'ฝนเสี่ยงสุด' : 'จับตาเมฆฝน',
      detail: `โอกาสฝน ${peakRainHour?.rain || 0}%${peakRainHour?.rainAmount ? ` · ${Number(peakRainHour.rainAmount).toFixed(1)} มม.` : ''}`,
      icon: (peakRainHour?.rain || 0) >= 50 ? '🌧️' : '☁️',
      tone: (peakRainHour?.rain || 0) >= 50 ? '#2563eb' : '#64748b',
    },
    {
      time: peakHeatHour?.time || 'ช่วงบ่าย',
      title: 'ร้อนสุดของวัน',
      detail: `อุณหภูมิ ${peakHeatHour?.temp || maxTemp}° · รู้สึก ${peakHeatHour?.feelsLike || Math.round(current?.feelsLike || 0)}°`,
      icon: '🌡️',
      tone: (peakHeatHour?.feelsLike || 0) >= 38 ? '#ef4444' : '#f97316',
    },
    {
      time: firstDryEvening?.time || '18:00',
      title: firstDryEvening ? 'เหมาะออกไปข้างนอก' : 'กิจกรรมเบาในร่ม',
      detail: firstDryEvening ? `ฝนลดเหลือ ${firstDryEvening.rain}% เหมาะเดินทาง/ออกกำลังเบา` : 'ฝนยังสูง ควรลดกิจกรรมกลางแจ้ง',
      icon: firstDryEvening ? '🏃‍♂️' : '🏠',
      tone: firstDryEvening ? '#16a34a' : '#f59e0b',
    },
    {
      time: nightStart?.time || '21:00',
      title: 'ช่วงกลางคืน',
      detail: `อากาศราว ${nightStart?.temp || Math.round(current?.temp || 0)}° · ฝน ${nightStart?.rain || 0}%`,
      icon: '🌙',
      tone: '#8b5cf6',
    },
  ];

  const todayTimelineCard = (
    <div style={{ background: cardBg, borderRadius: '22px', padding: isMobile ? '16px' : '18px', border: `1px solid ${borderColor}`, boxShadow: '0 12px 26px rgba(15,23,42,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, color: textColor, fontSize: '1rem', fontWeight: 900 }}>🧭 ไทม์ไลน์วันนี้</h3>
        <div style={{ color: subTextColor, fontSize: '0.68rem', fontWeight: 800 }}>สรุปช่วงเวลาที่ควรรู้</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
        {todayTimelineItems.map((item) => (
          <div key={`${item.title}-${item.time}`} style={{ display: 'grid', gridTemplateColumns: '42px minmax(0, 1fr)', gap: '10px', alignItems: 'start', background: `linear-gradient(180deg, ${item.tone}10, var(--bg-secondary))`, border: `1px solid ${item.tone}30`, borderRadius: '16px', padding: '12px', minWidth: 0 }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${item.tone}18`, color: item.tone, fontSize: '1.2rem' }}>
              {item.icon}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: item.tone, fontSize: '0.72rem', fontWeight: 900 }}>{item.time}</div>
              <div style={{ color: textColor, fontSize: '0.88rem', fontWeight: 900, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
              <div style={{ color: subTextColor, fontSize: '0.68rem', lineHeight: 1.45, marginTop: '4px' }}>{item.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const rainNowcastCard = (
    <div style={{ background: `linear-gradient(180deg, ${nowcastRainAlert.bg}, ${cardBg})`, borderRadius: '22px', padding: isMobile ? '16px' : '18px', border: `1px solid ${nowcastRainAlert.tone}33`, boxShadow: '0 12px 26px rgba(15,23,42,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', minWidth: 0 }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${nowcastRainAlert.tone}18`, color: nowcastRainAlert.tone, fontSize: '1.35rem', flexShrink: 0 }}>
            {nowcastRainAlert.icon}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: subTextColor, fontSize: '0.68rem', fontWeight: 900 }}>แจ้งเตือนฝนระยะสั้น · อัปเดตทุก 15 นาที</div>
            <h3 style={{ margin: '4px 0 0', color: textColor, fontSize: isMobile ? '1rem' : '1.08rem', fontWeight: 900, lineHeight: 1.25 }}>
              {nowcastRainAlert.title}
            </h3>
            <div style={{ color: subTextColor, fontSize: '0.76rem', fontWeight: 800, lineHeight: 1.5, marginTop: '5px' }}>
              {nowcastRainAlert.detail}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRainAlertToggle}
          style={{
            border: `1px solid ${rainAlertEnabled ? '#16a34a55' : `${nowcastRainAlert.tone}44`}`,
            background: rainAlertEnabled ? 'rgba(22,163,74,0.12)' : 'rgba(255,255,255,0.68)',
            color: rainAlertEnabled ? '#16a34a' : nowcastRainAlert.tone,
            borderRadius: '999px',
            padding: '8px 12px',
            fontSize: '0.72rem',
            fontWeight: 900,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {rainAlertEnabled ? '✅ แจ้งเตือนเปิดอยู่' : '🔔 เปิดแจ้งเตือนฝน'}
        </button>
      </div>

      <div style={{ marginTop: '14px', height: '8px', borderRadius: '999px', background: 'rgba(148,163,184,0.18)', overflow: 'hidden' }}>
        <div style={{ width: `${nowcastRainAlert.progress}%`, height: '100%', borderRadius: '999px', background: `linear-gradient(90deg, ${nowcastRainAlert.tone}, ${nowcastRainAlert.level === 'clear' ? '#22c55e' : '#60a5fa'})` }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, minmax(0, 1fr))' : 'repeat(6, minmax(0, 1fr))', gap: '8px', marginTop: '12px' }}>
        {minutelyRows.slice(0, isMobile ? 3 : 6).map((item) => {
          const cellTone = item.rain >= 1 || item.probability >= 70 ? '#ef4444' : item.rain >= 0.1 || item.probability >= 45 ? '#f59e0b' : item.probability >= 25 ? '#2563eb' : '#16a34a';
          return (
            <div key={item.time} style={{ border: `1px solid ${cellTone}2e`, background: `${cellTone}0f`, borderRadius: '13px', padding: '8px', minWidth: 0 }}>
              <div style={{ color: cellTone, fontSize: '0.68rem', fontWeight: 900 }}>{item.minutesFromNow <= 0 ? 'ตอนนี้' : `+${item.minutesFromNow}น.`}</div>
              <div style={{ color: textColor, fontSize: '0.76rem', fontWeight: 900, marginTop: '3px' }}>{item.probability}%</div>
              <div style={{ color: subTextColor, fontSize: '0.6rem', fontWeight: 800, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: '10px', color: subTextColor, fontSize: '0.64rem', lineHeight: 1.45, fontWeight: 800 }}>
        ใช้ข้อมูล nowcast 15 นาทีเพื่อแจ้งเตือน ส่วนภาพเรดาร์ด้านล่างใช้ดูทิศทางกลุ่มฝนประกอบ
      </div>
    </div>
  );

  const supportGrid = (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.65fr) minmax(360px, 1fr)', gap: '20px', alignItems: 'start' }}>
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {rainNowcastCard}
        <WeatherRadar
          coords={coords}
          isMobile={isMobile}
          cardBg={cardBg}
          borderColor={borderColor}
          textColor={textColor}
          frameHeightOverride={isMobile ? undefined : '520px'}
          title="เรดาร์ฝน"
        />
        {todayTimelineCard}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
        <ActivityRecommendations
          current={current}
          chartData={chartData}
          isMobile={isMobile}
          cardBg={cardBg}
          borderColor={borderColor}
          subTextColor={subTextColor}
        />
        <SunriseSunsetArc
          current={current}
          cardBg={cardBg}
          borderColor={borderColor}
          textColor={textColor}
          subTextColor={subTextColor}
          isMobile={isMobile}
        />
      </div>
    </div>
  );

  const desktopShowcaseLayout = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', minWidth: 0 }}>
      <div style={{ ...surfaceCardStyle, padding: '20px' }}>
        {heroCard}
        {quickActionBar}
        {preferencePanel}
        {healthAdviceBar}
        {highlightMetricsGrid}
      </div>
      {hourlyForecastCard}
      {todayOverviewCard}
      {tomorrowOverviewCard}
      {briefingCard}
      {supportGrid}
    </div>
  );

  const desktopOverviewLayout = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', minWidth: 0 }}>
      {desktopShowcaseLayout}
    </div>
  );

  const mobileOverviewLayout = (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', flexShrink: 0, width: '100%', alignItems: 'stretch', minWidth: 0 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', flexShrink: 0, alignItems: 'stretch' }}>
          {heroCard}
          {quickActionBar}
          {preferencePanel}
          {healthAdviceBar}
          {highlightMetricsGrid}
        </div>

        {todayOverviewCard}
        {tomorrowOverviewCard}
        {briefingCard}
        {supportGrid}
      </div>
    </div>
  );

  return (
    <div ref={mainScrollRef} style={{ height: '100%', width: '100%', background: appBg, display: 'flex', justifyContent: 'center', overflowY: 'auto', fontFamily: 'Kanit, sans-serif', position: 'relative' }} className="hide-scrollbar">
      <style dangerouslySetInnerHTML={{__html: `.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } .fade-in { animation: fadeIn 0.3s ease-in-out; } @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } } @keyframes pulseGlow { 0% { filter: drop-shadow(0 0 10px rgba(255,255,255,0.1)); transform: scale(1); } 50% { filter: drop-shadow(0 0 25px rgba(255,255,255,0.4)); transform: scale(1.05); } 100% { filter: drop-shadow(0 0 10px rgba(255,255,255,0.1)); transform: scale(1); } }`}} />
      
      <div style={{ width: '100%', maxWidth: isMobile ? '600px' : 'none', display: 'flex', flexDirection: 'column', gap: isMobile ? '12px' : '20px', padding: isMobile ? '15px 15px 40px' : '24px 24px 40px', margin: '0 auto' }}>

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
              <select value={selectedDist} onChange={handleDistChange} disabled={districtDisabled} style={{ flex: 1, minWidth: '130px', background: 'var(--bg-secondary)', color: textColor, border: 'none', fontWeight: 'bold', fontSize: '0.95rem', padding: '10px', borderRadius: '12px', outline: 'none', cursor: districtDisabled ? 'not-allowed' : 'pointer', opacity: districtDisabled ? 0.5 : 1 }}>
                <option value="">
                  {!selectedProv ? '-- เลือกอำเภอ --' : districtLoading ? 'กำลังดึงข้อมูล...' : geoError ? '⚠️ โหลดไฟล์ล้มเหลว' : currentAmphoes.length === 0 ? '⚠️ ไม่พบข้อมูลอำเภอ' : '-- เลือกอำเภอ --'}
                </option>
                {currentAmphoes.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
              </select>
              <button
                type="button"
                onClick={handleSaveFavorite}
                disabled={!selectedProv && !coords}
                style={{
                  border: `1px solid ${borderColor}`,
                  background: 'rgba(245,158,11,0.12)',
                  color: '#d97706',
                  fontWeight: 900,
                  fontSize: '0.78rem',
                  padding: '10px 13px',
                  borderRadius: '12px',
                  cursor: (!selectedProv && !coords) ? 'not-allowed' : 'pointer',
                  opacity: (!selectedProv && !coords) ? 0.5 : 1,
                }}
              >
                ⭐ ปักหมุด
              </button>
              {favoriteLocation?.lat && favoriteLocation?.lon && (
                <button
                  type="button"
                  onClick={handleUseFavorite}
                  style={{
                    border: `1px solid ${borderColor}`,
                    background: 'rgba(37,99,235,0.1)',
                    color: '#2563eb',
                    fontWeight: 900,
                    fontSize: '0.78rem',
                    padding: '10px 13px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                  }}
                  title={favoriteLocation.label}
                >
                  📍 พื้นที่โปรด
                </button>
              )}
            </div>
        )}

        
        {isMobile ? mobileOverviewLayout : desktopOverviewLayout}

        {/* === SECTION 9: Daily Forecast 7 days (full width) === */}
        <DailyForecast 
           daily={daily}
           isMobile={isMobile}
           cardBg={cardBg}
           borderColor={borderColor}
           textColor={textColor}
           subTextColor={subTextColor}
        />

        {/* === SECTION 10: Top 5 Stats (collapsible) === */}
        <TopStats 
           top5Heat={top5Heat}
           top5Cool={top5Cool}
           top5PM25={top5PM25}
           top5Rain={top5Rain}
           isMobile={isMobile}
           cardBg={cardBg}
           borderColor={borderColor}
           textColor={textColor}
           showYesterday={false}
           compactHeader
        />

        {/* === SECTION 11: GISTDA Disaster Summary === */}
        <DisasterSummary 
           isMobile={isMobile}
           cardBg={cardBg}
           borderColor={borderColor}
           textColor={textColor}
           subTextColor={subTextColor}
        />

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
