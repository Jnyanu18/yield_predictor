import { callGroqVision } from "./utils/visionProviders.js";

async function test() {
  try {
    const promptText = "Analyze this image and return JSON: {\"cropType\": \"tomato\"}";
    // Send a tiny transparent pixel as a dummy image just to test the key and model name
    const dummyImage = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
    const result = await callGroqVision(promptText, dummyImage, "image/png");
    console.log("Success:", result);
  } catch (error) {
    console.error("Test failed:", error.message || error);
  }
}

test();
