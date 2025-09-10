#!/usr/bin/env node

// Minimal JSearch scraper - single API call to test
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { normalize } = require('../scrapers/utils.js');
require('dotenv').config({ path: '.env.local' });

console.log('🎯 JSEARCH MINIMAL SCRAPER - Single API Call Test\n');

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

async function main() {
    try {
        console.log('🔍 Starting JSearch minimal scraping...\n');
        
        // Check API key
        const apiKey = process.env.RAPIDAPI_KEY;
        if (!apiKey) {
            console.error('❌ Missing RAPIDAPI_KEY environment variable');
            return;
        }
        
        console.log('📡 Making single API call...');
        
        const params = {
            query: 'graduate analyst',
            page: 1,
            num_pages: 1,
            date_posted: 'week',
            location: 'London, United Kingdom',
            job_requirements: 'under_3_years_experience'
        };
        
        const response = await axios.get('https://jsearch.p.rapidapi.com/search', {
            params,
            headers: {
                'X-RapidAPI-Key': apiKey,
                'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
            },
            timeout: 10000
        });
        
        const jobs = response.data.data || [];
        console.log(`📊 Found ${jobs.length} jobs`);
        
        if (jobs.length > 0) {
            console.log(`📋 Sample job: ${jobs[0].job_title} at ${jobs[0].employer_name}`);
        }
        
        if (jobs.length > 0 && !DRY_RUN) {
            console.log(`💾 Saving ${jobs.length} jobs to database...`);
            
            const processedJobs = jobs.map(job => ({
                title: job.job_title,
                company: job.employer_name,
                location: job.job_city + ', ' + job.job_country,
                description: job.job_description || '',
                url: job.job_apply_link,
                posted_at: job.job_posted_at_datetime_utc,
                source: 'jsearch'
            }));
            
            const normalizedJobs = processedJobs.map(job => normalize(job, 'jsearch'));
            
            const { error } = await supabase
                .from('jobs')
                .upsert(normalizedJobs, { onConflict: 'dedupe_key' });
            
            if (error) {
                console.error('❌ Database error:', error);
            } else {
                console.log(`✅ JSearch: ${normalizedJobs.length} jobs saved to database`);
            }
        }
        
        console.log('\n✅ JSearch minimal scraping complete');
        
    } catch (error) {
        console.error('❌ JSearch scraper failed:', error.message);
        process.exit(1);
    }
}

// Run the scraper
if (require.main === module) {
    main();
}

module.exports = { main };
