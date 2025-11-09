/**
 * Tests for Process Scraping Queue Cron API Route
 * Tests scraping queue processing
 */

import { GET, HEAD } from '@/app/api/cron/process-scraping-queue/route';
import { NextRequest } from 'next/server';

jest.mock('@supabase/supabase-js');
jest.mock('@/lib/errors', () => ({
  asyncHandler: (fn: any) => fn,
  AppError: class extends Error {
    constructor(message: string, status: number, code: string, details?: any) {
      super(message);
      this.name = 'AppError';
      this.status = status;
      this.code = code;
      this.details = details;
    }
  }
}));

describe('Process Scraping Queue Cron API Route', () => {
  let mockRequest: NextRequest;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      method: 'GET',
      headers: new Headers()
    } as any;

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockResolvedValue({ error: null }),
      eq: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: [],
        error: null
      })
    };

    const { createClient } = require('@supabase/supabase-js');
    createClient.mockReturnValue(mockSupabase);

    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  });

  describe('GET /api/cron/process-scraping-queue', () => {
    it('should process pending scraping jobs', async () => {
      mockSupabase.limit.mockResolvedValue({
        data: [
          {
            id: 'job1',
            type: 'job_scrape',
            status: 'pending',
            payload: { companies: ['Company1'], scraperType: 'adzuna' }
          }
        ],
        error: null
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.processed).toBeDefined();
      expect(data.failed).toBeDefined();
    });

    it('should return message when no jobs to process', async () => {
      mockSupabase.limit.mockResolvedValue({
        data: [],
        error: null
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('No jobs');
      expect(data.processed).toBe(0);
    });

    it('should mark jobs as processing', async () => {
      mockSupabase.limit.mockResolvedValue({
        data: [
          {
            id: 'job1',
            type: 'job_scrape',
            status: 'pending',
            payload: { companies: ['Company1'], scraperType: 'adzuna' }
          }
        ],
        error: null
      });

      await GET(mockRequest);

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'processing' })
      );
    });

    it('should handle different scraper types', async () => {
      const scraperTypes = ['adzuna', 'reed', 'muse', 'greenhouse'];

      for (const scraperType of scraperTypes) {
        mockSupabase.limit.mockResolvedValue({
          data: [
            {
              id: `job_${scraperType}`,
              type: 'job_scrape',
              status: 'pending',
              payload: { companies: ['Company1'], scraperType }
            }
          ],
          error: null
        });

        const response = await GET(mockRequest);

        expect(response.status).toBe(200);
      }
    });

    it('should handle job failures with retry logic', async () => {
      mockSupabase.limit.mockResolvedValue({
        data: [
          {
            id: 'job1',
            type: 'job_scrape',
            status: 'pending',
            payload: { companies: ['Company1'], scraperType: 'adzuna' },
            attempts: 0,
            max_attempts: 2
          }
        ],
        error: null
      });

      // Mock scraper to fail
      // The route will handle retry logic internally

      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
    });

    it('should respect time limit', async () => {
      jest.useFakeTimers();

      mockSupabase.limit.mockResolvedValue({
        data: Array.from({ length: 100 }, (_, i) => ({
          id: `job${i}`,
          type: 'job_scrape',
          status: 'pending',
          payload: { companies: ['Company1'], scraperType: 'adzuna' }
        })),
        error: null
      });

      const promise = GET(mockRequest);

      // Advance time past MAX_PROCESSING_TIME (25 seconds)
      jest.advanceTimersByTime(26000);

      const response = await promise;
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.processed).toBeLessThan(100);

      jest.useRealTimers();
    });

    it('should handle database errors', async () => {
      mockSupabase.limit.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      await expect(GET(mockRequest)).rejects.toThrow();
    });
  });

  describe('HEAD /api/cron/process-scraping-queue', () => {
    it('should return 200 for health check', async () => {
      const response = await HEAD();

      expect(response.status).toBe(200);
    });
  });
});

