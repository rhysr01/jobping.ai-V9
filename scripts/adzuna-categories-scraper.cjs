require('dotenv').config({ path: '.env.local' });
const axios = require('axios');
const { classifyEarlyCareer, makeJobHash, CAREER_PATH_KEYWORDS } = require('../scrapers/shared/helpers.cjs');
const { recordScraperRun } = require('../scrapers/shared/telemetry.cjs');
const scriptStart = Date.now();
let scrapeErrors = 0;

// EU Cities - EXPANDED to 20 cities for better coverage
const EU_CITIES_CATEGORIES = [
  { name: 'London', country: 'gb' },    // ✅ High performer
  { name: 'Manchester', country: 'gb' }, // 🆕 UK's 2nd largest city
  { name: 'Birmingham', country: 'gb' }, // 🆕 UK's 3rd largest city
  { name: 'Madrid', country: 'es' },    // ✅ High performer (prácticas goldmine)
  { name: 'Barcelona', country: 'es' }, // 🆕 Spain's 2nd largest city (tech/finance hub)
  { name: 'Berlin', country: 'de' },    // ✅ Moderate performer
  { name: 'Hamburg', country: 'de' },   // 🆕 Germany's 2nd largest city
  { name: 'Munich', country: 'de' },    // 🆕 Germany's 3rd largest city (finance/tech hub)
  { name: 'Amsterdam', country: 'nl' }, // ✅ Moderate performer
  { name: 'Brussels', country: 'be' },  // 🆕 EU capital (many institutions)
  { name: 'Paris', country: 'fr' },     // ✅ High performer (522 jobs)
  { name: 'Zurich', country: 'ch' },    // ✅ Moderate performer
  { name: 'Milan', country: 'it' },     // ✅ High performer (470 jobs)
  { name: 'Rome', country: 'it' },      // 🆕 Italy's capital
  { name: 'Dublin', country: 'ie' },     // ✅ English only (tech/finance hub)
  { name: 'Stockholm', country: 'se' },  // 🆕 Nordic tech/finance hub
  { name: 'Copenhagen', country: 'dk' }, // 🆕 Nordic business hub
  { name: 'Vienna', country: 'at' },     // 🆕 Central European business hub
  { name: 'Prague', country: 'cz' },     // 🆕 Central European tech hub
  { name: 'Warsaw', country: 'pl' }      // 🆕 Eastern European business hub
];

// Query rotation system for Adzuna - 3 different sets
const QUERY_SETS = {
  SET_A: [
    'internship', 'graduate programme', 'junior', 'entry level', 'trainee'
  ],
  SET_B: [
    'finance graduate', 'marketing graduate', 'strategy graduate', 
    'business analyst', 'data analyst', 'operations analyst'
  ],
  SET_C: [
    'graduate scheme', 'graduate program', 'trainee program',
    'entry level', 'junior', 'associate', 'analyst'
  ]
};

// Determine which query set to use
const getCurrentQuerySet = () => {
  const manualSet = process.env.ADZUNA_QUERY_SET;
  if (manualSet && QUERY_SETS[manualSet]) {
    console.log(`🎯 Adzuna manual query set override: ${manualSet}`);
    return manualSet;
  }
  
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 8) return 'SET_A';
  if (hour >= 8 && hour < 16) return 'SET_B';
  return 'SET_C';
};

const currentSet = getCurrentQuerySet();
const CORE_ENGLISH_TERMS = QUERY_SETS[currentSet];
console.log(`🔄 Adzuna using query set: ${currentSet} (${CORE_ENGLISH_TERMS.length} terms)`);

// Local language terms by country (SAME AS JOBSPY - max 6 per city)
const LOCAL_EARLY_CAREER_TERMS = {
  'gb': [], // English only set is CORE_ENGLISH_TERMS
  'es': ['programa de graduados', 'becario', 'prácticas', 'junior', 'recién graduado', 'nivel inicial'],
  'de': ['absolvent', 'trainee', 'praktikant', 'junior', 'berufseinsteiger', 'nachwuchskraft'],
  'nl': ['afgestudeerde', 'traineeship', 'starter', 'junior', 'beginnend', 'werkstudent'],
  'fr': ['jeune diplômé', 'stagiaire', 'alternance', 'junior', 'débutant', 'programme graduate'],
  'ch': ['absolvent', 'trainee', 'praktikant', 'junior', 'jeune diplômé', 'stagiaire'],
  'it': ['neolaureato', 'stage', 'tirocinio', 'junior', 'primo lavoro', 'laureato'],
  'ie': [], // English only set is CORE_ENGLISH_TERMS
  'be': ['stagiaire', 'junior', 'débutant', 'afgestudeerde', 'starter'], // Belgium: French + Dutch
  'se': ['nyexaminerad', 'trainee', 'praktikant', 'junior', 'nybörjare', 'graduate'], // Swedish
  'dk': ['nyuddannet', 'trainee', 'praktikant', 'junior', 'begynder', 'graduate'], // Danish
  'at': ['absolvent', 'trainee', 'praktikant', 'junior', 'einsteiger', 'nachwuchskraft'], // Austrian German
  'cz': ['absolvent', 'trainee', 'praktikant', 'junior', 'začátečník', 'graduate'], // Czech
  'pl': ['absolwent', 'stażysta', 'praktykant', 'junior', 'początkujący', 'graduate'] // Polish
};

// Target sectors for IE graduates
// Target sectors (TOP 3 PERFORMERS ONLY - reduced from 6 to 3)
const HIGH_PERFORMING_SECTORS = [
  'finance',         // ✅ Proven: junior finance (9 jobs Madrid), prácticas finance (8 jobs Madrid)
  'marketing',       // ✅ Proven: prácticas marketing (24 jobs Madrid!)
  'strategy'         // ✅ Proven: prácticas strategy (7 jobs Madrid), strategy consultant (15 jobs Paris)
];

// REMOVED UNIVERSAL ZEROS: consulting (0 Madrid), tech (0 London, 0 Madrid), 
// supply chain, logistics, data analytics, sustainability

/**
 * Generate multilingual early-career search queries for a specific city
 */
function generateCityQueries(countryCode) {
  const queries = [];
  
  // Always include core English terms
  queries.push(...CORE_ENGLISH_TERMS);
  
  // Add local language terms for this country
  const localTerms = LOCAL_EARLY_CAREER_TERMS[countryCode] || [];
  queries.push(...localTerms);
  
  // PRIORITY: Internship terms (GOLD STANDARD - inherently early-career)
  for (const sector of HIGH_PERFORMING_SECTORS) {
    // 🥇 HIGHEST PRIORITY: Internship combinations (100% early-career)
    queries.push(`${sector} internship`);     // e.g., "finance internship"
    queries.push(`${sector} intern`);         // e.g., "marketing intern"
    queries.push(`internship ${sector}`);     // e.g., "internship finance"
    
    // 🥈 HIGH PRIORITY: Junior combinations
    queries.push(`junior ${sector}`);         // ✅ Proven pattern
    
    // 🥉 LOCAL LANGUAGE INTERNSHIPS (by country)
    if (countryCode === 'es') {
      queries.push(`prácticas ${sector}`);    // ✅ GOLDMINE: 8-24 jobs per search!
      queries.push(`becario ${sector}`);      // Spanish internship term
    } else if (countryCode === 'fr') {
      queries.push(`stagiaire ${sector}`);    // ✅ Good in Paris  
      queries.push(`stage ${sector}`);        // French internship term
    } else if (countryCode === 'it') {
      queries.push(`stage ${sector}`);        // ✅ Some success
      queries.push(`tirocinio ${sector}`);    // Italian internship term
    } else if (countryCode === 'de' || countryCode === 'at') {
      queries.push(`praktikum ${sector}`);    // German/Austrian internship term
    } else if (countryCode === 'nl') {
      queries.push(`stage ${sector}`);        // Dutch internship term
    } else if (countryCode === 'be') {
      queries.push(`stagiaire ${sector}`);    // Belgian French internship term
      queries.push(`stage ${sector}`);        // Belgian Dutch/French internship term
    } else if (countryCode === 'se') {
      queries.push(`praktikant ${sector}`);   // Swedish internship term
    } else if (countryCode === 'dk') {
      queries.push(`praktikant ${sector}`);   // Danish internship term
    } else if (countryCode === 'cz') {
      queries.push(`praktikant ${sector}`);   // Czech internship term
    } else if (countryCode === 'pl') {
      queries.push(`staż ${sector}`);         // Polish internship term
    }
  }
  
  // ULTRA-SPECIFIC business school graduate terms (NO AMBIGUITY)
  queries.push(
    // Core Finance & Banking (clearly junior/analyst level)
    'investment banking analyst',      // ✅ Gold standard
    'junior investment banker',        // More specific
    'graduate investment banking',     // Graduate-specific
    'junior financial analyst',       
    'graduate financial analyst',     // Graduate-specific
    'equity research associate',       // Junior in finance
    'junior equity research',         // More specific
    'junior portfolio analyst',       // More specific
    'graduate portfolio management',   // Graduate-specific
    'junior credit analyst',          
    'graduate credit analyst',        // Graduate-specific
    
    // Strategy & Consulting (junior/analyst/associate only)
    'junior strategy consultant',     // More specific than 'strategy consultant'
    'graduate strategy consultant',   // Graduate-specific
    'strategy analyst',               // Analyst = junior
    'junior consultant',              // Clear junior level
    'graduate consultant',            // Graduate-specific
    'associate consultant',           // Junior consulting level
    'consultant graduate program',    // Graduate program specific
    'junior business analyst',        // Clear junior level
    'graduate business analyst',      // Graduate-specific
    
    // Corporate Development & M&A (analyst/associate level)
    'corporate development analyst',   // Analyst = junior
    'junior corporate development',    // More specific
    'graduate corporate development',  // Graduate-specific
    'business development analyst',    // Analyst = junior
    'junior business development',     
    'graduate business development',   // Graduate-specific
    'M&A analyst',                    // Analyst = junior
    'mergers acquisitions analyst',   // Analyst = junior
    
    // Marketing & Commercial (analyst/junior/graduate only)
    'marketing analyst',              // Analyst = junior
    'junior marketing analyst',       // More specific
    'graduate marketing',             // Graduate-specific
    'digital marketing analyst',      // Analyst = junior
    'commercial analyst',             // Analyst = junior
    'junior commercial analyst',      // More specific
    'brand analyst',                  // Analyst = junior
    'product marketing analyst',      // Analyst = junior
    
    // Data & Analytics (analyst/junior only)
    'data analyst',                   // Analyst = junior
    'junior data analyst',            // More specific
    'business intelligence analyst',  // Analyst = junior
    'junior data scientist',          // Explicitly junior
    'pricing analyst',                // Analyst = junior
    'research analyst',               // Analyst = junior
    
    // Operations (analyst/junior only)
    'operations analyst',             // Analyst = junior
    'junior operations analyst',      // More specific
    'supply chain analyst',           // Analyst = junior
    'logistics analyst',              // Analyst = junior
    'business process analyst',       // Analyst = junior
    
    // Graduate Programs (100% early-career)
    'management trainee',             // ✅ Always junior
    'graduate trainee',               // ✅ Graduate-specific
    'business graduate',              // ✅ Graduate-specific
    'commercial graduate',            // ✅ Graduate-specific
    'finance graduate',               // ✅ Graduate-specific
    'graduate program',               // ✅ Formal programs
    'leadership development program', // ✅ Graduate programs
    'associate program'               // ✅ Entry-level programs
  );
  
  // Limit to 15 queries per city (optimized for 250 daily API limit)
  const limitedQueries = [...new Set(queries)].slice(0, 15);
  return limitedQueries;
}

/**
 * Scrape jobs from a single city with category-focused keywords
 */
async function scrapeCityCategories(cityName, countryCode, queries, options = {}) {
  const {
    appId = process.env.ADZUNA_APP_ID,
    appKey = process.env.ADZUNA_APP_KEY,
    resultsPerPage = parseInt(process.env.ADZUNA_RESULTS_PER_PAGE || '25', 10),
    maxDaysOld = parseInt(process.env.ADZUNA_MAX_DAYS_OLD || '28', 10), // Last 28 days for wider coverage
    delay = parseInt(process.env.ADZUNA_PAGE_DELAY_MS || '800', 10),
    timeout = parseInt(process.env.ADZUNA_TIMEOUT_MS || '15000', 10),
    verbose = false,
    maxPages = parseInt(process.env.ADZUNA_MAX_PAGES || '3', 10),
    pageDelayJitter = parseInt(process.env.ADZUNA_PAGE_DELAY_JITTER_MS || '0', 10),
    targetCareerPaths = [],
  } = options;

  if (!appId || !appKey) {
    throw new Error('Missing Adzuna credentials');
  }

  const allJobs = [];
  
  for (const query of queries) {
    try {
      if (verbose) console.log(`📍 Searching ${cityName} for: "${query}" (max ${maxDaysOld} days)`);
      
      // Search multiple pages for more results
      let page = 1;
      let hasMorePages = true;
      
      while (hasMorePages && page <= maxPages) {
        const url = `https://api.adzuna.com/v1/api/jobs/${countryCode}/search/${page}?app_id=${appId}&app_key=${appKey}&what=${encodeURIComponent(query)}&where=${encodeURIComponent(cityName)}&results_per_page=${resultsPerPage}&sort_by=date&max_days_old=${maxDaysOld}`;
      
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          },
          timeout
        });

        const jobs = response.data.results || [];
        
        if (jobs.length > 0) {
          if (verbose) console.log(`   ✅ Found ${jobs.length} jobs for "${query}" (page ${page})`);
          
          // Transform jobs to our format
          const transformedJobs = jobs.map(job => ({
            title: job.title?.trim() || 'Unknown Title',
            company: job.company?.display_name?.trim() || 'Unknown Company',
            location: `${cityName}, ${countryCode.toUpperCase()}`,
            description: job.description?.trim() || '',
            url: job.redirect_url || job.url || '',
            posted_at: job.created ? new Date(job.created).toISOString() : new Date().toISOString(),
            source: 'adzuna',
            source_job_id: job.id?.toString() || '',
            salary_min: job.salary_min || null,
            salary_max: job.salary_max || null,
            category: query, // Track which search term found this job
            search_location: cityName,
            search_country: countryCode
          }));
          
          const filteredJobs = transformedJobs.filter((job) => {
            if (!classifyEarlyCareer(job)) {
              return false;
            }

            if (!targetCareerPaths || targetCareerPaths.length === 0) {
              return true;
            }

            const lowerText = `${job.title || ''} ${job.description || ''}`.toLowerCase();
            return targetCareerPaths.some((path) => {
              const keywords = CAREER_PATH_KEYWORDS[path] || [];
              if (!keywords.length) return true;
              return keywords.some((keyword) => lowerText.includes(keyword));
            });
          });
          
          if (filteredJobs.length === 0 && verbose) {
            console.log(`   ⚠️  Filtered out ${transformedJobs.length} non-early-career jobs for "${query}"`);
          }
          
          allJobs.push(...filteredJobs);
          
          // Stop if we got fewer results than requested (last page)
          if (jobs.length < resultsPerPage) {
            hasMorePages = false;
          }
        } else {
          if (verbose) console.log(`   ⚠️  No jobs found for "${query}" (page ${page})`);
          hasMorePages = false;
        }
        
        page++;
        
        const jitter = pageDelayJitter > 0 ? Math.floor(Math.random() * pageDelayJitter) : 0;
        const delayMs = Math.max(0, delay + jitter);
        if (delayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
      
    } catch (error) {
      scrapeErrors += 1;
      console.error(`❌ Error searching ${cityName} for "${query}":`, error.message);
      // Continue with next query
    }
  }
  
  return allJobs;
}

/**
 * Scrape all EU cities with category-focused approach
 */
async function scrapeAllCitiesCategories(options = {}) {
  const {
    verbose = false,
    targetCities = [],
    targetCareerPaths = [],
    targetIndustries = [],
    targetRoles = [],
    includeRemote = false,
    resultsPerPage: overrideResultsPerPage,
    maxDaysOld: overrideMaxDaysOld,
    delay: overrideDelay,
    timeout: overrideTimeout,
    maxPages: overrideMaxPages,
    pageDelayJitter: overridePageDelayJitter,
    maxQueriesPerCity: overrideMaxQueriesPerCity,
  } = options;
  
  const normalizedTargetCities = targetCities
    .map(city => city && city.toLowerCase().trim())
    .filter(Boolean);
  
  const resultsPerPage = typeof overrideResultsPerPage === 'number'
    ? overrideResultsPerPage
    : parseInt(process.env.ADZUNA_RESULTS_PER_PAGE || '25', 10);
  const maxDaysOld = typeof overrideMaxDaysOld === 'number'
    ? overrideMaxDaysOld
    : parseInt(process.env.ADZUNA_MAX_DAYS_OLD || '28', 10);
  const delayMs = typeof overrideDelay === 'number'
    ? overrideDelay
    : parseInt(process.env.ADZUNA_PAGE_DELAY_MS || '800', 10);
  const timeoutMs = typeof overrideTimeout === 'number'
    ? overrideTimeout
    : parseInt(process.env.ADZUNA_TIMEOUT_MS || '15000', 10);
  const maxPages = typeof overrideMaxPages === 'number'
    ? overrideMaxPages
    : parseInt(process.env.ADZUNA_MAX_PAGES || '3', 10);
  const pageDelayJitter = typeof overridePageDelayJitter === 'number'
    ? overridePageDelayJitter
    : parseInt(process.env.ADZUNA_PAGE_DELAY_JITTER_MS || '0', 10);
  const maxQueriesPerCity = typeof overrideMaxQueriesPerCity === 'number'
    ? overrideMaxQueriesPerCity
    : parseInt(process.env.ADZUNA_MAX_QUERIES_PER_CITY || '15', 10);
  
  console.log(`🎓 Starting multilingual early-career job search across ${EU_CITIES_CATEGORIES.length} EU cities...`);
  console.log(`📅 Time range: Last 28 days for wider coverage`);
  console.log(`🌍 Languages: English + local terms per country`);
  console.log(`🏢 Target sectors: ${HIGH_PERFORMING_SECTORS.join(', ')}`);
  console.log(`📊 API Usage: ~${EU_CITIES_CATEGORIES.length * 15} calls (optimized for 250 daily limit)`);
  console.log(`⚙️  Adzuna config: ${JSON.stringify({
    resultsPerPage,
    maxDaysOld,
    delayMs,
    timeoutMs,
    maxPages,
    pageDelayJitter,
    maxQueriesPerCity,
  })}`);
  if (verbose) {
    console.log(`🔍 Core English terms: ${CORE_ENGLISH_TERMS.join(', ')}`);
  }
  
  if (normalizedTargetCities.length) {
    console.log(`🎯 Signup target cities (${normalizedTargetCities.length}): ${normalizedTargetCities.join(', ')}`);
  }
  if (targetCareerPaths.length) {
    console.log(`🎯 Signup career paths (${targetCareerPaths.length}): ${targetCareerPaths.join(', ')}`);
  }
  if (targetIndustries.length) {
    console.log(`🎯 Signup industries (${targetIndustries.length}): ${targetIndustries.join(', ')}`);
  }
  if (targetRoles.length) {
    console.log(`🎯 Signup roles (${targetRoles.length}): ${targetRoles.join(', ')}`);
  }
  
  const allJobs = [];
  let totalCityCount = 0;
  
  // Optional single-city filter via env CITY (matches by name, case-insensitive)
  const cityEnv = (process.env.CITY || '').trim().toLowerCase();
  let citiesToProcess;
  if (cityEnv) {
    citiesToProcess = EU_CITIES_CATEGORIES.filter(c => c.name.toLowerCase() === cityEnv);
  } else if (normalizedTargetCities.length) {
    citiesToProcess = EU_CITIES_CATEGORIES.filter(c => normalizedTargetCities.includes(c.name.toLowerCase()));
    if (citiesToProcess.length === 0) {
      console.warn('⚠️  Signup cities did not match predefined EU list; falling back to default cities');
      citiesToProcess = EU_CITIES_CATEGORIES;
    }
  } else {
    citiesToProcess = EU_CITIES_CATEGORIES;
  }

  for (const city of citiesToProcess) {
    try {
      const cityQueries = generateCityQueries(city.country);
      const limitedCityQueries = maxQueriesPerCity > 0
        ? cityQueries.slice(0, maxQueriesPerCity)
        : cityQueries;
      console.log(`\n🌍 Processing ${city.name} (${city.country.toUpperCase()}) - ${limitedCityQueries.length}/${cityQueries.length} queries...`);
      
      const cityJobs = await scrapeCityCategories(city.name, city.country, limitedCityQueries, {
        resultsPerPage,
        maxDaysOld,
        delay: delayMs,
        timeout: timeoutMs,
        verbose,
        maxPages,
        pageDelayJitter,
        targetCareerPaths,
      });
      
      if (cityJobs.length > 0) {
        allJobs.push(...cityJobs);
        console.log(`✅ ${city.name}: Found ${cityJobs.length} jobs`);
      } else {
        console.log(`⚠️  ${city.name}: No jobs found`);
      }
      
      totalCityCount++;
      
    } catch (error) {
      scrapeErrors += 1;
      console.error(`❌ Failed to process ${city.name}:`, error.message);
    }
  }
  
  // Remove duplicates based on URL
  const uniqueJobs = allJobs.reduce((acc, job) => {
    const jobHash = makeJobHash(job);
    if (!acc.has(jobHash)) {
      acc.set(jobHash, { ...job, job_hash: jobHash });
    }
    return acc;
  }, new Map());
  
  let finalJobs = Array.from(uniqueJobs.values());
  if (!includeRemote) {
    finalJobs = finalJobs.filter(job => !String(job.location || '').toLowerCase().includes('remote'));
  }
  
  console.log(`\n📊 Multilingual Early-Career Job Search Summary:`);
  console.log(`   🏙️  Cities processed: ${totalCityCount}/${EU_CITIES_CATEGORIES.length}`);
  console.log(`   🌍 Multilingual coverage: English + local terms`);
  console.log(`   📄 Raw jobs found: ${allJobs.length}`);
  console.log(`   ✨ Unique jobs: ${finalJobs.length}`);
  console.log(`   📅 Time range: Last 28 days`);
  
  return {
    jobs: finalJobs,
    totalRaw: allJobs.length,
    totalUnique: finalJobs.length,
    citiesProcessed: totalCityCount
  };
}

// Export functions
module.exports = {
  scrapeCityCategories,
  scrapeAllCitiesCategories,
  generateCityQueries,
  EU_CITIES_CATEGORIES,
  CORE_ENGLISH_TERMS,
  LOCAL_EARLY_CAREER_TERMS,
  HIGH_PERFORMING_SECTORS
};

// Direct execution
if (require.main === module) {
  console.log('🌍 Starting Adzuna Multilingual Early-Career Scraper with Database Saving...\n');
  
  (async () => {
    try {
      const { createClient } = require('@supabase/supabase-js');
      // Local helpers to avoid ESM/CJS interop issues
      function localParseLocation(location) {
        const loc = String(location || '').toLowerCase();
        const isRemote = /\b(remote|work\s*from\s*home|wfh|anywhere|distributed|virtual)\b/i.test(loc);
        return { isRemote };
      }
      function convertToDatabaseFormat(job) {
        const { isRemote } = localParseLocation(job.location);
        const isEarly = classifyEarlyCareer(job);
        const job_hash = makeJobHash(job);
        const nowIso = new Date().toISOString();
        
        // Only save jobs that pass strict early-career filter (matching JobSpy quality)
        // If not early-career, skip this job entirely
        if (!isEarly) {
          return null; // Signal to filter out
        }
        
        return {
          job_hash,
          title: (job.title || '').trim(),
          company: (job.company || '').trim(),
          location: (job.location || '').trim(),
          description: (job.description || '').trim(),
          job_url: (job.url || '').trim(),
          source: (job.source || 'adzuna').trim(),
          posted_at: job.posted_at || nowIso,
          categories: ['early-career'], // Always early-career since we filter
          work_environment: isRemote ? 'remote' : 'on-site',
          experience_required: 'entry-level',
          original_posted_date: job.posted_at || nowIso,
          last_seen_at: nowIso,
          is_active: true,
          created_at: nowIso
        };
      }
      
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      const results = await scrapeAllCitiesCategories({ verbose: true });
      
      // Convert and deduplicate jobs by job_hash before saving
      // Respect remote exclusion preference
      const includeRemote = String(process.env.INCLUDE_REMOTE || '').toLowerCase() !== 'false' ? true : false;
      const filteredJobs = includeRemote ? results.jobs : results.jobs.filter(j => !localParseLocation(j.location).isRemote);
      const dbJobs = filteredJobs
        .map(job => {
          const dbJob = convertToDatabaseFormat(job);
          if (!dbJob) return null; // Filter out non-early-career jobs
          const { metadata, ...clean } = dbJob;
          return clean;
        })
        .filter(job => job !== null); // Remove null entries
      
      // Deduplicate by job_hash to prevent "cannot affect row a second time" error
      const uniqueJobs = dbJobs.reduce((acc, job) => {
        if (!acc.has(job.job_hash)) {
          acc.set(job.job_hash, job);
        }
        return acc;
      }, new Map());
      
      const finalJobs = Array.from(uniqueJobs.values());
      console.log(`🔍 Deduplication: ${dbJobs.length} → ${finalJobs.length} unique jobs by hash`);
      
      let savedCount = 0;
      let skippedCount = 0;
      const batchSize = 50;
      
      for (let i = 0; i < finalJobs.length; i += batchSize) {
        const batch = finalJobs.slice(i, i + batchSize);
        
        console.log(`💾 Saving batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(finalJobs.length/batchSize)} (${batch.length} jobs)...`);
        
        const { data, error } = await supabase
          .from('jobs')
          .upsert(batch, { onConflict: 'job_hash', ignoreDuplicates: true })
          .select('id');
        
        if (!error) {
          const inserted = Array.isArray(data) ? data.length : 0;
          const skipped = batch.length - inserted;
          savedCount += inserted;
          skippedCount += skipped;
          console.log(`✅ Inserted ${inserted}, Skipped ${skipped} (already in DB) - Cumulative: ${savedCount} new, ${skippedCount} existing`);
        } else {
          console.error('❌ Batch error:', error.message);
        }
      }
      
      // Print canonical success line for orchestrator with clear breakdown
      console.log(`\n📊 Adzuna Processing Complete:`);
      console.log(`   ✅ ${savedCount} NEW jobs saved to database`);
      console.log(`   ⏭️  ${skippedCount} jobs already existed (skipped duplicates)`);
      console.log(`   📈 Total processed: ${finalJobs.length} unique jobs`);
      console.log(`\n✅ Adzuna: ${savedCount} jobs processed`);
      recordScraperRun('adzuna', savedCount, Date.now() - scriptStart, scrapeErrors);
      
    } catch (error) {
      console.error('❌ Adzuna category scraping failed:', error.message);
      recordScraperRun('adzuna', 0, Date.now() - scriptStart, scrapeErrors + 1);
      process.exit(1);
    }
  })();
}
