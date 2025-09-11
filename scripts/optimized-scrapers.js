#!/usr/bin/env node

/**
 * 🚀 OPTIMIZED SCRAPERS - Enhanced Job Discovery & Database Saving
 * 
 * This script runs optimized versions of all scrapers with:
 * - More diverse search terms
 * - Multiple EU locations
 * - Better early-career filtering
 * - Comprehensive job discovery
 * - ACTUAL DATABASE SAVING
 */

require('dotenv').config({ path: '.env.local' });
const https = require('https');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🚀 OPTIMIZED JobPing Scrapers - Maximum Job Discovery!');

// Enhanced search configurations
const OPTIMIZED_CONFIG = {
  adzuna: {
    queries: [
      // English terms
      'graduate scheme',
      'graduate program', 
      'junior analyst',
      'entry level',
      'trainee',
      'new graduate',
      'campus hire',
      'recent graduate',
      // German terms
      'praktikant',
      'trainee',
      'einsteiger',
      'absolvent',
      'junior',
      // French terms
      'stagiaire',
      'jeune diplome',
      'debutant',
      'junior',
      // Spanish terms
      'becario',
      'practicante',
      'junior',
      'recien graduado',
      // Italian terms
      'stagista',
      'junior',
      'neo laureato',
      // Dutch terms
      'stagiair',
      'junior',
      'starter'
    ],
    locations: [
      // Key UK Cities Only
      'London', 'Birmingham', 'Manchester', 'Belfast', 'Edinburgh', 'Glasgow'
    ]
  },
  reed: {
    queries: [
      // English terms
      'graduate trainee',
      'junior analyst', 
      'entry level',
      'new graduate',
      'campus hire',
      'recent graduate',
      'graduate scheme',
      'junior consultant',
      'trainee',
      'graduate program',
      // German terms
      'praktikant',
      'trainee',
      'einsteiger',
      'absolvent',
      'junior',
      // French terms
      'stagiaire',
      'jeune diplome',
      'debutant',
      'junior',
      // Spanish terms
      'becario',
      'practicante',
      'junior',
      'recien graduado',
      // Italian terms
      'stagista',
      'junior',
      'neo laureato',
      // Dutch terms
      'stagiair',
      'junior',
      'starter'
    ],
    locations: ['London', 'Manchester', 'Birmingham', 'Edinburgh', 'Dublin']
  },
  muse: {
    locations: [
      'Madrid, Spain',
      'Berlin, Germany', 
      'Amsterdam, Netherlands',
      'Paris, France',
      'Dublin, Ireland',
      'Stockholm, Sweden',
      'Copenhagen, Denmark',
      'Zurich, Switzerland',
      'Vienna, Austria',
      'Brussels, Belgium'
    ]
  }
};

// Results tracking
const results = {
  adzuna: { jobs: [], total: 0, earlyCareer: 0 },
  reed: { jobs: [], total: 0, earlyCareer: 0 },
  muse: { jobs: [], total: 0, earlyCareer: 0 },
  jsearch: { jobs: [], total: 0, earlyCareer: 0 },
  greenhouse: { jobs: [], total: 0, earlyCareer: 0 }
};

let completed = 0;
const totalScrapers = 5;
let totalJobsSaved = 0;

function checkComplete() {
  if (completed >= totalScrapers) {
    displayResults().catch(console.error);
  }
}

// Database saving functions
function normalizeJob(job, source = 'optimized') {
  const crypto = require('crypto');
  
  // Handle different job object structures
  const title = job.title || job.name || job.jobTitle || '';
  const company = (typeof job.company === 'object' && job.company?.name) ? job.company.name : (job.company || job.employerName || '');
  const location = (typeof job.location === 'object' && job.location?.name) ? job.location.name : 
                   (job.locations?.[0]?.name) ? job.locations[0].name :
                   (job.location || job.locationName || job.jobLocation || '');
  const description = job.description || job.contents || job.jobDescription || '';
  const url = job.url || job.job_apply_link || job.applyUrl || '';
  
  const hashString = `${title.toLowerCase().trim()}|${company.toLowerCase().trim()}|${location.toLowerCase().trim()}`;
  const jobHash = crypto.createHash('sha256').update(hashString).digest('hex');
  const text = `${title} ${description}`.toLowerCase();
  const isEarlyCareer = /(graduate|junior|trainee|entry.?level|intern|apprentice|fresh|new.?grad|praktikant|einsteiger|absolvent|stagiaire|jeune diplome|debutant|becario|practicante|recien graduado|stagista|neo laureato|stagiair|starter)/i.test(text) && 
                    !/(senior|lead|principal|manager|director|5\+.?years|7\+.?years|10\+.?years)/i.test(text);
  
  return {
    job_hash: jobHash,
    title: title.trim(),
    company: company.trim(),
    location: location.trim(),
    job_url: url.trim(),
    description: description.trim(),
    source: source,
    posted_at: job.posted_at || job.job_posted_at_datetime_utc || new Date().toISOString(),
    scrape_timestamp: new Date().toISOString(),
    created_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    is_active: true,
    is_sent: false,
    status: 'active',
    platform: 'ats',
    work_environment: 'on-site',
    categories: isEarlyCareer ? ['early-career'] : [],
    experience_required: isEarlyCareer ? 'entry-level' : 'experienced',
    language_requirements: [],
    company_profile_url: null,
    original_posted_date: job.posted_at || job.job_posted_at_datetime_utc || new Date().toISOString(),
    freshness_tier: null,
    scraper_run_id: null,
    job_hash_score: 100,
    ai_labels: [],
    work_location: 'on-site',
    city: null,
    country: null,
    company_name: null,
    dedupe_key: null,
    lang: null,
    lang_conf: null,
    is_graduate: isEarlyCareer,
    is_internship: /intern/i.test(title),
    region: '',
    board: null
  };
}

async function saveJobsToDatabase(jobs, source) {
  if (jobs.length === 0) return 0;
  
  try {
    const normalizedJobs = jobs.map(job => normalizeJob(job, source));
    
    // Deduplicate by job_hash within the batch
    const uniqueJobs = normalizedJobs.reduce((acc, job) => {
      if (!acc.find(existing => existing.job_hash === job.job_hash)) {
        acc.push(job);
      }
      return acc;
    }, []);
    
    console.log(`📊 ${source}: ${jobs.length} jobs → ${uniqueJobs.length} unique jobs`);
    
    // Batch upsert to database (one at a time to avoid conflicts)
    let savedCount = 0;
    for (const job of uniqueJobs) {
      try {
        const { error } = await supabase
          .from('jobs')
          .upsert([job], { onConflict: 'job_hash' });
        
        if (error) {
          console.log(`⚠️ Skipped duplicate ${source} job: ${job.title}`);
        } else {
          savedCount++;
        }
      } catch (jobError) {
        console.log(`⚠️ Error saving ${source} job: ${job.title}`);
      }
    }
    
    console.log(`💾 Saved ${savedCount}/${uniqueJobs.length} ${source} jobs to database`);
    return savedCount;
  } catch (error) {
    console.log(`❌ Failed to save ${source} jobs:`, error.message);
    return 0;
  }
}

async function displayResults() {
  console.log('\n' + '='.repeat(60));
  console.log('🎯 OPTIMIZED RESULTS - Maximum Job Discovery & Database Saving!');
  console.log('='.repeat(60));
  
  const totalEarlyCareer = results.adzuna.earlyCareer + results.reed.earlyCareer + 
                          results.muse.earlyCareer + results.jsearch.earlyCareer + 
                          results.greenhouse.earlyCareer;
  
  console.log(`📊 Total Early-Career Jobs Found: ${totalEarlyCareer}`);
  console.log(`   🏢 Adzuna: ${results.adzuna.earlyCareer} jobs`);
  console.log(`   🇬🇧 Reed: ${results.reed.earlyCareer} jobs`);
  console.log(`   🎭 Muse: ${results.muse.earlyCareer} jobs`);
  console.log(`   🔍 JSearch: ${results.jsearch.earlyCareer} jobs`);
  console.log(`   🏗️ Greenhouse: ${results.greenhouse.earlyCareer} jobs`);
  
  console.log(`\n💾 SAVING TO DATABASE:`);
  
  // Save all jobs to database
  const adzunaSaved = await saveJobsToDatabase(results.adzuna.jobs, 'adzuna');
  const reedSaved = await saveJobsToDatabase(results.reed.jobs, 'reed');
  const museSaved = await saveJobsToDatabase(results.muse.jobs, 'muse');
  const jsearchSaved = await saveJobsToDatabase(results.jsearch.jobs, 'jsearch');
  const greenhouseSaved = await saveJobsToDatabase(results.greenhouse.jobs, 'greenhouse');
  
  totalJobsSaved = adzunaSaved + reedSaved + museSaved + jsearchSaved + greenhouseSaved;
  
  console.log(`\n📊 TOTAL JOBS SAVED TO DATABASE: ${totalJobsSaved}`);
  console.log(`   🏢 Adzuna: ${adzunaSaved} jobs saved`);
  console.log(`   🇬🇧 Reed: ${reedSaved} jobs saved`);
  console.log(`   🎭 Muse: ${museSaved} jobs saved`);
  console.log(`   🔍 JSearch: ${jsearchSaved} jobs saved`);
  console.log(`   🏗️ Greenhouse: ${greenhouseSaved} jobs saved`);
  
  console.log('\n🎯 Sample Jobs by Source:');
  
  if (results.adzuna.jobs.length > 0) {
    console.log('\n🏢 Adzuna Jobs:');
    results.adzuna.jobs.slice(0, 3).forEach((job, i) => {
      console.log(`   ${i+1}. ${job.title} at ${job.company} (${job.location})`);
    });
  }
  
  if (results.reed.jobs.length > 0) {
    console.log('\n🇬🇧 Reed Jobs:');
    results.reed.jobs.slice(0, 3).forEach((job, i) => {
      console.log(`   ${i+1}. ${job.jobTitle} at ${job.employerName} (${job.locationName})`);
    });
  }
  
  if (results.muse.jobs.length > 0) {
    console.log('\n🎭 Muse Jobs:');
    results.muse.jobs.slice(0, 3).forEach((job, i) => {
      console.log(`   ${i+1}. ${job.name} at ${job.company?.name} (${job.locations?.[0]?.name})`);
    });
  }
  
  if (results.jsearch.jobs.length > 0) {
    console.log('\n🔍 JSearch Jobs:');
    results.jsearch.jobs.slice(0, 3).forEach((job, i) => {
      console.log(`   ${i+1}. ${job.job_title} at ${job.employer_name} (${job.job_location})`);
    });
  }
  
  if (results.greenhouse.jobs.length > 0) {
    console.log('\n🏗️ Greenhouse Jobs:');
    results.greenhouse.jobs.slice(0, 3).forEach((job, i) => {
      console.log(`   ${i+1}. ${job.title} at ${job.company?.name} (${job.location?.name})`);
    });
  }
  
  console.log('\n✅ All optimized scrapers completed successfully!');
}

// 1. OPTIMIZED ADZUNA SCRAPER
console.log('🔍 Running optimized Adzuna scraper...');
let adzunaJobs = [];
let adzunaEarlyCareer = 0;

async function runAdzunaOptimized() {
  for (const query of OPTIMIZED_CONFIG.adzuna.queries) {
    for (const location of OPTIMIZED_CONFIG.adzuna.locations) {
      try {
        const url = `https://api.adzuna.com/v1/api/jobs/gb/search/1?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_APP_KEY}&what=${encodeURIComponent(query)}&where=${encodeURIComponent(location)}&results_per_page=10`;
        
        const response = await new Promise((resolve, reject) => {
          https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
              try {
                resolve(JSON.parse(data));
              } catch (e) {
                reject(e);
              }
            });
          }).on('error', reject);
        });
        
        const jobs = response.results || [];
        const earlyCareerJobs = jobs.filter(job => {
          const text = `${job.title} ${job.description}`.toLowerCase();
          return text.includes('graduate') || text.includes('junior') || text.includes('entry') || text.includes('trainee') ||
                 text.includes('praktikant') || text.includes('einsteiger') || text.includes('absolvent') ||
                 text.includes('stagiaire') || text.includes('jeune diplome') || text.includes('debutant') ||
                 text.includes('becario') || text.includes('practicante') || text.includes('recien graduado') ||
                 text.includes('stagista') || text.includes('neo laureato') ||
                 text.includes('stagiair') || text.includes('starter');
        });
        
        adzunaJobs.push(...earlyCareerJobs);
        adzunaEarlyCareer += earlyCareerJobs.length;
        
        console.log(`   ${query} in ${location}: ${jobs.length} total, ${earlyCareerJobs.length} early-career`);
        
      } catch (error) {
        console.log(`   ${query} in ${location}: Error - ${error.message}`);
      }
    }
  }
  
  results.adzuna.jobs = adzunaJobs;
  results.adzuna.total = adzunaJobs.length;
  results.adzuna.earlyCareer = adzunaEarlyCareer;
  
  console.log(`✅ Adzuna: ${adzunaJobs.length} total jobs, ${adzunaEarlyCareer} early-career`);
  completed++;
  checkComplete();
}

// 2. OPTIMIZED REED SCRAPER
console.log('🔍 Running optimized Reed scraper...');
let reedJobs = [];
let reedEarlyCareer = 0;

async function runReedOptimized() {
  for (const query of OPTIMIZED_CONFIG.reed.queries) {
    for (const location of OPTIMIZED_CONFIG.reed.locations) {
      try {
        const url = `https://www.reed.co.uk/api/1.0/search?keywords=${encodeURIComponent(query)}&locationName=${encodeURIComponent(location)}&resultsToTake=5`;
        
        const response = await new Promise((resolve, reject) => {
          https.get(url, {
            headers: {
              'Authorization': `Basic ${Buffer.from(process.env.REED_API_KEY + ':').toString('base64')}`,
              'User-Agent': 'JobPing/1.0',
              'Accept': 'application/json'
            }
          }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
              try {
                resolve(JSON.parse(data));
              } catch (e) {
                reject(e);
              }
            });
          }).on('error', reject);
        });
        
        const jobs = response.results || [];
        const earlyCareerJobs = jobs.filter(job => {
          const text = `${job.jobTitle} ${job.jobDescription}`.toLowerCase();
          return text.includes('graduate') || text.includes('junior') || text.includes('entry') || text.includes('trainee') ||
                 text.includes('praktikant') || text.includes('einsteiger') || text.includes('absolvent') ||
                 text.includes('stagiaire') || text.includes('jeune diplome') || text.includes('debutant') ||
                 text.includes('becario') || text.includes('practicante') || text.includes('recien graduado') ||
                 text.includes('stagista') || text.includes('neo laureato') ||
                 text.includes('stagiair') || text.includes('starter');
        });
        
        reedJobs.push(...earlyCareerJobs);
        reedEarlyCareer += earlyCareerJobs.length;
        
        console.log(`   ${query} in ${location}: ${jobs.length} total, ${earlyCareerJobs.length} early-career`);
        
      } catch (error) {
        console.log(`   ${query} in ${location}: Error - ${error.message}`);
      }
    }
  }
  
  results.reed.jobs = reedJobs;
  results.reed.total = reedJobs.length;
  results.reed.earlyCareer = reedEarlyCareer;
  
  console.log(`✅ Reed: ${reedJobs.length} total jobs, ${reedEarlyCareer} early-career`);
  completed++;
  checkComplete();
}

// 3. OPTIMIZED MUSE SCRAPER
console.log('🔍 Running optimized Muse scraper...');
let museJobs = [];
let museEarlyCareer = 0;

async function runMuseOptimized() {
  for (const location of OPTIMIZED_CONFIG.muse.locations) {
    try {
      const url = `https://www.themuse.com/api/public/jobs?location=${encodeURIComponent(location)}&page=1`;
      
      const response = await new Promise((resolve, reject) => {
        https.get(url, {
          headers: {
            'User-Agent': 'JobPing/1.0',
            'Accept': 'application/json'
          }
        }, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          });
        }).on('error', reject);
      });
      
      const jobs = response.results || [];
      const earlyCareerJobs = jobs.filter(job => {
        const text = `${job.name} ${job.contents}`.toLowerCase();
        const isEarlyCareer = text.includes('graduate') || text.includes('junior') || text.includes('entry') || text.includes('trainee') ||
                              text.includes('praktikant') || text.includes('einsteiger') || text.includes('absolvent') ||
                              text.includes('stagiaire') || text.includes('jeune diplome') || text.includes('debutant') ||
                              text.includes('becario') || text.includes('practicante') || text.includes('recien graduado') ||
                              text.includes('stagista') || text.includes('neo laureato') ||
                              text.includes('stagiair') || text.includes('starter');
        
        const jobLocation = job.locations?.[0]?.name?.toLowerCase() || '';
        const isEU = jobLocation.includes('spain') || jobLocation.includes('germany') || jobLocation.includes('netherlands') || 
                    jobLocation.includes('france') || jobLocation.includes('ireland') || jobLocation.includes('sweden') ||
                    jobLocation.includes('denmark') || jobLocation.includes('switzerland') || jobLocation.includes('austria') ||
                    jobLocation.includes('belgium') || jobLocation.includes('madrid') || jobLocation.includes('berlin') ||
                    jobLocation.includes('amsterdam') || jobLocation.includes('paris') || jobLocation.includes('dublin') ||
                    jobLocation.includes('stockholm') || jobLocation.includes('copenhagen') || jobLocation.includes('zurich') ||
                    jobLocation.includes('vienna') || jobLocation.includes('brussels');
        
        return isEarlyCareer && isEU;
      });
      
      museJobs.push(...earlyCareerJobs);
      museEarlyCareer += earlyCareerJobs.length;
      
      console.log(`   ${location}: ${jobs.length} total, ${earlyCareerJobs.length} early-career`);
      
    } catch (error) {
      console.log(`   ${location}: Error - ${error.message}`);
    }
  }
  
  results.muse.jobs = museJobs;
  results.muse.total = museJobs.length;
  results.muse.earlyCareer = museEarlyCareer;
  
  console.log(`✅ Muse: ${museJobs.length} total jobs, ${museEarlyCareer} early-career`);
  completed++;
  checkComplete();
}

// 4. JSEARCH SCRAPER (keeping existing)
console.log('🔍 Running JSearch scraper...');
const rapidApiKey = process.env.RAPIDAPI_KEY;

if (rapidApiKey) {
  const jsearchUrl = 'https://jsearch.p.rapidapi.com/search?query=graduate%20program%20OR%20graduate%20trainee%20OR%20junior%20analyst&page=1&num_pages=1&date_posted=week';
  
  https.get(jsearchUrl, {
    headers: {
      'X-RapidAPI-Key': rapidApiKey,
      'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
      'User-Agent': 'JobPing/1.0',
      'Accept': 'application/json'
    }
  }, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        const jobs = result.data || [];
        const earlyCareerJobs = jobs.filter(job => {
          const text = `${job.job_title} ${job.job_description}`.toLowerCase();
          const isEarlyCareer = text.includes('graduate') || text.includes('junior') || text.includes('entry') || text.includes('trainee');
          
          const location = job.job_location?.toLowerCase() || '';
          const isEU = location.includes('germany') || location.includes('france') || location.includes('spain') || 
                      location.includes('italy') || location.includes('netherlands') || location.includes('united kingdom') ||
                      location.includes('ireland') || location.includes('sweden') || location.includes('denmark') ||
                      location.includes('norway') || location.includes('finland') || location.includes('switzerland') ||
                      location.includes('austria') || location.includes('belgium') || location.includes('poland') ||
                      location.includes('czech') || location.includes('hungary') || location.includes('portugal') ||
                      location.includes('greece') || location.includes('romania') || location.includes('bulgaria') ||
                      location.includes('berlin') || location.includes('paris') || location.includes('madrid') ||
                      location.includes('rome') || location.includes('amsterdam') || location.includes('london') ||
                      location.includes('dublin') || location.includes('stockholm') || location.includes('copenhagen') ||
                      location.includes('oslo') || location.includes('helsinki') || location.includes('zurich') ||
                      location.includes('vienna') || location.includes('brussels') || location.includes('warsaw') ||
                      location.includes('prague') || location.includes('budapest') || location.includes('lisbon') ||
                      location.includes('athens') || location.includes('bucharest') || location.includes('sofia');
          
          return isEarlyCareer && isEU;
        });
        
        results.jsearch.jobs = earlyCareerJobs;
        results.jsearch.total = jobs.length;
        results.jsearch.earlyCareer = earlyCareerJobs.length;
        
        console.log(`✅ JSearch: ${jobs.length} total jobs, ${earlyCareerJobs.length} early-career`);
        completed++;
        checkComplete();
      } catch (error) {
        console.log('❌ JSearch failed to parse response');
        results.jsearch.jobs = [];
        results.jsearch.total = 0;
        results.jsearch.earlyCareer = 0;
        completed++;
        checkComplete();
      }
    });
  }).on('error', (error) => {
    console.log('❌ JSearch request failed');
    results.jsearch.jobs = [];
    results.jsearch.total = 0;
    results.jsearch.earlyCareer = 0;
    completed++;
    checkComplete();
  });
} else {
  console.log('⚠️ RapidAPI key not found, skipping JSearch');
  results.jsearch.jobs = [];
  results.jsearch.total = 0;
  results.jsearch.earlyCareer = 0;
  completed++;
  checkComplete();
}

// 5. GREENHOUSE SCRAPER (keeping existing)
console.log('🔍 Running Greenhouse scraper...');
const greenhouseApiKey = process.env.GREENHOUSE_API_KEY;

if (greenhouseApiKey) {
  const greenhouseUrl = 'https://boards-api.greenhouse.io/v1/boards/celonis/jobs';
  
  https.get(greenhouseUrl, {
    headers: {
      'User-Agent': 'JobPing/1.0',
      'Accept': 'application/json'
    }
  }, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        const jobs = result.jobs || [];
        const earlyCareerJobs = jobs.filter(job => {
          const text = `${job.title} ${job.content}`.toLowerCase();
          return text.includes('graduate') || text.includes('junior') || text.includes('entry') || text.includes('trainee');
        });
        
        results.greenhouse.jobs = earlyCareerJobs;
        results.greenhouse.total = jobs.length;
        results.greenhouse.earlyCareer = earlyCareerJobs.length;
        
        console.log(`✅ Greenhouse: ${jobs.length} total jobs, ${earlyCareerJobs.length} early-career`);
        completed++;
        checkComplete();
      } catch (error) {
        console.log('❌ Greenhouse failed to parse response');
        results.greenhouse.jobs = [];
        results.greenhouse.total = 0;
        results.greenhouse.earlyCareer = 0;
        completed++;
        checkComplete();
      }
    });
  }).on('error', (error) => {
    console.log('❌ Greenhouse request failed');
    results.greenhouse.jobs = [];
    results.greenhouse.total = 0;
    results.greenhouse.earlyCareer = 0;
    completed++;
    checkComplete();
  });
} else {
  console.log('⚠️ Greenhouse API key not found, skipping');
  results.greenhouse.jobs = [];
  results.greenhouse.total = 0;
  results.greenhouse.earlyCareer = 0;
  completed++;
  checkComplete();
}

// Run all optimized scrapers
runAdzunaOptimized();
runReedOptimized();
runMuseOptimized();
