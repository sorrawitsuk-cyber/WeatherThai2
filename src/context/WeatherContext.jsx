// src/context/WeatherContext.jsx
import React, { createContext, useState, useEffect } from 'react';
import { extractProvince } from '../utils/helpers';

export const WeatherContext = createContext();

export const WeatherProvider = ({ children }) => {
  const [stations, setStations] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [stationTemps, setStationTemps] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdateText, setLastUpdateText] = useState('');
  const [nationwideSummary, setNationwideSummary] = useState(null);
  
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('darkMode');
      return saved ? saved === 'true' : false;
    } catch (error) {
      return false;
    }
  });

  const [favLocations, setFavLocations] = useState(() => {
    try {
      const saved = localStorage.getItem('weatherFavs');
      // 🌟 เปลี่ยนจาก ['กรุงเทพมหานคร'] เป็น [] เพื่อให้เริ่มต้นแบบว่างเปล่า
      return saved && saved !== 'undefined' ? JSON.parse(saved) : [];
    } catch (error) {
      return [];
    }
  });

  useEffect(() => { 
    try { localStorage.setItem('darkMode', darkMode); } catch(e) {}
    if(darkMode) document.body.classList.add('dark-theme'); 
    else document.body.classList.remove('dark-theme'); 
  }, [darkMode]);

  const toggleFavorite = (prov) => {
    let newFavs = [...favLocations];
    if (newFavs.includes(prov)) newFavs = newFavs.filter(l => l !== prov);
    else newFavs.push(prov);
    setFavLocations(newFavs);
    try { localStorage.setItem('weatherFavs', JSON.stringify(newFavs)); } catch(e) {}
  };

  const fetchOpenMeteoBulk = async (stationsList) => {
    try {
      let allWeather = {}; const chunkSize = 50; 
      for (let i = 0; i < stationsList.length; i += chunkSize) {
        const chunk = stationsList.slice(i, i + chunkSize); if(chunk.length === 0) continue;
        const lats = chunk.map(s => s.lat).join(','); const lons = chunk.map(s => s.long).join(',');
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,uv_index_max,precipitation_probability_max,wind_speed_10m_max&timezone=Asia%2FBangkok`;
        const res = await fetch(url); const data = await res.json(); const results = Array.isArray(data) ? data : [data];
        results.forEach((r, idx) => {
           if (r && r.current && r.daily) {
             allWeather[chunk[idx].stationID] = {
               temp: r.current.temperature_2m, feelsLike: r.current.apparent_temperature, humidity: r.current.relative_humidity_2m, windSpeed: r.current.wind_speed_10m, windDir: r.current.wind_direction_10m, weatherCode: r.current.weather_code, tempMin: r.daily.temperature_2m_min[0], tempMax: r.daily.temperature_2m_max[0], heatMin: r.daily.temperature_2m_min[0], heatMax: r.daily.apparent_temperature_max[0], uvMax: r.daily.uv_index_max[0], rainProb: r.daily.precipitation_probability_max[0], windMax: r.daily.wind_speed_10m_max[0]
             };
           }
        });
      }
      return allWeather;
    } catch (error) { return {}; }
  };

  const fetchAirQuality = async (isBackgroundLoad = false) => {
    if (!isBackgroundLoad) setLoading(true);
    try {
      const PROJECT_ID = "thai-env-dashboard"; 
      const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/weatherData/latest?t=${new Date().getTime()}`;
      const firebaseRes = await fetch(url, { cache: 'no-store' }).then(res => res.json()); 
      const parsedData = JSON.parse(firebaseRes.fields.jsonData.stringValue); const stData = parsedData.stations || [];
      
      if (stData.length > 0) {
        const validStations = stData
          .filter(s => !isNaN(parseFloat(s.lat)) && !isNaN(parseFloat(s.long)) && parseFloat(s.lat) !== 0)
          .map(s => {
            const aqi = s.AQILast || {};
            const pm25 = aqi.PM25 || { value: NaN };
            return { ...s, AQILast: { ...aqi, PM25: pm25 } };
          });

        const openMeteoData = await fetchOpenMeteoBulk(validStations); 
        
        setStations(validStations);
        setProvinces([...new Set(validStations.map(s => extractProvince(s.areaTH)))].sort((a, b) => a.localeCompare(b, 'th')));
        
        const firstValid = validStations.find(s => s.AQILast && s.AQILast.date);
        if (firstValid) {
          setLastUpdateText(`${firstValid.AQILast.date} เวลา ${firstValid.AQILast.time} น.`);
        }
        
        setStationTemps(openMeteoData); 
      }
    } catch (err) { console.error(err); } finally { if (!isBackgroundLoad) setLoading(false); }
  };

  useEffect(() => { 
    fetchAirQuality(); 
    const intervalId = setInterval(() => { fetchAirQuality(true); }, 1800000); 
    return () => clearInterval(intervalId); 
  }, []);

  useEffect(() => {
    if (stations.length === 0 || Object.keys(stationTemps).length === 0) return;
    const provData = {};
    stations.forEach(s => {
      const prov = extractProvince(s.areaTH);
      if (!provData[prov]) provData[prov] = { pm25: [], rain: [], wind: [], heat: [] };
      
      const pm = Number(s.AQILast.PM25.value); 
      if (!isNaN(pm)) provData[prov].pm25.push(pm);
      
      const t = stationTemps[s.stationID];
      if (t) {
        if (t.rainProb != null) provData[prov].rain.push(t.rainProb);
        if (t.windMax != null) provData[prov].wind.push(t.windMax);
        if (t.heatMax != null) provData[prov].heat.push(t.heatMax);
      }
    });

    let pm25AvgList = []; let stormAvgList = []; let heatAvgList = [];
    for (const prov in provData) {
      const d = provData[prov]; const getAvg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      const avgPm = getAvg(d.pm25); const avgRain = getAvg(d.rain); const avgWind = getAvg(d.wind); const avgHeat = getAvg(d.heat);
      if (avgPm >= 37.5) pm25AvgList.push({ prov, val: Math.round(avgPm * 10) / 10 });
      if (avgRain >= 40 || avgWind >= 30) stormAvgList.push({ prov, rain: Math.round(avgRain), wind: Math.round(avgWind) });
      if (avgHeat >= 40) heatAvgList.push({ prov, val: Math.round(avgHeat * 10) / 10 });
    }
    pm25AvgList.sort((a, b) => b.val - a.val); stormAvgList.sort((a, b) => Math.max(b.rain, b.wind) - Math.max(a.rain, a.wind)); heatAvgList.sort((a, b) => b.val - a.val);
    setNationwideSummary({ pm25: pm25AvgList.slice(0, 5), storm: stormAvgList.slice(0, 5), heat: heatAvgList.slice(0, 5) });
  }, [stations, stationTemps]);

  return (
    <WeatherContext.Provider value={{
      stations, provinces, stationTemps, loading, lastUpdateText, darkMode, setDarkMode, nationwideSummary, favLocations, toggleFavorite, fetchAirQuality
    }}>
      {children}
    </WeatherContext.Provider>
  );
};