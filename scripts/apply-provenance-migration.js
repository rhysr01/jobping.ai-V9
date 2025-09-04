#!/usr/bin/env node

/**
 * Apply Provenance Tracking Migration
 * 
 * This script adds provenance tracking fields to the matches table
 * to track AI matching performance, costs, and fallback reasons.
 * 
 * Run with: node scripts/apply-provenance-migration.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

async function applyProvenanceMigration() {
  console.log('🚀 Applying Provenance Tracking Migration...\n');

  // Check required environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL');
    console.error('   SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // Initialize Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '..', 'migration_add_provenance_tracking.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📋 Migration SQL loaded successfully');
    console.log('🔍 Checking current matches table structure...\n');

    // Check current table structure
    const { data: currentColumns, error: describeError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'matches')
      .eq('table_schema', 'public')
      .order('ordinal_position');

    if (describeError) {
      throw new Error(`Failed to describe matches table: ${describeError.message}`);
    }

    console.log('📊 Current matches table columns:');
    currentColumns?.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // Check if provenance columns already exist
    const existingProvenanceColumns = currentColumns?.filter(col => 
      ['match_algorithm', 'ai_model', 'prompt_version', 'ai_latency_ms', 
       'ai_cost_usd', 'cache_hit', 'fallback_reason'].includes(col.column_name)
    ) || [];

    if (existingProvenanceColumns.length > 0) {
      console.log('\n⚠️  Some provenance columns already exist:');
      existingProvenanceColumns.forEach(col => {
        console.log(`   ${col.column_name}: ${col.data_type}`);
      });
    }

    // Check if we need to apply the migration
    if (existingProvenanceColumns.length === 7) {
      console.log('\n✅ All provenance columns already exist. Migration not needed.');
      return;
    }

    console.log('\n🔧 Applying migration...');

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`   Executing statement ${i + 1}/${statements.length}...`);
        
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement });
          if (error) {
            console.warn(`   ⚠️  Statement ${i + 1} had an issue:`, error.message);
          } else {
            console.log(`   ✅ Statement ${i + 1} executed successfully`);
          }
        } catch (error) {
          console.warn(`   ⚠️  Statement ${i + 1} failed:`, error.message);
        }
      }
    }

    // Verify the migration was applied
    console.log('\n🔍 Verifying migration...');
    const { data: newColumns, error: verifyError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'matches')
      .eq('table_schema', 'public')
      .order('ordinal_position');

    if (verifyError) {
      throw new Error(`Failed to verify migration: ${verifyError.message}`);
    }

    const newProvenanceColumns = newColumns?.filter(col => 
      ['match_algorithm', 'ai_model', 'prompt_version', 'ai_latency_ms', 
       'ai_cost_usd', 'cache_hit', 'fallback_reason'].includes(col.column_name)
    ) || [];

    console.log('\n📊 New provenance columns:');
    newProvenanceColumns.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    if (newProvenanceColumns.length === 7) {
      console.log('\n✅ Migration completed successfully!');
      console.log('🎯 Provenance tracking is now enabled for all new matches.');
    } else {
      console.log('\n⚠️  Migration may not have completed fully.');
      console.log(`   Expected 7 provenance columns, found ${newProvenanceColumns.length}`);
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n💡 If you encounter issues, you may need to:');
    console.error('   1. Run the SQL manually in your database');
    console.error('   2. Check that your service role has sufficient permissions');
    console.error('   3. Verify the migration SQL file exists');
    process.exit(1);
  }
}

// Run the migration
if (require.main === module) {
  applyProvenanceMigration()
    .then(() => {
      console.log('\n🎉 Provenance tracking migration completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { applyProvenanceMigration };
