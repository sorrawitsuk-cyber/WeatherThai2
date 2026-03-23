// ไฟล์: api/summary.js
// หน้าที่: เป็นตัวกลางรับคำสั่งจากหน้าเว็บ ไปคุยกับ Gemini แล้วส่งคำตอบกลับไป

export default async function handler(req, res) {
  // เช็คว่าต้องส่งข้อมูลแบบ POST มาเท่านั้น
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // รับคำสั่ง (Prompt) ที่หน้าเว็บส่งมาให้
  const { prompt } = req.body;
  
  // 🔑 ดึง API Key จากตู้เซฟของ Vercel (ที่ตั้งค่าไว้ในสเตป 1)
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key is missing' });
  }

  try {
    // ยิงคำสั่งไปหา Gemini
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${AIzaSyDqUUAXuxplrg_PNHoFwzqTNfTBDTPD8uY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await response.json();
    
    // ส่งข้อความที่ AI พิมพ์เสร็จแล้ว กลับไปให้หน้าเว็บ
    if (data.candidates && data.candidates.length > 0) {
      return res.status(200).json({ text: data.candidates[0].content.parts[0].text });
    } else {
      return res.status(500).json({ error: 'No summary generated' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch from Gemini' });
  }
}