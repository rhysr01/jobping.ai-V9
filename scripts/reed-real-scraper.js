#!/usr/bin/env node

// 🎯 REED REAL SCRAPER - Gets actual jobs from Reed API

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

console.log('🎯 REED REAL SCRAPER - Getting Actual Jobs\n');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Reed API Configuration - Expanded UK cities + Dublin
const REED_CONFIG = {
  baseUrl: 'https://www.reed.co.uk/api/1.0/search',
  apiKey: process.env.REED_API_KEY,
  cities: [
    // Major UK cities
    'London', 'Manchester', 'Birmingham', 'Edinburgh', 'Glasgow',
    // Additional UK cities with jobs
    'Leeds', 'Cardiff', 'Cambridge', 'Oxford',
    // EU cities (Ireland)
    'Dublin'
  ],
  queries: [
    'graduate analyst',
    'junior consultant', 
    'entry level analyst',
    'trainee consultant',
    'assistant analyst'
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
  
  for (const job of jobs) {
    try {
      const jobData = {
        job_hash: makeJobHash(job),
        title: job.title,
        company: job.company,
        location: job.location,
        job_url: job.url,
        description: job.description,
        source: 'reed',
        status: 'active',
        is_sent: false,
        created_at: new Date().toISOString(),
        posted_at: job.posted_at || new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('jobs')
        .upsert(jobData, { 
          onConflict: 'job_hash',
          ignoreDuplicates: true 
        })
        .select();
      
      if (error) {
        console.log(`  ❌ Save failed: ${job.title} - ${error.message}`);
      } else if (data && data.length > 0) {
        savedJobs.push(job);
        console.log(`  ✅ Saved: ${job.title} at ${job.company}`);
      }
    } catch (err) {
      console.log(`  ❌ Save failed: ${job.title} - ${err.message}`);
    }
  }
  
  return savedJobs;
}

// Main scraping function
async function scrapeReedJobs() {
  try {
    if (!REED_CONFIG.apiKey) {
      console.error('❌ REED_API_KEY not found in environment variables');
      return;
    }
    
    console.log('✅ Reed API key found');
    console.log(`📍 Scraping ${REED_CONFIG.cities.length} UK cities`);
    console.log(`🔍 Using ${REED_CONFIG.queries.length} search queries\n`);
    
    let totalJobsFound = 0;
    let totalJobsSaved = 0;
    
    for (const city of REED_CONFIG.cities) {
      console.log(`📍 Scraping ${city}...`);
      
      for (const query of REED_CONFIG.queries) {
        try {
          const url = REED_CONFIG.baseUrl;
          const params = {
            keywords: query,
            locationName: city,
            distanceFromLocation: 10,
            resultsToTake: 10
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
              .map(job => ({
                title: job.jobTitle,
                company: job.employerName,
                location: `${city}, UK`,
                description: job.jobDescription || 'Early-career position',
                url: job.jobUrl,
                posted_at: job.datePosted
              }))
              .filter(job => isEarlyCareer(job));
            
            console.log(`  ✅ ${ingestJobs.length} early-career jobs after filtering`);
            
            if (ingestJobs.length > 0) {
              const savedJobs = await saveJobsToDatabase(ingestJobs);
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
      }
      
      console.log(`✅ ${city} complete\n`);
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

// Run the scraper
scrapeReedJobs().then(() => {
  console.log('\n🎯 Reed real scraper completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Scraper error:', error);
  process.exit(1);
});
