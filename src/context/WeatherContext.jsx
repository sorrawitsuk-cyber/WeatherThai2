// src/context/WeatherContext.jsx
import React, { createContext, useState, useEffect } from 'react';

// พิกัด 77 จังหวัดทั่วไทย
const provinces77 = [
  { n: 'กรุงเทพมหานคร', lat: 13.75, lon: 100.51 }, { n: 'สมุทรปราการ', lat: 13.60, lon: 100.60 }, { n: 'นนทบุรี', lat: 13.86, lon: 100.52 }, { n: 'ปทุมธานี', lat: 14.02, lon: 100.53 }, { n: 'พระนครศรีอยุธยา', lat: 14.35, lon: 100.57 }, { n: 'อ่างทอง', lat: 14.59, lon: 100.45 }, { n: 'ลพบุรี', lat: 14.80, lon: 100.61 }, { n: 'สิงห์บุรี', lat: 14.89, lon: 100.40 }, { n: 'ชัยนาท', lat: 15.18, lon: 100.12 }, { n: 'สระบุรี', lat: 14.53, lon: 100.91 },
  { n: 'ชลบุรี', lat: 13.36, lon: 100.98 }, { n: 'ระยอง', lat: 12.68, lon: 101.27 }, { n: 'จันทบุรี', lat: 12.61, lon: 102.10 }, { n: 'ตราด', lat: 12.24, lon: 102.51 }, { n: 'ฉะเชิงเทรา', lat: 13.69, lon: 101.07 }, { n: 'ปราจีนบุรี', lat: 14.05, lon: 101.37 }, { n: 'นครนายก', lat: 14.20, lon: 101.21 }, { n: 'สระแก้ว', lat: 13.82, lon: 102.06 },
  { n: 'นครราชสีมา', lat: 14.97, lon: 102.10 }, { n: 'บุรีรัมย์', lat: 14.99, lon: 103.10 }, { n: 'สุรินทร์', lat: 14.88, lon: 103.49 }, { n: 'ศรีสะเกษ', lat: 15.11, lon: 104.32 }, { n: 'อุบลราชธานี', lat: 15.24, lon: 104.84 }, { n: 'ยโสธร', lat: 15.79, lon: 104.14 }, { n: 'ชัยภูมิ', lat: 15.80, lon: 102.03 }, { n: 'อำนาจเจริญ', lat: 15.86, lon: 104.62 }, { n: 'บึงกาฬ', lat: 18.36, lon: 103.65 }, { n: 'หนองบัวลำภู', lat: 17.20, lon: 102.44 }, { n: 'ขอนแก่น', lat: 16.43, lon: 102.83 }, { n: 'อุดรธานี', lat: 17.41, lon: 102.78 }, { n: 'เลย', lat: 17.48, lon: 101.72 }, { n: 'หนองคาย', lat: 17.87, lon: 102.74 }, { n: 'มหาสารคาม', lat: 16.18, lon: 103.30 }, { n: 'ร้อยเอ็ด', lat: 16.05, lon: 103.65 }, { n: 'กาฬสินธุ์', lat: 16.43, lon: 103.50 }, { n: 'สกลนคร', lat: 17.16, lon: 104.14 }, { n: 'นครพนม', lat: 17.40, lon: 104.78 }, { n: 'มุกดาหาร', lat: 16.54, lon: 104.72 },
  { n: 'เชียงใหม่', lat: 18.78, lon: 98.98 }, { n: 'ลำพูน', lat: 18.57, lon: 99.01 }, { n: 'ลำปาง', lat: 18.28, lon: 99.49 }, { n: 'อุตรดิตถ์', lat: 17.62, lon: 100.09 }, { n: 'แพร่', lat: 18.14, lon: 100.14 }, { n: 'น่าน', lat: 18.78, lon: 100.77 }, { n: 'พะเยา', lat: 19.16, lon: 99.90 }, { n: 'เชียงราย', lat: 19.91, lon: 99.83 }, { n: 'แม่ฮ่องสอน', lat: 19.30, lon: 97.96 },
  { n: 'นครสวรรค์', lat: 15.70, lon: 100.13 }, { n: 'อุทัยธานี', lat: 15.38, lon: 100.02 }, { n: 'กำแพงเพชร', lat: 16.48, lon: 99.52 }, { n: 'ตาก', lat: 16.88, lon: 99.12 }, { n: 'สุโขทัย', lat: 17.00, lon: 99.82 }, { n: 'พิษณุโลก', lat: 16.82, lon: 100.26 }, { n: 'พิจิตร', lat: 16.44, lon: 100.34 }, { n: 'เพชรบูรณ์', lat: 16.41, lon: 101.15 },
  { n: 'ราชบุรี', lat: 13.52, lon: 99.81 }, { n: 'กาญจนบุรี', lat: 14.00, lon: 99.53 }, { n: 'สุพรรณบุรี', lat: 14.47, lon: 100.11 }, { n: 'นครปฐม', lat: 13.81, lon: 100.04 }, { n: 'สมุทรสาคร', lat: 13.54, lon: 100.27 }, { n: 'สมุทรสงคราม', lat: 13.41, lon: 99.99 }, { n: 'เพชรบุรี', lat: 13.11, lon: 99.94 }, { n: 'ประจวบคีรีขันธ์', lat: 11.81, lon: 99.79 },
  { n: 'นครศรีธรรมราช', lat: 8.43, lon: 99.96 }, { n: 'กระบี่', lat: 8.05, lon: 98.91 }, { n: 'พังงา', lat: 8.45, lon: 98.52 }, { n: 'ภูเก็ต', lat: 7.88, lon: 98.39 }, { n: 'สุราษฎร์ธานี', lat: 9.13, lon: 99.32 }, { n: 'ระนอง', lat: 9.96, lon: 98.63 }, { n: 'ชุมพร', lat: 10.49, lon: 99.18 }, { n: 'สงขลา', lat: 7.18, lon: 100.59 }, { n: 'สตูล', lat: 6.62, lon: 100.06 }, { n: 'ตรัง', lat: 7.55, lon: 99.61 }, { n: 'พัทลุง', lat: 7.61, lon: 100.07 }, { n: 'ปัตตานี', lat: 6.86, lon: 101.25 }, { n: 'ยะลา', lat: 6.54, lon: 101.28 }, { n: 'นราธิวาส', lat: 6.42, lon: 101.82 }
];

const initialStations = provinces77.map((p, idx) => ({
  stationID: `PROV_${idx}`, areaTH: p.n, lat: p.lat, long: p.lon, AQILast: { PM25: { value: 0 } }
}));

export const WeatherContext = createContext();

export const WeatherProvider = ({ children }) => {
  const [stations, setStations] = useState(initialStations);
  const [stationTemps, setStationTemps] = useState({});
  const [weatherData, setWeatherData] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [lastUpdateText, setLastUpdateText] = useState("");

  // 🌟 ฟังก์ชันดึงข้อมูล 77 จังหวัดแบบแบ่งกลุ่ม (Chunking) ป้องกัน API แบนและ CORS
  const fetchReal77Provinces = async () => {
    try {
      const chunkSize = 20; // แบ่งยิง API ทีละ 20 จังหวัด (ลดความยาว URL)
      let allWData = [];
      let allAData = [];

      for (let i = 0; i < provinces77.length; i += chunkSize) {
        const chunk = provinces77.slice(i, i + chunkSize);
        const lats = chunk.map(p => p.lat).join(',');
        const lons = chunk.map(p => p.lon).join(',');

        const wUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m&timezone=Asia%2FBangkok`;
        const aUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lats}&longitude=${lons}&current=pm2_5&timezone=Asia%2FBangkok`;

        const [wRes, aRes] = await Promise.all([fetch(wUrl), fetch(aUrl)]);
        
        if (!wRes.ok || !aRes.ok) throw new Error('API Request Failed');

        const wJson = await wRes.json();
        const aJson = await aRes.json();

        // Open-Meteo ส่งข้อมูลมาเป็น Array ถ้ามีหลายพิกัด หรือเป็น Object ถ้ามี 1 พิกัด (ดักจับให้เป็น Array เสมอ)
        const wChunkArray = Array.isArray(wJson) ? wJson : [wJson];
        const aChunkArray = Array.isArray(aJson) ? aJson : [aJson];

        allWData = [...allWData, ...wChunkArray];
        allAData = [...allAData, ...aChunkArray];

        // ⏱️ หน่วงเวลา 250ms ก่อนยิงกลุ่มถัดไป เพื่อหลบการโดนแบน (429 Too Many Requests)
        await new Promise(resolve => setTimeout(resolve, 250));
      }

      const realStations = [];
      const temps = {};

      provinces77.forEach((p, idx) => {
        const w = allWData[idx]?.current || {};
        const a = allAData[idx]?.current || {};
        const sID = `PROV_${idx}`;
        
        realStations.push({ 
            stationID: sID, 
            areaTH: p.n, 
            lat: p.lat, 
            long: p.lon, 
            AQILast: { PM25: { value: a.pm2_5 || 0 } } 
        });
        
        temps[sID] = { 
            temp: w.temperature_2m || 0, 
            feelsLike: w.apparent_temperature || 0, 
            humidity: w.relative_humidity_2m || 0, 
            rainProb: w.precipitation || 0, 
            windSpeed: w.wind_speed_10m || 0 
        };
      });

      setStations(realStations); 
      setStationTemps(temps);

    } catch (error) { 
      console.error("Batch Fetch Error:", error); 
    }
  };

  const fetchWeatherByCoords = async (lat, lon) => {
    setLoadingWeather(true);
    try {
      // 🌟 ดึงข้อมูลรายพื้นที่แบบครบถ้วน
      const wUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,uv_index,visibility,surface_pressure,dew_point_2m&hourly=temperature_2m,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,weathercode,apparent_temperature_max,precipitation_probability_max,sunrise,sunset&timezone=Asia%2FBangkok`;
      const aUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm2_5,us_aqi&hourly=pm2_5&timezone=Asia%2FBangkok`;

      const [wRes, aRes] = await Promise.all([fetch(wUrl), fetch(aUrl)]);
      const wData = await wRes.json();
      const aData = await aRes.json();

      const dailyPm25 = [];
      if (aData.hourly && aData.hourly.pm2_5) {
        for (let i = 0; i < 7; i++) {
          const dayData = aData.hourly.pm2_5.slice(i * 24, (i + 1) * 24).filter(v => v !== null);
          dailyPm25.push(dayData.length > 0 ? Math.round(Math.max(...dayData)) : Math.round(aData.current.pm2_5 || 0));
        }
      }

      setWeatherData({
        current: {
          temp: wData.current?.temperature_2m || 0, 
          feelsLike: wData.current?.apparent_temperature || 0,
          humidity: wData.current?.relative_humidity_2m || 0, 
          windSpeed: wData.current?.wind_speed_10m || 0,
          rain: wData.current?.precipitation || 0, 
          uv: wData.current?.uv_index || 0,
          rainProb: wData.daily?.precipitation_probability_max?.[0] || 0, 
          pm25: aData.current?.pm2_5 || 0, 
          aqi: aData.current?.us_aqi || 0,
          visibility: wData.current?.visibility || 0,
          pressure: wData.current?.surface_pressure || 0,
          dewPoint: wData.current?.dew_point_2m || 0,
          sunrise: wData.daily?.sunrise?.[0] || '',
          sunset: wData.daily?.sunset?.[0] || ''
        },
        hourly: {
          ...wData.hourly,
          pm25: aData.hourly?.pm2_5 || []
        }, 
        daily: { ...wData.daily, pm25_max: dailyPm25 },
        coords: { lat, lon }
      });

      const now = new Date();
      setLastUpdateText(`${now.toLocaleDateString('th-TH')} ${now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`);
    } catch (error) { 
        console.error("Open-Meteo Error:", error); 
    } finally { 
        setLoadingWeather(false); 
    }
  };

  useEffect(() => { 
      fetchReal77Provinces(); 
  }, []);

  return (
    <WeatherContext.Provider value={{ stations, stationTemps, weatherData, fetchWeatherByCoords, loadingWeather, darkMode, setDarkMode, lastUpdateText }}>
      {children}
    </WeatherContext.Provider>
  );
};