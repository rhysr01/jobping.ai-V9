#!/usr/bin/env node

/**
 * Test Adzuna scraper with proper instantiation
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { spawn } = require('child_process');
const path = require('path');

async function testAdzunaRunner() {
  console.log('🔍 Testing Adzuna scraper with proper instantiation...');
  
  // Create a simple TypeScript file that instantiates and runs the scraper
  const testCode = `
import AdzunaScraper from '../scrapers/adzuna-scraper-standalone';

async function runAdzunaTest() {
  try {
    console.log('🚀 Starting Adzuna scraper test...');
    
    const scraper = new AdzunaScraper();
    
    // Test single city first
    console.log('📍 Testing single city scrape...');
    const singleResult = await scraper.scrapeSingleCity('London');
    
    console.log('📊 Single city result:');
    console.log(JSON.stringify(singleResult, null, 2));
    
    // Show sample jobs
    if (singleResult.jobs && singleResult.jobs.length > 0) {
      console.log('\\n📋 Sample jobs:');
      singleResult.jobs.slice(0, 3).forEach((job, index) => {
        console.log(\`\\nJob \${index + 1}:\`);
        console.log(\`  Title: \${job.title}\`);
        console.log(\`  Company: \${job.company}\`);
        console.log(\`  Location: \${job.location}\`);
        console.log(\`  URL: \${job.url}\`);
        console.log(\`  Description: \${job.description.substring(0, 100)}...\`);
        console.log(\`  Posted: \${job.posted_at}\`);
        console.log(\`  Source: \${job.source}\`);
      });
    }
    
    console.log('\\n✅ Adzuna test completed successfully');
    
  } catch (error) {
    console.error('❌ Adzuna test failed:', error);
    process.exit(1);
  }
}

runAdzunaTest();
`;

  // Write the test code to a temporary file
  const fs = require('fs');
  const testFile = path.join(__dirname, 'temp-adzuna-test.ts');
  fs.writeFileSync(testFile, testCode);
  
  console.log('📝 Created temporary test file:', testFile);
  
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['tsx', testFile], {
      stdio: 'pipe',
      cwd: path.join(__dirname, '..')
    });
    
    let output = '';
    let errorOutput = '';
    
    child.stdout.on('data', (data) => {
      const dataStr = data.toString();
      output += dataStr;
      process.stdout.write(dataStr);
    });
    
    child.stderr.on('data', (data) => {
      const dataStr = data.toString();
      errorOutput += dataStr;
      process.stderr.write(dataStr);
    });
    
    child.on('close', (code) => {
      // Clean up temp file
      try {
        fs.unlinkSync(testFile);
        console.log('\n🧹 Cleaned up temporary file');
      } catch (e) {
        // Ignore cleanup errors
      }
      
      console.log(`\n🔍 Adzuna test runner exited with code ${code}`);
      
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Adzuna test runner failed: ${errorOutput}`));
      }
    });
  });
}

// Run the test
testAdzunaRunner()
  .then(output => {
    console.log('\n✅ Adzuna test runner completed successfully');
    console.log('📊 Output length:', output.length);
  })
  .catch(error => {
    console.log('\n❌ Adzuna test runner failed:', error.message);
  });
