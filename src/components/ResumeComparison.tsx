'use client';

import { useState } from 'react';

interface StructuredResumeProps {
  resumeText: string;
  title: string;
}

function StructuredResume({ resumeText, title }: StructuredResumeProps) {
  // Simple parsing logic to extract sections
  const parseResumeSections = (text: string) => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    const sections: { title: string; content: string[] }[] = [];
    let currentSection = { title: 'Summary', content: [] as string[] };

    for (const line of lines) {
      // Check if line looks like a section header
      if (line.length < 50 && (
        line.toUpperCase().includes('SUMMARY') ||
        line.toUpperCase().includes('EXPERIENCE') ||
        line.toUpperCase().includes('SKILLS') ||
        line.toUpperCase().includes('EDUCATION') ||
        line.toUpperCase().includes('PROJECTS') ||
        line.toUpperCase().includes('CERTIFICATIONS') ||
        /^[A-Z\s]{3,}$/.test(line) && line.length < 30
      )) {
        if (currentSection.content.length > 0) {
          sections.push(currentSection);
        }
        currentSection = { title: line, content: [] };
      } else {
        currentSection.content.push(line);
      }
    }

    if (currentSection.content.length > 0) {
      sections.push(currentSection);
    }

    return sections.length > 0 ? sections : [{ title: 'Resume Content', content: lines }];
  };

  const sections = parseResumeSections(resumeText);

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden transition-all duration-300 ease-in-out hover:shadow-lg hover:border-blue-500/40 hover:bg-slate-800/40 group">
      <div className="bg-slate-800 px-4 py-3 border-b border-slate-700 group-hover:bg-slate-800/80 transition-colors">
        <h3 className="text-lg font-semibold text-slate-100 group-hover:text-blue-300 transition-colors">{title}</h3>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {sections.map((section, index) => (
          <div key={index} className="p-4 border-b border-slate-700 last:border-b-0">
            <h4 className="text-md font-medium text-blue-400 mb-3 uppercase tracking-wide text-sm">
              {section.title}
            </h4>
            <div className="text-sm text-slate-300 space-y-2">
              {section.content.map((line, lineIndex) => (
                <p key={lineIndex} className="leading-relaxed">
                  {line}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ResumeComparisonProps {
  analysisId: string;
  original: string;
  improved: string;
  fixes: {
    problem: string;
    before: string;
    after: string;
  }[];
  keywords: {
    matched: string[];
    missing: string[];
  };
  added: string[];
  removed: string[];
}

export default function ResumeComparison({ analysisId, original, improved: initialImproved, fixes, keywords, added, removed }: ResumeComparisonProps) {
  const [improvedResume, setImprovedResume] = useState(initialImproved);
  const [loading, setLoading] = useState(false);

  const handleRewrite = async () => {
    setLoading(true);

    const res = await fetch('/api/rewrite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        analysisId,
      }),
    });

    const data = await res.json();

    setImprovedResume(data.improvedResume);
    setLoading(false);
  };

  const hasImproved = improvedResume && improvedResume.trim().length > 0;

  return (
    <div className="bg-slate-800 rounded-xl shadow-lg p-8 border border-slate-700 transition-all duration-300 ease-in-out hover:shadow-xl hover:border-blue-500/50 hover:scale-[1.01] group">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-100 group-hover:text-blue-300 transition-colors">Resume Comparison</h2>
        <p className="text-slate-400 mt-1 group-hover:text-slate-300 transition-colors">Compare your original resume with AI-improved version</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div>
          <StructuredResume resumeText={original} title="Original Resume" />
        </div>
        <div>
          {hasImproved ? (
            <StructuredResume resumeText={improvedResume} title="Improved Resume" />
          ) : (
            <div className="bg-slate-900 rounded-lg border border-slate-700 flex flex-col items-center justify-center min-h-[400px] p-8 transition-all duration-300 ease-in-out hover:bg-slate-850 hover:border-blue-500/40 hover:shadow-lg group">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-500 transition-colors duration-300">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-100 mb-2 group-hover:text-blue-300 transition-colors">Ready to Improve Your Resume?</h3>
                <p className="text-slate-400 text-sm group-hover:text-slate-300 transition-colors">Get AI-powered suggestions to optimize your resume for better ATS scores</p>
              </div>
              <button
                onClick={handleRewrite}
                disabled={loading}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
              >
                {loading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Rewriting...
                  </div>
                ) : (
                  '✨ Rewrite Resume'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
      {hasImproved && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <span className="inline-block px-3 py-1 bg-green-900 bg-opacity-40 text-green-300 rounded text-sm font-medium transition-all duration-200 hover:bg-green-900/60 hover:scale-105">
              +{added.length} words added
            </span>
            <span className="inline-block px-3 py-1 bg-red-900 bg-opacity-40 text-red-300 rounded text-sm font-medium transition-all duration-200 hover:bg-red-900/60 hover:scale-105">
              -{removed.length} words removed
            </span>
          </div>

          {fixes.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-slate-100 mb-4 group-hover:text-slate-50 transition-colors">Suggested Fixes</h4>
              <div className="grid gap-4 md:grid-cols-2">
                {fixes.map((fix, index) => (
                  <div key={index} className="bg-slate-700 p-4 rounded-lg border border-slate-600 transition-all duration-300 ease-in-out hover:shadow-lg hover:border-slate-500 hover:bg-slate-700/80 group">
                    <p className="text-red-300 font-medium mb-3">❌ {fix.problem}</p>
                    <div className="mb-3">
                      <p className="text-slate-400 text-sm mb-1">Before:</p>
                      <p className="text-slate-300 bg-slate-900 p-3 rounded text-sm leading-relaxed">{fix.before}</p>
                    </div>
                    <div>
                      <p className="text-green-400 text-sm mb-1">After:</p>
                      <p className="text-slate-300 bg-slate-900 p-3 rounded text-sm leading-relaxed">{fix.after}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-lg font-semibold text-slate-100 mb-4">Keywords Analysis</h4>
            <div className="grid md:grid-cols-2 gap-4">
              {(keywords.matched && keywords.matched.length > 0) && (
                <div className="bg-slate-700 p-4 rounded-lg border border-slate-600 transition-all duration-300 ease-in-out hover:shadow-lg hover:border-green-500/50 hover:bg-slate-700/80 group">
                  <p className="text-green-400 text-sm font-medium mb-3 group-hover:text-green-300 transition-colors">✅ Matched Keywords</p>
                  <div className="flex flex-wrap gap-2">
                    {keywords.matched.map((keyword, index) => (
                      <span key={index} className="inline-block px-3 py-1 bg-green-900 bg-opacity-40 text-green-300 rounded text-sm">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {(keywords.missing && keywords.missing.length > 0) && (
                <div className="bg-slate-700 p-4 rounded-lg border border-slate-600 transition-all duration-300 ease-in-out hover:shadow-lg hover:border-red-500/50 hover:bg-slate-700/80 group">
                  <p className="text-red-400 text-sm font-medium mb-3 group-hover:text-red-300 transition-colors">❌ Missing Keywords</p>
                  <div className="flex flex-wrap gap-2">
                    {keywords.missing.map((keyword, index) => (
                      <span key={index} className="inline-block px-2 py-1 bg-red-900 bg-opacity-40 text-red-300 rounded text-sm">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {(!keywords.matched || keywords.matched.length === 0) && (!keywords.missing || keywords.missing.length === 0) && (
                <div className="col-span-2 bg-slate-700 p-4 rounded-lg border border-slate-600 transition-all duration-300 ease-in-out hover:shadow-lg hover:bg-slate-700/80">
                  <p className="text-slate-400 text-sm group-hover:text-slate-300 transition-colors">No keyword analysis available</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <button
              onClick={handleRewrite}
              disabled={loading}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none transition-all duration-200 font-medium active:scale-95"
            >
              {loading ? '🔄 Regenerating...' : '🔄 Regenerate Resume'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}