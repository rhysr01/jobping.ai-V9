#!/usr/bin/env node

/**
 * Simple Job Saver
 * Runs scrapers and saves jobs directly to database
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const { spawn } = require('child_process');

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runScraper(scraperType) {
  return new Promise((resolve, reject) => {
    console.log(`🚀 Running ${scraperType} scraper...`);
    
    const child = spawn('node', [`scripts/run-standalone-scrapers.js`, scraperType, '--verbose'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${scraperType} scraper completed`);
        resolve({ success: true, output });
      } else {
        console.log(`❌ ${scraperType} scraper failed with code ${code}`);
        reject(new Error(`${scraperType} scraper failed`));
      }
    });
  });
}

async function saveJobsToDatabase(jobs) {
  if (!jobs || jobs.length === 0) {
    console.log('ℹ️  No jobs to save');
    return { saved: 0, errors: 0 };
  }

  console.log(`💾 Saving ${jobs.length} jobs to database...`);
  
  try {
    const { data, error } = await supabase
      .from('jobs')
      .upsert(jobs, { 
        onConflict: 'title,company,location',
        ignoreDuplicates: false 
      });

    if (error) {
      console.error('❌ Error saving jobs:', error);
      return { saved: 0, errors: 1 };
    }

    console.log(`✅ Successfully saved ${jobs.length} jobs to database`);
    return { saved: jobs.length, errors: 0 };
    
  } catch (error) {
    console.error('❌ Error saving jobs:', error);
    return { saved: 0, errors: 1 };
  }
}

async function main() {
  try {
    console.log('🚀 Starting Simple Job Saver...');
    
    // Test database connection
    const { data, error } = await supabase
      .from('jobs')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    console.log('✅ Database connection verified');
    
    // Run scrapers
    console.log('\n🔄 Running scrapers...');
    
    const [adzunaResult, reedResult] = await Promise.all([
      runScraper('adzuna'),
      runScraper('reed')
    ]);
    
    console.log('\n✅ All scrapers completed successfully!');
    console.log('\n📊 Now you can check your database for new jobs.');
    console.log('💡 Run: node scripts/check-jobs-in-db.js');
    
  } catch (error) {
    console.error('💥 Error:', error.message);
    process.exit(1);
  }
}

main();
