// api/hotspots.js
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // ดึง API Key จาก Environment Variable ของ Vercel
  const apiKey = process.env.FIRMS_API_KEY; 
  if (!apiKey) {
    return res.status(500).json({ error: "Missing FIRMS_API_KEY" });
  }

  try {
    // ดึงข้อมูล VIIRS_SNPP NRT สำหรับประเทศไทย (THA) ย้อนหลัง 1 วัน
    const url = `https://firms.modaps.eosdis.nasa.gov/api/country/csv/${apiKey}/VIIRS_SNPP_NRT/THA/1`;
    const response = await fetch(url);
    
    if (!response.ok) {
       throw new Error(`NASA API responded with status: ${response.status}`);
    }

    const csvText = await response.text();
    const lines = csvText.trim().split('\n');
    
    // ตัดบรรทัดแรก (Header) ทิ้ง
    lines.shift();
    
    const hotspots = lines.map(line => {
      const values = line.split(',');
      // รูปแบบ CSV ของ VIIRS: country_id(0), lat(1), lon(2), brightness(3), ... confidence(10)
      return {
        lat: parseFloat(values[1]),
        lon: parseFloat(values[2]),
        brightness: parseFloat(values[3]),
        acq_date: values[6],
        acq_time: values[7], // เวลาเป็น UTC
        confidence: values[10] // 'n' = ปานกลาง(nominal), 'l' = ต่ำ(low), 'h' = สูง(high)
      };
    }).filter(spot => !isNaN(spot.lat) && !isNaN(spot.lon));

    return res.status(200).json(hotspots);
  } catch (error) {
    console.error("Hotspots Fetch Error:", error);
    return res.status(500).json({ error: "Failed to fetch hotspots data" });
  }
}