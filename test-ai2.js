const { GoogleGenAI } = require("@google/genai");
const ai = new GoogleGenAI({}); // SDK uses process.env.GEMINI_API_KEY automatically
async function test() {
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: 'hello'
    });
    console.log("Success:", response.text);
  } catch (e) {
    console.log("Error:", e.message);
  }
}
test();
