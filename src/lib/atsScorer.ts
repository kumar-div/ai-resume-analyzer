import type { ScoreBreakdownItem, SemanticMatchDetail } from '@/types';

const KEYWORD_SCORE_MAX = 70;
const CONTENT_SCORE_MAX = 30;

const KEYWORD_WEIGHTS: Record<string, number> = {
  // core skills
  react: 3,
  nextjs: 3,
  javascript: 3,
  typescript: 3,
  nodejs: 3,
  api: 3,
  rest: 3,
  html: 3,
  css: 3,

  // secondary skills
  aws: 2,
  docker: 2,
  kubernetes: 2,
  graphql: 2,
  mongodb: 2,
  mysql: 2,
  postgresql: 2,
  redis: 2,
  git: 2,
  github: 2,
  responsive: 2,

  // optional skills
  tailwind: 1,
  jira: 1,
  testing: 1,
  performance: 1,
  security: 1,
  frontend: 1,
  web: 1,
};

function weightFor(keyword: string, requirementsKeywords?: string[]): number {
  const baseWeight = KEYWORD_WEIGHTS[keyword.toLowerCase()] || 1;
  
  // Give 2x weight to requirements keywords (they're critical)
  if (requirementsKeywords && requirementsKeywords.includes(keyword.toLowerCase())) {
    return baseWeight * 2;
  }
  
  return baseWeight;
}

/**
 * Calculate semantic match score with weighted confidence
 * 
 * Uses semantic match scores instead of binary on/off
 * - Exact match: full weight
 * - Synonym match: 70% weight
 * - Similarity match: weighted by confidence (0.4-0.6)
 */
function calculateSemanticKeywordScore(
  matchDetails: Map<string, SemanticMatchDetail> | undefined,
  allKeywords: string[],
  maxScore: number,
  requirementsKeywords?: string[]  // NEW: requirements keywords for weighting
): { score: number; label: string } {
  if (!matchDetails || matchDetails.size === 0) {
    // Fallback to old behavior if no semantic details
    return { score: 0, label: 'No semantic match data available' };
  }

  let totalWeight = 0;
  let matchedWeight = 0;

  for (const keyword of allKeywords) {
    const weight = weightFor(keyword, requirementsKeywords);
    totalWeight += weight;

    const match = matchDetails.get(keyword);
    if (match) {
      // Weight the match by confidence score
      matchedWeight += weight * match.score;
    }
  }

  const semanticScore = totalWeight > 0
    ? Number(((matchedWeight / totalWeight) * maxScore).toFixed(2))
    : 0;

  return {
    score: semanticScore,
    label: `Semantic keyword match (${matchDetails.size} matches with confidence weighting)`
  };
}

export function calculateATSScore(
  matched: string[],
  partialMatches: string[],  // NEW: Related matches
  missing: string[],
  resumeQuality: {
    hasSkillsSection: boolean;
    hasExperienceSection: boolean;
    hasSummarySection: boolean;
  },
  domain: 'tech' | 'hr' | 'finance' | 'medical' | 'generic',
  matchDetails?: Map<string, SemanticMatchDetail>,
  requirementsKeywords?: string[]  // NEW: High-priority requirements keywords
): { score: number; breakdown: ScoreBreakdownItem[] } {
  const breakdown: ScoreBreakdownItem[] = [];

  const allKeywords = Array.from(new Set([...matched, ...missing]));
  
  // NEW: Use semantic scoring if available
  if (matchDetails && matchDetails.size > 0) {
    const { score: keywordScore, label } = calculateSemanticKeywordScore(
      matchDetails,
      allKeywords,
      KEYWORD_SCORE_MAX,
      requirementsKeywords  // NEW: Pass requirements keywords for higher weighting
    );

    breakdown.push({
      label,
      impact: Math.round(keywordScore),
    });

    // Add match type breakdown for transparency
    let exactCount = 0, strongCount = 0, relatedCount = 0;
    for (const match of matchDetails.values()) {
      if (match.matchType === 'exact') exactCount++;
      else if (match.matchType === 'strong') strongCount++;
      else if (match.matchType === 'related') relatedCount++;
    }

    if (exactCount > 0) {
      breakdown.push({
        label: `Exact matches: ${exactCount}`,
        impact: 0,
      });
    }
    if (strongCount > 0) {
      breakdown.push({
        label: `Strong synonym matches: ${strongCount}`,
        impact: 0,
      });
    }
    if (relatedCount > 0) {
      breakdown.push({
        label: `Related concept matches: ${relatedCount}`,
        impact: 0,
      });
    }

    let contentScore = 5;

    if (resumeQuality.hasSkillsSection) {
      contentScore += 15;
      breakdown.push({
        label: 'Skills section presence (high priority)',
        impact: 15,
      });
    }

    if (resumeQuality.hasExperienceSection) {
      contentScore += 8;
      breakdown.push({
        label: 'Experience section presence (medium priority)',
        impact: 8,
      });
    }

    if (resumeQuality.hasSummarySection) {
      contentScore += 4;
      breakdown.push({
        label: 'Summary section presence (low priority)',
        impact: 4,
      });
    }

    contentScore = Math.min(CONTENT_SCORE_MAX, contentScore);

    breakdown.push({
      label: 'Content quality score (30% max)',
      impact: Math.round(contentScore),
    });

    let finalScore = Math.round(keywordScore + contentScore);

    if (domain !== 'tech') {
      finalScore = Math.min(finalScore, 50);
      breakdown.push({
        label: 'Non-tech domain score cap (50%)',
        impact: 0,
      });
    }

    // APPLY MAX SCORE CAPS BASED ON MISSING KEYWORDS
    const missingCount = missing.length;
    if (missingCount > 0) {
      finalScore = Math.min(finalScore, 85);
      breakdown.push({
        label: `Score capped at 85% (missing ${missingCount} keywords)`,
        impact: 0,
      });
    }
    if (missingCount >= 3) {
      finalScore = Math.min(finalScore, 75);
      breakdown.push({
        label: `Score capped at 75% (missing ${missingCount} keywords)`,
        impact: 0,
      });
    }

    const clampedScore = Math.max(0, Math.min(100, finalScore));

    return {
      score: clampedScore,
      breakdown,
    };
  }

  // FALLBACK: Old behavior if no semantic details provided
  const totalWeight = allKeywords.reduce((sum, keyword) => sum + weightFor(keyword, requirementsKeywords), 0);
  const matchedWeight = matched.reduce((sum, keyword) => sum + weightFor(keyword, requirementsKeywords), 0);

  const keywordScore = totalWeight > 0
    ? Number(((matchedWeight / totalWeight) * KEYWORD_SCORE_MAX).toFixed(2))
    : 0;

  breakdown.push({
    label: `Keyword match score (weighted, ${matchedWeight}/${totalWeight})`,
    impact: Math.round(keywordScore),
  });

  let contentScore = 5;

  if (resumeQuality.hasSkillsSection) {
    contentScore += 15;
    breakdown.push({
      label: 'Skills section presence (high priority)',
      impact: 15,
    });
  }

  if (resumeQuality.hasExperienceSection) {
    contentScore += 8;
    breakdown.push({
      label: 'Experience section presence (medium priority)',
      impact: 8,
    });
  }

  if (resumeQuality.hasSummarySection) {
    contentScore += 4;
    breakdown.push({
      label: 'Summary section presence (low priority)',
      impact: 4,
    });
  }

  contentScore = Math.min(CONTENT_SCORE_MAX, contentScore);

  breakdown.push({
    label: 'Content quality score (30% max)',
    impact: Math.round(contentScore),
  });

  let finalScore = Math.round(keywordScore + contentScore);

  if (domain !== 'tech') {
    finalScore = Math.min(finalScore, 50);
    breakdown.push({
      label: 'Non-tech domain score cap (50%)',
      impact: 0,
    });
  }

  // APPLY MAX SCORE CAPS BASED ON MISSING KEYWORDS
  const missingCount = missing.length;
  if (missingCount > 0) {
    finalScore = Math.min(finalScore, 85);
    breakdown.push({
      label: `Score capped at 85% (missing ${missingCount} keywords)`,
      impact: 0,
    });
  }
  if (missingCount >= 3) {
    finalScore = Math.min(finalScore, 75);
    breakdown.push({
      label: `Score capped at 75% (missing ${missingCount} keywords)`,
      impact: 0,
    });
  }

  const clampedScore = Math.max(0, Math.min(100, finalScore));

  return {
    score: clampedScore,
    breakdown,
  };
}