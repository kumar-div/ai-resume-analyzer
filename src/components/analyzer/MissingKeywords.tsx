'use client';

interface MissingKeywordsProps {
  keywords: string[];
  loading?: boolean;
  totalJobKeywords?: number;
  hasCriticalSkillsIssues?: boolean;
}

export default function MissingKeywords({
  keywords,
  loading,
  totalJobKeywords = 0,
  hasCriticalSkillsIssues = false,
}: MissingKeywordsProps) {
  if (loading) {
    return (
      <div className="p-6 bg-slate-800 rounded-lg border border-slate-700">
        <h3 className="text-xl font-semibold mb-4 text-slate-100">Missing Keywords</h3>
        <div className="animate-pulse text-slate-400">Loading missing keywords...</div>
      </div>
    );
  }

  if (!keywords || keywords.length === 0) {
    // Only show "all present" if there are actually job keywords to match against
    // AND no critical skills are missing or only partially matched
    if (totalJobKeywords > 0 && !hasCriticalSkillsIssues) {
      return (
        <div className="p-6 bg-green-900/20 rounded-lg border border-green-700 transition-all duration-200 hover:shadow-md hover:border-green-600">
          <div className="mb-2">
            <h3 className="text-xl font-semibold mb-1 text-green-300">
              Missing Keywords
            </h3>
            <p className="text-sm text-green-400">
              Skills missing from your resume
            </p>
          </div>
          <p className="text-green-300 font-medium">
            ✓ Great! All job keywords are present in your resume.
          </p>
        </div>
      );
    } else if (totalJobKeywords > 0 && hasCriticalSkillsIssues) {
      // Critical skills issues exist, show partial success
      return (
        <div className="p-6 bg-yellow-900/20 rounded-lg border border-yellow-700 transition-all duration-200 hover:shadow-md">
          <div className="mb-2">
            <h3 className="text-xl font-semibold mb-1 text-yellow-300">
              Missing Keywords
            </h3>
            <p className="text-sm text-yellow-400">
              Skills missing from your resume
            </p>
          </div>
          <p className="text-yellow-300 font-medium">
            ⚠ Some critical skills are missing or only partially matched.
          </p>
        </div>
      );
    } else {
      // No job keywords extracted, so don't show "all present"
      return (
        <div className="p-6 bg-slate-700 rounded-lg border border-slate-600 transition-all duration-200 hover:shadow-md">
          <div className="mb-2">
            <h3 className="text-xl font-semibold mb-1 text-slate-100">
              Missing Keywords
            </h3>
            <p className="text-sm text-slate-400">
              Skills missing from your resume
            </p>
          </div>
          <p className="text-slate-300 font-medium">
            No job keywords were extracted for comparison.
          </p>
        </div>
      );
    }
  }

  return (
    <div className="p-6 bg-red-900/20 rounded-lg border-2 border-red-700 transition-all duration-200 hover:shadow-md">
      <div className="mb-4">
        <h3 className="text-xl font-semibold mb-1 text-red-300">
          Missing Keywords ({keywords.length})
        </h3>
        <p className="text-sm text-red-400">
          Skills missing from your resume
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {keywords.map((keyword) => (
          <span
            key={keyword}
            className="px-3 py-1 bg-red-900/30 hover:bg-red-900/50 text-red-300 text-sm font-medium rounded-full border border-red-700/50 transition-all duration-200 cursor-default"
          >
            {keyword}
          </span>
        ))}
      </div>
      <p className="mt-4 text-sm text-red-300 font-medium">
        You need to add these keywords to pass the ATS screen. These are not optional.
      </p>
    </div>
  );
}
