import { NORMALIZATION_MAP } from '@/constants/scoring';
import { 
  batchSemanticMatch, 
  type SemanticMatch,
} from '@/utils/semanticMatcher';

/**
 * Normalize keywords (fix variations like next.js → nextjs)
 */
function normalize(keyword: string): string {
  const lower = keyword.toLowerCase().trim();
  return NORMALIZATION_MAP[lower] || lower;
}

/**
 * Match keywords between resume and job description using semantic similarity
 * 
 * Returns both exact matches and semantic matches with confidence scores
 */
export function matchKeywords(
  resumeKeywords: string[],
  jdKeywords: string[]
) {
  // Normalize all keywords first
  const normalizedResume = resumeKeywords.map(normalize);
  const normalizedJD = jdKeywords.map(normalize);

  // Use semantic matching for intelligent keyword matching
  const semanticResult = batchSemanticMatch(normalizedJD, normalizedResume);

  // For backward compatibility with existing code, return matched and missing arrays
  // But now they include semantically matched keywords too!
  const matched = semanticResult.matched;
  const missing = semanticResult.missing;

  // NEW: Return detailed match information for enhanced scoring
  return {
    matched,
    partialMatches: semanticResult.partialMatches,
    missing,
    matchDetails: semanticResult.matchDetails,
    semanticScore: semanticResult.semanticScore,
    totalKeywords: semanticResult.totalKeywords,
    matchedCount: semanticResult.matchedCount,
    partialCount: semanticResult.partialCount,
    missingCount: semanticResult.missingCount,
  };
}