/**
 * Tests for Billing Portal API Route
 * Tests Stripe customer portal session creation
 */

import { POST } from '@/app/api/billing/portal/route';
import { NextRequest } from 'next/server';

jest.mock('@/Utils/databasePool');
jest.mock('@/Utils/stripe');
jest.mock('@/lib/api-logger', () => ({
  apiLogger: {
    error: jest.fn()
  }
}));

describe('Billing Portal API Route', () => {
  let mockRequest: NextRequest;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      method: 'POST',
      json: jest.fn(),
      url: 'https://example.com/api/billing/portal',
      headers: new Headers()
    } as any;

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { stripe_customer_id: 'cus_test123' },
        error: null
      })
    };

    const { getDatabaseClient } = require('@/Utils/databasePool');
    getDatabaseClient.mockReturnValue(mockSupabase);

    const { createCustomerPortalSession } = require('@/Utils/stripe');
    createCustomerPortalSession.mockResolvedValue({
      url: 'https://billing.stripe.com/session/test123'
    });
  });

  describe('POST /api/billing/portal', () => {
    it('should create portal session', async () => {
      mockRequest.json.mockResolvedValue({
        userId: 'user123'
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.url).toBeDefined();
    });

    it('should require userId', async () => {
      mockRequest.json.mockResolvedValue({});

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
    });

    it('should handle missing Stripe customer ID', async () => {
      mockRequest.json.mockResolvedValue({
        userId: 'user123'
      });

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(404);
    });

    it('should set correct return URL', async () => {
      mockRequest.json.mockResolvedValue({
        userId: 'user123'
      });

      await POST(mockRequest);

      const { createCustomerPortalSession } = require('@/Utils/stripe');
      expect(createCustomerPortalSession).toHaveBeenCalledWith(
        'cus_test123',
        expect.stringContaining('/billing')
      );
    });

    it('should handle portal creation errors', async () => {
      mockRequest.json.mockResolvedValue({
        userId: 'user123'
      });

      const { createCustomerPortalSession } = require('@/Utils/stripe');
      createCustomerPortalSession.mockRejectedValue(new Error('Stripe error'));

      const response = await POST(mockRequest);

      expect(response.status).toBeGreaterThanOrEqual(500);
    });
  });
});

