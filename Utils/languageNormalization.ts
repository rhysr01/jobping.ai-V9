/**
 * Language Normalization Glossary
 * EU terms → English for consistent job matching
 */

export interface LanguageMapping {
  original: string;
  normalized: string;
  language: string;
  category: 'job_title' | 'skill' | 'location' | 'company_type' | 'experience_level';
}

// Comprehensive EU language normalization mappings
export const LANGUAGE_NORMALIZATION_MAP: Record<string, LanguageMapping> = {
  // German job titles and terms
  'praktikant': { original: 'praktikant', normalized: 'intern', language: 'de', category: 'experience_level' },
  'praktikum': { original: 'praktikum', normalized: 'internship', language: 'de', category: 'experience_level' },
  'auszubildender': { original: 'auszubildender', normalized: 'trainee', language: 'de', category: 'experience_level' },
  'trainee': { original: 'trainee', normalized: 'trainee', language: 'de', category: 'experience_level' },
  'berufseinsteiger': { original: 'berufseinsteiger', normalized: 'entry level', language: 'de', category: 'experience_level' },
  'einsteiger': { original: 'einsteiger', normalized: 'junior', language: 'de', category: 'experience_level' },
  'jungakademiker': { original: 'jungakademiker', normalized: 'graduate', language: 'de', category: 'experience_level' },
  'absolvent': { original: 'absolvent', normalized: 'graduate', language: 'de', category: 'experience_level' },
  'absolventin': { original: 'absolventin', normalized: 'graduate', language: 'de', category: 'experience_level' },
  'neuling': { original: 'neuling', normalized: 'beginner', language: 'de', category: 'experience_level' },
  'anfänger': { original: 'anfänger', normalized: 'beginner', language: 'de', category: 'experience_level' },
  
  // German job titles
  'entwickler': { original: 'entwickler', normalized: 'developer', language: 'de', category: 'job_title' },
  'softwareentwickler': { original: 'softwareentwickler', normalized: 'software developer', language: 'de', category: 'job_title' },
  'programmierer': { original: 'programmierer', normalized: 'programmer', language: 'de', category: 'job_title' },
  'analyst': { original: 'analyst', normalized: 'analyst', language: 'de', category: 'job_title' },
  'berater': { original: 'berater', normalized: 'consultant', language: 'de', category: 'job_title' },
  'manager': { original: 'manager', normalized: 'manager', language: 'de', category: 'job_title' },
  'koordinator': { original: 'koordinator', normalized: 'coordinator', language: 'de', category: 'job_title' },
  'spezialist': { original: 'spezialist', normalized: 'specialist', language: 'de', category: 'job_title' },
  'assistent': { original: 'assistent', normalized: 'assistant', language: 'de', category: 'job_title' },
  'mitarbeiter': { original: 'mitarbeiter', normalized: 'employee', language: 'de', category: 'job_title' },
  
  // French job titles and terms
  'stagiaire': { original: 'stagiaire', normalized: 'intern', language: 'fr', category: 'experience_level' },
  'stage': { original: 'stage', normalized: 'internship', language: 'fr', category: 'experience_level' },
  'apprenti': { original: 'apprenti', normalized: 'apprentice', language: 'fr', category: 'experience_level' },
  'apprentie': { original: 'apprentie', normalized: 'apprentice', language: 'fr', category: 'experience_level' },
  'débutant': { original: 'débutant', normalized: 'junior', language: 'fr', category: 'experience_level' },
  'débutante': { original: 'débutante', normalized: 'junior', language: 'fr', category: 'experience_level' },
  'jeune diplômé': { original: 'jeune diplômé', normalized: 'graduate', language: 'fr', category: 'experience_level' },
  'jeune diplômée': { original: 'jeune diplômée', normalized: 'graduate', language: 'fr', category: 'experience_level' },
  'nouveau': { original: 'nouveau', normalized: 'new', language: 'fr', category: 'experience_level' },
  'nouvelle': { original: 'nouvelle', normalized: 'new', language: 'fr', category: 'experience_level' },
  'première expérience': { original: 'première expérience', normalized: 'entry level', language: 'fr', category: 'experience_level' },
  'premier emploi': { original: 'premier emploi', normalized: 'first job', language: 'fr', category: 'experience_level' },
  
  // French job titles
  'développeur': { original: 'développeur', normalized: 'developer', language: 'fr', category: 'job_title' },
  'développeuse': { original: 'développeuse', normalized: 'developer', language: 'fr', category: 'job_title' },
  'programmeur': { original: 'programmeur', normalized: 'programmer', language: 'fr', category: 'job_title' },
  'programmeuse': { original: 'programmeuse', normalized: 'programmer', language: 'fr', category: 'job_title' },
  'analyste': { original: 'analyste', normalized: 'analyst', language: 'fr', category: 'job_title' },
  'conseiller': { original: 'conseiller', normalized: 'advisor', language: 'fr', category: 'job_title' },
  'conseillère': { original: 'conseillère', normalized: 'advisor', language: 'fr', category: 'job_title' },
  'consultant': { original: 'consultant', normalized: 'consultant', language: 'fr', category: 'job_title' },
  'consultante': { original: 'consultante', normalized: 'consultant', language: 'fr', category: 'job_title' },
  'gestionnaire': { original: 'gestionnaire', normalized: 'manager', language: 'fr', category: 'job_title' },
  'coordinateur': { original: 'coordinateur', normalized: 'coordinator', language: 'fr', category: 'job_title' },
  'coordinatrice': { original: 'coordinatrice', normalized: 'coordinator', language: 'fr', category: 'job_title' },
  
  // Spanish job titles and terms
  'practicante': { original: 'practicante', normalized: 'intern', language: 'es', category: 'experience_level' },
  'practicas': { original: 'practicas', normalized: 'internship', language: 'es', category: 'experience_level' },
  'aprendiz': { original: 'aprendiz', normalized: 'apprentice', language: 'es', category: 'experience_level' },
  'principiante': { original: 'principiante', normalized: 'junior', language: 'es', category: 'experience_level' },
  'recién graduado': { original: 'recién graduado', normalized: 'graduate', language: 'es', category: 'experience_level' },
  'recién graduada': { original: 'recién graduada', normalized: 'graduate', language: 'es', category: 'experience_level' },
  'novato': { original: 'novato', normalized: 'beginner', language: 'es', category: 'experience_level' },
  'novata': { original: 'novata', normalized: 'beginner', language: 'es', category: 'experience_level' },
  'primer trabajo': { original: 'primer trabajo', normalized: 'first job', language: 'es', category: 'experience_level' },
  'primera experiencia': { original: 'primera experiencia', normalized: 'entry level', language: 'es', category: 'experience_level' },
  
  // Spanish job titles
  'desarrollador': { original: 'desarrollador', normalized: 'developer', language: 'es', category: 'job_title' },
  'desarrolladora': { original: 'desarrolladora', normalized: 'developer', language: 'es', category: 'job_title' },
  'programador': { original: 'programador', normalized: 'programmer', language: 'es', category: 'job_title' },
  'programadora': { original: 'programadora', normalized: 'programmer', language: 'es', category: 'job_title' },
  'analista': { original: 'analista', normalized: 'analyst', language: 'es', category: 'job_title' },
  'consultor': { original: 'consultor', normalized: 'consultant', language: 'es', category: 'job_title' },
  'consultora': { original: 'consultora', normalized: 'consultant', language: 'es', category: 'job_title' },
  'gerente': { original: 'gerente', normalized: 'manager', language: 'es', category: 'job_title' },
  'coordinador': { original: 'coordinador', normalized: 'coordinator', language: 'es', category: 'job_title' },
  'coordinadora': { original: 'coordinadora', normalized: 'coordinator', language: 'es', category: 'job_title' },
  'especialista': { original: 'especialista', normalized: 'specialist', language: 'es', category: 'job_title' },
  'asistente': { original: 'asistente', normalized: 'assistant', language: 'es', category: 'job_title' },
  
  // Italian job titles and terms
  'stagista': { original: 'stagista', normalized: 'intern', language: 'it', category: 'experience_level' },
  'tirocinante': { original: 'tirocinante', normalized: 'trainee', language: 'it', category: 'experience_level' },
  'apprendista': { original: 'apprendista', normalized: 'apprentice', language: 'it', category: 'experience_level' },
  'principiante': { original: 'principiante', normalized: 'junior', language: 'it', category: 'experience_level' },
  'neo-laureato': { original: 'neo-laureato', normalized: 'graduate', language: 'it', category: 'experience_level' },
  'neo-laureata': { original: 'neo-laureata', normalized: 'graduate', language: 'it', category: 'experience_level' },
  'giovane': { original: 'giovane', normalized: 'young', language: 'it', category: 'experience_level' },
  'primo lavoro': { original: 'primo lavoro', normalized: 'first job', language: 'it', category: 'experience_level' },
  
  // Italian job titles
  'sviluppatore': { original: 'sviluppatore', normalized: 'developer', language: 'it', category: 'job_title' },
  'sviluppatrice': { original: 'sviluppatrice', normalized: 'developer', language: 'it', category: 'job_title' },
  'programmatore': { original: 'programmatore', normalized: 'programmer', language: 'it', category: 'job_title' },
  'programmatrice': { original: 'programmatrice', normalized: 'programmer', language: 'it', category: 'job_title' },
  'analista': { original: 'analista', normalized: 'analyst', language: 'it', category: 'job_title' },
  'consulente': { original: 'consulente', normalized: 'consultant', language: 'it', category: 'job_title' },
  'manager': { original: 'manager', normalized: 'manager', language: 'it', category: 'job_title' },
  'coordinatore': { original: 'coordinatore', normalized: 'coordinator', language: 'it', category: 'job_title' },
  'coordinatrice': { original: 'coordinatrice', normalized: 'coordinator', language: 'it', category: 'job_title' },
  
  // Dutch job titles and terms
  'stagiair': { original: 'stagiair', normalized: 'intern', language: 'nl', category: 'experience_level' },
  'stage': { original: 'stage', normalized: 'internship', language: 'nl', category: 'experience_level' },
  'leerling': { original: 'leerling', normalized: 'apprentice', language: 'nl', category: 'experience_level' },
  'beginnende': { original: 'beginnende', normalized: 'junior', language: 'nl', category: 'experience_level' },
  'starter': { original: 'starter', normalized: 'entry level', language: 'nl', category: 'experience_level' },
  'afgestudeerde': { original: 'afgestudeerde', normalized: 'graduate', language: 'nl', category: 'experience_level' },
  'nieuwe': { original: 'nieuwe', normalized: 'new', language: 'nl', category: 'experience_level' },
  'eerste baan': { original: 'eerste baan', normalized: 'first job', language: 'nl', category: 'experience_level' },
  'junior': { original: 'junior', normalized: 'junior', language: 'nl', category: 'experience_level' },
  
  // Dutch job titles
  'ontwikkelaar': { original: 'ontwikkelaar', normalized: 'developer', language: 'nl', category: 'job_title' },
  'ontwikkelaarster': { original: 'ontwikkelaarster', normalized: 'developer', language: 'nl', category: 'job_title' },
  'programmeur': { original: 'programmeur', normalized: 'programmer', language: 'nl', category: 'job_title' },
  'programmeurster': { original: 'programmeurster', normalized: 'programmer', language: 'nl', category: 'job_title' },
  'analist': { original: 'analist', normalized: 'analyst', language: 'nl', category: 'job_title' },
  'adviseur': { original: 'adviseur', normalized: 'advisor', language: 'nl', category: 'job_title' },
  'adviseurster': { original: 'adviseurster', normalized: 'advisor', language: 'nl', category: 'job_title' },
  'consultant': { original: 'consultant', normalized: 'consultant', language: 'nl', category: 'job_title' },
  'manager': { original: 'manager', normalized: 'manager', language: 'nl', category: 'job_title' },
  'coördinator': { original: 'coördinator', normalized: 'coordinator', language: 'nl', category: 'job_title' },
  'specialist': { original: 'specialist', normalized: 'specialist', language: 'nl', category: 'job_title' },
  'assistent': { original: 'assistent', normalized: 'assistant', language: 'nl', category: 'job_title' },
  
  // Common EU company types and locations
  'gmbh': { original: 'gmbh', normalized: 'ltd', language: 'de', category: 'company_type' },
  'ag': { original: 'ag', normalized: 'inc', language: 'de', category: 'company_type' },
  'sarl': { original: 'sarl', normalized: 'ltd', language: 'fr', category: 'company_type' },
  'sas': { original: 'sas', normalized: 'ltd', language: 'fr', category: 'company_type' },
  'srl': { original: 'srl', normalized: 'ltd', language: 'it', category: 'company_type' },
  'bv': { original: 'bv', normalized: 'ltd', language: 'nl', category: 'company_type' },
  'sl': { original: 'sl', normalized: 'ltd', language: 'es', category: 'company_type' },
  
  // EU locations
  'münchen': { original: 'münchen', normalized: 'munich', language: 'de', category: 'location' },
  'köln': { original: 'köln', normalized: 'cologne', language: 'de', category: 'location' },
  'hamburg': { original: 'hamburg', normalized: 'hamburg', language: 'de', category: 'location' },
  'frankfurt': { original: 'frankfurt', normalized: 'frankfurt', language: 'de', category: 'location' },
  'stuttgart': { original: 'stuttgart', normalized: 'stuttgart', language: 'de', category: 'location' },
  'düsseldorf': { original: 'düsseldorf', normalized: 'düsseldorf', language: 'de', category: 'location' },
  'lyon': { original: 'lyon', normalized: 'lyon', language: 'fr', category: 'location' },
  'marseille': { original: 'marseille', normalized: 'marseille', language: 'fr', category: 'location' },
  'toulouse': { original: 'toulouse', normalized: 'toulouse', language: 'fr', category: 'location' },
  'nice': { original: 'nice', normalized: 'nice', language: 'fr', category: 'location' },
  'valencia': { original: 'valencia', normalized: 'valencia', language: 'es', category: 'location' },
  'sevilla': { original: 'sevilla', normalized: 'seville', language: 'es', category: 'location' },
  'zaragoza': { original: 'zaragoza', normalized: 'zaragoza', language: 'es', category: 'location' },
  'roma': { original: 'roma', normalized: 'rome', language: 'it', category: 'location' },
  'napoli': { original: 'napoli', normalized: 'naples', language: 'it', category: 'location' },
  'torino': { original: 'torino', normalized: 'turin', language: 'it', category: 'location' },
  'rotterdam': { original: 'rotterdam', normalized: 'rotterdam', language: 'nl', category: 'location' },
  'den haag': { original: 'den haag', normalized: 'the hague', language: 'nl', category: 'location' },
  'utrecht': { original: 'utrecht', normalized: 'utrecht', language: 'nl', category: 'location' }
};

/**
 * Normalize text using the language normalization map
 */
export function normalizeTextToEnglish(text: string): string {
  if (!text) return text;
  
  let normalizedText = text.toLowerCase();
  
  // Apply normalization mappings
  for (const [original, mapping] of Object.entries(LANGUAGE_NORMALIZATION_MAP)) {
    const regex = new RegExp(`\\b${original}\\b`, 'gi');
    normalizedText = normalizedText.replace(regex, mapping.normalized);
  }
  
  return normalizedText;
}

/**
 * Get normalized terms for a specific category
 */
export function getNormalizedTermsForCategory(category: 'job_title' | 'skill' | 'location' | 'company_type' | 'experience_level'): string[] {
  return Object.values(LANGUAGE_NORMALIZATION_MAP)
    .filter(mapping => mapping.category === category)
    .map(mapping => mapping.normalized);
}

/**
 * Get original terms for a specific language
 */
export function getOriginalTermsForLanguage(language: string): string[] {
  return Object.values(LANGUAGE_NORMALIZATION_MAP)
    .filter(mapping => mapping.language === language)
    .map(mapping => mapping.original);
}

/**
 * Detect if text contains non-English terms
 */
export function containsNonEnglishTerms(text: string): boolean {
  if (!text) return false;
  
  const lowerText = text.toLowerCase();
  
  // Check for any non-English terms in the normalization map
  return Object.keys(LANGUAGE_NORMALIZATION_MAP).some(term => 
    lowerText.includes(term.toLowerCase())
  );
}

/**
 * Get language of detected terms
 */
export function getDetectedLanguages(text: string): string[] {
  if (!text) return [];
  
  const lowerText = text.toLowerCase();
  const detectedLanguages = new Set<string>();
  
  for (const [term, mapping] of Object.entries(LANGUAGE_NORMALIZATION_MAP)) {
    if (lowerText.includes(term.toLowerCase())) {
      detectedLanguages.add(mapping.language);
    }
  }
  
  return Array.from(detectedLanguages);
}
