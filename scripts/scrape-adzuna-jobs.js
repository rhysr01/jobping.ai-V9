#!/usr/bin/env node

/**
 * Real Adzuna Job Scraper
 * Actually scrapes and displays real jobs from Adzuna API
 */

// Load environment variables from .env.local first, then .env
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const axios = require('axios');

console.log('🚀 Adzuna Job Scraper - Finding Real Jobs!\n');

// Check environment variables
const adzunaAppId = process.env.ADZUNA_APP_ID;
const adzunaAppKey = process.env.ADZUNA_APP_KEY;

if (!adzunaAppId || !adzunaAppKey) {
  console.log('❌ Missing Adzuna environment variables');
  process.exit(1);
}

console.log('✅ Adzuna credentials loaded');
console.log(`   APP_ID: ${adzunaAppId.substring(0, 8)}...`);
console.log(`   APP_KEY: ${adzunaAppKey.substring(0, 8)}...\n`);

// Target cities for early-career jobs
const targetCities = [
  { name: 'London', country: 'gb', keywords: ['graduate', 'intern', 'junior'] },
  { name: 'Madrid', country: 'es', keywords: ['becario', 'prácticas', 'junior'] },
  { name: 'Berlin', country: 'de', keywords: ['praktikum', 'trainee', 'junior'] },
  { name: 'Amsterdam', country: 'nl', keywords: ['stagiair', 'werkstudent', 'junior'] },
  { name: 'Paris', country: 'fr', keywords: ['stagiaire', 'alternance', 'junior'] }
];

// Scrape jobs from a city
const scrapeCityJobs = async (city, keywords) => {
  const jobs = [];
  
  for (const keyword of keywords) {
    try {
      console.log(`📍 Searching ${city.name} for: ${keyword}`);
      
      const url = `https://api.adzuna.com/v1/api/jobs/${city.country}/search/1?app_id=${adzunaAppId}&app_key=${adzunaAppKey}&what=${keyword}&where=${city.name}&results_per_page=25&sort_by=date`;
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'JobPing/1.0 (https://jobping.com)',
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      if (response.data.results && response.data.results.length > 0) {
        console.log(`   ✅ Found ${response.data.results.length} jobs for "${keyword}"`);
        
        // Process and format jobs
        response.data.results.forEach(job => {
          const formattedJob = {
            title: job.title,
            company: job.company?.display_name || 'Company not specified',
            location: job.location?.display_name || city.name,
            description: job.description?.substring(0, 150) + '...',
            url: job.redirect_url,
            posted: job.created,
            salary: job.salary_min && job.salary_max ? 
              `£${job.salary_min.toLocaleString()} - £${job.salary_max.toLocaleString()}` : 
              'Salary not specified',
            category: job.category?.label || 'General',
            keyword: keyword
          };
          
          jobs.push(formattedJob);
        });
      } else {
        console.log(`   ⚠️  No jobs found for "${keyword}"`);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.log(`   ❌ Error searching for "${keyword}": ${error.response?.status || error.message}`);
    }
  }
  
  return jobs;
};

// Display jobs in a nice format
const displayJobs = (jobs, cityName) => {
  if (jobs.length === 0) {
    console.log(`\n📭 No jobs found for ${cityName}`);
    return;
  }
  
  console.log(`\n🏢 ${cityName.toUpperCase()} - ${jobs.length} Jobs Found:`);
  console.log('='.repeat(60));
  
  jobs.forEach((job, index) => {
    console.log(`\n${index + 1}. ${job.title}`);
    console.log(`   Company: ${job.company}`);
    console.log(`   Location: ${job.location}`);
    console.log(`   Category: ${job.category}`);
    console.log(`   Keyword: ${job.keyword}`);
    console.log(`   Salary: ${job.salary}`);
    console.log(`   Posted: ${job.posted}`);
    console.log(`   Description: ${job.description}`);
    console.log(`   Apply: ${job.url}`);
    console.log('   ' + '-'.repeat(50));
  });
};

// Main scraping function
const scrapeAllCities = async () => {
  console.log('🎯 Starting job search across all cities...\n');
  
  let allJobs = [];
  let totalJobs = 0;
  
  for (const city of targetCities) {
    console.log(`\n🌍 Processing ${city.name}...`);
    const cityJobs = await scrapeCityJobs(city, city.keywords);
    
    if (cityJobs.length > 0) {
      displayJobs(cityJobs, city.name);
      allJobs = allJobs.concat(cityJobs);
      totalJobs += cityJobs.length;
    }
    
    console.log(`   📊 ${city.name}: ${cityJobs.length} jobs found`);
  }
  
  // Summary
  console.log('\n🎉 SCRAPING COMPLETE!');
  console.log('='.repeat(60));
  console.log(`📊 Total Jobs Found: ${totalJobs}`);
  console.log(`🌍 Cities Processed: ${targetCities.length}`);
  console.log(`🔍 Keywords Searched: ${targetCities.reduce((sum, city) => sum + city.keywords.length, 0)}`);
  
  // Show some stats
  const companies = [...new Set(allJobs.map(job => job.company))];
  const categories = [...new Set(allJobs.map(job => job.category))];
  
  console.log(`\n📈 Statistics:`);
  console.log(`   Unique Companies: ${companies.length}`);
  console.log(`   Job Categories: ${categories.join(', ')}`);
  
  if (allJobs.length > 0) {
    console.log(`\n💡 Top Job Opportunities:`);
    allJobs.slice(0, 5).forEach((job, index) => {
      console.log(`   ${index + 1}. ${job.title} at ${job.company} (${job.location})`);
    });
  }
  
  console.log('\n✅ Adzuna job scraping completed successfully!');
  console.log('🚀 You now have real early-career job data from European markets!');
};

// Run the scraper
console.log('🚀 Starting Adzuna Job Scraper...\n');
scrapeAllCities().catch(error => {
  console.error('❌ Scraping failed:', error.message);
});
