/**
 * Standardization Pipe (Processor)
 * Central data 'cleansing' station for all scrapers
 * Ensures uniform metadata extraction across all job sources
 */

const { classifyEarlyCareer, normalizeString } = require('./helpers.cjs');
const { normalizeJobLocation } = require('./locationNormalizer.cjs');

/**
 * Clean company name by removing common legal suffixes
 * Helps with matching companies across different sources
 */
function cleanCompany(companyName) {
  if (!companyName) return '';
  
  let cleaned = companyName.trim().replace(/\s+/g, ' ');
  
  // Common legal suffixes to remove (case-insensitive)
  const suffixes = [
    /\s*Ltd\.?$/i,
    /\s*Limited$/i,
    /\s*Inc\.?$/i,
    /\s*Incorporated$/i,
    /\s*GmbH$/i,
    /\s*S\.A\.?$/i,
    /\s*S\.L\.?$/i,
    /\s*S\.R\.L\.?$/i,
    /\s*LLC$/i,
    /\s*LLP$/i,
    /\s*PLC$/i,
    /\s*Corp\.?$/i,
    /\s*Corporation$/i,
    /\s*Co\.?$/i,
    /\s*Company$/i,
    /\s*AG$/i,
    /\s*BV$/i,
    /\s*NV$/i,
    /\s*AB$/i,
    /\s*Oy$/i,
    /\s*AS$/i,
  ];
  
  suffixes.forEach(suffix => {
    cleaned = cleaned.replace(suffix, '');
  });
  
  return cleaned.trim();
}

/**
 * Extract language requirements from description
 * Comprehensive detection for 30+ languages (including visa-seeking languages)
 */
function extractLanguageRequirements(description) {
  if (!description) return [];
  const desc = description.toLowerCase();
  const languages = [];
  
  // Comprehensive language patterns - includes all visa-seeking languages
  const languagePatterns = [
    // EU languages
    { pattern: /\b(english|anglais|eng\b|fluent.*english|native.*english|english.*speaker|english.*speaking|english.*language|english.*proficiency)\b/i, lang: 'English' },
    { pattern: /\b(french|français|francais|fluent.*french|native.*french|french.*speaker|french.*speaking)\b/i, lang: 'French' },
    { pattern: /\b(german|deutsch|fluent.*german|native.*german|german.*speaker|german.*speaking)\b/i, lang: 'German' },
    { pattern: /\b(spanish|español|espanol|castellano|fluent.*spanish|native.*spanish|spanish.*speaker|spanish.*speaking)\b/i, lang: 'Spanish' },
    { pattern: /\b(italian|italiano|fluent.*italian|native.*italian|italian.*speaker|italian.*speaking)\b/i, lang: 'Italian' },
    { pattern: /\b(dutch|nederlands|fluent.*dutch|native.*dutch|dutch.*speaker|dutch.*speaking)\b/i, lang: 'Dutch' },
    { pattern: /\b(portuguese|português|portugues|fluent.*portuguese|native.*portuguese|portuguese.*speaker)\b/i, lang: 'Portuguese' },
    { pattern: /\b(polish|polski|fluent.*polish|native.*polish|polish.*speaker|polish.*speaking)\b/i, lang: 'Polish' },
    { pattern: /\b(swedish|svenska|fluent.*swedish|native.*swedish|swedish.*speaker)\b/i, lang: 'Swedish' },
    { pattern: /\b(danish|dansk|fluent.*danish|native.*danish|danish.*speaker)\b/i, lang: 'Danish' },
    { pattern: /\b(finnish|suomi|fluent.*finnish|native.*finnish|finnish.*speaker)\b/i, lang: 'Finnish' },
    { pattern: /\b(czech|čeština|fluent.*czech|native.*czech|czech.*speaker)\b/i, lang: 'Czech' },
    { pattern: /\b(romanian|română|romana|fluent.*romanian|native.*romanian|romanian.*speaker)\b/i, lang: 'Romanian' },
    { pattern: /\b(hungarian|magyar|fluent.*hungarian|native.*hungarian|hungarian.*speaker)\b/i, lang: 'Hungarian' },
    { pattern: /\b(greek|ελληνικά|fluent.*greek|native.*greek|greek.*speaker)\b/i, lang: 'Greek' },
    { pattern: /\b(bulgarian|български|fluent.*bulgarian|native.*bulgarian|bulgarian.*speaker)\b/i, lang: 'Bulgarian' },
    { pattern: /\b(croatian|hrvatski|fluent.*croatian|native.*croatian|croatian.*speaker)\b/i, lang: 'Croatian' },
    { pattern: /\b(serbian|српски|fluent.*serbian|native.*serbian|serbian.*speaker)\b/i, lang: 'Serbian' },
    { pattern: /\b(russian|русский|fluent.*russian|native.*russian|russian.*speaker|russian.*speaking)\b/i, lang: 'Russian' },
    { pattern: /\b(ukrainian|українська|fluent.*ukrainian|native.*ukrainian|ukrainian.*speaker)\b/i, lang: 'Ukrainian' },
    // Middle Eastern & Central Asian
    { pattern: /\b(arabic|العربية|fluent.*arabic|native.*arabic|arabic.*speaker|arabic.*speaking)\b/i, lang: 'Arabic' },
    { pattern: /\b(turkish|türkçe|turkce|fluent.*turkish|native.*turkish|turkish.*speaker|turkish.*speaking)\b/i, lang: 'Turkish' },
    { pattern: /\b(hebrew|עברית|fluent.*hebrew|native.*hebrew|hebrew.*speaker)\b/i, lang: 'Hebrew' },
    { pattern: /\b(persian|farsi|فارسی|fluent.*persian|fluent.*farsi|native.*persian|native.*farsi|persian.*speaker|farsi.*speaker)\b/i, lang: 'Persian' },
    { pattern: /\b(urdu|اردو|fluent.*urdu|native.*urdu|urdu.*speaker)\b/i, lang: 'Urdu' },
    // Asian languages
    { pattern: /\b(japanese|日本語|nihongo|fluent.*japanese|native.*japanese|japanese.*speaker|japanese.*speaking|japanese.*language|japanese.*proficiency)\b/i, lang: 'Japanese' },
    { pattern: /\b(chinese|中文|mandarin|fluent.*chinese|fluent.*mandarin|native.*chinese|native.*mandarin|chinese.*speaker|mandarin.*speaker|chinese.*speaking|mandarin.*speaking|chinese.*language|mandarin.*language|chinese.*proficiency|mandarin.*proficiency)\b/i, lang: 'Chinese' },
    { pattern: /\b(cantonese|fluent.*cantonese|native.*cantonese|cantonese.*speaker|cantonese.*speaking)\b/i, lang: 'Cantonese' },
    { pattern: /\b(korean|한국어|fluent.*korean|native.*korean|korean.*speaker|korean.*speaking|korean.*language|korean.*proficiency)\b/i, lang: 'Korean' },
    { pattern: /\b(hindi|हिन्दी|fluent.*hindi|native.*hindi|hindi.*speaker|hindi.*speaking|hindi.*language|hindi.*proficiency)\b/i, lang: 'Hindi' },
    { pattern: /\b(thai|ไทย|fluent.*thai|native.*thai|thai.*speaker|thai.*speaking|thai.*language|thai.*proficiency)\b/i, lang: 'Thai' },
    { pattern: /\b(vietnamese|tiếng việt|fluent.*vietnamese|native.*vietnamese|vietnamese.*speaker|vietnamese.*speaking)\b/i, lang: 'Vietnamese' },
    { pattern: /\b(indonesian|bahasa indonesia|fluent.*indonesian|native.*indonesian|indonesian.*speaker)\b/i, lang: 'Indonesian' },
    { pattern: /\b(tagalog|filipino|fluent.*tagalog|fluent.*filipino|native.*tagalog|native.*filipino|tagalog.*speaker|filipino.*speaker)\b/i, lang: 'Tagalog' },
    { pattern: /\b(malay|bahasa melayu|fluent.*malay|native.*malay|malay.*speaker)\b/i, lang: 'Malay' },
    { pattern: /\b(bengali|বাংলা|fluent.*bengali|native.*bengali|bengali.*speaker)\b/i, lang: 'Bengali' },
    { pattern: /\b(tamil|தமிழ்|fluent.*tamil|native.*tamil|tamil.*speaker)\b/i, lang: 'Tamil' },
    { pattern: /\b(telugu|తెలుగు|fluent.*telugu|native.*telugu|telugu.*speaker)\b/i, lang: 'Telugu' },
  ];
  
  for (const { pattern, lang } of languagePatterns) {
    if (pattern.test(desc) && !languages.includes(lang)) {
      languages.push(lang);
    }
  }
  
  // Remove duplicates and return
  return [...new Set(languages)];
}

/**
 * Detect visa/sponsorship requirements from description
 */
function detectVisaRequirements(description) {
  if (!description) return null;
  const desc = description.toLowerCase();
  
  // Check for sponsorship requirements
  if (/sponsorship|sponsor|work permit|visa sponsorship|right to work|eu citizen|eea citizen|uk citizen/i.test(desc)) {
    if (/sponsorship|sponsor|work permit|visa sponsorship|require sponsorship|non-eu|non-uk/i.test(desc)) {
      return 'Non-EU (require sponsorship)';
    }
    if (/eu citizen|eea citizen|uk citizen|right to work|open to all/i.test(desc)) {
      return 'EU citizen'; // Flexible
    }
  }
  
  return null;
}

/**
 * Detect work environment from location and description
 * Returns: 'remote', 'hybrid', or 'on-site'
 */
function detectWorkEnvironment(job) {
  const location = (job.location || '').toLowerCase();
  const description = (job.description || '').toLowerCase();
  const text = `${location} ${description}`;
  
  // Remote indicators (strongest signal)
  if (/remote|work\s+from\s+home|wfh|anywhere|fully\s+remote|100%\s+remote/i.test(text)) {
    return 'remote';
  }
  
  // Hybrid indicators
  if (/hybrid|flexible|partially\s+remote|2-3\s+days|3\s+days\s+remote|mix\s+of\s+remote/i.test(text)) {
    return 'hybrid';
  }
  
  // Default to on-site
  return 'on-site';
}

/**
 * Classify job type as internship, graduate, or entry-level
 * Returns: { isInternship: boolean, isGraduate: boolean }
 */
function classifyJobType(job) {
  const title = (job.title || '').toLowerCase();
  const description = (job.description || '').toLowerCase();
  const text = `${title} ${description}`;
  
  // Internship indicators (multilingual)
  const internshipTerms = [
    'intern', 'internship', 'stage', 'praktikum', 'prácticas', 'tirocinio',
    'stagiaire', 'stagiar', 'becario', 'werkstudent', 'placement',
    'summer intern', 'winter intern', 'co-op', 'coop'
  ];
  
  // Graduate program indicators
  const graduateTerms = [
    'graduate', 'grad scheme', 'grad program', 'graduate programme',
    'graduate program', 'graduate scheme', 'graduate trainee',
    'management trainee', 'trainee program', 'trainee programme',
    'rotational program', 'rotational programme', 'campus hire',
    'new grad', 'recent graduate'
  ];
  
  // Check for internship first (more specific)
  const isInternship = internshipTerms.some(term => 
    title.includes(term) || description.includes(term)
  );
  
  // Check for graduate program
  const isGraduate = !isInternship && graduateTerms.some(term => 
    title.includes(term) || description.includes(term)
  );
  
  return { isInternship, isGraduate };
}

/**
 * Normalize date to ISO format
 * Handles various date formats (DD/MM/YYYY, ISO strings, timestamps)
 */
function normalizeDate(dateValue) {
  const nowIso = new Date().toISOString();
  if (!dateValue) return nowIso;
  
  // Handle DD/MM/YYYY format
  if (typeof dateValue === 'string' && /\d{2}\/\d{2}\/\d{4}/.test(dateValue)) {
    const [dd, mm, yyyy] = dateValue.split('/');
    try {
      return new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`).toISOString();
    } catch {
      return nowIso;
    }
  }
  
  // Handle Unix timestamps (seconds)
  if (typeof dateValue === 'number' || /^\d+$/.test(String(dateValue))) {
    const timestamp = typeof dateValue === 'number' ? dateValue : parseInt(dateValue, 10);
    // If timestamp is less than 1e12, it's in seconds, convert to milliseconds
    const ms = timestamp < 1e12 ? timestamp * 1000 : timestamp;
    try {
      const date = new Date(ms);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch {
      return nowIso;
    }
  }
  
  // Try to parse as ISO string or other date format
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return nowIso;
    return date.toISOString();
  } catch {
    return nowIso;
  }
}

/**
 * Extract years of experience requirement from job description
 * Returns { min_yoe: number | null, max_yoe: number | null }
 * Returns null if no numeric experience requirement found (fallback to LLM)
 */
function extractYearsOfExperience(description) {
  if (!description || typeof description !== 'string') {
    return { min_yoe: null, max_yoe: null };
  }
  
  const desc = description;
  let minYoE = null;
  let maxYoE = null;
  
  // Pattern 1: "5+ years" or "minimum 5 years experience" or "at least 5 years"
  const singleYearPattern = /(?:minimum|at\s+least|min\.?)\s*(\d+)\+?\s*(?:years?|yrs?|années?|años?)\s*(?:of\s+)?(?:experience|exp)/i;
  const singleMatch = desc.match(singleYearPattern);
  if (singleMatch) {
    minYoE = parseInt(singleMatch[1], 10);
    // No max if pattern includes "+"
    if (singleMatch[0].includes('+')) {
      // minYoE is set, maxYoE stays null
    } else {
      maxYoE = minYoE; // Exact requirement
    }
  }
  
  // Pattern 2: "3-5 years" or "3 to 5 years"
  const rangePattern = /(\d+)\s*[-–—]\s*(\d+)\s*(?:years?|yrs?|années?|años?)\s*(?:of\s+)?(?:experience|exp)/i;
  const rangeMatch = desc.match(rangePattern);
  if (rangeMatch) {
    minYoE = parseInt(rangeMatch[1], 10);
    maxYoE = parseInt(rangeMatch[2], 10);
  }
  
  // Pattern 3: "X years of experience" (simple case) - only if no other pattern matched
  if (!minYoE) {
    const simplePattern = /(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience|exp)/i;
    const simpleMatch = desc.match(simplePattern);
    if (simpleMatch) {
      minYoE = parseInt(simpleMatch[1], 10);
      // Check if it's a "+" pattern
      if (!simpleMatch[0].includes('+')) {
        maxYoE = minYoE; // Exact requirement
      }
    }
  }
  
  // Return null if nothing found (allows LLM fallback)
  return {
    min_yoe: minYoE,
    max_yoe: maxYoE
  };
}

/**
 * Master processor function - standardizes all incoming jobs
 * This is the "Equalizer" that ensures uniform metadata across all sources
 * 
 * @param {Object} job - Raw job object from scraper
 * @param {Object} options - Processing options
 * @param {string} options.source - Job source (e.g., 'reed', 'adzuna')
 * @param {string} options.defaultCity - Default city if not in location
 * @param {string} options.defaultCountry - Default country if not in location
 * @returns {Object} - Standardized job object ready for database
 */
function processIncomingJob(job, options = {}) {
  const {
    source = 'unknown',
    defaultCity = null,
    defaultCountry = null,
  } = options;
  
  const nowIso = new Date().toISOString();
  
  // Extract and normalize basic fields
  const title = (job.title || '').trim();
  const rawCompany = (job.company || job.company_name || '').trim();
  const company = cleanCompany(rawCompany);
  const rawLocation = (job.location || '').trim();
  const description = (job.description || '').trim();
  const jobUrl = (job.job_url || job.url || '').trim();
  
  // Normalize location data
  const locationData = normalizeJobLocation({
    city: job.city || defaultCity,
    country: job.country || defaultCountry,
    location: rawLocation,
  });
  
  // Run all detectors
  const languages = extractLanguageRequirements(description);
  const visaStatus = detectVisaRequirements(description);
  const workEnv = detectWorkEnvironment({ location: rawLocation, description });
  const { isInternship, isGraduate } = classifyJobType({ title, description });
  
  // Use classifyEarlyCareer for is_early_career flag
  const isEarlyCareer = classifyEarlyCareer({ title, description });
  
  // Extract years of experience (numeric)
  const yoERequirement = extractYearsOfExperience(description);
  
  // Normalize dates
  const postedAt = normalizeDate(job.posted_at || job.date || job.created_at);
  const originalPostedDate = normalizeDate(job.original_posted_date || job.posted_at || job.date || job.created_at);
  
  // Build categories array
  const categories = ['early-career'];
  if (isInternship) {
    categories.push('internship');
  }
  if (isGraduate) {
    categories.push('graduate');
  }
  
  // Determine experience_required
  let experienceRequired = 'entry-level';
  if (isInternship) {
    experienceRequired = 'internship';
  } else if (isGraduate) {
    experienceRequired = 'graduate';
  }
  
  // Return standardized job object
  return {
    title,
    company,
    location: locationData.location,
    city: locationData.city,
    country: locationData.country,
    description,
    job_url: jobUrl,
    source,
    posted_at: postedAt,
    original_posted_date: originalPostedDate,
    last_seen_at: nowIso,
    categories,
    work_environment: workEnv,
    experience_required: experienceRequired,
    is_internship: isInternship,
    is_graduate: isGraduate,
    is_early_career: !isInternship && !isGraduate && isEarlyCareer,
    language_requirements: languages.length > 0 ? languages : null,
    min_yoe: yoERequirement.min_yoe, // Add numeric YoE fields
    max_yoe: yoERequirement.max_yoe,
    scrape_timestamp: nowIso, // When this job was scraped/processed
    // Note: visa_status is stored in users table, not jobs table
    // visaStatus is detected but not stored in job record
    is_active: true,
    created_at: nowIso,
  };
}

module.exports = {
  processIncomingJob,
  cleanCompany,
  extractLanguageRequirements,
  detectVisaRequirements,
  detectWorkEnvironment,
  classifyJobType,
  normalizeDate,
  extractYearsOfExperience,
};

