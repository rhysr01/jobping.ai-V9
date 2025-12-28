#!/usr/bin/env node

/**
 * JobSpy Internships-Only Scraper
 * Focuses exclusively on internships, placements, and stage/praktikum roles
 * Runs alongside main JobSpy scraper for maximum internship coverage
 */

require('dotenv').config({ path: '.env.local' });
const { spawnSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
const { processIncomingJob } = require('../scrapers/shared/processor.cjs');

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  
  const fetchWithTimeout = typeof fetch !== 'undefined' ? async (fetchUrl, fetchOptions = {}) => {
    const timeout = 60000; // 60 seconds (increased for GitHub Actions)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(fetchUrl, {
        ...fetchOptions,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      // Wrap network errors to ensure they're retryable
      if (error instanceof TypeError && error.message?.includes('fetch failed')) {
        const networkError = new Error(`Network error: ${error.message}`);
        networkError.name = 'NetworkError';
        networkError.cause = error;
        throw networkError;
      }
      throw error;
    }
  } : undefined;
  
  return createClient(url, key, { 
    auth: { persistSession: false },
    db: { schema: 'public' },
    ...(fetchWithTimeout ? { global: { fetch: fetchWithTimeout } } : {})
  });
}

// Retry helper with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      // Enhanced network error detection
      const errorMessage = error?.message || String(error || '');
      const errorName = error?.name || '';
      const isNetworkError = 
        errorName === 'NetworkError' ||
        errorName === 'AbortError' ||
        errorName === 'TypeError' ||
        errorMessage.toLowerCase().includes('fetch failed') ||
        errorMessage.toLowerCase().includes('network') ||
        errorMessage.toLowerCase().includes('timeout') ||
        errorMessage.toLowerCase().includes('econnrefused') ||
        errorMessage.toLowerCase().includes('enotfound') ||
        errorMessage.toLowerCase().includes('econnreset') ||
        errorMessage.toLowerCase().includes('etimedout') ||
        (error instanceof TypeError && errorMessage.toLowerCase().includes('fetch'));
      
      if (!isNetworkError || attempt === maxRetries - 1) {
        throw error; // Don't retry non-network errors or on last attempt
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(`⚠️  Network error (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`, errorMessage);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
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

// Extract language requirements (comprehensive - includes all visa-seeking languages)
function extractLanguageRequirements(description) {
  if (!description) return [];
  const desc = description.toLowerCase();
  const languages = [];
  
  // Comprehensive language map - includes all visa-seeking languages
  const languageMap = {
    // EU languages
    'english': 'English', 'anglais': 'English', 'fluent in english': 'English', 'native english': 'English',
    'english speaker': 'English', 'english speaking': 'English', 'english language': 'English', 'english proficiency': 'English',
    'french': 'French', 'français': 'French', 'francais': 'French', 'fluent in french': 'French', 'native french': 'French',
    'french speaker': 'French', 'french speaking': 'French',
    'german': 'German', 'deutsch': 'German', 'fluent in german': 'German', 'native german': 'German',
    'german speaker': 'German', 'german speaking': 'German',
    'spanish': 'Spanish', 'español': 'Spanish', 'espanol': 'Spanish', 'castellano': 'Spanish',
    'fluent in spanish': 'Spanish', 'native spanish': 'Spanish', 'spanish speaker': 'Spanish', 'spanish speaking': 'Spanish',
    'italian': 'Italian', 'italiano': 'Italian', 'fluent in italian': 'Italian', 'native italian': 'Italian',
    'italian speaker': 'Italian', 'italian speaking': 'Italian',
    'dutch': 'Dutch', 'nederlands': 'Dutch', 'fluent in dutch': 'Dutch', 'native dutch': 'Dutch',
    'dutch speaker': 'Dutch', 'dutch speaking': 'Dutch',
    'portuguese': 'Portuguese', 'português': 'Portuguese', 'portugues': 'Portuguese',
    'fluent in portuguese': 'Portuguese', 'native portuguese': 'Portuguese', 'portuguese speaker': 'Portuguese',
    'polish': 'Polish', 'polski': 'Polish', 'fluent in polish': 'Polish', 'native polish': 'Polish',
    'polish speaker': 'Polish', 'polish speaking': 'Polish',
    'swedish': 'Swedish', 'svenska': 'Swedish', 'fluent in swedish': 'Swedish', 'native swedish': 'Swedish',
    'swedish speaker': 'Swedish',
    'danish': 'Danish', 'dansk': 'Danish', 'fluent in danish': 'Danish', 'native danish': 'Danish',
    'danish speaker': 'Danish',
    'finnish': 'Finnish', 'suomi': 'Finnish', 'fluent in finnish': 'Finnish', 'native finnish': 'Finnish',
    'finnish speaker': 'Finnish',
    'czech': 'Czech', 'čeština': 'Czech', 'fluent in czech': 'Czech', 'native czech': 'Czech',
    'czech speaker': 'Czech',
    'romanian': 'Romanian', 'română': 'Romanian', 'romana': 'Romanian',
    'fluent in romanian': 'Romanian', 'native romanian': 'Romanian', 'romanian speaker': 'Romanian',
    'hungarian': 'Hungarian', 'magyar': 'Hungarian', 'fluent in hungarian': 'Hungarian', 'native hungarian': 'Hungarian',
    'hungarian speaker': 'Hungarian',
    'greek': 'Greek', 'ελληνικά': 'Greek', 'fluent in greek': 'Greek', 'native greek': 'Greek',
    'greek speaker': 'Greek',
    'bulgarian': 'Bulgarian', 'български': 'Bulgarian', 'fluent in bulgarian': 'Bulgarian', 'native bulgarian': 'Bulgarian',
    'bulgarian speaker': 'Bulgarian',
    'croatian': 'Croatian', 'hrvatski': 'Croatian', 'fluent in croatian': 'Croatian', 'native croatian': 'Croatian',
    'croatian speaker': 'Croatian',
    'serbian': 'Serbian', 'српски': 'Serbian', 'fluent in serbian': 'Serbian', 'native serbian': 'Serbian',
    'serbian speaker': 'Serbian',
    'russian': 'Russian', 'русский': 'Russian', 'fluent in russian': 'Russian', 'native russian': 'Russian',
    'russian speaker': 'Russian', 'russian speaking': 'Russian',
    'ukrainian': 'Ukrainian', 'українська': 'Ukrainian', 'fluent in ukrainian': 'Ukrainian', 'native ukrainian': 'Ukrainian',
    'ukrainian speaker': 'Ukrainian',
    // Middle Eastern & Central Asian
    'arabic': 'Arabic', 'العربية': 'Arabic', 'fluent in arabic': 'Arabic', 'native arabic': 'Arabic',
    'arabic speaker': 'Arabic', 'arabic speaking': 'Arabic',
    'turkish': 'Turkish', 'türkçe': 'Turkish', 'turkce': 'Turkish', 'fluent in turkish': 'Turkish', 'native turkish': 'Turkish',
    'turkish speaker': 'Turkish', 'turkish speaking': 'Turkish',
    'hebrew': 'Hebrew', 'עברית': 'Hebrew', 'fluent in hebrew': 'Hebrew', 'native hebrew': 'Hebrew',
    'hebrew speaker': 'Hebrew',
    'persian': 'Persian', 'farsi': 'Persian', 'فارسی': 'Persian', 'fluent in persian': 'Persian',
    'fluent in farsi': 'Persian', 'native persian': 'Persian', 'native farsi': 'Persian',
    'persian speaker': 'Persian', 'farsi speaker': 'Persian',
    'urdu': 'Urdu', 'اردو': 'Urdu', 'fluent in urdu': 'Urdu', 'native urdu': 'Urdu',
    'urdu speaker': 'Urdu',
    // Asian languages
    'japanese': 'Japanese', '日本語': 'Japanese', 'nihongo': 'Japanese', 'fluent in japanese': 'Japanese',
    'native japanese': 'Japanese', 'japanese speaker': 'Japanese', 'japanese speaking': 'Japanese',
    'japanese language': 'Japanese', 'japanese proficiency': 'Japanese',
    'chinese': 'Chinese', '中文': 'Chinese', 'mandarin': 'Chinese', 'fluent in chinese': 'Chinese',
    'fluent in mandarin': 'Chinese', 'native chinese': 'Chinese', 'native mandarin': 'Chinese',
    'chinese speaker': 'Chinese', 'mandarin speaker': 'Chinese', 'chinese speaking': 'Chinese',
    'mandarin speaking': 'Chinese', 'chinese language': 'Chinese', 'mandarin language': 'Chinese',
    'chinese proficiency': 'Chinese', 'mandarin proficiency': 'Chinese',
    'cantonese': 'Cantonese', 'fluent in cantonese': 'Cantonese', 'native cantonese': 'Cantonese',
    'cantonese speaker': 'Cantonese', 'cantonese speaking': 'Cantonese',
    'korean': 'Korean', '한국어': 'Korean', 'fluent in korean': 'Korean', 'native korean': 'Korean',
    'korean speaker': 'Korean', 'korean speaking': 'Korean', 'korean language': 'Korean', 'korean proficiency': 'Korean',
    'hindi': 'Hindi', 'हिन्दी': 'Hindi', 'fluent in hindi': 'Hindi', 'native hindi': 'Hindi',
    'hindi speaker': 'Hindi', 'hindi speaking': 'Hindi', 'hindi language': 'Hindi', 'hindi proficiency': 'Hindi',
    'thai': 'Thai', 'ไทย': 'Thai', 'fluent in thai': 'Thai', 'native thai': 'Thai',
    'thai speaker': 'Thai', 'thai speaking': 'Thai', 'thai language': 'Thai', 'thai proficiency': 'Thai',
    'vietnamese': 'Vietnamese', 'tiếng việt': 'Vietnamese', 'fluent in vietnamese': 'Vietnamese',
    'native vietnamese': 'Vietnamese', 'vietnamese speaker': 'Vietnamese', 'vietnamese speaking': 'Vietnamese',
    'indonesian': 'Indonesian', 'bahasa indonesia': 'Indonesian', 'fluent in indonesian': 'Indonesian',
    'native indonesian': 'Indonesian', 'indonesian speaker': 'Indonesian',
    'tagalog': 'Tagalog', 'filipino': 'Tagalog', 'fluent in tagalog': 'Tagalog', 'fluent in filipino': 'Tagalog',
    'native tagalog': 'Tagalog', 'native filipino': 'Tagalog', 'tagalog speaker': 'Tagalog', 'filipino speaker': 'Tagalog',
    'malay': 'Malay', 'bahasa melayu': 'Malay', 'fluent in malay': 'Malay', 'native malay': 'Malay',
    'malay speaker': 'Malay',
    'bengali': 'Bengali', 'বাংলা': 'Bengali', 'fluent in bengali': 'Bengali', 'native bengali': 'Bengali',
    'bengali speaker': 'Bengali',
    'tamil': 'Tamil', 'தமிழ்': 'Tamil', 'fluent in tamil': 'Tamil', 'native tamil': 'Tamil',
    'tamil speaker': 'Tamil',
    'telugu': 'Telugu', 'తెలుగు': 'Telugu', 'fluent in telugu': 'Telugu', 'native telugu': 'Telugu',
    'telugu speaker': 'Telugu',
  };
  
  for (const [keyword, lang] of Object.entries(languageMap)) {
    if (desc.includes(keyword) && !languages.includes(lang)) {
      languages.push(lang);
    }
  }
  
  // Remove duplicates and return
  return [...new Set(languages)];
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
    // Prioritize description field, fallback to company_description + skills
    const description = (
      (j.description && j.description.trim().length > 50 ? j.description : '') ||
      (j.company_description || '') ||
      (j.skills || '')
    ).trim();
    
    // Process through standardization pipe
    const processed = processIncomingJob({
      title: j.title,
      company: j.company,
      location: j.location,
      description: description,
      url: j.job_url || j.url,
      posted_at: j.posted_at,
    }, {
      source,
    });
    
    // For internships-only scraper, ensure it's marked as internship
    const categories = ['internship', 'early-career'];
    
    // Generate job_hash
    const job_hash = hashJob(j.title, processed.company, j.location);
    
    return {
      ...processed,
      job_hash,
      categories, // Override: this scraper only finds internships
      is_internship: true, // Force internship flag
      is_graduate: false, // Mutually exclusive
      is_early_career: false, // Mutually exclusive (this is internship, not entry-level)
      experience_required: 'internship',
    };
  });
  const unique = Array.from(new Map(rows.map(r=>[r.job_hash,r])).values());
  let savedCount = 0;
  let failedCount = 0;
  
  for (let i=0;i<unique.length;i+=150){
    const slice = unique.slice(i,i+150);
    
    try {
      const result = await retryWithBackoff(async () => {
        const upsertResult = await supabase
          .from('jobs')
          .upsert(slice, { onConflict: 'job_hash', ignoreDuplicates: false });
        if (upsertResult.error) {
          const isNetworkError = upsertResult.error.message?.includes('fetch failed') || 
                               upsertResult.error.message?.includes('network') ||
                               upsertResult.error.message?.includes('timeout');
          if (isNetworkError) throw upsertResult.error;
        }
        return upsertResult;
      }, 3, 1000);
      
      if (result.error) {
        console.error(`❌ Upsert error (batch ${i/150 + 1}):`, result.error.message);
        failedCount += slice.length;
      } else {
        console.log(`✅ Saved ${slice.length} internship jobs (batch ${i/150 + 1})`);
        savedCount += slice.length;
      }
    } catch (error) {
      console.error(`❌ Fatal upsert error after retries (batch ${i/150 + 1}):`, error.message);
      failedCount += slice.length;
    }
  }
  
  console.log(`📊 Save summary: ${savedCount} saved, ${failedCount} failed out of ${unique.length} total`);
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

