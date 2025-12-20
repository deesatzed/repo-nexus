
import { GoogleGenAI, Type } from "@google/genai";
import { GithubRepo } from "../types";

export async function analyzeRepository(repo: GithubRepo, readme: string) {
  // Use process.env.API_KEY directly as required by guidelines
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key is not configured. Please check your environment.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    Analyze this GitHub repository based on its metadata and README.
    
    Repository Name: ${repo.name}
    Description: ${repo.description || 'N/A'}
    Primary Language: ${repo.language || 'Unknown'}
    
    README Content:
    ${readme.substring(0, 5000)} // Safety limit for input tokens
    
    Tasks:
    1. Create a "Project Pulse": A 1-2 sentence high-level, compelling description of what this project actually does and its core value proposition.
    2. Generate 3 professional resume bullet points (impact-driven) for this project.
    3. Extract 2-3 potentially "forgotten ideas" or "high-yield" insights found in the code description or README (e.g., experimental features, future plans).
    4. Provide a brief 2-sentence advice on how to reorganize this repo if it's messy (e.g., split into sub-repos, rename, archive).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            projectPulse: {
              type: Type.STRING,
              description: "A refined, high-impact project summary.",
            },
            resumePoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            forgottenIdeas: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            reorgAdvice: {
              type: Type.STRING,
            },
          },
          required: ['projectPulse', 'resumePoints', 'forgottenIdeas', 'reorgAdvice'],
        }
      },
    });

    if (!response || !response.text) {
      throw new Error("The AI model returned an empty response. This might be due to safety filters or technical errors.");
    }

    try {
      return JSON.parse(response.text);
    } catch (parseError) {
      console.error("Failed to parse Gemini JSON output:", response.text);
      throw new Error("The AI provided malformed data. Please try again.");
    }
  } catch (error: any) {
    // Handle specific API errors
    if (error.message?.includes('429')) {
      throw new Error("Rate limit exceeded. Please wait a moment before trying again.");
    }
    if (error.message?.includes('403') || error.message?.includes('401')) {
      throw new Error("Invalid API key or insufficient permissions for Gemini.");
    }
    if (error.message?.includes('Requested entity was not found')) {
        throw new Error("Model or resource not found. Please verify the Gemini model configuration.");
    }
    
    throw new Error(error.message || "An unexpected error occurred during AI analysis.");
  }
}
