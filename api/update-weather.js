import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDQVebX5jO-iE2RB8bBVQMkQ8ETd7oZfoc",
  authDomain: "thai-env-dashboard.firebaseapp.com",
  projectId: "thai-env-dashboard",
  storageBucket: "thai-env-dashboard.firebasestorage.app",
  messagingSenderId: "124321790987",
  appId: "1:124321790987:web:7d2a66971e146cc13a1b0e",
  measurementId: "G-1JF3FBYCTC"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const provinces77 = [
  { n: 'กรุงเทพมหานคร', lat: 13.75, lon: 100.51 }, { n: 'สมุทรปราการ', lat: 13.60, lon: 100.60 }, { n: 'นนทบุรี', lat: 13.86, lon: 100.52 }, { n: 'ปทุมธานี', lat: 14.02, lon: 100.53 }, { n: 'พระนครศรีอยุธยา', lat: 14.35, lon: 100.57 }, { n: 'อ่างทอง', lat: 14.59, lon: 100.45 }, { n: 'ลพบุรี', lat: 14.80, lon: 100.61 }, { n: 'สิงห์บุรี', lat: 14.89, lon: 100.40 }, { n: 'ชัยนาท', lat: 15.18, lon: 100.12 }, { n: 'สระบุรี', lat: 14.53, lon: 100.91 },
  { n: 'ชลบุรี', lat: 13.36, lon: 100.98 }, { n: 'ระยอง', lat: 12.68, lon: 101.27 }, { n: 'จันทบุรี', lat: 12.61, lon: 102.10 }, { n: 'ตราด', lat: 12.24, lon: 102.51 }, { n: 'ฉะเชิงเทรา', lat: 13.69, lon: 101.07 }, { n: 'ปราจีนบุรี', lat: 14.05, lon: 101.37 }, { n: 'นครนายก', lat: 14.20, lon: 101.21 }, { n: 'สระแก้ว', lat: 13.82, lon: 102.06 },
  { n: 'นครราชสีมา', lat: 14.97, lon: 102.10 }, { n: 'บุรีรัมย์', lat: 14.99, lon: 103.10 }, { n: 'สุรินทร์', lat: 14.88, lon: 103.49 }, { n: 'ศรีสะเกษ', lat: 15.11, lon: 104.32 }, { n: 'อุบลราชธานี', lat: 15.24, lon: 104.84 }, { n: 'ยโสธร', lat: 15.79, lon: 104.14 }, { n: 'ชัยภูมิ', lat: 15.80, lon: 102.03 }, { n: 'อำนาจเจริญ', lat: 15.86, lon: 104.62 }, { n: 'บึงกาฬ', lat: 18.36, lon: 103.65 }, { n: 'หนองบัวลำภู', lat: 17.20, lon: 102.44 }, { n: 'ขอนแก่น', lat: 16.43, lon: 102.83 }, { n: 'อุดรธานี', lat: 17.41, lon: 102.78 }, { n: 'เลย', lat: 17.48, lon: 101.72 }, { n: 'หนองคาย', lat: 17.87, lon: 102.74 }, { n: 'มหาสารคาม', lat: 16.18, lon: 103.30 }, { n: 'ร้อยเอ็ด', lat: 16.05, lon: 103.65 }, { n: 'กาฬสินธุ์', lat: 16.43, lon: 103.50 }, { n: 'สกลนคร', lat: 17.16, lon: 104.14 }, { n: 'นครพนม', lat: 17.40, lon: 104.78 }, { n: 'มุกดาหาร', lat: 16.54, lon: 104.72 },
  { n: 'เชียงใหม่', lat: 18.78, lon: 98.98 }, { n: 'ลำพูน', lat: 18.57, lon: 99.01 }, { n: 'ลำปาง', lat: 18.28, lon: 99.49 }, { n: 'อุตรดิตถ์', lat: 17.62, lon: 100.09 }, { n: 'แพร่', lat: 18.14, lon: 100.14 }, { n: 'น่าน', lat: 18.78, lon: 100.77 }, { n: 'พะเยา', lat: 19.16, lon: 99.90 }, { n: 'เชียงราย', lat: 19.91, lon: 99.83 }, { n: 'แม่ฮ่องสอน', lat: 19.30, lon: 97.96 },
  { n: 'นครสวรรค์', lat: 15.70, lon: 100.13 }, { n: 'อุทัยธานี', lat: 15.38, lon: 100.02 }, { n: 'กำแพงเพชร', lat: 16.48, lon: 99.52 }, { n: 'ตาก', lat: 16.88, lon: 99.12 }, { n: 'สุโขทัย', lat: 17.00, lon: 99.82 }, { n: 'พิษณุโลก', lat: 16.82, lon: 100.26 }, { n: 'พิจิตร', lat: 16.44, lon: 100.34 }, { n: 'เพชรบูรณ์', lat: 16.41, lon: 101.15 },
  { n: 'ราชบุรี', lat: 13.52, lon: 99.81 }, { n: 'กาญจนบุรี', lat: 14.00, lon: 99.53 }, { n: 'สุพรรณบุรี', lat: 14.47, lon: 100.11 }, { n: 'นครปฐม', lat: 13.81, lon: 100.04 }, { n: 'สมุทรสาคร', lat: 13.54, lon: 100.27 }, { n: 'สมุทรสงคราม', lat: 13.41, lon: 99.99 }, { n: 'เพชรบุรี', lat: 13.11, lon: 99.94 }, { n: 'ประจวบคีรีขันธ์', lat: 11.81, lon: 99.79 },
  { n: 'นครศรีธรรมราช', lat: 8.43, lon: 99.96 }, { n: 'กระบี่', lat: 8.05, lon: 98.91 }, { n: 'พังงา', lat: 8.45, lon: 98.52 }, { n: 'ภูเก็ต', lat: 7.88, lon: 98.39 }, { n: 'สุราษฎร์ธานี', lat: 9.13, lon: 99.32 }, { n: 'ระนอง', lat: 9.96, lon: 98.63 }, { n: 'ชุมพร', lat: 10.49, lon: 99.18 }, { n: 'สงขลา', lat: 7.18, lon: 100.59 }, { n: 'สตูล', lat: 6.62, lon: 100.06 }, { n: 'ตรัง', lat: 7.55, lon: 99.61 }, { n: 'พัทลุง', lat: 7.61, lon: 100.07 }, { n: 'ปัตตานี', lat: 6.86, lon: 101.25 }, { n: 'ยะลา', lat: 6.54, lon: 101.28 }, { n: 'นราธิวาส', lat: 6.42, lon: 101.82 }
];

export default async function handler(req, res) {
  try {
    // 🌟 มัดรวม 77 จังหวัดเข้าด้วยกัน
    const lats = provinces77.map(p => p.lat).join(',');
    const lons = provinces77.map(p => p.lon).join(',');

    const wUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m&timezone=Asia%2FBangkok`;
    const aUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lats}&longitude=${lons}&current=pm2_5&timezone=Asia%2FBangkok`;

    // 1. ดึงข้อมูลสภาพอากาศรวดเดียว 77 จุด
    const wRes = await fetch(wUrl);
    if (!wRes.ok) {
        const errText = await wRes.text();
        throw new Error(`Weather Error [${wRes.status}]: ${errText.substring(0, 50)}`);
    }
    const wJson = await wRes.json();
    const wDataArray = Array.isArray(wJson) ? wJson : [wJson];

    // 2. ดึงข้อมูลฝุ่นรวดเดียว 77 จุด
    const aRes = await fetch(aUrl);
    if (!aRes.ok) {
        const errText = await aRes.text();
        throw new Error(`AQI Error [${aRes.status}]: ${errText.substring(0, 50)}`);
    }
    const aJson = await aRes.json();
    const aDataArray = Array.isArray(aJson) ? aJson : [aJson];

    // 3. นำข้อมูลมาประกอบร่าง
    const realStations = [];
    const temps = {};

    provinces77.forEach((p, idx) => {
      const w = wDataArray[idx]?.current || {};
      const a = aDataArray[idx]?.current || {};
      const sID = `PROV_${idx}`;
      
      realStations.push({ 
          stationID: sID, areaTH: p.n, lat: p.lat, long: p.lon, 
          AQILast: { PM25: { value: Math.round(a.pm2_5 || 0) } } 
      });
      
      temps[sID] = { 
          temp: Math.round(w.temperature_2m || 0), 
          feelsLike: Math.round(w.apparent_temperature || 0), 
          humidity: Math.round(w.relative_humidity_2m || 0), 
          rainProb: Math.round(w.precipitation || 0), 
          windSpeed: Math.round(w.wind_speed_10m || 0) 
      };
    });

    // 4. บันทึกเข้า Firebase
    const updateTime = new Date().toISOString();
    await setDoc(doc(db, "weather_cache", "thailand77"), {
      stations: realStations,
      stationTemps: temps,
      lastUpdated: updateTime
    });

    res.status(200).json({ success: true, message: "1-Shot Update Success! No more timeout.", lastUpdated: updateTime });
  } catch (error) {
    console.error("1-Shot Fetch Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}