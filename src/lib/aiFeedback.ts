import type { FeedbackItem } from '@/types';

// 🔥 STEP 3 — ADD FALLBACK AI FUNCTIONS

function generateFallbackStructuredAnalysis(
  jobDescription: string,
  resumeText: string,
  matchedKeywords: string[],
  missingKeywords: string[],
  baseScore: number,
  domain: string
): StructuredAnalysisResult {
  const keywordRatio = matchedKeywords.length / (matchedKeywords.length + missingKeywords.length);
  const keywordScore = Math.floor(keywordRatio * 100);

  return {
    score: baseScore,
    summary: `Resume analysis complete. ${matchedKeywords.length} keywords matched, ${missingKeywords.length} missing.`,
    issues: missingKeywords.length > 0 ? [
      `Missing ${missingKeywords.length} important keywords`,
      "Consider adding more quantifiable achievements"
    ] : ["Resume appears well-optimized for this role"],
    fixes: missingKeywords.slice(0, 3).map(keyword => ({
      problem: `Missing keyword: ${keyword}`,
      before: "",
      after: `Added ${keyword} to resume content`
    })),
    keywords: {
      matched: matchedKeywords,
      missing: missingKeywords
    },
    scoreBreakdown: {
      ats: {
        score: Math.floor(baseScore * 0.4),
        reason: "Basic ATS compatibility assessment"
      },
      keywords: {
        score: keywordScore,
        reason: `${matchedKeywords.length} of ${matchedKeywords.length + missingKeywords.length} keywords matched`
      },
      impact: {
        score: Math.floor(baseScore * 0.3),
        reason: "Basic impact assessment completed"
      }
    },
    improvedSummary: "Professional summary optimized for ATS systems and recruiter review."
  };
}

function generateFallbackAISuggestions(
  jobDescription: string,
  resumeText: string,
  missingKeywords: string[],
  partialMatches: string[],
  matchedKeywords: string[],
  finalScore: number
): StructuredAISuggestions {
  const suggestions = [];

  if (missingKeywords.length > 0) {
    suggestions.push(`Add missing keywords: ${missingKeywords.slice(0, 3).join(', ')}`);
  }

  if (finalScore < 70) {
    suggestions.push("Include more quantifiable achievements and metrics");
    suggestions.push("Strengthen action verbs in experience section");
  }

  if (matchedKeywords.length > 0) {
    suggestions.push(`Your resume already includes strong keywords: ${matchedKeywords.slice(0, 2).join(', ')}`);
  }

  return {
    scoreExplanation: `Resume scored ${finalScore}/100 based on keyword matching and content analysis.`,
    strengths: matchedKeywords.length > 0 ? [
      `Strong keyword alignment with ${matchedKeywords.length} matched terms`,
      "Resume structure appears professional"
    ] : ["Resume uploaded successfully"],
    weaknesses: missingKeywords.length > 0 ? [
      `Missing ${missingKeywords.length} relevant keywords`,
      "Could benefit from more specific achievements"
    ] : ["Analysis suggests minor optimizations possible"],
    missingKeywords: missingKeywords.slice(0, 5),
    actionableSuggestions: suggestions.length > 0 ? suggestions : [
      "Consider adding more industry-specific keywords",
      "Include quantifiable achievements where possible"
    ],
    improvedSummary: "Professional with experience in relevant technologies and proven track record of delivering results.",
    improvedBulletPoints: [
      "Developed and implemented solutions that improved efficiency",
      "Collaborated with cross-functional teams to deliver projects on time",
      "Utilized industry-standard tools and technologies"
    ]
  };
}
function safeJsonParse<T>(text: string, fallback: T): T {
  if (!text || typeof text !== 'string') {
    console.error('safeJsonParse: Invalid input text');
    return fallback;
  }

  let jsonText = text.trim();

  // Strategy 1: Direct JSON
  if (!jsonText.startsWith('{')) {
    // Strategy 2: Extract from text like "Here is the result: {...}"
    const match = text.match(/\{[\s\S]*?\}/);
    if (match) {
      jsonText = match[0];
      console.log("🔧 Extracted JSON from text:", jsonText);
    } else {
      console.error("❌ No JSON found in LLM response, using fallback");
      return fallback;
    }
  }

  try {
    const parsed = JSON.parse(jsonText);
    console.log("✅ Successfully parsed JSON");
    return parsed;
  } catch (err) {
    console.error("❌ JSON parse failed:", err);
    console.error("❌ Raw text that failed:", jsonText);
    return fallback;
  }
}

export async function getLLMScoreAdjustment(
  jobDescription: string,
  resumeText: string,
  extractedJobKeywords: string[],
  matchedKeywords: string[],
  missingKeywords: string[],
  baseScore: number,
  detectedDomain: string
): Promise<{ scoreAdjustment: number; reason: string; confidence: string } | null> {
  const prompt = `You are an ATS evaluator.

🔥 CRITICAL: Respond ONLY with valid JSON. No explanations, no markdown, no extra text.

Return EXACTLY this format:
{
  "scoreAdjustment": number,
  "reason": "string",
  "confidence": "low" | "medium" | "high"
}

Input:
- Job Description: ${jobDescription}
- Resume Text: ${resumeText}
- Extracted Job Keywords: ${extractedJobKeywords.join(', ')}
- Matched Keywords: ${matchedKeywords.join(', ')}
- Missing Keywords: ${missingKeywords.join(', ')}
- Base Score: ${baseScore}
- Detected Domain: ${detectedDomain}

Rules:
- scoreAdjustment: -5 to +5 only
- If unsure, use 0
- Keep reason under 50 characters
- Valid confidence: "low", "medium", or "high"`;

  let text = "";

  try {
    console.log("🔄 Calling Ollama LLM for score adjustment...");
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "phi",
        prompt: prompt,
        stream: false
      }),
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Ollama HTTP error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    text = data?.response || "";
    
    console.log("📥 OLLAMA RAW RESPONSE:", data);
    console.log("📝 OLLAMA TEXT:", text);

  } catch (error) {
    console.error("❌ OLLAMA CONNECTION ERROR:", error);
    console.error("💡 Ollama may not be running. Start it with: ollama serve");
    console.error("💡 Or install/start Ollama if not installed.");
    
    // Return fallback without crashing
    return {
      scoreAdjustment: 0,
      reason: "LLM unavailable: connection failed",
      confidence: "low"
    };
  }

  // Harden JSON extraction - local models often add junk
  let llmResult = null;

  if (text) {
    // Use safe JSON parsing with fallback
    const parsed = safeJsonParse(text, null);

    if (parsed && typeof parsed.scoreAdjustment === "number") {
      // Clamp to -5 to +5 range
      llmResult = {
        scoreAdjustment: Math.max(-5, Math.min(5, parsed.scoreAdjustment)),
        reason: parsed.reason || "LLM adjustment",
        confidence: parsed.confidence || "low"
      };
      console.log("✅ Valid LLM result:", llmResult);
    } else {
      console.error("❌ Invalid scoreAdjustment type or missing data");
    }
  } else {
    console.error("❌ Empty response from Ollama");
  }

  console.log("LLM PARSED:", llmResult);

  // 🔥 STEP 3 — FORCE VALID FALLBACK — NEVER break system
  if (!llmResult) {
    console.log("⚠️ Using fallback LLM result");
    llmResult = {
      scoreAdjustment: 0,
      reason: "Basic analysis generated",
      confidence: "low"
    };
  }

  return llmResult;
}

export interface LLMImprovementRewrite {
  original: string;
  improved: string;
}

export interface AILLMSuggestions {
  improvements: string[];
  rewrites: LLMImprovementRewrite[];
}

export async function getLLMImprovementSuggestions(
  jobDescription: string,
  resumeText: string,
  missingKeywords: string[],
  partialMatches: string[],
  matchedKeywords: string[]
): Promise<AILLMSuggestions | null> {
  const prompt = `You are an expert resume coach.

You will ONLY improve the USER'S RESUME.

DO NOT rewrite or repeat the job description.

----------------------------------

Return output in this EXACT format:

IMPROVEMENTS:
- improvement 1
- improvement 2
- improvement 3

REWRITES:
Original: <resume bullet>
Improved: <better version>

Original: <resume bullet>
Improved: <better version>

----------------------------------

Rules:
- Only use resume content
- Do NOT include job description text
- Keep it concise
- No explanations outside this format
`;

  let text = "";

  try {
    console.log("🔄 Calling Ollama LLM for improvement suggestions...");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "phi",
        prompt,
        stream: false,
        // structured prompt inputs are in prompt, but include context explicitly
        resumeText,
        jobDescription,
        missingKeywords,
        matchedKeywords,
        partialMatches,
      }),
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`Ollama HTTP error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    text = (data?.response || "").toString();
    console.log("LLM RAW:", text);
  } catch (error) {
    console.error("❌ OLLAMA SUGGESTIONS ERROR:", error);
    return null;
  }

  if (!text || !text.trim()) {
    console.log("❌ Empty LLM response");
    return null;
  }

  const raw = text.trim();
  const improvementsMarker = "IMPROVEMENTS:";
  const rewritesMarker = "REWRITES:";

  const improvementsIdx = raw.indexOf(improvementsMarker);
  const rewritesIdx = raw.indexOf(rewritesMarker);

  if (improvementsIdx === -1 || rewritesIdx === -1 || rewritesIdx <= improvementsIdx) {
    console.log("❌ Failed to find required markers in response");
    return null;
  }

  const improvementsText = raw.substring(improvementsIdx + improvementsMarker.length, rewritesIdx).trim();
  const rewritesText = raw.substring(rewritesIdx + rewritesMarker.length).trim();

  const improvements = improvementsText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('-'))
    .map((line) => line.replace(/^\s*-\s*/, '').trim())
    .filter((line) => line.length > 0)
    .slice(0, 5);

  const rewritesLines = rewritesText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const rewrites: AILLMSuggestions['rewrites'] = [];
  let currentOriginal: string | null = null;

  for (const line of rewritesLines) {
    if (line.toLowerCase().startsWith('original:')) {
      currentOriginal = line.substring('original:'.length).trim();
      continue;
    }

    if (line.toLowerCase().startsWith('improved:') && currentOriginal) {
      const improvedText = line.substring('improved:'.length).trim();
      if (improvedText.length > 0) {
        rewrites.push({ original: currentOriginal, improved: improvedText });
      }
      currentOriginal = null;
      if (rewrites.length >= 3) break;
    }
  }

  const forbiddenPhrases = ['we are looking for', 'responsibilities', 'requirements'];
  const filteredRewrites = rewrites.filter((item) => {
    const originalLc = item.original.toLowerCase();
    return !forbiddenPhrases.some((phrase) => originalLc.includes(phrase));
  }).slice(0, 3);

  const suggestions: AILLMSuggestions = {
    improvements,
    rewrites: filteredRewrites,
  };

  console.log('PARSED SUGGESTIONS:', suggestions);

  if (!suggestions.improvements.length && !suggestions.rewrites.length) {
    return null;
  }

  return suggestions;
}

export interface StructuredAnalysisResult {
  score: number;
  summary: string;
  issues: string[];
  fixes: {
    problem: string;
    before: string;
    after: string;
  }[];
  keywords: {
    matched: string[];
    missing: string[];
  };
  scoreBreakdown: {
    ats: {
      score: number;
      reason: string;
    };
    keywords: {
      score: number;
      reason: string;
    };
    impact: {
      score: number;
      reason: string;
    };
  };
  improvedSummary: string;
}

export interface StructuredAISuggestions {
  scoreExplanation: string;
  strengths: string[];
  weaknesses: string[];
  missingKeywords: string[];
  actionableSuggestions: string[];
  improvedSummary: string;
  improvedBulletPoints: string[];
}

export async function getStructuredAnalysis(
  jobDescription: string,
  resumeText: string,
  matchedKeywords: string[],
  missingKeywords: string[],
  baseScore: number,
  domain: string
): Promise<StructuredAnalysisResult | null> {
  const prompt = `You are an expert ATS evaluator and resume coach.

🔥 CRITICAL: Respond ONLY with valid JSON. No explanations, no markdown, no extra text.

Return EXACTLY this format:
{
  "score": ${baseScore},
  "summary": "1-2 line evaluation",
  "issues": ["issue 1", "issue 2"],
  "fixes": [
    {
      "problem": "specific problem",
      "before": "original text",
      "after": "improved text"
    }
  ],
  "keywords": {
    "matched": ${JSON.stringify(matchedKeywords)},
    "missing": ${JSON.stringify(missingKeywords)}
  },
  "scoreBreakdown": {
    "ats": {
      "score": ${Math.floor(baseScore * 0.4)},
      "reason": "ATS compatibility explanation"
    },
    "keywords": {
      "score": ${Math.floor((matchedKeywords.length / (matchedKeywords.length + missingKeywords.length)) * 100)},
      "reason": "Keyword coverage explanation"
    },
    "impact": {
      "score": ${Math.floor(baseScore * 0.3)},
      "reason": "Impact assessment explanation"
    }
  },
  "improvedSummary": "Rewritten summary"
}

Resume: ${resumeText.substring(0, 2000)}
Job Description: ${jobDescription.substring(0, 2000)}
Domain: ${domain}`;

  let text = "";

  try {
    console.log("🔄 Calling Ollama LLM for structured analysis...");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout for complex analysis

    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "phi",
        prompt,
        stream: false,
      }),
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`Ollama HTTP error: ${response.status} ${response.statusText}`);
      // 🔥 STEP 3 — FALLBACK WHEN AI FAILS
      console.log("⚠️ Using fallback structured analysis");
      return generateFallbackStructuredAnalysis(jobDescription, resumeText, matchedKeywords, missingKeywords, baseScore, domain);
    }

    const data = await response.json();
    text = (data?.response || "").toString();
    console.log("LLM RAW:", text);
  } catch (error) {
    console.error("❌ OLLAMA STRUCTURED ANALYSIS ERROR:", error);
    // 🔥 STEP 3 — FALLBACK WHEN AI FAILS
    console.log("⚠️ Using fallback structured analysis");
    return generateFallbackStructuredAnalysis(jobDescription, resumeText, matchedKeywords, missingKeywords, baseScore, domain);
  }

  if (!text || !text.trim()) {
    console.log("❌ Empty LLM response");
    // 🔥 STEP 3 — FALLBACK WHEN AI FAILS
    console.log("⚠️ Using fallback structured analysis");
    return generateFallbackStructuredAnalysis(jobDescription, resumeText, matchedKeywords, missingKeywords, baseScore, domain);
  }

  // 🔥 STEP 1 — SAFE JSON PARSING
  const parsed = safeJsonParse(text, null);

  if (!parsed) {
    console.error("❌ Failed to parse structured analysis JSON");
    // 🔥 STEP 3 — FALLBACK WHEN AI FAILS
    console.log("⚠️ Using fallback structured analysis");
    return generateFallbackStructuredAnalysis(jobDescription, resumeText, matchedKeywords, missingKeywords, baseScore, domain);
  }

  // 🔥 STEP 2 — VALIDATE STRUCTURE
  const requiredFields = {
    score: 'number',
    summary: 'string',
    issues: 'array',
    fixes: 'array',
    keywords: 'object',
    scoreBreakdown: 'object',
    improvedSummary: 'string'
  };

  const isValid = Object.entries(requiredFields).every(([field, type]) => {
    const value = parsed[field];
    if (type === 'array') return Array.isArray(value);
    if (type === 'object') return value && typeof value === 'object';
    return typeof value === type;
  });

  if (!isValid) {
    console.error("❌ Invalid structure in parsed JSON");
    // 🔥 STEP 3 — FALLBACK WHEN AI FAILS
    console.log("⚠️ Using fallback structured analysis");
    return generateFallbackStructuredAnalysis(jobDescription, resumeText, matchedKeywords, missingKeywords, baseScore, domain);
  }

  console.log("✅ Valid structured analysis parsed");
  return parsed as StructuredAnalysisResult;
}

export async function getStructuredAISuggestions(
  jobDescription: string,
  resumeText: string,
  missingKeywords: string[],
  partialMatches: string[],
  matchedKeywords: string[],
  finalScore: number
): Promise<StructuredAISuggestions | null> {
  const prompt = `You are an expert resume coach and ATS evaluator.

🔥 CRITICAL: Respond ONLY with valid JSON. No explanations, no markdown, no extra text.

Return EXACTLY this format:
{
  "scoreExplanation": "Brief explanation of score",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
  "missingKeywords": ["keyword 1", "keyword 2"],
  "actionableSuggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
  "improvedSummary": "Rewritten summary",
  "improvedBulletPoints": ["bullet 1", "bullet 2", "bullet 3"]
}

Resume: ${resumeText.substring(0, 2000)}
Job Description: ${jobDescription.substring(0, 2000)}
Current Score: ${finalScore}/100
Matched Keywords: ${matchedKeywords.join(', ')}
Missing Keywords: ${missingKeywords.join(', ')}
Partial Matches: ${partialMatches.join(', ')}`;

  let text = "";

  try {
    console.log("🔄 Calling Ollama LLM for structured suggestions...");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "phi",
        prompt,
        stream: false,
      }),
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`Ollama HTTP error: ${response.status} ${response.statusText}`);
      // 🔥 STEP 3 — FALLBACK WHEN AI FAILS
      console.log("⚠️ Using fallback AI suggestions");
      return generateFallbackAISuggestions(jobDescription, resumeText, missingKeywords, partialMatches, matchedKeywords, finalScore);
    }

    const data = await response.json();
    text = (data?.response || "").toString();
    console.log("LLM RAW:", text);
  } catch (error) {
    console.error("❌ OLLAMA STRUCTURED SUGGESTIONS ERROR:", error);
    // 🔥 STEP 3 — FALLBACK WHEN AI FAILS
    console.log("⚠️ Using fallback AI suggestions");
    return generateFallbackAISuggestions(jobDescription, resumeText, missingKeywords, partialMatches, matchedKeywords, finalScore);
  }

  if (!text || !text.trim()) {
    console.log("❌ Empty LLM response");
    // 🔥 STEP 3 — FALLBACK WHEN AI FAILS
    console.log("⚠️ Using fallback AI suggestions");
    return generateFallbackAISuggestions(jobDescription, resumeText, missingKeywords, partialMatches, matchedKeywords, finalScore);
  }

  // 🔥 STEP 1 — SAFE JSON PARSING
  const parsed = safeJsonParse(text, null);

  if (!parsed) {
    console.error("❌ Failed to parse structured suggestions JSON");
    // 🔥 STEP 3 — FALLBACK WHEN AI FAILS
    console.log("⚠️ Using fallback AI suggestions");
    return generateFallbackAISuggestions(jobDescription, resumeText, missingKeywords, partialMatches, matchedKeywords, finalScore);
  }

  // 🔥 STEP 2 — VALIDATE STRUCTURE
  const requiredFields = {
    scoreExplanation: 'string',
    strengths: 'array',
    weaknesses: 'array',
    missingKeywords: 'array',
    actionableSuggestions: 'array',
    improvedSummary: 'string',
    improvedBulletPoints: 'array'
  };

  const isValid = Object.entries(requiredFields).every(([field, type]) => {
    const value = parsed[field];
    if (type === 'array') return Array.isArray(value);
    return typeof value === type;
  });

  if (!isValid) {
    console.error("❌ Invalid structure in parsed JSON");
    // 🔥 STEP 3 — FALLBACK WHEN AI FAILS
    console.log("⚠️ Using fallback AI suggestions");
    return generateFallbackAISuggestions(jobDescription, resumeText, missingKeywords, partialMatches, matchedKeywords, finalScore);
  }

  console.log("✅ Valid structured suggestions parsed");
  return parsed as StructuredAISuggestions;
}

// Critical skills that are deal-breakers if missing
const CRITICAL_SKILLS = [
  'backend', 'database', 'cloud', 'aws', 'azure', 'gcp', 
  'kubernetes', 'docker', 'mongodb', 'postgresql', 'mysql',
  'react', 'nextjs', 'javascript', 'nodejs', 'api'
];

// Skills that would be nice to have but not critical
const IMPROVEMENT_SKILLS = [
  'typescript', 'python', 'java', 'tailwind', 'sass', 'graphql',
  'redux', 'jest', 'cypress', 'webpack', 'vite', 'git'
];

export function generateAIFeedback(
  matched: string[],
  missing: string[],
  resumeText: string,
  domain: 'tech' | 'hr' | 'finance' | 'medical' | 'generic' = 'tech'
): FeedbackItem[] {
  const feedback: FeedbackItem[] = [];

  const missingCritical = CRITICAL_SKILLS.filter((skill) =>
    missing.includes(skill)
  );
  missingCritical.forEach((skill) => {
    feedback.push({
      type: 'critical',
      message: getSuggestion(skill),
    });
  });

  const missingImprovement = IMPROVEMENT_SKILLS.filter((skill) =>
    missing.includes(skill)
  );
  missingImprovement.forEach((skill) => {
    feedback.push({
      type: 'improvement',
      message: getSuggestion(skill),
    });
  });

  if (!/\d/.test(resumeText)) {
    feedback.push({
      type: 'critical',
      message:
        'Resume is not quantified. Without metrics ("30% improvement", "handled $2M accounts"), recruiters will assume you lack impact. Add numbers everywhere.',
    });
  }

  if (resumeText.length < 800) {
    feedback.push({
      type: 'critical',
      message:
        'Resume is too short. At this length, recruiters will pass. You need 800+ characters with concrete project examples, results, and technical depth.',
    });
  }

  if (matched.length >= 7) {
    feedback.push({
      type: 'good',
      message:
        'Excellent! Strong keyword alignment with this role. You should get through the ATS round easily.',
    });
  }

  if (domain !== 'tech') {
    feedback.push({
      type: 'improvement',
      message:
        'This analyzer is optimized for tech roles; non-tech estimates can be less accurate. Use domain-specific review for best results.',
    });
  }

  if (
    matched.includes('javascript') &&
    (matched.includes('react') || matched.includes('nextjs'))
  ) {
    feedback.push({
      type: 'good',
      message:
        'Your JavaScript + React/Next.js combination is exactly what modern SaaS teams want. You\'re competitive for mid-level roles.',
    });
  }

  if (missingCritical.length > 0 && matched.length < 3) {
    feedback.push({
      type: 'critical',
      message:
        'Your resume is missing too many core technologies. Recruiters will likely reject this immediately. Focus on filling the critical gaps.',
    });
  }

  return feedback;
}

function getSuggestion(skill: string): string {
  const suggestions: Record<string, string> = {
    react:
      'React is a core requirement for frontend roles. Consider adding a project demonstrating components, hooks, and state management.',
    nextjs:
      'Next.js is increasingly expected for modern web development. Include a project showcasing routing, API routes, or server-side rendering.',
    javascript:
      'JavaScript is fundamental for web development. Highlight projects using ES6+, async/await, and modern patterns.',
    tailwind:
      'Tailwind CSS shows modern styling skills. Include examples of responsive design and utility classes.',
    api:
      'API integration experience is valuable. Show projects using fetch, axios, or third-party services.',
    rest:
      'REST API knowledge is important. Include CRUD operations and backend integration examples.',
    responsive:
      'Responsive design is critical for modern web. Demonstrate mobile-first approaches and cross-device compatibility.',
  };

  return (
    suggestions[skill] ||
    `Consider adding more details about ${skill} to strengthen your application.`
  );
}