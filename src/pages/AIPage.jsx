import React, { useContext, useState, useEffect, useMemo } from 'react';
import { WeatherContext } from '../context/WeatherContext';

export default function AIPage() {
  const { stations, darkMode } = useContext(WeatherContext);
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [locationName, setLocationName] = useState('กำลังระบุตำแหน่ง...');
  const [selectedProv, setSelectedProv] = useState('');
  const [targetDateIdx, setTargetDateIdx] = useState(0); 
  const [activeTab, setActiveTab] = useState('summary'); 
  
  const [weatherData, setWeatherData] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(true);

  const fetchWeatherByCoords = async (lat, lon) => {
    try {
      setLoadingWeather(true);
      const wUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,surface_pressure,wind_speed_10m,visibility&hourly=temperature_2m,precipitation_probability,pm2_5,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_probability_max,wind_speed_10m_max&timezone=Asia%2FBangkok`;
      const aUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm2_5&hourly=pm2_5&timezone=Asia%2FBangkok`;

      const [wRes, aRes] = await Promise.all([fetch(wUrl), fetch(aUrl)]);
      const wData = await wRes.json();
      const aData = await aRes.json();

      if (wRes.ok && aRes.ok) {
        setWeatherData({
          current: {
            temp: wData.current.temperature_2m,
            feelsLike: wData.current.apparent_temperature,
            humidity: wData.current.relative_humidity_2m,
            windSpeed: wData.current.wind_speed_10m,
            pressure: wData.current.surface_pressure,
            visibility: wData.current.visibility,
            uv: wData.daily.uv_index_max[0],
            pm25: aData.current.pm2_5,
            sunrise: wData.daily.sunrise[0],
            sunset: wData.daily.sunset[0],
            rainProb: wData.hourly.precipitation_probability[new Date().getHours()],
          },
          hourly: {
            time: wData.hourly.time,
            temperature_2m: wData.hourly.temperature_2m,
            precipitation_probability: wData.hourly.precipitation_probability,
            pm25: aData.hourly.pm2_5,
            wind_speed_10m: wData.hourly.wind_speed_10m
          },
          daily: {
            time: wData.daily.time,
            weathercode: wData.daily.weather_code,
            temperature_2m_max: wData.daily.temperature_2m_max,
            temperature_2m_min: wData.daily.temperature_2m_min,
            apparent_temperature_max: wData.daily.apparent_temperature_max,
            pm25_max: wData.daily.time.map(dateStr => {
              let maxPm = null;
              if (aData.hourly && aData.hourly.time) {
                aData.hourly.time.forEach((t, i) => {
                  if (t.startsWith(dateStr) && aData.hourly.pm2_5[i] != null) {
                    if (maxPm === null || aData.hourly.pm2_5[i] > maxPm) {
                      maxPm = aData.hourly.pm2_5[i];
                    }
                  }
                });
              }
              return maxPm !== null ? Math.round(maxPm) : Math.round(aData.current?.pm2_5 || 0);
            }), // แก้ไขให้ดึงข้อมูลจริงจากรายชั่วโมงแล้ว
            precipitation_probability_max: wData.daily.precipitation_probability_max,
            uv_index_max: wData.daily.uv_index_max,
            wind_speed_10m_max: wData.daily.wind_speed_10m_max
          },
          coords: { lat, lon }
        });
      }
    } catch (err) {
      console.error("Fetch local weather failed", err);
    } finally {
      setLoadingWeather(false);
    }
  };

  const fetchLocationName = async (lat, lon) => {
    try {
      const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=th`);
      const data = await res.json();
      setLocationName(data?.locality || data?.city || 'ตำแหน่งปัจจุบัน');
    } catch { setLocationName('ตำแหน่งปัจจุบัน'); }
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);

    if (!weatherData && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
        fetchLocationName(pos.coords.latitude, pos.coords.longitude);
      }, () => {
        if (!weatherData) fetchWeatherByCoords(13.75, 100.5); 
        setLocationName('กรุงเทพมหานคร');
      }, { timeout: 5000 });
    } else if (!weatherData) {
        fetchWeatherByCoords(13.75, 100.5); 
        setLocationName('กรุงเทพมหานคร');
    }
    return () => window.removeEventListener('resize', handleResize);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanMd = (text) => text ? text.replace(/\*\*/g, '') : '';
  const renderHighlightedText = (text, defaultColor) => {
    if (!text) return null;
    return text.split('**').map((part, i) => {
      if (i % 2 !== 0) {
        let isDanger = /(งด|ไม่แนะนำ|อันตราย|ระวัง|หลีกเลี่ยง|รุนแรง|กระโชก|ฮีทสโตรก|เกิน|ไม่ควร|ชะลอ|เสี่ยง|ผันผวน)/i.test(part);
        let isGood = /(ดีเยี่ยม|เหมาะสม|สามารถ|ปลอดภัย|ที่สุด|สบาย|ราบรื่น|เป็นมิตร)/i.test(part);
        let color = isDanger ? '#ef4444' : (isGood ? '#10b981' : defaultColor);
        return <strong key={i} style={{ color: color, fontWeight: '800' }}>{part}</strong>;
      }
      return part;
    });
  };

  // 🧠 AI Engine: ประมวลผลลึกซึ้งด้วย UV และ ความเร็วลม
  const aiReport = useMemo(() => {
    if (!weatherData || !weatherData.daily) return null;

    const d = weatherData.daily;
    const tMax = Math.round(d.temperature_2m_max?.[targetDateIdx] ?? 0);
    const tMin = Math.round(d.temperature_2m_min?.[targetDateIdx] ?? 0);
    const rain = d.precipitation_probability_max?.[targetDateIdx] ?? 0;
    const uvMax = d.uv_index_max?.[targetDateIdx] ?? 0;
    const windMax = Math.round(d.wind_speed_10m_max?.[targetDateIdx] ?? 0); // km/h
    const pm25 = d.pm25_max?.[targetDateIdx] !== undefined ? Math.round(d.pm25_max[targetDateIdx]) : Math.round(weatherData.current?.pm25 ?? 0);

    const getQuickAnswers = () => {
      let rainAns = { icon: '☀️', title: 'ฝนตกไหม?', text: 'ปลอดฝน ท้องฟ้าโปร่ง', color: '#22c55e' };
      if (rain > 60) rainAns = { icon: '☔', title: 'ฝนตกไหม?', text: `มีความเสี่ยงสูง โอกาส ${rain}%`, color: '#ef4444' };
      else if (rain > 20) rainAns = { icon: '⛅', title: 'ฝนตกไหม?', text: `อาจมีฝนประปราย ${rain}%`, color: '#f97316' };

      let heatAns = { icon: '😊', title: 'ร้อนไหม?', text: `เกณฑ์ปกติ ${tMax}°C`, color: '#22c55e' };
      if (tMax >= 39) heatAns = { icon: '🥵', title: 'ร้อนไหม?', text: `อุณหภูมิวิกฤต ${tMax}°C`, color: '#ef4444' };
      else if (tMax >= 35) heatAns = { icon: '🔥', title: 'ร้อนไหม?', text: `สภาพอากาศร้อนจัด ${tMax}°C`, color: '#f97316' };

      let dustAns = { icon: '🍃', title: 'ฝุ่นเยอะไหม?', text: `คุณภาพอากาศดี ${pm25} µg`, color: '#22c55e' };
      if (pm25 > 50) dustAns = { icon: '😷', title: 'ฝุ่นเยอะไหม?', text: `มลพิษระดับอันตราย ${pm25} µg`, color: '#ef4444' };
      else if (pm25 > 25) dustAns = { icon: '🤧', title: 'ฝุ่นเยอะไหม?', text: `คุณภาพอากาศปานกลาง ${pm25} µg`, color: '#f97316' };

      return [rainAns, heatAns, dustAns];
    };

    const calculateScore = () => {
      let baseScore = 10;
      switch (activeTab) {
        case 'laundry': 
          if (rain > 30) baseScore -= 5;
          if (rain > 60) baseScore -= 3;
          // ลมดีช่วยให้ผ้าแห้งไวขึ้น แม้แดดจะน้อย
          if (windMax >= 10 && windMax <= 25 && rain < 20) baseScore += 1; 
          // ลมแรงพายุ ผ้าปลิว
          if (windMax > 35) baseScore -= 3;
          break;
        case 'exercise': 
          if (pm25 > 37.5) baseScore -= 5;
          if (tMax > 36) baseScore -= 3;
          if (rain > 50) baseScore -= 2;
          if (uvMax > 8) baseScore -= 1; // UV สูงไป วิ่งกลางแจ้งไม่ดี
          break;
        case 'outdoor': 
          if (rain > 40) baseScore -= 4;
          if (tMax > 37) baseScore -= 3;
          if (uvMax > 8) baseScore -= 2;
          if (windMax > 30) baseScore -= 2; // ลมพัดเต็นท์ปลิว
          break;
        case 'travel': 
          if (rain > 50) baseScore -= 4;
          if (tMax > 38) baseScore -= 3;
          if (uvMax > 10) baseScore -= 2;
          break;
        case 'farming': 
          if (rain > 70) baseScore -= 4;
          if (tMax > 38) baseScore -= 3;
          if (windMax > 15) baseScore -= 3; // ลมแรงฉีดยาไม่ได้
          break;
        case 'pets': 
          if (tMax > 35) baseScore -= 4;
          if (rain > 40) baseScore -= 3;
          if (uvMax > 8) baseScore -= 1; // หมาแมวก็ผิวไหม้ได้
          break;
        case 'carwash': 
          if (rain > 20) baseScore -= 5;
          if (rain > 50) baseScore -= 4;
          break;
        default: 
          if (rain > 50) baseScore -= 2;
          if (tMax > 37) baseScore -= 2;
          if (pm25 > 50) baseScore -= 2;
      }
      return Math.max(1, Math.min(10, baseScore)); 
    };
    const finalScore = calculateScore();

    const getMainAdvice = () => {
      if (activeTab === 'laundry') {
          if (rain > 40) return `ประเมินความเสี่ยง: โอกาสฝนตก **${rain}%** **ไม่แนะนำให้ตากผ้าภายนอกอาคาร** ควรใช้เครื่องอบผ้าหรือตากในพื้นที่ร่มที่มีอากาศถ่ายเท`;
          if (windMax > 35) return `ประเมินความเสี่ยง: สภาพอากาศมี**กระแสลมกระโชกแรง (${windMax} กม./ชม.)** เสี่ยงต่อการที่สิ่งของตากไว้จะปลิวหลุดลอย **ควรยึดด้วยไม้หนีบให้แน่นหนา**`;
          if (tMax > 33 && windMax >= 10) return `ประเมินความเสี่ยง: **สภาพอากาศเหมาะสมอย่างยิ่ง** การผสานกันของแสงแดดจัดและกระแสลม (**${windMax} กม./ชม.**) จะช่วยให้ผ้าแห้งไวและลดความอับชื้นได้อย่างมีประสิทธิภาพ`;
          return `ประเมินความเสี่ยง: **สามารถตากผ้าได้ตามปกติ** แต่อาจใช้เวลาแห้งนานกว่าช่วงที่แดดจัด แนะนำให้ติดตามทิศทางเมฆฝนอย่างใกล้ชิด`;
      }
      if (activeTab === 'exercise') {
          if (pm25 > 37.5) return `ประเมินความเสี่ยง: คุณภาพอากาศ**ไม่อยู่ในเกณฑ์มาตรฐาน** (PM2.5: **${pm25} µg/m³**) **ควรงดการวิ่งหรือออกกำลังกายหนักภายนอกอาคาร** เปลี่ยนเป็นการคาร์ดิโอในร่มแทน`;
          if (tMax > 36 || uvMax > 8) return `ประเมินความเสี่ยง: ดัชนีรังสี UV (**${uvMax}**) และอุณหภูมิอยู่ใน**ระดับอันตราย** **ระวังภาวะฮีทสโตรกและผิวหนังไหม้แดด** **ควรเลี่ยงการออกกำลังกายในช่วงบ่ายเด็ดขาด**`;
          return `ประเมินความเสี่ยง: **สภาพแวดล้อมเหมาะสม**สำหรับการออกกำลังกายกลางแจ้ง สามารถดำเนินกิจกรรมตามตารางฝึกซ้อมได้ตามปกติ`;
      }
      if (activeTab === 'outdoor') {
          if (rain > 40) return `ประเมินความเสี่ยง: **มีโอกาสเกิดฝนฟ้าคะนอง** หากตั้งแคมป์ควรเตรียมเต็นท์กันน้ำและ**ประเมินจุดเสี่ยงน้ำหลาก**`;
          if (windMax > 30) return `ประเมินความเสี่ยง: **กระแสลมแรงถึง ${windMax} กม./ชม.** โปรดใช้ความระมัดระวังในการตอกสมอบกและ**หลีกเลี่ยงการกางเต็นท์ใต้ต้นไม้ใหญ่**`;
          if (uvMax > 8) return `ประเมินความเสี่ยง: ดัชนีรังสี UV **สูงมาก** ควรจัดเตรียมพื้นที่ร่มเงา (Tarp) และ**กำชับให้ผู้ร่วมกิจกรรมทาครีมกันแดด (SPF 50+)**`;
          return `ประเมินความเสี่ยง: **สภาพอากาศเป็นใจอย่างยิ่ง**สำหรับการทำกิจกรรมกลางแจ้ง ปัจจัยทางอุตุนิยมวิทยาเอื้ออำนวยอย่างเต็มที่`;
      }
      if (activeTab === 'farming') {
          if (rain > 60) return `ประเมินความเสี่ยง: **ไม่แนะนำให้ฉีดพ่นสารเคมี** เนื่องจากฝนอาจชะล้างตัวยา และควรเฝ้าระวังระบบระบายน้ำในแปลง`;
          if (windMax > 15) return `ประเมินความเสี่ยง: **กระแสลมแรง (${windMax} กม./ชม.)** **ควรงดการฉีดพ่นสารเคมีหรือปุ๋ยทางใบ** เพื่อป้องกันละอองปลิวไปนอกพื้นที่เป้าหมายหรือเป็นอันตรายต่อผู้ปฏิบัติงาน`;
          if (tMax > 37) return `ประเมินความเสี่ยง: **สภาพอากาศร้อนจัด** ควรรดน้ำพืชในช่วงเช้าตรู่หรือเย็น และ**ระวังพืชเกิดภาวะช็อกความร้อน**`;
          return `ประเมินความเสี่ยง: **สภาวะแวดล้อมเหมาะสม** สามารถปฏิบัติงานในแปลงเพาะปลูก ฉีดพ่นยา หรือให้ปุ๋ยได้ตามรอบการจัดการปกติ`;
      }
      if (activeTab === 'travel') {
          if (rain > 50) return `ประเมินความเสี่ยง: สภาพอากาศมีแนวโน้มแปรปรวน **แนะนำให้จัดแพลนท่องเที่ยวในอาคาร (Indoor) เป็นหลัก**`;
          if (uvMax > 10) return `ประเมินความเสี่ยง: ดัชนี UV อยู่ในเกณฑ์**รุนแรงมาก (Extreme)** **ควรหลีกเลี่ยงการอยู่กลางแจ้งเป็นเวลานาน** สวมแว่นกันแดดและหมวกปีกกว้าง`;
          return `ประเมินความเสี่ยง: **เหมาะสมต่อการเดินทางท่องเที่ยว** ทัศนวิสัยชัดเจน สามารถดำเนินกิจกรรมตามแพลนที่วางไว้ได้อย่างราบรื่น`;
      }
      if (activeTab === 'pets') {
          if (tMax > 34 || uvMax > 8) return `ประเมินความเสี่ยง: สภาพอากาศร้อนจัดและ UV สูง **เสี่ยงต่อภาวะฮีทสโตรกและผิวหนังไหม้** (โดยเฉพาะสัตว์เลี้ยงขนสั้น/สีขาว) **ควรงดพาเดินเล่นบนพื้นปูนในช่วงกลางวัน**`;
          if (rain > 40) return `ประเมินความเสี่ยง: โอกาสฝนตก **${rain}%** แนะนำให้**อยู่ภายในอาคาร** และระวังความชื้นที่อาจก่อให้เกิดโรคเชื้อรา`;
          return `ประเมินความเสี่ยง: **สภาพอากาศเป็นมิตร**ต่อสัตว์เลี้ยง อุณหภูมิอยู่ใน**เกณฑ์ปลอดภัย** สามารถพาออกไปทำกิจกรรมนอกอาคารได้`;
      }
      if (activeTab === 'carwash') {
          if (rain > 20) return `ประเมินความเสี่ยง: ความน่าจะเป็นของการเกิดฝนสูงถึง **${rain}%** **แนะนำให้เลื่อนการล้างรถออกไปก่อน** เพื่อหลีกเลี่ยงคราบน้ำฝนและดินโคลนกระเด็นซ้ำ`;
          if (uvMax > 8 || tMax > 35) return `ประเมินความเสี่ยง: แสงแดดและรังสี UV **รุนแรงมาก** **ไม่ควรล้างรถกลางแจ้ง** เนื่องจากหยดน้ำจะทำหน้าที่เป็นแว่นขยายทำลายชั้นแลคเกอร์ และแชมพูจะแห้งไวจนเกิดคราบฝังแน่น`;
          return `ประเมินความเสี่ยง: ท้องฟ้าโปร่ง โอกาสฝนตกต่ำ เป็นสภาวะแวดล้อมที่**เหมาะสมที่สุด**สำหรับการล้างรถ ขัดสี และเคลือบเงา`;
      }
      
      if (finalScore >= 8) return `สรุปการประเมิน: **สภาพอากาศโดยรวมอยู่ในเกณฑ์ดีเยี่ยม** ปัจจัยทางอุตุนิยมวิทยาเอื้ออำนวยต่อการดำเนินชีวิตประจำวันตามปกติ`;
      return `สรุปการประเมิน: สภาพอากาศมี**ความผันผวนของปัจจัยบางประการ** ควรประเมินสถานการณ์หน้างานและเตรียมความพร้อมสำหรับความเปลี่ยนแปลง`;
    };

    const getTimeline = () => {
      const isRainy = rain > 40;
      const isHot = tMax > 35;
      
      const lines = {
        summary: [
          { time: 'ช่วงเช้า (06:00 - 12:00)', icon: '🌅', text: `อุณหภูมิเริ่มต้นที่ **${tMin}°C** สภาพอากาศ**เหมาะสมสำหรับการเริ่มต้นวัน**` },
          { time: 'ช่วงบ่าย (12:00 - 18:00)', icon: '☀️', text: isHot ? `อุณหภูมิสูงสุดแตะระดับ **${tMax}°C** **ควรหลีกเลี่ยงแสงแดดจัด**` : `อุณหภูมิสูงสุด **${tMax}°C** สภาพอากาศโดยรวมทรงตัว` },
          { time: 'ช่วงค่ำ (18:00 เป็นต้นไป)', icon: '🌙', text: isRainy ? `**มีความเสี่ยงฝนฟ้าคะนอง** ควรเตรียมอุปกรณ์กันฝน` : `อุณหภูมิลดลง สภาพอากาศโปร่งสบาย เหมาะแก่การพักผ่อน` }
        ],
        laundry: [
          { time: 'ช่วงเช้า (06:00 - 12:00)', icon: '🌅', text: isRainy ? `สังเกตทิศทางลมและเมฆฝน หากความชื้นสูง**ควรชะลอการซักผ้า**` : `ปริมาณรังสี UV และแสงแดดเหมาะสม **สามารถเริ่มการซักและตากผ้าได้**` },
          { time: 'ช่วงบ่าย (12:00 - 18:00)', icon: '☀️', text: isHot || windMax >= 10 ? `อุณหภูมิและความเร็วลมระดับนี้ **ช่วยลดระยะเวลาตากผ้าและยับยั้งเชื้อแบคทีเรียได้ดีเยี่ยม**` : `ปริมาณแสงแดดเพียงพอต่อการทำให้ผ้าแห้งตามมาตรฐาน` },
          { time: 'ช่วงค่ำ (18:00 เป็นต้นไป)', icon: '🌙', text: `ความชื้นสัมพัทธ์ในอากาศเพิ่มขึ้น ควรรีบจัดเก็บเสื้อผ้าที่ตากไว้เพื่อ**ป้องกันกลิ่นอับ**` }
        ],
        exercise: [
          { time: 'ช่วงเช้า (06:00 - 12:00)', icon: '🌅', text: pm25 > 37.5 ? `ค่ามลพิษทางอากาศ**เกินเกณฑ์มาตรฐาน** **ควรงดกิจกรรมที่ต้องสูดหายใจลึก**ภายนอกอาคาร` : `คุณภาพอากาศและอุณหภูมิอยู่ในระดับที่**เหมาะสมที่สุด**สำหรับการคาร์ดิโอ` },
          { time: 'ช่วงบ่าย (12:00 - 18:00)', icon: '☀️', text: uvMax > 8 ? `รังสี UV ระดับอันตราย **เสี่ยงต่อผิวหนังไหม้** ควรปรับเปลี่ยนเป็นการฝึกซ้อมในฟิตเนส` : `สามารถดำเนินกิจกรรมทางกายได้ แต่**ควรเฝ้าระวังอัตราการเต้นของหัวใจ**และจิบน้ำอย่างสม่ำเสมอ` },
          { time: 'ช่วงค่ำ (18:00 เป็นต้นไป)', icon: '🌙', text: `อุณหภูมิผ่อนคลายลง **เหมาะสมสำหรับการเดินเร็ว วิ่งจ็อกกิ้ง** หรือกิจกรรมยืดเหยียดกล้ามเนื้อ` }
        ],
        outdoor: [
          { time: 'ช่วงเช้า (06:00 - 12:00)', icon: '🌅', text: `สภาพแสงและอุณหภูมิ**เหมาะสมอย่างยิ่ง**ในการจัดเตรียมสถานที่หรือเคลื่อนย้ายอุปกรณ์` },
          { time: 'ช่วงบ่าย (12:00 - 18:00)', icon: '☀️', text: uvMax > 8 ? `รังสี UV สูงจัด **ควรทาครีมกันแดดซ้ำทุก 2 ชั่วโมง** และจัดกิจกรรมภายใต้ร่มเงา` : `สภาพอากาศเปิดโล่ง สามารถดำเนินกิจกรรมนันทนาการได้อย่างราบรื่น` },
          { time: 'ช่วงค่ำ (18:00 เป็นต้นไป)', icon: '🌙', text: isRainy || windMax > 20 ? `**เฝ้าระวังกระแสลมและพายุ** ตรวจสอบการตอกสมอบกให้แน่นหนา` : `บรรยากาศและอุณหภูมิลดลง **เหมาะสมสำหรับการก่อกองไฟและทำกิจกรรมส่วนรวม**` }
        ],
        farming: [
          { time: 'ช่วงเช้า (06:00 - 12:00)', icon: '🌅', text: windMax > 15 ? `กระแสลมแปรปรวน **ควรงดการฉีดพ่นปุ๋ยทางใบชั่วคราว**` : `ช่วงเวลาที่ปากใบพืชเปิดรับสารอาหารได้เต็มที่ **เหมาะสมสูงสุดสำหรับการฉีดพ่นบำรุง**` },
          { time: 'ช่วงบ่าย (12:00 - 18:00)', icon: '☀️', text: isHot ? `อุณหภูมิดินสูง **ควรงดการให้น้ำพืช**เพื่อป้องกันภาวะช็อกความร้อนและการลวกของระบบราก` : `สามารถดำเนินการบำรุงรักษาแปลงเพาะปลูกและกำจัดวัชพืชได้ตามแผนการจัดการ` },
          { time: 'ช่วงค่ำ (18:00 เป็นต้นไป)', icon: '🌙', text: isRainy ? `ติดตามปริมาณฝนสะสมเพื่อประเมินและ**บริหารจัดการระบบระบายน้ำ**ในแปลงเพาะปลูกสำหรับวันพรุ่งนี้` : `สามารถให้น้ำเสริมแก่พืชได้ เพื่อชดเชยการสูญเสียความชื้นจากกระบวนการคายน้ำระหว่างวัน` }
        ],
        travel: [
          { time: 'ช่วงเช้า (06:00 - 12:00)', icon: '🌅', text: `ทัศนวิสัยดีเยี่ยม **เหมาะสมต่อการเดินทางไกล**และเยี่ยมชมแหล่งท่องเที่ยวทางธรรมชาติ` },
          { time: 'ช่วงบ่าย (12:00 - 18:00)', icon: '☀️', text: isHot || uvMax > 8 ? `แดดและ UV แรงจัด **แนะนำให้ปรับกำหนดการเป็นสถานที่ปรับอากาศ**` : `การสัญจรราบรื่น สภาพอุตุนิยมวิทยาไม่เป็นอุปสรรคต่อการเดินทาง` },
          { time: 'ช่วงค่ำ (18:00 เป็นต้นไป)', icon: '🌙', text: `**เหมาะสมสำหรับการจัดตารางกิจกรรมช่วงกลางคืน** เช่น ตลาดนัดคนเดิน หรือการรับประทานอาหารภายนอก` }
        ],
        pets: [
          { time: 'ช่วงเช้า (06:00 - 12:00)', icon: '🌅', text: pm25 > 37.5 ? `มลพิษทางอากาศค่อนข้างสูง หากพาเดินเล่น**ควรจำกัดระยะเวลา**เพื่อลดผลกระทบต่อระบบหายใจของสัตว์เลี้ยง` : `อุณหภูมิผิวถนนเย็นและอากาศถ่ายเทดี เป็นช่วงเวลา**ปลอดภัยที่สุด**ในการพาสัตว์เลี้ยงออกกำลังกาย` },
          { time: 'ช่วงบ่าย (12:00 - 18:00)', icon: '☀️', text: isHot || uvMax > 8 ? `พื้นยางมะตอยร้อนจัดและ UV รุนแรง **เสี่ยงต่อแผลไหม้ที่อุ้งเท้าและฮีทสโตรก** **ควรจัดให้อยู่ในที่ร่ม**` : `สามารถทำกิจกรรมระยะสั้นได้ แต่**ควรจัดเตรียมน้ำสะอาดให้สัตว์เลี้ยงเข้าถึงได้ตลอดเวลา**` },
          { time: 'ช่วงค่ำ (18:00 เป็นต้นไป)', icon: '🌙', text: isRainy ? `**ระวังพาหะนำโรค** เช่น เห็บ หมัด และสัตว์มีพิษที่มากับความชื้นหลังฝนตก` : `อุณหภูมิแวดล้อมผ่อนคลายลง **เหมาะสมต่อการพาสัตว์เลี้ยงไปเดินเล่นคลายเครียด**ก่อนพักผ่อน` }
        ],
        carwash: [
          { time: 'ช่วงเช้า (06:00 - 12:00)', icon: '🌅', text: isRainy ? `สภาพอากาศมีเมฆฝนปกคลุม **ยังไม่แนะนำให้ดำเนินการล้างรถ**ในเวลานี้` : `ช่วงเวลา**เหมาะสมที่สุด** อุณหภูมิผิวยังไม่สูงเกินไป ทำให้เช็ดแห้งได้ทันและลดความเสี่ยงการเกิดคราบน้ำ (Water spot)` },
          { time: 'ช่วงบ่าย (12:00 - 18:00)', icon: '☀️', text: uvMax > 8 || tMax > 35 ? `รังสี UV และความร้อนสูงเกินไป จะทำให้สารทำความสะอาดแห้งไวและทำลายชั้นเคลือบสี **ควรล้างรถในที่ร่มเท่านั้น**` : `สามารถล้างทำความสะอาด ขัดสี และลงแว็กซ์เคลือบเงาได้ตามกระบวนการปกติ` },
          { time: 'ช่วงค่ำ (18:00 เป็นต้นไป)', icon: '🌙', text: isRainy ? `มีความเสี่ยงที่จะเกิดหยาดน้ำฟ้า หากต้องใช้รถ**ควรขับด้วยความระมัดระวัง**เพื่อหลีกเลี่ยงโคลนกระเด็นจากพื้นถนน` : `สามารถจอดพักรถทิ้งไว้ภายนอกอาคารได้อย่างไร้กังวล ไม่มีปัจจัยสภาพอากาศที่ทำให้รถหมองคล้ำ` }
        ]
      };
      
      return lines[activeTab] || lines.summary; 
    };

    return { 
      score: finalScore, 
      quickAnswers: getQuickAnswers(),
      advice: getMainAdvice(), 
      timeline: getTimeline() 
    };
  }, [activeTab, targetDateIdx, weatherData]);

  const tabConfigs = [
    { id: 'summary', icon: '📋', label: 'ภาพรวม', color: '#8b5cf6' },
    { id: 'exercise', icon: '🏃‍♂️', label: 'ออกกำลังกาย', color: '#22c55e' },
    { id: 'outdoor', icon: '🏕️', label: 'กิจกรรมกลางแจ้ง', color: '#f59e0b' },
    { id: 'travel', icon: '🎒', label: 'ท่องเที่ยว', color: '#ec4899' },
    { id: 'laundry', icon: '🧺', label: 'ตากผ้า', color: '#0ea5e9' },
    { id: 'farming', icon: '🌾', label: 'การเกษตร', color: '#10b981' },
    { id: 'pets', icon: '🐶', label: 'สัตว์เลี้ยง', color: '#f43f5e' },
    { id: 'carwash', icon: '🚗', label: 'ดูแลรถยนต์', color: '#3b82f6' }
  ];

  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToCSV = () => {
    if (!aiReport) return;
    const tabName = tabConfigs.find(t => t.id === activeTab)?.label || 'Report';
    const dateStr = new Date(weatherData?.daily?.time?.[targetDateIdx] || Date.now()).toLocaleDateString('th-TH');
    let csv = `\uFEFFหัวข้อ,รายละเอียด\n`;
    csv += `รายงานการประเมินสภาพอากาศ,${tabName}\n`;
    csv += `สถานที่,${locationName}\n`;
    csv += `วันที่,${dateStr}\n`;
    csv += `คะแนนความเหมาะสม,${aiReport.score}/10\n\n`;
    csv += `คำแนะนำหลัก,"${cleanMd(aiReport.advice).replace(/"/g, '""')}"\n\n`;
    csv += `ช่วงเวลา,รายการ\n`;
    if (aiReport.timeline) {
      aiReport.timeline.forEach(t => {
        csv += `"${t.time}","${cleanMd(t.text).replace(/"/g, '""')}"\n`;
      });
    }
    downloadFile(csv, `weather_report_${tabName}.csv`, 'text/csv;charset=utf-8;');
  };

  const exportToJSON = () => {
    if (!aiReport) return;
    const tabName = tabConfigs.find(t => t.id === activeTab)?.label || 'Report';
    const data = {
      location: locationName,
      date: new Date(weatherData?.daily?.time?.[targetDateIdx] || Date.now()).toLocaleDateString('th-TH'),
      category: tabName,
      report: {
        ...aiReport,
        advice: cleanMd(aiReport.advice),
        timeline: aiReport.timeline.map(t => ({...t, text: cleanMd(t.text)}))
      }
    };
    downloadFile(JSON.stringify(data, null, 2), `weather_report_${tabName}.json`, 'application/json');
  };

  const exportToPDF = () => {
    window.print();
  };

  const handleShare = async () => {
    if (!aiReport) return;
    const text = `สรุปสภาพอากาศที่ ${locationName} (คะแนนความเหมาะสม: ${aiReport.score}/10) - ${cleanMd(aiReport.advice)}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'รายงานสภาพอากาศ',
          text: text,
        });
      } catch {
        // user cancelled or share failed
      }
    } else {
      navigator.clipboard.writeText(text);
      alert("คัดลอกข้อความแล้ว");
    }
  };

  const appBg = 'var(--bg-app)'; 
  const cardBg = 'var(--bg-card)';
  const textColor = 'var(--text-main)'; 
  const borderColor = 'var(--border-color)';
  const subTextColor = 'var(--text-sub)'; 
  const activeColor = tabConfigs.find(t => t.id === activeTab)?.color || '#8b5cf6';

  if (loadingWeather) return (
    <div className="loading-container" style={{ background: appBg, color: textColor }}>
        <div className="loading-spinner" style={{ borderTopColor: '#8b5cf6', borderColor: 'rgba(139, 92, 246, 0.15)' }}></div>
        <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>ระบบกำลังประมวลผลทางสถิติ...</div>
        <div style={{ fontSize: '0.85rem', color: subTextColor, marginTop: '5px' }}>วิเคราะห์ UV และ ปัจจัยทางอุตุนิยมวิทยา</div>
    </div>
  );
  
  if (!weatherData) return (
    <div style={{ minHeight: '100dvh', background: appBg, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: subTextColor, fontFamily: 'Kanit', padding: '20px', textAlign: 'center' }}>
      <div style={{fontSize: '3rem'}}>⚠️</div>
      <p style={{fontWeight: 'bold'}}>ไม่สามารถดึงข้อมูลทางสถิติได้ชั่วคราว</p>
      <button onClick={() => window.location.reload()} style={{marginTop: '15px', padding: '10px 25px', borderRadius: '50px', background: '#0ea5e9', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer'}}>เชื่อมต่อระบบอีกครั้ง</button>
    </div>
  );

  return (
    <div style={{ width: '100%', minHeight: '100dvh', background: appBg, display: 'block', overflowX: 'hidden', overflowY: 'auto', WebkitOverflowScrolling: 'touch', fontFamily: 'Kanit, sans-serif', boxSizing: 'border-box' }} className="hide-scrollbar">
      
      <style dangerouslySetInlineStyle={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .fade-in { animation: fadeIn 0.4s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
        }
      `}} />

      <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', padding: isMobile ? '15px' : '30px', paddingBottom: '120px', boxSizing: 'border-box' }}>

        {/* 📍 Header & Date Selector */}
        <div className="no-print" style={{ background: cardBg, borderRadius: '24px', padding: '20px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.4rem', color: textColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        ✨ ระบบประเมินสภาพอากาศ
                    </h1>
                    <div style={{ fontSize: '0.85rem', color: subTextColor, marginTop: '2px' }}>พื้นที่การวิเคราะห์: <span style={{color: '#0ea5e9', fontWeight: 'bold'}}>{locationName}</span></div>
                </div>

                <div style={{ display: 'flex', gap: '10px', width: isMobile ? '100%' : 'auto' }}>
                    {isMobile && (
                        <select value={targetDateIdx} onChange={(e) => setTargetDateIdx(parseInt(e.target.value))} style={{ flex: 1, minWidth: 0, padding: '8px 12px', borderRadius: '12px', background: 'var(--bg-secondary)', color: textColor, border: `1px solid ${borderColor}`, fontFamily: 'Kanit', outline: 'none' }}>
                            {[0,1,2,3,4,5,6].map(idx => {
                                const date = new Date(weatherData?.daily?.time?.[idx] || Date.now());
                                const dateStr = idx === 0 ? 'วันนี้' : idx === 1 ? 'พรุ่งนี้' : date.toLocaleDateString('th-TH', {weekday:'short', day:'numeric'});
                                return <option key={idx} value={idx}>{dateStr}</option>;
                            })}
                        </select>
                    )}
                    <select value={selectedProv} onChange={(e) => { 
                        const val = e.target.value;
                        setSelectedProv(val); 
                        if(val){
                            const st = (stations || []).find(s => s.areaTH === val);
                            if(st) { fetchWeatherByCoords(st.lat, st.long); fetchLocationName(st.lat, st.long); }
                        }
                    }} style={{ flex: isMobile ? 1 : 'auto', minWidth: 0, padding: '8px 12px', borderRadius: '12px', background: 'var(--bg-secondary)', color: textColor, border: `1px solid ${borderColor}`, fontFamily: 'Kanit', outline: 'none' }}>
                        <option value="">เปลี่ยนพื้นที่</option>
                        {(stations || []).map(s => <option key={s.stationID} value={s.areaTH}>{s.areaTH}</option>)}
                    </select>
                </div>
            </div>

            {!isMobile && (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '20px' }}>
                    {[0,1,2,3,4,5,6].map(idx => {
                        const date = new Date(weatherData?.daily?.time?.[idx] || Date.now());
                        const dateStr = idx === 0 ? 'วันนี้' : idx === 1 ? 'พรุ่งนี้' : date.toLocaleDateString('th-TH', {weekday:'short', day:'numeric'});
                        return (
                            <button key={idx} onClick={() => setTargetDateIdx(idx)} style={{ 
                                padding: '8px 15px', borderRadius: '14px', 
                                border: `1px solid ${targetDateIdx === idx ? activeColor : borderColor}`, 
                                background: targetDateIdx === idx ? activeColor : 'transparent', 
                                color: targetDateIdx === idx ? '#fff' : textColor, 
                                fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: '0.2s' 
                            }}>
                                {dateStr}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>

        {/* ⚡ TL;DR Quick Summary Cards */}
        {aiReport && (
            <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px' }}>
                {aiReport.quickAnswers.map((item, idx) => (
                    <div key={idx} style={{ background: cardBg, border: `1px solid ${item.color}50`, borderRadius: '20px', padding: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '5px' }}>{item.icon}</div>
                        <div style={{ fontSize: '0.8rem', color: subTextColor, fontWeight: 'bold' }}>{item.title}</div>
                        <div style={{ fontSize: '0.95rem', color: item.color, fontWeight: '900', marginTop: '2px', lineHeight: 1.3 }}>{item.text}</div>
                    </div>
                ))}
            </div>
        )}

        {/* 📑 หมวดหมู่ไลฟ์สไตล์ */}
        <div className="no-print hide-scrollbar" style={{ 
            display: 'flex', gap: isMobile ? '12px' : '10px', width: '100%', 
            overflowX: 'auto', paddingBottom: '10px', WebkitOverflowScrolling: 'touch',
            flexWrap: isMobile ? 'nowrap' : 'wrap', scrollSnapType: isMobile ? 'x mandatory' : 'none'
        }}>
            {tabConfigs.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                        display: 'flex', alignItems: 'center', gap: '8px', 
                        padding: isActive ? '10px 20px' : '10px 16px', 
                        borderRadius: '50px', scrollSnapAlign: 'start',
                        background: isActive ? (darkMode ? `${tab.color}30` : tab.color) : cardBg,
                        color: isActive ? (darkMode ? tab.color : '#fff') : subTextColor,
                        border: `1px solid ${isActive ? (darkMode ? tab.color : 'transparent') : borderColor}`,
                        fontWeight: isActive ? 'bold' : 'normal', 
                        cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        whiteSpace: 'nowrap', flexShrink: 0,
                        boxShadow: isActive ? `0 4px 15px ${tab.color}40` : 'none',
                        transform: isActive ? 'scale(1.02)' : 'scale(1)'
                    }}>
                        <span style={{ fontSize: isActive ? '1.25rem' : '1.1rem', transition: 'all 0.3s' }}>{tab.icon}</span> 
                        <span style={{ fontSize: '0.95rem' }}>{tab.label}</span>
                    </button>
                );
            })}
        </div>

        {/* 🤖 AI Detailed Report */}
        {aiReport && (
            <div className="fade-in" key={activeTab + targetDateIdx} style={{ 
                background: darkMode ? `linear-gradient(145deg, ${activeColor}10, ${cardBg})` : `linear-gradient(145deg, ${activeColor}08, #ffffff)`, 
                borderRadius: '24px', padding: isMobile ? '20px' : '30px', 
                border: `1px solid ${activeColor}30`, 
                boxShadow: `0 15px 40px ${activeColor}15`, position: 'relative', overflow: 'hidden'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.4rem', color: textColor, display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '800' }}>
                            <span style={{ fontSize: '1.8rem' }}>{tabConfigs.find(t=>t.id===activeTab)?.icon}</span>
                            บทวิเคราะห์ AI: {tabConfigs.find(t=>t.id===activeTab)?.label}
                        </h2>
                        <div style={{ fontSize: '0.85rem', color: subTextColor, marginTop: '4px', marginLeft: '4px' }}>
                            ประมวลผลสภาพอากาศเพื่อการตัดสินใจ
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch', flexWrap: 'wrap' }}>
                        <div className="no-print" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button onClick={exportToCSV} title="Export to CSV" style={{ background: darkMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)', color: textColor, border: `1px solid ${borderColor}`, padding: '8px 12px', borderRadius: '12px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', backdropFilter: 'blur(5px)' }}>CSV</button>
                            <button onClick={exportToJSON} title="Export to JSON" style={{ background: darkMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)', color: textColor, border: `1px solid ${borderColor}`, padding: '8px 12px', borderRadius: '12px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', backdropFilter: 'blur(5px)' }}>JSON</button>
                            <button onClick={exportToPDF} title="Export to PDF (Print)" style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '12px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(239,68,68,0.3)' }}>PDF</button>
                            <button onClick={handleShare} title="Share" style={{ background: '#10b981', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '12px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 10px rgba(16,185,129,0.3)' }}><span>📤</span> แชร์</button>
                        </div>
                        {(() => {
                            const score = aiReport.score;
                            const sc = score >= 8 ? '#10b981' : score >= 5 ? '#f59e0b' : '#ef4444';
                            const radius = 32;
                            const circumference = 2 * Math.PI * radius;
                            const strokeDashoffset = circumference - (score / 10) * circumference;
                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                  <div style={{ position: 'relative', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <svg width="80" height="80" viewBox="0 0 80 80" style={{ position: 'absolute', transform: 'rotate(-90deg)', filter: `drop-shadow(0 0 8px ${sc}50)` }}>
                                          <circle cx="40" cy="40" r={radius} fill="none" stroke={darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} strokeWidth="8" />
                                          <circle 
                                              cx="40" cy="40" r={radius} fill="none" stroke={sc} strokeWidth="8" 
                                              strokeDasharray={circumference} 
                                              strokeDashoffset={strokeDashoffset} 
                                              strokeLinecap="round" 
                                              style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                                          />
                                      </svg>
                                      <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: '2px' }}>
                                          <div style={{ fontSize: '1.4rem', fontWeight: '900', color: sc, lineHeight: 0.9 }}>{score}</div>
                                          <div style={{ fontSize: '0.65rem', opacity: 0.6, color: textColor, fontWeight: 'bold' }}>/10</div>
                                      </div>
                                  </div>
                                  <div style={{ fontSize: '0.7rem', color: sc, fontWeight: 'bold', letterSpacing: '0.5px', marginTop: '5px' }}>ความเหมาะสม</div>
                                </div>
                            );
                        })()}
                    </div>
                </div>

                <div style={{ padding: '24px', background: 'var(--bg-overlay-heavy)', borderRadius: '20px', border: `1px solid ${activeColor}20`, borderLeft: `6px solid ${activeColor}`, marginBottom: '35px', backdropFilter: 'blur(10px)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                    <p style={{ margin: 0, fontSize: '1.05rem', color: textColor, lineHeight: 1.7, fontWeight: '500' }}>{renderHighlightedText(aiReport.advice, activeColor)}</p>
                </div>

                <h4 style={{ margin: '0 0 20px 0', color: textColor, display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.1rem' }}>
                    <div style={{background: `linear-gradient(135deg, ${activeColor}, ${activeColor}dd)`, color: '#fff', width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', boxShadow: `0 4px 10px ${activeColor}40`}}>🕒</div> 
                    <span style={{fontWeight: '800'}}>ไทม์ไลน์สภาพอากาศแวดล้อม</span>
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {aiReport.timeline.map((item, i) => (
                        <div key={i} style={{ display: 'flex', gap: '18px', position: 'relative' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: activeColor, zIndex: 1, border: `4px solid ${darkMode ? '#0f172a' : '#ffffff'}`, boxShadow: `0 0 0 1px ${activeColor}40` }}></div>
                                {i !== aiReport.timeline.length - 1 && <div style={{ width: '2px', flex: 1, background: `linear-gradient(to bottom, ${activeColor}80, ${activeColor}20)`, marginTop: '-8px', marginBottom: '-8px' }}></div>}
                            </div>
                            <div style={{ flex: 1, paddingBottom: i !== aiReport.timeline.length - 1 ? '20px' : '0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '1.3rem', background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', padding: '5px', borderRadius: '10px' }}>{item.icon}</span>
                                    <span style={{ fontWeight: '800', color: textColor, fontSize: '1rem' }}>{item.time}</span>
                                </div>
                                <div style={{ fontSize: '0.95rem', color: darkMode ? '#cbd5e1' : '#475569', lineHeight: 1.6, background: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', padding: '15px 18px', borderRadius: '16px', border: `1px solid ${borderColor}` }}>
                                    {renderHighlightedText(item.text, activeColor)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

      </div>
    </div>
  );
}