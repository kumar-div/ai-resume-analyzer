'use client';

interface ScoreCardProps {
  score: number;
  loading?: boolean;
}

const getScoreLabel = (score: number): string => {
  if (score >= 75) return 'Strong Match';
  if (score >= 50) return 'Moderate Match';
  return 'Low Match';
};

const getScoreColor = (score: number): string => {
  if (score >= 75)
    return 'bg-green-900/20 border-green-700 text-green-300';
  if (score >= 50)
    return 'bg-yellow-900/20 border-yellow-700 text-yellow-300';
  return 'bg-red-900/20 border-red-700 text-red-300';
};

const getScoreShadow = (score: number): string => {
  if (score >= 75)
    return 'shadow-lg shadow-green-900/30 hover:shadow-xl hover:shadow-green-900/50';
  if (score >= 50)
    return 'shadow-lg shadow-yellow-900/30 hover:shadow-xl hover:shadow-yellow-900/50';
  return 'shadow-lg shadow-red-900/30 hover:shadow-xl hover:shadow-red-900/50';
};

export default function ScoreCard({ score, loading }: ScoreCardProps) {
  if (loading) {
    return (
      <div className="p-8 bg-slate-800 border-2 border-slate-700 rounded-xl text-center">
        <div className="animate-pulse text-slate-400 font-medium">
          Analyzing resume...
        </div>
      </div>
    );
  }

  return (
    <div
      className={`p-10 border-2 rounded-xl text-center transition-all duration-200 ${getScoreColor(
        score
      )} ${getScoreShadow(score)}`}
    >
      <h2 className="text-lg font-semibold mb-4 tracking-wide">
        ATS Score
      </h2>

      <div className="text-7xl font-black mb-3 tracking-tight">{score}</div>

      <div className="text-xl font-semibold">
        {getScoreLabel(score)}
      </div>
    </div>
  );
}