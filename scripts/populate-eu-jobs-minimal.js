#!/usr/bin/env node

// Minimal EU job population script using only existing database fields
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

console.log('🌍 POPULATING EU JOBS (MINIMAL VERSION)');
console.log('========================================\n');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper function to create job hash
function makeJobHash(job) {
  const content = `${job.title}${job.company}${job.location}`;
  return require('crypto').createHash('sha256').update(content).digest('hex');
}

// Helper function to convert to database format - MINIMAL VERSION
function convertToDatabaseFormat(job) {
  // Parse location into city and country
  const locationParts = job.location.split(', ');
  const city = locationParts[0] || 'Unknown';
  const country = locationParts[1] || 'Unknown';
  
  return {
    job_hash: makeJobHash(job),
    title: job.title,
    company: job.company,
    city: city,
    country: country,
    location: job.location, // Add the location field
    job_url: `https://jobping.com/job/${makeJobHash(job)}`, // Add a placeholder job_url
    source: job.source || 'scraper', // Add the source field
    description: job.description || 'Early-career position in EU market',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
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
  
  console.log(`💾 Saving ${newJobs.length} new ${source} jobs to database...`);
  
  for (const job of newJobs) {
    try {
      const dbJob = convertToDatabaseFormat(job);
      const { data, error } = await supabase
        .from('jobs')
        .insert(dbJob);
      
      if (!error) {
        savedJobs.push(job);
        console.log(`  ✅ NEW JOB SAVED: ${job.title} at ${job.company} (${job.location})`);
      } else {
        console.log(`  ❌ Save failed: ${job.title} - ${error.message}`);
      }
    } catch (err) {
      console.log(`  ❌ Save failed: ${job.title} - ${err.message}`);
    }
  }
  
  return savedJobs;
}

async function populateEUJobs() {
  try {
    let totalJobsFound = 0;
    let totalJobsSaved = 0;
    
    // 1. ADZUNA - Multiple EU cities with ROTATING SEARCH QUERIES
    console.log('📍 POPULATING ADZUNA JOBS (EU Cities with Query Rotation):');
    const adzunaCities = [
      { city: 'Madrid', country: 'es', query: 'entry level analyst' },
      { city: 'Berlin', country: 'de', query: 'trainee developer' },
      { city: 'Amsterdam', country: 'nl', query: 'associate consultant' },
      { city: 'Paris', country: 'fr', query: 'graduate analyst' },
      { city: 'Dublin', country: 'ie', query: 'junior data scientist' },
      { city: 'Munich', country: 'de', query: 'entry level engineer' },
      { city: 'Stockholm', country: 'se', query: 'graduate trainee' },
      { city: 'Copenhagen', country: 'dk', query: 'junior business analyst' }
    ];
    
    for (const cityConfig of adzunaCities) {
      try {
        const url = `https://api.adzuna.com/v1/api/jobs/${cityConfig.country}/search/1?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_APP_KEY}&results_per_page=10&what=${encodeURIComponent(cityConfig.query)}&where=${encodeURIComponent(cityConfig.city)}`;
        
        const response = await axios.get(url, { timeout: 10000 });
        const jobs = response.data.results || [];
        
        if (jobs.length > 0) {
          console.log(`  📍 ${cityConfig.city}: ${jobs.length} jobs found`);
          
          const ingestJobs = jobs.map(job => ({
            title: job.title,
            company: job.company.display_name,
            location: `${cityConfig.city}, ${job.location.display_name}`,
            description: job.description || 'Early-career position',
            source: 'adzuna'
          }));
          
          const savedJobs = await saveJobsToDatabase(ingestJobs, cityConfig.city);
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
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`  ❌ ${cityConfig.city} failed: ${error.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 2. REED - UK cities (non-London) with ROTATING SEARCH QUERIES
    console.log('📍 POPULATING REED JOBS (UK Cities with Query Rotation):');
    const reedCities = ['Manchester', 'Birmingham', 'Edinburgh', 'Glasgow'];
    
    // Rotate through different search terms for each city
    const reedQueries = [
      'entry level analyst',
      'trainee consultant', 
      'graduate scheme',
      'junior associate',
      'assistant analyst'
    ];
    
    for (let i = 0; i < reedCities.length; i++) {
      const city = reedCities[i];
      const query = reedQueries[i % reedQueries.length]; // Rotate queries
      
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
            source: 'reed'
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
  }
}

// Run the population
populateEUJobs();
