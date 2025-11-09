/**
 * Tests for Stripe Utilities
 * Tests payment and subscription management
 */

import { createCustomerPortalSession, createCheckoutSession } from '@/Utils/stripe';

jest.mock('stripe');

describe('Stripe Utilities', () => {
  let mockStripe: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockStripe = {
      billingPortal: {
        sessions: {
          create: jest.fn()
        }
      },
      checkout: {
        sessions: {
          create: jest.fn()
        }
      }
    };

    const Stripe = require('stripe');
    Stripe.mockImplementation(() => mockStripe);

    process.env.STRIPE_SECRET_KEY = 'sk_test_key';
    process.env.NEXT_PUBLIC_URL = 'https://jobping.com';
  });

  describe('createCustomerPortalSession', () => {
    it('should create customer portal session', async () => {
      mockStripe.billingPortal.sessions.create.mockResolvedValue({
        url: 'https://billing.stripe.com/session/123'
      });

      const url = await createCustomerPortalSession('cus_123', 'https://jobping.com/return');

      expect(url).toBe('https://billing.stripe.com/session/123');
      expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_123',
        return_url: 'https://jobping.com/return'
      });
    });

    it('should handle Stripe errors', async () => {
      mockStripe.billingPortal.sessions.create.mockRejectedValue(
        new Error('Stripe error')
      );

      await expect(
        createCustomerPortalSession('cus_123', 'https://jobping.com/return')
      ).rejects.toThrow('Stripe error');
    });
  });

  describe('createCheckoutSession', () => {
    it('should create checkout session', async () => {
      mockStripe.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/session/456',
        id: 'cs_123'
      });

      const session = await createCheckoutSession({
        customerId: 'cus_123',
        priceId: 'price_123',
        successUrl: 'https://jobping.com/success',
        cancelUrl: 'https://jobping.com/cancel'
      });

      expect(session.url).toBe('https://checkout.stripe.com/session/456');
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalled();
    });

    it('should handle missing Stripe key', () => {
      delete process.env.STRIPE_SECRET_KEY;

      expect(() => {
        const Stripe = require('stripe');
        new Stripe();
      }).toThrow();
    });
  });
});

