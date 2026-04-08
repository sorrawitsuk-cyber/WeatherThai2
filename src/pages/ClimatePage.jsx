import React, { useContext, useState, useEffect, useMemo } from 'react';
import { WeatherContext } from '../context/WeatherContext';

const getWindDirectionTH = (deg) => {
    if (deg >= 337.5 || deg < 22.5) return 'เหนือ';
    if (deg >= 22.5 && deg < 67.5) return 'ตะวันออกเฉียงเหนือ';
    if (deg >= 67.5 && deg < 112.5) return 'ตะวันออก';
    if (deg >= 112.5 && deg < 157.5) return 'ตะวันออกเฉียงใต้';
    if (deg >= 157.5 && deg < 202.5) return 'ใต้';
    if (deg >= 202.5 && deg < 247.5) return 'ตะวันตกเฉียงใต้';
    if (deg >= 247.5 && deg < 292.5) return 'ตะวันตก';
    if (deg >= 292.5 && deg < 337.5) return 'ตะวันตกเฉียงเหนือ';
    return '-';
};

export default function ClimatePage() {
  const { stations, stationTemps, loading, darkMode, lastUpdated } = useContext(WeatherContext);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [radarLayer, setRadarLayer] = useState('rain');
  const [fireMode, setFireMode] = useState('risk'); 
  const [expandedRegion, setExpandedRegion] = useState(null);
  const [selectedFireProv, setSelectedFireProv] = useState('');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { groupedAlerts, nationalSummary, allProvinceFires, fireRisks } = useMemo(() => {
    let alerts = { heat: [], pm25: [], uv: [], rain: [] };
    let maxTemp = { val: -99, prov: '-' }; let maxFeelsLike = { val: -99, prov: '-' };
    let maxRain = { val: -1, prov: '-' }; let maxPm25 = { val: -1, prov: '-' }; let maxUv = { val: -1, prov: '-' };
    let fires = []; let allFires = [];

    if (stations?.length > 0 && stationTemps) {
        stations.forEach(st => {
          const data = stationTemps[st.stationID];
          if (!data) return;

          const pm25 = st.AQILast?.PM25?.value || 0;
          const temp = Math.round(data.temp || 0);
          const feelsLike = Math.round(data.feelsLike || temp); 
          const rain = data.rainProb || 0;
          const uv = Math.round(data.uv || 0); 
          const humidity = Math.round(data.humidity || 0);
          const windSpeed = Math.round(data.windSpeed || 0);
          const provName = st.areaTH.replace('จังหวัด', '');

          // เก็บสถิติสูงสุด
          if (temp > maxTemp.val) maxTemp = { val: temp, prov: provName };
          if (feelsLike > maxFeelsLike.val) maxFeelsLike = { val: feelsLike, prov: provName };
          if (rain > maxRain.val) maxRain = { val: rain, prov: provName };
          if (pm25 > maxPm25.val) maxPm25 = { val: pm25, prov: provName };
          if (uv > maxUv.val) maxUv = { val: uv, prov: provName };

          // จัดหมวดหมู่เตือนภัย
          if (feelsLike >= 42) alerts.heat.push({ prov: provName, val: feelsLike, level: feelsLike >= 52 ? 'อันตรายมาก' : 'อันตราย' });
          if (pm25 > 37.5) alerts.pm25.push({ prov: provName, val: pm25, level: pm25 > 75 ? 'วิกฤต' : 'เริ่มกระทบ' });
          if (uv >= 8) alerts.uv.push({ prov: provName, val: uv, level: uv >= 11 ? 'วิกฤต' : 'สูงมาก' });
          if (rain > 60) alerts.rain.push({ prov: provName, val: rain, level: 'ระวังฝนหนัก' });

          // คำนวณไฟป่า
          let fireScore = (temp > 32 ? 30 : 0) + (humidity < 50 ? 30 : 0) + (windSpeed > 10 ? 20 : 0);
          const fireData = { prov: provName, temp, humidity, windSpeed, windDir: data.windDir, score: fireScore, riskLevel: fireScore >= 60 ? 'สูง' : 'ปานกลาง', riskColor: fireScore >= 60 ? '#ef4444' : '#eab308' };
          allFires.push(fireData);
          if (fireScore >= 60) fires.push(fireData);
        });
    }

    // เรียงลำดับความรุนแรง
    alerts.heat.sort((a, b) => b.val - a.val);
    alerts.pm25.sort((a, b) => b.val - a.val);

    return { 
        groupedAlerts: alerts, 
        nationalSummary: { maxTemp, maxFeelsLike, maxRain, maxPm25, maxUv },
        allProvinceFires: allFires.sort((a, b) => a.prov.localeCompare(b.prov, 'th')),
        fireRisks: fires.sort((a, b) => b.score - a.score)
    };
  }, [stations, stationTemps]);

  const dailyGistdaSummary = [
    { region: 'ภาคเหนือ', color: '#ef4444', count: 541, provinces: [{name: 'เชียงใหม่', count: 145}, {name: 'แม่ฮ่องสอน', count: 122}] },
    { region: 'ภาคตะวันตก', color: '#f97316', count: 250, provinces: [{name: 'กาญจนบุรี', count: 110}] },
    { region: 'ภาคกลาง', color: '#eab308', count: 173, provinces: [{name: 'นครสวรรค์', count: 35}] }
  ];

  const appBg = darkMode ? '#020617' : '#f8fafc'; 
  const cardBg = darkMode ? '#0f172a' : '#ffffff';
  const textColor = darkMode ? '#f8fafc' : '#0f172a'; 
  const borderColor = darkMode ? '#1e293b' : '#e2e8f0';
  const subTextColor = darkMode ? '#94a3b8' : '#64748b'; 

  // UI Component สำหรับแต่ละหมวดเตือนภัย
  const AlertBox = ({ title, icon, data, color, unit }) => (
    <div style={{ background: cardBg, borderRadius: '20px', border: `1px solid ${borderColor}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: color, color: '#fff', padding: '10px 15px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
            <span>{icon} {title}</span>
            <span>{data.length} พื้นที่</span>
        </div>
        <div style={{ padding: '10px', maxHeight: '200px', overflowY: 'auto' }} className="hide-scrollbar">
            {data.length > 0 ? data.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 5px', borderBottom: `1px solid ${borderColor}`, fontSize: '0.9rem' }}>
                    <span style={{ color: textColor }}>จ.{item.prov}</span>
                    <span style={{ color: color, fontWeight: 'bold' }}>{item.val} {unit}</span>
                </div>
            )) : <div style={{ textAlign: 'center', padding: '20px', color: subTextColor, fontSize: '0.8rem' }}>สถานการณ์ปกติ</div>}
        </div>
    </div>
  );

  return (
    <div style={{ height: '100%', width: '100%', background: appBg, display: 'flex', justifyContent: 'center', overflowY: 'auto', fontFamily: 'Kanit, sans-serif' }} className="hide-scrollbar">
      <div style={{ width: '100%', maxWidth: '1200px', display: 'flex', flexDirection: 'column', gap: '20px', padding: isMobile ? '15px' : '30px', paddingBottom: '80px' }}>
        
        {/* 1. สรุปสถานการณ์แบบ Dashboard */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '15px' }}>
            <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', padding: '15px', borderRadius: '15px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem' }}>🥵</div>
                <div style={{ fontSize: '0.7rem', color: '#991b1b', fontWeight: 'bold' }}>วิกฤตความร้อน</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#ef4444' }}>{groupedAlerts.heat.length} <span style={{fontSize: '0.8rem'}}>จ.</span></div>
            </div>
            <div style={{ background: '#fff7ed', border: '1px solid #ffedd5', padding: '15px', borderRadius: '15px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem' }}>😷</div>
                <div style={{ fontSize: '0.7rem', color: '#9a3412', fontWeight: 'bold' }}>ฝุ่นเกินมาตรฐาน</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#f97316' }}>{groupedAlerts.pm25.length} <span style={{fontSize: '0.8rem'}}>จ.</span></div>
            </div>
            <div style={{ background: '#faf5ff', border: '1px solid #f3e8ff', padding: '15px', borderRadius: '15px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem' }}>☀️</div>
                <div style={{ fontSize: '0.7rem', color: '#6b21a8', fontWeight: 'bold' }}>UV อันตราย</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#a855f7' }}>{groupedAlerts.uv.length} <span style={{fontSize: '0.8rem'}}>จ.</span></div>
            </div>
            <div style={{ background: '#eff6ff', border: '1px solid #dbeafe', padding: '15px', borderRadius: '15px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem' }}>⛈️</div>
                <div style={{ fontSize: '0.7rem', color: '#1e40af', fontWeight: 'bold' }}>ระวังฝนหนัก</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#3b82f6' }}>{groupedAlerts.rain.length} <span style={{fontSize: '0.8rem'}}>จ.</span></div>
            </div>
        </div>

        {/* 2. รายละเอียดเตือนภัยแยกตามเรื่อง */}
        <h2 style={{ color: textColor, fontSize: '1.1rem', margin: '10px 0 0 0' }}>🚨 รายละเอียดการเตือนภัยรายจังหวัด</h2>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
            <AlertBox title="ดัชนีความร้อน (Heat Index)" icon="🥵" data={groupedAlerts.heat} color="#ef4444" unit="°C" />
            <AlertBox title="ฝุ่น PM2.5 (คุณภาพอากาศ)" icon="😷" data={groupedAlerts.pm25} color="#f97316" unit="µg" />
            <AlertBox title="รังสี UV (UV Index)" icon="☀️" data={groupedAlerts.uv} color="#a855f7" unit="Index" />
            <AlertBox title="โอกาสฝนตกหนัก" icon="⛈️" data={groupedAlerts.rain} color="#3b82f6" unit="%" />
        </div>

        {/* 3. ส่วนของเรดาร์และไฟป่า (คงเดิมแต่ปรับให้เข้าชุด) */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1.2fr', gap: '20px', marginTop: '10px' }}>
            {/* Windy Radar */}
            <div style={{ background: cardBg, padding: '20px', borderRadius: '24px', border: `1px solid ${borderColor}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h2 style={{ margin: 0, color: textColor, fontSize: '1rem' }}>📡 เรดาร์สภาพอากาศสด</h2>
                    <select value={radarLayer} onChange={e => setRadarLayer(e.target.value)} style={{ padding: '5px 10px', borderRadius: '10px', background: appBg, color: textColor, border: `1px solid ${borderColor}` }}>
                        <option value="rain">ฝน</option>
                        <option value="temp">อุณหภูมิ</option>
                        <option value="wind">ลม</option>
                    </select>
                </div>
                <div style={{ width: '100%', height: '400px', borderRadius: '16px', overflow: 'hidden' }}>
                    <iframe width="100%" height="100%" src={`https://embed.windy.com/embed2.html?lat=13.75&lon=100.5&zoom=5&level=surface&overlay=${radarLayer}&product=ecmwf&menu=&message=true&marker=true`} style={{ border: 'none' }}></iframe>
                </div>
            </div>

            {/* Wildfire Section */}
            <div style={{ background: cardBg, padding: '20px', borderRadius: '24px', border: `1px solid ${borderColor}` }}>
                <h2 style={{ margin: '0 0 15px 0', color: textColor, fontSize: '1rem' }}>🛰️ พื้นที่เสี่ยงไฟป่า</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {fireRisks.slice(0, 5).map((fire, i) => (
                        <div key={i} style={{ padding: '12px', borderRadius: '12px', background: `${fire.riskColor}10`, border: `1px solid ${fire.riskColor}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '0.9rem', color: fire.riskColor }}>
                                <span>จ.{fire.prov}</span>
                                <span>เสี่ยง{fire.riskLevel}</span>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: subTextColor, marginTop: '5px' }}>
                                🔥 {fire.temp}°C | 💧 {fire.humidity}% | 🌬️ ลม {fire.windSpeed} กม./ชม.
                            </div>
                        </div>
                    ))}
                    {fireRisks.length === 0 && <div style={{ textAlign: 'center', padding: '20px', color: '#22c55e' }}>✅ ยังไม่พบพื้นที่เสี่ยงวิกฤต</div>}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}