#!/usr/bin/env node

/**
 * Cleanup USA and Irrelevant Jobs
 * Removes USA jobs and clearly irrelevant jobs from the database
 * Keeps uncertain jobs to avoid false positives
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// Configuration
const CONFIG = {
  // Database
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  
  // Cleanup settings
  dryRun: process.argv.includes('--dry-run'),
  batchSize: 100,
  maxJobsToProcess: process.argv.includes('--all') ? Infinity : 1000,
  
  // Logging
  verbose: process.argv.includes('--verbose')
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  const timestamp = new Date().toISOString();
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

// USA and clearly irrelevant job patterns
const CLEARLY_IRRELEVANT_PATTERNS = {
  // USA locations (definite removal)
  usaLocations: [
    'new york', 'ny', 'new york city', 'nyc',
    'los angeles', 'la', 'california', 'ca',
    'chicago', 'illinois', 'il',
    'houston', 'texas', 'tx',
    'phoenix', 'arizona', 'az',
    'philadelphia', 'pennsylvania', 'pa',
    'san antonio', 'san diego', 'dallas',
    'miami', 'florida', 'fl',
    'atlanta', 'georgia', 'ga',
    'boston', 'massachusetts', 'ma',
    'denver', 'colorado', 'co',
    'seattle', 'washington', 'wa',
    'portland', 'oregon', 'or',
    'nashville', 'tennessee', 'tn',
    'detroit', 'michigan', 'mi',
    'cleveland', 'ohio', 'oh',
    'minneapolis', 'minnesota', 'mn',
    'kansas city', 'missouri', 'mo',
    'las vegas', 'nevada', 'nv',
    'orlando', 'tampa', 'jacksonville',
    'austin', 'fort worth', 'charlotte',
    'columbus', 'indianapolis', 'memphis',
    'baltimore', 'maryland', 'md',
    'milwaukee', 'wisconsin', 'wi',
    'albuquerque', 'new mexico', 'nm',
    'tucson', 'fresno', 'sacramento',
    'long beach', 'kansas city', 'mesa',
    'virginia beach', 'virginia', 'va',
    'atlanta', 'colorado springs', 'raleigh',
    'omaha', 'nebraska', 'ne', 'miami',
    'oakland', 'minneapolis', 'tulsa',
    'arlington', 'waco', 'aurora'
  ],
  
  // Non-European countries (definite removal)
  nonEuropeanCountries: [
    'canada', 'australia', 'new zealand', 'japan', 'china', 'india',
    'brazil', 'mexico', 'argentina', 'chile', 'peru', 'colombia',
    'venezuela', 'ecuador', 'bolivia', 'paraguay', 'uruguay',
    'south africa', 'nigeria', 'kenya', 'egypt', 'morocco', 'tunisia',
    'israel', 'lebanon', 'jordan', 'saudi arabia', 'uae', 'qatar',
    'kuwait', 'bahrain', 'oman', 'yemen', 'iran', 'iraq', 'syria',
    'pakistan', 'bangladesh', 'sri lanka', 'nepal', 'bhutan', 'myanmar',
    'thailand', 'vietnam', 'cambodia', 'laos', 'malaysia', 'singapore',
    'indonesia', 'philippines', 'taiwan', 'hong kong', 'macau',
    'mongolia', 'kazakhstan', 'uzbekistan', 'kyrgyzstan', 'tajikistan',
    'turkmenistan', 'afghanistan', 'azerbaijan', 'georgia', 'armenia'
  ],
  
  // Clearly irrelevant job types (definite removal)
  irrelevantJobTypes: [
    'truck driver', 'delivery driver', 'uber driver', 'lyft driver',
    'taxi driver', 'bus driver', 'train conductor', 'pilot',
    'flight attendant', 'cruise ship', 'yacht crew', 'fishing',
    'construction worker', 'plumber', 'electrician', 'carpenter',
    'painter', 'roofer', 'landscaper', 'gardener', 'janitor',
    'security guard', 'police officer', 'firefighter', 'paramedic',
    'nurse', 'doctor', 'dentist', 'veterinarian', 'pharmacist',
    'teacher', 'professor', 'librarian', 'counselor', 'therapist',
    'chef', 'cook', 'waiter', 'waitress', 'bartender', 'barista',
    'cashier', 'retail clerk', 'salesperson', 'real estate agent',
    'insurance agent', 'bank teller', 'accountant', 'lawyer',
    'mechanic', 'technician', 'engineer', 'scientist', 'researcher',
    'writer', 'journalist', 'editor', 'translator', 'interpreter',
    'artist', 'musician', 'actor', 'dancer', 'photographer',
    'designer', 'architect', 'interior designer', 'fashion designer',
    'model', 'influencer', 'youtuber', 'streamer', 'gamer',
    'sports player', 'coach', 'trainer', 'fitness instructor',
    'personal trainer', 'yoga instructor', 'massage therapist',
    'hairdresser', 'barber', 'beautician', 'makeup artist',
    'nail technician', 'tattoo artist', 'piercer', 'body piercer'
  ],
  
  // Clearly irrelevant industries (definite removal)
  irrelevantIndustries: [
    'fast food', 'restaurant', 'hotel', 'motel', 'resort', 'casino',
    'gambling', 'lottery', 'betting', 'sports betting', 'online gambling',
    'adult entertainment', 'pornography', 'escort', 'massage parlor',
    'strip club', 'nightclub', 'bar', 'pub', 'tavern', 'liquor store',
    'tobacco', 'cigarette', 'vape', 'marijuana', 'cannabis', 'drug',
    'pharmaceutical', 'medical device', 'hospital', 'clinic', 'pharmacy',
    'nursing home', 'assisted living', 'retirement home', 'hospice',
    'funeral home', 'cemetery', 'mortuary', 'crematorium',
    'military', 'army', 'navy', 'air force', 'marine corps', 'coast guard',
    'government', 'federal', 'state', 'local', 'city', 'county',
    'school', 'university', 'college', 'academy', 'institute',
    'church', 'mosque', 'synagogue', 'temple', 'religious', 'spiritual',
    'nonprofit', 'charity', 'foundation', 'ngo', 'volunteer',
    'agriculture', 'farming', 'ranching', 'fishing', 'hunting',
    'mining', 'oil', 'gas', 'petroleum', 'chemical', 'nuclear',
    'weapons', 'ammunition', 'firearms', 'guns', 'bombs', 'missiles',
    'defense', 'aerospace', 'aviation', 'space', 'satellite',
    'automotive', 'car', 'truck', 'motorcycle', 'bicycle', 'scooter',
    'transportation', 'logistics', 'shipping', 'freight', 'cargo',
    'warehouse', 'storage', 'distribution', 'supply chain',
    'retail', 'wholesale', 'ecommerce', 'online store', 'marketplace',
    'food', 'beverage', 'alcohol', 'tobacco', 'pharmaceutical',
    'healthcare', 'medical', 'dental', 'vision', 'mental health',
    'fitness', 'wellness', 'beauty', 'cosmetics', 'personal care',
    'entertainment', 'media', 'publishing', 'broadcasting', 'streaming',
    'gaming', 'esports', 'virtual reality', 'augmented reality',
    'blockchain', 'cryptocurrency', 'bitcoin', 'ethereum', 'nft',
    'cybersecurity', 'information security', 'network security',
    'cloud computing', 'artificial intelligence', 'machine learning',
    'data science', 'big data', 'analytics', 'business intelligence',
    'consulting', 'advisory', 'professional services', 'legal services',
    'financial services', 'banking', 'insurance', 'investment',
    'real estate', 'property', 'construction', 'architecture',
    'engineering', 'technology', 'software', 'hardware', 'it',
    'telecommunications', 'internet', 'web', 'mobile', 'app',
    'social media', 'marketing', 'advertising', 'public relations',
    'sales', 'business development', 'customer success', 'support',
    'operations', 'project management', 'product management',
    'human resources', 'recruiting', 'talent acquisition',
    'finance', 'accounting', 'auditing', 'tax', 'treasury',
    'strategy', 'planning', 'research', 'development', 'innovation'
  ]
};

// European locations to protect from false positives
const EUROPEAN_LOCATIONS = [
  // UK
  'london', 'uk', 'england', 'scotland', 'wales', 'britain', 'british',
  'manchester', 'birmingham', 'leeds', 'liverpool', 'bristol', 'glasgow',
  'edinburgh', 'cardiff', 'sheffield', 'newcastle', 'leicester', 'coventry',
  
  // Germany
  'berlin', 'germany', 'deutschland', 'de', 'munich', 'münchen', 'hamburg',
  'frankfurt', 'cologne', 'köln', 'stuttgart', 'düsseldorf', 'dortmund',
  'essen', 'leipzig', 'bremen', 'dresden', 'hanover', 'hannover',
  
  // France
  'paris', 'france', 'french', 'lyon', 'marseille', 'toulouse', 'nice',
  'nantes', 'strasbourg', 'montpellier', 'bordeaux', 'lille', 'rennes',
  
  // Spain
  'madrid', 'spain', 'españa', 'es', 'barcelona', 'valencia', 'seville',
  'sevilla', 'zaragoza', 'málaga', 'murcia', 'palma', 'bilbao',
  
  // Italy
  'milan', 'milano', 'rome', 'roma', 'italy', 'italia', 'it', 'naples',
  'napoli', 'turin', 'torino', 'palermo', 'genoa', 'genova', 'bologna',
  
  // Netherlands
  'amsterdam', 'netherlands', 'holland', 'nl', 'rotterdam', 'the hague',
  'den haag', 'utrecht', 'eindhoven', 'groningen', 'tilburg', 'almere',
  
  // Ireland
  'dublin', 'ireland', 'éire', 'ie', 'cork', 'galway', 'limerick',
  'waterford', 'kilkenny', 'wicklow', 'kerry', 'mayo',
  
  // Switzerland
  'zurich', 'zürich', 'switzerland', 'schweiz', 'suisse', 'ch', 'geneva',
  'genève', 'bern', 'basel', 'basilea', 'lausanne', 'winterthur',
  
  // Austria
  'vienna', 'wien', 'austria', 'österreich', 'at', 'salzburg', 'innsbruck',
  'graz', 'klagenfurt', 'villach', 'linz', 'bregenz',
  
  // Belgium
  'brussels', 'brussel', 'belgium', 'belgië', 'belgique', 'be', 'antwerp',
  'antwerpen', 'ghent', 'gent', 'charleroi', 'liège', 'bruges',
  
  // Sweden
  'stockholm', 'sweden', 'sverige', 'se', 'gothenburg', 'göteborg',
  'malmö', 'uppsala', 'västerås', 'örebro', 'linköping',
  
  // Norway
  'oslo', 'norway', 'norge', 'no', 'bergen', 'trondheim', 'stavanger',
  'tromsø', 'drammen', 'fredrikstad', 'sandnes', 'bodø',
  
  // Denmark
  'copenhagen', 'københavn', 'denmark', 'danmark', 'dk', 'aarhus',
  'odense', 'aalborg', 'esbjerg', 'randers', 'kolding',
  
  // Finland
  'helsinki', 'finland', 'suomi', 'fi', 'espoo', 'tampere', 'vantaa',
  'oulu', 'turku', 'jyväskylä', 'lahti', 'kuopio',
  
  // Portugal
  'lisbon', 'lisboa', 'portugal', 'pt', 'porto', 'braga', 'faro',
  'coimbra', 'setúbal', 'aveiro', 'leiria', 'funchal',
  
  // Poland
  'warsaw', 'warszawa', 'poland', 'polska', 'pl', 'krakow', 'kraków',
  'lodz', 'łódź', 'wroclaw', 'wrocław', 'poznan', 'poznań',
  
  // Czech Republic
  'prague', 'praha', 'czech republic', 'czechia', 'cz', 'brno', 'ostrava',
  'plzen', 'plzeň', 'liberec', 'olomouc', 'ústí nad labem',
  
  // Hungary
  'budapest', 'hungary', 'magyarország', 'hu', 'debrecen', 'szeged',
  'miskolc', 'pécs', 'győr', 'nyíregyháza', 'kecskemét',
  
  // Romania
  'bucharest', 'bucurești', 'romania', 'românia', 'ro', 'cluj-napoca',
  'timisoara', 'timișoara', 'iasi', 'iași', 'constanta', 'constanța',
  
  // Bulgaria
  'sofia', 'bulgaria', 'българия', 'bg', 'plovdiv', 'varna', 'burgas',
  'ruse', 'stara zagora', 'pleven', 'sliven',
  
  // Croatia
  'zagreb', 'croatia', 'hrvatska', 'hr', 'split', 'rijeka', 'osijek',
  'zadar', 'pula', 'slavonski brod', 'karlovac',
  
  // Slovenia
  'ljubljana', 'slovenia', 'slovenija', 'si', 'maribor', 'celje',
  'kranj', 'velenje', 'koper', 'novo mesto', 'ptuj',
  
  // Slovakia
  'bratislava', 'slovakia', 'slovensko', 'sk', 'košice', 'prešov',
  'žilina', 'nitra', 'banská bystrica', 'trnava', 'trenčín',
  
  // Estonia
  'tallinn', 'estonia', 'eesti', 'ee', 'tartu', 'narva', 'pärnu',
  'kohtla-järve', 'viljandi', 'rakvere', 'sillamäe',
  
  // Latvia
  'riga', 'rīga', 'latvia', 'latvija', 'lv', 'daugavpils', 'liepāja',
  'jelgava', 'jūrmala', 'ventspils', 'rēzekne',
  
  // Lithuania
  'vilnius', 'lithuania', 'lietuva', 'lt', 'kaunas', 'klaipėda',
  'šiauliai', 'panevėžys', 'alytus', 'marijampolė', 'mažeikiai'
];

class JobCleanup {
  constructor() {
    this.supabase = null;
    this.stats = {
      totalJobs: 0,
      usaJobsFound: 0,
      irrelevantJobsFound: 0,
      uncertainJobs: 0,
      jobsToRemove: 0,
      jobsKept: 0
    };
  }

  async initialize() {
    log('🚀 Initializing Job Cleanup...', 'blue');
    
    if (!CONFIG.supabaseUrl || !CONFIG.serviceRoleKey) {
      throw new Error('❌ Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    }
    
    this.supabase = createClient(CONFIG.supabaseUrl, CONFIG.serviceRoleKey);
    log('✅ Supabase client initialized', 'green');
    
    // Test database connection
    try {
      const { data, error } = await this.supabase
        .from('jobs')
        .select('count')
        .limit(1);
      
      if (error) throw error;
      log('✅ Database connection verified', 'green');
    } catch (error) {
      throw new Error(`❌ Database connection failed: ${error.message}`);
    }
  }

  isClearlyUSA(job) {
    const text = `${job.title || ''} ${job.company || ''} ${job.location || ''}`.toLowerCase();
    const categories = (job.categories || []).join(' ').toLowerCase();
    const allText = `${text} ${categories}`;
    
    // First, check if it's clearly European (protect from false positives)
    for (const europeanLocation of EUROPEAN_LOCATIONS) {
      if (text.includes(europeanLocation.toLowerCase())) {
        // Even if the main location is European, check if categories contain USA locations
        for (const usaLocation of CLEARLY_IRRELEVANT_PATTERNS.usaLocations) {
          if (categories.includes(usaLocation.toLowerCase())) {
            return true; // This job has USA location in categories
          }
        }
        return false; // This is European, not USA
      }
    }
    
    // Then check for USA locations (more specific patterns)
    for (const location of CLEARLY_IRRELEVANT_PATTERNS.usaLocations) {
      if (allText.includes(location.toLowerCase())) {
        return true;
      }
    }
    
    return false;
  }

  isClearlyNonEuropean(job) {
    const text = `${job.title || ''} ${job.company || ''} ${job.location || ''}`.toLowerCase();
    const categories = (job.categories || []).join(' ').toLowerCase();
    const allText = `${text} ${categories}`;
    
    // First, check if it's clearly European (protect from false positives)
    for (const europeanLocation of EUROPEAN_LOCATIONS) {
      if (text.includes(europeanLocation.toLowerCase())) {
        // Even if the main location is European, check if categories contain non-European locations
        for (const nonEuropeanCountry of CLEARLY_IRRELEVANT_PATTERNS.nonEuropeanCountries) {
          if (categories.includes(nonEuropeanCountry.toLowerCase())) {
            return true; // This job has non-European location in categories
          }
        }
        return false; // This is European, not non-European
      }
    }
    
    // Then check for non-European countries
    for (const country of CLEARLY_IRRELEVANT_PATTERNS.nonEuropeanCountries) {
      if (allText.includes(country.toLowerCase())) {
        return true;
      }
    }
    
    return false;
  }

  isClearlyIrrelevant(job) {
    const text = `${job.title || ''} ${job.company || ''} ${job.description || ''}`.toLowerCase();
    
    // Check for clearly irrelevant job types
    for (const jobType of CLEARLY_IRRELEVANT_PATTERNS.irrelevantJobTypes) {
      if (text.includes(jobType.toLowerCase())) {
        return true;
      }
    }
    
    // Check for clearly irrelevant industries
    for (const industry of CLEARLY_IRRELEVANT_PATTERNS.irrelevantIndustries) {
      if (text.includes(industry.toLowerCase())) {
        return true;
      }
    }
    
    return false;
  }

  classifyJob(job) {
    // Check for clearly USA jobs
    if (this.isClearlyUSA(job)) {
      this.stats.usaJobsFound++;
      return 'remove-usa';
    }
    
    // Check for clearly non-European jobs
    if (this.isClearlyNonEuropean(job)) {
      this.stats.irrelevantJobsFound++;
      return 'remove-irrelevant';
    }
    
    // Check for clearly irrelevant job types/industries
    if (this.isClearlyIrrelevant(job)) {
      this.stats.irrelevantJobsFound++;
      return 'remove-irrelevant';
    }
    
    // If unsure, keep the job
    this.stats.uncertainJobs++;
    return 'keep';
  }

  async getJobsToProcess() {
    log('📊 Fetching jobs from database...', 'blue');
    
    try {
      const { data, error } = await this.supabase
        .from('jobs')
        .select('id, title, company, location, description, categories, work_environment, experience_required')
        .limit(CONFIG.maxJobsToProcess);
      
      if (error) throw error;
      
      this.stats.totalJobs = data.length;
      log(`✅ Found ${data.length} jobs to analyze`, 'green');
      
      return data;
    } catch (error) {
      throw new Error(`Failed to fetch jobs: ${error.message}`);
    }
  }

  async removeJobs(jobIds, reason) {
    if (CONFIG.dryRun) {
      log(`🔍 [DRY RUN] Would remove ${jobIds.length} jobs (${reason})`, 'yellow');
      return;
    }
    
    log(`🗑️  Removing ${jobIds.length} jobs (${reason})...`, 'red');
    
    try {
      const { error } = await this.supabase
        .from('jobs')
        .delete()
        .in('id', jobIds);
      
      if (error) throw error;
      
      log(`✅ Successfully removed ${jobIds.length} jobs`, 'green');
      return true;
    } catch (error) {
      log(`❌ Failed to remove jobs: ${error.message}`, 'red');
      return false;
    }
  }

  async processJobs() {
    const jobs = await this.getJobsToProcess();
    
    log('🔍 Analyzing jobs for cleanup...', 'blue');
    
    const jobsToRemove = {
      usa: [],
      irrelevant: []
    };
    
    for (const job of jobs) {
      const classification = this.classifyJob(job);
      
      if (classification === 'remove-usa') {
        jobsToRemove.usa.push(job.id);
      } else if (classification === 'remove-irrelevant') {
        jobsToRemove.irrelevant.push(job.id);
      }
    }
    
    // Update stats
    this.stats.jobsToRemove = jobsToRemove.usa.length + jobsToRemove.irrelevant.length;
    this.stats.jobsKept = this.stats.uncertainJobs;
    
    // Log findings
    log('\n📊 Job Analysis Results:', 'cyan');
    log(`   • Total jobs analyzed: ${this.stats.totalJobs}`, 'cyan');
    log(`   • USA jobs found: ${this.stats.usaJobsFound}`, 'red');
    log(`   • Clearly irrelevant jobs: ${this.stats.irrelevantJobsFound}`, 'red');
    log(`   • Uncertain jobs (keeping): ${this.stats.uncertainJobs}`, 'green');
    log(`   • Jobs to remove: ${this.stats.jobsToRemove}`, 'yellow');
    log(`   • Jobs to keep: ${this.stats.jobsKept}`, 'green');
    
    // Remove USA jobs
    if (jobsToRemove.usa.length > 0) {
      await this.removeJobs(jobsToRemove.usa, 'USA location');
    }
    
    // Remove irrelevant jobs
    if (jobsToRemove.irrelevant.length > 0) {
      await this.removeJobs(jobsToRemove.irrelevant, 'clearly irrelevant');
    }
    
    if (CONFIG.dryRun) {
      log('\n🔍 [DRY RUN] No jobs were actually removed', 'yellow');
      log('💡 Run without --dry-run to perform actual cleanup', 'cyan');
    }
  }

  printSummary() {
    log('\n📊 Cleanup Summary:', 'cyan');
    log(`   • Total jobs processed: ${this.stats.totalJobs}`, 'cyan');
    log(`   • USA jobs removed: ${this.stats.usaJobsFound}`, 'red');
    log(`   • Irrelevant jobs removed: ${this.stats.irrelevantJobsFound}`, 'red');
    log(`   • Jobs kept (uncertain): ${this.stats.uncertainJobs}`, 'green');
    log(`   • Total jobs removed: ${this.stats.jobsToRemove}`, 'yellow');
    log(`   • Jobs remaining: ${this.stats.jobsKept}`, 'green');
    
    if (this.stats.jobsToRemove > 0) {
      log(`\n🎯 Database cleaned up successfully!`, 'green');
      log(`   • Removed ${this.stats.jobsToRemove} irrelevant jobs`, 'green');
      log(`   • Kept ${this.stats.jobsKept} potentially relevant jobs`, 'green');
    } else {
      log(`\n✨ No cleanup needed - all jobs appear relevant`, 'green');
    }
  }

  async run() {
    try {
      await this.initialize();
      await this.processJobs();
      this.printSummary();
    } catch (error) {
      log(`💥 Cleanup failed: ${error.message}`, 'red');
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const cleanup = new JobCleanup();
  await cleanup.run();
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Job Cleanup - Remove USA and Irrelevant Jobs

Removes USA jobs and clearly irrelevant jobs from the database.
Keeps uncertain jobs to avoid false positives.

Usage:
  node scripts/cleanup-usa-irrelevant-jobs.js [options]

Options:
  --dry-run       Show what would be removed without actually removing
  --all           Process all jobs (default: limit to 1000)
  --verbose       Enable verbose logging
  --help, -h      Show this help

Examples:
  # Preview what would be removed
  node scripts/cleanup-usa-irrelevant-jobs.js --dry-run
  
  # Actually remove the jobs
  node scripts/cleanup-usa-irrelevant-jobs.js
  
  # Process all jobs in database
  node scripts/cleanup-usa-irrelevant-jobs.js --all
`);
  process.exit(0);
}

// Run the cleanup
if (require.main === module) {
  main().catch(error => {
    log(`💥 Unhandled error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { JobCleanup };
