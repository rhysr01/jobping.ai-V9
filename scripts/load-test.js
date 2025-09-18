#!/usr/bin/env node
/**
 * Load Testing Script for JobPing
 * Tests system performance under load
 */

import { config } from 'dotenv';
import axios from 'axios';

// Load environment variables
config({ path: '.env.local' });

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

class LoadTester {
  constructor() {
    this.results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      errors: []
    };
  }

  async makeRequest(url, method = 'GET', data = null) {
    const startTime = Date.now();
    try {
      const response = await axios({
        method,
        url: `${BASE_URL}${url}`,
        data,
        timeout: 10000
      });
      
      const responseTime = Date.now() - startTime;
      this.results.totalRequests++;
      this.results.successfulRequests++;
      this.results.responseTimes.push(responseTime);
      
      return { success: true, responseTime, status: response.status };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.results.totalRequests++;
      this.results.failedRequests++;
      this.results.responseTimes.push(responseTime);
      this.results.errors.push({
        url,
        error: error.message,
        status: error.response?.status
      });
      
      return { success: false, responseTime, error: error.message };
    }
  }

  async runConcurrentRequests(url, concurrency = 10, totalRequests = 50) {
    console.log(`🔄 Testing ${url} with ${concurrency} concurrent requests (${totalRequests} total)`);
    
    const promises = [];
    for (let i = 0; i < totalRequests; i++) {
      promises.push(this.makeRequest(url));
      
      // Control concurrency
      if (promises.length >= concurrency) {
        await Promise.all(promises);
        promises.length = 0;
      }
    }
    
    // Wait for remaining requests
    if (promises.length > 0) {
      await Promise.all(promises);
    }
  }

  async testHealthEndpoint() {
    console.log('\n📊 Testing Health Endpoint');
    await this.runConcurrentRequests('/api/health', 20, 100);
  }

  async testMatchUsersEndpoint() {
    console.log('\n📊 Testing Match Users Endpoint');
    const testUser = {
      email: 'loadtest@example.com',
      career_path: ['tech'],
      target_cities: ['Berlin'],
      work_environment: 'hybrid',
      professional_expertise: 'Software Development'
    };
    
    await this.runConcurrentRequests('/api/match-users', 5, 20, testUser);
  }

  async testJobScrapingEndpoints() {
    console.log('\n📊 Testing Job Scraping Endpoints');
    
    const endpoints = [
      '/api/scrape/jooble',
      '/api/scrape/rapidapi-internships'
    ];
    
    for (const endpoint of endpoints) {
      await this.runConcurrentRequests(endpoint, 3, 10);
    }
  }

  calculateStats() {
    const responseTimes = this.results.responseTimes;
    const sortedTimes = responseTimes.sort((a, b) => a - b);
    
    const stats = {
      totalRequests: this.results.totalRequests,
      successfulRequests: this.results.successfulRequests,
      failedRequests: this.results.failedRequests,
      successRate: (this.results.successfulRequests / this.results.totalRequests) * 100,
      avgResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      p50ResponseTime: sortedTimes[Math.floor(sortedTimes.length * 0.5)],
      p95ResponseTime: sortedTimes[Math.floor(sortedTimes.length * 0.95)],
      p99ResponseTime: sortedTimes[Math.floor(sortedTimes.length * 0.99)]
    };
    
    return stats;
  }

  printResults() {
    const stats = this.calculateStats();
    
    console.log('\n' + '='.repeat(60));
    console.log('📈 LOAD TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`Total Requests: ${stats.totalRequests}`);
    console.log(`Successful: ${stats.successfulRequests}`);
    console.log(`Failed: ${stats.failedRequests}`);
    console.log(`Success Rate: ${stats.successRate.toFixed(2)}%`);
    console.log('\nResponse Times (ms):');
    console.log(`  Average: ${stats.avgResponseTime.toFixed(2)}`);
    console.log(`  Min: ${stats.minResponseTime}`);
    console.log(`  Max: ${stats.maxResponseTime}`);
    console.log(`  P50: ${stats.p50ResponseTime}`);
    console.log(`  P95: ${stats.p95ResponseTime}`);
    console.log(`  P99: ${stats.p99ResponseTime}`);
    
    if (this.results.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.results.errors.slice(0, 5).forEach(error => {
        console.log(`  - ${error.url}: ${error.error}`);
      });
      if (this.results.errors.length > 5) {
        console.log(`  ... and ${this.results.errors.length - 5} more errors`);
      }
    }
    
    // Performance recommendations
    console.log('\n🎯 Performance Assessment:');
    if (stats.successRate < 95) {
      console.log('❌ Success rate too low - investigate errors');
    } else if (stats.avgResponseTime > 2000) {
      console.log('⚠️  Average response time too high - consider optimization');
    } else if (stats.p95ResponseTime > 5000) {
      console.log('⚠️  P95 response time too high - some users will experience slow responses');
    } else {
      console.log('✅ Performance looks good for production!');
    }
  }

  async runLoadTests() {
    console.log('🚀 Starting JobPing Load Tests');
    console.log(`Target: ${BASE_URL}`);
    
    try {
      await this.testHealthEndpoint();
      await this.testMatchUsersEndpoint();
      await this.testJobScrapingEndpoints();
      
      this.printResults();
      
      // Exit with appropriate code
      const stats = this.calculateStats();
      if (stats.successRate < 90) {
        console.log('\n❌ Load test failed - success rate too low');
        process.exit(1);
      } else {
        console.log('\n✅ Load test passed - system ready for production');
        process.exit(0);
      }
    } catch (error) {
      console.error('Load test failed:', error);
      process.exit(1);
    }
  }
}

// Run load tests
const loadTester = new LoadTester();
loadTester.runLoadTests();
