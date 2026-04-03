// api/hotspots.js
export default async function handler(req, res) {
  // ดึง Key จาก Environment Variable ของ Vercel
  const NASA_API_KEY = process.env.VITE_NASA_API_KEY; 

  if (!NASA_API_KEY) {
    return res.status(500).json({ error: 'Missing NASA API KEY' });
  }

  const url = `https://firms.modaps.eosdis.nasa.gov/api/country/csv/${NASA_API_KEY}/VIIRS_SNPP_NRT/THA/1`;

  try {
    // 1. Server ของเราวิ่งไปขอข้อมูลจาก NASA (เซิร์ฟเวอร์คุยกับเซิร์ฟเวอร์ จะไม่ติด CORS)
    const response = await fetch(url);
    const csvData = await response.text();

    // 2. ส่งข้อมูลกลับไปให้ Frontend ของเรา พร้อมอนุญาต CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/csv');
    res.status(200).send(csvData);
    
  } catch (error) {
    console.error('Error fetching NASA data:', error);
    res.status(500).json({ error: 'Failed to fetch data from NASA' });
  }
}