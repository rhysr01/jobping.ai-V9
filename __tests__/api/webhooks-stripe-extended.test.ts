/**
 * Tests for Stripe Webhook Route
 * Tests Stripe webhook event handling
 */

import { POST } from '@/app/api/webhooks/stripe/route';
import { NextRequest } from 'next/server';
import { constructWebhookEvent } from '@/Utils/stripe';

jest.mock('@/Utils/stripe');
jest.mock('@/Utils/databasePool');
jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn()
}));

describe('Stripe Webhook Route', () => {
  let mockRequest: NextRequest;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      method: 'POST',
      headers: new Headers(),
      text: jest.fn().mockResolvedValue(JSON.stringify({ type: 'test' }))
    } as any;

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn()
    };

    const { getDatabaseClient } = require('@/Utils/databasePool');
    getDatabaseClient.mockReturnValue(mockSupabase);

    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
  });

  describe('POST /api/webhooks/stripe', () => {
    it('should handle checkout.session.completed event', async () => {
      const mockEvent = {
        id: 'evt_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            customer_email: 'user@example.com',
            customer: 'cus_123',
            metadata: { userId: 'user-123' }
          }
        }
      };

      (constructWebhookEvent as jest.Mock).mockResolvedValue(mockEvent);
      mockSupabase.single.mockResolvedValue({
        data: { subscription_active: false },
        error: null
      });
      mockSupabase.eq.mockResolvedValue({ error: null });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it('should handle customer.subscription.updated event', async () => {
      const mockEvent = {
        id: 'evt_456',
        type: 'customer.subscription.updated',
        data: {
          object: {
            customer: 'cus_123',
            status: 'active'
          }
        }
      };

      (constructWebhookEvent as jest.Mock).mockResolvedValue(mockEvent);
      mockSupabase.single.mockResolvedValue({
        data: { email: 'user@example.com' },
        error: null
      });
      mockSupabase.eq.mockResolvedValue({ error: null });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
    });

    it('should handle customer.subscription.deleted event', async () => {
      const mockEvent = {
        id: 'evt_789',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            customer: 'cus_123'
          }
        }
      };

      (constructWebhookEvent as jest.Mock).mockResolvedValue(mockEvent);
      mockSupabase.single.mockResolvedValue({
        data: { email: 'user@example.com' },
        error: null
      });
      mockSupabase.eq.mockResolvedValue({ error: null });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
    });

    it('should return 400 for invalid signature', async () => {
      (constructWebhookEvent as jest.Mock).mockRejectedValue(
        new Error('Invalid signature')
      );

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
    });

    it('should handle idempotency - skip duplicate events', async () => {
      const mockEvent = {
        id: 'evt_duplicate',
        type: 'checkout.session.completed',
        data: {
          object: {
            customer_email: 'user@example.com',
            customer: 'cus_123'
          }
        }
      };

      (constructWebhookEvent as jest.Mock).mockResolvedValue(mockEvent);
      mockSupabase.single.mockResolvedValue({
        data: { subscription_active: true },
        error: null
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('already');
    });

    it('should handle unknown event types', async () => {
      const mockEvent = {
        id: 'evt_unknown',
        type: 'unknown.event.type',
        data: { object: {} }
      };

      (constructWebhookEvent as jest.Mock).mockResolvedValue(mockEvent);

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
    });
  });
});

