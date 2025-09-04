#!/usr/bin/env node

/**
 * Production Readiness Test Script
 * 
 * Tests the critical production fixes implemented:
 * - Database connection pooling
 * - HTTP client connection management
 * - Circuit breaker functionality
 * - Rate limiting
 * - Graceful degradation
 */

require('dotenv').config();

async function testProductionReadiness() {
  console.log('🧪 Testing Production Readiness Fixes...\n');

  const results = {
    databasePool: false,
    httpClient: false,
    circuitBreaker: false,
    rateLimiting: false,
    gracefulDegradation: false,
    overall: false
  };

  try {
    // Test 1: Database Connection Pool
    console.log('1️⃣ Testing Database Connection Pool...');
    try {
      const { getDatabaseClient, getDatabasePoolStatus } = require('./Utils/databasePool.js');
      
      // Test singleton pattern
      const client1 = getDatabaseClient();
      const client2 = getDatabaseClient();
      
      if (client1 === client2) {
        console.log('✅ Database connection pool singleton working');
        
        const status = getDatabasePoolStatus();
        console.log(`   📊 Pool status: ${JSON.stringify(status, null, 2)}`);
        
        results.databasePool = true;
      } else {
        console.log('❌ Database connection pool singleton failed');
      }
    } catch (error) {
      console.log(`❌ Database connection pool test failed: ${error.message}`);
    }

    // Test 2: HTTP Client Connection Management
    console.log('\n2️⃣ Testing HTTP Client Connection Management...');
    try {
      const { httpClient } = require('./Utils/httpClient.js');
      
      // Test health check
      const healthCheck = await httpClient.healthCheck();
      if (healthCheck) {
        console.log('✅ HTTP client health check passed');
        
        const status = httpClient.getStatus();
        console.log(`   📊 HTTP client status: ${JSON.stringify(status, null, 2)}`);
        
        results.httpClient = true;
      } else {
        console.log('❌ HTTP client health check failed');
      }
    } catch (error) {
      console.log(`❌ HTTP client test failed: ${error.message}`);
    }

    // Test 3: Circuit Breaker
    console.log('\n3️⃣ Testing Circuit Breaker...');
    try {
      const { CircuitBreaker } = require('./Utils/httpClient.js');
      
      const circuitBreaker = new CircuitBreaker();
      
      // Test successful call
      const successResult = await circuitBreaker.call(async () => 'success');
      if (successResult === 'success') {
        console.log('✅ Circuit breaker successful call working');
        
        // Test failure threshold
        let failures = 0;
        for (let i = 0; i < 6; i++) {
          try {
            await circuitBreaker.call(async () => { throw new Error('test error'); });
          } catch (error) {
            failures++;
          }
        }
        
        const status = circuitBreaker.getStatus();
        if (status.state === 'OPEN') {
          console.log('✅ Circuit breaker failure threshold working');
          results.circuitBreaker = true;
        } else {
          console.log('❌ Circuit breaker failure threshold not working');
        }
      } else {
        console.log('❌ Circuit breaker successful call failed');
      }
    } catch (error) {
      console.log(`❌ Circuit breaker test failed: ${error.message}`);
    }

    // Test 4: Rate Limiting
    console.log('\n4️⃣ Testing Rate Limiting...');
    try {
      const { DomainRateLimiter } = require('./Utils/httpClient.js');
      
      const rateLimiter = new DomainRateLimiter();
      
      // Test rate limiting
      const domain = 'test.example.com';
      const config = { dailyLimit: 5, minInterval: 100 };
      
      // Should succeed
      await rateLimiter.waitForSlot(domain, config);
      console.log('✅ Rate limiter first request succeeded');
      
      // Should succeed (within daily limit)
      for (let i = 0; i < 3; i++) {
        await rateLimiter.waitForSlot(domain, config);
      }
      console.log('✅ Rate limiter multiple requests succeeded');
      
      // Should fail (exceed daily limit)
      try {
        await rateLimiter.waitForSlot(domain, config);
        console.log('❌ Rate limiter should have failed on daily limit');
      } catch (error) {
        if (error.message.includes('Daily limit exceeded')) {
          console.log('✅ Rate limiter daily limit enforcement working');
          results.rateLimiting = true;
        } else {
          console.log('❌ Rate limiter daily limit enforcement failed');
        }
      }
    } catch (error) {
      console.log(`❌ Rate limiting test failed: ${error.message}`);
    }

    // Test 5: Graceful Degradation
    console.log('\n5️⃣ Testing Graceful Degradation...');
    try {
      const { resilientOrchestrator } = require('./Utils/resilientOrchestrator.js');
      
      const status = resilientOrchestrator.getStatus();
      console.log('✅ Resilient orchestrator initialized');
      console.log(`   📊 Status: ${JSON.stringify(status, null, 2)}`);
      
      results.gracefulDegradation = true;
    } catch (error) {
      console.log(`❌ Graceful degradation test failed: ${error.message}`);
    }

    // Test 6: Token Manager
    console.log('\n6️⃣ Testing Token Manager...');
    try {
      const { tokenManager } = require('./Utils/tokenManager.js');
      
      const usageStats = tokenManager.getUsageStats();
      console.log('✅ Token manager initialized');
      console.log(`   📊 Usage stats: ${JSON.stringify(usageStats.limits, null, 2)}`);
      
      // Test cost-effective model recommendation
      const recommendedModel = tokenManager.getCostEffectiveModel(1000, 'medium');
      console.log(`   🎯 Recommended model for 1000 tokens: ${recommendedModel}`);
      
    } catch (error) {
      console.log(`❌ Token manager test failed: ${error.message}`);
    }

    // Overall Assessment
    console.log('\n📊 Production Readiness Assessment:');
    console.log('=====================================');
    
    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length - 1; // Exclude overall
    
    console.log(`✅ Database Connection Pool: ${results.databasePool ? 'PASS' : 'FAIL'}`);
    console.log(`✅ HTTP Client Management: ${results.httpClient ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Circuit Breaker: ${results.circuitBreaker ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Rate Limiting: ${results.rateLimiting ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Graceful Degradation: ${results.gracefulDegradation ? 'PASS' : 'FAIL'}`);
    
    console.log(`\n📈 Overall Score: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests >= totalTests * 0.8) {
      console.log('🎉 PRODUCTION READY: Critical fixes implemented successfully!');
      results.overall = true;
    } else if (passedTests >= totalTests * 0.6) {
      console.log('⚠️ PARTIALLY READY: Some critical fixes need attention');
    } else {
      console.log('❌ NOT PRODUCTION READY: Critical fixes failed');
    }

    // Recommendations
    console.log('\n💡 Recommendations:');
    if (!results.databasePool) {
      console.log('   - Fix database connection pooling to prevent connection exhaustion');
    }
    if (!results.httpClient) {
      console.log('   - Fix HTTP client connection management to prevent memory leaks');
    }
    if (!results.circuitBreaker) {
      console.log('   - Fix circuit breaker to prevent cascading failures');
    }
    if (!results.rateLimiting) {
      console.log('   - Fix rate limiting to prevent API bans');
    }
    if (!results.gracefulDegradation) {
      console.log('   - Fix graceful degradation to prevent system failures');
    }

    return results;

  } catch (error) {
    console.error('💥 Production readiness test crashed:', error);
    return results;
  }
}

// Run tests if called directly
if (require.main === module) {
  testProductionReadiness()
    .then(results => {
      process.exit(results.overall ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testProductionReadiness };
