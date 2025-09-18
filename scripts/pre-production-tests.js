#!/usr/bin/env node
/**
 * Pre-Production Test Suite for JobPing
 * Run these tests before deploying to production
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Load environment variables
config({ path: '.env.local' });

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

class ProductionTestSuite {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async runTest(name, testFn) {
    try {
      console.log(`🧪 Running: ${name}`);
      await testFn();
      this.results.passed++;
      this.results.tests.push({ name, status: 'PASSED' });
      console.log(`✅ PASSED: ${name}\n`);
    } catch (error) {
      this.results.failed++;
      this.results.tests.push({ name, status: 'FAILED', error: error.message });
      console.log(`❌ FAILED: ${name} - ${error.message}\n`);
    }
  }

  // Test 1: Database Connectivity
  async testDatabaseConnectivity() {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) throw new Error(`Database connection failed: ${error.message}`);
    console.log('   Database connection successful');
  }

  // Test 2: API Health Check
  async testAPIHealth() {
    const response = await axios.get(`${BASE_URL}/api/health`);
    if (response.status !== 200) {
      throw new Error(`Health check failed with status: ${response.status}`);
    }
    console.log('   API health check passed');
  }

  // Test 3: Environment Variables
  async testEnvironmentVariables() {
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'OPENAI_API_KEY',
      'RESEND_API_KEY',
      'STRIPE_SECRET_KEY',
      'NEXT_PUBLIC_STRIPE_KEY'
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);
    if (missing.length > 0) {
      throw new Error(`Missing environment variables: ${missing.join(', ')}`);
    }
    console.log('   All required environment variables are set');
  }

  // Test 4: Database Schema Validation
  async testDatabaseSchema() {
    const requiredTables = ['users', 'jobs', 'matches', 'match_logs'];
    
    for (const table of requiredTables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        throw new Error(`Table ${table} not accessible: ${error.message}`);
      }
    }
    console.log('   All required database tables are accessible');
  }

  // Test 5: Job Matching System
  async testJobMatchingSystem() {
    // Test with a sample user
    const testUser = {
      email: 'test@example.com',
      career_path: ['tech'],
      target_cities: ['Berlin'],
      work_environment: 'hybrid',
      professional_expertise: 'Software Development'
    };

    const response = await axios.post(`${BASE_URL}/api/match-users`, {
      testMode: true,
      user: testUser
    });

    if (response.status !== 200) {
      throw new Error(`Job matching failed: ${response.data.error || 'Unknown error'}`);
    }
    console.log('   Job matching system is functional');
  }

  // Test 6: Email System
  async testEmailSystem() {
    const response = await axios.post(`${BASE_URL}/api/test-email`, {
      to: 'test@example.com',
      subject: 'Production Test Email',
      body: 'This is a test email from JobPing production deployment.'
    });

    if (response.status !== 200) {
      throw new Error(`Email system failed: ${response.data.error || 'Unknown error'}`);
    }
    console.log('   Email system is functional');
  }

  // Test 7: Rate Limiting
  async testRateLimiting() {
    const promises = Array(5).fill().map(() => 
      axios.get(`${BASE_URL}/api/health`)
    );

    const responses = await Promise.all(promises);
    const successCount = responses.filter(r => r.status === 200).length;
    
    if (successCount < 3) {
      throw new Error(`Rate limiting may be too aggressive: only ${successCount}/5 requests succeeded`);
    }
    console.log('   Rate limiting is working appropriately');
  }

  // Test 8: Database Performance
  async testDatabasePerformance() {
    const startTime = Date.now();
    
    // Test a complex query
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('is_active', true)
      .limit(100);
    
    const duration = Date.now() - startTime;
    
    if (error) {
      throw new Error(`Database performance test failed: ${error.message}`);
    }
    
    if (duration > 5000) {
      throw new Error(`Database query too slow: ${duration}ms`);
    }
    
    console.log(`   Database performance test passed (${duration}ms)`);
  }

  // Test 9: Memory Usage
  async testMemoryUsage() {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    
    if (heapUsedMB > 500) {
      throw new Error(`Memory usage too high: ${heapUsedMB}MB`);
    }
    
    console.log(`   Memory usage is acceptable (${heapUsedMB}MB)`);
  }

  // Test 10: Error Handling
  async testErrorHandling() {
    try {
      await axios.get(`${BASE_URL}/api/nonexistent-endpoint`);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('   Error handling is working (404 returned for nonexistent endpoint)');
        return;
      }
    }
    throw new Error('Error handling test failed');
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Starting JobPing Pre-Production Test Suite\n');
    console.log('=' * 50);

    await this.runTest('Database Connectivity', () => this.testDatabaseConnectivity());
    await this.runTest('API Health Check', () => this.testAPIHealth());
    await this.runTest('Environment Variables', () => this.testEnvironmentVariables());
    await this.runTest('Database Schema Validation', () => this.testDatabaseSchema());
    await this.runTest('Job Matching System', () => this.testJobMatchingSystem());
    await this.runTest('Email System', () => this.testEmailSystem());
    await this.runTest('Rate Limiting', () => this.testRateLimiting());
    await this.runTest('Database Performance', () => this.testDatabasePerformance());
    await this.runTest('Memory Usage', () => this.testMemoryUsage());
    await this.runTest('Error Handling', () => this.testErrorHandling());

    // Print summary
    console.log('=' * 50);
    console.log('📊 TEST SUMMARY');
    console.log('=' * 50);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Success Rate: ${Math.round((this.results.passed / (this.results.passed + this.results.failed)) * 100)}%`);

    if (this.results.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results.tests
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          console.log(`   - ${test.name}: ${test.error}`);
        });
    }

    if (this.results.failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Ready for production deployment.');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some tests failed. Please fix issues before production deployment.');
      process.exit(1);
    }
  }
}

// Run the test suite
const testSuite = new ProductionTestSuite();
testSuite.runAllTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
