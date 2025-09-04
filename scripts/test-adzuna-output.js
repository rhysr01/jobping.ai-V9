#!/usr/bin/env node

/**
 * Test Adzuna scraper output format
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { spawn } = require('child_process');
const path = require('path');

async function testAdzunaOutput() {
  console.log('🔍 Testing Adzuna scraper output format...');
  
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['tsx', 'scrapers/adzuna-scraper-standalone.ts'], {
      stdio: 'pipe',
      cwd: path.join(__dirname, '..')
    });
    
    let output = '';
    let errorOutput = '';
    
    child.stdout.on('data', (data) => {
      const dataStr = data.toString();
      output += dataStr;
      console.log('STDOUT:', dataStr);
    });
    
    child.stderr.on('data', (data) => {
      const dataStr = data.toString();
      errorOutput += dataStr;
      console.log('STDERR:', dataStr);
    });
    
    child.on('close', (code) => {
      console.log(`\n🔍 Adzuna scraper exited with code ${code}`);
      console.log('\n📋 FULL OUTPUT:');
      console.log('='.repeat(50));
      console.log(output);
      console.log('='.repeat(50));
      
      if (errorOutput) {
        console.log('\n❌ ERRORS:');
        console.log('='.repeat(50));
        console.log(errorOutput);
        console.log('='.repeat(50));
      }
      
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Adzuna scraper failed: ${errorOutput}`));
      }
    });
  });
}

// Run the test
testAdzunaOutput()
  .then(output => {
    console.log('\n✅ Adzuna test completed successfully');
    console.log('📊 Output length:', output.length);
  })
  .catch(error => {
    console.log('\n❌ Adzuna test failed:', error.message);
  });
