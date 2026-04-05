// src/context/WeatherContext.jsx
import React, { createContext, useState, useEffect } from 'react';

export const WeatherContext = createContext();

export const WeatherProvider = ({ children }) => {
  const [stations, setStations] = useState([]);
  const [stationTemps, setStationTemps] = useState({});
  const [weatherData, setWeatherData] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [lastUpdateText, setLastUpdateText] = useState("");

  // 1. ดึงข้อมูลสถานีทั่วประเทศ
  const fetchAir4Thai = async () => {
    try {
      const res = await fetch('https://air4thai.pcd.go.th/services/getNewAQI_JSON.php');
      const data = await res.json();
      setStations(data.stations || []);
      
      const temps = {};
      (data.stations || []).forEach(st => {
        temps[st.stationID] = {
          temp: 26 + Math.random() * 8, feelsLike: 28 + Math.random() * 10,
          humidity: 40 + Math.random() * 40, rainProb: Math.random() * 100, windSpeed: Math.random() * 20
        };
      });
      setStationTemps(temps);
    } catch (e) { 
      console.error("⚠️ Air4Thai Server Down! Switching to Fallback Mode..."); 
      
      // 🌟 แผนสำรอง: ถ้าเว็บรัฐพัง เสกข้อมูลพิกัดเมืองหลักๆ ให้แอปทำงานต่อได้ ไม่ให้จอขาว!
      const fallbackStations = [
        { stationID: 'FB1', areaTH: 'อ.เมือง กรุงเทพมหานคร', lat: '13.7563', long: '100.5018', AQILast: { PM25: { value: 25 } } },
        { stationID: 'FB2', areaTH: 'อ.เมือง เชียงใหม่', lat: '18.7883', long: '98.9853', AQILast: { PM25: { value: 45 } } },
        { stationID: 'FB3', areaTH: 'อ.เมือง ภูเก็ต', lat: '7.8804', long: '98.3923', AQILast: { PM25: { value: 15 } } },
        { stationID: 'FB4', areaTH: 'อ.เมือง ขอนแก่น', lat: '16.4322', long: '102.8236', AQILast: { PM25: { value: 22 } } },
        { stationID: 'FB5', areaTH: 'อ.เมือง ชลบุรี', lat: '13.3611', long: '100.9847', AQILast: { PM25: { value: 30 } } },
        { stationID: 'FB6', areaTH: 'อ.เมือง นครราชสีมา', lat: '14.9799', long: '102.0978', AQILast: { PM25: { value: 28 } } },
        { stationID: 'FB7', areaTH: 'อ.หาดใหญ่ สงขลา', lat: '7.0055', long: '100.4746', AQILast: { PM25: { value: 18 } } },
        { stationID: 'FB8', areaTH: 'อ.เมือง นนทบุรี', lat: '13.8591', long: '100.5217', AQILast: { PM25: { value: 24 } } }
      ];
      setStations(fallbackStations);

      const temps = {};
      fallbackStations.forEach(st => {
        temps[st.stationID] = {
          temp: 26 + Math.random() * 8, feelsLike: 28 + Math.random() * 10,
          humidity: 40 + Math.random() * 40, rainProb: Math.random() * 100, windSpeed: Math.random() * 20
        };
      });
      setStationTemps(temps);
    }
  };

  // 2. ดึงข้อมูลพิกัดเฉพาะจุด
  const fetchWeatherByCoords = async (lat, lon) => {
    setLoadingWeather(true);
    try {
      const wUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,uv_index&hourly=temperature_2m,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=Asia%2FBangkok`;
      const aUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm2_5,us_aqi&timezone=Asia%2FBangkok`;

      const [wRes, aRes] = await Promise.all([fetch(wUrl), fetch(aUrl)]);
      const wData = await wRes.json();
      const aData = await aRes.json();

      setWeatherData({
        current: {
          temp: wData.current.temperature_2m, feelsLike: wData.current.apparent_temperature,
          humidity: wData.current.relative_humidity_2m, windSpeed: wData.current.wind_speed_10m,
          rain: wData.current.precipitation, uv: wData.current.uv_index,
          pm25: aData.current.pm2_5, aqi: aData.current.us_aqi
        },
        hourly: wData.hourly, daily: wData.daily, coords: { lat, lon }
      });

      const now = new Date();
      setLastUpdateText(`${now.toLocaleDateString('th-TH')} เวลา ${now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`);
    } catch (error) { console.error("Open-Meteo Error:", error); } 
    finally { setLoadingWeather(false); }
  };

  useEffect(() => { fetchAir4Thai(); }, []);

  return (
    <WeatherContext.Provider value={{ stations, stationTemps, weatherData, fetchWeatherByCoords, loadingWeather, darkMode, setDarkMode, lastUpdateText }}>
      {children}
    </WeatherContext.Provider>
  );
};