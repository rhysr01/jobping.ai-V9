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

// Local language early-career terms by country (expanded for better coverage)
const LOCAL_EARLY_CAREER_TERMS = {
  'fr': [
    'jeune diplômé', 'stagiaire', 'alternance', 'junior', 'débutant', 'programme graduate',
    'coordinateur', 'assistant', 'représentant', 'spécialiste', 'ingénieur', 'stagiaire marketing',
    'stagiaire finance', 'stagiaire tech', 'stagiaire hr', 'stagiaire esg'
  ],
  'de': [
    'absolvent', 'trainee', 'praktikant', 'junior', 'berufseinsteiger', 'nachwuchskraft', 
    'praktikum', 'werkstudent', 'koordinator', 'assistent', 'vertreter', 'spezialist',
    'ingenieur', 'praktikum marketing', 'praktikum finance', 'praktikum tech', 'praktikum hr'
  ],
  'es': [
    'programa de graduados', 'becario', 'prácticas', 'junior', 'recién graduado', 'nivel inicial',
    'coordinador', 'asistente', 'representante', 'especialista', 'ingeniero', 'prácticas marketing',
    'prácticas finance', 'prácticas tech', 'prácticas hr', 'prácticas sostenibilidad'
  ],
  'it': [
    'neolaureato', 'stage', 'tirocinio', 'junior', 'primo lavoro', 'laureato',
    'coordinatore', 'assistente', 'rappresentante', 'specialista', 'ingegnere', 'stage marketing',
    'stage finance', 'stage tech', 'stage hr', 'stage sostenibilità'
  ],
  'nl': [
    'afgestudeerde', 'traineeship', 'starter', 'junior', 'beginnend', 'werkstudent',
    'coördinator', 'assistent', 'vertegenwoordiger', 'specialist', 'ingenieur', 'stage marketing',
    'stage finance', 'stage tech', 'stage hr', 'stage duurzaamheid'
  ],
  'be': [
    'stagiaire', 'junior', 'débutant', 'afgestudeerde', 'starter', 'coordinateur',
    'assistant', 'représentant', 'spécialiste', 'ingénieur', 'stagiaire marketing'
  ],
  'pt': [
    'recém-formado', 'estagiário', 'júnior', 'trainee', 'programa de graduados',
    'coordenador', 'assistente', 'representante', 'especialista', 'engenheiro', 'estágio marketing',
    'estágio finance', 'estágio tech', 'estágio rh'
  ],
  'ie': [], // English only
  'gb': []  // English only
};

/**
 * Query rotation system - 3 sets that rotate every 8 hours
 * EXPANDED to cover all role types: coordinator, assistant, representative, engineer, specialist, manager, designer, HR, legal, sustainability
 */
const QUERY_SETS = {
  SET_A: [
    // Focus: Internships, graduate programs, and coordinator roles
    'internship', 'graduate programme', 'graduate scheme', 'intern',
    'graduate trainee', 'management trainee', 'trainee program',
    'campus hire', 'new grad', 'recent graduate', 'entry level program',
    'marketing coordinator', 'operations coordinator', 'product coordinator',
    'hr coordinator', 'project coordinator', 'sales coordinator',
    'finance coordinator', 'business coordinator', 'event coordinator',
    'finance intern', 'consulting intern', 'marketing intern', 'data intern',
    'investment banking intern', 'entry level software engineer',
    'junior data scientist', 'graduate consultant', 'associate investment banker',
    'recent graduate finance', 'campus recruiter', 'new grad program'
  ],
  SET_B: [
    // Focus: Analyst, associate, assistant, and representative roles
    'business analyst', 'financial analyst', 'data analyst', 'operations analyst',
    'strategy analyst', 'risk analyst', 'investment analyst', 'product analyst',
    'associate consultant', 'graduate analyst', 'junior analyst', 'entry level analyst',
    'marketing assistant', 'brand assistant', 'product assistant', 'finance assistant',
    'operations assistant', 'sales development representative', 'sdr', 'bdr',
    'account executive', 'customer success associate', 'hr assistant',
    'associate finance', 'graduate associate', 'junior consultant',
    'associate product manager', 'apm', 'entry level consultant'
  ],
  SET_C: [
    // Focus: Entry-level, junior, engineer, specialist, manager, designer, and program roles
    'entry level', 'junior', 'graduate', 'recent graduate',
    'early careers program', 'rotational graduate program',
    'entry level software engineer', 'junior software engineer', 'graduate software engineer',
    'software engineer intern', 'data engineer intern', 'cloud engineer intern',
    'frontend engineer intern', 'backend engineer intern', 'associate product manager',
    'apm', 'product analyst', 'junior product manager', 'entry level product',
    'fulfilment specialist', 'technical specialist', 'hr specialist', 'marketing specialist',
    'product designer', 'ux intern', 'ux designer', 'design intern', 'junior designer',
    'graduate designer', 'entry level designer', 'junior engineer', 'graduate engineer',
    'entry level engineer', 'junior specialist', 'graduate specialist', 'entry level specialist',
    'esg intern', 'sustainability analyst', 'climate analyst'
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
    const startTime = Date.now();
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 JobPing/1.0',
        'Accept': 'application/json',
      },
    });
    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      // Log error but don't fail completely - might be rate limit
      if (response.status === 429) {
        console.warn(`[CareerJet] Rate limit hit for ${keyword} in ${city.name} - will slow down`);
        return { saved: 0, shouldSlowDown: true };
      }
      console.error(`[CareerJet] API error ${response.status} for ${keyword} in ${city.name}`);
      return { saved: 0, shouldSlowDown: false };
    }

    const data = await response.json();
    const jobs = data.jobs || [];
    
    if (jobs.length === 0) {
      return { saved: 0, shouldSlowDown: false };
    }

    console.log(`[CareerJet] Found ${jobs.length} jobs for "${keyword}" in ${city.name} (${responseTime}ms)`);
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

        // Normalize location data
        const { normalizeJobLocation } = require('./shared/locationNormalizer.cjs');
        const normalized = normalizeJobLocation({
          city: city.name,
          country: city.country,
          location: job.location,
        });

        // Prepare database record
        const nowIso = new Date().toISOString();
        const jobRecord = {
          job_hash,
          title: job.title,
          company: job.company,
          location: normalized.location, // Use normalized location
          city: normalized.city, // Use normalized city
          country: normalized.country, // Use normalized country
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

    // Return both count and whether to slow down (based on response time)
    return { saved: savedCount, shouldSlowDown: responseTime > 2000 };
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
  
  const baseQueries = generateSearchQueries();
  
  // Limit to top queries to respect free tier (adjust as needed)
  const limitedBaseQueries = baseQueries.slice(0, 20);
  
  let totalSaved = 0;
  let errors = 0;

  // Scrape each city + keyword combo
  for (const city of CITIES) {
    // Get local language terms for this city (if not English)
    const localTerms = getLocalTermsForCity(city);
    
    // Combine base queries with local terms for this city
    const cityQueries = [...limitedBaseQueries];
    if (localTerms.length > 0) {
      // Add top 3 local terms for this city
      cityQueries.push(...localTerms.slice(0, 3));
      console.log(`[CareerJet] ${city.name}: Using ${cityQueries.length} queries (${localTerms.slice(0, 3).length} local language terms)`);
    }
    
    // Adaptive rate limiting: start with base delay, adjust based on API response
    let currentDelay = 800; // Start faster (800ms) - will adapt if needed
    let consecutiveSlowResponses = 0;
    
    for (const keyword of cityQueries) {
      try {
        const result = await scrapeCareerJetQuery(city, keyword, supabase);
        const saved = result.saved || 0;
        totalSaved += saved;
        
        // Adaptive delay: slow down if API is slow or rate limited
        if (result.shouldSlowDown) {
          consecutiveSlowResponses++;
          currentDelay = Math.min(currentDelay * 1.5, 3000); // Max 3 seconds
          console.log(`[CareerJet] Slowing down to ${currentDelay}ms (slow response detected)`);
        } else if (consecutiveSlowResponses > 0) {
          // Gradually speed up if responses are fast again
          consecutiveSlowResponses = Math.max(0, consecutiveSlowResponses - 1);
          currentDelay = Math.max(800, currentDelay * 0.9); // Back to base delay
        }
        
        // Rate limiting: adaptive delay between requests
        await new Promise(resolve => setTimeout(resolve, currentDelay));
      } catch (error) {
        console.error(`[CareerJet] Error with ${keyword} in ${city.name}:`, error.message);
        errors++;
        // Slow down on errors too
        currentDelay = Math.min(currentDelay * 1.2, 3000);
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

