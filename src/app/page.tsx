'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Only redirect to dashboard if user is authenticated
    if (status === 'authenticated' && session) {
      router.replace('/dashboard');
    }
  }, [status, session, router]);

  // If still loading auth status, show loading message
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show landing page
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center space-y-8">
            <div>
              <h1 className="text-5xl font-bold mb-4">AI Resume Analyzer</h1>
              <p className="text-xl text-slate-300 mb-8">Optimize your resume for ATS with AI-powered analysis and feedback</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 my-12">
              <div className="group bg-slate-800 border border-slate-700 rounded-lg p-6 transition-all duration-300 ease-in-out hover:scale-[1.03] hover:shadow-2xl hover:border-blue-500/40 hover:bg-slate-800/40">
                <div className="text-3xl mb-3 group-hover:scale-110 transition">📊</div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-blue-400 transition">ATS Scoring</h3>
                <p className="text-slate-400">Get an accurate ATS score based on keyword matching and content quality</p>
              </div>
              <div className="group bg-slate-800 border border-slate-700 rounded-lg p-6 transition-all duration-300 ease-in-out hover:scale-[1.03] hover:shadow-2xl hover:border-blue-500/40 hover:bg-slate-800/40">
                <div className="text-3xl mb-3 group-hover:scale-110 transition">🔍</div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-blue-400 transition">Keyword Analysis</h3>
                <p className="text-slate-400">See which keywords match and which ones are missing from your resume</p>
              </div>
              <div className="group bg-slate-800 border border-slate-700 rounded-lg p-6 transition-all duration-300 ease-in-out hover:scale-[1.03] hover:shadow-2xl hover:border-blue-500/40 hover:bg-slate-800/40">
                <div className="text-3xl mb-3 group-hover:scale-110 transition">✨</div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-blue-400 transition">AI Feedback</h3>
                <p className="text-slate-400">Get personalized improvement suggestions powered by AI</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/analyzer"
                className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 hover:scale-105 hover:shadow-lg transition-all duration-200"
              >
                Try Analyzer
              </Link>
              <Link
                href="/login"
                className="px-8 py-3 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700 hover:scale-105 hover:shadow-lg transition-all duration-200 border border-slate-700"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If authenticated, show loading until redirect takes effect
  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
      <div className="text-center">
        <p className="text-lg font-medium">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}
