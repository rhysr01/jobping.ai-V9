#!/usr/bin/env node

const axios = require('axios');

// Smaller companies and startups that are more likely to use Lever
const companies = [
  // Known working companies
  'spotify', 'plaid', 'gopuff', 'ro',
  
  // Smaller tech companies
  'brex', 'plaid', 'stripe', 'robinhood', 'coinbase', 'chime', 'affirm', 'klarna', 'wise', 'revolut', 'monzo',
  'vercel', 'netlify', 'supabase', 'planetscale', 'railway', 'render', 'fly', 'cloudflare', 'fastly',
  'twilio', 'sendgrid', 'mailchimp', 'hubspot', 'salesforce', 'notion', 'figma', 'linear', 'airtable',
  'datadog', 'newrelic', 'sentry', 'loggly', 'elastic', 'mongodb', 'redis', 'postgresql',
  'openai', 'anthropic', 'cohere', 'huggingface', 'scale', 'labelbox', 'weights', 'replicate',
  'roblox', 'unity', 'epic', 'valve', 'riot', 'supercell', 'king',
  'shopify', 'etsy', 'wayfair', 'chewy', 'instacart', 'gopuff', 'deliveroo', 'justeat',
  'peloton', 'calm', 'headspace', 'noom', 'ro', 'hims', 'hers', 'zocdoc', 'onehealth',
  'coursera', 'udemy', 'duolingo', 'khan', 'codecademy', 'pluralsight', 'skillshare',
  'pinterest', 'snap', 'tiktok', 'discord', 'slack', 'zoom', 'teams', 'asana', 'trello',
  
  // European companies
  'klarna', 'spotify', 'skype', 'transferwise', 'deliveroo', 'justeat', 'booking', 'adidas', 'nike',
  'volkswagen', 'bmw', 'mercedes', 'siemens', 'bosch', 'philips', 'asml', 'nestle', 'unilever',
  
  // Try some variations
  'stripe-2', 'stripeinc', 'datadoghq', 'notionhq', 'figma-inc', 'linear-app', 'vercel-inc',
  'supabase-io', 'planetscale-inc', 'railway-corp', 'render-inc', 'fly-io', 'cloudflare-inc',
  'twilio-inc', 'sendgrid-inc', 'mailchimp-inc', 'hubspot-inc', 'salesforce-com', 'airtable-inc',
  'newrelic-inc', 'sentry-io', 'elastic-co', 'mongodb-inc', 'redis-labs', 'openai-com',
  'anthropic-ai', 'cohere-ai', 'huggingface-co', 'scale-ai', 'replicate-ai', 'roblox-corp',
  'unity-technologies', 'epic-games', 'riot-games', 'peloton-interactive', 'calm-com',
  'headspace-health', 'noom-inc', 'hims-inc', 'hers-health', 'coursera-inc', 'udemy-inc',
  'duolingo-inc', 'codecademy-inc', 'pluralsight-inc', 'skillshare-inc', 'tiktok-inc',
  'klarna-bank', 'skype-technologies', 'booking-com', 'adidas-ag', 'nike-inc',
  'volkswagen-ag', 'bmw-group', 'mercedes-benz', 'siemens-ag', 'bosch-group', 'philips-nv',
  'asml-holding', 'nestle-sa', 'unilever-plc'
];

async function testCompany(company) {
  try {
    const url = `https://api.lever.co/v0/postings/${company}?mode=json`;
    const response = await axios.get(url, {
      timeout: 5000,
      headers: {
        'User-Agent': 'JobPingBot/1.0 (contact: jobs@jobping.ai)',
        'Accept': 'application/json'
      }
    });
    
    const jobs = response.data;
    
    // Quick filter for early-career jobs
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

async function testStartups() {
  console.log('🚀 Testing Startups and Smaller Companies');
  console.log('=========================================\n');
  
  const working = [];
  
  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];
    process.stdout.write(`Testing ${i + 1}/${companies.length}: ${company}... `);
    
    const result = await testCompany(company);
    
    if (result.success) {
      console.log(`✅ ${result.earlyCareerJobs}/${result.totalJobs} early-career jobs`);
      if (result.earlyCareerJobs > 0) {
        working.push(result);
      }
    } else {
      console.log(`❌`);
    }
    
    // Quick delay
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log('\n🎯 Companies with Early-Career Jobs:');
  console.log('====================================');
  
  if (working.length > 0) {
    working
      .sort((a, b) => b.earlyCareerJobs - a.earlyCareerJobs)
      .forEach(result => {
        console.log(`   ${result.company}: ${result.earlyCareerJobs}/${result.totalJobs} early-career jobs`);
      });
    
    const totalJobs = working.reduce((sum, r) => sum + r.earlyCareerJobs, 0);
    console.log(`\n🎉 Total: ${totalJobs} early-career jobs from ${working.length} companies!`);
    
    // Generate TypeScript code for new companies
    console.log('\n📝 New Companies to Add:');
    console.log('========================');
    working
      .filter(r => !['spotify', 'plaid', 'gopuff', 'ro'].includes(r.company))
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
    console.log('   No new companies found with early-career jobs.');
  }
  
  return working;
}

testStartups().catch(console.error);
