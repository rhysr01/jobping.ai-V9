#!/usr/bin/env node

/**
 * Simple script to run the multi-source orchestrator
 * Uses tsx directly to avoid module resolution issues
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Running Multi-Source Orchestrator\n');

// Run single source scraping
async function runSingleSource(source) {
  console.log(`📍 Running ${source} scraper...`);
  
  return new Promise((resolve) => {
    const child = spawn('npx', ['tsx', '-e', `
      import 'dotenv/config';
      import MultiSourceOrchestrator from '../scrapers/multi-source-orchestrator.ts';
      
      (async () => {
        try {
          const orchestrator = new MultiSourceOrchestrator();
          console.log('✅ Orchestrator ready');
          
          console.log('🔄 Running ${source} scraper...');
          const result = await orchestrator.runSingleSource('${source}');
          
          console.log('✅ ${source} scraping completed');
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
          
          console.log('✅ ${source} scraping test passed');
        } catch (error) {
          console.error('❌ ${source} scraping test failed:', error.message);
          process.exit(1);
        }
      })();
    `], { 
      stdio: 'pipe',
      cwd: __dirname 
    });
    
    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    child.on('close', (code) => {
      console.log(output);
      resolve(code === 0);
    });
  });
}

// Run full multi-source scraping
async function runFullScrape() {
  console.log('📍 Running full multi-source scrape...');
  
  return new Promise((resolve) => {
    const child = spawn('npx', ['tsx', '-e', `
      import 'dotenv/config';
      import MultiSourceOrchestrator from '../scrapers/multi-source-orchestrator.ts';
      
      (async () => {
        try {
          const orchestrator = new MultiSourceOrchestrator();
          console.log('✅ Orchestrator ready');
          
          console.log('🔄 Running full multi-source scrape...');
          const result = await orchestrator.runFullScrape();
          
          console.log('✅ Full scraping completed');
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
          
          console.log('✅ Full scraping test passed');
        } catch (error) {
          console.error('❌ Full scraping test failed:', error.message);
          process.exit(1);
        }
      })();
    `], { 
      stdio: 'pipe',
      cwd: __dirname 
    });
    
    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    child.on('close', (code) => {
      console.log(output);
      resolve(code === 0);
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node run-orchestrator-simple.js [reed|adzuna|infojobs|full]');
    console.log('Examples:');
    console.log('  node run-orchestrator-simple.js reed     # Run Reed scraper only');
    console.log('  node run-orchestrator-simple.js adzuna  # Run Adzuna scraper only');
    console.log('  node run-orchestrator-simple.js full    # Run all scrapers');
    process.exit(1);
  }
  
  const command = args[0];
  
  try {
    switch (command) {
      case 'reed':
        await runSingleSource('reed');
        break;
      case 'adzuna':
        await runSingleSource('adzuna');
        break;
      case 'infojobs':
        await runSingleSource('infojobs');
        break;
      case 'full':
        await runFullScrape();
        break;
      default:
        console.log('❌ Unknown command: ' + command);
        process.exit(1);
    }
    
    console.log('\n🎉 Orchestrator run completed successfully!');
    
  } catch (error) {
    console.error('💥 Orchestrator run failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  runSingleSource,
  runFullScrape
};
