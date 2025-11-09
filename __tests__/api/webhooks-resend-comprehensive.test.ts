/**
 * Tests for Webhooks Resend API Route
 * Tests Resend webhook event handling
 */

import { POST, GET } from '@/app/api/webhooks/resend/route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/api-logger', () => ({
  apiLogger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
  }
}));
jest.mock('@/Utils/databasePool');
jest.mock('crypto', () => ({
  createHmac: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'mock-signature')
  })),
  timingSafeEqual: jest.fn(() => true)
}));

describe('Webhooks Resend API Route', () => {
  let mockRequest: NextRequest;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      method: 'POST',
      text: jest.fn(),
      headers: new Headers({
        'resend-signature': 'sha256=mock-signature'
      })
    } as any;

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ error: null }),
      upsert: jest.fn().mockResolvedValue({ error: null }),
      rpc: jest.fn().mockResolvedValue({ error: null })
    };

    const { getDatabaseClient } = require('@/Utils/databasePool');
    getDatabaseClient.mockReturnValue(mockSupabase);

    process.env.RESEND_WEBHOOK_SECRET = 'test-secret';
  });

  describe('POST /api/webhooks/resend', () => {
    it('should process email.bounced event', async () => {
      const event = {
        type: 'email.bounced',
        created_at: new Date().toISOString(),
        data: {
          email_id: 'email_123',
          to: 'bounced@example.com',
          from: 'test@getjobping.com',
          subject: 'Test',
          bounce: {
            bounce_type: 'permanent',
            diagnostic_code: '550 Invalid recipient'
          }
        }
      };

      mockRequest.text.mockResolvedValue(JSON.stringify(event));

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.processed).toBe('email.bounced');
    });

    it('should suppress permanent bounces', async () => {
      const event = {
        type: 'email.bounced',
        created_at: new Date().toISOString(),
        data: {
          email_id: 'email_123',
          to: 'bounced@example.com',
          from: 'test@getjobping.com',
          subject: 'Test',
          bounce: {
            bounce_type: 'permanent',
            diagnostic_code: '550 Invalid recipient'
          }
        }
      };

      mockRequest.text.mockResolvedValue(JSON.stringify(event));

      await POST(mockRequest);

      expect(mockSupabase.upsert).toHaveBeenCalled();
    });

    it('should not suppress temporary bounces', async () => {
      const event = {
        type: 'email.bounced',
        created_at: new Date().toISOString(),
        data: {
          email_id: 'email_123',
          to: 'bounced@example.com',
          from: 'test@getjobping.com',
          subject: 'Test',
          bounce: {
            bounce_type: 'temporary',
            diagnostic_code: '451 Temporary failure'
          }
        }
      };

      mockRequest.text.mockResolvedValue(JSON.stringify(event));

      await POST(mockRequest);

      // Should not suppress temporary bounces
      expect(mockSupabase.upsert).not.toHaveBeenCalled();
    });

    it('should process email.complained event', async () => {
      const event = {
        type: 'email.complained',
        created_at: new Date().toISOString(),
        data: {
          email_id: 'email_123',
          to: 'complaint@example.com',
          from: 'test@getjobping.com',
          subject: 'Test',
          complaint: {
            complaint_type: 'spam',
            feedback_type: 'abuse'
          }
        }
      };

      mockRequest.text.mockResolvedValue(JSON.stringify(event));

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.processed).toBe('email.complained');
      expect(mockSupabase.upsert).toHaveBeenCalled();
    });

    it('should handle positive signals without suppression', async () => {
      const event = {
        type: 'email.delivered',
        created_at: new Date().toISOString(),
        data: {
          email_id: 'email_123',
          to: 'user@example.com',
          from: 'test@getjobping.com',
          subject: 'Test'
        }
      };

      mockRequest.text.mockResolvedValue(JSON.stringify(event));

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      expect(mockSupabase.upsert).not.toHaveBeenCalled();
    });

    it('should verify webhook signature', async () => {
      mockRequest.headers.delete('resend-signature');

      const event = {
        type: 'email.bounced',
        data: {}
      };

      mockRequest.text.mockResolvedValue(JSON.stringify(event));

      const response = await POST(mockRequest);

      expect(response.status).toBe(401);
    });

    it('should handle invalid signature', async () => {
      const crypto = require('crypto');
      crypto.timingSafeEqual.mockReturnValue(false);

      const event = {
        type: 'email.bounced',
        data: {}
      };

      mockRequest.text.mockResolvedValue(JSON.stringify(event));

      const response = await POST(mockRequest);

      expect(response.status).toBe(401);
    });

    it('should allow webhook in dev if secret not set', async () => {
      delete process.env.RESEND_WEBHOOK_SECRET;

      const event = {
        type: 'email.bounced',
        data: {}
      };

      mockRequest.text.mockResolvedValue(JSON.stringify(event));

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
    });

    it('should handle unhandled event types', async () => {
      const event = {
        type: 'email.unknown',
        created_at: new Date().toISOString(),
        data: {}
      };

      mockRequest.text.mockResolvedValue(JSON.stringify(event));

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
    });

    it('should handle parsing errors', async () => {
      mockRequest.text.mockResolvedValue('invalid json');

      const response = await POST(mockRequest);

      expect(response.status).toBeGreaterThanOrEqual(500);
    });
  });

  describe('GET /api/webhooks/resend', () => {
    it('should return method not allowed', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.error).toContain('Method not allowed');
    });
  });
});

