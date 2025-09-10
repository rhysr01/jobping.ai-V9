#!/usr/bin/env node

// Minimal EU job population script using only existing database fields
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { normalize } = require('../scrapers/utils.js');

console.log('🌍 POPULATING EU JOBS (MINIMAL VERSION)');
console.log('========================================\n');

// DRY_RUN support
const DRY_RUN = process.env.DRY_RUN === 'true';
if (DRY_RUN) {
  console.log('🧪 DRY RUN MODE - No jobs will be saved to database\n');
}

// Freshness cutoff to avoid processing old jobs
const FRESHNESS_DAYS = +(process.env.FRESHNESS_DAYS || 28);
const FRESHNESS_CUTOFF = Date.now() - FRESHNESS_DAYS * 24 * 60 * 60 * 1000;
console.log(`📅 Freshness cutoff: ${FRESHNESS_DAYS} days (${new Date(FRESHNESS_CUTOFF).toISOString()})\n`);

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Batch upsert function for performance
async function upsertBatched(supabase, rows, size = 150) {
  for (let i = 0; i < rows.length; i += size) {
    const batch = rows.slice(i, i + size);
    const { error } = await supabase
      .from('jobs')
      .upsert(batch, { onConflict: 'dedupe_key' });
    if (error) throw error;
  }
}

// Helper function to create job hash
function makeJobHash(job) {
  const content = `${job.title}${job.company}${job.location}`;
  return require('crypto').createHash('sha256').update(content).digest('hex');
}

// Use the canonical normalize function from utils
function convertToDatabaseFormat(job) {
  return normalize(job, 'adzuna');
}

// Helper function to save jobs to database with duplicate checking
async function saveJobsToDatabase(jobs, source) {
  const savedJobs = [];
  const newJobs = [];
  const existingJobs = [];
  
  console.log(`🔍 Checking ${jobs.length} ${source} jobs for duplicates...`);
  
  for (const job of jobs) {
    try {
      const jobHash = makeJobHash(job);
      
      // Check if job already exists
      const { data: existingJob, error: checkError } = await supabase
        .from('jobs')
        .select('job_hash')
        .eq('job_hash', jobHash)
        .single();
      
      if (existingJob) {
        existingJobs.push(job);
      } else {
        newJobs.push(job);
      }
    } catch (err) {
      // Job doesn't exist, treat as new
      newJobs.push(job);
    }
  }
  
  console.log(`  📊 Found: ${newJobs.length} new jobs, ${existingJobs.length} existing`);
  
  if (newJobs.length === 0) {
    console.log(`  ⚠️ No new jobs found for ${source} - all jobs already exist`);
    return [];
  }
  
  console.log(`💾 Processing ${newJobs.length} new ${source} jobs...`);
  
  // Convert all jobs to database format
  const dbJobs = [];
  for (const job of newJobs) {
    try {
      const dbJob = convertToDatabaseFormat(job);
      dbJobs.push(dbJob);
    } catch (err) {
      console.log(`  ❌ Failed to normalize job: ${job.title} - ${err.message}`);
    }
  }
  
  if (dbJobs.length === 0) {
    console.log(`  ⚠️ No valid jobs to save for ${source}`);
    return [];
  }
  
  if (DRY_RUN) {
    console.log(`  🧪 DRY RUN: Would save ${dbJobs.length} jobs to database`);
    console.log('Sample job:', JSON.stringify(dbJobs[0], null, 2));
    return dbJobs;
  }
  
  try {
    // Use batch upsert for performance
    await upsertBatched(supabase, dbJobs);
    console.log(`  ✅ Successfully upserted ${dbJobs.length} ${source} jobs`);
    return dbJobs;
  } catch (error) {
    console.log(`  ❌ Batch upsert failed: ${error.message}`);
    return [];
  }
}

async function populateEUJobs() {
  try {
    let totalJobsFound = 0;
    let totalJobsSaved = 0;
    
    // 1. ADZUNA - Multiple EU cities with ROTATING SEARCH QUERIES
    console.log('📍 POPULATING ADZUNA JOBS (EU Cities with Query Rotation):');
    
    // Quota management for Adzuna
    const MAX_ADZUNA_CALLS = +(process.env.ADZUNA_MAX_CALLS || 40);
    let adzunaCallsUsed = 0;
    
    // IMPROVEMENT #1: Query Rotation - Different queries each hour for variety
    const QUERY_ROTATION = {
      'es': ['becario', 'prácticas', 'junior analyst', 'graduate', 'trainee'],
      'de': ['praktikant', 'werkstudent', 'trainee', 'junior consultant', 'absolvent'],
      'nl': ['stagiair', 'starter', 'trainee', 'junior analyst', 'graduate'],
      'fr': ['stagiaire', 'alternance', 'junior', 'jeune diplômé', 'débutant'],
      'ie': ['graduate', 'graduate scheme', 'junior analyst', 'trainee', 'entry level'],
      'se': ['praktik', 'trainee', 'junior', 'nyexaminerad', 'graduate'],
      'dk': ['praktikant', 'trainee', 'junior', 'nyuddannet', 'graduate'],
      'gb': ['graduate', 'graduate programme', 'junior analyst', 'trainee', 'entry level'],
      'ch': ['praktikant', 'trainee', 'junior analyst', 'absolvent', 'graduate'],
      'at': ['praktikant', 'trainee', 'junior', 'berufseinsteiger', 'absolvent'],
      'be': ['stagiaire', 'stage', 'junior', 'starter', 'graduate']
    };
    
    // Get rotating query based on hour
    const hourIndex = new Date().getHours();
    
    // IMPROVEMENT #2: Better city configuration with proper country codes
    const adzunaCities = [
      { city: 'Madrid', country: 'es', countryCode: 'ES' },
      { city: 'Berlin', country: 'de', countryCode: 'DE' },
      { city: 'Amsterdam', country: 'nl', countryCode: 'NL' },
      { city: 'Paris', country: 'fr', countryCode: 'FR' },
      { city: 'Dublin', country: 'ie', countryCode: 'IE' },
      { city: 'Munich', country: 'de', countryCode: 'DE' },
      { city: 'Stockholm', country: 'se', countryCode: 'SE' },
      { city: 'Copenhagen', country: 'dk', countryCode: 'DK' },
      { city: 'London', country: 'gb', countryCode: 'GB' },
      { city: 'Zurich', country: 'ch', countryCode: 'CH' },
      { city: 'Vienna', country: 'at', countryCode: 'AT' },
      { city: 'Brussels', country: 'be', countryCode: 'BE' }
    ];
    
    for (const cityConfig of adzunaCities) {
      try {
        // Check quota before making API call
        if (adzunaCallsUsed >= MAX_ADZUNA_CALLS) {
          console.log(`  ⚠️ Adzuna quota exhausted (${adzunaCallsUsed}/${MAX_ADZUNA_CALLS}), skipping remaining cities`);
          break;
        }
        
        // IMPROVEMENT #3: Query-level filtering with rotation
        const queries = QUERY_ROTATION[cityConfig.country] || ['graduate'];
        const query = queries[hourIndex % queries.length];
        
        // Add business focus terms for better results
        const businessTerms = ['analyst', 'consultant', 'business', 'finance', 'marketing'];
        const businessFocus = businessTerms[hourIndex % businessTerms.length];
        const enhancedQuery = `${query} ${businessFocus}`;
        
        const url = `https://api.adzuna.com/v1/api/jobs/${cityConfig.country}/search/1?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_APP_KEY}&results_per_page=20&what=${encodeURIComponent(enhancedQuery)}&where=${encodeURIComponent(cityConfig.city)}&sort_by=date`;
        
        const response = await axios.get(url, { timeout: 10000 });
        adzunaCallsUsed++;
        const jobs = response.data.results || [];
        
        if (jobs.length > 0) {
          console.log(`  📍 ${cityConfig.city} (${query}): ${jobs.length} jobs found`);
          
          // Filter by freshness cutoff
          const freshJobs = jobs.filter(job => {
            const postedAt = new Date(job.created).getTime();
            return postedAt > FRESHNESS_CUTOFF;
          });
          
          if (freshJobs.length < jobs.length) {
            console.log(`  📅 Filtered to ${freshJobs.length} fresh jobs (${jobs.length - freshJobs.length} too old)`);
          }
          
          const ingestJobs = freshJobs.map(job => ({
            title: job.title,
            company: job.company.display_name,
            location: `${cityConfig.city}, ${job.location.display_name}`,
            description: job.description || 'Early-career position',
            url: job.redirect_url,
            posted_at: job.created,
            source: 'adzuna',
            // Add country code for proper database storage
            country: cityConfig.countryCode,
            city: cityConfig.city
          }));
          
          const savedJobs = await saveJobsToDatabase(ingestJobs, cityConfig.city);
          totalJobsFound += freshJobs.length;
          totalJobsSaved += savedJobs.length;
          
          // Show sample jobs
          if (savedJobs.length > 0) {
            savedJobs.slice(0, 2).forEach(job => {
              console.log(`    ✅ ${job.title} at ${job.company}`);
            });
          }
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`  ❌ ${cityConfig.city} failed: ${error.message}`);
      }
    }
    
    console.log(`\n📊 ADZUNA SUMMARY:`);
    console.log(`  API calls used: ${adzunaCallsUsed}/${MAX_ADZUNA_CALLS}`);
    console.log(`  Total jobs found: ${totalJobsFound}`);
    console.log(`  Total jobs saved: ${totalJobsSaved}`);
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 2. REED - UK cities (non-London) with ROTATING SEARCH QUERIES
    console.log('📍 POPULATING REED JOBS (UK Cities with Query Rotation):');
    const reedCities = ['Manchester', 'Birmingham', 'Edinburgh', 'Glasgow', 'Leeds', 'Dublin'];
    
    // IMPROVEMENT: Better query rotation for Reed
    const reedQueries = [
      'graduate analyst',
      'graduate scheme',
      'junior consultant',
      'trainee',
      'entry level analyst',
      'business graduate'
    ];
    
    for (let i = 0; i < reedCities.length; i++) {
      const city = reedCities[i];
      // Use hour-based rotation for variety across runs
      const queryIndex = (hourIndex + i) % reedQueries.length;
      const query = reedQueries[queryIndex];
      
      try {
        const url = `https://www.reed.co.uk/api/1.0/search?keywords=${encodeURIComponent(query)}&locationName=${encodeURIComponent(city)}&distanceFromLocation=10&resultsToTake=15`;
        
        const response = await axios.get(url, {
          headers: {
            'Authorization': `Basic ${Buffer.from(process.env.REED_API_KEY + ':').toString('base64')}`,
            'User-Agent': 'JobPing/1.0'
          },
          timeout: 10000
        });
        
        const jobs = response.data.results || [];
        
        if (jobs.length > 0) {
          console.log(`  📍 ${city} (${query}): ${jobs.length} jobs found`);
          
          const ingestJobs = jobs.map(job => ({
            title: job.jobTitle,
            company: job.employerName,
            location: `${city}, ${job.locationName}`,
            description: job.jobDescription || 'Graduate program position',
            source: 'reed',
            url: job.jobUrl,
            posted_at: job.datePosted,
            // Fix country mapping
            country: city === 'Dublin' ? 'IE' : 'GB',
            city: city
          }));
          
          const savedJobs = await saveJobsToDatabase(ingestJobs, city);
          totalJobsFound += jobs.length;
          totalJobsSaved += savedJobs.length;
          
          // Show sample jobs
          if (savedJobs.length > 0) {
            savedJobs.slice(0, 2).forEach(job => {
              console.log(`    ✅ ${job.title} at ${job.company}`);
            });
          }
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.log(`  ❌ ${city} failed: ${error.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // FINAL SUMMARY
    console.log('🎉 EU JOB POPULATION COMPLETE!');
    console.log('================================');
    console.log(`📊 Total jobs found: ${totalJobsFound}`);
    console.log(`💾 Total NEW jobs saved: ${totalJobsSaved}`);
    console.log(`🌍 Cities covered: Madrid, Berlin, Amsterdam, Paris, Dublin, Munich, Stockholm, Copenhagen, Manchester, Birmingham, Edinburgh, Glasgow`);
    console.log(`✅ Your database now has fresh non-London EU jobs!`);
    
    // Show some stats from database
    try {
      const { data: recentJobs, error } = await supabase
        .from('jobs')
        .select('title, company, city, country')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (!error && recentJobs.length > 0) {
        console.log('\n📋 Recent jobs in database:');
        recentJobs.forEach((job, i) => {
          console.log(`  ${i + 1}. ${job.title} at ${job.company} (${job.city}, ${job.country})`);
        });
      }
    } catch (dbError) {
      console.log('  ⚠️ Could not fetch recent jobs from database');
    }
    
  } catch (error) {
    console.error('❌ Error in EU job population:', error);
    process.exit(1);
  }
}

// Add error handlers and exit codes
process.on('unhandledRejection', (e) => {
  console.error('[unhandled]', e);
  process.exit(1);
});

process.on('uncaughtException', (e) => {
  console.error('[uncaught]', e);
  process.exit(1);
});

// Run the population with proper exit handling
async function main() {
  const startTime = Date.now();
  let totalJobsFound = 0;
  let totalJobsSaved = 0;
  
  try {
    await populateEUJobs();
    const duration = Date.now() - startTime;
    console.log(`\n[scraper] source=adzuna found=${totalJobsFound} saved=${totalJobsSaved} dry=${DRY_RUN} duration_ms=${duration}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Main execution failed:', error);
    process.exit(1);
  }
}

main();
