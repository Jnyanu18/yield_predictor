import axios from 'axios';

export default async function handler(req, res) {
  // 1. Setup CORS
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  )

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { imageData, mimeType, cropTypeHint } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
    }

    const hint = cropTypeHint || "tomato";
    const promptText = `You are an agriculture vision specialist.
Analyze this crop photo (${hint}) and return ONLY JSON:
{
  "cropType": "crop name",
  "growthStage": "seedling | vegetative | flowering | fruit development | ripening | harvest-ready",
  "fruitCount": <integer>,
  "healthStatus": "healthy | moderate | stressed",
  "stages": [{"stage": "mature", "count": <n>}, {"stage": "ripening", "count": <n>}, {"stage": "immature", "count": <n>}],
  "summary": "2-3 sentence farmer-friendly observation about the crop's condition."
}`;

    const parts = [{ text: promptText }];
    if (imageData) {
      const base64 = imageData.includes(",") ? imageData.split(",")[1] : imageData;
      parts.push({
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: base64
        }
      });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{ role: "user", parts }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    const response = await axios.post(url, payload, {
      timeout: 30000,
      headers: { "Content-Type": "application/json" }
    });

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Cleanup JSON
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    const jsonStr = cleaned.slice(firstBrace, lastBrace + 1);
    
    const analysis = JSON.parse(jsonStr);

    res.status(200).json({
      success: true,
      data: { analysis }
    });

  } catch (error) {
    console.error("Analysis Error:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message || "Failed to analyze image" 
    });
  }
}
