import React, { createContext, useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase'; 

export const WeatherContext = createContext();

export const WeatherProvider = ({ children }) => {
  const [stations, setStations] = useState([]);
  const [stationTemps, setStationTemps] = useState({});
  const [stationYesterday, setStationYesterday] = useState({}); 
  const [stationMaxYesterday, setStationMaxYesterday] = useState({}); // 🌟 เพิ่มท่อรับค่าสูงสุด
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme ? savedTheme === 'dark' : true; 
  });

  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    const weatherRef = ref(db, 'weather_data');

    const unsubscribe = onValue(weatherRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setStations(data.stations || []);
        setStationTemps(data.stationTemps || {});
        setStationYesterday(data.stationYesterday || {}); 
        setStationMaxYesterday(data.stationMaxYesterday || {}); // 🌟 รับข้อมูลเข้า
        setLastUpdated(data.lastUpdated || null);
      } else {
        setStations([]);
        setStationTemps({});
        setStationYesterday({});
        setStationMaxYesterday({});
      }
      setLoading(false); 
    }, (error) => {
      console.error("Firebase Read Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <WeatherContext.Provider value={{ 
      stations, stationTemps, stationYesterday, 
      stationMaxYesterday, // 🌟 ส่งข้อมูลต่อให้หน้าบ้าน
      loading, lastUpdated, darkMode, setDarkMode      
    }}>
      {children}
    </WeatherContext.Provider>
  );
};