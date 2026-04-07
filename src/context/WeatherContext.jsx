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

  // 🔑 API KEY ของคุณ
  const API_KEY = "5bd54936b5d3411f853170051262103"; 

  // 🛠️ เครื่องมือปรับลด % ฝนที่เวอร์เกินจริง (Smart Dampener)
  const adjustRainProb = (chance, precip_mm) => {
    if (!precip_mm || precip_mm === 0) return 0;
    if (precip_mm < 0.2) return Math.min(chance, 20); // ละอองฝน
    if (precip_mm < 1.0) return Math.min(chance, 40); // ฝนตกเบา
    return chance; // ฝนตกหนัก
  };

  // 🛠️ เครื่องมือคำนวณ AQI (US EPA) จากฝุ่น PM2.5
  const calculateAQI = (pm25) => {
    const pm = parseFloat(pm25) || 0;
    if (pm <= 12.0) return Math.round((50/12.0) * pm);
    if (pm <= 35.4) return Math.round(((100-51)/(35.4-12.1)) * (pm - 12.1) + 51);
    if (pm <= 55.4) return Math.round(((150-101)/(55.4-35.5)) * (pm - 35.5) + 101);
    if (pm <= 150.4) return Math.round(((200-151)/(150.4-55.5)) * (pm - 55.5) + 151);
    return Math.round(((300-201)/(250.4-150.5)) * (pm - 150.5) + 201);
  };

  // ดึง 77 จังหวัด
  const fetchReal77Provinces = async () => {
    try {
      const chunkSize = 10;
      const newStations = [...initialStations];
      const newTemps = {};

      for (let i = 0; i < provinces77.length; i += chunkSize) {
        const chunk = provinces77.slice(i, i + chunkSize);
        
        const promises = chunk.map(async (p, idx) => {
          const globalIdx = i + idx;
          const url = `https://api.weatherapi.com/v1/current.json?key=${API_KEY}&q=${p.lat},${p.lon}&aqi=yes`;
          
          try {
            const res = await fetch(url);
            if (!res.ok) return;
            const data = await res.json();
            
            const sID = `PROV_${globalIdx}`;
            const pm25Val = Math.round(data.current?.air_quality?.pm2_5 || 0);

            newStations[globalIdx] = { 
              ...newStations[globalIdx], 
              AQILast: { PM25: { value: pm25Val } } 
            };
            
            newTemps[sID] = { 
              temp: Math.round(data.current?.temp_c || 0), 
              feelsLike: Math.round(data.current?.feelslike_c || 0), 
              humidity: Math.round(data.current?.humidity || 0), 
              rainProb: 0, 
              windSpeed: Math.round(data.current?.wind_kph || 0) 
            };
          } catch (e) {
             // ข้ามไป ไม่ให้แอปพัง
          }
        });

        await Promise.allSettled(promises);
        await new Promise(r => setTimeout(r, 600)); // พักเครื่องกันโดนบล็อก
      }

      setStations([...newStations]); 
      setStationTemps(newTemps);
    } catch (error) { console.error("77 Provinces Fetch Error:", error); }
  };

  // ดึงข้อมูลตำแหน่งปัจจุบัน
  const fetchWeatherByCoords = async (inputLat, inputLon) => {
    setLoadingWeather(true);
    try {
      const lat = !isNaN(parseFloat(inputLat)) ? parseFloat(inputLat) : 13.7538;
      const lon = !isNaN(parseFloat(inputLon)) ? parseFloat(inputLon) : 100.5014;

      const url = `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${lat},${lon}&days=3&aqi=yes`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("API Limit หรือ Key ผิด");
      
      const data = await res.json();

      const pm25Current = data.current?.air_quality?.pm2_5 || 0;
      
      // จัดข้อมูลรายชั่วโมง (Hourly)
      const hTime = [], hTemp = [], hPm25 = [];
      data.forecast?.forecastday?.forEach(day => {
        day.hour?.forEach(h => {
          hTime.push(h.time);
          hTemp.push(h.temp_c);
          hPm25.push(pm25Current); // ใช้ค่าฝุ่นปัจจุบันใส่ให้ครบทุกชั่วโมง
        });
      });

      // จัดข้อมูลรายวัน (Daily)
      const dTime = [], dMax = [], dMin = [], dCode = [], dPm25 = [], dRainProb = [];
      data.forecast?.forecastday?.forEach(day => {
        dTime.push(day.date);
        dMax.push(day.day.maxtemp_c);
        dMin.push(day.day.mintemp_c);
        dCode.push(day.day.condition.code); 
        dPm25.push(pm25Current);
        dRainProb.push(adjustRainProb(day.day.daily_chance_of_rain, day.day.totalprecip_mm));
      });

      setWeatherData({
        current: {
          temp: Math.round(data.current?.temp_c || 0), 
          feelsLike: Math.round(data.current?.feelslike_c || 0),
          pm25: Math.round(pm25Current), 
          aqi: calculateAQI(pm25Current),
          humidity: Math.round(data.current?.humidity || 0), 
          windSpeed: Math.round(data.current?.wind_kph || 0),
          rain: Math.round(data.current?.precip_mm || 0), 
          uv: Math.round(data.current?.uv || 0),
          rainProb: adjustRainProb(data.forecast?.forecastday[0]?.day?.daily_chance_of_rain || 0, data.current?.precip_mm || 0),
          sunrise: data.forecast?.forecastday[0]?.astro?.sunrise || '', 
          sunset: data.forecast?.forecastday[0]?.astro?.sunset || ''
        },
        hourly: { time: hTime, temperature_2m: hTemp, pm25: hPm25 }, 
        daily: { 
          time: dTime, temperature_2m_max: dMax, temperature_2m_min: dMin, 
          weathercode: dCode, pm25_max: dPm25, precipitation_probability_max: dRainProb 
        }, 
        coords: { lat, lon }
      });
      
      const now = new Date();
      setLastUpdateText(`${now.toLocaleDateString('th-TH')} ${now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`);
    } catch (error) { 
      console.error("Fetch Error:", error); 
    } finally { 
      setLoadingWeather(false); 
    }
  };

  useEffect(() => { 
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude), 
        () => fetchWeatherByCoords(13.7538, 100.5014),
        { timeout: 5000 }
      );
    } else {
      fetchWeatherByCoords(13.7538, 100.5014);
    }

    // แอบโหลด 77 จังหวัด
    setTimeout(() => fetchReal77Provinces(), 2000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <WeatherContext.Provider value={{ stations, stationTemps, weatherData, fetchWeatherByCoords, loadingWeather, darkMode, setDarkMode, lastUpdateText }}>
      {children}
    </WeatherContext.Provider>
  );
};