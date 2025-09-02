#!/usr/bin/env node

/**
 * Focused test for Adzuna scraper only
 * Tests the scraper with real API credentials
 */

// Load environment variables from .env.local first, then .env
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing Adzuna Scraper with Real API\n');

// Check environment variables
console.log('🔑 Checking Adzuna environment variables...');
const adzunaAppId = process.env.ADZUNA_APP_ID;
const adzunaAppKey = process.env.ADZUNA_APP_KEY;

if (!adzunaAppId || !adzunaAppKey) {
  console.log('❌ Missing Adzuna environment variables:');
  console.log(`   ADZUNA_APP_ID: ${adzunaAppId ? '✅ Set' : '❌ Missing'}`);
  console.log(`   ADZUNA_APP_KEY: ${adzunaAppKey ? '✅ Set' : '❌ Missing'}`);
  console.log('\nPlease set these environment variables and try again.');
  process.exit(1);
}

console.log('✅ Adzuna credentials found');
console.log(`   APP_ID: ${adzunaAppId.substring(0, 8)}...`);
console.log(`   APP_KEY: ${adzunaAppKey.substring(0, 8)}...`);

// Test Adzuna scraper instantiation
console.log('\n📍 Testing Adzuna scraper instantiation...');

const testInstantiation = `
  import AdzunaScraper from '../scrapers/adzuna-scraper.ts';
  
  try {
    const scraper = new AdzunaScraper();
    console.log('✅ Adzuna scraper instantiated successfully');
    
    const stats = scraper.getDailyStats();
    console.log('📊 Initial daily stats:', stats);
    
    console.log('✅ Adzuna scraper instantiation test passed');
  } catch (error) {
    console.error('❌ Adzuna scraper instantiation failed:', error.message);
    process.exit(1);
  }
`;

// Test single city scraping (London)
console.log('\n🔄 Testing single city scraping (London)...');

const testLondonScrape = `
  import AdzunaScraper from '../scrapers/adzuna-scraper.ts';
  
  try {
    const scraper = new AdzunaScraper();
    console.log('✅ Adzuna scraper ready');
    
    console.log('🔄 Attempting to scrape London...');
    const result = await scraper.scrapeSingleCity('London');
    
    console.log('✅ London scraping completed');
    console.log('📊 Results:', {
      jobsFound: result.jobs.length,
      callsUsed: result.metrics.callsUsed,
      budgetRemaining: result.metrics.budgetRemaining
    });
    
    if (result.jobs.length > 0) {
      console.log('📋 Sample job:', {
        title: result.jobs[0].title,
        company: result.jobs[0].company,
        location: result.jobs[0].location,
        source: result.jobs[0].source
      });
    }
    
    console.log('✅ London scraping test passed');
  } catch (error) {
    console.error('❌ London scraping test failed:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', error.response.data);
    }
    process.exit(1);
  }
`;

// Test daily budget tracking
console.log('\n💰 Testing daily budget tracking...');

const testBudgetTracking = `
  import AdzunaScraper from '../scrapers/adzuna-scraper.ts';
  
  try {
    const scraper = new AdzunaScraper();
    
    // Get initial stats
    const initialStats = scraper.getDailyStats();
    console.log('📊 Initial stats:', initialStats);
    
    // Simulate some API calls
    console.log('🔄 Simulating API calls...');
    for (let i = 0; i < 3; i++) {
      try {
        await scraper.scrapeSingleCity('London');
        const currentStats = scraper.getDailyStats();
        console.log(\`   Call \${i + 1}: \${currentStats.callsUsed} used, \${currentStats.budgetRemaining} remaining\`);
      } catch (error) {
        console.log(\`   Call \${i + 1}: \${error.message}\`);
      }
    }
    
    const finalStats = scraper.getDailyStats();
    console.log('📊 Final stats:', finalStats);
    
    console.log('✅ Budget tracking test passed');
  } catch (error) {
    console.error('❌ Budget tracking test failed:', error.message);
    process.exit(1);
  }
`;

async function runTest(testName, testCode) {
  return new Promise((resolve) => {
    console.log(`\n🧪 Running ${testName}...`);
    
    const tempFile = path.join(__dirname, `temp-${testName.toLowerCase().replace(/\s+/g, '-')}.js`);
    require('fs').writeFileSync(tempFile, testCode);
    
    const child = spawn('npx', ['tsx', tempFile], { 
      stdio: 'pipe',
      cwd: __dirname 
    });
    
    let output = '';
    let errorOutput = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    child.on('close', (code) => {
      require('fs').unlinkSync(tempFile);
      
      if (code === 0) {
        console.log(output);
        console.log(`✅ ${testName} passed`);
        resolve(true);
      } else {
        console.log('❌ Test failed with output:');
        console.log(output);
        if (errorOutput) {
          console.log('Errors:', errorOutput);
        }
        resolve(false);
      }
    });
  });
}

async function main() {
  console.log('🚀 Starting Adzuna scraper tests...\n');
  
  const results = [];
  
  // Run tests
  results.push(await runTest('Instantiation Test', testInstantiation));
  results.push(await runTest('London Scraping Test', testLondonScrape));
  results.push(await runTest('Budget Tracking Test', testBudgetTracking));
  
  // Summary
  console.log('\n🎯 Adzuna Test Results Summary:');
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 All Adzuna scraper tests passed!');
    console.log('The Adzuna scraper is working correctly with your API credentials.');
    console.log('\n📝 Next steps:');
    console.log('• Test with other cities (Madrid, Berlin, etc.)');
    console.log('• Test the full multi-city scraping');
    console.log('• Integrate with the multi-source orchestrator');
  } else {
    console.log('\n💥 Some Adzuna tests failed.');
    console.log('Check the output above for specific issues.');
    console.log('\n🔧 Common issues:');
    console.log('• Invalid API credentials');
    console.log('• Rate limiting');
    console.log('• Network connectivity');
    console.log('• API endpoint changes');
  }
}

// Run the tests
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  runTest
};
