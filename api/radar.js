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
    let targetDistrict = await getLocationName(lat, lon);

    // 🌟 ขยายเลนส์ดาวเทียมเป็น 512x512 เพื่อความแม่นยำและไม่ตกขอบ
    const zoom = 6;
    const tileSize = 512;
    const n = Math.pow(2, zoom);
    const x = (lon + 180) / 360 * n;
    const latRad = lat * Math.PI / 180;
    const y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;

    const tileX = Math.floor(x);
    const tileY = Math.floor(y);
    const pixelX = Math.floor((x - tileX) * tileSize);
    const pixelY = Math.floor((y - tileY) * tileSize);

    let image = null;
    let validTimeStr = '';

    // 🌟 พระเอกของงานนี้: ระบบ Time Machine ถอยหลังหาภาพที่สมบูรณ์ที่สุด (สูงสุดถอยหลัง 40 นาที)
    const pastFrames = rvData.radar.past;
    for (let i = pastFrames.length - 1; i >= Math.max(0, pastFrames.length - 4); i--) {
        const time = pastFrames[i].time;
        const tileUrl = `https://tilecache.rainviewer.com/v2/radar/${time}/${tileSize}/${zoom}/${tileX}/${tileY}/2/1_1.png`;
        
        try {
            image = await Jimp.read(tileUrl);
            validTimeStr = new Date(time * 1000).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' });
            console.log(`Successfully loaded radar tile from time: ${validTimeStr}`);
            break; // ถ้าโหลดภาพสำเร็จ ให้หยุดค้นหาทันที
        } catch (imgError) {
            console.log(`Tile not ready for time ${time}, trying previous frame...`);
        }
    }

    // ถ้าถอยไป 40 นาทีแล้วยังไม่มีรูป แสดงว่าฟ้าโปร่งจริงๆ
    if (!image) {
        return res.status(200).json({
            radarTime: new Date().toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' }),
            currentLocName: targetDistrict,
            alertLevel: 0,
            cardTitle: 'ท้องฟ้าโปร่ง ไม่มีฝน',
            cardDesc: `สแกนเรดาร์รัศมี 60 กม. รอบ ${targetDistrict || 'พื้นที่เป้าหมาย'} ไม่พบกลุ่มเมฆฝน ท้องฟ้าโปร่งครับ`,
            cardColor: 'blue',
            cardIcon: '☀️',
            cardTag: 'ปลอดภัย'
        });
    }

    // 🌟 คำนวณรัศมี 60 กม. (1 พิกเซล ที่ Zoom 6 ขนาด 512 = ประมาณ 2.4 กม.)
    const kmPerPixel = 2.4;
    const maxRadiusKm = 60; 
    const maxRadiusPx = Math.floor(maxRadiusKm / kmPerPixel); 

    let centerAlertLevel = 0;
    let nearestStormDistPx = Infinity;
    let nearestStormLevel = 0;
    let nearestStormDx = 0;
    let nearestStormDy = 0;

    for (let dy = -maxRadiusPx; dy <= maxRadiusPx; dy++) {
        for (let dx = -maxRadiusPx; dx <= maxRadiusPx; dx++) {
            
            const distPx = Math.sqrt(dx*dx + dy*dy);
            if (distPx > maxRadiusPx) continue; 

            const checkX = pixelX + dx;
            const checkY = pixelY + dy;

            if (checkX >= 0 && checkX < tileSize && checkY >= 0 && checkY < tileSize) {
                const hexColor = image.getPixelColor(checkX, checkY);
                const rgba = intToRGBA(hexColor);

                // เจอเมฆ/ฝน (ความเข้มสี > 10)
                if (rgba.a > 10) { 
                    let level = 1; 
                    if (rgba.r > 200 && rgba.g < 150) level = 3; 
                    else if (rgba.r > 150 || rgba.g > 150) level = 2; 

                    // ฝนตกตรงหัวพอดี (รัศมี ~4.8 กม.)
                    if (distPx <= 2) { 
                        if (level > centerAlertLevel) centerAlertLevel = level;
                    }

                    // หาพายุลูกที่อยู่ใกล้เราที่สุด (แต่อยู่นอกพื้นที่ตรงกลาง)
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
        radarTime: validTimeStr,
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