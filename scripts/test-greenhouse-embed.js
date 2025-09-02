#!/usr/bin/env node

const axios = require('axios');

const companies = [
  'airtable',
  'stripe',
  'datadog',
  'notion',
  'figma',
  'linear',
  'vercel',
  'netlify',
  'supabase',
  'planetscale',
  'railway',
  'render',
  'fly',
  'cloudflare',
  'fastly',
  'twilio',
  'sendgrid',
  'mailchimp',
  'hubspot',
  'salesforce'
];

async function testCompanyEmbed(company) {
  try {
    const url = `https://boards.greenhouse.io/boards/api/embed/job_board?for=${company}`;
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'JobPingBot/1.0 (contact: jobs@jobping.ai)',
        'Accept': 'application/json'
      }
    });
    
    const jobs = response.data.jobs || response.data;
    return { success: true, company, jobCount: jobs.length };
  } catch (error) {
    return { success: false, company, error: error.message };
  }
}

async function testAllCompanies() {
  console.log('🔍 Testing Greenhouse Embed API');
  console.log('================================\n');
  
  const results = [];
  
  for (const company of companies) {
    console.log(`Testing ${company}...`);
    const result = await testCompanyEmbed(company);
    results.push(result);
    
    if (result.success) {
      console.log(`  ✅ ${company}: ${result.jobCount} jobs`);
    } else {
      console.log(`  ❌ ${company}: ${result.error}`);
    }
    
    // Small delay to be polite
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n📊 Results Summary');
  console.log('==================');
  
  const working = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Working: ${working.length}/${companies.length}`);
  console.log(`❌ Failed: ${failed.length}/${companies.length}`);
  
  if (working.length > 0) {
    console.log('\n🎯 Working Companies:');
    working.forEach(result => {
      console.log(`   ${result.company}: ${result.jobCount} jobs`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed Companies:');
    failed.forEach(result => {
      console.log(`   ${result.company}: ${result.error}`);
    });
  }
  
  return working;
}

testAllCompanies().catch(console.error);
