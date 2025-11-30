#!/usr/bin/env node

/**
 * Search for all roles defined across career paths in the signup form
 * - Extracts all unique roles from CAREER_PATHS
 * - Searches for each role across all cities using JobSpy
 * - Saves results to database
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
  
  if (/remote|work\s+from\s+home|wfh|anywhere|fully\s+remote|100%\s+remote/i.test(text)) {
    return 'remote';
  }
  if (/hybrid|flexible|partially\s+remote|2-3\s+days|3\s+days\s+remote|mix\s+of\s+remote/i.test(text)) {
    return 'hybrid';
  }
  return 'on-site';
}

// Extract industries from description
function extractIndustries(description) {
  if (!description) return [];
  const desc = description.toLowerCase();
  const industries = [];
  const industryMap = {
    'technology': 'Technology', 'tech': 'Technology', 'software': 'Technology', 'fintech': 'Technology',
    'finance': 'Finance', 'financial': 'Finance', 'banking': 'Finance', 'investment': 'Finance',
    'consulting': 'Consulting', 'consultant': 'Consulting',
    'healthcare': 'Healthcare', 'health': 'Healthcare', 'medical': 'Healthcare',
    'retail': 'Retail', 'manufacturing': 'Manufacturing', 'energy': 'Energy', 'media': 'Media',
    'education': 'Education', 'government': 'Government', 'non-profit': 'Non-profit',
    'real estate': 'Real Estate', 'transportation': 'Transportation', 'automotive': 'Automotive',
    'fashion': 'Fashion', 'food': 'Food & Beverage', 'beverage': 'Food & Beverage', 'travel': 'Travel'
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
  if (/startup|start-up|early.?stage|seed.?stage|1-50|1 to 50/i.test(desc)) return 'startup';
  if (/scale.?up|scaleup|50-500|50 to 500|51-500/i.test(desc)) return 'scaleup';
  if (/enterprise|500\+|500\+|large.?company|multinational|fortune/i.test(desc)) return 'enterprise';
  const largeCompanies = ['google', 'microsoft', 'amazon', 'meta', 'facebook', 'apple', 'netflix', 'tesla', 'oracle', 'ibm', 'sap', 'salesforce'];
  if (largeCompanies.some(large => companyLower.includes(large))) return 'enterprise';
  return null;
}

// Extract skills from description
function extractSkills(description) {
  if (!description) return [];
  const desc = description.toLowerCase();
  const skills = [];
  const skillMap = {
    'excel': 'Excel', 'powerpoint': 'PowerPoint', 'word': 'Word', 'python': 'Python', 'r ': 'R', 'sql': 'SQL',
    'powerbi': 'PowerBI', 'tableau': 'Tableau', 'google analytics': 'Google Analytics', 'salesforce': 'Salesforce',
    'hubspot': 'HubSpot', 'jira': 'Jira', 'confluence': 'Confluence', 'slack': 'Slack',
    'microsoft office': 'Microsoft Office', 'google workspace': 'Google Workspace',
    'adobe creative suite': 'Adobe Creative Suite', 'canva': 'Canva',
    'data analysis': 'Data Analysis', 'project management': 'Project Management',
    'digital marketing': 'Digital Marketing', 'social media': 'Social Media',
    'email marketing': 'Email Marketing', 'content creation': 'Content Creation',
    'research': 'Research', 'presentation skills': 'Presentation Skills',
    'communication': 'Communication', 'leadership': 'Leadership',
    'problem solving': 'Problem Solving', 'analytical thinking': 'Analytical Thinking'
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

// Detect visa/sponsorship requirements
function detectVisaRequirements(description) {
  if (!description) return null;
  const desc = description.toLowerCase();
  if (/sponsorship|sponsor|work permit|visa sponsorship|require sponsorship|non-eu|non-uk/i.test(desc)) {
    return 'Non-EU (require sponsorship)';
  }
  if (/eu citizen|eea citizen|uk citizen|right to work|open to all/i.test(desc)) {
    return 'EU citizen';
  }
  return null;
}

// Extract salary range
function extractSalaryRange(description) {
  if (!description) return null;
  const patterns = [
    /(?:€|EUR|euro)\s*(\d{1,3}(?:[.,]\d{3})*(?:k|K)?)\s*-?\s*(\d{1,3}(?:[.,]\d{3})*(?:k|K)?)/i,
    /(?:£|GBP|pound)\s*(\d{1,3}(?:[.,]\d{3})*(?:k|K)?)\s*-?\s*(\d{1,3}(?:[.,]\d{3})*(?:k|K)?)/i,
    /(\d{1,3}(?:[.,]\d{3})*(?:k|K)?)\s*-?\s*(\d{1,3}(?:[.,]\d{3})*(?:k|K)?)\s*(?:€|EUR|£|GBP)/i,
    /salary[:\s]+(?:€|£|EUR|GBP)?\s*(\d{1,3}(?:[.,]\d{3})*(?:k|K)?)\s*-?\s*(\d{1,3}(?:[.,]\d{3})*(?:k|K)?)/i
  ];
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) return match[0].trim();
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
    const languages = extractLanguageRequirements(description);
    
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
  // Use wrapper script that ensures correct Python 3.11 environment
  const scriptPath = require('path').join(__dirname, 'run-jobspy-python.sh');
  if (require('fs').existsSync(scriptPath)) {
    console.log(`✅ Using Python wrapper: ${scriptPath}`);
    return scriptPath;
  }
  
  // Fallback: try direct Python 3.11 path
  const directPath = '/opt/homebrew/opt/python@3.11/bin/python3.11';
  if (require('fs').existsSync(directPath)) {
    console.log(`✅ Using Python: ${directPath}`);
    return directPath;
  }
  
  console.warn('⚠️  Python 3.11 not found - jobspy may fail');
  return 'python3';
}

// Extract all unique roles from CAREER_PATHS (matching the signup form)
function getAllRoles() {
  const CAREER_PATHS = [
    { 
      value: 'strategy', 
      roles: ['Business Analyst', 'Associate Consultant', 'Junior Consultant', 'Strategy Analyst', 'Consulting Intern', 'Junior Business Analyst', 'Transformation Analyst', 'Management Consulting Intern', 'Growth Consultant', 'Business Analyst Trainee', 'Junior Associate', 'Strategy Consultant', 'Digital Transformation Analyst', 'Operations Excellence Consultant', 'Business Strategy Intern']
    },
    { 
      value: 'finance', 
      roles: ['Financial Analyst', 'Finance Intern', 'Investment Banking Analyst', 'Risk Analyst', 'Audit Associate', 'Finance Trainee', 'FP&A Analyst', 'Credit Analyst', 'Investment Analyst', 'Junior Accountant', 'Corporate Finance Analyst', 'M&A Analyst', 'Treasury Analyst', 'Junior Tax Associate', 'Finance Graduate']
    },
    { 
      value: 'sales', 
      roles: ['Sales Development Representative (SDR)', 'Business Development Representative (BDR)', 'Inside Sales Representative', 'Account Executive', 'Business Development Associate', 'Sales Trainee', 'Customer Success Associate', 'Revenue Operations Analyst', 'Sales Operations Analyst', 'Graduate Sales Programme', 'Business Development Intern', 'Channel Sales Associate', 'Account Development Representative', 'Junior Sales Executive', 'Client Success Manager']
    },
    { 
      value: 'marketing', 
      roles: ['Marketing Intern', 'Social Media Intern', 'Digital Marketing Assistant', 'Marketing Coordinator', 'Growth Marketing Intern', 'Content Marketing Intern', 'Brand Assistant', 'Marketing Assistant', 'Junior Marketing Associate', 'Email Marketing Trainee', 'SEO/SEM Intern', 'Trade Marketing Intern', 'Marketing Graduate Programme', 'Junior B2B Marketing Coordinator', 'Marketing Campaign Assistant']
    },
    { 
      value: 'data', 
      roles: ['Data Analyst', 'Junior Data Analyst', 'Analytics Intern', 'Business Intelligence Intern', 'Data Analyst Trainee', 'Junior Data Scientist', 'Data Science Trainee', 'Junior Data Engineer', 'BI Engineer Intern', 'Analytics Associate', 'Data Analytics Graduate', 'Insights Analyst', 'Junior BI Developer', 'Data Assistant', 'Research & Analytics Intern']
    },
    { 
      value: 'operations', 
      roles: ['Operations Analyst', 'Supply Chain Analyst', 'Logistics Analyst', 'Procurement Analyst', 'Operations Intern', 'Inventory Planner', 'Operations Coordinator', 'Supply Chain Trainee', 'Logistics Planning Graduate', 'Demand Planning Intern', 'Operations Management Trainee', 'Fulfilment Specialist', 'Sourcing Analyst', 'Process Improvement Analyst', 'Supply Chain Graduate']
    },
    { 
      value: 'product', 
      roles: ['Associate Product Manager (APM)', 'Product Analyst', 'Product Management Intern', 'Junior Product Manager', 'Product Operations Associate', 'Product Designer', 'UX Intern', 'Product Research Assistant', 'Innovation Analyst', 'Product Development Coordinator', 'Product Marketing Assistant', 'Product Owner Graduate', 'Assistant Product Manager', 'Product Strategy Intern', 'Technical Product Specialist']
    },
    { 
      value: 'tech', 
      roles: ['Software Engineer Intern', 'Cloud Engineer Intern', 'DevOps Engineer Intern', 'Data Engineer Intern', 'Systems Analyst', 'IT Support Analyst', 'Application Support Analyst', 'Technology Analyst', 'QA/Test Analyst', 'Platform Engineer Intern', 'Cybersecurity Analyst', 'IT Operations Trainee', 'Technical Consultant', 'Solutions Engineer Graduate', 'IT Business Analyst']
    },
    { 
      value: 'sustainability', 
      roles: ['ESG Intern', 'Sustainability Strategy Intern', 'Junior ESG Analyst', 'Sustainability Graduate Programme', 'ESG Data Analyst Intern', 'Corporate Responsibility Intern', 'Environmental Analyst', 'Sustainability Reporting Trainee', 'Climate Analyst', 'Sustainable Finance Analyst', 'ESG Assurance Intern', 'Sustainability Communications Intern', 'Junior Impact Analyst', 'Sustainability Operations Assistant', 'Green Finance Analyst']
    },
    { 
      value: 'unsure', 
      roles: ['Graduate Trainee', 'Rotational Graduate Program', 'Management Trainee', 'Business Graduate Analyst', 'Entry Level Program Associate', 'Future Leaders Programme', 'General Analyst', 'Operations Graduate', 'Commercial Graduate', 'Early Careers Program', 'Project Coordinator', 'Business Operations Analyst', 'Emerging Leaders Associate', 'Corporate Graduate Programme', 'Generalist Trainee']
    },
  ];

  // Extract all unique roles
  const allRoles = new Set();
  CAREER_PATHS.forEach(path => {
    path.roles.forEach(role => allRoles.add(role));
  });

  return Array.from(allRoles);
}

async function main() {
  console.log('🎯 CAREER PATH ROLES SCRAPER');
  console.log('============================\n');

  // Get all unique roles from career paths
  const allRoles = getAllRoles();
  console.log(`📋 Found ${allRoles.length} unique roles across all career paths\n`);

  // Get target cities from environment or use defaults
  const parseJsonEnv = (value) => {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
      }
      return [];
    } catch (error) {
      return [];
    }
  };

  const targetCities = parseJsonEnv(process.env.TARGET_CITIES);
  const cities = targetCities.length > 0 ? targetCities : [
    'London', 'Manchester', 'Birmingham', 'Madrid', 'Barcelona', 
    'Berlin', 'Hamburg', 'Munich', 'Amsterdam', 'Brussels', 'Paris', 
    'Zurich', 'Milan', 'Rome', 'Dublin', 'Stockholm', 'Copenhagen', 
    'Vienna', 'Prague', 'Warsaw'
  ];

  const RESULTS_WANTED = parseInt(process.env.JOBSPY_RESULTS_WANTED || '15', 10);
  const JOBSPY_TIMEOUT_MS = parseInt(process.env.JOBSPY_TIMEOUT_MS || '20000', 10);
  const MAX_ROLES_PER_CITY = parseInt(process.env.MAX_ROLES_PER_CITY || '10', 10); // Limit roles per city to avoid too many searches

  // Limit roles to search (can be overridden via env)
  const rolesToSearch = process.env.ROLES_TO_SEARCH 
    ? process.env.ROLES_TO_SEARCH.split(',').map(r => r.trim()).filter(Boolean)
    : allRoles.slice(0, Math.min(allRoles.length, MAX_ROLES_PER_CITY * cities.length));

  console.log(`🌍 Searching ${cities.length} cities`);
  console.log(`🔍 Searching ${rolesToSearch.length} roles (${allRoles.length} total available)\n`);

  const collected = [];
  const pythonCmd = pickPythonCommand();
  let totalSearches = 0;

  for (const city of cities) {
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

    // Search for each role in this city
    const rolesForCity = rolesToSearch.slice(0, MAX_ROLES_PER_CITY);
    for (const role of rolesForCity) {
      totalSearches++;
      console.log(`\n🔎 [${totalSearches}] ${city}: "${role}"`);
      
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
  search_term='''${role.replace(/'/g, "''")}''',
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
      if (!py || py.status !== 0) {
        console.log(`   ❌ Failed`);
        continue;
      }
      const rows = parseCsv(py.stdout);
      console.log(`   ✅ Collected ${rows.length} jobs`);
      if (rows.length > 0) rows.forEach(r => collected.push(r));
      
      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // Quality filter similar to jobspy-save.cjs
  const hasFields = j => (
    (j.title||'').trim().length > 3 &&
    (j.company||'').trim().length > 1 &&
    (j.location||'').trim().length > 3 &&
    (j.job_url||j.url||'').trim().startsWith('http')
  );
  
  const qualityFiltered = collected.filter(j => hasFields(j));
  
  console.log(`\n📊 Total collected: ${collected.length}`);
  console.log(`✅ Passing quality gate: ${qualityFiltered.length}`);
  
  await saveJobs(qualityFiltered, 'jobspy-career-roles');
  console.log(`✅ Career Path Roles: total_saved=${qualityFiltered.length}`);
  console.log('🎉 Done');
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { main };

