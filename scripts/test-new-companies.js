#!/usr/bin/env node

const axios = require('axios');

// New companies we just added
const newCompanies = [
  'palantir', 'octopusenergy', 'sylvera', 'milltownpartners', 'qonto', 'fluence',
  'bloomandwild', 'netlight', 'safetyculture', 'nium', 'shieldai', 'numeral',
  'unlimit', 'trustly', 'arcteryx', 'anybotics', 'deepjudge', 'welocalize', 'pennylane'
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
    });.en
    
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
    
    return { 
      success: true, 
      company, 
      totalJobs: jobs.length, 
      earlyCareerJobs: earlyCareerJobs.length
    };
  } catch (error) {
    return { success: false, company, error: error.message };
  }
}

async function testNewCompanies() {
  console.log('🚀 Testing New Companies');
  console.log('=========================\n');
  
  const working = [];
  
  for (let i = 0; i < newCompanies.length; i++) {
    const company = newCompanies[i];
    process.stdout.write(`Testing ${i + 1}/${newCompanies.length}: ${company}... `);
    
    const result = await testCompany(company);
    
    if (result.success) {
      console.log(`✅ ${result.earlyCareerJobs}/${result.totalJobs} early-career jobs`);
      working.push(result);
    } else {
      console.log(`❌ ${result.error}`);
    }
    
    // Quick delay
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log('\n📊 New Companies Results');
  console.log('========================');
  console.log(`✅ Working: ${working.length}/${newCompanies.length}`);
  
  if (working.length > 0) {
    console.log('\n🎯 Companies with Early-Career Jobs:');
    working
      .filter(r => r.earlyCareerJobs > 0)
      .sort((a, b) => b.earlyCareerJobs - a.earlyCareerJobs)
      .forEach(result => {
        console.log(`   ${result.company}: ${result.earlyCareerJobs}/${result.totalJobs} early-career jobs`);
      });
    
    const totalJobs = working.reduce((sum, r) => sum + r.earlyCareerJobs, 0);
    console.log(`\n🎉 Total: ${totalJobs} early-career jobs from ${working.length} companies!`);
  } else {
    console.log('   No companies found with early-career jobs.');
  }
  
  return working;
}

testNewCompanies().catch(console.error);
