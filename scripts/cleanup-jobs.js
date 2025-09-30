#!/usr/bin/env node

/**
 * Job Database Cleanup Script
 * 
 * This script cleans up the jobs table to ensure all jobs have
 * the essential fields: company, location, and job_url
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupJobs() {
  try {
    console.log('🧹 Starting job database cleanup...\n');

    // Step 1: Check current state with pagination
    console.log('📊 Checking current job data quality...');
    let allJobs = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: batch, error: batchError } = await supabase
        .from('jobs')
        .select('id, company, location, location_name, job_url')
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (batchError) {
        console.error('❌ Error fetching jobs batch:', batchError);
        return;
      }

      if (batch && batch.length > 0) {
        allJobs = allJobs.concat(batch);
        page++;
        console.log(`   Fetched ${batch.length} jobs (total: ${allJobs.length})`);
      } else {
        hasMore = false;
      }

      // Safety check to prevent infinite loops
      if (page > 100) {
        console.warn('⚠️  Stopping at 100 pages to prevent infinite loop');
        break;
      }
    }

    const totalJobs = allJobs.length;
    const qualityJobs = allJobs.filter(job => 
      job.company && job.company.trim() !== '' &&
      (job.location && job.location.trim() !== '' || job.location_name && job.location_name.trim() !== '') &&
      job.job_url && job.job_url.trim() !== ''
    ).length;

    console.log(`📈 Before cleanup:`);
    console.log(`   Total jobs: ${totalJobs}`);
    console.log(`   Quality jobs: ${qualityJobs}`);
    console.log(`   Jobs to remove: ${totalJobs - qualityJobs}\n`);

    // Step 2: Get jobs to delete
    const jobsToDelete = allJobs.filter(job => 
      !job.company || job.company.trim() === '' ||
      (!job.location || job.location.trim() === '') && (!job.location_name || job.location_name.trim() === '') ||
      !job.job_url || job.job_url.trim() === ''
    );

    console.log(`🗑️  Deleting ${jobsToDelete.length} low-quality jobs...`);

    // Step 3: Delete jobs in batches
    const batchSize = 100;
    let deletedCount = 0;

    for (let i = 0; i < jobsToDelete.length; i += batchSize) {
      const batch = jobsToDelete.slice(i, i + batchSize);
      const ids = batch.map(job => job.id);

      const { error: deleteError } = await supabase
        .from('jobs')
        .delete()
        .in('id', ids);

      if (deleteError) {
        console.error(`❌ Error deleting batch ${i / batchSize + 1}:`, deleteError);
        continue;
      }

      deletedCount += batch.length;
      console.log(`   Deleted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} jobs`);
    }

    // Step 4: Remove duplicates based on job_url with pagination
    console.log('\n🔄 Removing duplicate jobs...');
    
    let remainingJobs = [];
    let remainingPage = 0;
    let remainingHasMore = true;

    while (remainingHasMore) {
      const { data: remainingBatch, error: remainingError } = await supabase
        .from('jobs')
        .select('id, job_url, created_at')
        .order('created_at', { ascending: true })
        .range(remainingPage * pageSize, (remainingPage + 1) * pageSize - 1);

      if (remainingError) {
        console.error('❌ Error fetching remaining jobs:', remainingError);
        return;
      }

      if (remainingBatch && remainingBatch.length > 0) {
        remainingJobs = remainingJobs.concat(remainingBatch);
        remainingPage++;
        console.log(`   Fetched ${remainingBatch.length} remaining jobs (total: ${remainingJobs.length})`);
      } else {
        remainingHasMore = false;
      }

      // Safety check
      if (remainingPage > 100) {
        console.warn('⚠️  Stopping remaining jobs fetch at 100 pages');
        break;
      }
    }

    // Group by job_url and keep only the first occurrence
    const urlGroups = {};
    const duplicatesToDelete = [];

    remainingJobs.forEach(job => {
      if (!urlGroups[job.job_url]) {
        urlGroups[job.job_url] = job.id;
      } else {
        duplicatesToDelete.push(job.id);
      }
    });

    if (duplicatesToDelete.length > 0) {
      console.log(`   Found ${duplicatesToDelete.length} duplicate jobs to remove...`);
      
      // Delete duplicates in batches
      for (let i = 0; i < duplicatesToDelete.length; i += batchSize) {
        const batch = duplicatesToDelete.slice(i, i + batchSize);
        
        const { error: deleteError } = await supabase
          .from('jobs')
          .delete()
          .in('id', batch);

        if (deleteError) {
          console.error(`❌ Error deleting duplicate batch:`, deleteError);
          continue;
        }
      }
    }

    // Step 5: Final quality check with pagination
    console.log('\n✅ Final quality check...');
    let finalStats = [];
    let finalPage = 0;
    let finalHasMore = true;

    while (finalHasMore) {
      const { data: finalBatch, error: finalError } = await supabase
        .from('jobs')
        .select('id, company, location, location_name, job_url')
        .range(finalPage * pageSize, (finalPage + 1) * pageSize - 1);

      if (finalError) {
        console.error('❌ Error fetching final stats:', finalError);
        return;
      }

      if (finalBatch && finalBatch.length > 0) {
        finalStats = finalStats.concat(finalBatch);
        finalPage++;
        console.log(`   Fetched ${finalBatch.length} final jobs (total: ${finalStats.length})`);
      } else {
        finalHasMore = false;
      }

      // Safety check
      if (finalPage > 100) {
        console.warn('⚠️  Stopping final stats fetch at 100 pages');
        break;
      }
    }

    const finalTotal = finalStats.length;
    const finalQuality = finalStats.filter(job => 
      job.company && job.company.trim() !== '' &&
      (job.location && job.location.trim() !== '' || job.location_name && job.location_name.trim() !== '') &&
      job.job_url && job.job_url.trim() !== ''
    ).length;

    console.log(`📊 After cleanup:`);
    console.log(`   Total jobs: ${finalTotal}`);
    console.log(`   Quality jobs: ${finalQuality}`);
    console.log(`   Jobs removed: ${totalJobs - finalTotal}`);
    console.log(`   Quality improvement: ${((finalQuality / finalTotal) * 100).toFixed(1)}%`);

    console.log('\n🎉 Database cleanup completed successfully!');
    console.log('💡 All remaining jobs now have company, location, and URL data.');

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupJobs();
