#!/usr/bin/env node

/**
 * Remove RemoteOK Jobs from Database
 * Safely removes all jobs with source='remoteok' from the jobs table
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

console.log('🗑️  Removing RemoteOK Jobs from Database...\n');

// Check environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase environment variables');
  console.log('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.log('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅' : '❌');
  process.exit(1);
}

console.log('✅ Supabase credentials loaded');
console.log(`   URL: ${supabaseUrl.substring(0, 30)}...`);
console.log(`   Key: ${supabaseKey.substring(0, 8)}...\n`);

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function removeRemoteOKJobs() {
  try {
    // 1. First, let's see how many RemoteOK jobs we have
    console.log('📊 Checking current RemoteOK job count...');
    
    const { count: remoteokCount, error: countError } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'remoteok');

    if (countError) {
      console.error('❌ Failed to count RemoteOK jobs:', countError.message);
      return;
    }

    console.log(`✅ Found ${remoteokCount} RemoteOK jobs in database`);

    if (remoteokCount === 0) {
      console.log('ℹ️  No RemoteOK jobs to remove');
      return;
    }

    // 2. Show a sample of what will be removed
    console.log('\n📋 Sample of RemoteOK jobs to be removed:');
    const { data: sampleJobs, error: sampleError } = await supabase
      .from('jobs')
      .select('id, title, company, location, created_at')
      .eq('source', 'remoteok')
      .limit(5);

    if (sampleError) {
      console.error('❌ Failed to get sample jobs:', sampleError.message);
    } else {
      sampleJobs.forEach((job, index) => {
        console.log(`   ${index + 1}. ${job.title} at ${job.company} (${job.location})`);
      });
    }

    // 3. Confirm deletion
    console.log('\n⚠️  WARNING: This will permanently delete all RemoteOK jobs!');
    console.log(`   Jobs to be removed: ${remoteokCount}`);
    console.log('   This action cannot be undone.');
    
    // In a real script, you might want to add user confirmation here
    // For now, we'll proceed with the deletion
    
    console.log('\n🗑️  Proceeding with deletion...');

    // 4. Delete all RemoteOK jobs
    const { error: deleteError } = await supabase
      .from('jobs')
      .delete()
      .eq('source', 'remoteok');

    if (deleteError) {
      console.error('❌ Failed to delete RemoteOK jobs:', deleteError.message);
      return;
    }

    console.log('✅ Successfully deleted all RemoteOK jobs');

    // 5. Verify deletion
    console.log('\n🔍 Verifying deletion...');
    const { count: remainingCount, error: verifyError } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'remoteok');

    if (verifyError) {
      console.error('❌ Failed to verify deletion:', verifyError.message);
    } else {
      console.log(`✅ Remaining RemoteOK jobs: ${remainingCount}`);
    }

    // 6. Get updated total job count
    const { count: totalJobs, error: totalError } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      console.error('❌ Failed to get total job count:', totalError.message);
    } else {
      console.log(`✅ Total jobs in database: ${totalJobs}`);
    }

    // 7. Show source distribution
    console.log('\n📊 Updated job source distribution:');
    const { data: sourceStats, error: statsError } = await supabase
      .from('jobs')
      .select('source');

    if (statsError) {
      console.error('❌ Failed to get source statistics:', statsError.message);
    } else {
      const sourceCounts = {};
      sourceStats.forEach(job => {
        sourceCounts[job.source] = (sourceCounts[job.source] || 0) + 1;
      });

      Object.entries(sourceCounts)
        .sort(([,a], [,b]) => b - a)
        .forEach(([source, count]) => {
          console.log(`   ${source}: ${count} jobs`);
        });
    }

    console.log('\n🎉 RemoteOK job removal completed successfully!');
    console.log(`🗑️  Removed ${remoteokCount} RemoteOK jobs`);
    console.log('🚀 Database cleaned and ready for production!');

  } catch (error) {
    console.error('❌ Failed to remove RemoteOK jobs:', error.message);
  }
}

// Run the removal process
removeRemoteOKJobs().catch(error => {
  console.error('❌ Unexpected error:', error.message);
});
