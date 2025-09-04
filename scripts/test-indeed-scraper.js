#!/usr/bin/env node

/**
 * Test script for the Indeed scraper
 * Tests the new Indeed scraper implementation
 */

console.log('🧪 Testing Indeed Scraper Implementation\n');

// Check if we have the required environment variables
const indeedApiKey = process.env.INDEED_API_KEY;

if (!indeedApiKey) {
  console.log('❌ Missing Indeed API credentials');
  console.log('   Set INDEED_API_KEY environment variable');
  console.log('   You can get one from: https://developer.indeed.com/');
  process.exit(1);
}

console.log('✅ Indeed API credentials found');
console.log('🔑 API Key:', indeedApiKey ? '***' + indeedApiKey.slice(-4) : 'Not set');

// Test the Indeed scraper
console.log('\n🔍 Testing Indeed scraper...');

import('../scrapers/indeed-scraper.ts').then(({ default: IndeedScraper }) => {
  try {
    const scraper = new IndeedScraper();
    
    // Show configuration
    console.log('📍 Target cities:', scraper.getTargetCities());
    console.log('📊 Daily budget:', scraper.getStatus().dailyBudget);
    console.log('🏙️ Cities supported:', scraper.getStatus().citiesSupported);
    
    // Test single city scraping
    console.log('\n🔍 Testing single city scraping (London)...');
    scraper.scrapeSingleCity('London').then(result => {
      console.log('✅ Single city test completed!');
      console.log('📊 Jobs found:', result.jobs.length);
      console.log('📞 API calls used:', result.metrics.callsUsed);
      console.log('💰 Budget remaining:', result.metrics.budgetRemaining);
      
      if (result.jobs.length > 0) {
        console.log('\n🎯 Sample jobs found:');
        result.jobs.slice(0, 3).forEach((job, i) => {
          console.log(`   ${i + 1}. ${job.title} at ${job.company} (${job.location})`);
        });
      }
      
      // Test all cities
      console.log('\n🔍 Testing all cities scraping...');
      return scraper.scrapeAllCities();
    }).then(allResults => {
      console.log('✅ All cities test completed!');
      console.log('📊 Total jobs found:', allResults.jobs.length);
      console.log('🏙️ Cities processed:', allResults.metrics.citiesProcessed);
      console.log('📞 Total API calls used:', allResults.metrics.callsUsed);
      console.log('💰 Budget remaining:', allResults.metrics.budgetRemaining);
      
      console.log('\n🎯 Indeed scraper test completed successfully!');
      
    }).catch(error => {
      console.error('❌ Indeed scraper test failed:', error.message);
    });
    
  } catch (error) {
    console.error('❌ Failed to instantiate Indeed scraper:', error.message);
  }
}).catch(error => {
  console.error('❌ Failed to import Indeed scraper:', error.message);
});
