#!/usr/bin/env node

/**
 * Backfill missing city/country data from location strings
 * Run this script to fix existing jobs in the database
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Import after env is loaded
let getDatabaseClient: any;

  // Parse location function (matches scrapers/utils.ts)
function parseLocation(location: string): { city: string; country: string } {
  if (!location) return { city: '', country: '' };
  const loc = location.toLowerCase().trim();
  
  const isRemote = /remote|work\s+from\s+home|wfh|anywhere/i.test(loc);
  if (isRemote) return { city: '', country: '' };
  
  // Known EU cities from signup form (only these are valid)
  const euCities = new Set([
    'dublin', 'london', 'paris', 'amsterdam', 'manchester', 'birmingham',
    'madrid', 'barcelona', 'berlin', 'hamburg', 'munich', 'zurich',
    'milan', 'rome', 'brussels', 'stockholm', 'copenhagen', 'vienna',
    'prague', 'warsaw'
  ]);
  
  const parts = loc.split(',').map(p => p.trim()).filter(Boolean);
  let city = parts.length > 0 ? parts[0] : loc;
  let country = parts.length > 1 ? parts[parts.length - 1] : '';
  
  // Clean up city name - remove common suffixes like "ENG", "GB", "DE", etc.
  city = city.replace(/\s+(eng|gb|de|fr|es|it|nl|be|ch|ie|se|dk|at|cz|pl)$/i, '');
  
  if (parts.length === 1 && euCities.has(city)) {
    country = '';
  }
  
  // If we have a country code, normalize it
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

async function backfillLocations() {
  // Dynamic import to avoid top-level await
  const module = await import('@/Utils/databasePool');
  getDatabaseClient = module.getDatabaseClient;
  const supabase = getDatabaseClient();
  
  console.log('🔍 Finding jobs with missing city/country data...');
  
  // Get jobs missing city or country - process ALL jobs (no limit)
  let allJobs: any[] = [];
  let offset = 0;
  const pageSize = 1000;
  let fetchError: any = null;
  
  console.log('🔍 Fetching all jobs with missing city/country data...');
  
  while (true) {
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('id, location, city, country')
      .eq('is_active', true)
      .or('city.is.null,city.eq.,country.is.null,country.eq.')
      .not('location', 'is', null)
      .neq('location', '')
      .range(offset, offset + pageSize - 1);
    
    fetchError = error;
    if (fetchError) {
      console.error('❌ Error fetching jobs:', fetchError);
      break;
    }
    
    if (!jobs || jobs.length === 0) {
      break;
    }
    
    allJobs = allJobs.concat(jobs);
    console.log(`   Fetched ${allJobs.length} jobs so far...`);
    
    if (jobs.length < pageSize) {
      break; // Last page
    }
    
    offset += pageSize;
  }
  
  const jobs = allJobs;
  
  if (fetchError) {
    console.error('❌ Error fetching jobs:', fetchError);
    return;
  }
  
  if (!jobs || jobs.length === 0) {
    console.log('✅ No jobs need location backfill');
    return;
  }
  
  console.log(`📊 Found ${jobs.length} jobs needing location backfill`);
  
  let updated = 0;
  let errors = 0;
  
  // Process in batches
  const batchSize = 100;
  for (let i = 0; i < jobs.length; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize);
    
    for (const job of batch) {
      const { city, country } = parseLocation(job.location || '');
      
      const updates: any = {};
      if ((!job.city || job.city === '') && city) {
        updates.city = city;
      }
      if ((!job.country || job.country === '') && country) {
        updates.country = country;
      }
      
      if (Object.keys(updates).length > 0) {
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
    
    console.log(`✅ Processed ${Math.min(i + batchSize, jobs.length)}/${jobs.length} jobs (${updated} updated, ${errors} errors)`);
  }
  
  console.log('\n✅ Location backfill complete!');
  console.log(`   Updated: ${updated} jobs`);
  console.log(`   Errors: ${errors} jobs`);
}

backfillLocations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

