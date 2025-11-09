/**
 * Tests for Admin Cleanup Jobs API Route
 * Tests job cleanup functionality (118 statements)
 */

import { POST } from '@/app/api/admin/cleanup-jobs/route';
import { NextRequest } from 'next/server';

jest.mock('@supabase/supabase-js');
jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
  setContext: jest.fn()
}));

describe('Admin Cleanup Jobs API Route', () => {
  let mockRequest: NextRequest;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      method: 'POST',
      headers: new Headers({
        'x-admin-api-key': 'test-admin-key'
      }),
      json: jest.fn()
    } as any;

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: [],
        error: null,
        count: 0
      }),
      in: jest.fn().mockResolvedValue({
        data: [],
        error: null
      })
    };

    const { createClient } = require('@supabase/supabase-js');
    createClient.mockReturnValue(mockSupabase);

    process.env.ADMIN_API_KEY = 'test-admin-key';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  });

  describe('POST /api/admin/cleanup-jobs', () => {
    it('should perform cleanup in dry run mode', async () => {
      mockRequest.json.mockResolvedValue({
        dryRun: true,
        maxAge: 90
      });

      mockSupabase.limit.mockResolvedValue({
        data: [
          { id: '1', created_at: '2023-01-01' },
          { id: '2', created_at: '2023-02-01' }
        ],
        error: null,
        count: 1000
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.dryRun).toBe(true);
      expect(data.metrics).toBeDefined();
    });

    it('should require admin authentication', async () => {
      mockRequest.headers.delete('x-admin-api-key');

      const response = await POST(mockRequest);

      expect(response.status).toBe(401);
    });

    it('should validate maxAge parameter', async () => {
      mockRequest.json.mockResolvedValue({
        maxAge: 5 // Too low
      });

      const response = await POST(mockRequest);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should validate batchSize parameter', async () => {
      mockRequest.json.mockResolvedValue({
        batchSize: 5 // Too low
      });

      const response = await POST(mockRequest);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should enforce safety threshold', async () => {
      mockRequest.json.mockResolvedValue({
        dryRun: false,
        maxAge: 90,
        force: false
      });

      mockSupabase.limit.mockResolvedValue({
        data: Array.from({ length: 2000 }, (_, i) => ({ id: `${i}` })),
        error: null,
        count: 10000
      });

      // Mock that 20% would be deleted (exceeds 15% threshold)
      const response = await POST(mockRequest);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should allow force override', async () => {
      mockRequest.json.mockResolvedValue({
        dryRun: false,
        maxAge: 90,
        force: true
      });

      mockSupabase.limit.mockResolvedValue({
        data: Array.from({ length: 100 }, (_, i) => ({ id: `${i}` })),
        error: null,
        count: 1000
      });

      mockSupabase.in.mockResolvedValue({
        data: [],
        error: null
      });

      const response = await POST(mockRequest);

      expect(response.status).toBeLessThan(500);
    });

    it('should process jobs in batches', async () => {
      mockRequest.json.mockResolvedValue({
        dryRun: false,
        maxAge: 90,
        batchSize: 50,
        force: true
      });

      const jobs = Array.from({ length: 150 }, (_, i) => ({ id: `${i}` }));
      mockSupabase.limit.mockResolvedValue({
        data: jobs,
        error: null,
        count: 1000
      });

      mockSupabase.in.mockResolvedValue({
        data: [],
        error: null
      });

      await POST(mockRequest);

      // Should be called multiple times for batches
      expect(mockSupabase.in.mock.calls.length).toBeGreaterThan(1);
    });

    it('should handle database errors', async () => {
      mockRequest.json.mockResolvedValue({
        dryRun: true,
        maxAge: 90
      });

      mockSupabase.limit.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
        count: 0
      });

      const response = await POST(mockRequest);

      expect(response.status).toBeGreaterThanOrEqual(500);
    });

    it('should return cleanup metrics', async () => {
      mockRequest.json.mockResolvedValue({
        dryRun: true,
        maxAge: 90
      });

      mockSupabase.limit.mockResolvedValue({
        data: [{ id: '1' }],
        error: null,
        count: 1000
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(data.metrics).toHaveProperty('totalJobs');
      expect(data.metrics).toHaveProperty('eligibleForDeletion');
      expect(data.metrics).toHaveProperty('actuallyDeleted');
      expect(data.metrics).toHaveProperty('duration');
    });
  });
});

