/**
 * Simple Country-to-Language Mapping for JobPing
 * 
 * Quick win: Use country data to infer likely language for better targeting
 * No complex language detection needed - just smart defaults
 */

export const COUNTRY_LANGUAGE_MAP: Record<string, string> = {
  // Core EU markets
  'GB': 'en', 'UK': 'en', 'United Kingdom': 'en', 'Gb': 'en', 'gB': 'en',
  'IE': 'en', 'Ireland': 'en',
  'DE': 'de', 'Germany': 'de', 'GERMANY': 'de', 'dE': 'de', 'De': 'de',
  'FR': 'fr', 'France': 'fr', 'FRANCE': 'fr', 'Fr': 'fr', 'fR': 'fr',
  'ES': 'es', 'Spain': 'es', 'SPAIN': 'es',
  'NL': 'nl', 'Netherlands': 'nl',
  'IT': 'it', 'Italy': 'it',
  'PT': 'pt', 'Portugal': 'pt',
  'SE': 'sv', 'Sweden': 'sv',
  'DK': 'da', 'Denmark': 'da',
  'NO': 'no', 'Norway': 'no',
  'CH': 'de', 'Switzerland': 'de', // Default to German for CH
  'AT': 'de', 'Austria': 'de',
  'BE': 'nl', 'Belgium': 'nl', // Default to Dutch for BE
  'FI': 'fi', 'Finland': 'fi',
  'PL': 'pl', 'Poland': 'pl',
  'CZ': 'cs', 'Czech Republic': 'cs',
  'HU': 'hu', 'Hungary': 'hu',
  'GR': 'el', 'Greece': 'el',
  'LU': 'fr', 'Luxembourg': 'fr',
  
  // Non-EU but relevant
  'US': 'en', 'United States': 'en',
  'CA': 'en', 'Canada': 'en',
  'AU': 'en', 'Australia': 'en',
  'NZ': 'en', 'New Zealand': 'en',
};

/**
 * Get likely language for a country
 * @param country - Country code or name
 * @returns ISO 639-1 language code or 'en' as default
 */
export function getCountryLanguage(country: string): string {
  if (!country) return 'en';
  
  const trimmed = country.trim();
  return COUNTRY_LANGUAGE_MAP[trimmed] || 'en';
}

/**
 * Get language-specific early career terms
 * @param language - ISO 639-1 language code
 * @returns Array of early career terms in that language
 */
export function getEarlyCareerTerms(language: string): string[] {
  const terms: Record<string, string[]> = {
    'en': ['graduate', 'junior', 'trainee', 'entry level', 'intern', 'associate', 'assistant', 'apprentice'],
    'de': ['praktikant', 'werkstudent', 'berufseinsteiger', 'trainee', 'junior', 'assistent'],
    'fr': ['stagiaire', 'alternance', 'débutant', 'jeune diplômé', 'junior', 'assistant'],
    'es': ['becario', 'prácticas', 'recién graduado', 'junior', 'asistente'],
    'nl': ['stagiair', 'junior', 'starter', 'trainee', 'assistent'],
    'it': ['tirocinio', 'stagista', 'junior', 'neolaureato', 'assistente'],
    'pt': ['estágio', 'junior', 'recém formado', 'assistente'],
    'sv': ['praktik', 'trainee', 'junior', 'nyexaminerad'],
    'da': ['praktikant', 'trainee', 'junior', 'nyuddannet'],
    'no': ['praksis', 'trainee', 'junior', 'nyutdannet'],
  };
  
  return terms[language] || terms['en'];
}

/**
 * Check if a job description contains early career terms for a specific language
 * @param text - Job title + description
 * @param language - ISO 639-1 language code
 * @returns boolean
 */
export function hasEarlyCareerTerms(text: string, language: string): boolean {
  const terms = getEarlyCareerTerms(language);
  const lowerText = text.toLowerCase();
  
  return terms.some(term => lowerText.includes(term.toLowerCase()));
}

/**
 * Smart early career detection using country + language hints
 * @param job - Job object with title, description, and country
 * @returns boolean
 */
export function smartEarlyCareerDetection(job: { title: string; description: string; country?: string }): boolean {
  const text = `${job.title} ${job.description}`;
  const language = getCountryLanguage(job.country || '');
  
  // First try language-specific detection
  if (hasEarlyCareerTerms(text, language)) {
    return true;
  }
  
  // Fallback to English terms
  return hasEarlyCareerTerms(text, 'en');
}
