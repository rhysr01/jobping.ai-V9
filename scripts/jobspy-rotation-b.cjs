#!/usr/bin/env node
// JobSpy Rotation B - Different search terms for more coverage

require('dotenv').config({ path: '.env.local' });
const { spawnSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

const PYTHON = '/opt/homebrew/opt/python@3.11/bin/python3.11';

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE env vars');
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
    const cols = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') { inQuotes = !inQuotes; } 
      else if (char === ',' && !inQuotes) { cols.push(current.trim()); current = ''; } 
      else { current += char; }
    }
    cols.push(current.trim());
    const obj = {}; headers.forEach((h,i)=> obj[h]=(cols[i]||'').replace(/^"|"$/g,''));
    return obj;
  });
}

async function main() {
  // ROTATION B - Different terms for max coverage
  const SEARCHES = [
    // LONDON - Different terms
    { city: 'London', country: 'united kingdom', terms: ['graduate scheme', 'analyst program', 'associate program', 'trainee finance', 'junior consultant', 'operations analyst'] },
    // DUBLIN
    { city: 'Dublin', country: 'ireland', terms: ['graduate trainee', 'analyst graduate', 'associate finance'] },
    // MADRID
    { city: 'Madrid', country: 'spain', terms: ['programa de graduados', 'analista financiero', 'consultor junior'] },
    // BARCELONA
    { city: 'Barcelona', country: 'spain', terms: ['prácticas banca', 'trainee finance', 'analista'] },
    // BERLIN
    { city: 'Berlin', country: 'germany', terms: ['trainee programm', 'analyst graduate', 'junior consultant'] },
    // MUNICH
    { city: 'Munich', country: 'germany', terms: ['trainee finance', 'graduate program', 'junior analyst'] },
    // PARIS
    { city: 'Paris', country: 'france', terms: ['programme graduate', 'analyste financier', 'consultant junior'] },
    // AMSTERDAM
    { city: 'Amsterdam', country: 'netherlands', terms: ['trainee program', 'graduate analyst', 'junior finance'] },
    // BRUSSELS
    { city: 'Brussels', country: 'belgium', terms: ['graduate trainee', 'analyste junior', 'stage finance'] },
    // MILAN
    { city: 'Milan', country: 'italy', terms: ['stage finance', 'analista junior', 'trainee'] },
    // ZURICH
    { city: 'Zurich', country: 'switzerland', terms: ['graduate programm', 'analyst trainee', 'junior finance'] },
  ];

  const collected = [];
  let totalSearches = 0;
  
  for (const search of SEARCHES) {
    for (const term of search.terms) {
      totalSearches++;
      console.log(`🔎 [${totalSearches}] ${search.city}: "${term}"`);
      
      const py = spawnSync(PYTHON, ['-c', `
from jobspy import scrape_jobs
df = scrape_jobs(
  site_name=['indeed', 'glassdoor', 'google', 'zip_recruiter'],
  search_term='${term}',
  location='${search.city}',
  country_indeed='${search.country}',
  results_wanted=20,
  hours_old=720
)
cols=[c for c in ['title','company','location','job_url','company_description'] if c in df.columns]
print(df[cols].to_csv(index=False))
`], { 
        encoding: 'utf8', 
        timeout: 30000,
        env: { ...process.env, PYTHONUNBUFFERED: '1' }
      });

      if (py.status === 0 && py.stdout) {
        const rows = parseCsv(py.stdout);
        console.log(`   ✅ ${rows.length} jobs`);
        rows.forEach(r => collected.push(r));
      } else {
        console.log(`   ❌ Failed`);
      }
      
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log(`\n📊 Total collected: ${collected.length} jobs`);

  // Save to database
  const supabase = getSupabase();
  const nowIso = new Date().toISOString();
  const rows = collected.map(j => ({
    job_hash: hashJob(j.title, j.company, j.location),
    title: (j.title||'').trim(),
    company: (j.company||'').trim(),
    location: (j.location||'').trim(),
    description: (j.company_description||'').trim(),
    job_url: (j.job_url||'').trim(),
    source: 'jobspy-indeed',
    categories: ['early-career'],
    is_active: true,
    created_at: nowIso
  })).filter(j => j.title && j.company && j.job_url);

  const unique = Array.from(new Map(rows.map(r=>[r.job_hash,r])).values());
  console.log(`📊 Unique jobs: ${unique.length}`);
  
  for (let i=0;i<unique.length;i+=150){
    const slice = unique.slice(i,i+150);
    const { error } = await supabase.from('jobs').upsert(slice, { onConflict: 'job_hash' });
    if (error) console.error('Error:', error.message);
    else console.log(`✅ Saved ${slice.length} jobs`);
  }
  
  console.log(`\n🎉 JobSpy Rotation B: ${unique.length} jobs saved!`);
}

main().catch(console.error);

