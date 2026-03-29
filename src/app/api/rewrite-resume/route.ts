import { rewriteResume } from '@/lib/resumeRewriter';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { resumeText, missingKeywords, matchedKeywords } = await req.json();

    if (!resumeText || !Array.isArray(missingKeywords) || !Array.isArray(matchedKeywords)) {
      return NextResponse.json({ error: 'resumeText, missingKeywords, and matchedKeywords are required' }, { status: 400 });
    }

    const result = await rewriteResume(resumeText, missingKeywords, matchedKeywords);

    if (!result || !result.improvedText) {
      return NextResponse.json({ error: 'Rewrite failed' }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Rewrite resume API failed:', error);
    return NextResponse.json({ error: (error as Error).message || 'Rewrite failed' }, { status: 500 });
  }
}
