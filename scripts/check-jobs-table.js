#!/usr/bin/env node

/**
 * Check what's actually in the jobs table
 * This will help us understand the data structure
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

async function checkJobsTable() {
  console.log('🔍 Checking jobs table structure and data...\n');

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
  }

  // Create Supabase client
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // 1. Check table structure
    console.log('📋 Checking jobs table structure...');
    
    const { data: sampleJob, error: structureError } = await supabase
      .from('jobs')
      .select('*')
      .limit(1);

    if (structureError) {
      console.error('❌ Failed to query jobs table:', structureError.message);
      return;
    }

    if (sampleJob && sampleJob.length > 0) {
      const job = sampleJob[0];
      console.log('✅ Jobs table structure:');
      console.log('='.repeat(50));
      
      Object.entries(job).forEach(([key, value]) => {
        const type = typeof value;
        const isNull = value === null;
        const displayValue = isNull ? 'NULL' : 
                           type === 'string' ? `"${value}"` : 
                           type === 'object' ? JSON.stringify(value) : value;
        
        console.log(`${key.padEnd(25)} | ${type.padEnd(10)} | ${displayValue}`);
      });
      
      console.log('='.repeat(50));
    } else {
      console.log('ℹ️  Jobs table is empty');
      return;
    }

    // 2. Check total count
    console.log('\n📊 Checking total job count...');
    
    const { count: totalJobs, error: countError } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Failed to count jobs:', countError.message);
    } else {
      console.log(`✅ Total jobs in database: ${totalJobs}`);
    }

    // 3. Check source field values
    console.log('\n🔍 Checking source field values...');
    
    const { data: sources, error: sourcesError } = await supabase
      .from('jobs')
      .select('source')
      .not('source', 'is', null);

    if (sourcesError) {
      console.error('❌ Failed to get sources:', sourcesError.message);
    } else {
      const uniqueSources = [...new Set(sources.map(job => job.source))];
      console.log('✅ Unique source values found:');
      uniqueSources.forEach(source => {
        const count = sources.filter(job => job.source === source).length;
        console.log(`   ${source}: ${count} jobs`);
      });
    }

    // 4. Check recent jobs
    console.log('\n📅 Checking recent jobs...');
    
    const { data: recentJobs, error: recentError } = await supabase
      .from('jobs')
      .select('title, company, location, source, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentError) {
      console.error('❌ Failed to get recent jobs:', recentError.message);
    } else {
      console.log('✅ Most recent jobs:');
      recentJobs.forEach((job, index) => {
        const date = new Date(job.created_at).toLocaleDateString();
        console.log(`   ${index + 1}. ${job.title}`);
        console.log(`      Company: ${job.company}, Location: ${job.location}`);
        console.log(`      Source: ${job.source}, Created: ${date}`);
        console.log('');
      });
    }

    // 5. Check for Adzuna jobs specifically
    console.log('\n🎯 Looking for Adzuna jobs...');
    
    // Try different possible source values
    const possibleSources = ['adzuna', 'Adzuna', 'ADZUNA', 'adzuna-api', 'adzuna_scraper'];
    
    for (const source of possibleSources) {
      const { data: adzunaJobs, error: adzunaError } = await supabase
        .from('jobs')
        .select('count')
        .eq('source', source)
        .limit(1);

      if (!adzunaError && adzunaJobs && adzunaJobs.length > 0) {
        console.log(`✅ Found jobs with source: "${source}"`);
        
        // Get actual count
        const { count: adzunaCount } = await supabase
          .from('jobs')
          .select('*', { count: 'exact', head: true })
          .eq('source', source);
        
        console.log(`   Total Adzuna jobs: ${adzunaCount}`);
        break;
      }
    }

    console.log('\n🎉 Jobs table analysis complete!');

  } catch (error) {
    console.error('❌ Check failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the check
checkJobsTable().catch(console.error);
