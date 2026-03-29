'use client';

interface StructuredAISuggestions {
  scoreExplanation: string;
  strengths: string[];
  weaknesses: string[];
  missingKeywords: string[];
  actionableSuggestions: string[];
  improvedSummary: string;
  improvedBulletPoints: string[];
}

interface AISuggestionsProps {
  suggestions: StructuredAISuggestions;
  loading?: boolean;
}

export default function AISuggestions({ suggestions, loading }: AISuggestionsProps) {
  if (loading) {
    return (
      <div className="p-6 bg-blue-900/20 rounded-lg border border-blue-700">
        <h3 className="text-lg font-semibold mb-4 text-blue-300">AI Suggestions</h3>
        <div className="animate-pulse text-slate-400">Generating suggestions...</div>
      </div>
    );
  }

  if (!suggestions) {
    return (
      <div className="p-6 bg-blue-900/20 rounded-lg border border-blue-700">
        <h3 className="text-lg font-semibold mb-4 text-blue-300">AI Suggestions</h3>
        <p className="text-sm text-blue-300">
          Basic analysis generated. AI suggestions could not be generated.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-blue-900/20 rounded-lg border border-blue-700">
      <h3 className="text-lg font-semibold mb-4 text-blue-300">AI Suggestions</h3>

      {suggestions.scoreExplanation && (
        <div className="mb-4">
          <h4 className="text-sm font-bold text-blue-300 mb-2">Score Analysis</h4>
          <p className="text-sm text-blue-200">{suggestions.scoreExplanation}</p>
        </div>
      )}

      {suggestions.strengths && suggestions.strengths.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-bold text-green-300 mb-2">Strengths</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-green-200">
            {suggestions.strengths.map((strength, idx) => (
              <li key={idx}>{strength}</li>
            ))}
          </ul>
        </div>
      )}

      {suggestions.weaknesses && suggestions.weaknesses.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-bold text-red-300 mb-2">Areas for Improvement</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-red-200">
            {suggestions.weaknesses.map((weakness, idx) => (
              <li key={idx}>{weakness}</li>
            ))}
          </ul>
        </div>
      )}

      {suggestions.actionableSuggestions && suggestions.actionableSuggestions.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-bold text-blue-300 mb-2">Actionable Suggestions</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-blue-200">
            {suggestions.actionableSuggestions.map((suggestion, idx) => (
              <li key={idx}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}

      {suggestions.improvedSummary && (
        <div className="mb-4">
          <h4 className="text-sm font-bold text-purple-300 mb-2">Improved Summary</h4>
          <p className="text-sm text-purple-200 italic">"{suggestions.improvedSummary}"</p>
        </div>
      )}

      {suggestions.improvedBulletPoints && suggestions.improvedBulletPoints.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-yellow-300 mb-2">Improved Bullet Points</h4>
          <ul className="space-y-2">
            {suggestions.improvedBulletPoints.map((bullet, idx) => (
              <li key={idx} className="bg-slate-700 p-3 rounded border border-slate-600 text-sm text-yellow-200">
                {bullet}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
