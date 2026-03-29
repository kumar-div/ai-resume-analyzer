import type { ResumeRewriteResult } from '@/types';

const ACTION_VERB_MAP: Record<string, string> = {
  'worked on': 'developed',
  made: 'built',
  helped: 'contributed to',
  'responsible for': 'led',
  'was involved in': 'spearheaded',
};

function cleanupLine(line: string): string {
  return line
    .replace(/^[0-9]+[.)]?\s*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function applyActionVerbMap(line: string): string {
  let transformed = line;
  Object.entries(ACTION_VERB_MAP).forEach(([weak, strong]) => {
    const regex = new RegExp(`\\b${weak}\\b`, 'gi');
    transformed = transformed.replace(regex, strong);
  });
  return transformed;
}

function ensureActionVerbLine(line: string): string {
  const trim = cleanupLine(line);
  const hasActionVerb = /^(developed|built|contributed to|led|improved|optimized|implemented|created|designed|managed|enhanced|streamlined|automated|reduced|increased)\\b/i.test(trim);

  if (!hasActionVerb) {
    return `Developed ${trim}`;
  }
  return trim;
}

function addImpactIfNoNumbers(line: string): string {
  const text = cleanupLine(line);
  const hasImpact = /\\d+%|\\b(improved|reduced|increased|decreased|delivered|enabled|accelerated|boosted|cut|saved)\\b/i.test(text);
  if (!hasImpact) {
    return `${text} improving efficiency and performance`;
  }
  return text;
}

function normalizeBullet(line: string): string {
  const bullet = applyActionVerbMap(cleanupLine(line.replace(/^[-*•]\s*/, '')));
  const withVerb = ensureActionVerbLine(bullet);
  const withImpact = addImpactIfNoNumbers(withVerb);
  const oneLine = withImpact.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();

  return oneLine.length > 220 ? `${oneLine.slice(0, 217)}...` : oneLine;
}

function findCandidateName(lines: string[]): string {
  if (!lines.length) return 'Name';
  const first = lines[0].trim();
  if (/^(name|Professional Summary|Summary)\b/i.test(first)) return 'Name';
  if (/^[A-Za-z .'-]{3,60}$/.test(first) && first.split(' ').length <= 4) {
    return first;
  }
  return 'Name';
}

function extractSections(resumeText: string): { summary: string[]; skills: string[]; experience: string[]; projects: string[] } {
  const lines = resumeText
    .split(/\r?\n/)
    .map((l) => cleanupLine(l))
    .filter((l) => l.length > 0);

  let mode: 'summary' | 'skills' | 'experience' | 'projects' | 'other' = 'other';
  const sections = { summary: [] as string[], skills: [] as string[], experience: [] as string[], projects: [] as string[] };

  lines.forEach((line, idx) => {
    const lower = line.toLowerCase();

    if (/(^summary$|professional summary|profile)/i.test(lower)) {
      mode = 'summary';
      return;
    }
    if (/(^skills$|technical skills|core skills)/i.test(lower)) {
      mode = 'skills';
      return;
    }
    if (/(^experience$|work history|professional experience)/i.test(lower)) {
      mode = 'experience';
      return;
    }
    if (/^projects?$/i.test(lower)) {
      mode = 'projects';
      return;
    }

    if (/^[-*•]/.test(line)) {
      if (mode === 'other') mode = 'experience';
      sections[mode].push(normalizeBullet(line));
      return;
    }

    // heading candidate for experience/project
    if (mode === 'experience' && idx + 1 < lines.length && /^[-*•]/.test(lines[idx + 1])) {
      sections.experience.push(line);
      return;
    }

    if (mode === 'projects' && idx + 1 < lines.length && /^[-*•]/.test(lines[idx + 1])) {
      sections.projects.push(line);
      return;
    }

    if (mode === 'summary' && sections.summary.length < 3) {
      sections.summary.push(line);
      return;
    }

    if (mode === 'skills' && line.includes(',')) {
      line.split(',').forEach((skill) => {
        if (skill.trim()) sections.skills.push(skill.trim());
      });
      return;
    }

    if (mode === 'other' && sections.summary.length < 3) {
      sections.summary.push(line);
    }
  });

  return sections;
}

export async function rewriteResume(
  resumeText: string,
  missingKeywords: string[],
  matchedKeywords: string[]
): Promise<ResumeRewriteResult> {
  // Strict rule-based rewrite; no analysis text and no guesswork.
  const rawLines = resumeText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const name = findCandidateName(rawLines);
  const sections = extractSections(resumeText);

  const roleCandidate = rawLines
    .slice(0, 5)
    .find((line) => /\b(engineer|developer|architect|manager|specialist|consultant)\b/i.test(line));

  const role = roleCandidate
    ? cleanupLine(roleCandidate)
    : 'Software Engineer';

  const summaryCandidates = sections.summary.length
    ? sections.summary.slice(0, 3)
    : rawLines.slice(1, 4).map((l) => cleanupLine(l));

  let summary = summaryCandidates.slice(0, 3).map((line) => cleanupLine(line));

  const baseSummary = summary.length
    ? summary.map((line) => {
        let s = line.replace(/(^|\.)\s*/g, '').trim();
        s = applyActionVerbMap(s);
        if (!/^\b(developed|built|designed|led|executed|optimized|improved)\b/i.test(s)) {
          s = `Led ${s.charAt(0).toLowerCase() === ' ' ? s.slice(1) : s}`;
        }
        if (!/\d/.test(s)) {
          s = s.replace(/\.?$/, '') + ' with measurable impact.';
        }
        return s;
      })
    : [];

  if (!baseSummary.length) {
    summary = [
      `Proven ${role} with extensive experience designing scalable backend systems and APIs.`,
      `Delivered high-performance solutions that improved reliability, security, and team velocity.`,
      `Skilled in cloud architecture, microservices, and data-driven product enhancements.`,
    ];
  } else {
    summary = baseSummary.slice(0, 3);
  }

  const requiredKeywords = ['backend', 'APIs', 'microservices', 'cloud', 'scalability'];
  const presentKeywords = new Set(summary.join(' ').toLowerCase().split(/\W+/));
  const missingBaseKeywords = requiredKeywords.filter((kw) => !presentKeywords.has(kw.toLowerCase()));
  if (missingBaseKeywords.length) {
    summary[summary.length - 1] = `${summary[summary.length - 1].replace(/\.?$/, '')} Focus areas include ${missingBaseKeywords.slice(0, 3).join(', ')}.`;
  }

  const skillsFromText = Array.from(new Set(sections.skills.map((s) => cleanupLine(s))));
  const baseSkills = ['Backend Development', 'REST API', 'Microservices', 'Cloud (AWS/GCP)', 'CI/CD', 'SQL/NoSQL'];
  const skills = Array.from(new Set([...skillsFromText, ...matchedKeywords, ...missingKeywords, ...baseSkills])).slice(0, 10);

  const experienceBlocks: string[] = [];
  let currentTitle = '';
  let currentBullets: string[] = [];

  const pushCurrent = () => {
    if (currentTitle && currentBullets.length > 0) {
      experienceBlocks.push(`${currentTitle}\n${currentBullets.slice(0, 4).map((b) => `- ${b}`).join('\n')}`);
    }
    currentTitle = '';
    currentBullets = [];
  };

  const expLines = sections.experience.length ? sections.experience : rawLines.filter((l) => /^[-*•]/.test(l));

  expLines.forEach((line) => {
    if (!line) return;
    if (/^[-*•]/.test(line)) {
      const bullet = normalizeBullet(line);
      if (bullet) currentBullets.push(bullet);
      return;
    }

    if (currentTitle && currentBullets.length) {
      pushCurrent();
    }
    currentTitle = cleanupLine(line);
  });

  if (currentTitle || currentBullets.length) {
    pushCurrent();
  }

  if (!experienceBlocks.length && expLines.length) {
    experienceBlocks.push(`Experience\n- ${normalizeBullet(expLines[0])}`);
  }

  const projects = sections.projects.map((p) => `- ${cleanupLine(p)}`).slice(0, 3);
  const experienceText = experienceBlocks.length
    ? experienceBlocks.join('\n\n')
    : 'Experience\n- Developed key initiatives improving outcomes.';

  const finalText = `${name} | ${role}\n\nSUMMARY\n${summary.map((line) => `- ${line}`).join('\n')}\n\nSKILLS\n${skills.map((s) => `- ${s}`).join('\n')}\n\nEXPERIENCE\n${experienceText}${projects.length ? `\n\nPROJECTS\n${projects.join('\n')}` : ''}`;

  return {
    improvedText: finalText,
    sections: {
      name,
      role,
      summary: summary.join(' '),
      experience: experienceText,
      skills: skills.map((s) => `- ${s}`).join('\n'),
    },
  };
}
