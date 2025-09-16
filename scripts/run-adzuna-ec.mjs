import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import adzunaFns from './adzuna-job-functions.js';
import utils from '../scrapers/utils.js';

const { scrapeAllCities } = adzunaFns;
const { convertToDatabaseFormat, parseLocation } = utils;

async function run() {
  try {
    console.log('🚀 Starting Adzuna EC ESM runner...');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    let { jobs } = await scrapeAllCities({ verbose: true });

    // Respect remote exclusion preference
    const includeRemote = String(process.env.INCLUDE_REMOTE || '').toLowerCase() !== 'false' ? true : false;
    if (!includeRemote) {
      const before = jobs.length;
      jobs = jobs.filter((job) => !parseLocation(job.location).isRemote);
      console.log(`🚫 Remote filter active: ${before - jobs.length} remote jobs removed (kept ${jobs.length}).`);
    }

    let savedCount = 0;
    const batchSize = 50;
    for (let i = 0; i < jobs.length; i += batchSize) {
      const batch = jobs.slice(i, i + batchSize).map((job) => {
        const dbJob = convertToDatabaseFormat(job);
        const { metadata, ...clean } = dbJob;
        return clean;
      });

      console.log(`💾 Saving batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(jobs.length / batchSize)} (${batch.length} jobs)...`);
      const { error } = await supabase
        .from('jobs')
        .upsert(batch, { onConflict: 'job_hash', ignoreDuplicates: false });
      if (error) {
        console.error('❌ Batch error:', error.message);
      } else {
        savedCount += batch.length;
        console.log(`✅ Saved ${savedCount}/${jobs.length} jobs`);
      }
    }

    console.log(`\n✅ Adzuna: ${savedCount} jobs saved to database`);
  } catch (err) {
    console.error('❌ Adzuna ESM runner failed:', err?.message || err);
    process.exit(1);
  }
}

run();


