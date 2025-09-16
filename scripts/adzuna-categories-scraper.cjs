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
  { name: 'Milan', country: 'it' }      // ✅ High performer (470 jobs)
  // REMOVED: Dublin ('ie' not supported by Adzuna - returns HTML error)
  // REMOVED: Brussels ('be' not supported by Adzuna - returns HTML error)
  // REMOVED: Rome (0 jobs across all searches)
];

// Core English early-career terms (PRIORITIZED - internships first)
const CORE_ENGLISH_TERMS = [
  // 🥇 HIGHEST PRIORITY: Internship terms (100% early-career)
  'internship',
  'intern',
  'summer internship',
  'graduate internship', 
  'business internship',
  
  // 🥈 HIGH PRIORITY: Graduate/trainee terms  
  'graduate programme',
  'graduate program', 
  'graduate analyst',
  'trainee',
  'management trainee',
  'graduate trainee',
  
  // 🥉 GOOD: Entry-level terms
  'junior associate',
  'entry level',
  'early careers'
];

// Local language terms by country (VERIFIED working countries only)
const LOCAL_EARLY_CAREER_TERMS = {
  'gb': ['graduate scheme', 'graduate trainee', 'junior role', 'entry level position', 'campus hire'],
  'es': ['programa de graduados', 'becario', 'prácticas', 'junior', 'recién graduado', 'nivel inicial'],
  'de': ['absolvent', 'trainee', 'praktikant', 'junior', 'berufseinsteiger', 'nachwuchskraft'],
  'nl': ['afgestudeerde', 'traineeship', 'starter', 'junior', 'beginnend', 'werkstudent'],
  'fr': ['jeune diplômé', 'stagiaire', 'alternance', 'junior', 'débutant', 'programme graduate'],
  'ch': ['absolvent', 'trainee', 'praktikant', 'junior', 'einstiegsstelle', 'nachwuchs'],
  'it': ['neolaureato', 'stage', 'tirocinio', 'junior', 'primo lavoro', 'laureato']
};
// REMOVED: 'ie' and 'be' (unsupported country codes)

// Target sectors for IE graduates
// Target sectors (ULTRA-LEAN - only verified performers across multiple cities)
const HIGH_PERFORMING_SECTORS = [
  'finance',         // ✅ Proven: junior finance (9 jobs Madrid), prácticas finance (8 jobs Madrid)
  'strategy',        // ✅ Proven: prácticas strategy (7 jobs Madrid), strategy consultant (15 jobs Paris)
  'marketing',       // ✅ Proven: prácticas marketing (24 jobs Madrid!)
  'operations',      // ✅ Proven: prácticas operations (10 jobs Madrid)
  'commercial',      // ✅ Good performer in London
  'business'         // ✅ Good performer in London
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
  
  return [...new Set(queries)]; // Remove duplicates
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
      
      // Search only page 1 for each query to avoid too many duplicates
      const url = `https://api.adzuna.com/v1/api/jobs/${countryCode}/search/1?app_id=${appId}&app_key=${appKey}&what=${encodeURIComponent(query)}&where=${encodeURIComponent(cityName)}&results_per_page=${resultsPerPage}&sort_by=date&max_days_old=${maxDaysOld}`;
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        },
        timeout
      });

      const jobs = response.data.results || [];
      
      if (jobs.length > 0) {
        if (verbose) console.log(`   ✅ Found ${jobs.length} jobs for "${query}"`);
        
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
      } else {
        if (verbose) console.log(`   ⚠️  No jobs found for "${query}"`);
      }
      
      // Delay between requests
      await new Promise(resolve => setTimeout(resolve, delay));
      
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
  if (verbose) {
    console.log(`🔍 Core English terms: ${CORE_ENGLISH_TERMS.join(', ')}`);
  }
  
  const allJobs = [];
  let totalCityCount = 0;
  
  for (const city of EU_CITIES_CATEGORIES) {
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
      const { convertToDatabaseFormat, makeJobHash } = require('../scrapers/utils.js');
      
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      const results = await scrapeAllCitiesCategories({ verbose: true });
      
      // Convert and deduplicate jobs by job_hash before saving
      const dbJobs = results.jobs.map(job => {
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
        
        const { error } = await supabase
          .from('jobs')
          .upsert(batch, { onConflict: 'job_hash', ignoreDuplicates: false });
        
        if (!error) {
          savedCount += batch.length;
          console.log(`✅ Saved ${savedCount}/${finalJobs.length} jobs`);
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
