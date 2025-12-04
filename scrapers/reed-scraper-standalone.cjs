"use strict";
// Reed.co.uk Scraper (API v1.0) - UK and Ireland early-career focus
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { classifyEarlyCareer, makeJobHash, CAREER_PATH_KEYWORDS } = require('./shared/helpers.cjs');
const { recordScraperRun } = require('./shared/telemetry.cjs');

// Parse location to extract city and country
function parseLocation(location) {
  if (!location) return { city: '', country: '', isRemote: false };
  const loc = location.toLowerCase().trim();
  
  // Check for remote indicators
  const isRemote = /remote|work\s+from\s+home|wfh|anywhere/i.test(loc);
  if (isRemote) return { city: '', country: '', isRemote: true };
  
  // Known UK/Ireland cities (Reed is UK/Ireland only)
  const ukIrelandCities = new Set([
    'london', 'manchester', 'birmingham', 'belfast', 'dublin',
    'edinburgh', 'glasgow', 'leeds', 'liverpool', 'cork', 'galway'
  ]);
  
  // Extract city and country using comma separation
  const parts = loc.split(',').map(p => p.trim()).filter(Boolean);
  let city = parts.length > 0 ? parts[0] : loc;
  let country = parts.length > 1 ? parts[parts.length - 1] : '';
  
  // Clean up city name - remove common suffixes like "ENG", "GB", "IE", etc.
  city = city.replace(/\s+(eng|gb|ie|uk|northern\s+ireland|republic\s+of\s+ireland)$/i, '');
  
  // Normalize country codes
  if (country) {
    const countryMap = {
      'united kingdom': 'United Kingdom',
      'uk': 'United Kingdom',
      'gb': 'United Kingdom',
      'great britain': 'United Kingdom',
      'england': 'United Kingdom',
      'scotland': 'United Kingdom',
      'wales': 'United Kingdom',
      'northern ireland': 'United Kingdom',
      'ireland': 'Ireland',
      'ie': 'Ireland',
      'republic of ireland': 'Ireland'
    };
    const normalizedCountry = country.toLowerCase();
    country = countryMap[normalizedCountry] || country;
  }
  
  // If single part and it's a known city, infer country
  if (parts.length === 1 && ukIrelandCities.has(city)) {
    // Infer country from city
    if (['dublin', 'cork', 'galway'].includes(city)) {
      country = 'Ireland';
    } else {
      country = 'United Kingdom';
    }
  }
  
  // Capitalize city name properly
  city = city.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  
  return { city, country, isRemote: false };
}

// Classify job as internship, graduate, or entry-level
function classifyJobType(job) {
  const title = (job.title || '').toLowerCase();
  const description = (job.description || '').toLowerCase();
  const text = `${title} ${description}`;
  
  // Internship indicators (multilingual)
  const internshipTerms = [
    'intern', 'internship', 'stage', 'praktikum', 'prácticas', 'tirocinio',
    'stagiaire', 'stagiar', 'becario', 'werkstudent', 'placement',
    'summer intern', 'winter intern', 'co-op', 'coop'
  ];
  
  // Graduate program indicators
  const graduateTerms = [
    'graduate', 'grad scheme', 'grad program', 'graduate programme',
    'graduate program', 'graduate scheme', 'graduate trainee',
    'management trainee', 'trainee program', 'trainee programme',
    'rotational program', 'rotational programme', 'campus hire',
    'new grad', 'recent graduate'
  ];
  
  // Check for internship first (more specific)
  const isInternship = internshipTerms.some(term => 
    title.includes(term) || description.includes(term)
  );
  
  // Check for graduate program
  const isGraduate = !isInternship && graduateTerms.some(term => 
    title.includes(term) || description.includes(term)
  );
  
  return { isInternship, isGraduate };
}

// Detect work environment from location and description
function detectWorkEnvironment(job) {
  const location = (job.location || '').toLowerCase();
  const description = (job.description || '').toLowerCase();
  const text = `${location} ${description}`;
  
  // Remote indicators (strongest signal)
  if (/remote|work\s+from\s+home|wfh|anywhere|fully\s+remote|100%\s+remote/i.test(text)) {
    return 'remote';
  }
  
  // Hybrid indicators
  if (/hybrid|flexible|partially\s+remote|2-3\s+days|3\s+days\s+remote|mix\s+of\s+remote/i.test(text)) {
    return 'hybrid';
  }
  
  // Default to on-site
  return 'on-site';
}

// Extract language requirements from description
function extractLanguageRequirements(description) {
  if (!description) return [];
  const desc = description.toLowerCase();
  const languages = [];
  
  // Common language patterns
  const languagePatterns = [
    { pattern: /\b(english|anglais)\b/i, lang: 'English' },
    { pattern: /\b(french|français|francais)\b/i, lang: 'French' },
    { pattern: /\b(german|deutsch)\b/i, lang: 'German' },
    { pattern: /\b(spanish|español|espanol)\b/i, lang: 'Spanish' },
    { pattern: /\b(italian|italiano)\b/i, lang: 'Italian' },
    { pattern: /\b(dutch|nederlands)\b/i, lang: 'Dutch' },
  ];
  
  for (const { pattern, lang } of languagePatterns) {
    if (pattern.test(desc) && !languages.includes(lang)) {
      languages.push(lang);
    }
  }
  
  return languages;
}

function convertToDatabaseFormat(job) {
  const nowIso = new Date().toISOString();
  const { city, country } = parseLocation(job.location || '');
  const { isInternship, isGraduate } = classifyJobType(job);
  const job_hash = makeJobHash(job);
  
  // Normalize date to ISO (Reed often returns DD/MM/YYYY or ISO format)
  const normalizeDate = (d) => {
    if (!d) return nowIso;
    if (typeof d === 'string' && /\d{2}\/\d{2}\/\d{4}/.test(d)) {
      // DD/MM/YYYY format
      const [dd, mm, yyyy] = d.split('/');
      const iso = new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`).toISOString();
      return iso;
    }
    try { 
      const date = new Date(d);
      if (isNaN(date.getTime())) return nowIso;
      return date.toISOString();
    } catch { 
      return nowIso;
    }
  };
  
  const postedAt = normalizeDate(job.posted_at);
  
  // Build categories array
  const categories = ['early-career'];
  if (isInternship) {
    categories.push('internship');
  }
  
  // Clean company name - remove extra whitespace
  const companyName = (job.company || '').trim().replace(/\s+/g, ' ');
  
  // Extract metadata
  const workEnv = detectWorkEnvironment(job);
  const languages = extractLanguageRequirements(job.description || '');
  
  // Mutually exclusive categorization: internship OR graduate OR early-career
  // Maps to form options: "Internship", "Graduate Programmes", "Entry Level"
  const isEarlyCareer = !isInternship && !isGraduate; // Entry-level roles
  
  return {
    job_hash,
    title: (job.title || '').trim(),
    company: companyName,
    location: (job.location || '').trim(),
    city: city, // Extract city from location
    country: country, // Extract country from location
    description: (job.description || '').trim(),
    job_url: (job.url || '').trim(),
    source: (job.source || 'reed').trim(),
    posted_at: postedAt,
    categories: categories, // Array with 'early-career' and optionally 'internship'
    work_environment: workEnv, // 'remote', 'hybrid', or 'on-site'
    experience_required: isInternship ? 'internship' : (isGraduate ? 'graduate' : 'entry-level'),
    is_internship: isInternship, // Maps to form: "Internship"
    is_graduate: isGraduate, // Maps to form: "Graduate Programmes"
    is_early_career: isEarlyCareer, // Maps to form: "Entry Level" (mutually exclusive)
    language_requirements: languages.length > 0 ? languages : null,
    original_posted_date: postedAt,
    last_seen_at: nowIso,
    is_active: true,
    created_at: nowIso
  };
}

const REED_API = 'https://www.reed.co.uk/api/1.0/search';

// Reed.co.uk supports UK and Ireland
// UK cities: London, Manchester, Birmingham, Belfast (Belfast is in Northern Ireland, part of UK)
// Ireland cities: Dublin (Republic of Ireland, NOT part of UK)
const UK_CITIES = ['London', 'Manchester', 'Birmingham', 'Belfast'];
const IRELAND_CITIES = ['Dublin'];
const SUPPORTED_CITIES = [...UK_CITIES, ...IRELAND_CITIES];
const DEFAULT_LOCATIONS = ['London', 'Manchester', 'Birmingham', 'Belfast', 'Dublin'];

function parseTargetCities() {
  const raw = process.env.TARGET_CITIES;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((city) => (typeof city === 'string' ? city.trim() : ''))
        .filter(Boolean);
    }
    return [];
  } catch (error) {
    console.warn('⚠️  Reed TARGET_CITIES parse failed:', error.message);
    return [];
  }
}

// Filter TARGET_CITIES to only Reed-supported cities (UK + Ireland)
function filterReedSupportedCities(cities) {
  return cities.filter(city => SUPPORTED_CITIES.includes(city));
}

const TARGET_CITIES = parseTargetCities();
const REED_SUPPORTED_CITIES = TARGET_CITIES.length ? filterReedSupportedCities(TARGET_CITIES) : [];
const LOCATIONS = REED_SUPPORTED_CITIES.length ? REED_SUPPORTED_CITIES : DEFAULT_LOCATIONS;

if (TARGET_CITIES.length && REED_SUPPORTED_CITIES.length < TARGET_CITIES.length) {
  const filtered = TARGET_CITIES.filter(c => !SUPPORTED_CITIES.includes(c));
  console.log(`⚠️  Reed: Filtered out ${filtered.length} unsupported cities: ${filtered.join(', ')}`);
  const ukCities = REED_SUPPORTED_CITIES.filter(c => UK_CITIES.includes(c));
  const irelandCities = REED_SUPPORTED_CITIES.filter(c => IRELAND_CITIES.includes(c));
  if (ukCities.length) console.log(`🇬🇧 Reed: UK cities: ${ukCities.join(', ')}`);
  if (irelandCities.length) console.log(`🇮🇪 Reed: Ireland cities: ${irelandCities.join(', ')}`);
}

if (TARGET_CITIES.length) {
  console.log('🎯 Reed target cities from signup data:', TARGET_CITIES.join(', '));
}

const RESULTS_PER_PAGE = parseInt(process.env.REED_RESULTS_PER_PAGE || '50', 10);
const PAGE_DELAY_MS = parseInt(process.env.REED_PAGE_DELAY_MS || '400', 10);
const PAGE_DELAY_JITTER_MS = parseInt(process.env.REED_PAGE_DELAY_JITTER_MS || '0', 10);
const BACKOFF_DELAY_MS = parseInt(process.env.REED_BACKOFF_DELAY_MS || '6000', 10);
// Import role definitions from signup form FIRST
const { getAllRoles, getEarlyCareerRoles, getTopRolesByCareerPath, cleanRoleForSearch } = require('./shared/roles.cjs');

/**
 * Generate comprehensive query list covering ALL roles from signup form
 * Since Reed has no API limit, we can be generous with queries
 */
function generateReedQueries() {
  const queries = [];
  
  // 🥇 TIER 1: ALL exact role names from signup form (HIGHEST PRIORITY)
  // Get ALL roles, not just top 10-20
  const allRoles = getAllRoles(); // All roles across all career paths
  const earlyCareerRoles = getEarlyCareerRoles(); // Roles with intern/graduate/junior keywords
  const topRolesByPath = getTopRolesByCareerPath(5); // Top 5 roles per career path
  
  // Combine: early-career roles first, then all roles, then top roles by path
  const prioritizedRoles = [
    ...earlyCareerRoles, // All early-career roles (intern/graduate/junior)
    ...allRoles, // All roles from signup form
    ...Object.values(topRolesByPath).flat() // Top roles per career path
  ];
  
  // Clean role names and get primary version (without parentheses)
  // e.g., "Sales Development Representative (SDR)" -> "Sales Development Representative"
  const cleanedRoles = prioritizedRoles.map(role => {
    const cleaned = cleanRoleForSearch(role);
    return cleaned[0]; // Use primary cleaned version
  });
  
  // Remove duplicates and add ALL unique role names
  const uniqueRoleTerms = [...new Set(cleanedRoles)];
  queries.push(...uniqueRoleTerms); // Add ALL roles (no limit since no API limit)
  
  // 🥈 TIER 2: Generic early-career terms (fallback for broader coverage)
  const GENERIC_EARLY_TERMS = [
    'graduate',
    'graduate programme',
    'graduate scheme',
    'entry level',
    'junior',
    'trainee',
    'intern',
    'internship',
    'graduate trainee',
    'management trainee'
  ];
  queries.push(...GENERIC_EARLY_TERMS);
  
  // Remove duplicates and return
  return [...new Set(queries)];
}

const EARLY_TERMS = generateReedQueries();

// Since Reed has no API limit, use all queries (or allow override)
const MAX_QUERIES_PER_LOCATION = parseInt(process.env.REED_MAX_QUERIES_PER_LOCATION || `${EARLY_TERMS.length}`, 10);
const INCLUDE_REMOTE = String(process.env.INCLUDE_REMOTE || '').toLowerCase() === 'true';
const scriptStart = Date.now();
let scrapeErrors = 0;

console.log(`📋 Reed query strategy: ${EARLY_TERMS.length} total queries (${EARLY_TERMS.filter((_, i) => i < 20).length} role-based + ${EARLY_TERMS.length - EARLY_TERMS.filter((_, i) => i < 20).length} generic)`);
console.log(`🎯 Covering ALL roles from signup form (no API limit, comprehensive coverage)`);

function parseTargetCareerPaths() {
  const raw = process.env.TARGET_CAREER_PATHS;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter(Boolean);
    }
    return [];
  } catch (error) {
    console.warn('⚠️  Reed TARGET_CAREER_PATHS parse failed:', error.message);
    return [];
  }
}

const TARGET_CAREER_PATHS = parseTargetCareerPaths();
if (TARGET_CAREER_PATHS.length) {
  console.log('🎯 Reed target career paths:', TARGET_CAREER_PATHS.join(', '));
}

/**
 * Determine max pages based on query type (smart pagination)
 * Role-based queries get more pages (more targeted, better results)
 * Generic queries get fewer pages (broader, less targeted)
 * Since Reed has no API limit, we can be generous
 */
function getMaxPagesForQuery(query) {
  // Role-based queries (exact role names) - use more pages
  const roleBasedPattern = /(analyst|consultant|intern|associate|manager|engineer|specialist|coordinator|representative|executive|trainee|assistant)/i;
  const isRoleBased = roleBasedPattern.test(query) && query.length > 8; // Longer queries are usually role names
  
  // Generic queries (internship, graduate, junior) - use fewer pages
  const genericPattern = /^(internship|graduate|junior|entry level|trainee|intern)$/i;
  const isGeneric = genericPattern.test(query.trim());
  
  if (isRoleBased) {
    return parseInt(process.env.REED_MAX_PAGES_ROLE || '15', 10); // More pages for roles (no API limit)
  } else if (isGeneric) {
    return parseInt(process.env.REED_MAX_PAGES_GENERIC || '10', 10); // Fewer pages for generic
  }
  return parseInt(process.env.REED_MAX_PAGES || '12', 10); // Default
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function buildAuthHeader() {
  const key = process.env.REED_API_KEY || '';
  const token = Buffer.from(`${key}:`).toString('base64');
  return `Basic ${token}`;
}

async function fetchReedPage(params) {
  console.log(`   ↪ fetching page:`, { kw: params.keywords, loc: params.locationName, skip: params.resultsToSkip });
  const headers = {
    'Authorization': buildAuthHeader(),
    'Accept': 'application/json',
    'User-Agent': 'JobPingBot/1.0 (+https://getjobping.com/bot; contact: support@getjobping.com)'
  };
  const resp = await axios.get(REED_API, { params, headers, timeout: 20000 });
  const len = Array.isArray(resp.data?.results) ? resp.data.results.length : 0;
  console.log(`   ← got ${len} results`);
  return resp.data;
}

function toIngestJob(reedJob) {
  return {
    title: reedJob.jobTitle || '',
    company: reedJob.employerName || '',
    location: reedJob.locationName || '',
    description: reedJob.jobDescription || '',
    url: reedJob.jobUrl || '',
    posted_at: reedJob.date || new Date().toISOString(),
    source: 'reed'
  };
}

async function scrapeLocation(location) {
  const jobs = [];
  const resultsPerPage = RESULTS_PER_PAGE;
  const termsToUse = MAX_QUERIES_PER_LOCATION > 0 ? EARLY_TERMS.slice(0, MAX_QUERIES_PER_LOCATION) : EARLY_TERMS;
  
  console.log(`   🔍 Using ${termsToUse.length} queries for ${location} (${termsToUse.filter((_, i) => i < 20).length} role-based)`);
  
  for (const term of termsToUse) {
    // Smart pagination: more pages for role-based queries
    const queryMaxPages = getMaxPagesForQuery(term);
    let page = 0;
    
    while (page < queryMaxPages) {
      const params = {
        keywords: term,
        locationName: location,
        resultsToTake: resultsPerPage,
        resultsToSkip: page * resultsPerPage,
        distanceFromLocation: 15,
        permanent: true,
        contract: true,
        partTime: true,
        fullTime: true,
        minimumSalary: 0,
        maximumSalary: 0,
        postedByRecruitmentAgency: true,
        postedByDirectEmployer: true,
        graduate: true, // Use Reed's graduate filter to focus on early-career roles
      };
      try {
        const data = await fetchReedPage(params);
        const items = Array.isArray(data.results) ? data.results : [];
        if (!items.length) break;
        for (const r of items) {
          const j = toIngestJob(r);
          const { isRemote, country } = parseLocation(j.location);
          // Filter out remote jobs if not included
          if (isRemote && !INCLUDE_REMOTE) continue;
          // Reed is UK/Ireland only - filter out non-UK/Ireland locations
          const locationLower = j.location.toLowerCase();
          const isUKIreland = country === 'United Kingdom' || country === 'Ireland' || 
                             locationLower.includes('london') || locationLower.includes('manchester') ||
                             locationLower.includes('birmingham') || locationLower.includes('belfast') ||
                             locationLower.includes('dublin') || locationLower.includes('uk') ||
                             locationLower.includes('ireland') || locationLower.includes('england');
          if (!isUKIreland) continue;
          // Filter for early-career roles
          if (!(classifyEarlyCareer(j) || EARLY_TERMS.some(t => j.title.toLowerCase().includes(t)))) continue;
          if (TARGET_CAREER_PATHS.length) {
            const text = `${j.title || ''} ${j.description || ''}`.toLowerCase();
            const matchesCareerPath = TARGET_CAREER_PATHS.some((path) => {
              const keywords = CAREER_PATH_KEYWORDS[path] || [];
              if (!keywords.length) return true;
              return keywords.some((keyword) => text.includes(keyword));
            });
            if (!matchesCareerPath) continue;
          }
          const valid = j.title && j.company && j.location && j.description && j.url;
          if (valid) jobs.push(j);
        }
        console.log(`   ✓ accumulated ${jobs.length} valid jobs so far for ${location}`);
        const jitter = PAGE_DELAY_JITTER_MS > 0 ? Math.floor(Math.random() * PAGE_DELAY_JITTER_MS) : 0;
        const delayMs = Math.max(0, PAGE_DELAY_MS + jitter);
        if (delayMs > 0) {
          await sleep(delayMs);
        }
        // Stop paginating if fewer than a full page returned
        if (items.length < resultsPerPage) break;
        page++;
      } catch (e) {
        scrapeErrors += 1;
        if (e.response && e.response.status === 429) {
          await sleep(BACKOFF_DELAY_MS);
          page--;
          continue;
        }
        console.warn(`Reed error for ${location} ${term}:`, e.message);
        break;
      }
    }
  }
  return jobs;
}

async function saveJobsToDB(jobs) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  const supabase = createClient(url, key);
  
  const dbJobs = jobs.map(convertToDatabaseFormat);
  
  // Validate jobs before saving
  const validatedRows = dbJobs.filter(row => {
    // CRITICAL: Ensure all required fields are present
    if (!row.title || !row.company || !row.location || !row.job_hash) {
      console.warn(`⚠️ Skipping invalid job: missing required fields`, {
        hasTitle: !!row.title,
        hasCompany: !!row.company,
        hasLocation: !!row.location,
        hasHash: !!row.job_hash
      });
      return false;
    }
    
    // Ensure categories array is never null/empty
    if (!row.categories || !Array.isArray(row.categories) || row.categories.length === 0) {
      console.warn(`⚠️ Job missing categories, adding default`, { job_hash: row.job_hash });
      row.categories = ['early-career'];
    }
    
    // Ensure work_environment is never null
    if (!row.work_environment) {
      console.warn(`⚠️ Job missing work_environment, defaulting to on-site`, { job_hash: row.job_hash });
      row.work_environment = 'on-site';
    }
    
    return true;
  });
  
  const unique = Array.from(new Map(validatedRows.map(r => [r.job_hash, r])).values());
  console.log(`📊 Validated: ${dbJobs.length} → ${validatedRows.length} → ${unique.length} unique jobs`);
  
  const BATCH_SIZE = 50;
  let totalUpserted = 0;

  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const batch = unique.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from('jobs')
      .upsert(batch, { onConflict: 'job_hash', ignoreDuplicates: false })
      .select('job_hash');

    if (error) {
      console.error('Upsert error:', error.message);
      // Log first few failed rows for debugging
      if (i === 0 && batch.length > 0) {
        console.error('Sample failed row:', JSON.stringify(batch[0], null, 2));
      }
      throw error;
    }

    totalUpserted += Array.isArray(data) ? data.length : batch.length;
  }

  return totalUpserted;
}

(async () => {
  if (!process.env.REED_API_KEY) {
    console.log('⚠️ REED_API_KEY missing; skipping Reed run');
    process.exit(0);
  }
  console.log('🚀 Starting Reed scrape for locations:', LOCATIONS.join(', '));
  const all = [];
  for (const loc of LOCATIONS) {
    try {
      console.log(`📍 Reed: ${loc}`);
      const jobs = await scrapeLocation(loc);
      console.log(`  ➜ ${loc}: ${jobs.length} jobs`);
      all.push(...jobs);
      await sleep(1000);
    } catch (e) {
      console.error(`❌ Reed fatal in ${loc}:`, e?.message || e);
      scrapeErrors += 1;
    }
  }
  const seen = new Set();
  const unique = all.filter(j => {
    const key = makeJobHash({
      title: j.title,
      company: j.company,
      location: j.location,
    });
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  console.log(`📊 Reed total unique: ${unique.length}`);
  let inserted = 0;
  try {
    inserted = await saveJobsToDB(unique);
  } catch (e) {
    scrapeErrors += 1;
    console.error('❌ Reed DB save failed:', e.message);
  }
  console.log(`✅ Reed: ${inserted} jobs saved to database`);
  recordScraperRun('reed', inserted, Date.now() - scriptStart, scrapeErrors);
})().catch(e => {
  console.error('❌ Reed fatal:', e.message);
  recordScraperRun('reed', 0, Date.now() - scriptStart, scrapeErrors + 1);
  process.exit(1);
});
