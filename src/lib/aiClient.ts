import type { AIFeedbackResponse } from '@/types';

/**
 * Generate AI feedback for resume improvement using local Ollama
 */
export async function generateFeedback(
  resumeText: string,
  jobDescription: string,
  missingKeywords: string[]
): Promise<AIFeedbackResponse> {
  
  const prompt = `You are an expert resume reviewer. Given a resume and a job description, provide constructive feedback.

Resume:
${resumeText}

Job Description:
${jobDescription}

Missing Keywords Found in Job Description:
${missingKeywords.join(', ')}

Please provide:
1. 3-5 specific improvement suggestions for this resume
2. 3-5 keyword optimization tips to better match the job description

Format your response as JSON with the structure:
{
  "suggestions": ["suggestion 1", "suggestion 2", ...],
  "keywordOptimization": ["tip 1", "tip 2", ...]
}

Respond ONLY with valid JSON, no additional text.`;

  let text = "";

  try {
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

    const data = await response.json();
    text = data?.response || "";

  } catch (error) {
    console.error("OLLAMA ERROR:", error);
  }

  console.log("LLM RAW:", text);

  // Harden JSON extraction - local models often add junk
  let llmResult = null;

  if (text) {
    const match = text.match(/\{[\s\S]*?\}/); // non-greedy match

    if (match) {
      try {
        const parsed = JSON.parse(match[0]);

        if (Array.isArray(parsed.suggestions) && Array.isArray(parsed.keywordOptimization)) {
          llmResult = parsed;
        }
      } catch (err) {
        console.error("JSON parse failed:", err);
      }
    }
  }

  console.log("LLM PARSED:", llmResult);

  // Fallback - NEVER break system
  if (!llmResult) {
    return {
      suggestions: [
        "Add quantified metrics (e.g., '30% improvement', '$2M handled')",
        "Include technical projects with technologies used",
        "Ensure resume is at least 800 characters with concrete examples",
        "Review for ATS-friendly formatting (no complex layouts)",
        "Add skills section with relevant keywords from job description"
      ],
      keywordOptimization: [
        "Use exact keywords from the job description",
        "Highlight core technical skills prominently",
        "Include variations of key terms (e.g., 'API development' vs 'REST APIs')",
        "Place important keywords early in your resume",
        "Ensure skills section matches job description requirements"
      ],
    };
  }

  return {
    suggestions: llmResult.suggestions || [],
    keywordOptimization: llmResult.keywordOptimization || [],
  };
}
