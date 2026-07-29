import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });

async function testModels() {
  const models = [
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash-001",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
  ];

  for (const model of models) {
    try {
      console.log(`Testing model: ${model}...`);
      const res = await ai.models.generateContent({
        model,
        contents: "Hello",
      });
      console.log(`>>> SUCCESS for ${model}:`, res.text);
      return model;
    } catch (e: any) {
      console.log(`FAIL for ${model}:`, e.message || e);
    }
  }
}

testModels();
