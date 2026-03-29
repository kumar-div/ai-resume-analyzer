/**
 * Clean and normalize text from resume/job description
 */
export function cleanText(text: string): string {
  if (!text) return '';
  
  // Remove extra whitespace (multiple spaces/tabs)
  let cleaned = text.replace(/\s+/g, ' ');
  
  // Normalize line breaks to spaces
  cleaned = cleaned.replace(/[\r\n]+/g, ' ');
  
  // Remove special characters but keep alphanumeric, spaces, hyphens, and common punctuation
  cleaned = cleaned.replace(/[^\w\s\-.,]/g, ' ');
  
  // Remove trailing/leading whitespace
  cleaned = cleaned.trim();
  
  return cleaned;
}
