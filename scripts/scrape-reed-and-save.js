#!/usr/bin/env node

/**
 * Enhanced Reed Job Scraper with JSON Save
 * Collects early-career jobs from Reed and saves them to JSON for database processing
 */

// Load environment variables from .env.local first, then .env
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const axios = require('axios');
const fs = require('fs');

console.log('🚀 Enhanced Reed Job Scraper - Collecting and Saving Jobs!\n');

// Check environment variables
const reedApiKey = process.env.REED_API_KEY;

if (!reedApiKey) {
  console.log('❌ Missing Reed environment variables');
  console.log('   REED_API_KEY:', reedApiKey ? '✅' : '❌');
  process.exit(1);
}

console.log('✅ Reed credentials loaded');
console.log(`   API_KEY: ${reedApiKey.substring(0, 8)}...\n`);

// Enhanced target cities with early-career keywords - EU focused
const targetCities = [
  { 
    name: 'London', 
    keywords: [
      'graduate', 'intern', 'junior', 'entry-level', 'trainee', 'apprentice', 
      'new graduate', 'recent graduate', 'student', 'entry level', 'first job'
    ] 
  },
  { 
    name: 'Amsterdam', 
    keywords: [
      'stagiair', 'werkstudent', 'junior', 'trainee', 'starter', 'student',
      'afgestudeerde', 'eerste baan', 'entry level', 'beginnersfunctie', 'leerling'
    ] 
  },
  { 
    name: 'Berlin', 
    keywords: [
      'praktikum', 'trainee', 'junior', 'einsteiger', 'berufseinsteiger', 'student',
      'absolvent', 'neueinsteiger', 'anfänger', 'ausbildung', 'werkstudent'
    ] 
  },
  { 
    name: 'Paris', 
    keywords: [
      'stagiaire', 'alternance', 'junior', 'trainee', 'débutant', 'premier emploi',
      'étudiant', 'jeune diplômé', 'sans expérience', 'formation', 'apprenti'
    ] 
  },
  { 
    name: 'Madrid', 
    keywords: [
      'becario', 'prácticas', 'junior', 'trainee', 'nivel inicial', 'primer empleo',
      'estudiante', 'recién graduado', 'sin experiencia', 'formación', 'aprendiz'
    ] 
  }
];

// Reed API Configuration
const REED_CONFIG = {
  baseUrl: 'https://www.reed.co.uk/api/1.0/search',
  requestInterval: 1000, // 1 second between requests
  resultsPerPage: 100
};

// Scrape jobs from a city with enhanced error handling
const scrapeCityJobs = async (city, keywords) => {
  const jobs = [];
  
  for (const keyword of keywords) {
    try {
      console.log(`📍 Searching ${city.name} for: ${keyword}`);
      
      // Make request to Reed API
      const response = await axios.get(REED_CONFIG.baseUrl, {
        params: {
          keywords: keyword,
          locationName: city.name,
          distanceFromLocation: 10,
          resultsToTake: REED_CONFIG.resultsPerPage,
          sortBy: 'DisplayDate'
        },
        headers: {
          'Authorization': `Basic ${Buffer.from(reedApiKey + ':').toString('base64')}`,
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
            title: job.jobTitle,
            company: job.employerName || 'Company not specified',
            location: job.locationName || city.name,
            description: job.jobDescription?.substring(0, 500) + '...',
            url: job.jobUrl || `https://www.reed.co.uk/jobs/${job.jobId}`,
            category: 'Not specified', // Reed doesn't provide categories
            keyword: keyword,
            contract: job.jobType || 'Not specified',
            experience: 'Not specified', // Reed doesn't provide experience level
            salary: job.minimumSalary && job.maximumSalary ? 
              `${job.minimumSalary} - ${job.maximumSalary}` : 
              job.minimumSalary ? job.minimumSalary : 'Not specified',
            posted: job.datePosted || 'Not specified',
            city: city.name,
            country: 'gb',
            source: 'reed',
            job_id: job.jobId,
            scraped_at: new Date().toISOString()
          };
          
          jobs.push(formattedJob);
        });
      } else {
        console.log(`   ⚠️  No jobs found for "${keyword}"`);
      }
      
      // Rate limiting - be nice to the API
      await new Promise(resolve => setTimeout(resolve, REED_CONFIG.requestInterval));
      
    } catch (error) {
      if (error.response?.status === 429) {
        console.log(`   ⏳ Rate limited, waiting 5 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        console.error(`   ❌ Error searching for "${keyword}":`, error.message);
      }
      // Continue with next keyword
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
    console.log(`   Keyword: ${job.keyword}`);
    console.log(`   Contract: ${job.contract}`);
    console.log(`   Salary: ${job.salary}`);
    console.log(`   Posted: ${job.posted}`);
    console.log(`   Description: ${job.description}`);
    console.log(`   Apply: ${job.url}`);
    console.log('   ' + '-'.repeat(60));
  });
};

// Save jobs to JSON file
const saveJobsToJSON = (jobs, filename) => {
  try {
    const data = {
      summary: {
        total_jobs: jobs.length,
        scraped_at: new Date().toISOString(),
        source: 'reed',
        cities: targetCities.map(city => city.name)
      },
      jobs: jobs
    };
    
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`💾 Jobs saved to: ${filename}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to save jobs: ${error.message}`);
    return false;
  }
};

// Main scraping function with enhanced statistics and saving
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
  console.log('\n🎉 ENHANCED REED SCRAPING COMPLETE!');
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
  const contracts = [...new Set(allJobs.map(job => job.contract))];
  
  console.log(`\n📊 Job Statistics:`);
  console.log(`   Unique Companies: ${companies.length}`);
  console.log(`   Contract Types: ${contracts.filter(c => c !== 'Not specified').join(', ')}`);
  
  if (allJobs.length > 0) {
    console.log(`\n💡 Top Job Opportunities:`);
    allJobs.slice(0, 8).forEach((job, index) => {
      console.log(`   ${index + 1}. ${job.title} at ${job.company} (${job.location})`);
    });
  }
  
  // Save jobs to JSON file
  if (allJobs.length > 0) {
    const filename = `reed-jobs-${new Date().toISOString().split('T')[0]}.json`;
    const saved = saveJobsToJSON(allJobs, filename);
    
    if (saved) {
      console.log('\n💾 SAVING COMPLETE!');
      console.log(`📁 File: ${filename}`);
      console.log(`📊 Jobs ready for database processing: ${allJobs.length}`);
      console.log('🚀 Next step: Run job ingestion to save to database!');
    }
  }
  
  console.log('\n✅ Enhanced Reed job scraping completed successfully!');
  console.log('🚀 You now have early-career job data from Reed for your pilot!');
  console.log(`💾 Total jobs collected: ${totalJobs} across ${targetCities.length} cities`);
};

// Run the enhanced scraper
console.log('🚀 Starting Enhanced Reed Job Scraper...\n');
scrapeAllCities().catch(error => {
  console.error('❌ Enhanced scraping failed:', error.message);
});
