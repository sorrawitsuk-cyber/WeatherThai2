import React, { createContext, useState, useEffect } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { db } from '../firebase'; // กุญแจ Firebase ที่เราสร้างไว้
import { provinces77 } from '../provinces77'; // ไฟล์พิกัดจังหวัดที่บอสเพิ่งสร้าง

export const WeatherContext = createContext();

export const WeatherProvider = ({ children }) => {
  const [stations, setStations] = useState([]);
  const [stationTemps, setStationTemps] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // --------------------------------------------------------
  // 1. หน้าที่ "ตัวอ่าน" (Reader): ดักฟังข้อมูลจาก Firebase
  // --------------------------------------------------------
  useEffect(() => {
    const weatherRef = ref(db, 'weather_data');

    const unsubscribe = onValue(weatherRef, (snapshot) => {
      const data = snapshot.val();
      
      if (data) {
        // ✅ กรณีมีข้อมูล: อัปเดต State ตาม Firebase
        setStations(data.stations || []);
        setStationTemps(data.stationTemps || {});
        setLastUpdated(data.lastUpdated || null);
      } else {
        // ⚠️ กรณีโกดังว่างเปล่า: ตั้งค่าเริ่มต้นเพื่อ "กันจอค้าง/จอขาว"
        console.warn("Firebase ว่างเปล่า! กรุณากดปุ่ม Sync ข้อมูลใหม่ครับ");
        setStations([]);
        setStationTemps({});
      }
      
      // ปิด Loading ทันทีไม่ว่าจะมีข้อมูลหรือไม่ (เพื่อไม่ให้หน้าจอค้างที่รูปก้อนเมฆ)
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
      setLoading(true); // เปิด Loading ระหว่างสูบข้อมูล
      console.log("🚀 กำลังเริ่มมหากาพย์การ Sync ข้อมูล 77 จังหวัด...");

      const chunkSize = 40; // หั่นครึ่งเพื่อความชัวร์ (ไม่ติด Error 400)
      let allWData = [];
      let allAData = [];

      for (let i = 0; i < provinces77.length; i += chunkSize) {
        const chunk = provinces77.slice(i, i + chunkSize);
        const lats = chunk.map(p => p.lat).join(',');
        const lons = chunk.map(p => p.lon).join(',');

        // เตรียม URL (มัดรวมทุกตัวแปร: อุณหภูมิ, ฝน, ลม, ความชื้น)
        const wUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m&daily=precipitation_probability_max&timezone=Asia%2FBangkok`;
        const aUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lats}&longitude=${lons}&current=pm2_5&timezone=Asia%2FBangkok`;

        console.log(`📡 กำลังดึง Chunk ที่ ${i/chunkSize + 1}...`);
        const [wRes, aRes] = await Promise.all([fetch(wUrl), fetch(aUrl)]);

        if (wRes.ok && aRes.ok) {
          const wJson = await wRes.json();
          const aJson = await aRes.json();
          
          // ตรวจสอบว่าเป็น Array หรือไม่ (Open-Meteo จะคืนค่าเป็น Array ถ้าส่งหลายพิกัด)
          allWData = [...allWData, ...(Array.isArray(wJson) ? wJson : [wJson])];
          allAData = [...allAData, ...(Array.isArray(aJson) ? aJson : [aJson])];
        } else {
          // ถ้าโดนบล็อก 429 ให้หยุดทำงานทันที
          if (wRes.status === 429) alert("โดน Open-Meteo บล็อกโควต้าชั่วคราว (Rate Limit) รอก่อน 1 ชม. นะครับบอส");
          throw new Error(`API Error: ${wRes.status}`);
        }
        
        // พักเครื่อง 1 วินาที กันโดนแบน IP
        if (i + chunkSize < provinces77.length) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      // 3. จัดระเบียบข้อมูล (Data Transformation)
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
          windSpeed: Math.round(w.current?.wind_speed_10m || 0)
        };
      });

      // 4. บันทึกลงตู้คอนเทนเนอร์ Firebase
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
      syncDataToFirebase 
    }}>
      {children}
    </WeatherContext.Provider>
  );
};