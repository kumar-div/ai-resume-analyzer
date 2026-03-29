'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';

interface Analysis {
  id: string;
  resumeText: string;
  jobDescription: string;
  atsScore: number;
  improvedResume: string;
  improvementScore: number;
  createdAt: string;
}

export default function DashboardAnalysisPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const analysisId = params.id as string;
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated' && analysisId) {
      fetchAnalysis();
    }
  }, [status, analysisId, router]);

  const fetchAnalysis = async () => {
    try {
      const response = await fetch(`/api/analysis/${analysisId}`);
      if (response.ok) {
        const data = await response.json();
        setAnalysis(data);
      } else if (response.status === 401 || response.status === 403) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Error fetching analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <p className="text-gray-400">Loading analysis...</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-10 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-red-600">Analysis not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => router.back()}
          className="mb-6 px-4 py-2 text-gray-400 hover:text-gray-300 font-medium"
        >
          ← Back
        </button>

        <div className="bg-slate-800 rounded-xl shadow-lg p-8 mb-6 border border-slate-700">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Analysis Details</h1>
              <p className="text-gray-400">{new Date(analysis.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <p className="text-5xl font-bold text-blue-400">{analysis.atsScore}%</p>
              <p className="text-sm text-gray-400">ATS Score</p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-2">Job Description</h3>
            <p className="text-gray-300 whitespace-pre-wrap">{analysis.jobDescription}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Original Resume</h3>
              <div className="bg-slate-700 rounded-lg p-4 max-h-96 overflow-y-auto text-sm text-gray-300 whitespace-pre-wrap border border-slate-600">
                {analysis.resumeText}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Improved Resume</h3>
              <div className="bg-green-900/20 rounded-lg p-4 max-h-96 overflow-y-auto text-sm text-gray-300 whitespace-pre-wrap border border-green-800">
                {analysis.improvedResume}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => router.push('/dashboard')}
          className="mt-6 px-6 py-3 rounded-full bg-gray-900 text-white font-semibold hover:bg-gray-800"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
