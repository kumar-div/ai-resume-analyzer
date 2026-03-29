import { SKILL_CATEGORIES, STOPWORDS, TECH_KEYWORDS_PATTERNS, NORMALIZATION_MAP } from "@/constants/scoring";

const DOMAIN_SKILLS = {
  tech: ["html", "css", "javascript", "react", "node", "api", "frontend", "backend", "typescript", "python", "java", "aws", "docker", "git"],
  hr: ["recruitment", "onboarding", "payroll", "employee engagement", "hr policies", "compliance", "attendance", "hrms", "talent acquisition", "performance management", "benefits", "labor relations", "training", "development"],
  finance: ["excel", "accounting", "tax", "financial analysis", "auditing", "banking", "forecasting", "budgeting", "reporting", "p&l"],
  medical: ["patient", "diagnosis", "treatment", "clinical", "pharmacy", "healthcare", "surgery"],
  generic: ["communication", "leadership", "management", "organization", "teamwork", "problem solving"]
};

const ALL_SKILLS = new Set(Object.values(SKILL_CATEGORIES).flat());

/**
 * Normalize keyword
 * Handles:
 * - next.js → nextjs
 * - react.js → react
 * - node.js → nodejs
 * - removes punctuation
 */
function normalize(word: string): string {
  if (!word) return "";

  const cleaned = word
    .toLowerCase()
    .trim()
    .replace(/[.,;:(){}\[\]!"'?<>]/g, "")
    .replace(/\s+/g, "")
    .replace(/\p{P}/gu, "")
    .replace(/next\.js/gi, "nextjs")
    .replace(/node\.js/gi, "nodejs");

  if (!cleaned) return "";

  // map known variants
  const mapped = NORMALIZATION_MAP[cleaned];
  return mapped || cleaned;
}

/**
 * Extract meaningful keywords from text, with special handling for requirements section
 */
export function extractKeywords(text: string, domain: string = 'tech'): string[] {
  if (!text) return [];

  const domainSet = new Set(DOMAIN_SKILLS[domain as keyof typeof DOMAIN_SKILLS] || DOMAIN_SKILLS.generic);

  const entry = text.toLowerCase();

  const candidates: string[] = [];

  // 1) quick pattern-based tech hits (only for tech domain)
  if (domain === 'tech') {
    TECH_KEYWORDS_PATTERNS.forEach((pattern) => {
      const matches = entry.match(pattern);
      if (matches) {
        matches.forEach((m) => candidates.push(m));
      }
    });
  }

  // 2) direct parsing for sentence-level cues
  const sentencePhrases = [
    { pattern: /\b(rest\s*api|restapi|rest-api)\b/gi, insert: ['api'] },
    { pattern: /\b(js)\b/gi, insert: ['javascript'] },
    { pattern: /\b(frontend)\b/gi, insert: ['frontend', 'html', 'css', 'javascript'] },
    { pattern: /\b(web apps?|web applications?|web sites?)\b/gi, insert: ['web', 'frontend', 'html', 'css', 'javascript'] },
    { pattern: /\b(responsive)\b/gi, insert: ['responsive'] },
    { pattern: /\b(api|graphql|rest)\b/gi, insert: ['api', 'rest'] },
  ];

  sentencePhrases.forEach((phrase) => {
    if (phrase.pattern.test(entry)) {
      phrase.insert.forEach((term) => candidates.push(term));
    }
  });

  // 3) tokens from text (handles bullets/paragraphs/mixed formats)
  const rawWords = entry
    .replace(/[-_/]/g, ' ')
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((w) => w.trim())
    .filter(Boolean);

  candidates.push(...rawWords);

  // 4) normalization -> unique -> domain filter
  const normalizedKeywords = candidates
    .map((k) => normalize(k))
    .filter((k) => k && k.length >= 2 && !STOPWORDS.has(k))
    .map((k) => (k === 'js' ? 'javascript' : k));

  const uniqueKeywords = Array.from(new Set(normalizedKeywords));

  const finalKeywords = uniqueKeywords.filter((keyword) => domainSet.has(keyword));

  const uniqueFinalKeywords = Array.from(new Set(finalKeywords));

  // DEBUG logs (mandatory as requested)
  console.log({
    extractedKeywords: candidates,
    normalizedKeywords: normalizedKeywords,
    uniqueKeywords: uniqueFinalKeywords,
  });

  return uniqueFinalKeywords;
}

/**
 * Extract keywords with requirements section prioritization
 */
export function extractKeywordsWithRequirements(text: string, domain: string = 'tech'): {
  allKeywords: string[];
  requirementsKeywords: string[];
} {
  const allKeywords = extractKeywords(text, domain);
  
  // Extract requirements section keywords
  const requirementsSection = extractRequirementsSection(text);
  const requirementsKeywords = requirementsSection ? extractKeywords(requirementsSection, domain) : [];
  
  return {
    allKeywords,
    requirementsKeywords,
  };
}

/**
 * Extract the requirements section from job description
 */
function extractRequirementsSection(text: string): string | null {
  const lowerText = text.toLowerCase();
  
  // Look for requirements section
  const requirementsPatterns = [
    /requirements?:?\s*\n([\s\S]*?)(?:\n\s*(?:qualifications|responsibilities|benefits|we offer|about us|how to apply)?:\s*\n|$)/i,
    /qualifications?:?\s*\n([\s\S]*?)(?:\n\s*(?:requirements|responsibilities|benefits|we offer|about us|how to apply)?:\s*\n|$)/i,
    /what you need:?([\s\S]*?)(?:\n\s*(?:what you'll do|responsibilities|benefits|we offer|about us|how to apply)?:\s*\n|$)/i,
    /skills required:?([\s\S]*?)(?:\n\s*(?:responsibilities|benefits|we offer|about us|how to apply)?:\s*\n|$)/i,
  ];
  
  for (const pattern of requirementsPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
}