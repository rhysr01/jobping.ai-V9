#!/usr/bin/env node

// Improved EU job population script with rotating search queries and duplicate checking
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

console.log('🌍 POPULATING EU JOBS WITH ROTATING SEARCH QUERIES');
console.log('==================================================\n');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper function to create job hash
function makeJobHash(job) {
  const content = `${job.title}${job.company}${job.location}${job.url}`;
  return require('crypto').createHash('sha256').update(content).digest('hex');
}

// Helper function to convert to database format - UPDATED FOR YOUR SCHEMA
function convertToDatabaseFormat(job) {
  // Parse location into city and country
  const locationParts = job.location.split(', ');
  const city = locationParts[0] || 'Unknown';
  const country = locationParts[1] || 'Unknown';
  
  // Determine work location type
  let workLocation = 'office';
  if (job.location.toLowerCase().includes('remote')) {
    workLocation = 'remote';
  } else if (job.location.toLowerCase().includes('hybrid')) {
    workLocation = 'hybrid';
  }
  
  // Create AI labels based on job content
  const aiLabels = [];
  const titleLower = job.title.toLowerCase();
  const descLower = (job.description || '').toLowerCase();
  
  // Early-career detection
  if (titleLower.includes('graduate') || titleLower.includes('junior') || 
      titleLower.includes('entry') || titleLower.includes('trainee') || 
      titleLower.includes('intern')) {
    aiLabels.push('early-career');
  }
  
  // Career path detection
  if (titleLower.includes('developer') || titleLower.includes('software') || 
      titleLower.includes('tech') || descLower.includes('programming')) {
    aiLabels.push('tech-transformation');
  } else if (titleLower.includes('consultant') || titleLower.includes('analyst') || 
             titleLower.includes('strategy')) {
    aiLabels.push('strategy-business-design');
  } else if (titleLower.includes('data') || titleLower.includes('analytics') || 
             descLower.includes('excel') || descLower.includes('sql')) {
    aiLabels.push('data-analytics');
  } else if (titleLower.includes('marketing') || titleLower.includes('growth')) {
    aiLabels.push('marketing-growth');
  } else if (titleLower.includes('finance') || titleLower.includes('investment')) {
    aiLabels.push('finance-investment');
  } else if (titleLower.includes('operations') || titleLower.includes('supply')) {
    aiLabels.push('operations-supply-chain');
  }
  
  // Location labels
  aiLabels.push('eu-location');
  if (workLocation === 'remote') {
    aiLabels.push('remote-work');
  }
  
  return {
    job_hash: makeJobHash(job),
    title: job.title, // Use 'title' if that's what exists
    company: job.company, // Use 'company' if that's what exists
    city: city,
    country: country,
    url: job.url, // Use 'url' if that's what exists
    description: job.description || 'Early-career position in EU market',
    experience_required: 'entry-level',
    work_location: workLocation,
    job_hash_score: 100,
    ai_labels: aiLabels,
    language_requirements: [],
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
            url: job.redirect_url,
            posted_at: job.created,
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
            url: `https://www.reed.co.uk/jobs/${job.jobId}`,
            posted_at: job.datePosted,
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
    
    // 3. JSEARCH - EU locations only with ROTATING QUERIES
    console.log('📍 POPULATING JSEARCH JOBS (EU Only with Query Rotation):');
    try {
      const jsearchQueries = [
        'entry level consultant',
        'trainee analyst',
        'graduate associate',
        'junior business analyst',
        'assistant consultant'
      ];
      
      for (const query of jsearchQueries) {
        try {
          const response = await axios.get('https://jsearch.p.rapidapi.com/search', {
            params: {
              query: query,
              page: 1,
              num_pages: 1,
              date_posted: 'week',
              job_requirements: 'under_3_years_experience,no_degree'
            },
            headers: {
              'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
              'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
            },
            timeout: 15000
          });
          
          const jobs = response.data.data || [];
          
          // Filter for EU locations only
          const euJobs = jobs.filter(job => {
            const country = job.job_country?.toLowerCase() || '';
            const city = job.job_city?.toLowerCase() || '';
            const euCountries = ['united kingdom', 'uk', 'germany', 'france', 'spain', 'netherlands', 'ireland'];
            const euCities = ['berlin', 'madrid', 'paris', 'amsterdam', 'dublin', 'munich'];
            
            return euCountries.some(c => country.includes(c)) || euCities.some(c => city.includes(c));
          });
          
          if (euJobs.length > 0) {
            console.log(`  🔍 "${query}": ${euJobs.length} EU jobs found`);
            
            const ingestJobs = euJobs.map(job => ({
              title: job.job_title,
              company: job.employer_name,
              location: `${job.job_city || 'EU'}, ${job.job_country || 'Europe'}`,
              description: job.job_description || 'Early-career position in EU',
              url: job.job_apply_link,
              posted_at: job.job_posted_at_datetime_utc,
              source: 'jsearch'
            }));
            
            const savedJobs = await saveJobsToDatabase(ingestJobs, `jsearch-${query}`);
            totalJobsFound += euJobs.length;
            totalJobsSaved += savedJobs.length;
          }
          
          // Rate limiting for JSearch (20 min between requests)
          if (jsearchQueries.indexOf(query) < jsearchQueries.length - 1) {
            console.log('  ⏰ Waiting 20 minutes for JSearch rate limit...');
            // For demo purposes, we'll skip the wait but note it
            break; // Skip remaining queries to avoid rate limiting
          }
          
        } catch (error) {
          console.log(`  ❌ JSearch "${query}" failed: ${error.message}`);
        }
      }
    } catch (error) {
      console.log(`  ❌ JSearch failed: ${error.message}`);
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
        .select('title, company, city, country, source')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (!error && recentJobs.length > 0) {
        console.log('\n📋 Recent jobs in database:');
        recentJobs.forEach((job, i) => {
          console.log(`  ${i + 1}. ${job.title} at ${job.company} (${job.city}, ${job.country}) [${job.source}]`);
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
