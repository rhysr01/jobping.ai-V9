#!/usr/bin/env node

/**
 * JobSpy Internships-Only Scraper
 * Focuses exclusively on internships, placements, and stage/praktikum roles
 * Runs alongside main JobSpy scraper for maximum internship coverage
 */

require('dotenv').config({ path: '.env.local' });
const { spawnSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
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
  const rows = nonRemote.map(j => {
    const companyName = (j.company||'').trim();
    return {
      job_hash: hashJob(j.title, companyName, j.location),
      title: (j.title||'').trim(),
      company: companyName,
      company_name: companyName, // Fix: Map company to company_name for proper data quality
      location: (j.location||'').trim(),
      description: (j.company_description || j.skills || '').trim(),
      job_url: (j.job_url || j.url || '').trim(),
      source,
      posted_at: j.posted_at || nowIso,
      categories: ['internship', 'early-career'],
      work_environment: 'on-site',
      experience_required: 'entry-level',
      is_internship: true, // Flag as internship
      original_posted_date: j.posted_at || nowIso,
      last_seen_at: nowIso,
      is_active: true,
      created_at: nowIso
    };
  });
  const unique = Array.from(new Map(rows.map(r=>[r.job_hash,r])).values());
  for (let i=0;i<unique.length;i+=150){
    const slice = unique.slice(i,i+150);
    const { data, error } = await supabase
      .from('jobs')
      .upsert(slice, { onConflict: 'job_hash', ignoreDuplicates: false });
    if (error) {
      console.error('Upsert error:', error.message);
    } else {
      console.log(`✅ Saved ${slice.length} internship jobs (upserted)`);
    }
  }
}

function pickPythonCommand() {
  const scriptPath = require('path').join(__dirname, 'run-jobspy-python.sh');
  if (require('fs').existsSync(scriptPath)) {
    return scriptPath;
  }
  const directPath = '/opt/homebrew/opt/python@3.11/bin/python3.11';
  if (require('fs').existsSync(directPath)) {
    return directPath;
  }
  return 'python3';
}

async function main() {
  // INTERNSHIP-ONLY SEARCH TERMS (Multi-language)
  const INTERNSHIP_TERMS = {
    // English internships
    'London': ['internship', 'placement year', 'summer internship', 'intern', 'industrial placement'],
    'Manchester': ['internship', 'placement year', 'summer internship', 'intern', 'industrial placement'],
    'Birmingham': ['internship', 'placement year', 'summer internship', 'intern', 'industrial placement'],
    'Dublin': ['internship', 'placement year', 'summer internship', 'intern', 'industrial placement'],
    
    // Spanish internships
    'Madrid': ['prácticas', 'becario', 'internship', 'prácticas profesionales', 'prácticas curriculares'],
    'Barcelona': ['prácticas', 'becario', 'internship', 'prácticas profesionales', 'prácticas curriculares'],
    
    // German internships
    'Berlin': ['praktikum', 'praktikant', 'werkstudent', 'internship', 'pflichtpraktikum'],
    'Munich': ['praktikum', 'praktikant', 'werkstudent', 'internship', 'pflichtpraktikum'],
    'Hamburg': ['praktikum', 'praktikant', 'werkstudent', 'internship', 'pflichtpraktikum'],
    'Zurich': ['praktikum', 'stage', 'internship', 'stagiaire', 'werkstudent'],
    
    // French internships
    'Paris': ['stage', 'stagiaire', 'alternance', 'internship', 'stage professionnel'],
    'Brussels': ['stage', 'stagiaire', 'internship', 'stagiar'], // Belgium: French + Dutch
    
    // Dutch internships
    'Amsterdam': ['stage', 'stagiar', 'internship', 'afstudeerstage', 'werkstudent'],
    
    // Italian internships
    'Milan': ['stage', 'tirocinio', 'internship', 'stagista', 'tirocinio curriculare'],
    'Rome': ['stage', 'tirocinio', 'internship', 'stagista', 'tirocinio curriculare']
  };

  const COUNTRY_MAP = {
    'London': 'united kingdom',
    'Manchester': 'united kingdom',
    'Birmingham': 'united kingdom',
    'Dublin': 'ireland',
    'Paris': 'france',
    'Madrid': 'spain',
    'Barcelona': 'spain',
    'Berlin': 'germany',
    'Hamburg': 'germany',
    'Munich': 'germany',
    'Amsterdam': 'netherlands',
    'Brussels': 'belgium',
    'Zurich': 'switzerland',
    'Milan': 'italy',
    'Rome': 'italy'
  };

  const cities = Object.keys(INTERNSHIP_TERMS);
  const RESULTS_WANTED = parseInt(process.env.JOBSPY_INTERNSHIP_RESULTS || '20', 10); // More results for internships
  const JOBSPY_TIMEOUT_MS = parseInt(process.env.JOBSPY_TIMEOUT_MS || '20000', 10);

  const collected = [];
  const pythonCmd = pickPythonCommand();
  
  console.log('🎓 INTERNSHIP-ONLY SCRAPER');
  console.log(`🌍 Searching ${cities.length} cities`);
  console.log(`🔍 ${RESULTS_WANTED} results wanted per search`);
  
  for (const city of cities) {
    const terms = INTERNSHIP_TERMS[city];
    const country = COUNTRY_MAP[city];
    
    for (const term of terms) {
      console.log(`\n🔎 Fetching: "${term}" internships in ${city}, ${country}`);
      
      const py = spawnSync(pythonCmd, ['-c', `
from jobspy import scrape_jobs
import pandas as pd
df = scrape_jobs(
  site_name=['indeed', 'glassdoor', 'google', 'zip_recruiter'],
  search_term='''${term.replace(/'/g, "''")}''',
  location='''${city}''',
  country_indeed='''${country}''',
  results_wanted=${RESULTS_WANTED},
  hours_old=720,
  distance=20
)
import sys
print('Available columns:', list(df.columns), file=sys.stderr)
cols=[c for c in ['title','company','location','job_url','company_description','skills','description'] if c in df.columns]
print(df[cols].to_csv(index=False))
`], { 
        encoding: 'utf8', 
        timeout: JOBSPY_TIMEOUT_MS,
        env: { ...process.env, PATH: process.env.PATH }
      });
      
      if (py.status !== 0) {
        console.error(`❌ Failed for "${term}" in ${city}:`, py.stderr?.trim() || `status ${py.status}`);
        continue;
      }
      
      const rows = parseCsv(py.stdout);
      console.log(`→ Collected ${rows.length} internship listings`);
      if (rows.length > 0) rows.forEach(r => collected.push(r));
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // INTERNSHIP-SPECIFIC QUALITY FILTER
  const internshipKeywords = [
    'intern', 'internship', 'placement', 'stage', 'stagiaire', 'praktikum', 
    'praktikant', 'werkstudent', 'prácticas', 'becario', 'tirocinio', 'stagista',
    'alternance', 'apprentice', 'trainee'
  ];
  
  const qualityFiltered = collected.filter(j => {
    const title = (j.title || '').toLowerCase();
    const desc = (j.company_description || j.skills || '').toLowerCase();
    
    // Must have basic fields
    if (!(j.title||'').trim() || !(j.company||'').trim() || !(j.location||'').trim()) return false;
    if (!(j.job_url||'').startsWith('http')) return false;
    
    // Must be an internship
    const isInternship = internshipKeywords.some(kw => title.includes(kw) || desc.includes(kw));
    if (!isInternship) return false;
    
    // Exclude senior roles
    if (title.includes('senior') || title.includes('lead') || title.includes('manager')) return false;
    
    return true;
  });

  console.log(`\n🧾 Total collected: ${collected.length}`);
  console.log(`✅ Internships after quality filter: ${qualityFiltered.length}`);
  
  await saveJobs(qualityFiltered, 'jobspy-internships');
  console.log(`✅ JobSpy Internships: total_saved=${qualityFiltered.length}`);
  console.log('🎉 Done');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });

module.exports = { main };

