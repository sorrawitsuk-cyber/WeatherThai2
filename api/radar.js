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

// 🌟 ฟังก์ชันคำนวณพิกัดล้อมรอบ (สร้างเรดาร์จำลอง)
const getDestinationPoint = (lat, lon, distanceKm, bearingDeg) => {
    const R = 6371; // รัศมีโลก
    const d = distanceKm;
    const brng = bearingDeg * Math.PI / 180;
    const lat1 = lat * Math.PI / 180;
    const lon1 = lon * Math.PI / 180;

    let lat2 = Math.asin(Math.sin(lat1) * Math.cos(d / R) + Math.cos(lat1) * Math.sin(d / R) * Math.cos(brng));
    let lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(d / R) * Math.cos(lat1), Math.cos(d / R) - Math.sin(lat1) * Math.sin(lat2));

    return { lat: (lat2 * 180 / Math.PI).toFixed(4), lon: (lon2 * 180 / Math.PI).toFixed(4) };
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { lat, lon } = req.body;
  if (!lat || !lon) return res.status(400).json({ error: 'Missing lat/lon' });

  try {
    let targetDistrict = await getLocationName(lat, lon);
    const radarTime = new Date().toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' });

    // 🌟 สร้างจุด Probe 9 จุด (ศูนย์กลาง 1 + ล้อมรอบ 8 ทิศทาง ระยะ 40 กม.)
    const points = [{ lat: lat.toFixed(4), lon: lon.toFixed(4), bearing: 0, distance: 0 }];
    const bearings = [0, 45, 90, 135, 180, 225, 270, 315];
    const probeDistance = 40; // รัศมี 40 กม. รอบตัว
    
    bearings.forEach(b => {
        const pt = getDestinationPoint(lat, lon, probeDistance, b);
        points.push({ ...pt, bearing: b, distance: probeDistance });
    });

    const latsStr = points.map(p => p.lat).join(',');
    const lonsStr = points.map(p => p.lon).join(',');

    // 🌟 ยิง API ขอดึงข้อมูลสภาพอากาศแบบเจาะจงจุด ทั้ง 9 จุดพร้อมกัน!
    const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latsStr}&longitude=${lonsStr}&current=precipitation,wind_speed_10m,wind_direction_10m&timezone=Asia/Bangkok`;
    const weatherRes = await fetch(openMeteoUrl);
    const weatherData = await weatherRes.json();

    if (!Array.isArray(weatherData)) {
        throw new Error("Invalid API response");
    }

    const centerData = weatherData[0].current;
    let resultData = {
        radarTime: radarTime,
        currentLocName: targetDistrict,
        alertLevel: 0,
        cardTitle: 'ท้องฟ้าโปร่ง ไม่มีฝน',
        cardDesc: `สแกนสภาพอากาศรัศมี ${probeDistance} กม. รอบ ${targetDistrict || 'พื้นที่เป้าหมาย'} ไม่พบกลุ่มเมฆฝน สามารถทำกิจกรรมหรือเดินทางได้ตามปกติครับ`,
        cardColor: 'blue',
        cardIcon: '☀️',
        cardTag: 'ปลอดภัย'
    };

    // 🌟 กรณีที่ 1: ฝนกำลังตกตรงจุดศูนย์กลางพอดี
    if (centerData.precipitation > 0.1) {
        let level = 1;
        if (centerData.precipitation >= 5.0) level = 3; // หนักมาก
        else if (centerData.precipitation >= 1.5) level = 2; // ปานกลาง

        const levelText = level === 3 ? "หนักมาก!" : level === 2 ? "ปานกลาง" : "ปรอยๆ";
        resultData.alertLevel = level;
        resultData.cardColor = level === 3 ? "red" : level === 2 ? "yellow" : "green";
        resultData.cardIcon = level === 3 ? "🚨" : "🌧️";
        resultData.cardTitle = `ฝนตก${levelText}ในพื้นที่!`;
        resultData.cardTag = "ฝนตกขณะนี้";
        resultData.cardDesc = `แบบจำลองตรวจพบกลุ่มฝนระดับ${levelText} กำลังปกคลุมพื้นที่ ${targetDistrict} โดยตรง ขอให้ระมัดระวังในการเดินทางครับ`;
        
        return res.status(200).json(resultData);
    }

    // 🌟 กรณีที่ 2: ศูนย์กลางไม่ตก ให้วิเคราะห์จุดล้อมรอบหาพายุที่กำลังพุ่งชน
    let highestThreat = null;

    for (let i = 1; i < points.length; i++) {
        const ptWeather = weatherData[i].current;
        const precip = ptWeather.precipitation;

        if (precip > 0.5) { // พบกลุ่มพายุในจุดล้อมรอบ
            const windDir = ptWeather.wind_direction_10m;
            const windSpeed = ptWeather.wind_speed_10m; // km/h
            const stormBearing = points[i].bearing; // ทิศทางที่พายุอยู่ (เทียบกับเรา)

            // เช็คว่าลมพัดตรงมาหาศูนย์กลางหรือไม่? 
            // (ทิศลมพัดเข้าหาตัวเรา คือ ทิศเดียวกับที่พายุอยู่)
            let angleDiff = Math.abs(stormBearing - windDir);
            if (angleDiff > 180) angleDiff = 360 - angleDiff;

            // ถ้าทิศทางลมทำมุมพุ่งเข้าหาเรา (คลาดเคลื่อนไม่เกิน 45 องศา) และลมแรงพอสมควร
            const isApproaching = angleDiff <= 45 && windSpeed > 5;

            if (isApproaching) {
                const threatLevel = precip >= 5.0 ? 3 : (precip >= 1.5 ? 2 : 1);
                const etaHours = probeDistance / windSpeed;
                const etaMins = Math.max(10, Math.round(etaHours * 60)); // ประเมินเวลาถึงอย่างต่ำ 10 นาที

                if (!highestThreat || threatLevel > highestThreat.level) {
                    highestThreat = {
                        level: threatLevel,
                        bearing: stormBearing,
                        speed: windSpeed,
                        eta: etaMins
                    };
                }
            }
        }
    }

    if (highestThreat) {
        const stormLevelText = highestThreat.level === 3 ? "รุนแรง" : highestThreat.level === 2 ? "ปานกลาง" : "เล็กน้อย";
        const stormDirText = getWindDirectionText(highestThreat.bearing);

        resultData.alertLevel = 2;
        resultData.cardColor = highestThreat.level === 3 ? 'red' : 'yellow';
        resultData.cardIcon = "⏳";
        resultData.cardTitle = "ระวัง! กลุ่มฝนกำลังเคลื่อนตัวเข้าหา";
        resultData.cardTag = "พยากรณ์ล่วงหน้า";
        resultData.cardDesc = `พบกลุ่มฝน${stormLevelText} ห่างออกไป ${probeDistance} กม. ทางทิศ${stormDirText} ลมกำลังพัดเข้าหาคุณ! คาดว่าจะถึง ${targetDistrict} ในอีกประมาณ ${highestThreat.eta} นาที วางแผนการเดินทางด่วนครับ`;
    } else {
        // ลองหาพายุเฉยๆ แม้ลมจะไม่พัดมา
        const nearbyStorm = weatherData.slice(1).find(w => w.current.precipitation > 0.5);
        if (nearbyStorm) {
            resultData.alertLevel = 1;
            resultData.cardColor = 'green';
            resultData.cardIcon = "👀";
            resultData.cardTitle = "พบพายุบริเวณใกล้เคียง";
            resultData.cardTag = "เฝ้าระวัง";
            resultData.cardDesc = `พบกลุ่มฝนห่างออกไป ${probeDistance} กม. แต่กระแสลมปัจจุบันไม่ได้พัดมาทางนี้ พื้นที่ ${targetDistrict} ค่อนข้างปลอดภัยครับ`;
        }
    }

    return res.status(200).json(resultData);

  } catch (error) {
    console.error("Advanced Radar Scanner Error:", error);
    return res.status(500).json({ error: error.message });
  }
}