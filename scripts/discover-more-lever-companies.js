#!/usr/bin/env node

const axios = require('axios');

// Popular tech companies that likely use Lever
const potentialCompanies = [
  // Big Tech
  'google', 'meta', 'amazon', 'apple', 'microsoft', 'netflix', 'uber', 'lyft', 'airbnb', 'doordash',
  
  // Fintech
  'stripe', 'plaid', 'robinhood', 'coinbase', 'chime', 'affirm', 'klarna', 'wise', 'revolut', 'monzo',
  
  // Developer Tools
  'vercel', 'netlify', 'supabase', 'planetscale', 'railway', 'render', 'fly', 'cloudflare', 'fastly',
  'twilio', 'sendgrid', 'mailchimp', 'hubspot', 'salesforce', 'notion', 'figma', 'linear', 'airtable',
  'datadog', 'newrelic', 'sentry', 'loggly', 'elastic', 'mongodb', 'redis', 'postgresql',
  
  // AI/ML
  'openai', 'anthropic', 'cohere', 'huggingface', 'scale', 'labelbox', 'weights', 'replicate',
  
  // Gaming
  'roblox', 'unity', 'epic', 'valve', 'riot', 'supercell', 'king',
  
  // E-commerce
  'shopify', 'etsy', 'wayfair', 'chewy', 'instacart', 'gopuff', 'deliveroo', 'justeat',
  
  // Health/Wellness
  'peloton', 'calm', 'headspace', 'noom', 'ro', 'hims', 'hers', 'zocdoc', 'onehealth',
  
  // Education
  'coursera', 'udemy', 'duolingo', 'khan', 'codecademy', 'pluralsight', 'skillshare',
  
  // Media/Entertainment
  'spotify', 'pinterest', 'snap', 'tiktok', 'discord', 'slack', 'zoom', 'teams', 'asana', 'trello',
  
  // European Companies
  'klarna', 'spotify', 'skype', 'transferwise', 'deliveroo', 'justeat', 'booking', 'adidas', 'nike',
  'volkswagen', 'bmw', 'mercedes', 'siemens', 'bosch', 'philips', 'asml', 'nestle', 'unilever'
];

async function testCompany(company) {
  try {
    const url = `https://api.lever.co/v0/postings/${company}?mode=json`;
    const response = await axios.get(url, {
      timeout: 10000,
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
    
    return { 
      success: true, 
      company, 
      totalJobs: jobs.length, 
      earlyCareerJobs: earlyCareerJobs.length,
      hasEuropeanJobs: jobs.some(job => {
        const location = job.categories?.location || '';
        return location.toLowerCase().includes('london') || 
               location.toLowerCase().includes('berlin') || 
               location.toLowerCase().includes('amsterdam') || 
               location.toLowerCase().includes('paris') || 
               location.toLowerCase().includes('dublin') ||
               location.toLowerCase().includes('remote');
      })
    };
  } catch (error) {
    return { success: false, company, error: error.message };
  }
}

async function discoverCompanies() {
  console.log('🔍 Discovering More Lever Companies');
  console.log('===================================\n');
  
  const results = [];
  const working = [];
  
  for (let i = 0; i < potentialCompanies.length; i++) {
    const company = potentialCompanies[i];
    console.log(`Testing ${i + 1}/${potentialCompanies.length}: ${company}...`);
    
    const result = await testCompany(company);
    results.push(result);
    
    if (result.success) {
      console.log(`  ✅ ${company}: ${result.earlyCareerJobs}/${result.totalJobs} early-career jobs`);
      if (result.hasEuropeanJobs) {
        console.log(`     🌍 Has European jobs`);
      }
      working.push(result);
    } else {
      console.log(`  ❌ ${company}: ${result.error}`);
    }
    
    // Polite delay
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 Discovery Results');
  console.log('===================');
  console.log(`✅ Working: ${working.length}/${potentialCompanies.length}`);
  console.log(`❌ Failed: ${potentialCompanies.length - working.length}/${potentialCompanies.length}`);
  
  if (working.length > 0) {
    console.log('\n🎯 Working Companies with Early-Career Jobs:');
    working
      .filter(r => r.earlyCareerJobs > 0)
      .sort((a, b) => b.earlyCareerJobs - a.earlyCareerJobs)
      .forEach(result => {
        const europeanFlag = result.hasEuropeanJobs ? '🌍' : '';
        console.log(`   ${result.company}: ${result.earlyCareerJobs}/${result.totalJobs} early-career jobs ${europeanFlag}`);
      });
    
    console.log('\n📝 TypeScript Code for companyList.json:');
    console.log('=========================================');
    working
      .filter(r => r.earlyCareerJobs > 0)
      .forEach(result => {
        console.log(`  {
    "company": "${result.company.charAt(0).toUpperCase() + result.company.slice(1)}",
    "platform": "lever",
    "slug": "${result.company}",
    "priority": ${result.earlyCareerJobs > 5 ? 1 : 2},
    "refresh_days": ${result.earlyCareerJobs > 5 ? 1 : 2}
  },`);
      });
  }
  
  return working;
}

discoverCompanies().catch(console.error);
