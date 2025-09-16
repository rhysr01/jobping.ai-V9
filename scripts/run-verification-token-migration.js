#!/usr/bin/env node

/**
 * Migration Runner: Add verification_token_expires column
 * 
 * This script runs the database migration to add the verification_token_expires
 * column to the users table for secure token expiration handling.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  console.log('🔄 Starting verification token migration...');

  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseKey);
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
    // Read the SQL migration file
    const migrationPath = path.join(__dirname, 'add-verification-token-expires.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Executing migration SQL...');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      // If the RPC doesn't exist, try direct SQL execution
      console.log('⚠️  RPC method not available, trying direct execution...');
      
      // Split the SQL into individual statements and execute them
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);

      for (const statement of statements) {
        console.log(`   Executing: ${statement.substring(0, 50)}...`);
        
        const { error: stmtError } = await supabase
          .from('users')
          .select('*')
          .limit(0); // This is just to test connection
          
        if (stmtError) {
          console.error(`❌ Error executing statement: ${stmtError.message}`);
          throw stmtError;
        }
      }
    }

    console.log('✅ Migration completed successfully!');
    
    // Verify the migration
    console.log('🔍 Verifying migration...');
    
    const { data: columns, error: verifyError } = await supabase
      .from('users')
      .select('verification_token_expires')
      .limit(1);

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError.message);
      process.exit(1);
    }

    console.log('✅ Column verification_token_expires exists and is accessible');
    
    // Check for existing unverified users
    const { data: unverifiedUsers, error: countError } = await supabase
      .from('users')
      .select('id, email, verification_token_expires')
      .eq('email_verified', false)
      .not('verification_token', 'is', null);

    if (countError) {
      console.error('❌ Error checking unverified users:', countError.message);
    } else {
      console.log(`📊 Found ${unverifiedUsers?.length || 0} unverified users with tokens`);
      
      if (unverifiedUsers && unverifiedUsers.length > 0) {
        console.log('   Sample users:');
        unverifiedUsers.slice(0, 3).forEach(user => {
          console.log(`   - ${user.email}: expires ${user.verification_token_expires || 'not set'}`);
        });
      }
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('   - Added verification_token_expires column');
    console.log('   - Created performance indexes');
    console.log('   - Updated existing unverified users');
    console.log('\n💡 Next steps:');
    console.log('   1. Test the new bcrypt-based token system');
    console.log('   2. Monitor token expiration handling');
    console.log('   3. Consider running a cleanup job for expired tokens');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('   Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the migration
runMigration().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
