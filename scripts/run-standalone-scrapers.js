#!/usr/bin/env node

/**
 * Standalone Scrapers Runner
 * 
 * This script runs the standalone scrapers independently and can be:
 * - Used with existing scheduling infrastructure
 * - Run manually for testing
 * - Integrated with cron jobs
 * - Used with the existing schedule-scraping.js
 */

require('dotenv').config();

const { spawn } = require('child_process');
const path = require('path');

// Configuration
const CONFIG = {
  // Which scrapers to run
  scrapers: process.env.SCRAPERS?.split(',') || ['reed', 'adzuna', 'infojobs'],
  
  // Run mode
  mode: process.argv[2] || 'all', // 'all', 'reed', 'adzuna', 'infojobs'
  
  // Logging
  verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
  
  // Output format
  outputFormat: process.argv.includes('--json') ? 'json' : 'text'
};

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

// Run a single scraper
async function runScraper(scraperName) {
  log(`🚀 Starting ${scraperName} scraper...`, 'blue');
  
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const child = spawn('npx', ['tsx', '-e', `
      import 'dotenv/config';
      import MultiSourceOrchestrator from '../scrapers/multi-source-orchestrator.ts';
      
      (async () => {
        try {
          const orchestrator = new MultiSourceOrchestrator();
          console.log('✅ Orchestrator ready');
          
          console.log('🔄 Running ${scraperName} scraper...');
          const result = await orchestrator.runSingleSource('${scraperName}');
          
          console.log('✅ ${scraperName} scraping completed');
          console.log('📊 Results:', {
            jobsFound: result.jobs.length,
            metrics: result.metrics
          });
          
          if (result.jobs.length > 0) {
            console.log('📋 Sample jobs:');
            result.jobs.slice(0, 3).forEach((job, index) => {
              console.log('   ' + (index + 1) + '. ' + job.title + ' at ' + job.company + ' (' + job.location + ')');
            });
          }
          
          console.log('✅ ${scraperName} scraping test passed');
        } catch (error) {
          console.error('❌ ${scraperName} scraping test failed:', error.message);
          process.exit(1);
        }
      })();
    `], { 
      stdio: 'pipe',
      cwd: __dirname 
    });
    
    let output = '';
    let errorOutput = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
      if (CONFIG.verbose) {
        process.stdout.write(data);
      }
    });
    
    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
      if (CONFIG.verbose) {
        process.stderr.write(data);
      }
    });
    
    child.on('close', (code) => {
      const duration = Date.now() - startTime;
      
      if (code === 0) {
        log(`✅ ${scraperName} completed successfully in ${duration}ms`, 'green');
        resolve({
          success: true,
          scraper: scraperName,
          duration,
          output,
          errorOutput
        });
      } else {
        log(`❌ ${scraperName} failed with code ${code} in ${duration}ms`, 'red');
        resolve({
          success: false,
          scraper: scraperName,
          duration,
          output,
          errorOutput,
          exitCode: code
        });
      }
    });
  });
}

// Run all scrapers
async function runAllScrapers() {
  log('🎯 Starting all standalone scrapers...', 'bright');
  
  const results = [];
  const startTime = Date.now();
  
  for (const scraper of CONFIG.scrapers) {
    const result = await runScraper(scraper);
    results.push(result);
    
    // Small delay between scrapers
    if (scraper !== CONFIG.scrapers[CONFIG.scrapers.length - 1]) {
      log('⏳ Waiting 2 seconds before next scraper...', 'yellow');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  const totalDuration = Date.now() - startTime;
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  // Summary
  log('\n📊 Scraping Summary:', 'bright');
  log(`⏱️  Total duration: ${totalDuration}ms`, 'cyan');
  log(`✅ Successful: ${successful}/${results.length}`, 'green');
  log(`❌ Failed: ${failed}/${results.length}`, failed > 0 ? 'red' : 'green');
  
  // Individual results
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    log(`${status} ${result.scraper}: ${result.duration}ms`, result.success ? 'green' : 'red');
  });
  
  if (CONFIG.outputFormat === 'json') {
    console.log('\n' + JSON.stringify({
      timestamp: new Date().toISOString(),
      totalDuration,
      successful,
      failed,
      results
    }, null, 2));
  }
  
  return {
    success: failed === 0,
    totalDuration,
    successful,
    failed,
    results
  };
}

// Main execution
async function main() {
  const startTime = Date.now();
  
  try {
    let result;
    
    if (CONFIG.mode === 'all') {
      result = await runAllScrapers();
    } else if (['reed', 'adzuna', 'infojobs'].includes(CONFIG.mode)) {
      result = await runScraper(CONFIG.mode);
    } else {
      log(`❌ Unknown mode: ${CONFIG.mode}`, 'red');
      log('Available modes: all, reed, adzuna, infojobs', 'yellow');
      process.exit(1);
    }
    
    const totalDuration = Date.now() - startTime;
    
    if (result.success) {
      log(`🎉 All operations completed successfully in ${totalDuration}ms!`, 'green');
      process.exit(0);
    } else {
      log(`⚠️  Some operations failed. Total duration: ${totalDuration}ms`, 'yellow');
      process.exit(1);
    }
    
  } catch (error) {
    log(`💥 Fatal error: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Standalone Scrapers Runner

Usage:
  node run-standalone-scrapers.js [mode] [options]

Modes:
  all       - Run all scrapers (default)
  reed      - Run Reed scraper only
  adzuna    - Run Adzuna scraper only
  infojobs  - Run InfoJobs scraper only

Options:
  --verbose, -v    - Show detailed output
  --json          - Output results in JSON format
  --help, -h      - Show this help

Environment Variables:
  SCRAPERS         - Comma-separated list of scrapers to run
  DOTENV_CONFIG_PATH - Path to .env file

Examples:
  # Run all scrapers
  node run-standalone-scrapers.js
  
  # Run only Reed
  node run-standalone-scrapers.js reed
  
  # Run with verbose output
  node run-standalone-scrapers.js --verbose
  
  # Run with JSON output
  node run-standalone-scrapers.js --json
  
  # Custom scraper selection
  SCRAPERS=reed,adzuna node run-standalone-scrapers.js
`);
  process.exit(0);
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    log(`💥 Unhandled error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = {
  runScraper,
  runAllScrapers
};
