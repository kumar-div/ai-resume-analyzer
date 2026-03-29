'use client';

import Link from 'next/link';
import { signIn, signOut, useSession } from 'next-auth/react';

export default function Header() {
  const { data: session, status } = useSession();

  return (
    <header className="w-full border-b border-slate-700 bg-slate-900 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-2xl text-slate-100">
          AI Resume Analyzer
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-slate-300 hover:text-slate-100 transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/analyzer"
            className="text-sm font-medium text-slate-300 hover:text-slate-100 transition-colors\"
          >
            Analyzer
          </Link>
        </nav>

        <div className="flex items-center gap-4">

          {status === 'loading' ? (
            <span className="text-sm text-slate-400">Loading...</span>
          ) : session ? (
            <div className="flex items-center gap-3">
              {session.user?.image && (
                <img
                  src={session.user.image}
                  alt={session.user.name || 'User Avatar'}
                  className="w-8 h-8 rounded-full object-cover border-2 border-slate-700"
                />
              )}
              <span className="text-sm font-medium text-slate-300 hidden sm:block">
                {session.user?.name || 'User'}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-full text-sm font-medium hover:bg-slate-700 transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

