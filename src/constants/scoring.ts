// 🔹 Score distribution
export const KEYWORD_MATCH_WEIGHT = 0.7; // increase importance
export const CONTENT_QUALITY_WEIGHT = 0.3;

// 🔹 Stopwords (cleaned + expanded)
export const STOPWORDS = new Set([
  "the", "and", "or", "a", "an", "to", "for", "with", "of", "in", "on", "at", "by", "from",
  "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
  "should", "must", "can", "will", "would",
  "he", "she", "they", "we",
  "candidate", "candidates", "role", "job", "position",
  "responsible", "requirement", "required",
  "able", "ability", "etc", "plus",
  "looking", "required", "skills", "experience", "knowledge",
  "developer", "develop", "using", "based", "work",
  "team", "good", "strong", "role", "responsible", "job"
]);

// 🔹 Skill categories for realistic matching
export const SKILL_CATEGORIES: Record<string, string[]> = {
  frontend: ["html", "css", "javascript", "react", "nextjs", "tailwind"],
  backend: ["nodejs", "express", "django", "spring", "api", "rest"],
  database: ["mongodb", "mysql", "postgresql", "redis"],
  devops: ["docker", "kubernetes", "aws", "ci", "cd"],
  tools: ["git", "github", "jira"],
  concepts: ["responsive", "testing", "performance", "security"],
};

export const DOMAIN_SKILLS: Record<string, string[]> = {
  tech: [
    "html",
    "css",
    "javascript",
    "react",
    "nextjs",
    "tailwind",
    "nodejs",
    "express",
    "api",
    "rest",
    "mongodb",
    "mysql",
    "postgresql",
    "redis",
    "docker",
    "kubernetes",
    "aws",
    "git",
    "github",
    "jira",
    "responsive",
    "testing",
    "performance",
    "security",
    "frontend",
    "web",
  ],
  finance: ["excel", "accounting", "banking", "analysis", "audit", "forecasting", "budgeting", "reporting"],
  medical: ["patient", "diagnosis", "treatment", "clinical", "pharmacy", "healthcare", "surgery", "medical"],
  generic: ["communication", "leadership", "teamwork", "problem solving", "organization", "project management", "adaptability"],
};

export const SKILL_WHITELIST = new Set(
  Object.values(SKILL_CATEGORIES).flat()
);

// 🔹 Tech keyword patterns (keep yours, slightly improved)
export const TECH_KEYWORDS_PATTERNS = [
  /\b(python|javascript|typescript|java|c\+\+|c#|rust|go|kotlin|swift)\b/gi,
  /\b(react|angular|vue|next\.?js|svelte)\b/gi,
  /\b(node\.?js|express|fastapi|django|flask|spring)\b/gi,
  /\b(sql|postgres|mongodb|mysql|redis|firebase)\b/gi,
  /\b(aws|azure|gcp|docker|kubernetes)\b/gi,
  /\b(git|github|gitlab)\b/gi,
  /\b(html|css|tailwind|bootstrap)\b/gi,
  /\b(rest|graphql|api)\b/gi,
];

// 🔥 NEW: Keyword importance weights (THIS IS THE CORE UPGRADE)
export const KEYWORD_WEIGHTS: Record<string, number> = {
  // 🔴 CORE STACK (critical)
  react: 5,
  nextjs: 5,
  javascript: 4,
  tailwind: 4,

  // 🟠 IMPORTANT
  api: 3,
  rest: 3,
  nodejs: 3,

  // 🟡 SUPPORTING
  css: 2,
  html: 2,
  responsive: 2,
  frontend: 2,
  design: 2,

  // ⚪ fallback default = 1
};

// 🔥 NEW: Normalization map (fix duplicates & variants)
export const NORMALIZATION_MAP: Record<string, string> = {
  "next.js": "nextjs",
  "nextjs": "nextjs",
  "react.js": "react",
  "node.js": "nodejs",
  "nodejs": "nodejs",
  "apis": "api",
  "restful": "rest",
  "rest api": "api",
  "restapi": "api",
  "rest-api": "api",
  "js": "javascript",
  "frontend": "frontend",
  "web": "web",
};