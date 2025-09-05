#!/usr/bin/env node

// 🧪 TEST REED API WITH EU CITIES - See what's available

const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

console.log('🧪 Testing Reed API with EU Cities\n');

async function testReedEUCities() {
  try {
    const reedApiKey = process.env.REED_API_KEY;
    
    if (!reedApiKey) {
      console.error('❌ REED_API_KEY not found in environment variables');
      return;
    }
    
    console.log('✅ Reed API key found');
    
    // Test EU cities that Reed might support
    const euCities = [
      'Dublin', 'Amsterdam', 'Berlin', 'Paris', 'Madrid', 'Rome', 
      'Brussels', 'Vienna', 'Stockholm', 'Copenhagen', 'Helsinki',
      'Warsaw', 'Prague', 'Budapest', 'Lisbon', 'Athens'
    ];
    
    const testQuery = 'graduate analyst';
    
    for (const city of euCities) {
      try {
        const url = 'https://www.reed.co.uk/api/1.0/search';
        const params = {
          keywords: testQuery,
          locationName: city,
          distanceFromLocation: 10,
          resultsToTake: 3
        };
        
        console.log(`🔍 Testing ${city}...`);
        
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
          console.log(`  ✅ ${city}: ${jobs.length} jobs found`);
          console.log(`     Sample: "${jobs[0].jobTitle}" at ${jobs[0].employerName}`);
        } else {
          console.log(`  ❌ ${city}: No jobs found`);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`  ❌ ${city}: Error - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testReedEUCities().then(() => {
  console.log('\n🎯 Reed EU cities test completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test error:', error);
  process.exit(1);
});
