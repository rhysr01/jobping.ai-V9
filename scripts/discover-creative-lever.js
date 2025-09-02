#!/usr/bin/env node

const axios = require('axios');

// Creative approaches to find Lever companies
const creativeSlugs = [
  // Tech giants with non-obvious slugs
  'google', 'meta', 'amazon', 'microsoft', 'apple', 'netflix', 'uber', 'airbnb', 'stripe', 'square',
  
  // Gaming companies
  'riotgames', 'supercell', 'king', 'ubisoft', 'ea', 'activision', 'blizzard', 'epicgames', 'valve',
  
  // Crypto/Web3
  'coinbase', 'binance', 'kraken', 'blockchain', 'consensys', 'alchemy', 'chainlink', 'opensea', 'dapper',
  
  // Fintech
  'revolut', 'monzo', 'starling', 'klarna', 'afterpay', 'wise', 'transferwise', 'stripe', 'plaid', 'brex',
  
  // AI/ML companies
  'openai', 'anthropic', 'cohere', 'huggingface', 'stability', 'midjourney', 'runway', 'scale', 'labelbox',
  
  // Developer tools
  'github', 'gitlab', 'atlassian', 'notion', 'figma', 'linear', 'vercel', 'netlify', 'supabase', 'planetscale',
  
  // E-commerce
  'shopify', 'woocommerce', 'magento', 'bigcommerce', 'wix', 'squarespace', 'webflow', 'framer',
  
  // SaaS companies
  'slack', 'discord', 'zoom', 'teams', 'asana', 'trello', 'monday', 'clickup', 'notion', 'airtable',
  
  // Health tech
  'ro', 'hims', 'hers', 'calm', 'headspace', 'peloton', 'whoop', 'oura', 'fitbit', 'garmin',
  
  // Food delivery
  'doordash', 'ubereats', 'grubhub', 'deliveroo', 'justeat', 'takeaway', 'swiggy', 'zomato',
  
  // Travel
  'booking', 'expedia', 'airbnb', 'tripadvisor', 'kayak', 'skyscanner', 'momondo', 'kiwi',
  
  // Media/Entertainment
  'spotify', 'tidal', 'deezer', 'youtube', 'twitch', 'tiktok', 'snapchat', 'pinterest', 'reddit',
  
  // Automotive
  'tesla', 'rivian', 'lucid', 'nio', 'waymo', 'cruise', 'zoox', 'porsche', 'ferrari', 'lamborghini',
  
  // Fashion/Luxury
  'nike', 'adidas', 'puma', 'underarmour', 'lululemon', 'zara', 'hm', 'uniqlo', 'gap', 'levis',
  
  // Consulting/Professional services
  'mckinsey', 'bain', 'bcg', 'deloitte', 'pwc', 'ey', 'kpmg', 'accenture', 'ibm', 'oracle',
  
  // European companies with creative names
  'klarna', 'spotify', 'skype', 'soundcloud', 'angrybirds', 'supercell', 'unity', 'king', 'mojang',
  
  // Startup accelerators/incubators
  'ycombinator', 'techstars', '500startups', 'seedcamp', 'startupbootcamp', 'rocketinternet',
  
  // Unusual company names
  'hello', 'world', 'company', 'startup', 'tech', 'digital', 'innovation', 'future', 'next', 'now',
  
  // Geographic variations
  'london', 'berlin', 'paris', 'amsterdam', 'dublin', 'stockholm', 'copenhagen', 'oslo', 'helsinki',
  
  // Industry variations
  'energy', 'health', 'finance', 'education', 'transport', 'logistics', 'retail', 'media', 'gaming'
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

async function discoverCreativeCompanies() {
  console.log('🎯 Creative Lever Company Discovery');
  console.log('==================================\n');
  
  const working = [];
  const european = [];
  const highImpact = [];
  
  for (let i = 0; i < creativeSlugs.length; i++) {
    const company = creativeSlugs[i];
    process.stdout.write(`Testing ${i + 1}/${creativeSlugs.length}: ${company}... `);
    
    const result = await testCompany(company);
    
    if (result.success) {
      console.log(`✅ ${result.earlyCareerJobs}/${result.totalJobs} early-career jobs`);
      working.push(result);
      
      if (result.hasEuropeanJobs) {
        european.push(result);
        console.log(`     🌍 Has European jobs`);
      }
      
      if (result.earlyCareerJobs > 10) {
        highImpact.push(result);
        console.log(`     🚀 High impact!`);
      }
    } else {
      console.log(`❌`);
    }
    
    // Quick delay
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log('\n📊 Creative Discovery Results');
  console.log('=============================');
  console.log(`✅ Working: ${working.length}/${creativeSlugs.length}`);
  console.log(`🌍 European jobs: ${european.length}/${working.length}`);
  console.log(`🚀 High impact (>10 jobs): ${highImpact.length}/${working.length}`);
  
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
      .filter(r => r.earlyCareerJobs > 0 && !['spotify', 'plaid', 'gopuff', 'ro', 'jobandtalent', 'dlocal', 'binance', 'mistral', 'swile', 'loftorbital', 'finn', 'pipedrive', 'welocalize', 'netlight', 'shieldai'].includes(r.company))
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
    console.log('   No companies found with early-career jobs.');
  }
  
  return working;
}

discoverCreativeCompanies().catch(console.error);
