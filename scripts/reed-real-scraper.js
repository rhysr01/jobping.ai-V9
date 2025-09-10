#!/usr/bin/env node

// 🎯 REED REAL SCRAPER - Gets actual jobs from Reed API

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const { normalize } = require('../scrapers/utils.js');

console.log('🎯 REED REAL SCRAPER - Getting Actual Jobs\n');

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

// Reed API Configuration - Expanded UK cities + Dublin
// IMPROVEMENT #1: Query rotation for variety
const REED_QUERY_ROTATION = [
  'graduate analyst',
  'graduate scheme',
  'junior consultant',
  'trainee',
  'entry level analyst',
  'business graduate',
  'management trainee',
  'junior business analyst'
];

// IMPROVEMENT #2: Better city configuration with country codes
const REED_CONFIG = {
  baseUrl: 'https://www.reed.co.uk/api/1.0/search',
  apiKey: process.env.REED_API_KEY,
  cities: [
    // Major UK cities with country codes
    { city: 'London', country: 'GB' },
    { city: 'Manchester', country: 'GB' },
    { city: 'Birmingham', country: 'GB' },
    { city: 'Edinburgh', country: 'GB' },
    { city: 'Glasgow', country: 'GB' },
    { city: 'Leeds', country: 'GB' },
    { city: 'Bristol', country: 'GB' },
    { city: 'Cardiff', country: 'GB' },
    { city: 'Cambridge', country: 'GB' },
    { city: 'Oxford', country: 'GB' },
    // EU cities (Ireland)
    { city: 'Dublin', country: 'IE' },
    { city: 'Cork', country: 'IE' }
  ]
};

// Helper function to create job hash
function makeJobHash(job) {
  const content = `${job.title}${job.company}${job.location}`;
  return crypto.createHash('sha256').update(content).digest('hex');
}

// Helper function to classify early career and filter out remote jobs
function isEarlyCareer(job) {
  const text = `${job.title} ${job.description}`.toLowerCase();
  
  // Exclude remote jobs
  const remoteKeywords = ['remote', 'work from home', 'wfh', 'hybrid', 'flexible'];
  const isRemote = remoteKeywords.some(keyword => text.includes(keyword));
  if (isRemote) {
    return false;
  }
  
  const earlyCareerKeywords = [
    'graduate', 'new grad', 'entry level', 'intern', 'internship',
    'apprentice', 'early career', 'junior', 'campus', 'working student',
    'associate', 'assistant', 'trainee'
  ];
  
  const seniorKeywords = [
    'senior', 'staff', 'principal', 'lead', 'manager', 'director', 'head'
  ];
  
  const hasEarlyCareer = earlyCareerKeywords.some(keyword => text.includes(keyword));
  const hasSenior = seniorKeywords.some(keyword => text.includes(keyword));
  
  return hasEarlyCareer && !hasSenior;
}

// Helper function to save jobs to database
async function saveJobsToDatabase(jobs) {
  const savedJobs = [];
  
  // Convert all jobs to database format
  const dbJobs = [];
  for (const job of jobs) {
    try {
      // Filter by freshness cutoff
      const postedAt = new Date(job.datePosted).getTime();
      if (postedAt < FRESHNESS_CUTOFF) {
        continue; // Skip old jobs
      }
      
      const normalizedJob = normalize({
        title: job.jobTitle,
        company: job.employerName,
        location: job.locationName,
        description: job.jobDescription,
        url: job.jobUrl,
        posted_at: job.datePosted
      }, 'reed');
      
      dbJobs.push(normalizedJob);
    } catch (err) {
      console.log(`  ❌ Failed to normalize job: ${job.jobTitle} - ${err.message}`);
    }
  }
  
  if (dbJobs.length === 0) {
    console.log(`  ⚠️ No fresh jobs to save for Reed`);
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
    console.log(`  ✅ Successfully upserted ${dbJobs.length} Reed jobs`);
    return dbJobs;
  } catch (error) {
    console.log(`  ❌ Batch upsert failed: ${error.message}`);
    return [];
  }
}

// Main scraping function
async function scrapeReedJobs() {
  try {
    if (!REED_CONFIG.apiKey) {
      console.error('❌ REED_API_KEY not found in environment variables');
      return;
    }
    
    console.log('✅ Reed API key found');
    console.log(`📍 Scraping ${REED_CONFIG.cities.length} cities`);
    console.log(`🔍 Using ${REED_QUERY_ROTATION.length} rotating queries\n`);
    
    let totalJobsFound = 0;
    let totalJobsSaved = 0;
    
    // IMPROVEMENT #3: Hour-based query rotation
    const hourIndex = new Date().getHours();
    
    for (let i = 0; i < REED_CONFIG.cities.length; i++) {
      const cityConfig = REED_CONFIG.cities[i];
      console.log(`📍 Scraping ${cityConfig.city} (${cityConfig.country})...`);
      
      // Rotate queries based on hour and city index for variety
      const query = REED_QUERY_ROTATION[(hourIndex + i) % REED_QUERY_ROTATION.length];
      
      try {
          const url = REED_CONFIG.baseUrl;
          const params = {
            keywords: query,
            locationName: cityConfig.city,
            distanceFromLocation: 15,
            resultsToTake: 20,
            sortBy: 'date'
          };
          
          const response = await axios.get(url, {
            params,
            headers: {
              'Authorization': `Basic ${Buffer.from(REED_CONFIG.apiKey + ':').toString('base64')}`,
              'User-Agent': 'JobPing/1.0'
            },
            timeout: 10000
          });
          
          const jobs = response.data.results || [];
          
          if (jobs.length > 0) {
            console.log(`  🔍 "${query}": ${jobs.length} jobs found`);
            
            // Convert to our format and filter for early career
            const ingestJobs = jobs
              .filter(job => job.jobTitle && job.employerName) // Filter out jobs with missing required fields
              .map(job => ({
                title: job.jobTitle,
                company: job.employerName,
                location: `${cityConfig.city}, ${cityConfig.country === 'IE' ? 'Ireland' : 'UK'}`,
                description: job.jobDescription || 'Early-career position',
                url: job.jobUrl,
                posted_at: job.datePosted,
                // Add country and city for proper normalization
                country: cityConfig.country,
                city: cityConfig.city
              }))
              .filter(job => isEarlyCareer(job));
            
            console.log(`  ✅ ${ingestJobs.length} early-career jobs after filtering`);
            
            if (ingestJobs.length > 0) {
              const savedJobs = await saveJobsToDatabase(jobs.filter(job => job.jobTitle && job.employerName));
              totalJobsFound += jobs.length;
              totalJobsSaved += savedJobs.length;
              
              // Show sample jobs
              savedJobs.slice(0, 2).forEach(job => {
                console.log(`    📋 ${job.title} at ${job.company}`);
              });
            }
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
          
      } catch (error) {
        console.log(`  ❌ "${query}" failed: ${error.message}`);
      }
      
      console.log(`✅ ${cityConfig.city} complete\n`);
    }
    
    console.log('🎉 REED SCRAPING COMPLETE');
    console.log('========================');
    console.log(`📊 Total jobs found: ${totalJobsFound}`);
    console.log(`💾 Total jobs saved: ${totalJobsSaved}`);
    console.log(`🏢 Cities processed: ${REED_CONFIG.cities.length}`);
    console.log(`🔍 Queries used: ${REED_CONFIG.queries.length}`);
    
  } catch (error) {
    console.error('❌ Reed scraping failed:', error.message);
  }
}

// Add error handlers
process.on('unhandledRejection', (e) => {
  console.error('[unhandled]', e);
  process.exit(1);
});

process.on('uncaughtException', (e) => {
  console.error('[uncaught]', e);
  process.exit(1);
});

// Run the scraper with proper exit handling
async function main() {
  const startTime = Date.now();
  let totalJobsFound = 0;
  let totalJobsSaved = 0;
  
  try {
    await scrapeReedJobs();
    const duration = Date.now() - startTime;
    console.log(`\n[scraper] source=reed found=${totalJobsFound} saved=${totalJobsSaved} dry=${DRY_RUN} duration_ms=${duration}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Main execution failed:', error);
    process.exit(1);
  }
}

main();
