/**
 * Job enrichment service
 * Extracted from the massive jobMatching.ts file
 */

import type { Job, EnrichedJob, FreshnessTier, NormalizedUserProfile, UserPreferences } from './types';

// ---------- Job enrichment functions ----------
export function enrichJobData(job: Job): EnrichedJob {
  const jobText = `${job.title} ${job.description}`.toLowerCase();
  
  return {
    ...job,
    freshness_tier: calculateFreshnessTier(job.posted_at || job.created_at || ''),
    professional_expertise: extractProfessionalExpertise(job.title, job.description),
    career_path: extractCareerPath(job.title, job.description),
    start_date: extractStartDate(job.description),
    complexity_score: calculateComplexityScore(job.description, job.title),
    visa_friendly: detectVisaFriendly(job.description, job.title),
    experience_level: determineExperienceLevel(job.description, job.title),
    work_environment_detected: detectWorkEnvironment(job.description),
    language_requirements: extractLanguageRequirements(job.description)
  };
}

export function normalizeUserPreferences(userPrefs: UserPreferences): NormalizedUserProfile {
  return {
    email: userPrefs.email,
    career_path: Array.isArray(userPrefs.career_path) ? userPrefs.career_path : [],
    target_cities: Array.isArray(userPrefs.target_cities) ? userPrefs.target_cities : [],
    languages_spoken: Array.isArray(userPrefs.languages_spoken) ? userPrefs.languages_spoken : [],
    company_types: Array.isArray(userPrefs.company_types) ? userPrefs.company_types : [],
    roles_selected: Array.isArray(userPrefs.roles_selected) ? userPrefs.roles_selected : [],
    professional_expertise: userPrefs.professional_expertise || null,
    entry_level_preference: userPrefs.entry_level_preference || null,
    work_environment: userPrefs.work_environment as 'remote' | 'hybrid' | 'on-site' | null,
    start_date: null,
    careerFocus: Array.isArray(userPrefs.career_path) && userPrefs.career_path.length > 0 
      ? userPrefs.career_path[0] 
      : 'unknown'
  };
}

// ---------- Freshness calculation ----------
export function calculateFreshnessTier(postedAt: string): FreshnessTier {
  if (!postedAt) return 'very_stale';
  
  const daysOld = (Date.now() - new Date(postedAt).getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysOld < 1) return 'fresh';
  if (daysOld < 7) return 'recent';
  if (daysOld < 30) return 'stale';
  return 'very_stale';
}

// ---------- Professional expertise extraction ----------
export function extractProfessionalExpertise(jobTitle: string, description: string): string {
  const text = `${jobTitle} ${description}`.toLowerCase();
  
  const expertiseMap: Record<string, string> = {
    'software engineer': 'software',
    'software developer': 'software',
    'frontend developer': 'software',
    'backend developer': 'software',
    'full stack developer': 'software',
    'mobile developer': 'software',
    'data scientist': 'data',
    'data analyst': 'data',
    'business analyst': 'data',
    'marketing manager': 'marketing',
    'marketing specialist': 'marketing',
    'digital marketing': 'marketing',
    'sales representative': 'sales',
    'business development': 'sales',
    'account manager': 'sales',
    'consultant': 'consulting',
    'management consultant': 'consulting',
    'strategy consultant': 'consulting',
    'financial analyst': 'finance',
    'investment analyst': 'finance',
    'risk analyst': 'finance',
    'product manager': 'product',
    'product owner': 'product',
    'product analyst': 'product',
    'ui designer': 'design',
    'ux designer': 'design',
    'graphic designer': 'design',
    'operations manager': 'operations',
    'project manager': 'operations',
    'supply chain': 'operations'
  };
  
  for (const [keyword, expertise] of Object.entries(expertiseMap)) {
    if (text.includes(keyword)) {
      return expertise;
    }
  }
  
  return 'general';
}

// ---------- Career path extraction ----------
export function extractCareerPath(jobTitle: string, description: string): string {
  const text = `${jobTitle} ${description}`.toLowerCase();
  
  const careerPaths: Record<string, string> = {
    'technology': 'tech',
    'fintech': 'finance',
    'healthcare': 'healthcare',
    'e-commerce': 'retail',
    'consulting': 'consulting',
    'finance': 'finance',
    'banking': 'finance',
    'marketing': 'marketing',
    'advertising': 'marketing',
    'media': 'media',
    'entertainment': 'media',
    'retail': 'retail',
    'manufacturing': 'manufacturing',
    'automotive': 'automotive',
    'aerospace': 'aerospace',
    'energy': 'energy',
    'real estate': 'real-estate',
    'education': 'education',
    'government': 'government'
  };
  
  for (const [keyword, path] of Object.entries(careerPaths)) {
    if (text.includes(keyword)) {
      return path;
    }
  }
  
  return 'general';
}

// ---------- Start date extraction ----------
export function extractStartDate(description: string): string {
  const text = description.toLowerCase();
  
  // Look for common start date patterns
  const patterns = [
    /start(?:ing)?\s+(?:date|immediately|asap)/i,
    /available\s+(?:immediately|asap)/i,
    /can\s+start\s+(?:immediately|asap)/i,
    /flexible\s+start\s+date/i,
    /immediate\s+start/i
  ];
  
  for (const pattern of patterns) {
    if (pattern.test(text)) {
      return 'immediate';
    }
  }
  
  return 'flexible';
}

// ---------- Complexity score calculation ----------
export function calculateComplexityScore(description: string, title: string): number {
  const text = `${title} ${description}`.toLowerCase();
  let score = 0;
  
  // Technical complexity indicators
  const techTerms = ['api', 'database', 'algorithm', 'architecture', 'framework', 'library', 'sdk'];
  score += techTerms.filter(term => text.includes(term)).length * 2;
  
  // Management complexity indicators
  const mgmtTerms = ['team', 'lead', 'manage', 'coordinate', 'strategy', 'budget', 'stakeholder'];
  score += mgmtTerms.filter(term => text.includes(term)).length * 1.5;
  
  // Business complexity indicators
  const bizTerms = ['revenue', 'profit', 'market', 'customer', 'client', 'business', 'commercial'];
  score += bizTerms.filter(term => text.includes(term)).length * 1;
  
  return Math.min(10, score);
}

// ---------- Visa friendliness detection ----------
export function detectVisaFriendly(description: string, title: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  
  const visaFriendlyTerms = [
    'visa sponsorship',
    'work permit',
    'relocation support',
    'international',
    'global',
    'diverse',
    'inclusive'
  ];
  
  return visaFriendlyTerms.some(term => text.includes(term));
}

// ---------- Experience level determination ----------
export function determineExperienceLevel(description: string, title: string): 'entry' | 'junior' | 'mid' | 'senior' {
  const text = `${title} ${description}`.toLowerCase();
  
  if (text.includes('senior') || text.includes('lead') || text.includes('principal')) {
    return 'senior';
  }
  
  if (text.includes('junior') || text.includes('associate') || text.includes('entry level')) {
    return 'junior';
  }
  
  if (text.includes('graduate') || text.includes('intern') || text.includes('trainee')) {
    return 'entry';
  }
  
  return 'mid';
}

// ---------- Work environment detection ----------
export function detectWorkEnvironment(description: string): 'remote' | 'hybrid' | 'office' | 'unclear' {
  const text = description.toLowerCase();
  
  if (text.includes('remote') || text.includes('work from home') || text.includes('distributed')) {
    return 'remote';
  }
  
  if (text.includes('hybrid') || text.includes('flexible') || text.includes('mix')) {
    return 'hybrid';
  }
  
  if (text.includes('office') || text.includes('on-site') || text.includes('location')) {
    return 'office';
  }
  
  return 'unclear';
}

// ---------- Language requirements extraction ----------
export function extractLanguageRequirements(description: string): string[] {
  const text = description.toLowerCase();
  const languages: string[] = [];
  
  const languageMap: Record<string, string> = {
    'english': 'english',
    'german': 'german',
    'french': 'french',
    'spanish': 'spanish',
    'italian': 'italian',
    'dutch': 'dutch',
    'portuguese': 'portuguese',
    'polish': 'polish',
    'czech': 'czech',
    'hungarian': 'hungarian',
    'romanian': 'romanian',
    'bulgarian': 'bulgarian',
    'croatian': 'croatian',
    'slovak': 'slovak',
    'slovenian': 'slovenian',
    'lithuanian': 'lithuanian',
    'latvian': 'latvian',
    'estonian': 'estonian',
    'finnish': 'finnish',
    'swedish': 'swedish',
    'norwegian': 'norwegian',
    'danish': 'danish'
  };
  
  for (const [keyword, language] of Object.entries(languageMap)) {
    if (text.includes(keyword)) {
      languages.push(language);
    }
  }
  
  return [...new Set(languages)]; // Remove duplicates
}
