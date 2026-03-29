const { cleanText } = require('../src/utils/cleanText');
const { detectDomain } = require('../src/lib/domainDetection');
const { extractKeywords } = require('../src/utils/extractKeywords');
const { matchKeywords } = require('../src/lib/keywordMatcher');
const { calculateATSScore } = require('../src/lib/atsScorer');
const { analyzeResumeQuality } = require('../src/lib/resumeAnalyzer');

const jd = 'We are looking for a Frontend Developer to build web apps, implement responsive design, and work with REST API.';
const resume = 'Experienced frontend dev with HTML, CSS, JS, responsive UI and API integrations.';

const cleanJD = cleanText(jd);
const cleanResume = cleanText(resume);
const domain = detectDomain(cleanJD);

const resumeKeywords = extractKeywords(cleanResume, domain);
const jdKeywords = extractKeywords(cleanJD, domain);

const { matched, missing } = matchKeywords(resumeKeywords, jdKeywords);
const resumeAnalysis = analyzeResumeQuality(cleanResume, missing, undefined, domain);
const { score } = calculateATSScore(matched, missing, {
  hasSkillsSection: resumeAnalysis.hasSkillsSection,
  hasExperienceSection: resumeAnalysis.hasExperienceSection,
  hasSummarySection: resumeAnalysis.hasSummarySection,
}, domain);

console.log({ domain, wordCount: cleanJD.split(/\s+/).length, resumeKeywords, jdKeywords, matched, missing, score });

if (domain !== 'tech') {
  throw new Error('Domain should not be generic for frontend developer JD');
}

if (score <= 0) {
  throw new Error('Score should be >0 for proper JD');
}

if (missing.includes('react')) {
  console.warn('React missing from this resume as expected, but should be lower severity, not a hard fail');
}

console.log('Validation scenario passed');
