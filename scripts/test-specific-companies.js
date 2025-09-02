#!/usr/bin/env node

const axios = require('axios');

// Specific companies the user provided
const specificCompanies = [
  'deliverect', 'pipedrive', 'farfetch', 'companial', 'binance', 'mistral', 'welocalize', 'netlight',
  'shieldai', 'anybotics', 'milltownpartners', 'nium', 'unlimit', 'pennylane', 'whoop', 'find',
  'swapcard', 'blueland', 'flex', 'jobandtalent', 'salvohealth', 'toptal', 'prilenia', 'swissborg', 'zeotap'
];

// Companies we already know work (exclude these)
const existingCompanies = [
  'spotify', 'plaid', 'gopuff', 'ro', 'jobandtalent', 'dlocal', 'binance', 'mistral',
  'swile', 'loftorbital', 'finn', 'pipedrive', 'welocalize', 'netlight', 'shieldai',
  'anybotics', 'milltownpartners', 'nium', 'unlimit', 'pennylane', 'palantir', 'sylvera',
  'qonto', 'fluence', 'insify', 'keyloop', 'companial', 'airslate', 'farfetch', 'deliverect',
  'capital', 'whoop'
];

async function testCompany(company) {
  try {
    const url = `https://api.lever.co/v0/postings/${company}?mode=json`;
    const response = await axios.get(url, {
      timeout: 8000,
      headers: {
        'User-Agent': 'JobPingBot/1.0 (contact: jobs@jobping.ai)',
        'Accept': 'application/json'
      }
    });
    
    const jobs = response.data;
    
    // Filter for early-career jobs
    const earlyCareerJobs = jobs.filter(job => {
      const text = `${job.text} ${job.descriptionPlain}`.toLowerCase();
      const earlySignals = ['intern', 'internship', 'graduate', 'trainee', 'entry level', 'junior', '0-2 years', 'no experience', 'new grad', 'recent graduate', 'student', 'entry-level', 'associate', 'apprentice'];
      const seniorSignals = ['senior', 'lead', 'principal', 'staff', 'manager', 'director', 'head of', '10+ years', '5+ years', 'experienced', 'expert'];
      
      const hasEarlySignals = earlySignals.some(signal => text.includes(signal));
      const hasSeniorSignals = seniorSignals.some(signal => text.includes(signal));
      
      return hasEarlySignals && !hasSeniorSignals;
    });
    
    // Check for European locations
    const hasEuropeanJobs = jobs.some(job => {
      const location = job.categories?.location || '';
      return location.toLowerCase().includes('london') || 
             location.toLowerCase().includes('berlin') || 
             location.toLowerCase().includes('amsterdam') || 
             location.toLowerCase().includes('paris') || 
             location.toLowerCase().includes('dublin') ||
             location.toLowerCase().includes('madrid') ||
             location.toLowerCase().includes('barcelona') ||
             location.toLowerCase().includes('munich') ||
             location.toLowerCase().includes('frankfurt') ||
             location.toLowerCase().includes('rotterdam') ||
             location.toLowerCase().includes('stockholm') ||
             location.toLowerCase().includes('warsaw') ||
             location.toLowerCase().includes('lisbon') ||
             location.toLowerCase().includes('vienna') ||
             location.toLowerCase().includes('prague') ||
             location.toLowerCase().includes('milan') ||
             location.toLowerCase().includes('vilnius') ||
             location.toLowerCase().includes('tallinn') ||
             location.toLowerCase().includes('copenhagen') ||
             location.toLowerCase().includes('remote');
    });
    
    return { 
      success: true, 
      company, 
      totalJobs: jobs.length, 
      earlyCareerJobs: earlyCareerJobs.length,
      hasEuropeanJobs
    };
  } catch (error) {
    return { success: false, company, error: error.message };
  }
}

async function testSpecificCompanies() {
  console.log('🎯 Testing Specific Companies');
  console.log('==============================\n');
  
  const working = [];
  const european = [];
  const highImpact = [];
  
  // Filter out companies we already know
  const newCompanies = specificCompanies.filter(company => !existingCompanies.includes(company));
  
  for (let i = 0; i < newCompanies.length; i++) {
    const company = newCompanies[i];
    process.stdout.write(`Testing ${i + 1}/${newCompanies.length}: ${company}... `);
    
    const result = await testCompany(company);
    
    if (result.success) {
      console.log(`✅ ${result.earlyCareerJobs}/${result.totalJobs} early-career jobs`);
      working.push(result);
      
      if (result.hasEuropeanJobs) {
        european.push(result);
        console.log(`     🌍 Has European jobs`);
      }
      
      if (result.earlyCareerJobs > 5) {
        highImpact.push(result);
        console.log(`     🚀 High impact!`);
      }
    } else {
      console.log(`❌`);
    }
    
    // Quick delay
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log('\n📊 Specific Companies Results');
  console.log('==============================');
  console.log(`✅ Working: ${working.length}/${newCompanies.length}`);
  console.log(`🌍 European jobs: ${european.length}/${working.length}`);
  console.log(`🚀 High impact (>5 jobs): ${highImpact.length}/${working.length}`);
  
  if (working.length > 0) {
    console.log('\n🎯 High-Impact Companies Found:');
    highImpact
      .sort((a, b) => b.earlyCareerJobs - a.earlyCareerJobs)
      .forEach(result => {
        const europeanFlag = result.hasEuropeanJobs ? '🌍' : '';
        console.log(`   ${result.company}: ${result.earlyCareerJobs}/${result.totalJobs} early-career jobs ${europeanFlag}`);
      });
    
    const totalJobs = working.reduce((sum, r) => sum + r.earlyCareerJobs, 0);
    console.log(`\n🎉 Total: ${totalJobs} early-career jobs from ${working.length} companies!`);
    
    // Generate TypeScript code for new companies
    console.log('\n📝 New Companies to Add:');
    console.log('========================');
    working
      .filter(r => r.earlyCareerJobs > 0)
      .forEach(result => {
        console.log(`  {
    "company": "${result.company.charAt(0).toUpperCase() + result.company.slice(1)}",
    "platform": "lever",
    "slug": "${result.company}",
    "priority": ${result.earlyCareerJobs > 10 ? 1 : 2},
    "refresh_days": ${result.earlyCareerJobs > 10 ? 1 : 2}
  },`);
      });
  } else {
    console.log('   No new companies found with early-career jobs.');
  }
  
  return working;
}

testSpecificCompanies().catch(console.error);
