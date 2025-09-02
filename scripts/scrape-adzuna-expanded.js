#!/usr/bin/env node

/**
 * Enhanced Adzuna Job Scraper with Expanded Keywords
 * Collects even more early-career jobs for pilot data
 */

// Load environment variables from .env.local first, then .env
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const axios = require('axios');

console.log('🚀 Enhanced Adzuna Job Scraper - Collecting Maximum Jobs!\n');

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

// Enhanced target cities with expanded keywords
const targetCities = [
  { 
    name: 'London', 
    country: 'gb', 
    keywords: [
      'graduate', 'intern', 'junior', 'entry-level', 'trainee', 'apprentice', 
      'new graduate', 'recent graduate', 'student', 'entry level', 'first job'
    ] 
  },
  { 
    name: 'Madrid', 
    country: 'es', 
    keywords: [
      'becario', 'prácticas', 'junior', 'trainee', 'nivel inicial', 'primer empleo',
      'estudiante', 'recién graduado', 'sin experiencia', 'formación', 'aprendiz'
    ] 
  },
  { 
    name: 'Berlin', 
    country: 'de', 
    keywords: [
      'praktikum', 'trainee', 'junior', 'einsteiger', 'berufseinsteiger', 'student',
      'absolvent', 'neueinsteiger', 'anfänger', 'ausbildung', 'werkstudent'
    ] 
  },
  { 
    name: 'Amsterdam', 
    country: 'nl', 
    keywords: [
      'stagiair', 'werkstudent', 'junior', 'trainee', 'starter', 'student',
      'afgestudeerde', 'eerste baan', 'entry level', 'beginnersfunctie', 'leerling'
    ] 
  },
  { 
    name: 'Paris', 
    country: 'fr', 
    keywords: [
      'stagiaire', 'alternance', 'junior', 'trainee', 'débutant', 'premier emploi',
      'étudiant', 'jeune diplômé', 'sans expérience', 'formation', 'apprenti'
    ] 
  }
];

// Scrape jobs from a city with enhanced error handling
const scrapeCityJobs = async (city, keywords) => {
  const jobs = [];
  
  for (const keyword of keywords) {
    try {
      console.log(`📍 Searching ${city.name} for: ${keyword}`);
      
      const url = `https://api.adzuna.com/v1/api/jobs/${city.country}/search/1?app_id=${adzunaAppId}&app_key=${adzunaAppKey}&what=${encodeURIComponent(keyword)}&where=${encodeURIComponent(city.name)}&results_per_page=25&sort_by=date`;
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'JobPing/1.0 (https://jobping.com)',
          'Accept': 'application/json'
        },
        timeout: 15000
      });

      if (response.data.results && response.data.results.length > 0) {
        console.log(`   ✅ Found ${response.data.results.length} jobs for "${keyword}"`);
        
        // Process and format jobs with enhanced data
        response.data.results.forEach(job => {
          const formattedJob = {
            title: job.title,
            company: job.company?.display_name || 'Company not specified',
            location: job.location?.display_name || city.name,
            description: job.description?.substring(0, 200) + '...',
            url: job.redirect_url,
            posted: job.created,
            salary: job.salary_min && job.salary_max ? 
              `£${job.salary_min.toLocaleString()} - £${job.salary_max.toLocaleString()}` : 
              'Salary not specified',
            category: job.category?.label || 'General',
            keyword: keyword,
            contract: job.contract_time || 'Not specified',
            experience: job.experience_level || 'Not specified'
          };
          
          jobs.push(formattedJob);
        });
      } else {
        console.log(`   ⚠️  No jobs found for "${keyword}"`);
      }
      
      // Slightly longer delay between requests to be respectful
      await new Promise(resolve => setTimeout(resolve, 800));
      
    } catch (error) {
      if (error.response?.status === 429) {
        console.log(`   ⏳ Rate limited for "${keyword}", waiting 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.log(`   ❌ Error searching for "${keyword}": ${error.response?.status || error.message}`);
      }
    }
  }
  
  return jobs;
};

// Display jobs in a nice format with enhanced info
const displayJobs = (jobs, cityName) => {
  if (jobs.length === 0) {
    console.log(`\n📭 No jobs found for ${cityName}`);
    return;
  }
  
  console.log(`\n🏢 ${cityName.toUpperCase()} - ${jobs.length} Jobs Found:`);
  console.log('='.repeat(70));
  
  jobs.forEach((job, index) => {
    console.log(`\n${index + 1}. ${job.title}`);
    console.log(`   Company: ${job.company}`);
    console.log(`   Location: ${job.location}`);
    console.log(`   Category: ${job.category}`);
    console.log(`   Keyword: ${job.keyword}`);
    console.log(`   Contract: ${job.contract}`);
    console.log(`   Experience: ${job.experience}`);
    console.log(`   Salary: ${job.salary}`);
    console.log(`   Posted: ${job.posted}`);
    console.log(`   Description: ${job.description}`);
    console.log(`   Apply: ${job.url}`);
    console.log('   ' + '-'.repeat(60));
  });
};

// Main scraping function with enhanced statistics
const scrapeAllCities = async () => {
  console.log('🎯 Starting enhanced job search across all cities...\n');
  
  let allJobs = [];
  let totalJobs = 0;
  let keywordStats = {};
  
  for (const city of targetCities) {
    console.log(`\n🌍 Processing ${city.name}...`);
    const cityJobs = await scrapeCityJobs(city, city.keywords);
    
    if (cityJobs.length > 0) {
      displayJobs(cityJobs, city.name);
      allJobs = allJobs.concat(cityJobs);
      totalJobs += cityJobs.length;
      
      // Track keyword performance
      cityJobs.forEach(job => {
        keywordStats[job.keyword] = (keywordStats[job.keyword] || 0) + 1;
      });
    }
    
    console.log(`   📊 ${city.name}: ${cityJobs.length} jobs found`);
  }
  
  // Enhanced summary with keyword analysis
  console.log('\n🎉 ENHANCED SCRAPING COMPLETE!');
  console.log('='.repeat(70));
  console.log(`📊 Total Jobs Found: ${totalJobs}`);
  console.log(`🌍 Cities Processed: ${targetCities.length}`);
  console.log(`🔍 Total Keywords Searched: ${targetCities.reduce((sum, city) => sum + city.keywords.length, 0)}`);
  
  // Show keyword performance
  console.log(`\n📈 Keyword Performance:`);
  Object.entries(keywordStats)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .forEach(([keyword, count]) => {
      console.log(`   "${keyword}": ${count} jobs`);
    });
  
  // Show some stats
  const companies = [...new Set(allJobs.map(job => job.company))];
  const categories = [...new Set(allJobs.map(job => job.category))];
  const contracts = [...new Set(allJobs.map(job => job.contract))];
  
  console.log(`\n📊 Job Statistics:`);
  console.log(`   Unique Companies: ${companies.length}`);
  console.log(`   Job Categories: ${categories.length} different types`);
  console.log(`   Contract Types: ${contracts.filter(c => c !== 'Not specified').join(', ')}`);
  
  if (allJobs.length > 0) {
    console.log(`\n💡 Top Job Opportunities:`);
    allJobs.slice(0, 8).forEach((job, index) => {
      console.log(`   ${index + 1}. ${job.title} at ${job.company} (${job.location})`);
    });
  }
  
  console.log('\n✅ Enhanced Adzuna job scraping completed successfully!');
  console.log('🚀 You now have maximum early-career job data for your pilot!');
  console.log(`💾 Total jobs collected: ${totalJobs} across ${targetCities.length} cities`);
};

// Run the enhanced scraper
console.log('🚀 Starting Enhanced Adzuna Job Scraper...\n');
scrapeAllCities().catch(error => {
  console.error('❌ Enhanced scraping failed:', error.message);
});
