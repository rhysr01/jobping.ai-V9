#!/usr/bin/env node

// Direct test of Muse API with our multilingual early career detection
const axios = require('axios');
const { classifyEarlyCareer } = require('./scrapers/utils.js');

async function testMuseDirect() {
  console.log('🔍 Testing Muse API directly with multilingual early career detection...');
  
  try {
    // Get jobs from Muse API directly
    const response = await axios.get('https://www.themuse.com/api/public/jobs', {
      params: {
        location: 'London',
        page: 1,
        descending: true
      }
    });
    
    const jobs = response.data.results || [];
    console.log(`📊 Found ${jobs.length} jobs from Muse API`);
    
    let earlyCareerCount = 0;
    let skippedCount = 0;
    
    console.log('\n🧪 Testing each job with our multilingual detection:');
    
    for (const job of jobs.slice(0, 10)) { // Test first 10 jobs
      const ingestJob = {
        title: job.name,
        company: job.company.name,
        location: job.locations?.[0]?.name || 'Remote',
        description: job.contents || '',
        url: job.refs?.landing_page || '',
        posted_at: job.publication_date || '',
        source: 'muse'
      };
      
      const isEarlyCareer = classifyEarlyCareer(ingestJob);
      
      if (isEarlyCareer) {
        earlyCareerCount++;
        console.log(`✅ EARLY CAREER: ${ingestJob.title} at ${ingestJob.company}`);
      } else {
        skippedCount++;
        console.log(`🚫 SKIPPED: ${ingestJob.title} at ${ingestJob.company}`);
      }
    }
    
    console.log(`\n📊 Results:`);
    console.log(`   ✅ Early career jobs: ${earlyCareerCount}`);
    console.log(`   🚫 Skipped jobs: ${skippedCount}`);
    console.log(`   📈 Success rate: ${Math.round((earlyCareerCount / (earlyCareerCount + skippedCount)) * 100)}%`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testMuseDirect();
