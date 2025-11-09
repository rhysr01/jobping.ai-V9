/**
 * Comprehensive tests for Stripe Utilities
 * Tests checkout sessions, customer portal, webhook verification
 */

import {
  stripe,
  STRIPE_CONFIG,
  createCheckoutSession,
  createCustomerPortalSession,
  getCustomerByEmail,
  getSubscription,
  cancelSubscription,
  updateSubscription,
  constructWebhookEvent
} from '@/Utils/stripe';

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: jest.fn()
      }
    },
    billingPortal: {
      sessions: {
        create: jest.fn()
      }
    },
    customers: {
      list: jest.fn()
    },
    subscriptions: {
      retrieve: jest.fn(),
      cancel: jest.fn(),
      update: jest.fn()
    },
    webhooks: {
      constructEvent: jest.fn()
    }
  }));
});

jest.mock('@/Utils/url-helpers', () => ({
  getBaseUrl: jest.fn(() => 'https://getjobping.com')
}));

describe('Stripe Utilities', () => {
  let mockStripeInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';
    process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID = 'price_monthly';

    mockStripeInstance = {
      checkout: {
        sessions: {
          create: jest.fn().mockResolvedValue({
            id: 'cs_test_123',
            url: 'https://checkout.stripe.com/test'
          })
        }
      },
      billingPortal: {
        sessions: {
          create: jest.fn().mockResolvedValue({
            id: 'bps_test_123',
            url: 'https://billing.stripe.com/test'
          })
        }
      },
      customers: {
        list: jest.fn().mockResolvedValue({
          data: [{ id: 'cus_test_123', email: 'test@example.com' }]
        })
      },
      subscriptions: {
        retrieve: jest.fn().mockResolvedValue({
          id: 'sub_test_123',
          items: {
            data: [{ id: 'si_test_123' }]
          }
        }),
        cancel: jest.fn().mockResolvedValue({
          id: 'sub_test_123',
          status: 'canceled'
        }),
        update: jest.fn().mockResolvedValue({
          id: 'sub_test_123'
        })
      },
      webhooks: {
        constructEvent: jest.fn().mockReturnValue({
          type: 'checkout.session.completed',
          data: {}
        })
      }
    };

    const Stripe = require('stripe');
    Stripe.mockReturnValue(mockStripeInstance);
  });

  describe('getStripeClient', () => {
    it('should initialize Stripe client', () => {
      const client = stripe.checkout.sessions;
      expect(client).toBeDefined();
    });

    it('should throw error if key missing', () => {
      delete process.env.STRIPE_SECRET_KEY;

      expect(() => {
        const client = stripe.checkout.sessions;
      }).toThrow();
    });
  });

  describe('createCheckoutSession', () => {
    it('should create checkout session', async () => {
      const session = await createCheckoutSession({
        email: 'user@example.com',
        priceId: 'price_monthly',
        userId: 'user_123'
      });

      expect(session.id).toBe('cs_test_123');
      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalled();
    });

    it('should include promo code if provided', async () => {
      await createCheckoutSession({
        email: 'user@example.com',
        priceId: 'price_monthly',
        userId: 'user_123',
        promoCode: 'PROMO123'
      });

      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          discounts: [{ coupon: 'PROMO123' }]
        })
      );
    });

    it('should use custom success/cancel URLs', async () => {
      await createCheckoutSession({
        email: 'user@example.com',
        priceId: 'price_monthly',
        userId: 'user_123',
        successUrl: 'https://custom.com/success',
        cancelUrl: 'https://custom.com/cancel'
      });

      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: 'https://custom.com/success',
          cancel_url: 'https://custom.com/cancel'
        })
      );
    });
  });

  describe('createCustomerPortalSession', () => {
    it('should create customer portal session', async () => {
      const session = await createCustomerPortalSession(
        'cus_test_123',
        'https://getjobping.com/account'
      );

      expect(session.id).toBe('bps_test_123');
      expect(mockStripeInstance.billingPortal.sessions.create).toHaveBeenCalled();
    });
  });

  describe('getCustomerByEmail', () => {
    it('should get customer by email', async () => {
      const customer = await getCustomerByEmail('test@example.com');

      expect(customer).toBeDefined();
      expect(mockStripeInstance.customers.list).toHaveBeenCalledWith({
        email: 'test@example.com',
        limit: 1
      });
    });

    it('should return null if customer not found', async () => {
      mockStripeInstance.customers.list.mockResolvedValue({ data: [] });

      const customer = await getCustomerByEmail('notfound@example.com');

      expect(customer).toBeNull();
    });
  });

  describe('getSubscription', () => {
    it('should retrieve subscription', async () => {
      const subscription = await getSubscription('sub_test_123');

      expect(subscription.id).toBe('sub_test_123');
      expect(mockStripeInstance.subscriptions.retrieve).toHaveBeenCalledWith('sub_test_123');
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription', async () => {
      const subscription = await cancelSubscription('sub_test_123');

      expect(subscription.status).toBe('canceled');
      expect(mockStripeInstance.subscriptions.cancel).toHaveBeenCalledWith('sub_test_123');
    });
  });

  describe('updateSubscription', () => {
    it('should update subscription', async () => {
      const subscription = await updateSubscription('sub_test_123', 'price_new');

      expect(subscription).toBeDefined();
      expect(mockStripeInstance.subscriptions.update).toHaveBeenCalled();
    });
  });

  describe('constructWebhookEvent', () => {
    it('should verify webhook signature', () => {
      const event = constructWebhookEvent('payload', 'signature');

      expect(event.type).toBe('checkout.session.completed');
      expect(mockStripeInstance.webhooks.constructEvent).toHaveBeenCalled();
    });

    it('should throw on invalid signature', () => {
      mockStripeInstance.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      expect(() => {
        constructWebhookEvent('payload', 'invalid');
      }).toThrow();
    });
  });

  describe('STRIPE_CONFIG', () => {
    it('should have product IDs', () => {
      expect(STRIPE_CONFIG.PRODUCTS.PREMIUM_MONTHLY).toBeDefined();
    });

    it('should have webhook secret', () => {
      expect(STRIPE_CONFIG.WEBHOOK_SECRET).toBeDefined();
    });

    it('should have success/cancel URLs', () => {
      expect(STRIPE_CONFIG.SUCCESS_URL).toContain('/payment/success');
      expect(STRIPE_CONFIG.CANCEL_URL).toContain('/payment/cancel');
    });
  });
});

