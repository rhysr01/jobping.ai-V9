#!/usr/bin/env node
/**
 * Quick Production Readiness Test
 * Tests core functionality without requiring a running server
 */

import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
config({ path: '.env.local' });

class QuickProductionTest {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async runTest(name, testFn) {
    try {
      console.log(`🧪 Testing: ${name}`);
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

  // Test 1: Environment Variables
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
  }

  // Test 2: Build Artifacts
  async testBuildArtifacts() {
    const buildDir = '.next';
    if (!fs.existsSync(buildDir)) {
      throw new Error('Build directory not found - run npm run build first');
    }
  }

  // Test 3: Security Files
  async testSecurityFiles() {
    const securityFiles = [
      'Utils/validation/schemas.ts',
      'Utils/auth/middleware.ts',
      'Utils/productionRateLimiter.ts',
      'middleware.ts'
    ];

    for (const file of securityFiles) {
      if (!fs.existsSync(file)) {
        throw new Error(`Security file missing: ${file}`);
      }
    }
  }

  // Test 4: Package Dependencies
  async testPackageDependencies() {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredDeps = [
      'next',
      'react',
      'typescript',
      'zod',
      'jsonwebtoken',
      '@supabase/supabase-js'
    ];

    const missing = requiredDeps.filter(dep => 
      !packageJson.dependencies[dep] && !packageJson.devDependencies[dep]
    );

    if (missing.length > 0) {
      throw new Error(`Missing dependencies: ${missing.join(', ')}`);
    }
  }

  // Test 5: TypeScript Configuration
  async testTypeScriptConfig() {
    if (!fs.existsSync('tsconfig.json')) {
      throw new Error('TypeScript configuration missing');
    }

    const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
    if (!tsconfig.compilerOptions) {
      throw new Error('TypeScript compiler options missing');
    }
  }

  // Test 6: Next.js Configuration
  async testNextConfig() {
    if (!fs.existsSync('next.config.ts')) {
      throw new Error('Next.js configuration missing');
    }
  }

  // Test 7: Vercel Configuration
  async testVercelConfig() {
    if (!fs.existsSync('vercel.json')) {
      throw new Error('Vercel configuration missing');
    }

    const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
    if (!vercelConfig.functions) {
      throw new Error('Vercel functions configuration missing');
    }
  }

  // Test 8: Security Headers in Middleware
  async testSecurityHeaders() {
    const middlewareContent = fs.readFileSync('middleware.ts', 'utf8');
    
    const requiredHeaders = [
      'X-Frame-Options',
      'X-Content-Type-Options',
      'Content-Security-Policy',
      'Strict-Transport-Security'
    ];

    const missing = requiredHeaders.filter(header => 
      !middlewareContent.includes(header)
    );

    if (missing.length > 0) {
      throw new Error(`Missing security headers: ${missing.join(', ')}`);
    }
  }

  // Test 9: Validation Schemas
  async testValidationSchemas() {
    const schemasContent = fs.readFileSync('Utils/validation/schemas.ts', 'utf8');
    
    const requiredSchemas = [
      'UserPreferencesSchema',
      'JobMatchingRequestSchema',
      'EmailVerificationSchema',
      'StripeWebhookSchema'
    ];

    const missing = requiredSchemas.filter(schema => 
      !schemasContent.includes(schema)
    );

    if (missing.length > 0) {
      throw new Error(`Missing validation schemas: ${missing.join(', ')}`);
    }
  }

  // Test 10: Rate Limiting Configuration
  async testRateLimitingConfig() {
    const rateLimitContent = fs.readFileSync('Utils/productionRateLimiter.ts', 'utf8');
    
    if (!rateLimitContent.includes('RATE_LIMIT_CONFIG')) {
      throw new Error('Rate limiting configuration missing');
    }

    if (!rateLimitContent.includes('ProductionRateLimiter')) {
      throw new Error('Rate limiter class missing');
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Starting Quick Production Readiness Test\n');
    console.log('='.repeat(60));

    await this.runTest('Environment Variables', () => this.testEnvironmentVariables());
    await this.runTest('Build Artifacts', () => this.testBuildArtifacts());
    await this.runTest('Security Files', () => this.testSecurityFiles());
    await this.runTest('Package Dependencies', () => this.testPackageDependencies());
    await this.runTest('TypeScript Configuration', () => this.testTypeScriptConfig());
    await this.runTest('Next.js Configuration', () => this.testNextConfig());
    await this.runTest('Vercel Configuration', () => this.testVercelConfig());
    await this.runTest('Security Headers', () => this.testSecurityHeaders());
    await this.runTest('Validation Schemas', () => this.testValidationSchemas());
    await this.runTest('Rate Limiting Configuration', () => this.testRateLimitingConfig());

    // Print summary
    console.log('='.repeat(60));
    console.log('📊 QUICK PRODUCTION TEST SUMMARY');
    console.log('='.repeat(60));
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
      console.log('\n🎉 ALL QUICK TESTS PASSED! Core production readiness verified.');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some tests failed. Please fix issues before production deployment.');
      process.exit(1);
    }
  }
}

// Run the tests
const tester = new QuickProductionTest();
tester.runAllTests().catch(error => {
  console.error('Quick production test failed:', error);
  process.exit(1);
});
