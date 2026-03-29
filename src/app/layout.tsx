import type { Metadata } from 'next';
import '@/styles/globals.css';
import Providers from '@/app/providers';
import Header from '@/components/Header';

export const metadata: Metadata = {
  title: 'AI Resume Analyzer',
  description: 'Optimize your resume for ATS with AI-powered analysis and feedback',
  keywords: 'resume, ATS, analyzer, AI feedback, job application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-900 text-white">
        <Providers>
          <Header />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
