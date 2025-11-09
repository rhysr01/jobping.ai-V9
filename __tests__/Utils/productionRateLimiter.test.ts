/**
 * Tests for Production Rate Limiter
 * Tests rate limiting functionality
 */

import {
  checkRateLimit,
  RATE_LIMIT_CONFIG,
  SCRAPER_RATE_LIMITS
} from '@/Utils/productionRateLimiter';
import { NextRequest } from 'next/server';

jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
    set: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    isOpen: true
  }))
}));

describe('Production Rate Limiter', () => {
  let mockRequest: NextRequest;
  let mockRedis: any;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';

    mockRequest = {
      method: 'POST',
      url: 'https://example.com/api/match-users',
      headers: new Headers(),
      ip: '127.0.0.1'
    } as any;

    const { createClient } = require('redis');
    mockRedis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
      isOpen: true
    };
    createClient.mockReturnValue(mockRedis);
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
    it('should allow request under limit', async () => {
      mockRedis.get.mockResolvedValue('2'); // 2 requests, limit is 3

      const result = await checkRateLimit('match-users', '127.0.0.1');

      expect(result.allowed).toBe(true);
    });

    it('should block request over limit', async () => {
      mockRedis.get.mockResolvedValue('3'); // 3 requests, limit is 3

      const result = await checkRateLimit('match-users', '127.0.0.1');

      expect(result.allowed).toBe(false);
    });

    it('should use default config for unknown endpoint', async () => {
      mockRedis.get.mockResolvedValue('19'); // 19 requests, default limit is 20

      const result = await checkRateLimit('unknown-endpoint', '127.0.0.1');

      expect(result.allowed).toBe(true);
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));

      // Should allow when Redis fails (fail open)
      const result = await checkRateLimit('match-users', '127.0.0.1');

      expect(result.allowed).toBe(true);
    });
  });
});

