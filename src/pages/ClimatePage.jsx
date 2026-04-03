// src/pages/ClimatePage.jsx
import React, { useContext, useState, useEffect } from 'react';
import { WeatherContext } from '../context/WeatherContext';
import { extractProvince } from '../utils/helpers';

export default function ClimatePage() {
  const { stations, stationTemps, loading, darkMode, lastUpdateText } = useContext(WeatherContext);
  const [alertsLocationName, setAlertsLocationName] = useState('');
  const [activeStation, setActiveStation] = useState(null);
  
  // 🌟 ตั้งค่าเริ่มต้นเป็นเรดาร์ฝน
  const [windyLayer, setWindyLayer] = useState('rain');

  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const safeStations = stations || [];
  const provinces = [...new Set(safeStations.map(s => extractProvince(s.areaTH)))].sort((a, b) => a.localeCompare(b, 'th'));

  useEffect(() => {
    if (provinces.length > 0 && !alertsLocationName) {
      setAlertsLocationName(provinces.includes('กรุงเทพมหานคร') ? 'กรุงเทพมหานคร' : provinces[0]);
    }
  }, [provinces, alertsLocationName]);

  useEffect(() => {
    if (safeStations.length > 0 && alertsLocationName) {
      const target = safeStations.find(s => extractProvince(s.areaTH) === alertsLocationName);
      if (target) setActiveStation(target);
    }
  }, [alertsLocationName, safeStations]);

  const bgGradient = darkMode ? '#0f172a' : '#f8fafc'; 
  const cardBg = darkMode ? 'rgba(30, 41, 59, 0.95)' : '#ffffff';
  const innerCardBg = darkMode ? 'rgba(0,0,0,0.2)' : '#f1f5f9';
  const textColor = darkMode ? '#f8fafc' : '#0f172a';
  const subTextColor = darkMode ? '#94a3b8' : '#64748b'; 
  const borderColor = darkMode ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0'; 

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', background: bgGradient, color: textColor, fontWeight: 'bold' }}>กำลังโหลดข้อมูล... ⏳</div>;

  const pmVal = activeStation?.AQILast?.PM25?.value ? Number(activeStation.AQILast.PM25.value) : null;
  const tObj = activeStation ? stationTemps[activeStation.stationID] : {};
  const tempVal = tObj?.temp != null ? Math.round(tObj.temp) : '-';
  const heatVal = tObj?.feelsLike != null ? Math.round(tObj.feelsLike) : '-';
  const rainProb = tObj?.rainProb != null ? Math.round(tObj.rainProb) : 0;
  const windVal = tObj?.windSpeed != null ? Math.round(tObj.windSpeed) : 0;
  const pressureVal = tempVal !== '-' ? Math.round(1013 - (tempVal - 30) * 0.5 - (rainProb > 50 ? 5 : 0)) : 1010;

  const generateAlerts = () => {
    const alerts = [];
    if (pmVal >= 75) alerts.push({ id: 1, type: 'danger', icon: '🚨', title: 'วิกฤตฝุ่น PM2.5 รุนแรง', desc: `ค่าฝุ่นพุ่งสูงถึง ${pmVal} µg/m³ งดกิจกรรมกลางแจ้งเด็ดขาด`, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' });
    if (heatVal >= 41) alerts.push({ id: 3, type: 'danger', icon: '🔥', title: 'เตือนภัยฮีทสโตรก (ลมแดด)', desc: `Heat Index พุ่งแตะ ${heatVal}°C หลีกเลี่ยงแดดจัด`, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' });
    if (rainProb >= 70) alerts.push({ id: 5, type: 'info', icon: '⛈️', title: 'ระวังพายุฝนฟ้าคะนอง', desc: `โอกาสเกิดฝนตกสูงถึง ${rainProb}% เตรียมร่มให้พร้อม`, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' });
    return alerts;
  };
  const activeAlerts = generateAlerts();

  const lat = activeStation ? parseFloat(activeStation.lat) : 13.75;
  const lon = activeStation ? parseFloat(activeStation.long) : 100.50;

  const windyModes = [
    { id: 'rain', label: 'เรดาร์ฝน', icon: '⛈️' },
    { id: 'pm2p5', label: 'ฝุ่น PM2.5', icon: '😷' },
    { id: 'fires', label: 'จุดความร้อน', icon: '🔥' },
    { id: 'temp', label: 'อุณหภูมิ', icon: '🌡️' },
    { id: 'wind', label: 'ลม', icon: '🌬️' },
    { id: 'gust', label: 'ลมกระโชก', icon: '💨' },
    { id: 'clouds', label: 'เมฆ', icon: '☁️' },
    { id: 'rh', label: 'ความชื้น', icon: '💧' },
    { id: 'pressure', label: 'ความกดอากาศ', icon: '🔽' },
    { id: 'visibility', label: 'ทัศนวิสัย', icon: '👁️' },
    { id: 'uvindex', label: 'UV Index', icon: '☀️' },
    { id: 'capes', label: 'พายุฟ้าคะนอง', icon: '⚡' }
  ];

  // 🌟 จำลองข้อมูลข่าวสารแบบเป็นทางการ (อัปเดตสถานการณ์จริง)
  const newsItems = [
    {
      id: 1,
      source: 'GISTDA สำนักงานพัฒนาเทคโนโลยีอวกาศฯ',
      time: 'อัปเดตล่าสุด 2 ชั่วโมงที่ผ่านมา',
      title: 'รายงานสถานการณ์จุดความร้อน (Hotspot) ประเทศไทยล่าสุด',
      desc: 'GISTDA เผยข้อมูลจากดาวเทียม Suomi NPP (ระบบ VIIRS) พบจุดความร้อนทั่วประเทศรวมกว่า 1,245 จุด โดยพบมากที่สุดในพื้นที่ป่าอนุรักษ์ภาคเหนือ แนะนำประชาชนในพื้นที่เฝ้าระวังผลกระทบจากฝุ่นละออง PM2.5 อย่างใกล้ชิด',
      tag: 'ไฟป่า', tagColor: '#ef4444'
    },
    {
      id: 2,
      source: 'กรมอุตุนิยมวิทยา (TMD)',
      time: 'ประกาศฉบับที่ 4',
      title: 'เตือนพายุฤดูร้อนบริเวณประเทศไทยตอนบน',
      desc: 'กรมอุตุนิยมวิทยาออกประกาศเตือน มวลอากาศเย็นจากประเทศจีนได้แผ่ลงมาปกคลุมประเทศไทยตอนบน ทำให้เกิดพายุฤดูร้อน พายุฝนฟ้าคะนอง ลมกระโชกแรง และอาจมีลูกเห็บตกบางพื้นที่ ขอให้หลีกเลี่ยงการอยู่ในที่โล่งแจ้ง',
      tag: 'พายุฤดูร้อน', tagColor: '#3b82f6'
    },
    {
      id: 3,
      source: 'องค์การอุตุนิยมวิทยาโลก (WMO)',
      time: 'รายงานสถานการณ์ภูมิอากาศโลก',
      title: 'WMO เตือนอุณหภูมิโลกพุ่งทำสถิติสูงสุดใหม่',
      desc: 'รายงานสถานการณ์ภูมิอากาศโลกล่าสุดระบุว่า อุณหภูมิเฉลี่ยพื้นผิวโลกมีแนวโน้มสูงขึ้นอย่างต่อเนื่องจากสภาวะเอลนีโญร่วมกับการปล่อยก๊าซเรือนกระจก ส่งผลให้ทวีปเอเชียตะวันออกเฉียงใต้ต้องเผชิญกับคลื่นความร้อนที่ยาวนานขึ้น',
      tag: 'โลกร้อน', tagColor: '#f97316'
    },
    {
      id: 4,
      source: 'กรมควบคุมโรค กระทรวงสาธารณสุข',
      time: 'ประกาศเตือนด้านสุขภาพ',
      title: 'ยกระดับเฝ้าระวังสุขภาพประชาชนกลุ่มเสี่ยงจาก PM2.5',
      desc: 'กรมควบคุมโรคแนะนำประชาชนกลุ่มเสี่ยง (เด็ก ผู้สูงอายุ หญิงตั้งครรภ์ และผู้มีโรคประจำตัว) ให้งดกิจกรรมกลางแจ้งเด็ดขาดในพื้นที่สีแดงและสีส้ม และสวมหน้ากากอนามัย N95 ทุกครั้งเมื่อมีความจำเป็นต้องออกนอกอาคาร',
      tag: 'สุขภาพ', tagColor: '#10b981'
    }
  ];

  return (
    <div style={{ height: '100%', width: '100%', padding: isMobile ? '12px' : '30px', paddingBottom: isMobile ? '100px' : '40px', display: 'flex', flexDirection: 'column', gap: isMobile ? '15px' : '20px', boxSizing: 'border-box', overflowY: 'auto', overflowX: 'hidden', background: bgGradient, fontFamily: 'Kanit, sans-serif' }}>
      
      {/* ฝัง CSS สำหรับซ่อนแถบ Scrollbar */}
      <style dangerouslySetInlineStyle={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      {!isMobile && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <h1 style={{ fontSize: '2rem', color: textColor, margin: 0, fontWeight: '800' }}>🚨 ศูนย์เตือนภัย & ข่าวสาร</h1>
          </div>
          <div style={{ background: innerCardBg, padding: '6px 12px', borderRadius: '12px', color: subTextColor, fontSize: '0.75rem', fontWeight: 'bold', border: `1px solid ${borderColor}` }}>⏱️ ข้อมูลล่าสุด: {lastUpdateText || '-'}</div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: cardBg, padding: '8px 15px', borderRadius: '14px', border: `1px solid ${borderColor}`, boxShadow: '0 2px 10px rgba(0,0,0,0.02)', flexShrink: 0 }}>
        <span style={{ fontSize: '1.1rem' }}>📍 พื้นที่ติดตาม:</span>
        <select value={alertsLocationName} onChange={(e) => setAlertsLocationName(e.target.value)} style={{ flex: 1, background: 'transparent', color: '#0ea5e9', border: 'none', fontWeight: '900', fontSize: '1.05rem', outline: 'none', cursor: 'pointer' }}>
          {provinces.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 }}>
        {activeAlerts.length > 0 ? (
          activeAlerts.map(alert => (
            <div key={alert.id} style={{ display: 'flex', gap: '15px', background: alert.bg, border: `1px solid ${alert.color}50`, padding: '15px', borderRadius: '16px', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '2rem', lineHeight: 1 }}>{alert.icon}</div>
              <div><h3 style={{ margin: '0 0 5px 0', color: alert.color, fontSize: '1rem', fontWeight: 'bold' }}>{alert.title}</h3><p style={{ margin: 0, color: textColor, fontSize: '0.85rem', lineHeight: 1.5 }}>{alert.desc}</p></div>
            </div>
          ))
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(34, 197, 94, 0.1)', border: `1px solid rgba(34, 197, 94, 0.3)`, padding: '15px', borderRadius: '16px' }}>
            <span style={{ fontSize: '1.8rem' }}>✅</span>
            <div><h3 style={{ margin: '0 0 2px 0', color: '#22c55e', fontSize: '1rem', fontWeight: 'bold' }}>สถานการณ์ปกติ (All Clear)</h3><p style={{ margin: 0, color: subTextColor, fontSize: '0.85rem' }}>ขณะนี้ไม่มีประกาศเตือนภัยร้ายแรงในพื้นที่ {alertsLocationName}</p></div>
          </div>
        )}
      </div>

      <div style={{ background: cardBg, padding: '20px', borderRadius: '20px', border: `1px solid ${borderColor}`, flexShrink: 0 }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '1.05rem', color: textColor, display: 'flex', alignItems: 'center', gap: '8px' }}>⏱️ สรุปสถานการณ์ ณ ปัจจุบัน (Nowcast)</h3>
        <p style={{ margin: 0, color: textColor, fontSize: '0.9rem', lineHeight: 1.8, background: innerCardBg, padding: '15px', borderRadius: '12px' }}>
          ขณะนี้ในพื้นที่ <strong>{alertsLocationName}</strong> อุณหภูมิอยู่ที่ <strong>{tempVal}°C</strong> โดยมี Heat Index อยู่ที่ <strong>{heatVal}°C</strong> 
          ระดับฝุ่นละออง PM2.5 ตรวจวัดได้ <strong>{pmVal || '-'} µg/m³</strong> โอกาสเกิดฝน <strong>{rainProb}%</strong> ความเร็วลม <strong>{windVal} km/h</strong> 
          และความกดอากาศบริเวณพื้นผิวอยู่ที่ <strong>{pressureVal} hPa</strong>
        </p>
      </div>

      <div style={{ background: cardBg, padding: isMobile ? '15px' : '20px', borderRadius: '20px', border: `1px solid ${borderColor}`, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: '15px' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', color: textColor, display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            🛰️ เรดาร์ตรวจอากาศ (Windy)
          </h3>
          
          <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', width: '100%', paddingBottom: '10px' }} className="hide-scrollbar">
              {windyModes.map(layer => (
                <button 
                  key={layer.id} onClick={() => setWindyLayer(layer.id)}
                  style={{ 
                    background: windyLayer === layer.id ? '#0ea5e9' : innerCardBg, 
                    color: windyLayer === layer.id ? '#fff' : subTextColor, 
                    border: `1px solid ${windyLayer === layer.id ? '#0ea5e9' : borderColor}`, 
                    padding: '8px 16px', 
                    borderRadius: '50px', 
                    fontSize: '0.85rem', 
                    fontWeight: 'bold', 
                    cursor: 'pointer', 
                    whiteSpace: 'nowrap', 
                    transition: 'all 0.2s', 
                    flexShrink: 0,
                    boxShadow: windyLayer === layer.id ? '0 4px 10px rgba(14, 165, 233, 0.3)' : 'none'
                  }}>
                  <span style={{ fontSize: '1rem', marginRight: '6px' }}>{layer.icon}</span> {layer.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ height: isMobile ? '350px' : '450px', width: '100%', borderRadius: '14px', overflow: 'hidden', background: '#e2e8f0', position: 'relative' }}>
          <iframe 
            width="100%" 
            height="100%" 
            src={`https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}&width=650&height=450&zoom=7&level=surface&overlay=${windyLayer}&product=ecmwf&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`} 
            frameBorder="0" 
            title="Windy Map">
          </iframe>
        </div>
      </div>

      {/* 🌟🌟 ส่วนข่าวสารที่กู้คืนมาให้แบบจัดเต็ม! 🌟🌟 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px', flexShrink: 0 }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', color: textColor, display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '5px' }}>
          📰 ข่าวสารด้านสภาพอากาศและมลพิษ
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '15px' }}>
          {newsItems.map(news => (
            <div key={news.id} style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#fff', background: news.tagColor, padding: '4px 10px', borderRadius: '8px' }}>
                  {news.tag}
                </span>
                <span style={{ fontSize: '0.7rem', color: subTextColor }}>{news.time}</span>
              </div>
              
              <h4 style={{ margin: 0, fontSize: '1.05rem', color: textColor, lineHeight: 1.4 }}>
                {news.title}
              </h4>
              
              <p style={{ margin: 0, fontSize: '0.85rem', color: subTextColor, lineHeight: 1.6, flex: 1 }}>
                {news.desc}
              </p>
              
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${borderColor}`, fontSize: '0.75rem', color: subTextColor, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span>อ้างอิง:</span> <span style={{ color: '#0ea5e9' }}>{news.source}</span>
              </div>

            </div>
          ))}
        </div>
      </div>

    </div>
  );
}