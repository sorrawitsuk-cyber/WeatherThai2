// src/pages/AIAssistantPage.jsx
import React, { useContext, useState, useEffect } from 'react';
import { WeatherContext } from '../context/WeatherContext';
import { extractProvince } from '../utils/helpers';

// 🌟 ฐานข้อมูลความรู้ AI (ภูมิภาค, เกษตร, ท่องเที่ยว)
const getProvinceKnowledge = (prov) => {
  const north = ['เชียงใหม่', 'เชียงราย', 'แม่ฮ่องสอน', 'น่าน', 'พะเยา', 'แพร่', 'ลำปาง', 'ลำพูน', 'ตาก'];
  const south = ['ภูเก็ต', 'กระบี่', 'พังงา', 'สุราษฎร์ธานี', 'สงขลา', 'นครศรีธรรมราช', 'ตรัง', 'สตูล', 'ชุมพร'];
  const northeast = ['ขอนแก่น', 'นครราชสีมา', 'อุดรธานี', 'อุบลราชธานี', 'บุรีรัมย์', 'สุรินทร์', 'หนองคาย', 'เลย'];
  const east = ['ชลบุรี', 'ระยอง', 'จันทบุรี', 'ตราด', 'ฉะเชิงเทรา'];
  
  if (north.includes(prov)) return { region: 'เหนือ', crops: 'กาแฟ, สตรอว์เบอร์รี, ชา, ลำไย, พืชเมืองหนาว', animals: 'หมูดำ, ไก่พื้นเมือง', tour: 'ขึ้นดอยชมหมอก, ไหว้พระทำบุญ, คาเฟ่ชิคๆ, แคมป์ปิ้งป่า' };
  if (south.includes(prov)) return { region: 'ใต้', crops: 'ยางพารา, ปาล์มน้ำมัน, ทุเรียน, ผลไม้', animals: 'สัตว์ทะเล, ประมงชายฝั่ง', tour: 'ดำน้ำดูปะการัง, เที่ยวเกาะ, กินอาหารซีฟู้ดสดๆ' };
  if (northeast.includes(prov)) return { region: 'อีสาน', crops: 'ข้าวหอมมะลิ, มันสำปะหลัง, อ้อย, ยางพารา', animals: 'โคเนื้อ, กระบือ, ไก่ชน', tour: 'ชมอุทยานประวัติศาสตร์, เที่ยวภู, ตามรอยพญานาค' };
  if (east.includes(prov)) return { region: 'ตะวันออก', crops: 'ทุเรียน, มังคุด, เงาะ, ยางพารา', animals: 'ประมงพื้นบ้าน, เลี้ยงกุ้ง', tour: 'ทัวร์กินผลไม้, เที่ยวทะเลใกล้กรุง, ดำน้ำตื้น' };
  if (prov === 'กรุงเทพมหานคร') return { region: 'กลาง', crops: 'ผักสวนครัวชานเมือง, ผักไฮโดรโปนิกส์', animals: 'ปลาสวยงาม, สัตว์เลี้ยง', tour: 'เดินห้างตากแอร์, ไหว้พระวัดดัง, คาเฟ่ฮอปปิ้ง, นั่งเรือด่วน' };
  
  // Default (ภาคกลาง/ตะวันตก)
  return { region: 'กลาง/ทั่วไป', crops: 'ข้าว, อ้อย, ข้าวโพด, ผักสวนครัว, มะม่วง', animals: 'สุกร, ไก่ไข่, โคนม', tour: 'ไหว้พระเก้าวัด, ตลาดน้ำ, คาเฟ่ริมทุ่งนา, ท่องเที่ยวเชิงเกษตร' };
};

export default function AIAssistantPage() {
  const { stations, stationTemps, loading, darkMode, lastUpdateText } = useContext(WeatherContext);
  
  const [selectedProv, setSelectedProv] = useState('');
  const [activeTopic, setActiveTopic] = useState('summary');
  const [isThinking, setIsThinking] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);

  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  const safeStations = stations || [];
  const provinces = [...new Set(safeStations.map(s => extractProvince(s.areaTH)))].sort((a, b) => a.localeCompare(b, 'th'));

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (provinces.length > 0 && !selectedProv) {
      setSelectedProv(provinces.includes('กรุงเทพมหานคร') ? 'กรุงเทพมหานคร' : provinces[0]);
    }
  }, [provinces, selectedProv]);

  // 🌟 ฟังก์ชันแกนสมอง AI (สร้างคำตอบแบบไดนามิก)
  const generateResponse = (topic, prov) => {
    const targetStation = safeStations.find(s => extractProvince(s.areaTH) === prov) || safeStations[0];
    if (!targetStation) return;

    const tObj = stationTemps[targetStation.stationID] || {};
    const pmVal = targetStation.AQILast?.PM25?.value ? Number(targetStation.AQILast.PM25.value) : 0;
    const tempVal = tObj.temp != null ? Math.round(tObj.temp) : 30;
    const heatVal = tObj.feelsLike != null ? Math.round(tObj.feelsLike) : tempVal + 2;
    const rainProb = tObj.rainProb != null ? Math.round(tObj.rainProb) : 0;
    const humidity = tObj.humidity != null ? tObj.humidity : 60;
    const wind = tObj.windSpeed != null ? Math.round(tObj.windSpeed) : 5;

    const know = getProvinceKnowledge(prov);
    const isHot = heatVal >= 38;
    const isRaining = rainProb >= 60;
    const isDusty = pmVal >= 37.5;
    
    let content = [];

    switch(topic) {
      case 'summary':
        content = [
          { title: `🌤️ สรุปภาพรวม ${prov} วันนี้`, text: `อุณหภูมิจริงอยู่ที่ ${tempVal}°C แต่จะรู้สึกร้อนเหมือน ${heatVal}°C (Heat Index) ความชื้นสัมพัทธ์ ${humidity}% และลมพัดด้วยความเร็ว ${wind} km/h` },
          { title: '😷 สถานการณ์ฝุ่น PM2.5', text: isDusty ? `ฝุ่นค่อนข้างสูงที่ ${pmVal} µg/m³ ใครภูมิแพ้กำเริบง่ายควรใส่หน้ากากอนามัยครับ` : `ฝุ่นอยู่ในเกณฑ์ดีเยี่ยม (${pmVal} µg/m³) สููดอากาศได้เต็มปอดเลย!` },
          { title: '☔ โอกาสฝนตก', text: isRaining ? `มีโอกาสเจอฝนสูงถึง ${rainProb}% พกร่มก่อนออกจากบ้านด้วยนะครับ` : `โอกาสฝนตกแค่ ${rainProb}% ท้องฟ้าโปร่งสบาย ซักผ้าตากแดดได้เต็มที่ครับ` }
        ];
        break;

      case 'pm25':
        content = [
          { title: '🔍 เจาะลึกฝุ่น PM2.5', text: `ขณะนี้ค่าฝุ่นในพื้นที่ ${prov} วัดได้ ${pmVal} µg/m³` },
          { title: '🩺 คำแนะนำด้านสุขภาพ', text: isDusty ? 'จัดว่าเริ่มมีผลกระทบต่อสุขภาพ แนะนำให้งดการวิ่งจ๊อกกิ้ง หรือเตะบอลกลางแจ้งไปก่อน เปลี่ยนไปออกกำลังกายในยิมที่มีเครื่องฟอกอากาศจะดีกว่าครับ' : 'คุณภาพอากาศดีมาก เหมาะกับการพาลูกหลานออกไปทำกิจกรรมกลางแจ้ง หรือไปสวนสาธารณะครับ' },
          { title: '💡 AI ทริคเพิ่มเติม', text: wind < 10 && isDusty ? `ลมค่อนข้างนิ่ง (${wind} km/h) ทำให้ฝุ่นไม่ค่อยระบาย แนะนำให้ปิดหน้าต่างห้องและเปิดเครื่องฟอกอากาศนะครับ` : 'ลมพัดดีช่วยระบายอากาศได้ระดับนึงครับ' }
        ];
        break;

      case 'rain':
        content = [
          { title: '⛈️ โอกาสเกิดฝนฟ้าคะนอง', text: `โอกาสฝนตกวันนี้อยู่ที่ ${rainProb}% พร้อมความชื้นในอากาศ ${humidity}%` },
          { title: '👕 แผนการซักผ้าและเดินทาง', text: isRaining ? 'ถ้าจะซักผ้า แนะนำให้อบแห้งหรือตากในร่มครับ ส่วนการเดินทาง ให้เผื่อเวลาไว้เลย รถน่าจะติดแน่นอน' : 'แดดดี ฝนน้อย ตากผ้าแห้งสนิทแน่นอน ล้างรถวันนี้ก็รอดตายครับ!' },
          { title: '🚗 สภาพถนน', text: isRaining ? 'ระวังถนนลื่น และหลีกเลี่ยงเส้นทางที่มีน้ำท่วมขังบ่อยในตัวเมืองด้วยนะครับ' : 'ถนนแห้ง ขับขี่ปลอดภัยครับ แต่อย่าประมาทล่ะ' }
        ];
        break;

      case 'agri':
        content = [
          { title: `🌾 วิเคราะห์การเกษตร (${prov})`, text: `สำหรับพี่น้องเกษตรกรภาค${know.region} ที่ปลูก ${know.crops} และเลี้ยง ${know.animals}` },
          { title: '💧 แผนการรดน้ำ-ให้ปุ๋ย', text: isRaining ? `ความชื้นสูง ${humidity}% และฝน ${rainProb}% งดให้น้ำและงดฉีดพ่นปุ๋ย/ยาทางใบชั่วคราว เพราะฝนจะชะล้างหายหมดครับ ระวังโรคเชื้อราในพืชด้วย` : `ดินน่าจะเริ่มแห้ง แนะนำให้รดน้ำช่วงเช้าตรู่หรือเย็นแดดร่ม เพื่อประหยัดน้ำและพืชดูดซึมได้ดีที่สุดครับ` },
          { title: '🐄 การดูแลสัตว์เลี้ยง', text: isHot ? `ระวังความเครียดจากความร้อน (Heat Stress) ในสัตว์เลี้ยง เพราะ Heat Index ปาไป ${heatVal}°C ควรเปิดพัดลม พ่นละอองน้ำ และเปลี่ยนน้ำดื่มให้สัตว์บ่อยๆ ครับ` : 'สภาพอากาศปกติ สัตว์เลี้ยงกินอาหารได้ตามปกติครับ' }
        ];
        break;

      case 'tour_family':
        content = [
          { title: `🚗 แผนพาน้องเที่ยว ${prov}`, text: `แพลนเที่ยวชิลๆ สไตล์ครอบครัว กับบรรยากาศ ${know.tour}` },
          { title: '📍 กิจกรรมแนะนำวันนี้', text: (isRaining || isHot || isDusty) ? `วันนี้อากาศไม่ค่อยเป็นใจ (ฝุ่น ${pmVal}, ร้อน ${heatVal}°C, ฝน ${rainProb}%) แนะนำให้เที่ยวในร่ม (Indoor) พาเด็กๆ ไปพิพิธภัณฑ์, อควาเรียม หรือเดินห้างชิลๆ ดีกว่าครับ` : `อากาศเป็นใจมาก! พาเด็กๆ ไปปิกนิกที่สวนสาธารณะ หรือลุยที่เที่ยวกลางแจ้งได้เต็มที่เลยครับ` },
          { title: '🎒 เตรียมของลงกระเป๋า', text: isHot ? 'ครีมกันแดด แว่นตา หมวก และกระติกน้ำเย็นๆ ขาดไม่ได้เลยครับ' : (isRaining ? 'เสื้อกันฝน ร่ม และรองเท้าแตะลุยน้ำต้องพร้อมครับ' : 'หน้ากากกันฝุ่น และทิชชู่เปียกพกติดตัวไว้เลยครับ') }
        ];
        break;

      case 'tour_adv':
        content = [
          { title: `⛺ ลุยเดี่ยว/สายลุย (${prov})`, text: `เตรียมตัวให้พร้อมสำหรับทริปสายลุย ภาค${know.region} เสน่ห์อยู่ที่ ${know.tour}` },
          { title: '⚠️ เช็คสภาพอากาศหน้างาน', text: isRaining ? `เตือนเลยครับ! ฝน ${rainProb}% การเดินป่า ดำน้ำ หรือลุยน้ำตกวันนี้ เสี่ยงอันตรายจากน้ำหลากและทางลื่น แนะนำให้เลื่อนทริปโลดโผนออกไปก่อน` : `อากาศผ่านฉลุย! ลม ${wind} km/h กำลังดี ลุยกิจกรรม Outdoor กางเต็นท์ เดินป่า หรือปีนเขาได้สบายครับ` },
          { title: '💡 AI เตือนภัย', text: isHot ? `อากาศร้อนตับแลบ ${heatVal}°C ระวังฮีทสโตรกระหว่างทำกิจกรรม จิบน้ำทุกๆ 15 นาทีนะครับ` : 'ลุยได้เต็มที่ ถ่ายรูปสวยแน่นอน!' }
        ];
        break;

      case 'work':
        content = [
          { title: '🏗️ แนะนำสายลุยไซต์งานก่อสร้าง', text: `สถานการณ์หน้าไซต์งานที่ ${prov} อุณหภูมิ ${tempVal}°C ความชื้น ${humidity}%` },
          { title: '🧱 งานปูน / โครงสร้าง', text: isRaining ? `พักงานเทปูน 100% ครับ ฝนโอกาสตก ${rainProb}% ถ้าเทไปหน้าปูนเสียแน่นอน สลับไปทำงานในร่ม หรือมัดเหล็กแทนดีกว่า` : (isHot ? `แดดจัดมาก ปูนจะเซ็ตตัวไวเกินไปและอาจแตกร้าว ควรบ่มปูนให้ชุ่มชื้นตลอดเวลานะครับ` : 'เทปูน ก่ออิฐ ฉาบปูน ได้ตามแผนครับ') },
          { title: '👷 ความปลอดภัยคนงาน (Safety)', text: isHot ? `Heat Index สูงถึง ${heatVal}°C เสี่ยงฮีทสโตรก! โฟร์แมนควรจัดหาน้ำเย็น เครื่องดื่มเกลือแร่ และให้คนงานสลับพักในที่ร่มทุกๆ 1-2 ชั่วโมงครับ` : (isDusty ? 'ฝุ่นสูง แจกหน้ากาก N95 ให้คนงานด้วยนะครับ เพื่อป้องกันโรคทางเดินหายใจ' : 'อากาศปกติ ลุยงานได้เต็มประสิทธิภาพครับ') }
        ];
        break;

      case 'business':
        content = [
          { title: '🛒 แนะนำแม่ค้า/พ่อค้า', text: `วิเคราะห์ทำเลทองและการค้าขายใน ${prov} ตาม Nowcast!` },
          { title: '🛍️ สินค้าขายดีวันนี้', text: isHot ? `ร้อนปรอทแตกแบบนี้ (ฟีล ${heatVal}°C) ดันสินค้าพวก ชานมเย็น, น้ำแข็งไส, แอร์เคลื่อนที่, ครีมกันแดด ขึ้นหน้าร้านเลยครับ ขายดีชัวร์!` : (isRaining ? `ฝนมาแน่ ${rainProb}% ลูกค้าไม่ออกบ้าน จัดโปรเดลิเวอรี่ลดค่าส่งด่วนๆ หรือขายร่ม เสื้อกันฝน หน้าร้านเลยครับ` : `อากาศเย็นสบายคนเดินตลาดนัดเยอะ จัดเต็มสต๊อกของกิน ของปิ้งย่าง ได้เลยครับ`) },
          { title: '💡 กลยุทธ์เรียกลูกค้า', text: (isRaining || isHot) ? 'ลูกค้าหนีร้อน/หนีฝนเข้าห้าง หรือสั่งออนไลน์เยอะขึ้น เน้นทำการตลาดผ่าน Social Media ยิงแอดวันนี้คุ้มครับ' : 'จัดโปรโมชั่นหน้าร้าน แจกชิม หรือทำกิจกรรมเรียกลูกค้าเดินผ่านไปมาได้เลยครับ' }
        ];
        break;

      default:
        content = [{ title: 'กำลังเรียนรู้', text: 'ข้อมูลส่วนนี้ AI กำลังฝึกฝนเพิ่มเติมครับ...' }];
    }

    setAiResponse({ prov, pmVal, tempVal, heatVal, rainProb, humidity, content });
  };

  const handleTopicChange = (topic) => {
    setActiveTopic(topic);
    setIsThinking(true);
    // หน่วงเวลาจำลอง AI ประมวลผล
    setTimeout(() => {
      generateResponse(topic, selectedProv);
      setIsThinking(false);
    }, 800);
  };

  useEffect(() => {
    if (selectedProv) {
      setIsThinking(true);
      setTimeout(() => {
        generateResponse(activeTopic, selectedProv);
        setIsThinking(false);
      }, 800);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProv]);

  const bgGradient = darkMode ? '#0f172a' : '#f8fafc'; 
  const cardBg = darkMode ? 'rgba(30, 41, 59, 0.95)' : '#ffffff';
  const innerCardBg = darkMode ? 'rgba(0,0,0,0.2)' : '#f1f5f9';
  const textColor = darkMode ? '#f8fafc' : '#0f172a';
  const subTextColor = darkMode ? '#94a3b8' : '#64748b'; 
  const borderColor = darkMode ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0'; 

  const topics = [
    { id: 'summary', icon: '☁️', label: 'สรุปให้ฟังหน่อย' },
    { id: 'pm25', icon: '😷', label: 'ฝุ่นเป็นไงบ้าง' },
    { id: 'rain', icon: '☔', label: 'ฝนตกป่าว' },
    { id: 'tour_family', icon: '👨‍👩‍👧', label: 'พาน้องเที่ยว' },
    { id: 'tour_adv', icon: '🏕️', label: 'สายเที่ยว' },
    { id: 'agri', icon: '🌾', label: 'ทำสวน/เกษตร' },
    { id: 'work', icon: '🏗️', label: 'ลุยไซต์งาน' },
    { id: 'business', icon: '🛒', label: 'ค้าขาย' },
  ];

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', background: bgGradient, color: textColor, fontWeight: 'bold' }}>กำลังโหลดระบบ AI... ⏳</div>;

  return (
    <div style={{ height: '100%', width: '100%', padding: isMobile ? '12px' : '30px', paddingBottom: isMobile ? '100px' : '40px', display: 'flex', flexDirection: 'column', gap: '20px', boxSizing: 'border-box', overflowY: 'auto', background: bgGradient, fontFamily: 'Kanit, sans-serif' }} className="hide-scrollbar">
      
      <style dangerouslySetInlineStyle={{__html: `.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}} />

      {!isMobile && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <h1 style={{ fontSize: '2rem', color: textColor, margin: 0, fontWeight: '800' }}>✨ AI ผู้ช่วยอัจฉริยะ</h1>
            <p style={{ margin: '4px 0 0 0', color: subTextColor, fontSize: '0.9rem' }}>วิเคราะห์สภาพอากาศเชิงลึก ตามบริบทของแต่ละจังหวัด</p>
          </div>
          <div style={{ background: innerCardBg, padding: '6px 12px', borderRadius: '12px', color: subTextColor, fontSize: '0.75rem', fontWeight: 'bold', border: `1px solid ${borderColor}` }}>⏱️ ข้อมูลล่าสุด: {lastUpdateText || '-'}</div>
        </div>
      )}

      {/* 🎛️ ตัวกรองพิกัด */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: cardBg, padding: '12px 20px', borderRadius: '16px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)', flexShrink: 0 }}>
        <span style={{ fontSize: '1.2rem' }}>📍 กรุณาเลือกพื้นที่:</span>
        <select value={selectedProv} onChange={(e) => setSelectedProv(e.target.value)} style={{ flex: 1, background: innerCardBg, color: '#0ea5e9', border: 'none', fontWeight: '900', fontSize: '1.1rem', padding: '10px 15px', borderRadius: '12px', outline: 'none', cursor: 'pointer' }}>
          {provinces.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* 🤖 กล่องสนทนา AI */}
      <div style={{ background: cardBg, borderRadius: '24px', padding: isMobile ? '15px' : '25px', border: `1px solid ${borderColor}`, boxShadow: '0 10px 30px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, minHeight: 0 }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.5rem' }}>🤖</span>
          <h3 style={{ margin: 0, color: textColor, fontSize: '1.1rem' }}>อยากให้ AI ช่วยเรื่องอะไร?</h3>
        </div>

        {/* 🌟 ปุ่มเลือกหมวดหมู่แบบเลื่อนได้ */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px' }} className="hide-scrollbar">
          {topics.map(t => (
            <button 
              key={t.id} onClick={() => handleTopicChange(t.id)}
              style={{ background: activeTopic === t.id ? '#6366f1' : innerCardBg, color: activeTopic === t.id ? '#fff' : subTextColor, border: `1px solid ${activeTopic === t.id ? '#6366f1' : borderColor}`, padding: '10px 18px', borderRadius: '50px', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s', boxShadow: activeTopic === t.id ? '0 4px 15px rgba(99,102,241,0.3)' : 'none', flexShrink: 0 }}>
              <span style={{ marginRight: '6px' }}>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* 📝 พื้นที่แสดงคำตอบ AI */}
        <div style={{ flex: 1, overflowY: 'auto', background: innerCardBg, borderRadius: '20px', padding: isMobile ? '15px' : '25px', border: `1px solid ${borderColor}`, position: 'relative' }} className="hide-scrollbar">
          
          {isThinking ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: subTextColor, gap: '15px' }}>
              <div className="typing-indicator" style={{ display: 'flex', gap: '5px' }}>
                <span style={{ width: '10px', height: '10px', background: '#6366f1', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both' }}></span>
                <span style={{ width: '10px', height: '10px', background: '#6366f1', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.2s' }}></span>
                <span style={{ width: '10px', height: '10px', background: '#6366f1', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.4s' }}></span>
              </div>
              <style dangerouslySetInlineStyle={{__html: `@keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }`}} />
              <p style={{ fontWeight: 'bold' }}>AI กำลังประมวลผลข้อมูลของ {selectedProv}...</p>
            </div>
          ) : (
            aiResponse && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', animation: 'fadeIn 0.5s ease-out' }}>
                <style dangerouslySetInlineStyle={{__html: `@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}} />
                
                {aiResponse.content.map((sec, idx) => (
                  <div key={idx} style={{ background: cardBg, padding: '18px 20px', borderRadius: '16px', border: `1px solid ${borderColor}`, borderLeft: `4px solid #6366f1`, boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
                    <h4 style={{ margin: '0 0 8px 0', color: textColor, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {sec.title}
                    </h4>
                    <p style={{ margin: 0, color: subTextColor, fontSize: '0.95rem', lineHeight: 1.6 }}>
                      {sec.text}
                    </p>
                  </div>
                ))}

              </div>
            )
          )}
        </div>

      </div>

      {/* 📊 Nowcast อ้างอิงด้านล่างสุด */}
      <div style={{ display: 'flex', alignItems: 'center', background: cardBg, padding: '15px 20px', borderRadius: '20px', border: `1px solid ${borderColor}`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)', gap: '15px', flexShrink: 0, overflowX: 'auto' }} className="hide-scrollbar">
         <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: subTextColor, whiteSpace: 'nowrap' }}>อ้างอิง Nowcast:</span>
         {[
           { label: 'PM2.5', val: aiResponse?.pmVal || '-', unit: 'µg/m³', color: '#0ea5e9' },
           { label: 'อุณหภูมิ', val: aiResponse?.tempVal || '-', unit: '°C', color: '#f97316' },
           { label: 'Heat Index', val: aiResponse?.heatVal || '-', unit: '°C', color: '#ef4444' },
           { label: 'โอกาสฝน', val: aiResponse?.rainProb || 0, unit: '%', color: '#3b82f6' },
           { label: 'ความชื้น', val: aiResponse?.humidity || '-', unit: '%', color: '#10b981' }
         ].map((stat, idx) => (
           <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: innerCardBg, padding: '8px 15px', borderRadius: '12px', minWidth: '80px' }}>
             <span style={{ fontSize: '0.7rem', color: subTextColor, fontWeight: 'bold' }}>{stat.label}</span>
             <span style={{ fontSize: '1.1rem', color: stat.color, fontWeight: '900' }}>{stat.val} <span style={{ fontSize: '0.7rem', fontWeight: 'normal' }}>{stat.unit}</span></span>
           </div>
         ))}
      </div>

    </div>
  );
}