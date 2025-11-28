#!/usr/bin/env node
// SDR/BDR Tech Sales + Career Path Internships - COMPREHENSIVE

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
  console.log('🎯 TECH SALES (SDR/BDR) + CAREER PATH INTERNSHIPS\n');
  
  const SEARCHES = [
    // ==== PART 1: SDR/BDR TECH SALES (Dublin & London) ====
    { 
      city: 'Dublin', 
      country: 'ireland', 
      category: 'TECH SALES',
      terms: [
        'SDR', 'BDR', 'sales development representative',
        'business development representative', 'inside sales',
        'sales graduate', 'business development associate',
        'account development', 'sales trainee', 'SDR graduate'
      ]
    },
    { 
      city: 'London', 
      country: 'united kingdom', 
      category: 'TECH SALES',
      terms: [
        'SDR', 'BDR', 'sales development representative',
        'business development representative', 'inside sales',
        'sales graduate', 'business development associate',
        'account development', 'sales trainee', 'SDR intern'
      ]
    },
    
    // ==== PART 2: CAREER PATH INTERNSHIPS (ALL CITIES) ====
    // Finance
    { city: 'London', country: 'united kingdom', category: 'Finance Intern', terms: ['finance internship', 'investment intern', 'banking intern'] },
    { city: 'Dublin', country: 'ireland', category: 'Finance Intern', terms: ['finance internship', 'accounting intern'] },
    { city: 'Paris', country: 'france', category: 'Finance Intern', terms: ['stage finance', 'stage banque'] },
    { city: 'Frankfurt', country: 'germany', category: 'Finance Intern', terms: ['praktikum finance', 'praktikum banking'] },
    
    // Consulting
    { city: 'London', country: 'united kingdom', category: 'Consulting Intern', terms: ['consulting internship', 'strategy intern'] },
    { city: 'Dublin', country: 'ireland', category: 'Consulting Intern', terms: ['consulting internship', 'management consulting intern'] },
    { city: 'Paris', country: 'france', category: 'Consulting Intern', terms: ['stage consulting', 'stage stratégie'] },
    { city: 'Madrid', country: 'spain', category: 'Consulting Intern', terms: ['prácticas consultoría', 'prácticas estrategia'] },
    
    // Marketing
    { city: 'London', country: 'united kingdom', category: 'Marketing Intern', terms: ['marketing internship', 'digital marketing intern'] },
    { city: 'Amsterdam', country: 'netherlands', category: 'Marketing Intern', terms: ['marketing stage', 'digital marketing intern'] },
    { city: 'Berlin', country: 'germany', category: 'Marketing Intern', terms: ['marketing praktikum', 'digital marketing praktikum'] },
    { city: 'Barcelona', country: 'spain', category: 'Marketing Intern', terms: ['prácticas marketing', 'prácticas marketing digital'] },
    
    // Tech/Product
    { city: 'London', country: 'united kingdom', category: 'Tech Intern', terms: ['product intern', 'software intern'] },
    { city: 'Berlin', country: 'germany', category: 'Tech Intern', terms: ['product management praktikum', 'software praktikum'] },
    { city: 'Amsterdam', country: 'netherlands', category: 'Tech Intern', terms: ['product intern', 'tech intern'] },
    
    // Operations
    { city: 'London', country: 'united kingdom', category: 'Operations Intern', terms: ['operations internship', 'supply chain intern'] },
    { city: 'Dublin', country: 'ireland', category: 'Operations Intern', terms: ['operations internship', 'project management intern'] },
    { city: 'Paris', country: 'france', category: 'Operations Intern', terms: ['stage operations', 'stage supply chain'] },
  ];

  const collected = [];
  let totalSearches = 0;
  
  for (const search of SEARCHES) {
    if (search.category) {
      console.log(`\n🏙️  ${search.city} - ${search.category} (${search.terms.length} searches)`);
    }
    
    for (const term of search.terms) {
      totalSearches++;
      console.log(`🔎 [${totalSearches}] "${term}"`);
      
      const py = spawnSync(PYTHON, ['-c', `
from jobspy import scrape_jobs
df = scrape_jobs(
  site_name=['indeed', 'glassdoor', 'google', 'zip_recruiter'],
  search_term='${term}',
  location='${search.city}',
  country_indeed='${search.country}',
  results_wanted=25,
  hours_old=720
)
cols=[c for c in ['title','company','location','job_url','company_description'] if c in df.columns]
print(df[cols].to_csv(index=False))
`], { 
        encoding: 'utf8', 
        timeout: 35000,
        env: { ...process.env, PYTHONUNBUFFERED: '1' }
      });

      if (py.status === 0 && py.stdout) {
        const rows = parseCsv(py.stdout);
        console.log(`   ✅ ${rows.length}`);
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
  
  console.log(`\n🎉 SDR/BDR + Career Internships Complete!`);
  console.log(`   Tech Sales (SDR/BDR): Dublin + London`);
  console.log(`   Career Internships: Finance, Consulting, Marketing, Tech, Operations`);
  console.log(`   Total saved: ${unique.length} jobs`);
}

main().catch(console.error);

