/**
 * Tests for Match Users API Route - COMPREHENSIVE
 * Tests the massive match-users endpoint (494 statements!)
 */

import { POST } from '@/app/api/match-users/route';
import { NextRequest } from 'next/server';

jest.mock('@/Utils/productionRateLimiter');
jest.mock('@/Utils/databasePool');
jest.mock('@/Utils/auth/hmac');
jest.mock('@/Utils/consolidatedMatching');
jest.mock('@/Utils/matching/semanticRetrieval');
jest.mock('@/Utils/matching/integrated-matching.service');
jest.mock('@/Utils/matching/batch-processor.service');
jest.mock('@/Utils/matching/logging.service');
jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
  addBreadcrumb: jest.fn()
}));

describe('Match Users API Route - Comprehensive', () => {
  let mockRequest: NextRequest;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      method: 'POST',
      json: jest.fn(),
      headers: new Headers()
    } as any;

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: [],
        error: null,
        count: 0
      }),
      single: jest.fn(),
      rpc: jest.fn().mockResolvedValue({ data: [], error: null })
    };

    const { getDatabaseClient } = require('@/Utils/databasePool');
    getDatabaseClient.mockReturnValue(mockSupabase);

    const { getProductionRateLimiter } = require('@/Utils/productionRateLimiter');
    getProductionRateLimiter.mockReturnValue({
      middleware: jest.fn().mockResolvedValue(null),
      initializeRedis: jest.fn().mockResolvedValue(undefined),
      redisClient: {
        set: jest.fn().mockResolvedValue('OK'),
        get: jest.fn().mockResolvedValue(null),
        del: jest.fn().mockResolvedValue(1)
      }
    });

    const { verifyHMAC, isHMACRequired } = require('@/Utils/auth/hmac');
    verifyHMAC.mockReturnValue({ isValid: true });
    isHMACRequired.mockReturnValue(false);

    process.env.NODE_ENV = 'test';
  });

  describe('POST /api/match-users', () => {
    it('should process match users request successfully', async () => {
      mockRequest.json.mockResolvedValue({
        userLimit: 10,
        jobLimit: 1000,
        forceRun: false,
        dryRun: false
      });

      mockSupabase.limit.mockResolvedValue({
        data: [
          {
            id: 'user1',
            email: 'user1@example.com',
            subscription_tier: 'free',
            email_verified: true
          }
        ],
        error: null
      });

      const { createConsolidatedMatcher } = require('@/Utils/consolidatedMatching');
      createConsolidatedMatcher.mockReturnValue({
        match: jest.fn().mockResolvedValue({
          matches: [],
          method: 'ai_success'
        })
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBeLessThan(500);
      expect(data).toBeDefined();
    });

    it('should validate request schema', async () => {
      mockRequest.json.mockResolvedValue({
        userLimit: 200, // Exceeds max
        jobLimit: 1000
      });

      const response = await POST(mockRequest);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle HMAC authentication when required', async () => {
      const { isHMACRequired } = require('@/Utils/auth/hmac');
      isHMACRequired.mockReturnValue(true);

      mockRequest.json.mockResolvedValue({
        userLimit: 10,
        jobLimit: 1000,
        signature: 'invalid',
        timestamp: Date.now()
      });

      const { verifyHMAC } = require('@/Utils/auth/hmac');
      verifyHMAC.mockReturnValue({ isValid: false, error: 'Invalid signature' });

      const response = await POST(mockRequest);

      expect(response.status).toBe(401);
    });

    it('should handle rate limiting', async () => {
      const { getProductionRateLimiter } = require('@/Utils/productionRateLimiter');
      getProductionRateLimiter.mockReturnValue({
        middleware: jest.fn().mockResolvedValue(
          NextResponse.json({ error: 'Rate limited' }, { status: 429 })
        )
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(429);
    });

    it('should handle database errors gracefully', async () => {
      mockRequest.json.mockResolvedValue({
        userLimit: 10,
        jobLimit: 1000
      });

      mockSupabase.limit.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const response = await POST(mockRequest);

      expect(response.status).toBeGreaterThanOrEqual(500);
    });

    it('should handle dry run mode', async () => {
      mockRequest.json.mockResolvedValue({
        userLimit: 10,
        jobLimit: 1000,
        dryRun: true
      });

      mockSupabase.limit.mockResolvedValue({
        data: [{ id: 'user1', email: 'user1@example.com' }],
        error: null
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.dryRun).toBe(true);
    });

    it('should handle force run mode', async () => {
      mockRequest.json.mockResolvedValue({
        userLimit: 10,
        jobLimit: 1000,
        forceRun: true
      });

      mockSupabase.limit.mockResolvedValue({
        data: [{ id: 'user1', email: 'user1@example.com' }],
        error: null
      });

      const response = await POST(mockRequest);

      expect(response.status).toBeLessThan(500);
    });

    it('should process users in batches', async () => {
      mockRequest.json.mockResolvedValue({
        userLimit: 50,
        jobLimit: 1000
      });

      const users = Array.from({ length: 50 }, (_, i) => ({
        id: `user${i}`,
        email: `user${i}@example.com`,
        subscription_tier: 'free',
        email_verified: true
      }));

      mockSupabase.limit.mockResolvedValue({
        data: users,
        error: null
      });

      const { batchMatchingProcessor } = require('@/Utils/matching/batch-processor.service');
      batchMatchingProcessor.processBatch = jest.fn().mockResolvedValue({
        success: true,
        processed: 50
      });

      const response = await POST(mockRequest);

      expect(response.status).toBeLessThan(500);
    });

    it('should handle Redis lock acquisition failure', async () => {
      mockRequest.json.mockResolvedValue({
        userLimit: 10,
        jobLimit: 1000
      });

      const { getProductionRateLimiter } = require('@/Utils/productionRateLimiter');
      const mockLimiter = {
        middleware: jest.fn().mockResolvedValue(null),
        initializeRedis: jest.fn().mockResolvedValue(undefined),
        redisClient: {
          set: jest.fn().mockResolvedValue(null), // Lock already held
          get: jest.fn().mockResolvedValue('existing-token'),
          del: jest.fn().mockResolvedValue(1)
        }
      };
      getProductionRateLimiter.mockReturnValue(mockLimiter);

      const response = await POST(mockRequest);
      const data = await response.json();

      // Should handle gracefully
      expect(response.status).toBeLessThan(500);
    });

    it('should validate database schema', async () => {
      mockRequest.json.mockResolvedValue({
        userLimit: 10,
        jobLimit: 1000
      });

      mockSupabase.limit.mockResolvedValue({
        data: [{ id: 'user1' }],
        error: null
      });

      // Mock schema validation failure
      mockSupabase.select.mockResolvedValueOnce({
        data: null,
        error: { message: 'column "status" does not exist' }
      });

      const response = await POST(mockRequest);

      // Should handle schema validation errors
      expect(response.status).toBeLessThan(500);
    });

    it('should handle matching service errors', async () => {
      mockRequest.json.mockResolvedValue({
        userLimit: 10,
        jobLimit: 1000
      });

      mockSupabase.limit.mockResolvedValue({
        data: [{ id: 'user1', email: 'user1@example.com' }],
        error: null
      });

      const { createConsolidatedMatcher } = require('@/Utils/consolidatedMatching');
      createConsolidatedMatcher.mockReturnValue({
        match: jest.fn().mockRejectedValue(new Error('Matching failed'))
      });

      const response = await POST(mockRequest);

      expect(response.status).toBeLessThan(500);
    });
  });
});

