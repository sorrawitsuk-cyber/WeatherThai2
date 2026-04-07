// api/weather-proxy.js
export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "ต้องส่ง URL มาด้วยนะ" });
  }

  try {
    // ยิงไปหา Open-Meteo จากเซิร์ฟเวอร์ (ไม่ติด CORS)
    const response = await fetch(decodeURIComponent(url));
    
    if (!response.ok) {
      return res.status(response.status).json({ error: "API ต้นทางตอบกลับด้วยข้อผิดพลาด" });
    }

    const data = await response.json();

    // บังคับ Header ให้ Browser ยอมรับข้อมูล
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: "เซิร์ฟเวอร์ Proxy พัง: " + error.message });
  }
}