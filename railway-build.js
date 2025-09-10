#!/usr/bin/env node

// Railway Build Script - Ensures all TypeScript scrapers are compiled to JavaScript
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Railway Build Script Starting...');
console.log('=====================================');

try {
  // Step 1: Install dependencies
  console.log('📦 Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });
  
  // Step 2: Compile TypeScript scrapers to JavaScript
  console.log('🔨 Compiling TypeScript scrapers to JavaScript...');
  execSync('npm run build:scrapers', { stdio: 'inherit' });
  
  // Step 3: Verify critical JavaScript files exist
  console.log('✅ Verifying JavaScript files exist...');
  const requiredFiles = [
    'scrapers/adzuna-scraper-standalone.js',
    'scrapers/reed-scraper-standalone.js',
    'scrapers/jsearch-scraper.js',
    'scrapers/muse-scraper.js',
    'scrapers/greenhouse-standardized.js'
  ];
  
  let allFilesExist = true;
  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      console.log(`  ✅ ${file}`);
    } else {
      console.log(`  ❌ ${file} - MISSING!`);
      allFilesExist = false;
    }
  }
  
  if (!allFilesExist) {
    console.error('❌ Some required JavaScript files are missing!');
    process.exit(1);
  }
  
  // Step 4: Build Next.js app
  console.log('🏗️ Building Next.js application...');
  execSync('npm run build', { stdio: 'inherit' });
  
  console.log('✅ Railway build completed successfully!');
  console.log('=====================================');
  console.log('🚀 Ready for Railway deployment!');
  
} catch (error) {
  console.error('❌ Railway build failed:', error.message);
  process.exit(1);
}
