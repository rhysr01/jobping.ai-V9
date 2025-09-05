#!/usr/bin/env node

// 🧪 TEST REED API FOR REMOTE AND UK EXPANSION

const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

console.log('🧪 Testing Reed API for Remote and UK Expansion\n');

async function testReedRemoteUK() {
  try {
    const reedApiKey = process.env.REED_API_KEY;
    
    if (!reedApiKey) {
      console.error('❌ REED_API_KEY not found in environment variables');
      return;
    }
    
    console.log('✅ Reed API key found');
    
    // Test additional UK cities and remote options
    const testLocations = [
      'Remote', 'Work from home', 'Hybrid', 'Flexible',
      'Leeds', 'Liverpool', 'Bristol', 'Newcastle', 'Cardiff', 'Belfast',
      'Edinburgh', 'Glasgow', 'Aberdeen', 'Dundee',
      'Cambridge', 'Oxford', 'Bath', 'York', 'Nottingham', 'Leicester'
    ];
    
    const testQuery = 'graduate analyst';
    
    for (const location of testLocations) {
      try {
        const url = 'https://www.reed.co.uk/api/1.0/search';
        const params = {
          keywords: testQuery,
          locationName: location,
          distanceFromLocation: 10,
          resultsToTake: 3
        };
        
        console.log(`🔍 Testing ${location}...`);
        
        const response = await axios.get(url, {
          params,
          headers: {
            'Authorization': `Basic ${Buffer.from(reedApiKey + ':').toString('base64')}`,
            'User-Agent': 'JobPing/1.0'
          },
          timeout: 10000
        });
        
        const jobs = response.data.results || [];
        
        if (jobs.length > 0) {
          console.log(`  ✅ ${location}: ${jobs.length} jobs found`);
          console.log(`     Sample: "${jobs[0].jobTitle}" at ${jobs[0].employerName}`);
        } else {
          console.log(`  ❌ ${location}: No jobs found`);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`  ❌ ${location}: Error - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testReedRemoteUK().then(() => {
  console.log('\n🎯 Reed remote/UK expansion test completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test error:', error);
  process.exit(1);
});
