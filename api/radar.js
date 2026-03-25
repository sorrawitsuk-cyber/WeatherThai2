// 🌟 เปลี่ยนวิธี Import ให้ตรงกับโครงสร้างใหม่ของแพ็กเกจ
import { Jimp, intToRGBA } from 'jimp';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { lat, lon } = req.body;
  if (!lat || !lon) return res.status(400).json({ error: 'Missing lat/lon' });

  try {
    // 1. ดึงเวลาล่าสุดของเรดาร์
    const rvRes = await fetch('https://api.rainviewer.com/public/weather-maps.json');
    const rvData = await rvRes.json();
    const latestTime = rvData.radar.past[rvData.radar.past.length - 1].time;

    // 2. 🧮 คณิตศาสตร์ขั้นสูง: แปลง GPS ให้เป็น X, Y บนกระดาษแผนที่ (Zoom ระดับ 10)
    const zoom = 10;
    const n = Math.pow(2, zoom);
    const x = (lon + 180) / 360 * n;
    const latRad = lat * Math.PI / 180;
    const y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;

    const tileX = Math.floor(x);
    const tileY = Math.floor(y);
    
    // หาจุด Pixel X,Y แบบเจาะจงในรูปขนาด 256x256 px
    const pixelX = Math.floor((x - tileX) * 256);
    const pixelY = Math.floor((y - tileY) * 256);

    // 3. ไปดูดรูปภาพเรดาร์เฉพาะชิ้นส่วน (Tile) ที่ครอบคลุมพิกัดของคุณมา
    const tileUrl = `https://tilecache.rainviewer.com/v2/radar/${latestTime}/256/${zoom}/${tileX}/${tileY}/2/1_1.png`;

    // 4. 👁️ ใช้ Jimp โหลดรูปและ "อ่านค่าสี" ของพิกเซลนั้น! (ใช้คำสั่งรูปแบบใหม่)
    const image = await Jimp.read(tileUrl);
    const hexColor = image.getPixelColor(pixelX, pixelY);
    const rgba = intToRGBA(hexColor); // แปลงเป็นสี R G B A

    // 5. วิเคราะห์สีเพื่อบอกความรุนแรง (Computer Vision)
    let intensity = "🌤️ ไม่มีฝนในพื้นที่นี้";
    let alertLevel = 0;

    // ถ้าค่า A (Alpha) มากกว่า 0 แปลว่าตรงนั้นมีสีของเมฆฝนระบายอยู่!
    if (rgba.a > 0) {
        if (rgba.r > 200 && rgba.g < 100) { 
            intensity = "🚨 ฝนตกหนักมาก! (กลุ่มฝนสีแดง/ม่วง)"; alertLevel = 3;
        } else if (rgba.r > 200 && rgba.g > 150) { 
            intensity = "🌧️ ฝนตกปานกลาง (กลุ่มฝนสีเหลือง/ส้ม)"; alertLevel = 2;
        } else { 
            intensity = "🌦️ ฝนตกเล็กน้อยถึงปรอยๆ (กลุ่มฝนสีฟ้า/เขียว)"; alertLevel = 1;
        }
    }

    // ส่งผลลัพธ์กลับไปให้หน้าเว็บ
    return res.status(200).json({
      radarTime: new Date(latestTime * 1000).toLocaleString('th-TH'),
      targetPixel: `X:${pixelX}, Y:${pixelY}`,
      detectedColor: `R:${rgba.r} G:${rgba.g} B:${rgba.b} A:${rgba.a}`,
      intensity: intensity,
      alertLevel: alertLevel,
      imageUrl: tileUrl
    });

  } catch (error) {
    console.error("Radar Scanner Error:", error);
    return res.status(500).json({ error: error.message });
  }
}