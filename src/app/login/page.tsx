'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.replace('/analyzer');
    }
  }, [session, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800 shadow-2xl rounded-2xl p-8 border border-slate-700">
        <h1 className="text-3xl font-bold text-white mb-2">Continue to AI Resume Analyzer</h1>
        <p className="text-gray-400 mb-6">Save your results and unlock full features</p>

        <div className="space-y-4">
          <button
            onClick={() => signIn('google', { callbackUrl: '/analyzer' })}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-white py-3 font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-transform duration-200"
          >
            <span>🟢</span>
            Continue with Google
          </button>

          <button
            onClick={() => signIn('github', { callbackUrl: '/analyzer' })}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gray-800 to-gray-900 text-white py-3 font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-transform duration-200"
          >
            <span>🐙</span>
            Continue with GitHub
          </button>
        </div>

        {status === 'loading' && <p className="text-sm text-gray-500 mt-4">Checking authentication...</p>}
      </div>
    </div>
  );
}
