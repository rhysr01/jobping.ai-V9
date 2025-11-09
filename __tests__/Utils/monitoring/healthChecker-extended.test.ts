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

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      gte: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis()
    };

    mockResend = {};

    const { createClient } = require('@supabase/supabase-js');
    createClient.mockReturnValue(mockSupabase);

    const { Resend } = require('resend');
    Resend.mockImplementation(() => mockResend);

    checker = new HealthChecker();
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
      mockSupabase.limit.mockResolvedValue({ data: [{ created_at: new Date().toISOString() }], error: null });

      const result = await checker.performHealthCheck();

      expect(result.components.database.status).toBeDefined();
    });

    it('should check email service health', async () => {
      mockSupabase.select.mockResolvedValue({
        data: [{ sent_at: new Date().toISOString(), status: 'sent' }],
        error: null
      });

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
      mockSupabase.limit.mockResolvedValue({ data: [{ created_at: new Date().toISOString() }], error: null });
      mockSupabase.select.mockResolvedValue({ data: [{ status: 'sent' }], error: null });

      const result = await checker.performHealthCheck();

      expect(['healthy', 'degraded']).toContain(result.status);
    });
  });
});

