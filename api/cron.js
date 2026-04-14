import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, set } from 'firebase/database';
import { provinces77 } from '../src/provinces77.js';

// TMD API Regions — 6 calls ได้ข้อมูลทั้งประเทศ
const TMD_REGIONS = ['N', 'NE', 'C', 'E', 'W', 'S'];
const TMD_BASE = 'https://data.tmd.go.th/nwpapi/v1/forecast/location';
const TMD_FIELDS = 'tc,rh,ws10,wd10,rain,cond,slp';

// พจนานุกรมรหัสจังหวัด 2 ตัวแรก (TIS-1099)
const provMap = {
  "10": "กรุงเทพมหานคร", "11": "สมุทรปราการ", "12": "นนทบุรี", "13": "ปทุมธานี", "14": "พระนครศรีอยุธยา", "15": "อ่างทอง", "16": "ลพบุรี", "17": "สิงห์บุรี",
  "18": "ชัยนาท", "19": "สระบุรี", "20": "ชลบุรี", "21": "ระยอง", "22": "จันทบุรี", "23": "ตราด", "24": "ฉะเชิงเทรา", "25": "ปราจีนบุรี", "26": "นครนายก",
  "27": "สระแก้ว", "30": "นครราชสีมา", "31": "บุรีรัมย์", "32": "สุรินทร์", "33": "ศรีสะเกษ", "34": "อุบลราชธานี", "35": "ยโสธร", "36": "ชัยภูมิ",
  "37": "อำนาจเจริญ", "38": "บึงกาฬ", "39": "หนองบัวลำภู", "40": "ขอนแก่น", "41": "อุดรธานี", "42": "เลย", "43": "หนองคาย", "44": "มหาสารคาม",
  "45": "ร้อยเอ็ด", "46": "กาฬสินธุ์", "47": "สกลนคร", "48": "นครพนม", "49": "มุกดาหาร", "50": "เชียงใหม่", "51": "ลำพูน", "52": "ลำปาง", "53": "อุตรดิตถ์",
  "54": "แพร่", "55": "น่าน", "56": "พะเยา", "57": "เชียงราย", "58": "แม่ฮ่องสอน", "60": "นครสวรรค์", "61": "อุทัยธานี", "62": "กำแพงเพชร", "63": "ตาก",
  "64": "สุโขทัย", "65": "พิษณุโลก", "66": "พิจิตร", "67": "เพชรบูรณ์", "70": "ราชบุรี", "71": "กาญจนบุรี", "72": "สุพรรณบุรี", "73": "นครปฐม",
  "74": "สมุทรสาคร", "75": "สมุทรสงคราม", "76": "เพชรบุรี", "77": "ประจวบคีรีขันธ์", "80": "นครศรีธรรมราช", "81": "กระบี่", "82": "พังงา", "83": "ภูเก็ต",
  "84": "สุราษฎร์ธานี", "85": "ระนอง", "86": "ชุมพร", "90": "สงขลา", "91": "สตูล", "92": "ตรัง", "93": "พัทลุง", "94": "ปัตตานี", "95": "ยะลา", "96": "นราธิวาส"
};

// ===== TMD API Helper =====
async function fetchTmdRegions(token) {
    const allForecasts = [];
    for (const region of TMD_REGIONS) {
        try {
            const url = `${TMD_BASE}/hourly/region?region=${region}&fields=${TMD_FIELDS}&duration=24`;
            const res = await fetch(url, {
                headers: {
                    'accept': 'application/json',
                    'authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                // TMD returns WeatherForecasts (or WeatherForcasts — typo in their API)
                const forecasts = data.WeatherForecasts || data.WeatherForcasts || data.WeatherForecast || [];
                allForecasts.push(...forecasts);
                console.log(`TMD Region ${region}: ${forecasts.length} locations`);
            } else {
                console.warn(`TMD Region ${region} failed: ${res.status}`);
            }
        } catch (e) {
            console.error(`TMD Region ${region} error:`, e.message);
        }
        // Rate limit protection
        await new Promise(r => setTimeout(r, 300));
    }
    return allForecasts;
}

// ===== Process TMD data → province & amphoe level =====
function processTmdData(forecasts) {
    const provinceMap = {}; // { provName: { current: {...}, amphoes: [...] } }
    const bangkokTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    const currentHour = bangkokTime.getHours();

    forecasts.forEach(item => {
        const loc = item.location || {};
        const provName = loc.province || '';
        const amphoeName = loc.amphoe || null;
        const areatype = loc.areatype || 'province';
        const lat = loc.lat;
        const lon = loc.lon;
        const geocode = loc.geocode || '';

        // Find the forecast closest to current time
        const fcs = item.forecasts || [];
        let bestFc = fcs[0]; // default first
        if (fcs.length > 0) {
            // Find the forecast for the current hour
            for (const fc of fcs) {
                const fcHour = new Date(fc.time).getHours();
                if (fcHour === currentHour) {
                    bestFc = fc;
                    break;
                }
            }
            // If no exact match, use the latest forecast that's not in the future
            if (!bestFc || !bestFc.data) bestFc = fcs[0];
        }

        const d = bestFc?.data || {};
        const entry = {
            name: amphoeName || provName,
            province: provName,
            amphoe: amphoeName,
            areatype,
            lat, lon, geocode,
            tc: d.tc != null ? Math.round(d.tc * 10) / 10 : null,
            rh: d.rh != null ? Math.round(d.rh) : null,
            ws10: d.ws10 != null ? Math.round(d.ws10 * 10) / 10 : null,
            wd10: d.wd10 != null ? Math.round(d.wd10) : null,
            rain: d.rain != null ? Math.round(d.rain * 10) / 10 : null,
            cond: d.cond || null,
            slp: d.slp != null ? Math.round(d.slp) : null,
            // Store all 24h forecasts for charts
            hourlyForecasts: fcs.slice(0, 24).map(fc => ({
                time: fc.time,
                tc: fc.data?.tc,
                rh: fc.data?.rh,
                rain: fc.data?.rain,
                ws10: fc.data?.ws10,
                wd10: fc.data?.wd10
            }))
        };

        if (!provinceMap[provName]) {
            provinceMap[provName] = { amphoes: [], provinceLevelData: null };
        }

        if (areatype === 'province' || !amphoeName) {
            provinceMap[provName].provinceLevelData = entry;
        } else {
            provinceMap[provName].amphoes.push(entry);
        }
    });

    return provinceMap;
}

export default async function handler(req, res) {
  try {
    console.log("Cron: เริ่มทำงาน — Hybrid TMD + Open-Meteo Pipeline...");

    const dbUrl = process.env.VITE_FIREBASE_DATABASE_URL;
    if (!dbUrl) return res.status(500).json({ success: false, error: "🚨 หา VITE_FIREBASE_DATABASE_URL ไม่เจอ!" });

    const firebaseConfig = {
      apiKey: process.env.VITE_FIREBASE_API_KEY,
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
      databaseURL: dbUrl,
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.VITE_FIREBASE_APP_ID
    };

    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    const db = getDatabase(app, dbUrl);

    const bangkokTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    const currentHour = bangkokTime.getHours();
    const timestamp = Date.now();

    // ========================================
    // STEP 1: TMD API — ข้อมูลระดับอำเภอ (Primary)
    // ========================================
    let tmdSuccess = false;
    let tmdProvinceMap = {};
    const tmdToken = process.env.TMD_API_TOKEN;

    if (tmdToken) {
        console.log("Cron: กำลังดึงข้อมูลจาก TMD API (6 regions)...");
        try {
            const forecasts = await fetchTmdRegions(tmdToken);
            if (forecasts.length > 0) {
                tmdProvinceMap = processTmdData(forecasts);
                tmdSuccess = true;
                console.log(`Cron: TMD สำเร็จ — ได้ข้อมูล ${Object.keys(tmdProvinceMap).length} จังหวัด`);
            } else {
                console.warn("Cron: TMD ไม่ได้ข้อมูลกลับมา (empty response)");
            }
        } catch (e) {
            console.error("Cron: TMD API ล้มเหลว:", e.message);
        }
    } else {
        console.warn("Cron: ไม่มี TMD_API_TOKEN — ข้ามขั้นตอน TMD");
    }

    // ========================================
    // STEP 2: Open-Meteo — PM2.5, UV, และ Backup
    // ========================================
    console.log("Cron: กำลังดึงข้อมูลจาก Open-Meteo...");
    const chunkSize = 40;
    let allWData = [];
    let allAData = [];

    for (let i = 0; i < provinces77.length; i += chunkSize) {
      const chunk = provinces77.slice(i, i + chunkSize);
      const lats = chunk.map(p => p.lat).join(',');
      const lons = chunk.map(p => p.lon).join(',');

      const wUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,apparent_temperature,precipitation_probability,wind_speed_10m,uv_index&daily=temperature_2m_max,apparent_temperature_max,precipitation_probability_max,uv_index_max,wind_speed_10m_max&timezone=Asia%2FBangkok&past_days=7&forecast_days=8&_t=${timestamp}`;
      const aUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lats}&longitude=${lons}&current=pm2_5&hourly=pm2_5&timezone=Asia%2FBangkok&past_days=7&forecast_days=8&_t=${timestamp}`;

      const [wRes, aRes] = await Promise.all([fetch(wUrl), fetch(aUrl)]);

      if (wRes.ok && aRes.ok) {
        const wJson = await wRes.json();
        const aJson = await aRes.json();
        allWData = [...allWData, ...(Array.isArray(wJson) ? wJson : [wJson])];
        allAData = [...allAData, ...(Array.isArray(aJson) ? aJson : [aJson])];
      }
      if (i + chunkSize < provinces77.length) await new Promise(r => setTimeout(r, 200));
    }

    // ========================================
    // STEP 3: Merge — รวม TMD + Open-Meteo เข้าด้วยกัน
    // ========================================
    console.log("Cron: Merging TMD + Open-Meteo data...");

    const newStations = [];
    const newTemps = {};
    const newYesterday = {};
    const newMaxYesterday = {};
    const newDaily = {};

    provinces77.forEach((p, idx) => {
      const w = allWData[idx] || {};
      const a = allAData[idx] || {};
      const sID = `PROV_${idx}`;

      // Try to find TMD data for this province
      const tmdProv = tmdProvinceMap[p.n];
      const tmdData = tmdProv?.provinceLevelData || null;
      const hasTmd = tmdSuccess && tmdData && tmdData.tc != null;

      newStations.push({
        stationID: sID, areaTH: p.n, lat: p.lat, long: p.lon,
        AQILast: { PM25: { value: Math.round(a.current?.pm2_5 || 0) } },
        // Flag source
        dataSource: hasTmd ? 'tmd' : 'openmeteo',
        tmdCond: hasTmd ? tmdData.cond : null
      });

      // Current values: TMD primary, OpenMeteo fallback
      newTemps[sID] = {
        temp: hasTmd ? Math.round(tmdData.tc) : Math.round(w.current?.temperature_2m || 0),
        feelsLike: Math.round(w.current?.apparent_temperature || 0),
        humidity: hasTmd ? (tmdData.rh || Math.round(w.current?.relative_humidity_2m || 0)) : Math.round(w.current?.relative_humidity_2m || 0),
        rainProb: Math.round(w.daily?.precipitation_probability_max?.[1] || 0),
        rainMm: hasTmd ? (tmdData.rain || 0) : 0,
        windSpeed: hasTmd ? Math.round(tmdData.ws10 || 0) : Math.round(w.current?.wind_speed_10m || 0),
        windDir: hasTmd ? (tmdData.wd10 || 0) : Math.round(w.current?.wind_direction_10m || 0),
        uv: Math.round(w.daily?.uv_index_max?.[1] || 0),
        pressure: hasTmd ? (tmdData.slp || null) : null,
        cond: hasTmd ? tmdData.cond : null,
        source: hasTmd ? 'tmd' : 'openmeteo'
      };

      // Yesterday comparison — still from Open-Meteo (has historical data)
      const prevTemp = w.hourly?.temperature_2m?.[currentHour];
      const prevPm25 = a.hourly?.pm2_5?.[currentHour];
      const prevUv = w.hourly?.uv_index?.[currentHour];
      const prevRain = w.hourly?.precipitation_probability?.[currentHour];
      const prevWind = w.hourly?.wind_speed_10m?.[currentHour];

      newYesterday[sID] = {
        temp: Math.round(prevTemp !== undefined ? prevTemp : (w.daily?.temperature_2m_max?.[0] || 0)),
        pm25: Math.round(prevPm25 !== undefined ? prevPm25 : (a.current?.pm2_5 || 0)),
        uv: Math.round(prevUv !== undefined ? prevUv : (w.daily?.uv_index_max?.[0] || 0)),
        rain: Math.round(prevRain !== undefined ? prevRain : (w.daily?.precipitation_probability_max?.[0] || 0)),
        wind: Math.round(prevWind !== undefined ? prevWind : (w.daily?.wind_speed_10m_max?.[0] || 0))
      };

      let maxPm25 = 0;
      if (a.hourly?.pm2_5) {
          const yesterdayHourly = a.hourly.pm2_5.slice(0, 24).filter(v => v !== null);
          if (yesterdayHourly.length > 0) maxPm25 = Math.max(...yesterdayHourly);
      }

      newMaxYesterday[sID] = {
        temp: Math.round(w.daily?.temperature_2m_max?.[0] || 0),
        pm25: Math.round(maxPm25 || a.current?.pm2_5 || 0),
        uv: Math.round(w.daily?.uv_index_max?.[0] || 0),
        rain: Math.round(w.daily?.precipitation_probability_max?.[0] || 0),
        wind: Math.round(w.daily?.wind_speed_10m_max?.[0] || 0)
      };

      // Daily arrays for Map Slider
      const dailyDates = w.daily?.time || [];
      const dailyPm25Values = [];
      if (a.hourly?.pm2_5 && a.hourly.pm2_5.length >= dailyDates.length * 24) {
          for (let d = 0; d < dailyDates.length; d++) {
             const slice = a.hourly.pm2_5.slice(d * 24, (d + 1) * 24);
             const valid = slice.filter(v => v !== null);
             dailyPm25Values.push(valid.length > 0 ? Math.round(Math.max(...valid)) : 0);
          }
      } else {
          for (let d = 0; d < dailyDates.length; d++) {
             dailyPm25Values.push(Math.round(a.current?.pm2_5 || 0));
          }
      }

      newDaily[sID] = {
          dates: dailyDates,
          temp: w.daily?.temperature_2m_max?.map(v => Math.round(v)) || [],
          heat: w.daily?.apparent_temperature_max?.map(v => Math.round(v)) || [],
          pm25: dailyPm25Values,
          rain: w.daily?.precipitation_probability_max?.map(v => Math.round(v)) || [],
          wind: w.daily?.wind_speed_10m_max?.map(v => Math.round(v)) || [],
          uv: w.daily?.uv_index_max?.map(v => Math.round(v)) || []
      };
    });

    // ========================================
    // STEP 4: Save Province-level to Firebase (weather_data — compatible path)
    // ========================================
    const payload = {
        lastUpdated: bangkokTime.toISOString(),
        tmdAvailable: tmdSuccess,
        stations: newStations,
        stationTemps: newTemps,
        stationYesterday: newYesterday,
        stationMaxYesterday: newMaxYesterday,
        stationDaily: newDaily
    };

    await set(ref(db, 'weather_data'), payload);
    console.log("Cron: weather_data บันทึกสำเร็จ");

    // ========================================
    // STEP 5: Save Amphoe-level to Firebase (weather_data_amphoe — NEW)
    // ========================================
    if (tmdSuccess && Object.keys(tmdProvinceMap).length > 0) {
        console.log("Cron: กำลังบันทึกข้อมูลระดับอำเภอ...");

        const amphoePayload = {
            lastUpdated: bangkokTime.toISOString(),
            provinces: {}
        };

        Object.entries(tmdProvinceMap).forEach(([provName, provData]) => {
            // เก็บเฉพาะข้อมูลที่จำเป็น (ลดขนาด)
            const amphoeList = (provData.amphoes || []).map(a => ({
                n: a.name,
                lat: a.lat,
                lon: a.lon,
                gc: a.geocode,
                tc: a.tc,
                rh: a.rh,
                ws: a.ws10,
                wd: a.wd10,
                rain: a.rain,
                cond: a.cond
            }));

            if (amphoeList.length > 0) {
                amphoePayload.provinces[provName] = {
                    count: amphoeList.length,
                    amphoes: amphoeList
                };
            }
        });

        await set(ref(db, 'weather_data_amphoe'), amphoePayload);
        console.log(`Cron: weather_data_amphoe บันทึก ${Object.keys(amphoePayload.provinces).length} จังหวัด สำเร็จ`);
    }

    // ========================================
    // STEP 6: GISTDA Disaster Data (เดิม)
    // ========================================
    console.log("Cron: กำลังดึงข้อมูล GISTDA...");
    let hotspotsTop5 = [];
    let burntAreaTop5 = [];

    try {
        const fireRes = await fetch("https://disaster.gistda.or.th/app-api/services/viirs/7days");
        if (fireRes.ok) {
            const fireData = await fireRes.json();
            if (fireData && fireData.items) {
                const provCount = {};
                fireData.items.forEach(it => {
                    const provCode = String(it.amphoeCode).substring(0, 2);
                    const provName = provMap[provCode] || it.amphoe;
                    provCount[provName] = (provCount[provName] || 0) + 1;
                });
                hotspotsTop5 = Object.entries(provCount)
                    .map(([name, val]) => ({ province: name, value: val }))
                    .sort((a,b) => b.value - a.value).slice(0, 5);
            }
        }
    } catch(e) { console.error("Cron GISTDA Fire Error:", e); }

    try {
        const burnRes = await fetch("https://disaster.gistda.or.th/app-api/analytics/services/burn_10_Days/burn_10_days?sort=provinceCode:asc,amphoeCode:asc,tambonCode:asc,lu_name:asc,area:asc&offset=0&limit=10000");
        if (burnRes.ok) {
            const burnData = await burnRes.json();
            if (burnData && burnData.items) {
                const provCount = {};
                burnData.items.forEach(it => {
                    const provCode = String(it.amphoeCode).substring(0, 2);
                    const provName = provMap[provCode] || it.amphoe;
                    provCount[provName] = (provCount[provName] || 0) + (it.area || 0);
                });
                burntAreaTop5 = Object.entries(provCount)
                    .map(([name, val]) => ({ province: name, value: Math.round(val) }))
                    .sort((a,b) => b.value - a.value).slice(0, 5);
            }
        }
    } catch(e) { console.error("Cron GISTDA Burn Error:", e); }

    const gistdaPayload = {
        lastUpdated: bangkokTime.toISOString(),
        hotspots: hotspotsTop5.length > 0 ? hotspotsTop5 : [
            { province: 'แม่ฮ่องสอน', value: 4124 }, { province: 'กาญจนบุรี', value: 2849 }, { province: 'น่าน', value: 1742 }, { province: 'เชียงใหม่', value: 1507 }, { province: 'ชัยภูมิ', value: 1403 }
        ],
        burntArea: burntAreaTop5.length > 0 ? burntAreaTop5 : [
            { province: 'ลพบุรี', value: 417952 }, { province: 'อุตรดิตถ์', value: 355866 }, { province: 'ลำปาง', value: 320364 }, { province: 'นครสวรรค์', value: 291761 }, { province: 'เลย', value: 258900 }
        ],
        lowSoilMoisture: [
            { province: 'แม่ฮ่องสอน', value: 3.36 }, { province: 'เชียงใหม่', value: 3.52 }, { province: 'อุตรดิตถ์', value: 5.91 }, { province: 'ตาก', value: 6.09 }, { province: 'น่าน', value: 6.18 }
        ],
        lowVegetationMoisture: [
            { province: 'สมุทรสงคราม', value: 0.09 }, { province: 'สุรินทร์', value: 0.07 }, { province: 'สุพรรณบุรี', value: 0.07 }, { province: 'สุโขทัย', value: 0.07 }, { province: 'ชัยนาท', value: 0.07 }
        ],
        floodArea: [
            { province: '-', value: 0 }
        ]
    };
    await set(ref(db, 'gistda_disaster'), gistdaPayload);

    const summary = tmdSuccess 
      ? `Hybrid Sync สำเร็จ — TMD (${Object.keys(tmdProvinceMap).length} จว.) + Open-Meteo + GISTDA`
      : `Open-Meteo Only Sync สำเร็จ (TMD unavailable) + GISTDA`;
      
    return res.status(200).json({ success: true, message: summary, tmdAvailable: tmdSuccess });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.toString() });
  }
}