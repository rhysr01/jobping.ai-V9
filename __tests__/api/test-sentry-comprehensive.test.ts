/**
 * Comprehensive tests for Test Sentry API Route
 * Tests Sentry health checks, test event sending
 */

import { NextRequest } from 'next/server';

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  setUser: jest.fn(),
  setContext: jest.fn(),
  __esModule: true
}));

describe('Test Sentry API Route', () => {
  let GET: any;

  beforeEach(() => {
    jest.clearAllMocks();
    GET = require('@/app/api/test-sentry/route').GET;
  });

  describe('GET /api/test-sentry', () => {
    it('should report not configured when DSN missing', async () => {
      delete process.env.SENTRY_DSN;
      delete process.env.NEXT_PUBLIC_SENTRY_DSN;

      const req = new NextRequest('http://localhost/api/test-sentry');

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(false);
      expect(data.status).toBe('not_configured');
    });

    it('should send test events when configured', async () => {
      process.env.SENTRY_DSN = 'https://public@sentry.example/123';

      const req = new NextRequest('http://localhost/api/test-sentry');

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const Sentry = require('@sentry/nextjs');
      expect(Sentry.captureMessage).toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalled();
    });
  });

  afterEach(() => {
    delete process.env.SENTRY_DSN;
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
  });
});
