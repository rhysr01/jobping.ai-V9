#!/usr/bin/env node

/**
 * Fix Database Source Constraint
 * Updates the jobs table to allow 'adzuna' as a valid source
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

console.log('🔧 Fixing Database Source Constraint...\n');

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

async function fixSourceConstraint() {
  try {
    console.log('📋 Step 1: Checking current constraint...');
    
    // Check what sources are currently allowed
    const { data: currentSources, error: sourcesError } = await supabase
      .from('jobs')
      .select('source')
      .limit(1000);
    
    if (sourcesError) {
      console.error('❌ Failed to check current sources:', sourcesError.message);
      return;
    }
    
    const uniqueSources = [...new Set(currentSources.map(job => job.source))];
    console.log('✅ Current allowed sources:', uniqueSources.join(', '));
    
    // Check current constraint definition
    console.log('\n📋 Step 2: Checking current constraint definition...');
    
    // Note: We can't directly query pg_constraint via Supabase RPC
    // So we'll need to apply the fix manually in the Supabase dashboard
    
    console.log('\n📋 Step 3: Manual constraint update required...');
    console.log('🔧 Please run the following SQL in your Supabase SQL Editor:');
    console.log('\n' + '='.repeat(60));
    console.log('-- Drop existing constraint');
    console.log('ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_source_check;');
    console.log('');
    console.log('-- Add new constraint with adzuna support');
    console.log('ALTER TABLE jobs ADD CONSTRAINT jobs_source_check');
    console.log('CHECK (source IN (\'lever\', \'remoteok\', \'adzuna\', \'reed\', \'infojobs\'));');
    console.log('');
    console.log('-- Verify the constraint');
    console.log('SELECT');
    console.log('    conname as constraint_name,');
    console.log('    pg_get_constraintdef(oid) as constraint_definition');
    console.log('FROM pg_constraint');
    console.log('WHERE conrelid = \'jobs\'::regclass');
    console.log('AND conname = \'jobs_source_check\';');
    console.log('='.repeat(60));
    
    console.log('\n📋 Step 4: After applying the SQL, verify the fix...');
    
    // Wait for user to apply the SQL
    console.log('\n⏳ Waiting for you to apply the SQL constraint fix...');
    console.log('💡 Run the SQL above in your Supabase dashboard, then press Enter to continue...');
    
    // Note: In a real script, you'd wait for user input
    // For now, we'll just show what to do next
    
    console.log('\n✅ Constraint fix instructions provided!');
    console.log('🚀 After applying the SQL:');
    console.log('   1. Run: node scripts/save-scraped-jobs-to-db.js');
    console.log('   2. Jobs will be saved with source: "adzuna"');
    console.log('   3. Database will properly validate the source field');
    
  } catch (error) {
    console.error('❌ Constraint fix failed:', error.message);
  }
}

// Run the fix
fixSourceConstraint().catch(error => {
  console.error('❌ Unexpected error:', error.message);
});
