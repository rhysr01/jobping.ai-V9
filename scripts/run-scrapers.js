#!/usr/bin/env node

/**
 * Actually run the scrapers and show real results
 * No more tests - let's see what jobs we actually find!
 */

import { execSync } from 'child_process';
import fs from 'fs';

console.log('🚀 Running JobPing Scrapers - Getting Real Results!\n');

// Run Adzuna scraper
console.log('🔍 Running Adzuna scraper...');
try {
  const adzunaOutput = execSync('npx tsx scrapers/adzuna-scraper-standalone.ts', { 
    encoding: 'utf8',
    timeout: 60000,
    stdio: 'pipe'
  });
  console.log('✅ Adzuna completed');
  console.log('📊 Output:', adzunaOutput.slice(-500)); // Last 500 chars
} catch (error) {
  console.log('❌ Adzuna failed:', error.message);
}

console.log('\n' + '='.repeat(50) + '\n');

// Run Reed scraper
console.log('🔍 Running Reed scraper...');
try {
  const reedOutput = execSync('npx tsx scrapers/reed-scraper-standalone.ts', { 
    encoding: 'utf8',
    timeout: 60000,
    stdio: 'pipe'
  });
  console.log('✅ Reed completed');
  console.log('📊 Output:', reedOutput.slice(-500)); // Last 500 chars
} catch (error) {
  console.log('❌ Reed failed:', error.message);
}

console.log('\n' + '='.repeat(50) + '\n');

// Run Greenhouse scraper
console.log('🔍 Running Greenhouse scraper...');
try {
  const greenhouseOutput = execSync('npx tsx scrapers/greenhouse.ts', { 
    encoding: 'utf8',
    timeout: 60000,
    stdio: 'pipe'
  });
  console.log('✅ Greenhouse completed');
  console.log('📊 Output:', greenhouseOutput.slice(-500)); // Last 500 chars
} catch (error) {
  console.log('❌ Greenhouse failed:', error.message);
}

console.log('\n🎯 All scrapers completed! Check the output above for real job results.');
