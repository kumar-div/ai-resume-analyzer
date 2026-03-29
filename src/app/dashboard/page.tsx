'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DocumentTextIcon, PlusIcon, ChartBarIcon, TrashIcon } from '@heroicons/react/24/outline';
import ConfirmModal from '@/components/ConfirmModal';

interface Analysis {
  id: string;
  userId: string;
  score: number;
  content: string;
  createdAt: string;
}

interface StoredAnalysisContent {
  resumeText: string;
  jobDescription: string;
  atsScore: number;
  // CRITICAL: Support multiple score field names from API
  score?: number;
  finalScore?: number;
  improvedResume: string;
  improvementScore?: number;
}

function ScoreBadge({ score }: { score: number }) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-900 text-green-300';
    if (score >= 60) return 'bg-yellow-900 text-yellow-300';
    return 'bg-red-900 text-red-300';
  };

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${getScoreColor(score)}`}>
      <ChartBarIcon className="w-4 h-4 mr-1" />
      {score}%
    </div>
  );
}

function AnalysisCard({ analysis, onDeleteClick }: { analysis: Analysis; onDeleteClick: (id: string, title: string) => void }) {
  const [isDeleting, setIsDeleting] = useState(false);

  let parsed: Partial<StoredAnalysisContent> = {};

  try {
    parsed = JSON.parse(analysis.content) as StoredAnalysisContent;
  } catch (error) {
    console.error('Failed to parse analysis content:', error);
    parsed = {};
  }

  // Provide safe defaults
  const safeParsed: StoredAnalysisContent = {
    resumeText: parsed.resumeText || '',
    jobDescription: parsed.jobDescription || 'No job description available',
    // FIX: Get score from multiple possible fields
    atsScore: parsed.score || parsed.atsScore || parsed.finalScore || analysis.score || 0,
    improvedResume: parsed.improvedResume || '',
    improvementScore: parsed.improvementScore || 0,
  };

  const jobPreview = (safeParsed.jobDescription || '').substring(0, 120) + ((safeParsed.jobDescription || '').length > 120 ? '...' : '');
  const date = new Date(analysis.createdAt).toLocaleDateString();

  const handleDelete = () => {
    onDeleteClick(analysis.id, 'Resume Analysis');
  };

  return (
    <div className="group bg-slate-800 border border-slate-700 rounded-2xl shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300 p-6 h-full relative overflow-hidden">
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

      {/* Delete button - top right corner */}
      <button
        onClick={(e) => {
          e.preventDefault();
          handleDelete();
        }}
        className="absolute top-3 right-3 p-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 hover:text-red-300 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 z-20"
        title="Delete this analysis"
      >
        <TrashIcon className="w-4 h-4" />
      </button>

      <Link href={`/analysis/${analysis.id}`} className="block">
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <ScoreBadge score={safeParsed.atsScore} />
            <div className="text-xs text-slate-500 group-hover:text-slate-400 transition-all duration-200 group-hover:opacity-0 group-hover:translate-y-1">
              {date}
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-100 mb-2 group-hover:text-blue-300 transition-colors">
              Resume Analysis
            </h3>
            <p className="text-sm text-slate-400 line-clamp-3 leading-relaxed group-hover:text-slate-300 transition-colors">
              {jobPreview}
            </p>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center text-xs text-slate-400">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              {(safeParsed.improvementScore || 0) > 0 ? `+${(safeParsed.improvementScore || 0).toFixed(0)}% improved` : 'Analysis complete'}
            </div>
            <div className="text-xs text-slate-500">
              #{analysis.id.slice(-6)}
            </div>
          </div>

          <div className="flex gap-2">
            <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 text-sm font-medium group-hover:shadow-lg group-hover:shadow-blue-500/25">
              View Details
            </button>
            <button className="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-all duration-200 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0">
              →
            </button>
          </div>
        </div>
      </Link>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-slate-800 border border-slate-700 rounded-2xl shadow-sm p-6 animate-pulse">
          <div className="h-6 bg-slate-700 rounded-full mb-4"></div>
          <div className="space-y-2 mb-4">
            <div className="h-4 bg-slate-700 rounded"></div>
            <div className="h-4 bg-slate-700 rounded"></div>
            <div className="h-4 bg-slate-700 rounded w-3/4"></div>
          </div>
          <div className="flex justify-between mb-4">
            <div className="h-3 bg-slate-700 rounded w-16"></div>
            <div className="h-3 bg-slate-700 rounded w-20"></div>
          </div>
          <div className="h-8 bg-slate-700 rounded-xl"></div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    analysisId: string | null;
    analysisTitle: string;
  }>({
    isOpen: false,
    analysisId: null,
    analysisTitle: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      fetchAnalyses();
    }
  }, [status, router]);

  const handleDelete = (id: string) => {
    setAnalyses(prev => prev.filter(analysis => analysis.id !== id));
  };

  const handleDeleteClick = (analysisId: string, analysisTitle: string) => {
    setDeleteModal({
      isOpen: true,
      analysisId,
      analysisTitle,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.analysisId) return;

    try {
      const response = await fetch(`/api/analysis/${deleteModal.analysisId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        handleDelete(deleteModal.analysisId);
        setDeleteModal({ isOpen: false, analysisId: null, analysisTitle: '' });
      } else {
        alert('Failed to delete analysis');
      }
    } catch (error) {
      console.error('Error deleting analysis:', error);
      alert('Failed to delete analysis');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, analysisId: null, analysisTitle: '' });
  };

  const fetchAnalyses = async () => {
    try {
      const response = await fetch('/api/analysis/user');
      if (response.ok) {
        const data = await response.json();
        console.log('Dashboard analysis IDs:', data.map((item: Analysis) => item.id));
        setAnalyses(data);
      }
    } catch (error) {
      console.error('Error fetching analyses:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-slate-900 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-100 mb-2">My Analyses</h1>
            <p className="text-slate-400">Loading your resume analyses...</p>
          </div>
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-bold text-slate-100 mb-2">My Analyses</h1>
            <p className="text-slate-400">Track your resume optimization progress</p>
          </div>
          <Link
            href="/analyzer"
            className="inline-flex items-center px-6 py-3 rounded-2xl bg-blue-600 text-white font-semibold hover:bg-blue-700 hover:shadow-lg transition-all duration-200"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            New Analysis
          </Link>
        </div>

        {analyses.length === 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-sm p-16 text-center relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-10 left-10 w-20 h-20 border border-slate-600 rounded-full"></div>
              <div className="absolute top-20 right-20 w-16 h-16 border border-slate-600 rounded-full"></div>
              <div className="absolute bottom-20 left-20 w-12 h-12 border border-slate-600 rounded-full"></div>
            </div>

            <div className="relative z-10">
              <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <DocumentTextIcon className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-semibold text-slate-100 mb-3">Ready to optimize your resume?</h3>
              <p className="text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
                Upload your resume and get AI-powered insights to improve your ATS score and land more interviews.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/analyzer"
                  className="inline-flex items-center px-8 py-4 rounded-2xl bg-blue-600 text-white font-semibold hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200"
                >
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Start Your First Analysis
                </Link>
                <Link
                  href="/analyzer?page=new"
                  className="inline-flex items-center px-8 py-4 rounded-2xl bg-slate-700 text-slate-300 font-semibold hover:bg-slate-600 transition-all duration-200"
                >
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {analyses.map((analysis) => (
              <AnalysisCard key={analysis.id} analysis={analysis} onDeleteClick={handleDeleteClick} />
            ))}
          </div>
        )}

        <ConfirmModal
          isOpen={deleteModal.isOpen}
          title="Delete Analysis"
          message={`Are you sure you want to delete this ${deleteModal.analysisTitle}? This action cannot be undone.`}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          confirmText="Delete"
          cancelText="Cancel"
          confirmVariant="danger"
        />
      </div>
    </div>
  );
}
