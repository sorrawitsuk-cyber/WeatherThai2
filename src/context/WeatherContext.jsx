import React, { createContext, useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase'; 

export const WeatherContext = createContext();

export const WeatherProvider = ({ children }) => {
  const [stations, setStations] = useState([]);
  const [stationTemps, setStationTemps] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // ระบบโหมดมืด
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme ? savedTheme === 'dark' : true; 
  });

  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // ดักฟังข้อมูลจาก Firebase อย่างเดียว (ไม่ต้องสูบเองแล้ว Vercel ทำให้)
  useEffect(() => {
    const weatherRef = ref(db, 'weather_data');

    const unsubscribe = onValue(weatherRef, (snapshot) => {
      const data = snapshot.val();
      
      if (data) {
        setStations(data.stations || []);
        setStationTemps(data.stationTemps || {});
        setLastUpdated(data.lastUpdated || null);
      } else {
        setStations([]);
        setStationTemps({});
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
      stations, 
      stationTemps, 
      loading, 
      lastUpdated,
      darkMode,        
      setDarkMode      
    }}>
      {children}
    </WeatherContext.Provider>
  );
};