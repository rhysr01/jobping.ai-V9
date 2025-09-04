#!/usr/bin/env node

/**
 * Test Live Career Path Rotation
 * Runs scrapers to see actual rotation in action
 */

const { spawn } = require('child_process');

async function testRotation() {
  console.log('🎯 Testing Live Career Path Rotation\n');
  
  // Test Reed scraper rotation
  console.log('📍 Testing Reed Scraper Rotation...');
  console.log('   Reed rotates through 5 tracks each run:\n');
  
  for (let i = 1; i <= 3; i++) {
    console.log(`   Run ${i}:`);
    
    try {
      const result = await runScraper('reed');
      console.log(`   ✅ Track: ${result.track}`);
      console.log(`   ✅ Jobs found: ${result.jobsFound}`);
      console.log(`   ✅ Career path: ${result.careerPath}\n`);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }
    
    // Small delay between runs
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('🔄 Reed rotation test complete!\n');
  
  // Test Adzuna scraper rotation
  console.log('📍 Testing Adzuna Scraper Rotation...');
  console.log('   Adzuna rotates through 5 tracks daily:\n');
  
  try {
    const result = await runScraper('adzuna');
    console.log(`   ✅ Current Track: ${result.track}`);
    console.log(`   ✅ Jobs found: ${result.jobsFound}`);
    console.log(`   ✅ Career path: ${result.careerPath}\n`);
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
  }
  
  console.log('✅ Rotation testing complete!');
}

function runScraper(type) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [`scripts/run-standalone-scrapers.js`, type, '--json'], {
      stdio: ['pipe', 'pipe', 'pipe']
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
      if (code === 0) {
        try {
          // Parse the output to extract track and job count
          const lines = output.split('\n');
          let track = 'Unknown';
          let jobsFound = 0;
          let careerPath = 'Unknown';
          
          for (const line of lines) {
            if (line.includes('Run') && line.includes(':')) {
              track = line.match(/Run ([A-E]):/)?.[1] || 'Unknown';
            }
            if (line.includes('Track') && line.includes(':')) {
              track = line.match(/Track ([A-E]):/)?.[1] || 'Unknown';
            }
            if (line.includes('jobsFound')) {
              jobsFound = parseInt(line.match(/jobsFound":\s*(\d+)/)?.[1] || '0');
            }
          }
          
          // Map track to career path
          const careerPaths = {
            'A': 'Strategy & Business Design',
            'B': 'Consulting & Strategy', 
            'C': 'Data & Analytics',
            'D': 'Operations & Management',
            'E': 'Tech & Product'
          };
          
          careerPath = careerPaths[track] || 'Unknown';
          
          resolve({ track, jobsFound, careerPath });
        } catch (error) {
          resolve({ track: 'Unknown', jobsFound: 0, careerPath: 'Unknown' });
        }
      } else {
        reject(new Error(`Scraper failed with code ${code}: ${errorOutput}`));
      }
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      child.kill();
      reject(new Error('Scraper timed out'));
    }, 30000);
  });
}

// Run the test
if (require.main === module) {
  testRotation().catch(console.error);
}

module.exports = { testRotation, runScraper };
