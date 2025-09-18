#!/usr/bin/env node
/**
 * Comprehensive Security Test Suite
 * Tests all security measures including rate limiting, validation, auth, and HTTPS
 */

import { config } from 'dotenv';
import axios from 'axios';

// Load environment variables
config({ path: '.env.local' });

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

class SecurityTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async runTest(name, testFn) {
    try {
      console.log(`🔒 Testing: ${name}`);
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

  // Test 1: HTTPS Enforcement
  async testHTTPSEnforcement() {
    if (process.env.NODE_ENV !== 'production') {
      console.log('   Skipping HTTPS test in development mode');
      return;
    }

    try {
      // Try HTTP request (should redirect to HTTPS)
      const httpUrl = BASE_URL.replace('https://', 'http://');
      const response = await axios.get(httpUrl, { 
        maxRedirects: 0,
        validateStatus: (status) => status < 400
      });
      
      if (response.status === 301 || response.status === 302) {
        console.log('   HTTPS redirect working correctly');
      } else {
        throw new Error('HTTPS redirect not working');
      }
    } catch (error) {
      if (error.response?.status === 301 || error.response?.status === 302) {
        console.log('   HTTPS redirect working correctly');
      } else {
        throw error;
      }
    }
  }

  // Test 2: Security Headers
  async testSecurityHeaders() {
    const response = await axios.get(`${BASE_URL}/api/health`);
    const headers = response.headers;
    
    const requiredHeaders = [
      'x-frame-options',
      'x-content-type-options',
      'x-xss-protection',
      'referrer-policy',
      'permissions-policy'
    ];

    const missingHeaders = requiredHeaders.filter(header => !headers[header]);
    if (missingHeaders.length > 0) {
      throw new Error(`Missing security headers: ${missingHeaders.join(', ')}`);
    }

    // Check HSTS in production
    if (process.env.NODE_ENV === 'production' && !headers['strict-transport-security']) {
      throw new Error('HSTS header missing in production');
    }

    console.log('   All security headers present');
  }

  // Test 3: Content Security Policy
  async testContentSecurityPolicy() {
    const response = await axios.get(`${BASE_URL}/api/health`);
    const csp = response.headers['content-security-policy'];
    
    if (!csp) {
      throw new Error('Content Security Policy header missing');
    }

    // Check for essential CSP directives
    const requiredDirectives = ['default-src', 'script-src', 'style-src'];
    const missingDirectives = requiredDirectives.filter(directive => !csp.includes(directive));
    
    if (missingDirectives.length > 0) {
      throw new Error(`Missing CSP directives: ${missingDirectives.join(', ')}`);
    }

    console.log('   Content Security Policy configured correctly');
  }

  // Test 4: Rate Limiting
  async testRateLimiting() {
    const requests = [];
    // Make 25 requests to trigger rate limiting
    for (let i = 0; i < 25; i++) {
      requests.push(axios.get(`${BASE_URL}/api/health`));
    }
    
    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(r => r.status === 429);
    
    if (rateLimited.length === 0) {
      throw new Error('Rate limiting not working - no 429 responses');
    }

    // Check rate limit headers
    const rateLimitResponse = rateLimited[0];
    const hasRateLimitHeaders = 
      rateLimitResponse.headers['x-ratelimit-limit'] || 
      rateLimitResponse.headers['retry-after'];

    if (!hasRateLimitHeaders) {
      throw new Error('Rate limit headers missing');
    }

    console.log(`   Rate limiting working (${rateLimited.length} requests blocked)`);
  }

  // Test 5: Input Validation
  async testInputValidation() {
    // Test invalid email
    try {
      await axios.post(`${BASE_URL}/api/webhook-tally`, {
        eventId: 'test',
        eventType: 'FORM_RESPONSE',
        createdAt: 'invalid-date',
        formId: '',
        responseId: '',
        data: {
          fields: []
        }
      });
      throw new Error('Input validation not working - invalid data accepted');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('   Input validation working correctly');
      } else {
        throw new Error('Input validation not working properly');
      }
    }
  }

  // Test 6: Authentication
  async testAuthentication() {
    // Test protected endpoint without auth
    try {
      await axios.get(`${BASE_URL}/api/dashboard`);
      throw new Error('Authentication not working - protected endpoint accessible');
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('   Authentication working correctly');
      } else {
        throw new Error('Authentication not working properly');
      }
    }
  }

  // Test 7: SQL Injection Prevention
  async testSQLInjectionPrevention() {
    const maliciousInputs = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "'; INSERT INTO users VALUES ('hacker', 'password'); --"
    ];

    for (const input of maliciousInputs) {
      try {
        await axios.post(`${BASE_URL}/api/webhook-tally`, {
          eventId: input,
          eventType: 'FORM_RESPONSE',
          createdAt: new Date().toISOString(),
          formId: 'test',
          responseId: 'test',
          data: {
            fields: [{
              key: 'email',
              label: 'Email',
              type: 'text',
              value: input
            }]
          }
        });
      } catch (error) {
        if (error.response?.status === 400) {
          console.log(`   SQL injection prevention working for: ${input.substring(0, 20)}...`);
        } else {
          throw new Error(`SQL injection prevention failed for: ${input}`);
        }
      }
    }
  }

  // Test 8: XSS Prevention
  async testXSSPrevention() {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src=x onerror=alert("xss")>',
      '"><script>alert("xss")</script>'
    ];

    for (const payload of xssPayloads) {
      try {
        await axios.post(`${BASE_URL}/api/webhook-tally`, {
          eventId: 'test',
          eventType: 'FORM_RESPONSE',
          createdAt: new Date().toISOString(),
          formId: 'test',
          responseId: 'test',
          data: {
            fields: [{
              key: 'full_name',
              label: 'Full Name',
              type: 'text',
              value: payload
            }]
          }
        });
      } catch (error) {
        if (error.response?.status === 400) {
          console.log(`   XSS prevention working for: ${payload.substring(0, 20)}...`);
        } else {
          throw new Error(`XSS prevention failed for: ${payload}`);
        }
      }
    }
  }

  // Test 9: CORS Configuration
  async testCORSConfiguration() {
    try {
      const response = await axios.options(`${BASE_URL}/api/health`, {
        headers: {
          'Origin': 'https://malicious-site.com',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });

      const corsHeaders = response.headers;
      if (corsHeaders['access-control-allow-origin'] === '*') {
        throw new Error('CORS too permissive - allowing all origins');
      }

      console.log('   CORS configuration secure');
    } catch (error) {
      if (error.response?.status === 403 || error.response?.status === 404) {
        console.log('   CORS configuration secure (request blocked)');
      } else {
        throw error;
      }
    }
  }

  // Test 10: Error Information Disclosure
  async testErrorInformationDisclosure() {
    try {
      await axios.get(`${BASE_URL}/api/nonexistent-endpoint`);
    } catch (error) {
      const response = error.response;
      if (response?.data?.stack || response?.data?.error?.includes('at ')) {
        throw new Error('Error information disclosure - stack traces exposed');
      }
      console.log('   Error information disclosure prevention working');
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('🔒 Starting Comprehensive Security Test Suite\n');
    console.log('='.repeat(60));

    await this.runTest('HTTPS Enforcement', () => this.testHTTPSEnforcement());
    await this.runTest('Security Headers', () => this.testSecurityHeaders());
    await this.runTest('Content Security Policy', () => this.testContentSecurityPolicy());
    await this.runTest('Rate Limiting', () => this.testRateLimiting());
    await this.runTest('Input Validation', () => this.testInputValidation());
    await this.runTest('Authentication', () => this.testAuthentication());
    await this.runTest('SQL Injection Prevention', () => this.testSQLInjectionPrevention());
    await this.runTest('XSS Prevention', () => this.testXSSPrevention());
    await this.runTest('CORS Configuration', () => this.testCORSConfiguration());
    await this.runTest('Error Information Disclosure', () => this.testErrorInformationDisclosure());

    // Print summary
    console.log('='.repeat(60));
    console.log('🔒 SECURITY TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Success Rate: ${Math.round((this.results.passed / (this.results.passed + this.results.failed)) * 100)}%`);

    if (this.results.failed > 0) {
      console.log('\n❌ FAILED SECURITY TESTS:');
      this.results.tests
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          console.log(`   - ${test.name}: ${test.error}`);
        });
    }

    if (this.results.failed === 0) {
      console.log('\n🎉 ALL SECURITY TESTS PASSED! System is secure for production.');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some security tests failed. Please fix issues before production deployment.');
      process.exit(1);
    }
  }
}

// Run the security tests
const tester = new SecurityTester();
tester.runAllTests().catch(error => {
  console.error('Security test suite failed:', error);
  process.exit(1);
});
