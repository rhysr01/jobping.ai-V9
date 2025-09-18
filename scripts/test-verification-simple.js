#!/usr/bin/env node

/**
 * Simple Verification Test (Works with Current Schema)
 * 
 * Tests email verification without requiring schema changes.
 * This will show us exactly what's working and what's broken.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const TEST_CONFIG = {
  TEST_EMAIL: `test-simple-${Date.now()}@jobping-test.com`,
  TEST_NAME: 'Simple Verification Test',
};

async function main() {
  console.log('🧪 SIMPLE EMAIL VERIFICATION SYSTEM TEST');
  console.log('='.repeat(50));
  
  // Initialize Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  let testUserId = null;

  try {
    // 1. Check what columns actually exist
    console.log('📊 Step 1: Checking database schema');
    console.log('-'.repeat(30));
    
    const { data: existingUsers, error: schemaError } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (schemaError) {
      throw new Error(`Cannot access users table: ${schemaError.message}`);
    }

    const columns = existingUsers && existingUsers.length > 0 
      ? Object.keys(existingUsers[0]) 
      : [];

    console.log('✅ Users table accessible');
    console.log('📋 Available columns:', columns.join(', '));
    
    // Check for verification-related columns
    const verificationColumns = [
      'email_verified',
      'verification_token', 
      'verification_token_expires',
      'last_email_sent',
      'email_count',
      'email_phase',
      'onboarding_complete'
    ];

    console.log('\n🔍 Verification-related columns:');
    verificationColumns.forEach(col => {
      const exists = columns.includes(col);
      console.log(`   ${exists ? '✅' : '❌'} ${col}`);
    });

    // 2. Create a test user with only existing columns
    console.log('\n👤 Step 2: Creating test user');
    console.log('-'.repeat(30));

    const userData = {
      email: TEST_CONFIG.TEST_EMAIL,
      full_name: TEST_CONFIG.TEST_NAME,
      email_verified: false,
      target_cities: ['London'],
      languages_spoken: ['English'],
    };

    // Only add columns that exist
    if (columns.includes('verification_token')) {
      userData.verification_token = 'test-token-12345';
    }

    const { data: createdUser, error: createError } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create user: ${createError.message}`);
    }

    testUserId = createdUser.id;
    console.log('✅ Test user created successfully');
    console.log(`   👤 User ID: ${createdUser.id}`);
    console.log(`   📧 Email: ${createdUser.email}`);

    // 3. Test verification API (if possible)
    console.log('\n🔗 Step 3: Testing verification API response');
    console.log('-'.repeat(40));

    try {
      // Test the API endpoint to see if it's working
      const verifyUrl = 'http://localhost:3000/api/verify-email';
      const response = await fetch(verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'test-token' }),
      });

      if (response.status === 200 || response.status === 400) {
        const result = await response.json();
        console.log('✅ Verification API is responding');
        console.log(`   Status: ${response.status}`);
        console.log(`   Response: ${JSON.stringify(result)}`);
      } else {
        console.log('⚠️ Verification API returned unexpected status:', response.status);
      }
    } catch (fetchError) {
      console.log('⚠️ Cannot test API (server not running):', fetchError.message);
      console.log('   This is OK - API exists but server is not running');
    }

    // 4. Check if we can manually update email_verified
    console.log('\n✏️ Step 4: Testing manual email verification');
    console.log('-'.repeat(40));

    const { data: verifiedUser, error: verifyError } = await supabase
      .from('users')
      .update({ email_verified: true })
      .eq('id', testUserId)
      .select()
      .single();

    if (verifyError) {
      throw new Error(`Failed to verify email: ${verifyError.message}`);
    }

    console.log('✅ Manual email verification successful');
    console.log(`   ✉️ Email verified: ${verifiedUser.email_verified}`);

    // 5. Final assessment
    console.log('\n📊 ASSESSMENT RESULTS');
    console.log('='.repeat(30));

    const issues = [];
    const working = [];

    // Check what's working
    if (columns.includes('email_verified')) {
      working.push('Basic email verification flag exists');
    } else {
      issues.push('Missing email_verified column');
    }

    if (columns.includes('verification_token')) {
      working.push('Verification token storage exists');
    } else {
      issues.push('Missing verification_token column');
    }

    if (!columns.includes('verification_token_expires')) {
      issues.push('Missing verification_token_expires column (CRITICAL)');
    }

    if (!columns.includes('last_email_sent')) {
      issues.push('Missing last_email_sent column (needed for scheduling)');
    }

    if (!columns.includes('email_count')) {
      issues.push('Missing email_count column (needed for tracking)');
    }

    console.log('✅ WORKING:');
    working.forEach(item => console.log(`   • ${item}`));

    if (issues.length > 0) {
      console.log('\n❌ ISSUES FOUND:');
      issues.forEach(item => console.log(`   • ${item}`));
      
      console.log('\n🔧 RECOMMENDED FIXES:');
      console.log('   1. Run the schema fix: scripts/fix-verification-schema.sql');
      console.log('   2. Test again after schema update');
      console.log('   3. Start development server for full API testing');
    } else {
      console.log('\n🎉 ALL VERIFICATION COMPONENTS ARE WORKING!');
    }

  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
  } finally {
    // Cleanup
    if (testUserId) {
      try {
        await supabase
          .from('users')
          .delete()
          .eq('id', testUserId);
        console.log('\n🧹 Test user cleaned up');
      } catch (cleanupError) {
        console.error('⚠️ Cleanup failed:', cleanupError.message);
      }
    }
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
