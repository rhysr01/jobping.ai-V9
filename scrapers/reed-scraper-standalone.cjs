"use strict";
// Reed.co.uk Scraper (API v1.0) - UK + Dublin early-career focus
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { classifyEarlyCareer, makeJobHash } = require('./shared/helpers.cjs');

function parseLocation(location) {
  const loc = (location || '').toLowerCase().trim();
  const isRemote = /remote|work\s+from\s+home|wfh|anywhere/.test(loc);
  const euCountries = [
    'austria','belgium','bulgaria','croatia','cyprus','czech republic','denmark','estonia','finland','france','germany','greece','hungary','ireland','italy','latvia','lithuania','luxembourg','malta','netherlands','poland','portugal','romania','slovakia','slovenia','spain','sweden','united kingdom','uk','switzerland','norway'
  ];
  const euCities = new Set(['london','manchester','birmingham','edinburgh','glasgow','leeds','liverpool','dublin','cork','galway']);
  let isEU = euCountries.some(c => loc.includes(c));
  const parts = loc.split(',').map(p => p.trim()).filter(Boolean);
  const city = parts.length > 0 ? parts[0] : loc;
  let country = parts.length > 1 ? parts[parts.length - 1] : '';
  if (parts.length === 1 && euCities.has(city)) country = '';
  if (!isEU && country.length === 0) {
    const cityOnly = city.replace(/\s+/g, ' ').trim();
    if (euCities.has(cityOnly)) isEU = true;
  }
  return { city: city || location, country, isRemote, isEU };
}

function convertToDatabaseFormat(job) {
  const { city, country, isRemote, isEU } = parseLocation(job.location);
  const isEarlyCareer = classifyEarlyCareer(job);
  const job_hash = makeJobHash(job);
  // Normalize date to ISO (Reed often returns DD/MM/YYYY)
  const normalizeDate = (d) => {
    if (!d) return new Date().toISOString();
    if (typeof d === 'string' && /\d{2}\/\d{2}\/\d{4}/.test(d)) {
      const [dd, mm, yyyy] = d.split('/');
      const iso = new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`).toISOString();
      return iso;
    }
    try { return new Date(d).toISOString(); } catch { return new Date().toISOString(); }
  };
  const postedAt = normalizeDate(job.posted_at);
  // Minimal column set to match existing schema
  return {
    job_hash,
    title: (job.title||'').trim(),
    company: (job.company||'').trim(),
    location: (job.location||'').trim(),
    description: (job.description||'').trim(),
    job_url: (job.url||'').trim(),
    source: (job.source||'reed').trim(),
    posted_at: postedAt,
    last_seen_at: new Date().toISOString(),
    is_active: true,
    created_at: new Date().toISOString()
  };
}

const REED_API = 'https://www.reed.co.uk/api/1.0/search';
const DEFAULT_LOCATIONS = [ 'Belfast','Dublin','London','Manchester','Birmingham' ];
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
const TARGET_CITIES = parseTargetCities();
const LOCATIONS = TARGET_CITIES.length ? TARGET_CITIES : DEFAULT_LOCATIONS;

if (TARGET_CITIES.length) {
  console.log('🎯 Reed target cities from signup data:', TARGET_CITIES.join(', '));
}

const RESULTS_PER_PAGE = parseInt(process.env.REED_RESULTS_PER_PAGE || '50', 10);
const PAGE_DELAY_MS = parseInt(process.env.REED_PAGE_DELAY_MS || '400', 10);
const PAGE_DELAY_JITTER_MS = parseInt(process.env.REED_PAGE_DELAY_JITTER_MS || '0', 10);
const BACKOFF_DELAY_MS = parseInt(process.env.REED_BACKOFF_DELAY_MS || '6000', 10);
const MAX_QUERIES_PER_LOCATION = parseInt(process.env.REED_MAX_QUERIES_PER_LOCATION || `${EARLY_TERMS.length}`, 10);
const INCLUDE_REMOTE = String(process.env.INCLUDE_REMOTE || '').toLowerCase() === 'true';

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

const CAREER_PATH_KEYWORDS = {
  strategy: ['strategy', 'consult', 'business analyst', 'transformation', 'growth'],
  finance: ['finance', 'financial', 'banking', 'investment', 'audit', 'account', 'treasury'],
  sales: ['sales', 'business development', 'account executive', 'sdr', 'bdr', 'customer success'],
  marketing: ['marketing', 'brand', 'growth', 'digital', 'content', 'communications'],
  product: ['product manager', 'product management', 'product analyst', 'product owner'],
  operations: ['operations', 'supply chain', 'logistics', 'process', 'project coordinator'],
  'general-management': ['management trainee', 'leadership programme', 'general management'],
  data: ['data', 'analytics', 'bi analyst', 'insight', 'business intelligence'],
  'people-hr': ['hr', 'people', 'talent', 'recruit', 'human resources'],
  legal: ['legal', 'compliance', 'paralegal', 'law', 'regulation'],
  sustainability: ['sustainability', 'esg', 'environment', 'impact', 'climate'],
  creative: ['design', 'creative', 'ux', 'ui', 'graphic', 'copywriter'],
};

const TARGET_CAREER_PATHS = parseTargetCareerPaths();
if (TARGET_CAREER_PATHS.length) {
  console.log('🎯 Reed target career paths:', TARGET_CAREER_PATHS.join(', '));
}
const EARLY_TERMS = [ 'graduate','entry level','junior','trainee','intern','internship' ];
const MAX_PAGES = parseInt(process.env.REED_MAX_PAGES || '10', 10);
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
  for (const term of termsToUse) {
    let page = 0;
    while (page < MAX_PAGES) {
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
      };
      try {
        const data = await fetchReedPage(params);
        const items = Array.isArray(data.results) ? data.results : [];
        if (!items.length) break;
        for (const r of items) {
          const j = toIngestJob(r);
          const { isRemote, isEU } = parseLocation(j.location);
          if (isRemote && !INCLUDE_REMOTE) continue;
          if (!isEU && !j.location.toLowerCase().includes('dublin')) continue;
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
const BATCH_SIZE = 50;
let totalUpserted = 0;

for (let i = 0; i < dbJobs.length; i += BATCH_SIZE) {
  const batch = dbJobs.slice(i, i + BATCH_SIZE);
  const { data, error } = await supabase
    .from('jobs')
    .upsert(batch, { onConflict: 'job_hash', ignoreDuplicates: true })
    .select('job_hash');

  if (error) {
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
  try { inserted = await saveJobsToDB(unique); } catch (e) { console.error('❌ Reed DB save failed:', e.message); }
  console.log(`✅ Reed: ${inserted} jobs saved to database`);
})().catch(e => { console.error('❌ Reed fatal:', e.message); process.exit(1); });
