/**
 * Scraper Helper Functions
 * Simplified job processing utilities for the IngestJob format
 */

export interface IngestJob {
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  posted_at?: string;
  source: string;
}

/**
 * Classify if a job is early-career based on title and description
 * Implements the "save-first" philosophy: if it's early-career and in Europe, save it
 */
export function classifyEarlyCareer(job: IngestJob): boolean {
  const { title, description } = job;
  const text = `${title} ${description}`.toLowerCase();

  // Early career indicators
  const earlyCareerKeywords = [
    'graduate', 'entry level', 'entry-level', 'junior', 'trainee', 'intern',
    'student', 'new grad', 'new graduate', 'recent graduate', 'first job',
    'no experience', '0-1 years', '0-2 years', '1-2 years', 'starter',
    'beginner', 'apprentice', 'associate', 'assistant'
  ];

  // Check for early career keywords
  const hasEarlyCareerKeyword = earlyCareerKeywords.some(keyword => 
    text.includes(keyword)
  );

  // Check for experience requirements that indicate early career
  const experiencePatterns = [
    /(?:0|1|2)\s*(?:years?|yrs?)\s*(?:of\s+)?experience/i,
    /no\s+experience\s+required/i,
    /entry\s+level/i,
    /junior\s+level/i
  ];

  const hasEarlyCareerExperience = experiencePatterns.some(pattern => 
    pattern.test(text)
  );

  // Check for education requirements that indicate early career
  const educationPatterns = [
    /bachelor['']?s?\s+degree/i,
    /master['']?s?\s+degree/i,
    /university\s+degree/i,
    /recent\s+graduate/i,
    /new\s+graduate/i
  ];

  const hasEducationRequirement = educationPatterns.some(pattern => 
    pattern.test(text)
  );

  // If any early career indicators are present, classify as early career
  return hasEarlyCareerKeyword || hasEarlyCareerExperience || hasEducationRequirement;
}

/**
 * Infer the role/career path from job title and description
 */
export function inferRole(job: IngestJob): string {
  const { title, description } = job;
  const text = `${title} ${description}`.toLowerCase();

  // Role mappings
  const rolePatterns = [
    { pattern: /software\s+(?:engineer|developer|programmer)/i, role: 'software-engineering' },
    { pattern: /data\s+(?:scientist|analyst|engineer)/i, role: 'data-science' },
    { pattern: /product\s+(?:manager|owner)/i, role: 'product-management' },
    { pattern: /marketing/i, role: 'marketing' },
    { pattern: /sales/i, role: 'sales' },
    { pattern: /design(?:er)?/i, role: 'design' },
    { pattern: /finance/i, role: 'finance' },
    { pattern: /hr|human\s+resources/i, role: 'hr' },
    { pattern: /operations/i, role: 'operations' },
    { pattern: /consultant/i, role: 'consulting' },
    { pattern: /research/i, role: 'research' },
    { pattern: /business\s+(?:analyst|intelligence)/i, role: 'business-analytics' },
    { pattern: /devops/i, role: 'devops' },
    { pattern: /frontend/i, role: 'frontend-development' },
    { pattern: /backend/i, role: 'backend-development' },
    { pattern: /full\s+stack/i, role: 'full-stack-development' },
    { pattern: /mobile\s+(?:developer|engineer)/i, role: 'mobile-development' },
    { pattern: /qa|quality\s+assurance|test/i, role: 'quality-assurance' },
    { pattern: /security/i, role: 'cybersecurity' },
    { pattern: /ai|machine\s+learning|ml/i, role: 'ai-ml' }
  ];

  // Find the first matching role pattern
  for (const { pattern, role } of rolePatterns) {
    if (pattern.test(text)) {
      return role;
    }
  }

  // Default to general if no specific role is found
  return 'general';
}

/**
 * Parse and standardize location information
 */
export function parseLocation(location: string): {
  city: string;
  country: string;
  isRemote: boolean;
  isEU: boolean;
} {
  const loc = location.toLowerCase().trim();
  
  // Check for remote indicators
  const isRemote = /remote|work\s+from\s+home|wfh|anywhere/i.test(loc);
  
  // EU countries
  const euCountries = [
    'austria', 'belgium', 'bulgaria', 'croatia', 'cyprus', 'czech republic',
    'denmark', 'estonia', 'finland', 'france', 'germany', 'greece', 'hungary',
    'ireland', 'italy', 'latvia', 'lithuania', 'luxembourg', 'malta',
    'netherlands', 'poland', 'portugal', 'romania', 'slovakia', 'slovenia',
    'spain', 'sweden', 'united kingdom', 'uk', 'germany', 'france', 'spain',
    'italy', 'netherlands', 'belgium', 'austria', 'switzerland', 'norway',
    'denmark', 'sweden', 'finland', 'poland', 'czech republic', 'hungary',
    'romania', 'bulgaria', 'croatia', 'slovenia', 'slovakia', 'estonia',
    'latvia', 'lithuania', 'malta', 'cyprus', 'luxembourg', 'ireland',
    'portugal', 'greece'
  ];

  // Check if location contains EU country
  const isEU = euCountries.some(country => loc.includes(country));
  
  // Extract city (simplified - first part before comma or space)
  const cityMatch = loc.match(/^([^,]+)/);
  const city = cityMatch ? cityMatch[1].trim() : location;
  
  // Extract country (after comma or from the end)
  const countryMatch = loc.match(/,?\s*([a-z\s]+)$/);
  const country = countryMatch ? countryMatch[1].trim() : '';

  return {
    city: city || location,
    country: country,
    isRemote,
    isEU: isEU || isRemote // Consider remote jobs as potentially EU
  };
}

/**
 * Generate a consistent job hash for deduplication
 */
export function makeJobHash(job: IngestJob): string {
  const { title, company, location } = job;
  
  // Normalize the data
  const normalizedTitle = title.toLowerCase().trim().replace(/\s+/g, ' ');
  const normalizedCompany = company.toLowerCase().trim().replace(/\s+/g, ' ');
  const normalizedLocation = location.toLowerCase().trim().replace(/\s+/g, ' ');
  
  // Create hash string
  const hashString = `${normalizedTitle}|${normalizedCompany}|${normalizedLocation}`;
  
  // Simple hash function (in production, you might want to use crypto)
  let hash = 0;
  for (let i = 0; i < hashString.length; i++) {
    const char = hashString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36);
}

/**
 * Validate if a job meets basic requirements
 */
export function validateJob(job: IngestJob): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!job.title || job.title.trim().length === 0) {
    errors.push('Title is required');
  }
  
  if (!job.company || job.company.trim().length === 0) {
    errors.push('Company is required');
  }
  
  if (!job.location || job.location.trim().length === 0) {
    errors.push('Location is required');
  }
  
  if (!job.description || job.description.trim().length === 0) {
    errors.push('Description is required');
  }
  
  if (!job.url || job.url.trim().length === 0) {
    errors.push('URL is required');
  }
  
  if (!job.source || job.source.trim().length === 0) {
    errors.push('Source is required');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Convert IngestJob to the format expected by the database
 */
export function convertToDatabaseFormat(job: IngestJob) {
  const { city, country, isRemote, isEU } = parseLocation(job.location);
  const isEarlyCareer = classifyEarlyCareer(job);
  const jobHash = makeJobHash(job);
  
  // ✅ Log early career classification for debugging
  console.log(`🎯 Early Career: "${job.title}" - ${isEarlyCareer ? 'YES' : 'NO'}`);
  
  return {
    job_hash: jobHash,
    title: job.title.trim(),
    company: job.company.trim(),
    location: job.location.trim(),
    description: job.description.trim(),
    job_url: job.url.trim(),
    source: job.source.trim(),
    posted_at: job.posted_at || new Date().toISOString(),
    categories: [isEarlyCareer ? 'early-career' : 'experienced'],
    work_environment: isRemote ? 'remote' : 'on-site',
    experience_required: isEarlyCareer ? 'entry-level' : 'experienced',
    company_profile_url: '',
    language_requirements: [],
    scrape_timestamp: new Date().toISOString(),
    original_posted_date: job.posted_at || new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    is_active: true,
    created_at: new Date().toISOString(),
    // Additional metadata
    metadata: {
      city,
      country,
      isRemote,
      isEU,
      isEarlyCareer,
      parsedAt: new Date().toISOString()
    }
  };
}

/**
 * Check if a job should be saved based on the north-star rule
 * "If it's early-career and in Europe, save it"
 */
export function shouldSaveJob(job: IngestJob): boolean {
  const { isEU } = parseLocation(job.location);
  const isEarlyCareer = classifyEarlyCareer(job);
  
  // North-star rule: save if early-career and in Europe
  return isEarlyCareer && isEU;
}

/**
 * Log job processing for debugging
 */
export function logJobProcessing(job: IngestJob, action: string, details?: any) {
  const { isEU } = parseLocation(job.location);
  const isEarlyCareer = classifyEarlyCareer(job);
  
  console.log(`[${action}] ${job.company} - ${job.title}`);
  console.log(`  Location: ${job.location} (EU: ${isEU})`);
  console.log(`  Early Career: ${isEarlyCareer}`);
  console.log(`  Should Save: ${shouldSaveJob(job)}`);
  
  if (details) {
    console.log(`  Details:`, details);
  }
}
