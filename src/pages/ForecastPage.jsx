import React, { useContext, useState, useEffect, useMemo } from 'react';
import { WeatherContext } from '../context/WeatherContext';

export default function AIPage() {
  const { stations, darkMode } = useContext(WeatherContext);
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [locationName, setLocationName] = useState('กำลังระบุตำแหน่ง...');
  const [selectedProv, setSelectedProv] = useState('');
  const [targetDateIdx, setTargetDateIdx] = useState(0); 
  const [activeTab, setActiveTab] = useState('summary'); 
  const [showFilters, setShowFilters] = useState(window.innerWidth >= 1024);

  const [weatherData, setWeatherData] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(true);

  const fetchWeatherByCoords = async (lat, lon) => {
    try {
      setLoadingWeather(true);
      const wUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,apparent_temperature,precipitation_probability,wind_speed_10m,uv_index&daily=temperature_2m_max,apparent_temperature_max,precipitation_probability_max&timezone=Asia%2FBangkok&forecast_days=7`;
      const aUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm2_5&timezone=Asia%2FBangkok&forecast_days=7`;

      const [wRes, aRes] = await Promise.all([fetch(wUrl), fetch(aUrl)]);
      const wData = await wRes.json();
      const aData = await aRes.json();

      if (wRes.ok && aRes.ok) {
        setWeatherData({
          hourly: {
            time: wData.hourly.time,
            temp: wData.hourly.apparent_temperature, 
            rain: wData.hourly.precipitation_probability,
            wind: wData.hourly.wind_speed_10m,
            uv: wData.hourly.uv_index,
            pm25: aData.hourly.pm2_5
          },
          daily: wData.daily
        });
      }
    } catch (err) {
      console.error("Fetch Data Error:", err);
    } finally {
      setLoadingWeather(false);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setShowFilters(true);
    };
    window.addEventListener('resize', handleResize);

    if (!weatherData && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
        setLocationName('ตำแหน่งปัจจุบัน');
      }, () => {
        fetchWeatherByCoords(13.75, 100.5); 
        setLocationName('กรุงเทพมหานคร');
      }, { timeout: 5000 });
    } else if (!weatherData) {
      fetchWeatherByCoords(13.75, 100.5); 
      setLocationName('กรุงเทพมหานคร');
    }
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleProvChange = (e) => {
    const pName = e.target.value;
    setSelectedProv(pName); 
    const found = stations?.find(s => s.areaTH === pName);
    if (found) { 
      fetchWeatherByCoords(found.lat, found.long); 
      setLocationName(pName); 
    }
  };

  const insights = useMemo(() => {
    if (!weatherData || !weatherData.hourly.time) return null;

    const startIdx = targetDateIdx * 24;
    const endIdx = startIdx + 24;
    const hTemp = weatherData.hourly.temp.slice(startIdx, endIdx);
    const hRain = weatherData.hourly.rain.slice(startIdx, endIdx);
    const hWind = weatherData.hourly.wind.slice(startIdx, endIdx);
    const hUV = weatherData.hourly.uv.slice(startIdx, endIdx);
    const hPM = weatherData.hourly.pm25.slice(startIdx, endIdx).map(v => v || 0);

    const dayMax = {
        temp: Math.max(...hTemp),
        rain: Math.max(...hRain),
        wind: Math.max(...hWind),
        uv: Math.max(...hUV),
        pm25: Math.max(...hPM)
    };

    const scoreTemp = dayMax.temp <= 32 ? 10 : dayMax.temp <= 36 ? 7 : dayMax.temp <= 40 ? 4 : 1;
    const scoreRain = dayMax.rain <= 10 ? 10 : dayMax.rain <= 30 ? 8 : dayMax.rain <= 60 ? 4 : 1;
    const scoreWind = dayMax.wind <= 15 ? 10 : dayMax.wind <= 30 ? 7 : dayMax.wind <= 45 ? 4 : 1;
    const scoreUV = dayMax.uv <= 3 ? 10 : dayMax.uv <= 6 ? 7 : dayMax.uv <= 9 ? 4 : 1;
    const scorePM = dayMax.pm25 <= 15 ? 10 : dayMax.pm25 <= 37.5 ? 7 : dayMax.pm25 <= 75 ? 3 : 1;

    let finalScore = 10;
    let mainAdvisory = "";

    if (activeTab === 'summary') {
        finalScore = (scorePM * 0.3) + (scoreRain * 0.3) + (scoreTemp * 0.3) + (scoreUV * 0.1);
        if (dayMax.pm25 > 50) mainAdvisory = "คุณภาพอากาศเริ่มมีผลกระทบต่อสุขภาพ เลี่ยงการอยู่ในที่โล่งแจ้งนานๆ นะครับ";
        else if (dayMax.rain > 60) mainAdvisory = "เสี่ยงพายุฝนตกหนัก แนะนำให้พกร่มและเผื่อเวลาเดินทางด้วยครับ";
        else if (dayMax.temp > 39) mainAdvisory = "อากาศร้อนจัด เสี่ยงโรคลมแดด (Heatstroke) อย่าลืมดื่มน้ำบ่อยๆ ครับ";
        else mainAdvisory = "สภาพอากาศเป็นใจมาก เหมาะกับการทำกิจกรรมต่างๆ ได้อย่างเต็มที่ครับ";
    } 
    else if (activeTab === 'health') {
        finalScore = (scorePM * 0.5) + (scoreTemp * 0.3) + (scoreUV * 0.2); 
        if (dayMax.pm25 > 50) mainAdvisory = "ฝุ่นค่อนข้างหนา งดออกกำลังกายกลางแจ้ง และสวมหน้ากากอนามัยครับ";
        else if (dayMax.temp > 38) mainAdvisory = "ร้อนจัด เสี่ยงร่างกายขาดน้ำ แนะนำให้ออกกำลังกายในร่มหรือช่วงเช้าตรู่ครับ";
        else mainAdvisory = "สภาพอากาศเป็นมิตรต่อสุขภาพ สามารถทำกิจกรรมกลางแจ้งได้ตามปกติ";
    }
    else if (activeTab === 'driving') {
        finalScore = (scoreRain * 0.5) + (scoreWind * 0.3) + (scorePM * 0.2); 
        if (dayMax.rain > 60) mainAdvisory = "ฝนตกหนัก ทัศนวิสัยต่ำและถนนลื่น ควรขับขี่ด้วยความระมัดระวังครับ";
        else if (dayMax.wind > 40) mainAdvisory = "ระวังลมกระโชกแรง โดยเฉพาะบนสะพานสูงหรือจุดที่โล่งแจ้งครับ";
        else mainAdvisory = "ทัศนวิสัยชัดเจนดีมาก สามารถเดินทางได้อย่างปลอดภัยครับ";
    }
    else if (activeTab === 'farm') {
        finalScore = (scoreRain * 0.4) + (scoreWind * 0.4) + (scoreTemp * 0.2); 
        if (dayMax.wind > 25) mainAdvisory = "ลมค่อนแรง ไม่เหมาะกับการฉีดพ่นปุ๋ยหรือสารเคมี เพราะอาจปลิวหายครับ";
        else if (dayMax.rain > 50) mainAdvisory = "โอกาสฝนตกสูง อาจชะล้างปุ๋ยหน้าดิน แนะนำให้รอดูสภาพอากาศก่อนรดน้ำครับ";
        else mainAdvisory = "อากาศเหมาะสมมากสำหรับการลงแปลงเกษตร ฉีดพ่นยา หรือรดน้ำต้นไม้ครับ";
    }
    else if (activeTab === 'home') {
        finalScore = (scoreRain * 0.6) + (scoreUV * 0.2) + (scorePM * 0.2); 
        if (dayMax.rain > 40) mainAdvisory = "เสี่ยงฝนตก ไม่แนะนำให้ซักผ้าชิ้นใหญ่หรือล้างรถในวันนี้นะครับ";
        else if (dayMax.pm25 > 50) mainAdvisory = "ฝุ่นละอองค่อนข้างเยอะ แนะนำให้ปิดหน้าต่างเพื่อป้องกันฝุ่นเข้าบ้านครับ";
        else mainAdvisory = "แดดดีและฝนทิ้งช่วง เหมาะกับการซักตากผ้าหรือล้างรถมากๆ ครับ";
    }
    else if (activeTab === 'travel') {
        finalScore = (scoreRain * 0.4) + (scoreUV * 0.3) + (scoreTemp * 0.3); 
        if (dayMax.rain > 50) mainAdvisory = "โอกาสฝนตกสูง แนะนำให้เที่ยวในร่มหรือคาเฟ่จะปลอดภัยกว่าครับ";
        else if (dayMax.uv > 8) mainAdvisory = "แดดแรงและ UV สูง หากมีทริปกลางแจ้งอย่าลืมทาครีมกันแดดและกางร่มครับ";
        else mainAdvisory = "ท้องฟ้าโปร่ง บรรยากาศเป็นใจสำหรับการออกไปเที่ยวและถ่ายรูปครับ";
    }

    finalScore = Math.min(Math.max(Math.round(finalScore * 10) / 10, 1), 10); 

    const getBlockAdvisory = (start, end, timeLabel, icon) => {
        const bRain = Math.max(...hRain.slice(start, end));
        const bTemp = Math.max(...hTemp.slice(start, end));
        const bPM = Math.max(...hPM.slice(start, end));
        const bUV = Math.max(...hUV.slice(start, end));
        
        let text = "อากาศเปิด ทำกิจกรรมได้ราบรื่นครับ";
        if (activeTab === 'health' || activeTab === 'summary') {
            if (bPM > 50) text = `ฝุ่นหนา (${Math.round(bPM)} µg) เลี่ยงที่โล่งแจ้ง`;
            else if (bTemp > 38) text = `ร้อนสะสม (${Math.round(bTemp)}°C) ระวังเพลียแดด`;
            else if (bRain > 40) text = `ฝนตก ${Math.round(bRain)}% อย่าลืมพกร่มครับ`;
        } else if (activeTab === 'driving') {
            if (bRain > 50) text = `ถนนลื่น ทัศนวิสัยลดลงจากฝน`;
            else if (bPM > 75) text = `ฝุ่นหนา ควรเปิดไฟหน้าและลดความเร็ว`;
        } else if (activeTab === 'home' || activeTab === 'farm') {
            if (bRain > 40) text = `ระวังฝน ${Math.round(bRain)}% เลี่ยงกิจกรรมตากแดด`;
            else if (bUV > 7) text = `แดดจัด UV แรง เหมาะกับการตากของ`;
        } else if (activeTab === 'travel') {
            if (bRain > 40) text = `อาจมีฝนรบกวน แผนท่องเที่ยวอาจสะดุด`;
            else if (bTemp > 36) text = `อากาศร้อนจัด ควรหาที่พักหลบแดด`;
        }
        return { label: timeLabel, icon, time: `${start.toString().padStart(2,'0')}:00`, text };
    };

    return { 
        score: finalScore, 
        text: mainAdvisory, 
        timeline: [
            getBlockAdvisory(6, 12, 'เช้า', '🌅'),
            getBlockAdvisory(12, 18, 'บ่าย', '☀️'),
            getBlockAdvisory(18, 23, 'ค่ำ', '🌙')
        ] 
    };
  }, [activeTab, targetDateIdx, weatherData]);

  const tabConfigs = [
    { id: 'summary', icon: '📋', label: 'ภาพรวม', color: '#8b5cf6', desc: 'สภาพอากาศวันนี้' },
    { id: 'travel', icon: '🎒', label: 'ท่องเที่ยว', color: '#ec4899', desc: 'ความราบรื่นในการเดินทาง' },
    { id: 'health', icon: '🏃‍♂️', label: 'สุขภาพ', color: '#22c55e', desc: 'ผลกระทบต่อร่างกาย' },
    { id: 'driving', icon: '🚘', label: 'ขับขี่', color: '#f97316', desc: 'ความปลอดภัยบนถนน' },
    { id: 'home', icon: '🏡', label: 'เคหะสถาน', color: '#0ea5e9', desc: 'งานบ้านและซักตาก' },
    { id: 'farm', icon: '🌾', label: 'การเกษตร', color: '#10b981', desc: 'การดูแลแปลงเกษตร' }
  ];

  const appBg = darkMode ? '#020617' : '#f8fafc'; 
  const cardBg = darkMode ? '#0f172a' : '#ffffff';
  const textColor = darkMode ? '#f8fafc' : '#0f172a'; 
  const borderColor = darkMode ? '#1e293b' : '#e2e8f0';
  const subTextColor = darkMode ? '#94a3b8' : '#64748b'; 
  const activeTabInfo = tabConfigs.find(t => t.id === activeTab);
  const activeColor = activeTabInfo?.color || '#8b5cf6';

  if (loadingWeather) return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', background: appBg, color: textColor, fontFamily: 'Kanit' }}>
        <div style={{ fontSize: '3rem', marginBottom: '15px' }}>⚙️</div>
        <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>กำลังวิเคราะห์ข้อมูล...</div>
    </div>
  );
  
  if (!weatherData) return <div style={{ height: '100%', background: appBg, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: subTextColor, fontFamily: 'Kanit', padding: '20px' }}><p>ไม่สามารถเชื่อมต่อข้อมูลได้</p><button onClick={() => window.location.reload()} style={{marginTop: '10px', padding: '8px 16px', borderRadius: '12px', background: '#0ea5e9', color: '#fff', border: 'none'}}>ลองอีกครั้ง</button></div>;

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%', background: appBg, overflowY: 'auto', WebkitOverflowScrolling: 'touch', fontFamily: 'Kanit, sans-serif' }} className="custom-scrollbar">
      
      <div style={{ width: '100%', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: isMobile ? '12px' : '20px', padding: isMobile ? '12px' : '30px', paddingBottom: '100px' }}>

        {/* 1. Header Section - แยกระหว่าง Desktop กับ Mobile */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '10px', marginBottom: isMobile ? '4px' : '0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: isMobile ? '1.8rem' : '2.5rem' }}>🧠</span>
                <div>
                    <h1 style={{ margin: 0, color: textColor, fontSize: isMobile ? '1.2rem' : '1.8rem', fontWeight: '900' }}>ผู้ช่วยวางแผนกิจกรรม</h1>
                    <p style={{ margin: isMobile ? '0' : '5px 0 0 0', color: subTextColor, fontSize: isMobile ? '0.75rem' : '0.9rem' }}>ประเมินสภาพอากาศให้เหมาะกับไลฟ์สไตล์ (ล่วงหน้า 7 วัน)</p>
                </div>
            </div>
        </div>

        {/* 2. Filter Bar */}
        <div style={{ background: cardBg, borderRadius: isMobile ? '16px' : '24px', padding: isMobile ? '10px 14px' : '18px', border: `1px solid ${borderColor}`, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: isMobile ? '0.85rem' : '1rem', color: textColor, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    📍 พื้นที่ของคุณ: <span style={{ color: '#0ea5e9', maxWidth: isMobile ? '140px' : 'auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{locationName}</span>
                </div>
                {isMobile && <button onClick={() => setShowFilters(!showFilters)} style={{ background: 'rgba(14,165,233,0.1)', color: '#0ea5e9', border: 'none', padding: '4px 12px', borderRadius: '50px', fontWeight: 'bold', fontSize: '0.7rem' }}>
                    {showFilters ? '▲ ปิด' : '▼ ปรับแต่ง'}
                </button>}
            </div>
            {showFilters && (
                <div className="fade-in" style={{ marginTop: isMobile ? '10px' : '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr auto' : '1fr 1fr auto', gap: '8px' }}>
                        <select value={selectedProv} onChange={handleProvChange} style={{ padding: isMobile ? '8px' : '12px', borderRadius: '10px', background: darkMode ? '#1e293b' : '#f1f5f9', color: textColor, border: 'none', fontSize: isMobile ? '0.85rem' : '1rem' }}>
                            <option value="">-- เปลี่ยนจังหวัด --</option>
                            {stations.sort((a,b)=>a.areaTH.localeCompare(b.areaTH,'th')).map(s => <option key={s.stationID} value={s.areaTH}>{s.areaTH}</option>)}
                        </select>
                        <button onClick={() => window.location.reload()} style={{ background: '#0ea5e9', color: '#fff', border: 'none', padding: isMobile ? '8px 12px' : '12px', borderRadius: '10px', fontSize: isMobile ? '0.8rem' : '1rem', fontWeight: 'bold' }}>📍 อัปเดตพิกัด</button>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }} className="custom-scrollbar">
                        {[0,1,2,3,4,5,6].map(idx => {
                            const btnDate = new Date();
                            btnDate.setDate(btnDate.getDate() + idx);
                            const dateLabel = idx === 0 ? 'วันนี้' : idx === 1 ? 'พรุ่งนี้' : btnDate.toLocaleDateString('th-TH', {day:'numeric', month:'short'});
                            return (
                                <button key={idx} onClick={() => setTargetDateIdx(idx)} style={{ flexShrink: 0, padding: isMobile ? '6px 12px' : '10px', borderRadius: '10px', border: `1px solid ${targetDateIdx === idx ? activeColor : borderColor}`, background: targetDateIdx === idx ? activeColor : 'transparent', color: targetDateIdx === idx ? '#fff' : textColor, fontSize: isMobile ? '0.75rem' : '0.85rem', fontWeight: 'bold', transition: 'all 0.2s' }}>
                                    {dateLabel}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>

        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '15px' : '20px' }}>
            
            {/* 3. Tabs Menu (Column on Desktop, Row on Mobile) */}
            <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: '8px', width: isMobile ? '100%' : '280px', overflowX: isMobile ? 'auto' : 'visible' }} className="custom-scrollbar">
                {tabConfigs.map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                            flexShrink: 0, display: 'flex', alignItems: isMobile ? 'center' : 'flex-start', gap: isMobile ? '10px' : '15px', padding: isMobile ? '10px 14px' : '15px', borderRadius: isMobile ? '12px' : '16px', border: `1px solid ${isActive ? tab.color : borderColor}`,
                            background: isActive ? (darkMode ? `${tab.color}20` : `${tab.color}10`) : cardBg,
                            color: isActive ? (darkMode ? '#fff' : tab.color) : (isMobile ? subTextColor : textColor),
                            cursor: 'pointer', textAlign: 'left', width: isMobile ? 'auto' : '100%', transition: 'all 0.2s', fontSize: isMobile ? '0.85rem' : '1rem'
                        }}>
                            <span style={{ fontSize: isMobile ? '1.2rem' : '1.6rem', marginTop: isMobile ? '0' : '-2px' }}>{tab.icon}</span>
                            <div style={{ display: isMobile ? 'none' : 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>{tab.label}</span>
                                <span style={{ fontSize: '0.75rem', color: subTextColor, marginTop: '2px', lineHeight: 1.4 }}>{tab.desc}</span>
                            </div>
                            {isMobile && <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>{tab.label}</span>}
                        </button>
                    );
                })}
            </div>

            {/* 4. Result Dashboard */}
            <div className="fade-in" key={activeTab} style={{ flex: 1, background: cardBg, borderRadius: '24px', padding: isMobile ? '16px' : '35px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                {insights && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'center' : 'flex-start', marginBottom: isMobile ? '16px' : '30px', gap: '10px' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: isMobile ? '0.75rem' : '1.2rem', color: subTextColor }}>{activeTabInfo.desc}</div>
                                <div style={{ fontSize: isMobile ? '1.2rem' : '1.8rem', fontWeight: '900', color: textColor, marginTop: isMobile ? '0' : '5px' }}>{isMobile ? activeTabInfo.label : `หมวด${activeTabInfo.label}`}</div>
                            </div>
                            <div style={{ background: darkMode ? '#1e293b' : '#f8fafc', padding: isMobile ? '6px 14px' : '12px 20px', borderRadius: isMobile ? '14px' : '20px', border: `1px solid ${borderColor}`, textAlign: 'center' }}>
                                <div style={{ fontSize: isMobile ? '0.6rem' : '0.7rem', color: subTextColor, fontWeight: 'bold', textTransform: 'uppercase' }}>คะแนนความเหมาะสม</div>
                                <div style={{ fontSize: isMobile ? '1.4rem' : '2rem', fontWeight: '900', color: insights.score > 7 ? '#22c55e' : insights.score > 4 ? '#f97316' : '#ef4444', lineHeight: 1.1 }}>
                                    {insights.score}<span style={{fontSize: isMobile ? '0.75rem' : '1rem', color: subTextColor, fontWeight:'normal'}}>/10</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: isMobile ? '14px 18px' : '25px', background: insights.score > 7 ? (darkMode ? 'rgba(34,197,94,0.1)' : '#f0fdf4') : insights.score > 4 ? (darkMode ? 'rgba(249,115,22,0.1)' : '#fff7ed') : (darkMode ? 'rgba(239,68,68,0.1)' : '#fef2f2'), borderRadius: isMobile ? '16px' : '20px', borderLeft: `${isMobile ? '5px' : '6px'} solid ${insights.score > 7 ? '#22c55e' : insights.score > 4 ? '#f97316' : '#ef4444'}`, marginBottom: isMobile ? '20px' : '35px' }}>
                            <div style={{ fontSize: isMobile ? '0.75rem' : '0.85rem', color: insights.score > 7 ? '#22c55e' : insights.score > 4 ? '#f97316' : '#ef4444', fontWeight: 'bold', marginBottom: isMobile ? '4px' : '8px' }}>คำแนะนำสำหรับคุณ:</div>
                            <p style={{ margin: 0, fontSize: isMobile ? '0.9rem' : '1.1rem', color: textColor, lineHeight: isMobile ? 1.5 : 1.6, fontWeight: '600' }}>{insights.text}</p>
                        </div>

                        <div style={{ borderTop: isMobile ? `1px solid ${borderColor}` : 'none', paddingTop: isMobile ? '15px' : '0' }}>
                            <h4 style={{ margin: isMobile ? '0 0 12px 0' : '0 0 20px 0', color: isMobile ? subTextColor : textColor, fontSize: isMobile ? '0.85rem' : '1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{fontSize: isMobile ? '1rem' : '1.4rem'}}>⏱️</span> คาดการณ์รายช่วงเวลา
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '10px' : '15px' }}>
                                {insights.timeline.map((item, i) => (
                                    <div key={i} style={{ display: 'flex', gap: isMobile ? '12px' : '15px', position: 'relative', background: isMobile ? (darkMode ? 'rgba(255,255,255,0.03)' : '#f8fafc') : 'transparent', padding: isMobile ? '10px 14px' : '0', borderRadius: isMobile ? '14px' : '0', alignItems: isMobile ? 'center' : 'stretch' }}>
                                        {/* Desktop Timeline Visual */}
                                        {!isMobile && (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, marginTop: '10px' }}>
                                                <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: activeColor, zIndex: 1, border: `3px solid ${cardBg}` }}></div>
                                                {i < 2 && <div style={{ width: '2px', flex: 1, background: borderColor, marginTop: '-2px', marginBottom: '-10px' }}></div>}
                                            </div>
                                        )}
                                        
                                        {/* Content */}
                                        <div style={isMobile ? { fontSize: '1.2rem', flexShrink: 0 } : { flex: 1, background: darkMode ? 'rgba(255,255,255,0.03)' : '#f8fafc', padding: '20px', borderRadius: '18px', border: `1px solid ${borderColor}` }}>
                                            {isMobile ? item.icon : null}
                                            {isMobile ? (
                                                // Mobile Layout Inside Content
                                                <div style={{ display: 'inline-block', width: '100%', marginLeft: '10px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                                        <span style={{ fontWeight: 'bold', color: activeColor, fontSize: '0.85rem' }}>{item.label}</span>
                                                        <span style={{ fontSize: '0.65rem', color: subTextColor }}>{item.time}</span>
                                                    </div>
                                                    <div style={{ fontSize: '0.8rem', color: textColor }}>{item.text}</div>
                                                </div>
                                            ) : (
                                                // Desktop Layout Inside Content
                                                <>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                        <span style={{ fontWeight: 'bold', color: activeColor, fontSize: '1.05rem' }}>{item.icon} {item.label}</span>
                                                        <span style={{ fontSize: '0.8rem', background: darkMode ? '#0f172a' : '#e2e8f0', padding: '4px 10px', borderRadius: '50px', color: subTextColor, fontWeight: 'bold' }}>{item.time}</span>
                                                    </div>
                                                    <div style={{ fontSize: '0.95rem', color: textColor, lineHeight: 1.6 }}>{item.text}</div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>

      </div>
    </div>
  );
}