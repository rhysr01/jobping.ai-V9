/**
 * UNIFIED API HANDLER TESTS
 * Smoke tests for the unified API handler
 */

import { NextRequest } from 'next/server';
import { createUnifiedHandler, RATE_LIMITS } from '@/Utils/api/unified-api-handler';
import { z } from 'zod';

// Mock NextRequest
const createMockRequest = (method: string = 'GET', url: string = 'https://example.com') => {
  return new NextRequest(url, { method });
};

describe('Unified API Handler', () => {
  describe('Basic functionality', () => {
    it('should execute handler successfully', async () => {
      const handler = createUnifiedHandler(async (req) => {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      });

      const request = createMockRequest();
      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle method validation', async () => {
      const handler = createUnifiedHandler(
        async (req) => new Response('OK'),
        { allowedMethods: ['POST'] }
      );

      const request = createMockRequest('GET');
      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.error).toBeDefined();
    });
  });

  describe('Rate limiting', () => {
    it('should allow requests within limit', async () => {
      const handler = createUnifiedHandler(
        async (req) => new Response('OK'),
        { rateLimit: { windowMs: 60000, maxRequests: 10 } }
      );

      const request = createMockRequest();
      const response = await handler(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Validation', () => {
    it('should validate query parameters', async () => {
      const schema = z.object({
        page: z.string().optional(),
        limit: z.string().optional()
      });

      const handler = createUnifiedHandler(
        async (req) => new Response('OK'),
        { validation: { query: schema } }
      );

      const request = createMockRequest('GET', 'https://example.com?page=1&limit=10');
      const response = await handler(request);

      expect(response.status).toBe(200);
    });

    it('should reject invalid query parameters', async () => {
      const schema = z.object({
        page: z.number()
      });

      const handler = createUnifiedHandler(
        async (req) => new Response('OK'),
        { validation: { query: schema } }
      );

      const request = createMockRequest('GET', 'https://example.com?page=invalid');
      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should validate request body', async () => {
      const schema = z.object({
        name: z.string(),
        email: z.string().email()
      });

      const handler = createUnifiedHandler(
        async (req) => new Response('OK'),
        { validation: { body: schema } }
      );

      const request = new NextRequest('https://example.com', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test', email: 'test@example.com' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await handler(request);
      expect(response.status).toBe(200);
    });
  });

  describe('Authentication', () => {
    it('should require authentication when specified', async () => {
      const handler = createUnifiedHandler(
        async (req) => new Response('OK'),
        { requireAuth: true }
      );

      const request = createMockRequest();
      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it('should accept valid authentication', async () => {
      const handler = createUnifiedHandler(
        async (req) => new Response('OK'),
        { requireAuth: true }
      );

      const request = new NextRequest('https://example.com', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer valid-token-1234567890' }
      });

      const response = await handler(request);
      expect(response.status).toBe(200);
    });
  });

  describe('Rate limit configurations', () => {
    it('should have predefined rate limits', () => {
      expect(RATE_LIMITS.GENERAL).toBeDefined();
      expect(RATE_LIMITS.AUTH).toBeDefined();
      expect(RATE_LIMITS.MATCHING).toBeDefined();
      expect(RATE_LIMITS.EMAIL).toBeDefined();
      expect(RATE_LIMITS.ADMIN).toBeDefined();
    });

    it('should have reasonable rate limits', () => {
      expect(RATE_LIMITS.GENERAL.maxRequests).toBeGreaterThan(0);
      expect(RATE_LIMITS.AUTH.maxRequests).toBeLessThan(RATE_LIMITS.GENERAL.maxRequests);
      expect(RATE_LIMITS.MATCHING.maxRequests).toBeLessThan(RATE_LIMITS.GENERAL.maxRequests);
    });
  });
});
