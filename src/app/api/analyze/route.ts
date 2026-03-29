import { generateAIFeedback, getLLMScoreAdjustment, getStructuredAISuggestions, getStructuredAnalysis } from '@/lib/aiFeedback';
import { analyzeResumeQuality } from '@/lib/resumeAnalyzer'; // 🔥 IMPORTANT
import { detectDomain } from '@/lib/domainDetection';
import { NextRequest, NextResponse } from 'next/server';
import { extractKeywords, extractKeywordsWithRequirements } from '@/utils/extractKeywords';
import { matchKeywords } from '@/lib/keywordMatcher';
import { calculateATSScore } from '@/lib/atsScorer';
import { cleanText } from '@/utils/cleanText';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import type { Issue } from '@/types';

export async function POST(req: NextRequest) {
  try {
    console.log('API HIT: /api/analyze');

    const body = await req.json();
    const { resumeText, jobDescription, analysisId, reanalyze } = body;

    let cleanedResume = '';
    let cleanedJobDesc = '';

    // 🔥 STEP 5 — FIX RE-ANALYZE API
    if (reanalyze && analysisId) {
      // Re-analysis: get data from existing analysis
      const session = await getServerSession(authOptions);
      if (!session?.user?.email) {
        return NextResponse.json({ error: 'Login required to re-analyze' }, { status: 401 });
      }

      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const existingAnalysis = await prisma.analysis.findUnique({
        where: { id: analysisId },
      });

      if (!existingAnalysis || existingAnalysis.userId !== user.id) {
        return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
      }

      let parsed: any = {};
      try {
        parsed = JSON.parse(existingAnalysis.content);
      } catch (error) {
        console.error('Failed to parse existing analysis content:', error);
        return NextResponse.json({ error: 'Invalid analysis data' }, { status: 400 });
      }

      cleanedResume = parsed.resumeText || parsed.originalText || parsed.original || '';
      cleanedJobDesc = jobDescription || parsed.jobDescription || '';

      if (!cleanedResume) {
        return NextResponse.json({ error: 'No resume text found for re-analysis' }, { status: 400 });
      }
    } else {
      // Normal analysis
      if (!resumeText || !jobDescription) {
        return NextResponse.json(
          { error: 'Resume text and job description are required' },
          { status: 400 }
        );
      }

      cleanedResume = cleanText(resumeText);
      cleanedJobDesc = cleanText(jobDescription);
    }

    const domain = detectDomain(cleanedJobDesc);

    // Extract keywords per domain (tech behavior / non-tech behavior)
    const resumeKeywords = extractKeywords(cleanedResume, domain);
    const jdKeywordsResult = extractKeywordsWithRequirements(cleanedJobDesc, domain);
    const jdKeywords = jdKeywordsResult.allKeywords;
    const requirementsKeywords = jdKeywordsResult.requirementsKeywords;

    console.debug('Domain detected:', domain);
    console.debug('Resume extraction:', resumeKeywords);
    console.debug('JD extraction:', jdKeywords);

    const wordCount = cleanedJobDesc
      .split(/\s+/)
      .filter((w) => w.trim().length > 0).length;

    const hasSignal = /html|css|javascript|react|api|frontend|backend/i.test(cleanedJobDesc);
    const isGenericJD = wordCount < 30 && !hasSignal;

    if (isGenericJD) {
      return NextResponse.json(
        {
          error: 'Job description too generic for accurate ATS analysis',
          message:
            'Job description too generic for accurate ATS analysis',
          domain,
          wordCount,
          baseScore: 0,
          finalScore: 0,
          score: 0,
          matchedKeywords: [],
          missingKeywords: [],
          scoreBreakdown: [],
          feedback: [],
          analysis: {
            issues: [],
            strengths: [],
          },
          isValidAnalysis: false,
          llmAdjustment: {
            scoreAdjustment: 0,
            reason: 'No analysis performed',
            confidence: 'low',
          },
        },
        { status: 422 }
      );
    }

    const matchResult = matchKeywords(resumeKeywords, jdKeywords);
    const { matched, partialMatches, missing, matchDetails, semanticScore } = matchResult;
    
    console.debug('Matched keywords:', matched);
    console.debug('Missing keywords:', missing);
    console.debug('Semantic score:', semanticScore);
    console.debug('Match details:', matchDetails);

    if (jdKeywords.length === 0) {
      return NextResponse.json({
        baseScore: 0,
        finalScore: 0,
        score: 0,
        message: "Unable to extract meaningful keywords from job description",
        matchedKeywords: [],
        partialMatches: [], // Ensure always returned
        missingKeywords: [],
        isValidAnalysis: false,
        domain,
        scoreBreakdown: [],
        feedback: [],
        analysis: {
          issues: [],
          strengths: [],
        },
        llmAdjustment: {
          scoreAdjustment: 0,
          reason: 'No analysis performed',
          confidence: 'low',
        },
      });
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Login required to analyze resume' }, { status: 401 });
    }

    const email = session.user.email;
    let currentUser = await prisma.user.upsert({
      where: { email },
      update: {
        name: session.user.name || null,
      },
      create: {
        email: email,
        name: session.user.name || null,
      },
    });

    const resumeAnalysis = analyzeResumeQuality(cleanedResume, missing, undefined, domain);

    // ENHANCED: Pass semantic match details to scoring
    const { score: baseScore, breakdown } = calculateATSScore(
      matched,
      partialMatches,  // NEW: Pass partial matches
      missing,
      {
        hasSkillsSection: resumeAnalysis.hasSkillsSection,
        hasExperienceSection: resumeAnalysis.hasExperienceSection,
        hasSummarySection: resumeAnalysis.hasSummarySection,
      },
      domain,
      matchDetails,  // NEW: Pass semantic match details for weighted scoring
      requirementsKeywords  // NEW: Pass requirements keywords for higher weighting
    );

    console.log('Base score:', baseScore);

    // Create normalized scoreBreakdown object for consistency
    const normalizedScoreBreakdown = {
      ats: {
        score: Math.floor(baseScore * 0.4),
        reason: "ATS compatibility assessment based on resume structure and formatting"
      },
      keywords: {
        score: Math.floor((matched.length / (matched.length + missing.length)) * 100),
        reason: `${matched.length} of ${matched.length + missing.length} keywords matched`
      },
      impact: {
        score: Math.floor(baseScore * 0.3),
        reason: "Impact assessment based on content quality and achievements"
      }
    };

    // LLM-assisted adjustment (local Ollama)
    let llmResult = null;

    try {
      llmResult = await getLLMScoreAdjustment(
        cleanedJobDesc,
        cleanedResume,
        jdKeywords,
        matched,
        missing,
        baseScore,
        domain
      );
    } catch (error) {
      console.error('LLM failed:', error);
      llmResult = null;
    }

    console.log('LLM result:', llmResult);

    // CLAMP LLM ADJUSTMENT TO -5 to +5 (reduce impact)
    const adjustment = Math.max(-5, Math.min(5, llmResult?.scoreAdjustment ?? 0));
    const finalScore = Math.max(0, Math.min(100, baseScore + adjustment));

    console.log('Final score:', finalScore);

    // Get structured AI analysis
    let structuredAnalysis = null;
    try {
      structuredAnalysis = await getStructuredAnalysis(
        cleanedJobDesc,
        cleanedResume,
        matched,
        missing,
        finalScore,
        domain
      );
    } catch (error) {
      console.error('Structured analysis failed:', error);
    }

    // AI-powered improvement suggestions from Ollama
    let aiSuggestions: any = null;

    try {
      aiSuggestions = await getStructuredAISuggestions(
        cleanedJobDesc,
        cleanedResume,
        missing,
        partialMatches || [],
        matched,
        finalScore
      );
    } catch (error) {
      console.error('LLM structured suggestions failed:', error);
      aiSuggestions = null;
    }

    // Check for critical skills issues
    const criticalSkillsMissing = missing.some(keyword => 
      ['backend', 'database', 'cloud', 'aws', 'azure', 'gcp', 'kubernetes', 'docker', 'mongodb', 'postgresql', 'mysql', 'react', 'nextjs', 'javascript', 'nodejs', 'api'].includes(keyword.toLowerCase())
    );
    const criticalSkillsPartial = (partialMatches || []).some(keyword => 
      ['backend', 'database', 'cloud', 'aws', 'azure', 'gcp', 'kubernetes', 'docker', 'mongodb', 'postgresql', 'mysql', 'react', 'nextjs', 'javascript', 'nodejs', 'api'].includes(keyword.toLowerCase())
    );
    const hasCriticalSkillsIssues = criticalSkillsMissing || criticalSkillsPartial;

    const perfectMatch =
      missing.length === 0 &&
      !hasCriticalSkillsIssues &&
      finalScore >= 85 &&
      resumeAnalysis.hasSkillsSection &&
      resumeAnalysis.hasExperienceSection;

    const nonTechWarning =
      domain !== 'tech'
        ? 'This analyzer is currently optimized for tech roles. Results may not be accurate.'
        : undefined;

    // If AI analysis available, use it; otherwise fallback to current logic
    let result;
    let savedAnalysis = null;

    if (structuredAnalysis) {
      result = structuredAnalysis;
    } else {
      // Fallback to original logic
      const feedback = generateAIFeedback(matched, missing, cleanedResume, domain);
      result = {
        resumeText: cleanedResume,
        jobDescription: cleanedJobDesc,
        atsScore: finalScore,
        feedback,
        matched,
        missing,
        breakdown,
        partialMatches,
        semanticMatchDetails: matchDetails ? Object.fromEntries(matchDetails) : {},
        analysis: {
          issues: resumeAnalysis.criticalIssues,
          strengths: resumeAnalysis.strengths,
        },
        llmAdjustment: llmResult || {
          scoreAdjustment: 0,
          reason: 'LLM not available',
          confidence: 'low',
        },
      };
    }

    // Persist analysis results
    if (currentUser) {
      try {
        const analysisData = {
          userId: currentUser.id,
          score: structuredAnalysis ? structuredAnalysis.score : finalScore,
          content: JSON.stringify({
            ...result,
            // CRITICAL: Ensure all needed fields are saved
            jobDescription: cleanedJobDesc,
            resumeText: cleanedResume,
            matchedKeywords: matched,
            missingKeywords: missing,
            partialMatches: partialMatches || [],
            improvedResume: null,
          }),
        };

        savedAnalysis = await prisma.analysis.create({
          data: analysisData,
        });
      } catch (saveError) {
        console.error('DB SAVE ERROR:', saveError);
      }
    }

    // Return appropriate response format - NORMALIZED at response level
    if (structuredAnalysis) {
      return NextResponse.json({
        domain,
        domainNotice: nonTechWarning,
        score: structuredAnalysis.score,
        finalScore: structuredAnalysis.score,
        baseScore: baseScore,
        // CRITICAL: Include resume data for UI and DB storage
        resumeText: cleanedResume,
        jobDescription: cleanedJobDesc,
        isValidAnalysis: true,
        perfectMatch,
        hasCriticalSkillsIssues,
        // FLATTENED: issues and strengths at top level
        issues: (structuredAnalysis.issues || []) as Issue[],
        strengths: [],
        matchedKeywords: structuredAnalysis.keywords?.matched || [],
        missingKeywords: structuredAnalysis.keywords?.missing || [],
        partialMatches: [],
        feedback: [],
        scoreBreakdown: structuredAnalysis.scoreBreakdown,
        aiSuggestions,
        llmAdjustment: llmResult || {
          scoreAdjustment: 0,
          reason: 'LLM not available',
          confidence: 'low',
        },
        ...(reanalyze && savedAnalysis ? { analysisId: savedAnalysis.id } : {}),
      });
    } else {
      // FALLBACK PATH - also NORMALIZED at response level
      return NextResponse.json({
        domain,
        domainNotice: nonTechWarning,
        baseScore,
        finalScore,
        score: finalScore,
        // CRITICAL: Include resume data for UI and DB storage
        resumeText: cleanedResume,
        jobDescription: cleanedJobDesc,
        scoreBreakdown: normalizedScoreBreakdown,
        detailedBreakdown: breakdown,
        matchedKeywords: matched,
        partialMatches: partialMatches,
        missingKeywords: missing,
        semanticScore,
        semanticMatchDetails: result.semanticMatchDetails,
        feedback: result.feedback || [],
        // FLATTENED: issues and strengths at top level (NOT nested under 'analysis')
        issues: (resumeAnalysis.criticalIssues || []) as Issue[],
        strengths: resumeAnalysis.strengths || [],
        isValidAnalysis: true,
        perfectMatch,
        hasCriticalSkillsIssues,
        aiSuggestions,
        llmAdjustment: llmResult || {
          scoreAdjustment: 0,
          reason: 'LLM not available',
          confidence: 'low',
        },
        ...(reanalyze && savedAnalysis ? { analysisId: savedAnalysis.id } : {}),
      });
    }

  } catch (error) {
    console.error('Error analyzing resume:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to analyze resume',
      },
      { status: 500 }
    );
  }
}