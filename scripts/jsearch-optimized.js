#!/usr/bin/env node

// 🎯 JSEARCH OPTIMIZED SCRAPER - Cost-Efficient Approach
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { normalize } = require('../scrapers/utils.js');
require('dotenv').config({ path: '.env.local' });

console.log('🎯 JSEARCH OPTIMIZED SCRAPER - Cost-Efficient Approach\n');

// DRY_RUN support
const DRY_RUN = process.env.DRY_RUN === 'true';
if (DRY_RUN) {
  console.log('🧪 DRY RUN MODE - No jobs will be saved to database\n');
}

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Optimized JSearch Configuration - No unnecessary rate limiting
const JSEARCH_CONFIG = {
    baseUrl: 'https://jsearch.p.rapidapi.com/search',
    apiKey: process.env.RAPIDAPI_KEY,
    requestInterval: 1000, // 1 second between requests (minimal, just to be polite)
    maxRequests: 12, // Reduced limit for faster execution
    resultsPerPage: 10,
    datePosted: 'week' // Only recent jobs
};

// High-value queries - focused on early career business roles
const OPTIMIZED_QUERIES = [
    'graduate analyst',
    'junior consultant', 
    'entry level analyst',
    'business analyst graduate',
    'management trainee',
    'graduate scheme'
];

// Key EU business hubs only
const KEY_LOCATIONS = [
    'London, United Kingdom',
    'Dublin, Ireland', 
    'Berlin, Germany',
    'Amsterdam, Netherlands',
    'Paris, France',
    'Madrid, Spain'
];

async function searchJSearchJobs() {
    const allJobs = [];
    let requestCount = 0;
    
    console.log(`📍 Processing ${KEY_LOCATIONS.length} key EU cities with ${OPTIMIZED_QUERIES.length} high-value queries\n`);
    
    // Check API key
    if (!JSEARCH_CONFIG.apiKey) {
        console.error('❌ Missing RAPIDAPI_KEY environment variable');
        return [];
    }
    
    for (const location of KEY_LOCATIONS) {
        if (requestCount >= JSEARCH_CONFIG.maxRequests) {
            console.log('⏰ Reached maximum request limit, stopping');
            break;
        }
        
        console.log(`📍 Processing ${location}...`);
        
        for (const query of OPTIMIZED_QUERIES) {
            if (requestCount >= JSEARCH_CONFIG.maxRequests) break;
            
            try {
                console.log(`🔍 Searching "${query}" in ${location}...`);
                
                const params = {
                    query: query,
                    page: 1,
                    num_pages: 1,
                    date_posted: JSEARCH_CONFIG.datePosted,
                    job_requirements: 'under_3_years_experience', // Focus on early career
                    employment_types: 'FULLTIME,PARTTIME,CONTRACTOR',
                    job_titles: 'analyst,consultant,associate,trainee,graduate'
                };
                
                // Add location filter
                if (location !== 'Remote') {
                    params.location = location;
                }
                
                const response = await axios.get(JSEARCH_CONFIG.baseUrl, {
                    params,
                    headers: {
                        'X-RapidAPI-Key': JSEARCH_CONFIG.apiKey,
                        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
                    },
                    timeout: 10000 // Reduced timeout to 10 seconds
                });
                
                const jobs = response.data.data || [];
                console.log(`📊 Found ${jobs.length} jobs for "${query}" in ${location}`);
                
                // Process and add jobs
                for (const job of jobs) {
                    const processedJob = {
                        title: job.job_title,
                        company: job.employer_name,
                        location: job.job_city + ', ' + job.job_country,
                        description: job.job_description || '',
                        url: job.job_apply_link,
                        posted_at: job.job_posted_at_datetime_utc,
                        source: 'jsearch'
                    };
                    allJobs.push(processedJob);
                }
                
                requestCount++;
                
                // Minimal rate limiting - just 1 second between requests
                await new Promise(resolve => setTimeout(resolve, JSEARCH_CONFIG.requestInterval));
                
            } catch (error) {
                console.error(`❌ Failed "${query}" in ${location}: ${error.message}`);
                if (error.response?.status === 429) {
                    console.log('⏰ Rate limited, waiting 5 seconds...');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
        }
        
        console.log(`✅ ${location} complete\n`);
    }
    
    return allJobs;
}

// Main execution with timeout
async function main() {
    try {
        console.log('🔍 Starting JSearch optimized scraping...\n');
        
        // Add timeout wrapper to prevent hanging
        const jobs = await Promise.race([
            searchJSearchJobs(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('JSearch scraper timeout after 2 minutes')), 120000)
            )
        ]);
        console.log(`📊 Total jobs found: ${jobs.length}`);
        
        if (jobs.length > 0 && !DRY_RUN) {
            console.log(`💾 Saving ${jobs.length} jobs to database...`);
            
            const normalizedJobs = jobs.map(job => normalize(job, 'jsearch'));
            
            // Deduplicate by dedupe_key before saving
            const uniqueJobs = [];
            const seenKeys = new Set();
            
            for (const job of normalizedJobs) {
                if (!seenKeys.has(job.dedupe_key)) {
                    seenKeys.add(job.dedupe_key);
                    uniqueJobs.push(job);
                }
            }
            
            console.log(`📊 Deduplicated: ${normalizedJobs.length} → ${uniqueJobs.length} unique jobs`);
            
            const { error } = await supabase
                .from('jobs')
                .upsert(uniqueJobs, { onConflict: 'dedupe_key' });
            
            if (error) {
                console.error('❌ Database error:', error);
            } else {
                console.log(`✅ JSearch: ${uniqueJobs.length} jobs saved to database`);
            }
        }
        
        console.log('\n✅ JSearch optimized scraping complete');
        
    } catch (error) {
        console.error('❌ JSearch scraper failed:', error.message);
        process.exit(1);
    }
}

// Run the scraper
if (require.main === module) {
    main();
}

module.exports = { searchJSearchJobs };
