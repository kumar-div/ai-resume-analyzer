import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  console.log('API HIT: /api/analysis/user - START');
  try {
    const session = await getServerSession();
    console.log('Session obtained:', !!session);

    if (!session?.user?.email) {
      console.log('No session or email');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Looking for user with email:', session.user.email);
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      console.log('User not found in database');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('User found, ID:', user.id);

    const analyses = await prisma.analysis.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    console.log('Found analyses:', analyses.length);
    return NextResponse.json(analyses);
  } catch (error) {
    console.error('Error in /api/analysis/user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analyses' },
      { status: 500 }
    );
  }
}
