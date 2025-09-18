#!/usr/bin/env node

/**
 * Simple Email Verification Flow Test
 * 
 * Tests the core verification functionality by:
 * 1. Creating a test user directly in the database
 * 2. Testing the verification API endpoint
 * 3. Validating the verification process works
 * 
 * This bypasses the webhook complexity to focus on the core verification flow.
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { config } from 'dotenv';
config({ path: '.env.local' });

const TEST_CONFIG = {
  TEST_EMAIL: `test-verify-${Date.now()}@jobping-test.com`,
  TEST_NAME: 'Test Verification User',
  CLEANUP_AFTER_TEST: true,
};

class SimpleVerificationTester {
  constructor() {
    this.supabase = null;
    this.testUser = null;
    this.verificationToken = null;
  }

  async initialize() {
    console.log('🚀 Initializing Simple Email Verification Test');
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

    console.log('✅ Environment validated and Supabase initialized');
    console.log(`📧 Test email: ${TEST_CONFIG.TEST_EMAIL}`);
  }

  generateVerificationToken() {
    // Generate a simple verification token (mimicking the real system)
    return crypto.randomBytes(32).toString('hex');
  }

  async createTestUser() {
    console.log('\n👤 Creating test user directly in database');
    console.log('-'.repeat(40));

    try {
      // Generate verification token
      this.verificationToken = this.generateVerificationToken();
      const tokenExpiry = new Date();
      tokenExpiry.setHours(tokenExpiry.getHours() + 24); // 24 hours from now

      // Create user directly in database (using only real schema fields)
      const userData = {
        email: TEST_CONFIG.TEST_EMAIL,
        full_name: TEST_CONFIG.TEST_NAME,
        email_verified: false,
        verification_token: this.verificationToken,
        verification_token_expires: tokenExpiry.toISOString(),
        target_cities: ['London', 'Berlin'],
        languages_spoken: ['English'],
        professional_experience: 'entry',
        entry_level_preference: 'entry',
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
      console.log(`   🔑 Verification token: ${this.verificationToken.substring(0, 8)}...`);
      console.log(`   ⏰ Token expires: ${tokenExpiry.toLocaleString()}`);

      return createdUser;
    } catch (error) {
      console.error('❌ Failed to create test user:', error.message);
      throw error;
    }
  }

  async testVerificationAPI() {
    console.log('\n✉️ Testing Email Verification API');
    console.log('-'.repeat(40));

    try {
      // Test the verification endpoint
      const verifyUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/verify-email`;
      console.log(`🔗 Calling verification API: ${verifyUrl}`);

      const response = await fetch(verifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: this.verificationToken }),
      });

      console.log(`📡 Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API call failed with status ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log(`📋 Response data:`, result);

      if (!result.success) {
        throw new Error(`Verification failed: ${result.error || 'Unknown error'}`);
      }

      console.log('✅ Verification API call successful');
      console.log(`   🎯 Success: ${result.success}`);
      console.log(`   👤 User: ${result.user?.email || 'N/A'}`);

      return result;
    } catch (error) {
      console.error('❌ Verification API test failed:', error.message);
      throw error;
    }
  }

  async validateDatabaseState() {
    console.log('\n🔍 Validating Database State After Verification');
    console.log('-'.repeat(50));

    try {
      // Check user state in database
      const { data: updatedUser, error: fetchError } = await this.supabase
        .from('users')
        .select('*')
        .eq('email', TEST_CONFIG.TEST_EMAIL)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch updated user: ${fetchError.message}`);
      }

      // Validate expected state changes
      const validations = [
        {
          field: 'email_verified',
          expected: true,
          actual: updatedUser.email_verified,
          description: 'Email should be verified'
        },
        {
          field: 'verification_token',
          expected: null,
          actual: updatedUser.verification_token,
          description: 'Verification token should be cleared'
        },
        {
          field: 'verification_token_expires',
          expected: null,
          actual: updatedUser.verification_token_expires,
          description: 'Token expiry should be cleared'
        }
      ];

      let allValid = true;
      for (const validation of validations) {
        const isValid = validation.actual === validation.expected;
        const status = isValid ? '✅' : '❌';
        console.log(`${status} ${validation.description}`);
        console.log(`   Expected: ${validation.expected}, Got: ${validation.actual}`);
        
        if (!isValid) {
          allValid = false;
        }
      }

      if (!allValid) {
        throw new Error('Database state validation failed');
      }

      console.log('\n✅ All database validations passed');
      console.log('   📧 Email verified correctly');
      console.log('   🔑 Token cleared properly');
      console.log('   ⏰ Expiry cleared correctly');

      return updatedUser;
    } catch (error) {
      console.error('❌ Database validation failed:', error.message);
      throw error;
    }
  }

  async testInvalidToken() {
    console.log('\n🔒 Testing Invalid Token Handling');
    console.log('-'.repeat(40));

    try {
      const invalidToken = 'invalid-token-12345';
      const verifyUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/verify-email`;

      const response = await fetch(verifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: invalidToken }),
      });

      const result = await response.json();

      // Should fail for invalid token
      if (response.ok && result.success) {
        throw new Error('Invalid token was incorrectly accepted');
      }

      console.log('✅ Invalid token correctly rejected');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${result.error || 'Token rejected'}`);

    } catch (error) {
      console.error('❌ Invalid token test failed:', error.message);
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

    try {
      await this.initialize();

      // Run tests
      console.log('\n📋 Running Email Verification Tests');
      console.log('='.repeat(50));

      try {
        await this.createTestUser();
        passed++;
      } catch (error) {
        failed++;
        console.error('💥 User creation failed, cannot continue');
        throw error;
      }

      try {
        await this.testVerificationAPI();
        passed++;
      } catch (error) {
        failed++;
        console.error('💥 Verification API failed');
        throw error;
      }

      try {
        await this.validateDatabaseState();
        passed++;
      } catch (error) {
        failed++;
        console.error('💥 Database validation failed');
        throw error;
      }

      try {
        await this.testInvalidToken();
        passed++;
      } catch (error) {
        failed++;
        console.error('💥 Invalid token test failed');
        // Don't throw here, this is a nice-to-have test
      }

      const duration = Date.now() - startTime;

      console.log('\n📊 EMAIL VERIFICATION TEST REPORT');
      console.log('='.repeat(50));
      console.log(`⏱️  Duration: ${(duration / 1000).toFixed(2)} seconds`);
      console.log(`✅ Passed: ${passed}/4`);
      console.log(`❌ Failed: ${failed}/4`);
      console.log(`📧 Test Email: ${TEST_CONFIG.TEST_EMAIL}`);
      console.log('');

      if (failed === 0) {
        console.log('🎉 ALL TESTS PASSED! Email verification is working correctly.');
        console.log('');
        console.log('✅ User creation works');
        console.log('✅ Verification API works');
        console.log('✅ Database updates correctly');
        console.log('✅ Invalid tokens are rejected');
      } else {
        console.log('🚨 SOME TESTS FAILED! Email verification needs fixes.');
      }

      return { passed, failed, total: 4, duration };

    } catch (error) {
      console.error('\n💥 Test suite failed:', error.message);
      return { passed, failed, total: 4, duration: Date.now() - startTime };
    } finally {
      await this.cleanup();
    }
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new SimpleVerificationTester();
  tester.run()
    .then((report) => {
      process.exit(report.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { SimpleVerificationTester };
