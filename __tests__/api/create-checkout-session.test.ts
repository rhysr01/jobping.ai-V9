/**
 * Tests for Create Checkout Session API Route
 * Tests Stripe checkout session creation
 */

import { POST } from '@/app/api/create-checkout-session/route';
import { NextRequest } from 'next/server';

jest.mock('@/Utils/stripe');
jest.mock('@/Utils/promo');
jest.mock('@/Utils/productionRateLimiter');
jest.mock('@/Utils/errorResponse');
jest.mock('@supabase/supabase-js');

describe('Create Checkout Session API Route', () => {
  let mockRequest: NextRequest;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      method: 'POST',
      json: jest.fn()
    } as any;

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      limit: jest.fn().mockReturnThis()
    };

    const { createClient } = require('@supabase/supabase-js');
    createClient.mockReturnValue(mockSupabase);

    const { getProductionRateLimiter } = require('@/Utils/productionRateLimiter');
    getProductionRateLimiter.mockReturnValue({
      middleware: jest.fn().mockResolvedValue(null)
    });

    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  });

  describe('POST /api/create-checkout-session', () => {
    it('should create Stripe checkout session', async () => {
      mockRequest.json.mockResolvedValue({
        email: 'user@example.com',
        priceId: 'price_123',
        userId: 'user-123'
      });

      const { createCheckoutSession } = require('@/Utils/stripe');
      createCheckoutSession.mockResolvedValue({
        url: 'https://checkout.stripe.com/session/123',
        id: 'cs_123'
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.url).toBeDefined();
    });

    it('should return 400 for missing required fields', async () => {
      mockRequest.json.mockResolvedValue({
        email: 'user@example.com'
        // Missing priceId and userId
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
    });

    it('should handle promo code validation', async () => {
      mockRequest.json.mockResolvedValue({
        email: 'user@example.com',
        priceId: 'price_123',
        userId: 'user-123',
        promoCode: 'PROMO123'
      });

      const { validatePromoCode } = require('@/Utils/promo');
      validatePromoCode.mockResolvedValue({
        isValid: true
      });

      mockSupabase.single.mockResolvedValue({
        data: { subscription_active: false },
        error: null
      });

      mockSupabase.limit.mockResolvedValue({
        data: [],
        error: null
      });

      mockSupabase.eq.mockResolvedValue({ error: null });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.promoApplied).toBe(true);
    });

    it('should reject invalid promo code', async () => {
      mockRequest.json.mockResolvedValue({
        email: 'user@example.com',
        priceId: 'price_123',
        userId: 'user-123',
        promoCode: 'INVALID'
      });

      const { validatePromoCode } = require('@/Utils/promo');
      validatePromoCode.mockResolvedValue({
        isValid: false,
        reason: 'Invalid promo code'
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
    });

    it('should prevent duplicate promo usage', async () => {
      mockRequest.json.mockResolvedValue({
        email: 'user@example.com',
        priceId: 'price_123',
        userId: 'user-123',
        promoCode: 'PROMO123'
      });

      const { validatePromoCode } = require('@/Utils/promo');
      validatePromoCode.mockResolvedValue({ isValid: true });

      mockSupabase.single.mockResolvedValue({
        data: { subscription_active: false },
        error: null
      });

      mockSupabase.limit.mockResolvedValue({
        data: [{ id: 'existing' }], // Already used
        error: null
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
    });

    it('should handle Stripe errors', async () => {
      mockRequest.json.mockResolvedValue({
        email: 'user@example.com',
        priceId: 'price_123',
        userId: 'user-123'
      });

      const { createCheckoutSession } = require('@/Utils/stripe');
      createCheckoutSession.mockRejectedValue(new Error('Stripe error'));

      const response = await POST(mockRequest);

      expect(response.status).toBeGreaterThanOrEqual(500);
    });
  });
});

