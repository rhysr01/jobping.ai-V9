require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { classifyEarlyCareer, makeJobHash, normalizeString, CAREER_PATH_KEYWORDS } = require('./shared/helpers.cjs');
const { getAllRoles, getEarlyCareerRoles, getTopRolesByCareerPath, getRoleVariations, cleanRoleForSearch } = require('./shared/roles.cjs');
const { recordScraperRun } = require('./shared/telemetry.cjs');
const { processIncomingJob } = require('./shared/processor.cjs');

const BASE_URL = 'https://www.arbeitnow.com/api/job-board-api';

// Main German cities (matching signup form)
const CITIES = [
  { name: 'Berlin', country: 'de' },
  { name: 'Hamburg', country: 'de' },
  { name: 'Munich', country: 'de' },
];

/**
 * Query rotation system - 3 sets that rotate every 8 hours
 * EXPANDED to cover all role types: coordinator, assistant, representative, engineer, specialist, manager, designer, HR, legal, sustainability
 * German + English terms for comprehensive coverage
 */
const QUERY_SETS = {
  SET_A: [
    // Focus: Internships, graduate programs, and coordinator roles (German + English)
    'praktikum', 'werkstudent', 'absolventenprogramm', 'traineeprogramm',
    'internship', 'intern', 'graduate programme', 'graduate scheme',
    'koordinator', 'coordinateur', 'coordinador', 'coordinatore', 'coördinator',
    'marketing coordinator', 'operations coordinator', 'product coordinator',
    'hr coordinator', 'project coordinator', 'sales coordinator'
  ],
  SET_B: [
    // Focus: Analyst, associate, assistant, and representative roles (German + English)
    'business analyst', 'financial analyst', 'data analyst', 'operations analyst',
    'absolvent', 'berufseinsteiger', 'junior analyst', 'graduate analyst',
    'assistent', 'assistant', 'asistente', 'assistente',
    'marketing assistant', 'brand assistant', 'product assistant', 'hr assistant',
    'vertreter', 'représentant', 'representante', 'rappresentante',
    'sales development representative', 'sdr', 'bdr', 'account executive',
    'customer success associate'
  ],
  SET_C: [
    // Focus: Entry-level, junior, engineer, specialist, manager, designer, and program roles (German + English)
    'entry level', 'junior', 'trainee', 'ausbildung', 'duales studium',
    'einstiegsprogramm', 'nachwuchsprogramm', 'graduate trainee',
    'ingenieur', 'ingénieur', 'ingeniero', 'ingegnere', 'ingenieur',
    'software engineer intern', 'data engineer intern', 'cloud engineer intern',
    'spezialist', 'spécialiste', 'especialista', 'specialista',
    'fulfilment specialist', 'technical specialist', 'hr specialist',
    'associate product manager', 'apm', 'product analyst',
    'designer', 'designer intern', 'ux intern', 'product designer',
    'esg intern', 'sustainability analyst', 'climate analyst', 'nachhaltigkeit'
  ]
};

/**
 * Determine which query set to use based on time of day
 * Rotates every 8 hours: SET_A (0-7h), SET_B (8-15h), SET_C (16-23h)
 */
function getCurrentQuerySet() {
  const manualSet = process.env.ARBEITNOW_QUERY_SET;
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
 * ALL QUERIES ARE EARLY-CAREER FOCUSED with German local language terms
 */
function generateSearchQueries() {
  const currentSet = getCurrentQuerySet();
  const baseQueries = QUERY_SETS[currentSet];
  console.log(`🔄 Arbeitnow using query set: ${currentSet} (${baseQueries.length} base terms)`);
  
  const queries = new Set();
  
  // Add base rotation queries (early-career focused, German + English)
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
  
  // Priority 3: German-specific early-career program terms (ALWAYS INCLUDED)
  const germanProgramTerms = [
    'absolventenprogramm', 'traineeprogramm', 'praktikum', 'werkstudent',
    'absolvent', 'berufseinsteiger', 'ausbildung', 'duales studium',
    'einstiegsprogramm', 'nachwuchsprogramm', 'praktikant', 'einsteiger'
  ];
  germanProgramTerms.forEach(term => queries.add(term.toLowerCase()));
  
  // Priority 4: English early-career terms (rotated)
  const englishProgramTerms = currentSet === 'SET_A' ? [
    'graduate programme', 'graduate scheme', 'graduate program',
    'graduate trainee', 'management trainee', 'rotational graduate program'
  ] : currentSet === 'SET_B' ? [
    'graduate analyst', 'graduate associate', 'early careers program',
    'corporate graduate programme', 'future leaders programme'
  ] : [
    'campus hire', 'new grad', 'recent graduate', 'entry level program',
    'graduate scheme', 'trainee program', 'internship program'
  ];
  
  englishProgramTerms.forEach(term => queries.add(term.toLowerCase()));
  
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
 * Extract city from location string
 * e.g., "Berlin, Germany" -> "Berlin"
 */
function extractCity(location) {
  if (!location) return 'Unknown';
  return location.split(',')[0].trim();
}

/**
 * Infer country code from location
 */
function inferCountry(location) {
  const locationLower = normalizeString(location);
  if (locationLower.includes('germany') || locationLower.includes('deutschland')) return 'de';
  if (locationLower.includes('austria') || locationLower.includes('österreich')) return 'at';
  if (locationLower.includes('switzerland') || locationLower.includes('schweiz')) return 'ch';
  return 'de'; // Default to Germany
}

/**
 * Normalize date from Arbeitnow API
 * Handles Unix timestamps (seconds) and ISO strings
 */
function normalizeDate(dateValue) {
  if (!dateValue) return new Date().toISOString();
  
  // If it's a number (Unix timestamp in seconds), convert to milliseconds
  if (typeof dateValue === 'number' || /^\d+$/.test(String(dateValue))) {
    const timestamp = typeof dateValue === 'number' ? dateValue : parseInt(dateValue, 10);
    // If timestamp is less than 1e12, it's in seconds, convert to milliseconds
    const ms = timestamp < 1e12 ? timestamp * 1000 : timestamp;
    return new Date(ms).toISOString();
  }
  
  // Try to parse as ISO string
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return new Date().toISOString();
    }
    return date.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

/**
 * Infer categories from Arbeitnow tags
 */
function inferCategoriesFromTags(tags, title) {
  const allText = normalizeString([...tags, title].join(' '));
  const categories = [];
  
  Object.entries(CAREER_PATH_KEYWORDS).forEach(([path, keywords]) => {
    const keywordLower = keywords.map(k => k.toLowerCase());
    if (keywordLower.some(kw => allText.includes(kw))) {
      categories.push(path);
    }
  });
  
  return categories.length > 0 ? categories : ['general'];
}

/**
 * Scrape Arbeitnow for a single keyword + location combo
 */
async function scrapeArbeitnowQuery(keyword, location, supabase) {
  try {
    const url = new URL(BASE_URL);
    url.searchParams.set('search', keyword);
    url.searchParams.set('location', location.name);
    url.searchParams.set('page', '1');

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'JobPing/1.0 (job aggregator)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[Arbeitnow] API error ${response.status} for ${keyword} in ${location.name}`);
      return 0;
    }

    const data = await response.json();
    const jobs = data.data || [];
    
    if (jobs.length === 0) {
      return 0;
    }

    console.log(`[Arbeitnow] Found ${jobs.length} jobs for "${keyword}" in ${location.name}`);
    let savedCount = 0;

    // Process each job
    for (const job of jobs) {
      try {
        // Extract city and country
        const city = extractCity(job.location);
        const country = inferCountry(job.location);

        // Create normalized job object for early-career check
        const normalizedJob = {
          title: job.title || '',
          company: job.company_name || '',
          location: city,
          description: job.description || '',
        };

        // Check if it's early career
        const isEarlyCareer = classifyEarlyCareer(normalizedJob);
        if (!isEarlyCareer) {
          continue; // Skip non-early-career jobs
        }

        // Process through standardization pipe
        const processed = processIncomingJob({
          title: job.title,
          company: job.company_name,
          location: job.location,
          description: job.description,
          url: job.url,
          posted_at: normalizeDate(job.created_at),
          created_at: job.created_at,
        }, {
          source: 'arbeitnow',
          defaultCity: city,
          defaultCountry: country,
        });

        // Generate job_hash
        const job_hash = makeJobHash({
          title: processed.title,
          company: processed.company,
          location: processed.location,
        });

        // Infer categories from tags (Arbeitnow-specific)
        const categories = inferCategoriesFromTags(job.tags || [], job.title);

        // Prepare database record with all standardized fields
        const jobRecord = {
          ...processed,
          job_hash,
          categories, // Override with Arbeitnow-specific categories
        };

        // Upsert to database
        const { error } = await supabase.from('jobs').upsert(jobRecord, {
          onConflict: 'job_hash',
          ignoreDuplicates: false,
        });

        if (error) {
          console.error(`[Arbeitnow] Error saving job ${job_hash}:`, error.message);
        } else {
          savedCount++;
        }
      } catch (jobError) {
        console.error('[Arbeitnow] Error processing job:', jobError.message);
      }
    }

    return savedCount;
  } catch (error) {
    console.error(`[Arbeitnow] Error scraping ${keyword} in ${location.name}:`, error.message);
    return 0;
  }
}

/**
 * Main scraper function
 */
async function scrapeArbeitnow() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('[Arbeitnow] ❌ Supabase credentials not set. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    return;
  }

  const startTime = Date.now();
  console.log('[Arbeitnow] 🚀 Starting scrape...');
  
  // Create Supabase client (matching existing scraper pattern)
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const queries = generateSearchQueries();
  
  // Limit queries to respect free tier (100 req/hour = ~1.6/min)
  // 10 cities × 15 keywords = 150 requests = ~1.5 hours
  const limitedQueries = queries.slice(0, 15);
  
  let totalSaved = 0;
  let errors = 0;

  // Scrape each city + keyword combo
  for (const city of CITIES) {
    for (const keyword of limitedQueries) {
      try {
        const saved = await scrapeArbeitnowQuery(keyword, city, supabase);
        totalSaved += saved;
        
        // Rate limiting: 2 seconds between requests (100/hour = ~36s spacing, but be conservative)
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`[Arbeitnow] Error with ${keyword} in ${city.name}:`, error.message);
        errors++;
      }
    }
  }

  const duration = Date.now() - startTime;
  
  // Record telemetry
  recordScraperRun('arbeitnow', totalSaved, duration, errors);
  
  console.log(`[Arbeitnow] ✅ Complete: ${totalSaved} jobs saved in ${(duration / 1000).toFixed(1)}s`);
}

// Run if called directly
if (require.main === module) {
  scrapeArbeitnow()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('[Arbeitnow] Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { scrapeArbeitnow };

