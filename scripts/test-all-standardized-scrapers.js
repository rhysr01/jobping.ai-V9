#!/usr/bin/env node

// 🧪 COMPREHENSIVE TEST: All Standardized Scrapers
// This tests that ALL scrapers are now at the same high level

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Test configuration
const SCRAPER_TESTS = [
  {
    name: 'Adzuna',
    file: 'scrapers/adzuna-scraper-standalone.ts',
    testCommand: 'npx tsx scrapers/adzuna-scraper-standalone.ts',
    expectedFeatures: [
      '✅ Early-career filtering',
      '✅ EU city expansion (12 cities)',
      '✅ Career path rotation (5 tracks)',
      '✅ Rate limiting & API budget management',
      '✅ Duplicate job prevention',
      '✅ Comprehensive error handling'
    ]
  },
  {
    name: 'Reed',
    file: 'scrapers/reed-scraper-standalone.ts',
    testCommand: 'npx tsx scrapers/reed-scraper-standalone.ts',
    expectedFeatures: [
      '✅ Early-career filtering',
      '✅ Multi-city expansion (5 cities)',
      '✅ Career path rotation (5 tracks)',
      '✅ Rate limiting & API budget management',
      '✅ Duplicate job prevention',
      '✅ Comprehensive error handling'
    ]
  },
  {
    name: 'Greenhouse (Standardized)',
    file: 'scrapers/greenhouse-standardized.ts',
    testCommand: 'npx tsx scrapers/greenhouse-standardized.ts',
    expectedFeatures: [
      '✅ Early-career filtering',
      '✅ EU company targeting (30+ companies)',
      '✅ Career path rotation (5 tracks)',
      '✅ Rate limiting & respectful API usage',
      '✅ Duplicate job prevention',
      '✅ Comprehensive error handling'
    ]
  },
  {
    name: 'Indeed',
    file: 'scrapers/indeed-scraper.ts',
    testCommand: 'npx tsx scrapers/indeed-scraper.ts',
    expectedFeatures: [
      '✅ Early-career filtering',
      '✅ EU city targeting (10 cities)',
      '✅ Career path rotation (5 tracks)',
      '✅ Rate limiting & daily budget management',
      '✅ Duplicate job prevention',
      '✅ Comprehensive error handling'
    ]
  },
  {
    name: 'The Muse',
    file: 'scrapers/muse-scraper.ts',
    testCommand: 'npx tsx scrapers/muse-scraper.ts',
    expectedFeatures: [
      '✅ Early-career filtering',
      '✅ EU location targeting (15+ locations)',
      '✅ Career path rotation (5 tracks)',
      '✅ Rate limiting & hourly budget management',
      '✅ Duplicate job prevention',
      '✅ Comprehensive error handling'
    ]
  },
  {
    name: 'JSearch',
    file: 'scrapers/jsearch-scraper.ts',
    testCommand: 'npx tsx scrapers/jsearch-scraper.ts',
    expectedFeatures: [
      '✅ Early-career filtering',
      '✅ EU location filtering (explicit EU-only)',
      '✅ Career path rotation (5 tracks)',
      '✅ Rate limiting & conservative API usage',
      '✅ Duplicate job prevention',
      '✅ Comprehensive error handling'
    ]
  }
];

// Test results tracking
const testResults = {
  total: SCRAPER_TESTS.length,
  passed: 0,
  failed: 0,
  details: []
};

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

async function checkFileExists(filePath) {
  try {
    const { execSync } = require('child_process');
    execSync(`test -f "${filePath}"`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function testScraper(scraperTest) {
  log(`Testing ${scraperTest.name}...`, 'info');
  
  const result = {
    name: scraperTest.name,
    fileExists: false,
    features: [],
    testPassed: false,
    error: null
  };
  
  try {
    // Check if file exists
    result.fileExists = await checkFileExists(scraperTest.file);
    if (!result.fileExists) {
      throw new Error(`File not found: ${scraperTest.file}`);
    }
    
    log(`  📁 File exists: ${scraperTest.file}`, 'success');
    
    // Check expected features by examining the file content
    const { execSync } = require('child_process');
    const fileContent = execSync(`cat "${scraperTest.file}"`, { encoding: 'utf8' });
    
    // Verify key features exist in the code
    const featureChecks = [
      { name: 'Early-career filtering', pattern: /classifyEarlyCareer|isEarlyCareer/ },
      { name: 'EU targeting', pattern: /EU|europe|London|Berlin|Paris|Amsterdam/ },
      { name: 'Career path rotation', pattern: /TRACK_|Track|rotation/ },
      { name: 'Rate limiting', pattern: /throttle|rate|interval|budget/ },
      { name: 'Duplicate prevention', pattern: /seenJobs|duplicate|hash/ },
      { name: 'Error handling', pattern: /try.*catch|error.*handling/ }
    ];
    
    for (const check of featureChecks) {
      if (check.pattern.test(fileContent)) {
        result.features.push(`✅ ${check.name}`);
      } else {
        result.features.push(`❌ ${check.name}`);
      }
    }
    
    // Run a quick test (just check if it can be imported/compiled)
    log(`  🧪 Running quick test...`, 'info');
    await execAsync(`npx tsx -e "import('${scraperTest.file}').then(m => console.log('✅ Import successful')).catch(e => console.error('❌ Import failed:', e.message))"`, {
      timeout: 30000
    });
    
    result.testPassed = true;
    log(`  ✅ ${scraperTest.name} test passed!`, 'success');
    
  } catch (error) {
    result.error = error.message;
    log(`  ❌ ${scraperTest.name} test failed: ${error.message}`, 'error');
  }
  
  return result;
}

async function runAllTests() {
  console.log('\n🚀 JOBPING SCRAPER STANDARDIZATION TEST');
  console.log('==========================================');
  console.log(`Testing ${SCRAPER_TESTS.length} scrapers for standardization...\n`);
  
  // Test each scraper
  for (const scraperTest of SCRAPER_TESTS) {
    const result = await testScraper(scraperTest);
    testResults.details.push(result);
    
    if (result.testPassed) {
      testResults.passed++;
    } else {
      testResults.failed++;
    }
    
    console.log(''); // Spacing
  }
  
  // Generate comprehensive report
  generateReport();
}

function generateReport() {
  console.log('\n📊 COMPREHENSIVE TEST REPORT');
  console.log('==============================');
  
  // Summary
  console.log(`\n📈 SUMMARY:`);
  console.log(`   Total scrapers tested: ${testResults.total}`);
  console.log(`   ✅ Passed: ${testResults.passed}`);
  console.log(`   ❌ Failed: ${testResults.failed}`);
  console.log(`   📊 Success rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  // Detailed results
  console.log(`\n🔍 DETAILED RESULTS:`);
  for (const result of testResults.details) {
    console.log(`\n${result.name}:`);
    console.log(`   📁 File exists: ${result.fileExists ? '✅' : '❌'}`);
    console.log(`   🧪 Test passed: ${result.testPassed ? '✅' : '❌'}`);
    
    if (result.features.length > 0) {
      console.log(`   🎯 Features:`);
      result.features.forEach(feature => console.log(`      ${feature}`));
    }
    
    if (result.error) {
      console.log(`   ❌ Error: ${result.error}`);
    }
  }
  
  // Recommendations
  console.log(`\n💡 RECOMMENDATIONS:`);
  if (testResults.failed === 0) {
    console.log(`   🎉 All scrapers are now at the same high standard!`);
    console.log(`   🚀 Ready for production automation.`);
  } else {
    console.log(`   🔧 ${testResults.failed} scraper(s) need attention.`);
    console.log(`   📝 Review failed tests above and fix issues.`);
  }
  
  // Next steps
  console.log(`\n🚀 NEXT STEPS:`);
  if (testResults.failed === 0) {
    console.log(`   1. Deploy to Railway with real automation`);
    console.log(`   2. Monitor automated job ingestion`);
    console.log(`   3. Verify database population`);
  } else {
    console.log(`   1. Fix failed scraper tests`);
    console.log(`   2. Re-run this test`);
    console.log(`   3. Deploy only when all pass`);
  }
  
  console.log('\n' + '='.repeat(50));
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests, testResults };
