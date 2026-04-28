import { GoogleGenerativeAI } from '@google/generative-ai';

const MODELS_TO_TRY = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt } = req.body ?? {};
  if (!prompt) {
    return res.status(400).json({ error: 'No prompt provided' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Missing GEMINI_API_KEY');
    return res.status(500).json({ error: 'AI API key is not configured' });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    let text = '';
    let lastError = '';

    for (const modelName of MODELS_TO_TRY) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        text = result.response.text();

        return res.status(200).json({ text });
      } catch (error) {
        lastError = error.message;
        console.error(`Gemini model ${modelName} failed:`, error.message);
      }
    }

    throw new Error(`No configured Gemini model succeeded: ${lastError}`);
  } catch (error) {
    console.error('Summary API error:', error.message || error);

    return res.status(500).json({
      error: 'Internal Server Error',
      details: error.message || 'Unknown error occurred',
    });
  }
}
