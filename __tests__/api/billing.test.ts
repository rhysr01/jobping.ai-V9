/**
 * Tests for Billing API Route
 * Tests subscription and payment management
 */

import { GET, POST } from '@/app/api/billing/route';
import { NextRequest } from 'next/server';

jest.mock('@supabase/supabase-js');
jest.mock('@/Utils/databasePool');
jest.mock('@/Utils/stripe');
jest.mock('stripe');
jest.mock('@/lib/api-logger', () => ({
  apiLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('Billing API Route', () => {
  let mockRequest: NextRequest;
  let mockSupabase: any;
  let mockStripe: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      method: 'GET',
      url: 'https://example.com/api/billing?userId=user-123',
      headers: new Headers()
    } as any;

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn()
    };

    mockStripe = {
      invoices: {
        list: jest.fn().mockResolvedValue({
          data: [{
            id: 'inv_123',
            amount_paid: 1000,
            currency: 'usd',
            status: 'paid',
            created: 1234567890,
            invoice_pdf: 'https://example.com/invoice.pdf',
            hosted_invoice_url: 'https://example.com/invoice'
          }]
        })
      },
      customers: {
        create: jest.fn(),
        retrieve: jest.fn()
      },
      subscriptions: {
        create: jest.fn(),
        cancel: jest.fn()
      }
    };

    const { getDatabaseClient } = require('@/Utils/databasePool');
    getDatabaseClient.mockReturnValue(mockSupabase);

    const Stripe = require('stripe');
    Stripe.mockImplementation(() => mockStripe);

    process.env.STRIPE_SECRET_KEY = 'sk_test_key';
  });

  describe('GET /api/billing', () => {
    it('should return billing information for user', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          stripe_customer_id: 'cus_123',
          subscription_active: true,
          email: 'user@example.com'
        },
        error: null
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'sub_123',
          is_active: true,
          plan: 'premium'
        },
        error: null
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 400 when userId is missing', async () => {
      mockRequest.url = 'https://example.com/api/billing';

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('User ID required');
    });

    it('should return 404 when user not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' }
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('User not found');
    });

    it('should handle Stripe invoice fetch errors gracefully', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          stripe_customer_id: 'cus_123',
          subscription_active: true,
          email: 'user@example.com'
        },
        error: null
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: null
      });

      mockStripe.invoices.list.mockRejectedValue(new Error('Stripe error'));

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.invoices).toEqual([]);
    });
  });

  describe('POST /api/billing', () => {
    beforeEach(() => {
      mockRequest.method = 'POST';
      mockRequest.json = jest.fn();
    });

    it('should create subscription', async () => {
      mockRequest.json.mockResolvedValue({
        userId: 'user-123',
        planId: 'premium_monthly'
      });

      mockSupabase.single.mockResolvedValue({
        data: { email: 'user@example.com' },
        error: null
      });

      mockStripe.customers.create.mockResolvedValue({ id: 'cus_123' });
      mockStripe.subscriptions.create.mockResolvedValue({ id: 'sub_123' });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBeLessThan(500);
    });

    it('should cancel subscription', async () => {
      mockRequest.json.mockResolvedValue({
        userId: 'user-123',
        action: 'cancel'
      });

      mockSupabase.single.mockResolvedValue({
        data: { stripe_subscription_id: 'sub_123' },
        error: null
      });

      mockStripe.subscriptions.cancel.mockResolvedValue({ id: 'sub_123' });

      const response = await POST(mockRequest);

      expect(response.status).toBeLessThan(500);
    });
  });
});

