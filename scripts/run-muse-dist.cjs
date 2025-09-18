#!/usr/bin/env node

// Wrapper to run compiled Muse scraper from dist/scrapers and save to DB
require('dotenv').config({ path: '.env.local' });
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Minimal helpers (avoid ESM/CJS interop issues)
function localParseLocation(location) {
  const loc = String(location || '').toLowerCase();
  const isRemote = /(remote|work\s*from\s*home|wfh|anywhere|distributed|virtual)/i.test(loc);
  return { isRemote };
}
function localIsEarlyCareer(title, description) {
  const hay = `${title || ''} ${(description || '')}`.toLowerCase();
  const inc = /(graduate|new\s?grad|entry[-\s]?level|intern(ship)?|apprentice|early\s?career|junior|campus|working\sstudent|trainee|associate|analyst|coordinator|assistant|representative|researcher)/i;
  const excl = /(senior|staff|principal|lead|manager|director|head\b|vp\b|vice\s+president|chief|executive|c-level|cto|ceo|cfo|coo)/i;
  return inc.test(hay) && !excl.test(hay);
}
function localMakeJobHash(job) {
  const normalizedTitle = (job.title || '').toLowerCase().trim().replace(/\s+/g, ' ');
  const normalizedCompany = (job.company || '').toLowerCase().trim().replace(/\s+/g, ' ');
  const normalizedLocation = (job.location || '').toLowerCase().trim().replace(/\s+/g, ' ');
  const hashString = `${normalizedTitle}|${normalizedCompany}|${normalizedLocation}`;
  let hash = 0;
  for (let i = 0; i < hashString.length; i++) {
    const c = hashString.charCodeAt(i);
    hash = ((hash << 5) - hash) + c;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
function convertToDatabaseFormat(job) {
  const { isRemote } = localParseLocation(job.location);
  const isEarly = localIsEarlyCareer(job.title, job.description);
  const job_hash = localMakeJobHash(job);
  const nowIso = new Date().toISOString();
  return {
    job_hash,
    title: (job.title || '').trim(),
    company: (job.company || '').trim(),
    location: (job.location || '').trim(),
    description: (job.description || '').trim(),
    job_url: (job.url || '').trim(),
    source: (job.source || 'themuse').trim(),
    posted_at: job.posted_at || nowIso,
    categories: [isEarly ? 'early-career' : 'experienced'],
    work_environment: isRemote ? 'remote' : 'on-site',
    experience_required: isEarly ? 'entry-level' : 'experienced',
    original_posted_date: job.posted_at || nowIso,
    last_seen_at: nowIso,
    is_active: true,
    created_at: nowIso
  };
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.log('⚠️ Missing Supabase credentials; skipping Muse run');
    process.exit(0);
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Ensure relative requires in dist work
  const distDir = path.join(process.cwd(), 'dist', 'scrapers');
  process.chdir(distDir);
  const MuseModule = require('./muse-scraper.js');
  const Scraper = MuseModule && (MuseModule.default || MuseModule.MuseScraper || MuseModule);
  if (!Scraper) {
    console.error('❌ Muse scraper module not found');
    process.exit(1);
  }
  const scraper = new Scraper();
  const { jobs } = await scraper.scrapeAllLocations();

  // Exclude remote if requested
  const includeRemote = String(process.env.INCLUDE_REMOTE || '').toLowerCase() !== 'false';
  const filtered = includeRemote ? jobs : jobs.filter(j => !localParseLocation(j.location).isRemote);

  const rows = filtered.map(convertToDatabaseFormat).map(({ metadata, ...clean }) => clean);
  // Dedupe by job_hash
  const unique = [];
  const seen = new Set();
  for (const r of rows) {
    if (!r.job_hash || seen.has(r.job_hash)) continue;
    seen.add(r.job_hash);
    r.last_seen_at = new Date().toISOString();
    r.is_active = true;
    unique.push(r);
  }
  let upserted = 0;
  for (let i = 0; i < unique.length; i += 150) {
    const slice = unique.slice(i, i + 150);
    const { error } = await supabase.from('jobs').upsert(slice, { onConflict: 'job_hash', ignoreDuplicates: false });
    if (!error) upserted += slice.length; else console.warn('Upsert warning:', error.message);
  }
  console.log(`✅ Muse: ${upserted} jobs saved to database`);
}

main().catch(e => { console.error(e?.message || e); process.exit(1); });


