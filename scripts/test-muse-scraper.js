#!/usr/bin/env node

/**
 * Test script for The Muse scraper
 * Tests the new Muse scraper implementation
 */

console.log('🧪 Testing The Muse Scraper Implementation\n');

// Check if we have the optional API key
const museApiKey = process.env.MUSE_API_KEY;

if (museApiKey) {
  console.log('✅ Muse API key found (will use higher rate limits)');
  console.log('🔑 API Key:', '***' + museApiKey.slice(-4));
} else {
  console.log('⚠️ No Muse API key found (will use public rate limits)');
  console.log('   Set MUSE_API_KEY for higher limits: https://www.themuse.com/developers/api');
}

// Test the Muse scraper
console.log('\n🔍 Testing Muse scraper...');

import('../scrapers/muse-scraper.ts').then((module) => {
  const MuseScraper = module.default.default || module.default;
  try {
    const scraper = new MuseScraper();
    
    // Show configuration
    console.log('📍 Target locations:', scraper.getTargetLocations());
    console.log('📊 Hourly budget:', scraper.getStatus().hourlyBudget);
    console.log('🏙️ Locations supported:', scraper.getStatus().locationsSupported);
    console.log('📋 Categories supported:', scraper.getStatus().categoriesSupported);
    
    // Test single location scraping
    console.log('\n🔍 Testing single location scraping (London)...');
    scraper.scrapeSingleLocation('London, United Kingdom').then(result => {
      console.log('✅ Single location test completed!');
      console.log('📊 Jobs found:', result.jobs.length);
      console.log('📞 API calls used:', result.metrics.requestsUsed);
      console.log('💰 Hourly budget remaining:', result.metrics.hourlyBudgetRemaining);
      console.log('🎯 Track used:', result.metrics.track);
      console.log('📋 Categories:', result.metrics.categories);
      console.log('🎯 Levels:', result.metrics.levels);
      
      if (result.jobs.length > 0) {
        console.log('\n🎯 Sample jobs found:');
        result.jobs.slice(0, 3).forEach((job, i) => {
          console.log(`   ${i + 1}. ${job.title} at ${job.company} (${job.location})`);
        });
      }
      
      // Test all locations (limited to avoid rate limits)
      console.log('\n🔍 Testing all locations scraping (will be limited)...');
      return scraper.scrapeAllLocations();
    }).then(allResults => {
      console.log('✅ All locations test completed!');
      console.log('📊 Total jobs found:', allResults.jobs.length);
      console.log('🏙️ Locations processed:', allResults.metrics.locationsProcessed);
      console.log('📞 Total API calls used:', allResults.metrics.requestsUsed);
      console.log('💰 Hourly budget remaining:', allResults.metrics.hourlyBudgetRemaining);
      
      console.log('\n🎯 Muse scraper test completed successfully!');
      
    }).catch(error => {
      console.error('❌ Muse scraper test failed:', error.message);
    });
    
  } catch (error) {
    console.error('❌ Failed to instantiate Muse scraper:', error.message);
  }
}).catch(error => {
  console.error('❌ Failed to import Muse scraper:', error.message);
});
