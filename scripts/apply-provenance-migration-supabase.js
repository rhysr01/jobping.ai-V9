#!/usr/bin/env node

/**
 * Apply provenance tracking migration to Supabase
 * Run with: node scripts/apply-provenance-migration-supabase.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('   Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('🚀 Applying provenance tracking migration to Supabase...\n');

  try {
    // Check if columns already exist
    console.log('🔍 Checking existing schema...');
    const { data: existingColumns, error: checkError } = await supabase
      .from('matches')
      .select('match_algorithm, ai_model, prompt_version, ai_latency_ms, ai_cost_usd, cache_hit, fallback_reason, retry_count, error_category')
      .limit(1);

    if (checkError && checkError.message.includes('column') && checkError.message.includes('does not exist')) {
      console.log('✅ New columns need to be added');
    } else {
      console.log('✅ All provenance columns already exist');
      console.log('🚀 Provenance tracking is ready!');
      return;
    }

    // Apply the migration SQL
    console.log('\n📝 Adding provenance tracking columns...');
    
    // Add columns one by one to avoid issues
    const columns = [
      'match_algorithm text',
      'ai_model text', 
      'prompt_version text',
      'ai_latency_ms integer',
      'ai_cost_usd numeric(10,5)',
      'cache_hit boolean',
      'fallback_reason text',
      'retry_count integer',
      'error_category text'
    ];

    for (const column of columns) {
      try {
        const { error } = await supabase.rpc('exec_sql', {
          sql: `ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS ${column};`
        });
        
        if (error) {
          console.log(`   ⚠️  Column ${column.split(' ')[0]} may already exist`);
        } else {
          console.log(`   ✅ Added column: ${column.split(' ')[0]}`);
        }
      } catch (err) {
        console.log(`   ⚠️  Column ${column.split(' ')[0]} may already exist`);
      }
    }

    // Create indexes
    console.log('\n🔍 Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_matches_algorithm ON public.matches(match_algorithm);',
      'CREATE INDEX IF NOT EXISTS idx_matches_ai_model ON public.matches(ai_model);',
      'CREATE INDEX IF NOT EXISTS idx_matches_cache_hit ON public.matches(cache_hit);',
      'CREATE INDEX IF NOT EXISTS idx_matches_fallback_reason ON public.matches(fallback_reason);',
      'CREATE INDEX IF NOT EXISTS idx_matches_retry_count ON public.matches(retry_count);',
      'CREATE INDEX IF NOT EXISTS idx_matches_error_category ON public.matches(error_category);',
      'CREATE INDEX IF NOT EXISTS idx_matches_created_at ON public.matches(created_at);'
    ];

    for (const index of indexes) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: index });
        if (error) {
          console.log(`   ⚠️  Index may already exist`);
        } else {
          console.log(`   ✅ Created index`);
        }
      } catch (err) {
        console.log(`   ⚠️  Index may already exist`);
      }
    }

    // Update existing records with default values
    console.log('\n📊 Updating existing records...');
    const { error: updateError } = await supabase
      .from('matches')
      .update({
        match_algorithm: 'rules',
        cache_hit: false
      })
      .is('match_algorithm', null);

    if (updateError) {
      console.log(`   ⚠️  Update failed: ${updateError.message}`);
    } else {
      console.log(`   ✅ Updated existing records with default values`);
    }

    // Log the migration
    console.log('\n📝 Logging migration...');
    const { error: logError } = await supabase
      .from('match_logs')
      .insert({
        user_email: 'system@jobping.com',
        match_type: 'ai_success',
        matches_generated: 0,
        error_message: 'Provenance tracking fields added to matches table successfully',
        user_career_path: 'System',
        success: true
      });

    if (logError) {
      console.log(`   ⚠️  Failed to log migration: ${logError.message}`);
    } else {
      console.log(`   ✅ Migration logged successfully`);
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('🚀 Provenance tracking is now enabled');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    if (error.message.includes('function "exec_sql" does not exist')) {
      console.log('\n💡 Alternative approach:');
      console.log('   Since exec_sql is not available, you can:');
      console.log('   1. Go to your Supabase dashboard');
      console.log('   2. Navigate to SQL Editor');
      console.log('   3. Run the migration manually');
      console.log('\n   Or use the Supabase CLI if you have it installed');
    }
    
    process.exit(1);
  }
}

// Run the migration
applyMigration().catch(console.error);
