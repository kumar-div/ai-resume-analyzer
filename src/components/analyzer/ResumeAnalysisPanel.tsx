'use client';

import type { Issue } from '@/types';

interface ResumeAnalysisPanelProps {
  issues: (Issue | string)[];
  strengths: string[];
  perfectMatch?: boolean;
  missingKeywords?: string[];
  loading?: boolean;
}

export default function ResumeAnalysisPanel({
  issues,
  strengths,
  perfectMatch = false,
  missingKeywords = [],
  loading,
}: ResumeAnalysisPanelProps) {
  if (loading) {
    return (
      <div className="p-6 bg-slate-800 rounded-lg border border-slate-700">
        <h3 className="text-lg font-semibold mb-4 text-slate-100">
          Resume Quality Analysis
        </h3>
        <div className="animate-pulse text-slate-400">
          Analyzing resume quality...
        </div>
      </div>
    );
  }

  const computedIssues: string[] = [];
  if (missingKeywords && missingKeywords.length > 0) {
    computedIssues.push(`Missing ${missingKeywords.length} important keywords: ${missingKeywords.slice(0, 3).join(", ")}${missingKeywords.length > 3 ? ", ..." : ""}`);
  }
  (issues || []).forEach(issue => {
    if (typeof issue === 'string') {
      computedIssues.push(issue);
    } else if (issue?.message) {
      computedIssues.push(issue.message);
    }
  });

  const hasIssues = computedIssues.length > 0;

  return (
    <div className="space-y-6">
      {hasIssues && (
        <div className="p-6 bg-red-950/40 rounded-xl border-2 border-red-700 shadow-sm transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-lg hover:border-red-600 group">
          <h4 className="text-sm font-bold mb-4 text-red-300 flex items-center gap-2 group-hover:text-red-200 transition-colors">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-600/20 text-red-400">⚠️</span>
            <span>Critical Issues</span>
          </h4>
          <ul className="space-y-3">
            {computedIssues.map((issue, idx) => (
              <li key={idx} className="flex gap-3 text-sm p-2 rounded bg-red-900/30 text-red-300 transition-all duration-200 hover:bg-red-900/40">
                <span className="font-bold flex-shrink-0 mt-0.5">⚠️</span>
                <span className="leading-relaxed font-medium group-hover:text-red-200 transition-colors">{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!hasIssues && (
        <div className="p-6 bg-green-950/40 rounded-xl border-2 border-green-700 shadow-sm transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-lg hover:border-green-600 group">
          <h4 className="text-sm font-bold mb-4 text-green-300 flex items-center gap-2 group-hover:text-green-200 transition-colors">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-600/20 text-green-400">✅</span>
            <span>Status</span>
          </h4>
          {perfectMatch ? (
            <p className="text-green-300 font-medium group-hover:text-green-200 transition-colors">✅ Excellent! The resume quality check is strong and core skills alignment looks solid.</p>
          ) : (
            <p className="text-green-300 font-medium group-hover:text-green-200 transition-colors">✅ No critical issues detected. Resume structure looks good!</p>
          )}
        </div>
      )}

      {strengths && strengths.length > 0 && (
        <div className="p-6 bg-green-900/20 rounded-lg border border-green-700 shadow-sm transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-lg hover:border-green-600 group">
          <h4 className="text-sm font-bold mb-4 text-green-300 flex items-center gap-2 group-hover:text-green-200 transition-colors">
            <span className="text-xl">🟢</span> Strengths
          </h4>
          <ul className="space-y-3">
            {strengths.map((strength, idx) => (
              <li key={idx} className="flex gap-3 text-green-300 text-sm transition-colors duration-200 group-hover:text-green-200">
                <span className="font-bold text-green-400 flex-shrink-0 mt-0.5">✅</span>
                <span className="leading-relaxed">{strength}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}