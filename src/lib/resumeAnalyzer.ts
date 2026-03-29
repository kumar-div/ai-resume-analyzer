export type IssueSeverity = "high" | "medium" | "low";

export interface Issue {
  message: string;
  severity: IssueSeverity;
}

export interface ResumeAnalysis {
  projectCount: number;
  hasMetrics: boolean;
  hasExperienceSection: boolean;
  hasProjectsSection: boolean;
  hasSkillsSection: boolean;
  hasSummarySection: boolean;
  criticalIssues: Issue[];
  improvements: string[];
  strengths: string[];
}

import { detectDomain } from '@/lib/domainDetection';

const CORE_SKILLS = [
  'backend',
  'database',
  'api development',
  'server-side',
  'cloud',
];

export function analyzeResumeQuality(
  resumeText: string,
  missingKeywords: string[] = [],
  score?: number,
  domain: 'tech' | 'hr' | 'finance' | 'medical' | 'generic' = 'tech'
): ResumeAnalysis {
  const lowerText = resumeText.toLowerCase();
  const criticalIssues: Issue[] = [];
  const improvements: string[] = [];
  const strengths: string[] = [];

  // 1. Project Detection
  const projectKeywords = [
    'project',
    'built',
    'developed',
    'created',
    'designed',
    'implemented',
    'deployed',
  ];
  const projectMatches = projectKeywords.filter((keyword) =>
    lowerText.includes(keyword)
  );
  const projectCount = projectMatches.length;

  if (projectCount < 2) {
    criticalIssues.push({
      message: 'Limited project examples found. Add 2-3 specific project descriptions with technical details.',
      severity: 'medium'
    });
  } else if (projectCount >= 3) {
    strengths.push(`Strong portfolio: ${projectCount}+ projects documented with technical depth.`);
  }

  // 2. Metrics Detection
  const hasMetricsRegex = /(\d+%|\d+\s*(times?|users|customers|months?|years?)?)/gi;
  const metricsMatches = resumeText.match(hasMetricsRegex);
  const hasMetrics = metricsMatches && metricsMatches.length > 0;

  if (!hasMetrics) {
    criticalIssues.push({
      message: 'No measurable impact found. Add percentages, numbers, or quantified results (e.g., "30% improvement", "2M users").',
      severity: 'medium'
    });
  } else {
    strengths.push(`Good use of measurable impact: ${metricsMatches?.length || 0} quantified achievements detected.`);
  }

  // 3. Section Detection
  const sectionPatterns = {
    experience: /experience|employment|work history/i,
    projects: /projects?|portfolio|work samples?/i,
    skills: /skills?|technical skills|core competencies/i,
    summary: /summary|professional summary|profile|objective/i,
  };

  const hasExperienceSection = sectionPatterns.experience.test(lowerText);
  const hasProjectsSection = sectionPatterns.projects.test(lowerText);
  const hasSkillsSection = sectionPatterns.skills.test(lowerText);
  const hasSummarySection = sectionPatterns.summary.test(lowerText);

  if (!hasExperienceSection) {
    criticalIssues.push({
      message: 'No Experience section found. Add a clear experience section with job titles and responsibilities.',
      severity: 'medium'
    });
  }

  if (!hasSummarySection) {
    improvements.push('Adding a short resume summary or profile can help recruiters understand your value quickly.');
  }

  if (!hasSkillsSection) {
    criticalIssues.push({
      message: 'No Skills section found. Add a dedicated skills section highlighting your technical expertise.',
      severity: 'medium'
    });
  }

  // 4. Resume Length Check
  if (resumeText.length < 800) {
    criticalIssues.push({
      message: 'Resume is too short. Expand with more project details, achievements, and technical depth.',
      severity: 'low'
    });
  } else if (resumeText.length >= 1500) {
    strengths.push(`Comprehensive content: Resume has good depth with ${resumeText.length} characters.`);
  }

  // 5. Action Verb Detection
  const actionVerbs = [
    'led',
    'managed',
    'directed',
    'created',
    'launched',
    'improved',
    'increased',
    'decreased',
    'implemented',
    'developed',
    'designed',
    'built',
    'achieved',
  ];
  const hasActionVerbs = actionVerbs.some((verb) =>
    lowerText.includes(verb)
  );

  if (!hasActionVerbs) {
    criticalIssues.push({
      message: 'Weak action verbs detected. Use stronger verbs like "led", "created", "improved" to show impact.',
      severity: 'low'
    });
  } else {
    strengths.push('Good use of action verbs demonstrating clear impact and leadership.');
  }

  // 6. ATS-BASED CRITICAL ISSUES (VERY IMPORTANT)
  const lowerMissingKeywords = missingKeywords.map((k) => k.toLowerCase());

  // CORE SKILLS HIGH IMPACT CHECK
  const missingCore = CORE_SKILLS.filter((skill) =>
    lowerMissingKeywords.includes(skill.toLowerCase())
  );

  if (missingCore.length > 0) {
    missingCore.forEach((skill) => {
      criticalIssues.push({
        message: `HIGH IMPACT: Missing core skill '${skill}'. Add experience in ${skill} to improve ATS match.`,
        severity: 'high',
      });
    });
  }

  // DOMAIN MISMATCH CHECK
  const resumeDomain = detectDomain(resumeText);
  if (domain !== 'generic' && resumeDomain !== 'generic' && resumeDomain !== domain) {
    criticalIssues.push({
      message: 'MEDIUM IMPACT: Limited domain alignment detected between job description and resume content.',
      severity: 'medium',
    });
  }

  // SCORE THRESHOLD CHECK
  if (score !== undefined && score < 70) {
    criticalIssues.push({
      message: `HIGH IMPACT: ATS match score is low (${Math.round(score)}%). Target at least 70% to pass initial filters.`,
      severity: 'high',
    });
  }

  if (domain === 'tech') {
    // MEDIUM SEVERITY: Should-have tech skills, not strict blockers
    if (lowerMissingKeywords.includes('react')) {
      criticalIssues.push({
        message:
          'React is commonly expected for frontend roles but not mandatory in all teams; consider adding it if possible.',
        severity: 'medium',
      });
    }

    if (lowerMissingKeywords.includes('next.js') || lowerMissingKeywords.includes('nextjs')) {
      criticalIssues.push({
        message:
          'Next.js is commonly expected for modern frontend roles but not mandatory; add when relevant.',
        severity: 'medium',
      });
    }

    if (lowerMissingKeywords.includes('javascript') || lowerMissingKeywords.includes('js')) {
      criticalIssues.push({
        message:
          'JavaScript is a core web skill; ideally include it or equivalent experience.',
        severity: 'medium',
      });
    }

    if (lowerMissingKeywords.includes('typescript') || lowerMissingKeywords.includes('ts')) {
      criticalIssues.push({
        message:
          'TypeScript is increasingly expected for modern stacks but may be optional depending on role.',
        severity: 'medium',
      });
    }

    if (lowerMissingKeywords.includes('node.js') || lowerMissingKeywords.includes('nodejs')) {
      criticalIssues.push({
        message:
          'Node.js is valuable for full-stack work; many roles prefer it but it is not always required.',
        severity: 'medium',
      });
    }

    if (lowerMissingKeywords.includes('python')) {
      criticalIssues.push({
        message:
          'Python is common in backend/data roles; add if relevant to the JD.',
        severity: 'medium',
      });
    }

    if (lowerMissingKeywords.includes('aws') || lowerMissingKeywords.includes('amazon web services')) {
      criticalIssues.push({
        message:
          'AWS is a major cloud platform; useful to mention but not always mandatory.',
        severity: 'medium',
      });
    }

    if (lowerMissingKeywords.includes('docker')) {
      criticalIssues.push({
        message:
          'Docker is a helpful modern deployment skill; mention if you have containerization experience.',
        severity: 'medium',
      });
    }
  }

  // MEDIUM SEVERITY: General keyword gaps
  if (missingKeywords.length >= 3) {
    const sampleKeywords = missingKeywords.slice(0, 5).join(', ');
    criticalIssues.push({
      message: `You are missing ${missingKeywords.length} key skills (${sampleKeywords}${missingKeywords.length > 5 ? ', etc.' : ''}), which significantly lowers ATS ranking`,
      severity: 'medium'
    });
  }

  // 7. SORT ISSUES BY SEVERITY (high → medium → low)
  const severityOrder = { high: 0, medium: 1, low: 2 };
  criticalIssues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return {
    projectCount,
    hasMetrics,
    hasExperienceSection,
    hasProjectsSection,
    hasSkillsSection,
    hasSummarySection,
    criticalIssues,
    improvements,
    strengths,
  };
}
