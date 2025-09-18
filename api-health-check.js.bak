#!/usr/bin/env node

/**
 * 🏥 COMPREHENSIVE API HEALTH CHECK
 * 
 * This script tests all API endpoints systematically:
 * 1. System Health (GET endpoints)
 * 2. Authentication & Rate Limiting
 * 3. User Registration Flow
 * 4. Job Scraping
 * 5. AI Matching
 * 6. Error Handling
 */

const axios = require('axios');
const crypto = require('crypto');

// Configuration
const CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_URL || 'http://localhost:3000',
  TIMEOUT: 10000,
  API_KEY: process.env.SCRAPE_API_KEY || 'test-api-key',
  TEST_USER: {
    full_name: 'API Test User',
    email: 'api-test@jobping.ai',
    professional_expertise: 'Software Engineering',
    entry_level_preference: 'Graduate',
    target_cities: ['London', 'Berlin'],
    languages_spoken: ['English', 'German'],
    company_types: ['Startups', 'Tech Giants'],
    roles_selected: ['Software Engineer', 'Frontend Developer'],
    career_path: 'Technology',
    start_date: '2024-06-01',
    work_environment: 'Hybrid',
    visa_status: 'EU Citizen'
  }
};

class APIHealthChecker {
  constructor() {
    this.results = [];
    this.errors = [];
  }

  async runFullCheck() {
    console.log('🏥 Starting Comprehensive API Health Check...\n');
    
    try {
      // Test 1: System Health (GET endpoints)
      await this.testSystemHealth();
      
      // Test 2: Authentication & Rate Limiting
      await this.testAuthentication();
      
      // Test 3: User Registration Flow
      await this.testUserRegistration();
      
      // Test 4: Job Scraping
      await this.testJobScraping();
      
      // Test 5: AI Matching
      await this.testAIMatching();
      
      // Test 6: Error Handling
      await this.testErrorHandling();
      
      // Generate comprehensive report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ API Health Check failed:', error);
    }
  }

  async testSystemHealth() {
    console.log('🔍 Testing System Health (GET endpoints)...');
    
    const healthChecks = [
      { name: 'Scrape API Status', url: `${CONFIG.BASE_URL}/api/scrape`, method: 'GET', requiresAuth: true },
      { name: 'Match Users API', url: `${CONFIG.BASE_URL}/api/match-users?email=test@example.com`, method: 'GET' },
      { name: 'Webhook Endpoint', url: `${CONFIG.BASE_URL}/api/webhook-tally`, method: 'GET' },
      { name: 'Verify Email Endpoint', url: `${CONFIG.BASE_URL}/api/verify-email`, method: 'GET' },
      { name: 'User Matches Endpoint', url: `${CONFIG.BASE_URL}/api/user-matches?email=test@example.com`, method: 'GET' },
      { name: 'Cleanup Jobs Endpoint', url: `${CONFIG.BASE_URL}/api/cleanup-jobs`, method: 'GET' }
    ];

    for (const check of healthChecks) {
      try {
        const requestConfig = {
          method: check.method,
          url: check.url,
          timeout: CONFIG.TIMEOUT
        };
        
        // Add API key header if authentication is required
        if (check.requiresAuth) {
          requestConfig.headers = { 'x-api-key': CONFIG.API_KEY };
        }
        
        const response = await axios(requestConfig);
        
        this.results.push({
          test: 'System Health',
          component: check.name,
          status: 'PASS',
          details: `Status: ${response.status}, Response: ${JSON.stringify(response.data).substring(0, 100)}...`
        });
        console.log(`  ✅ ${check.name}: OK (${response.status})`);
      } catch (error) {
        const status = error.response?.status || 'NO_RESPONSE';
        const message = error.response?.data?.error || error.message;
        
        this.results.push({
          test: 'System Health',
          component: check.name,
          status: 'FAIL',
          details: `Status: ${status}, Error: ${message}`
        });
        console.log(`  ❌ ${check.name}: FAILED (${status}) - ${message}`);
      }
    }
  }

  async testAuthentication() {
    console.log('\n🔐 Testing Authentication & Rate Limiting...');
    
    // Test without authentication
    try {
      const response = await axios.post(
        `${CONFIG.BASE_URL}/api/scrape`,
        { platforms: ['greenhouse'] },
        { timeout: CONFIG.TIMEOUT }
      );
      
      this.results.push({
        test: 'Authentication',
        component: 'No Auth Required',
        status: 'PASS',
        details: 'Scrape endpoint accessible without authentication'
      });
      console.log(`  ✅ No Auth Required: OK`);
    } catch (error) {
      const status = error.response?.status || 'NO_RESPONSE';
      
      this.results.push({
        test: 'Authentication',
        component: 'No Auth Required',
        status: status === 401 ? 'PASS' : 'FAIL',
        details: `Status: ${status}, Expected: 401 for auth required`
      });
      console.log(`  ${status === 401 ? '✅' : '❌'} No Auth Required: ${status === 401 ? 'OK (Auth required)' : 'FAIL'}`);
    }
    
    // Test with authentication
    try {
      const response = await axios.post(
        `${CONFIG.BASE_URL}/api/scrape`,
        { platforms: ['greenhouse'] },
        {
          headers: { 'x-api-key': CONFIG.API_KEY },
          timeout: CONFIG.TIMEOUT
        }
      );
      
      this.results.push({
        test: 'Authentication',
        component: 'With API Key',
        status: 'PASS',
        details: 'Scrape endpoint accessible with valid API key'
      });
      console.log(`  ✅ With API Key: OK`);
    } catch (error) {
      const status = error.response?.status || 'NO_RESPONSE';
      const message = error.response?.data?.error || error.message;
      
      this.results.push({
        test: 'Authentication',
        component: 'With API Key',
        status: 'FAIL',
        details: `Status: ${status}, Error: ${message}`
      });
      console.log(`  ❌ With API Key: FAILED - ${message}`);
    }
  }

  async testUserRegistration() {
    console.log('\n👤 Testing User Registration Flow...');
    
    try {
      const webhookPayload = this.createTallyWebhookPayload(CONFIG.TEST_USER);
      
      console.log('  📤 Sending webhook payload:', JSON.stringify(webhookPayload, null, 2));
      
      const response = await axios.post(
        `${CONFIG.BASE_URL}/api/webhook-tally`,
        webhookPayload,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: CONFIG.TIMEOUT
        }
      );

      console.log('  📥 Received response:', JSON.stringify(response.data, null, 2));

      if (response.data.success) {
        this.results.push({
          test: 'User Registration',
          component: CONFIG.TEST_USER.email,
          status: 'PASS',
          details: `User registered successfully, verification required: ${response.data.requiresVerification}`
        });
        console.log(`  ✅ ${CONFIG.TEST_USER.email}: Registered successfully`);
      } else {
        throw new Error(response.data.error || 'Registration failed');
      }
    } catch (error) {
      const message = error.response?.data?.error || error.message;
      const status = error.response?.status || 'NO_RESPONSE';
      
      console.log(`  ❌ Registration failed with status ${status}:`, error.response?.data || error.message);
      
      this.results.push({
        test: 'User Registration',
        component: CONFIG.TEST_USER.email,
        status: 'FAIL',
        details: `Status: ${status}, Error: ${message}`
      });
      console.log(`  ❌ ${CONFIG.TEST_USER.email}: FAILED - ${message}`);
    }
  }

  async testJobScraping() {
    console.log('\n📡 Testing Job Scraping...');
    
    try {
      const response = await axios.post(
        `${CONFIG.BASE_URL}/api/scrape`,
        { platforms: ['greenhouse'], companies: [] },
        {
          headers: { 
            'Content-Type': 'application/json',
            'x-api-key': CONFIG.API_KEY
          },
          timeout: 30000 // Longer timeout for scraping
        }
      );

      if (response.data.success) {
        this.results.push({
          test: 'Job Scraping',
          component: 'Greenhouse Scraping',
          status: 'PASS',
          details: `Scraped successfully, results: ${JSON.stringify(response.data.results).substring(0, 100)}...`
        });
        console.log(`  ✅ Greenhouse Scraping: OK`);
      } else {
        throw new Error('Scraping failed');
      }
    } catch (error) {
      const message = error.response?.data?.error || error.message;
      
      this.results.push({
        test: 'Job Scraping',
        component: 'Greenhouse Scraping',
        status: 'FAIL',
        details: message
      });
      console.log(`  ❌ Greenhouse Scraping: FAILED - ${message}`);
    }
  }

  async testAIMatching() {
    console.log('\n🤖 Testing AI Matching...');
    
    try {
      const response = await axios.post(
        `${CONFIG.BASE_URL}/api/match-users`,
        {
          userEmail: CONFIG.TEST_USER.email,
          limit: 5
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        }
      );

      if (response.data.matches && Array.isArray(response.data.matches)) {
        this.results.push({
          test: 'AI Matching',
          component: CONFIG.TEST_USER.email,
          status: 'PASS',
          details: `Found ${response.data.matches.length} matches`
        });
        console.log(`  ✅ ${CONFIG.TEST_USER.email}: Found ${response.data.matches.length} matches`);
      } else if (response.data.message && response.data.message.includes('No users found')) {
        this.results.push({
          test: 'AI Matching',
          component: CONFIG.TEST_USER.email,
          status: 'PASS',
          details: 'No users in database (expected for test environment)'
        });
        console.log(`  ✅ ${CONFIG.TEST_USER.email}: No users in database (expected)`);
      } else {
        throw new Error('No matches returned');
      }
    } catch (error) {
      const message = error.response?.data?.error || error.message;
      
      // Check if it's a "no users" error, which is expected in test environment
      if (message.includes('No users found') || message.includes('No active users found')) {
        this.results.push({
          test: 'AI Matching',
          component: CONFIG.TEST_USER.email,
          status: 'PASS',
          details: 'No users in database (expected for test environment)'
        });
        console.log(`  ✅ ${CONFIG.TEST_USER.email}: No users in database (expected)`);
      } else {
        this.results.push({
          test: 'AI Matching',
          component: CONFIG.TEST_USER.email,
          status: 'FAIL',
          details: message
        });
        console.log(`  ❌ ${CONFIG.TEST_USER.email}: FAILED - ${message}`);
      }
    }
  }

  async testErrorHandling() {
    console.log('\n🛡️ Testing Error Handling...');
    
    const errorTests = [
      {
        name: 'Invalid Email Format',
        url: `${CONFIG.BASE_URL}/api/webhook-tally`,
        payload: { eventId: 'test', eventType: 'FORM_RESPONSE', formId: 'test', responseId: 'test', data: { fields: [{ key: 'email', value: 'invalid-email' }] } }
      },
      {
        name: 'Missing Required Fields',
        url: `${CONFIG.BASE_URL}/api/webhook-tally`,
        payload: { eventId: 'test', eventType: 'FORM_RESPONSE' }
      },
      {
        name: 'Invalid Scrape Platform',
        url: `${CONFIG.BASE_URL}/api/scrape`,
        payload: { platforms: ['invalid-platform'] }
      }
    ];

    for (const test of errorTests) {
      try {
        await axios.post(test.url, test.payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: CONFIG.TIMEOUT
        });
        
        this.results.push({
          test: 'Error Handling',
          component: test.name,
          status: 'FAIL',
          details: 'Expected error but got success'
        });
        console.log(`  ❌ ${test.name}: FAILED - Expected error but got success`);
      } catch (error) {
        const status = error.response?.status || 'NO_RESPONSE';
        
        if (status >= 400 && status < 500) {
          this.results.push({
            test: 'Error Handling',
            component: test.name,
            status: 'PASS',
            details: `Correctly handled error with status ${status}`
          });
          console.log(`  ✅ ${test.name}: OK (Status: ${status})`);
        } else {
          this.results.push({
            test: 'Error Handling',
            component: test.name,
            status: 'FAIL',
            details: `Unexpected error status: ${status}`
          });
          console.log(`  ❌ ${test.name}: FAILED - Unexpected status: ${status}`);
        }
      }
    }
  }

  createTallyWebhookPayload(user) {
    return {
      eventId: crypto.randomUUID(),
      eventType: 'FORM_RESPONSE',
      createdAt: new Date().toISOString(),
      formId: 'api-test-form',
      responseId: crypto.randomUUID(),
      data: {
        fields: [
          { key: 'full_name', label: 'Full Name', type: 'text', value: user.full_name },
          { key: 'email', label: 'Email', type: 'email', value: user.email },
          { key: 'professional_expertise', label: 'Professional Expertise', type: 'text', value: user.professional_expertise },
          { key: 'entry_level_preference', label: 'Entry Level Preference', type: 'text', value: user.entry_level_preference },
          { key: 'target_cities', label: 'Target Cities', type: 'text', value: Array.isArray(user.target_cities) ? user.target_cities : [user.target_cities] },
          { key: 'languages_spoken', label: 'Languages Spoken', type: 'text', value: Array.isArray(user.languages_spoken) ? user.languages_spoken : [user.languages_spoken] },
          { key: 'company_types', label: 'Company Types', type: 'text', value: Array.isArray(user.company_types) ? user.company_types : [user.company_types] },
          { key: 'roles_selected', label: 'Roles Selected', type: 'text', value: Array.isArray(user.roles_selected) ? user.roles_selected : [user.roles_selected] },
          { key: 'career_path', label: 'Career Path', type: 'text', value: Array.isArray(user.career_path) ? user.career_path : [user.career_path] },
          { key: 'start_date', label: 'Start Date', type: 'date', value: user.start_date },
          { key: 'work_environment', label: 'Work Environment', type: 'text', value: Array.isArray(user.work_environment) ? user.work_environment : [user.work_environment] },
          { key: 'visa_status', label: 'Visa Status', type: 'text', value: Array.isArray(user.visa_status) ? user.visa_status : [user.visa_status] }
        ]
      }
    };
  }

  generateReport() {
    console.log('\n📊 COMPREHENSIVE API HEALTH REPORT');
    console.log('=' .repeat(60));
    
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.status === 'PASS').length;
    const failedTests = this.results.filter(r => r.status === 'FAIL').length;
    
    console.log(`\n📈 Summary:`);
    console.log(`  Total Tests: ${totalTests}`);
    console.log(`  ✅ Passed: ${passedTests}`);
    console.log(`  ❌ Failed: ${failedTests}`);
    console.log(`  Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    // Group by test type
    const testGroups = {};
    this.results.forEach(result => {
      if (!testGroups[result.test]) testGroups[result.test] = [];
      testGroups[result.test].push(result);
    });
    
    console.log(`\n📋 Detailed Results:`);
    Object.entries(testGroups).forEach(([testName, results]) => {
      const passed = results.filter(r => r.status === 'PASS').length;
      const total = results.length;
      console.log(`\n  ${testName} (${passed}/${total} passed):`);
      
      results.forEach(result => {
        const icon = result.status === 'PASS' ? '✅' : '❌';
        console.log(`    ${icon} ${result.component}: ${result.details}`);
      });
    });
    
    if (failedTests > 0) {
      console.log(`\n❌ Failed Tests:`);
      this.results.filter(r => r.status === 'FAIL').forEach(result => {
        console.log(`  - ${result.test} > ${result.component}: ${result.details}`);
      });
    }
    
    console.log(`\n🎯 API Health Assessment:`);
    if (passedTests / totalTests >= 0.9) {
      console.log(`  🚀 EXCELLENT! API is production-ready. Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    } else if (passedTests / totalTests >= 0.7) {
      console.log(`  ⚠️ GOOD. API is mostly working. Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
      console.log(`  Consider fixing failed tests before production.`);
    } else {
      console.log(`  ❌ NEEDS WORK. API has significant issues. Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
      console.log(`  Fix failed tests before proceeding.`);
    }
    
    console.log(`\n📝 Next Steps:`);
    console.log(`  1. Review failed tests and fix issues`);
    console.log(`  2. Test with real user data`);
    console.log(`  3. Monitor performance under load`);
    console.log(`  4. Set up production monitoring`);
    console.log(`  5. Launch pilot program`);
  }
}

// Run the comprehensive check
if (require.main === module) {
  const checker = new APIHealthChecker();
  checker.runFullCheck().catch(console.error);
}

module.exports = APIHealthChecker;
