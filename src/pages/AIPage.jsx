import React, { useContext, useState, useEffect, useMemo, useRef } from 'react';
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

  // 🌟 Ref สำหรับปุ่มลูกศรเลื่อนซ้าย-ขวาบน Desktop
  const dateScrollRef = useRef(null);
  const tabScrollRef = useRef(null);

  // ฟังก์ชันเลื่อน Scroll แนวนอน
  const handleScroll = (ref, direction) => {
      if (ref.current) {
          ref.current.scrollBy({ left: direction * 200, behavior: 'smooth' });
      }
  };

  const fetchWeatherByCoords = async (lat, lon) => {
    try {
      setLoadingWeather(true);
      const wUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,surface_pressure,wind_speed_10m,visibility&hourly=temperature_2m,precipitation_probability,pm2_5&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_probability_max&timezone=Asia%2FBangkok`;
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
            pm25: aData.hourly.pm2_5
          },
          daily: {
            time: wData.daily.time,
            weathercode: wData.daily.weather_code,
            temperature_2m_max: wData.daily.temperature_2m_max,
            temperature_2m_min: wData.daily.temperature_2m_min,
            apparent_temperature_max: wData.daily.apparent_temperature_max,
            pm25_max: new Array(7).fill(aData.current.pm2_5),
            precipitation_probability_max: wData.daily.precipitation_probability_max
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
    } catch (e) { setLocationName('ตำแหน่งปัจจุบัน'); }
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

  const aiReport = useMemo(() => {
    if (!weatherData || !weatherData.daily) return null;

    const d = weatherData.daily;
    const tMax = Math.round(d.temperature_2m_max?.[targetDateIdx] ?? 0);
    const tMin = Math.round(d.temperature_2m_min?.[targetDateIdx] ?? 0);
    const rain = d.precipitation_probability_max?.[targetDateIdx] ?? 0;
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
          if (tMax > 33 && rain < 20) baseScore += 1;
          break;
        case 'exercise': 
          if (pm25 > 37.5) baseScore -= 5;
          if (tMax > 36) baseScore -= 3;
          if (rain > 50) baseScore -= 2;
          break;
        case 'outdoor': 
          if (rain > 40) baseScore -= 4;
          if (tMax > 37) baseScore -= 3;
          if (pm25 > 50) baseScore -= 2;
          break;
        case 'travel': 
          if (rain > 50) baseScore -= 4;
          if (tMax > 38) baseScore -= 3;
          break;
        case 'farming': 
          if (rain > 70) baseScore -= 4;
          if (tMax > 38) baseScore -= 3;
          break;
        case 'pets': 
          if (tMax > 35) baseScore -= 4;
          if (rain > 40) baseScore -= 3;
          if (pm25 > 50) baseScore -= 2;
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
          if (rain > 40) return `ประเมินความเสี่ยง: โอกาสฝนตก ${rain}% ไม่แนะนำให้ตากผ้าภายนอกอาคาร ควรใช้เครื่องอบผ้าหรือตากในพื้นที่ร่มที่มีอากาศถ่ายเท`;
          if (tMax > 33) return `ประเมินความเสี่ยง: สภาพอากาศเหมาะสมอย่างยิ่ง แสงแดดจัดช่วยให้ผ้าแห้งไวและยับยั้งการเจริญเติบโตของแบคทีเรียได้อย่างมีประสิทธิภาพ`;
          return `ประเมินความเสี่ยง: สามารถตากผ้าได้ตามปกติ แต่อาจใช้เวลาแห้งนานกว่าช่วงที่แดดจัด แนะนำให้ติดตามทิศทางเมฆฝนอย่างใกล้ชิด`;
      }
      if (activeTab === 'exercise') {
          if (pm25 > 37.5) return `ประเมินความเสี่ยง: คุณภาพอากาศไม่อยู่ในเกณฑ์มาตรฐาน (PM2.5: ${pm25} µg/m³) ควรงดการวิ่งหรือออกกำลังกายหนักภายนอกอาคาร เปลี่ยนเป็นการคาร์ดิโอในร่มแทน`;
          if (tMax > 36) return `ประเมินความเสี่ยง: อุณหภูมิพุ่งสูง ระวังภาวะขาดน้ำและฮีทสโตรก ควรเลี่ยงการออกกำลังกายในช่วงบ่าย ให้สลับไปเป็นช่วงเช้าตรู่หรือหัวค่ำ`;
          return `ประเมินความเสี่ยง: สภาพแวดล้อมเหมาะสมสำหรับการออกกำลังกายกลางแจ้ง สามารถดำเนินกิจกรรมตามตารางฝึกซ้อมได้ตามปกติ`;
      }
      if (activeTab === 'outdoor') {
          if (rain > 40) return `ประเมินความเสี่ยง: มีโอกาสเกิดฝนฟ้าคะนอง หากมีการจัดกิจกรรมกลางแจ้งหรือตั้งแคมป์ ควรเตรียมเต็นท์กันน้ำและแผนสำรองสำหรับการเคลื่อนย้าย`;
          if (tMax > 37) return `ประเมินความเสี่ยง: ดัชนีความร้อนสะสมอยู่ในระดับสูง ควรจัดเตรียมพื้นที่ร่มเงาและจุดจ่ายน้ำดื่มให้เพียงพอต่อผู้ร่วมกิจกรรม`;
          return `ประเมินความเสี่ยง: สภาพอากาศเป็นใจอย่างยิ่งสำหรับการทำกิจกรรมกลางแจ้ง ปัจจัยทางอุตุนิยมวิทยาเอื้ออำนวยอย่างเต็มที่`;
      }
      if (activeTab === 'farming') {
          if (rain > 60) return `ประเมินความเสี่ยง: ไม่แนะนำให้ฉีดพ่นสารเคมีหรือปุ๋ยทางใบ เนื่องจากฝนอาจชะล้างตัวยา และควรเฝ้าระวังน้ำท่วมขังในแปลงเพาะปลูก`;
          if (tMax > 37) return `ประเมินความเสี่ยง: สภาพอากาศร้อนจัดระเหยความชื้นจากดินอย่างรวดเร็ว ควรรดน้ำพืชในช่วงเช้าตรู่หรือเย็น และระวังพืชเกิดภาวะช็อกความร้อน`;
          return `ประเมินความเสี่ยง: สภาวะแวดล้อมเหมาะสม สามารถปฏิบัติงานในแปลงเพาะปลูก ฉีดพ่นยา หรือให้ปุ๋ยได้ตามรอบการจัดการปกติ`;
      }
      if (activeTab === 'travel') {
          if (rain > 50) return `ประเมินความเสี่ยง: สภาพอากาศมีแนวโน้มแปรปรวน แนะนำให้จัดแพลนท่องเที่ยวในอาคาร (Indoor) เป็นหลักเพื่อหลีกเลี่ยงอุปสรรคในการเดินทาง`;
          return `ประเมินความเสี่ยง: เหมาะสมต่อการเดินทางท่องเที่ยว ทัศนวิสัยชัดเจน สามารถดำเนินกิจกรรมตามแพลนที่วางไว้ได้อย่างราบรื่น`;
      }
      if (activeTab === 'pets') {
          if (tMax > 34) return `ประเมินความเสี่ยง: สภาพอากาศร้อนจัด เสี่ยงต่อภาวะฮีทสโตรกในสัตว์เลี้ยง ควรงดพาเดินเล่นบนพื้นปูนซีเมนต์หรือยางมะตอยในช่วงกลางวันเพื่อป้องกันแผลพุพองที่อุ้งเท้า`;
          if (rain > 40) return `ประเมินความเสี่ยง: มีโอกาสฝนตก ${rain}% แนะนำให้อยู่ภายในอาคาร และระวังความชื้นที่อาจก่อให้เกิดโรคเชื้อราหรือพยาธิภายนอก`;
          return `ประเมินความเสี่ยง: สภาพอากาศเป็นมิตรต่อสัตว์เลี้ยง อุณหภูมิอยู่ในเกณฑ์ปลอดภัย สามารถพาออกไปทำกิจกรรมนอกอาคารได้`;
      }
      if (activeTab === 'carwash') {
          if (rain > 20) return `ประเมินความเสี่ยง: ความน่าจะเป็นของการเกิดฝนสูงถึง ${rain}% แนะนำให้เลื่อนการล้างรถหรือการเคลือบเงาออกไปก่อน เพื่อหลีกเลี่ยงคราบน้ำฝนและดินโคลนเกาะพื้นผิวรถซ้ำ`;
          return `ประเมินความเสี่ยง: ท้องฟ้าโปร่ง โอกาสฝนตกต่ำมาก เป็นสภาวะแวดล้อมที่เหมาะสมที่สุดสำหรับการล้างรถ ขัดสี และเคลือบเงา`;
      }
      
      if (finalScore >= 8) return `สรุปการประเมิน: สภาพอากาศโดยรวมอยู่ในเกณฑ์ดีเยี่ยม ปัจจัยทางอุตุนิยมวิทยาเอื้ออำนวยต่อการดำเนินชีวิตประจำวันตามปกติ`;
      return `สรุปการประเมิน: สภาพอากาศมีความผันผวนของปัจจัยบางประการ ควรประเมินสถานการณ์หน้างานและเตรียมความพร้อมสำหรับความเปลี่ยนแปลง`;
    };

    const getTimeline = () => {
      const isRainy = rain > 40;
      const isHot = tMax > 35;
      
      const lines = {
        summary: [
          { time: 'ช่วงเช้า (06:00 - 12:00)', icon: '🌅', text: `อุณหภูมิเริ่มต้นที่ ${tMin}°C สภาพอากาศเหมาะสมสำหรับการเริ่มต้นวัน` },
          { time: 'ช่วงบ่าย (12:00 - 18:00)', icon: '☀️', text: isHot ? `อุณหภูมิสูงสุดแตะระดับ ${tMax}°C ควรหลีกเลี่ยงแสงแดดจัด` : `อุณหภูมิสูงสุด ${tMax}°C สภาพอากาศโดยรวมทรงตัว` },
          { time: 'ช่วงค่ำ (18:00 เป็นต้นไป)', icon: '🌙', text: isRainy ? `มีความเสี่ยงฝนฟ้าคะนอง ควรเตรียมอุปกรณ์กันฝน` : `อุณหภูมิลดลง สภาพอากาศโปร่งสบาย เหมาะแก่การพักผ่อน` }
        ],
        laundry: [
          { time: 'ช่วงเช้า (06:00 - 12:00)', icon: '🌅', text: isRainy ? `สังเกตทิศทางลมและเมฆฝน หากความชื้นสูงควรชะลอการซักผ้า` : `ปริมาณรังสี UV และแสงแดดเหมาะสม สามารถเริ่มการซักและตากผ้าได้` },
          { time: 'ช่วงบ่าย (12:00 - 18:00)', icon: '☀️', text: isHot ? `อุณหภูมิความร้อนระดับนี้ ช่วยลดระยะเวลาตากผ้าและยับยั้งเชื้อแบคทีเรียได้ดี` : `ปริมาณแสงแดดเพียงพอต่อการทำให้ผ้าแห้งตามมาตรฐาน` },
          { time: 'ช่วงค่ำ (18:00 เป็นต้นไป)', icon: '🌙', text: `ความชื้นสัมพัทธ์ในอากาศเพิ่มขึ้น ควรรีบจัดเก็บเสื้อผ้าที่ตากไว้เพื่อป้องกันกลิ่นอับ` }
        ],
        exercise: [
          { time: 'ช่วงเช้า (06:00 - 12:00)', icon: '🌅', text: pm25 > 37.5 ? `ค่ามลพิษทางอากาศเกินเกณฑ์มาตรฐาน ควรงดกิจกรรมที่ต้องสูดหายใจลึกภายนอกอาคาร` : `คุณภาพอากาศและอุณหภูมิอยู่ในระดับที่เหมาะสมที่สุดสำหรับการคาร์ดิโอ` },
          { time: 'ช่วงบ่าย (12:00 - 18:00)', icon: '☀️', text: isHot ? `ความร้อนสะสมสูง เสี่ยงต่อภาวะ Heatstroke ควรปรับเปลี่ยนเป็นการฝึกซ้อมในฟิตเนส` : `สามารถดำเนินกิจกรรมทางกายได้ แต่ควรเฝ้าระวังอัตราการเต้นของหัวใจและจิบน้ำอย่างสม่ำเสมอ` },
          { time: 'ช่วงค่ำ (18:00 เป็นต้นไป)', icon: '🌙', text: `อุณหภูมิผ่อนคลายลง เหมาะสมสำหรับการเดินเร็ว วิ่งจ็อกกิ้ง หรือกิจกรรมยืดเหยียดกล้ามเนื้อ` }
        ],
        outdoor: [
          { time: 'ช่วงเช้า (06:00 - 12:00)', icon: '🌅', text: `สภาพแสงและอุณหภูมิเหมาะสมอย่างยิ่งในการจัดเตรียมสถานที่หรือเคลื่อนย้ายอุปกรณ์` },
          { time: 'ช่วงบ่าย (12:00 - 18:00)', icon: '☀️', text: isHot ? `รังสี UV อยู่ในเกณฑ์ที่อาจเป็นอันตรายต่อผิวหนัง ควรจัดกิจกรรมภายใต้ร่มเงาหรือโครงสร้างชั่วคราว` : `สภาพอากาศเปิดโล่ง สามารถดำเนินกิจกรรมนันทนาการได้อย่างราบรื่น` },
          { time: 'ช่วงค่ำ (18:00 เป็นต้นไป)', icon: '🌙', text: isRainy ? `เฝ้าระวังพายุลมแรง ตรวจสอบการตอกสมอบกและประเมินความปลอดภัยของพื้นที่จุดกางเต็นท์` : `บรรยากาศและอุณหภูมิลดลง เหมาะสมสำหรับการก่อกองไฟและทำกิจกรรมส่วนรวม` }
        ],
        farming: [
          { time: 'ช่วงเช้า (06:00 - 12:00)', icon: '🌅', text: `ช่วงเวลาที่ปากใบพืชเปิดรับสารอาหารได้เต็มที่ เหมาะสมสูงสุดสำหรับการฉีดพ่นปุ๋ยทางใบ` },
          { time: 'ช่วงบ่าย (12:00 - 18:00)', icon: '☀️', text: isHot ? `อุณหภูมิดินสูง ควรงดการให้น้ำพืชเพื่อป้องกันภาวะช็อกความร้อนและการลวกของระบบราก` : `สามารถดำเนินการบำรุงรักษาแปลงเพาะปลูกและกำจัดวัชพืชได้ตามแผนการจัดการ` },
          { time: 'ช่วงค่ำ (18:00 เป็นต้นไป)', icon: '🌙', text: isRainy ? `ติดตามปริมาณฝนสะสมเพื่อประเมินและบริหารจัดการระบบระบายน้ำในแปลงเพาะปลูกสำหรับวันพรุ่งนี้` : `สามารถให้น้ำเสริมแก่พืชได้ เพื่อชดเชยการสูญเสียความชื้นจากกระบวนการคายน้ำระหว่างวัน` }
        ],
        travel: [
          { time: 'ช่วงเช้า (06:00 - 12:00)', icon: '🌅', text: `ทัศนวิสัยดีเยี่ยม เหมาะสมต่อการเดินทางไกลและเยี่ยมชมแหล่งท่องเที่ยวทางธรรมชาติ` },
          { time: 'ช่วงบ่าย (12:00 - 18:00)', icon: '☀️', text: isHot ? `แนะนำให้ปรับกำหนดการเป็นการเข้าเยี่ยมชมพิพิธภัณฑ์ ศูนย์การค้า หรือสถานที่ปรับอากาศ` : `การสัญจรราบรื่น สภาพอุตุนิยมวิทยาไม่เป็นอุปสรรคต่อการเดินทาง` },
          { time: 'ช่วงค่ำ (18:00 เป็นต้นไป)', icon: '🌙', text: `เหมาะสมสำหรับการจัดตารางกิจกรรมช่วงกลางคืน เช่น ตลาดนัดคนเดิน หรือการรับประทานอาหารภายนอก` }
        ],
        pets: [
          { time: 'ช่วงเช้า (06:00 - 12:00)', icon: '🌅', text: pm25 > 37.5 ? `มลพิษทางอากาศค่อนข้างสูง หากพาเดินเล่นควรจำกัดระยะเวลาเพื่อลดผลกระทบต่อระบบหายใจของสัตว์เลี้ยง` : `อุณหภูมิผิวถนนเย็นและอากาศถ่ายเทดี เป็นช่วงเวลาปลอดภัยที่สุดในการพาสัตว์เลี้ยงออกกำลังกาย` },
          { time: 'ช่วงบ่าย (12:00 - 18:00)', icon: '☀️', text: isHot ? `พื้นยางมะตอยหรือคอนกรีตอาจมีอุณหภูมิสูงถึง 50-60°C เสี่ยงต่อการเกิดแผลไหม้ที่อุ้งเท้าสุนัข/แมว ควรจัดให้อยู่ในที่ร่ม` : `สามารถทำกิจกรรมระยะสั้นได้ แต่ควรจัดเตรียมน้ำสะอาดให้สัตว์เลี้ยงเข้าถึงได้ตลอดเวลา` },
          { time: 'ช่วงค่ำ (18:00 เป็นต้นไป)', icon: '🌙', text: isRainy ? `ระวังพาหะนำโรค เช่น เห็บ หมัด และสัตว์มีพิษที่มากับความชื้นหลังฝนตก ควรเช็ดอุ้งเท้าให้แห้งสนิทเมื่อกลับเข้าอาคาร` : `อุณหภูมิแวดล้อมผ่อนคลายลง เหมาะสมต่อการพาสัตว์เลี้ยงไปเดินเล่นคลายเครียดก่อนพักผ่อน` }
        ],
        carwash: [
          { time: 'ช่วงเช้า (06:00 - 12:00)', icon: '🌅', text: isRainy ? `สภาพอากาศมีเมฆฝนปกคลุม ยังไม่แนะนำให้ดำเนินการล้างทำความสะอาดรถในเวลานี้` : `ช่วงเวลาเหมาะสมที่สุด อุณหภูมิผิวยังไม่สูงเกินไป ทำให้เช็ดแห้งได้ทันและลดความเสี่ยงการเกิดคราบน้ำ (Water spot)` },
          { time: 'ช่วงบ่าย (12:00 - 18:00)', icon: '☀️', text: isHot ? `แสงแดดและอุณหภูมิแวดล้อมที่สูงเกินไป จะทำให้สารทำความสะอาดแห้งไวและทำลายชั้นเคลือบสี ควรล้างรถในที่ร่มเท่านั้น` : `สามารถล้างทำความสะอาด ขัดสี และลงแว็กซ์เคลือบเงาได้ตามกระบวนการปกติ` },
          { time: 'ช่วงค่ำ (18:00 เป็นต้นไป)', icon: '🌙', text: isRainy ? `มีความเสี่ยงที่จะเกิดหยาดน้ำฟ้า หากต้องใช้รถควรขับด้วยความระมัดระวังเพื่อหลีกเลี่ยงโคลนกระเด็นจากพื้นถนน` : `สามารถจอดพักรถทิ้งไว้ภายนอกอาคารได้อย่างไร้กังวล ไม่มีปัจจัยสภาพอากาศที่ทำให้รถหมองคล้ำ` }
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

  const appBg = darkMode ? '#020617' : '#f8fafc'; 
  const cardBg = darkMode ? '#0f172a' : '#ffffff';
  const textColor = darkMode ? '#f8fafc' : '#0f172a'; 
  const borderColor = darkMode ? '#1e293b' : '#e2e8f0';
  const subTextColor = darkMode ? '#94a3b8' : '#64748b'; 
  const activeColor = tabConfigs.find(t => t.id === activeTab)?.color || '#8b5cf6';

  if (loadingWeather) return (
    <div className="loading-container" style={{ background: appBg, color: textColor }}>
        <div className="loading-spinner" style={{ borderTopColor: '#8b5cf6', borderColor: 'rgba(139, 92, 246, 0.15)' }}></div>
        <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>ระบบกำลังประมวลผลทางสถิติ...</div>
        <div style={{ fontSize: '0.85rem', color: subTextColor, marginTop: '5px' }}>วิเคราะห์ปัจจัยทางอุตุนิยมวิทยา</div>
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
    <div style={{ width: '100%', minHeight: '100dvh', background: appBg, display: 'block', overflowY: 'auto', WebkitOverflowScrolling: 'touch', fontFamily: 'Kanit, sans-serif' }} className="hide-scrollbar">
      
      <style dangerouslySetInlineStyle={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .fade-in { animation: fadeIn 0.4s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        
        /* สไตล์สำหรับ Container ที่ปุ่มเลื่อนได้ */
        .scroll-button-container {
            display: flex;
            gap: 10px;
            overflow-x: auto;
            scroll-behavior: smooth;
        }
        
        /* สำหรับ Desktop ให้เว้น Padding ด้านซ้ายขวาเผื่อพื้นที่ให้ปุ่มลูกศร */
        @media (min-width: 1024px) {
            .has-arrows { padding: 0 40px; }
        }
      `}} />

      <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', padding: isMobile ? '15px' : '30px', paddingBottom: '120px' }}>

        {/* 📍 Header & Date Selector */}
        <div style={{ background: cardBg, borderRadius: '24px', padding: '20px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.4rem', color: textColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        ✨ ระบบประเมินสภาพอากาศ
                    </h1>
                    <div style={{ fontSize: '0.85rem', color: subTextColor, marginTop: '2px' }}>พื้นที่การวิเคราะห์: <span style={{color: '#0ea5e9', fontWeight: 'bold'}}>{locationName}</span></div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <select value={selectedProv} onChange={(e) => { 
                        const val = e.target.value;
                        setSelectedProv(val); 
                        if(val){
                            const st = (stations || []).find(s => s.areaTH === val);
                            if(st) { fetchWeatherByCoords(st.lat, st.long); fetchLocationName(st.lat, st.long); }
                        }
                    }} style={{ padding: '8px 12px', borderRadius: '12px', background: darkMode ? '#1e293b' : '#f1f5f9', color: textColor, border: `1px solid ${borderColor}`, fontFamily: 'Kanit', outline: 'none' }}>
                        <option value="">เปลี่ยนพื้นที่</option>
                        {(stations || []).map(s => <option key={s.stationID} value={s.areaTH}>{s.areaTH}</option>)}
                    </select>
                </div>
            </div>

            {/* 🌟 ปรับปรุง: แถบเลือกวันที่ + ปุ่มลูกศร */}
            <div style={{ position: 'relative', marginTop: '20px' }}>
                {!isMobile && (
                    <button onClick={() => handleScroll(dateScrollRef, -1)} style={{ position: 'absolute', left: '-5px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, background: cardBg, border: `1px solid ${borderColor}`, color: textColor, borderRadius: '50%', width: '35px', height: '35px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '2px 0 10px rgba(0,0,0,0.05)' }}>◀</button>
                )}
                
                <div ref={dateScrollRef} className="scroll-button-container hide-scrollbar has-arrows">
                    {[0,1,2,3,4,5,6].map(idx => {
                        const date = new Date(weatherData?.daily?.time?.[idx] || Date.now());
                        const dateStr = idx === 0 ? 'วันนี้' : idx === 1 ? 'พรุ่งนี้' : date.toLocaleDateString('th-TH', {weekday:'short', day:'numeric'});
                        return (
                            <button key={idx} onClick={() => setTargetDateIdx(idx)} style={{ 
                                flexShrink: 0, padding: '10px 15px', borderRadius: '14px', 
                                border: `1px solid ${targetDateIdx === idx ? activeColor : borderColor}`, 
                                background: targetDateIdx === idx ? activeColor : 'transparent', 
                                color: targetDateIdx === idx ? '#fff' : textColor, 
                                fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: '0.2s',
                                whiteSpace: 'nowrap'
                            }}>
                                {dateStr}
                            </button>
                        );
                    })}
                </div>

                {!isMobile && (
                    <button onClick={() => handleScroll(dateScrollRef, 1)} style={{ position: 'absolute', right: '-5px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, background: cardBg, border: `1px solid ${borderColor}`, color: textColor, borderRadius: '50%', width: '35px', height: '35px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '-2px 0 10px rgba(0,0,0,0.05)' }}>▶</button>
                )}
            </div>
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

        {/* 🌟 ปรับปรุง: หมวดหมู่ไลฟ์สไตล์ + ปุ่มลูกศร */}
        <div style={{ position: 'relative' }}>
            {!isMobile && (
                <button onClick={() => handleScroll(tabScrollRef, -1)} style={{ position: 'absolute', left: '-5px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, background: cardBg, border: `1px solid ${borderColor}`, color: textColor, borderRadius: '50%', width: '35px', height: '35px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '2px 0 10px rgba(0,0,0,0.05)' }}>◀</button>
            )}

            <div ref={tabScrollRef} className="scroll-button-container hide-scrollbar has-arrows">
                {tabConfigs.map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                            flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '50px', border: 'none',
                            background: isActive ? (darkMode ? `${tab.color}30` : `${tab.color}15`) : cardBg,
                            color: isActive ? tab.color : subTextColor,
                            border: `1px solid ${isActive ? tab.color : borderColor}`,
                            fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s',
                            whiteSpace: 'nowrap'
                        }}>
                            <span style={{ fontSize: '1.2rem' }}>{tab.icon}</span> {tab.label}
                        </button>
                    );
                })}
            </div>

            {!isMobile && (
                <button onClick={() => handleScroll(tabScrollRef, 1)} style={{ position: 'absolute', right: '-5px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, background: cardBg, border: `1px solid ${borderColor}`, color: textColor, borderRadius: '50%', width: '35px', height: '35px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '-2px 0 10px rgba(0,0,0,0.05)' }}>▶</button>
            )}
        </div>

        {/* 🤖 AI Detailed Report */}
        {aiReport && (
            <div className="fade-in" key={activeTab + targetDateIdx} style={{ background: cardBg, borderRadius: '24px', padding: isMobile ? '20px' : '30px', border: `1px solid ${borderColor}`, boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.3rem', color: textColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {tabConfigs.find(t=>t.id===activeTab)?.icon} แผนปฏิบัติการ: {tabConfigs.find(t=>t.id===activeTab)?.label}
                    </h2>
                    <div style={{ background: darkMode ? '#1e293b' : '#f8fafc', padding: '8px 15px', borderRadius: '15px', border: `1px solid ${borderColor}`, textAlign: 'center' }}>
                        <div style={{ fontSize: '0.65rem', color: subTextColor, fontWeight: 'bold' }}>ดัชนีความเหมาะสม</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '900', color: aiReport.score >= 8 ? '#22c55e' : aiReport.score >= 5 ? '#eab308' : '#ef4444' }}>
                            {aiReport.score}/10
                        </div>
                    </div>
                </div>

                <div style={{ padding: '20px', background: darkMode ? 'rgba(0,0,0,0.2)' : '#f8fafc', borderRadius: '20px', borderLeft: `5px solid ${activeColor}`, marginBottom: '30px' }}>
                    <p style={{ margin: 0, fontSize: '1rem', color: textColor, lineHeight: 1.6 }}>{aiReport.advice}</p>
                </div>

                <h4 style={{ margin: '0 0 15px 0', color: textColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🕒</span> ไทม์ไลน์คาดการณ์สภาพอากาศ
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {aiReport.timeline.map((item, i) => (
                        <div key={i} style={{ display: 'flex', gap: '15px', position: 'relative' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: activeColor, zIndex: 1, border: `3px solid ${cardBg}` }}></div>
                                {i < 2 && <div style={{ width: '2px', flex: 1, background: borderColor, marginTop: '-5px', marginBottom: '-5px' }}></div>}
                            </div>
                            <div style={{ flex: 1, paddingBottom: i < 2 ? '15px' : '0' }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '5px' }}>
                                    <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                                    <span style={{ fontWeight: 'bold', color: textColor, fontSize: '0.95rem' }}>{item.time}</span>
                                </div>
                                <div style={{ fontSize: '0.9rem', color: subTextColor, lineHeight: 1.5, background: darkMode ? '#1e293b' : '#f1f5f9', padding: '12px 15px', borderRadius: '15px' }}>
                                    {item.text}
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