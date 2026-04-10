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
        if (dayMax.pm25 > 50) mainAdvisory = "คุณภาพอากาศอยู่ในเกณฑ์เริ่มมีผลกระทบต่อสุขภาพ ควรหลีกเลี่ยงการอยู่ในที่โล่งแจ้งนานๆ นะครับ";
        else if (dayMax.rain > 60) mainAdvisory = "วันนี้มีความเสี่ยงที่พายุฝนฟ้าคะนองจะตกหนัก แนะนำให้พกร่มและเผื่อเวลาเดินทางด้วยครับ";
        else if (dayMax.temp > 39) mainAdvisory = "อากาศวันนี้ค่อนข้างร้อนจัด เสี่ยงต่อโรคลมแดด (Heatstroke) อย่าลืมดื่มน้ำบ่อยๆ ครับ";
        else mainAdvisory = "สภาพอากาศวันนี้เป็นใจมากครับ เหมาะกับการใช้ชีวิตประจำวันและทำกิจกรรมต่างๆ ได้อย่างเต็มที่";
    } 
    else if (activeTab === 'health') {
        finalScore = (scorePM * 0.5) + (scoreTemp * 0.3) + (scoreUV * 0.2); 
        if (dayMax.pm25 > 50) mainAdvisory = "ฝุ่นค่อนข้างหนา งดออกกำลังกายกลางแจ้งชั่วคราว และสวมหน้ากากอนามัยเมื่อออกนอกบ้านครับ";
        else if (dayMax.temp > 38) mainAdvisory = "อากาศร้อนจัด เสี่ยงต่อภาวะร่างกายขาดน้ำ แนะนำให้ออกกำลังกายในร่มหรือช่วงเช้าตรู่จะดีที่สุดครับ";
        else mainAdvisory = "สภาพอากาศเป็นมิตรต่อสุขภาพครับ สามารถออกกำลังกายหรือทำกิจกรรมกลางแจ้งได้ตามปกติ";
    }
    else if (activeTab === 'driving') {
        finalScore = (scoreRain * 0.5) + (scoreWind * 0.3) + (scorePM * 0.2); 
        if (dayMax.rain > 60) mainAdvisory = "มีโอกาสฝนตกหนัก ทัศนวิสัยอาจลดลงและถนนลื่น ควรขับขี่ด้วยความระมัดระวังครับ";
        else if (dayMax.wind > 40) mainAdvisory = "ระมัดระวังลมกระโชกแรง โดยเฉพาะเมื่อต้องขับรถขึ้นสะพานสูงหรือจุดที่โล่งแจ้งครับ";
        else mainAdvisory = "สภาพถนนและทัศนวิสัยวันนี้ชัดเจนดีมาก สามารถเดินทางได้อย่างปลอดภัยครับ";
    }
    else if (activeTab === 'farm') {
        finalScore = (scoreRain * 0.4) + (scoreWind * 0.4) + (scoreTemp * 0.2); 
        if (dayMax.wind > 25) mainAdvisory = "วันนี้ลมค่อนข้างแรง ไม่แนะนำให้ฉีดพ่นปุ๋ยหรือสารเคมี เพราะอาจปลิวไปกับลมครับ";
        else if (dayMax.rain > 50) mainAdvisory = "มีโอกาสฝนตกสูง อาจชะล้างหน้าดินและปุ๋ยที่เพิ่งลงไป แนะนำให้รอดูสภาพอากาศก่อนรดน้ำครับ";
        else mainAdvisory = "สภาพอากาศวันนี้เหมาะสมมากสำหรับการลงแปลงเกษตร ฉีดพ่นยา หรือรดน้ำต้นไม้ครับ";
    }
    else if (activeTab === 'home') {
        finalScore = (scoreRain * 0.6) + (scoreUV * 0.2) + (scorePM * 0.2); 
        if (dayMax.rain > 40) mainAdvisory = "มีความเสี่ยงฝนตก ไม่แนะนำให้ซักผ้าชิ้นใหญ่หรือล้างรถในวันนี้นะครับ";
        else if (dayMax.pm25 > 50) mainAdvisory = "วันนี้ฝุ่นละอองกระจายตัวค่อนข้างเยอะ แนะนำให้ปิดหน้าต่างเพื่อป้องกันฝุ่นเข้าบ้านครับ";
        else mainAdvisory = "แดดดีและฝนทิ้งช่วง เป็นวันที่เหมาะกับการซักตากผ้า ล้างรถ หรือทำความสะอาดบ้านมากๆ ครับ";
    }
    else if (activeTab === 'travel') {
        finalScore = (scoreRain * 0.4) + (scoreUV * 0.3) + (scoreTemp * 0.3); 
        if (dayMax.rain > 50) mainAdvisory = "โอกาสฝนตกค่อนข้างสูง แนะนำให้วางแผนเที่ยวในร่ม (Indoor) หรือคาเฟ่จะปลอดภัยกว่าครับ";
        else if (dayMax.uv > 8) mainAdvisory = "แดดแรงและรังสี UV ค่อนข้างสูง หากมีทริปกลางแจ้งอย่าลืมทาครีมกันแดดและกางร่มด้วยนะครับ";
        else mainAdvisory = "บรรยากาศดี ท้องฟ้าโปร่ง เป็นวันที่เพอร์เฟกต์สำหรับการออกไปเที่ยวและถ่ายรูปครับ";
    }

    finalScore = Math.min(Math.max(Math.round(finalScore * 10) / 10, 1), 10); 

    const getBlockAdvisory = (start, end, timeLabel, icon) => {
        const bRain = Math.max(...hRain.slice(start, end));
        const bTemp = Math.max(...hTemp.slice(start, end));
        const bPM = Math.max(...hPM.slice(start, end));
        const bUV = Math.max(...hUV.slice(start, end));
        
        let text = "อากาศเปิด ทัศนวิสัยปกติ สามารถทำกิจกรรมได้ราบรื่นครับ";
        if (activeTab === 'health' || activeTab === 'summary') {
            if (bPM > 50) text = `ฝุ่น PM2.5 ค่อนข้างหนา (${Math.round(bPM)} µg/m³) ควรเลี่ยงการอยู่กลางแจ้งนานๆ`;
            else if (bTemp > 38) text = `อากาศร้อนสะสม (${Math.round(bTemp)}°C) ระวังอาการเพลียแดดและดื่มน้ำบ่อยๆ`;
            else if (bRain > 40) text = `มีโอกาสฝนตก ${Math.round(bRain)}% อย่าลืมพกร่มติดกระเป๋าไว้นะครับ`;
        } else if (activeTab === 'driving') {
            if (bRain > 50) text = `ระวังถนนลื่นและขับขี่ด้วยความระมัดระวัง ทัศนวิสัยอาจลดลงจากฝน`;
            else if (bPM > 75) text = `หมอกควันและฝุ่นหนา ควรเปิดไฟหน้าและระมัดระวังในการใช้ความเร็ว`;
        } else if (activeTab === 'home' || activeTab === 'farm') {
            if (bRain > 40) text = `ระวังฝนตก ${Math.round(bRain)}% แนะนำให้เลี่ยงกิจกรรมที่ต้องตากแดดหรือกลัวความชื้น`;
            else if (bUV > 7) text = `แดดจัดและรังสี UV ค่อนข้างแรง เหมาะกับการตากสิ่งของให้แห้งสนิท`;
        } else if (activeTab === 'travel') {
            if (bRain > 40) text = `อาจมีฝนตกรบกวน แผนการเดินทางกลางแจ้งอาจต้องปรับเปลี่ยนเล็กน้อย`;
            else if (bTemp > 36) text = `อากาศช่วงนี้จะร้อนจัด ควรหาที่พักหลบแดดหรือแวะจิบเครื่องดื่มเย็นๆ`;
        }
        return { label: timeLabel, icon, time: `${start.toString().padStart(2,'0')}:00 - ${end.toString().padStart(2,'0')}:00`, text };
    };

    return { 
        score: finalScore, 
        text: mainAdvisory, 
        timeline: [
            getBlockAdvisory(6, 12, 'ช่วงเช้า', '🌅'),
            getBlockAdvisory(12, 18, 'ช่วงบ่าย', '☀️'),
            getBlockAdvisory(18, 23, 'ช่วงค่ำ', '🌙')
        ] 
    };
  }, [activeTab, targetDateIdx, weatherData]);

  // 🌟 ปรับคำอธิบายหมวดหมู่ให้เข้าใจง่ายขึ้น
  const tabConfigs = [
    { id: 'summary', icon: '📋', label: 'ภาพรวมทั่วไป', color: '#8b5cf6', desc: 'ภาพรวมความเหมาะสมของสภาพอากาศวันนี้' },
    { id: 'travel', icon: '🎒', label: 'การท่องเที่ยว', color: '#ec4899', desc: 'ความราบรื่นในการเดินทางและทำกิจกรรม' },
    { id: 'health', icon: '🏃‍♂️', label: 'ด้านสุขภาพ', color: '#22c55e', desc: 'ผลกระทบต่อระบบทางเดินหายใจและสุขภาพ' },
    { id: 'driving', icon: '🚘', label: 'การขับขี่', color: '#f97316', desc: 'ประเมินความปลอดภัยในการขับขี่' },
    { id: 'home', icon: '🏡', label: 'เคหะสถาน', color: '#0ea5e9', desc: 'ความสะดวกในการซักตากผ้าและดูแลบ้าน' },
    { id: 'farm', icon: '🌾', label: 'การเกษตร', color: '#10b981', desc: 'สภาพอากาศกับการดูแลแปลงเกษตร' }
  ];

  const appBg = darkMode ? '#020617' : '#f8fafc'; 
  const cardBg = darkMode ? '#0f172a' : '#ffffff';
  const textColor = darkMode ? '#f8fafc' : '#0f172a'; 
  const borderColor = darkMode ? '#1e293b' : '#e2e8f0';
  const subTextColor = darkMode ? '#94a3b8' : '#64748b'; 
  const activeTabInfo = tabConfigs.find(t => t.id === activeTab);
  const activeColor = activeTabInfo?.color || '#8b5cf6';

  if (loadingWeather) return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', background: appBg, color: textColor, fontFamily: 'Kanit, sans-serif' }}>
        <div style={{ fontSize: '4rem' }}>⚙️</div>
        <div style={{ marginTop: '20px', fontSize: '1.2rem', fontWeight: 'bold' }}>กำลังประมวลผลข้อมูล...</div>
        <div style={{ fontSize: '0.9rem', color: subTextColor, marginTop: '8px' }}>ผสานข้อมูลจากตัวแปรสภาพอากาศเพื่อคุณ</div>
    </div>
  );
  
  if (!weatherData) return <div style={{ height: '100%', background: appBg, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: subTextColor, fontFamily: 'Kanit', padding: '20px', textAlign: 'center' }}><div style={{fontSize: '3rem'}}>⚠️</div><p>ไม่สามารถเชื่อมต่อข้อมูลสภาพอากาศได้ชั่วคราว</p><button onClick={() => window.location.reload()} style={{marginTop: '15px', padding: '10px 20px', borderRadius: '12px', background: '#0ea5e9', color: '#fff', border: 'none'}}>ลองใหม่อีกครั้ง</button></div>;

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%', background: appBg, overflowY: 'auto', WebkitOverflowScrolling: 'touch', fontFamily: 'Kanit, sans-serif', boxSizing: 'border-box' }} className="custom-scrollbar">
      
      <style dangerouslySetInlineStyle={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${darkMode ? '#334155' : '#cbd5e1'}; border-radius: 10px; }
        @media (max-width: 1024px) { .custom-scrollbar::-webkit-scrollbar { display: none; } .custom-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } }
      `}} />

      <div style={{ width: '100%', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', padding: isMobile ? '15px' : '30px', paddingBottom: '100px', boxSizing: 'border-box' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '10px' }}>
            <div>
                <h1 style={{ margin: 0, color: textColor, fontSize: '1.8rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '10px' }}>🧠 ผู้ช่วยวางแผนกิจกรรม</h1>
                <p style={{ margin: '5px 0 0 0', color: subTextColor, fontSize: '0.9rem' }}>ประเมินสภาพอากาศให้เหมาะกับไลฟ์สไตล์ของคุณ (ล่วงหน้า 7 วัน)</p>
            </div>
        </div>

        <div style={{ width: '100%', background: cardBg, borderRadius: '24px', padding: '18px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: textColor }}>📍 พื้นที่ของคุณ: <span style={{color: '#0ea5e9'}}>{locationName}</span></h3>
                {isMobile && <button onClick={() => setShowFilters(!showFilters)} style={{ background: 'rgba(14,165,233,0.1)', color: '#0ea5e9', border: 'none', padding: '6px 15px', borderRadius: '50px', fontWeight: 'bold', fontSize: '0.75rem' }}>{showFilters ? '▲ ปิด' : '▼ ปรับแต่ง'}</button>}
            </div>
            {showFilters && (
                <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px', width: '100%', boxSizing: 'border-box' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr auto', gap: '10px' }}>
                        <select value={selectedProv} onChange={handleProvChange} style={{ width: '100%', padding: '12px', borderRadius: '12px', background: darkMode ? '#1e293b' : '#f1f5f9', color: textColor, border: 'none', boxSizing: 'border-box', outline: 'none', fontFamily: 'Kanit' }}>
                            <option value="">-- พิมพ์ชื่อจังหวัดเพื่อเปลี่ยนพื้นที่ --</option>
                            {stations.sort((a,b)=>a.areaTH.localeCompare(b.areaTH,'th')).map(s => <option key={s.stationID} value={s.areaTH}>{s.areaTH}</option>)}
                        </select>
                        <button onClick={() => window.location.reload()} style={{ width: '100%', background: '#0ea5e9', color: '#fff', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', boxSizing: 'border-box', fontFamily: 'Kanit' }}>📍 อัปเดตพิกัดอัตโนมัติ</button>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', width: '100%', boxSizing: 'border-box' }} className="custom-scrollbar">
                        {[0,1,2,3,4,5,6].map(idx => {
                            const btnDate = new Date();
                            btnDate.setDate(btnDate.getDate() + idx);
                            const dateLabel = idx === 0 ? 'วันนี้' : idx === 1 ? 'พรุ่งนี้' : btnDate.toLocaleDateString('th-TH', {day:'numeric', month:'short'});
                            return (
                                <button key={idx} onClick={() => setTargetDateIdx(idx)} style={{ flexShrink: 0, minWidth: '80px', padding: '10px', borderRadius: '12px', border: `1px solid ${targetDateIdx === idx ? activeColor : borderColor}`, background: targetDateIdx === idx ? activeColor : (darkMode ? '#1e293b' : '#f8fafc'), color: targetDateIdx === idx ? '#fff' : textColor, fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Kanit' }}>
                                    {dateLabel}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>

        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px', alignItems: 'flex-start', width: '100%', boxSizing: 'border-box' }}>
            
            <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: '10px', width: isMobile ? '100%' : '280px', overflowX: isMobile ? 'auto' : 'visible', order: isMobile ? 1 : 2, boxSizing: 'border-box', paddingBottom: isMobile ? '10px' : '0' }} className="custom-scrollbar">
                {tabConfigs.map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                            flexShrink: 0, display: 'flex', alignItems: 'flex-start', gap: '15px', padding: '15px', borderRadius: '16px', border: `1px solid ${isActive ? tab.color : borderColor}`,
                            background: isActive ? (darkMode ? `${tab.color}15` : `${tab.color}10`) : (darkMode ? '#0f172a' : '#ffffff'),
                            color: isActive ? (darkMode ? '#fff' : tab.color) : textColor,
                            cursor: 'pointer', textAlign: 'left', width: isMobile ? 'auto' : '100%', transition: 'all 0.2s', boxSizing: 'border-box', fontFamily: 'Kanit'
                        }}>
                            <span style={{ fontSize: '1.6rem', marginTop: '-2px' }}>{tab.icon}</span>
                            <div style={{ display: isMobile ? 'none' : 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>{tab.label}</span>
                                <span style={{ fontSize: '0.75rem', color: subTextColor, marginTop: '2px', lineHeight: 1.4 }}>{tab.desc}</span>
                            </div>
                            {isMobile && <span style={{ fontWeight: 'bold', fontSize: '0.9rem', alignSelf: 'center' }}>{tab.label}</span>}
                        </button>
                    );
                })}
            </div>

            <div className="fade-in" key={activeTab} style={{ flex: 1, width: '100%', background: cardBg, borderRadius: '24px', padding: isMobile ? '20px' : '35px', border: `1px solid ${borderColor}`, boxShadow: '0 10px 30px rgba(0,0,0,0.05)', order: isMobile ? 2 : 1, boxSizing: 'border-box', overflow: 'hidden' }}>
                {insights && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px', marginBottom: '30px' }}>
                            <div style={{ maxWidth: '70%' }}>
                                <h2 style={{ margin: 0, fontSize: '1.2rem', color: subTextColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {activeTabInfo.desc}
                                </h2>
                                <div style={{ fontSize: '1.8rem', fontWeight: '900', color: textColor, marginTop: '5px' }}>{activeTabInfo.label}</div>
                            </div>
                            
                            <div style={{ background: darkMode ? '#1e293b' : '#f8fafc', padding: '12px 20px', borderRadius: '20px', border: `1px solid ${borderColor}`, textAlign: 'center', flexShrink: 0, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                                <div style={{ fontSize: '0.7rem', color: subTextColor, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>คะแนนความเหมาะสม</div>
                                <div style={{ fontSize: '2rem', fontWeight: '900', color: insights.score > 7 ? '#22c55e' : insights.score > 4 ? '#f97316' : '#ef4444', lineHeight: 1.1, marginTop: '5px' }}>
                                    {insights.score} <span style={{fontSize:'1rem', color: subTextColor}}>/ 10</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '25px', background: insights.score > 7 ? (darkMode ? 'rgba(34,197,94,0.1)' : '#f0fdf4') : insights.score > 4 ? (darkMode ? 'rgba(249,115,22,0.1)' : '#fff7ed') : (darkMode ? 'rgba(239,68,68,0.1)' : '#fef2f2'), borderRadius: '20px', borderLeft: `6px solid ${insights.score > 7 ? '#22c55e' : insights.score > 4 ? '#f97316' : '#ef4444'}`, marginBottom: '35px', boxSizing: 'border-box' }}>
                            <div style={{ fontSize: '0.85rem', color: insights.score > 7 ? '#22c55e' : insights.score > 4 ? '#f97316' : '#ef4444', fontWeight: 'bold', marginBottom: '8px' }}>คำแนะนำสำหรับคุณ:</div>
                            <p style={{ margin: 0, fontSize: '1.1rem', color: textColor, lineHeight: 1.6, fontWeight: '600' }}>
                                {insights.text}
                            </p>
                        </div>

                        <h4 style={{ margin: '0 0 20px 0', color: textColor, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{fontSize: '1.4rem'}}>⏱️</span> คาดการณ์สภาพอากาศรายช่วงเวลา
                        </h4>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%', boxSizing: 'border-box' }}>
                            {insights.timeline.map((item, i) => (
                                <div key={i} style={{ display: 'flex', gap: '15px', position: 'relative', width: '100%', boxSizing: 'border-box' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, marginTop: '10px' }}>
                                        <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: activeColor, zIndex: 1, border: `3px solid ${cardBg}` }}></div>
                                        {i < 2 && <div style={{ width: '2px', flex: 1, background: borderColor, marginTop: '-2px', marginBottom: '-10px' }}></div>}
                                    </div>
                                    <div style={{ flex: 1, background: darkMode ? 'rgba(255,255,255,0.03)' : '#f8fafc', padding: '20px', borderRadius: '18px', border: `1px solid ${borderColor}`, boxSizing: 'border-box' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '5px' }}>
                                            <span style={{ fontWeight: 'bold', color: activeColor, fontSize: '1.05rem' }}>{item.icon} {item.label}</span>
                                            <span style={{ fontSize: '0.8rem', background: darkMode ? '#0f172a' : '#e2e8f0', padding: '4px 10px', borderRadius: '50px', color: subTextColor, fontWeight: 'bold' }}>{item.time}</span>
                                        </div>
                                        <div style={{ fontSize: '0.95rem', color: textColor, lineHeight: 1.6 }}>{item.text}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>

      </div>
    </div>
  );
}