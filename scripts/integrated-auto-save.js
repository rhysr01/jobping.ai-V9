#!/usr/bin/env node

/**
 * Integrated Auto Save - Runs Real Scrapers and Saves European Jobs
 * WITH PROPER DATA NORMALIZATION
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// BOARD TO COMPANY MAPPING for Greenhouse
const GREENHOUSE_BOARD_TO_COMPANY = {
  'flowtraders': 'Flow Traders',
  'squarepointcapital': 'Squarepoint Capital',
  'jumptrading': 'Jump Trading',
  'twiliostudents': 'Twilio',
  'pinterest': 'Pinterest',
  'stepstone': 'StepStone',
  'charlesriverassociates': 'Charles River Associates',
  'optiverus': 'Optiver',
  'imc': 'IMC Trading',
  'guerrilla-games': 'Guerrilla Games',
  'ridedott': 'Ride Dott',
  'bluecrestcapitalmanagement': 'BlueCrest Capital Management',
  'yougov': 'YouGov',
  'monzo': 'Monzo',
  'sumup': 'SumUp',
  'adyen': 'Adyen',
  'n26': 'N26',
  'getyourguide': 'GetYourGuide',
  'hellofresh': 'HelloFresh',
  'coinbase': 'Coinbase',
  'asana': 'Asana',
  'figma': 'Figma',
  'gitlab': 'GitLab',
  'hashicorp': 'HashiCorp',
  'vercel': 'Vercel',
  'anthropic': 'Anthropic',
  'stripe': 'Stripe',
  'airbnb': 'Airbnb',
  'robinhood': 'Robinhood',
  'dropbox': 'Dropbox',
  'clickup': 'ClickUp',
  'webflow': 'Webflow',
  'airtable': 'Airtable',
  'calendly': 'Calendly',
  'brex': 'Brex',
  'retool': 'Retool'
};

function log(message, color = 'white') {
  const timestamp = new Date().toISOString();
  const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

/**
 * EARLY CAREER DETECTION - Consistent across all sources
 */
function isEarlyCareer(title, description = '', categories = []) {
  const text = `${title} ${description} ${categories.join(' ')}`.toLowerCase();
  
  // Must contain early-career indicators
  const earlyCareerPatterns = [
    /graduate/i,
    /new\s?grad/i,
    /entry[-\s]?level/i,
    /intern(ship)?/i,
    /apprentice/i,
    /early\s?career/i,
    /junior/i,
    /campus/i,
    /working\sstudent/i,
    /trainee/i,
    /associate/i
  ];
  
  // Must NOT contain senior-level indicators
  const seniorPatterns = [
    /senior/i,
    /staff/i,
    /principal/i,
    /lead/i,
    /manager/i,
    /director/i,
    /head/i,
    /vp/i,
    /chief/i,
    /executive/i
  ];
  
  const hasEarlyCareer = earlyCareerPatterns.some(pattern => pattern.test(text));
  const hasSenior = seniorPatterns.some(pattern => pattern.test(text));
  
  return hasEarlyCareer && !hasSenior;
}

/**
 * EUROPEAN LOCATION DETECTION - Consistent across all sources
 */
function isEuropeanLocation(location) {
  if (!location) return false;
  
  const locationLower = location.toLowerCase();
  
  // Reject remote jobs
  if (locationLower.includes('remote') || 
      locationLower.includes('work from home') ||
      locationLower.includes('anywhere')) {
    return false;
  }
  
  // European countries and cities
  const europeanLocations = [
    'uk', 'united kingdom', 'great britain', 'england', 'scotland', 'wales', 'northern ireland',
    'ireland', 'eire',
    'germany', 'deutschland',
    'france', 'french republic',
    'spain', 'espana', 'reino de espana',
    'portugal', 'republica portuguesa',
    'italy', 'italia', 'republica italiana',
    'netherlands', 'holland', 'nederland',
    'belgium', 'belgie', 'belgique',
    'luxembourg', 'letzebuerg',
    'denmark', 'danmark',
    'sweden', 'sverige',
    'norway', 'norge',
    'finland', 'suomi',
    'iceland', 'island',
    'poland', 'polska',
    'czech', 'czech republic', 'ceska republika',
    'austria', 'osterreich',
    'switzerland', 'schweiz', 'suisse',
    'hungary', 'magyarorszag',
    'greece', 'hellas',
    'romania', 'romania',
    'bulgaria', 'bulgaria',
    'croatia', 'hrvatska',
    'slovenia', 'slovenija',
    'slovakia', 'slovensko',
    'estonia', 'eesti',
    'latvia', 'latvija',
    'lithuania', 'lietuva',
    // Major cities
    'london', 'dublin', 'paris', 'berlin', 'munich', 'frankfurt', 'hamburg', 'cologne',
    'zurich', 'geneva', 'basel', 'amsterdam', 'rotterdam', 'eindhoven', 'utrecht',
    'stockholm', 'gothenburg', 'copenhagen', 'oslo', 'bergen', 'helsinki', 'tampere',
    'madrid', 'barcelona', 'valencia', 'seville', 'lisbon', 'porto', 'milan', 'rome',
    'naples', 'florence', 'athens', 'thessaloniki', 'warsaw', 'krakow', 'prague',
    'brno', 'vienna', 'salzburg', 'budapest', 'debrecen', 'bucharest', 'cluj',
    'tallinn', 'tartu', 'riga', 'daugavpils', 'vilnius', 'kaunas', 'brussels',
    'antwerp', 'luxembourg city', 'luxembourg ville'
  ];
  
  return europeanLocations.some(loc => locationLower.includes(loc));
}

/**
 * ADZUNA JOB NORMALIZER - Extract correct fields
 */
function normalizeAdzunaJob(rawJob, source = 'adzuna') {
  // Extract REAL company name (not platform name)
  const company = rawJob.company || 'Unknown Company';
  
  // Extract REAL location (not category)
  const location = rawJob.location || 'Unknown Location';
  
  // Extract REAL job title
  const title = rawJob.title || 'Unknown Title';
  
  // Extract REAL job description
  const description = rawJob.description || '';
  
  // Extract REAL job URL
  const jobUrl = rawJob.url || '';
  
  // Extract REAL posted date
  const postedAt = rawJob.posted_at || new Date().toISOString();
  
  // Generate proper job hash
  const jobHash = `adzuna:${title}:${company}:${location}`;
  
  // Check if early career
  const isEarly = isEarlyCareer(title, description);
  
  // Check if European location
  const isEuropean = isEuropeanLocation(location);
  
  // Only return if both conditions are met
  if (!isEarly || !isEuropean) {
    return null;
  }
  
  return {
    title,
    company,
    location,
    job_url: jobUrl,
    description,
    source,
    categories: ['early-career', 'graduate', 'european'],
    experience_required: 'entry-level',
    work_environment: 'on-site', // No remote
    job_hash: jobHash,
    posted_at: postedAt,
    scrape_timestamp: new Date().toISOString(),
    created_at: new Date().toISOString(),
    scraper_run_id: '00000000-0000-0000-0000-000000000000',
    status: 'active',
    last_seen_at: new Date().toISOString(),
    is_active: true,
    is_sent: false
  };
}

/**
 * REED JOB NORMALIZER - Extract correct fields
 */
function normalizeReedJob(rawJob, source = 'reed') {
  // Extract REAL company name (not platform name)
  const company = rawJob.company || 'Unknown Company';
  
  // Extract REAL location (not category)
  const location = rawJob.location || 'Unknown Location';
  
  // Extract REAL job title
  const title = rawJob.title || 'Unknown Title';
  
  // Extract REAL job description
  const description = rawJob.description || '';
  
  // Extract REAL job URL
  const jobUrl = rawJob.url || '';
  
  // Extract REAL posted date
  const postedAt = rawJob.posted_at || new Date().toISOString();
  
  // Generate proper job hash
  const jobHash = `reed:${title}:${company}:${location}`;
  
  // Check if early career
  const isEarly = isEarlyCareer(title, description);
  
  // Check if European location
  const isEuropean = isEuropeanLocation(location);
  
  // Only return if both conditions are met
  if (!isEarly || !isEuropean) {
    return null;
  }
  
  return {
    title,
    company,
    location,
    job_url: jobUrl,
    description,
    source,
    categories: ['early-career', 'graduate', 'european'],
    experience_required: 'entry-level',
    work_environment: 'on-site', // No remote
    job_hash: jobHash,
    posted_at: postedAt,
    scrape_timestamp: new Date().toISOString(),
    created_at: new Date().toISOString(),
    scraper_run_id: '00000000-0000-0000-0000-000000000000',
    status: 'active',
    last_seen_at: new Date().toISOString(),
    is_active: true,
    is_sent: false
  };
}

/**
 * Run Adzuna scraper and get jobs
 */
async function runAdzunaScraper() {
  log('🔍 Running Adzuna scraper...', 'blue');
  
  // Create a temporary TypeScript file to run the scraper and capture job data
  const testCode = `
import AdzunaScraper from '../scrapers/adzuna-scraper-standalone';

async function runAdzunaScraper() {
  try {
    const scraper = new AdzunaScraper();
    
    // Test single city first (London)
    const result = await scraper.scrapeSingleCity('London');
    
    // Output the jobs in a parseable format
    console.log('===ADZUNA_JOBS_START===');
    console.log(JSON.stringify(result.jobs, null, 2));
    console.log('===ADZUNA_JOBS_END===');
    
  } catch (error) {
    console.error('Adzuna scraper failed:', error);
    process.exit(1);
  }
}

runAdzunaScraper();
`;

  const testFile = path.join(__dirname, 'temp-adzuna-scraper.ts');
  fs.writeFileSync(testFile, testCode);
  
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['tsx', testFile], {
      stdio: 'pipe',
      cwd: path.join(__dirname, '..')
    });
    
    let output = '';
    let errorOutput = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
      process.stdout.write(data);
    });
    
    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
      process.stderr.write(data);
    });
    
    child.on('close', (code) => {
      // Clean up temp file
      try {
        fs.unlinkSync(testFile);
      } catch (e) {
        // Ignore cleanup errors
      }
      
      if (code === 0) {
        log('✅ Adzuna scraper completed successfully', 'green');
        resolve(output);
      } else {
        log(`❌ Adzuna scraper failed with code ${code}`, 'red');
        reject(new Error(`Adzuna scraper failed: ${errorOutput}`));
      }
    });
  });
}

/**
 * Run Reed scraper and get jobs
 */
async function runReedScraper() {
  log('🔍 Running Reed scraper...', 'blue');
  
  // Create a temporary TypeScript file to run the scraper and capture job data
  const testCode = `
import ReedScraper from '../scrapers/reed-scraper-standalone';

async function runReedScraper() {
  try {
    const scraper = new ReedScraper();
    
    // Check if it's business hours
    const status = scraper.getStatus();
    
    if (!status.businessHours) {
      // Use date range if outside business hours
      const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const toDate = new Date().toISOString().split('T')[0];
      
      const result = await scraper.scrapeLondonWithDateRange(fromDate, toDate);
      console.log('===REED_JOBS_START===');
      console.log(JSON.stringify(result.jobs, null, 2));
      console.log('===REED_JOBS_END===');
    } else {
      // Use normal scrape if during business hours
      const result = await scraper.scrapeLondon();
      console.log('===REED_JOBS_START===');
      console.log(JSON.stringify(result.jobs, null, 2));
      console.log('===REED_JOBS_END===');
    }
    
  } catch (error) {
    console.error('Reed scraper failed:', error);
    process.exit(1);
  }
}

runReedScraper();
`;

  const testFile = path.join(__dirname, 'temp-reed-scraper.ts');
  fs.writeFileSync(testFile, testCode);
  
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['tsx', testFile], {
      stdio: 'pipe',
      cwd: path.join(__dirname, '..')
    });
    
    let output = '';
    let errorOutput = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
      process.stdout.write(data);
    });
    
    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
      process.stderr.write(data);
    });
    
    child.on('close', (code) => {
      // Clean up temp file
      try {
        fs.unlinkSync(testFile);
      } catch (e) {
        // Ignore cleanup errors
      }
      
      if (code === 0) {
        log('✅ Reed scraper completed successfully', 'green');
        resolve(output);
      } else {
        log(`❌ Reed scraper failed with code ${code}`, 'red');
        reject(new Error(`Reed scraper failed: ${errorOutput}`));
      }
    });
  });
}

/**
 * Run Greenhouse scraper and get jobs
 */
async function runGreenhouseScraper() {
  log('🔍 Running Greenhouse scraper...', 'blue');
  
  // Create a temporary TypeScript file to run the scraper and capture job data
  const testCode = `
import { scrapeGreenhouseBoard } from '../scrapers/greenhouse';

const boards = [
  'flowtraders', 'squarepointcapital', 'jumptrading', 'twiliostudents', 'pinterest',
  'stepstone', 'charlesriverassociates', 'optiverus', 'imc', 'guerrilla-games',
  'ridedott', 'bluecrestcapitalmanagement', 'yougov', 'monzo', 'sumup', 'adyen',
  'n26', 'getyourguide', 'hellofresh', 'coinbase', 'asana', 'figma', 'gitlab',
  'hashicorp', 'vercel', 'anthropic', 'stripe', 'airbnb', 'robinhood', 'dropbox',
  'clickup', 'webflow', 'airtable', 'calendly', 'brex', 'retool'
];

async function runGreenhouseScraper() {
  try {
    let allJobs = [];
    
    for (const board of boards) {
      try {
        const jobs = await scrapeGreenhouseBoard(board, { 
          company: board, 
          euOnly: true, 
          earlyOnly: true 
        });
        
        // Add board info to each job for company mapping
        const jobsWithBoard = jobs.map(job => ({ ...job, board }));
        allJobs.push(...jobsWithBoard);
        
        console.log(\`✅ \${board}: Found \${jobs.length} early-career EU jobs\`);
        
        // Polite delay
        await new Promise(resolve => setTimeout(resolve, 400));
        
      } catch (e) {
        console.error(\`❌ \${board}: Failed to scrape: \${e.message}\`);
      }
    }
    
    // Output the jobs in a parseable format
    console.log('===GREENHOUSE_JOBS_START===');
    console.log(JSON.stringify(allJobs, null, 2));
    console.log('===GREENHOUSE_JOBS_END===');
    
  } catch (error) {
    console.error('Greenhouse scraper failed:', error);
    process.exit(1);
  }
}

runGreenhouseScraper();
`;

  const testFile = path.join(__dirname, 'temp-greenhouse-scraper.ts');
  fs.writeFileSync(testFile, testCode);
  
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['tsx', testFile], {
      stdio: 'pipe',
      cwd: path.join(__dirname, '..')
    });
    
    let output = '';
    let errorOutput = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
      process.stdout.write(data);
    });
    
    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
      process.stderr.write(data);
    });
    
    child.on('close', (code) => {
      // Clean up temp file
      try {
        fs.unlinkSync(testFile);
      } catch (e) {
        // Ignore cleanup errors
      }
      
      if (code === 0) {
        log('✅ Greenhouse scraper completed successfully', 'green');
        resolve(output);
      } else {
        log(`❌ Greenhouse scraper failed with code ${code}`, 'red');
        reject(new Error(`Greenhouse scraper failed: ${errorOutput}`));
      }
    });
  });
}

/**
 * Parse jobs from scraper output (for Adzuna and Reed)
 * Now properly parses the actual job data
 */
function parseScraperJobs(output, source) {
  log(`📋 Parsing ${source} scraper output...`, 'blue');
  
  try {
    // Look for the job data markers
    const startMarker = `===${source.toUpperCase()}_JOBS_START===`;
    const endMarker = `===${source.toUpperCase()}_JOBS_END===`;
    
    const startIndex = output.indexOf(startMarker);
    const endIndex = output.indexOf(endMarker);
    
    if (startIndex === -1 || endIndex === -1) {
      log(`⚠️ No job data markers found for ${source}`, 'yellow');
      return [];
    }
    
    // Extract the JSON data between markers
    const jsonData = output.substring(startIndex + startMarker.length, endIndex).trim();
    
    // Parse the JSON
    const jobs = JSON.parse(jsonData);
    
    log(`📊 Found ${jobs.length} raw jobs from ${source}`, 'cyan');
    
    // Normalize the jobs using the appropriate normalizer
    const normalizedJobs = [];
    
    for (const job of jobs) {
      let normalizedJob = null;
      
      if (source === 'adzuna') {
        normalizedJob = normalizeAdzunaJob(job, source);
      } else if (source === 'reed') {
        normalizedJob = normalizeReedJob(job, source);
      }
      
      if (normalizedJob) {
        normalizedJobs.push(normalizedJob);
      }
    }
    
    log(`📊 ${source}: ${jobs.length} raw → ${normalizedJobs.length} normalized jobs`, 'cyan');
    return normalizedJobs;
    
  } catch (error) {
    log(`❌ Error parsing ${source} jobs: ${error.message}`, 'red');
    return [];
  }
}

/**
 * Parse Greenhouse jobs from scraper output
 */
function parseGreenhouseJobs(output) {
  log('📋 Parsing Greenhouse scraper output...', 'blue');
  
  try {
    // Look for the job data markers
    const startMarker = '===GREENHOUSE_JOBS_START===';
    const endMarker = '===GREENHOUSE_JOBS_END===';
    
    const startIndex = output.indexOf(startMarker);
    const endIndex = output.indexOf(endMarker);
    
    if (startIndex === -1 || endIndex === -1) {
      log('⚠️ No Greenhouse job data markers found', 'yellow');
      return [];
    }
    
    // Extract the JSON data between markers
    const jsonData = output.substring(startIndex + startMarker.length, endIndex).trim();
    
    // Parse the JSON
    const jobs = JSON.parse(jsonData);
    
    log(`📊 Found ${jobs.length} raw Greenhouse jobs`, 'cyan');
    
    // Normalize the jobs using the Greenhouse normalizer
    const normalizedJobs = [];
    
    for (const job of jobs) {
      const board = job.board;
      const normalizedJob = normalizeGreenhouseJob(job, board, 'reed'); // Using 'reed' for DB constraint
      
      if (normalizedJob) {
        normalizedJobs.push(normalizedJob);
      }
    }
    
    log(`📊 Greenhouse: ${jobs.length} raw → ${normalizedJobs.length} normalized jobs`, 'cyan');
    return normalizedJobs;
    
  } catch (error) {
    log(`❌ Error parsing Greenhouse jobs: ${error.message}`, 'red');
    return [];
  }
}

/**
 * GREENHOUSE JOB NORMALIZER - Extract correct fields + map board to company
 */
function normalizeGreenhouseJob(rawJob, board, source = 'reed') { // Using 'reed' for DB constraint
  // Map board to REAL company name (Greenhouse doesn't provide company in job data)
  const company = GREENHOUSE_BOARD_TO_COMPANY[board] || board.charAt(0).toUpperCase() + board.slice(1);
  
  // Extract REAL location from location.name or offices
  let location = 'Unknown Location';
  if (rawJob.location?.name) {
    location = rawJob.location.name;
  } else if (rawJob.offices && rawJob.offices.length > 0) {
    location = rawJob.offices[0].name;
  }
  
  // Extract REAL job title
  const title = rawJob.title || 'Unknown Title';
  
  // Extract REAL job URL
  const jobUrl = rawJob.absolute_url || '';
  
  // Extract REAL posted date
  const postedAt = rawJob.updated_at || new Date().toISOString();
  
  // Generate proper job hash
  const jobHash = rawJob.job_hash || `greenhouse:${board}:${rawJob.id}`;
  
  // Check if early career (using Greenhouse's built-in function)
  const isEarly = rawJob.is_early_career || false;
  
  // Check if European location
  const isEuropean = isEuropeanLocation(location);
  
  // Only return if both conditions are met
  if (!isEarly || !isEuropean) {
    return null;
  }
  
  return {
    title,
    company,
    location,
    job_url: jobUrl,
    description: `Early-career position at ${company}`,
    source,
    categories: ['early-career', 'graduate', 'european'],
    experience_required: 'entry-level',
    work_environment: 'on-site', // No remote
    job_hash: jobHash,
    posted_at: postedAt,
    scrape_timestamp: new Date().toISOString(),
    created_at: new Date().toISOString(),
    scraper_run_id: '00000000-0000-0000-0000-000000000000',
    status: 'active',
    last_seen_at: new Date().toISOString(),
    is_active: true,
    is_sent: false
  };
}

/**
 * Save jobs to database
 */
async function saveJobs(jobs) {
  if (jobs.length === 0) {
    log('⚠️ No jobs to save', 'yellow');
    return { success: true, jobsAdded: 0 };
  }
  
  try {
    log(`💾 Saving ${jobs.length} normalized jobs to database...`, 'blue');
    
    const { data, error } = await supabase
      .from('jobs')
      .upsert(jobs, { 
        onConflict: 'job_hash',
        ignoreDuplicates: false 
      });
    
    if (error) {
      throw new Error(`Failed to save jobs: ${error.message}`);
    }
    
    log(`✅ Successfully saved ${jobs.length} jobs!`, 'green');
    return { success: true, jobsAdded: jobs.length };
    
  } catch (error) {
    log(`❌ Error saving jobs: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Main auto-save function
 */
async function runAutoSave() {
  try {
    log('🚀 INTEGRATED AUTO SAVE - WITH PROPER DATA NORMALIZATION!', 'magenta');
    
    // Test database connection
    log('🔍 Testing database connection...', 'blue');
    const { data, error } = await supabase
      .from('jobs')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    log('✅ Database connection verified', 'green');
    
    // Get initial count
    const { count: initialCount } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true });
    
    log(`📊 Initial database job count: ${initialCount || 0}`, 'cyan');
    
    let allJobs = [];
    
    // Run Adzuna scraper
    try {
      const adzunaOutput = await runAdzunaScraper();
      const adzunaJobs = parseScraperJobs(adzunaOutput, 'adzuna');
      allJobs.push(...adzunaJobs);
      log(`📊 Adzuna: ${adzunaJobs.length} normalized jobs`, 'green');
    } catch (e) {
      log(`❌ Adzuna failed: ${e.message}`, 'red');
    }
    
    // Run Reed scraper
    try {
      const reedOutput = await runReedScraper();
      const reedJobs = parseScraperJobs(reedOutput, 'reed');
      allJobs.push(...reedJobs);
      log(`📊 Reed: ${reedJobs.length} normalized jobs`, 'green');
    } catch (e) {
      log(`❌ Reed failed: ${e.message}`, 'red');
    }
    
    // Run Greenhouse scraper
    try {
      const greenhouseOutput = await runGreenhouseScraper();
      const greenhouseJobs = parseGreenhouseJobs(greenhouseOutput);
      allJobs.push(...greenhouseJobs);
      log(`📊 Greenhouse: ${greenhouseJobs.length} normalized jobs`, 'green');
    } catch (e) {
      log(`❌ Greenhouse failed: ${e.message}`, 'red');
    }
    
    // Final validation - ensure no remote jobs slipped through
    const finalJobs = allJobs.filter(job => {
      const locationLower = job.location.toLowerCase();
      return !locationLower.includes('remote') && 
             !locationLower.includes('work from home') &&
             !locationLower.includes('anywhere');
    });
    
    log(`📊 Total normalized jobs: ${allJobs.length}`, 'cyan');
    log(`📊 Final validated jobs (no remote): ${finalJobs.length}`, 'cyan');
    
    // Save jobs
    const result = await saveJobs(finalJobs);
    
    // Get final count
    const { count: finalCount } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true });
    
    const jobsAdded = (finalCount || 0) - (initialCount || 0);
    
    log('🎉 AUTO SAVE COMPLETED WITH PROPER NORMALIZATION!', 'green');
    log(`📊 Jobs processed: ${finalJobs.length}`, 'cyan');
    log(`📊 Database change: +${jobsAdded} jobs`, 'cyan');
    log(`📊 Final database job count: ${finalCount || 0}`, 'cyan');
    
    return { success: true, jobsAdded };
    
  } catch (error) {
    log(`❌ ERROR: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Run the auto-save every 10 minutes
 */
async function startAutoSave() {
  log('🚀 Starting Integrated Auto Save with Proper Normalization...', 'magenta');
  
  try {
    // Run first save immediately
    await runAutoSave();
    
    // Then run every 10 minutes
    const intervalMs = 10 * 60 * 1000; // 10 minutes
    log(`⏰ Will auto-save every ${intervalMs/1000} seconds`, 'blue');
    
    setInterval(async () => {
      try {
        log('🔄 Running scheduled auto-save...', 'blue');
        await runAutoSave();
      } catch (error) {
        log(`❌ Scheduled save failed: ${error.message}`, 'red');
      }
    }, intervalMs);
    
    log('✅ Integrated auto-save is now running! Press Ctrl+C to stop', 'green');
    
    // Keep running
    process.on('SIGINT', () => {
      log('\n🛑 Shutting down auto-save...', 'yellow');
      process.exit(0);
    });
    
  } catch (error) {
    log(`💥 Failed to start auto-save: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run it
startAutoSave();
