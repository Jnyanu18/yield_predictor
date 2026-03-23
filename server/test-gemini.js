import { callGemini } from "./utils/gemini.js";

async function test() {
  try {
    const promptText = "You are an agriculture vision specialist. Analyze this crop photo and return ONLY JSON:\n{\n  \"cropType\": \"tomato\"\n}";
    const result = await callGemini(promptText, null, "image/jpeg");
    console.log("Success:", result);
  } catch (error) {
    console.error("Test failed:", error.message || error);
  }
}

test();
