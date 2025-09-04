#!/usr/bin/env node

/**
 * Greenhouse Auto-Save Integration (direct API -> DB)
 * Fetches real jobs from Greenhouse boards and upserts into DB with correct fields
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const crypto = require('crypto');

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

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BASE = 'https://boards-api.greenhouse.io/v1/boards';

// High-signal EU markers – concise to reduce false positives
const EU_HINTS = [
  'uk','united kingdom','ireland','germany','france','spain','portugal','italy','netherlands','belgium',
  'denmark','sweden','norway','finland','poland','czech','austria','switzerland','greece','romania',
  'croatia','slovenia','slovakia','estonia','latvia','lithuania','amsterdam','rotterdam','london','dublin',
  'paris','berlin','munich','frankfurt','zurich','stockholm','copenhagen','oslo','helsinki','madrid',
  'barcelona','lisbon','milan','rome','athens','warsaw','prague','vienna','budapest','brussels'
];

const EARLY_INC = /(graduate|new\s?grad|entry[-\s]?level|intern(ship)?|apprentice|early\s?career|junior|campus|working\sstudent)/i;
const SENIOR_EXCL = /(senior|staff|principal|lead|manager|director|head)/i;

// Boards we will scrape (focused, EU-heavy)
const GREENHOUSE_BOARDS = [
  'flowtraders','squarepointcapital','jumptrading','twiliostudents','pinterest','stepstone',
  'charlesriverassociates','optiverus','imc','guerrilla-games','ridedott','bluecrestcapitalmanagement','yougov',
  'monzo','sumup','adyen','n26','getyourguide','hellofresh','coinbase','asana','figma','gitlab','hashicorp',
  'vercel','anthropic','stripe','airbnb','robinhood','dropbox','clickup','webflow','airtable','calendly','brex','retool'
];

function isEarlyCareerStr(s) {
  if (!s) return false;
  const hay = String(s).toLowerCase();
  return EARLY_INC.test(hay) && !SENIOR_EXCL.test(hay);
}

function isEUFromText(text) {
  if (!text) return false;
  const t = String(text).toLowerCase();
  if (/\b(remote[, ]+)?europe\b/i.test(t)) return true;
  return EU_HINTS.some(h => t.includes(h));
}

function makeJobHash(board, ghId, absoluteUrl) {
  return crypto
    .createHash('sha256')
    .update(`gh:${board}:${ghId}:${absoluteUrl}`)
    .digest('hex');
}

async function verifyBoard(board) {
  const urls = [`${BASE}/${board}/departments`, `${BASE}/${board}/jobs`];
  for (const u of urls) {
    try {
      const r = await axios.get(u, { timeout: 12000, headers: { Accept: 'application/json' } });
      if (r.status === 200) return true;
    } catch (_) {}
  }
  return false;
}

async function fetchBoardJobs(board) {
  const url = `${BASE}/${board}/jobs?content=true`;
  const r = await axios.get(url, {
    timeout: 20000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; JobPingBot/1.0; +https://jobping.ai/bot)',
      Accept: 'application/json'
    },
    validateStatus: s => s === 200 || s === 404
  });
  if (r.status === 404) return [];
  return Array.isArray(r.data?.jobs) ? r.data.jobs : [];
}

function toDbRow(board, ghJob) {
  const departments = (ghJob.departments || []).map(d => d.name);
  const offices = (ghJob.offices || []).map(o => o.name);
  const location = ghJob.location?.name || offices.join(', ') || 'Unspecified';

  return {
    // REQUIRED/SCHEMA FIELDS
    title: ghJob.title || 'Untitled role',
    company: board, // best-effort; can be improved via curated map
    location,
    job_url: ghJob.absolute_url, // IMPORTANT: correct URL field
    description: (ghJob.content && String(ghJob.content).slice(0, 15000)) || null,
    source: 'reed', // schema allows: adzuna | reed | lever. Use reed until enum extended.

    // CATEGORIZATION
    categories: ['greenhouse', 'eu'].concat(isEarlyCareerStr(ghJob.title) ? ['early-career'] : []),
    experience_required: isEarlyCareerStr(ghJob.title) ? 'entry-level' : 'unspecified',
    work_environment: 'on-site',

    // DEDUP & TIMESTAMPS
    job_hash: makeJobHash(board, ghJob.id, ghJob.absolute_url),
    posted_at: ghJob.updated_at || new Date().toISOString(),
    scrape_timestamp: new Date().toISOString(),
    created_at: new Date().toISOString(),
    scraper_run_id: '00000000-0000-0000-0000-000000000000',
    status: 'active',
    last_seen_at: new Date().toISOString(),
    is_active: true,
    is_sent: false
  };
}

async function collectGreenhouseJobs() {
  log('🔎 Collecting Greenhouse jobs directly from API...', 'blue');
  let total = 0;
  const all = [];

  for (const board of GREENHOUSE_BOARDS) {
    try {
      const exists = await verifyBoard(board);
      if (!exists) {
        log(`❌ ${board}: board not found`, 'yellow');
        continue;
      }

      const jobs = await fetchBoardJobs(board);
      // Filter: EU + Early-Career
      const filtered = jobs.filter(j => {
        const text = [j.title, j.location?.name, ...(j.offices || []).map(o => o.name), j.content || '']
          .filter(Boolean)
          .join(' ');
        return isEUFromText(text) && (isEarlyCareerStr(j.title) || isEarlyCareerStr(j.content));
      });

      const rows = filtered.map(j => toDbRow(board, j));
      total += rows.length;
      all.push(...rows);

      log(`• ${board}: ${rows.length} early-career EU jobs`, rows.length > 0 ? 'green' : 'yellow');
      await new Promise(r => setTimeout(r, 350)); // polite throttle
    } catch (err) {
      log(`x ${board}: ${(err && err.message) || 'unknown error'}`, 'red');
    }
  }

  log(`📊 Total collected: ${total}`, 'cyan');
  return all;
}

async function upsertJobs(rows) {
  if (!rows || rows.length === 0) {
    log('ℹ️ No jobs to upsert', 'yellow');
    return { inserted: 0 };
  }
  const { error } = await supabase
    .from('jobs')
    .upsert(rows, { onConflict: 'job_hash', ignoreDuplicates: false });
  if (error) throw new Error(error.message);
  return { inserted: rows.length };
}

async function runGreenhouseAutoSave() {
  log('🚀 GREENHOUSE AUTO-SAVE (API-driven)', 'cyan');
  try {
    // DB connectivity probe
    const probe = await supabase.from('jobs').select('*', { count: 'exact', head: true });
    if (probe.error) throw new Error(`Database connection failed: ${probe.error.message}`);
    log('✅ Database connection verified', 'green');

    const rows = await collectGreenhouseJobs();
    const result = await upsertJobs(rows);

    log('✅ Greenhouse auto-save completed successfully!', 'green');
    log(`📈 Upserted: ${result.inserted}`);
  } catch (err) {
    log(`❌ Greenhouse auto-save failed: ${(err && err.message) || err}`, 'red');
    process.exitCode = 1;
  }
}

async function startGreenhouseAutoSave() {
  log('🚀 Starting Greenhouse Auto Save...');
  await runGreenhouseAutoSave();
  const intervalMs = 10 * 60 * 1000; // 10 minutes
  log(`⏰ Will auto-save every ${intervalMs / 1000} seconds`);
  setInterval(runGreenhouseAutoSave, intervalMs);
}

if (require.main === module) {
  startGreenhouseAutoSave();
}

module.exports = { runGreenhouseAutoSave, collectGreenhouseJobs, upsertJobs };
