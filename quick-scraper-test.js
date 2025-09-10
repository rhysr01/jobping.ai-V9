#!/usr/bin/env node

console.log('🧪 Quick Scraper Import Test\n');

// Test JSearch
console.log('Testing JSearch import...');
try {
  const JSearchScraper = require('./scrapers/jsearch-scraper.js').default;
  console.log('✅ JSearch imported successfully');
} catch (error) {
  console.log('❌ JSearch import failed:', error.message);
}

// Test Muse
console.log('Testing Muse import...');
try {
  const MuseScraper = require('./scrapers/muse-scraper.js').default;
  console.log('✅ Muse imported successfully');
} catch (error) {
  console.log('❌ Muse import failed:', error.message);
}

// Test Greenhouse
console.log('Testing Greenhouse import...');
try {
  const GreenhouseScraper = require('./scrapers/greenhouse-standardized.js').default;
  console.log('✅ Greenhouse imported successfully');
} catch (error) {
  console.log('❌ Greenhouse import failed:', error.message);
}

console.log('\n🎉 Import tests completed!');
