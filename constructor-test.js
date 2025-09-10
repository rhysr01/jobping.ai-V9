#!/usr/bin/env node

console.log('🔍 Testing Muse Constructor...');

try {
  console.log('1. Loading Muse scraper...');
  const MuseScraper = require('./scrapers/muse-scraper.js').default;
  console.log('✅ Muse scraper loaded');
  
  console.log('2. Creating instance...');
  const scraper = new MuseScraper();
  console.log('✅ Instance created successfully');
  
  console.log('3. Instance properties:');
  console.log('  - requestCount:', scraper.requestCount);
  console.log('  - hourlyRequestCount:', scraper.hourlyRequestCount);
  console.log('  - seenJobs size:', scraper.seenJobs.size);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}
