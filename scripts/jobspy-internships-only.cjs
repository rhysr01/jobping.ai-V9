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

// Parse location to extract city and country
function parseLocation(location) {
  if (!location) return { city: '', country: '' };
  const loc = location.toLowerCase().trim();
  
  // Check for remote indicators
  const isRemote = /remote|work\s+from\s+home|wfh|anywhere/i.test(loc);
  if (isRemote) return { city: '', country: '', isRemote: true };
  
  // Known EU cities from signup form (only these are valid)
  const euCities = new Set([
    'dublin', 'london', 'paris', 'amsterdam', 'manchester', 'birmingham',
    'madrid', 'barcelona', 'berlin', 'hamburg', 'munich', 'zurich',
    'milan', 'rome', 'brussels', 'stockholm', 'copenhagen', 'vienna',
    'prague', 'warsaw'
  ]);
  
  // Extract city and country using comma separation
  const parts = loc.split(',').map(p => p.trim()).filter(Boolean);
  let city = parts.length > 0 ? parts[0] : loc;
  let country = parts.length > 1 ? parts[parts.length - 1] : '';
  
  // Clean up city name - remove common suffixes like "ENG", "GB", "DE", etc.
  city = city.replace(/\s+(eng|gb|de|fr|es|it|nl|be|ch|ie|se|dk|at|cz|pl)$/i, '');
  
  // If single part and it's a known city, leave country empty
  if (parts.length === 1 && euCities.has(city)) {
    country = '';
  }
  
  // If we have a country code, normalize it
  if (country) {
    const countryMap = {
      'eng': 'GB', 'england': 'GB', 'united kingdom': 'GB', 'uk': 'GB', 'great britain': 'GB',
      'de': 'DE', 'germany': 'DE', 'deutschland': 'DE',
      'fr': 'FR', 'france': 'FR',
      'es': 'ES', 'spain': 'ES', 'españa': 'ES',
      'it': 'IT', 'italy': 'IT', 'italia': 'IT',
      'nl': 'NL', 'netherlands': 'NL', 'holland': 'NL',
      'be': 'BE', 'belgium': 'BE', 'belgië': 'BE', 'belgique': 'BE',
      'ch': 'CH', 'switzerland': 'CH', 'schweiz': 'CH', 'suisse': 'CH',
      'ie': 'IE', 'ireland': 'IE', 'éire': 'IE',
      'se': 'SE', 'sweden': 'SE', 'sverige': 'SE',
      'dk': 'DK', 'denmark': 'DK', 'danmark': 'DK',
      'at': 'AT', 'austria': 'AT', 'österreich': 'AT',
      'cz': 'CZ', 'czech republic': 'CZ', 'czechia': 'CZ',
      'pl': 'PL', 'poland': 'PL', 'polska': 'PL'
    };
    const normalizedCountry = country.toLowerCase();
    country = countryMap[normalizedCountry] || country.toUpperCase();
  }
  
  // Capitalize first letter of each word for city
  const capitalizedCity = city.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
  
  return { 
    city: capitalizedCity || city, 
    country: country || ''
  };
}

// Detect work environment from location and description
function detectWorkEnvironment(job) {
  const location = (job.location || '').toLowerCase();
  const description = (job.description || job.company_description || job.skills || '').toLowerCase();
  const text = `${location} ${description}`;
  
  if (/remote|work\s+from\s+home|wfh|anywhere|fully\s+remote|100%\s+remote/i.test(text)) {
    return 'remote';
  }
  if (/hybrid|flexible|partially\s+remote|2-3\s+days|3\s+days\s+remote|mix\s+of\s+remote/i.test(text)) {
    return 'hybrid';
  }
  return 'on-site';
}

// Extract language requirements
function extractLanguageRequirements(description) {
  if (!description) return [];
  const desc = description.toLowerCase();
  const languages = [];
  const languageMap = {
    'english': 'English', 'french': 'French', 'german': 'German', 'spanish': 'Spanish',
    'italian': 'Italian', 'dutch': 'Dutch', 'portuguese': 'Portuguese',
    'fluent in english': 'English', 'fluent in french': 'French', 'fluent in german': 'German',
    'fluent in spanish': 'Spanish', 'native english': 'English', 'native french': 'French', 'native german': 'German'
  };
  for (const [keyword, lang] of Object.entries(languageMap)) {
    if (desc.includes(keyword) && !languages.includes(lang)) {
      languages.push(lang);
    }
  }
  return languages;
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
    // Clean company name - remove extra whitespace, trim
    const companyName = (j.company || '').trim().replace(/\s+/g, ' ');
    const { city, country } = parseLocation(j.location || '');
    // Prioritize description field, fallback to company_description + skills
    const description = (
      (j.description && j.description.trim().length > 50 ? j.description : '') ||
      (j.company_description || '') ||
      (j.skills || '')
    ).trim();
    
    // Extract metadata
    const workEnv = detectWorkEnvironment(j);
    const languages = extractLanguageRequirements(description);
    
    // Normalize location data
    const { normalizeJobLocation } = require('../scrapers/shared/locationNormalizer.cjs');
    const normalized = normalizeJobLocation({
      city,
      country,
      location: j.location,
    });
    
    return {
      job_hash: hashJob(j.title, companyName, j.location),
      title: (j.title||'').trim(),
      company: companyName, // Clean company name
      location: normalized.location, // Use normalized location
      city: normalized.city, // Use normalized city
      country: normalized.country, // Use normalized country
      description: description,
      job_url: (j.job_url || j.url || '').trim(),
      source,
      posted_at: j.posted_at || nowIso,
      categories: ['internship', 'early-career'],
      work_environment: workEnv, // Detect from location/description
      experience_required: 'internship',
      is_internship: true, // Maps to form: "Internship"
      is_graduate: false, // Mutually exclusive
      is_early_career: false, // Mutually exclusive (this is internship, not entry-level)
      language_requirements: languages.length > 0 ? languages : null, // Extract languages
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
  // First check for PYTHON environment variable (used in CI/CD)
  if (process.env.PYTHON) {
    return process.env.PYTHON;
  }
  
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
  // Priority cities: Adzuna doesn't cover these, so JobSpy must prioritize them
  const PRIORITY_CITIES = ['Stockholm', 'Copenhagen', 'Vienna', 'Prague', 'Warsaw', 'Belfast'];
  const INTERNSHIP_TERMS = {
    // English internships
    'London': ['internship', 'placement year', 'summer internship', 'intern', 'industrial placement'],
    'Manchester': ['internship', 'placement year', 'summer internship', 'intern', 'industrial placement'],
    'Birmingham': ['internship', 'placement year', 'summer internship', 'intern', 'industrial placement'],
    'Belfast': ['internship', 'placement year', 'summer internship', 'intern', 'industrial placement'],
    'Dublin': ['internship', 'placement year', 'summer internship', 'intern', 'industrial placement'],
    
    // Spanish internships
    'Madrid': ['prácticas', 'becario', 'internship', 'prácticas profesionales', 'prácticas curriculares'],
    'Barcelona': ['prácticas', 'becario', 'internship', 'prácticas profesionales', 'prácticas curriculares'],
    
    // German internships
    'Berlin': ['praktikum', 'praktikant', 'werkstudent', 'internship', 'pflichtpraktikum'],
    'Munich': ['praktikum', 'praktikant', 'werkstudent', 'internship', 'pflichtpraktikum'],
    'Hamburg': ['praktikum', 'praktikant', 'werkstudent', 'internship', 'pflichtpraktikum'],
    'Zurich': ['praktikum', 'stage', 'internship', 'stagiaire', 'werkstudent'],
    'Vienna': ['praktikum', 'praktikant', 'werkstudent', 'internship', 'pflichtpraktikum'],
    
    // French internships
    'Paris': ['stage', 'stagiaire', 'alternance', 'internship', 'stage professionnel'],
    'Brussels': ['stage', 'stagiaire', 'internship', 'stagiar'], // Belgium: French + Dutch
    
    // Dutch internships
    'Amsterdam': ['stage', 'stagiar', 'internship', 'afstudeerstage', 'werkstudent'],
    
    // Italian internships
    'Milan': ['stage', 'tirocinio', 'internship', 'stagista', 'tirocinio curriculare'],
    'Rome': ['stage', 'tirocinio', 'internship', 'stagista', 'tirocinio curriculare'],
    
    // Nordic internships (Priority cities)
    'Stockholm': ['praktikant', 'praktik', 'internship', 'praktikplats', 'sommarjobb'],
    'Copenhagen': ['praktikant', 'praktik', 'internship', 'praktikplads', 'sommerjob'],
    
    // Eastern European internships (Priority cities)
    'Prague': ['stáž', 'praktikant', 'internship', 'praktika', 'absolvent'],
    'Warsaw': ['staż', 'praktykant', 'internship', 'praktyki', 'absolwent']
  };

  const COUNTRY_MAP = {
    'London': 'united kingdom',
    'Manchester': 'united kingdom',
    'Birmingham': 'united kingdom',
    'Belfast': 'united kingdom',
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
    'Rome': 'italy',
    'Stockholm': 'sweden',
    'Copenhagen': 'denmark',
    'Vienna': 'austria',
    'Prague': 'czech republic',
    'Warsaw': 'poland'
  };

  // Process priority cities first, then others
  const OTHER_CITIES = Object.keys(INTERNSHIP_TERMS).filter(c => !PRIORITY_CITIES.includes(c));
  const cities = [...PRIORITY_CITIES, ...OTHER_CITIES];
  
  const RESULTS_WANTED = parseInt(process.env.JOBSPY_INTERNSHIP_RESULTS || '20', 10); // More results for internships
  const PRIORITY_RESULTS_WANTED = parseInt(process.env.JOBSPY_PRIORITY_INTERNSHIP_RESULTS || '35', 10); // Even more for priority cities
  const JOBSPY_TIMEOUT_MS = parseInt(process.env.JOBSPY_TIMEOUT_MS || '20000', 10);

  const collected = [];
  const pythonCmd = pickPythonCommand();
  
  console.log('🎓 INTERNSHIP-ONLY SCRAPER');
  console.log(`🌍 Searching ${cities.length} cities`);
  console.log(`🔍 ${RESULTS_WANTED} results wanted per search`);
  
  for (const city of cities) {
    const isPriority = PRIORITY_CITIES.includes(city);
    const resultsWanted = isPriority ? PRIORITY_RESULTS_WANTED : RESULTS_WANTED;
    const terms = INTERNSHIP_TERMS[city] || [];
    const country = COUNTRY_MAP[city];
    
    if (terms.length === 0) {
      console.warn(`⚠️  No internship terms configured for ${city}, skipping`);
      continue;
    }
    
    for (const term of terms) {
      const priorityLabel = isPriority ? '🎯 [PRIORITY] ' : '';
      console.log(`\n${priorityLabel}🔎 Fetching: "${term}" internships in ${city}, ${country}`);
      
      const py = spawnSync(pythonCmd, ['-c', `
from jobspy import scrape_jobs
import pandas as pd
df = scrape_jobs(
  site_name=['indeed', 'glassdoor', 'google', 'zip_recruiter'],
  search_term='''${term.replace(/'/g, "''")}''',
  location='''${city}''',
  country_indeed='''${country}''',
  results_wanted=${resultsWanted},
  hours_old=720,
  distance=20
)
import sys
print('Available columns:', list(df.columns), file=sys.stderr)
# Try to get full description - check multiple possible column names
desc_cols = ['description', 'job_description', 'full_description', 'job_details', 'details']
desc_col = None
for col in desc_cols:
    if col in df.columns:
        desc_col = col
        break
# If no description column, combine company_description and skills
if desc_col is None:
    df['description'] = df.apply(lambda x: ' '.join(filter(None, [
        str(x.get('company_description', '') or ''),
        str(x.get('skills', '') or ''),
        str(x.get('job_function', '') or ''),
        str(x.get('job_type', '') or '')
    ])), axis=1)
else:
    # Use the found description column, but fallback to company_description if empty
    df['description'] = df.apply(lambda x: (
        str(x.get(desc_col, '') or '') or 
        str(x.get('company_description', '') or '') or
        str(x.get('skills', '') or '')
    ), axis=1)
cols=[c for c in ['title','company','location','job_url','description','company_description','skills'] if c in df.columns]
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

