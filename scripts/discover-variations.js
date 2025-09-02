#!/usr/bin/env node

const axios = require('axios');

// Companies with potential different slugs/variations
const companyVariations = [
  // Tech companies with variations
  'stripe', 'stripe-2', 'stripeinc', 'stripe-hq',
  'datadog', 'datadoghq', 'datadog-inc',
  'notion', 'notionhq', 'notion-inc',
  'figma', 'figma-inc', 'figma-hq',
  'linear', 'linear-app', 'linear-inc',
  'vercel', 'vercel-inc', 'vercel-hq',
  'supabase', 'supabase-io', 'supabase-inc',
  'planetscale', 'planetscale-inc', 'planetscale-hq',
  'railway', 'railway-corp', 'railway-inc',
  'render', 'render-inc', 'render-hq',
  'fly', 'fly-io', 'fly-inc',
  'cloudflare', 'cloudflare-inc', 'cloudflare-hq',
  'twilio', 'twilio-inc', 'twilio-hq',
  'sendgrid', 'sendgrid-inc', 'sendgrid-hq',
  'mailchimp', 'mailchimp-inc', 'mailchimp-hq',
  'hubspot', 'hubspot-inc', 'hubspot-hq',
  'salesforce', 'salesforce-com', 'salesforce-inc',
  'airtable', 'airtable-inc', 'airtable-hq',
  'newrelic', 'newrelic-inc', 'newrelic-hq',
  'sentry', 'sentry-io', 'sentry-inc',
  'elastic', 'elastic-co', 'elastic-inc',
  'mongodb', 'mongodb-inc', 'mongodb-hq',
  'redis', 'redis-labs', 'redis-inc',
  'openai', 'openai-com', 'openai-inc',
  'anthropic', 'anthropic-ai', 'anthropic-inc',
  'cohere', 'cohere-ai', 'cohere-inc',
  'huggingface', 'huggingface-co', 'huggingface-inc',
  'scale', 'scale-ai', 'scale-inc',
  'replicate', 'replicate-ai', 'replicate-inc',
  'roblox', 'roblox-corp', 'roblox-inc',
  'unity', 'unity-technologies', 'unity-inc',
  'epic', 'epic-games', 'epic-inc',
  'riot', 'riot-games', 'riot-inc',
  'shopify', 'shopify-inc', 'shopify-hq',
  'etsy', 'etsy-inc', 'etsy-hq',
  'wayfair', 'wayfair-inc', 'wayfair-hq',
  'chewy', 'chewy-inc', 'chewy-hq',
  'instacart', 'instacart-inc', 'instacart-hq',
  'deliveroo', 'deliveroo-uk', 'deliveroo-inc',
  'justeat', 'justeat-takeaway', 'justeat-inc',
  'peloton', 'peloton-interactive', 'peloton-inc',
  'calm', 'calm-com', 'calm-inc',
  'headspace', 'headspace-health', 'headspace-inc',
  'noom', 'noom-inc', 'noom-hq',
  'hims', 'hims-inc', 'hims-hq',
  'hers', 'hers-health', 'hers-inc',
  'coursera', 'coursera-inc', 'coursera-hq',
  'udemy', 'udemy-inc', 'udemy-hq',
  'duolingo', 'duolingo-inc', 'duolingo-hq',
  'codecademy', 'codecademy-inc', 'codecademy-hq',
  'pluralsight', 'pluralsight-inc', 'pluralsight-hq',
  'skillshare', 'skillshare-inc', 'skillshare-hq',
  'pinterest', 'pinterest-inc', 'pinterest-hq',
  'snap', 'snap-inc', 'snap-hq',
  'tiktok', 'tiktok-inc', 'tiktok-hq',
  'discord', 'discord-inc', 'discord-hq',
  'slack', 'slack-technologies', 'slack-inc',
  'zoom', 'zoom-video', 'zoom-inc',
  'asana', 'asana-inc', 'asana-hq',
  'trello', 'trello-inc', 'trello-hq',
  'klarna', 'klarna-bank', 'klarna-inc',
  'skype', 'skype-technologies', 'skype-inc',
  'transferwise', 'wise', 'wise-inc',
  'booking', 'booking-com', 'booking-inc',
  'adidas', 'adidas-ag', 'adidas-inc',
  'nike', 'nike-inc', 'nike-hq',
  'volkswagen', 'volkswagen-ag', 'volkswagen-inc',
  'bmw', 'bmw-group', 'bmw-inc',
  'mercedes', 'mercedes-benz', 'mercedes-inc',
  'siemens', 'siemens-ag', 'siemens-inc',
  'bosch', 'bosch-group', 'bosch-inc',
  'philips', 'philips-nv', 'philips-inc',
  'asml', 'asml-holding', 'asml-inc',
  'nestle', 'nestle-sa', 'nestle-inc',
  'unilever', 'unilever-plc', 'unilever-inc',
  
  // European companies with variations
  'zalando', 'zalando-se', 'zalando-inc',
  'asos', 'asos-plc', 'asos-inc',
  'boohoo', 'boohoo-group', 'boohoo-inc',
  'deliveroo', 'deliveroo-uk', 'deliveroo-plc',
  'justeat', 'justeat-takeaway', 'justeat-plc',
  'skyscanner', 'skyscanner-ltd', 'skyscanner-inc',
  'momondo', 'momondo-ltd', 'momondo-inc',
  'kiwi', 'kiwi-com', 'kiwi-inc',
  'tidal', 'tidal-hifi', 'tidal-inc',
  'deezer', 'deezer-sa', 'deezer-inc',
  'bt', 'bt-group', 'bt-plc',
  'vodafone', 'vodafone-group', 'vodafone-plc',
  'orange', 'orange-sa', 'orange-france',
  'telefonica', 'telefonica-sa', 'telefonica-es',
  'aviva', 'aviva-plc', 'aviva-group',
  'prudential', 'prudential-plc', 'prudential-uk',
  'axa', 'axa-sa', 'axa-group',
  'allianz', 'allianz-se', 'allianz-group',
  'zurich', 'zurich-insurance', 'zurich-group',
  'rightmove', 'rightmove-group', 'rightmove-plc',
  'zoopla', 'zoopla-group', 'zoopla-plc',
  'tesco', 'tesco-plc', 'tesco-group',
  'sainsburys', 'sainsburys-plc', 'sainsburys-group',
  'carrefour', 'carrefour-sa', 'carrefour-group',
  'fnac', 'fnac-darty', 'fnac-group',
  'mediamarkt', 'mediamarkt-saturn', 'mediamarkt-group'
];

// Companies we already know work (exclude these)
const existingCompanies = [
  'spotify', 'plaid', 'gopuff', 'ro', 'jobandtalent', 'dlocal', 'binance', 'mistral',
  'swile', 'loftorbital', 'finn', 'pipedrive', 'welocalize', 'netlight', 'shieldai',
  'anybotics', 'milltownpartners', 'nium', 'unlimit', 'pennylane', 'palantir', 'sylvera',
  'qonto', 'fluence', 'insify', 'keyloop', 'companial', 'airslate', 'farfetch', 'deliverect',
  'capital', 'whoop', 'toptal'
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

async function discoverVariations() {
  console.log('🎯 Discovering Company Variations');
  console.log('==================================\n');
  
  const working = [];
  const european = [];
  const highImpact = [];
  
  // Filter out companies we already know
  const newCompanies = companyVariations.filter(company => !existingCompanies.includes(company));
  
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
  
  console.log('\n📊 Variations Discovery Results');
  console.log('================================');
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

discoverVariations().catch(console.error);

