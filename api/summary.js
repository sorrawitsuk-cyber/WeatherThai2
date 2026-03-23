export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  // 1. เช็คว่า Vercel ดึง Key ออกมาจากตู้เซฟได้ไหม
  if (!apiKey) {
    return res.status(200).json({ text: '❌ หา API Key ไม่เจอครับ! ตรวจสอบตู้เซฟใน Vercel ด่วน' });
  }

  // 2. เช็คว่าเผลอใส่เครื่องหมายคำพูดครอบ Key มาหรือเปล่า (เจอบ่อยสุด)
  const cleanApiKey = apiKey.replace(/["']/g, "").trim();

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${cleanApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await response.json();
    
    // ถ้าสำเร็จ ตอบข้อความกลับไป
    if (data.candidates && data.candidates.length > 0) {
      return res.status(200).json({ text: data.candidates[0].content.parts[0].text });
    } else {
      // 🐛 โหมดนักสืบ: คืนค่า Error จาก Google กลับไปโชว์ที่หน้าเว็บเลย!
      return res.status(200).json({ text: `❌ Google ปฏิเสธการทำงาน! สาเหตุจาก Google: ${JSON.stringify(data)}` });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch from Gemini' });
  }
}