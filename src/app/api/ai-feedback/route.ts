import { NextRequest, NextResponse } from 'next/server';
import { generateFeedback } from '@/lib/aiClient';
import { cleanText } from '@/utils/cleanText';
import type { AIFeedbackResponse } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { resumeText, jobDescription, missingKeywords } = body;

    if (!resumeText || !jobDescription || !missingKeywords) {
      return NextResponse.json(
        {
          error: 'Resume text, job description, and missing keywords are required',
        },
        { status: 400 }
      );
    }

    // Clean texts
    const cleanedResume = cleanText(resumeText);
    const cleanedJobDesc = cleanText(jobDescription);

    // Generate AI feedback
    const feedback = await generateFeedback(
      cleanedResume,
      cleanedJobDesc,
      missingKeywords
    );

    const result: AIFeedbackResponse = {
      suggestions: feedback.suggestions,
      keywordOptimization: feedback.keywordOptimization,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating AI feedback:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate feedback',
      },
      { status: 500 }
    );
  }
}
