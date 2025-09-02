#!/usr/bin/env node

const axios = require('axios');

async function testLeverAdapter() {
  console.log('🧪 Testing Lever Adapter');
  console.log('========================');
  
  try {
    // Test multiple Lever companies
    const companies = ['spotify', 'plaid', 'gopuff', 'ro', 'jobandtalent', 'dlocal', 'binance', 'mistral', 'swile', 'loftorbital', 'finn', 'pipedrive'];
    let totalJobs = 0;
    let totalEarlyCareer = 0;
    
    for (const company of companies) {
      try {
        const url = `https://api.lever.co/v0/postings/${company}?mode=json`;
        const response = await axios.get(url, {
          timeout: 15000,
          headers: {
            'User-Agent': 'JobPingBot/1.0 (contact: jobs@jobping.ai)',
            'Accept': 'application/json'
          }
        });
        
        const jobs = response.data;
        totalJobs += jobs.length;
        
        // Filter for early-career jobs
        const earlyCareerJobs = jobs.filter(job => {
          const text = `${job.text} ${job.descriptionPlain}`.toLowerCase();
          const earlySignals = ['intern', 'internship', 'graduate', 'trainee', 'entry level', 'junior', '0-2 years', 'no experience', 'new grad', 'recent graduate', 'student', 'entry-level', 'associate', 'apprentice'];
          const seniorSignals = ['senior', 'lead', 'principal', 'staff', 'manager', 'director', 'head of', '10+ years', '5+ years', 'experienced', 'expert'];
          
          const hasEarlySignals = earlySignals.some(signal => text.includes(signal));
          const hasSeniorSignals = seniorSignals.some(signal => text.includes(signal));
          
          return hasEarlySignals && !hasSeniorSignals;
        });
        
        totalEarlyCareer += earlyCareerJobs.length;
        console.log(`  ${company}: ${earlyCareerJobs.length}/${jobs.length} early-career jobs`);
        
        // Small delay between companies
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.log(`  ${company}: Failed - ${error.message}`);
      }
    }
    
    console.log(`\n✅ Total: ${totalEarlyCareer}/${totalJobs} early-career jobs found`);
    
    return { success: true, totalJobs, earlyCareerJobs: totalEarlyCareer };
  } catch (error) {
    console.error('❌ Lever adapter test failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function testGreenhouseAdapter() {
  console.log('\n🧪 Testing Greenhouse Adapter');
  console.log('==============================');
  
  try {
    // Test a smaller company that might work
    const url = 'https://boards.greenhouse.io/airtable.json';
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'JobPingBot/1.0 (contact: jobs@jobping.ai)',
        'Accept': 'application/json'
      }
    });
    
    const jobs = response.data.jobs || response.data;
    console.log(`✅ Microsoft: Found ${jobs.length} total jobs`);
    
    // Filter for early-career jobs
    const earlyCareerJobs = jobs.filter(job => {
      const text = `${job.title} ${job.content}`.toLowerCase();
      const earlySignals = ['intern', 'internship', 'graduate', 'trainee', 'entry level', 'junior', '0-2 years', 'no experience', 'new grad', 'recent graduate', 'student', 'entry-level', 'associate', 'apprentice'];
      const seniorSignals = ['senior', 'lead', 'principal', 'staff', 'manager', 'director', 'head of', '10+ years', '5+ years', 'experienced', 'expert'];
      
      const hasEarlySignals = earlySignals.some(signal => text.includes(signal));
      const hasSeniorSignals = seniorSignals.some(signal => text.includes(signal));
      
      return hasEarlySignals && !hasSeniorSignals;
    });
    
    console.log(`🎯 Early-career jobs: ${earlyCareerJobs.length}`);
    
    if (earlyCareerJobs.length > 0) {
      console.log('\n📋 Sample early-career jobs:');
      earlyCareerJobs.slice(0, 3).forEach((job, index) => {
        console.log(`   ${index + 1}. ${job.title} - ${job.location?.name || 'Unknown location'}`);
      });
    }
    
    return { success: true, totalJobs: jobs.length, earlyCareerJobs: earlyCareerJobs.length };
  } catch (error) {
    console.error('❌ Greenhouse adapter test failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 ATS Adapter Tests');
  console.log('====================\n');
  
  const leverResult = await testLeverAdapter();
  const greenhouseResult = await testGreenhouseAdapter();
  
  console.log('\n📊 Test Summary');
  console.log('===============');
  console.log(`Lever: ${leverResult.success ? '✅' : '❌'} ${leverResult.success ? `${leverResult.earlyCareerJobs}/${leverResult.totalJobs} early-career jobs` : leverResult.error}`);
  console.log(`Greenhouse: ${greenhouseResult.success ? '✅' : '❌'} ${greenhouseResult.success ? `${greenhouseResult.earlyCareerJobs}/${greenhouseResult.totalJobs} early-career jobs` : greenhouseResult.error}`);
  
  const totalEarlyCareerJobs = (leverResult.earlyCareerJobs || 0) + (greenhouseResult.earlyCareerJobs || 0);
  
  if (totalEarlyCareerJobs > 0) {
    console.log(`\n🎉 SUCCESS: Found ${totalEarlyCareerJobs} early-career jobs!`);
    console.log('   ATS-API system is working correctly.');
  } else {
    console.log('\n⚠️  WARNING: No early-career jobs found.');
    console.log('   Check if companies have graduate programs active.');
  }
}

runTests().catch(console.error);
