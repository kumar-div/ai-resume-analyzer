/**
 * Semantic Similarity Matcher
 * 
 * Matches keywords based on:
 * 1. Exact match (score: 1.0)
 * 2. Synonym match (score: 0.7)
 * 3. String similarity (score: 0.4-0.6)
 */

/**
 * Semantic Similarity Matcher
 * 
 * Matches keywords based on:
 * 1. Exact match (score: 1.0)
 * 2. Strong synonym match (score: 0.7) - direct equivalents
 * 3. Related match (score: 0.3) - loosely related concepts
 */

// ============================================================================
// SYNONYM MAPS - Categorized by match strength
// ============================================================================

// STRONG SYNONYMS: Direct equivalents, abbreviations, alternative names
const STRONG_SYNONYMS: Record<string, string[]> = {
  // Frontend
  "javascript": ["js", "ecmascript"],
  "react": ["reactjs"],
  "nextjs": ["next.js", "next"],
  "html": ["markup"],
  "css": ["stylesheets"],
  "tailwind": ["tailwindcss"],
  "frontend": ["client-side"],
  
  // Backend
  "nodejs": ["node", "node.js"],
  "express": ["expressjs"],
  "rest": ["restful", "rest api"],
  
  // Databases
  "mongodb": ["mongo"],
  "postgresql": ["postgres"],
  "mysql": ["sql"],
  "redis": ["cache"],
  
  // DevOps & Cloud
  "docker": ["containerization"],
  "kubernetes": ["k8s"],
  "aws": ["amazon"],
  "azure": ["microsoft"],
  "gcp": ["google"],
  
  // Tools & Version Control
  "github": ["repository"],
  "gitlab": ["repository"],
  "git": ["version control", "scm"],
  
  // Concepts
  "responsive": ["mobile", "adaptive"],
  "performance": ["optimization", "speed"],
  "security": ["encryption", "authentication"],
  "testing": ["qa", "quality assurance"],
  
  // Soft Skills
  "communication": ["interpersonal"],
  "teamwork": ["collaboration", "team"],
  "leadership": ["management", "lead"],
  "problem solving": ["analytical", "critical thinking"],
};

// RELATED CONCEPTS: Loosely related but NOT the same skill
const RELATED_CONCEPTS: Record<string, string[]> = {
  // Frontend related
  "frontend": ["ui", "web", "client"],
  
  // Backend related  
  "backend": ["server", "server-side", "services"],
  "api": ["endpoint", "web service", "integration"],
  
  // Database related
  "database": ["db", "nosql", "data"],
  
  // Cloud related
  "aws": ["cloud"],
  "azure": ["cloud"], 
  "gcp": ["cloud"],
  
  // DevOps related
  "docker": ["containers"],
  "kubernetes": ["orchestration"],
  
  // Tools related
  "github": ["version control"],
  "gitlab": ["version control"],
};

// CRITICAL SKILLS: Only allow exact or strong matches, no related
const CRITICAL_SKILLS = new Set([
  'backend', 'database', 'cloud', 'aws', 'azure', 'gcp', 
  'kubernetes', 'docker', 'mongodb', 'postgresql', 'mysql',
  'react', 'nextjs', 'javascript', 'nodejs', 'api'
]);

// ============================================================================
// STRING SIMILARITY - Levenshtein distance approach
// ============================================================================

/**
 * Calculate string similarity using Levenshtein distance
 * Returns score between 0 and 1 (1 = identical)
 */
export function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  // Quick check: very different lengths
  if (Math.abs(s1.length - s2.length) > Math.max(s1.length, s2.length) * 0.5) {
    return 0;
  }

  // Levenshtein distance
  const matrix: number[][] = [];

  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  const distance = matrix[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);
  const similarity = (maxLength - distance) / maxLength;

  return Math.max(0, Math.min(1, similarity));
}

// ============================================================================
// SEMANTIC MATCHING - Find matches with confidence scores
// ============================================================================

export interface SemanticMatch {
  keyword: string;
  matchType: "exact" | "strong" | "related"; // Updated match types
  score: number;           // 1.0 = exact, 0.7 = strong, 0.3 = related
  matchedWith?: string;    // What it matched with
  isCritical?: boolean;    // Whether this is a critical skill
}

/**
 * Find semantic matches for a keyword
 * 
 * @param keyword - Keyword to match
 * @param candidates - List of candidate keywords to search
 * @returns SemanticMatch with score, or null if no good match
 */
export function findSemanticMatch(
  keyword: string,
  candidates: Set<string>
): SemanticMatch | null {
  const lower = keyword.toLowerCase().trim();
  const candidateArray = Array.from(candidates);
  const isCritical = CRITICAL_SKILLS.has(lower);

  // 1. CHECK EXACT MATCH
  for (const candidate of candidateArray) {
    if (candidate.toLowerCase() === lower) {
      return {
        keyword,
        matchType: "exact",
        score: 1.0,
        isCritical,
      };
    }
  }

  // 2. CHECK STRONG SYNONYM MATCH
  const strongSynonyms = STRONG_SYNONYMS[lower] || [];
  for (const synonym of strongSynonyms) {
    for (const candidate of candidateArray) {
      if (candidate.toLowerCase() === synonym.toLowerCase()) {
        return {
          keyword,
          matchType: "strong",
          score: 0.7,
          matchedWith: candidate,
          isCritical,
        };
      }
    }
  }

  // 3. CHECK REVERSE - candidate has keyword as strong synonym
  for (const candidate of candidateArray) {
    const candidateStrongSynonyms = STRONG_SYNONYMS[candidate.toLowerCase()] || [];
    for (const syn of candidateStrongSynonyms) {
      if (syn.toLowerCase() === lower) {
        return {
          keyword,
          matchType: "strong",
          score: 0.7,
          matchedWith: candidate,
          isCritical,
        };
      }
    }
  }

  // 4. CHECK RELATED CONCEPTS (only if not critical skill)
  if (!isCritical) {
    const relatedConcepts = RELATED_CONCEPTS[lower] || [];
    for (const related of relatedConcepts) {
      for (const candidate of candidateArray) {
        if (candidate.toLowerCase() === related.toLowerCase()) {
          return {
            keyword,
            matchType: "related",
            score: 0.3,
            matchedWith: candidate,
            isCritical,
          };
        }
      }
    }

    // 5. CHECK REVERSE - candidate has keyword as related concept
    for (const candidate of candidateArray) {
      const candidateRelated = RELATED_CONCEPTS[candidate.toLowerCase()] || [];
      for (const rel of candidateRelated) {
        if (rel.toLowerCase() === lower) {
          return {
            keyword,
            matchType: "related",
            score: 0.3,
            matchedWith: candidate,
            isCritical,
          };
        }
      }
    }
  }

  return null;
}

/**
 * Sophisticated multi-pass keyword matching
 * 
 * @param jobKeywords - Keywords extracted from job description
 * @param resumeKeywords - Keywords extracted from resume
 * @returns { matched, partialMatches, missing, matchDetails }
 */
export function semanticKeywordMatch(
  jobKeywords: string[],
  resumeKeywords: string[]
) {
  const normalized = new Set(resumeKeywords.map(k => k.toLowerCase().trim()));
  
  const matched: string[] = [];
  const partialMatches: string[] = [];
  const missing: string[] = [];
  const matchDetails: Map<string, SemanticMatch> = new Map();

  for (const jobKeyword of jobKeywords) {
    const match = findSemanticMatch(jobKeyword, normalized);
    
    if (match) {
      matchDetails.set(jobKeyword, match);
      
      // Categorize based on match type
      if (match.matchType === 'exact' || match.matchType === 'strong') {
        matched.push(jobKeyword);
      } else if (match.matchType === 'related') {
        partialMatches.push(jobKeyword);
      }
    } else {
      missing.push(jobKeyword);
    }
  }

  return {
    matched,
    partialMatches,
    missing,
    matchDetails,
  };
}

/**
 * Calculate weighted match score
 * 
 * Uses semantic similarity scores instead of binary on/off
 * 
 * @param matchDetails - Semantic match details
 * @returns Score between 0 and 1
 */
export function calculateSemanticScore(
  matchDetails: Map<string, SemanticMatch>,
  totalKeywords: number
): number {
  if (totalKeywords === 0) return 0;

  let totalScore = 0;

  for (const match of matchDetails.values()) {
    totalScore += match.score;
  }

  return Math.min(1, totalScore / totalKeywords);
}

// ============================================================================
// BATCH MATCHING - Match multiple keywords at once
// ============================================================================

export interface BatchMatchResult {
  matched: string[];
  partialMatches: string[];  // NEW: Related matches that don't count as full matches
  missing: string[];
  matchDetails: Map<string, SemanticMatch>;
  semanticScore: number;  // 0-1 based on scores, not binary
  totalKeywords: number;
  matchedCount: number;
  partialCount: number;    // NEW: Count of partial matches
  missingCount: number;
}

/**
 * Batch match multiple keywords with semantic analysis
 */
export function batchSemanticMatch(
  jobKeywords: string[],
  resumeKeywords: string[]
): BatchMatchResult {
  const result = semanticKeywordMatch(jobKeywords, resumeKeywords);
  const semanticScore = calculateSemanticScore(
    result.matchDetails,
    jobKeywords.length
  );

  return {
    matched: result.matched,
    partialMatches: result.partialMatches,
    missing: result.missing,
    matchDetails: result.matchDetails,
    semanticScore,
    totalKeywords: jobKeywords.length,
    matchedCount: result.matched.length,
    partialCount: result.partialMatches.length,
    missingCount: result.missing.length,
  };
}

// ============================================================================
// EXPORT SYNONYMS - For debugging and analysis
// ============================================================================

export function getSynonyms(keyword: string): string[] {
  const lower = keyword.toLowerCase();
  return STRONG_SYNONYMS[lower] || [];
}

export function getRelatedConcepts(keyword: string): string[] {
  const lower = keyword.toLowerCase();
  return RELATED_CONCEPTS[lower] || [];
}

export function getAllSynonyms(): Record<string, string[]> {
  return { ...STRONG_SYNONYMS };
}

export function getAllRelatedConcepts(): Record<string, string[]> {
  return { ...RELATED_CONCEPTS };
}
