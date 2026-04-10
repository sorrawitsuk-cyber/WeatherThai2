import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, set } from 'firebase/database';
import { provinces77 } from '../src/provinces77.js';

export default async function handler(req, res) {
  try {
    console.log("Cron: เริ่มทำงาน ดึงข้อมูลเปรียบเทียบแบบ Same-Time & Daily Max...");

    const dbUrl = process.env.VITE_FIREBASE_DATABASE_URL;
    if (!dbUrl) return res.status(500).json({ success: false, error: "🚨 หา VITE_FIREBASE_DATABASE_URL ไม่เจอ!" });

    const firebaseConfig = {
      apiKey: process.env.VITE_FIREBASE_API_KEY,
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
      databaseURL: dbUrl,
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.VITE_FIREBASE_APP_ID
    };

    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    const db = getDatabase(app, dbUrl); 

    const chunkSize = 40; 
    let allWData = [];
    let allAData = [];
    const timestamp = Date.now();

    for (let i = 0; i < provinces77.length; i += chunkSize) {
      const chunk = provinces77.slice(i, i + chunkSize);
      const lats = chunk.map(p => p.lat).join(',');
      const lons = chunk.map(p => p.lon).join(',');

      const wUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,wind_direction_10m&hourly=apparent_temperature,precipitation_probability,wind_speed_10m,uv_index&daily=apparent_temperature_max,precipitation_probability_max,uv_index_max,wind_speed_10m_max&timezone=Asia%2FBangkok&past_days=1&forecast_days=2&_t=${timestamp}`;
      const aUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lats}&longitude=${lons}&current=pm2_5&hourly=pm2_5&timezone=Asia%2FBangkok&past_days=1&forecast_days=1&_t=${timestamp}`;

      const [wRes, aRes] = await Promise.all([fetch(wUrl), fetch(aUrl)]);

      if (wRes.ok && aRes.ok) {
        const wJson = await wRes.json();
        const aJson = await aRes.json();
        allWData = [...allWData, ...(Array.isArray(wJson) ? wJson : [wJson])];
        allAData = [...allAData, ...(Array.isArray(aJson) ? aJson : [aJson])];
      }
      if (i + chunkSize < provinces77.length) await new Promise(r => setTimeout(r, 200));
    }

    const newStations = [];
    const newTemps = {};
    const newYesterday = {};    // ข้อมูลเวลาเดียวกัน (Same-Hour)
    const newMaxYesterday = {}; // 🌟 ข้อมูลสูงสุดของเมื่อวาน (Daily Max)

    const bangkokTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Bangkok"}));
    const currentHour = bangkokTime.getHours(); 

    provinces77.forEach((p, idx) => {
      const w = allWData[idx] || {};
      const a = allAData[idx] || {};
      const sID = `PROV_${idx}`;

      newStations.push({
        stationID: sID, areaTH: p.n, lat: p.lat, long: p.lon,
        AQILast: { PM25: { value: Math.round(a.current?.pm2_5 || 0) } }
      });

      newTemps[sID] = {
        temp: Math.round(w.current?.temperature_2m || 0),
        feelsLike: Math.round(w.current?.apparent_temperature || 0),
        humidity: Math.round(w.current?.relative_humidity_2m || 0),
        rainProb: Math.round(w.daily?.precipitation_probability_max?.[1] || 0),
        windSpeed: Math.round(w.current?.wind_speed_10m || 0),
        windDir: Math.round(w.current?.wind_direction_10m || 0),
        uv: Math.round(w.daily?.uv_index_max?.[1] || 0)
      };

      // 1. เก็บของเวลาเดียวกัน
      const prevTemp = w.hourly?.apparent_temperature?.[currentHour];
      const prevPm25 = a.hourly?.pm2_5?.[currentHour];
      const prevUv = w.hourly?.uv_index?.[currentHour];
      const prevRain = w.hourly?.precipitation_probability?.[currentHour];
      const prevWind = w.hourly?.wind_speed_10m?.[currentHour];

      newYesterday[sID] = {
        temp: Math.round(prevTemp !== undefined ? prevTemp : (w.daily?.apparent_temperature_max?.[0] || 0)),
        pm25: Math.round(prevPm25 !== undefined ? prevPm25 : (a.current?.pm2_5 || 0)),
        uv: Math.round(prevUv !== undefined ? prevUv : (w.daily?.uv_index_max?.[0] || 0)),
        rain: Math.round(prevRain !== undefined ? prevRain : (w.daily?.precipitation_probability_max?.[0] || 0)),
        wind: Math.round(prevWind !== undefined ? prevWind : (w.daily?.wind_speed_10m_max?.[0] || 0))
      };

      // 2. 🌟 เก็บค่าสูงสุดของทั้งวัน
      let maxPm25 = 0;
      if (a.hourly?.pm2_5) {
          const yesterdayHourly = a.hourly.pm2_5.slice(0, 24).filter(v => v !== null);
          if(yesterdayHourly.length > 0) maxPm25 = Math.max(...yesterdayHourly);
      }

      newMaxYesterday[sID] = {
        temp: Math.round(w.daily?.apparent_temperature_max?.[0] || 0),
        pm25: Math.round(maxPm25 || a.current?.pm2_5 || 0),
        uv: Math.round(w.daily?.uv_index_max?.[0] || 0),
        rain: Math.round(w.daily?.precipitation_probability_max?.[0] || 0),
        wind: Math.round(w.daily?.wind_speed_10m_max?.[0] || 0)
      };
    });

    const payload = { 
        lastUpdated: bangkokTime.toISOString(), 
        stations: newStations, 
        stationTemps: newTemps,
        stationYesterday: newYesterday,
        stationMaxYesterday: newMaxYesterday // 🌟 โยนลง Firebase
    };
    
    await set(ref(db, 'weather_data'), payload);
    return res.status(200).json({ success: true, message: `Auto-Sync สำเร็จ! ดึงข้อมูลเทียบเวลา ${currentHour}:00 น. + ค่าสูงสุดของเมื่อวานเรียบร้อย` });
  } catch (error) {
    console.error("Cron Error Details:", error);
    return res.status(500).json({ success: false, error: error.toString() });
  }
}