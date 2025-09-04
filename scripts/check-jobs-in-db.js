#!/usr/bin/env node

/**
 * Job Checker
 * Samples jobs from the database and analyzes their location (USA, European, Unclear)
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// Configuration
const CONFIG = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  sampleSize: 50
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
  console.log(`${colors[color]}[${new Date().toISOString()}] ${message}${colors.reset}`);
}

class JobChecker {
  constructor() {
    this.supabase = null;
  }

  async initialize() {
    if (!CONFIG.supabaseUrl || !CONFIG.serviceRoleKey) {
      throw new Error('❌ Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    }
    
    this.supabase = createClient(CONFIG.supabaseUrl, CONFIG.serviceRoleKey);
    log('✅ Supabase client initialized', 'green');
  }

  async getJobCount() {
    try {
      const { count, error } = await this.supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      return count || 0;
    } catch (error) {
      log(`❌ Error getting job count: ${error.message}`, 'red');
      return 0;
    }
  }

  async getSampleJobs() {
    try {
      const { data, error } = await this.supabase
        .from('jobs')
        .select('*')
        .limit(CONFIG.sampleSize);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      log(`❌ Error getting sample jobs: ${error.message}`, 'red');
      return [];
    }
  }

  analyzeJob(job) {
    const text = `${job.title || ''} ${job.company || ''} ${job.location || ''}`.toLowerCase();
    
    // USA indicators - more specific patterns to avoid false positives
    const usaIndicators = [
      'united states', 'usa', 'us', 'america', 'american',
      'new york, ny', 'new york city, ny', 'nyc, ny',
      'los angeles, ca', 'la, california', 'california, ca',
      'chicago, il', 'illinois, il',
      'houston, tx', 'texas, tx',
      'phoenix, az', 'arizona, az',
      'philadelphia, pa', 'pennsylvania, pa',
      'san antonio, tx', 'san diego, ca', 'dallas, tx',
      'miami, fl', 'florida, fl',
      'atlanta, ga', 'georgia, ga',
      'boston, ma', 'massachusetts, ma',
      'denver, co', 'colorado, co',
      'seattle, wa', 'washington, wa',
      'portland, or', 'oregon, or',
      'nashville, tn', 'tennessee, tn',
      'detroit, mi', 'michigan, mi',
      'cleveland, oh', 'ohio, oh',
      'minneapolis, mn', 'minnesota, mn',
      'kansas city, mo', 'missouri, mo',
      'las vegas, nv', 'nevada, nv',
      'orlando, fl', 'tampa, fl', 'jacksonville, fl',
      'austin, tx', 'fort worth, tx', 'charlotte, nc',
      'columbus, oh', 'indianapolis, in', 'memphis, tn',
      'baltimore, md', 'maryland, md',
      'milwaukee, wi', 'wisconsin, wi',
      'albuquerque, nm', 'new mexico, nm',
      'tucson, az', 'fresno, ca', 'sacramento, ca',
      'long beach, ca', 'kansas city, mo', 'mesa, az',
      'virginia beach, va', 'virginia, va',
      'colorado springs, co', 'raleigh, nc',
      'omaha, ne', 'nebraska, ne',
      'oakland, ca', 'tulsa, ok',
      'arlington, tx', 'waco, tx', 'aurora, co'
    ];
    
    // European indicators - comprehensive list
    const europeanIndicators = [
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
      'ile-de-france', 'hauts-de-seine', 'seine-saint-denis', 'val-de-marne',
      
      // Spain
      'madrid', 'spain', 'españa', 'es', 'barcelona', 'valencia', 'seville',
      'sevilla', 'zaragoza', 'málaga', 'murcia', 'palma', 'bilbao',
      'cataluña', 'catalonia', 'andalucía', 'andalusia',
      
      // Italy
      'milan', 'milano', 'rome', 'roma', 'italy', 'italia', 'it', 'naples',
      'napoli', 'turin', 'torino', 'palermo', 'genoa', 'genova', 'bologna',
      'lombardia', 'lazio', 'campania', 'piemonte', 'sicilia',
      
      // Netherlands
      'amsterdam', 'netherlands', 'holland', 'nl', 'rotterdam', 'the hague',
      'den haag', 'utrecht', 'eindhoven', 'groningen', 'tilburg', 'almere',
      'noord-holland', 'zuid-holland', 'binnenstad',
      
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
    
    // First, check for European indicators (priority check to avoid false positives)
    for (const indicator of europeanIndicators) {
      if (text.includes(indicator.toLowerCase())) {
        return 'european';
      }
    }
    
    // Then check for USA indicators (more specific patterns)
    for (const indicator of usaIndicators) {
      if (text.includes(indicator.toLowerCase())) {
        return 'usa';
      }
    }
    
    // If no clear indicators, check for individual USA state/city patterns
    const individualUsaPatterns = [
      'new york', 'ny', 'los angeles', 'la', 'chicago', 'houston', 'phoenix',
      'philadelphia', 'san antonio', 'san diego', 'dallas', 'miami', 'atlanta',
      'boston', 'denver', 'seattle', 'portland', 'nashville', 'detroit',
      'cleveland', 'minneapolis', 'kansas city', 'las vegas', 'orlando',
      'tampa', 'jacksonville', 'austin', 'fort worth', 'charlotte',
      'columbus', 'indianapolis', 'memphis', 'baltimore', 'milwaukee',
      'albuquerque', 'tucson', 'fresno', 'sacramento', 'long beach',
      'mesa', 'virginia beach', 'colorado springs', 'raleigh', 'omaha',
      'oakland', 'tulsa', 'arlington', 'waco', 'aurora'
    ];
    
    for (const pattern of individualUsaPatterns) {
      if (text.includes(pattern.toLowerCase())) {
        return 'usa';
      }
    }
    
    return 'unclear';
  }

  async run() {
    try {
      log('🔍 Starting job analysis...', 'blue');
      
      // Get total job count
      const totalJobs = await this.getJobCount();
      log(`📊 Total jobs in database: ${totalJobs}`, 'cyan');
      
      if (totalJobs === 0) {
        log('ℹ️  No jobs found in database', 'yellow');
        return;
      }
      
      // Get sample jobs
      const sampleJobs = await this.getSampleJobs();
      log(`📋 Analyzing sample of ${sampleJobs.length} jobs...`, 'blue');
      
      // Analyze each job
      let usaCount = 0;
      let europeanCount = 0;
      let unclearCount = 0;
      
      for (const job of sampleJobs) {
        const classification = this.analyzeJob(job);
        
        switch (classification) {
          case 'usa':
            usaCount++;
            break;
          case 'european':
            europeanCount++;
            break;
          case 'unclear':
            unclearCount++;
            break;
        }
      }
      
      // Calculate percentages
      const totalSample = sampleJobs.length;
      const usaPercentage = ((usaCount / totalSample) * 100).toFixed(1);
      const europeanPercentage = ((europeanCount / totalSample) * 100).toFixed(1);
      const unclearPercentage = ((unclearCount / totalSample) * 100).toFixed(1);
      
      // Estimate total database composition
      const estimatedUsaJobs = Math.round((usaCount / totalSample) * totalJobs);
      const estimatedEuropeanJobs = Math.round((europeanCount / totalSample) * totalJobs);
      const estimatedUnclearJobs = Math.round((unclearCount / totalSample) * totalJobs);
      
      // Display results
      log('\n📊 Job Analysis Results:', 'cyan');
      log('=' * 50, 'cyan');
      log(`Sample Size: ${totalSample} jobs`, 'cyan');
      log(`Total Database: ${totalJobs} jobs`, 'cyan');
      log('', 'reset');
      
      log('📈 Sample Breakdown:', 'blue');
      log(`🇺🇸 USA Jobs: ${usaCount} (${usaPercentage}%)`, 'red');
      log(`🇪🇺 European Jobs: ${europeanCount} (${europeanPercentage}%)`, 'green');
      log(`❓ Unclear: ${unclearCount} (${unclearPercentage}%)`, 'yellow');
      
      log('\n🔮 Estimated Database Composition:', 'blue');
      log(`🇺🇸 USA Jobs: ~${estimatedUsaJobs}`, 'red');
      log(`🇪🇺 European Jobs: ~${estimatedEuropeanJobs}`, 'green');
      log(`❓ Unclear: ~${estimatedUnclearJobs}`, 'yellow');
      
      // Recommendations
      log('\n💡 Recommendations:', 'magenta');
      if (usaPercentage > 20) {
        log(`⚠️  High percentage of USA jobs (${usaPercentage}%) - consider running cleanup script`, 'yellow');
      }
      if (europeanPercentage < 50) {
        log(`⚠️  Low percentage of European jobs (${europeanPercentage}%) - consider running scrapers`, 'yellow');
      }
      if (unclearPercentage > 30) {
        log(`ℹ️  High percentage of unclear jobs (${unclearPercentage}%) - may need manual review`, 'cyan');
      }
      
      log('\n✅ Analysis complete!', 'green');
      
    } catch (error) {
      log(`❌ Analysis failed: ${error.message}`, 'red');
      console.error('Stack trace:', error.stack);
    }
  }
}

// Main execution
async function main() {
  const checker = new JobChecker();
  await checker.initialize();
  await checker.run();
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Job Checker

Analyzes jobs in the database to determine their geographic distribution.

Usage:
  node scripts/check-jobs-in-db.js [options]

Options:
  --help, -h      Show this help

Environment Variables:
  NEXT_PUBLIC_SUPABASE_URL     Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY    Supabase service role key

Examples:
  # Run analysis with default settings
  node scripts/check-jobs-in-db.js
`);
  process.exit(0);
}

// Run the checker
if (require.main === module) {
  main().catch(error => {
    log(`💥 Unhandled error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { JobChecker };
