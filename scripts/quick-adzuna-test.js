#!/usr/bin/env node

// Quick test of Adzuna scraper - let's see what we get!
console.log('🚀 Quick Adzuna Test - Getting Real Results!\n');

// Check if we have the required environment variables
const appId = process.env.ADZUNA_APP_ID;
const appKey = process.env.ADZUNA_APP_KEY;

if (!appId || !appKey) {
  console.log('❌ Missing Adzuna API credentials');
  console.log('   Set ADZUNA_APP_ID and ADZUNA_APP_KEY environment variables');
  process.exit(1);
}

console.log('✅ API credentials found');
console.log('🔑 App ID:', appId ? '***' + appId.slice(-4) : 'Not set');
console.log('🔑 App Key:', appKey ? '***' + appKey.slice(-4) : 'Not set');

// Test a simple API call to see if it works
console.log('\n🔍 Testing Adzuna API connection...');

import('https').then(https => {
  const url = `https://api.adzuna.com/v1/api/jobs/gb/search/1?app_id=${appId}&app_key=${appKey}&what=graduate&where=London&results_per_page=5`;
  
  https.get(url, (res) => {
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
            console.log(`  ${i + 1}. ${job.title} at ${job.company?.display_name || 'Unknown'} (${job.location?.display_name || 'Unknown'})`);
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
