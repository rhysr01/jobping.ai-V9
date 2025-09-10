#!/usr/bin/env node

console.log('🔍 Simple Muse Test...');

try {
  console.log('1. Loading Muse scraper...');
  const MuseScraper = require('./scrapers/muse-scraper.js').default;
  console.log('✅ Muse scraper loaded');
  
  console.log('2. About to create instance...');
  // Don't create instance yet, just test the class
  console.log('✅ Class is available');
  
} catch (error) {
  console.error('❌ Error:', error.message);
}
