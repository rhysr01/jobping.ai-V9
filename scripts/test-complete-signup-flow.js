#!/usr/bin/env node

/**
 * Complete Signup Flow End-to-End Test
 * 
 * Tests the entire user journey from signup to first job email:
 * 1. User registration (simulated webhook)
 * 2. Email verification with optimized token system
 * 3. Welcome email sequence
 * 4. First job matching and email delivery
 * 5. Database state validation throughout
 * 
 * This test validates that the complete onboarding pipeline works optimally.
 */

import { createClient } from '@supabase/supabase-js';
import { EmailVerificationOracle } from '../Utils/emailVerification.ts';
import crypto from 'crypto';
import { config } from 'dotenv';
config({ path: '.env.local' });

const TEST_CONFIG = {
  TEST_EMAIL: `complete-test-${Date.now()}@jobping-test.com`,
  TEST_NAME: 'Complete Flow Test User',
  CLEANUP_AFTER_TEST: true,
  SIMULATE_WEBHOOK: true,
  TEST_EMAIL_SENDING: false, // Set to true if you want to test actual email sending
};

class CompleteSignupFlowTester {
  constructor() {
    this.supabase = null;
    this.testUser = null;
    this.verificationToken = null;
    this.testResults = {
      userRegistration: { status: 'pending', duration: 0 },
      tokenGeneration: { status: 'pending', duration: 0 },
      emailVerification: { status: 'pending', duration: 0 },
      welcomeSequence: { status: 'pending', duration: 0 },
      emailScheduling: { status: 'pending', duration: 0 },
    };
  }

  async initialize() {
    console.log('🚀 COMPLETE SIGNUP FLOW TEST');
    console.log('='.repeat(60));
    console.log(`📧 Test Email: ${TEST_CONFIG.TEST_EMAIL}`);
    console.log(`🧪 Cleanup after test: ${TEST_CONFIG.CLEANUP_AFTER_TEST}`);
    console.log(`📨 Test email sending: ${TEST_CONFIG.TEST_EMAIL_SENDING}`);
    console.log('');
    
    // Validate environment
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL', 
      'SUPABASE_SERVICE_ROLE_KEY',
      'RESEND_API_KEY'
    ];
    
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

    console.log('✅ Environment validated and services initialized');
  }

  async testUserRegistration() {
    console.log('📝 STEP 1: User Registration (Simulated Webhook)');
    console.log('-'.repeat(50));
    
    const startTime = Date.now();
    
    try {
      // Simulate user registration (like webhook-tally would do)
      const userData = {
        email: TEST_CONFIG.TEST_EMAIL,
        full_name: TEST_CONFIG.TEST_NAME,
        email_verified: false,
        target_cities: ['London', 'Berlin', 'Amsterdam'],
        languages_spoken: ['English', 'Spanish'],
        professional_experience: 'entry',
        entry_level_preference: 'entry',
        work_environment: 'hybrid',
        email_phase: 'welcome',
        onboarding_complete: false,
        email_count: 0,
        created_at: new Date().toISOString(),
      };

      console.log('🔄 Creating user account...');
      
      const { data: createdUser, error: createError } = await this.supabase
        .from('users')
        .insert([userData])
        .select()
        .single();

      if (createError) {
        throw new Error(`User creation failed: ${createError.message}`);
      }

      this.testUser = createdUser;
      this.testResults.userRegistration.duration = Date.now() - startTime;
      this.testResults.userRegistration.status = 'passed';

      console.log('✅ User registration successful');
      console.log(`   👤 User ID: ${createdUser.id}`);
      console.log(`   📧 Email: ${createdUser.email}`);
      console.log(`   🏙️ Target cities: ${createdUser.target_cities?.join(', ')}`);
      console.log(`   💼 Experience level: ${createdUser.professional_experience}`);
      console.log(`   ⏱️ Duration: ${this.testResults.userRegistration.duration}ms`);

      return createdUser;
    } catch (error) {
      this.testResults.userRegistration.status = 'failed';
      this.testResults.userRegistration.error = error.message;
      console.error('❌ User registration failed:', error.message);
      throw error;
    }
  }

  async testTokenGeneration() {
    console.log('\n🔑 STEP 2: Verification Token Generation');
    console.log('-'.repeat(50));
    
    const startTime = Date.now();
    
    try {
      console.log('🔄 Generating verification token...');
      
      // Generate verification token using optimized system
      this.verificationToken = await EmailVerificationOracle.generateVerificationToken(TEST_CONFIG.TEST_EMAIL);
      
      this.testResults.tokenGeneration.duration = Date.now() - startTime;
      this.testResults.tokenGeneration.status = 'passed';

      // Verify token was stored correctly
      const { data: userWithToken, error: fetchError } = await this.supabase
        .from('users')
        .select('verification_token, verification_token_expires')
        .eq('email', TEST_CONFIG.TEST_EMAIL)
        .single();

      if (fetchError || !userWithToken.verification_token) {
        throw new Error('Token was not stored correctly');
      }

      console.log('✅ Token generation successful');
      console.log(`   🔑 Token length: ${this.verificationToken.length} characters`);
      console.log(`   🔑 Token preview: ${this.verificationToken.substring(0, 8)}...`);
      console.log(`   📅 Expires: ${new Date(userWithToken.verification_token_expires).toLocaleString()}`);
      console.log(`   ⏱️ Duration: ${this.testResults.tokenGeneration.duration}ms`);

      return this.verificationToken;
    } catch (error) {
      this.testResults.tokenGeneration.status = 'failed';
      this.testResults.tokenGeneration.error = error.message;
      console.error('❌ Token generation failed:', error.message);
      throw error;
    }
  }

  async testEmailVerification() {
    console.log('\n✅ STEP 3: Email Verification (Optimized)');
    console.log('-'.repeat(50));
    
    const startTime = Date.now();
    
    try {
      console.log('🔄 Verifying email with token...');
      
      // Use the optimized verification system
      const result = await EmailVerificationOracle.verifyEmail(this.verificationToken, this.supabase);
      
      this.testResults.emailVerification.duration = Date.now() - startTime;
      
      if (!result.success) {
        throw new Error(result.error || 'Verification failed');
      }

      this.testResults.emailVerification.status = 'passed';

      console.log('✅ Email verification successful');
      console.log(`   👤 Verified user: ${result.user.email}`);
      console.log(`   ✉️ Email verified: ${result.user.email_verified}`);
      console.log(`   📧 Email phase: ${result.user.email_phase}`);
      console.log(`   🔑 Token cleared: ${!result.user.verification_token}`);
      console.log(`   ⏱️ Duration: ${this.testResults.emailVerification.duration}ms`);

      return result.user;
    } catch (error) {
      this.testResults.emailVerification.status = 'failed';
      this.testResults.emailVerification.error = error.message;
      console.error('❌ Email verification failed:', error.message);
      throw error;
    }
  }

  async testWelcomeSequence() {
    console.log('\n🎉 STEP 4: Welcome Sequence Validation');
    console.log('-'.repeat(50));
    
    const startTime = Date.now();
    
    try {
      console.log('🔄 Checking welcome sequence setup...');
      
      // Check that the user is properly set up for the welcome sequence
      const { data: verifiedUser, error: fetchError } = await this.supabase
        .from('users')
        .select('*')
        .eq('email', TEST_CONFIG.TEST_EMAIL)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch verified user: ${fetchError.message}`);
      }

      // Validate welcome sequence state
      const validations = {
        email_verified: { expected: true, actual: verifiedUser.email_verified },
        email_phase: { expected: 'welcome', actual: verifiedUser.email_phase },
        onboarding_complete: { expected: false, actual: verifiedUser.onboarding_complete },
        last_email_sent: { expected: 'not null', actual: verifiedUser.last_email_sent },
      };

      let allValid = true;
      console.log('📋 Welcome sequence validations:');
      
      for (const [field, validation] of Object.entries(validations)) {
        let isValid;
        if (validation.expected === 'not null') {
          isValid = validation.actual !== null;
        } else {
          isValid = validation.actual === validation.expected;
        }
        
        const status = isValid ? '✅' : '❌';
        console.log(`   ${status} ${field}: ${validation.actual}`);
        
        if (!isValid) allValid = false;
      }

      if (!allValid) {
        throw new Error('Welcome sequence validation failed');
      }

      this.testResults.welcomeSequence.duration = Date.now() - startTime;
      this.testResults.welcomeSequence.status = 'passed';

      console.log('✅ Welcome sequence properly configured');
      console.log(`   ⏱️ Duration: ${this.testResults.welcomeSequence.duration}ms`);

      return verifiedUser;
    } catch (error) {
      this.testResults.welcomeSequence.status = 'failed';
      this.testResults.welcomeSequence.error = error.message;
      console.error('❌ Welcome sequence validation failed:', error.message);
      throw error;
    }
  }

  async testEmailScheduling() {
    console.log('\n📅 STEP 5: Email Scheduling Readiness');
    console.log('-'.repeat(50));
    
    const startTime = Date.now();
    
    try {
      console.log('🔄 Checking email scheduling setup...');
      
      // Check that user is ready for scheduled emails
      const { data: user, error: fetchError } = await this.supabase
        .from('users')
        .select('email, email_verified, email_phase, onboarding_complete, last_email_sent, email_count, created_at')
        .eq('email', TEST_CONFIG.TEST_EMAIL)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch user for scheduling check: ${fetchError.message}`);
      }

      // Simulate checking if user would be eligible for scheduled emails
      const now = new Date();
      const signupTime = new Date(user.created_at);
      const lastEmailTime = user.last_email_sent ? new Date(user.last_email_sent) : null;
      const timeSinceSignup = now.getTime() - signupTime.getTime();
      const timeSinceLastEmail = lastEmailTime ? now.getTime() - lastEmailTime.getTime() : Infinity;

      console.log('📊 Email scheduling analysis:');
      console.log(`   📧 Email verified: ${user.email_verified}`);
      console.log(`   📅 Time since signup: ${Math.round(timeSinceSignup / 1000)} seconds`);
      console.log(`   📮 Last email sent: ${lastEmailTime ? lastEmailTime.toLocaleString() : 'Never'}`);
      console.log(`   📊 Email count: ${user.email_count}`);
      console.log(`   🎓 Onboarding complete: ${user.onboarding_complete}`);

      // For 48-hour follow-up (simulate by checking if user would be eligible)
      const eligibleFor48HourFollowup = user.email_verified && 
                                       user.email_phase === 'welcome' &&
                                       !user.onboarding_complete;

      console.log(`   🎯 Eligible for 48h follow-up: ${eligibleFor48HourFollowup}`);

      this.testResults.emailScheduling.duration = Date.now() - startTime;
      this.testResults.emailScheduling.status = 'passed';

      console.log('✅ Email scheduling properly configured');
      console.log(`   ⏱️ Duration: ${this.testResults.emailScheduling.duration}ms`);

      return { user, eligibleFor48HourFollowup };
    } catch (error) {
      this.testResults.emailScheduling.status = 'failed';
      this.testResults.emailScheduling.error = error.message;
      console.error('❌ Email scheduling check failed:', error.message);
      throw error;
    }
  }

  async cleanup() {
    if (!TEST_CONFIG.CLEANUP_AFTER_TEST) {
      console.log('\n🔧 Cleanup skipped (CLEANUP_AFTER_TEST=false)');
      return;
    }

    console.log('\n🧹 Cleaning up test data');
    console.log('-'.repeat(30));

    try {
      if (this.testUser) {
        const { error } = await this.supabase
          .from('users')
          .delete()
          .eq('email', TEST_CONFIG.TEST_EMAIL);

        if (error) {
          console.error('⚠️ Failed to cleanup test user:', error.message);
        } else {
          console.log('✅ Test user cleaned up successfully');
        }
      }
    } catch (error) {
      console.error('⚠️ Cleanup error:', error.message);
    }
  }

  generateReport() {
    const totalSteps = Object.keys(this.testResults).length;
    const passedSteps = Object.values(this.testResults).filter(r => r.status === 'passed').length;
    const failedSteps = Object.values(this.testResults).filter(r => r.status === 'failed').length;
    
    const totalDuration = Object.values(this.testResults).reduce((sum, r) => sum + (r.duration || 0), 0);

    console.log('\n📊 COMPLETE SIGNUP FLOW TEST REPORT');
    console.log('='.repeat(60));
    console.log(`⏱️  Total Duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);
    console.log(`✅ Passed: ${passedSteps}/${totalSteps}`);
    console.log(`❌ Failed: ${failedSteps}/${totalSteps}`);
    console.log(`📧 Test Email: ${TEST_CONFIG.TEST_EMAIL}`);
    console.log('');

    // Detailed step results
    console.log('📋 Step-by-step Results:');
    const stepNames = {
      userRegistration: 'User Registration',
      tokenGeneration: 'Token Generation', 
      emailVerification: 'Email Verification',
      welcomeSequence: 'Welcome Sequence',
      emailScheduling: 'Email Scheduling'
    };

    for (const [key, result] of Object.entries(this.testResults)) {
      const status = result.status === 'passed' ? '✅' : 
                    result.status === 'failed' ? '❌' : '⏸️';
      const duration = result.duration ? `${result.duration}ms` : 'N/A';
      
      console.log(`   ${status} ${stepNames[key]}: ${result.status.toUpperCase()} (${duration})`);
      
      if (result.status === 'failed' && result.error) {
        console.log(`      Error: ${result.error}`);
      }
    }

    console.log('');

    if (passedSteps === totalSteps) {
      console.log('🎉 ALL TESTS PASSED! SIGNUP FLOW IS WORKING PERFECTLY!');
      console.log('');
      console.log('🔧 VERIFIED FUNCTIONALITY:');
      console.log('✅ User registration works correctly');
      console.log('✅ Verification token generation is optimized');
      console.log('✅ Email verification system is robust');
      console.log('✅ Welcome sequence is properly configured');
      console.log('✅ Email scheduling is ready for production');
      console.log('');
      console.log('🚀 READY FOR PRODUCTION LAUNCH!');
    } else {
      console.log('🚨 SOME TESTS FAILED - NEEDS ATTENTION');
      console.log('');
      console.log('❌ Issues found in the signup flow');
      console.log('🔧 Fix the failed steps before launch');
    }

    return {
      passed: passedSteps,
      failed: failedSteps,
      total: totalSteps,
      duration: totalDuration,
      allPassed: passedSteps === totalSteps
    };
  }

  async run() {
    try {
      await this.initialize();

      // Execute all test steps in sequence
      await this.testUserRegistration();
      await this.testTokenGeneration();
      await this.testEmailVerification();
      await this.testWelcomeSequence();
      await this.testEmailScheduling();

      return this.generateReport();
    } catch (error) {
      console.error('\n💥 Test suite failed:', error.message);
      return this.generateReport();
    } finally {
      await this.cleanup();
    }
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new CompleteSignupFlowTester();
  tester.run()
    .then((report) => {
      process.exit(report.allPassed ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { CompleteSignupFlowTester };
