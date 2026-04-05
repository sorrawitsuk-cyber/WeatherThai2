// src/context/WeatherContext.jsx
import React, { createContext, useState, useEffect } from 'react';

export const WeatherContext = createContext();

export const WeatherProvider = ({ children }) => {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [lastUpdateText, setLastUpdateText] = useState("");

  // ฟังก์ชันหลักในการดึงข้อมูลจาก Open-Meteo ตามพิกัด (Lat/Lon)
  const fetchWeatherByCoords = async (lat, lon) => {
    setLoading(true);
    try {
      // 1. ดึงข้อมูลสภาพอากาศ (Weather)
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,wind_direction_10m,uv_index&hourly=temperature_2m,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=Asia%2FBangkok`;
      
      // 2. ดึงข้อมูลคุณภาพอากาศ (Air Quality / PM2.5)
      const airQualityUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm2_5,pm10,us_aqi&timezone=Asia%2FBangkok`;

      const [wRes, aRes] = await Promise.all([fetch(weatherUrl), fetch(airQualityUrl)]);
      const wData = await wRes.json();
      const aData = await aRes.json();

      setWeatherData({
        current: {
          temp: wData.current.temperature_2m,
          feelsLike: wData.current.apparent_temperature,
          humidity: wData.current.relative_humidity_2m,
          windSpeed: wData.current.wind_speed_10m,
          windDir: wData.current.wind_direction_10m,
          rain: wData.current.precipitation,
          uv: wData.current.uv_index,
          pm25: aData.current.pm2_5,
          aqi: aData.current.us_aqi
        },
        hourly: wData.hourly,
        daily: wData.daily,
        coords: { lat, lon }
      });

      const now = new Date();
      setLastUpdateText(`${now.toLocaleDateString('th-TH')} เวลา ${now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <WeatherContext.Provider value={{ 
      weatherData, 
      fetchWeatherByCoords, 
      loading, 
      darkMode, 
      setDarkMode, 
      lastUpdateText 
    }}>
      {children}
    </WeatherContext.Provider>
  );
};