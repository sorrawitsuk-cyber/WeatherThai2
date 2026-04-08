import React, { createContext, useState, useEffect } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { db } from '../firebase'; 
import { provinces77 } from '../provinces77'; 

export const WeatherContext = createContext();

export const WeatherProvider = ({ children }) => {
  const [stations, setStations] = useState([]);
  const [stationTemps, setStationTemps] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // 🌟 [เพิ่มใหม่] ระบบจัดการโหมดมืด (เริ่มต้นที่ Dark Mode และจำค่าไว้ในเครื่องผู้ใช้)
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme ? savedTheme === 'dark' : true; // ถ้าไม่มีค่าเดิม ให้เริ่มที่ true (โหมดมืด)
  });

  // บันทึกค่าโหมดมืดลงเครื่อง (Local Storage) ทุกครั้งที่มีการกดสลับโหมด
  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // --------------------------------------------------------
  // 1. หน้าที่ "ตัวอ่าน" (Reader): ดักฟังข้อมูลจาก Firebase
  // --------------------------------------------------------
  useEffect(() => {
    const weatherRef = ref(db, 'weather_data');

    const unsubscribe = onValue(weatherRef, (snapshot) => {
      const data = snapshot.val();
      
      if (data) {
        setStations(data.stations || []);
        setStationTemps(data.stationTemps || {});
        setLastUpdated(data.lastUpdated || null);
      } else {
        console.warn("Firebase ว่างเปล่า! กรุณากดปุ่ม Sync ข้อมูลใหม่ครับ");
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

  // --------------------------------------------------------
  // 2. หน้าที่ "ตัวเขียน" (Admin Sync): ดึง API -> เก็บลง Firebase
  // --------------------------------------------------------
  const syncDataToFirebase = async () => {
    try {
      setLoading(true); 
      console.log("🚀 กำลังเริ่มมหากาพย์การ Sync ข้อมูล 77 จังหวัด...");

      const chunkSize = 40; 
      let allWData = [];
      let allAData = [];

      for (let i = 0; i < provinces77.length; i += chunkSize) {
        const chunk = provinces77.slice(i, i + chunkSize);
        const lats = chunk.map(p => p.lat).join(',');
        const lons = chunk.map(p => p.lon).join(',');

        const wUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,wind_direction_10m&daily=precipitation_probability_max&timezone=Asia%2FBangkok`;
        const aUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lats}&longitude=${lons}&current=pm2_5&timezone=Asia%2FBangkok`;

        console.log(`📡 กำลังดึง Chunk ที่ ${i/chunkSize + 1}...`);
        const [wRes, aRes] = await Promise.all([fetch(wUrl), fetch(aUrl)]);

        if (wRes.ok && aRes.ok) {
          const wJson = await wRes.json();
          const aJson = await aRes.json();
          allWData = [...allWData, ...(Array.isArray(wJson) ? wJson : [wJson])];
          allAData = [...allAData, ...(Array.isArray(aJson) ? aJson : [aJson])];
        } else {
          if (wRes.status === 429) alert("โดน Open-Meteo บล็อกโควต้าชั่วคราว (Rate Limit) รอก่อน 1 ชม. นะครับ");
          throw new Error(`API Error: ${wRes.status}`);
        }
        
        if (i + chunkSize < provinces77.length) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      const newStations = [];
      const newTemps = {};

      provinces77.forEach((p, idx) => {
        const w = allWData[idx] || {};
        const a = allAData[idx] || {};
        const sID = `PROV_${idx}`;

        newStations.push({
          stationID: sID,
          areaTH: p.n,
          lat: p.lat,
          long: p.lon,
          AQILast: { PM25: { value: Math.round(a.current?.pm2_5 || 0) } }
        });

        newTemps[sID] = {
          temp: Math.round(w.current?.temperature_2m || 0),
          feelsLike: Math.round(w.current?.apparent_temperature || 0),
          humidity: Math.round(w.current?.relative_humidity_2m || 0),
          rainProb: Math.round(w.daily?.precipitation_probability_max?.[0] || 0),
          windSpeed: Math.round(w.current?.wind_speed_10m || 0),
          windDir: Math.round(w.current?.wind_direction_10m || 0) // ✅ เพิ่มบรรทัดนี้
        };
      });

      const payload = {
        lastUpdated: new Date().toISOString(),
        stations: newStations,
        stationTemps: newTemps
      };

      await set(ref(db, 'weather_data'), payload);
      console.log("✅ Sync สำเร็จ! ข้อมูล 77 จังหวัดปลอดภัยใน Firebase แล้วครับ");
      alert("Sync ข้อมูลสำเร็จ!");

    } catch (error) {
      console.error("❌ มหากาพย์การ Sync ล้มเหลว:", error);
      alert("Sync ไม่สำเร็จ: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <WeatherContext.Provider value={{ 
      stations, 
      stationTemps, 
      loading, 
      lastUpdated,
      syncDataToFirebase,
      darkMode,        // 🌟 ส่งค่าสถานะโหมดมืดออกไปให้หน้าอื่นใช้
      setDarkMode      // 🌟 ส่งฟังก์ชันสลับโหมดออกไปให้ปุ่มกดใช้งาน
    }}>
      {children}
    </WeatherContext.Provider>
  );
};