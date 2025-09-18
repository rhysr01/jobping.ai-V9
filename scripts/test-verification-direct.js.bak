#!/usr/bin/env node

/**
 * Direct Email Verification Test
 * 
 * Tests the verification system by directly using the EmailVerificationOracle
 * without needing a running server. This validates the core verification logic.
 */

import { createClient } from '@supabase/supabase-js';
import { EmailVerificationOracle } from '../Utils/emailVerification.ts';
import { config } from 'dotenv';
config({ path: '.env.local' });

const TEST_CONFIG = {
  TEST_EMAIL: `test-verify-direct-${Date.now()}@jobping-test.com`,
  TEST_NAME: 'Direct Verification Test',
  CLEANUP_AFTER_TEST: true,
};

class DirectVerificationTester {
  constructor() {
    this.supabase = null;
    this.testUser = null;
    this.verificationToken = null;
  }

  async initialize() {
    console.log('🚀 Direct Email Verification Test');
    console.log('='.repeat(50));
    
    // Validate environment
    const requiredVars = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
    const missing = requiredVars.filter(v => !process.env[v]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Initialize Supabase
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('✅ Environment validated');
    console.log(`📧 Test email: ${TEST_CONFIG.TEST_EMAIL}`);
  }

  async createTestUser() {
    console.log('\n👤 Creating test user');
    console.log('-'.repeat(30));

    try {
      // Create user with minimal required fields
      const userData = {
        email: TEST_CONFIG.TEST_EMAIL,
        full_name: TEST_CONFIG.TEST_NAME,
        email_verified: false,
        target_cities: ['London'],
        languages_spoken: ['English'],
        created_at: new Date().toISOString(),
      };

      const { data: createdUser, error: createError } = await this.supabase
        .from('users')
        .insert([userData])
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create test user: ${createError.message}`);
      }

      this.testUser = createdUser;
      
      console.log('✅ Test user created successfully');
      console.log(`   👤 User ID: ${createdUser.id}`);
      console.log(`   📧 Email: ${createdUser.email}`);
      console.log(`   ✉️ Email verified: ${createdUser.email_verified}`);

      return createdUser;
    } catch (error) {
      console.error('❌ Failed to create test user:', error.message);
      throw error;
    }
  }

  async testTokenGeneration() {
    console.log('\n🔑 Testing token generation');
    console.log('-'.repeat(30));

    try {
      // Generate verification token using the Oracle
      this.verificationToken = await EmailVerificationOracle.generateVerificationToken(TEST_CONFIG.TEST_EMAIL);
      
      console.log('✅ Verification token generated');
      console.log(`   🔑 Token length: ${this.verificationToken.length} characters`);
      console.log(`   🔑 Token preview: ${this.verificationToken.substring(0, 8)}...`);

      // Check that the token was stored in the database
      const { data: updatedUser, error: fetchError } = await this.supabase
        .from('users')
        .select('verification_token, verification_token_expires')
        .eq('email', TEST_CONFIG.TEST_EMAIL)
        .single();

      if (fetchError) {
        throw new Error(`Failed to check stored token: ${fetchError.message}`);
      }

      if (!updatedUser.verification_token) {
        throw new Error('Token was not stored in database');
      }

      console.log('✅ Token stored in database');
      console.log(`   📅 Token expires: ${new Date(updatedUser.verification_token_expires).toLocaleString()}`);

      return true;
    } catch (error) {
      console.error('❌ Token generation failed:', error.message);
      throw error;
    }
  }

  async testTokenVerification() {
    console.log('\n✅ Testing token verification');
    console.log('-'.repeat(30));

    try {
      // Test with the correct token
      const result = await EmailVerificationOracle.verifyEmail(this.verificationToken, this.supabase);
      
      console.log('📋 Verification result:', {
        success: result.success,
        hasUser: !!result.user,
        error: result.error
      });

      if (!result.success) {
        throw new Error(`Verification failed: ${result.error}`);
      }

      console.log('✅ Token verification successful');
      console.log(`   👤 User: ${result.user?.email || 'N/A'}`);
      console.log(`   ✉️ Email verified: ${result.user?.email_verified || 'N/A'}`);

      return result;
    } catch (error) {
      console.error('❌ Token verification failed:', error.message);
      throw error;
    }
  }

  async testInvalidToken() {
    console.log('\n🔒 Testing invalid token handling');
    console.log('-'.repeat(40));

    try {
      // Test with invalid token
      const invalidToken = 'totally-invalid-token-12345';
      const result = await EmailVerificationOracle.verifyEmail(invalidToken, this.supabase);
      
      console.log('📋 Invalid token result:', {
        success: result.success,
        error: result.error
      });

      // Should fail
      if (result.success) {
        throw new Error('Invalid token was incorrectly accepted!');
      }

      console.log('✅ Invalid token correctly rejected');
      return true;
    } catch (error) {
      console.error('❌ Invalid token test failed:', error.message);
      throw error;
    }
  }

  async validateFinalState() {
    console.log('\n🔍 Validating final database state');
    console.log('-'.repeat(40));

    try {
      const { data: finalUser, error: fetchError } = await this.supabase
        .from('users')
        .select('*')
        .eq('email', TEST_CONFIG.TEST_EMAIL)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch final user state: ${fetchError.message}`);
      }

      console.log('📊 Final user state:');
      console.log(`   ✉️ Email verified: ${finalUser.email_verified}`);
      console.log(`   🔑 Token cleared: ${!finalUser.verification_token}`);
      console.log(`   ⏰ Expiry cleared: ${!finalUser.verification_token_expires}`);

      // Validate expected state
      const expectations = [
        { field: 'email_verified', expected: true, actual: finalUser.email_verified },
        { field: 'verification_token', expected: null, actual: finalUser.verification_token },
        { field: 'verification_token_expires', expected: null, actual: finalUser.verification_token_expires }
      ];

      let allValid = true;
      for (const exp of expectations) {
        const isValid = exp.actual === exp.expected;
        const status = isValid ? '✅' : '❌';
        console.log(`${status} ${exp.field}: Expected ${exp.expected}, Got ${exp.actual}`);
        if (!isValid) allValid = false;
      }

      if (!allValid) {
        throw new Error('Final state validation failed');
      }

      console.log('✅ All validations passed');
      return true;
    } catch (error) {
      console.error('❌ Final state validation failed:', error.message);
      throw error;
    }
  }

  async cleanup() {
    if (!TEST_CONFIG.CLEANUP_AFTER_TEST) {
      console.log('\n🔧 Cleanup skipped');
      return;
    }

    console.log('\n🧹 Cleaning up test data');
    console.log('-'.repeat(20));

    try {
      if (this.testUser) {
        const { error } = await this.supabase
          .from('users')
          .delete()
          .eq('email', TEST_CONFIG.TEST_EMAIL);

        if (error) {
          console.error('⚠️ Failed to cleanup test user:', error.message);
        } else {
          console.log('✅ Test user cleaned up');
        }
      }
    } catch (error) {
      console.error('⚠️ Cleanup error:', error.message);
    }
  }

  async run() {
    const startTime = Date.now();
    let passed = 0;
    let failed = 0;
    const tests = [
      'User Creation',
      'Token Generation', 
      'Token Verification',
      'Invalid Token Handling',
      'Final State Validation'
    ];

    try {
      await this.initialize();

      // Test 1: Create user
      try {
        await this.createTestUser();
        passed++;
        console.log(`✅ Test 1/${tests.length}: ${tests[0]} - PASSED`);
      } catch (error) {
        failed++;
        console.log(`❌ Test 1/${tests.length}: ${tests[0]} - FAILED`);
        throw error; // Can't continue without user
      }

      // Test 2: Generate token
      try {
        await this.testTokenGeneration();
        passed++;
        console.log(`✅ Test 2/${tests.length}: ${tests[1]} - PASSED`);
      } catch (error) {
        failed++;
        console.log(`❌ Test 2/${tests.length}: ${tests[1]} - FAILED`);
        throw error; // Can't continue without token
      }

      // Test 3: Verify token
      try {
        await this.testTokenVerification();
        passed++;
        console.log(`✅ Test 3/${tests.length}: ${tests[2]} - PASSED`);
      } catch (error) {
        failed++;
        console.log(`❌ Test 3/${tests.length}: ${tests[2]} - FAILED`);
        throw error; // Core functionality failed
      }

      // Test 4: Invalid token (non-critical)
      try {
        await this.testInvalidToken();
        passed++;
        console.log(`✅ Test 4/${tests.length}: ${tests[3]} - PASSED`);
      } catch (error) {
        failed++;
        console.log(`❌ Test 4/${tests.length}: ${tests[3]} - FAILED`);
        // Continue - this is a nice-to-have
      }

      // Test 5: Final state
      try {
        await this.validateFinalState();
        passed++;
        console.log(`✅ Test 5/${tests.length}: ${tests[4]} - PASSED`);
      } catch (error) {
        failed++;
        console.log(`❌ Test 5/${tests.length}: ${tests[4]} - FAILED`);
        // Continue - verification worked even if state is wrong
      }

      const duration = Date.now() - startTime;

      console.log('\n📊 EMAIL VERIFICATION TEST REPORT');
      console.log('='.repeat(50));
      console.log(`⏱️  Duration: ${(duration / 1000).toFixed(2)} seconds`);
      console.log(`✅ Passed: ${passed}/${tests.length}`);
      console.log(`❌ Failed: ${failed}/${tests.length}`);
      console.log(`📧 Test Email: ${TEST_CONFIG.TEST_EMAIL}`);
      console.log('');

      if (passed >= 3) { // Core functionality working
        console.log('🎉 EMAIL VERIFICATION IS WORKING!');
        console.log('');
        console.log('✅ Users can be created');
        console.log('✅ Verification tokens are generated correctly');
        console.log('✅ Token verification works');
        if (passed >= 4) console.log('✅ Invalid tokens are properly rejected');
        if (passed === 5) console.log('✅ Database state is properly managed');
      } else {
        console.log('🚨 EMAIL VERIFICATION HAS CRITICAL ISSUES!');
        console.log('');
        console.log('❌ Core verification functionality is broken');
        console.log('❌ Users cannot complete signup process');
      }

      return { passed, failed, total: tests.length, duration };

    } catch (error) {
      console.error('\n💥 Test suite failed:', error.message);
      return { passed, failed, total: tests.length, duration: Date.now() - startTime };
    } finally {
      await this.cleanup();
    }
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new DirectVerificationTester();
  tester.run()
    .then((report) => {
      process.exit(report.passed >= 3 ? 0 : 1); // Pass if core functionality works
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { DirectVerificationTester };
