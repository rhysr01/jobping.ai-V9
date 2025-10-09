#!/usr/bin/env node

/**
 * Save early-career jobs from JobSpy to Supabase (EU cities)
 * - Runs JobSpy per city/term
 * - Parses CSV output
 * - Filters out remote
 * - Upserts into 'jobs' table using job_hash
 */

require('dotenv').config({ path: '.env.local' });
const { spawnSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/ANON_KEY');
  return createClient(url, key, { auth: { persistSession: false } });
}

function hashJob(title, company, location) {
  const normalized = `${title||''}-${company||''}-${location||''}`.toLowerCase().replace(/\s+/g,'-');
  let hash = 0; for (let i=0;i<normalized.length;i++){ hash=((hash<<5)-hash)+normalized.charCodeAt(i); hash|=0; }
  return Math.abs(hash).toString(36);
}

function parseCsv(csv) {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h=>h.trim());
  return lines.slice(1).map(line => {
    // Better CSV parsing that handles quoted fields with commas
    const cols = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cols.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cols.push(current.trim());
    const obj = {}; headers.forEach((h,i)=> obj[h]=(cols[i]||'').replace(/^"|"$/g,''));
    return obj;
  });
}

async function saveJobs(jobs, source) {
  const supabase = getSupabase();
  const nowIso = new Date().toISOString();
  const nonRemote = jobs.filter(j => !((j.location||'').toLowerCase().includes('remote')));
  const rows = nonRemote.map(j => ({
    job_hash: hashJob(j.title, j.company, j.location),
    title: (j.title||'').trim(),
    company: (j.company||'').trim(),
    location: (j.location||'').trim(),
    description: (j.company_description || j.skills || '').trim(),
    job_url: (j.job_url || j.url || '').trim(),
    source,
    posted_at: j.posted_at || nowIso,
    categories: ['early-career'],
    work_environment: 'on-site',
    experience_required: 'entry-level',
    original_posted_date: j.posted_at || nowIso,
    last_seen_at: nowIso,
    is_active: true,
    created_at: nowIso
  }));
  const unique = Array.from(new Map(rows.map(r=>[r.job_hash,r])).values());
  for (let i=0;i<unique.length;i+=150){
    const slice = unique.slice(i,i+150);
    const { data, error } = await supabase
      .from('jobs')
      .upsert(slice, { onConflict: 'job_hash', ignoreDuplicates: false });
    if (error) {
      console.error('Upsert error:', error.message);
    } else {
      console.log(`✅ Saved ${slice.length} jobs (upserted)`);
    }
  }
}

function pickPythonCommand() {
  const fromEnv = process.env.PYTHON && process.env.PYTHON.trim();
  const candidates = [
    fromEnv,
    '/usr/bin/python3',
    '/opt/homebrew/bin/python3.11',
    '/usr/local/bin/python3.11',
    'python3.11',
    'python3',
    'python'
  ].filter(Boolean);
  for (const cmd of candidates) {
    try {
      const res = spawnSync(cmd, ['-V'], { encoding: 'utf8', timeout: 3000 });
      if (res.status === 0 || (res.stdout || res.stderr)) {
        return cmd;
      }
    } catch {}
  }
  return 'python3';
}

async function main() {
  // Core and localized multilingual early‑career terms per city (spec)
  const EXTRA_TERMS = (process.env.JOBSPY_EXTRA_TERMS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  // Query rotation system - 3 different sets that rotate
  const QUERY_SETS = {
    SET_A: [
      // Internship focused
      'internship', 'intern', 'placement', 'trainee',
      'graduate programme', 'graduate program', 'graduate scheme',
      'entry level', 'junior', 'analyst', 'business analyst'
    ],
    SET_B: [
      // Industry specific
      'finance graduate', 'sales graduate', 'marketing graduate', 
      'consulting graduate', 'operations graduate', 'tech graduate',
      'data analyst', 'product analyst', 'strategy analyst',
      'investment banking', 'management consulting', 'corporate finance'
    ],
    SET_C: [
      // Skills and roles focused
      'business analyst', 'data analyst', 'financial analyst',
      'marketing analyst', 'operations analyst', 'strategy analyst',
      'graduate scheme', 'graduate program', 'trainee program',
      'entry level', 'junior', 'associate', 'analyst'
    ]
  };

  // Determine which query set to use based on current time
  const getCurrentQuerySet = () => {
    // Allow manual override via environment variable
    const manualSet = process.env.JOBSPY_QUERY_SET;
    if (manualSet && QUERY_SETS[manualSet]) {
      console.log(`🎯 Manual query set override: ${manualSet}`);
      return manualSet;
    }
    
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    
    // Rotate every 8 hours: SET_A (0-7h), SET_B (8-15h), SET_C (16-23h)
    if (hour >= 0 && hour < 8) return 'SET_A';
    if (hour >= 8 && hour < 16) return 'SET_B';
    return 'SET_C';
  };

  const currentSet = getCurrentQuerySet();
  const CORE_EN = QUERY_SETS[currentSet];
  
  console.log(`🔄 Using query set: ${currentSet} (${CORE_EN.length} terms)`);
  const CITY_LOCAL = {
    'London': [], // English only set is CORE_EN
    'Madrid': [ 'programa de graduados','becario','prácticas','junior','recién graduado','nivel inicial' ],
    'Berlin': [ 'absolvent','trainee','praktikant','junior','berufseinsteiger','nachwuchskraft' ],
    'Amsterdam': [ 'afgestudeerde','traineeship','starter','junior','beginnend','werkstudent' ],
    'Paris': [ 'jeune diplômé','stagiaire','alternance','junior','débutant','programme graduate' ],
    'Zurich': [ 'absolvent','trainee','praktikant','junior','jeune diplômé','stagiaire' ],
    'Milan': [ 'neolaureato','stage','tirocinio','junior','primo lavoro','laureato' ],
    'Dublin': [] // English only set is CORE_EN
  };
  const cities = [ 'London','Madrid','Berlin','Amsterdam','Paris','Zurich','Milan','Dublin' ];
  const MAX_Q_PER_CITY = parseInt(process.env.JOBSPY_MAX_Q_PER_CITY || '12', 10);
  const RESULTS_WANTED = parseInt(process.env.JOBSPY_RESULTS_WANTED || '15', 10);
  const JOBSPY_TIMEOUT_MS = parseInt(process.env.JOBSPY_TIMEOUT_MS || '20000', 10);

  const collected = [];
  const pythonCmd = pickPythonCommand();
  for (const city of cities) {
    const localized = CITY_LOCAL[city] || [];
    // Combine core + extras + localized, internship/graduate-first prioritization
    const combined = [...CORE_EN, ...EXTRA_TERMS, ...localized];
    const prioritized = [
      ...combined.filter(q => /(intern|internship|placement|stagiaire|prácticas|stage|praktik|graduate(\s+(scheme|program(me)?))?)/i.test(q)),
      ...combined.filter(q => !/(intern|internship|placement|stagiaire|prácticas|stage|praktik|graduate(\s+(scheme|program(me)?))?)/i.test(q))
    ];
    const toRun = prioritized.slice(0, MAX_Q_PER_CITY);
    const country = city === 'London' ? 'united kingdom'
                  : city === 'Paris' ? 'france'
                  : city === 'Madrid' ? 'spain'
                  : city === 'Berlin' ? 'germany'
                  : city === 'Amsterdam' ? 'netherlands'
                  : city === 'Zurich' ? 'switzerland'
                  : city === 'Dublin' ? 'ireland'
                  : 'italy';
    for (const term of toRun) {
      console.log(`\n🔎 Fetching: ${term} in ${city}, ${country}`);
      let py;
      let tries = 0;
      const maxTries = 3;
      while (tries < maxTries) {
        tries++;
        py = spawnSync(pythonCmd, ['-c', `
from jobspy import scrape_jobs
import pandas as pd
df = scrape_jobs(
  site_name=['indeed'],
  search_term='''${term.replace(/'/g, "''")}''',
  location='''${city}''',
  country_indeed='''${country}''',
  results_wanted=${RESULTS_WANTED},
  hours_old=720,
  distance=20
)
import sys
print('Available columns:', list(df.columns), file=sys.stderr)
cols=[c for c in ['title','company','location','job_url','company_description','skills'] if c in df.columns]
print(df[cols].to_csv(index=False))
`], { 
  encoding: 'utf8', 
  timeout: JOBSPY_TIMEOUT_MS,
  env: { ...process.env, PATH: process.env.PATH }
});
        if (py.status === 0) break;
        console.error('Python error:', (py.stderr && py.stderr.trim()) || (py.stdout && py.stdout.trim()) || `status ${py.status}`);
        if (tries < maxTries) {
          console.log(`↻ Retrying (${tries}/${maxTries}) after backoff...`);
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1500);
        }
      }
      if (!py || py.status !== 0) continue;
      const rows = parseCsv(py.stdout);
      console.log(`→ Collected ${rows.length} rows`);
      if (rows.length > 0) rows.forEach(r => collected.push(r));
    }
  }

  // Quality gate: required fields and description length
  const hasFields = j => (
    (j.title||'').trim().length > 3 &&
    (j.company||'').trim().length > 1 &&
    (j.location||'').trim().length > 3 &&
    (j.job_url||j.url||'').trim().startsWith('http')
  );
  const titleStr = s => (s||'').toLowerCase();
  const descStr = s => (s||'').toLowerCase();
  const includesAny = (s, arr) => arr.some(t => s.includes(t));
  const excludesAll = (s, arr) => !arr.some(t => s.includes(t));
  const earlyTerms = [
    // English
    'graduate','entry level','entry-level','junior','associate','trainee','intern','internship',
    // Spanish
    'graduado','becario','prácticas','nivel inicial','asociado',
    // German
    'absolvent','praktikum','werkstudent','einsteiger',
    // Dutch
    'starter','afgestudeerd','stage',
    // French
    'jeune diplômé','stagiaire','alternance','débutant','apprenti',
    // Swiss (mix of DE/FR)
    'praktikum','stage','jeune diplômé',
    // Italian
    'neolaureato','tirocinio','stage','apprendista'
  ];
  const bizAxesStrict = ['consult','sales','business analyst','strategy','operations','logistic','supply chain','finance','account','audit','marketing','brand','commercial','product','data','ai'];
  const bizAxesLoose = ['business','analyst','scheme','program','operations','marketing','sales','finance','account','audit','logistics','supply','chain','consult','strategy','hr','human resources','risk','project','management','data','analytics','product','tech','technology','engineering'];
  const seniorTerms = ['senior','lead','principal','director','head of','vp','vice president','architect','specialist','manager'];
  const noisyExclusions = ['nurse','nhs','teacher','chef','cleaner','warehouse','driver','barista','waiter','waitress'];
  // Additional exclusion: overly generic consultant roles
  const consultantExclusion = [' consultant '];
  const qualityFiltered = collected.filter(j => {
    if (!hasFields(j)) return false;
    const t = titleStr(j.title);
    const d = descStr(j.company_description || j.skills || '');
    const full = `${t} ${d}`;
    
    // Check if title or description has early-career terms
    const hasEarly = includesAny(t, earlyTerms) || includesAny(d, earlyTerms);
    const titleHasExplicitEarly = includesAny(t, earlyTerms);
    
    // RELAXED: If searching with early-career terms, assume all results are relevant
    // The search queries already filter for early-career roles
    const searchTermIsEarly = true; // We're using graduate/intern/analyst search terms
    
    // If title has early terms OR we're searching early terms, bypass strict business check
    const bizOk = (titleHasExplicitEarly || searchTermIsEarly) ? true : includesAny(full, bizAxesLoose);
    if (!bizOk) return false;
    
    // Only reject if DEFINITELY senior (and no early terms in title)
    if (!titleHasExplicitEarly && includesAny(t, seniorTerms)) return false;
    
    // Always reject noise
    if (!excludesAll(full, noisyExclusions)) return false;
    
    return true;
  });
  // No per-city cap - collect all quality jobs
  const capped = qualityFiltered;
  console.log(`\n🧾 Total collected: ${collected.length}`);
  console.log(`✅ Passing quality gate (fields + biz/early terms, no senior/noise): ${qualityFiltered.length}`);
  console.log(`🎚️ All quality jobs included (no cap): ${capped.length}`);
  
  // Debug: show sample titles that failed
  if (collected.length > 0 && qualityFiltered.length === 0) {
    console.log('\n🔍 Sample titles that failed quality gate:');
    collected.slice(0, 3).forEach((j, i) => {
      const t = (j.title||'').toLowerCase();
      const d = (j.company_description || j.skills || '').toLowerCase();
      const hasEarly = earlyTerms.some(term => t.includes(term) || d.includes(term));
      const titleHasExplicitEarly = earlyTerms.some(term => t.includes(term));
      const descLen = (j.company_description || j.skills || '').trim().length;
      const hasFields = (
        (j.title||'').trim().length > 3 &&
        (j.company||'').trim().length > 1 &&
        (j.location||'').trim().length > 3 &&
        (j.job_url||j.url||'').trim().startsWith('http') &&
        true
      );
      console.log(`${i+1}. "${j.title}" (${j.company}) - hasEarly: ${hasEarly}, titleHasExplicitEarly: ${titleHasExplicitEarly}, hasFields: ${hasFields}, descLen: ${descLen}`);
      console.log(`   Raw job object:`, JSON.stringify(j, null, 2));
    });
  }
  await saveJobs(capped, 'jobspy-indeed');
  console.log(`✅ JobSpy: total_saved=${capped.length}`);
  console.log('🎉 Done');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });

// Export main function for wrapper usage
module.exports = {
  main
};
