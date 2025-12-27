require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { classifyEarlyCareer, makeJobHash, normalizeString, CAREER_PATH_KEYWORDS } = require('./shared/helpers.cjs');
const { recordScraperRun } = require('./shared/telemetry.cjs');

// VERIFIED WORKING LEVER COMPANIES (Tested Dec 2024)
// Only companies confirmed to work with Lever API endpoint:
// https://api.lever.co/v0/postings/{company}?mode=json
// 
// NOTE: Many companies have Lever job pages but don't expose public API access.
// This list only includes companies that work with the public API.
const LEVER_COMPANIES_VERIFIED = {
  // Currently verified working companies
  working: [
    'spotify',       // ✅ Verified: 110 jobs, ~14 early-career
  ],
  
  // Companies to test periodically (may have API access added later)
  to_test: [
    'gitlab',
    'shopify', 
    'stripe',
    'monzo',
    'deliveroo',
    'checkout',
    'figma',
    'notion',
    'canva',
  ],
};

// Use only verified working companies for now
const LEVER_COMPANIES = LEVER_COMPANIES_VERIFIED.working;

const BASE_URL = 'https://jobs.lever.co';

/**
 * Extract city and country from Lever location string
 * e.g., "Amsterdam, Netherlands" -> { city: "Amsterdam", country: "nl" }
 */
function parseLocation(locationStr) {
  if (!locationStr) return { city: 'Unknown', country: 'unknown' };
  
  const parts = locationStr.split(',').map(s => s.trim());
  const city = parts[0] || 'Unknown';
  const countryStr = parts[1] || '';
  
  // Map country names to codes
  const countryMap = {
    'netherlands': 'nl',
    'germany': 'de',
    'france': 'fr',
    'spain': 'es',
    'italy': 'it',
    'portugal': 'pt',
    'ireland': 'ie',
    'united kingdom': 'gb',
    'uk': 'gb',
    'sweden': 'se',
    'denmark': 'dk',
    'norway': 'no',
    'finland': 'fi',
    'poland': 'pl',
    'belgium': 'be',
    'switzerland': 'ch',
    'austria': 'at',
  };
  
  const countryLower = countryStr.toLowerCase();
  const country = countryMap[countryLower] || 'unknown';
  
  return { city, country };
}

/**
 * Infer categories from job text
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
 * Determine work environment from Lever job data
 */
function inferWorkEnvironment(job) {
  // Lever categories is an object, not an array
  const categoriesStr = job.categories ? Object.values(job.categories).join(' ') : '';
  const text = normalizeString(`${job.text || ''} ${job.description || ''} ${categoriesStr}`);
  
  if (/remote|work from home|wfh|distributed/i.test(text)) {
    return 'remote';
  }
  if (/hybrid/i.test(text)) {
    return 'hybrid';
  }
  return 'on-site';
}

/**
 * Scrape a single Lever company
 */
async function scrapeLeverCompany(company, supabase) {
  try {
    // Verified working endpoint format
    const url = `https://api.lever.co/v0/postings/${company}?mode=json`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'JobPing/1.0 (job aggregator)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        // Company doesn't use Lever or doesn't exist
        return 0;
      }
      console.error(`[Lever] API error ${response.status} for ${company}`);
      return 0;
    }

    const jobs = await response.json();
    
    if (!Array.isArray(jobs) || jobs.length === 0) {
      return 0;
    }

    console.log(`[Lever] Found ${jobs.length} jobs at ${company}`);
    let savedCount = 0;
    let filteredCount = 0;

    // Process each job
    for (const job of jobs) {
      try {
        // Create normalized job object for classification
        // Lever API structure: job.text = title, job.description = HTML description
        const normalizedJob = {
          title: job.text || '',
          company: company, // Use the company slug, not categories.commitment
          location: job.categories?.location || '',
          description: job.description || '', // Lever returns HTML description
        };

        // Check if it's early career using shared helper
        const isEarlyCareer = classifyEarlyCareer(normalizedJob);
        if (!isEarlyCareer) {
          filteredCount++;
          continue; // Skip non-early-career jobs
        }

        // Generate job_hash using shared helper
        const job_hash = makeJobHash(normalizedJob);

        // Determine job type flags
        const titleLower = normalizeString(job.text || '');
        const descLower = normalizeString(job.description || '');
        const is_internship = /intern|internship|stage|praktikum|stagiaire|tirocinio/i.test(titleLower);
        const is_graduate = /graduate|grad scheme|grad program|trainee|absolvent|entry level|junior/i.test(titleLower);

        // Parse location
        const locationStr = job.categories?.location || '';
        const { city, country } = parseLocation(locationStr);

        // Parse posted date (Lever uses createdAt timestamp)
        const posted_at = job.createdAt ? new Date(job.createdAt).toISOString() : new Date().toISOString();

        // Infer categories
        const categories = inferCategories(job.text, job.description || '');

        // Infer work environment
        const work_environment = inferWorkEnvironment(job);

        // Normalize location data
        const { normalizeJobLocation } = require('./shared/locationNormalizer.cjs');
        const normalized = normalizeJobLocation({
          city,
          country,
          location: locationStr,
        });

        // Prepare database record
        const nowIso = new Date().toISOString();
        const jobRecord = {
          job_hash,
          title: job.text,
          company: company, // Use company slug, not categories.commitment
          location: normalized.location, // Use normalized location
          city: normalized.city, // Use normalized city
          country: normalized.country, // Use normalized country
          description: job.description || '', // Lever returns HTML description
          job_url: job.hostedUrl || job.applyUrl || `${BASE_URL}/${company}/${job.id}`,
          posted_at,
          original_posted_date: posted_at,
          source: 'lever',
          is_active: true,
          status: 'active',
          is_internship,
          is_graduate,
          categories,
          work_environment,
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
          console.error(`[Lever] Error saving job ${job_hash}:`, error.message);
        } else {
          savedCount++;
        }
      } catch (jobError) {
        console.error('[Lever] Error processing job:', jobError.message);
      }
    }

    if (savedCount > 0 || filteredCount > 0) {
      console.log(`[Lever] ${company}: ${savedCount} saved, ${filteredCount} filtered (non-early-career)`);
    }
    return savedCount;
  } catch (error) {
    console.error(`[Lever] Error scraping ${company}:`, error.message);
    return 0;
  }
}

/**
 * Main scraper function
 */
async function scrapeLever() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('[Lever] ❌ Supabase credentials not set. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    return;
  }

  const startTime = Date.now();
  console.log(`[Lever] Configured to scrape ${LEVER_COMPANIES.length} verified working companies`);
  if (LEVER_COMPANIES_VERIFIED.to_test.length > 0) {
    console.log(`[Lever] Note: ${LEVER_COMPANIES_VERIFIED.to_test.length} companies available for future testing`);
  }
  console.log('[Lever] 🚀 Starting scrape...');
  
  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  let totalSaved = 0;
  let errors = 0;
  let processed = 0;

  // Scrape each company
  for (const company of LEVER_COMPANIES) {
    try {
      const saved = await scrapeLeverCompany(company, supabase);
      totalSaved += saved;
      processed++;
      
      // Progress updates every 10 companies
      if (processed % 10 === 0) {
        console.log(`[Lever] Progress: ${processed}/${LEVER_COMPANIES.length} companies, ${totalSaved} jobs saved`);
      }
      
      // Rate limiting: 500ms between requests (be nice to Lever)
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`[Lever] Error with ${company}:`, error.message);
      errors++;
    }
  }

  const duration = Date.now() - startTime;
  const errorRate = ((errors / LEVER_COMPANIES.length) * 100).toFixed(1);
  
  // Record telemetry
  recordScraperRun('lever', totalSaved, duration, errors);
  
  console.log(`[Lever] ✅ Complete: ${totalSaved} jobs saved from ${LEVER_COMPANIES.length} companies in ${(duration / 1000).toFixed(1)}s`);
  console.log(`[Lever] Error rate: ${errorRate}%`);
}

// Run if called directly
if (require.main === module) {
  scrapeLever()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('[Lever] Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { scrapeLeverCompany, scrapeLever };

