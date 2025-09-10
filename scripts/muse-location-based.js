#!/usr/bin/env node

// 🎯 MUSE LOCATION-BASED SCRAPER - Following Working Scrapers Pattern
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { normalize } = require('../scrapers/utils.js');
require('dotenv').config({ path: '.env.local' });

console.log('🎯 MUSE LOCATION-BASED SCRAPER - Following Working Scrapers Pattern\n');

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

// Optimized single query - Muse API returns same 20 jobs regardless of parameters
const MUSE_STRATEGIES = [
    { location: 'London', country: 'GB', queries: ['graduate analyst'] }
];

// Muse API Configuration
const MUSE_CONFIG = {
    baseUrl: 'https://www.themuse.com/api/public/jobs',
    apiKey: process.env.MUSE_API_KEY, // Optional
    requestInterval: 2000, // 2 seconds between requests
    maxRequests: 10 // Limit total requests (optimized for single query)
};

async function searchMuseJobs() {
    const allJobs = [];
    let requestCount = 0;
    
    console.log(`📍 Processing ${MUSE_STRATEGIES.length} strategies to maximize job discovery\n`);
    
    for (const strategy of MUSE_STRATEGIES) {
        if (requestCount >= MUSE_CONFIG.maxRequests) {
            console.log('⏰ Reached maximum request limit, stopping');
            break;
        }
        
        try {
            console.log(`📍 Processing ${strategy.location}...`);
            
            for (const query of strategy.queries) {
                if (requestCount >= MUSE_CONFIG.maxRequests) break;
                
                try {
                    console.log(`🔍 Searching "${query}" in ${strategy.location}...`);
                    
                    const params = {
                        location: strategy.location,
                        query: query,
                        page: 1,
                        descending: true
                    };
                    
                    if (MUSE_CONFIG.apiKey) {
                        params.api_key = MUSE_CONFIG.apiKey;
                    }
                    
                    const response = await axios.get(MUSE_CONFIG.baseUrl, {
                        params,
                        headers: {
                            'User-Agent': 'JobPing/1.0 (https://jobping.com)',
                            'Accept': 'application/json'
                        },
                        timeout: 15000
                    });
                    
                    const jobs = response.data.results || [];
                    console.log(`📊 Found ${jobs.length} jobs for "${query}" in ${strategy.location}`);
                    
                    // Process and add jobs
                    for (const job of jobs) {
                        const processedJob = {
                            title: job.name,
                            company: job.company.name,
                            location: job.locations[0]?.name || strategy.location,
                            description: job.contents.replace(/<[^>]*>/g, ''),
                            url: job.refs.landing_page,
                            posted_at: job.publication_date,
                            source: 'muse'
                        };
                        allJobs.push(processedJob);
                    }
                    
                    requestCount++;
                    
                    // Rate limiting between requests
                    await new Promise(resolve => setTimeout(resolve, MUSE_CONFIG.requestInterval));
                    
                } catch (error) {
                    console.error(`❌ Failed "${query}" in ${strategy.location}: ${error.message}`);
                }
            }
            
            console.log(`✅ ${strategy.location} complete\n`);
            
        } catch (error) {
            console.error(`❌ Failed ${strategy.location}: ${error.message}`);
        }
    }
    
    return allJobs;
}

// Main execution
async function main() {
    try {
        console.log('🔍 Starting Muse location-based scraping...\n');
        
        const jobs = await searchMuseJobs();
        console.log(`📊 Total jobs found: ${jobs.length}`);
        
        if (jobs.length > 0 && !DRY_RUN) {
            console.log(`💾 Saving ${jobs.length} jobs to database...`);
            
            const normalizedJobs = jobs.map(job => normalize(job, 'muse'));
            
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
                console.log(`✅ Muse: ${uniqueJobs.length} jobs saved to database`);
            }
        }
        
        console.log('\n✅ Muse location-based scraping complete');
        
    } catch (error) {
        console.error('❌ Muse scraper failed:', error.message);
        process.exit(1);
    }
}

// Run the scraper
if (require.main === module) {
    main();
}

module.exports = { searchMuseJobs };
