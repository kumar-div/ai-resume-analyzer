'use client';

interface PartialMatchesProps {
  keywords: string[];
  loading?: boolean;
}

export default function PartialMatches({
  keywords,
  loading,
}: PartialMatchesProps) {
  if (loading) {
    return (
      <div className="p-6 bg-yellow-900/20 rounded-lg border border-yellow-700">
        <h3 className="text-xl font-semibold mb-4 text-yellow-300">Partial Matches</h3>
        <div className="animate-pulse text-slate-400">Loading partial matches...</div>
      </div>
    );
  }

  if (!keywords || keywords.length === 0) {
    return null; // Don't show if no partial matches
  }

  return (
    <div className="p-6 bg-yellow-900/20 rounded-lg border border-yellow-700 transition-all duration-200 hover:shadow-md">
      <div className="mb-4">
        <h3 className="text-xl font-semibold mb-1 text-yellow-300">
          Partial Matches ({keywords.length})
        </h3>
        <p className="text-sm text-yellow-400">
          Related concepts found (don't count as full matches)
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {keywords.map((keyword) => (
          <div
            key={keyword}
            className="px-3 py-2 bg-yellow-700 hover:bg-yellow-600 text-yellow-100 text-sm rounded-full font-medium transition-all duration-200 cursor-default"
          >
            {keyword}
          </div>
        ))}
      </div>
    </div>
  );
}