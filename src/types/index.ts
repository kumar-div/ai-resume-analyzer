export type IssueSeverity = "high" | "medium" | "low";

export interface Issue {
  message: string;
  severity: IssueSeverity;
}

export type FeedbackItem = {
  type: 'critical' | 'improvement' | 'good';
  message: string;
};

export type ScoreBreakdownItem = {
  label: string;
  impact: number;
};

// NEW: Semantic match details
export interface SemanticMatchDetail {
  keyword: string;
  matchType: "exact" | "strong" | "related";
  score: number;
  matchedWith?: string;
  isCritical?: boolean;
}

export interface ResumeAnalysis {
  projectCount: number;
  hasMetrics: boolean;
  hasExperienceSection: boolean;
  hasProjectsSection: boolean;
  hasSkillsSection: boolean;
  hasSummarySection: boolean;
  criticalIssues: Issue[];
  improvements: string[];
  strengths: string[];
}

export interface AnalysisResult {
  score: number;
  baseScore: number;
  finalScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  feedback: FeedbackItem[];
  scoreBreakdown: ScoreBreakdownItem[];
  resumeAnalysis: ResumeAnalysis;
  isValidAnalysis: boolean;
  message?: string;
  llmAdjustment: {
    scoreAdjustment: number;
    reason: string;
    confidence: string;
  };
}

export interface LLMImprovementRewrite {
  original: string;
  improved: string;
}

export interface AILLMSuggestions {
  improvements: string[];
  rewrites: LLMImprovementRewrite[];
}

export interface AIFeedbackResponse {
  suggestions: string[];
  keywordOptimization: string[];
}

export interface ResumeRewriteSections {
  name?: string;
  role?: string;
  summary: string;
  experience: string;
  skills: string;
}

export interface ResumeRewriteResult {
  improvedText: string;
  sections: ResumeRewriteSections;
}

export interface ParseResumeRequest {
  file: File;
}

export interface ParseResumeResponse {
  text: string;
}