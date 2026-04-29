import { useContext, useEffect, useMemo, useState } from 'react';
import { WeatherContext } from '../../context/WeatherContext';
import { useWeatherData } from '../../hooks/useWeatherData';

const num = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const round = (value, fallback = 0) => Math.round(num(value, fallback));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const stationName = (station) => {
  const raw = station?.areaTH || station?.nameTH || station?.nameEN || station?.stationID || '-';
  return String(raw).replace(/^จ\./, '').replace('จังหวัด', '').trim();
};

export const riskMeta = (score) => {
  if (score >= 75) return { label: 'เสี่ยงสูง', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' };
  if (score >= 55) return { label: 'ควรระวัง', color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.32)' };
  if (score >= 35) return { label: 'ปานกลาง', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.32)' };
  return { label: 'รับมือได้', color: '#16a34a', bg: 'rgba(22,163,74,0.11)', border: 'rgba(22,163,74,0.28)' };
};

export const pmMeta = (pm25) => {
  if (pm25 >= 75) return { label: 'มีผลกระทบสูง', color: '#ef4444' };
  if (pm25 >= 50) return { label: 'เริ่มมีผลกระทบ', color: '#f97316' };
  if (pm25 >= 25) return { label: 'ปานกลาง', color: '#f59e0b' };
  return { label: 'ดี', color: '#16a34a' };
};

export const heatMeta = (heat) => {
  if (heat >= 41) return { label: 'อันตรายจากความร้อน', color: '#ef4444' };
  if (heat >= 38) return { label: 'ร้อนจัด ควรพักเป็นช่วง', color: '#f97316' };
  if (heat >= 35) return { label: 'ร้อน ควรดื่มน้ำบ่อย', color: '#f59e0b' };
  return { label: 'รับมือได้', color: '#16a34a' };
};

export const thaiTime = (value) => new Date(value).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

export function useAIPageData() {
  const {
    stations,
    stationTemps,
    stationYesterday,
    stationMaxYesterday,
    stationDaily,
    gistdaSummary,
    lastUpdated,
    tmdAvailable,
  } = useContext(WeatherContext);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const { weatherData, loadingWeather, fetchWeatherByCoords } = useWeatherData();
  const [windAnalysis, setWindAnalysis] = useState(null);
  const [windLoading, setWindLoading] = useState(false);
  const [windError, setWindError] = useState(null);
  const [windLastFetch, setWindLastFetch] = useState(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (weatherData) return;
    fetchWeatherByCoords(13.75, 100.5);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
        () => {},
        { maximumAge: 300000, timeout: 2500 }
      );
    }
  }, [fetchWeatherByCoords, weatherData]);

  const fetchWindAnalysis = async () => {
    setWindLoading(true);
    setWindError(null);
    try {
      const res = await fetch('/api/tmd-wind');
      if (!res.ok) throw new Error(`ไม่สามารถโหลดข้อมูลได้ (${res.status})`);
      const data = await res.json();
      setWindAnalysis(data);
      setWindLastFetch(new Date());
    } catch (err) {
      setWindError(err.message || 'ไม่สามารถโหลดข้อมูลการวิเคราะห์ลมได้ในขณะนี้');
    } finally {
      setWindLoading(false);
    }
  };

  useEffect(() => {
    fetchWindAnalysis();
    const interval = setInterval(fetchWindAnalysis, 3 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const stationRows = useMemo(() => {
    return (stations || []).map((station) => {
      const id = station.stationID;
      const live = stationTemps?.[id] || {};
      const yesterdayMax = stationMaxYesterday?.[id] || {};
      const yesterdayMin = stationYesterday?.[id] || {};
      const daily = stationDaily?.[id] || {};
      const temp = round(live.temp, Number.NaN);
      const feelsLike = round(live.feelsLike ?? live.heatIndex ?? live.temp, temp);
      const pm25 = round(station?.AQILast?.PM25?.value ?? live.pm25, 0);
      const rain = round(live.rainProb ?? live.rainChance ?? live.rain, 0);
      const wind = round(live.windSpeed ?? live.wind, 0);
      const humidity = round(live.humidity ?? live.rh, 0);
      const heatRisk = clamp((feelsLike - 32) * 5.5, 0, 42);
      const pmRisk = clamp(pm25 * 0.72, 0, 38);
      const rainRisk = clamp(rain * 0.22, 0, 16);
      const windRisk = clamp((wind - 12) * 0.9, 0, 10);
      const riskScore = round(heatRisk + pmRisk + rainRisk + windRisk);

      return {
        id, name: stationName(station), temp, feelsLike, pm25, rain, wind, humidity,
        yesterdayTemp: round(yesterdayMax.temp ?? yesterdayMin.temp, Number.NaN),
        yesterdayPm25: round(yesterdayMax.pm25 ?? yesterdayMin.pm25, 0),
        dailyMax: round(daily?.temperature_2m_max?.[0] ?? daily?.tempMax?.[0], Number.NaN),
        dailyRain: round(daily?.precipitation_probability_max?.[0] ?? daily?.rainProb?.[0], 0),
        riskScore, riskMeta: riskMeta(riskScore),
      };
    }).filter((row) => Number.isFinite(row.temp) || row.pm25 > 0 || row.rain > 0);
  }, [stationDaily, stationMaxYesterday, stationTemps, stationYesterday, stations]);

  const rankings = useMemo(() => {
    const by = (key, direction = 'desc') => [...stationRows]
      .filter((row) => Number.isFinite(row[key]) && row[key] > -50)
      .sort((a, b) => direction === 'asc' ? a[key] - b[key] : b[key] - a[key])
      .slice(0, 5).map((row) => ({ name: row.name, val: row[key] }));

    return {
      heat: by('feelsLike'), cool: by('temp', 'asc'), pm25: by('pm25'), rain: by('rain'),
      risk: [...stationRows].sort((a, b) => b.riskScore - a.riskScore).slice(0, 6),
      yesterdayHeat: [...stationRows].filter((row) => Number.isFinite(row.yesterdayTemp)).sort((a, b) => b.yesterdayTemp - a.yesterdayTemp).slice(0, 5).map((row) => ({ name: row.name, val: row.yesterdayTemp })),
      yesterdayPm25: [...stationRows].filter((row) => row.yesterdayPm25 > 0).sort((a, b) => b.yesterdayPm25 - a.yesterdayPm25).slice(0, 5).map((row) => ({ name: row.name, val: row.yesterdayPm25 })),
    };
  }, [stationRows]);

  const national = useMemo(() => {
    const average = (key) => {
      const values = stationRows.map((row) => row[key]).filter((value) => Number.isFinite(value) && value > -50);
      return values.length ? round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
    };
    return {
      temp: average('temp'), feelsLike: average('feelsLike'), pm25: average('pm25'),
      rain: average('rain'), wind: average('wind'), humidity: average('humidity'),
      stationCount: stationRows.length, topRisk: rankings.risk?.[0],
    };
  }, [rankings.risk, stationRows]);

  return {
    isMobile, weatherData, loadingWeather, windAnalysis, windLoading, windError, windLastFetch, fetchWindAnalysis,
    gistdaSummary, lastUpdated, tmdAvailable, stationRows, rankings, national,
  };
}
