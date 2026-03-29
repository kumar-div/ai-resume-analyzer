import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import ResumeComparison from '@/components/ResumeComparison';

interface Analysis {
  id: string;
  userId: string;
  score: number;
  content: string;
  improvedResume?: string;
  createdAt: Date;
}

interface StoredAnalysisContent {
  score?: number;
  summary?: string;
  issues?: string[];
  fixes?: {
    problem: string;
    before: string;
    after: string;
  }[];
  keywords?: {
    matched: string[];
    missing: string[];
  };
  scoreBreakdown?: {
    ats: {
      score: number;
      reason: string;
    };
    keywords: {
      score: number;
      reason: string;
    };
    impact: {
      score: number;
      reason: string;
    };
  };
  improvedSummary?: string;
  // Legacy fields for backward compatibility
  resumeText?: string;
  jobDescription?: string;
  atsScore?: number;
  improvedResume?: string;
  improvementScore?: number;
  originalText?: string;
  original?: string;
  improvedText?: string;
  improved?: string;
}

const highlightDifferences = (original?: string, improved?: string) => {
  if (!original || !improved) return { added: [], removed: [] };

  const origWords = original.split(/\s+/);
  const improvedWords = improved.split(/\s+/);

  const origSet = new Set(origWords.map((w) => w.toLowerCase()));
  const improvedSet = new Set(improvedWords.map((w) => w.toLowerCase()));

  const added = improvedWords.filter((w) => !origSet.has(w.toLowerCase()));
  const removed = origWords.filter((w) => !improvedSet.has(w.toLowerCase()));

  return { added, removed };
};

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    notFound();
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    notFound();
  }

  const analysis = (await prisma.analysis.findUnique({
    where: { id },
  })) as Analysis | null;

  console.log("ANALYSIS DATA:", analysis);

  if (!analysis || analysis.userId !== user.id) {
    notFound();
  }

  let parsed: Partial<StoredAnalysisContent> = {};

  try {
    parsed = JSON.parse(analysis.content) as StoredAnalysisContent;
  } catch (error) {
    console.error('Failed to parse analysis content:', error);
    parsed = {};
  }

  // New structured format with safe defaults
  const score = parsed.score || parsed.atsScore || analysis.score || 0;
  const summary = parsed.summary || "Resume analysis complete";
  const issues = parsed.issues || [];
  const fixes = parsed.fixes || [];
  const keywords = parsed.keywords || { matched: [], missing: [] };
  const scoreBreakdown = parsed.scoreBreakdown || {
    ats: { score: 0, reason: "Not calculated" },
    keywords: { score: 0, reason: "Not calculated" },
    impact: { score: 0, reason: "Not calculated" }
  };
  const improvedSummary = parsed.improvedSummary || "";

  // Legacy support with safe defaults
  const original = parsed.resumeText || parsed.originalText || parsed.original || "";
  const improved = analysis.improvedResume || parsed.improvedResume || parsed.improvedText || parsed.improved || "";

  const { added, removed } = highlightDifferences(original, improved);
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <a href="/dashboard" className="mb-6 inline-block px-4 py-2 text-slate-300 hover:text-white font-medium">← Back to Dashboard</a>
        <div className="bg-slate-800 rounded-xl shadow-lg p-8 mb-6 border border-slate-700 transition-all duration-300 ease-in-out hover:scale-[1.01] hover:shadow-xl hover:border-blue-500/50 group">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-100 mb-2 group-hover:text-blue-300 transition-colors">Resume Analysis</h1>
              <p className="text-slate-400 group-hover:text-slate-300 transition-colors">{new Date(analysis.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <p className="text-5xl font-bold text-blue-500 group-hover:text-blue-400 transition-colors">Score: {score}%</p>
              <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">ATS Score</p>
            </div>
          </div>
          <div className="mb-6 p-4 bg-blue-900 bg-opacity-30 border border-blue-600 rounded-lg transition-all duration-300 ease-in-out hover:bg-blue-900/40 hover:border-blue-500 group-hover:shadow-lg">
            <h3 className="text-lg font-semibold text-blue-300 mb-2">Summary</h3>
            <p className="text-slate-200">{summary}</p>
          </div>
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-3">Job Description Analyzed</h3>
            <p className="text-slate-300 line-clamp-3">{parsed.jobDescription || 'No job description available'}</p>
          </div>
          {issues.length > 0 && (
            <div className="mb-6 p-4 bg-red-900 bg-opacity-30 border border-red-600 rounded-lg">
              <h3 className="text-lg font-semibold text-red-300 mb-2">Issues Found</h3>
              <ul className="list-disc list-inside text-slate-200 space-y-1">
                {issues.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="mb-6 p-4 bg-slate-700 rounded-lg">
            <h3 className="text-lg font-semibold text-slate-100 mb-3">Score Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-400">{scoreBreakdown.ats.score}%</p>
                <p className="text-sm text-slate-300">ATS Compatibility</p>
                <p className="text-xs text-slate-400 mt-1">{scoreBreakdown.ats.reason}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">{scoreBreakdown.keywords.score}%</p>
                <p className="text-sm text-slate-300">Keyword Match</p>
                <p className="text-xs text-slate-400 mt-1">{scoreBreakdown.keywords.reason}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-400">{scoreBreakdown.impact.score}%</p>
                <p className="text-sm text-slate-300">Impact Strength</p>
                <p className="text-xs text-slate-400 mt-1">{scoreBreakdown.impact.reason}</p>
              </div>
            </div>
          </div>
        </div>
        <ResumeComparison
          analysisId={analysis.id}
          original={original}
          improved={improved}
          fixes={fixes}
          keywords={keywords}
          added={added}
          removed={removed}
        />
        <a href="/dashboard" className="mt-6 inline-block px-6 py-3 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all">Back to Dashboard</a>
      </div>
    </div>
  );
}