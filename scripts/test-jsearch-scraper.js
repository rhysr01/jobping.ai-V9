#!/usr/bin/env node

/**
 * Test script for the JSearch scraper
 * Tests the new JSearch scraper implementation
 */

console.log('🧪 Testing JSearch Scraper Implementation\n');

// Check if we have the required API key
const rapidApiKey = process.env.RAPIDAPI_KEY;

if (!rapidApiKey) {
  console.log('❌ Missing RapidAPI credentials');
  console.log('   Set RAPIDAPI_KEY environment variable');
  console.log('   You can get one from: https://rapidapi.com/letscrape-6bRBa3QguO/api/jsearch/');
  process.exit(1);
}

console.log('✅ RapidAPI credentials found');
console.log('🔑 API Key:', '***' + rapidApiKey.slice(-4));

// Test the JSearch scraper
console.log('\n🔍 Testing JSearch scraper...');

import('../scrapers/jsearch-scraper.ts').then((module) => {
  const JSearchScraper = module.default.default || module.default;
  
  try {
    const scraper = new JSearchScraper();
    
    // Show configuration
    console.log('📍 Target locations:', scraper.getAvailableLocations());
    console.log('📊 Daily budget:', scraper.getStatus().dailyBudget);
    console.log('📆 Monthly budget:', scraper.getStatus().monthlyBudget);
    console.log('🏙️ Locations supported:', scraper.getStatus().locationsSupported);
    console.log('🔍 Queries supported:', scraper.getStatus().queriesSupported);
    
    // Test single query search
    console.log('\n🔍 Testing single query search...');
    scraper.searchSingleQuery('graduate program', 'London, United Kingdom').then(result => {
      console.log('✅ Single query test completed!');
      console.log('📊 Jobs found:', result.jobs.length);
      console.log('📞 API calls used:', result.metrics.requestsUsed);
      console.log('💰 Daily budget remaining:', result.metrics.dailyBudgetRemaining);
      console.log('💰 Monthly budget remaining:', result.metrics.monthlyBudgetRemaining);
      
      if (result.jobs.length > 0) {
        console.log('\n🎯 Sample jobs found:');
        result.jobs.slice(0, 3).forEach((job, i) => {
          console.log(`   ${i + 1}. ${job.title} at ${job.company} (${job.location})`);
        });
      }
      
      // Test track rotation (will be limited due to rate limiting)
      console.log('\n🔍 Testing track rotation scraping (will be limited)...');
      return scraper.scrapeWithTrackRotation();
    }).then(trackResults => {
      console.log('✅ Track rotation test completed!');
      console.log('📊 Total jobs found:', trackResults.jobs.length);
      console.log('🎯 Track used:', trackResults.metrics.track);
      console.log('🔍 Query used:', trackResults.metrics.query);
      console.log('📍 Locations targeted:', trackResults.metrics.locationsTargeted);
      console.log('📞 Total API calls used:', trackResults.metrics.requestsUsed);
      console.log('💰 Daily budget remaining:', trackResults.metrics.dailyBudgetRemaining);
      console.log('💰 Monthly budget remaining:', trackResults.metrics.monthlyBudgetRemaining);
      
      console.log('\n🎯 JSearch scraper test completed successfully!');
      
    }).catch(error => {
      console.error('❌ JSearch scraper test failed:', error.message);
    });
    
  } catch (error) {
    console.error('❌ Failed to instantiate JSearch scraper:', error.message);
  }
}).catch(error => {
  console.error('❌ Failed to import JSearch scraper:', error.message);
});
