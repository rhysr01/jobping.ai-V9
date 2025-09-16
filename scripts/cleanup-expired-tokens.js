#!/usr/bin/env node

/**
 * Cleanup Script: Remove expired verification tokens
 * 
 * This script removes expired verification tokens from the database
 * to keep the users table clean and improve performance.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function cleanupExpiredTokens() {
  console.log('🧹 Starting expired token cleanup...');

  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing required environment variables');
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
    // Find expired tokens
    const { data: expiredTokens, error: findError } = await supabase
      .from('users')
      .select('id, email, verification_token_expires')
      .not('verification_token', 'is', null)
      .lt('verification_token_expires', new Date().toISOString())
      .eq('email_verified', false);

    if (findError) {
      console.error('❌ Error finding expired tokens:', findError.message);
      throw findError;
    }

    if (!expiredTokens || expiredTokens.length === 0) {
      console.log('✅ No expired tokens found');
      return;
    }

    console.log(`📊 Found ${expiredTokens.length} expired tokens`);

    // Show sample expired tokens
    console.log('   Sample expired tokens:');
    expiredTokens.slice(0, 5).forEach(user => {
      console.log(`   - ${user.email}: expired ${user.verification_token_expires}`);
    });

    // Clean up expired tokens
    const { data: cleanupResult, error: cleanupError } = await supabase
      .from('users')
      .update({
        verification_token: null,
        verification_token_expires: null
      })
      .not('verification_token', 'is', null)
      .lt('verification_token_expires', new Date().toISOString())
      .eq('email_verified', false)
      .select('id, email');

    if (cleanupError) {
      console.error('❌ Error cleaning up expired tokens:', cleanupError.message);
      throw cleanupError;
    }

    console.log(`✅ Cleaned up ${cleanupResult?.length || 0} expired tokens`);

    // Show cleanup summary
    if (cleanupResult && cleanupResult.length > 0) {
      console.log('   Cleaned up tokens for:');
      cleanupResult.slice(0, 10).forEach(user => {
        console.log(`   - ${user.email}`);
      });
      
      if (cleanupResult.length > 10) {
        console.log(`   ... and ${cleanupResult.length - 10} more`);
      }
    }

    console.log('\n🎉 Cleanup completed successfully!');

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

// Run the cleanup
cleanupExpiredTokens().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
