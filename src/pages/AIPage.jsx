import React, { useContext, useState, useEffect, useMemo } from 'react';
import { WeatherContext } from '../context/WeatherContext';

export default function AIPage() {
  // 🌟 1. ดึงเฉพาะสิ่งที่มีใน Context จริงๆ
  const { stations, darkMode } = useContext(WeatherContext);
  
  // 🌟 2. States สำหรับเก็บข้อมูลและสถานะของหน้านี้
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [locationName, setLocationName] = useState('กำลังระบุตำแหน่ง...');
  const [selectedProv, setSelectedProv] = useState('');
  const [targetDateIdx, setTargetDateIdx] = useState(0); 
  const [activeTab, setActiveTab] = useState('summary'); 
  const [weatherData, setWeatherData] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(true);

  // 🌟 3. ฟังก์ชันดึงข้อมูล API 
  const fetchWeatherByCoords = async (lat, lon) => {
    try {
      setLoadingWeather(true);
      const wUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,surface_pressure,wind_speed_10m,visibility&hourly=temperature_2m,precipitation_probability,pm2_5&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_probability_max&timezone=Asia%2FBangkok`;
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
            pm25: aData.hourly.pm2_5
          },
          daily: {
            time: wData.daily.time,
            weathercode: wData.daily.weather_code,
            temperature_2m_max: wData.daily.temperature_2m_max,
            temperature_2m_min: wData.daily.temperature_2m_min,
            apparent_temperature_max: wData.daily.apparent_temperature_max,
            pm25_max: new Array(7).fill(aData.current.pm2_5),
            precipitation_probability_max: wData.daily.precipitation_probability_max
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
      setLocationName(data?.locality || data?.city || 'ตำแหน่งปัจจุบัน');
    } catch (e) { setLocationName('ตำแหน่งปัจจุบัน'); }
  };

  // 🌟 4. Effects ตอนเปิดหน้า
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
        fetchLocationName(pos.coords.latitude, pos.coords.longitude);
      }, () => {
        fetchWeatherByCoords(13.75, 100.5); 
        setLocationName('กรุงเทพมหานคร');
      }, { timeout: 5000 });
    } else {
        fetchWeatherByCoords(13.75, 100.5); 
        setLocationName('กรุงเทพมหานคร');
    }
    return () => window.removeEventListener('resize', handleResize);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🧠 5. AI Engine: ดึงข้อมูลและคำนวณ
  const aiReport = useMemo(() => {
    if (!weatherData || !weatherData.daily) return null;

    const d = weatherData.daily;
    const tMax = Math.round(d.temperature_2m_max?.[targetDateIdx] ?? 0);
    const tMin = Math.round(d.temperature_2m_min?.[targetDateIdx] ?? 0);
    const rain = d.precipitation_probability_max?.[targetDateIdx] ?? 0;
    const pm25 = d.pm25_max?.[targetDateIdx] !== undefined ? Math.round(d.pm25_max[targetDateIdx]) : Math.round(weatherData.current?.pm25 ?? 0);

    // 💡 สรุปด่วน (TL;DR)
    const getQuickAnswers = () => {
      let rainAns = { icon: '☀️', title: 'ฝนตกไหม?', text: 'ปลอดฝน ท้องฟ้าโปร่ง', color: '#22c55e' };
      if (rain > 60) rainAns = { icon: '☔', title: 'ฝนตกไหม?', text: `เสี่ยงสูง โอกาส ${rain}%`, color: '#ef4444' };
      else if (rain > 20) rainAns = { icon: '⛅', title: 'ฝนตกไหม?', text: `อาจมีประปราย ${rain}%`, color: '#f97316' };

      let heatAns = { icon: '😊', title: 'ร้อนไหม?', text: `เกณฑ์ปกติ ${tMax}°C`, color: '#22c55e' };
      if (tMax >= 39) heatAns = { icon: '🥵', title: 'ร้อนไหม?', text: `อุณหภูมิวิกฤต ${tMax}°C`, color: '#ef4444' };
      else if (tMax >= 35) heatAns = { icon: '🔥', title: 'ร้อนไหม?', text: `ร้อนจัด ${tMax}°C`, color: '#f97316' };

      let dustAns = { icon: '🍃', title: 'ฝุ่นเยอะไหม?', text: `คุณภาพอากาศดี ${pm25} µg`, color: '#22c55e' };
      if (pm25 > 50) dustAns = { icon: '😷', title: 'ฝุ่นเยอะไหม?', text: `ระดับอันตราย ${pm25} µg`, color: '#ef4444' };
      else if (pm25 > 25) dustAns = { icon: '🤧', title: 'ฝุ่นเยอะไหม?', text: `เริ่มมีมลพิษ ${pm25} µg`, color: '#f97316' };

      return [rainAns, heatAns, dustAns];
    };

    // 💡 คำนวณคะแนนตามบริบท
    const calculateScore = () => {
      let baseScore = 10;
      switch (activeTab) {
        case 'home': 
          if (rain > 40) baseScore -= 5;
          if (tMax > 33) baseScore += 1;
          break;
        case 'travel': 
          if (rain > 30) baseScore -= 3;
          if (tMax > 36) baseScore -= 3;
          if (pm25 > 37.5) baseScore -= 2;
          break;
        case 'health': 
          if (pm25 > 37.5) baseScore -= 4;
          if (tMax > 38) baseScore -= 3;
          break;
        case 'driving': 
          if (rain > 60) baseScore -= 4;
          break;
        default: 
          if (rain > 50) baseScore -= 2;
          if (tMax > 37) baseScore -= 2;
          if (pm25 > 50) baseScore -= 2;
      }
      return Math.max(1, Math.min(10, baseScore)); 
    };
    const finalScore = calculateScore();

    // 💡 ข้อความแนะนำหลัก (วิชาการ)
    const getMainAdvice = () => {
      if (activeTab === 'home' && rain > 40) return `คำแนะนำจากข้อมูล: สภาพอากาศมีความเสี่ยงฝนตก ${rain}% ควรหลีกเลี่ยงการซักผ้าหรือตากสิ่งของภายนอกอาคาร แนะนำให้ใช้วิธีการอบแห้งหรือตากในที่ร่มเพื่อป้องกันความชื้นสะสม`;
      if (activeTab === 'health' && pm25 > 37.5) return `คำแนะนำด้านสุขภาพ: คุณภาพอากาศอยู่ในเกณฑ์ที่มีผลกระทบต่อสุขภาพ (PM2.5: ${pm25} µg/m³) ควรงดการออกกำลังกายกลางแจ้ง และพิจารณาทำกิจกรรมในร่มที่มีระบบฟอกอากาศ`;
      if (activeTab === 'travel' && tMax > 37) return `คำแนะนำด้านการท่องเที่ยว: อุณหภูมิพุ่งสูงถึงระดับ ${tMax}°C ควรหลีกเลี่ยงการอยู่กลางแจ้งเป็นเวลานาน แนะนำให้จัดกำหนดการเยี่ยมชมสถานที่แบบปิด (Indoor) ในช่วงบ่าย`;
      if (finalScore >= 8) return `สรุปการประเมิน: สภาพอากาศโดยรวมอยู่ในเกณฑ์ดีเยี่ยม ปัจจัยทางอุตุนิยมวิทยาเอื้ออำนวยต่อการดำเนินการตามแผนกิจกรรมที่ตั้งไว้`;
      return `สรุปการประเมิน: สภาพอากาศอยู่ในเกณฑ์ปานกลาง มีความผันผวนของปัจจัยสภาพแวดล้อมบางประการ ควรเตรียมความพร้อมและแผนสำรองสำหรับการเปลี่ยนแปลงระหว่างวัน`;
    };

    // 💡 Timeline แนะนำแบบวิชาการ
    const getTimeline = () => {
      const isRainy = rain > 40;
      const isHot = tMax > 35;
      
      const lines = {
        summary: [
          { time: 'ช่วงเช้า (06:00 - 12:00)', icon: '🌅', text: `อุณหภูมิเริ่มต้นที่ ${tMin}°C สภาพอากาศเหมาะสมสำหรับการเริ่มต้นกิจกรรม` },
          { time: 'ช่วงบ่าย (12:00 - 18:00)', icon: '☀️', text: isHot ? `อุณหภูมิสูงสุดแตะระดับ ${tMax}°C ควรหลีกเลี่ยงแสงแดดจัดและรักษาความชุ่มชื้นของร่างกาย` : `อุณหภูมิสูงสุด ${tMax}°C สภาพอากาศโดยรวมทรงตัว` },
          { time: 'ช่วงค่ำ (18:00 เป็นต้นไป)', icon: '🌙', text: isRainy ? `มีความเสี่ยงฝนฟ้าคะนอง ควรเตรียมอุปกรณ์กันฝนเมื่อต้องออกนอกอาคาร` : `อุณหภูมิลดลง สภาพอากาศโปร่งสบาย เหมาะสมแก่การพักผ่อน` }
        ],
        travel: [
          { time: 'ช่วงเช้า (06:00 - 12:00)', icon: '🌅', text: isRainy ? `ตรวจสอบสภาพอากาศก่อนออกเดินทาง อาจมีฝนตกประปรายในบางพื้นที่` : `สภาพแสงและอุณหภูมิเหมาะสมอย่างยิ่งสำหรับการท่องเที่ยวและการถ่ายภาพ` },
          { time: 'ช่วงบ่าย (12:00 - 18:00)', icon: '☀️', text: isHot ? `ดัชนีความร้อนสูงระดับอันตราย แนะนำให้ปรับแผนไปท่องเที่ยวในอาคารหรือพิพิธภัณฑ์ปรับอากาศ` : `เหมาะกับการท่องเที่ยวกลางแจ้ง ควรพกน้ำดื่มเพื่อป้องกันภาวะขาดน้ำ` },
          { time: 'ช่วงค่ำ (18:00 เป็นต้นไป)', icon: '🌙', text: `บรรยากาศและอุณหภูมิช่วงเย็นเหมาะสมสำหรับการพักผ่อนหรือรับประทานอาหารนอกสถานที่` }
        ],
        health: [
          { time: 'ช่วงเช้า (06:00 - 12:00)', icon: '🌅', text: pm25 > 37.5 ? `ค่าฝุ่น PM2.5 สูงเกินมาตรฐาน ควรงดการวิ่งหรือออกกำลังกายกลางแจ้งโดยเด็ดขาด` : `คุณภาพอากาศอยู่ในเกณฑ์ดีเยี่ยม เหมาะสำหรับการวิ่งหรือออกกำลังกายกลางแจ้ง` },
          { time: 'ช่วงบ่าย (12:00 - 18:00)', icon: '☀️', text: isHot ? `ความร้อนระดับอันตราย งดกิจกรรมที่ใช้พละกำลังมากเพื่อลดความเสี่ยงโรคลมแดด (Heatstroke)` : `สามารถดำเนินกิจกรรมทางกายได้ตามปกติ แต่ควรหลีกเลี่ยงช่วงเวลาที่แดดจัดที่สุด` },
          { time: 'ช่วงค่ำ (18:00 เป็นต้นไป)', icon: '🌙', text: `อุณหภูมิเริ่มลดลง เหมาะสมสำหรับการทำกิจกรรมยืดเหยียดกล้ามเนื้อหรือโยคะเพื่อผ่อนคลาย` }
        ],
        driving: [
          { time: 'ช่วงเช้า (06:00 - 12:00)', icon: '🌅', text: `ทัศนวิสัยบนท้องถนนชัดเจน สภาพอากาศไม่เป็นอุปสรรคต่อการเดินทาง` },
          { time: 'ช่วงบ่าย (12:00 - 18:00)', icon: '☀️', text: isHot ? `อุณหภูมิพื้นผิวถนนสูง ควรตรวจสอบแรงดันลมยางและระบบหล่อเย็นของเครื่องยนต์ก่อนเดินทางไกล` : `สภาพแวดล้อมเหมาะสมและปลอดภัยต่อการขับขี่` },
          { time: 'ช่วงค่ำ (18:00 เป็นต้นไป)', icon: '🌙', text: isRainy ? `ควรใช้ความระมัดระวังสูงสุด ถนนอาจลื่นและทัศนวิสัยลดลงจากการเกิดเมฆฝน` : `การขับขี่ในช่วงค่ำไม่มีอุปสรรคทางด้านสภาพอากาศ` }
        ],
        home: [
          { time: 'ช่วงเช้า (06:00 - 12:00)', icon: '🌅', text: isRainy ? `ไม่แนะนำให้ซักผ้าชิ้นใหญ่ เนื่องจากสภาพความชื้นในอากาศมีแนวโน้มสูงขึ้น` : `สภาวะแสงแดดเหมาะสมอย่างยิ่งสำหรับการตากผ้าหรือระบายอากาศภายในที่พักอาศัย` },
          { time: 'ช่วงบ่าย (12:00 - 18:00)', icon: '☀️', text: isHot ? `ความร้อนและรังสี UV ระดับสูง เอื้อต่อการฆ่าเชื้อโรคบนเครื่องนอนหรือพรม` : `สามารถดำเนินงานบ้านหรือทำความสะอาดพื้นที่ภายนอกอาคารได้ตามปกติ` },
          { time: 'ช่วงค่ำ (18:00 เป็นต้นไป)', icon: '🌙', text: pm25 > 25 ? `ควรปิดหน้าต่างและช่องระบายอากาศ เพื่อป้องกันฝุ่นละอองขนาดเล็กสะสมในที่พัก` : `สามารถเปิดหน้าต่างเพื่อรับลมและลดอุณหภูมิสะสมภายในตัวอาคาร` }
        ]
      };
      
      return lines[activeTab] || lines.summary; 
    };

    return { 
      score: finalScore, 
      quickAnswers: getQuickAnswers(),
      advice: getMainAdvice(), 
      timeline: getTimeline() 
    };
  }, [activeTab, targetDateIdx, weatherData]);

  const tabConfigs = [
    { id: 'summary', icon: '📋', label: 'ภาพรวม', color: '#8b5cf6' },
    { id: 'travel', icon: '🎒', label: 'ท่องเที่ยว', color: '#ec4899' },
    { id: 'health', icon: '🏃‍♂️', label: 'สุขภาพ', color: '#22c55e' },
    { id: 'driving', icon: '🚘', label: 'ขับขี่', color: '#f97316' },
    { id: 'home', icon: '🧺', label: 'งานบ้าน', color: '#0ea5e9' }
  ];

  const appBg = darkMode ? '#020617' : '#f8fafc'; 
  const cardBg = darkMode ? '#0f172a' : '#ffffff';
  const textColor = darkMode ? '#f8fafc' : '#0f172a'; 
  const borderColor = darkMode ? '#1e293b' : '#e2e8f0';
  const subTextColor = darkMode ? '#94a3b8' : '#64748b'; 
  const activeColor = tabConfigs.find(t => t.id === activeTab)?.color || '#8b5cf6';

  if (loadingWeather) return (
    <div className="loading-container" style={{ background: appBg, color: textColor }}>
        <div className="loading-spinner" style={{ borderTopColor: '#8b5cf6', borderColor: 'rgba(139, 92, 246, 0.15)' }}></div>
        <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>ระบบกำลังวิเคราะห์ข้อมูล...</div>
        <div style={{ fontSize: '0.85rem', color: subTextColor, marginTop: '5px' }}>ประมวลผลพารามิเตอร์ทางอุตุนิยมวิทยา</div>
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
    <div style={{ width: '100%', minHeight: '100dvh', background: appBg, display: 'block', overflowY: 'auto', WebkitOverflowScrolling: 'touch', fontFamily: 'Kanit, sans-serif' }} className="hide-scrollbar">
      
      <style dangerouslySetInlineStyle={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .fade-in { animation: fadeIn 0.4s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}} />

      <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', padding: isMobile ? '15px' : '30px', paddingBottom: '120px' }}>

        {/* 📍 Header & Date Selector */}
        <div style={{ background: cardBg, borderRadius: '24px', padding: '20px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.4rem', color: textColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        ✨ ระบบประเมินสภาพอากาศ
                    </h1>
                    <div style={{ fontSize: '0.85rem', color: subTextColor, marginTop: '2px' }}>พื้นที่การวิเคราะห์: <span style={{color: '#0ea5e9', fontWeight: 'bold'}}>{locationName}</span></div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <select value={selectedProv} onChange={(e) => { 
                        const val = e.target.value;
                        setSelectedProv(val); 
                        if(val){
                            const st = stations.find(s => s.areaTH === val);
                            if(st) { fetchWeatherByCoords(st.lat, st.long); fetchLocationName(st.lat, st.long); }
                        }
                    }} style={{ padding: '8px 12px', borderRadius: '12px', background: darkMode ? '#1e293b' : '#f1f5f9', color: textColor, border: `1px solid ${borderColor}`, fontFamily: 'Kanit', outline: 'none' }}>
                        <option value="">เปลี่ยนพื้นที่</option>
                        {stations.map(s => <option key={s.stationID} value={s.areaTH}>{s.areaTH}</option>)}
                    </select>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginTop: '20px', paddingBottom: '5px' }} className="hide-scrollbar">
                {[0,1,2,3,4,5,6].map(idx => {
                    const date = new Date(weatherData?.daily?.time?.[idx] || Date.now());
                    const dateStr = idx === 0 ? 'วันนี้' : idx === 1 ? 'พรุ่งนี้' : date.toLocaleDateString('th-TH', {weekday:'short', day:'numeric'});
                    return (
                        <button key={idx} onClick={() => setTargetDateIdx(idx)} style={{ 
                            flexShrink: 0, padding: '10px 15px', borderRadius: '14px', 
                            border: `1px solid ${targetDateIdx === idx ? activeColor : borderColor}`, 
                            background: targetDateIdx === idx ? activeColor : 'transparent', 
                            color: targetDateIdx === idx ? '#fff' : textColor, 
                            fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: '0.2s' 
                        }}>
                            {dateStr}
                        </button>
                    );
                })}
            </div>
        </div>

        {/* ⚡ TL;DR Quick Summary Cards */}
        {aiReport && (
            <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px' }}>
                {aiReport.quickAnswers.map((item, idx) => (
                    <div key={idx} style={{ background: cardBg, border: `1px solid ${item.color}50`, borderRadius: '20px', padding: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '5px' }}>{item.icon}</div>
                        <div style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold' }}>{item.title}</div>
                        <div style={{ fontSize: '0.95rem', color: item.color, fontWeight: '900', marginTop: '2px', lineHeight: 1.3 }}>{item.text}</div>
                    </div>
                ))}
            </div>
        )}

        {/* 📑 หมวดหมู่ไลฟ์สไตล์ */}
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '5px' }} className="hide-scrollbar">
            {tabConfigs.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                        flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '50px', border: 'none',
                        background: isActive ? (darkMode ? `${tab.color}30` : `${tab.color}15`) : cardBg,
                        color: isActive ? tab.color : subTextColor,
                        border: `1px solid ${isActive ? tab.color : borderColor}`,
                        fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s'
                    }}>
                        <span style={{ fontSize: '1.2rem' }}>{tab.icon}</span> {tab.label}
                    </button>
                );
            })}
        </div>

        {/* 🤖 AI Detailed Report */}
        {aiReport && (
            <div className="fade-in" key={activeTab + targetDateIdx} style={{ background: cardBg, borderRadius: '24px', padding: isMobile ? '20px' : '30px', border: `1px solid ${borderColor}`, boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.3rem', color: textColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {tabConfigs.find(t=>t.id===activeTab)?.icon} แผนปฏิบัติการ: {tabConfigs.find(t=>t.id===activeTab)?.label}
                    </h2>
                    <div style={{ background: darkMode ? '#1e293b' : '#f8fafc', padding: '8px 15px', borderRadius: '15px', border: `1px solid ${borderColor}`, textAlign: 'center' }}>
                        <div style={{ fontSize: '0.65rem', color: subTextColor, fontWeight: 'bold' }}>ดัชนีความเหมาะสม</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '900', color: aiReport.score >= 8 ? '#22c55e' : aiReport.score >= 5 ? '#eab308' : '#ef4444' }}>
                            {aiReport.score}/10
                        </div>
                    </div>
                </div>

                <div style={{ padding: '20px', background: darkMode ? 'rgba(0,0,0,0.2)' : '#f8fafc', borderRadius: '20px', borderLeft: `5px solid ${activeColor}`, marginBottom: '30px' }}>
                    <p style={{ margin: 0, fontSize: '1rem', color: textColor, lineHeight: 1.6 }}>{aiReport.advice}</p>
                </div>

                <h4 style={{ margin: '0 0 15px 0', color: textColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🕒</span> ไทม์ไลน์คาดการณ์สภาพอากาศ
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {aiReport.timeline.map((item, i) => (
                        <div key={i} style={{ display: 'flex', gap: '15px', position: 'relative' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: activeColor, zIndex: 1, border: `3px solid ${cardBg}` }}></div>
                                {i < 2 && <div style={{ width: '2px', flex: 1, background: borderColor, marginTop: '-5px', marginBottom: '-5px' }}></div>}
                            </div>
                            <div style={{ flex: 1, paddingBottom: i < 2 ? '15px' : '0' }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '5px' }}>
                                    <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                                    <span style={{ fontWeight: 'bold', color: textColor, fontSize: '0.95rem' }}>{item.time}</span>
                                </div>
                                <div style={{ fontSize: '0.9rem', color: subTextColor, lineHeight: 1.5, background: darkMode ? '#1e293b' : '#f1f5f9', padding: '12px 15px', borderRadius: '15px' }}>
                                    {item.text}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

      </div>
    </div>
  );
}