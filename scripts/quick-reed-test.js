#!/usr/bin/env node

// Quick test of Reed API - let's see what we get!
console.log('🚀 Quick Reed Test - Getting Real Results!\n');

// Check if we have the required environment variables
const apiKey = process.env.REED_API_KEY;

if (!apiKey) {
  console.log('❌ Missing Reed API credentials');
  console.log('   Set REED_API_KEY environment variable');
  process.exit(1);
}

console.log('✅ API credentials found');
console.log('🔑 API Key:', apiKey ? '***' + apiKey.slice(-4) : 'Not set');

// Test a simple API call to see if it works
console.log('\n🔍 Testing Reed API connection...');

import('https').then(https => {
  const auth = Buffer.from(apiKey + ':').toString('base64');
  const url = 'https://www.reed.co.uk/api/1.0/search?keywords=graduate&locationName=London&distanceFromLocation=10&resultsToTake=5';
  
  const options = {
    headers: {
      'Authorization': `Basic ${auth}`,
      'User-Agent': 'JobPing/1.0',
      'Accept': 'application/json'
    }
  };
  
  https.get(url, options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        console.log('✅ API connection successful!');
        console.log('📊 Jobs found:', result.results?.length || 0);
        console.log('🌍 Location: London');
        console.log('🔍 Query: graduate jobs');
        
        if (result.results && result.results.length > 0) {
          console.log('\n🎯 Sample jobs:');
          result.results.slice(0, 3).forEach((job, i) => {
            console.log(`  ${i + 1}. ${job.jobTitle} at ${job.employerName} (${job.locationName})`);
            console.log(`     💰 Salary: ${job.minimumSalary ? '£' + job.minimumSalary : 'Not specified'}`);
          });
        }
        
      } catch (error) {
        console.log('❌ Failed to parse API response:', error.message);
        console.log('📄 Raw response:', data.slice(0, 200) + '...');
      }
    });
  }).on('error', (error) => {
    console.log('❌ API request failed:', error.message);
  });
});
