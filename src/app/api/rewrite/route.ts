import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { rewriteResume } from '@/lib/resumeRewriter';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { analysisId } = await request.json();

    if (!analysisId) {
      return NextResponse.json({ error: 'Analysis ID required' }, { status: 400 });
    }

    const analysis = await prisma.analysis.findUnique({
      where: { id: analysisId },
    });

    if (!analysis || analysis.userId !== user.id) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    let parsed: any = {};
    try {
      parsed = JSON.parse(analysis.content);
    } catch (error) {
      console.error('Failed to parse analysis content:', error);
      return NextResponse.json({ error: 'Invalid analysis data' }, { status: 400 });
    }

    const originalResume = parsed.resumeText || parsed.originalText || parsed.original || '';

    if (!originalResume) {
      return NextResponse.json({ error: 'No resume text found' }, { status: 400 });
    }

    // Get missing keywords - assuming they are in the content or we need to extract
    const missingKeywords: string[] = parsed.missingKeywords || [];
    const matchedKeywords: string[] = parsed.matchedKeywords || [];

    const result = await rewriteResume(originalResume, missingKeywords, matchedKeywords);

    // Save to database
    const updatedContent = {
      ...parsed,
      improvedResume: result.improvedText,
    };
    await prisma.analysis.update({
      where: { id: analysisId },
      data: {
        content: JSON.stringify(updatedContent),
        improvedResume: result.improvedText,
      },
    });

    return NextResponse.json({
      improvedResume: result.improvedText,
    });
  } catch (error) {
    console.error('Rewrite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}