/**
 * Tests for Production Rate Limiter
 * Tests rate limiting functionality
 */

import {
  RATE_LIMIT_CONFIG,
  SCRAPER_RATE_LIMITS,
  getProductionRateLimiter,
  resetLimiterForTests
} from '@/Utils/productionRateLimiter';
import { NextRequest } from 'next/server';

describe('Production Rate Limiter', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
    process.env.JOBPING_TEST_MODE = '1';

    mockRequest = {
      method: 'POST',
      url: 'https://example.com/api/match-users',
      headers: new Headers(),
      ip: '127.0.0.1'
    } as any;
  });

  afterEach(async () => {
    delete process.env.JOBPING_TEST_MODE;
    await resetLimiterForTests();
  });

  describe('RATE_LIMIT_CONFIG', () => {
    it('should have config for match-users endpoint', () => {
      expect(RATE_LIMIT_CONFIG['match-users']).toBeDefined();
      expect(RATE_LIMIT_CONFIG['match-users'].maxRequests).toBe(3);
    });

    it('should have config for scrape endpoint', () => {
      expect(RATE_LIMIT_CONFIG['scrape']).toBeDefined();
      expect(RATE_LIMIT_CONFIG['scrape'].maxRequests).toBe(2);
    });

    it('should have default config', () => {
      expect(RATE_LIMIT_CONFIG['default']).toBeDefined();
    });
  });

  describe('SCRAPER_RATE_LIMITS', () => {
    it('should have limits for greenhouse', () => {
      expect(SCRAPER_RATE_LIMITS['greenhouse']).toBeDefined();
      expect(SCRAPER_RATE_LIMITS['greenhouse'].requestsPerHour).toBe(45);
    });

    it('should have limits for workday', () => {
      expect(SCRAPER_RATE_LIMITS['workday']).toBeDefined();
      expect(SCRAPER_RATE_LIMITS['workday'].requestsPerHour).toBe(18);
    });
  });

  describe('checkRateLimit', () => {
    it('should allow request under limit in test mode', async () => {
      const limiter = getProductionRateLimiter();
      const result = await limiter.checkRateLimit('match-users', '127.0.0.1');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it('should use default config when endpoint not specified', async () => {
      const limiter = getProductionRateLimiter();
      const result = await limiter.checkRateLimit('unknown-endpoint', '127.0.0.1');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });
  });
});

