#!/usr/bin/env node

// 🧪 TEST REED REAL API - Verify it works with real jobs

const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

console.log('🧪 Testing Reed Real API\n');

async function testReedAPI() {
  try {
    const reedApiKey = process.env.REED_API_KEY;
    
    if (!reedApiKey) {
      console.error('❌ REED_API_KEY not found in environment variables');
      return;
    }
    
    console.log('✅ Reed API key found');
    
    // Test with a simple search for graduate jobs in London
    const url = 'https://www.reed.co.uk/api/1.0/search';
    const params = {
      keywords: 'graduate analyst',
      locationName: 'London',
      distanceFromLocation: 10,
      resultsToTake: 5
    };
    
    console.log('🔍 Testing Reed API with search:', params);
    
    const response = await axios.get(url, {
      params,
      headers: {
        'Authorization': `Basic ${Buffer.from(reedApiKey + ':').toString('base64')}`,
        'User-Agent': 'JobPing/1.0'
      },
      timeout: 10000
    });
    
    console.log('✅ Reed API response received');
    console.log(`📊 Total results: ${response.data.totalResults}`);
    console.log(`📋 Jobs returned: ${response.data.results?.length || 0}`);
    
    if (response.data.results && response.data.results.length > 0) {
      console.log('\n📋 Sample real Reed jobs:');
      response.data.results.slice(0, 3).forEach((job, index) => {
        console.log(`   ${index + 1}. "${job.jobTitle}" at ${job.employerName}`);
        console.log(`      Location: ${job.locationName}`);
        console.log(`      Posted: ${job.datePosted}`);
        console.log(`      URL: ${job.jobUrl}`);
        console.log('');
      });
      
      console.log('✅ Reed API is working and returning real jobs!');
    } else {
      console.log('⚠️  No jobs returned from Reed API');
    }
    
  } catch (error) {
    console.error('❌ Reed API test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

// Run the test
testReedAPI().then(() => {
  console.log('\n🎯 Reed API test completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test error:', error);
  process.exit(1);
});
