import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeScene = async (base64Image: string, prompt: string): Promise<string> => {
  try {
    // Clean base64 string if necessary (remove data:image/png;base64, prefix)
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          },
          {
            text: prompt || "Describe this scene briefly for a visually impaired person. Focus on safety and navigation."
          }
        ]
      },
      config: {
        systemInstruction: "You are Lumen, an AI visual assistant. Provide clear, concise, and safety-oriented descriptions. Prioritize obstacles, path clearance, and reading text if present.",
        maxOutputTokens: 150, // Keep responses short for audio delivery
        temperature: 0.4,
      }
    });

    return response.text || "I couldn't analyze the scene clearly.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I am having trouble connecting to the cognitive network. Please try again.";
  }
};