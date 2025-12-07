import { GoogleGenAI } from "@google/genai";
import { WebSource } from "../types";

export const analyzeScene = async (
  base64Image: string, 
  prompt: string, 
  useSearch: boolean = false,
  location?: { lat: number; lng: number }
): Promise<{ text: string; sources?: WebSource[] }> => {
  try {
    // Initialize AI client with the latest API key
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Clean base64 string if necessary (remove data:image/png;base64, prefix)
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

    const tools = useSearch ? [{ googleSearch: {} }, { googleMaps: {} }] : undefined;
    
    const toolConfig = (useSearch && location) ? {
      functionCallingConfig: {
        mode: 'ANY',
      },
      retrievalConfig: {
        latLng: {
          latitude: location.lat,
          longitude: location.lng
        }
      }
    } : undefined;

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
        systemInstruction: "You are Lumen, an AI visual assistant. Provide clear, concise, and safety-oriented descriptions. Prioritize obstacles, path clearance, and reading text if present. If Google Search/Maps is active, you can provide real-time prices, nutrition info, specific product identification, store ratings, and navigation locations.",
        maxOutputTokens: 300, 
        temperature: 0.4,
        tools: tools,
        // @ts-ignore - The SDK types might be strict about toolConfig placement, but this is the correct structure for REST/Grounding
        toolConfig: toolConfig
      }
    });

    // Extract grounding metadata if available
    let sources: WebSource[] = [];
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (groundingChunks) {
      sources = groundingChunks
        .map((chunk: any) => chunk.web || chunk.maps) // Check both web and maps chunks
        .filter((source: any) => source && source.uri && source.title)
        .map((source: any) => ({
          uri: source.uri,
          title: source.title
        }));
    }

    return {
      text: response.text || "I couldn't analyze the scene clearly.",
      sources: sources.length > 0 ? sources : undefined
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return { text: "I am having trouble connecting to the cognitive network. Please try again." };
  }
};