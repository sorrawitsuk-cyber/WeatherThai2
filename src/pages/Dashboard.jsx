import React, { useContext, useState, useEffect, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { WeatherContext } from '../context/WeatherContext';
import { useWeatherData } from '../hooks/useWeatherData';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, ComposedChart } from 'recharts';
import WeatherRadar from '../components/Dashboard/WeatherRadar';
import heroBg from '../assets/hero.png';
import { getWeatherIcon } from '../utils/helpers';

const getWindDirText = (deg) => {
  if (deg == null) return '';
  const dirs = ['เหนือ', 'ตอ.เฉียงเหนือ', 'ตะวันออก', 'ตอ.เฉียงใต้', 'ใต้', 'ตต.เฉียงใต้', 'ตะวันตก', 'ตต.เฉียงเหนือ'];
  return dirs[Math.round(deg / 45) % 8];
};

const getPM25Status = (val) => {
  const v = Number(val);
  if (!v || v <= 0) return { text: 'ไม่มีข้อมูล', color: '#94a3b8' };
  if (v <= 15) return { text: 'ดีมาก', color: '#10b981' };
  if (v <= 25) return { text: 'ดี', color: '#22c55e' };
  if (v <= 37.5) return { text: 'ปานกลาง', color: '#f59e0b' };
  if (v <= 75) return { text: 'เริ่มมีผล', color: '#f97316' };
  return { text: 'มีผลกระทบ', color: '#ef4444' };
};

export default function Dashboard() {
  const { stations, stationTemps, lastUpdated, darkMode } = useContext(WeatherContext);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const { weatherData, loadingWeather, fetchWeatherByCoords } = useWeatherData();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!weatherData && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
        () => fetchWeatherByCoords(13.75, 100.5),
        { timeout: 5000 }
      );
    } else if (!weatherData) {
      fetchWeatherByCoords(13.75, 100.5);
    }
  }, [fetchWeatherByCoords, weatherData]);

  const cardBg = 'var(--bg-card)';
  const textColor = 'var(--text-main)';
  const borderColor = 'var(--border-color)';
  const subTextColor = 'var(--text-sub)';

  // Period forecast computed from real hourly data (before loading check, handles null)
  const periodForecast = useMemo(() => {
    const hourly = weatherData?.hourly;
    if (!hourly?.time) return [
      { label: 'เช้า', icon: '🌤️', temp: '--', desc: '--', rain: '--' },
      { label: 'บ่าย', icon: '☀️', temp: '--', desc: '--', rain: '--' },
      { label: 'เย็น', icon: '🌤️', temp: '--', desc: '--', rain: '--' },
      { label: 'กลางคืน', icon: '🌙', temp: '--', desc: '--', rain: '--' },
    ];
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const periods = [
      { label: 'เช้า', hours: [6,7,8,9,10,11], defaultIcon: '🌤️', isNight: false },
      { label: 'บ่าย', hours: [12,13,14,15], defaultIcon: '☀️', isNight: false },
      { label: 'เย็น', hours: [16,17,18,19], defaultIcon: '🌤️', isNight: false },
      { label: 'กลางคืน', hours: [20,21,22,23,0,1], defaultIcon: '🌙', isNight: true },
    ];
    return periods.map(p => {
      const indices = hourly.time.reduce((acc, t, i) => {
        const h = new Date(t).getHours();
        const d = t.slice(0, 10);
        const nightExtra = p.isNight && d === tomorrow && [0,1].includes(h);
        if ((d === today || nightExtra) && p.hours.includes(h)) acc.push(i);
        return acc;
      }, []);
      if (!indices.length) return { label: p.label, icon: p.defaultIcon, temp: '--', desc: '--', rain: '--' };
      const temps = indices.map(i => hourly.temperature_2m?.[i]).filter(v => v != null);
      const rains = indices.map(i => hourly.precipitation_probability?.[i]).filter(v => v != null);
      const minT = temps.length ? Math.round(Math.min(...temps)) : '--';
      const maxT = temps.length ? Math.round(Math.max(...temps)) : '--';
      const avgR = rains.length ? Math.round(rains.reduce((a,b) => a+b, 0) / rains.length) : 0;
      let icon = p.defaultIcon;
      let desc = p.isNight ? 'คืนนี้' : 'อากาศดี';
      if (avgR > 60) { icon = '⛈️'; desc = 'ฝนฟ้าคะนอง'; }
      else if (avgR > 30) { icon = '🌧️'; desc = 'มีโอกาสฝน'; }
      else if (avgR > 10) { icon = p.isNight ? '☁️' : '🌥️'; desc = 'มีเมฆบางส่วน'; }
      else if (!p.isNight && typeof maxT === 'number' && maxT >= 35) desc = 'อากาศร้อนจัด';
      else if (!p.isNight && typeof maxT === 'number' && maxT >= 30) desc = 'อากาศร้อน';
      return { label: p.label, icon, temp: `${minT} - ${maxT}°C`, desc, rain: `${avgR}%` };
    });
  }, [weatherData]);

  // Rankings from real Firebase station data
  const rankings = useMemo(() => {
    const safeStations = stations || [];
    const safeTemps = stationTemps || {};
    const hottestArr = Object.entries(safeTemps)
      .map(([id, d]) => {
        const s = safeStations.find(x => x.stationID === id);
        return { name: s?.nameTH || id, temp: d.temp || 0 };
      })
      .filter(x => x.temp > 20)
      .sort((a, b) => b.temp - a.temp)
      .slice(0, 3);
    const rainyArr = Object.entries(safeTemps)
      .map(([id, d]) => {
        const s = safeStations.find(x => x.stationID === id);
        return { name: s?.nameTH || id, rain: d.rainProb || 0 };
      })
      .filter(x => x.rain > 0)
      .sort((a, b) => b.rain - a.rain)
      .slice(0, 3);
    const pm25Arr = [...safeStations]
      .map(s => ({ name: s.nameTH, pm25: Number(s.AQILast?.PM25?.value) || 0 }))
      .filter(x => x.pm25 > 0)
      .sort((a, b) => b.pm25 - a.pm25);
    const bkk = safeStations.find(s => s.nameTH?.includes('กรุงเทพ') || s.areaTH?.includes('กรุงเทพ'));
    const bkkPM25 = Number(bkk?.AQILast?.PM25?.value) || 0;
    const worstPM25 = pm25Arr[0] || null;
    return { hottest: hottestArr, rainy: rainyArr, bkkPM25, worstPM25 };
  }, [stations, stationTemps]);

  if (loadingWeather || !weatherData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: textColor }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  const { current, hourly, daily, coords } = weatherData;
  const nowMs = Date.now();
  const startIdx = hourly?.time?.findIndex(t => new Date(t).getTime() >= nowMs - 3600000) || 0;

  // 24 Hour Forecast Data
  const forecast24h = (hourly?.time?.slice(startIdx, startIdx + 24).filter((_, i) => i % 2 === 0) || []).map((t, i) => {
    const rIdx = startIdx + (i * 2);
    const rain = hourly?.precipitation_probability?.[rIdx] || 0;
    const hour = new Date(t).getHours();
    const isNight = hour >= 18 || hour < 6;
    let icon = isNight ? '🌙' : '☀️';
    if (rain > 50) icon = '⛈️';
    else if (rain > 20) icon = '🌧️';
    else if (rain > 0) icon = isNight ? '☁️' : '🌥️';
    return {
      time: new Date(t).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      temp: Math.round(hourly?.temperature_2m?.[rIdx] || 0),
      rain,
      icon,
      isNow: i === 0
    };
  });

  const weatherInfo = getWeatherIcon(current?.weatherCode);
  const pm25Status = getPM25Status(current?.pm25);
  const uvLabel = (() => {
    const u = current?.uv || 0;
    if (u <= 2) return { text: 'ต่ำ', color: '#22c55e' };
    if (u <= 5) return { text: 'ปานกลาง', color: '#f59e0b' };
    if (u <= 7) return { text: 'สูง', color: '#f97316' };
    if (u <= 10) return { text: 'สูงมาก', color: '#ef4444' };
    return { text: 'อันตราย', color: '#9b59b6' };
  })();

  const lastUpdatedText = (() => {
    if (!lastUpdated) return new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
    const d = new Date(lastUpdated);
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
  })();

  return (
    <div style={{ padding: isMobile ? '16px' : '24px', background: 'var(--bg-app)', minHeight: '100%', color: textColor, fontFamily: 'Sarabun, sans-serif' }} className="hide-scrollbar">

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
         <h1 style={{ margin: 0, fontSize: isMobile ? '1.2rem' : '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📍</span> กรุงเทพมหานคร <span style={{fontSize:'1rem', color:subTextColor, cursor:'pointer'}}>▾</span>
         </h1>
         {!isMobile && (
           <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#ef4444', padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>⚠️</span> คลื่นความร้อน
              </div>
              <div style={{ background: '#fffbeb', border: '1px solid #fbbf24', color: '#d97706', padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>⚡</span> ฝนฟ้าคะนอง
              </div>
           </div>
         )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 340px', gap: '24px', alignItems: 'start' }}>

        {/* ================= LEFT COLUMN ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>

           {/* Hero Card */}
           <div style={{ position: 'relative', borderRadius: '24px', overflow: 'hidden', padding: '24px', color: '#fff', minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${heroBg})`, backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0 }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(14,165,233,0.9) 0%, rgba(14,165,233,0.4) 50%, rgba(14,165,233,0) 100%)', zIndex: 1 }} />

              <div style={{ position: 'relative', zIndex: 2 }}>
                 <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>กรุงเทพมหานคร</div>
                 <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '4px' }}>อัปเดตล่าสุด {lastUpdatedText}</div>
                 <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.65rem', marginTop: '8px', backdropFilter: 'blur(4px)' }}>
                    AIR4Thai + TMD อัปเดตล่าสุด
                 </div>
              </div>

              <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                 <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                       <div style={{ fontSize: '6rem', fontWeight: '900', lineHeight: 1 }}>{Math.round(current?.temp || 0)}<span style={{ fontSize: '3rem', fontWeight: 'normal', verticalAlign: 'top' }}>°C</span></div>
                       <div style={{ fontSize: '4rem', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.2))' }}>{weatherInfo.icon}</div>
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '800', marginTop: '8px' }}>{weatherInfo.text}</div>
                    <div style={{ fontSize: '1rem', fontWeight: '600', opacity: 0.9 }}>รู้สึกเหมือน {Math.round(current?.feelsLike || 0)}°C</div>
                 </div>
              </div>
           </div>

           {/* Metrics Grid */}
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
              <div style={{ background: cardBg, padding: '12px', borderRadius: '16px', border: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
                 <div style={{ fontSize: '1.8rem' }}>🌡️</div>
                 <div>
                   <div style={{ fontSize: '0.7rem', color: subTextColor }}>อุณหภูมิ</div>
                   <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{Math.round(current?.temp || 0)}°C</div>
                   <div style={{ fontSize: '0.6rem', color: subTextColor }}>สูงสุด {Math.round(daily?.temperature_2m_max?.[0] || 0)}°C</div>
                 </div>
              </div>
              <div style={{ background: cardBg, padding: '12px', borderRadius: '16px', border: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
                 <div style={{ fontSize: '1.8rem' }}>🥵</div>
                 <div>
                   <div style={{ fontSize: '0.7rem', color: subTextColor }}>รู้สึกเหมือน</div>
                   <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{Math.round(current?.feelsLike || 0)}°C</div>
                   <div style={{ fontSize: '0.6rem', color: '#ef4444' }}>● {current?.feelsLike >= 35 ? 'ร้อนมาก' : 'ร้อน'}</div>
                 </div>
              </div>
              <div style={{ background: cardBg, padding: '12px', borderRadius: '16px', border: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
                 <div style={{ fontSize: '1.8rem' }}>🌧️</div>
                 <div>
                   <div style={{ fontSize: '0.7rem', color: subTextColor }}>โอกาสฝน</div>
                   <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#3b82f6' }}>{current?.rainProb || 0}%</div>
                   <div style={{ fontSize: '0.6rem', color: subTextColor }}>{(current?.rainProb || 0) > 60 ? 'สูง' : (current?.rainProb || 0) > 30 ? 'ปานกลาง' : 'ต่ำ'}</div>
                 </div>
              </div>
              <div style={{ background: cardBg, padding: '12px', borderRadius: '16px', border: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
                 <div style={{ fontSize: '1.8rem' }}>💨</div>
                 <div>
                   <div style={{ fontSize: '0.7rem', color: subTextColor }}>ลม</div>
                   <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{Math.round(current?.windSpeed || 0)} <span style={{fontSize:'0.7rem'}}>km/h</span></div>
                   <div style={{ fontSize: '0.6rem', color: subTextColor }}>{getWindDirText(current?.windDirection)}</div>
                 </div>
              </div>
              <div style={{ background: cardBg, padding: '12px', borderRadius: '16px', border: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
                 <div style={{ fontSize: '1.8rem' }}>🌫️</div>
                 <div>
                   <div style={{ fontSize: '0.7rem', color: subTextColor }}>PM2.5</div>
                   <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: pm25Status.color }}>{Math.round(current?.pm25 || 0)}</div>
                   <div style={{ fontSize: '0.6rem', color: pm25Status.color }}>● {pm25Status.text}</div>
                 </div>
              </div>
           </div>

           {/* 24 Hour Forecast */}
           <div style={{ background: cardBg, borderRadius: '24px', padding: '24px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                 <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>พยากรณ์อากาศ 24 ชั่วโมงข้างหน้า</h3>
              </div>

              <div style={{ height: '200px', width: '100%', marginLeft: '-15px' }}>
                 <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={forecast24h} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={borderColor} />
                       <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: subTextColor }} />
                       <YAxis yAxisId="temp" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: subTextColor }} domain={['dataMin - 2', 'dataMax + 2']} hide />
                       <YAxis yAxisId="rain" orientation="right" axisLine={false} tickLine={false} domain={[0, 100]} hide />
                       <Bar yAxisId="rain" dataKey="rain" fill="#e0f2fe" radius={[4, 4, 0, 0]} barSize={20} />
                       <Line yAxisId="temp" type="monotone" dataKey="temp" stroke="#f97316" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#f97316' }} label={{ position: 'top', fill: textColor, fontSize: 12, fontWeight: 'bold', dy: -10 }} />
                    </ComposedChart>
                 </ResponsiveContainer>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 10px', marginTop: '4px' }}>
                 {forecast24h.map((d, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: `${100/forecast24h.length}%` }}>
                       <div style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{d.icon}</div>
                       <div style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 'bold' }}>{d.rain}%</div>
                    </div>
                 ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '0.75rem' }}>
                 <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{width:'12px', height:'2px', background:'#f97316'}}></span> อุณหภูมิ (°C)</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{width:'12px', height:'12px', background:'#e0f2fe', borderRadius:'2px'}}></span> โอกาสฝน (%)</div>
                 </div>
                 <span style={{ color: '#0ea5e9', cursor: 'pointer', fontWeight: 'bold' }}>ดูพยากรณ์รายชั่วโมงเต็ม →</span>
              </div>
           </div>

           {/* Today Overview */}
           <div style={{ background: cardBg, borderRadius: '24px', padding: '24px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: '800' }}>วันนี้ในภาพรวม</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                 {periodForecast.map((p, i) => (
                    <div key={i} style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '16px', border: `1px solid ${borderColor}` }}>
                       <div style={{ fontSize: '0.8rem', color: subTextColor, marginBottom: '8px' }}>{p.label}</div>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ fontSize: '2rem' }}>{p.icon}</div>
                          <div>
                             <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{p.temp}</div>
                             <div style={{ fontSize: '0.75rem', color: subTextColor }}>{p.desc}</div>
                             <div style={{ fontSize: '0.75rem', color: '#3b82f6', marginTop: '2px' }}>ฝน {p.rain}</div>
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
           </div>

           {/* Rankings Row */}
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>

              {/* PM2.5 Card */}
              <div style={{ background: cardBg, borderRadius: '20px', padding: '16px', border: `1px solid ${borderColor}` }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>คุณภาพอากาศ (PM2.5)</div>
                    <span style={{ fontSize: '0.7rem', color: '#0ea5e9', cursor: 'pointer' }}>ดูทั้งหมด →</span>
                 </div>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: subTextColor }}>กรุงเทพฯ</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: getPM25Status(rankings.bkkPM25).color }}>{rankings.bkkPM25 > 0 ? rankings.bkkPM25 : Math.round(current?.pm25 || 0)}</div>
                      <div style={{ fontSize: '0.6rem', color: getPM25Status(rankings.bkkPM25 || current?.pm25).color }}>● {getPM25Status(rankings.bkkPM25 || current?.pm25).text}</div>
                    </div>
                    {rankings.worstPM25 && (
                      <div>
                        <div style={{ fontSize: '0.7rem', color: subTextColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rankings.worstPM25.name}</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: getPM25Status(rankings.worstPM25.pm25).color }}>{rankings.worstPM25.pm25}</div>
                        <div style={{ fontSize: '0.6rem', color: getPM25Status(rankings.worstPM25.pm25).color }}>● {getPM25Status(rankings.worstPM25.pm25).text}</div>
                      </div>
                    )}
                 </div>
              </div>

              {/* Hottest Card */}
              <div style={{ background: cardBg, borderRadius: '20px', padding: '16px', border: `1px solid ${borderColor}` }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>จังหวัดที่ร้อนที่สุดวันนี้</div>
                    <span style={{ fontSize: '0.7rem', color: '#0ea5e9', cursor: 'pointer' }}>ดูทั้งหมด →</span>
                 </div>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem' }}>
                    {rankings.hottest.length > 0 ? rankings.hottest.slice(0, 2).map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{display:'flex', alignItems:'center', gap:'6px'}}>
                          <span style={{background: i===0?'#ef4444':'#f97316', color:'#fff', width:'16px', height:'16px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.6rem'}}>{i+1}</span>
                          <span style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'80px'}}>{item.name}</span>
                        </span>
                        <span style={{fontWeight:'bold'}}>{item.temp.toFixed(1)}°C</span>
                      </div>
                    )) : <div style={{ color: subTextColor, fontSize: '0.75rem' }}>กำลังโหลด...</div>}
                 </div>
              </div>

              {/* Rain Card */}
              <div style={{ background: cardBg, borderRadius: '20px', padding: '16px', border: `1px solid ${borderColor}` }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>โอกาสฝนสูงสุด</div>
                    <span style={{ fontSize: '0.7rem', color: '#0ea5e9', cursor: 'pointer' }}>ดูทั้งหมด →</span>
                 </div>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem' }}>
                    {rankings.rainy.length > 0 ? rankings.rainy.slice(0, 2).map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{display:'flex', alignItems:'center', gap:'6px'}}>
                          <span style={{background: i===0?'#3b82f6':'#60a5fa', color:'#fff', width:'16px', height:'16px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.6rem'}}>{i+1}</span>
                          <span style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'80px'}}>{item.name}</span>
                        </span>
                        <span style={{fontWeight:'bold'}}>{item.rain}%</span>
                      </div>
                    )) : <div style={{ color: subTextColor, fontSize: '0.75rem' }}>กำลังโหลด...</div>}
                 </div>
              </div>

              {/* UV/Humidity Card */}
              <div style={{ background: cardBg, borderRadius: '20px', padding: '16px', border: `1px solid ${borderColor}` }}>
                 <div style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '12px' }}>ค่าดัชนีต่างๆ วันนี้</div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.2rem' }}>☀️</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{Math.round(current?.uv || 0)}</div>
                      <div style={{ fontSize: '0.6rem', color: uvLabel.color }}>{uvLabel.text}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.2rem' }}>💧</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#3b82f6' }}>{current?.humidity || 0}%</div>
                      <div style={{ fontSize: '0.6rem', color: subTextColor }}>{(current?.humidity || 0) > 80 ? 'ชื้นมาก' : (current?.humidity || 0) > 60 ? 'ค่อนข้างชื้น' : 'ปกติ'}</div>
                    </div>
                 </div>
              </div>

           </div>

        </div>

        {/* ================= RIGHT COLUMN (SIDEBAR) ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Radar */}
            <div style={{ background: cardBg, borderRadius: '24px', padding: '20px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800' }}>เรดาร์ฝน</h3>
                  <NavLink to="/map" style={{ fontSize: '0.75rem', color: '#0ea5e9', textDecoration: 'none', fontWeight: 'bold' }}>ดูแผนที่เต็ม →</NavLink>
               </div>
               <div style={{ borderRadius: '16px', overflow: 'hidden', border: `1px solid ${borderColor}`, position: 'relative' }}>
                  <iframe
                     width="100%" height="240"
                     src={`https://embed.windy.com/embed2.html?lat=${coords?.lat || 13.75}&lon=${coords?.lon || 100.5}&zoom=5&level=surface&overlay=rain&menu=&message=true&marker=true&calendar=now&city=online`}
                     style={{ border: 'none', display: 'block' }}
                     title="Radar Map"
                  ></iframe>
               </div>
               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '12px', gap: '8px' }}>
                 <div style={{ display: 'flex', width: '100%', height: '8px', borderRadius: '4px', overflow: 'hidden', background: 'linear-gradient(to right, #93c5fd, #3b82f6, #2563eb, #1e3a8a, #ef4444, #7f1d1d)' }}></div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.7rem', color: subTextColor }}>
                    <span>น้อย</span>
                    <span>มาก</span>
                 </div>
              </div>
           </div>

           {/* Alerts */}
           <div style={{ background: cardBg, borderRadius: '24px', padding: '20px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                 <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800' }}>เตือนภัยล่าสุด</h3>
                 <NavLink to="/news" style={{ fontSize: '0.75rem', color: '#0ea5e9', textDecoration: 'none', fontWeight: 'bold' }}>ดูทั้งหมด →</NavLink>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                 <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '16px', padding: '16px', display: 'flex', gap: '12px' }}>
                    <div style={{ fontSize: '2rem', color: '#ef4444' }}>🥵</div>
                    <div style={{ flex: 1 }}>
                       <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#b91c1c' }}>คลื่นความร้อน</div>
                       <div style={{ fontSize: '0.75rem', color: '#b91c1c', marginTop: '2px' }}>ระดับเฝ้าระวัง: <strong>สูงมาก</strong></div>
                       <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '2px' }}>พื้นที่: ภาคกลาง ภาคตะวันออก</div>
                    </div>
                 </div>

                 <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '16px', padding: '16px', display: 'flex', gap: '12px' }}>
                    <div style={{ fontSize: '2rem', color: '#f59e0b' }}>⚡</div>
                    <div style={{ flex: 1 }}>
                       <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#b45309' }}>ฝนฟ้าคะนอง</div>
                       <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '2px' }}>ระดับเฝ้าระวัง: <strong>ปานกลาง</strong></div>
                       <div style={{ fontSize: '0.75rem', color: '#d97706', marginTop: '2px' }}>พื้นที่: กรุงเทพมหานครและปริมณฑล</div>
                    </div>
                 </div>
              </div>
           </div>

           {/* News */}
           <div style={{ background: cardBg, borderRadius: '24px', padding: '20px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                 <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800' }}>ข่าวและบทความเด่น</h3>
                 <NavLink to="/news" style={{ fontSize: '0.75rem', color: '#0ea5e9', textDecoration: 'none', fontWeight: 'bold' }}>ดูทั้งหมด →</NavLink>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                 <div style={{ display: 'flex', gap: '12px', cursor: 'pointer' }}>
                    <div style={{ width: '80px', height: '60px', borderRadius: '12px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', flexShrink: 0 }}></div>
                    <div>
                       <div style={{ fontSize: '0.85rem', fontWeight: 'bold', lineHeight: '1.3', color: textColor, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                         ติดตามสภาพอากาศและคุณภาพอากาศล่าสุดทั่วประเทศ
                       </div>
                       <div style={{ fontSize: '0.7rem', color: subTextColor, marginTop: '6px' }}>{new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    </div>
                 </div>
                 <div style={{ display: 'flex', gap: '12px', cursor: 'pointer' }}>
                    <div style={{ width: '80px', height: '60px', borderRadius: '12px', background: 'linear-gradient(135deg, #f97316, #ef4444)', flexShrink: 0 }}></div>
                    <div>
                       <div style={{ fontSize: '0.85rem', fontWeight: 'bold', lineHeight: '1.3', color: textColor, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                         อากาศร้อนจัดต่อเนื่อง แนะเลี่ยงกิจกรรมกลางแจ้ง
                       </div>
                       <div style={{ fontSize: '0.7rem', color: subTextColor, marginTop: '6px' }}>{new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    </div>
                 </div>
                 <div style={{ display: 'flex', gap: '12px', cursor: 'pointer' }}>
                    <div style={{ width: '80px', height: '60px', borderRadius: '12px', background: 'linear-gradient(135deg, #10b981, #0ea5e9)', flexShrink: 0 }}></div>
                    <div>
                       <div style={{ fontSize: '0.85rem', fontWeight: 'bold', lineHeight: '1.3', color: textColor, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                         เช็กค่าฝุ่น PM2.5 รายพื้นที่ประจำวันนี้
                       </div>
                       <div style={{ fontSize: '0.7rem', color: subTextColor, marginTop: '6px' }}>{new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    </div>
                 </div>
              </div>
           </div>

        </div>

      </div>
    </div>
  );
}
