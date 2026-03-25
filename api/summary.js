import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  // บังคับให้เป็น POST เท่านั้น
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // ดึง API Key มาเช็ค
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("🚨 ไม่พบ GEMINI_API_KEY ใน Environment Variables!");
    return res.status(500).json({ error: "ไม่พบการตั้งค่า API Key ของ AI" });
  }

  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "No prompt provided" });
  }

  try {
    console.log("🚀 กำลังส่งข้อมูลไปหา Gemini...");
    
    // เรียกใช้งาน Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // 🌟 อัปเดต: ใช้ gemini-pro รุ่นคลาสสิกที่เสถียรและรองรับทุก API Key 100%
    const model = genAI.getGenerativeModel({ model: "gemini-pro" }); 
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log("✅ Gemini ตอบกลับสำเร็จ!");
    
    return res.status(200).json({ jsonText: text });

  } catch (error) {
    // 🕵️‍♂️ จับ Error แบบละเอียดมาแสดง
    console.error("🔥 เกิดข้อผิดพลาดตอนคุยกับ Gemini:", error.message || error);
    
    return res.status(500).json({ 
        error: "Internal Server Error", 
        details: error.message || "Unknown error occurred" 
    });
  }
}