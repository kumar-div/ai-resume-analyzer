'use client';

import type { FeedbackItem } from '@/types';

interface FeedbackPanelProps {
  feedbackItems: FeedbackItem[];
  loading?: boolean;
}

export default function FeedbackPanel({
  feedbackItems,
  loading,
}: FeedbackPanelProps) {
  if (loading) {
    return (
      <div className="p-6 bg-slate-800 rounded-lg border border-slate-700">
        <h3 className="text-lg font-semibold mb-4 text-slate-100">AI-Powered Suggestions</h3>
        <div className="animate-pulse text-slate-400">Analyzing your resume...</div>
      </div>
    );
  }

  // Only show improvement and good feedback (no critical issues)
  const improvementFeedback = feedbackItems.filter(
    (item) => item.type === 'improvement'
  );
  const goodFeedback = feedbackItems.filter((item) => item.type === 'good');

  const hasAnyFeedback = improvementFeedback.length > 0 || goodFeedback.length > 0;

  if (!hasAnyFeedback) {
    return (
      <div className="p-6 bg-slate-800 rounded-lg border border-slate-700">
        <h3 className="text-lg font-semibold mb-4 text-slate-100">AI-Powered Suggestions</h3>
        <p className="text-slate-400">No suggestions available yet. Upload a resume to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold text-slate-100">AI-Powered Suggestions</h3>

      {improvementFeedback.length > 0 && (
        <div className="p-6 bg-yellow-900/20 rounded-lg border border-yellow-700 shadow-sm transition-all duration-200 hover:shadow-md">
          <h4 className="text-sm font-bold mb-4 text-yellow-300 flex items-center gap-2">
            <span className="text-xl">🟡</span> Improvements to Consider
          </h4>
          <ul className="space-y-3">
            {improvementFeedback.map((item, idx) => (
              <li key={idx} className="flex gap-3 text-yellow-300 text-sm">
                <span className="font-bold text-yellow-400 flex-shrink-0 mt-0.5">💡</span>
                <span className="leading-relaxed">{item.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {goodFeedback.length > 0 && (
        <div className="p-6 bg-green-900/20 rounded-lg border border-green-700 shadow-sm transition-all duration-200 hover:shadow-md">
          <h4 className="text-sm font-bold mb-4 text-green-300 flex items-center gap-2">
            <span className="text-xl">✅</span> Strengths
          </h4>
          <ul className="space-y-3">
            {goodFeedback.map((item, idx) => (
              <li key={idx} className="flex gap-3 text-green-300 text-sm">
                <span className="font-bold text-green-400 flex-shrink-0 mt-0.5">✅</span>
                <span className="leading-relaxed">{item.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
