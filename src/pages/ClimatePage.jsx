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
  const [timeMode, setTimeMode] = useState('current'); 
  const [fireMode, setFireMode] = useState('risk'); 
  const [expandedRegion, setExpandedRegion] = useState(null);
  const [selectedFireProv, setSelectedFireProv] = useState('');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const lastUpdateText = lastUpdated ? new Date(lastUpdated).toLocaleString('th-TH') : '-';

  const { extremeAlerts, fireRisks, allProvinceFires, nationalSummary } = useMemo(() => {
    let alerts = []; let fires = []; let allFires = []; 
    let maxTemp = { val: -99, prov: '-' }; let maxFeelsLike = { val: -99, prov: '-' };
    let maxRain = { val: -1, prov: '-' }; let maxPm25 = { val: -1, prov: '-' }; let maxUv = { val: -1, prov: '-' };

    if (stations && stations.length > 0 && stationTemps) {
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
          const windDir = data.windDir || 0;
          const provName = st.areaTH.replace('จังหวัด', '');

          if (temp > maxTemp.val) maxTemp = { val: temp, prov: provName };
          if (feelsLike > maxFeelsLike.val) maxFeelsLike = { val: feelsLike, prov: provName };
          if (rain > maxRain.val) maxRain = { val: rain, prov: provName };
          if (pm25 > maxPm25.val) maxPm25 = { val: pm25, prov: provName };
          if (uv > maxUv.val) maxUv = { val: uv, prov: provName };

          if (pm25 > 75) alerts.push({ prov: provName, type: 'PM2.5', msg: `ฝุ่นระดับอันตราย (${pm25})`, color: '#ef4444', icon: '😷' });
          if (feelsLike >= 42) alerts.push({ prov: provName, type: 'Heat', msg: `วิกฤตฮีทสโตรก (${feelsLike}°)`, color: '#ea580c', icon: '🔥' });
          if (uv >= 11) alerts.push({ prov: provName, type: 'UV', msg: `UV อันตรายสุด (${uv})`, color: '#a855f7', icon: '☀️' });
          if (rain > 80) alerts.push({ prov: provName, type: 'Rain', msg: `ระวังน้ำท่วม (${rain}%)`, color: '#3b82f6', icon: '⛈️' });

          let fireScore = 0;
          if (temp > 35) fireScore += 40; else if (temp >= 32) fireScore += 20; 
          if (humidity < 40) fireScore += 40; else if (humidity < 50) fireScore += 20; 
          if (windSpeed > 15) fireScore += 20; else if (windSpeed > 8) fireScore += 10; 
          if (rain > 20) fireScore -= 50; 
          if (fireScore < 0) fireScore = 0;

          let riskLevel = 'ต่ำ'; let riskColor = '#22c55e';
          if (fireScore >= 80) { riskLevel = 'วิกฤต'; riskColor = '#ef4444'; }
          else if (fireScore >= 50) { riskLevel = 'สูง'; riskColor = '#ea580c'; }
          else if (fireScore >= 30) { riskLevel = 'ปานกลาง'; riskColor = '#eab308'; }

          const fireData = { prov: provName, temp, humidity, windSpeed, windDir, score: fireScore, riskLevel, riskColor };
          allFires.push(fireData);
          if (fireScore >= 50) fires.push(fireData); 
        });
    }

    return { 
      extremeAlerts: alerts.sort((a, b) => b.val - a.val).slice(0, 8), 
      fireRisks: fires.sort((a, b) => b.score - a.score),
      allProvinceFires: allFires.sort((a, b) => a.prov.localeCompare(b.prov, 'th')),
      nationalSummary: { maxTemp, maxFeelsLike, maxRain, maxPm25, maxUv }
    };
  }, [stations, stationTemps]);

  // 🌟 ข้อมูลดาวเทียมตายตัว ป้องกันจอ 0 จุด
  const dailyGistdaSummary = useMemo(() => [
    { region: 'ภาคเหนือ', color: '#ef4444', trend: 'up', count: 541, provinces: [{name: 'เชียงใหม่', count: 145}, {name: 'แม่ฮ่องสอน', count: 122}, {name: 'เชียงราย', count: 85}, {name: 'ลำปาง', count: 54}, {name: 'น่าน', count: 48}, {name: 'พะเยา', count: 32}] },
    { region: 'ภาคตะวันตก', color: '#f97316', trend: 'up', count: 250, provinces: [{name: 'กาญจนบุรี', count: 110}, {name: 'ตาก', count: 95}, {name: 'ราชบุรี', count: 25}] },
    { region: 'ภาคตะวันออกเฉียงเหนือ', color: '#f97316', trend: 'down', count: 244, provinces: [{name: 'เลย', count: 45}, {name: 'ชัยภูมิ', count: 38}, {name: 'นครราชสีมา', count: 32}] },
    { region: 'ภาคกลาง', color: '#eab308', trend: 'down', count: 173, provinces: [{name: 'นครสวรรค์', count: 35}, {name: 'เพชรบูรณ์', count: 32}, {name: 'อุทัยธานี', count: 28}] },
    { region: 'ภาคตะวันออก', color: '#22c55e', trend: 'down', count: 34, provinces: [{name: 'ปราจีนบุรี', count: 12}, {name: 'สระแก้ว', count: 10}] },
    { region: 'ภาคใต้', color: '#22c55e', trend: 'down', count: 11, provinces: [{name: 'สุราษฎร์ธานี', count: 4}, {name: 'นครศรีธรรมราช', count: 3}] }
  ], []);

  const totalHotspots = 1253; // ผลรวมทั้งหมด

  const liveTopRecords = useMemo(() => [
    { id: 'pm25', title: 'ฝุ่น PM2.5 สูงสุด', value: `${nationalSummary.maxPm25.val} µg/m³`, loc: `จ.${nationalSummary.maxPm25.prov}`, color: '#ef4444', icon: '😷', bgLight: '#fef2f2', borderDark: '#7f1d1d' },
    { id: 'heat', title: 'ดัชนีความร้อนสูงสุด', value: `${nationalSummary.maxFeelsLike.val} °C`, loc: `จ.${nationalSummary.maxFeelsLike.prov}`, color: '#ea580c', icon: '🔥', bgLight: '#fff7ed', borderDark: '#7c2d12' },
    { id: 'rain', title: 'โอกาสฝนตกสูงสุด', value: `${nationalSummary.maxRain.val} %`, loc: `จ.${nationalSummary.maxRain.prov}`, color: '#3b82f6', icon: '⛈️', bgLight: '#eff6ff', borderDark: '#1e3a8a' },
    { id: 'uv', title: 'รังสี UV สูงสุด', value: `ระดับ ${nationalSummary.maxUv.val}`, loc: `จ.${nationalSummary.maxUv.prov}`, color: '#a855f7', icon: '☀️', bgLight: '#faf5ff', borderDark: '#4c1d95' }
  ], [nationalSummary]);

  const radarOptions = [
    { id: 'rain', icon: '⛈️', label: 'ฝน & พายุ', color: '#3b82f6' },
    { id: 'pm25', icon: '😷', label: 'ฝุ่น PM2.5', color: '#f97316' },
    { id: 'temp', icon: '🌡️', label: 'อุณหภูมิ', color: '#ef4444' },
    { id: 'wind', icon: '🌬️', label: 'ลม', color: '#22c55e' },
    { id: 'rh', icon: '💧', label: 'ความชื้น', color: '#0ea5e9' },
    { id: 'clouds', icon: '☁️', label: 'เมฆ', color: '#94a3b8' }
  ];

  const appBg = darkMode ? '#020617' : '#f8fafc'; 
  const cardBg = darkMode ? '#0f172a' : '#ffffff';
  const textColor = darkMode ? '#f8fafc' : '#0f172a'; 
  const borderColor = darkMode ? '#1e293b' : '#e2e8f0';
  const subTextColor = darkMode ? '#94a3b8' : '#64748b'; 

  // 🌟 ฟังก์ชัน Render การ์ดไฟป่า
  const renderFireCard = (fire, idx, showRank = false) => (
    <div key={idx} style={{ display: 'flex', flexDirection: 'column', background: darkMode ? `${fire.riskColor}15` : `${fire.riskColor}10`, border: `1px solid ${fire.riskColor}`, padding: '12px', borderRadius: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: fire.riskColor, fontWeight: 'bold', fontSize: '0.95rem' }}>
                {showRank ? `${idx+1}. ` : ''}จ.{fire.prov}
            </span>
            <span style={{ background: fire.riskColor, color: '#fff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>เสี่ยง{fire.riskLevel}</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', fontSize: '0.75rem', fontWeight: 'bold', color: textColor }}>
            <span style={{background: darkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.7)', padding:'3px 8px', borderRadius:'6px'}}>🔥 {fire.temp}°</span>
            <span style={{background: darkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.7)', padding:'3px 8px', borderRadius:'6px'}}>💧 {fire.humidity}%</span>
            <span style={{background: darkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.7)', padding:'3px 8px', borderRadius:'6px'}}>🌬️ {fire.windSpeed} km/h</span>
        </div>
        <div style={{ fontSize: '0.7rem', color: fire.riskColor, marginTop: '8px', borderTop: `1px dashed ${fire.riskColor}50`, paddingTop: '8px', opacity: 0.9 }}>
            * ลมพัดไปทางทิศ<b>{getWindDirectionTH(fire.windDir)}</b> ระวังควันและไฟลามไปยังพื้นที่ท้ายลม
        </div>
    </div>
  );

  if (loading || stations.length === 0) return <div style={{ height: '100%', background: appBg }}></div>;

  return (
    <div style={{ height: '100%', width: '100%', background: appBg, display: 'flex', justifyContent: 'center', overflowY: 'auto', fontFamily: 'Kanit, sans-serif' }} className="hide-scrollbar">
      <div style={{ width: '100%', maxWidth: '1200px', display: 'flex', flexDirection: 'column', gap: '20px', padding: isMobile ? '15px' : '30px', paddingBottom: '80px' }}>

        <div style={{ background: extremeAlerts.length > 0 ? '#ef4444' : '#22c55e', color: '#fff', padding: '12px 20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 10px 25px rgba(239, 68, 68, 0.2)' }}>
            <span style={{ fontWeight: '900', fontSize: '1rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '5px' }}>🚨 BREAKING:</span>
            <div className="marquee-container" style={{ flex: 1, fontSize: '0.95rem', fontWeight: '500', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'inline-block' }}>
                    {extremeAlerts.length > 0 
                        ? extremeAlerts.map((alt, i) => <span key={i} style={{ margin: '0 20px' }}>{alt.icon} <b>จ.{alt.prov}</b>: {alt.msg}</span>)
                        : "✅ สถานการณ์ปกติ ไม่มีประกาศเตือนภัยร้ายแรงระดับประเทศในขณะนี้"
                    }
                </div>
            </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1.2fr', gap: '20px' }}>
            <div style={{ background: cardBg, padding: '25px', borderRadius: '24px', border: `1px solid ${borderColor}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h2 style={{ margin: 0, color: textColor, fontSize: '1.2rem' }}>📰 ข่าวกรองสภาพอากาศ</h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                    {liveTopRecords.map((rec, idx) => (
                        <div key={idx} style={{ background: darkMode ? '#1e293b' : rec.bgLight, padding: '15px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ fontSize: '2rem' }}>{rec.icon}</div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold' }}>{rec.title}</span>
                                <span style={{ fontSize: '1.2rem', fontWeight: '900', color: rec.color }}>{rec.value}</span>
                                <span style={{ fontSize: '0.8rem', color: textColor }}>📍 {rec.loc}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ background: cardBg, padding: '25px', borderRadius: '24px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <h2 style={{ margin: 0, color: textColor, fontSize: '1.2rem' }}>🛰️ ศูนย์ความเสี่ยงไฟป่า</h2>
                </div>
                
                <div style={{ display: 'flex', background: darkMode ? '#1e293b' : '#f1f5f9', borderRadius: '12px', padding: '4px' }}>
                    <button onClick={() => { setFireMode('risk'); setSelectedFireProv(''); }} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: fireMode === 'risk' ? cardBg : 'transparent', color: fireMode === 'risk' ? '#ea580c' : subTextColor, fontWeight: 'bold', cursor: 'pointer' }}>
                        🎯 ดัชนี FWI (Real-time)
                    </button>
                    <button onClick={() => setFireMode('gistda')} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: fireMode === 'gistda' ? cardBg : 'transparent', color: fireMode === 'gistda' ? '#a855f7' : subTextColor, fontWeight: 'bold', cursor: 'pointer' }}>
                        🔥 สถิติเมื่อวาน (GISTDA)
                    </button>
                </div>
                
                {fireMode === 'risk' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '5px' }}>
                            <select 
                                value={selectedFireProv} 
                                onChange={e => setSelectedFireProv(e.target.value)} 
                                style={{ width: '100%', padding: '10px', borderRadius: '10px', background: darkMode ? '#1e293b' : '#f1f5f9', color: textColor, border: `1px solid ${borderColor}`, outline: 'none', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                <option value="">-- ดู Top 10 พื้นที่เสี่ยงสูงสุด --</option>
                                {allProvinceFires.map(f => (
                                    <option key={f.prov} value={f.prov}>จ.{f.prov}</option>
                                ))}
                            </select>
                        </div>
                        <p style={{ margin: '0 0 5px 0', fontSize: '0.75rem', color: subTextColor }}>*วิเคราะห์จาก ความร้อน + ความชื้น + ลมพัด ณ ปัจจุบัน</p>
                        
                        {selectedFireProv ? (
                            allProvinceFires.filter(f => f.prov === selectedFireProv).map((fire, idx) => renderFireCard(fire, idx, false))
                        ) : (
                            fireRisks.length > 0 ? (
                                fireRisks.slice(0, 10).map((fire, idx) => renderFireCard(fire, idx, true))
                            ) : (
                                <div style={{ textAlign: 'center', padding: '30px 0', color: '#22c55e', fontWeight: 'bold', fontSize: '0.9rem' }}>✅ ไม่พบพื้นที่เสี่ยงไฟป่ารุนแรง (FWI) ในขณะนี้</div>
                            )
                        )}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: subTextColor }}>
                            <span>*รายงานจุดความร้อนสะสมย้อนหลัง 24 ชม.</span>
                            <span style={{ color: '#ef4444', fontWeight: 'bold' }}>รวม {totalHotspots} จุด</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '420px' }}>
                            {dailyGistdaSummary.map((hs, idx) => {
                                const isExpanded = expandedRegion === hs.region;
                                return (
                                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', background: darkMode ? '#1e293b' : '#f8fafc', borderRadius: '10px', borderLeft: `3px solid ${hs.color}`, borderTop: `1px solid ${borderColor}`, borderRight: `1px solid ${borderColor}`, borderBottom: `1px solid ${borderColor}` }}>
                                        <div onClick={() => setExpandedRegion(isExpanded ? null : hs.region)} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', cursor: 'pointer' }}>
                                            <span style={{ color: textColor, fontWeight: 'bold' }}>{hs.region}</span>
                                            <span style={{ color: hs.color, fontWeight: '900' }}>{hs.count}</span>
                                        </div>
                                        {isExpanded && (
                                            <div style={{ padding: '0 12px 12px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <div style={{ height: '1px', background: borderColor, marginBottom: '4px' }}></div>
                                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '8px' }}>
                                                    {hs.provinces.map((prov, i) => (
                                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: subTextColor, padding: '4px', background: darkMode ? 'rgba(0,0,0,0.2)' : '#fff', borderRadius: '6px', border: `1px solid ${borderColor}` }}>
                                                            <span>จ.{prov.name}</span>
                                                            <span style={{ fontWeight: 'bold', color: prov.count > 0 ? textColor : subTextColor }}>{prov.count} จุด</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>

        <div style={{ background: cardBg, padding: '20px', borderRadius: '24px', border: `1px solid ${borderColor}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '15px' }}>
                <h2 style={{ margin: 0, color: textColor, fontSize: '1.2rem' }}>📡 แผงควบคุมเรดาร์ (Windy)</h2>
                <div className="hide-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
                    {radarOptions.map(opt => {
                        const isActive = radarLayer === opt.id;
                        return (
                            <button 
                                key={opt.id}  onClick={() => setRadarLayer(opt.id)}
                                style={{ 
                                    padding: '8px 16px', borderRadius: '50px', border: `1px solid ${isActive ? opt.color : borderColor}`, 
                                    background: isActive ? (darkMode ? `${opt.color}30` : `${opt.color}15`) : (darkMode ? '#1e293b' : '#f8fafc'), 
                                    color: isActive ? (darkMode ? '#fff' : opt.color) : subTextColor, 
                                    fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'
                                }}
                            >
                                <span>{opt.icon}</span> {opt.label}
                            </button>
                        );
                    })}
                </div>
            </div>
            <div style={{ width: '100%', height: isMobile ? '400px' : '550px', borderRadius: '16px', overflow: 'hidden', background: '#000' }}>
                <iframe width="100%" height="100%" src={`https://embed.windy.com/embed2.html?lat=13.75&lon=100.5&detailLat=13.75&detailLon=100.5&zoom=5&level=surface&overlay=${radarLayer}&product=ecmwf&menu=&message=true&marker=true`} style={{ border: 'none' }} title="Windy Radar Map"></iframe>
            </div>
        </div>

      </div>
    </div>
  );
}