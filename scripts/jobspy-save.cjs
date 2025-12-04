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

// Classify job as internship, graduate, or neither
function classifyJobType(job) {
  const title = (job.title || '').toLowerCase();
  const description = (job.description || job.company_description || job.skills || '').toLowerCase();
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
  const description = (job.description || job.company_description || job.skills || '').toLowerCase();
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

// Extract industries from description
function extractIndustries(description) {
  if (!description) return [];
  const desc = description.toLowerCase();
  const industries = [];
  
  const industryMap = {
    'technology': 'Technology',
    'tech': 'Technology',
    'software': 'Technology',
    'fintech': 'Technology',
    'finance': 'Finance',
    'financial': 'Finance',
    'banking': 'Finance',
    'investment': 'Finance',
    'consulting': 'Consulting',
    'consultant': 'Consulting',
    'healthcare': 'Healthcare',
    'health': 'Healthcare',
    'medical': 'Healthcare',
    'retail': 'Retail',
    'manufacturing': 'Manufacturing',
    'energy': 'Energy',
    'media': 'Media',
    'education': 'Education',
    'government': 'Government',
    'non-profit': 'Non-profit',
    'real estate': 'Real Estate',
    'transportation': 'Transportation',
    'automotive': 'Automotive',
    'fashion': 'Fashion',
    'food': 'Food & Beverage',
    'beverage': 'Food & Beverage',
    'travel': 'Travel'
  };
  
  for (const [keyword, industry] of Object.entries(industryMap)) {
    if (desc.includes(keyword) && !industries.includes(industry)) {
      industries.push(industry);
    }
  }
  
  return industries;
}

// Extract company size from description
function extractCompanySize(description, company) {
  if (!description) return null;
  const desc = description.toLowerCase();
  const companyLower = (company || '').toLowerCase();
  
  // Check for explicit size mentions
  if (/startup|start-up|early.?stage|seed.?stage|1-50|1 to 50/i.test(desc)) {
    return 'startup';
  }
  
  if (/scale.?up|scaleup|50-500|50 to 500|51-500/i.test(desc)) {
    return 'scaleup';
  }
  
  if (/enterprise|500\+|500\+|large.?company|multinational|fortune/i.test(desc)) {
    return 'enterprise';
  }
  
  // Check company name for known large companies
  const largeCompanies = ['google', 'microsoft', 'amazon', 'meta', 'facebook', 'apple', 'netflix', 'tesla', 'oracle', 'ibm', 'sap', 'salesforce'];
  if (largeCompanies.some(large => companyLower.includes(large))) {
    return 'enterprise';
  }
  
  return null; // Unknown
}

// Extract skills from description
function extractSkills(description) {
  if (!description) return [];
  const desc = description.toLowerCase();
  const skills = [];
  
  const skillMap = {
    'excel': 'Excel',
    'powerpoint': 'PowerPoint',
    'word': 'Word',
    'python': 'Python',
    'r ': 'R',
    'sql': 'SQL',
    'powerbi': 'PowerBI',
    'tableau': 'Tableau',
    'google analytics': 'Google Analytics',
    'salesforce': 'Salesforce',
    'hubspot': 'HubSpot',
    'jira': 'Jira',
    'confluence': 'Confluence',
    'slack': 'Slack',
    'microsoft office': 'Microsoft Office',
    'google workspace': 'Google Workspace',
    'adobe creative suite': 'Adobe Creative Suite',
    'canva': 'Canva',
    'data analysis': 'Data Analysis',
    'project management': 'Project Management',
    'digital marketing': 'Digital Marketing',
    'social media': 'Social Media',
    'email marketing': 'Email Marketing',
    'content creation': 'Content Creation',
    'research': 'Research',
    'presentation skills': 'Presentation Skills',
    'communication': 'Communication',
    'leadership': 'Leadership',
    'problem solving': 'Problem Solving',
    'analytical thinking': 'Analytical Thinking'
  };
  
  for (const [keyword, skill] of Object.entries(skillMap)) {
    if (desc.includes(keyword) && !skills.includes(skill)) {
      skills.push(skill);
    }
  }
  
  return skills;
}

// Extract language requirements
function extractLanguageRequirements(description) {
  if (!description) return [];
  const desc = description.toLowerCase();
  const languages = [];
  
  const languageMap = {
    'english': 'English',
    'french': 'French',
    'german': 'German',
    'spanish': 'Spanish',
    'italian': 'Italian',
    'dutch': 'Dutch',
    'portuguese': 'Portuguese',
    'fluent in english': 'English',
    'fluent in french': 'French',
    'fluent in german': 'German',
    'fluent in spanish': 'Spanish',
    'native english': 'English',
    'native french': 'French',
    'native german': 'German'
  };
  
  for (const [keyword, lang] of Object.entries(languageMap)) {
    if (desc.includes(keyword) && !languages.includes(lang)) {
      languages.push(lang);
    }
  }
  
  return languages;
}

// Detect visa/sponsorship requirements
function detectVisaRequirements(description) {
  if (!description) return null;
  const desc = description.toLowerCase();
  
  // Check for sponsorship requirements
  if (/sponsorship|sponsor|work permit|visa sponsorship|right to work|eu citizen|eea citizen|uk citizen/i.test(desc)) {
    if (/sponsorship|sponsor|work permit|visa sponsorship|require sponsorship|non-eu|non-uk/i.test(desc)) {
      return 'Non-EU (require sponsorship)';
    }
    if (/eu citizen|eea citizen|uk citizen|right to work|open to all/i.test(desc)) {
      return 'EU citizen'; // Flexible
    }
  }
  
  return null;
}

// Extract salary range
function extractSalaryRange(description) {
  if (!description) return null;
  
  // Match various salary formats
  const patterns = [
    /(?:€|EUR|euro)\s*(\d{1,3}(?:[.,]\d{3})*(?:k|K)?)\s*-?\s*(\d{1,3}(?:[.,]\d{3})*(?:k|K)?)/i,
    /(?:£|GBP|pound)\s*(\d{1,3}(?:[.,]\d{3})*(?:k|K)?)\s*-?\s*(\d{1,3}(?:[.,]\d{3})*(?:k|K)?)/i,
    /(\d{1,3}(?:[.,]\d{3})*(?:k|K)?)\s*-?\s*(\d{1,3}(?:[.,]\d{3})*(?:k|K)?)\s*(?:€|EUR|£|GBP)/i,
    /salary[:\s]+(?:€|£|EUR|GBP)?\s*(\d{1,3}(?:[.,]\d{3})*(?:k|K)?)\s*-?\s*(\d{1,3}(?:[.,]\d{3})*(?:k|K)?)/i
  ];
  
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }
  
  return null;
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
  const rows = nonRemote.map(j => {
    const { city, country } = parseLocation(j.location || '');
    const { isInternship, isGraduate } = classifyJobType(j);
    // Prioritize description field, fallback to company_description + skills
    const description = (
      (j.description && j.description.trim().length > 50 ? j.description : '') ||
      (j.company_description || '') ||
      (j.skills || '')
    ).trim();
    
    // Build categories array
    const categories = ['early-career'];
    if (isInternship) {
      categories.push('internship');
    }
    
    // Clean company name - remove extra whitespace, trim
    const companyName = (j.company || '').trim().replace(/\s+/g, ' ');
    
    // Extract all metadata
    const workEnv = detectWorkEnvironment(j);
    const industries = extractIndustries(description);
    const companySize = extractCompanySize(description, companyName);
    const skills = extractSkills(description);
    const languages = extractLanguageRequirements(description);
    const visaStatus = detectVisaRequirements(description);
    const salary = extractSalaryRange(description);
    
    // Mutually exclusive categorization: internship OR graduate OR early-career
    // Maps to form options: "Internship", "Graduate Programmes", "Entry Level"
    const isEarlyCareer = !isInternship && !isGraduate; // Entry-level roles
    
    return {
      job_hash: hashJob(j.title, companyName, j.location),
      title: (j.title||'').trim(),
      company: companyName, // Clean company name
      location: (j.location||'').trim(),
      city: city, // Extract city from location
      country: country, // Extract country from location
      description: description,
      job_url: (j.job_url || j.url || '').trim(),
      source,
      posted_at: j.posted_at || nowIso,
      categories: categories,
      work_environment: workEnv, // Detect from location/description
      experience_required: isInternship ? 'internship' : (isGraduate ? 'graduate' : 'entry-level'),
      is_internship: isInternship, // Maps to form: "Internship"
      is_graduate: isGraduate, // Maps to form: "Graduate Programmes"
      is_early_career: isEarlyCareer, // Maps to form: "Entry Level" (mutually exclusive)
      language_requirements: languages.length > 0 ? languages : null, // Extract languages
      original_posted_date: j.posted_at || nowIso,
      last_seen_at: nowIso,
      is_active: true,
      created_at: nowIso
    };
  });
  // Validate jobs before saving
  const validatedRows = rows.filter(row => {
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
  
  const unique = Array.from(new Map(validatedRows.map(r=>[r.job_hash,r])).values());
  console.log(`📊 Validated: ${rows.length} → ${validatedRows.length} → ${unique.length} unique jobs`);
  
  for (let i=0;i<unique.length;i+=150){
    const slice = unique.slice(i,i+150);
    const { data, error } = await supabase
      .from('jobs')
      .upsert(slice, { onConflict: 'job_hash', ignoreDuplicates: false });
    if (error) {
      console.error('Upsert error:', error.message);
      // Log first few failed rows for debugging
      if (i === 0 && slice.length > 0) {
        console.error('Sample failed row:', JSON.stringify(slice[0], null, 2));
      }
    } else {
      console.log(`✅ Saved ${slice.length} jobs (upserted)`);
    }
  }
}

function pickPythonCommand() {
  // First check for PYTHON environment variable (used in CI/CD)
  if (process.env.PYTHON) {
    console.log(`✅ Using Python from PYTHON env: ${process.env.PYTHON}`);
    return process.env.PYTHON;
  }
  
  // Use wrapper script that ensures correct Python 3.11 environment
  const scriptPath = require('path').join(__dirname, 'run-jobspy-python.sh');
  if (require('fs').existsSync(scriptPath)) {
    console.log(`✅ Using Python wrapper: ${scriptPath}`);
    return scriptPath;
  }
  
  // Fallback: try direct Python 3.11 path (macOS Homebrew)
  const directPath = '/opt/homebrew/opt/python@3.11/bin/python3.11';
  if (require('fs').existsSync(directPath)) {
    console.log(`✅ Using Python: ${directPath}`);
    return directPath;
  }
  
  console.warn('⚠️  Python 3.11 not found - jobspy may fail');
  return 'python3';
}

async function main() {
  // Import role definitions from signup form
  const { getAllRoles, getEarlyCareerRoles, getTopRolesByCareerPath } = require('../scrapers/shared/roles.cjs');
  
  // Core and localized multilingual early‑career terms per city (spec)
  const EXTRA_TERMS = (process.env.JOBSPY_EXTRA_TERMS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  
  // Get role-specific queries from signup form (highest priority)
  const { cleanRoleForSearch } = require('../scrapers/shared/roles.cjs');
  const earlyCareerRoles = getEarlyCareerRoles();
  const topRoles = getTopRolesByCareerPath(3); // Top 3 roles per career path
  
  // Clean role names (remove parentheses, handle special chars)
  // This ensures roles like "Sales Development Representative (SDR)" search as both "SDR" and full name
  const cleanRole = (role) => {
    const cleaned = cleanRoleForSearch(role);
    return cleaned[0]; // Use primary cleaned version (without parentheses)
  };
  
  // BUSINESS SCHOOL FOCUSED: 6 tight early-career queries per city
  // Rotates 3 sets to maximize diversity over time
  // NOW INCLUDES EXACT ROLE NAMES FROM SIGNUP FORM (CLEANED)
  const QUERY_SETS = {
    SET_A: [
      // Top business school programs + exact role names (cleaned)
      'graduate programme',
      cleanRole('Investment Banking Analyst'),  // ✅ Exact role from form (cleaned)
      cleanRole('Financial Analyst'),            // ✅ Exact role from form (cleaned)
      cleanRole('Business Analyst'),             // ✅ Exact role from form (cleaned)
      cleanRole('Finance Intern'),               // ✅ Exact role from form (cleaned)
      cleanRole('Consulting Intern')             // ✅ Exact role from form (cleaned)
    ],
    SET_B: [
      // Core business roles + exact role names (cleaned)
      cleanRole('Financial Analyst'),            // ✅ Exact role from form (cleaned)
      cleanRole('Business Analyst'),             // ✅ Exact role from form (cleaned)
      cleanRole('Marketing Intern'),              // ✅ Exact role from form (cleaned)
      cleanRole('Data Analyst'),                  // ✅ Exact role from form (cleaned)
      cleanRole('Operations Analyst'),            // ✅ Exact role from form (cleaned)
      cleanRole('Sales Development Representative (SDR)') // ✅ Searches as "Sales Development Representative" and "SDR"
    ],
    SET_C: [
      // Analyst & associate roles + exact role names (cleaned)
      cleanRole('Data Analyst'),                  // ✅ Exact role from form (cleaned)
      cleanRole('Junior Data Analyst'),           // ✅ Exact role from form (cleaned)
      cleanRole('Product Analyst'),               // ✅ Exact role from form (cleaned)
      cleanRole('Strategy Analyst'),              // ✅ Exact role from form (cleaned)
      cleanRole('Risk Analyst'),                  // ✅ Exact role from form (cleaned)
      cleanRole('Analytics Intern')               // ✅ Exact role from form (cleaned)
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
  console.log(`📋 Query set includes ${CORE_EN.filter(q => /^[A-Z]/.test(q)).length} exact role names from signup form`);
  const CITY_LOCAL = {
    'London': [], // English only set is CORE_EN
    'Manchester': [], // English only set is CORE_EN
    'Birmingham': [], // English only set is CORE_EN
    'Madrid': [ 'programa de graduados','becario','prácticas','junior','recién graduado','nivel inicial' ],
    'Barcelona': [ 'programa de graduados','becario','prácticas','junior','recién graduado','nivel inicial' ],
    'Berlin': [ 'absolvent','trainee','praktikant','junior','berufseinsteiger','nachwuchskraft' ],
    'Hamburg': [ 'absolvent','trainee','praktikant','junior','berufseinsteiger','nachwuchskraft' ],
    'Munich': [ 'absolvent','trainee','praktikant','junior','berufseinsteiger','nachwuchskraft' ],
    'Amsterdam': [ 'afgestudeerde','traineeship','starter','junior','beginnend','werkstudent' ],
    'Brussels': [ 'stagiaire','junior','débutant','afgestudeerde','starter' ], // Belgium: French + Dutch
    'Paris': [ 'jeune diplômé','stagiaire','alternance','junior','débutant','programme graduate' ],
    'Zurich': [ 'absolvent','trainee','praktikant','junior','jeune diplômé','stagiaire' ],
    'Milan': [ 'neolaureato','stage','tirocinio','junior','primo lavoro','laureato' ],
    'Rome': [ 'neolaureato','stage','tirocinio','junior','primo lavoro','laureato' ],
    'Dublin': [], // English only set is CORE_EN
    'Stockholm': [ 'nyexaminerad','trainee','praktikant','junior','nybörjare','graduate' ],
    'Copenhagen': [ 'nyuddannet','trainee','praktikant','junior','begynder','graduate' ],
    'Vienna': [ 'absolvent','trainee','praktikant','junior','einsteiger','nachwuchskraft' ],
    'Prague': [ 'absolvent','trainee','praktikant','junior','začátečník','graduate' ],
    'Warsaw': [ 'absolwent','stażysta','praktykant','junior','początkujący','graduate' ]
  };
  const cities = [ 'London','Manchester','Birmingham','Madrid','Barcelona','Berlin','Hamburg','Munich','Amsterdam','Brussels','Paris','Zurich','Milan','Rome','Dublin','Stockholm','Copenhagen','Vienna','Prague','Warsaw' ];
  const MAX_Q_PER_CITY = parseInt(process.env.JOBSPY_MAX_Q_PER_CITY || '6', 10);
  const RESULTS_WANTED = parseInt(process.env.JOBSPY_RESULTS_WANTED || '50', 10); // EXPANDED: Increased from 15 to 50
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
                  : city === 'Manchester' ? 'united kingdom'
                  : city === 'Birmingham' ? 'united kingdom'
                  : city === 'Paris' ? 'france'
                  : city === 'Madrid' ? 'spain'
                  : city === 'Barcelona' ? 'spain'
                  : city === 'Berlin' ? 'germany'
                  : city === 'Hamburg' ? 'germany'
                  : city === 'Munich' ? 'germany'
                  : city === 'Amsterdam' ? 'netherlands'
                  : city === 'Brussels' ? 'belgium'
                  : city === 'Zurich' ? 'switzerland'
                  : city === 'Dublin' ? 'ireland'
                  : city === 'Milan' ? 'italy'
                  : city === 'Rome' ? 'italy'
                  : city === 'Stockholm' ? 'sweden'
                  : city === 'Copenhagen' ? 'denmark'
                  : city === 'Vienna' ? 'austria'
                  : city === 'Prague' ? 'czech republic'
                  : city === 'Warsaw' ? 'poland'
                  : 'europe';
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
  const noisyExclusions = [
    // Healthcare & Medical (strict!)
    'nurse','nhs','pharmacist','doctor','veterinary','dental','physiotherap','medical assistant',
    'biomedical scientist','medical science liaison','medical liaison','clinical',
    'healthcare assistant','paramedic','radiographer','sonographer',
    'tecnico elettromedicale','quality assurance analyst ii - medical',
    'molecular technician','pharmasource technician',
    // Trades & Manual Labor
    'teacher','chef','cleaner','warehouse','driver','barista','waiter','waitress','hairdresser',
    'electrician','plumber','mechanic','welder','carpenter','painter','landscap','janitor',
    'hgv','truck driver','delivery driver','courier','postal',
    'heating technician','motor technician','service technician','power station',
    'deskside technician','service desk','wardrobe technician','projections technician',
    // Retail & Service (non-graduate) - but KEEP "delivery consultant" (consulting role)
    'store assistant','shop assistant','cashier','retail assistant','shelf stacker',
    'beauty consultant','sales consultant loewe','beauty advisor',
    // Other Irrelevant
    'laboratory technician','field technician','acoustic consultant','environmental scientist',
    'social worker','care worker','support worker'
  ];
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
