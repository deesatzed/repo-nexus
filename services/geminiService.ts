
import { GithubRepo } from "../types";

export async function analyzeRepository(repo: GithubRepo, readme: string, level: 'superficial' | 'detailed' = 'superficial', fileTree?: string) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OpenRouter API key is not configured. Please check your environment.");
  }

  const prompt = `
    Analyze this repository as a Senior Software Architect. 
    Repository: ${repo.name}
    Description: ${repo.description || 'N/A'}
    Language: ${repo.language || 'Unknown'}
    
    README Context:
    ${readme.substring(0, 8000)}

    ${fileTree ? `File Structure Context:\n${fileTree.substring(0, 5000)}` : ''}

    Task: Generate a "10-Point Architectural Assessment" in strict JSON format.
    
    Return JSON with these exact keys:
    1. "vitalityScore": number (0-100 estimate of production readiness).
    2. "completionGap": string[] (List of critical missing features/files to make this usable).
    3. "componentCatalog": Array of { name: string, type: "Function"|"Class"|"UI"|"Utility", filePath: string, description: string } (Identify 3-5 HIGH VALUE reusable parts).
    4. "techDebtIndex": string[] (Specific anti-patterns, hardcoded values, or legacy structures found).
    5. "keyAlgorithms": string[] (Unique logic, math, or data processing worth preserving).
    6. "pivotPotential": string (One creative idea to repurpose this code for a different use case).
    7. "dependencyRisk": string[] (Flag any deprecated, dangerous, or overkill dependencies).
    8. "integrationSurface": string[] (List of API endpoints, CLI commands, or exports available for external use).
    9. "architecturalPattern": string (e.g. "Monolith", "Serverless", "Script Collection").
    10. "immediateAction": "Archive" | "Refactor" | "Polish" | "Publish".

    CRITICAL: Be specific. Do not say "Add error handling". Say "Add try/catch to api.ts fetch call".
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
        "model": process.env.OPENROUTER_MODEL || "google/gemini-pro",
        "messages": [
          {
            "role": "system",
            "content": "You are a Senior Principal Engineer. Respond ONLY with valid JSON."
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

export async function summarizeInventory(repos: any[]) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OpenRouter API key is not configured.");
  }

  const repoList = repos.map(r => `- ${r.name} (${r.language || 'Unknown'}): ${r.description || 'No description'}`).join('\n');

  const prompt = `
    I have a collection of software repositories with FORENSIC DATA included.
    Please provide a "Master Nexus Strategy" based on FACTS, not guesses.
    
    FORENSIC DATA EXPLAINED:
    - "daysSinceUpdate": Actual time since last commit. Use this for Status. (>180 days = Stalled).
    - "techSignature": Contains actual detected validation files (package.json, Dockerfile) and raw dependencies.
    
    Portfolio Data:
    ${JSON.stringify(repos, null, 2)}
    
    Return a Master Nexus Strategy in JSON format with:
    1. "executiveSummary": A deep, architectural mission statement for this entire nexus.
    2. "repoRegistry": Array of objects { name: string, status: "Active" | "Legacy" | "Stalled" | "Candidate-for-Merge", action: string, priority: "High" | "Medium" | "Low", reasoning: string } 
       - CRITICAL: You MUST include an entry for EVERY SINGLE repository provided in the input. Do not skip any. Do not truncate the list.
       - CRITICAL: "status" must be mathematically derived from 'daysSinceUpdate'.
       - CRITICAL: "action" must reference specific technologies found in 'techSignature' (e.g. "Upgrade React 16 to 18").
    3. "crossPollination": Array of objects { sourceRepo: string, targetRepos: string[], feature: string, benefit: string } 
       - Focus on shared dependencies or missing config files (e.g. "Repo A has Dockerfile, Repo B does not -> Add Docker").
    4. "consolidationLog": Array of objects { reposToMerge: string[], proposedNewName: string, rationale: string }
    5. "innovationLab": Array of objects { idea: string, baseRepos: string[], missingLink: string }
    6. "maintenanceAudit": string[] (Specific cleanup items based on 'daysSinceUpdate' and old dependencies in 'techSignature').
    
    
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

export async function generateResumePortfolio(repos: any[], analyses: any[]) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OpenRouter API key is not configured.");
  }

  // OPTIMIZATION: Minify data to allow specific deep analysis of dozens of repos without hitting token limits
  const optimizedInput = repos.map(repo => {
    // Find matching analysis
    const analysis = analyses.find(a =>
      // Heuristic matching since IDs might vary between local/remote
      a.projectId === repo.id || (a.name && repo.name && a.name === repo.name)
    ) || {};

    return {
      name: repo.name,
      language: repo.language,
      description: repo.description,
      // Include critical forensic data
      techStack: repo.techSignature?.dependencies || [],
      vitality: analysis.vitalityScore,
      keyComponents: analysis.componentCatalog?.map((c: any) => c.name) || [],
      archPattern: analysis.architecturalPattern
    };
  });

  const prompt = `
    You are a Senior Technical Recruiter and Career Architect for FAANG-level roles.
    
    I have a portfolio of ${repos.length} repositories.
    
    Optimized Forensic Data:
    ${JSON.stringify(optimizedInput, null, 2)}
    
    Task: Create a "Distinguished Engineer's Portfolio Report".
    
    Return JSON with these exact sections:
    
    1. "executiveSummary": string 
       - 3 paragraphs.
       - Focus on: Breadth of technical vision, Ability to ship (Vitality), and Architectural diversity.
       
    2. "quantitativeHighlights": Object
       - "totalrepositories": number
       - "languagesBreakdown": Object { [lang: string]: number }
       - "dominantTechStack": string[]
       - "architecturalPatterns": string[]
       
    3. "engineeringPhilosophy": string 
       - Deduced from the code patterns.
       
    4. "projectShowcase": Array of the top 8-12 "Defining Projects".
       - "name": string
       - "roleDefinition": string
       - "problem": string
       - "solution": string
       - "impact": string
       - "techTags": string[]
       - "novelTechniques": string[] (Specific, non-banal technical implementations, e.g. "Custom Hydration Strategy", "Bitwise Permission System")
       
    5. "fullProjectRegistry": Array of Objects.
       - "name": string
       - "description": string
       - "status": "Active"|"Archive"
       - "category": string (SUGGEST A CATEGORY: e.g. "Systems", "UI/UX", "Data Pipelines", "Experiments")
       - "private": boolean (Inferred - is it likely a private/internal tool?)
       - "standoutFactor": string (Why is this unique? 1 sentence. No fluff.)
       
    6. "suggestedCategories": Object
       - "showFirst": string[] (Categories that show the strongest engineering value)
       - "combineCandidates": Array<{ category: string, repos: string[], reason: string }> (Repos that are mostly similar and could be merged in a resume)
       
    7. "skillsMatrix": Object { languages: string[], frameworks: string[], tools: string[], concepts: string[] }
    
    Style Guide:
    - NO FLUFF. Banned words: "Cutting-edge", "State-of-the-art", "Best-in-class".
    - Focus on NOVELTY. What did they build that isn't just 'npm install'?
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
        "model": process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet",
        "messages": [
          {
            "role": "system",
            "content": "You are a Senior Career Architect. Respond ONLY with valid JSON."
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
    const content = data.choices[0]?.message?.content || "{}";
    return JSON.parse(content);
  } catch (error: any) {
    throw new Error(error.message || "An error occurred during resume generation.");
  }
}
