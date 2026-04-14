import React, { createContext, useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase'; 

export const WeatherContext = createContext();

export const WeatherProvider = ({ children }) => {
  const [stations, setStations] = useState([]);
  const [stationTemps, setStationTemps] = useState({});
  const [stationYesterday, setStationYesterday] = useState({}); 
  const [stationMaxYesterday, setStationMaxYesterday] = useState({}); 
  const [stationDaily, setStationDaily] = useState({}); 
  const [gistdaSummary, setGistdaSummary] = useState(null);
  const [amphoeData, setAmphoeData] = useState(null); // 🆕 ข้อมูลระดับอำเภอจาก TMD
  const [tmdAvailable, setTmdAvailable] = useState(false); // 🆕 TMD API status
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme ? savedTheme === 'dark' : true; 
  });

  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    
    // Toggle the dark-theme class on the body to activate global CSS variables
    if (darkMode) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }, [darkMode]);

  useEffect(() => {
    // ===== 1. Weather Data (Province level — เดิม) =====
    const weatherRef = ref(db, 'weather_data');
    const unsubscribe = onValue(weatherRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setStations(data.stations || []);
        setStationTemps(data.stationTemps || {});
        setStationYesterday(data.stationYesterday || {}); 
        setStationMaxYesterday(data.stationMaxYesterday || {}); 
        setStationDaily(data.stationDaily || {});
        setLastUpdated(data.lastUpdated || null);
        setTmdAvailable(data.tmdAvailable || false);
      } else {
        setStations([]);
        setStationTemps({});
        setStationYesterday({});
        setStationMaxYesterday({});
        setStationDaily({});
      }
      setLoading(false); 
    }, (error) => {
      console.error("Firebase Read Error:", error);
      setLoading(false);
    });

    // ===== 2. GISTDA Disaster Data (เดิม) =====
    const gistdaRef = ref(db, 'gistda_disaster');
    const unsubscribeGistda = onValue(gistdaRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setGistdaSummary(data);
      }
    });

    // ===== 3. Amphoe Data (ใหม่ — ข้อมูลระดับอำเภอจาก TMD) =====
    const amphoeRef = ref(db, 'weather_data_amphoe');
    const unsubscribeAmphoe = onValue(amphoeRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setAmphoeData(data);
      }
    });

    return () => {
      unsubscribe();
      unsubscribeGistda();
      unsubscribeAmphoe();
    };
  }, []);

  return (
    <WeatherContext.Provider value={{ 
      stations, stationTemps, stationYesterday, stationMaxYesterday, stationDaily, 
      gistdaSummary, amphoeData, tmdAvailable,
      loading, lastUpdated, 
      darkMode, setDarkMode 
    }}>
      {children}
    </WeatherContext.Provider>
  );
};