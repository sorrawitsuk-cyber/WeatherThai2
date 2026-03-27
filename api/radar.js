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

    // 🌟 Zoom 6: 1 พิกเซล = พื้นที่กว้างประมาณ 4.8 กิโลเมตร
    const zoom = 6;
    const n = Math.pow(2, zoom);
    const x = (lon + 180) / 360 * n;
    const latRad = lat * Math.PI / 180;
    const y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;

    // คำนวณพิกัดสัมบูรณ์ของพิกเซลบนแผนที่โลก
    const centerAbsX = x * 256;
    const centerAbsY = y * 256;

    const kmPerPixel = 4.8;
    const maxRadiusKm = 60;
    const maxRadiusPx = Math.ceil(maxRadiusKm / kmPerPixel); // ~13 พิกเซล

    // 🌟 นวัตกรรมใหม่: หาว่า 60 กม. นี้ มันคร่อมแผ่นดาวเทียมกี่แผ่น
    const minAbsX = Math.floor(centerAbsX - maxRadiusPx);
    const maxAbsX = Math.floor(centerAbsX + maxRadiusPx);
    const minAbsY = Math.floor(centerAbsY - maxRadiusPx);
    const maxAbsY = Math.floor(centerAbsY + maxRadiusPx);

    const minTileX = Math.floor(minAbsX / 256);
    const maxTileX = Math.floor(maxAbsX / 256);
    const minTileY = Math.floor(minAbsY / 256);
    const maxTileY = Math.floor(maxAbsY / 256);

    // โหลดแผ่นดาวเทียมทั้งหมดที่เกี่ยวข้องกัน (1 ถึง 4 แผ่น)
    const tilePromises = [];
    const tileCoords = [];

    for (let tx = minTileX; tx <= maxTileX; tx++) {
        for (let ty = minTileY; ty <= maxTileY; ty++) {
            const url = `https://tilecache.rainviewer.com/v2/radar/${latestTime}/256/${zoom}/${tx}/${ty}/2/1_1.png`;
            tileCoords.push(`${tx}_${ty}`);
            // ถ้าดึงรูปไม่ได้ (Error 410) แสดงว่าแผ่นนั้นไม่มีฝน ให้ใส่ค่า null ไว้
            tilePromises.push(Jimp.read(url).catch(() => null));
        }
    }

    const tiles = await Promise.all(tilePromises);
    const tileCache = {};
    tileCoords.forEach((coord, i) => {
        tileCache[coord] = tiles[i];
    });

    let centerAlertLevel = 0;
    let nearestStormDistPx = Infinity;
    let nearestStormLevel = 0;
    let nearestStormDx = 0;
    let nearestStormDy = 0;

    // กวาดตารางพิกเซลรัศมี 60 กม.
    for (let dy = -maxRadiusPx; dy <= maxRadiusPx; dy++) {
        for (let dx = -maxRadiusPx; dx <= maxRadiusPx; dx++) {
            const distPx = Math.sqrt(dx*dx + dy*dy);
            if (distPx > maxRadiusPx) continue;

            const currAbsX = Math.floor(centerAbsX + dx);
            const currAbsY = Math.floor(centerAbsY + dy);

            // คำนวณหาว่าพิกเซลนี้ตกไปอยู่รูปแผ่นไหน
            const tX = Math.floor(currAbsX / 256);
            const tY = Math.floor(currAbsY / 256);
            const pX = currAbsX % 256;
            const pY = currAbsY % 256;

            const img = tileCache[`${tX}_${tY}`];
            if (img) {
                const hexColor = img.getPixelColor(pX, pY);
                const rgba = intToRGBA(hexColor);

                // 🌟 ความไวเซนเซอร์ขั้นสุด! จับได้ตั้งแต่เมฆสีม่วงจางๆ ยันพายุลูกใหญ่
                if (rgba.a > 5) { 
                    let level = 1;
                    if (rgba.r > 200 && rgba.g < 100) level = 3;
                    else if (rgba.r > 150 || rgba.g > 150) level = 2;

                    // ถ้าระยะไม่เกิน 1 พิกเซล ถือว่าตกอยู่ "บนหัวเรา" (รัศมี ~4.8 กม.)
                    if (distPx <= 1) { 
                        if (level > centerAlertLevel) centerAlertLevel = level;
                    }

                    // หาพายุลูกที่อยู่ใกล้เราที่สุด
                    if (distPx <= maxRadiusPx && distPx > 1 && distPx < nearestStormDistPx) {
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
        cardDesc: `สแกนเรดาร์รัศมี ${maxRadiusKm} กม. รอบ ${targetDistrict} ไม่พบกลุ่มเมฆฝน ท้องฟ้าโปร่งครับ (ภาพดาวเทียมล่าสุด)`,
        cardColor: 'blue',
        cardIcon: '☀️',
        cardTag: 'ปลอดภัย'
    };

    if (centerAlertLevel > 0) {
        const levelText = centerAlertLevel === 3 ? "หนักมาก!" : centerAlertLevel === 2 ? "ปานกลาง" : "ปรอยๆ";
        resultData.alertLevel = centerAlertLevel;
        resultData.cardColor = centerAlertLevel === 3 ? "red" : centerAlertLevel === 2 ? "yellow" : "green";
        resultData.cardIcon = centerAlertLevel === 3 ? "🚨" : "🌧️";
        resultData.cardTitle = `กลุ่มฝนระดับ${levelText}ปกคลุมพื้นที่!`;
        resultData.cardTag = "มีกลุ่มฝนขณะนี้";
        resultData.cardDesc = `เรดาร์ดาวเทียมตรวจพบกลุ่มเมฆฝนระดับ${levelText} กำลังปกคลุมพื้นที่ ${targetDistrict} โดยตรงครับ`;
    
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
            resultData.cardDesc = `พบกลุ่มฝน${stormLevelText} ห่างออกไป ${distKm} กม. ทางทิศ${stormDirText} ลมกำลังพัดเข้าหาคุณ คาดว่าจะถึง ${targetDistrict} ในอีกประมาณ ${timeMins} นาที!`;
        } else {
            resultData.alertLevel = 1;
            resultData.cardColor = 'green';
            resultData.cardIcon = "👀";
            resultData.cardTitle = "พบกลุ่มฝน/เมฆบริเวณใกล้เคียง";
            resultData.cardTag = "เฝ้าระวัง";
            resultData.cardDesc = `พบเมฆฝน${stormLevelText} ห่างออกไป ${distKm} กม. ทางทิศ${stormDirText} แต่กระแสลมปัจจุบันไม่ได้พัดมาทางนี้ ค่อนข้างปลอดภัยครับ`;
        }
    }

    return res.status(200).json(resultData);

  } catch (error) {
    console.error("Radar Scanner Error:", error);
    return res.status(500).json({ error: error.message });
  }
}