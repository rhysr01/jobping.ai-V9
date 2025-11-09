/**
 * Tests for Metrics Collector
 * Tests system metrics collection
 */

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn()
}));

import { MetricsCollector } from '@/Utils/monitoring/metricsCollector';

describe('MetricsCollector', () => {
  let collector: MetricsCollector;
  let mockSupabase: any;
  let mockCreateClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    const { createClient } = require('@supabase/supabase-js');
    mockCreateClient = createClient;

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      rpc: jest.fn().mockResolvedValue({ data: null, error: null })
    };

    mockCreateClient.mockReturnValue(mockSupabase);

    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

    collector = new MetricsCollector();
  });

  describe('collectMetrics', () => {
    it('should collect system metrics', async () => {
      const metrics = await collector.collectMetrics();

      expect(metrics).toHaveProperty('timestamp');
      expect(metrics).toHaveProperty('performance');
      expect(metrics).toHaveProperty('business');
      expect(metrics).toHaveProperty('queue');
      expect(metrics).toHaveProperty('errors');
    });

    it('should include performance metrics', async () => {
      const metrics = await collector.collectMetrics();

      expect(metrics.performance).toHaveProperty('response_time');
      expect(metrics.performance).toHaveProperty('memory_usage');
      expect(metrics.performance).toHaveProperty('uptime');
    });

    it('should include business metrics', async () => {
      const metrics = await collector.collectMetrics();

      expect(metrics.business).toHaveProperty('total_users');
      expect(metrics.business).toHaveProperty('active_users');
      expect(metrics.business).toHaveProperty('total_jobs');
    });

    it('should include queue metrics', async () => {
      const metrics = await collector.collectMetrics();

      expect(metrics.queue).toHaveProperty('pending_jobs');
      expect(metrics.queue).toHaveProperty('processing_jobs');
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.select.mockResolvedValue({ data: null, error: new Error('DB error'), count: 0 });

      const metrics = await collector.collectMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.business.total_users).toBe(0);
    });
  });

  describe('getCachedMetrics', () => {
    it('should return cached metrics when available', async () => {
      await collector.collectMetrics();
      const cached = collector.getCachedMetrics();

      expect(cached).toBeDefined();
    });

    it('should return null when cache expired', async () => {
      jest.useFakeTimers();
      await collector.collectMetrics();
      
      jest.advanceTimersByTime(6 * 60 * 1000); // 6 minutes
      const cached = collector.getCachedMetrics();

      expect(cached).toBeNull();
      jest.useRealTimers();
    });
  });
});

