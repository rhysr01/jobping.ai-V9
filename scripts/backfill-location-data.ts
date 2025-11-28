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
  const city = parts.length > 0 ? parts[0] : loc;
  let country = parts.length > 1 ? parts[parts.length - 1] : '';
  
  if (parts.length === 1 && euCities.has(city)) {
    country = '';
  }
  
  const capitalizedCity = city.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
  
  return { 
    city: capitalizedCity || city, 
    country: country ? country.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ') : ''
  };
}

async function backfillLocations() {
  // Dynamic import to avoid top-level await
  const module = await import('@/Utils/databasePool');
  getDatabaseClient = module.getDatabaseClient;
  const supabase = getDatabaseClient();
  
  console.log('🔍 Finding jobs with missing city/country data...');
  
  // Get jobs missing city or country
  const { data: jobs, error: fetchError } = await supabase
    .from('jobs')
    .select('id, location, city, country')
    .eq('is_active', true)
    .or('city.is.null,city.eq.,country.is.null,country.eq.')
    .not('location', 'is', null)
    .neq('location', '');
  
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

