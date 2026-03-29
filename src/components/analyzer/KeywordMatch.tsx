'use client';

interface KeywordMatchProps {
  keywords: string[];
  loading?: boolean;
}

export default function KeywordMatch({ keywords, loading }: KeywordMatchProps) {
  if (loading) {
    return (
      <div className="p-6 bg-slate-800 rounded-lg">
        <h3 className="text-xl font-semibold mb-4 text-slate-100">Matched Keywords</h3>
        <div className="animate-pulse text-slate-400">Loading matched keywords...</div>
      </div>
    );
  }

  if (!keywords || keywords.length === 0) {
    return (
      <div className="p-6 bg-slate-800 rounded-lg">
        <h3 className="text-xl font-semibold mb-4 text-slate-100">Matched Keywords</h3>
        <p className="text-slate-400">No keywords matched. Try adding more relevant skills.</p>
      </div>
    );
  }

  const uniqueKeywords = Array.from(new Set(keywords));

  return (
    <div className="p-6 bg-green-900/20 rounded-lg border border-green-700 transition-all duration-200 hover:shadow-md hover:border-green-600">
      <div className="mb-4">
        <h3 className="text-xl font-semibold mb-1 text-green-300">
          Matched Keywords ({uniqueKeywords.length})
        </h3>
        <p className="text-sm text-green-400">
          Skills your resume matches
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {uniqueKeywords.map((keyword, index) => (
          <span
            key={`${keyword}-${index}`}
            className="px-3 py-1 bg-green-900/30 hover:bg-green-900/50 text-green-300 text-sm font-medium rounded-full border border-green-700/50 transition-all duration-200 cursor-default"
          >
            {keyword}
          </span>
        ))}
      </div>
    </div>
  );
}
