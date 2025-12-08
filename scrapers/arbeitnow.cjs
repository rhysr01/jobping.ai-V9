require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { classifyEarlyCareer, makeJobHash, normalizeString, CAREER_PATH_KEYWORDS } = require('./shared/helpers.cjs');
const { getAllRoles, getEarlyCareerRoles, getTopRolesByCareerPath, getRoleVariations, cleanRoleForSearch } = require('./shared/roles.cjs');
const { recordScraperRun } = require('./shared/telemetry.cjs');

const BASE_URL = 'https://www.arbeitnow.com/api/job-board-api';

// Main German cities (matching signup form)
const CITIES = [
  { name: 'Berlin', country: 'de' },
  { name: 'Hamburg', country: 'de' },
  { name: 'Munich', country: 'de' },
];

/**
 * Generate search queries from specific roles (not generic terms)
 * Uses actual roles from signup form for targeted searches
 */
function generateSearchQueries() {
  const queries = new Set();
  
  // Priority 1: Early-career roles (intern, graduate, junior, trainee)
  // These are highest priority as they're most likely to match early-career jobs
  const earlyCareerRoles = getEarlyCareerRoles();
  earlyCareerRoles.forEach(role => {
    const cleaned = cleanRoleForSearch(role);
    cleaned.forEach(cleanRole => {
      if (cleanRole.length > 5) { // Skip very short variations
        queries.add(cleanRole.toLowerCase());
      }
    });
  });
  
  // Priority 2: All roles from signup form (comprehensive coverage)
  const allRoles = getAllRoles();
  allRoles.forEach(role => {
    const cleaned = cleanRoleForSearch(role);
    cleaned.forEach(cleanRole => {
      if (cleanRole.length > 5) {
        queries.add(cleanRole.toLowerCase());
      }
    });
  });
  
  // Priority 3: Specific early-career program terms (not generic single words)
  // English terms
  const specificProgramTerms = [
    'graduate programme',
    'graduate scheme',
    'graduate program',
    'graduate trainee',
    'management trainee',
    'rotational graduate program',
    'graduate analyst',
    'graduate associate',
    'early careers program',
    'corporate graduate programme',
    'future leaders programme',
  ];
  
  // German-specific early-career program terms
  const germanProgramTerms = [
    'absolventenprogramm',
    'traineeprogramm',
    'praktikum',
    'werkstudent',
    'absolvent',
    'berufseinsteiger',
    'ausbildung',
    'duales studium',
    'einstiegsprogramm',
    'nachwuchsprogramm',
  ];
  
  specificProgramTerms.forEach(term => queries.add(term.toLowerCase()));
  germanProgramTerms.forEach(term => queries.add(term.toLowerCase()));
  
  // Add career path keywords for broader matching
  Object.keys(CAREER_PATH_KEYWORDS).forEach(path => {
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

        // Create normalized job object for classification
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

        // Generate job_hash
        const job_hash = makeJobHash(normalizedJob);

        // Determine job type flags
        const titleLower = normalizeString(job.title);
        const descLower = normalizeString(job.description);
        const is_internship = /intern|internship|praktikum|stage|stagiaire/i.test(titleLower);
        const is_graduate = /graduate|trainee|absolvent|grad scheme/i.test(titleLower);

        // Infer categories
        const categories = inferCategoriesFromTags(job.tags || [], job.title);

        // Prepare database record
        const nowIso = new Date().toISOString();
        const postedAt = normalizeDate(job.created_at);
        const jobRecord = {
          job_hash,
          title: job.title,
          company: job.company_name,
          location: job.location,
          city,
          country,
          description: job.description,
          job_url: job.url,
          posted_at: postedAt,
          original_posted_date: postedAt,
          source: 'arbeitnow',
          is_active: true,
          status: 'active',
          is_internship,
          is_graduate,
          work_environment: job.remote ? 'remote' : 'on-site',
          experience_required: is_internship ? 'internship' : (is_graduate ? 'graduate' : 'entry-level'),
          categories,
          last_seen_at: nowIso,
          created_at: nowIso,
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

