#!/usr/bin/env node

/**
 * Check JobSpy Save Status
 * 
 * Checks if JobSpy jobs are being saved successfully after the fetch failed fix
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function checkJobSpyStatus() {
  console.log('🔍 Checking JobSpy Save Status...\n');
  
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    console.error('❌ Missing Supabase credentials');
    console.error('   Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const supabase = createClient(url, key);

  try {
    // Check last 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    
    const { data: recentJobs, error } = await supabase
      .from('jobs')
      .select('source, created_at')
      .in('source', ['jobspy-indeed', 'jobspy-internships', 'jobspy-career-roles'])
      .gte('created_at', twoHoursAgo)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Database error:', error.message);
      process.exit(1);
    }

    console.log('📊 JobSpy Jobs Status (Last 2 Hours):');
    console.log('='.repeat(50));

    if (!recentJobs || recentJobs.length === 0) {
      console.log('\n⚠️  No JobSpy jobs found in last 2 hours');
      console.log('\n💡 Possible reasons:');
      console.log('   1. No scraper run yet (runs every 4 hours)');
      console.log('   2. Jobs still failing to save (check GitHub Actions logs)');
      console.log('   3. All jobs filtered out by categorization');
      console.log('\n🔍 Check GitHub Actions:');
      console.log('   https://github.com/YOUR_REPO/actions');
      console.log('   Look for "Automated Job Scraping" workflow');
      return;
    }

    // Group by source
    const bySource = {};
    recentJobs.forEach(job => {
      bySource[job.source] = (bySource[job.source] || 0) + 1;
    });

    console.log('\n✅ JobSpy Jobs Found:');
    Object.entries(bySource).forEach(([source, count]) => {
      console.log(`   ${source}: ${count} jobs`);
    });

    const total = recentJobs.length;
    const latest = new Date(recentJobs[0].created_at);
    const hoursAgo = (Date.now() - latest.getTime()) / (1000 * 60 * 60);
    const minutesAgo = Math.round((Date.now() - latest.getTime()) / (1000 * 60));

    console.log(`\n📅 Latest Job: ${minutesAgo} minutes ago (${hoursAgo.toFixed(2)} hours)`);
    console.log(`📊 Total: ${total} jobs in last 2 hours`);

    if (hoursAgo < 1) {
      console.log('\n✅ SUCCESS: Jobs are being saved successfully!');
      console.log('   The fetch failed fix appears to be working.');
    } else if (hoursAgo < 4) {
      console.log('\n⚠️  WARNING: No very recent jobs');
      console.log('   Check if scraper ran in last hour');
    } else {
      console.log('\n❌ ERROR: No recent jobs found');
      console.log('   Check GitHub Actions logs for errors');
    }

    // Check last 24 hours for comparison
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: dayJobs } = await supabase
      .from('jobs')
      .select('source')
      .in('source', ['jobspy-indeed', 'jobspy-internships', 'jobspy-career-roles'])
      .gte('created_at', oneDayAgo);

    if (dayJobs && dayJobs.length > 0) {
      const dayBySource = {};
      dayJobs.forEach(job => {
        dayBySource[job.source] = (dayBySource[job.source] || 0) + 1;
      });

      console.log('\n📈 Last 24 Hours Comparison:');
      Object.entries(dayBySource).forEach(([source, count]) => {
        const recent = bySource[source] || 0;
        const trend = recent > 0 ? '✅' : '❌';
        console.log(`   ${trend} ${source}: ${count} total (${recent} in last 2h)`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking status:', error.message);
    process.exit(1);
  }
}

checkJobSpyStatus();

