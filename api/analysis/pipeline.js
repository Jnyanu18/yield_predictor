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
    const { cropType, cropStage, fruitsPerPlant } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
    }

    const promptText = `Analyze this farm data and return ONLY JSON:
{
  "yieldPrediction": { "estimatedKg": <number>, "confidence": <0-100> },
  "disease": { "risk": "low|med|high", "identified": [] },
  "irrigation": { "status": "adequate|needed", "litersPerAcre": <number> },
  "harvest": { "isReady": boolean, "countdownDays": <number> },
  "storage": { "optimalTemp": <number>, "maxDays": <number> },
  "market": { "bestPrice": <number>, "bestMarket": "Market Name" },
  "profit": { "revenue": <number>, "cost": <number>, "net": <number> }
}

Data:
Crop: ${cropType}
Stage: ${cropStage}
Fruits per plant: ${fruitsPerPlant}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{ role: "user", parts: [{ text: promptText }] }],
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
    
    const pipeline = JSON.parse(jsonStr);

    res.status(200).json({
      success: true,
      data: { pipeline }
    });

  } catch (error) {
    console.error("Pipeline Error:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message || "Failed to execute pipeline" 
    });
  }
}
