require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { classifyEarlyCareer, makeJobHash, normalizeString, CAREER_PATH_KEYWORDS } = require('./shared/helpers.cjs');
const { getAllRoles, getEarlyCareerRoles, getTopRolesByCareerPath, getRoleVariations, cleanRoleForSearch } = require('./shared/roles.cjs');
const { recordScraperRun } = require('./shared/telemetry.cjs');

const CAREERJET_API_KEY = process.env.CAREERJET_API_KEY;
const BASE_URL = 'http://public.api.careerjet.net/search';

// Cities we target (matching user preferences)
const CITIES = [
  { name: 'Dublin', country: 'ie', locale: 'en_IE' },
  { name: 'Cork', country: 'ie', locale: 'en_IE' },
  { name: 'Belfast', country: 'gb', locale: 'en_GB' },
  { name: 'London', country: 'gb', locale: 'en_GB' },
  { name: 'Manchester', country: 'gb', locale: 'en_GB' },
  { name: 'Edinburgh', country: 'gb', locale: 'en_GB' },
  { name: 'Paris', country: 'fr', locale: 'fr_FR' },
  { name: 'Berlin', country: 'de', locale: 'de_DE' },
  { name: 'Munich', country: 'de', locale: 'de_DE' },
  { name: 'Amsterdam', country: 'nl', locale: 'en_NL' },
  { name: 'Madrid', country: 'es', locale: 'es_ES' },
  { name: 'Barcelona', country: 'es', locale: 'es_ES' },
  { name: 'Milan', country: 'it', locale: 'it_IT' },
  { name: 'Rome', country: 'it', locale: 'it_IT' },
  { name: 'Lisbon', country: 'pt', locale: 'en_PT' },
  { name: 'Brussels', country: 'be', locale: 'en_BE' },
];

// Local language early-career terms by country (for non-English cities)
const LOCAL_EARLY_CAREER_TERMS = {
  'fr': ['jeune diplômé', 'stagiaire', 'alternance', 'junior', 'débutant', 'programme graduate'],
  'de': ['absolvent', 'trainee', 'praktikant', 'junior', 'berufseinsteiger', 'nachwuchskraft', 'praktikum', 'werkstudent'],
  'es': ['programa de graduados', 'becario', 'prácticas', 'junior', 'recién graduado', 'nivel inicial'],
  'it': ['neolaureato', 'stage', 'tirocinio', 'junior', 'primo lavoro', 'laureato'],
  'nl': ['afgestudeerde', 'traineeship', 'starter', 'junior', 'beginnend', 'werkstudent'],
  'be': ['stagiaire', 'junior', 'débutant', 'afgestudeerde', 'starter'],
  'pt': ['recém-formado', 'estagiário', 'júnior', 'trainee', 'programa de graduados']
};

/**
 * Query rotation system - 3 sets that rotate every 8 hours
 * Ensures different queries for morning/evening runs (8am/6pm UTC)
 */
const QUERY_SETS = {
  SET_A: [
    // Focus: Internships and graduate programs
    'graduate programme', 'graduate scheme', 'internship', 'intern', 
    'graduate trainee', 'management trainee', 'trainee program'
  ],
  SET_B: [
    // Focus: Analyst and associate roles
    'business analyst', 'financial analyst', 'data analyst', 'operations analyst',
    'junior analyst', 'associate consultant', 'graduate analyst'
  ],
  SET_C: [
    // Focus: Entry-level and junior roles
    'entry level', 'junior', 'graduate', 'recent graduate',
    'early careers program', 'campus hire', 'new grad'
  ]
};

/**
 * Determine which query set to use based on time of day
 * Rotates every 8 hours: SET_A (0-7h), SET_B (8-15h), SET_C (16-23h)
 */
function getCurrentQuerySet() {
  const manualSet = process.env.CAREERJET_QUERY_SET;
  if (manualSet && QUERY_SETS[manualSet]) {
    return manualSet;
  }
  
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 8) return 'SET_A';
  if (hour >= 8 && hour < 16) return 'SET_B';
  return 'SET_C';
}

/**
 * Generate search queries from specific roles (not generic terms)
 * Uses actual roles from signup form for targeted searches
 * NOW WITH QUERY ROTATION for variety across runs
 */
function generateSearchQueries() {
  const currentSet = getCurrentQuerySet();
  const baseQueries = QUERY_SETS[currentSet];
  console.log(`🔄 CareerJet using query set: ${currentSet} (${baseQueries.length} base terms)`);
  
  const queries = new Set();
  
  // Add base rotation queries (early-career focused)
  baseQueries.forEach(term => queries.add(term.toLowerCase()));
  
  // Priority 1: Early-career roles (intern, graduate, junior, trainee)
  // Rotate which roles we prioritize based on query set
  const earlyCareerRoles = getEarlyCareerRoles();
  const roleSlice = currentSet === 'SET_A' ? earlyCareerRoles.slice(0, 8) :
                     currentSet === 'SET_B' ? earlyCareerRoles.slice(8, 16) :
                     earlyCareerRoles.slice(16, 24);
  
  roleSlice.forEach(role => {
    const cleaned = cleanRoleForSearch(role);
    cleaned.forEach(cleanRole => {
      if (cleanRole.length > 5) {
        queries.add(cleanRole.toLowerCase());
      }
    });
  });
  
  // Priority 2: All roles from signup form (rotated subset)
  const allRoles = getAllRoles();
  const allRolesSlice = currentSet === 'SET_A' ? allRoles.slice(0, 10) :
                        currentSet === 'SET_B' ? allRoles.slice(10, 20) :
                        allRoles.slice(20, 30);
  
  allRolesSlice.forEach(role => {
    const cleaned = cleanRoleForSearch(role);
    cleaned.forEach(cleanRole => {
      if (cleanRole.length > 5) {
        queries.add(cleanRole.toLowerCase());
      }
    });
  });
  
  // Priority 3: Specific early-career program terms (rotated)
  const specificProgramTerms = currentSet === 'SET_A' ? [
    'graduate programme', 'graduate scheme', 'graduate program',
    'graduate trainee', 'management trainee', 'rotational graduate program'
  ] : currentSet === 'SET_B' ? [
    'graduate analyst', 'graduate associate', 'early careers program',
    'corporate graduate programme', 'future leaders programme'
  ] : [
    'campus hire', 'new grad', 'recent graduate', 'entry level program',
    'graduate scheme', 'trainee program'
  ];
  
  specificProgramTerms.forEach(term => queries.add(term.toLowerCase()));
  
  // Add career path keywords for broader matching (rotated subset)
  const paths = Object.keys(CAREER_PATH_KEYWORDS);
  const pathSlice = currentSet === 'SET_A' ? paths.slice(0, 4) :
                    currentSet === 'SET_B' ? paths.slice(4, 8) :
                    paths.slice(8, 12);
  
  pathSlice.forEach(path => {
    CAREER_PATH_KEYWORDS[path].forEach(keyword => {
      if (keyword.length > 3) {
        queries.add(keyword.toLowerCase());
      }
    });
  });
  
  return Array.from(queries);
}

/**
 * Get local language early-career terms for a city
 */
function getLocalTermsForCity(city) {
  const countryCode = city.country.toLowerCase();
  return LOCAL_EARLY_CAREER_TERMS[countryCode] || [];
}

/**
 * Parse relative dates from CareerJet (e.g., "2 days ago")
 */
function parseRelativeDate(relativeDate) {
  const now = new Date();
  const normalized = normalizeString(relativeDate);
  
  if (normalized.includes('hour')) {
    const hours = parseInt(normalized) || 1;
    now.setHours(now.getHours() - hours);
  } else if (normalized.includes('day')) {
    const days = parseInt(normalized) || 1;
    now.setDate(now.getDate() - days);
  } else if (normalized.includes('week')) {
    const weeks = parseInt(normalized) || 1;
    now.setDate(now.getDate() - (weeks * 7));
  } else if (normalized.includes('month')) {
    const months = parseInt(normalized) || 1;
    now.setMonth(now.getMonth() - months);
  }
  
  return now.toISOString();
}

/**
 * Infer categories from job text (same logic as helpers.cjs)
 */
function inferCategories(title, description) {
  const text = normalizeString(`${title} ${description}`);
  const categories = [];
  
  Object.entries(CAREER_PATH_KEYWORDS).forEach(([path, keywords]) => {
    const keywordLower = keywords.map(k => k.toLowerCase());
    if (keywordLower.some(kw => text.includes(kw))) {
      categories.push(path);
    }
  });
  
  return categories.length > 0 ? categories : ['general'];
}

/**
 * Scrape CareerJet for a single city + keyword combo
 */
async function scrapeCareerJetQuery(city, keyword, supabase) {
  try {
    const params = new URLSearchParams({
      locale_code: city.locale,
      location: city.name,
      keywords: keyword,
      affid: CAREERJET_API_KEY,
      user_ip: '11.22.33.44', // Required by API
      user_agent: 'Mozilla/5.0 JobPing/1.0', // Required by API
      pagesize: '50', // Max on free tier
      page: '1',
      sort: 'date', // Most recent first
      contracttype: 'p', // Permanent
    });

    const url = `${BASE_URL}?${params.toString()}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 JobPing/1.0',
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`[CareerJet] API error ${response.status} for ${keyword} in ${city.name}`);
      return 0;
    }

    const data = await response.json();
    const jobs = data.jobs || [];
    
    if (jobs.length === 0) {
      return 0;
    }

    console.log(`[CareerJet] Found ${jobs.length} jobs for "${keyword}" in ${city.name}`);
    let savedCount = 0;

    // Process each job
    for (const job of jobs) {
      try {
        // Create normalized job object
        const normalizedJob = {
          title: job.title || '',
          company: job.company || '',
          location: job.location || city.name,
          description: job.description || '',
        };

        // Check if it's early career using shared helper
        const isEarlyCareer = classifyEarlyCareer(normalizedJob);
        if (!isEarlyCareer) {
          continue; // Skip non-early-career jobs
        }

        // Generate job_hash using shared helper
        const job_hash = makeJobHash(normalizedJob);

        // Determine job type flags
        const titleLower = normalizeString(job.title);
        const descLower = normalizeString(job.description);
        const is_internship = /intern|internship|stage|praktikum|stagiaire|tirocinio/i.test(titleLower);
        const is_graduate = /graduate|grad scheme|grad program|trainee|absolvent/i.test(titleLower);

        // Parse posted date
        const posted_at = parseRelativeDate(job.date || 'today');

        // Infer categories
        const categories = inferCategories(job.title, job.description);

        // Prepare database record
        const nowIso = new Date().toISOString();
        const jobRecord = {
          job_hash,
          title: job.title,
          company: job.company,
          location: job.location,
          city: city.name,
          country: city.country,
          description: job.description,
          job_url: job.url,
          posted_at: posted_at,
          original_posted_date: job.date || posted_at,
          source: 'careerjet',
          is_active: true,
          status: 'active',
          is_internship,
          is_graduate,
          categories,
          work_environment: 'on-site', // Default, can be enhanced with remote detection
          experience_required: is_internship ? 'internship' : (is_graduate ? 'graduate' : 'entry-level'),
          last_seen_at: nowIso,
          created_at: nowIso,
        };

        // Upsert to database
        const { error } = await supabase.from('jobs').upsert(jobRecord, {
          onConflict: 'job_hash',
          ignoreDuplicates: false,
        });

        if (error) {
          console.error(`[CareerJet] Error saving job ${job_hash}:`, error.message);
        } else {
          savedCount++;
        }
      } catch (jobError) {
        console.error('[CareerJet] Error processing job:', jobError.message);
      }
    }

    return savedCount;
  } catch (error) {
    console.error(`[CareerJet] Error scraping ${keyword} in ${city.name}:`, error.message);
    return 0;
  }
}

/**
 * Main scraper function
 */
async function scrapeCareerJet() {
  if (!CAREERJET_API_KEY) {
    console.error('[CareerJet] ❌ CAREERJET_API_KEY not set');
    return;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('[CareerJet] ❌ Supabase credentials not set. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    return;
  }

  const startTime = Date.now();
  console.log('[CareerJet] 🚀 Starting scrape...');
  
  // Create Supabase client (matching existing scraper pattern)
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const queries = generateSearchQueries();
  
  // Limit to top queries to respect free tier (adjust as needed)
  const limitedQueries = queries.slice(0, 20);
  
  let totalSaved = 0;
  let errors = 0;

  // Scrape each city + keyword combo
  for (const city of CITIES) {
    for (const keyword of limitedQueries) {
      try {
        const saved = await scrapeCareerJetQuery(city, keyword, supabase);
        totalSaved += saved;
        
        // Rate limiting: 1 second between requests (be nice to free API)
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`[CareerJet] Error with ${keyword} in ${city.name}:`, error.message);
        errors++;
      }
    }
  }

  const duration = Date.now() - startTime;
  
  // Record telemetry
  recordScraperRun('careerjet', totalSaved, duration, errors);
  
  console.log(`[CareerJet] ✅ Complete: ${totalSaved} jobs saved in ${(duration / 1000).toFixed(1)}s`);
}

// Run if called directly
if (require.main === module) {
  scrapeCareerJet()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('[CareerJet] Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { scrapeCareerJet };

