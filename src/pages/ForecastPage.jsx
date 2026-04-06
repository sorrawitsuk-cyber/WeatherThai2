// src/pages/AIPage.jsx
import React, { useContext, useState, useEffect, useMemo } from 'react';
import { WeatherContext } from '../context/WeatherContext';

export default function AIPage() {
  const { stations, weatherData, fetchWeatherByCoords, loadingWeather, darkMode } = useContext(WeatherContext);
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [locationName, setLocationName] = useState('กำลังระบุตำแหน่ง...');
  
  const [geoData, setGeoData] = useState([]);
  const [geoError, setGeoError] = useState(false);
  const [selectedProv, setSelectedProv] = useState('');
  const [selectedDist, setSelectedDist] = useState('');
  const [targetDateIdx, setTargetDateIdx] = useState(0); 
  
  const [activeTab, setActiveTab] = useState('summary'); 

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetch('/thai_geo.json')
      .then(res => res.json())
      .then(data => setGeoData(Array.isArray(data) ? data : (data.data || Object.values(data)[0] || [])))
      .catch(e => setGeoError(true));
  }, []);

  const sortedStations = useMemo(() => [...(stations || [])].sort((a, b) => a.areaTH.localeCompare(b.areaTH, 'th')), [stations]);
  const currentAmphoes = useMemo(() => {
    if (!geoData || geoData.length === 0 || !selectedProv) return [];
    const cleanProv = selectedProv.replace('จังหวัด', '').trim();
    const pObj = geoData.find(p => String(p.name_th || p.nameTh || '').replace('จังหวัด', '').trim().includes(cleanProv));
    if (pObj) {
      return [...(pObj.amphure || pObj.amphoe || [])].map(a => ({ id: a.id, name: (a.name_th || a.nameTh).trim() })).sort((a, b) => a.name.localeCompare(b.name, 'th'));
    }
    return [];
  }, [geoData, selectedProv]);

  const fetchLocationName = async (lat, lon) => {
    try {
      const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=th`);
      const data = await res.json();
      setLocationName(data?.locality || data?.city || 'ตำแหน่งที่เลือก');
    } catch (e) { setLocationName('ตำแหน่งที่เลือก'); }
  };

  useEffect(() => {
    if (!weatherData) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => { fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude); fetchLocationName(pos.coords.latitude, pos.coords.longitude); }, 
          () => { fetchWeatherByCoords(13.75, 100.5); setLocationName('กรุงเทพมหานคร'); }
        );
      } else { fetchWeatherByCoords(13.75, 100.5); setLocationName('กรุงเทพมหานคร'); }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleProvChange = (e) => {
    const pName = e.target.value;
    setSelectedProv(pName); setSelectedDist('');
    const fallbackProv = stations?.find(s => s.areaTH === pName);
    if (fallbackProv) { fetchWeatherByCoords(fallbackProv.lat, fallbackProv.long); setLocationName(pName); }
  };

  const handleDistChange = async (e) => {
    const dName = e.target.value;
    setSelectedDist(dName);
    if (!dName) return;
    const prefix = (selectedProv === 'กรุงเทพมหานคร' || dName.startsWith('เขต') || dName.startsWith('อ.')) ? '' : 'อ.';
    setLocationName(`${prefix}${dName}, ${selectedProv}`);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(`${dName} ${selectedProv} Thailand`)}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) fetchWeatherByCoords(parseFloat(data[0].lat), parseFloat(data[0].lon));
    } catch (err) { console.error(err); }
  };

  const appBg = darkMode ? '#020617' : '#f8fafc'; 
  const cardBg = darkMode ? '#0f172a' : '#ffffff';
  const textColor = darkMode ? '#f8fafc' : '#0f172a'; 
  const borderColor = darkMode ? '#1e293b' : '#e2e8f0';
  const subTextColor = darkMode ? '#94a3b8' : '#64748b'; 

  if (loadingWeather || !weatherData || !weatherData.daily) return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', background: appBg, color: textColor, fontFamily: 'Kanit, sans-serif' }}>
        <style dangerouslySetInlineStyle={{__html: `@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(0.95); } }`}} />
        <div style={{ fontSize: '4rem', animation: 'pulse 1.5s infinite ease-in-out' }}>🤖</div>
        <div style={{ marginTop: '20px', fontSize: '1.2rem', fontWeight: 'bold' }}>AI กำลังวิเคราะห์พื้นที่...</div>
    </div>
  );

  const daily = weatherData.daily;
  const targetDateStr = daily.time[targetDateIdx];
  const displayDateName = targetDateIdx === 0 ? 'วันนี้' : targetDateIdx === 1 ? 'พรุ่งนี้' : new Date(targetDateStr).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' });
  
  const dayData = {
      tMax: Math.round(daily.temperature_2m_max[targetDateIdx] || 0),
      tMin: Math.round(daily.temperature_2m_min[targetDateIdx] || 0),
      rain: daily.precipitation_probability_max[targetDateIdx] || 0,
      pm25: daily.pm25_max ? Math.round(daily.pm25_max[targetDateIdx] || 0) : (weatherData.current?.pm25 || 0),
      wind: daily.windspeed_10m_max ? Math.round(daily.windspeed_10m_max[targetDateIdx] || 0) : (weatherData.current?.windSpeed || 0)
  };

  // 🌟 ตั้งค่า 8 โหมด + สี Theme ประจำโหมด
  const tabConfigs = [
    { id: 'summary', icon: '📋', label: 'ภาพรวมรายวัน', color: '#8b5cf6' },
    { id: 'travel', icon: '🎒', label: 'แต่งกาย & ท่องเที่ยว', color: '#ec4899' },
    { id: 'health', icon: '🏃‍♂️', label: 'สุขภาพ & ออกกำลังกาย', color: '#22c55e' },
    { id: 'driving', icon: '🚘', label: 'ขับขี่ & เดินทาง', color: '#f97316' },
    { id: 'home', icon: '🧺', label: 'ซักผ้า & งานบ้าน', color: '#0ea5e9' },
    { id: 'event', icon: '⛺', label: 'จัดอีเวนต์ & แคมป์ปิ้ง', color: '#eab308' },
    { id: 'pet', icon: '🐕', label: 'ดูแลสัตว์เลี้ยง', color: '#d97706' },
    { id: 'farm', icon: '🌾', label: 'ผู้ช่วยการเกษตร', color: '#10b981' }
  ];

  const activeThemeColor = tabConfigs.find(t => t.id === activeTab)?.color || '#8b5cf6';

  const generateAIReport = () => {
      const { tMax, rain, pm25, wind } = dayData;
      let report = { score: 10, title: '', text: '', icon: '', tips: [] };

      // Base Score deduction
      if (rain > 70) report.score -= 4; else if (rain > 40) report.score -= 2;
      if (tMax > 38) report.score -= 3; else if (tMax > 35) report.score -= 1;
      if (pm25 > 75) report.score -= 4; else if (pm25 > 37.5) report.score -= 2;
      if (report.score < 1) report.score = 1; // Min score is 1

      switch (activeTab) {
          case 'summary':
              report.title = `สรุปภาพรวม ${displayDateName}`;
              if (report.score >= 8) report.text = `สภาพอากาศที่ ${locationName} ${displayDateName} ค่อนข้างเป็นใจสุดๆ ค่ะ อากาศโปร่งใส เหมาะกับการทำกิจกรรมเกือบทุกประเภท`;
              else if (report.score >= 5) report.text = `สภาพอากาศที่ ${locationName} ${displayDateName} อยู่ในเกณฑ์ปานกลาง อาจมีปัจจัยรบกวนบ้างเล็กน้อย โปรดเตรียมตัวให้พร้อมก่อนออกจากบ้านค่ะ`;
              else report.text = `โปรดระมัดระวัง! สภาพอากาศที่ ${locationName} ${displayDateName} ค่อนข้างย่ำแย่ ไม่แนะนำให้อยู่กลางแจ้งเป็นเวลานานค่ะ`;
              report.tips = [
                  `🌡️ อุณหภูมิ: สูงสุด ${tMax}°C / ต่ำสุด ${dayData.tMin}°C`,
                  `☔ โอกาสฝนตก: ${rain}% ${rain > 50 ? '(พกร่มด้วยนะคะ)' : ''}`,
                  `😷 ฝุ่น PM2.5: ${pm25} µg/m³ ${pm25 > 37.5 ? '(ควรสวมหน้ากากอนามัย)' : '(อากาศสะอาด)'}`
              ];
              break;
          case 'travel':
              report.title = `วางแผนแต่งกาย & ท่องเที่ยว`;
              if (rain > 60) report.text = `การเดินทางอาจมีอุปสรรคจากฝนตกหนัก แนะนำให้เผื่อเวลาเดินทางและหลีกเลี่ยงเส้นทางรถติด เลือกรองเท้าที่เปียกน้ำได้ค่ะ`;
              else if (tMax > 36) report.text = `แดดค่อนข้างแรงมาก แนะนำให้ใส่เสื้อผ้าที่ระบายอากาศได้ดี สีอ่อน และอย่าลืมทาครีมกันแดดเพื่อปกป้องผิวค่ะ`;
              else report.text = `อากาศกำลังดี เหมาะกับการแต่งตัวสบายๆ ไปถ่ายรูปหรือเดินทางท่องเที่ยวได้อย่างราบรื่นค่ะ`;
              if(rain > 40) report.tips.push('🌂 ไอเทมที่ต้องมี: ร่ม, เสื้อกันฝน, รองเท้าแตะยาง');
              else if(tMax > 35) report.tips.push('🕶️ ไอเทมที่ต้องมี: ครีมกันแดด SPF50+, หมวก, แว่นกันแดด, พัดลมพกพา');
              else report.tips.push('📸 ไอเทมที่ต้องมี: เสื้อแจ็คเก็ตบางๆ, กล้องถ่ายรูป แบตสำรอง');
              break;
          case 'health':
              report.title = `คำแนะนำด้านสุขภาพ & กีฬา`;
              if (pm25 > 50 || tMax > 38) report.text = `ไม่แนะนำให้ออกกำลังกายกลางแจ้งใน${displayDateName}เด็ดขาด! เนื่องจากสภาพอากาศเป็นอันตรายต่อสุขภาพ (เสี่ยงฮีทสโตรกหรือภูมิแพ้ฝุ่น) ควรเปลี่ยนไปยิมหรือฟิตเนสในร่มแทนค่ะ`;
              else if (pm25 > 25 || rain > 40) report.text = `สามารถออกกำลังกายเบาๆ ได้ แต่ควรลดระยะเวลาลง และคอยสังเกตอาการตัวเอง หากมีฝนตกให้งดวิ่งกลางแจ้งเพื่อป้องกันไข้หวัดค่ะ`;
              else report.text = `สภาพอากาศเพอร์เฟกต์สำหรับการวิ่ง ปั่นจักรยาน หรือเล่นกีฬากลางแจ้งค่ะ! สูตอากาศบริสุทธิ์ให้เต็มปอดได้เลย`;
              if(pm25 > 37.5) report.tips.push('😷 กลุ่มเสี่ยง (เด็ก, คนชรา, ผู้ป่วยหอบหืด) ควรงดออกจากบ้าน');
              report.tips.push(`💧 ร่างกายจะสูญเสียเหงื่อมาก แนะนำให้ดื่มน้ำอย่างน้อย ${tMax > 35 ? '3' : '2'} ลิตร`);
              break;
          case 'driving':
              report.title = `วิเคราะห์การขับขี่ & จราจร`;
              if (rain > 70) report.text = `อันตราย! โอกาสฝนตกหนักสูงมาก ถนนจะลื่นและมีแอ่งน้ำขัง ทัศนวิสัยย่ำแย่ แนะนำให้ชะลอความเร็วและทิ้งระยะห่างจากรถคันหน้าให้มากกว่าปกติค่ะ`;
              else if (rain > 30) report.text = `ระวังถนนลื่นในช่วงฝนเริ่มตกใหม่ๆ อาจมีคราบน้ำมันบนผิวจราจร ขับขี่ด้วยความระมัดระวังค่ะ`;
              else report.text = `สภาพอากาศปลอดโปร่ง ทัศนวิสัยในการขับขี่ชัดเจน เดินทางได้อย่างปลอดภัยค่ะ`;
              if(rain > 50) report.tips.push('🚗 เช็กสภาพใบปัดน้ำฝนและลมยางก่อนออกเดินทาง');
              if(tMax > 38) report.tips.push('🌡️ อากาศร้อนจัด ระวังความร้อนสะสมในเครื่องยนต์หากขับทางไกล');
              break;
          case 'home':
              report.title = `ซักผ้า & งานบ้าน`;
              if (rain > 40) report.text = `ไม่แนะนำให้ซักผ้าตากแจ้งใน${displayDateName}ค่ะ เพราะมีความเสี่ยงฝนตกสูง ผ้าอาจจะไม่แห้งและมีกลิ่นอับ แนะนำให้อบผ้าหรือตากในที่ร่มแทน`;
              else if (tMax > 33 && rain < 20) report.text = `แดดดีเยี่ยม! เป็นวันที่เหมาะมากสำหรับการซักผ้าชิ้นใหญ่ ตากผ้านวม หรือล้างรถค่ะ ผ้าแห้งสนิทแน่นอน`;
              else report.text = `สามารถซักผ้าได้ แต่ควรตากในจุดที่มีหลังคาหรือคอยสังเกตท้องฟ้าเผื่อมีเมฆหลงมาค่ะ`;
              if (pm25 > 50) report.tips.push('😷 ฝุ่นเยอะ ควรงดเปิดหน้าต่างบ้านทิ้งไว้เพื่อกันฝุ่นเข้าบ้าน');
              break;
          case 'event':
              report.title = `จัดอีเวนต์ & แคมป์ปิ้ง`;
              if (rain > 50 || wind > 25) report.text = `ไม่เหมาะกับการตั้งแคมป์หรือจัดงานกลางแจ้งค่ะ โอกาสเจอพายุฝนและลมแรงสูงมาก ควรมีเต็นท์สำรองหรือย้ายเข้าในร่ม`;
              else if (tMax > 37) report.text = `อากาศร้อนจัด หากจัดงานกลางแจ้งควรเตรียมพัดลมไอน้ำ หรือจุดพักผ่อนที่มีร่มเงาให้เพียงพอ เพื่อป้องกันฮีทสโตรกค่ะ`;
              else report.text = `บรรยากาศดีมาก! เหมาะแก่การกางเต็นท์ ปิกนิก หรือจัดกิจกรรมกลางแจ้ง ลมพัดเย็นสบายค่ะ`;
              if (wind > 20) report.tips.push('🌪️ ลมค่อนข้างแรง ควรตอกสมอบกเต็นท์ให้แน่นหนา');
              break;
          case 'pet':
              report.title = `การดูแลสัตว์เลี้ยง`;
              if (tMax > 36) report.text = `ระวัง! พื้นถนนและพื้นปูนจะร้อนจัดจนทำให้ฝ่าเท้าสัตว์เลี้ยงพองได้ ควรงดพาน้องหมา/แมวเดินเล่นตอนกลางวัน ให้พาไปตอนเช้าตรู่หรือค่ำๆ แทนค่ะ`;
              else if (pm25 > 50) report.text = `ฝุ่น PM2.5 สูง น้องหมาและน้องแมวก็สูดฝุ่นพิษได้เหมือนคนค่ะ แนะนำให้งดกิจกรรมกลางแจ้งและเปิดเครื่องฟอกอากาศในบ้าน`;
              else report.text = `อากาศกำลังสบาย พาน้องๆ ไปวิ่งเล่นที่สวนสาธารณะเพื่อปลดปล่อยพลังงานได้เลยค่ะ`;
              if (tMax > 35) report.tips.push('💧 ตั้งชามน้ำสะอาดไว้หลายๆ จุดในบ้าน ป้องกันสัตว์เลี้ยงขาดน้ำ');
              break;
          case 'farm':
              report.title = `ผู้ช่วยการเกษตร`;
              if (rain > 60) report.text = `โอกาสฝนตกสูงถึง ${rain}% แนะนำให้งดการฉีดพ่นยาหรือปุ๋ยทางใบทุกชนิด เพราะฝนจะชะล้างน้ำยาทิ้งหมดค่ะ และระวังน้ำขังในแปลง`;
              else if (rain > 20) report.text = `มีความเสี่ยงฝนตกประปราย ควรเช็กเรดาร์เมฆฝนก่อนเริ่มงานฉีดพ่นยาค่ะ`;
              else if (tMax > 37) report.text = `อากาศร้อนและแห้งจัด ควรเพิ่มปริมาณการรดน้ำต้นไม้ในช่วงเช้าตรู่ งดรดน้ำตอนแดดจัดเพื่อป้องกันใบไหม้ค่ะ`;
              else report.text = `สภาพอากาศเป็นใจ เหมาะสำหรับการลงแปลง ดายหญ้า รดน้ำ หรือฉีดพ่นปุ๋ยบำรุงต้นไม้ค่ะ`;
              report.tips.push(rain > 40 ? '🌱 ดินมีความชื้นสูง ไม่จำเป็นต้องรดน้ำเพิ่ม' : '💧 ดินอาจแห้งไว ควรรดน้ำให้ชุ่มชื้น');
              break;
          default: break;
      }
      return report;
  };

  const aiReport = generateAIReport();
  const scoreColor = aiReport.score >= 8 ? '#22c55e' : aiReport.score >= 5 ? '#eab308' : '#ef4444';

  return (
    <div style={{ height: '100%', width: '100%', background: appBg, display: 'flex', justifyContent: 'center', overflowY: 'auto', fontFamily: 'Kanit, sans-serif' }} className="hide-scrollbar">
      <style dangerouslySetInlineStyle={{__html: `.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } .fade-in { animation: fadeIn 0.4s ease-in-out; } @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}} />
      
      <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '20px', padding: isMobile ? '15px' : '30px', paddingBottom: '50px' }}>

        <div style={{ background: cardBg, padding: '20px', borderRadius: '24px', border: `1px solid ${borderColor}`, boxShadow: '0 10px 30px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h2 style={{ margin: 0, color: textColor, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.5rem' }}>🧠</span> กำหนดเงื่อนไขให้ AI วางแผน
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '15px' }}>
                <select value={selectedProv} onChange={handleProvChange} style={{ padding: '12px', borderRadius: '12px', background: darkMode ? '#1e293b' : '#f1f5f9', color: textColor, border: 'none', outline: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                    <option value="">-- เลือกจังหวัดเป้าหมาย --</option>
                    {sortedStations.map(p => <option key={p.stationID} value={p.areaTH}>{p.areaTH}</option>)}
                </select>
                <select value={selectedDist} onChange={handleDistChange} disabled={!selectedProv} style={{ padding: '12px', borderRadius: '12px', background: darkMode ? '#1e293b' : '#f1f5f9', color: textColor, border: 'none', outline: 'none', fontWeight: 'bold', cursor: 'pointer', opacity: !selectedProv ? 0.5 : 1 }}>
                    <option value="">-- เลือกอำเภอเป้าหมาย --</option>
                    {currentAmphoes.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                </select>
            </div>

            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '5px' }} className="hide-scrollbar">
                {daily.time.map((t, idx) => {
                    const isSelected = targetDateIdx === idx;
                    const dateObj = new Date(t);
                    return (
                        <button key={idx} onClick={() => setTargetDateIdx(idx)} style={{ flexShrink: 0, padding: '10px 20px', borderRadius: '16px', border: `1px solid ${isSelected ? activeThemeColor : borderColor}`, background: isSelected ? `linear-gradient(135deg, ${activeThemeColor}, ${activeThemeColor}dd)` : (darkMode ? '#1e293b' : '#f8fafc'), color: isSelected ? '#fff' : textColor, fontWeight: 'bold', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', transition: 'all 0.3s', boxShadow: isSelected ? `0 10px 20px ${activeThemeColor}40` : 'none' }}>
                            <span style={{ fontSize: '0.8rem', opacity: isSelected ? 0.9 : 0.6 }}>{idx === 0 ? 'วันนี้' : idx === 1 ? 'พรุ่งนี้' : dateObj.toLocaleDateString('th-TH', { weekday: 'short' })}</span>
                            <span style={{ fontSize: '1.1rem' }}>{dateObj.getDate()}</span>
                        </button>
                    )
                })}
            </div>
        </div>

        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr', gap: '10px', width: isMobile ? '100%' : '260px' }}>
                {tabConfigs.map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '15px', borderRadius: '16px', border: `1px solid ${isActive ? tab.color : 'transparent'}`, background: isActive ? (darkMode ? `${tab.color}20` : `${tab.color}15`) : (darkMode ? '#1e293b' : '#f8fafc'), color: isActive ? (darkMode ? '#fff' : tab.color) : subTextColor, fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left', boxShadow: isActive ? `0 4px 15px ${tab.color}20` : 'none' }}>
                            <span style={{ fontSize: '1.4rem', filter: isActive ? 'grayscale(0%)' : 'grayscale(100%)', opacity: isActive ? 1 : 0.5 }}>{tab.icon}</span>
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            <div className="fade-in" key={`${activeTab}-${targetDateIdx}-${selectedProv}`} style={{ flex: 1, background: cardBg, borderRadius: '24px', padding: isMobile ? '20px' : '30px', border: `1px solid ${borderColor}`, boxShadow: '0 20px 40px rgba(0,0,0,0.08)', position: 'relative', overflow: 'hidden' }}>
                
                <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: `radial-gradient(circle, ${activeThemeColor}30 0%, rgba(255,255,255,0) 70%)`, borderRadius: '50%', pointerEvents: 'none' }}></div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div>
                        <div style={{ fontSize: '0.85rem', color: activeThemeColor, fontWeight: 'bold', marginBottom: '5px', letterSpacing: '1px' }}>AI ANALYSIS REPORT ✨</div>
                        <h2 style={{ margin: 0, fontSize: '1.5rem', color: textColor }}>{tabConfigs.find(t=>t.id===activeTab).icon} {aiReport.title}</h2>
                        <div style={{ fontSize: '0.9rem', color: subTextColor, marginTop: '5px' }}>📍 {locationName}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: darkMode ? '#1e293b' : '#f8fafc', padding: '10px 15px', borderRadius: '16px', border: `1px solid ${borderColor}` }}>
                        <span style={{ fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold' }}>คะแนนความเหมาะสม</span>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px', color: scoreColor }}>
                            <span style={{ fontSize: '1.8rem', fontWeight: '900' }}>{aiReport.score}</span>
                            <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>/10</span>
                        </div>
                    </div>
                </div>

                {/* 🌟 กรอบข้อความเปลี่ยนสีขอบซ้ายตาม Theme สีของโหมด */}
                <div style={{ padding: '20px', background: darkMode ? 'rgba(0,0,0,0.2)' : '#f8fafc', borderRadius: '16px', borderLeft: `4px solid ${activeThemeColor}`, marginBottom: '20px' }}>
                    <p style={{ margin: 0, fontSize: '1.05rem', color: textColor, lineHeight: 1.6, fontWeight: '500' }}>
                        {aiReport.text}
                    </p>
                </div>

                <h4 style={{ margin: '0 0 10px 0', color: textColor, fontSize: '1rem' }}>💡 ข้อแนะนำเพิ่มเติมจาก AI:</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {aiReport.tips.map((tip, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: darkMode ? '#1e293b' : '#f1f5f9', padding: '12px 15px', borderRadius: '12px', fontSize: '0.9rem', color: textColor, fontWeight: '500' }}>
                            {tip}
                        </div>
                    ))}
                </div>

            </div>
        </div>

      </div>
    </div>
  );
}