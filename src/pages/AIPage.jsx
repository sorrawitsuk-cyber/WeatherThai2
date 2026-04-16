import React, { useContext, useState, useEffect, useMemo, useRef } from 'react';
import { WeatherContext } from '../context/WeatherContext';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, YAxis, CartesianGrid } from 'recharts';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default function AIPage() {
  const { stations, darkMode, amphoeData } = useContext(WeatherContext);
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [locationName, setLocationName] = useState('กำลังระบุตำแหน่ง...');
  const [selectedProv, setSelectedProv] = useState('');
  const [selectedDist, setSelectedDist] = useState('');
  const [targetDateIdx, setTargetDateIdx] = useState(-1); 
  const [activeTab, setActiveTab] = useState('summary'); 
  
  const [geoData, setGeoData] = useState([]);
  useEffect(() => {
    fetch('/thai_geo.json')
      .then(res => res.json())
      .then(data => setGeoData(Array.isArray(data) ? data : (data.data || [])))
      .catch(e => console.log(e));
  }, []);

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
  
  const [weatherData, setWeatherData] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(true);

  const [chatInput, setChatInput] = useState('');
  const [chatLogs, setChatLogs] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
      if (chatEndRef.current) {
          chatEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
  }, [chatLogs]);

  const fetchWeatherByCoords = async (lat, lon) => {
    try {
      setLoadingWeather(true);
      const wUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,surface_pressure,wind_speed_10m,visibility&hourly=temperature_2m,precipitation_probability,pm2_5,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_probability_max,wind_speed_10m_max&timezone=Asia%2FBangkok`;
      const aUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm2_5&hourly=pm2_5&timezone=Asia%2FBangkok`;

      const [wRes, aRes] = await Promise.all([fetch(wUrl), fetch(aUrl)]);
      const wData = await wRes.json();
      const aData = await aRes.json();

      if (wRes.ok && aRes.ok) {
        setWeatherData({
          current: {
            temp: wData.current.temperature_2m,
            feelsLike: wData.current.apparent_temperature,
            humidity: wData.current.relative_humidity_2m,
            windSpeed: wData.current.wind_speed_10m,
            pressure: wData.current.surface_pressure,
            visibility: wData.current.visibility,
            uv: wData.daily.uv_index_max[0],
            pm25: aData.current.pm2_5,
            sunrise: wData.daily.sunrise[0],
            sunset: wData.daily.sunset[0],
            rainProb: wData.hourly.precipitation_probability[new Date().getHours()],
          },
          hourly: {
            time: wData.hourly.time,
            temperature_2m: wData.hourly.temperature_2m,
            precipitation_probability: wData.hourly.precipitation_probability,
            pm25: aData.hourly.pm2_5,
            wind_speed_10m: wData.hourly.wind_speed_10m
          },
          daily: {
            time: wData.daily.time,
            weathercode: wData.daily.weather_code,
            temperature_2m_max: wData.daily.temperature_2m_max,
            temperature_2m_min: wData.daily.temperature_2m_min,
            apparent_temperature_max: wData.daily.apparent_temperature_max,
            pm25_max: wData.daily.time.map(dateStr => {
              let maxPm = null;
              if (aData.hourly && aData.hourly.time) {
                aData.hourly.time.forEach((t, i) => {
                  if (t.startsWith(dateStr) && aData.hourly.pm2_5[i] != null) {
                    if (maxPm === null || aData.hourly.pm2_5[i] > maxPm) {
                      maxPm = aData.hourly.pm2_5[i];
                    }
                  }
                });
              }
              return maxPm !== null ? Math.round(maxPm) : Math.round(aData.current?.pm2_5 || 0);
            }), 
            precipitation_probability_max: wData.daily.precipitation_probability_max,
            uv_index_max: wData.daily.uv_index_max,
            wind_speed_10m_max: wData.daily.wind_speed_10m_max
          },
          coords: { lat, lon }
        });
      }
    } catch (err) {
        console.error("Fetch local weather failed", err);
    } finally {
      setLoadingWeather(false);
    }
  };

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
      setLoadingWeather(true);
      navigator.geolocation.getCurrentPosition((pos) => {
        fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
        fetchLocationName(pos.coords.latitude, pos.coords.longitude);
        setSelectedProv('');
        setSelectedDist('');
      }, () => {
        setLoadingWeather(false);
      }, { timeout: 5000 });
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
  }, []);

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

  const getWeatherFactorsForDay = (dayIdx) => {
    if (!weatherData || !weatherData.daily) return null;
    if (dayIdx === -1) {
        return {
            tMax: Math.round(weatherData.current?.temp ?? 0),
            tMin: Math.round(weatherData.current?.temp ?? 0),
            rain: weatherData.current?.rainProb ?? 0,
            uvMax: weatherData.daily.uv_index_max?.[0] ?? 0,
            windMax: Math.round(weatherData.current?.windSpeed ?? 0),
            pm25: Math.round(weatherData.current?.pm25 ?? 0)
        };
    }
    const d = weatherData.daily;
    const tMax = Math.round(d.temperature_2m_max?.[dayIdx] ?? 0);
    const tMin = Math.round(d.temperature_2m_min?.[dayIdx] ?? 0);
    const rain = d.precipitation_probability_max?.[dayIdx] ?? 0;
    const uvMax = d.uv_index_max?.[dayIdx] ?? 0;
    const windMax = Math.round(d.wind_speed_10m_max?.[dayIdx] ?? 0); 
    const pm25 = d.pm25_max?.[dayIdx] !== undefined ? Math.round(d.pm25_max[dayIdx]) : Math.round(weatherData.current?.pm25 ?? 0);
    return { tMax, tMin, rain, uvMax, windMax, pm25 };
  };

  const calcScore = (tabId, dayIdx) => {
    const factors = getWeatherFactorsForDay(dayIdx);
    if (!factors) return 0;
    const { rain, tMax, uvMax, windMax, pm25, tMin } = factors;
    let baseScore = 10;
    switch (tabId) {
      case 'laundry': 
        if (rain > 30) baseScore -= 5;
        if (rain > 60) baseScore -= 3;
        if (windMax >= 10 && windMax <= 25 && rain < 20) baseScore += 1; 
        if (windMax > 35) baseScore -= 3;
        break;
      case 'exercise': 
        if (pm25 > 37.5) baseScore -= 5;
        if (tMax > 36) baseScore -= 3;
        if (rain > 50) baseScore -= 2;
        if (uvMax > 8) baseScore -= 1; 
        break;
      case 'outdoor': 
        if (rain > 40) baseScore -= 4;
        if (tMax > 37) baseScore -= 3;
        if (uvMax > 8) baseScore -= 2;
        if (windMax > 30) baseScore -= 2; 
        break;
      case 'travel': 
        if (rain > 50) baseScore -= 4;
        if (tMax > 38) baseScore -= 3;
        if (uvMax > 10) baseScore -= 2;
        break;
      case 'farming': 
        if (rain > 70) baseScore -= 4;
        if (tMax > 38) baseScore -= 3;
        if (windMax > 15) baseScore -= 3; 
        break;
      case 'pets': 
        if (tMax > 35) baseScore -= 4;
        if (rain > 40) baseScore -= 3;
        if (uvMax > 8) baseScore -= 1; 
        break;
      case 'construction': 
        if (rain > 50) baseScore -= 5;
        if (rain > 30) baseScore -= 2;
        if (windMax > 20) baseScore -= 3;
        if (tMax > 36) baseScore -= 2;
        break;
      case 'rain_risk':
        baseScore -= Math.round(rain / 10);
        break;
      case 'health':
        if (pm25 > 37.5) baseScore -= 4;
        if (pm25 > 50) baseScore -= 3;
        if (tMax > 35) baseScore -= 2;
        break;
      case 'photography':
        if (rain > 40) baseScore -= 4;
        if (pm25 > 37.5) baseScore -= 3;
        break;
      case 'vending':
        if (rain > 40) baseScore -= 4;
        if (tMax > 38) baseScore -= 3;
        if (windMax > 25) baseScore -= 2;
        break;
      case 'solar':
        if (rain > 40) baseScore -= 4;
        if (uvMax < 5) baseScore -= 2;
        if (rain > 60) baseScore -= 3;
        break;
      default: 
        if (rain > 50) baseScore -= 2;
        if (tMax > 37) baseScore -= 2;
        if (pm25 > 50) baseScore -= 2;
    }
    return Math.max(1, Math.min(10, baseScore)); 
  };

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
  }, [weatherData, targetDateIdx]);

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
  }, [weatherData, activeTab]);

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
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            setChatLogs([...newLogs, { role: 'ai', text: '⚠️ ระบบตอบกลับอัตโนมัติ AI ยังไม่สามารถใช้งานได้ กรุณาตั้งค่า VITE_GEMINI_API_KEY ก่อนครับ' }]);
            setIsChatLoading(false);
            return;
        }
        
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const factors = getWeatherFactorsForDay(targetDateIdx);
        const modeLabel = tabConfigs.find(t=>t.id===activeTab)?.label || "ทั่วไป";
        
        const context = `คุณคือ AI ผู้เชี่ยวชาญการพยากรณ์อากาศของ Thai Weather. ตอบคำถามผู้ใช้อย่างเป็นมิตร กระชับ เข้าใจง่าย 
ข้อมูลอุตุนิยมวิทยาวันนี้: โหมด ${modeLabel}, อุณหภูมิ ${factors.tMin}-${factors.tMax}°C, ขับลูมUV ${factors.uvMax}, โอกาสฝน ${factors.rain}%, ความเร็วลม ${factors.windMax}กม/ชม, ฝุ่น PM2.5: ${factors.pm25} µg/m³.
ประวัติแชท: ${newLogs.map(l => l.role + ': ' + l.text).join(' | ')}.
ตอบคำถามล่าสุดได้เลย:`;

        const result = await model.generateContent(context);
        const text = await result.response.text();
        setChatLogs([...newLogs, { role: 'ai', text: text }]);
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
    const { tMax, tMin, rain, uvMax, windMax, pm25 } = factors;
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
          if (tMax > 36 || uvMax > 8) return `ประเมินความเสี่ยง: ดัชนีรังสี UV (**${uvMax}**) และอุณหภูมิอยู่ใน**ระดับอันตราย** **ระวังภาวะฮีทสโตรกและผิวหนังไหม้แดด** **ควรเลี่ยงการออกกำลังกายในช่วงบ่ายเด็ดขาด**`;
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
          if (tMax > 36) return `ประเมินความเสี่ยง: ความร้อนและอุณหภูมิอยู่ใน**ระดับสูงมาก** **ผู้คุมงานควรสลับช่วงเวลาพักให้บ่อยขึ้นและเตรียมน้ำดื่มให้เพียงพอ เพื่อป้องกันภาวะฮีทสโตรก**`;
          return `ประเมินความเสี่ยง: สภาพอากาศโดยรวมปลอดโปร่ง เอื้ออำนวยให้**สามารถดำเนินงานก่อสร้างหรือเทคอนกรีตภายนอกอาคารได้ตามปกติ**`;
      }
      if (activeTab === 'rain_risk') {
          if (rain > 60) return `ประเมินความเสี่ยง: **มีความเสี่ยงที่จะมีฝนตกหนักสูงมาก โอกาส ${rain}%** **แนะนำให้หลีกเลี่ยงการทำกิจกรรมกลางแจ้ง และพกร่มหรือสิ่งกันฝนอย่างแน่นอน**`;
          if (rain > 30) return `ประเมินความเสี่ยง: **อาจมีฝนตกระหว่างวัน โอกาสประมาณ ${rain}%** **ควรพกร่มเป็นตัวช่วยหากต้องออกจากตัวบ้าน**`;
          return `ประเมินความเสี่ยง: โอกาสการเกิดฝนตกอยู่ในเกณฑ์ที่ปลอดภัย ท้องฟ้าส่วนใหญ่น่าจะสดใส **ไม่จำเป็นต้องกังวลเรื่องฝนตก**`;
      }
      if (activeTab === 'health') {
          if (pm25 > 50) return `ประเมินความเสี่ยง: สภาพแวดล้อมและฝุ่นอยู่ในระดับ **อันตรายอย่างยิ่งต่อสุขภาพ (${pm25} µg/m³)** ผู้สูงอายุและผู้ป่วยควรหลีกเลี่ยงควันฝุ่นเด็ดขาด`;
          if (tMax > 37) return `ประเมินความเสี่ยง: อุณหภูมิพุ่งสูง **${tMax}°C** ซึ่งอันตรายต่อภาวะฮีทสโตรก **ดื่มน้ำสม่ำเสมอและอย่าอยู่กับแสงแดดนานเกินไป**`;
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
      const isHot = tMax > 35;
      
      const lines = {
        summary: [
          { time: 'ช่วงเช้า (06:00 - 12:00)', icon: '🌅', text: `อุณหภูมิเริ่มต้นที่ **${tMin}°C** สภาพอากาศ**เหมาะสมสำหรับการเริ่มต้นวัน**` },
          { time: 'ช่วงบ่าย (12:00 - 18:00)', icon: '☀️', text: isHot ? `อุณหภูมิสูงสุดแตะระดับ **${tMax}°C** **ควรหลีกเลี่ยงแสงแดดจัด**` : `อุณหภูมิสูงสุด **${tMax}°C** สภาพอากาศโดยรวมทรงตัว` },
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
  }, [activeTab, currentScores, targetDateIdx, weatherData]);

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
      } catch { }
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
    <div style={{ width: '100%', minHeight: '100dvh', background: appBg, display: 'block', overflowX: 'hidden', overflowY: 'auto', WebkitOverflowScrolling: 'touch', fontFamily: 'Kanit, sans-serif', boxSizing: 'border-box' }} className="hide-scrollbar">
      
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
      `}} />

      <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', padding: isMobile ? '15px' : '30px', paddingBottom: '120px', boxSizing: 'border-box' }}>

        {/* 📍 Header & Date Selector */}
        <div className="no-print" style={{ background: cardBg, borderRadius: '24px', padding: '20px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.4rem', color: textColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        ✨ ระบบประเมินสภาพอากาศ
                    </h1>
                    <div style={{ fontSize: '0.85rem', color: subTextColor, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        พื้นที่การวิเคราะห์: <span style={{color: '#0ea5e9', fontWeight: 'bold'}}>{locationName}</span> 
                        <button onClick={handleCurrentLocation} title="ใช้ตำแหน่งปัจจุบัน" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 5px', filter: 'grayscale(0.2)' }}>🎯</button>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', width: isMobile ? '100%' : 'auto' }}>
                    {isMobile && (
                        <select value={targetDateIdx} onChange={(e) => setTargetDateIdx(parseInt(e.target.value))} style={{ flex: 1, minWidth: 0, padding: '8px 12px', borderRadius: '12px', background: 'var(--bg-secondary)', color: textColor, border: `1px solid ${borderColor}`, fontFamily: 'Kanit', outline: 'none' }}>
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
                    }} style={{ flex: isMobile ? 1 : 'auto', minWidth: 0, padding: '8px 12px', borderRadius: '12px', background: 'var(--bg-secondary)', color: textColor, border: `1px solid ${borderColor}`, fontFamily: 'Kanit', outline: 'none' }}>
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
                    }} disabled={!selectedProv || currentAmphoes.length === 0} style={{ flex: isMobile ? 1 : 'auto', minWidth: 0, padding: '8px 12px', borderRadius: '12px', background: 'var(--bg-secondary)', color: textColor, border: `1px solid ${borderColor}`, fontFamily: 'Kanit', outline: 'none', opacity: (!selectedProv || currentAmphoes.length === 0) ? 0.5 : 1 }}>
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
                boxShadow: `0 15px 40px ${activeColor}15`, position: 'relative', overflow: 'hidden'
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
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch', flexWrap: 'wrap' }}>
                        {activeTab !== 'summary' && (
                            <button onClick={() => setActiveTab('summary')} style={{ background: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: textColor, border: `1px solid ${borderColor}`, padding: '8px 12px', borderRadius: '12px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                🔙 กลับหน้าภาพรวม
                            </button>
                        )}
                        <div className="no-print" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button onClick={exportToCSV} title="Export to CSV" style={{ background: darkMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)', color: textColor, border: `1px solid ${borderColor}`, padding: '8px 12px', borderRadius: '12px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', backdropFilter: 'blur(5px)' }}>CSV</button>
                            <button onClick={exportToJSON} title="Export to JSON" style={{ background: darkMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)', color: textColor, border: `1px solid ${borderColor}`, padding: '8px 12px', borderRadius: '12px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', backdropFilter: 'blur(5px)' }}>JSON</button>
                            <button onClick={exportToPDF} title="Export to PDF (Print)" style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '12px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(239,68,68,0.3)' }}>PDF</button>
                            <button onClick={handleShare} title="Share" style={{ background: '#10b981', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '12px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 10px rgba(16,185,129,0.3)' }}><span>📤</span> แชร์</button>
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



                <div style={{ padding: '24px', background: 'var(--bg-overlay-heavy)', borderRadius: '20px', border: `1px solid ${activeColor}20`, borderLeft: `6px solid ${activeColor}`, marginBottom: '35px', backdropFilter: 'blur(10px)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                    <p style={{ margin: 0, fontSize: '1.05rem', color: textColor, lineHeight: 1.7, fontWeight: '500' }}>{renderHighlightedText(aiReport.advice, activeColor)}</p>
                </div>

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
                        <div key={i} style={{ display: 'flex', gap: '18px', position: 'relative' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: activeColor, zIndex: 1, border: `4px solid ${darkMode ? '#050d1a' : '#ffffff'}`, boxShadow: `0 0 0 1px ${activeColor}40` }}></div>
                                {i !== aiReport.timeline.length - 1 && <div style={{ width: '2px', flex: 1, background: `linear-gradient(to bottom, ${activeColor}80, ${activeColor}20)`, marginTop: '-8px', marginBottom: '-8px' }}></div>}
                            </div>
                            <div style={{ flex: 1, paddingBottom: i !== aiReport.timeline.length - 1 ? '20px' : '0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '1.3rem', background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', padding: '5px', borderRadius: '10px' }}>{item.icon}</span>
                                    <span style={{ fontWeight: '800', color: textColor, fontSize: '1rem' }}>{item.time}</span>
                                </div>
                                <div style={{ fontSize: '0.95rem', color: darkMode ? '#d8eeff' : '#475569', lineHeight: 1.6, background: darkMode ? 'rgba(96,202,242,0.05)' : 'rgba(0,0,0,0.02)', padding: '15px 18px', borderRadius: '16px', border: `1px solid ${borderColor}` }}>
                                    {renderHighlightedText(item.text, activeColor)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 💬 AI Chat Container */}
                <h4 style={{ margin: '0 0 15px 0', color: textColor, display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.1rem' }}>
                    <div style={{background: `linear-gradient(135deg, ${activeColor}, ${activeColor}dd)`, color: '#fff', width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', boxShadow: `0 4px 10px ${activeColor}40`}}>🤖</div> 
                    <span style={{fontWeight: '800'}}>ถามคำถามเกี่ยวกับสภาพอากาศเพิ่มเติม</span>
                </h4>
                <div style={{ background: darkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.8)', borderRadius: '20px', padding: '20px', border: `1px solid ${borderColor}` }}>
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
                                <div style={{
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
                    
                    <form onSubmit={handleChatSubmit} style={{ display: 'flex', gap: '10px' }}>
                        <input 
                            type="text" 
                            value={chatInput} 
                            onChange={(e) => setChatInput(e.target.value)} 
                            placeholder="พิมพ์คำถามของคุณที่นี่..." 
                            style={{ flex: 1, padding: '12px 16px', borderRadius: '12px', border: `1px solid ${borderColor}`, background: darkMode ? '#0b1629' : '#fff', color: textColor, fontFamily: 'Kanit', outline: 'none' }} 
                            disabled={isChatLoading}
                        />
                        <button type="submit" disabled={isChatLoading || !chatInput.trim()} style={{ background: activeColor, color: '#fff', border: 'none', padding: '0 20px', borderRadius: '12px', cursor: (isChatLoading || !chatInput.trim()) ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: (isChatLoading || !chatInput.trim()) ? 0.6 : 1 }}>
                            ส่ง
                        </button>
                    </form>
                </div>
            </div>
        )}

      </div>
    </div>
  );
}