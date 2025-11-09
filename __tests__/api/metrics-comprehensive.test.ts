/**
 * Comprehensive tests for Metrics API Route
 * Tests metrics collection and historical data
 */

import { GET, HEAD } from '@/app/api/metrics/route';
import { NextRequest } from 'next/server';

jest.mock('@/Utils/monitoring/metricsCollector');

describe('Metrics API Route', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      method: 'GET',
      url: 'https://example.com/api/metrics',
      headers: new Headers()
    } as any;

    const { metricsCollector } = require('@/Utils/monitoring/metricsCollector');
    metricsCollector.collectMetrics.mockResolvedValue({
      business: {
        active_users: 100,
        total_users: 500,
        recent_jobs: 50,
        recent_matches: 200,
        email_sends_today: 150,
        failed_emails: 5
      },
      performance: {
        response_time: 120
      },
      queue: {
        pending_jobs: 10,
        processing_jobs: 5,
        failed_jobs: 2,
        completed_jobs_today: 100
      }
    });

    metricsCollector.getMetricsHistory.mockResolvedValue([
      {
        timestamp: new Date().toISOString(),
        business: {
          active_users: 100,
          recent_jobs: 50,
          recent_matches: 200,
          email_sends_today: 150,
          failed_emails: 5,
          total_users: 500
        },
        performance: {
          response_time: 120
        },
        queue: {
          pending_jobs: 10,
          processing_jobs: 5,
          failed_jobs: 2,
          completed_jobs_today: 100
        }
      }
    ]);
  });

  describe('GET /api/metrics', () => {
    it('should return current metrics', async () => {
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.current).toBeDefined();
      expect(data.current.business).toBeDefined();
    });

    it('should return historical metrics when hours specified', async () => {
      mockRequest.url = 'https://example.com/api/metrics?hours=24';

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.history).toBeDefined();
      expect(Array.isArray(data.history)).toBe(true);
    });

    it('should validate hours parameter', async () => {
      mockRequest.url = 'https://example.com/api/metrics?hours=200';

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid hours');
    });

    it('should use default hours if not specified', async () => {
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(data.requested_hours).toBe(1);
    });

    it('should include collection time', async () => {
      const response = await GET(mockRequest);
      const data = await response.json();

      expect(data.collection_time).toBeDefined();
      expect(typeof data.collection_time).toBe('number');
    });

    it('should handle collection errors', async () => {
      const { metricsCollector } = require('@/Utils/monitoring/metricsCollector');
      metricsCollector.collectMetrics.mockRejectedValue(new Error('Collection failed'));

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  describe('HEAD /api/metrics', () => {
    it('should return 200 for health check', async () => {
      const response = await HEAD();

      expect(response.status).toBe(200);
    });
  });
});

