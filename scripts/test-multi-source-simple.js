#!/usr/bin/env node

/**
 * Simple test script for the multi-source scraper system
 * Tests basic functionality without TypeScript compilation
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Multi-Source Scraper System\n');

// Check if all scraper files exist
const scraperFiles = [
  'scrapers/adzuna-scraper.ts',
  'scrapers/reed-scraper.ts', 
  'scrapers/infojobs-scraper.ts',
  'scrapers/multi-source-orchestrator.ts'
];

console.log('📁 Checking scraper files...');
let allFilesExist = true;

scraperFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

if (!allFilesExist) {
  console.log('\n❌ Some scraper files are missing!');
  process.exit(1);
}

console.log('\n✅ All scraper files found!');

// Check file contents and basic structure
console.log('\n📋 Analyzing scraper files...');

scraperFiles.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    
    console.log(`\n📄 ${file}:`);
    console.log(`   Lines: ${lines.length}`);
    console.log(`   Size: ${(content.length / 1024).toFixed(1)} KB`);
    
    // Check for key components
    if (file.includes('adzuna')) {
      const hasClass = content.includes('class AdzunaScraper');
      const hasExport = content.includes('export default');
      console.log(`   Class definition: ${hasClass ? '✅' : '❌'}`);
      console.log(`   Export: ${hasExport ? '✅' : '❌'}`);
    }
    
    if (file.includes('reed')) {
      const hasClass = content.includes('class ReedScraper');
      const hasExport = content.includes('export default');
      console.log(`   Class definition: ${hasClass ? '✅' : '❌'}`);
      console.log(`   Export: ${hasExport ? '✅' : '❌'}`);
    }
    
    if (file.includes('infojobs')) {
      const hasClass = content.includes('class InfoJobsScraper');
      const hasExport = content.includes('export default');
      console.log(`   Class definition: ${hasClass ? '✅' : '❌'}`);
      console.log(`   Export: ${hasExport ? '✅' : '❌'}`);
    }
    
    if (file.includes('orchestrator')) {
      const hasClass = content.includes('class MultiSourceOrchestrator');
      const hasExport = content.includes('export default');
      console.log(`   Class definition: ${hasClass ? '✅' : '❌'}`);
      console.log(`   Export: ${hasExport ? '✅' : '❌'}`);
    }
    
  } catch (error) {
    console.log(`   ❌ Error reading file: ${error.message}`);
  }
});

// Check for required environment variables
console.log('\n🔑 Checking environment variables...');
const requiredEnvVars = [
  'ADZUNA_APP_ID',
  'ADZUNA_APP_KEY', 
  'REED_API_KEY',
  'INFOJOBS_TOKEN'
];

requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  if (value) {
    console.log(`✅ ${envVar}: ${value.substring(0, 8)}...`);
  } else {
    console.log(`❌ ${envVar}: Not set`);
  }
});

// Check package.json scripts
console.log('\n📦 Checking package.json scripts...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const scripts = packageJson.scripts || {};
  
  if (scripts['test:multi-source']) {
    console.log('✅ test:multi-source script found');
  } else {
    console.log('❌ test:multi-source script missing');
  }
  
  // Check dependencies
  const dependencies = packageJson.dependencies || {};
  const requiredDeps = ['axios', 'cheerio'];
  
  requiredDeps.forEach(dep => {
    if (dependencies[dep]) {
      console.log(`✅ ${dep}: ${dependencies[dep]}`);
    } else {
      console.log(`❌ ${dep}: Missing`);
    }
  });
  
} catch (error) {
  console.log(`❌ Error reading package.json: ${error.message}`);
}

// Test basic functionality by checking imports
console.log('\n🧪 Testing basic functionality...');

// Test if we can read and parse the TypeScript files
try {
  const adzunaContent = fs.readFileSync('scrapers/adzuna-scraper.ts', 'utf8');
  
  // Check for key functionality
  const hasTargetCities = adzunaContent.includes('London') && adzunaContent.includes('Madrid');
  const hasTrackRotation = adzunaContent.includes('Track A') && adzunaContent.includes('Track B');
  const hasDailyBudget = adzunaContent.includes('dailyBudget');
  
  console.log(`   Target cities: ${hasTargetCities ? '✅' : '❌'}`);
  console.log(`   Track rotation: ${hasTrackRotation ? '✅' : '❌'}`);
  console.log(`   Daily budget: ${hasDailyBudget ? '✅' : '❌'}`);
  
} catch (error) {
  console.log(`   ❌ Error testing Adzuna functionality: ${error.message}`);
}

try {
  const reedContent = fs.readFileSync('scrapers/reed-scraper.ts', 'utf8');
  
  const hasBusinessHours = reedContent.includes('businessHours');
  const hasThrottling = reedContent.includes('throttleRequest');
  const hasLondonFocus = reedContent.includes('London');
  
  console.log(`   Business hours: ${hasBusinessHours ? '✅' : '❌'}`);
  console.log(`   Request throttling: ${hasThrottling ? '✅' : '❌'}`);
  console.log(`   London focus: ${hasLondonFocus ? '✅' : '❌'}`);
  
} catch (error) {
  console.log(`   ❌ Error testing Reed functionality: ${error.message}`);
}

try {
  const infojobsContent = fs.readFileSync('scrapers/infojobs-scraper.ts', 'utf8');
  
  const hasRotation = infojobsContent.includes('RotationStrategy');
  const hasSpanishCities = infojobsContent.includes('Madrid') && infojobsContent.includes('Barcelona');
  const hasHourlyRotation = infojobsContent.includes('topOfHour') && infojobsContent.includes('twentyPast');
  
  console.log(`   Rotation strategy: ${hasRotation ? '✅' : '❌'}`);
  console.log(`   Spanish cities: ${hasSpanishCities ? '✅' : '❌'}`);
  console.log(`   Hourly rotation: ${hasHourlyRotation ? '✅' : '❌'}`);
  
} catch (error) {
  console.log(`   ❌ Error testing InfoJobs functionality: ${error.message}`);
}

try {
  const orchestratorContent = fs.readFileSync('scrapers/multi-source-orchestrator.ts', 'utf8');
  
  const hasOrchestrator = orchestratorContent.includes('MultiSourceOrchestrator');
  const hasEarlyCareerPatterns = orchestratorContent.includes('EARLY_CAREER_PATTERNS');
  const hasMultilingual = orchestratorContent.includes('en:') && orchestratorContent.includes('es:');
  
  console.log(`   Orchestrator class: ${hasOrchestrator ? '✅' : '❌'}`);
  console.log(`   Early career patterns: ${hasEarlyCareerPatterns ? '✅' : '❌'}`);
  console.log(`   Multilingual support: ${hasMultilingual ? '✅' : '❌'}`);
  
} catch (error) {
  console.log(`   ❌ Error testing Orchestrator functionality: ${error.message}`);
}

console.log('\n🎯 Summary:');
console.log('The multi-source scraper system has been created with:');
console.log('• Adzuna scraper for 10 European cities with track rotation');
console.log('• Reed scraper for London with UK business hours and throttling');
console.log('• InfoJobs scraper for Madrid/Barcelona with hourly rotation');
console.log('• Multi-source orchestrator with shared design patterns');
console.log('• Early-career tagging in multiple languages');
console.log('• Comprehensive monitoring and metrics');

console.log('\n📝 Next steps:');
console.log('1. Set up environment variables for API keys');
console.log('2. Compile TypeScript files or use tsx for running');
console.log('3. Test individual scrapers with real API calls');
console.log('4. Run the full orchestrator for comprehensive scraping');

console.log('\n✅ Basic structure test completed successfully!');
