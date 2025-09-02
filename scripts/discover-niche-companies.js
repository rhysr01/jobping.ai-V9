#!/usr/bin/env node

const axios = require('axios');

// Niche company categories that are more likely to exist
const nicheCompanies = [
  // European fintech (more likely to use Lever)
  'klarna', 'revolut', 'monzo', 'starling', 'wise', 'transferwise', 'n26', 'bunq', 'curve', 'tide',
  'atom', 'chime', 'current', 'varo', 'sofi', 'robinhood', 'webull', 'etoro', 'trading212', 'freetrade',
  
  // European gaming companies
  'supercell', 'king', 'mojang', 'minecraft', 'roblox', 'unity', 'epic', 'valve', 'steam', 'origin',
  'ubisoft', 'ea', 'activision', 'blizzard', 'riot', 'league', 'fortnite', 'pubg', 'apex', 'overwatch',
  
  // European AI/ML companies
  'huggingface', 'stability', 'midjourney', 'runway', 'scale', 'labelbox', 'weights', 'wandb', 'comet',
  'mlflow', 'kubeflow', 'tensorflow', 'pytorch', 'jax', 'huggingface', 'gradio', 'streamlit', 'plotly',
  
  // European developer tools
  'gitlab', 'atlassian', 'notion', 'figma', 'linear', 'vercel', 'netlify', 'supabase', 'planetscale',
  'railway', 'render', 'fly', 'heroku', 'digitalocean', 'cloudflare', 'fastly', 'vercel', 'netlify',
  
  // European e-commerce
  'zalando', 'asos', 'boohoo', 'prettylittlething', 'missguided', 'nastygal', 'fashionnova', 'revolve',
  'shopify', 'woocommerce', 'magento', 'bigcommerce', 'wix', 'squarespace', 'webflow', 'framer',
  
  // European SaaS companies
  'slack', 'discord', 'zoom', 'teams', 'asana', 'trello', 'monday', 'clickup', 'notion', 'airtable',
  'coda', 'roam', 'obsidian', 'logseq', 'notion', 'clickup', 'monday', 'basecamp', 'teamwork', 'wrike',
  
  // European health tech
  'calm', 'headspace', 'insight', 'calm', 'peloton', 'whoop', 'oura', 'fitbit', 'garmin', 'strava',
  'myfitnesspal', 'calm', 'headspace', 'insight', 'calm', 'ro', 'hims', 'hers', 'calm', 'headspace',
  
  // European food delivery
  'deliveroo', 'justeat', 'takeaway', 'swiggy', 'zomato', 'postmates', 'caviar', 'seamless', 'chownow',
  'toast', 'square', 'doordash', 'ubereats', 'grubhub', 'deliveroo', 'justeat', 'takeaway', 'swiggy',
  
  // European travel
  'skyscanner', 'momondo', 'kiwi', 'google', 'maps', 'waze', 'uber', 'lyft', 'gett', 'free', 'now',
  'booking', 'expedia', 'airbnb', 'tripadvisor', 'kayak', 'skyscanner', 'momondo', 'kiwi', 'google',
  
  // European media/entertainment
  'tidal', 'deezer', 'youtube', 'twitch', 'tiktok', 'snapchat', 'pinterest', 'reddit', 'discord',
  'telegram', 'signal', 'whatsapp', 'messenger', 'instagram', 'spotify', 'tidal', 'deezer', 'youtube',
  
  // European automotive
  'bmw', 'mercedes', 'audi', 'volkswagen', 'volvo', 'saab', 'skoda', 'seat', 'renault', 'peugeot',
  'citroen', 'fiat', 'alfa', 'lancia', 'maserati', 'ferrari', 'lamborghini', 'porsche', 'bentley',
  
  // European fashion/luxury
  'zara', 'hm', 'uniqlo', 'gap', 'levis', 'calvin', 'klein', 'ralph', 'lauren', 'tommy', 'hilfiger',
  'nike', 'adidas', 'puma', 'underarmour', 'lululemon', 'zara', 'hm', 'uniqlo', 'gap', 'levis',
  
  // European consulting/professional
  'mckinsey', 'bain', 'bcg', 'deloitte', 'pwc', 'ey', 'kpmg', 'accenture', 'ibm', 'oracle', 'sap',
  'salesforce', 'adobe', 'microsoft', 'google', 'amazon', 'apple', 'mckinsey', 'bain', 'bcg',
  
  // European startup accelerators
  'ycombinator', 'techstars', '500startups', 'seedcamp', 'startupbootcamp', 'rocketinternet', 'antler',
  'founders', 'factory', 'entrepreneur', 'first', 'startup', 'scaleup', 'ycombinator', 'techstars',
  
  // European energy/clean tech
  'octopus', 'bulb', 'ovo', 'edf', 'engie', 'enel', 'iberdrola', 'endesa', 'naturgy', 'repsol',
  'bp', 'shell', 'total', 'eni', 'equinor', 'statkraft', 'vattenfall', 'fortum', 'neste', 'orsted',
  
  // European logistics/transport
  'dbschenker', 'kuehne', 'nagel', 'dsv', 'ceva', 'agility', 'bollore', 'geodis', 'expeditors', 'chrobinson',
  'ups', 'fedex', 'dhl', 'tnt', 'aramex', 'yodel', 'hermes', 'dpd', 'royalmail', 'postnl',
  
  // European retail
  'tesco', 'sainsburys', 'asda', 'morrisons', 'aldi', 'lidl', 'carrefour', 'auchan', 'leclerc', 'intermarche',
  'elcorteingles', 'fnac', 'mediaworld', 'euronics', 'saturn', 'mediamarkt', 'elgiganten', 'komplett',
  
  // European telecom
  'bt', 'vodafone', 'o2', 'three', 'ee', 'orange', 'sfr', 'bouygues', 'free', 'telekom', 'vodafone',
  'telefonica', 'movistar', 'orange', 'vodafone', 'telenor', 'telia', 'elisa', 'sonera', 'telenor',
  
  // European insurance
  'aviva', 'prudential', 'legal', 'general', 'directline', 'admiral', 'esure', 'hastings', 'axa',
  'allianz', 'generali', 'zurich', 'swiss', 're', 'mapfre', 'mutua', 'madrileña', 'caser', 'linea',
  
  // European real estate
  'rightmove', 'zoopla', 'onthemarket', 'primelocation', 'zoopla', 'rightmove', 'onthemarket', 'primelocation',
  'immobiliare', 'casa', 'idealista', 'fotocasa', 'habitaclia', 'pisos', 'idealista', 'fotocasa',
  
  // European education
  'coursera', 'udemy', 'edx', 'khan', 'academy', 'duolingo', 'babbel', 'busuu', 'memrise', 'rosetta',
  'stone', 'open', 'university', 'future', 'learn', 'open', 'university', 'future', 'learn', 'open'
];

// Companies we already know work (exclude these)
const existingCompanies = [
  'spotify', 'plaid', 'gopuff', 'ro', 'jobandtalent', 'dlocal', 'binance', 'mistral',
  'swile', 'loftorbital', 'finn', 'pipedrive', 'welocalize', 'netlight', 'shieldai',
  'anybotics', 'milltownpartners', 'nium', 'unlimit', 'pennylane', 'palantir', 'sylvera',
  'qonto', 'fluence', 'insify', 'keyloop', 'companial', 'airslate', 'farfetch', 'deliverect',
  'capital'
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

async function discoverNicheCompanies() {
  console.log('🎯 Discovering Niche Lever Companies');
  console.log('===================================\n');
  
  const working = [];
  const european = [];
  const highImpact = [];
  
  // Filter out companies we already know
  const newCompanies = nicheCompanies.filter(company => !existingCompanies.includes(company));
  
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
  
  console.log('\n📊 Niche Discovery Results');
  console.log('==========================');
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

discoverNicheCompanies().catch(console.error);
