#!/usr/bin/env node

const axios = require('axios');

// Companies to test quickly
const companies = [
  'wayfair', 'wayfair-inc',
  'chewy', 'chewy-inc', 
  'instacart', 'instacart-inc',
  'doordash', 'doordash-inc',
  'uber', 'uber-inc',
  'lyft', 'lyft-inc',
  'airbnb', 'airbnb-inc',
  'netflix', 'netflix-inc',
  'shopify', 'shopify-inc',
  'etsy', 'etsy-inc',
  'pinterest', 'pinterest-inc',
  'snap', 'snap-inc',
  'discord', 'discord-inc',
  'slack', 'slack-technologies',
  'zoom', 'zoom-video',
  'asana', 'asana-inc',
  'trello', 'trello-inc',
  'notion', 'notionhq',
  'figma', 'figma-inc',
  'linear', 'linear-app',
  'vercel', 'vercel-inc',
  'supabase', 'supabase-io',
  'planetscale', 'planetscale-inc',
  'railway', 'railway-corp',
  'render', 'render-inc',
  'fly', 'fly-io',
  'cloudflare', 'cloudflare-inc',
  'twilio', 'twilio-inc',
  'sendgrid', 'sendgrid-inc',
  'mailchimp', 'mailchimp-inc',
  'hubspot', 'hubspot-inc',
  'salesforce', 'salesforce-com',
  'airtable', 'airtable-inc',
  'newrelic', 'newrelic-inc',
  'sentry', 'sentry-io',
  'elastic', 'elastic-co',
  'mongodb', 'mongodb-inc',
  'redis', 'redis-labs',
  'openai', 'openai-com',
  'anthropic', 'anthropic-ai',
  'cohere', 'cohere-ai',
  'huggingface', 'huggingface-co',
  'scale', 'scale-ai',
  'replicate', 'replicate-ai',
  'roblox', 'roblox-corp',
  'unity', 'unity-technologies',
  'epic', 'epic-games',
  'riot', 'riot-games',
  'peloton', 'peloton-interactive',
  'calm', 'calm-com',
  'headspace', 'headspace-health',
  'noom', 'noom-inc',
  'hims', 'hims-inc',
  'hers', 'hers-health',
  'coursera', 'coursera-inc',
  'udemy', 'udemy-inc',
  'duolingo', 'duolingo-inc',
  'codecademy', 'codecademy-inc',
  'pluralsight', 'pluralsight-inc',
  'skillshare', 'skillshare-inc',
  'tiktok', 'tiktok-inc',
  'klarna', 'klarna-bank',
  'skype', 'skype-technologies',
  'booking', 'booking-com',
  'adidas', 'adidas-ag',
  'nike', 'nike-inc',
  'volkswagen', 'volkswagen-ag',
  'bmw', 'bmw-group',
  'mercedes', 'mercedes-benz',
  'siemens', 'siemens-ag',
  'bosch', 'bosch-group',
  'philips', 'philips-nv',
  'asml', 'asml-holding',
  'nestle', 'nestle-sa',
  'unilever', 'unilever-plc'
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

async function quickTest() {
  console.log('🚀 Quick Company Test - Finding More Jobs!');
  console.log('==========================================\n');
  
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
  } else {
    console.log('   No new companies found with early-career jobs.');
  }
  
  return working;
}

quickTest().catch(console.error);
