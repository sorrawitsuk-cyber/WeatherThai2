import { Jimp, intToRGBA } from 'jimp';

// ฟังก์ชันแปลงองศาลม เป็นทิศทางที่คนเข้าใจง่าย
const getWindDirectionText = (degree) => {
    if (degree === undefined || degree === null) return '';
    if (degree >= 337.5 || degree < 22.5) return 'เหนือ';
    if (degree >= 22.5 && degree < 67.5) return 'ตะวันออกเฉียงเหนือ';
    if (degree >= 67.5 && degree < 112.5) return 'ตะวันออก';
    if (degree >= 112.5 && degree < 157.5) return 'ตะวันออกเฉียงใต้';
    if (degree >= 157.5 && degree < 202.5) return 'ใต้';
    if (degree >= 202.5 && degree < 247.5) return 'ตะวันตกเฉียงใต้';
    if (degree >= 247.5 && degree < 292.5) return 'ตะวันตก';
    if (degree >= 292.5 && degree < 337.5) return 'ตะวันตกเฉียงเหนือ';
    return '';
};

// 🌟 ใหม่: ฟังก์ชันแปลงพิกัด GPS เป็นชื่อ เขต/อำเภอ ภาษาไทย
const getLocationName = async (lat, lon) => {
    try {
        const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=th`;
        const res = await fetch(url);
        const data = await res.json();
        if (data && (data.locality || data.city)) {
            let locality = data.locality || '';
            let city = data.city || '';
            // กรองคำซ้ำให้ดูสวยงาม
            if (locality && !locality.includes('เขต') && !locality.includes('อำเภอ')) {
                locality = city.includes('กรุงเทพ') ? `เขต${locality}` : `อ.${locality}`;
            }
            return `${locality} ${city}`.trim();
        }
        return null;
    } catch (e) {
        return null;
    }
};

// 🌟 ใหม่: สมการคณิตศาสตร์ (Haversine) คำนวณหาพิกัดในอีก 30 นาทีข้างหน้า
const calculateFutureLocation = (lat, lon, windDir, windSpeedKmH) => {
    const R = 6371; // รัศมีโลก (กิโลเมตร)
    const distance = windSpeedKmH * 0.5; // ระยะทางที่เคลื่อนที่ใน 30 นาที (0.5 ชั่วโมง)
    const bearing = (windDir + 180) % 360; // ทิศที่พายุจะไป (ตรงข้ามกับทิศที่ลมพัดมา)
    
    const brng = bearing * Math.PI / 180;
    const lat1 = lat * Math.PI / 180;
    const lon1 = lon * Math.PI / 180;

    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(distance/R) + Math.cos(lat1) * Math.sin(distance/R) * Math.cos(brng));
    const lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(distance/R) * Math.cos(lat1), Math.cos(distance/R) - Math.sin(lat1) * Math.sin(lat2));

    return { lat: lat2 * 180 / Math.PI, lon: lon2 * 180 / Math.PI, moveDir: bearing };
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { lat, lon, windDir, windSpeed } = req.body;
  if (!lat || !lon) return res.status(400).json({ error: 'Missing lat/lon' });

  try {
    const rvDataRes = await fetch('https://api.rainviewer.com/public/weather-maps.json');
    const rvData = await rvDataRes.json();
    const latestTime = rvData.radar.past[rvData.radar.past.length - 1].time;

    const zoom = 10;
    const n = Math.pow(2, zoom);
    const x = (lon + 180) / 360 * n;
    const latRad = lat * Math.PI / 180;
    const y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;

    const tileX = Math.floor(x);
    const tileY = Math.floor(y);
    
    const pixelX = Math.floor((x - tileX) * 256);
    const pixelY = Math.floor((y - tileY) * 256);

    const tileUrl = `https://tilecache.rainviewer.com/v2/radar/${latestTime}/256/${zoom}/${tileX}/${tileY}/2/1_1.png`;

    const image = await Jimp.read(tileUrl);
    const hexColor = image.getPixelColor(pixelX, pixelY);
    const rgba = intToRGBA(hexColor); 

    let alertLevel = 0;

    // 🌟 แก้บั๊ก "ฝนทิพย์": บังคับความเข้มสี (Alpha > 50) กรองเมฆจางๆ ทิ้ง
    if (rgba.a > 50) {
        if (rgba.r > 200 && rgba.g < 100) { 
            alertLevel = 3; // แดง/ม่วง = หนักมาก
        } else if (rgba.r > 150 && rgba.g > 150) { 
            alertLevel = 2; // เหลือง/ส้ม = ปานกลาง
        } else if (rgba.a > 80) { 
            alertLevel = 1; // ฟ้า/เขียวเข้ม = ปรอยๆ
        }
    }

    let windText = '';
    let targetDistrict = await getLocationName(lat, lon); // ดึงชื่อเขตปัจจุบัน

    if (alertLevel > 0) {
        if (windSpeed > 3 && windDir !== undefined) {
            const futureLoc = calculateFutureLocation(lat, lon, windDir, windSpeed);
            const futureDistrict = await getLocationName(futureLoc.lat, futureLoc.lon);
            const moveDirText = getWindDirectionText(futureLoc.moveDir);
            
            const destText = futureDistrict ? `มุ่งหน้าเข้าสู่พื้นที่ [${futureDistrict}]` : 'เคลื่อนตัวออกนอกพื้นที่';
            windText = `กลุ่มฝนมีแนวโน้มเคลื่อนตัวไปทางทิศ${moveDirText} (ความเร็ว ${windSpeed} กม./ชม.) คาดว่าจะ${destText} ในอีก 30 นาทีข้างหน้า`;
        } else {
            windText = 'สภาพลมค่อนข้างสงบ กลุ่มฝนมีแนวโน้มแช่ตัวและตกสะสมอยู่ในพื้นที่เดิมครับ';
        }
    }

    return res.status(200).json({
      radarTime: new Date(latestTime * 1000).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' }),
      alertLevel: alertLevel,
      windText: windText,
      currentLocName: targetDistrict
    });

  } catch (error) {
    console.error("Radar Scanner Error:", error);
    return res.status(500).json({ error: error.message });
  }
}