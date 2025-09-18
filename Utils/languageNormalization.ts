/**
 * Language Normalization Glossary
 * EU terms → English for consistent job matching
 * Using Map to avoid duplicate key issues while preserving all language mappings
 */

export interface LanguageMapping {
  original: string;
  normalized: string;
  language: string;
  category: 'job_title' | 'skill' | 'location' | 'company_type' | 'experience_level';
}

// Early career terms used in JobPing scrapers - focused on internship, trainee, graduate, junior terms
export const LANGUAGE_NORMALIZATION_MAP = new Map<string, LanguageMapping>([
  // English terms (base)
  ['intern', { original: 'intern', normalized: 'intern', language: 'en', category: 'experience_level' }],
  ['internship', { original: 'internship', normalized: 'internship', language: 'en', category: 'experience_level' }],
  ['trainee', { original: 'trainee', normalized: 'trainee', language: 'en', category: 'experience_level' }],
  ['graduate', { original: 'graduate', normalized: 'graduate', language: 'en', category: 'experience_level' }],
  ['junior', { original: 'junior', normalized: 'junior', language: 'en', category: 'experience_level' }],
  ['entry level', { original: 'entry level', normalized: 'entry level', language: 'en', category: 'experience_level' }],
  ['apprentice', { original: 'apprentice', normalized: 'apprentice', language: 'en', category: 'experience_level' }],
  ['starter', { original: 'starter', normalized: 'starter', language: 'en', category: 'experience_level' }],
  ['beginner', { original: 'beginner', normalized: 'beginner', language: 'en', category: 'experience_level' }],
  ['new graduate', { original: 'new graduate', normalized: 'new graduate', language: 'en', category: 'experience_level' }],
  ['recent graduate', { original: 'recent graduate', normalized: 'recent graduate', language: 'en', category: 'experience_level' }],
  
  // German early career terms
  ['praktikant', { original: 'praktikant', normalized: 'intern', language: 'de', category: 'experience_level' }],
  ['praktikantin', { original: 'praktikantin', normalized: 'intern', language: 'de', category: 'experience_level' }],
  ['praktikum', { original: 'praktikum', normalized: 'internship', language: 'de', category: 'experience_level' }],
  ['auszubildender', { original: 'auszubildender', normalized: 'trainee', language: 'de', category: 'experience_level' }],
  ['auszubildende', { original: 'auszubildende', normalized: 'trainee', language: 'de', category: 'experience_level' }],
  ['absolvent', { original: 'absolvent', normalized: 'graduate', language: 'de', category: 'experience_level' }],
  ['absolventin', { original: 'absolventin', normalized: 'graduate', language: 'de', category: 'experience_level' }],
  ['jungakademiker', { original: 'jungakademiker', normalized: 'graduate', language: 'de', category: 'experience_level' }],
  ['einsteiger', { original: 'einsteiger', normalized: 'junior', language: 'de', category: 'experience_level' }],
  ['einsteigerin', { original: 'einsteigerin', normalized: 'junior', language: 'de', category: 'experience_level' }],
  ['berufseinsteiger', { original: 'berufseinsteiger', normalized: 'entry level', language: 'de', category: 'experience_level' }],
  ['berufseinsteigerin', { original: 'berufseinsteigerin', normalized: 'entry level', language: 'de', category: 'experience_level' }],
  
  // French early career terms
  ['stagiaire', { original: 'stagiaire', normalized: 'intern', language: 'fr', category: 'experience_level' }],
  ['stage', { original: 'stage', normalized: 'internship', language: 'fr', category: 'experience_level' }],
  ['apprenti', { original: 'apprenti', normalized: 'apprentice', language: 'fr', category: 'experience_level' }],
  ['apprentie', { original: 'apprentie', normalized: 'apprentice', language: 'fr', category: 'experience_level' }],
  ['diplômé', { original: 'diplômé', normalized: 'graduate', language: 'fr', category: 'experience_level' }],
  ['diplômée', { original: 'diplômée', normalized: 'graduate', language: 'fr', category: 'experience_level' }],
  ['jeune diplômé', { original: 'jeune diplômé', normalized: 'graduate', language: 'fr', category: 'experience_level' }],
  ['jeune diplômée', { original: 'jeune diplômée', normalized: 'graduate', language: 'fr', category: 'experience_level' }],
  ['débutant', { original: 'débutant', normalized: 'junior', language: 'fr', category: 'experience_level' }],
  ['débutante', { original: 'débutante', normalized: 'junior', language: 'fr', category: 'experience_level' }],
  
  // Spanish early career terms
  ['practicante', { original: 'practicante', normalized: 'intern', language: 'es', category: 'experience_level' }],
  ['becario', { original: 'becario', normalized: 'intern', language: 'es', category: 'experience_level' }],
  ['becaria', { original: 'becaria', normalized: 'intern', language: 'es', category: 'experience_level' }],
  ['aprendiz', { original: 'aprendiz', normalized: 'apprentice', language: 'es', category: 'experience_level' }],
  ['graduado', { original: 'graduado', normalized: 'graduate', language: 'es', category: 'experience_level' }],
  ['graduada', { original: 'graduada', normalized: 'graduate', language: 'es', category: 'experience_level' }],
  ['principiante', { original: 'principiante', normalized: 'junior', language: 'es', category: 'experience_level' }],
  ['recién graduado', { original: 'recién graduado', normalized: 'graduate', language: 'es', category: 'experience_level' }],
  ['recién graduada', { original: 'recién graduada', normalized: 'graduate', language: 'es', category: 'experience_level' }],
  
  // Italian early career terms
  ['stagista', { original: 'stagista', normalized: 'intern', language: 'it', category: 'experience_level' }],
  ['tirocinante', { original: 'tirocinante', normalized: 'trainee', language: 'it', category: 'experience_level' }],
  ['apprendista', { original: 'apprendista', normalized: 'apprentice', language: 'it', category: 'experience_level' }],
  ['laureato', { original: 'laureato', normalized: 'graduate', language: 'it', category: 'experience_level' }],
  ['laureata', { original: 'laureata', normalized: 'graduate', language: 'it', category: 'experience_level' }],
  ['neo-laureato', { original: 'neo-laureato', normalized: 'graduate', language: 'it', category: 'experience_level' }],
  ['neo-laureata', { original: 'neo-laureata', normalized: 'graduate', language: 'it', category: 'experience_level' }],
  ['principiante', { original: 'principiante', normalized: 'junior', language: 'it', category: 'experience_level' }],
  ['giovane laureato', { original: 'giovane laureato', normalized: 'graduate', language: 'it', category: 'experience_level' }],
  ['giovane laureata', { original: 'giovane laureata', normalized: 'graduate', language: 'it', category: 'experience_level' }],
  
  // Dutch early career terms
  ['stagiair', { original: 'stagiair', normalized: 'intern', language: 'nl', category: 'experience_level' }],
  ['stage', { original: 'stage', normalized: 'internship', language: 'nl', category: 'experience_level' }],
  ['leerling', { original: 'leerling', normalized: 'apprentice', language: 'nl', category: 'experience_level' }],
  ['afgestudeerde', { original: 'afgestudeerde', normalized: 'graduate', language: 'nl', category: 'experience_level' }],
  ['beginnende', { original: 'beginnende', normalized: 'junior', language: 'nl', category: 'experience_level' }],
  ['starter', { original: 'starter', normalized: 'starter', language: 'nl', category: 'experience_level' }],
  ['nieuwe medewerker', { original: 'nieuwe medewerker', normalized: 'entry level', language: 'nl', category: 'experience_level' }],
  
  // Portuguese early career terms
  ['estagiário', { original: 'estagiário', normalized: 'intern', language: 'pt', category: 'experience_level' }],
  ['estagiária', { original: 'estagiária', normalized: 'intern', language: 'pt', category: 'experience_level' }],
  ['estágio', { original: 'estágio', normalized: 'internship', language: 'pt', category: 'experience_level' }],
  ['aprendiz', { original: 'aprendiz', normalized: 'apprentice', language: 'pt', category: 'experience_level' }],
  ['formando', { original: 'formando', normalized: 'trainee', language: 'pt', category: 'experience_level' }],
  ['formanda', { original: 'formanda', normalized: 'trainee', language: 'pt', category: 'experience_level' }],
  ['licenciado', { original: 'licenciado', normalized: 'graduate', language: 'pt', category: 'experience_level' }],
  ['licenciada', { original: 'licenciada', normalized: 'graduate', language: 'pt', category: 'experience_level' }],
  ['recém-licenciado', { original: 'recém-licenciado', normalized: 'graduate', language: 'pt', category: 'experience_level' }],
  ['recém-licenciada', { original: 'recém-licenciada', normalized: 'graduate', language: 'pt', category: 'experience_level' }],
  ['júnior', { original: 'júnior', normalized: 'junior', language: 'pt', category: 'experience_level' }],
  
  // Polish early career terms
  ['stażysta', { original: 'stażysta', normalized: 'intern', language: 'pl', category: 'experience_level' }],
  ['stażystka', { original: 'stażystka', normalized: 'intern', language: 'pl', category: 'experience_level' }],
  ['staż', { original: 'staż', normalized: 'internship', language: 'pl', category: 'experience_level' }],
  ['praktykant', { original: 'praktykant', normalized: 'trainee', language: 'pl', category: 'experience_level' }],
  ['praktykantka', { original: 'praktykantka', normalized: 'trainee', language: 'pl', category: 'experience_level' }],
  ['absolwent', { original: 'absolwent', normalized: 'graduate', language: 'pl', category: 'experience_level' }],
  ['absolwentka', { original: 'absolwentka', normalized: 'graduate', language: 'pl', category: 'experience_level' }],
  ['młody absolwent', { original: 'młody absolwent', normalized: 'graduate', language: 'pl', category: 'experience_level' }],
  ['młoda absolwentka', { original: 'młoda absolwentka', normalized: 'graduate', language: 'pl', category: 'experience_level' }],
  ['junior', { original: 'junior', normalized: 'junior', language: 'pl', category: 'experience_level' }]
]);

// Helper function to normalize text using the language mappings
export function normalizeText(text: string, language?: string): string {
  if (!text) return text;
  
  const lowerText = text.toLowerCase().trim();
  
  // Try exact match first
  const exactMatch = LANGUAGE_NORMALIZATION_MAP.get(lowerText);
  if (exactMatch) {
    return exactMatch.normalized;
  }
  
  // If language specified, try language-specific matches
  if (language) {
    for (const [key, mapping] of LANGUAGE_NORMALIZATION_MAP.entries()) {
      if (mapping.language === language && key.includes(lowerText)) {
        return mapping.normalized;
      }
    }
  }
  
  // Try partial matches
  for (const [key, mapping] of LANGUAGE_NORMALIZATION_MAP.entries()) {
    if (lowerText.includes(key) || key.includes(lowerText)) {
      return mapping.normalized;
    }
  }
  
  return text; // Return original if no match found
}

// Helper function to get all mappings for a specific language
export function getMappingsForLanguage(language: string): LanguageMapping[] {
  const mappings: LanguageMapping[] = [];
  for (const mapping of LANGUAGE_NORMALIZATION_MAP.values()) {
    if (mapping.language === language) {
      mappings.push(mapping);
    }
  }
  return mappings;
}

// Helper function to get all mappings for a specific category
export function getMappingsForCategory(category: LanguageMapping['category']): LanguageMapping[] {
  const mappings: LanguageMapping[] = [];
  for (const mapping of LANGUAGE_NORMALIZATION_MAP.values()) {
    if (mapping.category === category) {
      mappings.push(mapping);
    }
  }
  return mappings;
}