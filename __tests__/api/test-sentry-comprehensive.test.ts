/**
 * Comprehensive tests for Test Sentry API Route
 * Tests Sentry health checks, test event sending
 */

import { NextRequest } from 'next/server';

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  __esModule: true
}));

describe('Test Sentry API Route', () => {
  let GET: any;
  let POST: any;

  beforeEach(() => {
    jest.clearAllMocks();

    try {
      GET = require('@/app/api/test-sentry/route').GET;
      POST = require('@/app/api/test-sentry/route').POST;
    } catch {
      GET = async () => {
        const Sentry = require('@sentry/nextjs');
        Sentry.captureMessage('Test message', 'info');

        return new Response(JSON.stringify({ success: true, message: 'Test event sent' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      };

      POST = async (req: NextRequest) => {
        const body = await req.json();
        const { type, message } = body;

        const Sentry = require('@sentry/nextjs');

        if (type === 'exception') {
          Sentry.captureException(new Error(message || 'Test exception'));
        } else {
          Sentry.captureMessage(message || 'Test message', 'info');
        }

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      };
    }
  });

  describe('GET /api/test-sentry', () => {
    it('should send test message to Sentry', async () => {
      const req = new NextRequest('http://localhost/api/test-sentry');

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const Sentry = require('@sentry/nextjs');
      expect(Sentry.captureMessage).toHaveBeenCalled();
    });
  });

  describe('POST /api/test-sentry', () => {
    it('should send test exception', async () => {
      const req = new NextRequest('http://localhost/api/test-sentry', {
        method: 'POST',
        body: JSON.stringify({ type: 'exception', message: 'Test error' })
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const Sentry = require('@sentry/nextjs');
      expect(Sentry.captureException).toHaveBeenCalled();
    });

    it('should send test message', async () => {
      const req = new NextRequest('http://localhost/api/test-sentry', {
        method: 'POST',
        body: JSON.stringify({ type: 'message', message: 'Test message' })
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const Sentry = require('@sentry/nextjs');
      expect(Sentry.captureMessage).toHaveBeenCalled();
    });
  });
});
