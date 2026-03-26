import { Jimp, intToRGBA } from 'jimp';

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

const getLocationName = async (lat, lon) => {
    try {
        const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=th`;
        const res = await fetch(url);
        const data = await res.json();
        if (data) {
            let area = data.city || data.locality || '';
            let province = data.principalSubdivision || '';
            if (area.includes('แขวง')) area = data.city ? data.city : area.replace(/แขวง/g, '');
            area = area.replace(/แขวง/g, '').trim();
            if (area && !area.includes('เขต') && !area.includes('อำเภอ')) {
                area = (province.includes('กรุงเทพ') || province === 'Bangkok') ? `เขต${area}` : `อ.${area}`;
            }
            area = area.replace('เขตเขต', 'เขต').replace('อ.อ.', 'อ.');
            return `${area} ${province}`.trim();
        }
        return null;
    } catch (e) { return null; }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { lat, lon, windDir, windSpeed } = req.body;
  if (!lat || !lon) return res.status(400).json({ error: 'Missing lat/lon' });

  try {
    const rvDataRes = await fetch('https://api.rainviewer.com/public/weather-maps.json');
    const rvData = await rvDataRes.json();
    const latestTime = rvData.radar.past[rvData.radar.past.length - 1].time;
    const timeStr = new Date(latestTime * 1000).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' });
    let targetDistrict = await getLocationName(lat, lon);

    // 🌟 ปรับ Zoom กลับมาที่ระดับ 7 (1 พิกเซล = พื้นที่กว้าง 1.2 กิโลเมตร) 
    // เสถียรกว่า และภาพดาวเทียมไม่ค่อยแหว่ง
    const zoom = 7;
    const n = Math.pow(2, zoom);
    const x = (lon + 180) / 360 * n;
    const latRad = lat * Math.PI / 180;
    const y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;

    const tileX = Math.floor(x);
    const tileY = Math.floor(y);
    const pixelX = Math.floor((x - tileX) * 256);
    const pixelY = Math.floor((y - tileY) * 256);

    const tileUrl = `https://tilecache.rainviewer.com/v2/radar/${latestTime}/256/${zoom}/${tileX}/${tileY}/2/1_1.png`;
    
    let image;
    try {
        // 🌟 ใส่กันชน! ถ้าดาวเทียมบอกว่า 410 Gone (ไม่มีภาพ = ไม่มีฝน) ให้ข้ามไปเลย
        image = await Jimp.read(tileUrl);
    } catch (imgError) {
        console.log("No radar tile found (Clear sky). URL:", tileUrl);
        return res.status(200).json({
            radarTime: timeStr,
            currentLocName: targetDistrict,
            alertLevel: 0,
            cardTitle: 'ท้องฟ้าโปร่ง ไม่มีฝน',
            cardDesc: `สแกนเรดาร์รัศมี 60 กม. รอบ ${targetDistrict || 'พื้นที่เป้าหมาย'} ไม่พบกลุ่มเมฆฝน ท้องฟ้าโปร่งครับ (ภาพดาวเทียมล่าสุด)`,
            cardColor: 'blue',
            cardIcon: '☀️',
            cardTag: 'ปลอดภัย'
        });
    }

    // 🌟 กำหนดรัศมีสแกน (60 กิโลเมตร)
    const kmPerPixel = 1.2;
    const maxRadiusKm = 60; 
    const maxRadiusPx = Math.floor(maxRadiusKm / kmPerPixel); 

    let centerAlertLevel = 0;
    let nearestStormDistPx = Infinity;
    let nearestStormLevel = 0;
    let nearestStormDx = 0;
    let nearestStormDy = 0;

    // กวาดตารางพิกเซล (ปรับให้กวาดเป็นวงกลม เพื่อให้รันเร็วขึ้น ไม่เกิน 10 วิ)
    for (let dy = -maxRadiusPx; dy <= maxRadiusPx; dy++) {
        for (let dx = -maxRadiusPx; dx <= maxRadiusPx; dx++) {
            
            const distPx = Math.sqrt(dx*dx + dy*dy);
            if (distPx > maxRadiusPx) continue; // ตัดมุมกรอบสี่เหลี่ยมออกให้เป็นวงกลม

            const checkX = pixelX + dx;
            const checkY = pixelY + dy;

            if (checkX >= 0 && checkX < 256 && checkY >= 0 && checkY < 256) {
                const hexColor = image.getPixelColor(checkX, checkY);
                const rgba = intToRGBA(hexColor);

                if (rgba.a > 150) { 
                    let level = 1;
                    if (rgba.r > 200 && rgba.g < 100) level = 3; 
                    else if (rgba.r > 150 && rgba.g > 150) level = 2; 

                    if (distPx <= 2) { // ถือว่าตกอยู่บนหัว (รัศมี 2.4 กม.)
                        if (level > centerAlertLevel) centerAlertLevel = level;
                    }

                    if (distPx <= maxRadiusPx && distPx > 2 && distPx < nearestStormDistPx) {
                        nearestStormDistPx = distPx;
                        nearestStormLevel = level;
                        nearestStormDx = dx;
                        nearestStormDy = dy;
                    }
                }
            }
        }
    }

    let resultData = {
        radarTime: timeStr,
        currentLocName: targetDistrict,
        alertLevel: 0,
        cardTitle: 'ท้องฟ้าโปร่ง ไม่มีฝน',
        cardDesc: `สแกนเรดาร์รัศมี ${maxRadiusKm} กม. รอบ ${targetDistrict} ไม่พบกลุ่มฝน สามารถทำกิจกรรมหรือเดินทางได้ตามปกติครับ`,
        cardColor: 'blue',
        cardIcon: '☀️',
        cardTag: 'ปลอดภัย'
    };

    if (centerAlertLevel > 0) {
        const levelText = centerAlertLevel === 3 ? "หนักมาก!" : centerAlertLevel === 2 ? "ปานกลาง" : "ปรอยๆ";
        resultData.alertLevel = centerAlertLevel;
        resultData.cardColor = centerAlertLevel === 3 ? "red" : centerAlertLevel === 2 ? "yellow" : "green";
        resultData.cardIcon = centerAlertLevel === 3 ? "🚨" : "🌧️";
        resultData.cardTitle = `ฝนตก${levelText}ในพื้นที่!`;
        resultData.cardTag = "ฝนตกขณะนี้";
        resultData.cardDesc = `เรดาร์ตรวจพบกลุ่มฝนระดับ${levelText} กำลังปกคลุมพื้นที่ ${targetDistrict} โดยตรง ขอให้ระมัดระวังในการเดินทางครับ`;
    
    } else if (nearestStormDistPx !== Infinity) {
        const distKm = Math.round(nearestStormDistPx * kmPerPixel);
        const bearingToStorm = (Math.atan2(nearestStormDx, -nearestStormDy) * 180 / Math.PI + 360) % 360;
        const stormDirText = getWindDirectionText(bearingToStorm);
        
        let angleDiff = Math.abs(bearingToStorm - (windDir || 0));
        if (angleDiff > 180) angleDiff = 360 - angleDiff;
        const isApproaching = windSpeed > 5 && angleDiff <= 45;

        const stormLevelText = nearestStormLevel === 3 ? "รุนแรง" : nearestStormLevel === 2 ? "ปานกลาง" : "เล็กน้อย";

        if (isApproaching) {
            const timeHours = distKm / windSpeed;
            const timeMins = Math.round(timeHours * 60);
            
            resultData.alertLevel = 2;
            resultData.cardColor = nearestStormLevel === 3 ? 'red' : 'yellow';
            resultData.cardIcon = "⏳";
            resultData.cardTitle = "ระวัง! กลุ่มฝนกำลังพัดเข้ามา";
            resultData.cardTag = "พยากรณ์ล่วงหน้า";
            resultData.cardDesc = `พบกลุ่มฝน${stormLevelText} ห่างออกไป ${distKm} กม. ทางทิศ${stormDirText} ลมกำลังพัดเข้าหาคุณ คาดว่าจะถึง ${targetDistrict} ในอีกประมาณ ${timeMins} นาที! วางแผนการเดินทางด่วนครับ`;
        } else {
            resultData.alertLevel = 1;
            resultData.cardColor = 'green';
            resultData.cardIcon = "👀";
            resultData.cardTitle = "พบกลุ่มฝนบริเวณใกล้เคียง";
            resultData.cardTag = "เฝ้าระวัง";
            resultData.cardDesc = `พบกลุ่มฝน${stormLevelText} ห่างออกไป ${distKm} กม. ทางทิศ${stormDirText} แต่กระแสลมปัจจุบันไม่ได้พัดมาทางนี้ พื้นที่ ${targetDistrict} ค่อนข้างปลอดภัยครับ`;
        }
    }

    return res.status(200).json(resultData);

  } catch (error) {
    console.error("Radar Scanner Error:", error);
    return res.status(500).json({ error: error.message });
  }
}