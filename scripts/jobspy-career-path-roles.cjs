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
cols=[c for c in ['title','company','location','job_url','company_description','skills','description'] if c in df.columns]
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

