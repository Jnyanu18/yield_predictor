import axios from "axios";
import { env } from "./config/env.js";

async function test() {
  const payload = {
    model: "llama3-8b-8192",
    messages: [{ role: "user", content: "hi" }]
  };
  try {
    const res = await axios.post("https://api.groq.com/openai/v1/chat/completions", payload, {
      headers: { Authorization: `Bearer ${env.groqApiKey}` }
    });
    console.log("Success:", res.data.choices[0].message.content);
  } catch (error) {
    console.error("Test failed:", error.response?.data || error.message);
  }
}

test();
