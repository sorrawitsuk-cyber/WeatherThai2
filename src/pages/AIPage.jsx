import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { WeatherContext } from '../context/WeatherContext';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  ArrowRight,
  Bike,
  Bot,
  BrainCircuit,
  BriefcaseMedical,
  Car,
  Check,
  CloudRain,
  Droplets,
  Dumbbell,
  Eye,
  Gauge,
  LocateFixed,
  MapPin,
  Shirt,
  Sparkles,
  Sun,
  Thermometer,
  Trees,
  Umbrella,
  Wind,
  X,
} from 'lucide-react';
import { useWeatherData } from '../hooks/useWeatherData';
import heroBg from '../assets/hero.png';
import { getWeatherIcon } from '../utils/helpers';
import { getWindDir } from '../utils/weatherHelpers';

const Card = React.forwardRef(({ children, style }, ref) => (
  <section
    ref={ref}
    style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: 22,
      boxShadow: '0 18px 50px rgba(15, 23, 42, 0.055)',
      ...style,
    }}
  >
    {children}
  </section>
));
Card.displayName = 'Card';

const SectionTitle = ({ title, eyebrow, icon, action }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
    <div style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        {icon && (
          <span style={{ width: 28, height: 28, borderRadius: 10, background: '#eff6ff', color: '#2563eb', display: 'grid', placeItems: 'center' }}>
            {React.createElement(icon, { size: 17, strokeWidth: 2.4 })}
          </span>
        )}
        <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.02rem', fontWeight: 800, letterSpacing: 0 }}>
          {title}
        </h3>
      </div>
      {eyebrow && <div style={{ marginTop: 4, color: 'var(--text-sub)', fontSize: '0.78rem' }}>{eyebrow}</div>}
    </div>
    {action}
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        padding: '10px 12px',
        borderRadius: 14,
        boxShadow: '0 16px 30px rgba(15,23,42,0.13)',
      }}
    >
      <p style={{ margin: '0 0 7px', fontWeight: 800, color: 'var(--text-main)', fontSize: '0.82rem' }}>{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} style={{ color: entry.color, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: entry.color }} />
          {entry.name}: {entry.value}
        </div>
      ))}
    </div>
  );
};

const getPm25Status = (value) => {
  const v = Number(value) || 0;
  if (v <= 15) return { text: 'ดีมาก', color: '#10b981' };
  if (v <= 25) return { text: 'ดี', color: '#22c55e' };
  if (v <= 37.5) return { text: 'ปานกลาง', color: '#f59e0b' };
  if (v <= 75) return { text: 'เริ่มมีผล', color: '#f97316' };
  return { text: 'มีผลกระทบ', color: '#ef4444' };
};

const getUvStatus = (value) => {
  const v = Number(value) || 0;
  if (v <= 2) return { text: 'ต่ำ', color: '#22c55e' };
  if (v <= 5) return { text: 'ปานกลาง', color: '#f59e0b' };
  if (v <= 7) return { text: 'สูง', color: '#f97316' };
  if (v <= 10) return { text: 'สูงมาก', color: '#ef4444' };
  return { text: 'อันตราย', color: '#8b5cf6' };
};

const startIndexFromNow = (times = []) => {
  const idx = times.findIndex((time) => new Date(time).getTime() >= Date.now() - 3600000);
  return idx >= 0 ? idx : 0;
};

const avg = (items) => {
  const values = items.filter((v) => Number.isFinite(Number(v))).map(Number);
  if (!values.length) return 0;
  return values.reduce((sum, item) => sum + item, 0) / values.length;
};

const periodSummary = (hourly, startIdx, label, hours) => {
  const indices = (hourly?.time || []).reduce((acc, time, index) => {
    if (index < startIdx) return acc;
    if (hours.includes(new Date(time).getHours())) acc.push(index);
    return acc;
  }, []).slice(0, 6);

  const temps = indices.map((index) => hourly?.temperature_2m?.[index]).filter((v) => v != null);
  const rains = indices.map((index) => hourly?.precipitation_probability?.[index]).filter((v) => v != null);
  const rain = Math.round(avg(rains));
  const min = temps.length ? Math.round(Math.min(...temps)) : '--';
  const max = temps.length ? Math.round(Math.max(...temps)) : '--';

  return {
    label,
    rain,
    tempText: `${min}-${max}°C`,
    desc: rain >= 60 ? 'มีโอกาสฝนฟ้าคะนอง' : rain >= 30 ? 'มีเมฆและฝนบางช่วง' : 'ท้องฟ้าโปร่งถึงมีเมฆบางส่วน',
  };
};

const Icon = ({ icon, ...props }) => React.createElement(icon, props);

export default function AIPage() {
  const { lastUpdated } = useContext(WeatherContext);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [trendTab, setTrendTab] = useState('temp');
  const [activeInsight, setActiveInsight] = useState(null);
  const detailRef = useRef(null);
  const { weatherData, loadingWeather, fetchWeatherByCoords } = useWeatherData();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (weatherData) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
        () => fetchWeatherByCoords(13.75, 100.5),
        { timeout: 5000 }
      );
      return;
    }

    fetchWeatherByCoords(13.75, 100.5);
  }, [fetchWeatherByCoords, weatherData]);

  const styles = useMemo(() => ({
    text: 'var(--text-main)',
    sub: 'var(--text-sub)',
    border: 'var(--border-color)',
    muted: 'var(--bg-secondary)',
    blue: '#2563eb',
  }), []);

  if (loadingWeather || !weatherData) {
    return (
      <div className="loading-container" style={{ color: styles.text }}>
        <div className="loading-spinner" />
        <div>กำลังให้ AI ประมวลผล...</div>
        <div>รวบรวมอากาศ ฝน ฝุ่น และคำแนะนำให้พร้อมใช้งาน</div>
      </div>
    );
  }

  const { current, hourly, daily } = weatherData;
  const startIdx = startIndexFromNow(hourly?.time);
  const weatherInfo = getWeatherIcon(current?.weatherCode);
  const maxTemp = Math.round(daily?.temperature_2m_max?.[0] || current?.temp || 0);
  const minTemp = Math.round(daily?.temperature_2m_min?.[0] || current?.temp || 0);
  const rainProb = Math.round(daily?.precipitation_probability_max?.[0] || current?.rainProb || 0);
  const pm25 = Math.round(current?.pm25 || 0);
  const pm25Status = getPm25Status(pm25);
  const uvStatus = getUvStatus(current?.uv);
  const windDirection = getWindDir(current?.windDirection);
  const updateText = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

  const trendData = (hourly?.time?.slice(startIdx, startIdx + 24).filter((_, index) => index % 3 === 0) || []).map((time, index) => {
    const dataIndex = startIdx + index * 3;
    const temp = Math.round(hourly?.temperature_2m?.[dataIndex] || 0);
    return {
      time: new Date(time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      temp,
      rain: Math.round(hourly?.precipitation_probability?.[dataIndex] || 0),
      pm25: Math.round(hourly?.pm25?.[dataIndex] || 0),
      wind: Math.round(hourly?.wind_speed_10m?.[dataIndex] || 0),
      humidity: Math.round(hourly?.relative_humidity_2m?.[dataIndex] || 0),
      yesterday: temp - (index % 3 === 0 ? 1 : index % 3 === 1 ? -1 : 2),
    };
  });

  const sixHourForecast = (hourly?.time?.slice(startIdx, startIdx + 6) || []).map((time, index) => {
    const rain = Math.round(hourly?.precipitation_probability?.[startIdx + index] || 0);
    return {
      time: new Date(time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      rain,
      icon: rain > 55 ? '⛈️' : rain > 25 ? '🌧️' : rain > 5 ? '🌦️' : '🌤️',
    };
  });

  const aiPeriods = [
    periodSummary(hourly, startIdx, 'ช่วงเช้า (06:00 - 11:00)', [6, 7, 8, 9, 10, 11]),
    periodSummary(hourly, startIdx, 'ช่วงบ่าย (12:00 - 16:00)', [12, 13, 14, 15, 16]),
    periodSummary(hourly, startIdx, 'ช่วงเย็น (17:00 - 22:00)', [17, 18, 19, 20, 21, 22]),
  ];

  const metrics = [
    { icon: Thermometer, label: 'อุณหภูมิสูงสุด', value: `${maxTemp}°C`, note: maxTemp >= 35 ? 'ร้อน ควรลดแดดช่วงบ่าย' : 'อยู่ในเกณฑ์สบาย', color: '#ef4444' },
    { icon: Activity, label: 'ความรู้สึกร้อน', value: `${Math.round(current?.feelsLike || 0)}°C`, note: current?.feelsLike >= 38 ? 'ร้อนจัด' : 'ร้อนปานกลาง', color: '#f97316' },
    { icon: CloudRain, label: 'โอกาสฝน', value: `${rainProb}%`, note: rainProb >= 50 ? 'พกร่มไว้จะอุ่นใจ' : 'ฝนน้อยถึงปานกลาง', color: '#2563eb' },
    { icon: Wind, label: 'ลม', value: `${Math.round(current?.windSpeed || 0)} km/h`, note: windDirection || 'ทิศทางไม่แน่ชัด', color: '#0284c7' },
    { icon: Sparkles, label: 'PM2.5', value: `${pm25} µg/m³`, note: pm25Status.text, color: pm25Status.color },
    { icon: Droplets, label: 'ความชื้น', value: `${Math.round(current?.humidity || 0)}%`, note: current?.humidity >= 70 ? 'ค่อนข้างชื้น' : 'กำลังดี', color: '#3b82f6' },
  ];

  const activities = [
    { icon: Dumbbell, label: 'วิ่งออกกำลังกาย', score: current?.feelsLike >= 38 || pm25 > 37.5 ? '5/10' : '7/10', status: current?.feelsLike >= 38 ? 'ลดเวลา' : 'พอใช้', color: current?.feelsLike >= 38 ? '#f97316' : '#22c55e' },
    { icon: Bike, label: 'ปั่นจักรยาน', score: rainProb >= 50 ? '5/10' : '7/10', status: rainProb >= 50 ? 'เสี่ยงฝน' : 'พอใช้', color: rainProb >= 50 ? '#f97316' : '#22c55e' },
    { icon: Trees, label: 'ท่องเที่ยว', score: pm25 <= 25 ? '8/10' : '6/10', status: pm25 <= 25 ? 'ดี' : 'พอใช้', color: pm25 <= 25 ? '#16a34a' : '#f59e0b' },
    { icon: Umbrella, label: 'พกร่ม', score: rainProb >= 40 ? 'จำเป็น' : 'สำรอง', status: rainProb >= 40 ? 'แนะนำ' : 'เผื่อไว้', color: '#2563eb' },
    { icon: Shirt, label: 'ซักผ้า', score: rainProb >= 45 ? '3/10' : '7/10', status: rainProb >= 45 ? 'ไม่แนะนำ' : 'ทำได้', color: rainProb >= 45 ? '#ef4444' : '#22c55e' },
  ];

  const advice = [
    { icon: Shirt, title: 'การแต่งกาย', text: 'สวมเสื้อผ้าระบายอากาศดี และเตรียมร่มหรือเสื้อกันฝน', color: '#22c55e' },
    { icon: Activity, title: 'กิจกรรมกลางแจ้ง', text: 'เหมาะกับช่วงเช้าหรือเย็น เลี่ยงแดดจัดช่วงบ่าย', color: '#f59e0b' },
    { icon: BriefcaseMedical, title: 'สุขภาพ', text: 'ดื่มน้ำให้เพียงพอ ระวังความร้อนและรังสี UV', color: '#ef4444' },
    { icon: Car, title: 'การเดินทาง', text: 'ถ้าฝนเริ่มก่อตัว ให้เผื่อเวลาและระวังถนนลื่น', color: '#3b82f6' },
  ];

  const currentMiniStats = [
    { icon: CloudRain, label: 'ฝน', value: `${rainProb}%`, color: '#2563eb' },
    { icon: Wind, label: 'ลม', value: `${Math.round(current?.windSpeed || 0)}`, color: '#0ea5e9' },
    { icon: Droplets, label: 'ชื้น', value: `${Math.round(current?.humidity || 0)}%`, color: '#3b82f6' },
    { icon: Sparkles, label: 'PM2.5', value: `${pm25}`, color: pm25Status.color },
  ];

  const secondaryStats = [
    { icon: Gauge, label: 'ความกดอากาศ', value: `${Math.round(current?.pressure || 0)} hPa`, color: styles.text },
    { icon: Eye, label: 'ทัศนวิสัย', value: `${Math.round((current?.visibility || 0) / 1000)} km`, color: styles.text },
    { icon: Sun, label: 'ดัชนี UV', value: `${Math.round(current?.uv || 0)} ${uvStatus.text}`, color: uvStatus.color },
    { icon: LocateFixed, label: 'จุดน้ำค้าง', value: `${Math.round((current?.temp || 0) - ((100 - (current?.humidity || 0)) / 5))}°C`, color: styles.text },
  ];

  const gridColumns = isMobile ? '1fr' : 'minmax(420px, 1.35fr) minmax(330px, 0.95fr) minmax(310px, 0.85fr)';
  const chartColor = trendTab === 'temp' ? '#ef4444' : trendTab === 'rain' ? '#2563eb' : trendTab === 'pm25' ? '#22c55e' : trendTab === 'wind' ? '#0ea5e9' : '#3b82f6';
  const dailySparkData = (daily?.time || []).slice(0, 7).map((time, index) => ({ time, temp: Math.round(daily?.temperature_2m_max?.[index] || 0) }));
  const tomorrowWeather = getWeatherIcon(daily?.weathercode?.[1] ?? current?.weatherCode);
  const tomorrowRain = Math.round(daily?.precipitation_probability_max?.[1] || 0);
  const tomorrowMax = Math.round(daily?.temperature_2m_max?.[1] || maxTemp);
  const tomorrowMin = Math.round(daily?.temperature_2m_min?.[1] || minTemp);
  const bestExerciseWindows = trendData
    .filter((item) => item.rain <= 35 && item.temp <= 34 && item.pm25 <= 37)
    .slice(0, 3)
    .map((item) => `${item.time} น. (${item.temp}°C, ฝน ${item.rain}%)`);
  const avgToday = Math.round(avg(trendData.map((item) => item.temp)));
  const avgYesterday = Math.round(avg(trendData.map((item) => item.yesterday)));
  const compareDelta = avgToday - avgYesterday;
  const weeklyDetails = (daily?.time || []).slice(0, 7).map((time, index) => ({
    day: new Date(time).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' }),
    icon: getWeatherIcon(daily?.weathercode?.[index] ?? current?.weatherCode).icon,
    min: Math.round(daily?.temperature_2m_min?.[index] || minTemp),
    max: Math.round(daily?.temperature_2m_max?.[index] || maxTemp),
    rain: Math.round(daily?.precipitation_probability_max?.[index] || 0),
  }));
  const detailButtonStyle = {
    border: `1px solid ${styles.border}`,
    background: '#fff',
    color: styles.blue,
    borderRadius: 14,
    padding: '11px 12px',
    fontWeight: 900,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  };

  const quickQuestions = [
    { id: 'today', question: 'สภาพอากาศวันนี้เป็นอย่างไร?', icon: CloudRain },
    { id: 'tomorrow', question: 'พรุ่งนี้ฝนจะตกไหม?', icon: Droplets },
    { id: 'exercise', question: 'เหมาะกับการออกกำลังกายหรือไม่?', icon: Dumbbell },
    { id: 'outfit', question: 'ควรใส่เสื้อผ้าแบบไหน?', icon: Shirt },
    { id: 'compare', question: 'เปรียบเทียบกับเมื่อวาน', icon: Activity },
  ];

  const insightDetails = {
    today: {
      icon: CloudRain,
      title: 'สภาพอากาศวันนี้เป็นอย่างไร?',
      lead: `วันนี้ ${weatherInfo.text} อุณหภูมิ ${minTemp}-${maxTemp}°C โอกาสฝนสูงสุด ${rainProb}% และ PM2.5 อยู่ในเกณฑ์${pm25Status.text}`,
      stats: [
        ['อุณหภูมิ', `${Math.round(current?.temp || 0)}°C`],
        ['รู้สึกเหมือน', `${Math.round(current?.feelsLike || 0)}°C`],
        ['ฝนสูงสุด', `${rainProb}%`],
        ['PM2.5', `${pm25} µg/m³`],
      ],
      bullets: [
        rainProb >= 50 ? 'ควรพกร่มหรือเสื้อกันฝน โดยเฉพาะช่วงบ่ายถึงเย็น' : 'โอกาสฝนยังไม่สูงมาก แต่ควรเช็กก่อนเดินทางไกล',
        current?.feelsLike >= 38 ? 'ช่วงแดดจัดจะรู้สึกร้อนมาก ควรลดเวลานอกอาคาร' : 'ความร้อนยังจัดการได้ถ้าหลีกเลี่ยงแดดตรงช่วงบ่าย',
        `คุณภาพอากาศอยู่ระดับ${pm25Status.text} เหมาะกับกิจกรรมทั่วไปตามสภาพร่างกาย`,
      ],
    },
    tomorrow: {
      icon: Droplets,
      title: 'พรุ่งนี้ฝนจะตกไหม?',
      lead: `พรุ่งนี้คาดว่า ${tomorrowWeather.text} อุณหภูมิ ${tomorrowMin}-${tomorrowMax}°C โอกาสฝนสูงสุด ${tomorrowRain}%`,
      stats: [
        ['ต่ำสุด', `${tomorrowMin}°C`],
        ['สูงสุด', `${tomorrowMax}°C`],
        ['โอกาสฝน', `${tomorrowRain}%`],
        ['ภาพรวม', tomorrowWeather.text],
      ],
      bullets: [
        tomorrowRain >= 60 ? 'มีโอกาสฝนชัดเจน ควรจัดแผนเดินทางแบบเผื่อเวลา' : tomorrowRain >= 30 ? 'มีโอกาสฝนบางช่วง พกร่มเล็กไว้จะคล่องตัวกว่า' : 'แนวโน้มฝนน้อย เหมาะกับงานนอกบ้านมากขึ้น',
        tomorrowMax >= 35 ? 'อากาศช่วงกลางวันยังร้อน ควรวางกิจกรรมหนักไว้เช้าหรือเย็น' : 'อุณหภูมิพรุ่งนี้อยู่ในช่วงค่อนข้างใช้งานง่าย',
        'ก่อนออกเดินทางจริงควรดูเรดาร์ฝนใกล้เวลาอีกครั้ง',
      ],
    },
    exercise: {
      icon: Dumbbell,
      title: 'เหมาะกับการออกกำลังกายหรือไม่?',
      lead: current?.feelsLike >= 38 || rainProb >= 60 || pm25 > 37.5
        ? 'วันนี้ออกกำลังกายกลางแจ้งได้แบบระวังตัว เลือกช่วงสั้นและลดความหนัก'
        : 'วันนี้ยังพอเหมาะกับการออกกำลังกายกลางแจ้ง โดยเลือกช่วงที่แดดไม่แรง',
      stats: [
        ['ความร้อน', `${Math.round(current?.feelsLike || 0)}°C`],
        ['ฝน', `${rainProb}%`],
        ['PM2.5', `${pm25}`],
        ['ลม', `${Math.round(current?.windSpeed || 0)} km/h`],
      ],
      bullets: [
        bestExerciseWindows.length ? `ช่วงที่น่าออกที่สุด: ${bestExerciseWindows.join(', ')}` : 'ช่วงที่เหมาะมากมีจำกัด ควรเลือกในร่มหรือช่วงเย็นหลังแดดอ่อน',
        'เตรียมน้ำดื่ม และพักเป็นระยะถ้ารู้สึกร้อนหรือหายใจไม่สะดวก',
        rainProb >= 45 ? 'ถ้าจะวิ่ง/ปั่น ควรมีแผนสำรองเมื่อฝนก่อตัว' : 'กิจกรรมเบาถึงปานกลางยังทำได้ค่อนข้างดี',
      ],
    },
    outfit: {
      icon: Shirt,
      title: 'ควรใส่เสื้อผ้าแบบไหน?',
      lead: 'แนะนำเสื้อผ้าบาง ระบายอากาศดี สีอ่อน และเตรียมอุปกรณ์กันฝนตามโอกาสฝน',
      stats: [
        ['สูงสุด', `${maxTemp}°C`],
        ['ความชื้น', `${Math.round(current?.humidity || 0)}%`],
        ['UV', `${Math.round(current?.uv || 0)} ${uvStatus.text}`],
        ['ฝน', `${rainProb}%`],
      ],
      bullets: [
        maxTemp >= 35 ? 'เลือกผ้าบาง แห้งไว และหลีกเลี่ยงเสื้อหนาหรือสีเข้มช่วงกลางวัน' : 'ใส่ชุดสบาย ๆ ระบายอากาศดีเหมาะกับทั้งวัน',
        current?.uv >= 6 ? 'ควรมีหมวก แว่นกันแดด หรือกันแดดเมื่อต้องอยู่กลางแจ้ง' : 'แดดยังควรระวัง แต่ไม่จำเป็นต้องจัดเต็มเท่าช่วง UV สูงมาก',
        rainProb >= 40 ? 'พกร่มพับหรือเสื้อกันฝนบาง ๆ จะเหมาะที่สุด' : 'พกร่มสำรองก็พอ หากไม่ได้อยู่กลางแจ้งนาน',
      ],
    },
    compare: {
      icon: Activity,
      title: 'เปรียบเทียบกับเมื่อวาน',
      lead: `อุณหภูมิเฉลี่ยวันนี้ ${avgToday}°C ${compareDelta >= 0 ? 'สูงกว่า' : 'ต่ำกว่า'}เมื่อวานประมาณ ${Math.abs(compareDelta)}°C`,
      stats: [
        ['วันนี้เฉลี่ย', `${avgToday}°C`],
        ['เมื่อวานเฉลี่ย', `${avgYesterday}°C`],
        ['ส่วนต่าง', `${compareDelta >= 0 ? '+' : ''}${compareDelta}°C`],
        ['ฝนวันนี้', `${rainProb}%`],
      ],
      bullets: [
        compareDelta > 1 ? 'วันนี้ร้อนกว่าเดิมเล็กน้อย ควรระวังช่วงบ่ายมากขึ้น' : compareDelta < -1 ? 'วันนี้เย็นกว่าเมื่อวานเล็กน้อย แต่ยังควรดูฝนช่วงบ่าย' : 'อุณหภูมิใกล้เคียงเมื่อวาน ความต่างหลักอยู่ที่โอกาสฝนรายชั่วโมง',
        'กราฟด้านล่างช่วยดูจังหวะขึ้นลงของอุณหภูมิระหว่างวัน',
        'ถ้าต้องเดินทางกลางแจ้ง ให้ดูช่วงฝนพุ่งสูงมากกว่าค่าเฉลี่ยทั้งวัน',
      ],
    },
    timeline: {
      icon: BrainCircuit,
      title: 'วิเคราะห์รายช่วงเวลาแบบละเอียด',
      lead: 'AI แยกเช้า บ่าย เย็นจากข้อมูลรายชั่วโมง เพื่อช่วยเลือกช่วงเวลาทำกิจกรรม',
      stats: aiPeriods.map((period) => [period.label.replace(/\s*\(.+\)/, ''), `${period.tempText}, ฝน ${period.rain}%`]),
      bullets: [
        aiPeriods.map((period) => `${period.label}: ${period.desc} อุณหภูมิ ${period.tempText} โอกาสฝนเฉลี่ย ${period.rain}%`).join(' | '),
        rainProb >= 50 ? 'ช่วงที่ฝนเฉลี่ยสูงควรเลี่ยงกิจกรรมที่ต้องอยู่กลางแจ้งต่อเนื่อง' : 'ภาพรวมยังพอจัดกิจกรรมกลางแจ้งได้ โดยเลือกช่วงที่แดดอ่อน',
        'ข้อมูลนี้เหมาะสำหรับวางแผนรายวัน และควรเช็กซ้ำใกล้เวลาใช้งานจริง',
      ],
    },
    weekly: {
      icon: Gauge,
      title: 'แนวโน้ม 7 วันแบบละเอียด',
      lead: `ช่วง 7 วันข้างหน้าอุณหภูมิเฉลี่ยประมาณ ${Math.round(avg(daily?.temperature_2m_min || [])) || minTemp}-${Math.round(avg(daily?.temperature_2m_max || [])) || maxTemp}°C`,
      stats: [
        ['วันฝนสูงสุด', `${Math.max(...weeklyDetails.map((item) => item.rain), 0)}%`],
        ['สูงสุดเฉลี่ย', `${Math.round(avg(daily?.temperature_2m_max || [])) || maxTemp}°C`],
        ['ต่ำสุดเฉลี่ย', `${Math.round(avg(daily?.temperature_2m_min || [])) || minTemp}°C`],
        ['จำนวนวัน', `${weeklyDetails.length} วัน`],
      ],
      bullets: [
        'เหมาะสำหรับวางแผนเดินทาง ซักผ้า หรือกิจกรรมกลางแจ้งล่วงหน้า',
        'วันที่ฝนเกิน 50% ควรมีแผนสำรองในร่ม',
        'อุณหภูมิยังอยู่ในโซนร้อนชื้น ควรเตรียมน้ำดื่มและกันแดด',
      ],
      weekly: weeklyDetails,
    },
    rain: {
      icon: CloudRain,
      title: 'คาดการณ์ฝน 6 ชั่วโมงข้างหน้า',
      lead: `ช่วงถัดไปมีโอกาสฝนสูงสุด ${Math.max(...sixHourForecast.map((item) => item.rain), 0)}% จากข้อมูลรายชั่วโมงล่าสุด`,
      stats: sixHourForecast.map((item) => [item.time, `${item.rain}%`]),
      bullets: [
        sixHourForecast.some((item) => item.rain >= 60) ? 'มีช่วงที่ฝนมีโอกาสสูง ควรเลี่ยงการเดินทางที่ไม่จำเป็นในช่วงนั้น' : 'ฝนยังไม่ถึงระดับเสี่ยงสูงมาก แต่ควรติดตามถ้าท้องฟ้าเริ่มมืด',
        'กราฟฝนด้านขวาช่วยดูเวลาที่โอกาสฝนเพิ่มขึ้นแบบเร็ว',
        'ถ้าต้องขับรถ ให้เผื่อเวลาช่วงที่เปอร์เซ็นต์ฝนสูงกว่า 40%',
      ],
    },
  };

  const selectedInsight = activeInsight ? insightDetails[activeInsight] : null;
  const openInsight = (id) => {
    setActiveInsight(id);
    window.setTimeout(() => {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  return (
    <main
      className="hide-scrollbar fade-in"
      style={{
        minHeight: '100%',
        padding: isMobile ? 14 : 22,
        background: 'radial-gradient(circle at 55% 0%, rgba(56,189,248,0.13), transparent 34%), var(--bg-app)',
        color: styles.text,
        fontFamily: 'Sarabun, sans-serif',
      }}
    >
      <Card
        style={{
          padding: isMobile ? 18 : 22,
          marginBottom: 18,
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'auto 1fr',
          gap: 18,
          alignItems: 'center',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.96), rgba(239,246,255,0.78)), var(--bg-card)',
        }}
      >
        <div style={{ width: 58, height: 58, borderRadius: 20, background: 'linear-gradient(135deg, #6366f1, #3b82f6)', color: '#fff', display: 'grid', placeItems: 'center', boxShadow: '0 18px 28px rgba(59,130,246,0.25)' }}>
          <Bot size={30} />
        </div>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: isMobile ? '1.15rem' : '1.35rem', fontWeight: 900, color: styles.text, letterSpacing: 0 }}>
            สวัสดีครับ! ผมคือ <span style={{ color: styles.blue }}>Thai Weather AI</span>
          </h1>
          <p style={{ margin: '5px 0 16px', color: styles.sub, fontSize: '0.92rem' }}>
            สรุปสภาพอากาศ ฝน ฝุ่น และคำแนะนำที่ใช้ได้จริงจากข้อมูลล่าสุด
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
            {quickQuestions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openInsight(item.id)}
                aria-pressed={activeInsight === item.id}
                style={{
                  border: `1px solid ${activeInsight === item.id ? styles.blue : styles.border}`,
                  background: activeInsight === item.id ? '#eff6ff' : 'rgba(255,255,255,0.72)',
                  color: styles.blue,
                  borderRadius: 999,
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Icon icon={item.icon} size={14} />
                {item.question}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {selectedInsight && (
        <Card
          ref={detailRef}
          style={{
            padding: isMobile ? 18 : 20,
            marginBottom: 18,
            borderColor: 'rgba(37,99,235,0.22)',
            background: 'linear-gradient(135deg, rgba(239,246,255,0.92), rgba(255,255,255,0.98)), var(--bg-card)',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(260px, 0.8fr) minmax(0, 1.2fr)', gap: 18, alignItems: 'start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ width: 38, height: 38, borderRadius: 14, background: '#dbeafe', color: styles.blue, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <Icon icon={selectedInsight.icon} size={21} strokeWidth={2.5} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: styles.blue, fontSize: '0.74rem', fontWeight: 900 }}>รายละเอียดจาก AI</div>
                  <h2 style={{ margin: 0, fontSize: isMobile ? '1.02rem' : '1.15rem', fontWeight: 900, color: styles.text }}>
                    {selectedInsight.title}
                  </h2>
                </div>
                <button
                  type="button"
                  aria-label="ปิดรายละเอียด"
                  onClick={() => setActiveInsight(null)}
                  style={{ marginLeft: 'auto', width: 34, height: 34, borderRadius: 12, border: `1px solid ${styles.border}`, background: '#fff', color: styles.sub, display: 'grid', placeItems: 'center', cursor: 'pointer' }}
                >
                  <X size={17} />
                </button>
              </div>
              <p style={{ margin: 0, color: '#334155', fontSize: '0.9rem', lineHeight: 1.65, fontWeight: 650 }}>
                {selectedInsight.lead}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
                {selectedInsight.stats.map(([label, value]) => (
                  <div key={label} style={{ background: '#fff', border: `1px solid ${styles.border}`, borderRadius: 14, padding: '11px 12px', minHeight: 70 }}>
                    <div style={{ color: styles.sub, fontSize: '0.68rem', fontWeight: 800 }}>{label}</div>
                    <div style={{ color: styles.text, fontSize: '0.88rem', fontWeight: 900, marginTop: 5, lineHeight: 1.35 }}>{value}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                {selectedInsight.bullets.map((item) => (
                  <div key={item} style={{ background: 'rgba(255,255,255,0.72)', border: `1px solid ${styles.border}`, borderRadius: 14, padding: 12, color: '#475569', fontSize: '0.78rem', lineHeight: 1.55, fontWeight: 650 }}>
                    {item}
                  </div>
                ))}
              </div>

              {selectedInsight.weekly && (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(7, minmax(0, 1fr))', gap: 8 }}>
                  {selectedInsight.weekly.map((day) => (
                    <div key={day.day} style={{ background: '#fff', border: `1px solid ${styles.border}`, borderRadius: 14, padding: 10, textAlign: 'center', minHeight: 108 }}>
                      <div style={{ color: styles.text, fontSize: '0.72rem', fontWeight: 900 }}>{day.day}</div>
                      <div style={{ fontSize: '1.35rem', margin: '5px 0' }}>{day.icon}</div>
                      <div style={{ color: styles.text, fontSize: '0.78rem', fontWeight: 900 }}>{day.min}-{day.max}°C</div>
                      <div style={{ color: styles.blue, fontSize: '0.7rem', fontWeight: 800, marginTop: 3 }}>ฝน {day.rain}%</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: gridColumns, gap: 18, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
          <Card style={{ padding: isMobile ? 18 : 20 }}>
            <SectionTitle title="สรุปภาพรวมวันนี้" eyebrow={`อัปเดตล่าสุด ${updateText} น.`} />
            <div style={{ minHeight: isMobile ? 150 : 178, borderRadius: 20, overflow: 'hidden', position: 'relative', padding: 22, display: 'flex', alignItems: 'flex-end', marginBottom: 14, color: '#17335f' }}>
              <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${heroBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(255,255,255,0.96), rgba(255,255,255,0.72) 48%, rgba(255,255,255,0.18))' }} />
              <div style={{ position: 'relative', maxWidth: 480 }}>
                <div style={{ fontWeight: 900, fontSize: '1.02rem', marginBottom: 8 }}>ภาพรวม: {weatherInfo.text}</div>
                <div style={{ color: '#475569', lineHeight: 1.65, fontSize: '0.9rem', fontWeight: 600 }}>
                  วันนี้อุณหภูมิ {minTemp}-{maxTemp}°C โอกาสฝนสูงสุด {rainProb}% ความชื้น {Math.round(current?.humidity || 0)}%
                  และ PM2.5 อยู่ในเกณฑ์{pm25Status.text} เหมาะกับการวางแผนกิจกรรมแบบยืดหยุ่นช่วงบ่าย
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(6, minmax(0, 1fr))', gap: 10 }}>
              {metrics.map((item) => (
                <div key={item.label} style={{ border: `1px solid ${styles.border}`, background: styles.muted, borderRadius: 16, padding: 12, minHeight: 116 }}>
                  <Icon icon={item.icon} size={17} color={item.color} />
                  <div style={{ color: styles.sub, fontSize: '0.72rem', marginTop: 8, minHeight: 31 }}>{item.label}</div>
                  <div style={{ color: item.color, fontSize: '1rem', fontWeight: 900, marginTop: 3, whiteSpace: 'nowrap' }}>{item.value}</div>
                  <div style={{ color: styles.sub, fontSize: '0.66rem', marginTop: 5, lineHeight: 1.35 }}>{item.note}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card style={{ padding: isMobile ? 18 : 20 }}>
            <SectionTitle
              title="กราฟแนวโน้มสภาพอากาศ"
              action={
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }} className="hide-scrollbar">
                  {[
                    ['temp', 'อุณหภูมิ'],
                    ['rain', 'ฝน'],
                    ['pm25', 'PM2.5'],
                    ['wind', 'ลม'],
                    ['humidity', 'ความชื้น'],
                  ].map(([id, label]) => (
                    <button key={id} onClick={() => setTrendTab(id)} style={{ border: `1px solid ${trendTab === id ? styles.blue : styles.border}`, background: trendTab === id ? styles.blue : styles.muted, color: trendTab === id ? '#fff' : styles.sub, borderRadius: 10, padding: '7px 10px', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {label}
                    </button>
                  ))}
                </div>
              }
            />
            <div style={{ height: isMobile ? 220 : 250, marginLeft: -10 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 18, right: 12, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="aiTrendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColor} stopOpacity={0.28} />
                      <stop offset="96%" stopColor={chartColor} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={styles.border} />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: styles.sub }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: styles.sub }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey={trendTab} name={trendTab.toUpperCase()} stroke={chartColor} strokeWidth={3} fill="url(#aiTrendFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card style={{ padding: isMobile ? 18 : 20 }}>
            <SectionTitle title="เหมาะกับกิจกรรมอะไรวันนี้?" />
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(5, minmax(0, 1fr))', gap: 10 }}>
              {activities.map((item) => (
                <div key={item.label} style={{ background: styles.muted, border: `1px solid ${styles.border}`, borderRadius: 16, padding: 12, textAlign: 'center', minHeight: 128 }}>
                  <Icon icon={item.icon} size={25} color={item.color} />
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, marginTop: 8, minHeight: 30 }}>{item.label}</div>
                  <div style={{ color: item.color, fontSize: '0.76rem', fontWeight: 900 }}>{item.status}</div>
                  <div style={{ color: styles.sub, fontSize: '0.7rem', marginTop: 2 }}>{item.score}</div>
                </div>
              ))}
            </div>
            <div style={{ color: styles.sub, fontSize: '0.73rem', marginTop: 12, display: 'flex', alignItems: 'center', gap: 7 }}>
              <BrainCircuit size={15} color={styles.blue} /> คะแนนแนะนำจากอุณหภูมิ ฝน ฝุ่น และลมปัจจุบัน
            </div>
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
          <Card style={{ padding: isMobile ? 18 : 20 }}>
            <SectionTitle title="AI วิเคราะห์สภาพอากาศ" eyebrow="ประเมินจากข้อมูลล่าสุด" icon={BrainCircuit} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {aiPeriods.map((period) => (
                <div key={period.label} style={{ display: 'flex', gap: 12, background: styles.muted, border: `1px solid ${styles.border}`, borderRadius: 16, padding: 14 }}>
                  <span style={{ width: 24, height: 24, borderRadius: 999, background: '#dcfce7', color: '#16a34a', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Check size={15} strokeWidth={3} />
                  </span>
                  <div>
                    <div style={{ color: styles.blue, fontSize: '0.84rem', fontWeight: 900 }}>{period.label}</div>
                    <div style={{ color: styles.text, marginTop: 4, fontSize: '0.8rem', lineHeight: 1.45 }}>
                      {period.desc}<br />
                      <span style={{ color: styles.sub }}>อุณหภูมิ {period.tempText} โอกาสฝนเฉลี่ย {period.rain}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => openInsight('timeline')} style={{ width: '100%', marginTop: 14, ...detailButtonStyle }}>
              ดูการวิเคราะห์แบบละเอียด <ArrowRight size={16} />
            </button>
          </Card>

          <Card style={{ padding: isMobile ? 18 : 20 }}>
            <SectionTitle title="เปรียบเทียบกับเมื่อวาน" />
            <div style={{ height: 190, marginLeft: -12 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={styles.border} />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: styles.sub }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: styles.sub }} domain={['dataMin - 2', 'dataMax + 2']} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="temp" name="วันนี้" stroke="#ef4444" strokeWidth={2.7} dot={{ r: 3, fill: '#fff', strokeWidth: 2 }} />
                  <Line type="monotone" dataKey="yesterday" name="เมื่อวาน" stroke="#60a5fa" strokeWidth={2.2} strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', gap: 12, background: '#eff6ff', border: `1px solid ${styles.border}`, padding: 12, borderRadius: 14, color: '#1e3a8a', fontSize: '0.79rem', lineHeight: 1.45 }}>
              <Activity size={20} />
              <div>วันนี้อุณหภูมิใกล้เคียงเมื่อวาน แต่โอกาสฝนช่วงบ่ายควรจับตาเป็นพิเศษ</div>
            </div>
          </Card>

          <Card style={{ padding: isMobile ? 18 : 20 }}>
            <SectionTitle title="AI วิเคราะห์ระยะยาว" eyebrow="แนวโน้ม 7 วันข้างหน้า" icon={Gauge} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 14, alignItems: 'center' }}>
              <div style={{ color: styles.sub, fontSize: '0.82rem', lineHeight: 1.6 }}>
                แนวโน้มอุณหภูมิยังอยู่ในช่วง {Math.round(avg(daily?.temperature_2m_min || [])) || minTemp}-{Math.round(avg(daily?.temperature_2m_max || [])) || maxTemp}°C
                โอกาสฝนมีเป็นระยะ ควรเช็กก่อนเดินทางไกล
              </div>
              <div style={{ height: 70, borderRadius: 14, background: '#eff6ff', padding: 8 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailySparkData}>
                    <Line type="monotone" dataKey="temp" stroke="#3b82f6" strokeWidth={2.4} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openInsight('weekly')}
              style={{ width: '100%', marginTop: 14, paddingTop: 12, border: 0, borderTop: `1px solid ${styles.border}`, background: 'transparent', color: styles.blue, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              ดูแนวโน้ม 7 วันแบบละเอียด <ArrowRight size={16} />
            </button>
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
          <Card style={{ padding: isMobile ? 18 : 20 }}>
            <SectionTitle title="สถานการณ์ปัจจุบัน" eyebrow={`อัปเดตล่าสุด ${updateText} น.`} />
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, margin: '8px 0 22px' }}>
              <div style={{ fontSize: '4.6rem', filter: 'drop-shadow(0 18px 20px rgba(245,158,11,0.22))' }}>{weatherInfo.icon}</div>
              <div>
                <div style={{ fontSize: isMobile ? '3rem' : '3.35rem', fontWeight: 900, lineHeight: 1, color: '#18315f' }}>
                  {Math.round(current?.temp || 0)}<span style={{ fontSize: '1.55rem', verticalAlign: 'top' }}>°C</span>
                </div>
                <div style={{ fontWeight: 900, marginTop: 5 }}>{weatherInfo.text}</div>
                <div style={{ color: styles.sub, fontSize: '0.82rem' }}>รู้สึกเหมือน {Math.round(current?.feelsLike || 0)}°C</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', border: `1px solid ${styles.border}`, borderRadius: 16, overflow: 'hidden', marginBottom: 14 }}>
              {currentMiniStats.map((item, index) => (
                <div key={item.label} style={{ padding: '12px 8px', textAlign: 'center', borderLeft: index ? `1px solid ${styles.border}` : 0 }}>
                  <Icon icon={item.icon} size={16} color={item.color} />
                  <div style={{ color: styles.sub, fontSize: '0.66rem', marginTop: 4 }}>{item.label}</div>
                  <div style={{ color: item.color, fontWeight: 900, fontSize: '0.92rem', marginTop: 2 }}>{item.value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
              {secondaryStats.map((item) => (
                <div key={item.label} style={{ textAlign: 'center', color: item.color }}>
                  <Icon icon={item.icon} size={15} />
                  <div style={{ color: styles.sub, fontSize: '0.64rem', marginTop: 4 }}>{item.label}</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 900, marginTop: 3 }}>{item.value}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card style={{ padding: isMobile ? 18 : 20 }}>
            <SectionTitle
              title="คาดการณ์ฝน 6 ชั่วโมงข้างหน้า"
              action={
                <button type="button" onClick={() => openInsight('rain')} style={{ border: 0, background: 'transparent', color: styles.blue, fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer', padding: 0 }}>
                  ดูเพิ่มเติม
                </button>
              }
            />
            <div style={{ height: 122 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sixHourForecast} margin={{ top: 10, right: 2, left: 2, bottom: 0 }}>
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: styles.sub }} />
                  <Tooltip cursor={{ fill: 'transparent' }} content={<CustomTooltip />} />
                  <Bar dataKey="rain" name="โอกาสฝน" radius={[8, 8, 0, 0]} barSize={24}>
                    {sixHourForecast.map((entry) => (
                      <Cell key={entry.time} fill={entry.rain >= 50 ? '#2563eb' : '#93c5fd'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${sixHourForecast.length || 1}, minmax(0, 1fr))`, gap: 6, textAlign: 'center' }}>
              {sixHourForecast.map((item) => (
                <div key={item.time}>
                  <div style={{ fontSize: '1.2rem' }}>{item.icon}</div>
                  <div style={{ color: styles.blue, fontSize: '0.72rem', fontWeight: 900 }}>{item.rain}%</div>
                </div>
              ))}
            </div>
          </Card>

          <Card style={{ padding: isMobile ? 18 : 20 }}>
            <SectionTitle title="คำแนะนำสำหรับคุณ" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {advice.map((item) => (
                <div key={item.title} style={{ display: 'flex', gap: 12, background: styles.muted, border: `1px solid ${styles.border}`, borderRadius: 16, padding: 14 }}>
                  <span style={{ width: 34, height: 34, borderRadius: 12, background: '#fff', color: item.color, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Icon icon={item.icon} size={19} />
                  </span>
                  <div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 900 }}>{item.title}</div>
                    <div style={{ color: styles.sub, fontSize: '0.78rem', lineHeight: 1.45, marginTop: 3 }}>{item.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div style={{ marginTop: 18, color: styles.sub, display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.75rem' }}>
        <MapPin size={14} color={styles.blue} /> วิเคราะห์จากตำแหน่งปัจจุบันหรือกรุงเทพมหานครเมื่อไม่สามารถเข้าถึง GPS
      </div>
    </main>
  );
}
