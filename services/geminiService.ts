
import { GithubRepo } from "../types";

export async function analyzeRepository(repo: GithubRepo, readme: string, level: 'superficial' | 'detailed' = 'superficial', fileTree?: string) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OpenRouter API key is not configured. Please check your environment.");
  }

  const basePrompt = `
    Analyze this GitHub repository and return the results strictly in JSON format.
    The JSON object must contain the following keys:
    - "projectPulse": string (a high-level impact summary)
    - "resumePoints": string[] (3 professional SWE bullet points)
    - "forgottenIdeas": string[] (2-3 experimental or future insights)
    - "reorgAdvice": string (2-sentence reorganization strategy)
    - "detailedDescription": string (Only for detailed level, else null)
    
    Repository Name: ${repo.name}
    Description: ${repo.description || 'N/A'}
    Primary Language: ${repo.language || 'Unknown'}
    
    README Content:
    ${readme.substring(0, 5000)}
  `;

  const levelPrompt = level === 'detailed'
    ? `
    This is a DETAILED analysis. I am providing the file structure below.
    File Tree:
    ${fileTree}
    
    Tasks (Detailed):
    1. Create a "projectPulse": A technical, architect-level summary.
    2. Generate 3 professional resume bullet points for a Senior SWE.
    3. Extract 3 high-yield insights or hidden gems from the structure/code.
    4. Provide specific technical debt/reorg advice.
    5. Populate "detailedDescription": A 3-paragraph deep dive into the technical stack, patterns used, and overall quality.
    `
    : `
    This is a SUPERFICIAL analysis based on README and metadata.
    
    Tasks (Superficial):
    1. Create a "projectPulse": A compelling 1-2 sentence summary.
    2. Generate 3 professional resume bullet points.
    3. Extract 2-3 potentially "forgotten ideas".
    4. Provide brief reorg advice.
    5. Set "detailedDescription" to null.
    `;

  const prompt = basePrompt + levelPrompt;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://reponexus.ai",
        "X-Title": "RepoNexus",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": process.env.OPENROUTER_MODEL || "google/gemini-3-flash-preview",
        "messages": [
          {
            "role": "system",
            "content": "You are a senior software architect. You must respond ONLY with a valid JSON object. Do not include any explanations or markdown outside the JSON."
          },
          { "role": "user", "content": prompt }
        ],
        "response_format": { "type": "json_object" }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `OpenRouter API Error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error("The AI model returned an empty response.");
    }

    try {
      // Strip markdown code blocks if present
      const cleanedContent = content.replace(/```json\n?|```/g, '').trim();
      return JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("Failed to parse OpenRouter JSON output:", content);
      throw new Error("The AI provided malformed data. Please try again.");
    }
  } catch (error: any) {
    if (error.message?.includes('429')) {
      throw new Error("Rate limit exceeded on OpenRouter. Please wait a moment.");
    }
    throw new Error(error.message || "An unexpected error occurred during AI analysis.");
  }
}

export async function summarizeInventory(repos: GithubRepo[]) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OpenRouter API key is not configured.");
  }

  const repoList = repos.map(r => `- ${r.name} (${r.language || 'Unknown'}): ${r.description || 'No description'}`).join('\n');

  const prompt = `
    I have a collection of software repositories. Please provide a high-level "Inventory Executive Summary".
    Identify common themes, technology clusters, and the overall focus of this portfolio.
    
    Repositories:
    ${repoList}
    
    Return the summary in a structured format with:
    1. "portfolioFocus": A 1-sentence summary of the whole collection.
    2. "techStacks": Major technologies found.
    3. "strategicAdvice": 2-3 sentences on how to organize or leverage this portfolio.
    
    Return strictly JSON.
  `;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://reponexus.ai",
        "X-Title": "RepoNexus",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": process.env.OPENROUTER_MODEL || "google/gemini-3-flash-preview",
        "messages": [
          {
            "role": "system",
            "content": "You are a CTO/Chief Architect. You must respond ONLY with a valid JSON object."
          },
          { "role": "user", "content": prompt }
        ],
        "response_format": { "type": "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return JSON.parse(data.choices[0]?.message?.content || "{}");
  } catch (error: any) {
    throw new Error(error.message || "An error occurred during inventory summarization.");
  }
}
