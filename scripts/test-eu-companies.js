#!/usr/bin/env node

const axios = require('axios');

// EU companies that actually use Lever (from user research)
const euCompanies = [
  // Spain
  'jobandtalent', 'carto', 'lodgify', 'edpuzzle', 'quantummetric', 'moonpay', 'dlocal', 'binance', 'partoo', 'unison', 'rwstrainai', 'rover',
  
  // France
  'mistral', 'swile', 'vestiairecollective', 'contentsquare', 'pigment', 'blablacar', 'malt', 'hexa', 'theodo', 'loftorbital', 'm33', 'valiantys',
  
  // Germany
  'finn', 'rover', 'saviynt', 'emma', 'netflix',
  
  // Netherlands
  'mendix', 'insify', 'keyloop', 'extreme', 'brooks', 'companial', 'portcast',
  
  // Ireland
  'kitmanlabs', 'pipedrive', 'dunbradstreet', 'megaport',
  
  // Sweden
  'spotify', 'nekohealth',
  
  // Poland
  'nomagic', 'clari', 'airslate', 'payu', 'binance',
  
  // Portugal
  'swordhealth', 'farfetch', 'emma', 'binance',
  
  // Belgium
  'deliverect', 'portcast',
  
  // Austria
  'cargopartner',
  
  // Czech Republic
  'kind', 'pipedrive',
  
  // Italy
  'xsolla', 'sysdig', 'spotify', 'farfetch',
  
  // Baltics
  'companial', 'pipedrive', 'binance',
  
  // Luxembourg
  'mistral',
  
  // Denmark
  'portcast'
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

async function testEUCompanies() {
  console.log('🇪🇺 Testing EU Companies on Lever');
  console.log('==================================\n');
  
  const working = [];
  const european = [];
  
  for (let i = 0; i < euCompanies.length; i++) {
    const company = euCompanies[i];
    process.stdout.write(`Testing ${i + 1}/${euCompanies.length}: ${company}... `);
    
    const result = await testCompany(company);
    
    if (result.success) {
      console.log(`✅ ${result.earlyCareerJobs}/${result.totalJobs} early-career jobs`);
      working.push(result);
      
      if (result.hasEuropeanJobs) {
        european.push(result);
        console.log(`     🌍 Has European jobs`);
      }
    } else {
      console.log(`❌`);
    }
    
    // Quick delay
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log('\n📊 EU Companies Results');
  console.log('========================');
  console.log(`✅ Working: ${working.length}/${euCompanies.length}`);
  console.log(`🌍 European jobs: ${european.length}/${working.length}`);
  
  if (working.length > 0) {
    console.log('\n🎯 Companies with Early-Career Jobs:');
    working
      .filter(r => r.earlyCareerJobs > 0)
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
      .filter(r => r.earlyCareerJobs > 0 && !['spotify', 'plaid', 'gopuff', 'ro'].includes(r.company))
      .forEach(result => {
        console.log(`  {
    "company": "${result.company.charAt(0).toUpperCase() + result.company.slice(1)}",
    "platform": "lever",
    "slug": "${result.company}",
    "priority": ${result.earlyCareerJobs > 5 ? 1 : 2},
    "refresh_days": ${result.earlyCareerJobs > 5 ? 1 : 2}
  },`);
      });
  } else {
    console.log('   No companies found with early-career jobs.');
  }
  
  return working;
}

testEUCompanies().catch(console.error);
