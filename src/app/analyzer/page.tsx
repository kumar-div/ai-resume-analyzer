'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ResumeUpload from '@/components/upload/ResumeUpload';
import ScoreCard from '@/components/analyzer/ScoreCard';
import KeywordMatch from '@/components/analyzer/KeywordMatch';
import PartialMatches from '@/components/analyzer/PartialMatches';
import MissingKeywords from '@/components/analyzer/MissingKeywords';
import FeedbackPanel from '@/components/analyzer/FeedbackPanel';
import ResumeAnalysisPanel from '@/components/analyzer/ResumeAnalysisPanel';
import AISuggestions from '@/components/analyzer/AISuggestions';
import type { FeedbackItem, ScoreBreakdownItem, Issue, ResumeRewriteResult } from '@/types';

interface AnalysisData {
  domain?: string;
  domainNotice?: string;
  baseScore?: number;
  finalScore?: number;
  score: number;
  // CRITICAL: Store resume data in analysis object
  resumeText?: string;
  jobDescription?: string;
  matchedKeywords: string[];
  partialMatches?: string[];
  missingKeywords: string[];
  perfectMatch?: boolean;
  hasCriticalSkillsIssues?: boolean;
  feedback?: FeedbackItem[];
  scoreBreakdown?: {
    ats: { score: number; reason: string };
    keywords: { score: number; reason: string };
    impact: { score: number; reason: string };
  };
  detailedBreakdown?: ScoreBreakdownItem[];
  issues: Issue[];
  strengths: string[];
  aiSuggestions?: {
    scoreExplanation: string;
    strengths: string[];
    weaknesses: string[];
    missingKeywords: string[];
    actionableSuggestions: string[];
    improvedSummary: string;
    improvedBulletPoints: string[];
  } | null;
  isValidAnalysis: boolean;
  message?: string;
  llmAdjustment?: {
    scoreAdjustment: number;
    reason: string;
    confidence: string;
  };
}

type ResumeSectionData = {
  name: string;
  role: string;
  summary: string;
  skills: string;
  experience: string;
};

const sanitizeResumeSections = (rewriteResult: ResumeRewriteResult): ResumeSectionData => {
  const name = rewriteResult.sections?.name?.trim() ?? 'Candidate Name';
  const role = rewriteResult.sections?.role?.trim() ?? 'Professional Role';
  const summary = rewriteResult.sections?.summary?.trim() ?? '';
  const skills = rewriteResult.sections?.skills?.trim() ?? '';
  const experience = rewriteResult.sections?.experience?.trim() ?? '';

  return {
    name,
    role,
    summary,
    skills,
    experience,
  };
};

const renderSectionContent = (content: string) => {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return <p className="text-sm leading-relaxed">No content available.</p>;
  }

  const isBulletList = lines.every((line) => /^[-*•]\s+/.test(line));
  if (isBulletList) {
    return (
      <ul className="list-disc pl-5 space-y-1 text-sm leading-relaxed">
        {lines.map((line, index) => (
          <li key={index}>{line.replace(/^[-*•]\s+/, '')}</li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-1 text-sm leading-relaxed">
      {lines.map((line, index) => (
        <p key={index}>{line}</p>
      ))}
    </div>
  );
};

const ResumeTemplate = ({ sections }: { sections: ResumeSectionData }) => (
  <div className="font-sans text-slate-200 bg-slate-700/30 rounded-lg p-6" style={{ fontFamily: 'Inter, Arial, sans-serif' }}>
    <div className="mb-4">
      <h1 className="text-4xl font-extrabold tracking-tight leading-tight text-white">{sections.name}</h1>
      <p className="text-lg font-semibold text-blue-400 mt-1">{sections.role}</p>
      <div className="h-px bg-slate-600 my-4" />
    </div>

    <section className="mb-5">
      <h2 className="text-2xl font-bold mb-2">Summary</h2>
      {renderSectionContent(sections.summary)}
    </section>

    <section className="mb-5">
      <h2 className="text-xl font-bold mb-2">Skills</h2>
      {renderSectionContent(sections.skills)}
    </section>

    <section className="mb-5">
      <h2 className="text-xl font-bold mb-2">Experience</h2>
      {renderSectionContent(sections.experience)}
    </section>
  </div>
);

export default function AnalyzerPage() {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fileError, setFileError] = useState(false);

  const [rewriteLoading, setRewriteLoading] = useState(false);
  const [rewriteError, setRewriteError] = useState('');
  const [rewriteResult, setRewriteResult] = useState<ResumeRewriteResult | null>(null);
  const [showRewriteModal, setShowRewriteModal] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [previewMode, setPreviewMode] = useState<'improved' | 'original'>('improved');
  const [highlightResult, setHighlightResult] = useState(false);
  const [showOptimization, setShowOptimization] = useState(false);

  const { data: session, status } = useSession();
  const router = useRouter();
  const previewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
  }, [status, router]);

  const saveAnalysis = async (analysis: AnalysisData) => {
    if (!session?.user?.email || !rewriteResult) return;

    try {
      const improvementScore = Math.max(0, Math.min(100, (analysis.finalScore - analysis.baseScore) * 5));
      
      await fetch('/api/analysis/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText,
          jobDescription,
          atsScore: analysis.finalScore,
          improvedResume: rewriteResult.improvedText,
          improvementScore,
        }),
      });
    } catch (error) {
      console.error('Error saving analysis:', error);
    }
  };

  /* ----------------FILE PARSE -------- */

  const handleFileSelect = async (file: File) => {
    setResumeFile(file);
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/parse-resume', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to parse resume');
      }

      const data = await response.json();
      setResumeText(data.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error parsing resume');
      setResumeFile(null);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- ANALYZE ---------------- */

  const handleAnalyze = async () => {
    if (!resumeText || !jobDescription) {
      setError('Please upload a resume and enter a job description');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, jobDescription }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to analyze resume');
      }

      const data = await response.json();
      
      // Normalize data with safe defaults - SINGLE SOURCE OF TRUTH PATTERN
      const missingKeywordsArray = data.missingKeywords || [];
      
      // Generate real critical issues from actual data
      const computedIssues = [
        ...(missingKeywordsArray.length > 0 ? [`Missing ${missingKeywordsArray.length} important keywords: ${missingKeywordsArray.slice(0, 3).join(', ')}${missingKeywordsArray.length > 3 ? ', ...' : ''}`] : []),
        ...(data.hasCriticalSkillsIssues ? ['Resume contains gaps in critical skills'] : []),
        ...(data.issues || []),
      ];
      
      const normalizedData = {
        ...data,
        // CRITICAL: Store resume data for use throughout app
        resumeText: data.resumeText || resumeText,
        jobDescription: data.jobDescription || jobDescription,
        score: data.score || data.finalScore || 0,
        finalScore: data.finalScore || data.score || 0,
        baseScore: data.baseScore || data.finalScore || 0,
        matchedKeywords: data.matchedKeywords || [],
        missingKeywords: missingKeywordsArray,
        partialMatches: data.partialMatches || [],
        // Use computed issues that include real keyword gaps + original issues
        issues: computedIssues.length > 0 ? computedIssues : (data.issues || []),
        strengths: data.strengths || [],
        feedback: data.feedback || [],
        scoreBreakdown: data.scoreBreakdown || {
          ats: { score: 0, reason: 'Not calculated' },
          keywords: { score: 0, reason: 'Not calculated' },
          impact: { score: 0, reason: 'Not calculated' },
        },
        isValidAnalysis: data.isValidAnalysis ?? true,
        llmAdjustment: data.llmAdjustment || {
          scoreAdjustment: 0,
          reason: 'LLM not available',
          confidence: 'low',
        },
      };
      
      setAnalysis(normalizedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error analyzing resume');
    } finally {
      setLoading(false);
    }
  };

  const handleRewrite = async () => {
    if (!analysis || !resumeText) {
      setRewriteError('Analyze a resume first to enable rewrite');
      return;
    }

    setRewriteLoading(true);
    setShowRewriteModal(true);
    setRewriteError('');
    setRewriteResult(null);
    setShowSuccessToast(false);
    setHighlightResult(false);

    try {
      const response = await fetch('/api/rewrite-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText,
          missingKeywords: analysis.missingKeywords,
          matchedKeywords: analysis.matchedKeywords,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Rewrite failed');
      }

      const data = await response.json();
      setRewriteResult(data);
      setToastMessage('Resume successfully improved');
      setShowSuccessToast(true);
      setHighlightResult(true);
      setShowOptimization(true);
      setPreviewMode('improved');

      if (session) {
        saveAnalysis(analysis);
      }

      setTimeout(() => {
        setShowSuccessToast(false);
      }, 2200);

      setTimeout(() => {
        setHighlightResult(false);
      }, 2800);

      setTimeout(() => {
        if (previewRef.current) {
          previewRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (err) {
      setRewriteError(err instanceof Error ? err.message : 'Rewrite failed. Showing original resume.');
    } finally {
      setRewriteLoading(false);
      setShowRewriteModal(false);
    }
  };

  const createPlainText = (sections: ResumeSectionData) => {
    return `Improved Resume\n\nSummary:\n${sections.summary.trim()}\n\nSkills:\n${sections.skills.trim()}\n\nExperience:\n${sections.experience.trim()}`;
  };

  const handleCopyResume = async () => {
    if (!rewriteResult || !cleanedSections) {
      setRewriteError('Nothing to copy.');
      return;
    }

    try {
      await navigator.clipboard.writeText(createPlainText(cleanedSections));
      setToastMessage('Resume copied to clipboard');
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 2200);
    } catch (err) {
      setRewriteError('Copy failed. Please try again.');
    }
  };

  const handleDownloadText = () => {
    if (!rewriteResult || !cleanedSections) {
      setRewriteError('Nothing to download.');
      return;
    }

    const text = createPlainText(cleanedSections);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'Improved_Resume.txt';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);

    setToastMessage('Text downloaded successfully');
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 2200);
  };

  const cleanedSections = useMemo(
    () => (rewriteResult ? sanitizeResumeSections(rewriteResult) : null),
    [rewriteResult]
  );

  /* ---------------- UI ---------------- */

  /* ---------------- UI ---------------- */

  return (
    <div className="min-h-screen bg-slate-900 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        {showRewriteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-xl text-center">
              <h3 className="text-lg font-semibold text-slate-100 mb-2">Rewriting your resume...</h3>
              <p className="text-sm text-slate-400">Please wait while we improve and format your resume content.</p>
            </div>
          </div>
        )}

        {showSuccessToast && (
          <div className="fixed top-5 right-5 z-50 px-4 py-2 bg-green-600 text-white rounded-lg shadow-lg">
            {toastMessage || 'Operation successful'}
          </div>
        )}

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-5xl font-bold text-slate-100 mb-3 text-center">
            Resume Analyzer
          </h1>
          <p className="text-center text-slate-400 text-lg max-w-2xl mx-auto">
            Get your resume scored by ATS algorithms and receive AI-powered suggestions for improvement
          </p>
        </div>

        {/* Input Section */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {/* Upload Card */}
          <div className="md:col-span-1 bg-slate-800 border border-slate-700 rounded-xl shadow-md p-6 transition-all duration-300 ease-in-out hover:shadow-lg hover:scale-[1.02] hover:border-blue-500/50 group">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-100 group-hover:text-blue-300 transition-colors">
                📎 Upload Resume
              </h3>
              <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                PDF, DOC, or DOCX files supported
              </p>
            </div>
            <ResumeUpload
              onFileSelect={handleFileSelect}
              loading={loading}
              disabled={loading}
              onFileError={() => setFileError(true)}
            />

            {resumeFile && (
              <div className="mt-4 p-4 bg-green-900/20 rounded-lg border border-green-700 animate-in slide-in-from-top-2 duration-300">
                <p className="text-sm font-medium text-green-300">
                  ✓ File: {resumeFile.name}
                </p>
                {resumeText && (
                  <p className="text-xs text-green-400 mt-2">
                    {resumeText.length} characters extracted
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Job Description Card */}
          <div className="md:col-span-2 bg-slate-800 border border-slate-700 rounded-xl shadow-md p-6 transition-all duration-300 ease-in-out hover:shadow-lg hover:scale-[1.02] hover:border-blue-500/50 group">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-100 group-hover:text-blue-300 transition-colors">
                🎯 Job Description
              </h3>
              <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                Paste the full job posting to match keywords and optimize your resume
              </p>
            </div>

            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description here to match keywords..."
              disabled={loading}
              className="w-full h-32 p-3 border border-slate-600 rounded-lg bg-slate-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200 caret-white hover:border-slate-500 group-hover:border-slate-500"
            />

            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
                {jobDescription.length} characters
              </div>
              <button
                onClick={handleAnalyze}
                disabled={loading || !resumeText || !jobDescription}
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 hover:shadow-lg hover:scale-105 active:scale-95 disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:hover:scale-100 transition-all duration-200"
              >
                {loading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing...
                  </div>
                ) : (
                  <div className="flex items-center">
                    🔍 Analyze Resume
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 bg-red-900/20 border border-red-700 rounded-lg text-red-300">
            <p className="font-medium">Error: {error}</p>
          </div>
        )}

        {/* Results Section */}
        {analysis && (
          <div className="space-y-8 animate-in fade-in-0 duration-500">

            {/* 1. ScoreCard */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-md p-8 transition-all duration-300 ease-in-out hover:shadow-xl hover:scale-[1.02] hover:border-blue-500/50 animate-in slide-in-from-bottom-4 duration-500 delay-100 group">
              <ScoreCard score={analysis.finalScore} />
              <div className="mt-4">
                <button
                  onClick={handleRewrite}
                  disabled={rewriteLoading}
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-white font-semibold bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 ease-out disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none hover:shadow-indigo-500/25"
                >
                  {rewriteLoading ? (
                    <>
                      <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4" />
                      Rewriting...
                    </>
                  ) : (
                    <>✨ Rewrite Resume</>
                  )}
                </button>
              </div>
              {rewriteError && (
                <p className="mt-3 text-red-600 font-medium">{rewriteError}</p>
              )}
            </div>

            {showOptimization && rewriteResult && (
              <div className="bg-indigo-900/20 border border-indigo-700 rounded-xl p-4 text-sm text-indigo-300">
                <p className="font-semibold mb-2">Optimization Applied</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>✔ Added backend-related keywords (backend, APIs, microservices)</li>
                  <li>✔ Improved action verbs in bullet points</li>
                  <li>✔ Strengthened summary for ATS with role-focused language</li>
                  <li>✔ Aligned content with job description context</li>
                </ul>
              </div>
            )}

            {rewriteResult && cleanedSections && (
              <div
                ref={previewRef}
                className={`bg-slate-800 rounded-xl shadow-xl p-8 border border-slate-700 transition-all duration-300 ease-in-out hover:shadow-2xl ${highlightResult ? 'ring-2 ring-green-400 animate-pulse' : ''} group`}
              >
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-semibold text-slate-100 group-hover:text-blue-300 transition-colors">
                    {previewMode === 'improved' ? 'Improved Resume' : 'Original Resume'} Preview
                  </h3>
                </div>

                <div className="flex items-center justify-between mb-5">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPreviewMode('original')}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ease-out ${
                        previewMode === 'original'
                          ? 'bg-slate-700 text-slate-100 shadow-md ring-1 ring-blue-400 hover:scale-105'
                          : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:scale-105'
                      }`}
                    >
                      Original Resume
                    </button>
                    <button
                      onClick={() => setPreviewMode('improved')}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ease-out ${
                        previewMode === 'improved'
                          ? 'bg-slate-700 text-slate-100 shadow-md ring-1 ring-blue-400 hover:scale-105'
                          : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:scale-105'
                      }`}
                    >
                      Improved Resume
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleCopyResume}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-slate-700 text-slate-100 font-semibold hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 ease-out"
                    >
                      📋 Copy
                    </button>
                    <button
                      onClick={handleDownloadText}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-500 text-white font-semibold hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 ease-out"
                    >
                      ⬇️ Download .txt
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {previewMode === 'improved' ? (
                    <ResumeTemplate sections={cleanedSections} />
                  ) : (
                    <div className="bg-slate-700 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap text-slate-300">
                      {resumeText || 'No original resume text available.'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {analysis.message && (
              <div className="bg-yellow-900/20 border border-yellow-700 text-yellow-300 p-4 rounded-lg">
                <p className="font-medium">{analysis.message}</p>
              </div>
            )}

            {analysis.domainNotice && (
              <div className="bg-yellow-900/20 border border-yellow-700 text-yellow-300 p-4 rounded-lg">
                <p className="font-medium">{analysis.domainNotice}</p>
              </div>
            )}

            {/* 2. Critical Issues (always shown if valid) */}
            {analysis.isValidAnalysis && (analysis.issues?.length > 0 || analysis.strengths?.length > 0) && (
              <div className="bg-red-950/20 border-2 border-red-800/50 rounded-xl shadow-md p-6 transition-all duration-300 ease-in-out hover:shadow-lg hover:scale-[1.01] hover:border-red-700 animate-in slide-in-from-bottom-4 duration-500 delay-200 group">
                <ResumeAnalysisPanel
                  issues={(analysis?.issues || []) as (Issue | string)[]}
                  strengths={analysis?.strengths || []}
                  perfectMatch={analysis.perfectMatch}
                  missingKeywords={analysis.missingKeywords || []}
                />
              </div>
            )}

            {/* 3. AI Improvement Suggestions */}
            {analysis.aiSuggestions && analysis.isValidAnalysis && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-md p-6 transition-all duration-300 ease-in-out hover:shadow-lg hover:scale-[1.01] hover:border-slate-600 animate-in slide-in-from-bottom-4 duration-500 delay-300 group">
                <AISuggestions suggestions={analysis.aiSuggestions} />
              </div>
            )}

            {/* 4. Improvements (from FeedbackPanel) */}
            {analysis.feedback && analysis.feedback.filter(item => item.type === 'improvement').length > 0 && analysis.isValidAnalysis && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-md p-6 transition-all duration-300 ease-in-out hover:shadow-lg hover:scale-[1.01] hover:border-slate-600 animate-in slide-in-from-bottom-4 duration-500 delay-400 group">
                <FeedbackPanel feedbackItems={analysis.feedback.filter(item => item.type === 'improvement')} />
              </div>
            )}

            {/* 4. Keywords (matched + partial + missing) */}
            {analysis.isValidAnalysis && (
              <div className={`grid gap-6 ${analysis.partialMatches && analysis.partialMatches.length > 0 ? 'md:grid-cols-3' : 'md:grid-cols-2'} animate-in slide-in-from-bottom-4 duration-500 delay-500`}>
                <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-md p-6 transition-all duration-300 ease-in-out hover:shadow-lg hover:scale-[1.02] hover:border-green-500/50 group">
                  <KeywordMatch keywords={analysis.matchedKeywords} />
                </div>

                {analysis.partialMatches && analysis.partialMatches.length > 0 && (
                  <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-md p-6 transition-all duration-300 ease-in-out hover:shadow-lg hover:scale-[1.02] hover:border-yellow-500/50 group">
                    <PartialMatches keywords={analysis.partialMatches} />
                  </div>
                )}

                <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-md p-6 transition-all duration-300 ease-in-out hover:shadow-lg hover:scale-[1.02] hover:border-red-500/50 group">
                  <MissingKeywords
                    keywords={analysis.missingKeywords}
                    totalJobKeywords={(analysis.matchedKeywords || []).length + (analysis.partialMatches?.length || 0) + (analysis.missingKeywords || []).length}
                    hasCriticalSkillsIssues={analysis.hasCriticalSkillsIssues}
                  />
                </div>
              </div>
            )}

            {/* 5. Score Breakdown (LAST) */}
            {analysis.scoreBreakdown && analysis.isValidAnalysis && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-md p-6 transition-all duration-300 ease-in-out hover:shadow-lg hover:scale-[1.01] hover:border-slate-600 animate-in slide-in-from-bottom-4 duration-500 delay-600 group">
                <h3 className="text-lg font-bold text-white mb-5">
                  Score Breakdown
                </h3>

                <div className="mb-4 p-4 bg-blue-900/20 rounded-lg border border-blue-800">
                  <p className="text-sm text-blue-200">
                    <strong>Base Score:</strong> {analysis.baseScore} | <strong>LLM Adjustment:</strong> {(analysis?.llmAdjustment?.scoreAdjustment ?? 0) > 0 ? '+' : ''}{analysis?.llmAdjustment?.scoreAdjustment ?? 0} ({analysis?.llmAdjustment?.confidence ?? 'low'} confidence)
                  </p>
                  <p className="text-sm text-blue-300 mt-1">
                    {analysis?.llmAdjustment?.reason ?? 'LLM not available'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-slate-700 rounded-lg">
                    <p className="text-2xl font-bold text-blue-400">{analysis.scoreBreakdown.ats?.score ?? 0}%</p>
                    <p className="text-sm text-slate-300">ATS Compatibility</p>
                    <p className="text-xs text-slate-400 mt-1">{analysis.scoreBreakdown.ats?.reason ?? 'Not calculated'}</p>
                  </div>
                  <div className="text-center p-4 bg-slate-700 rounded-lg">
                    <p className="text-2xl font-bold text-green-400">{analysis.scoreBreakdown.keywords?.score ?? 0}%</p>
                    <p className="text-sm text-slate-300">Keyword Match</p>
                    <p className="text-xs text-slate-400 mt-1">{analysis.scoreBreakdown.keywords?.reason ?? 'Not calculated'}</p>
                  </div>
                  <div className="text-center p-4 bg-slate-700 rounded-lg">
                    <p className="text-2xl font-bold text-purple-400">{analysis.scoreBreakdown.impact?.score ?? 0}%</p>
                    <p className="text-sm text-slate-300">Impact Strength</p>
                    <p className="text-xs text-slate-400 mt-1">{analysis.scoreBreakdown.impact?.reason ?? 'Not calculated'}</p>
                  </div>
                </div>

                {/* Detailed breakdown if available */}
                {analysis.detailedBreakdown && analysis.detailedBreakdown.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-slate-600">
                    <h4 className="text-md font-semibold text-slate-200 mb-3">Detailed Factors</h4>
                    <ul className="space-y-2">
                      {analysis.detailedBreakdown.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex justify-between items-center p-3 bg-slate-700 rounded-lg"
                        >
                          <span className="text-gray-300 text-sm">{item.label}</span>
                          <span
                            className={`text-sm font-bold px-3 py-1 rounded-full font-mono ${
                              item.impact > 0
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {item.impact > 0 ? '+' : ''}{item.impact}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!analysis && !loading && (
          <div className="text-center py-16 bg-slate-800 border border-slate-700 rounded-xl shadow-md">
            <p className="text-gray-400 text-lg font-medium">
              📄 Upload a resume and enter a job description to get started
            </p>
          </div>
        )}

        {/* File Error Modal */}
        {fileError && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setFileError(false)}
          >
            <div
              className="bg-slate-800 p-6 rounded-xl shadow-2xl border border-slate-700 w-[90%] max-w-md animate-fadeIn"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-semibold text-white mb-2">Invalid File Type</h2>
              <p className="text-slate-300 text-sm mb-4">Please upload a PDF file.</p>
              <button
                onClick={() => setFileError(false)}
                className="w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}