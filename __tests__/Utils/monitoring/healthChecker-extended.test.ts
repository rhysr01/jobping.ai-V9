/**
 * Comprehensive tests for Health Checker
 * Tests component health checks, overall status determination
 */

import { HealthChecker } from '@/Utils/monitoring/healthChecker';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn()
}));
jest.mock('resend', () => ({
  Resend: jest.fn()
}));

describe('Health Checker', () => {
  let checker: HealthChecker;
  let mockSupabase: any;
  let mockResend: any;

  beforeEach(() => {
    jest.clearAllMocks();

    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    process.env.RESEND_API_KEY = 're_test_key';

    const isoNow = new Date().toISOString();
    const queryResponses: Record<string, { data: any[]; error: any }> = {
      users: { data: [{ count: 1 }], error: null },
      jobs: { data: [{ created_at: isoNow }], error: null },
      email_send_ledger: { data: [{ sent_at: isoNow, status: 'sent' }], error: null },
      job_queue: { data: [{ status: 'completed', created_at: isoNow }], error: null }
    };

    const createQueryObject = (table: string) => {
      const response = queryResponses[table] || { data: [], error: null };
      let obj: any;
      obj = {
        select: jest.fn(() => obj),
        limit: jest.fn(() => Promise.resolve(response)),
        gte: jest.fn(() => obj),
        eq: jest.fn(() => obj)
      };
      return obj;
    };

    mockSupabase = {
      from: jest.fn((table: string) => createQueryObject(table)),
      storage: {
        listBuckets: jest.fn().mockResolvedValue({ data: ['public'], error: null })
      }
    };

    mockResend = {};

    const { createClient } = require('@supabase/supabase-js');
    createClient.mockReturnValue(mockSupabase);

    const { Resend } = require('resend');
    Resend.mockImplementation(() => mockResend);

    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    checker = new HealthChecker();
  });

  afterEach(() => {
    jest.resetModules();
    delete process.env.RESEND_API_KEY;
  });

  describe('performHealthCheck', () => {
    it('should perform comprehensive health check', async () => {
      const result = await checker.performHealthCheck();

      expect(result.status).toBeDefined();
      expect(result.components).toBeDefined();
      expect(result.components.database).toBeDefined();
      expect(result.components.email).toBeDefined();
    });

    it('should check database health', async () => {
      const result = await checker.performHealthCheck();

      expect(result.components.database.status).toBeDefined();
    });

    it('should check email service health', async () => {
      const result = await checker.performHealthCheck();

      expect(result.components.email.status).toBeDefined();
    });

    it('should include metrics', async () => {
      const result = await checker.performHealthCheck();

      expect(result.metrics).toBeDefined();
      expect(result.metrics.response_time).toBeDefined();
      expect(result.metrics.memory_usage).toBeDefined();
      expect(result.metrics.uptime).toBeDefined();
    });
  });

  describe('determineOverallStatus', () => {
    it('should return healthy when all components healthy', async () => {
      const result = await checker.performHealthCheck();

      expect(result.status).toBe('healthy');
    });
  });
});

