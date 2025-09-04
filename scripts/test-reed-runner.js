#!/usr/bin/env node

/**
 * Test Reed scraper with proper instantiation
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { spawn } = require('child_process');
const path = require('path');

async function testReedRunner() {
  console.log('🔍 Testing Reed scraper with proper instantiation...');
  
  // Create a simple TypeScript file that instantiates and runs the scraper
  const testCode = `
import ReedScraper from '../scrapers/reed-scraper-standalone';

async function runReedTest() {
  try {
    console.log('🚀 Starting Reed scraper test...');
    
    const scraper = new ReedScraper();
    
    // Check if it's business hours
    const status = scraper.getStatus();
    console.log('📊 Current status:', JSON.stringify(status, null, 2));
    
    if (!status.businessHours) {
      console.log('⏰ Outside business hours, testing with date range instead...');
      
      // Test with date range
      const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const toDate = new Date().toISOString().split('T')[0];
      
      console.log(\`📅 Testing date range: \${fromDate} to \${toDate}\`);
      const dateRangeResult = await scraper.scrapeLondonWithDateRange(fromDate, toDate);
      
      console.log('📊 Date range result:');
      console.log(JSON.stringify(dateRangeResult, null, 2));
      
      // Show sample jobs
      if (dateRangeResult.jobs && dateRangeResult.jobs.length > 0) {
        console.log('\\n📋 Sample jobs:');
        dateRangeResult.jobs.slice(0, 3).forEach((job, index) => {
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
    } else {
      // Test normal scrape
      console.log('📍 Testing normal scrape...');
      const result = await scraper.scrapeLondon();
      
      console.log('📊 Normal scrape result:');
      console.log(JSON.stringify(result, null, 2));
      
      // Show sample jobs
      if (result.jobs && result.jobs.length > 0) {
        console.log('\\n📋 Sample jobs:');
        result.jobs.slice(0, 3).forEach((job, index) => {
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
    }
    
    console.log('\\n✅ Reed test completed successfully');
    
  } catch (error) {
    console.error('❌ Reed test failed:', error);
    process.exit(1);
  }
}

runReedTest();
`;

  // Write the test code to a temporary file
  const fs = require('fs');
  const testFile = path.join(__dirname, 'temp-reed-test.ts');
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
      
      console.log(`\n🔍 Reed test runner exited with code ${code}`);
      
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Reed test runner failed: ${errorOutput}`));
      }
    });
  });
}

// Run the test
testReedRunner()
  .then(output => {
    console.log('\n✅ Reed test runner completed successfully');
    console.log('📊 Output length:', output.length);
  })
  .catch(error => {
    console.log('\n❌ Reed test runner failed:', error.message);
  });
