// src/utils/helpers.js

// ==============================================================
// 1. ฟังก์ชันคำนวณสีและข้อความ
// ==============================================================
export const getPM25Color = (value) => {
  if (value == null || isNaN(value)) return '#cccccc';
  if (value > 250) return '#7e0023'; 
  if (value > 150) return '#8f3f97'; 
  if (value > 55) return '#ff0000';  
  if (value > 35) return '#ff7e00';  
  if (value > 15) return '#ffff00';  
  return '#00e400';                  
};

export const getPM25HealthAdvice = (val) => { const v=Number(val); return isNaN(v)||v===0?null:v<=25?{text:"อากาศดีเยี่ยม เหมาะกับการทำกิจกรรมกลางแจ้ง",icon:"🏃‍♂️"}:v<=37.5?{text:"ประชาชนทั่วไปทำกิจกรรมได้ปกติ",icon:"🚶‍♀️"}:v<=75?{text:"ลดระยะเวลาการทำกิจกรรมกลางแจ้ง (หน้ากาก N95)",icon:"😷"}:{text:"งดกิจกรรมกลางแจ้งเด็ดขาด",icon:"🚨"}; };

export const getTempColor = (val) => { return (isNaN(val)||val===null)?{bg:'#ccc',text:'#333',bar:'#ccc'}:val<27?{bg:'#3498db',text:'#fff',bar:'#3498db'}:val<=32?{bg:'#2ecc71',text:'#222',bar:'#2ecc71'}:val<=35?{bg:'#f1c40f',text:'#222',bar:'#f1c40f'}:val<=38?{bg:'#e67e22',text:'#fff',bar:'#e67e22'}:{bg:'#e74c3c',text:'#fff',bar:'#e74c3c'}; };

export const getHeatIndexAlert = (val) => { return (isNaN(val)||val===null)?{text:'ไม่มีข้อมูล',color:'#666',bg:'#eee',bar:'#ccc',icon:'❓'}:val>=52?{text:'อันตรายมาก (เสี่ยงฮีทสโตรกสูง)',color:'#dc2626',bg:'#fee2e2',bar:'#ef4444',icon:'🚨'}:val>=42?{text:'อันตราย (หลีกเลี่ยงกลางแจ้ง)',color:'#ea580c',bg:'#ffedd5',bar:'#f97316',icon:'🥵'}:val>=33?{text:'เตือนภัย (ลดกิจกรรมกลางแจ้ง)',color:'#ca8a04',bg:'#fef9c3',bar:'#eab308',icon:'😰'}:val>=27?{text:'เฝ้าระวัง (ดูแลสุขภาพทั่วไป)',color:'#16a34a',bg:'#dcfce7',bar:'#22c55e',icon:'😅'}:{text:'ปกติ',color:'#0284c7',bg:'#e0f2fe',bar:'#3b82f6',icon:'😊'}; };

export const getHeatHealthAdvice = (val) => { return (isNaN(val)||val===null)?null:val>=52?{text:"งดกิจกรรมกลางแจ้งเด็ดขาด (Heat Stroke)",icon:"🚑"}:val>=42?{text:"หลีกเลี่ยงกิจกรรมกลางแจ้งเป็นเวลานาน",icon:"⛔"}:val>=33?{text:"ลดระยะเวลากิจกรรม ดื่มน้ำให้เพียงพอ",icon:"💧"}:val>=27?{text:"อากาศเริ่มร้อน ดูแลสุขภาพทั่วไป",icon:"🥤"}:null; };

export const getUvColor = (val) => { return (isNaN(val)||val===null)?{bg:'#ccc',text:'#333',bar:'#ccc',label:'ไม่มีข้อมูล'}:val<=2?{bg:'#2ecc71',text:'#fff',bar:'#2ecc71',label:'ต่ำ'}:val<=5?{bg:'#f1c40f',text:'#222',bar:'#f1c40f',label:'ปานกลาง'}:val<=7?{bg:'#e67e22',text:'#fff',bar:'#e67e22',label:'สูง'}:val<=10?{bg:'#e74c3c',text:'#fff',bar:'#e74c3c',label:'สูงมาก'}:{bg:'#9b59b6',text:'#fff',bar:'#9b59b6',label:'อันตราย'}; };

export const getUvHealthAdvice = (val) => { return (isNaN(val)||val===null)?null:val>10?{text:"หลีกเลี่ยงการออกแดดเด็ดขาด ผิวหนังและดวงตาอาจไหม้ได้",icon:"⛔"}:val>=8?{text:"ควรอยู่ในที่ร่ม หากต้องออกแดดต้องทากันแดด SPF50+",icon:"☂️"}:val>=6?{text:"ควรทาครีมกันแดด สวมหมวก หรือกางร่มเมื่อออกแดด",icon:"🧢"}:null; };

export const getRainColor = (val) => { return (isNaN(val)||val===null)?{bg:'#ccc',text:'#333',bar:'#ccc',label:'ไม่มีข้อมูล'}:val===0?{bg:'#95a5a6',text:'#fff',bar:'#95a5a6',label:'ไม่มีฝน'}:val<=30?{bg:'#74b9ff',text:'#222',bar:'#74b9ff',label:'โอกาสต่ำ'}:val<=60?{bg:'#0984e3',text:'#fff',bar:'#0984e3',label:'ปานกลาง'}:val<=80?{bg:'#273c75',text:'#fff',bar:'#273c75',label:'โอกาสสูง'}:{bg:'#192a56',text:'#fff',bar:'#192a56',label:'โอกาสสูงมาก'}; };

export const getWindColor = (val) => { return (isNaN(val)||val===null)?{bg:'#ccc',text:'#333',bar:'#ccc',label:'ไม่มีข้อมูล'}:val<=10?{bg:'#00b0f0',text:'#fff',bar:'#00b0f0',label:'ลมอ่อน'}:val<=25?{bg:'#2ecc71',text:'#fff',bar:'#2ecc71',label:'ลมปานกลาง'}:val<=40?{bg:'#f1c40f',text:'#222',bar:'#f1c40f',label:'ลมแรง'}:val<=60?{bg:'#e67e22',text:'#fff',bar:'#e67e22',label:'ลมแรงมาก'}:{bg:'#e74c3c',text:'#fff',bar:'#e74c3c',label:'พายุ'}; };

export const getWeatherIcon = (c) => { if(c===undefined||c===null)return{icon:'❓',text:'ไม่ทราบ'}; if(c===0)return{icon:'☀️',text:'แจ่มใส'}; if(c===1)return{icon:'🌤️',text:'มีเมฆบางส่วน'}; if(c===2)return{icon:'⛅',text:'มีเมฆ'}; if(c===3)return{icon:'☁️',text:'มีเมฆมาก'}; if([45,48].includes(c))return{icon:'🌫️',text:'มีหมอก'}; if([51,53,55,56,57].includes(c))return{icon:'🌧️',text:'ฝนปรอย'}; if([61,63,65,66,67].includes(c))return{icon:'🌧️',text:'ฝนตก'}; if([71,73,75,77,85,86].includes(c))return{icon:'❄️',text:'หิมะ'}; if([80,81,82].includes(c))return{icon:'🌦️',text:'ฝนตกหย่อมๆ'}; if([95,96,99].includes(c))return{icon:'⛈️',text:'พายุฝน'}; return{icon:'🌤️',text:'ปกติ'}; };

// ==============================================================
// 2. ข้อมูลคงที่ (Constants) และฟังก์ชันจัดการพื้นที่
// ==============================================================
export const regionMapping = { "ภาคเหนือ": ["เชียงใหม่", "เชียงราย", "แพร่", "น่าน", "พะเยา", "ลำปาง", "ลำพูน", "แม่ฮ่องสอน", "อุตรดิตถ์"], "ภาคตะวันออกเฉียงเหนือ": ["กาฬสินธุ์", "ขอนแก่น", "ชัยภูมิ", "นครพนม", "นครราชสีมา", "บึงกาฬ", "บุรีรัมย์", "มหาสารคาม", "มุกดาหาร", "ยโสธร", "ร้อยเอ็ด", "เลย", "สกลนคร", "สุรินทร์", "ศรีสะเกษ", "หนองคาย", "หนองบัวลำภู", "อุดรธานี", "อุบลราชธานี", "อำนาจเจริญ"], "ภาคกลาง": ["กรุงเทพมหานคร", "กำแพงเพชร", "ชัยนาท", "นครนายก", "นครปฐม", "นครสวรรค์", "นนทบุรี", "ปทุมธานี", "พระนครศรีอยุธยา", "พิจิตร", "พิษณุโลก", "เพชรบูรณ์", "ลพบุรี", "สมุทรปราการ", "สมุทรสงคราม", "สมุทรสาคร", "สิงห์บุรี", "สุโขทัย", "สุพรรณบุรี", "สระบุรี", "อ่างทอง", "อุทัยธานี"], "ภาคตะวันออก": ["จันทบุรี", "ฉะเชิงเทรา", "ชลบุรี", "ตราด", "ปราจีนบุรี", "ระยอง", "สระแก้ว"], "ภาคตะวันตก": ["กาญจนบุรี", "ตาก", "ประจวบคีรีขันธ์", "เพชรบุรี", "ราชบุรี"], "ภาคใต้": ["กระบี่", "ชุมพร", "ตรัง", "นครศรีธรรมราช", "นราธิวาส", "ปัตตานี", "พังงา", "พัทลุง", "ภูเก็ต", "ระนอง", "สตูล", "สงขลา", "สุราษฎร์ธานี", "ยะลา"] };

export const thaiProvinces = Object.values(regionMapping).flat();

export const getRegion = (province) => { for (const [region, provinces] of Object.entries(regionMapping)) { if (provinces.includes(province)) return region; } return "อื่นๆ"; };

export const extractProvince = (area) => { if(!area) return 'ไม่ระบุ'; if (area.includes('กรุงเทพ') || area.includes('กทม')) return 'กรุงเทพมหานคร'; for (let i = 0; i < thaiProvinces.length; i++) { if (area.includes(thaiProvinces[i])) return thaiProvinces[i]; } if (area.includes('เขต')) return 'กรุงเทพมหานคร'; let p = area.includes(',') ? area.split(',').pop() : area.trim().split(/\s+/).pop(); p = p.trim().replace(/^(จ\.|จังหวัด)/, '').trim(); if (p.includes('จ.')) p = p.split('จ.').pop().trim(); return p; };

// 🌟 ฟังก์ชันใหม่! สำหรับจัดรูปแบบชื่อให้ออกมาเป็น "จังหวัด... อำเภอ... ตำบล..." ไม่มีซ้ำซ้อน
export const formatLocationName = (areaTH) => {
  if (!areaTH) return 'ไม่ระบุพื้นที่';
  
  // 1. แยกด้วยลูกน้ำ
  let parts = areaTH.split(',').map(p => p.trim());
  
  // 2. สลับตำแหน่งให้ จังหวัด ขึ้นก่อน (ปกติ Air4Thai จะให้ ตำบล, อำเภอ, จังหวัด)
  if (parts.length > 1) {
    parts.reverse();
  }
  
  // 3. รวมเป็นข้อความเดียว
  let result = parts.join(' ');
  
  // 4. แปลงคำย่อเป็นคำเต็ม 
  result = result.replace(/จ\./g, 'จังหวัด');
  result = result.replace(/อ\./g, 'อำเภอ');
  result = result.replace(/ต\./g, 'ตำบล');
  result = result.replace(/กรุงเทพฯ/g, 'กรุงเทพมหานคร');
  
  // 5. ลบคำซ้ำซ้อน (เพื่อแก้ปัญหา จ.จังหวัด หรือ จังหวัดจังหวัด)
  result = result.replace(/จังหวัดจังหวัด/g, 'จังหวัด');
  result = result.replace(/จังหวัด\s*จังหวัด/g, 'จังหวัด');
  result = result.replace(/อำเภออำเภอ/g, 'อำเภอ');
  result = result.replace(/ตำบลตำบล/g, 'ตำบล');
  
  // 6. เคลียร์ช่องว่างส่วนเกิน
  result = result.replace(/\s+/g, ' ').trim();

  return result;
};

export const legendData = {
  pm25: { title: 'ระดับ PM2.5', items: [{color:'#00b0f0',label:'0-15.0 (ดีมาก)'},{color:'#92d050',label:'15.1-25.0 (ดี)'},{color:'#ffff00',label:'25.1-37.5 (ปานกลาง)'},{color:'#ffc000',label:'37.6-75.0 (เริ่มมีผลกระทบ)'},{color:'#ff0000',label:'> 75.0 (มีผลกระทบ)'}] },
  temp: { title: 'อุณหภูมิ', items: [{color:'#3498db',label:'< 27 (เย็นสบาย)'},{color:'#2ecc71',label:'27-32 (ปกติ)'},{color:'#f1c40f',label:'33-35 (ร้อน)'},{color:'#e67e22',label:'36-38 (ร้อนมาก)'},{color:'#e74c3c',label:'> 38 (ร้อนจัด)'}] },
  heat: { title: 'ดัชนีความร้อน', items: [{color:'#3b82f6',label:'< 27.0 (ปกติ)'},{color:'#22c55e',label:'27.0-32.9 (เฝ้าระวัง)'},{color:'#eab308',label:'33.0-41.9 (เตือนภัย)'},{color:'#f97316',label:'42.0-51.9 (อันตราย)'},{color:'#ef4444',label:'≥ 52.0 (อันตรายมาก)'}] },
  uv: { title: 'รังสี UV สูงสุด', items: [{color:'#2ecc71',label:'0-2 (ต่ำ)'},{color:'#f1c40f',label:'3-5 (ปานกลาง)'},{color:'#e67e22',label:'6-7 (สูง)'},{color:'#e74c3c',label:'8-10 (สูงมาก)'},{color:'#9b59b6',label:'> 10 (อันตราย)'}] },
  rain: { title: 'โอกาสเกิดฝน', items: [{color:'#95a5a6',label:'0 (ไม่มีฝน)'},{color:'#74b9ff',label:'1-30 (โอกาสต่ำ)'},{color:'#0984e3',label:'31-60 (ปานกลาง)'},{color:'#273c75',label:'61-80 (โอกาสสูง)'},{color:'#192a56',label:'> 80 (ตกหนัก)'}] },
  wind: { title: 'ความเร็วลม', items: [{color:'#00b0f0',label:'0-10 (ลมอ่อน)'},{color:'#2ecc71',label:'11-25 (ลมปานกลาง)'},{color:'#f1c40f',label:'26-40 (ลมแรง)'},{color:'#e67e22',label:'41-60 (ลมแรงมาก)'},{color:'#e74c3c',label:'> 60 (พายุ)'}] },
  hotspot: { title: 'ดาวเทียม NASA', items: [{color:'#ef4444',label:'จุดความร้อน (ไฟป่า/การเผา)'}] }
};

export const chartConfigs = { 
  pm25: { key: 'pm25', name: 'PM2.5', color: '#f59e0b', domain: [0, max => Math.max(100, Math.ceil(max))] }, 
  temp: { key: 'temp', keyLY: 'tempLY', name: 'อุณหภูมิสูงสุด', color: '#ef4444', hasLY: true, domain: [min => Math.min(20, Math.floor(min)), max => Math.max(45, Math.ceil(max))] }, 
  heat: { key: 'heat', keyLY: 'heatLY', name: 'Heat Index สูงสุด', color: '#ea580c', hasLY: true, domain: [min => Math.min(25, Math.floor(min)), max => Math.max(55, Math.ceil(max))] }, 
  uv: { key: 'uv', keyLY: null, name: 'รังสี UV สูงสุด', color: '#a855f7', domain: [0, max => Math.max(12, Math.ceil(max))] }, 
  rain: { key: 'rain', keyLY: 'rainLY', name: 'ปริมาณฝนสะสม', color: '#3b82f6', hasLY: true, domain: [0, max => Math.max(20, Math.ceil(max))] }, 
  wind: { key: 'wind', keyLY: 'windLY', name: 'ความเร็วลมสูงสุด', color: '#64748b', hasLY: true, domain: [0, max => Math.max(40, Math.ceil(max))] },
  hotspot: { key: 'pm25', name: 'จุดความร้อน (Hot spot)', color: '#ef4444', domain: [0, 500] }
};

// ==============================================================
// 3. ฟังก์ชันคำนวณระยะทางพิกัด (GPS)
// ==============================================================
export const deg2rad = (deg) => { return deg * (Math.PI/180); };

export const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => { 
  var R = 6371; 
  var dLat = deg2rad(lat2-lat1); 
  var dLon = deg2rad(lon2-lon1); 
  var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; 
};