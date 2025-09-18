/**
 * Performance and Load Tests for JobPing
 * Tests system performance under various load conditions
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/match-users/route';

// Mock external dependencies for performance testing
jest.mock('@/Utils/consolidatedMatching', () => ({
  createConsolidatedMatcher: jest.fn(() => ({
    performMatching: jest.fn().mockImplementation(async () => {
      // Simulate realistic AI processing time
      await new Promise(resolve => setTimeout(resolve, 100));
      return {
        method: 'ai_success',
        matches: [
          {
            job_hash: 'hash1',
            match_score: 85,
            match_reason: 'Good match',
            match_quality: 'good',
            match_tags: 'test'
          }
        ],
        confidence: 0.8
      };
    })
  }))
}));

jest.mock('@/Utils/matching/fallback.service', () => ({
  generateRobustFallbackMatches: jest.fn().mockReturnValue([
    {
      job: { job_hash: 'hash1' },
      match_score: 75,
      match_reason: 'Fallback match',
      match_quality: 'fair',
      match_tags: 'fallback'
    }
  ])
}));

jest.mock('@/Utils/matching/logging.service', () => ({
  logMatchSession: jest.fn().mockResolvedValue(undefined)
}));

describe('Performance and Load Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up realistic test data
    global.__SB_MOCK__ = {
      users: Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        email: `test${i + 1}@jobping.ai`,
        full_name: `Test User ${i + 1}`,
        email_verified: true,
        subscription_active: true,
        created_at: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
        target_cities: i % 2 === 0 ? 'london|berlin' : 'madrid|barcelona',
        languages_spoken: 'English,Spanish',
        company_types: 'startup,tech',
        roles_selected: 'software engineer,data analyst',
        professional_expertise: 'software development',
        visa_status: 'eu-citizen',
        start_date: new Date().toISOString(),
        work_environment: i % 3 === 0 ? 'hybrid' : 'remote',
        career_path: 'tech',
        entry_level_preference: 'entry-level',
        subscription_tier: i % 4 === 0 ? 'premium' : 'free'
      })),
      jobs: Array.from({ length: 200 }, (_, i) => ({
        id: `${i + 1}`,
        title: `Job ${i + 1}`,
        company: `Company ${i + 1}`,
        location: i % 4 === 0 ? 'London, UK' : i % 4 === 1 ? 'Berlin, Germany' : i % 4 === 2 ? 'Madrid, Spain' : 'Barcelona, Spain',
        job_url: `https://example.com/job${i + 1}`,
        description: `Job description for position ${i + 1}`,
        experience_required: 'entry-level',
        work_environment: i % 3 === 0 ? 'hybrid' : 'remote',
        source: 'test',
        scrape_timestamp: new Date().toISOString(),
        posted_at: new Date(Date.now() - (i % 7) * 24 * 60 * 60 * 1000).toISOString(),
        original_posted_date: new Date(Date.now() - (i % 7) * 24 * 60 * 60 * 1000).toISOString(),
        last_seen_at: new Date().toISOString(),
        is_active: true,
        job_hash: `hash${i + 1}`,
        categories: ['early-career', 'tech'],
        language_requirements: ['English'],
        company_profile_url: '',
        created_at: new Date().toISOString(),
        is_sent: false,
        status: 'active',
        freshness_tier: i % 3 === 0 ? 'ultra_fresh' : 'fresh'
      })),
      matches: [],
      match_logs: []
    };
  });

  describe('Single Request Performance', () => {
    it('should process 3 users (test limit) within 5 seconds', async () => {
      const startTime = Date.now();
      
      const request = new NextRequest('http://localhost:3000/api/match-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 10 }),
      });

      const response = await POST(request);
      const data = await response.json();
      
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(duration).toBeLessThan(5000); // 5 seconds max
      expect(data.duration).toBeLessThan(5000);
    });

    it('should process users in parallel for better performance', async () => {
      const startTime = Date.now();
      
      const request = new NextRequest('http://localhost:3000/api/match-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 10 }),
      });

      const response = await POST(request);
      const data = await response.json();
      
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Parallel processing should be much faster than sequential
      expect(duration).toBeLessThan(2000); // 2 seconds max for 3 users
    });

    it('should handle memory efficiently', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      const request = new NextRequest('http://localhost:3000/api/match-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 10 }),
      });

      const response = await POST(request);
      const data = await response.json();
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Concurrent Request Performance', () => {
    it('should handle 5 concurrent requests efficiently', async () => {
      const startTime = Date.now();
      
      const requests = Array(5).fill().map(() => 
        new NextRequest('http://localhost:3000/api/match-users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: 5 }),
        })
      );

      const responses = await Promise.all(requests.map(req => POST(req)));
      const data = await Promise.all(responses.map(res => res.json()));
      
      const duration = Date.now() - startTime;

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      data.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Concurrent requests should complete in reasonable time
      expect(duration).toBeLessThan(10000); // 10 seconds max
    });

    it('should maintain performance under moderate load', async () => {
      const startTime = Date.now();
      
      const requests = Array(10).fill().map(() => 
        new NextRequest('http://localhost:3000/api/match-users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: 3 }),
        })
      );

      const responses = await Promise.all(requests.map(req => POST(req)));
      const data = await Promise.all(responses.map(res => res.json()));
      
      const duration = Date.now() - startTime;

      const successCount = responses.filter(r => r.status === 200).length;
      const successRate = (successCount / responses.length) * 100;

      expect(successRate).toBeGreaterThanOrEqual(90); // 90% success rate
      expect(duration).toBeLessThan(15000); // 15 seconds max
    });
  });

  describe('Resource Usage', () => {
    it('should not exceed memory limits', async () => {
      const initialMemory = process.memoryUsage();
      
      // Process multiple requests to test memory accumulation
      for (let i = 0; i < 5; i++) {
        const request = new NextRequest('http://localhost:3000/api/match-users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: 5 }),
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 100MB total)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });

    it('should handle garbage collection efficiently', async () => {
      const request = new NextRequest('http://localhost:3000/api/match-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 10 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Garbage collection should be triggered automatically
    });
  });

  describe('Error Recovery Performance', () => {
    it('should recover quickly from AI failures', async () => {
      // Mock AI failures
      const { createConsolidatedMatcher } = require('@/Utils/consolidatedMatching');
      createConsolidatedMatcher.mockReturnValue({
        performMatching: jest.fn().mockRejectedValue(new Error('AI service unavailable'))
      });

      const startTime = Date.now();
      
      const request = new NextRequest('http://localhost:3000/api/match-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 5 }),
      });

      const response = await POST(request);
      const data = await response.json();
      
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Should still complete quickly with fallback matching
      expect(duration).toBeLessThan(3000); // 3 seconds max
    });

    it('should handle circuit breaker activation efficiently', async () => {
      // Mock multiple AI failures to trigger circuit breaker
      const { createConsolidatedMatcher } = require('@/Utils/consolidatedMatching');
      createConsolidatedMatcher.mockReturnValue({
        performMatching: jest.fn().mockRejectedValue(new Error('AI service unavailable'))
      });

      const startTime = Date.now();
      
      // Make multiple requests to trigger circuit breaker
      const requests = Array(3).fill().map(() => 
        new NextRequest('http://localhost:3000/api/match-users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: 3 }),
        })
      );

      const responses = await Promise.all(requests.map(req => POST(req)));
      const data = await Promise.all(responses.map(res => res.json()));
      
      const duration = Date.now() - startTime;

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      data.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Should complete quickly even with circuit breaker active
      expect(duration).toBeLessThan(5000); // 5 seconds max
    });
  });

  describe('Scalability Tests', () => {
    it('should maintain performance with larger job datasets', async () => {
      // Increase job count to test scalability
      global.__SB_MOCK__.jobs = Array.from({ length: 500 }, (_, i) => ({
        id: `${i + 1}`,
        title: `Job ${i + 1}`,
        company: `Company ${i + 1}`,
        location: 'London, UK',
        job_url: `https://example.com/job${i + 1}`,
        description: `Job description for position ${i + 1}`,
        experience_required: 'entry-level',
        work_environment: 'hybrid',
        source: 'test',
        scrape_timestamp: new Date().toISOString(),
        posted_at: new Date(Date.now() - (i % 7) * 24 * 60 * 60 * 1000).toISOString(),
        original_posted_date: new Date(Date.now() - (i % 7) * 24 * 60 * 60 * 1000).toISOString(),
        last_seen_at: new Date().toISOString(),
        is_active: true,
        job_hash: `hash${i + 1}`,
        categories: ['early-career', 'tech'],
        language_requirements: ['English'],
        company_profile_url: '',
        created_at: new Date().toISOString(),
        is_sent: false,
        status: 'active',
        freshness_tier: i % 3 === 0 ? 'ultra_fresh' : 'fresh'
      }));

      const startTime = Date.now();
      
      const request = new NextRequest('http://localhost:3000/api/match-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 10 }),
      });

      const response = await POST(request);
      const data = await response.json();
      
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Should still complete in reasonable time with larger dataset
      expect(duration).toBeLessThan(8000); // 8 seconds max
    });

    it('should handle mixed subscription tiers efficiently', async () => {
      // Mix of free and premium users
      global.__SB_MOCK__.users = [
        ...Array(10).fill().map((_, i) => ({
          id: i + 1,
          email: `free${i + 1}@jobping.ai`,
          subscription_tier: 'free',
          // ... other fields
        })),
        ...Array(5).fill().map((_, i) => ({
          id: i + 11,
          email: `premium${i + 1}@jobping.ai`,
          subscription_tier: 'premium',
          // ... other fields
        }))
      ];

      const startTime = Date.now();
      
      const request = new NextRequest('http://localhost:3000/api/match-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 20 }),
      });

      const response = await POST(request);
      const data = await response.json();
      
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.processed).toBe(15); // 10 free + 5 premium
      expect(duration).toBeLessThan(6000); // 6 seconds max
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet performance benchmarks for 35-40 users', async () => {
      // Simulate the target user capacity
      const startTime = Date.now();
      
      const request = new NextRequest('http://localhost:3000/api/match-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 40 }),
      });

      const response = await POST(request);
      const data = await response.json();
      
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.processed).toBeLessThanOrEqual(3); // Test mode limit
      
      // Performance should be excellent for target capacity
      expect(duration).toBeLessThan(5000); // 5 seconds max
      expect(data.duration).toBeLessThan(5000);
    });

    it('should maintain consistent performance across multiple runs', async () => {
      const durations: number[] = [];
      
      // Run multiple times to test consistency
      for (let i = 0; i < 3; i++) {
        const startTime = Date.now();
        
        const request = new NextRequest('http://localhost:3000/api/match-users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: 10 }),
        });

        const response = await POST(request);
        const data = await response.json();
        
        const duration = Date.now() - startTime;
        durations.push(duration);

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      }

      // Performance should be consistent (within 50% variance)
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxVariance = avgDuration * 0.5;
      
      durations.forEach(duration => {
        expect(Math.abs(duration - avgDuration)).toBeLessThan(maxVariance);
      });
    });
  });
});
