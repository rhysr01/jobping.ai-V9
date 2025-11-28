/**
 * Stripe Integration Tests
 * 
 * These tests verify Stripe checkout and webhook functionality.
 * Uses Stripe test mode (automatic with Vercel integration).
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import Stripe from 'stripe';

// Use test keys (Vercel integration provides these)
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy';
const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_dummy';

describe('Stripe Integration', () => {
  let stripe: Stripe;

  beforeAll(() => {
    // Skip tests if Stripe keys not configured
    if (!process.env.STRIPE_SECRET_KEY || STRIPE_SECRET_KEY.includes('dummy')) {
      console.warn('⚠️  Stripe test keys not configured. Skipping Stripe tests.');
      return;
    }

    stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
    });
  });

  describe('Checkout Session Creation', () => {
    it('should create a checkout session', async () => {
      if (!stripe) {
        console.warn('Skipping: Stripe not configured');
        return;
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Test Product',
              },
              unit_amount: 1000, // $10.00
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
      });

      expect(session).toBeDefined();
      expect(session.id).toMatch(/^cs_test_/);
      expect(session.url).toBeDefined();
    });

    it('should create a subscription checkout session', async () => {
      if (!stripe) {
        console.warn('Skipping: Stripe not configured');
        return;
      }

      // Note: Requires a price ID from Stripe Dashboard
      // For testing, create a test price first
      const priceId = process.env.STRIPE_TEST_PRICE_ID;

      if (!priceId) {
        console.warn('⚠️  STRIPE_TEST_PRICE_ID not set. Skipping subscription test.');
        return;
      }

      const session = await stripe.checkout.sessions.create({
        customer_email: 'test@example.com',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
      });

      expect(session).toBeDefined();
      expect(session.id).toMatch(/^cs_test_/);
      expect(session.mode).toBe('subscription');
    });
  });

  describe('Webhook Signature Verification', () => {
    it('should verify webhook signature', async () => {
      if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
        console.warn('Skipping: Stripe webhook secret not configured');
        return;
      }

      const payload = JSON.stringify({
        id: 'evt_test_webhook',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            customer_email: 'test@example.com',
          },
        },
      });

      const secret = process.env.STRIPE_WEBHOOK_SECRET;
      const signature = stripe.webhooks.generateTestHeaderString({
        payload,
        secret,
      });

      // Verify signature
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        secret
      );

      expect(event).toBeDefined();
      expect(event.type).toBe('checkout.session.completed');
    });
  });

  describe('Test Cards', () => {
    it('should document test card numbers', () => {
      // These are Stripe's official test cards
      const testCards = {
        success: '4242 4242 4242 4242',
        decline: '4000 0000 0000 0002',
        requiresAuth: '4000 0025 0000 3155',
        insufficientFunds: '4000 0000 0000 9995',
      };

      expect(testCards.success).toBe('4242 4242 4242 4242');
      expect(testCards.decline).toBe('4000 0000 0000 0002');
    });
  });
});

