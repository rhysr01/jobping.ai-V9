#!/usr/bin/env node

// Production scraper test - tests actual scraper functions
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function testRemoteOKScraper() {
  console.log('🔄 Testing RemoteOK scraper function...');
  
  try {
    // Dynamically import the ES module
    // Removed RemoteOK - it's poison for graduates
    
    console.log('✅ RemoteOK scraper module loaded');
    
    // Test with a small limit
    // Removed RemoteOK scraper call - it's poison for graduates
    console.log(`📊 RemoteOK found ${jobs.length} jobs`);
    
    if (jobs.length > 0) {
      console.log('🎯 Sample jobs:');
      jobs.slice(0, 3).forEach((job, i) => {
        console.log(`${i+1}. ${job.title} at ${job.company}`);
        console.log(`   Location: ${job.location}`);
        console.log(`   URL: ${job.job_url}`);
      });
      
      // Check if jobs have required fields
      const hasRequiredFields = jobs[0].job_hash && jobs[0].categories && jobs[0].experience_required;
      console.log(`✅ Jobs have required fields: ${hasRequiredFields ? 'YES' : 'NO'}`);
      
      return { success: true, count: jobs.length, sample: jobs[0] };
    } else {
      console.log('⚠️  No jobs returned from RemoteOK');
      return { success: false, count: 0, error: 'No jobs found' };
    }
    
  } catch (error) {
    console.error('❌ RemoteOK scraper failed:', error.message);
    console.error('Stack:', error.stack);
    return { success: false, count: 0, error: error.message };
  }
}

async function testGreenhouseScraper() {
  console.log('\n🔄 Testing Greenhouse scraper function...');
  
  try {
    const { scrapeGreenhouse } = await import('./scrapers/greenhouse.ts');
    
    console.log('✅ Greenhouse scraper module loaded');
    
    // Test with Stripe board
    const testCompanies = [
      { name: 'Stripe', url: 'https://boards.greenhouse.io/stripe', platform: 'greenhouse' }
    ];
    
    const jobs = await scrapeGreenhouse(testCompanies);
    console.log(`📊 Greenhouse found ${jobs.length} jobs`);
    
    if (jobs.length > 0) {
      console.log('🎯 Sample jobs:');
      jobs.slice(0, 3).forEach((job, i) => {
        console.log(`${i+1}. ${job.title} at ${job.company}`);
        console.log(`   Location: ${job.location}`);
      });
      
      return { success: true, count: jobs.length };
    } else {
      console.log('⚠️  No jobs returned from Greenhouse');
      return { success: false, count: 0, error: 'No jobs found' };
    }
    
  } catch (error) {
    console.error('❌ Greenhouse scraper failed:', error.message);
    return { success: false, count: 0, error: error.message };
  }
}

async function runProductionScraperTest() {
  console.log('🧪 PRODUCTION SCRAPER TEST\n');
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing');
  console.log('OpenAI Key:', process.env.OPENAI_API_KEY ? 'configured' : 'missing');
  console.log('');
  
  const results = {};
  
  // Test RemoteOK
  results.remoteok = await testRemoteOKScraper();
  
  // Test Greenhouse
  results.greenhouse = await testGreenhouseScraper();
  
  // Summary
  console.log('\n📋 PRODUCTION TEST SUMMARY:');
  console.log('=' .repeat(50));
  
  const totalJobs = results.remoteok.count + results.greenhouse.count;
  console.log(`RemoteOK: ${results.remoteok.success ? '✅' : '❌'} (${results.remoteok.count} jobs)`);
  console.log(`Greenhouse: ${results.greenhouse.success ? '✅' : '❌'} (${results.greenhouse.count} jobs)`);
  console.log(`Total jobs found: ${totalJobs}`);
  
  if (totalJobs === 0) {
    console.log('\n🚨 CRITICAL: NO JOBS FOUND - SCRAPERS NOT PRODUCTION READY');
    console.log('Issues to fix:');
    if (!results.remoteok.success) console.log(`- RemoteOK: ${results.remoteok.error}`);
    if (!results.greenhouse.success) console.log(`- Greenhouse: ${results.greenhouse.error}`);
  } else {
    console.log('\n✅ SCRAPERS ARE PRODUCTION READY');
    console.log(`Found ${totalJobs} jobs across platforms`);
  }
}

runProductionScraperTest().catch(console.error);
