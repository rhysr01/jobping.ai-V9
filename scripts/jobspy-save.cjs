#!/usr/bin/env node

/**
 * Save early-career jobs from JobSpy to Supabase (EU cities)
 * - Runs JobSpy per city/term
 * - Parses CSV output
 * - Filters out remote
 * - Upserts into 'jobs' table using job_hash
 */

require('dotenv').config({ path: '.env.local' });
const { spawnSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
const { processIncomingJob } = require('../scrapers/shared/processor.cjs');

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/ANON_KEY');
  
  // Use global fetch with timeout wrapper if available
  const fetchWithTimeout = typeof fetch !== 'undefined' ? async (fetchUrl, fetchOptions = {}) => {
    const timeout = 60000; // 60 seconds (increased for GitHub Actions)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(fetchUrl, {
        ...fetchOptions,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      // Wrap network errors to ensure they're retryable
      if (error instanceof TypeError && error.message?.includes('fetch failed')) {
        const networkError = new Error(`Network error: ${error.message}`);
        networkError.name = 'NetworkError';
        networkError.cause = error;
        throw networkError;
      }
      throw error;
    }
  } : undefined;
  
  return createClient(url, key, { 
    auth: { persistSession: false },
    db: { schema: 'public' },
    ...(fetchWithTimeout ? { global: { fetch: fetchWithTimeout } } : {})
  });
}

// Retry helper with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      // Enhanced network error detection
      const errorMessage = error?.message || String(error || '');
      const errorName = error?.name || '';
      const isNetworkError = 
        errorName === 'NetworkError' ||
        errorName === 'AbortError' ||
        errorName === 'TypeError' ||
        errorMessage.toLowerCase().includes('fetch failed') ||
        errorMessage.toLowerCase().includes('network') ||
        errorMessage.toLowerCase().includes('timeout') ||
        errorMessage.toLowerCase().includes('econnrefused') ||
        errorMessage.toLowerCase().includes('enotfound') ||
        errorMessage.toLowerCase().includes('econnreset') ||
        errorMessage.toLowerCase().includes('etimedout') ||
        (error instanceof TypeError && errorMessage.toLowerCase().includes('fetch'));
      
      if (!isNetworkError || attempt === maxRetries - 1) {
        throw error; // Don't retry non-network errors or on last attempt
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(`⚠️  Network error (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`, errorMessage);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

function hashJob(title, company, location) {
  const normalized = `${title||''}-${company||''}-${location||''}`.toLowerCase().replace(/\s+/g,'-');
  let hash = 0; for (let i=0;i<normalized.length;i++){ hash=((hash<<5)-hash)+normalized.charCodeAt(i); hash|=0; }
  return Math.abs(hash).toString(36);
}

// Parse location to extract city and country
function parseLocation(location) {
  if (!location) return { city: '', country: '' };
  const loc = location.toLowerCase().trim();
  
  // Check for remote indicators
  const isRemote = /remote|work\s+from\s+home|wfh|anywhere/i.test(loc);
  if (isRemote) return { city: '', country: '', isRemote: true };
  
  // Known EU cities from signup form (only these are valid)
  const euCities = new Set([
    'dublin', 'london', 'paris', 'amsterdam', 'manchester', 'birmingham',
    'madrid', 'barcelona', 'berlin', 'hamburg', 'munich', 'zurich',
    'milan', 'rome', 'brussels', 'stockholm', 'copenhagen', 'vienna',
    'prague', 'warsaw'
  ]);
  
  // Extract city and country using comma separation
  const parts = loc.split(',').map(p => p.trim()).filter(Boolean);
  let city = parts.length > 0 ? parts[0] : loc;
  let country = parts.length > 1 ? parts[parts.length - 1] : '';
  
  // Clean up city name - remove common suffixes like "ENG", "GB", "DE", etc.
  city = city.replace(/\s+(eng|gb|de|fr|es|it|nl|be|ch|ie|se|dk|at|cz|pl)$/i, '');
  
  // If single part and it's a known city, leave country empty
  if (parts.length === 1 && euCities.has(city)) {
    country = '';
  }
  
  // If we have a country code, normalize it
  if (country) {
    const countryMap = {
      'eng': 'GB', 'england': 'GB', 'united kingdom': 'GB', 'uk': 'GB', 'great britain': 'GB',
      'de': 'DE', 'germany': 'DE', 'deutschland': 'DE',
      'fr': 'FR', 'france': 'FR',
      'es': 'ES', 'spain': 'ES', 'españa': 'ES',
      'it': 'IT', 'italy': 'IT', 'italia': 'IT',
      'nl': 'NL', 'netherlands': 'NL', 'holland': 'NL',
      'be': 'BE', 'belgium': 'BE', 'belgië': 'BE', 'belgique': 'BE',
      'ch': 'CH', 'switzerland': 'CH', 'schweiz': 'CH', 'suisse': 'CH',
      'ie': 'IE', 'ireland': 'IE', 'éire': 'IE',
      'se': 'SE', 'sweden': 'SE', 'sverige': 'SE',
      'dk': 'DK', 'denmark': 'DK', 'danmark': 'DK',
      'at': 'AT', 'austria': 'AT', 'österreich': 'AT',
      'cz': 'CZ', 'czech republic': 'CZ', 'czechia': 'CZ',
      'pl': 'PL', 'poland': 'PL', 'polska': 'PL'
    };
    const normalizedCountry = country.toLowerCase();
    country = countryMap[normalizedCountry] || country.toUpperCase();
  }
  
  // Capitalize first letter of each word for city
  const capitalizedCity = city.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
  
  return { 
    city: capitalizedCity || city, 
    country: country || ''
  };
}

// Classify job as internship, graduate, or neither
function classifyJobType(job) {
  const title = (job.title || '').toLowerCase();
  const description = (job.description || job.company_description || job.skills || '').toLowerCase();
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

// Detect work environment from location and description
function detectWorkEnvironment(job) {
  const location = (job.location || '').toLowerCase();
  const description = (job.description || job.company_description || job.skills || '').toLowerCase();
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

// Extract industries from description
function extractIndustries(description) {
  if (!description) return [];
  const desc = description.toLowerCase();
  const industries = [];
  
  const industryMap = {
    'technology': 'Technology',
    'tech': 'Technology',
    'software': 'Technology',
    'fintech': 'Technology',
    'finance': 'Finance',
    'financial': 'Finance',
    'banking': 'Finance',
    'investment': 'Finance',
    'consulting': 'Consulting',
    'consultant': 'Consulting',
    'healthcare': 'Healthcare',
    'health': 'Healthcare',
    'medical': 'Healthcare',
    'retail': 'Retail',
    'manufacturing': 'Manufacturing',
    'energy': 'Energy',
    'media': 'Media',
    'education': 'Education',
    'government': 'Government',
    'non-profit': 'Non-profit',
    'real estate': 'Real Estate',
    'transportation': 'Transportation',
    'automotive': 'Automotive',
    'fashion': 'Fashion',
    'food': 'Food & Beverage',
    'beverage': 'Food & Beverage',
    'travel': 'Travel'
  };
  
  for (const [keyword, industry] of Object.entries(industryMap)) {
    if (desc.includes(keyword) && !industries.includes(industry)) {
      industries.push(industry);
    }
  }
  
  return industries;
}

// Extract company size from description
function extractCompanySize(description, company) {
  if (!description) return null;
  const desc = description.toLowerCase();
  const companyLower = (company || '').toLowerCase();
  
  // Check for explicit size mentions
  if (/startup|start-up|early.?stage|seed.?stage|1-50|1 to 50/i.test(desc)) {
    return 'startup';
  }
  
  if (/scale.?up|scaleup|50-500|50 to 500|51-500/i.test(desc)) {
    return 'scaleup';
  }
  
  if (/enterprise|500\+|500\+|large.?company|multinational|fortune/i.test(desc)) {
    return 'enterprise';
  }
  
  // Check company name for known large companies
  const largeCompanies = ['google', 'microsoft', 'amazon', 'meta', 'facebook', 'apple', 'netflix', 'tesla', 'oracle', 'ibm', 'sap', 'salesforce'];
  if (largeCompanies.some(large => companyLower.includes(large))) {
    return 'enterprise';
  }
  
  return null; // Unknown
}

// Extract skills from description
function extractSkills(description) {
  if (!description) return [];
  const desc = description.toLowerCase();
  const skills = [];
  
  const skillMap = {
    'excel': 'Excel',
    'powerpoint': 'PowerPoint',
    'word': 'Word',
    'python': 'Python',
    'r ': 'R',
    'sql': 'SQL',
    'powerbi': 'PowerBI',
    'tableau': 'Tableau',
    'google analytics': 'Google Analytics',
    'salesforce': 'Salesforce',
    'hubspot': 'HubSpot',
    'jira': 'Jira',
    'confluence': 'Confluence',
    'slack': 'Slack',
    'microsoft office': 'Microsoft Office',
    'google workspace': 'Google Workspace',
    'adobe creative suite': 'Adobe Creative Suite',
    'canva': 'Canva',
    'data analysis': 'Data Analysis',
    'project management': 'Project Management',
    'digital marketing': 'Digital Marketing',
    'social media': 'Social Media',
    'email marketing': 'Email Marketing',
    'content creation': 'Content Creation',
    'research': 'Research',
    'presentation skills': 'Presentation Skills',
    'communication': 'Communication',
    'leadership': 'Leadership',
    'problem solving': 'Problem Solving',
    'analytical thinking': 'Analytical Thinking'
  };
  
  for (const [keyword, skill] of Object.entries(skillMap)) {
    if (desc.includes(keyword) && !skills.includes(skill)) {
      skills.push(skill);
    }
  }
  
  return skills;
}

// Extract language requirements (comprehensive - includes all visa-seeking languages)
function extractLanguageRequirements(description) {
  if (!description) return [];
  const desc = description.toLowerCase();
  const languages = [];
  
  // Comprehensive language map - includes all visa-seeking languages
  const languageMap = {
    // EU languages
    'english': 'English', 'anglais': 'English', 'fluent in english': 'English', 'native english': 'English',
    'english speaker': 'English', 'english speaking': 'English', 'english language': 'English', 'english proficiency': 'English',
    'french': 'French', 'français': 'French', 'francais': 'French', 'fluent in french': 'French', 'native french': 'French',
    'french speaker': 'French', 'french speaking': 'French',
    'german': 'German', 'deutsch': 'German', 'fluent in german': 'German', 'native german': 'German',
    'german speaker': 'German', 'german speaking': 'German',
    'spanish': 'Spanish', 'español': 'Spanish', 'espanol': 'Spanish', 'castellano': 'Spanish',
    'fluent in spanish': 'Spanish', 'native spanish': 'Spanish', 'spanish speaker': 'Spanish', 'spanish speaking': 'Spanish',
    'italian': 'Italian', 'italiano': 'Italian', 'fluent in italian': 'Italian', 'native italian': 'Italian',
    'italian speaker': 'Italian', 'italian speaking': 'Italian',
    'dutch': 'Dutch', 'nederlands': 'Dutch', 'fluent in dutch': 'Dutch', 'native dutch': 'Dutch',
    'dutch speaker': 'Dutch', 'dutch speaking': 'Dutch',
    'portuguese': 'Portuguese', 'português': 'Portuguese', 'portugues': 'Portuguese',
    'fluent in portuguese': 'Portuguese', 'native portuguese': 'Portuguese', 'portuguese speaker': 'Portuguese',
    'polish': 'Polish', 'polski': 'Polish', 'fluent in polish': 'Polish', 'native polish': 'Polish',
    'polish speaker': 'Polish', 'polish speaking': 'Polish',
    'swedish': 'Swedish', 'svenska': 'Swedish', 'fluent in swedish': 'Swedish', 'native swedish': 'Swedish',
    'swedish speaker': 'Swedish',
    'danish': 'Danish', 'dansk': 'Danish', 'fluent in danish': 'Danish', 'native danish': 'Danish',
    'danish speaker': 'Danish',
    'finnish': 'Finnish', 'suomi': 'Finnish', 'fluent in finnish': 'Finnish', 'native finnish': 'Finnish',
    'finnish speaker': 'Finnish',
    'czech': 'Czech', 'čeština': 'Czech', 'fluent in czech': 'Czech', 'native czech': 'Czech',
    'czech speaker': 'Czech',
    'romanian': 'Romanian', 'română': 'Romanian', 'romana': 'Romanian',
    'fluent in romanian': 'Romanian', 'native romanian': 'Romanian', 'romanian speaker': 'Romanian',
    'hungarian': 'Hungarian', 'magyar': 'Hungarian', 'fluent in hungarian': 'Hungarian', 'native hungarian': 'Hungarian',
    'hungarian speaker': 'Hungarian',
    'greek': 'Greek', 'ελληνικά': 'Greek', 'fluent in greek': 'Greek', 'native greek': 'Greek',
    'greek speaker': 'Greek',
    'bulgarian': 'Bulgarian', 'български': 'Bulgarian', 'fluent in bulgarian': 'Bulgarian', 'native bulgarian': 'Bulgarian',
    'bulgarian speaker': 'Bulgarian',
    'croatian': 'Croatian', 'hrvatski': 'Croatian', 'fluent in croatian': 'Croatian', 'native croatian': 'Croatian',
    'croatian speaker': 'Croatian',
    'serbian': 'Serbian', 'српски': 'Serbian', 'fluent in serbian': 'Serbian', 'native serbian': 'Serbian',
    'serbian speaker': 'Serbian',
    'russian': 'Russian', 'русский': 'Russian', 'fluent in russian': 'Russian', 'native russian': 'Russian',
    'russian speaker': 'Russian', 'russian speaking': 'Russian',
    'ukrainian': 'Ukrainian', 'українська': 'Ukrainian', 'fluent in ukrainian': 'Ukrainian', 'native ukrainian': 'Ukrainian',
    'ukrainian speaker': 'Ukrainian',
    // Middle Eastern & Central Asian
    'arabic': 'Arabic', 'العربية': 'Arabic', 'fluent in arabic': 'Arabic', 'native arabic': 'Arabic',
    'arabic speaker': 'Arabic', 'arabic speaking': 'Arabic',
    'turkish': 'Turkish', 'türkçe': 'Turkish', 'turkce': 'Turkish', 'fluent in turkish': 'Turkish', 'native turkish': 'Turkish',
    'turkish speaker': 'Turkish', 'turkish speaking': 'Turkish',
    'hebrew': 'Hebrew', 'עברית': 'Hebrew', 'fluent in hebrew': 'Hebrew', 'native hebrew': 'Hebrew',
    'hebrew speaker': 'Hebrew',
    'persian': 'Persian', 'farsi': 'Persian', 'فارسی': 'Persian', 'fluent in persian': 'Persian',
    'fluent in farsi': 'Persian', 'native persian': 'Persian', 'native farsi': 'Persian',
    'persian speaker': 'Persian', 'farsi speaker': 'Persian',
    'urdu': 'Urdu', 'اردو': 'Urdu', 'fluent in urdu': 'Urdu', 'native urdu': 'Urdu',
    'urdu speaker': 'Urdu',
    // Asian languages
    'japanese': 'Japanese', '日本語': 'Japanese', 'nihongo': 'Japanese', 'fluent in japanese': 'Japanese',
    'native japanese': 'Japanese', 'japanese speaker': 'Japanese', 'japanese speaking': 'Japanese',
    'japanese language': 'Japanese', 'japanese proficiency': 'Japanese',
    'chinese': 'Chinese', '中文': 'Chinese', 'mandarin': 'Chinese', 'fluent in chinese': 'Chinese',
    'fluent in mandarin': 'Chinese', 'native chinese': 'Chinese', 'native mandarin': 'Chinese',
    'chinese speaker': 'Chinese', 'mandarin speaker': 'Chinese', 'chinese speaking': 'Chinese',
    'mandarin speaking': 'Chinese', 'chinese language': 'Chinese', 'mandarin language': 'Chinese',
    'chinese proficiency': 'Chinese', 'mandarin proficiency': 'Chinese',
    'cantonese': 'Cantonese', 'fluent in cantonese': 'Cantonese', 'native cantonese': 'Cantonese',
    'cantonese speaker': 'Cantonese', 'cantonese speaking': 'Cantonese',
    'korean': 'Korean', '한국어': 'Korean', 'fluent in korean': 'Korean', 'native korean': 'Korean',
    'korean speaker': 'Korean', 'korean speaking': 'Korean', 'korean language': 'Korean', 'korean proficiency': 'Korean',
    'hindi': 'Hindi', 'हिन्दी': 'Hindi', 'fluent in hindi': 'Hindi', 'native hindi': 'Hindi',
    'hindi speaker': 'Hindi', 'hindi speaking': 'Hindi', 'hindi language': 'Hindi', 'hindi proficiency': 'Hindi',
    'thai': 'Thai', 'ไทย': 'Thai', 'fluent in thai': 'Thai', 'native thai': 'Thai',
    'thai speaker': 'Thai', 'thai speaking': 'Thai', 'thai language': 'Thai', 'thai proficiency': 'Thai',
    'vietnamese': 'Vietnamese', 'tiếng việt': 'Vietnamese', 'fluent in vietnamese': 'Vietnamese',
    'native vietnamese': 'Vietnamese', 'vietnamese speaker': 'Vietnamese', 'vietnamese speaking': 'Vietnamese',
    'indonesian': 'Indonesian', 'bahasa indonesia': 'Indonesian', 'fluent in indonesian': 'Indonesian',
    'native indonesian': 'Indonesian', 'indonesian speaker': 'Indonesian',
    'tagalog': 'Tagalog', 'filipino': 'Tagalog', 'fluent in tagalog': 'Tagalog', 'fluent in filipino': 'Tagalog',
    'native tagalog': 'Tagalog', 'native filipino': 'Tagalog', 'tagalog speaker': 'Tagalog', 'filipino speaker': 'Tagalog',
    'malay': 'Malay', 'bahasa melayu': 'Malay', 'fluent in malay': 'Malay', 'native malay': 'Malay',
    'malay speaker': 'Malay',
    'bengali': 'Bengali', 'বাংলা': 'Bengali', 'fluent in bengali': 'Bengali', 'native bengali': 'Bengali',
    'bengali speaker': 'Bengali',
    'tamil': 'Tamil', 'தமிழ்': 'Tamil', 'fluent in tamil': 'Tamil', 'native tamil': 'Tamil',
    'tamil speaker': 'Tamil',
    'telugu': 'Telugu', 'తెలుగు': 'Telugu', 'fluent in telugu': 'Telugu', 'native telugu': 'Telugu',
    'telugu speaker': 'Telugu',
  };
  
  // Check for language requirements with common phrases
  const phrases = ['must speak', 'requires', 'speaker', 'speaking', 'fluent', 'native', 'proficiency', 'language requirement'];
  
  for (const [keyword, lang] of Object.entries(languageMap)) {
    // Check if keyword appears in description
    if (desc.includes(keyword) && !languages.includes(lang)) {
      languages.push(lang);
    }
  }
  
  // Remove duplicates and return
  return [...new Set(languages)];
}

// Detect visa/sponsorship requirements
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

// Extract salary range - ENHANCED with more patterns
function extractSalaryRange(description) {
  if (!description) return null;
  
  // Match various salary formats - expanded patterns
  const patterns = [
    // Range formats: €30k-€50k, £30,000-£50,000
    /(?:€|EUR|euro)\s*(\d{1,3}(?:[.,]\d{3})*(?:k|K)?)\s*-?\s*(?:€|EUR|euro)?\s*(\d{1,3}(?:[.,]\d{3})*(?:k|K)?)/i,
    /(?:£|GBP|pound)\s*(\d{1,3}(?:[.,]\d{3})*(?:k|K)?)\s*-?\s*(?:£|GBP|pound)?\s*(\d{1,3}(?:[.,]\d{3})*(?:k|K)?)/i,
    // Number first: 30k-50k €, 30,000-50,000 GBP
    /(\d{1,3}(?:[.,]\d{3})*(?:k|K)?)\s*-?\s*(\d{1,3}(?:[.,]\d{3})*(?:k|K)?)\s*(?:€|EUR|£|GBP|euro|pound)/i,
    // Single salary: €50k, £45,000
    /(?:€|EUR|euro)\s*(\d{1,3}(?:[.,]\d{3})*(?:k|K)?)\s*(?:per\s*(?:year|annum|annually))?/i,
    /(?:£|GBP|pound)\s*(\d{1,3}(?:[.,]\d{3})*(?:k|K)?)\s*(?:per\s*(?:year|annum|annually))?/i,
    // Salary: prefix
    /salary[:\s]+(?:€|£|EUR|GBP|euro|pound)?\s*(\d{1,3}(?:[.,]\d{3})*(?:k|K)?)\s*-?\s*(\d{1,3}(?:[.,]\d{3})*(?:k|K)?)/i,
    /salary[:\s]+(?:€|£|EUR|GBP|euro|pound)?\s*(\d{1,3}(?:[.,]\d{3})*(?:k|K)?)/i,
    // Compensation, remuneration
    /(?:compensation|remuneration|package)[:\s]+(?:€|£|EUR|GBP)?\s*(\d{1,3}(?:[.,]\d{3})*(?:k|K)?)\s*-?\s*(\d{1,3}(?:[.,]\d{3})*(?:k|K)?)/i,
    // Up to format: up to €50k
    /up\s+to\s+(?:€|£|EUR|GBP)\s*(\d{1,3}(?:[.,]\d{3})*(?:k|K)?)/i
  ];
  
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      // Clean up the match
      let salary = match[0].trim();
      // Normalize spacing
      salary = salary.replace(/\s+/g, ' ');
      return salary;
    }
  }
  
  return null;
}

function parseCsv(csv) {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h=>h.trim());
  return lines.slice(1).map(line => {
    // Better CSV parsing that handles quoted fields with commas
    const cols = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cols.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cols.push(current.trim());
    const obj = {}; headers.forEach((h,i)=> obj[h]=(cols[i]||'').replace(/^"|"$/g,''));
    return obj;
  });
}

async function saveJobs(jobs, source) {
  const supabase = getSupabase();
  const nowIso = new Date().toISOString();
  const nonRemote = jobs.filter(j => !((j.location||'').toLowerCase().includes('remote')));
  const rows = nonRemote.map(j => {
    // ENHANCED: Prioritize description field, enrich with company_description + skills if needed
    let description = (
      (j.description && j.description.trim().length > 50 ? j.description : '') ||
      (j.company_description || '') ||
      (j.skills || '')
    ).trim();
    
    // If description is too short, try to enrich it
    if (description.length < 100 && (j.company_description || j.skills)) {
      const parts = [];
      if (description) parts.push(description);
      if (j.company_description && !description.includes(j.company_description)) {
        parts.push(j.company_description);
      }
      if (j.skills && !description.includes(j.skills)) {
        parts.push(j.skills);
      }
      description = parts.join(' ').trim();
    }
    
    // Ensure minimum description length for quality
    if (description.length < 20) {
      description = `${j.title || ''} at ${j.company || ''}. ${description}`.trim();
    }
    
    // Process through standardization pipe
    const processed = processIncomingJob({
      title: j.title,
      company: j.company,
      location: j.location,
      description: description,
      url: j.job_url || j.url,
      posted_at: j.posted_at,
    }, {
      source,
    });
    
    // ENHANCED: Build categories array using CAREER_PATH_KEYWORDS (JobSpy-specific enhancement)
    const { CAREER_PATH_KEYWORDS } = require('../scrapers/shared/helpers.cjs');
    const categories = [...processed.categories]; // Start with processor categories
    
    // Infer career path categories from title and description
    const fullText = `${(j.title || '').toLowerCase()} ${description.toLowerCase()}`;
    Object.entries(CAREER_PATH_KEYWORDS).forEach(([path, keywords]) => {
      const keywordLower = keywords.map(k => k.toLowerCase());
      if (keywordLower.some(kw => fullText.includes(kw))) {
        // Map to your category naming convention
        const categoryMap = {
          'strategy': 'strategy-business-design',
          'finance': 'finance-accounting',
          'sales': 'sales-business-development',
          'marketing': 'marketing-advertising',
          'product': 'product-management',
          'operations': 'operations-supply-chain',
          'general-management': 'general-management',
          'data': 'data-analytics',
          'people-hr': 'people-hr',
          'legal': 'legal-compliance',
          'sustainability': 'sustainability-esg',
          'creative': 'creative-design'
        };
        const mappedCategory = categoryMap[path] || path;
        if (!categories.includes(mappedCategory)) {
          categories.push(mappedCategory);
        }
      }
    });
    
    // If no specific category found, add 'general'
    if (categories.length === 1) {
      categories.push('general');
    }
    
    // JobSpy-specific extractions (keep these as they're additional metadata)
    const industries = extractIndustries(description);
    const companySize = extractCompanySize(description, processed.company);
    const skills = extractSkills(description);
    const salary = extractSalaryRange(description);
    
    // Generate job_hash
    const job_hash = hashJob(j.title, processed.company, j.location);
    
    return {
      ...processed,
      job_hash,
      categories, // Use enhanced categories
      // JobSpy-specific fields (if your schema supports them)
      ...(salary ? { salary_range: salary } : {}),
    };
  });
  // Validate jobs before saving
  const validatedRows = rows.filter(row => {
    // CRITICAL: Ensure all required fields are present
    if (!row.title || !row.company || !row.location || !row.job_hash) {
      console.warn(`⚠️ Skipping invalid job: missing required fields`, {
        hasTitle: !!row.title,
        hasCompany: !!row.company,
        hasLocation: !!row.location,
        hasHash: !!row.job_hash
      });
      return false;
    }
    
    // Ensure categories array is never null/empty
    if (!row.categories || !Array.isArray(row.categories) || row.categories.length === 0) {
      console.warn(`⚠️ Job missing categories, adding default`, { job_hash: row.job_hash });
      row.categories = ['early-career'];
    }
    
    // Ensure work_environment is never null
    if (!row.work_environment) {
      console.warn(`⚠️ Job missing work_environment, defaulting to on-site`, { job_hash: row.job_hash });
      row.work_environment = 'on-site';
    }
    
    return true;
  });
  
  const unique = Array.from(new Map(validatedRows.map(r=>[r.job_hash,r])).values());
  console.log(`📊 Validated: ${rows.length} → ${validatedRows.length} → ${unique.length} unique jobs`);
  
  let savedCount = 0;
  let failedCount = 0;
  
  // Reduced batch size to avoid overwhelming connection
  const BATCH_SIZE = 50; // Reduced from 150
  for (let i=0;i<unique.length;i+=BATCH_SIZE){
    const slice = unique.slice(i,i+BATCH_SIZE);
    
    try {
      // Increased retries: 5 attempts with longer delays (2s, 4s, 8s, 16s, 32s)
      const result = await retryWithBackoff(async () => {
        try {
          const upsertResult = await supabase
            .from('jobs')
            .upsert(slice, { onConflict: 'job_hash', ignoreDuplicates: false });
          
          if (upsertResult.error) {
            // Enhanced error logging
            console.error(`   Upsert error details:`, {
              message: upsertResult.error.message,
              code: upsertResult.error.code,
              details: upsertResult.error.details,
              hint: upsertResult.error.hint
            });
            // Check if it's a network error that should be retried
            const isNetworkError = upsertResult.error.message?.includes('fetch failed') || 
                                 upsertResult.error.message?.includes('network') ||
                                 upsertResult.error.message?.includes('timeout') ||
                                 upsertResult.error.message?.includes('ECONNREFUSED') ||
                                 upsertResult.error.message?.includes('ENOTFOUND') ||
                                 upsertResult.error.message?.includes('ETIMEDOUT');
            if (isNetworkError) {
              throw upsertResult.error; // Retry network errors
            }
          }
          return upsertResult;
        } catch (error) {
          // CRITICAL FIX: Catch exceptions thrown by fetch (not just error properties)
          // This handles "TypeError: fetch failed" exceptions from undici
          const errorMessage = error?.message || String(error || '');
          const errorName = error?.name || '';
          const errorCode = error?.code || error?.cause?.code || '';
          
          // Check if this is a network error (fetch exception)
          const isNetworkException = 
            errorName === 'TypeError' && errorMessage.includes('fetch failed') ||
            errorName === 'NetworkError' ||
            errorName === 'AbortError' ||
            errorCode === 'UND_ERR_CONNECT_TIMEOUT' ||
            errorCode === 'UND_ERR_SOCKET' ||
            errorCode === 'UND_ERR_REQUEST_TIMEOUT' ||
            errorMessage.toLowerCase().includes('fetch failed') ||
            errorMessage.toLowerCase().includes('network') ||
            errorMessage.toLowerCase().includes('timeout');
          
          if (isNetworkException) {
            // Log the exception for debugging
            console.error(`   Fetch exception caught:`, {
              name: errorName,
              message: errorMessage,
              code: errorCode,
              cause: error.cause ? {
                code: error.cause.code,
                message: error.cause.message
              } : null
            });
            throw error; // Will be retried
          }
          // Re-throw non-network exceptions
          throw error;
        }
      }, 5, 2000); // 5 retries, 2s base delay
      
      if (result.error) {
        console.error(`❌ Upsert error (batch ${Math.floor(i/BATCH_SIZE) + 1}):`, result.error.message);
        console.error(`   Code: ${result.error.code}, Details: ${result.error.details || 'none'}`);
        failedCount += slice.length;
      // Log first few failed rows for debugging
      if (i === 0 && slice.length > 0) {
        console.error('Sample failed row:', JSON.stringify(slice[0], null, 2));
      }
    } else {
        console.log(`✅ Saved ${slice.length} jobs (batch ${Math.floor(i/BATCH_SIZE) + 1})`);
        savedCount += slice.length;
    }
    } catch (error) {
      console.error(`❌ Fatal upsert error after retries (batch ${Math.floor(i/BATCH_SIZE) + 1}):`, error.message);
      console.error(`   Error type: ${error.name}`);
      console.error(`   Full error details:`, {
        message: error.message,
        name: error.name,
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
        hostname: error.hostname,
        cause: error.cause ? {
          message: error.cause.message,
          name: error.cause.name,
          code: error.cause.code
        } : null,
        stack: error.stack?.substring(0, 500)
      });
      failedCount += slice.length;
  }
  }
  
  console.log(`📊 Save summary: ${savedCount} saved, ${failedCount} failed out of ${unique.length} total`);
}

function pickPythonCommand() {
  // First check for PYTHON environment variable (used in CI/CD)
  if (process.env.PYTHON) {
    console.log(`✅ Using Python from PYTHON env: ${process.env.PYTHON}`);
    return process.env.PYTHON;
  }
  
  // Use wrapper script that ensures correct Python 3.11 environment
  const scriptPath = require('path').join(__dirname, 'run-jobspy-python.sh');
  if (require('fs').existsSync(scriptPath)) {
    console.log(`✅ Using Python wrapper: ${scriptPath}`);
    return scriptPath;
  }
  
  // Fallback: try direct Python 3.11 path (macOS Homebrew)
  const directPath = '/opt/homebrew/opt/python@3.11/bin/python3.11';
  if (require('fs').existsSync(directPath)) {
    console.log(`✅ Using Python: ${directPath}`);
    return directPath;
  }
  
  console.warn('⚠️  Python 3.11 not found - jobspy may fail');
  return 'python3';
}

async function main() {
  // Import role definitions from signup form
  const { getAllRoles, getEarlyCareerRoles, getTopRolesByCareerPath } = require('../scrapers/shared/roles.cjs');
  
  // Core and localized multilingual early‑career terms per city (spec)
  const EXTRA_TERMS = (process.env.JOBSPY_EXTRA_TERMS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  
  // Get role-specific queries from signup form (highest priority)
  const { cleanRoleForSearch } = require('../scrapers/shared/roles.cjs');
  const earlyCareerRoles = getEarlyCareerRoles();
  const topRoles = getTopRolesByCareerPath(3); // Top 3 roles per career path
  
  // Clean role names (remove parentheses, handle special chars)
  // This ensures roles like "Sales Development Representative (SDR)" search as both "SDR" and full name
  const cleanRole = (role) => {
    const cleaned = cleanRoleForSearch(role);
    return cleaned[0]; // Use primary cleaned version (without parentheses)
  };
  
  // EXPANDED: Covers all role types - coordinator, assistant, representative, engineer, specialist, manager, designer, HR, legal, sustainability
  // Rotates 3 sets to maximize diversity over time
  // NOW INCLUDES EXACT ROLE NAMES FROM SIGNUP FORM (CLEANED) + expanded role types
  // SIGNIFICANTLY EXPANDED with more specific role variations
  const QUERY_SETS = {
    SET_A: [
      // Focus: Internships, graduate programs, and coordinator roles
      'graduate programme', 'graduate scheme', 'internship', 'intern',
      'graduate trainee', 'management trainee', 'trainee program',
      'campus hire', 'new grad', 'recent graduate', 'entry level program',
      cleanRole('Marketing Coordinator'),         // ✅ Coordinator role
      cleanRole('Operations Coordinator'),       // ✅ Coordinator role
      cleanRole('Product Coordinator'),          // ✅ Coordinator role
      cleanRole('HR Coordinator'),               // ✅ Coordinator role
      cleanRole('Project Coordinator'),          // ✅ Coordinator role
      cleanRole('Sales Coordinator'),            // ✅ Coordinator role
      cleanRole('Finance Coordinator'),          // ✅ NEW: Finance coordinator
      cleanRole('Business Coordinator'),         // ✅ NEW: Business coordinator
      cleanRole('Finance Intern'),               // ✅ Exact role from form (cleaned)
      cleanRole('Consulting Intern'),            // ✅ Exact role from form (cleaned)
      cleanRole('Marketing Intern'),             // ✅ NEW: Marketing intern
      cleanRole('Data Intern'),                  // ✅ NEW: Data intern
      cleanRole('Investment Banking Intern'),    // ✅ NEW: Investment banking intern
      'entry level software engineer',           // ✅ NEW: Entry level engineer
      'junior data scientist',                  // ✅ NEW: Junior data scientist
      'graduate consultant',                    // ✅ NEW: Graduate consultant
      'associate investment banker',            // ✅ NEW: Associate banker
      'recent graduate finance',                // ✅ NEW: Recent grad finance
      'campus recruiter',                       // ✅ NEW: Campus recruiter
      'new grad program'                        // ✅ NEW: New grad program
    ],
    SET_B: [
      // Focus: Analyst, associate, assistant, and representative roles
      cleanRole('Financial Analyst'),            // ✅ Exact role from form (cleaned)
      cleanRole('Business Analyst'),             // ✅ Exact role from form (cleaned)
      cleanRole('Data Analyst'),                  // ✅ Exact role from form (cleaned)
      cleanRole('Operations Analyst'),           // ✅ Exact role from form (cleaned)
      cleanRole('Strategy Analyst'),             // ✅ NEW: Strategy analyst
      cleanRole('Risk Analyst'),                 // ✅ NEW: Risk analyst
      cleanRole('Investment Analyst'),           // ✅ NEW: Investment analyst
      cleanRole('Marketing Assistant'),           // ✅ Assistant role
      cleanRole('Brand Assistant'),              // ✅ Assistant role
      cleanRole('Product Assistant'),             // ✅ Assistant role
      cleanRole('Finance Assistant'),            // ✅ NEW: Finance assistant
      cleanRole('Operations Assistant'),         // ✅ NEW: Operations assistant
      cleanRole('Sales Development Representative (SDR)'), // ✅ Representative role
      cleanRole('HR Assistant'),                 // ✅ Assistant role
      'associate consultant',                    // ✅ NEW: Associate consultant
      'graduate analyst',                        // ✅ NEW: Graduate analyst
      'junior analyst',                          // ✅ NEW: Junior analyst
      'entry level analyst',                     // ✅ NEW: Entry level analyst
      'associate finance',                       // ✅ NEW: Associate finance
      'graduate associate',                      // ✅ NEW: Graduate associate
      'junior consultant',                       // ✅ NEW: Junior consultant
      'associate product manager',               // ✅ NEW: Associate PM
      'apm',                                     // ✅ NEW: APM abbreviation
      'product analyst',                         // ✅ NEW: Product analyst
      'customer success associate',              // ✅ NEW: Customer success
      'account executive',                       // ✅ NEW: Account executive
      'bdr',                                     // ✅ NEW: BDR abbreviation
      'sdr'                                      // ✅ NEW: SDR abbreviation
    ],
    SET_C: [
      // Focus: Entry-level, junior, engineer, specialist, manager, designer, and program roles
      'entry level', 'junior', 'graduate', 'recent graduate',
      'early careers program', 'rotational graduate program',
      'entry level software engineer',           // ✅ NEW: Entry level SWE
      'junior software engineer',                // ✅ NEW: Junior SWE
      'graduate software engineer',              // ✅ NEW: Graduate SWE
      cleanRole('Software Engineer Intern'),      // ✅ Engineer role
      cleanRole('Data Engineer Intern'),         // ✅ Engineer role
      cleanRole('Cloud Engineer Intern'),        // ✅ NEW: Cloud engineer intern
      cleanRole('Frontend Engineer Intern'),     // ✅ NEW: Frontend intern
      cleanRole('Backend Engineer Intern'),      // ✅ NEW: Backend intern
      cleanRole('Associate Product Manager (APM)'), // ✅ Manager role
      cleanRole('Product Analyst'),               // ✅ Exact role from form (cleaned)
      cleanRole('Fulfilment Specialist'),         // ✅ Specialist role
      cleanRole('Technical Specialist'),         // ✅ Specialist role
      cleanRole('HR Specialist'),                // ✅ NEW: HR specialist
      cleanRole('Marketing Specialist'),         // ✅ NEW: Marketing specialist
      cleanRole('Product Designer'),              // ✅ Designer role
      cleanRole('UX Intern'),                    // ✅ Designer role
      cleanRole('UX Designer'),                  // ✅ NEW: UX designer
      cleanRole('Design Intern'),                // ✅ NEW: Design intern
      cleanRole('ESG Intern'),                   // ✅ Sustainability role
      cleanRole('Sustainability Analyst'),        // ✅ Sustainability role
      cleanRole('Climate Analyst'),              // ✅ NEW: Climate analyst
      'associate product manager',                // ✅ NEW: Associate PM
      'apm',                                     // ✅ NEW: APM
      'product analyst',                         // ✅ NEW: Product analyst
      'junior product manager',                  // ✅ NEW: Junior PM
      'entry level product',                     // ✅ NEW: Entry level product
      'junior designer',                         // ✅ NEW: Junior designer
      'graduate designer',                       // ✅ NEW: Graduate designer
      'entry level designer',                    // ✅ NEW: Entry level designer
      'junior engineer',                         // ✅ NEW: Junior engineer
      'graduate engineer',                       // ✅ NEW: Graduate engineer
      'entry level engineer',                    // ✅ NEW: Entry level engineer
      'junior specialist',                       // ✅ NEW: Junior specialist
      'graduate specialist',                     // ✅ NEW: Graduate specialist
      'entry level specialist'                   // ✅ NEW: Entry level specialist
    ]
  };

  // Determine which query set to use based on current time
  const getCurrentQuerySet = () => {
    // Allow manual override via environment variable
    const manualSet = process.env.JOBSPY_QUERY_SET;
    if (manualSet && QUERY_SETS[manualSet]) {
      console.log(`🎯 Manual query set override: ${manualSet}`);
      return manualSet;
    }
    
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    
    // Rotate every 8 hours: SET_A (0-7h), SET_B (8-15h), SET_C (16-23h)
    if (hour >= 0 && hour < 8) return 'SET_A';
    if (hour >= 8 && hour < 16) return 'SET_B';
    return 'SET_C';
  };

  const currentSet = getCurrentQuerySet();
  const CORE_EN = QUERY_SETS[currentSet];
  
  console.log(`🔄 Using query set: ${currentSet} (${CORE_EN.length} terms)`);
  console.log(`📋 Query set includes ${CORE_EN.filter(q => /^[A-Z]/.test(q)).length} exact role names from signup form`);
  // EXPANDED: Local language terms include coordinator, assistant, representative, engineer, specialist roles
  const CITY_LOCAL = {
    'London': [], // English only set is CORE_EN
    'Manchester': [], // English only set is CORE_EN
    'Birmingham': [], // English only set is CORE_EN
    'Madrid': [
      'programa de graduados','becario','prácticas','junior','recién graduado','nivel inicial',
      'coordinador','asistente','representante','especialista','ingeniero','prácticas marketing',
      'prácticas finance','prácticas tech','prácticas hr','prácticas sostenibilidad'
    ],
    'Barcelona': [
      'programa de graduados','becario','prácticas','junior','recién graduado','nivel inicial',
      'coordinador','asistente','representante','especialista','ingeniero','prácticas marketing'
    ],
    'Berlin': [
      'absolvent','trainee','praktikant','junior','berufseinsteiger','nachwuchskraft',
      'koordinator','assistent','vertreter','spezialist','ingenieur','praktikum marketing',
      'praktikum finance','praktikum tech','praktikum hr','praktikum nachhaltigkeit'
    ],
    'Hamburg': [
      'absolvent','trainee','praktikant','junior','berufseinsteiger','nachwuchskraft',
      'koordinator','assistent','vertreter','spezialist','ingenieur'
    ],
    'Munich': [
      'absolvent','trainee','praktikant','junior','berufseinsteiger','nachwuchskraft',
      'koordinator','assistent','vertreter','spezialist','ingenieur'
    ],
    'Amsterdam': [
      'afgestudeerde','traineeship','starter','junior','beginnend','werkstudent',
      'coördinator','assistent','vertegenwoordiger','specialist','ingenieur','stage marketing',
      'stage finance','stage tech','stage hr','stage duurzaamheid'
    ],
    'Brussels': [
      'stagiaire','junior','débutant','afgestudeerde','starter','coordinateur',
      'assistant','représentant','spécialiste','ingénieur','stagiaire marketing'
    ], // Belgium: French + Dutch
    'Paris': [
      'jeune diplômé','stagiaire','alternance','junior','débutant','programme graduate',
      'coordinateur','assistant','représentant','spécialiste','ingénieur','stagiaire marketing',
      'stagiaire finance','stagiaire tech','stagiaire hr','stagiaire esg'
    ],
    'Zurich': [
      'absolvent','trainee','praktikant','junior','jeune diplômé','stagiaire',
      'koordinator','assistent','vertreter','spezialist','ingenieur'
    ],
    'Milan': [
      'neolaureato','stage','tirocinio','junior','primo lavoro','laureato',
      'coordinatore','assistente','rappresentante','specialista','ingegnere','stage marketing',
      'stage finance','stage tech','stage hr','stage sostenibilità'
    ],
    'Rome': [
      'neolaureato','stage','tirocinio','junior','primo lavoro','laureato',
      'coordinatore','assistente','rappresentante','specialista','ingegnere'
    ],
    'Dublin': [], // English only set is CORE_EN
    'Belfast': [], // English only set is CORE_EN
    'Stockholm': [
      'nyexaminerad','trainee','praktikant','junior','nybörjare','graduate',
      'koordinator','assistent','representant','specialist','ingenjör'
    ],
    'Copenhagen': [
      'nyuddannet','trainee','praktikant','junior','begynder','graduate',
      'koordinator','assistent','repræsentant','specialist','ingeniør'
    ],
    'Vienna': [
      'absolvent','trainee','praktikant','junior','einsteiger','nachwuchskraft',
      'koordinator','assistent','vertreter','spezialist','ingenieur'
    ],
    'Prague': [
      'absolvent','trainee','praktikant','junior','začátečník','graduate',
      'koordinátor','asistent','zástupce','specialista','inženýr'
    ],
    'Warsaw': [
      'absolwent','stażysta','praktykant','junior','początkujący','graduate',
      'koordynator','asystent','przedstawiciel','specjalista','inżynier'
    ]
  };
  // Priority cities: Adzuna doesn't cover these, so JobSpy must prioritize them
  const PRIORITY_CITIES = ['Stockholm', 'Copenhagen', 'Vienna', 'Prague', 'Warsaw', 'Belfast'];
  const OTHER_CITIES = ['London','Manchester','Birmingham','Madrid','Barcelona','Berlin','Hamburg','Munich','Amsterdam','Brussels','Paris','Zurich','Milan','Rome','Dublin'];
  // Process priority cities first, then others
  const cities = [...PRIORITY_CITIES, ...OTHER_CITIES];
  
  const MAX_Q_PER_CITY = parseInt(process.env.JOBSPY_MAX_Q_PER_CITY || '6', 10);
  // Priority cities get more queries and results
  const PRIORITY_MAX_Q = parseInt(process.env.JOBSPY_PRIORITY_MAX_Q || '10', 10); // More queries for priority cities
  const RESULTS_WANTED = parseInt(process.env.JOBSPY_RESULTS_WANTED || '75', 10); // EXPANDED: Increased from 50 to 75
  const PRIORITY_RESULTS_WANTED = parseInt(process.env.JOBSPY_PRIORITY_RESULTS || '100', 10); // More results for priority cities (increased from 75 to 100)
  const JOBSPY_TIMEOUT_MS = parseInt(process.env.JOBSPY_TIMEOUT_MS || '20000', 10);

  // ============================================
  // DATABASE CLEANUP: Delete jobs older than 30 days
  // ============================================
  console.log('\n🧹 Cleaning up old jobs (older than 30 days)...');
  try {
    const supabase = getSupabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const cutoffIso = cutoffDate.toISOString();
    
    const { data: deletedJobs, error: deleteError } = await supabase
      .from('jobs')
      .delete()
      .lt('created_at', cutoffIso)
      .select('id');
    
    if (deleteError) {
      console.warn(`⚠️  Failed to delete old jobs: ${deleteError.message}`);
    } else {
      const deletedCount = Array.isArray(deletedJobs) ? deletedJobs.length : 0;
      console.log(`✅ Deleted ${deletedCount} jobs older than 30 days (cutoff: ${cutoffIso})`);
    }
  } catch (error) {
    console.warn(`⚠️  Cleanup error (continuing anyway): ${error.message}`);
  }
  
  const collected = [];
  const pythonCmd = pickPythonCommand();
  
  // Helper function to execute Python scraper and parse results
  async function runJobSpyScraper(pythonCode, label) {
    let py;
    let tries = 0;
    const maxTries = 3;
    
    while (tries < maxTries) {
      tries++;
      if (tries > 1) {
        const backoffDelay = Math.pow(2, tries - 2) * 1000;
        console.log(`↻ Retrying ${label} (${tries}/${maxTries}) after ${backoffDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
      
      py = spawnSync(pythonCmd, ['-c', pythonCode], { 
        encoding: 'utf8', 
        timeout: JOBSPY_TIMEOUT_MS,
        env: { ...process.env, PATH: process.env.PATH }
      });
      
      if (py.status === 0) break;
      
      // Filter out expected errors (GDPR blocking, geo restrictions)
      const stderrText = (py.stderr || '').toLowerCase();
      const stdoutText = (py.stdout || '').toLowerCase();
      const errorText = stderrText + stdoutText;
      
      const expectedErrors = [
        'ziprecruiter response status code 403',
        'geoblocked-gdpr',
        'glassdoor is not available for',
        'not available in the european union',
        'gdpr'
      ];
      
      const isExpectedError = expectedErrors.some(err => errorText.includes(err));
      
      if (isExpectedError) {
        console.log(`ℹ️  Expected error (GDPR/Geo restriction) - continuing...`);
        break;
      } else {
        console.error(`${label} Python error:`, (py.stderr && py.stderr.trim()) || (py.stdout && py.stdout.trim()) || `status ${py.status}`);
      }
    }
    
    if (py && py.status === 0) {
      const rows = parseCsv(py.stdout);
      if (rows.length > 0) {
        rows.forEach(r => collected.push(r));
        return rows.length;
      }
    }
    return 0;
  }
  
  for (const city of cities) {
    const isPriority = PRIORITY_CITIES.includes(city);
    const maxQueries = isPriority ? PRIORITY_MAX_Q : MAX_Q_PER_CITY;
    const resultsWanted = isPriority ? PRIORITY_RESULTS_WANTED : RESULTS_WANTED;
    const localized = CITY_LOCAL[city] || [];
    
    // Note: We now use concept batching (3 batches) instead of individual terms
    // This reduces API calls from 20+ per city to just 6 (3 Indeed + 3 Google)
    
    // Country mapping for Indeed (lowercase, for country_indeed parameter)
    const country = city === 'London' ? 'united kingdom'
                  : city === 'Manchester' ? 'united kingdom'
                  : city === 'Birmingham' ? 'united kingdom'
                  : city === 'Belfast' ? 'united kingdom'
                  : city === 'Paris' ? 'france'
                  : city === 'Madrid' ? 'spain'
                  : city === 'Barcelona' ? 'spain'
                  : city === 'Berlin' ? 'germany'
                  : city === 'Hamburg' ? 'germany'
                  : city === 'Munich' ? 'germany'
                  : city === 'Amsterdam' ? 'netherlands'
                  : city === 'Brussels' ? 'belgium'
                  : city === 'Zurich' ? 'switzerland'
                  : city === 'Dublin' ? 'ireland'
                  : city === 'Milan' ? 'italy'
                  : city === 'Rome' ? 'italy'
                  : city === 'Stockholm' ? 'sweden'
                  : city === 'Copenhagen' ? 'denmark'
                  : city === 'Vienna' ? 'austria'
                  : city === 'Prague' ? 'czech republic'
                  : city === 'Warsaw' ? 'poland'
                  : 'europe';
    
    // Country name for Google (capitalized, full name - baked into search string)
    const countryName = city === 'London' ? 'United Kingdom'
                      : city === 'Manchester' ? 'United Kingdom'
                      : city === 'Birmingham' ? 'United Kingdom'
                      : city === 'Belfast' ? 'United Kingdom'
                      : city === 'Paris' ? 'France'
                      : city === 'Madrid' ? 'Spain'
                      : city === 'Barcelona' ? 'Spain'
                      : city === 'Berlin' ? 'Germany'
                      : city === 'Hamburg' ? 'Germany'
                      : city === 'Munich' ? 'Germany'
                      : city === 'Amsterdam' ? 'Netherlands'
                      : city === 'Brussels' ? 'Belgium'
                      : city === 'Zurich' ? 'Switzerland'
                      : city === 'Dublin' ? 'Ireland'
                      : city === 'Milan' ? 'Italy'
                      : city === 'Rome' ? 'Italy'
                      : city === 'Stockholm' ? 'Sweden'
                      : city === 'Copenhagen' ? 'Denmark'
                      : city === 'Vienna' ? 'Austria'
                      : city === 'Prague' ? 'Czech Republic'
                      : city === 'Warsaw' ? 'Poland'
                      : 'Europe';
    
    // ============================================
    // CONCEPT BATCHING: Group terms into 3 "Super-Queries" instead of 20+ individual calls
    // ============================================
    const priorityLabel = isPriority ? '🎯 [PRIORITY] ' : '';
    
    // Build concept batches with English + local synonyms merged
    const internshipTerms = ['intern', 'internship', 'placement'];
    const internshipLocal = localized.filter(t => /(praktik|stage|stagiaire|prácticas|tirocinio|staż)/i.test(t));
    const internshipBatch = `("${internshipTerms.join('" OR "')}"${internshipLocal.length > 0 ? ` OR "${internshipLocal.join('" OR "')}"` : ''})`;
    
    const graduateTerms = ['graduate', 'junior', 'entry level', 'entry-level', 'recent graduate', 'new grad'];
    const graduateLocal = localized.filter(t => /(absolvent|absolwent|nyexaminerad|nyuddannet|neolaureato|recién graduado|laureato|débutant|beginnend|primo lavoro|nivel inicial)/i.test(t));
    const graduateBatch = `("${graduateTerms.join('" OR "')}"${graduateLocal.length > 0 ? ` OR "${graduateLocal.join('" OR "')}"` : ''})`;
    
    const specializedTerms = ['analyst', 'associate', 'trainee', 'coordinator', 'assistant'];
    const specializedLocal = localized.filter(t => /(koordinator|coordinat|assistent|asistente|analyst|trainee|praktikant|becario|tirocinio)/i.test(t));
    const specializedBatch = `("${specializedTerms.join('" OR "')}"${specializedLocal.length > 0 ? ` OR "${specializedLocal.join('" OR "')}"` : ''})`;
    
    const batches = {
      internships: internshipBatch,
      graduates: graduateBatch,
      specialized: specializedBatch
    };
    
    console.log(`\n${priorityLabel}📦 Using concept batching for ${city} (3 batches: internships, graduates, specialized)`);
    
    // Process each concept batch
    for (const [batchName, baseQuery] of Object.entries(batches)) {
      // ============================================
      // PART A: INDEED (Structured Search) - One call per batch
      // ============================================
      console.log(`\n${priorityLabel}📡 Indeed [${batchName}]: "${baseQuery.substring(0, 60)}..." in ${city}, ${country}`);
      
      // Optimize: Skip Glassdoor for cities where it's blocked
      const GLASSDOOR_BLOCKED_CITIES = ['Stockholm', 'Copenhagen', 'Prague', 'Warsaw'];
      const indeedSites = ['indeed'];
      if (!GLASSDOOR_BLOCKED_CITIES.includes(city)) {
        indeedSites.push('glassdoor');
      }
      
      const indeedPython = `
from jobspy import scrape_jobs
import pandas as pd
df = scrape_jobs(
  site_name=${JSON.stringify(indeedSites)},
  search_term='''${baseQuery.replace(/'/g, "''")}''',
  location='''${city}''',
  country_indeed='''${country}''',
  results_wanted=${resultsWanted},
  hours_old=720,
  distance=20
)
import sys
print('Available columns:', list(df.columns), file=sys.stderr)
desc_cols = ['description', 'job_description', 'full_description', 'job_details', 'details']
desc_col = None
for col in desc_cols:
    if col in df.columns:
        desc_col = col
        break
if desc_col is None:
    df['description'] = df.apply(lambda x: ' '.join(filter(None, [
        str(x.get('company_description', '') or ''),
        str(x.get('skills', '') or ''),
        str(x.get('job_function', '') or ''),
        str(x.get('job_type', '') or '')
    ])), axis=1)
else:
    df['description'] = df.apply(lambda x: (
        str(x.get(desc_col, '') or '') or 
        str(x.get('company_description', '') or '') or
        str(x.get('skills', '') or '')
    ), axis=1)
cols=[c for c in ['title','company','location','job_url','description','company_description','skills'] if c in df.columns]
print(df[cols].to_csv(index=False))
`;
      
      const indeedRows = await runJobSpyScraper(indeedPython, `Indeed [${batchName}]`);
      if (indeedRows > 0) {
        console.log(`→ Indeed [${batchName}]: Collected ${indeedRows} rows`);
      }
      
      // ============================================
      // PART B: GOOGLE (Natural Language Search) - One call per batch
      // ============================================
      // Add year filter for internships and graduates (2025/2026 recruitment cycles)
      const yearFilter = (batchName === 'internships' || batchName === 'graduates')
        ? ' (2025 OR 2026)'
        : '';
      
      const googleNaturalString = `${baseQuery}${yearFilter} jobs in ${city}, ${countryName} -senior -lead -manager -director`;
      
      console.log(`\n${priorityLabel}🔍 Google [${batchName}]: "${googleNaturalString.substring(0, 100)}..." in ${city}`);
      
      const googlePython = `
from jobspy import scrape_jobs
import pandas as pd
df = scrape_jobs(
  site_name=['google'],
  google_search_term='''${googleNaturalString.replace(/'/g, "''")}''',
  results_wanted=${resultsWanted},
  hours_old=720
)
import sys
print('Available columns:', list(df.columns), file=sys.stderr)
desc_cols = ['description', 'job_description', 'full_description', 'job_details', 'details']
desc_col = None
for col in desc_cols:
    if col in df.columns:
        desc_col = col
        break
if desc_col is None:
    df['description'] = df.apply(lambda x: ' '.join(filter(None, [
        str(x.get('company_description', '') or ''),
        str(x.get('skills', '') or ''),
        str(x.get('job_function', '') or ''),
        str(x.get('job_type', '') or '')
    ])), axis=1)
else:
    df['description'] = df.apply(lambda x: (
        str(x.get(desc_col, '') or '') or 
        str(x.get('company_description', '') or '') or
        str(x.get('skills', '') or '')
    ), axis=1)
cols=[c for c in ['title','company','location','job_url','description','company_description','skills'] if c in df.columns]
print(df[cols].to_csv(index=False))
`;
      
      const googleRows = await runJobSpyScraper(googlePython, `Google [${batchName}]`);
      if (googleRows > 0) {
        console.log(`→ Google [${batchName}]: Collected ${googleRows} rows`);
      }
      
      // ============================================
      // RATE LIMIT PROTECTION: 5s cooldown after Google
      // ============================================
      console.log(`⏳ Cooldown: 5s delay to protect IP from Google rate limits...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Optional: Brief pause between cities
    if (cities.indexOf(city) < cities.length - 1) {
      console.log(`⏸️  Brief pause before next city...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Quality gate: required fields and description length
  const hasFields = j => (
    (j.title||'').trim().length > 3 &&
    (j.company||'').trim().length > 1 &&
    (j.location||'').trim().length > 3 &&
    (j.job_url||j.url||'').trim().startsWith('http')
  );
  const titleStr = s => (s||'').toLowerCase();
  const descStr = s => (s||'').toLowerCase();
  const includesAny = (s, arr) => arr.some(t => s.includes(t));
  const excludesAll = (s, arr) => !arr.some(t => s.includes(t));
  const earlyTerms = [
    // English
    'graduate','entry level','entry-level','junior','associate','trainee','intern','internship',
    // Spanish
    'graduado','becario','prácticas','nivel inicial','asociado',
    // German
    'absolvent','praktikum','werkstudent','einsteiger',
    // Dutch
    'starter','afgestudeerd','stage',
    // French
    'jeune diplômé','stagiaire','alternance','débutant','apprenti',
    // Swiss (mix of DE/FR)
    'praktikum','stage','jeune diplômé',
    // Italian
    'neolaureato','tirocinio','stage','apprendista'
  ];
  const bizAxesStrict = ['consult','sales','business analyst','strategy','operations','logistic','supply chain','finance','account','audit','marketing','brand','commercial','product','data','ai'];
  const bizAxesLoose = ['business','analyst','scheme','program','operations','marketing','sales','finance','account','audit','logistics','supply','chain','consult','strategy','hr','human resources','risk','project','management','data','analytics','product','tech','technology','engineering'];
  const seniorTerms = ['senior','lead','principal','director','head of','vp','vice president','architect','specialist','manager'];
  const noisyExclusions = [
    // Healthcare & Medical (strict!)
    'nurse','nhs','pharmacist','doctor','veterinary','dental','physiotherap','medical assistant',
    'biomedical scientist','medical science liaison','medical liaison','clinical',
    'healthcare assistant','paramedic','radiographer','sonographer',
    'tecnico elettromedicale','quality assurance analyst ii - medical',
    'molecular technician','pharmasource technician',
    // Trades & Manual Labor
    'teacher','chef','cleaner','warehouse','driver','barista','waiter','waitress','hairdresser',
    'electrician','plumber','mechanic','welder','carpenter','painter','landscap','janitor',
    'hgv','truck driver','delivery driver','courier','postal',
    'heating technician','motor technician','service technician','power station',
    'deskside technician','service desk','wardrobe technician','projections technician',
    // Retail & Service (non-graduate) - but KEEP "delivery consultant" (consulting role)
    'store assistant','shop assistant','cashier','retail assistant','shelf stacker',
    'beauty consultant','sales consultant loewe','beauty advisor',
    // Other Irrelevant
    'laboratory technician','field technician','acoustic consultant','environmental scientist',
    'social worker','care worker','support worker'
  ];
  // Additional exclusion: overly generic consultant roles
  const consultantExclusion = [' consultant '];
  // Get all role names from signup form for matching (already imported above)
  const allFormRoles = getAllRoles().map(r => r.toLowerCase());
  
  const qualityFiltered = collected.filter(j => {
    if (!hasFields(j)) return false;
    const t = titleStr(j.title);
    const d = descStr(j.company_description || j.skills || '');
    const full = `${t} ${d}`;
    
    // Check if title or description has early-career terms
    const hasEarly = includesAny(t, earlyTerms) || includesAny(d, earlyTerms);
    const titleHasExplicitEarly = includesAny(t, earlyTerms);
    
    // Check if title matches any role from signup form (these are all early-career roles)
    const matchesFormRole = allFormRoles.some(role => {
      // Check if title contains the role name (flexible matching)
      const roleWords = role.split(' ').filter(w => w.length > 3); // Skip short words like "sdr"
      return roleWords.length > 0 && roleWords.every(word => t.includes(word));
    });
    
    // RELAXED: Trust search results more - we're searching with early-career terms and form roles
    // If it matches a form role OR has early terms, it's likely valid
    const isLikelyEarlyCareer = matchesFormRole || hasEarly || titleHasExplicitEarly;
    
    // Business axis check - more lenient if it's a form role or has early terms
    const bizOk = isLikelyEarlyCareer 
      ? true  // Trust form roles and early-career terms
      : includesAny(full, bizAxesLoose); // Otherwise check business keywords
    if (!bizOk) return false;
    
    // Only reject if DEFINITELY senior (and no early terms/form role match in title)
    if (!titleHasExplicitEarly && !matchesFormRole && includesAny(t, seniorTerms)) return false;
    
    // Always reject noise
    if (!excludesAll(full, noisyExclusions)) return false;
    
    return true;
  });
  // No per-city cap - collect all quality jobs
  const capped = qualityFiltered;
  console.log(`\n🧾 Total collected: ${collected.length}`);
  console.log(`✅ Passing quality gate (fields + biz/early terms, no senior/noise): ${qualityFiltered.length}`);
  console.log(`🎚️ All quality jobs included (no cap): ${capped.length}`);
  
  // Debug: show sample titles that failed
  if (collected.length > 0 && qualityFiltered.length === 0) {
    console.log('\n🔍 Sample titles that failed quality gate:');
    collected.slice(0, 5).forEach((j, i) => {
      const t = (j.title||'').toLowerCase();
      const d = (j.company_description || j.skills || '').toLowerCase();
      const full = `${t} ${d}`;
      const hasEarly = earlyTerms.some(term => t.includes(term) || d.includes(term));
      const titleHasExplicitEarly = earlyTerms.some(term => t.includes(term));
      const matchesFormRole = allFormRoles.some(role => {
        const roleWords = role.split(' ').filter(w => w.length > 3);
        return roleWords.length > 0 && roleWords.every(word => t.includes(word));
      });
      const hasBizKeywords = includesAny(full, bizAxesLoose);
      const hasSeniorTerms = includesAny(t, seniorTerms);
      const hasNoise = !excludesAll(full, noisyExclusions);
      const hasFields = (
        (j.title||'').trim().length > 3 &&
        (j.company||'').trim().length > 1 &&
        (j.location||'').trim().length > 3 &&
        (j.job_url||j.url||'').trim().startsWith('http')
      );
      console.log(`${i+1}. "${j.title}" (${j.company})`);
      console.log(`   - hasFields: ${hasFields}, hasEarly: ${hasEarly}, matchesFormRole: ${matchesFormRole}`);
      console.log(`   - hasBizKeywords: ${hasBizKeywords}, hasSeniorTerms: ${hasSeniorTerms}, hasNoise: ${hasNoise}`);
      console.log(`   - REJECTED: ${!hasFields ? 'missing fields' : !hasBizKeywords && !matchesFormRole && !hasEarly ? 'no biz/role/early match' : hasSeniorTerms && !matchesFormRole && !titleHasExplicitEarly ? 'senior term' : hasNoise ? 'noise' : 'unknown'}`);
    });
  }
  await saveJobs(capped, 'jobspy-indeed');
  console.log(`✅ JobSpy: total_saved=${capped.length}`);
  console.log('🎉 Done');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });

// Export main function for wrapper usage
module.exports = {
  main
};
