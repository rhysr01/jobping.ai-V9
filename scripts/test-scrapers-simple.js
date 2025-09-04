#!/usr/bin/env node

/**
 * Simple Scraper Test Runner
 * Tests each scraper individually without TypeScript compilation issues
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { spawn } = require('child_process');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  const timestamp = new Date().toISOString();
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

// Test Adzuna scraper
async function testAdzuna() {
  log('🧪 Testing Adzuna Scraper...', 'blue');
  
  return new Promise((resolve) => {
    const child = spawn('npx', ['tsx', 'scrapers/adzuna-scraper-standalone.ts'], {
      stdio: 'pipe',
      cwd: path.join(__dirname, '..')
    });
    
    let output = '';
    let errorOutput = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
      process.stdout.write(data);
    });
    
    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
      process.stderr.write(data);
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        log('✅ Adzuna scraper test passed!', 'green');
        resolve({ success: true, output });
      } else {
        log(`❌ Adzuna scraper test failed with code ${code}`, 'red');
        log(`Error output: ${errorOutput}`, 'red');
        resolve({ success: false, error: errorOutput });
      }
    });
  });
}

// Test Reed scraper
async function testReed() {
  log('🧪 Testing Reed Scraper...', 'blue');
  
  return new Promise((resolve) => {
    const child = spawn('npx', ['tsx', 'scrapers/reed-scraper-standalone.ts'], {
      stdio: 'pipe',
      cwd: path.join(__dirname, '..')
    });
    
    let output = '';
    let errorOutput = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
      process.stdout.write(data);
    });
    
    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
      process.stderr.write(data);
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        log('✅ Reed scraper test passed!', 'green');
        resolve({ success: true, output });
      } else {
        log(`❌ Reed scraper test failed with code ${code}`, 'red');
        log(`Error output: ${errorOutput}`, 'red');
        resolve({ success: false, error: errorOutput });
      }
    });
  });
}

// Test Lever scraper
async function testLever() {
  log('🧪 Testing Lever Scraper...', 'blue');
  
  return new Promise((resolve) => {
    const child = spawn('npx', ['tsx', 'scrapers/lever.ts'], {
      stdio: 'pipe',
      cwd: path.join(__dirname, '..')
    });
    
    let output = '';
    let errorOutput = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
      process.stdout.write(data);
    });
    
    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
      process.stderr.write(data);
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        log('✅ Lever scraper test passed!', 'green');
        resolve({ success: true, output });
      } else {
        log(`❌ Lever scraper test failed with code ${code}`, 'red');
        log(`Error output: ${errorOutput}`, 'red');
        resolve({ success: false, error: errorOutput });
      }
    });
  });
}

// Test all scrapers
async function testAllScrapers() {
  log('🚀 Testing All Scrapers Together...', 'cyan');
  log('=' * 50, 'cyan');
  
  const results = {
    adzuna: await testAdzuna(),
    reed: await testReed(),
    lever: await testLever()
  };
  
  log('\n📊 Test Results Summary:', 'cyan');
  log('=' * 50, 'cyan');
  
  let passed = 0;
  let failed = 0;
  
  for (const [scraper, result] of Object.entries(results)) {
    if (result.success) {
      log(`✅ ${scraper.toUpperCase()}: PASSED`, 'green');
      passed++;
    } else {
      log(`❌ ${scraper.toUpperCase()}: FAILED`, 'red');
      failed++;
    }
  }
  
  log('\n🎯 Final Results:', 'cyan');
  log(`✅ Passed: ${passed}`, 'green');
  log(`❌ Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  
  if (failed === 0) {
    log('\n🎉 ALL SCRAPERS ARE WORKING!', 'green');
  } else {
    log('\n⚠️  Some scrapers need attention', 'yellow');
  }
  
  return results;
}

// Main execution
async function main() {
  const mode = process.argv[2] || 'all';
  
  try {
    switch (mode) {
      case 'adzuna':
        await testAdzuna();
        break;
      case 'reed':
        await testReed();
        break;
      case 'lever':
        await testLever();
        break;
      case 'all':
      default:
        await testAllScrapers();
        break;
    }
  } catch (error) {
    log(`💥 Test execution failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { testAdzuna, testReed, testLever, testAllScrapers };
