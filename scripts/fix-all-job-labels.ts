#!/usr/bin/env node

/**
 * Fix all existing jobs with proper labeling:
 * - Extract city/country from location
 * - Classify internship vs graduate
 * - Clean company names
 * - Set proper categories and flags
 */

import dotenv from 'dotenv';
import path from 'path';
import { existsSync } from 'fs';

const envPath = path.join(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Import after env is loaded
let getDatabaseClient: any;

// Parse location function
function parseLocation(location: string): { city: string; country: string } {
  if (!location) return { city: '', country: '' };
  const loc = location.toLowerCase().trim();
  
  const isRemote = /remote|work\s+from\s+home|wfh|anywhere/i.test(loc);
  if (isRemote) return { city: '', country: '' };
  
  const euCities = new Set([
    'dublin', 'london', 'paris', 'amsterdam', 'manchester', 'birmingham',
    'madrid', 'barcelona', 'berlin', 'hamburg', 'munich', 'zurich',
    'milan', 'rome', 'brussels', 'stockholm', 'copenhagen', 'vienna',
    'prague', 'warsaw'
  ]);
  
  const parts = loc.split(',').map(p => p.trim()).filter(Boolean);
  let city = parts.length > 0 ? parts[0] : loc;
  let country = parts.length > 1 ? parts[parts.length - 1] : '';
  
  // Clean up city name
  city = city.replace(/\s+(eng|gb|de|fr|es|it|nl|be|ch|ie|se|dk|at|cz|pl)$/i, '');
  
  if (parts.length === 1 && euCities.has(city)) {
    country = '';
  }
  
  // Normalize country codes
  if (country) {
    const countryMap: Record<string, string> = {
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
  
  const capitalizedCity = city.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
  
  return { 
    city: capitalizedCity || city, 
    country: country || ''
  };
}

// Classify job type
function classifyJobType(title: string, description: string): { isInternship: boolean; isGraduate: boolean } {
  const titleLower = (title || '').toLowerCase();
  const descLower = (description || '').toLowerCase();
  const text = `${titleLower} ${descLower}`;
  
  const internshipTerms = [
    'intern', 'internship', 'stage', 'praktikum', 'prácticas', 'tirocinio',
    'stagiaire', 'stagiar', 'becario', 'werkstudent', 'placement',
    'summer intern', 'winter intern', 'co-op', 'coop'
  ];
  
  const graduateTerms = [
    'graduate', 'grad scheme', 'grad program', 'graduate programme',
    'graduate program', 'graduate scheme', 'graduate trainee',
    'management trainee', 'trainee program', 'trainee programme',
    'rotational program', 'rotational programme', 'campus hire',
    'new grad', 'recent graduate'
  ];
  
  const isInternship = internshipTerms.some(term => 
    titleLower.includes(term) || descLower.includes(term)
  );
  
  const isGraduate = !isInternship && graduateTerms.some(term => 
    titleLower.includes(term) || descLower.includes(term)
  );
  
  return { isInternship, isGraduate };
}

// Clean company name
function cleanCompanyName(company: string): string {
  return (company || '').trim().replace(/\s+/g, ' ');
}

// Detect work environment from location and description
function detectWorkEnvironment(location: string, description: string): string {
  const loc = (location || '').toLowerCase();
  const desc = (description || '').toLowerCase();
  const text = `${loc} ${desc}`;
  
  if (/remote|work\s+from\s+home|wfh|anywhere|fully\s+remote|100%\s+remote/i.test(text)) {
    return 'remote';
  }
  if (/hybrid|flexible|partially\s+remote|2-3\s+days|3\s+days\s+remote|mix\s+of\s+remote/i.test(text)) {
    return 'hybrid';
  }
  return 'on-site';
}

// Extract language requirements
function extractLanguageRequirements(description: string): string[] {
  if (!description) return [];
  const desc = description.toLowerCase();
  const languages: string[] = [];
  const languageMap: Record<string, string> = {
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

async function fixAllJobs() {
  const module = await import('@/Utils/databasePool');
  getDatabaseClient = module.getDatabaseClient;
  const supabase = getDatabaseClient();
  
  console.log('🔍 Fetching all active jobs...');
  
  // Fetch ALL jobs in batches (no limit)
  let allJobs: any[] = [];
  let offset = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('id, title, company, location, city, country, description, categories, is_internship, is_graduate, is_early_career, experience_required, work_environment, language_requirements')
      .eq('is_active', true)
      .range(offset, offset + pageSize - 1);
    
    if (error) {
      console.error('❌ Error fetching jobs:', error);
      break;
    }
    
    if (!jobs || jobs.length === 0) {
      break;
    }
    
    allJobs = allJobs.concat(jobs);
    console.log(`   Fetched ${allJobs.length} jobs...`);
    
    if (jobs.length < pageSize) {
      break;
    }
    
    offset += pageSize;
  }
  
  console.log(`\n📊 Processing ${allJobs.length} jobs...\n`);
  
  let updated = 0;
  let errors = 0;
  const batchSize = 100;
  
  for (let i = 0; i < allJobs.length; i += batchSize) {
    const batch = allJobs.slice(i, i + batchSize);
    
    for (const job of batch) {
      const updates: any = {};
      let needsUpdate = false;
      
      // Fix location
      if (job.location && (!job.city || job.city === '' || !job.country || job.country === '')) {
        const { city, country } = parseLocation(job.location);
        if (city && (!job.city || job.city === '')) {
          updates.city = city;
          needsUpdate = true;
        }
        if (country && (!job.country || job.country === '')) {
          updates.country = country;
          needsUpdate = true;
        }
      }
      
      // Fix company name
      const cleanCompany = cleanCompanyName(job.company || '');
      if (cleanCompany !== job.company) {
        updates.company = cleanCompany;
        needsUpdate = true;
      }
      
      // Classify job type
      const { isInternship, isGraduate } = classifyJobType(
        job.title || '',
        job.description || ''
      );
      
      // Update is_internship flag
      if (job.is_internship !== isInternship) {
        updates.is_internship = isInternship;
        needsUpdate = true;
      }
      
      // Update is_graduate flag
      if (job.is_graduate !== isGraduate) {
        updates.is_graduate = isGraduate;
        needsUpdate = true;
      }
      
      // Set is_early_career flag (mutually exclusive: internship OR graduate OR early-career)
      // Maps to form: "Entry Level" (when NOT internship and NOT graduate)
      const isEarlyCareer = !isInternship && !isGraduate;
      if ((job as any).is_early_career !== isEarlyCareer) {
        updates.is_early_career = isEarlyCareer;
        needsUpdate = true;
      }
      
      // Ensure mutual exclusivity: if one is true, others must be false
      if (isInternship && (job.is_graduate || (job as any).is_early_career)) {
        updates.is_graduate = false;
        updates.is_early_career = false;
        needsUpdate = true;
      } else if (isGraduate && (job.is_internship || (job as any).is_early_career)) {
        updates.is_internship = false;
        updates.is_early_career = false;
        needsUpdate = true;
      } else if (isEarlyCareer && (job.is_internship || job.is_graduate)) {
        updates.is_internship = false;
        updates.is_graduate = false;
        needsUpdate = true;
      }
      
      // Update categories
      const categories = Array.isArray(job.categories) ? [...job.categories] : ['early-career'];
      if (!categories.includes('early-career')) {
        categories.push('early-career');
      }
      if (isInternship && !categories.includes('internship')) {
        categories.push('internship');
      }
      if (JSON.stringify(categories.sort()) !== JSON.stringify((job.categories || []).sort())) {
        updates.categories = categories;
        needsUpdate = true;
      }
      
      // Update experience_required
      const newExperience = isInternship ? 'internship' : (isGraduate ? 'graduate' : 'entry-level');
      if (job.experience_required !== newExperience) {
        updates.experience_required = newExperience;
        needsUpdate = true;
      }
      
      // Fix work environment
      const detectedWorkEnv = detectWorkEnvironment(job.location || '', job.description || '');
      if (!job.work_environment || job.work_environment === 'on-site' || job.work_environment !== detectedWorkEnv) {
        // Only update if it's missing or if current value is wrong (e.g., marked on-site but has remote indicators)
        if (!job.work_environment || (job.work_environment === 'on-site' && detectedWorkEnv !== 'on-site')) {
          updates.work_environment = detectedWorkEnv;
          needsUpdate = true;
        }
      }
      
      // Extract and update language requirements
      const languages = extractLanguageRequirements(job.description || '');
      const currentLanguages = Array.isArray(job.language_requirements) ? job.language_requirements : [];
      if (languages.length > 0 && JSON.stringify(languages.sort()) !== JSON.stringify(currentLanguages.sort())) {
        updates.language_requirements = languages;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        updates.updated_at = new Date().toISOString();
        
        const { error } = await supabase
          .from('jobs')
          .update(updates)
          .eq('id', job.id);
        
        if (error) {
          console.error(`❌ Error updating job ${job.id}:`, error.message);
          errors++;
        } else {
          updated++;
        }
      }
    }
    
    console.log(`✅ Processed ${Math.min(i + batchSize, allJobs.length)}/${allJobs.length} jobs (${updated} updated, ${errors} errors)`);
  }
  
  console.log('\n✅ Job labeling fix complete!');
  console.log(`   Total jobs processed: ${allJobs.length}`);
  console.log(`   Updated: ${updated} jobs`);
  console.log(`   Errors: ${errors} jobs`);
}

fixAllJobs()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

