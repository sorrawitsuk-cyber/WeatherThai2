export default async function handler(req, res) {
  // บังคับให้เป็น POST เท่านั้น
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // ดึง API Key มาเช็ค
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("🚨 ไม่พบ GEMINI_API_KEY!");
    return res.status(500).json({ error: "ไม่พบการตั้งค่า API Key ของ AI" });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "No prompt provided" });
  }

  try {
    console.log("🚀 ส่งข้อมูลยิงตรงไปที่ Google Gemini API (รุ่น gemini-pro)...");
    
    // 🌟 แก้ไข: ใช้โมเดล "gemini-pro" ซึ่งรองรับ API Key ทุกรุ่นแน่นอน 100%
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 } // บังคับให้ AI ตอบตรงไปตรงมา
      })
    });

    const data = await response.json();

    // เช็คว่า Google ด่าอะไรกลับมาไหม
    if (!response.ok) {
      console.error("🔥 Google API Error:", data);
      return res.status(response.status).json({ 
          error: "Google API Error", 
          details: data.error?.message || "Unknown API Error" 
      });
    }

    // ดึงข้อความจาก JSON ที่ Google ตอบกลับมา
    const text = data.candidates[0].content.parts[0].text;
    console.log("✅ Gemini ตอบกลับสำเร็จ!");
    
    return res.status(200).json({ jsonText: text });

  } catch (error) {
    console.error("🔥 เกิดข้อผิดพลาดในระบบเซิร์ฟเวอร์:", error.message || error);
    return res.status(500).json({ 
        error: "Internal Server Error", 
        details: error.message || "Unknown error occurred" 
    });
  }
}