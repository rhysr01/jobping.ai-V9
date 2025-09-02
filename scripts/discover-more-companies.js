#!/usr/bin/env node

const axios = require('axios');

// Different naming patterns to try
const namingPatterns = [
  // Common company suffixes
  'tech', 'ai', 'io', 'app', 'hub', 'lab', 'studio', 'group', 'inc', 'ltd', 'co', 'corp',
  
  // Industry-specific patterns
  'pay', 'bank', 'fin', 'insure', 'health', 'med', 'edu', 'learn', 'shop', 'store', 'food', 'delivery',
  
  // Geographic patterns
  'uk', 'eu', 'europe', 'london', 'berlin', 'paris', 'amsterdam', 'dublin', 'stockholm',
  
  // Tech patterns
  'data', 'cloud', 'api', 'web', 'mobile', 'digital', 'smart', 'intelligent', 'automation',
  
  // Startup patterns
  'startup', 'scaleup', 'growth', 'venture', 'capital', 'accelerator', 'incubator',
  
  // Modern company names
  'bolt', 'klarna', 'revolut', 'monzo', 'wise', 'transferwise', 'stripe', 'plaid', 'brex',
  'notion', 'figma', 'linear', 'vercel', 'netlify', 'supabase', 'planetscale', 'railway',
  'render', 'fly', 'heroku', 'digitalocean', 'cloudflare', 'fastly', 'vercel', 'netlify',
  
  // European tech companies
  'klarna', 'spotify', 'skype', 'soundcloud', 'angrybirds', 'supercell', 'unity', 'king',
  'mojang', 'minecraft', 'roblox', 'fortnite', 'epic', 'valve', 'steam', 'origin',
  
  // Fintech variations
  'revolut', 'monzo', 'starling', 'klarna', 'afterpay', 'wise', 'transferwise', 'stripe',
  'plaid', 'brex', 'mercury', 'novo', 'bluevine', 'fundbox', 'kabbage', 'ondeck',
  
  // AI/ML companies
  'openai', 'anthropic', 'cohere', 'huggingface', 'stability', 'midjourney', 'runway',
  'scale', 'labelbox', 'weights', 'wandb', 'comet', 'mlflow', 'kubeflow', 'tensorflow',
  
  // Developer tools
  'github', 'gitlab', 'atlassian', 'notion', 'figma', 'linear', 'vercel', 'netlify',
  'supabase', 'planetscale', 'railway', 'render', 'fly', 'heroku', 'digitalocean',
  
  // E-commerce platforms
  'shopify', 'woocommerce', 'magento', 'bigcommerce', 'wix', 'squarespace', 'webflow',
  'framer', 'bubble', 'webflow', 'squarespace', 'wix', 'wordpress', 'drupal',
  
  // SaaS companies
  'slack', 'discord', 'zoom', 'teams', 'asana', 'trello', 'monday', 'clickup', 'notion',
  'airtable', 'coda', 'roam', 'obsidian', 'logseq', 'notion', 'clickup', 'monday',
  
  // Health tech
  'ro', 'hims', 'hers', 'calm', 'headspace', 'peloton', 'whoop', 'oura', 'fitbit',
  'garmin', 'strava', 'myfitnesspal', 'calm', 'headspace', 'insight', 'calm',
  
  // Food delivery
  'doordash', 'ubereats', 'grubhub', 'deliveroo', 'justeat', 'takeaway', 'swiggy',
  'zomato', 'postmates', 'caviar', 'seamless', 'chownow', 'toast', 'square',
  
  // Travel companies
  'booking', 'expedia', 'airbnb', 'tripadvisor', 'kayak', 'skyscanner', 'momondo',
  'kiwi', 'google', 'maps', 'waze', 'uber', 'lyft', 'gett', 'free', 'now',
  
  // Media/Entertainment
  'spotify', 'tidal', 'deezer', 'youtube', 'twitch', 'tiktok', 'snapchat', 'pinterest',
  'reddit', 'discord', 'telegram', 'signal', 'whatsapp', 'messenger', 'instagram',
  
  // Automotive
  'tesla', 'rivian', 'lucid', 'nio', 'waymo', 'cruise', 'zoox', 'porsche', 'ferrari',
  'lamborghini', 'bmw', 'mercedes', 'audi', 'volkswagen', 'volvo', 'saab', 'skoda',
  
  // Fashion/Luxury
  'nike', 'adidas', 'puma', 'underarmour', 'lululemon', 'zara', 'hm', 'uniqlo',
  'gap', 'levis', 'calvin', 'klein', 'ralph', 'lauren', 'tommy', 'hilfiger',
  
  // Consulting/Professional services
  'mckinsey', 'bain', 'bcg', 'deloitte', 'pwc', 'ey', 'kpmg', 'accenture', 'ibm',
  'oracle', 'sap', 'salesforce', 'adobe', 'microsoft', 'google', 'amazon', 'apple',
  
  // Startup accelerators/incubators
  'ycombinator', 'techstars', '500startups', 'seedcamp', 'startupbootcamp', 'rocketinternet',
  'antler', 'founders', 'factory', 'entrepreneur', 'first', 'startup', 'scaleup',
  
  // Unusual company names
  'hello', 'world', 'company', 'startup', 'tech', 'digital', 'innovation', 'future',
  'next', 'now', 'today', 'tomorrow', 'yesterday', 'always', 'never', 'forever',
  
  // Geographic variations
  'london', 'berlin', 'paris', 'amsterdam', 'dublin', 'stockholm', 'copenhagen',
  'oslo', 'helsinki', 'tallinn', 'riga', 'vilnius', 'warsaw', 'prague', 'vienna',
  'budapest', 'bratislava', 'ljubljana', 'zagreb', 'belgrade', 'sofia', 'bucharest',
  
  // Industry variations
  'energy', 'health', 'finance', 'education', 'transport', 'logistics', 'retail',
  'media', 'gaming', 'sports', 'fitness', 'wellness', 'beauty', 'fashion', 'luxury',
  
  // Tech variations
  'software', 'hardware', 'platform', 'service', 'product', 'solution', 'tool',
  'framework', 'library', 'sdk', 'api', 'database', 'storage', 'compute', 'network',
  
  // Modern patterns
  'neo', 'zen', 'flow', 'pulse', 'wave', 'stream', 'flux', 'spark', 'flare',
  'blaze', 'fire', 'ice', 'storm', 'thunder', 'lightning', 'rainbow', 'sunshine'
];

// Companies we already know work (exclude these)
const existingCompanies = [
  'spotify', 'plaid', 'gopuff', 'ro', 'jobandtalent', 'dlocal', 'binance', 'mistral',
  'swile', 'loftorbital', 'finn', 'pipedrive', 'welocalize', 'netlight', 'shieldai',
  'anybotics', 'milltownpartners', 'nium', 'unlimit', 'pennylane', 'palantir', 'sylvera',
  'qonto', 'fluence', 'insify', 'keyloop', 'companial', 'airslate', 'farfetch', 'deliverect'
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

async function discoverMoreCompanies() {
  console.log('🎯 Discovering More Lever Companies');
  console.log('==================================\n');
  
  const working = [];
  const european = [];
  const highImpact = [];
  
  // Filter out companies we already know
  const newPatterns = namingPatterns.filter(pattern => !existingCompanies.includes(pattern));
  
  for (let i = 0; i < newPatterns.length; i++) {
    const company = newPatterns[i];
    process.stdout.write(`Testing ${i + 1}/${newPatterns.length}: ${company}... `);
    
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
  
  console.log('\n📊 Discovery Results');
  console.log('====================');
  console.log(`✅ Working: ${working.length}/${newPatterns.length}`);
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

discoverMoreCompanies().catch(console.error);
