#!/usr/bin/env tsx
/**
 * Check Jobs in Database
 * 
 * Verifies if there are jobs in the database for free signup to work
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.join(process.cwd(), '.env.local');
try {
  dotenv.config({ path: envPath });
} catch (error) {
  // Ignore if .env.local doesn't exist
}

import { getDatabaseClient } from '../Utils/databasePool';

console.log('🔍 Checking Jobs in Database\n');

async function checkJobs() {
  const supabase = getDatabaseClient();

  console.log('='.repeat(60));
  console.log('STEP 1: Check total active jobs');
  console.log('='.repeat(60));
  
  const { data: allJobs, error: allError } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);
  
  if (allError) {
    console.log('❌ Error:', allError);
    return;
  }
  
  console.log(`📊 Total active jobs: ${allJobs || 0}\n`);
  
  console.log('='.repeat(60));
  console.log('STEP 2: Check jobs with URLs');
  console.log('='.repeat(60));
  
  const { data: jobsWithUrls, error: urlsError } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .not('job_url', 'is', null)
    .neq('job_url', '');
  
  if (urlsError) {
    console.log('❌ Error:', urlsError);
    return;
  }
  
  console.log(`📊 Active jobs with URLs: ${jobsWithUrls || 0}\n`);
  
  if ((jobsWithUrls || 0) === 0) {
    console.log('❌ CRITICAL: No jobs with URLs found!');
    console.log('   Free signup will fail because it needs jobs to match.');
    console.log('\n💡 Solutions:');
    console.log('   1. Run scrapers to populate the database');
    console.log('   2. Check if jobs exist but job_url is null/empty');
    console.log('   3. Verify database connection');
    return;
  }
  
  console.log('='.repeat(60));
  console.log('STEP 3: Check jobs for Prague/Warsaw (free signup cities)');
  console.log('='.repeat(60));
  
  const { data: pragueJobs, error: pragueError } = await supabase
    .from('jobs')
    .select('id, title, company, city, job_url', { count: 'exact' })
    .eq('is_active', true)
    .eq('status', 'active')
    .ilike('city', '%Prague%')
    .not('job_url', 'is', null)
    .neq('job_url', '')
    .limit(10);
  
  const { data: warsawJobs, error: warsawError } = await supabase
    .from('jobs')
    .select('id, title, company, city, job_url', { count: 'exact' })
    .eq('is_active', true)
    .eq('status', 'active')
    .ilike('city', '%Warsaw%')
    .not('job_url', 'is', null)
    .neq('job_url', '')
    .limit(10);
  
  console.log(`📊 Prague jobs: ${pragueJobs?.length || 0}`);
  if (pragueJobs && pragueJobs.length > 0) {
    console.log('   Sample jobs:');
    pragueJobs.slice(0, 3).forEach((job: any) => {
      console.log(`     - ${job.title} at ${job.company}`);
    });
  }
  
  console.log(`\n📊 Warsaw jobs: ${warsawJobs?.length || 0}`);
  if (warsawJobs && warsawJobs.length > 0) {
    console.log('   Sample jobs:');
    warsawJobs.slice(0, 3).forEach((job: any) => {
      console.log(`     - ${job.title} at ${job.company}`);
    });
  }
  
  const totalCityJobs = (pragueJobs?.length || 0) + (warsawJobs?.length || 0);
  
  if (totalCityJobs === 0) {
    console.log('\n⚠️  WARNING: No jobs found for Prague or Warsaw!');
    console.log('   Free signup will fail for these cities.');
    console.log('\n💡 Check what cities have jobs:');
    
    const { data: cities } = await supabase
      .from('jobs')
      .select('city')
      .eq('is_active', true)
      .eq('status', 'active')
      .not('job_url', 'is', null)
      .neq('job_url', '')
      .limit(100);
    
    const uniqueCities = [...new Set(cities?.map(j => j.city).filter(Boolean) || [])];
    console.log(`   Available cities: ${uniqueCities.slice(0, 20).join(', ')}`);
  } else {
    console.log(`\n✅ Found ${totalCityJobs} jobs for Prague/Warsaw`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total active jobs: ${allJobs || 0}`);
  console.log(`Jobs with URLs: ${jobsWithUrls || 0}`);
  console.log(`Prague/Warsaw jobs: ${totalCityJobs}`);
  
  if ((jobsWithUrls || 0) === 0) {
    console.log('\n❌ Database is empty - need to run scrapers!');
  } else if (totalCityJobs === 0) {
    console.log('\n⚠️  No jobs for free signup cities - try different cities or run scrapers');
  } else {
    console.log('\n✅ Database looks good for free signup!');
  }
}

checkJobs().catch(console.error);

