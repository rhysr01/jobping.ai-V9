const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

// EU Cities (VERIFIED working endpoints only)
const EU_CITIES_CATEGORIES = [
  { name: 'London', country: 'gb' },    // ✅ High performer
  { name: 'Madrid', country: 'es' },    // ✅ High performer (prácticas goldmine)
  { name: 'Berlin', country: 'de' },    // ✅ Moderate performer
  { name: 'Amsterdam', country: 'nl' }, // ✅ Moderate performer
  { name: 'Paris', country: 'fr' },     // ✅ High performer (522 jobs)
  { name: 'Zurich', country: 'ch' },    // ✅ Moderate performer
  { name: 'Milan', country: 'it' },     // ✅ High performer (470 jobs)
  { name: 'Dublin', country: 'ie' }      // ✅ Added - English only (tech/finance hub)
  // REMOVED: Dublin ('ie' not supported by Adzuna - returns HTML error)
  // REMOVED: Brussels ('be' not supported by Adzuna - returns HTML error)
  // REMOVED: Rome (0 jobs across all searches)
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
  'ie': [] // English only set is CORE_ENGLISH_TERMS
};
// ADDED: 'ie' (Dublin) - English only terms
// REMOVED: 'be' (unsupported country codes)

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
    } else if (countryCode === 'de') {
      queries.push(`praktikum ${sector}`);    // German internship term
    } else if (countryCode === 'nl') {
      queries.push(`stage ${sector}`);        // Dutch internship term
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
    resultsPerPage = 25,
    maxDaysOld = 28, // Last 28 days for wider early-career coverage
    delay = 800,
    timeout = 15000,
    verbose = false
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
      const maxPages = 3; // Limit to 3 pages for speed
      
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
          
          allJobs.push(...transformedJobs);
          
          // Stop if we got fewer results than requested (last page)
          if (jobs.length < resultsPerPage) {
            hasMorePages = false;
          }
        } else {
          if (verbose) console.log(`   ⚠️  No jobs found for "${query}" (page ${page})`);
          hasMorePages = false;
        }
        
        page++;
        
        // Delay between requests (reduced from 1000ms to 500ms for speed)
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
    } catch (error) {
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
  const { verbose = false } = options;
  
  console.log(`🎓 Starting multilingual early-career job search across ${EU_CITIES_CATEGORIES.length} EU cities...`);
  console.log(`📅 Time range: Last 28 days for wider coverage`);
  console.log(`🌍 Languages: English + local terms per country`);
  console.log(`🏢 Target sectors: ${HIGH_PERFORMING_SECTORS.join(', ')}`);
  console.log(`📊 API Usage: ~${EU_CITIES_CATEGORIES.length * 15} calls (optimized for 250 daily limit)`);
  if (verbose) {
    console.log(`🔍 Core English terms: ${CORE_ENGLISH_TERMS.join(', ')}`);
  }
  
  const allJobs = [];
  let totalCityCount = 0;
  
  // Optional single-city filter via env CITY (matches by name, case-insensitive)
  const cityEnv = (process.env.CITY || '').trim().toLowerCase();
  const targetCities = cityEnv
    ? EU_CITIES_CATEGORIES.filter(c => c.name.toLowerCase() === cityEnv)
    : EU_CITIES_CATEGORIES;

  for (const city of targetCities) {
    try {
      const cityQueries = generateCityQueries(city.country);
      console.log(`\n🌍 Processing ${city.name} (${city.country.toUpperCase()}) - ${cityQueries.length} queries...`);
      
      const cityJobs = await scrapeCityCategories(city.name, city.country, cityQueries, options);
      
      if (cityJobs.length > 0) {
        allJobs.push(...cityJobs);
        console.log(`✅ ${city.name}: Found ${cityJobs.length} jobs`);
      } else {
        console.log(`⚠️  ${city.name}: No jobs found`);
      }
      
      totalCityCount++;
      
    } catch (error) {
      console.error(`❌ Failed to process ${city.name}:`, error.message);
    }
  }
  
  // Remove duplicates based on URL
  const uniqueJobs = allJobs.reduce((acc, job) => {
    const key = job.url || `${job.title}-${job.company}-${job.location}`;
    if (!acc.has(key)) {
      acc.set(key, job);
    }
    return acc;
  }, new Map());
  
  const finalJobs = Array.from(uniqueJobs.values());
  
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
      require('dotenv').config({ path: '.env.local' });
      const { createClient } = require('@supabase/supabase-js');
      // Local helpers to avoid ESM/CJS interop issues
      function localParseLocation(location) {
        const loc = String(location || '').toLowerCase();
        const isRemote = /\b(remote|work\s*from\s*home|wfh|anywhere|distributed|virtual)\b/i.test(loc);
        return { isRemote };
      }
      function localIsEarlyCareer(title, description) {
        const hay = `${title || ''} ${(description || '')}`.toLowerCase();
        const inc = /(graduate|new\s?grad|entry[-\s]?level|intern(ship)?|apprentice|early\s?career|junior|campus|working\sstudent|trainee|associate|analyst|coordinator|specialist|assistant|representative|consultant|researcher)/i;
        const excl = /(senior|staff|principal|lead|manager|director|head\b|vp\b|vice\s+president|chief|executive|c-level|cto|ceo|cfo|coo)/i;
        return inc.test(hay) && !excl.test(hay);
      }
      function localMakeJobHash(job) {
        const normalizedTitle = (job.title || '').toLowerCase().trim().replace(/\s+/g, ' ');
        const normalizedCompany = (job.company || '').toLowerCase().trim().replace(/\s+/g, ' ');
        const normalizedLocation = (job.location || '').toLowerCase().trim().replace(/\s+/g, ' ');
        const hashString = `${normalizedTitle}|${normalizedCompany}|${normalizedLocation}`;
        let hash = 0;
        for (let i = 0; i < hashString.length; i++) {
          const c = hashString.charCodeAt(i);
          hash = ((hash << 5) - hash) + c;
          hash |= 0;
        }
        return Math.abs(hash).toString(36);
      }
      function convertToDatabaseFormat(job) {
        const { isRemote } = localParseLocation(job.location);
        const isEarly = localIsEarlyCareer(job.title, job.description);
        const job_hash = localMakeJobHash(job);
        const nowIso = new Date().toISOString();
        return {
          job_hash,
          title: (job.title || '').trim(),
          company: (job.company || '').trim(),
          location: (job.location || '').trim(),
          description: (job.description || '').trim(),
          job_url: (job.url || '').trim(),
          source: (job.source || 'adzuna').trim(),
          posted_at: job.posted_at || nowIso,
          categories: [isEarly ? 'early-career' : 'experienced'],
          work_environment: isRemote ? 'remote' : 'on-site',
          experience_required: isEarly ? 'entry-level' : 'experienced',
          original_posted_date: job.posted_at || nowIso,
          last_seen_at: nowIso,
          is_active: true,
          created_at: nowIso
        };
      }
      
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      const results = await scrapeAllCitiesCategories({ verbose: true });
      
      // Convert and deduplicate jobs by job_hash before saving
      // Respect remote exclusion preference
      const includeRemote = String(process.env.INCLUDE_REMOTE || '').toLowerCase() !== 'false' ? true : false;
      const filteredJobs = includeRemote ? results.jobs : results.jobs.filter(j => !localParseLocation(j.location).isRemote);
      const dbJobs = filteredJobs.map(job => {
        const dbJob = convertToDatabaseFormat(job);
        const { metadata, ...clean } = dbJob;
        return clean;
      });
      
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
          savedCount += inserted;
          console.log(`✅ Inserted ${inserted} (cumulative ${savedCount}/${finalJobs.length})`);
        } else {
          console.error('❌ Batch error:', error.message);
        }
      }
      
      // Print canonical success line for orchestrator
      console.log(`\n✅ Adzuna Multilingual Early-Career: ${savedCount} jobs saved to database`);
      
    } catch (error) {
      console.error('❌ Adzuna category scraping failed:', error.message);
      process.exit(1);
    }
  })();
}
