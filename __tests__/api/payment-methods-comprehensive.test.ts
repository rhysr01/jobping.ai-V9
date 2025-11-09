/**
 * Tests for Payment Methods API Route
 * Tests payment method CRUD operations
 */

import { POST, GET, DELETE } from '@/app/api/payment-methods/route';
import { NextRequest } from 'next/server';

jest.mock('@/Utils/supabase');
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentMethods: {
      create: jest.fn(),
      attach: jest.fn(),
      list: jest.fn(),
      retrieve: jest.fn(),
      detach: jest.fn()
    },
    customers: {
      update: jest.fn()
    }
  }));
});

describe('Payment Methods API Route', () => {
  let mockRequest: NextRequest;
  let mockSupabase: any;
  let mockStripe: any;

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
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { stripe_customer_id: 'cus_test123' },
        error: null
      })
    };

    mockStripe = {
      paymentMethods: {
        create: jest.fn().mockResolvedValue({
          id: 'pm_test123',
          card: { brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2025 }
        }),
        attach: jest.fn().mockResolvedValue({}),
        list: jest.fn().mockResolvedValue({ data: [] }),
        retrieve: jest.fn().mockResolvedValue({ customer: 'cus_test123' }),
        detach: jest.fn().mockResolvedValue({})
      },
      customers: {
        update: jest.fn().mockResolvedValue({})
      }
    };

    const Stripe = require('stripe');
    Stripe.mockImplementation(() => mockStripe);

    const { getSupabaseClient } = require('@/Utils/supabase');
    getSupabaseClient.mockReturnValue(mockSupabase);

    process.env.STRIPE_SECRET_KEY = 'sk_test_key';
  });

  describe('POST /api/payment-methods', () => {
    it('should add payment method', async () => {
      mockRequest.json.mockResolvedValue({
        userId: 'user123',
        cardNumber: '4242 4242 4242 4242',
        expiryDate: '12/25',
        cvv: '123',
        cardholderName: 'John Doe'
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.paymentMethod).toBeDefined();
      expect(mockStripe.paymentMethods.create).toHaveBeenCalled();
      expect(mockStripe.paymentMethods.attach).toHaveBeenCalled();
    });

    it('should require all fields', async () => {
      mockRequest.json.mockResolvedValue({
        userId: 'user123'
        // Missing other fields
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
    });

    it('should handle missing Stripe customer ID', async () => {
      mockRequest.json.mockResolvedValue({
        userId: 'user123',
        cardNumber: '4242 4242 4242 4242',
        expiryDate: '12/25',
        cvv: '123',
        cardholderName: 'John Doe'
      });

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(404);
    });

    it('should set as default if first payment method', async () => {
      mockRequest.json.mockResolvedValue({
        userId: 'user123',
        cardNumber: '4242 4242 4242 4242',
        expiryDate: '12/25',
        cvv: '123',
        cardholderName: 'John Doe'
      });

      mockStripe.paymentMethods.list.mockResolvedValue({
        data: [{ id: 'pm_test123' }] // Only one payment method
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      expect(mockStripe.customers.update).toHaveBeenCalled();
    });

    it('should handle Stripe card errors', async () => {
      mockRequest.json.mockResolvedValue({
        userId: 'user123',
        cardNumber: '4000 0000 0000 0002', // Declined card
        expiryDate: '12/25',
        cvv: '123',
        cardholderName: 'John Doe'
      });

      mockStripe.paymentMethods.create.mockRejectedValue({
        type: 'StripeCardError',
        message: 'Your card was declined.'
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/payment-methods', () => {
    beforeEach(() => {
      mockRequest.method = 'GET';
      mockRequest.url = 'https://example.com/api/payment-methods?userId=user123';
    });

    it('should list payment methods', async () => {
      mockStripe.paymentMethods.list.mockResolvedValue({
        data: [
          {
            id: 'pm_test123',
            card: { brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2025 }
          }
        ]
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.paymentMethods).toBeDefined();
    });

    it('should require userId parameter', async () => {
      mockRequest.url = 'https://example.com/api/payment-methods';

      const response = await GET(mockRequest);

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/payment-methods', () => {
    beforeEach(() => {
      mockRequest.method = 'DELETE';
    });

    it('should remove payment method', async () => {
      mockRequest.json.mockResolvedValue({
        userId: 'user123',
        paymentMethodId: 'pm_test123'
      });

      const response = await DELETE(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockStripe.paymentMethods.detach).toHaveBeenCalled();
    });

    it('should verify payment method belongs to user', async () => {
      mockRequest.json.mockResolvedValue({
        userId: 'user123',
        paymentMethodId: 'pm_test123'
      });

      mockStripe.paymentMethods.retrieve.mockResolvedValue({
        customer: 'cus_different' // Different customer
      });

      const response = await DELETE(mockRequest);

      expect(response.status).toBe(404);
    });
  });
});

