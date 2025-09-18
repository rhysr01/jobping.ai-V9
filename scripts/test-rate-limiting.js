#!/usr/bin/env node
/**
 * Rate Limiting Test Script
 * Verifies that rate limiting is working correctly
 */

import { config } from 'dotenv';
import axios from 'axios';

// Load environment variables
config({ path: '.env.local' });

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

class RateLimitTester {
  constructor() {
    this.results = [];
  }

  async makeRequest(url, method = 'GET', data = null) {
    const startTime = Date.now();
    try {
      const response = await axios({
        method,
        url: `${BASE_URL}${url}`,
        data,
        timeout: 5000
      });
      
      const responseTime = Date.now() - startTime;
      return {
        success: true,
        status: response.status,
        responseTime,
        headers: response.headers
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        status: error.response?.status || 0,
        responseTime,
        error: error.message,
        headers: error.response?.headers || {}
      };
    }
  }

  async testHealthEndpointRateLimit() {
    console.log('🧪 Testing Health Endpoint Rate Limiting...');
    
    const requests = [];
    // Make 25 requests (should exceed default limit of 20)
    for (let i = 0; i < 25; i++) {
      requests.push(this.makeRequest('/api/health'));
    }
    
    const responses = await Promise.all(requests);
    const successful = responses.filter(r => r.success && r.status === 200);
    const rateLimited = responses.filter(r => r.status === 429);
    
    console.log(`   Total requests: ${responses.length}`);
    console.log(`   Successful: ${successful.length}`);
    console.log(`   Rate limited: ${rateLimited.length}`);
    
    if (rateLimited.length > 0) {
      console.log('   ✅ Rate limiting is working correctly');
      return true;
    } else {
      console.log('   ❌ Rate limiting may not be working');
      return false;
    }
  }

  async testMatchUsersRateLimit() {
    console.log('🧪 Testing Match Users Rate Limiting...');
    
    const testUser = {
      email: 'ratelimit-test@example.com',
      career_path: ['tech'],
      target_cities: ['Berlin'],
      work_environment: 'hybrid',
      professional_expertise: 'Software Development'
    };
    
    const requests = [];
    // Make 5 requests (should exceed limit of 3 per 4 minutes)
    for (let i = 0; i < 5; i++) {
      requests.push(this.makeRequest('/api/match-users', 'POST', testUser));
    }
    
    const responses = await Promise.all(requests);
    const successful = responses.filter(r => r.success && r.status === 200);
    const rateLimited = responses.filter(r => r.status === 429);
    
    console.log(`   Total requests: ${responses.length}`);
    console.log(`   Successful: ${successful.length}`);
    console.log(`   Rate limited: ${rateLimited.length}`);
    
    if (rateLimited.length > 0) {
      console.log('   ✅ Match users rate limiting is working');
      return true;
    } else {
      console.log('   ❌ Match users rate limiting may not be working');
      return false;
    }
  }

  async testRateLimitHeaders() {
    console.log('🧪 Testing Rate Limit Headers...');
    
    const response = await this.makeRequest('/api/health');
    
    if (response.success) {
      const headers = response.headers;
      const hasRateLimitHeaders = 
        headers['x-ratelimit-limit'] || 
        headers['x-ratelimit-remaining'] || 
        headers['x-ratelimit-reset'];
      
      if (hasRateLimitHeaders) {
        console.log('   ✅ Rate limit headers are present');
        console.log(`   Limit: ${headers['x-ratelimit-limit']}`);
        console.log(`   Remaining: ${headers['x-ratelimit-remaining']}`);
        console.log(`   Reset: ${headers['x-ratelimit-reset']}`);
        return true;
      } else {
        console.log('   ❌ Rate limit headers are missing');
        return false;
      }
    } else {
      console.log('   ❌ Could not test headers - request failed');
      return false;
    }
  }

  async testRetryAfterHeader() {
    console.log('🧪 Testing Retry-After Header...');
    
    // Make many requests to trigger rate limiting
    const requests = [];
    for (let i = 0; i < 30; i++) {
      requests.push(this.makeRequest('/api/health'));
    }
    
    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(r => r.status === 429);
    
    if (rateLimited.length > 0) {
      const retryAfter = rateLimited[0].headers['retry-after'];
      if (retryAfter) {
        console.log(`   ✅ Retry-After header present: ${retryAfter} seconds`);
        return true;
      } else {
        console.log('   ❌ Retry-After header missing');
        return false;
      }
    } else {
      console.log('   ❌ Could not trigger rate limiting to test Retry-After');
      return false;
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Rate Limiting Tests\n');
    
    const tests = [
      { name: 'Health Endpoint Rate Limit', test: () => this.testHealthEndpointRateLimit() },
      { name: 'Match Users Rate Limit', test: () => this.testMatchUsersRateLimit() },
      { name: 'Rate Limit Headers', test: () => this.testRateLimitHeaders() },
      { name: 'Retry-After Header', test: () => this.testRetryAfterHeader() }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const { name, test } of tests) {
      try {
        const result = await test();
        if (result) {
          passed++;
          console.log(`✅ ${name}: PASSED\n`);
        } else {
          failed++;
          console.log(`❌ ${name}: FAILED\n`);
        }
      } catch (error) {
        failed++;
        console.log(`❌ ${name}: ERROR - ${error.message}\n`);
      }
    }
    
    console.log('='.repeat(50));
    console.log('📊 RATE LIMITING TEST RESULTS');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
    
    if (failed === 0) {
      console.log('\n🎉 All rate limiting tests passed!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some rate limiting tests failed. Please check configuration.');
      process.exit(1);
    }
  }
}

// Run the tests
const tester = new RateLimitTester();
tester.runAllTests().catch(error => {
  console.error('Rate limiting test failed:', error);
  process.exit(1);
});
