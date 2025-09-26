"use strict";
// Reed.co.uk Scraper (API v1.0) - UK + Dublin early-career focus
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Inline helpers to avoid ESM/CJS interop issues
function classifyEarlyCareer(job) {
  const { title, description } = job;
  const text = `${title || ''} ${description || ''}`;
  const graduateRegex = /(graduate|new.?grad|recent.?graduate|campus.?hire|graduate.?scheme|graduate.?program|rotational.?program|university.?hire|college.?hire|entry.?level|junior|trainee|intern|internship|placement|analyst|assistant|apprenticeship|apprentice|stagiaire|alternant|alternance|d[ée]butant|dipl[oô]m[eé]|praktikum|praktikant|traineeprogramm|berufseinstieg|absolvent|ausbildung|werkstudent|einsteiger|becario|pr[aá]cticas|programa.?de.?graduados|reci[eé]n.?titulado|nivel.?inicial|tirocinio|stagista|apprendista|neolaureato|stage|stagiair|starterfunctie|traineeship|afgestudeerde|leerwerkplek|instapfunctie|fresher|nyuddannet|nyutdannet|nyexaminerad|reci[eé]n.?graduado)/i;
  const seniorRegex = /(senior|lead|principal|director|head.?of|vp|chief|executive\s+level|executive\s+director|5\+.?years|7\+.?years|10\+.?years|architect\b|team.?lead|tech.?lead|staff\b|distinguished)/i;
  const experienceRegex = /(proven.?track.?record|extensive.?experience|minimum.?3.?years|minimum.?5.?years|minimum.?7.?years|prior.?experience|relevant.?experience|3\+.?years|5\+.?years|7\+.?years|10\+.?years)/i;
  return graduateRegex.test(text) && !seniorRegex.test(text) && !experienceRegex.test(text);
}

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
  const key = `${(job.title||'').toLowerCase().trim()}|${(job.company||'').toLowerCase().trim()}|${(job.location||'').toLowerCase().trim()}`;
  let hash = 0; for (let i=0;i<key.length;i++){ const ch = key.charCodeAt(i); hash = ((hash<<5)-hash)+ch; hash = hash & hash; }
  const job_hash = Math.abs(hash).toString(36);
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
const LOCATIONS = [ 'Belfast','Dublin','London','Manchester','Birmingham' ];
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
    'User-Agent': 'JobPingBot/1.0 (+https://jobping.ai/bot; contact: support@jobping.ai)'
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
  const resultsPerPage = 50;
  for (const term of EARLY_TERMS) {
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
          if (isRemote) continue;
          if (!isEU && !j.location.toLowerCase().includes('dublin')) continue;
          if (!(classifyEarlyCareer(j) || EARLY_TERMS.some(t => j.title.toLowerCase().includes(t)))) continue;
          const valid = j.title && j.company && j.location && j.description && j.url;
          if (valid) jobs.push(j);
        }
        console.log(`   ✓ accumulated ${jobs.length} valid jobs so far for ${location}`);
        await sleep(400); // Reduced from 800ms to 400ms for speed
        // Stop paginating if fewer than a full page returned
        if (items.length < resultsPerPage) break;
        page++;
      } catch (e) {
        if (e.response && e.response.status === 429) { await sleep(6000); page--; continue; }
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
  const { data, error } = await supabase
    .from('jobs')
    .upsert(dbJobs, { onConflict: 'job_hash', ignoreDuplicates: false });
  if (error) throw error;
  return Array.isArray(data) ? data.length : dbJobs.length;
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
    const key = `${j.title.toLowerCase()}|${j.company.toLowerCase()}|${j.location.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  console.log(`📊 Reed total unique: ${unique.length}`);
  let inserted = 0;
  try { inserted = await saveJobsToDB(unique); } catch (e) { console.error('❌ Reed DB save failed:', e.message); }
  console.log(`✅ Reed: ${inserted} jobs saved to database`);
})().catch(e => { console.error('❌ Reed fatal:', e.message); process.exit(1); });
