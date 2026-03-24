export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, topic } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key is missing' });
  }

  const cleanApiKey = apiKey.replace(/["']/g, "").trim();

  // 🧠 บังคับให้ Gemini ตอบกลับเป็น JSON เท่านั้น
  let finalPrompt = `${prompt}\n\n**IMPORTANT INSTRUCTION:** Return the answer **ONLY** in a raw JSON format (no Markdown, no code blocks like \`\`\`json). The JSON must be a single array of objects, where each object has exactly four keys: "label" (string), "icon" (string emoji), "status" (string, choose only from: "yes", "no", or "warning"), and "reason" (string, max 100 characters). 

Example of required output structure:
[
  {"label": "ตากผ้า", "icon": "👕", "status": "yes", "reason": "ท้องฟ้าแจ่มใส ลมพัดดี"},
  {"label": "ล้างรถ", "icon": "🚗", "status": "warning", "reason": "โอกาสฝนตกปานกลางตอนค่ำ"}
]`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${cleanApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: finalPrompt }] }] })
    });

    const data = await response.json();
    
    if (data.candidates && data.candidates.length > 0) {
      return res.status(200).json({ jsonText: data.candidates[0].content.parts[0].text });
    } else {
      return res.status(500).json({ error: 'No summary generated' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server Error' });
  }
}