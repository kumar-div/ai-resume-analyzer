export type JobDomain = 'tech' | 'hr' | 'finance' | 'medical' | 'generic';

const TECH_KEYWORDS = [
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'react', 'angular', 'vue', 'nextjs', 'nodejs', 'django', 'flask', 'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'api', 'graphql', 'database', 'devops', 'cloud', 'backend', 'frontend', 'fullstack', 'mobile', 'sdk'
];
const HR_KEYWORDS = [
  'recruitment', 'onboarding', 'payroll', 'employee engagement', 'hr policies', 'compliance', 'attendance', 'hrms', 'talent acquisition', 'performance management', 'benefits', 'labor relations', 'training', 'development'
];
const FINANCE_KEYWORDS = [
  'finance', 'financial', 'accounting', 'banking', 'investment', 'audit', 'risk', 'tax', 'forecasting', 'budgeting', 'excel', 'reporting', 'cfa', 'p&l'
];
const MEDICAL_KEYWORDS = [
  'medical', 'patient', 'clinical', 'diagnosis', 'treatment', 'pharmacy', 'healthcare', 'surgery', 'nurse', 'doctor', 'physician', 'biomedical', 'hospital'
];

function countMatches(text: string, keywords: string[]): number {
  return keywords.filter((term) => text.includes(term)).length;
}

export function detectDomain(jobDescription: string): JobDomain {
  const text = jobDescription.toLowerCase();

  const scores = {
    tech: countMatches(text, TECH_KEYWORDS),
    hr: countMatches(text, HR_KEYWORDS),
    finance: countMatches(text, FINANCE_KEYWORDS),
    medical: countMatches(text, MEDICAL_KEYWORDS),
  };

  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) return 'generic';

  const domains: (keyof typeof scores)[] = ['tech', 'hr', 'finance', 'medical'];
  for (const domain of domains) {
    if (scores[domain] === maxScore) return domain;
  }

  return 'generic';
}
