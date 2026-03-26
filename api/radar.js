import { Jimp, intToRGBA } from 'jimp';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { lat, lon } = req.body;
  if (!lat || !lon) return res.status(400).json({ error: 'Missing lat/lon' });

  try {
    const rvRes = await fetch('https://api.rainviewer.com/public/weather-maps.json');
    const rvData = await rvRes.json();
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

    let intensity = "🌤️ ไม่พบกลุ่มฝนปกคลุมในพื้นที่ (สภาพอากาศปกติ)";
    let alertLevel = 0;

    if (rgba.a > 0) {
        if (rgba.r > 200 && rgba.g < 100) { 
            intensity = "🚨 ตรวจพบกลุ่มฝนกำลังแรง (มีแนวโน้มฝนตกหนักถึงหนักมาก)"; alertLevel = 3;
        } else if (rgba.r > 200 && rgba.g > 150) { 
            intensity = "🌧️ ตรวจพบกลุ่มฝนกำลังปานกลาง"; alertLevel = 2;
        } else { 
            intensity = "🌦️ ตรวจพบกลุ่มฝนกำลังอ่อน (ฝนตกเล็กน้อยถึงปรอยๆ)"; alertLevel = 1;
        }
    }

    return res.status(200).json({
      radarTime: new Date(latestTime * 1000).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
      intensity: intensity,
      alertLevel: alertLevel
    });

  } catch (error) {
    console.error("Radar Scanner Error:", error);
    return res.status(500).json({ error: error.message });
  }
}