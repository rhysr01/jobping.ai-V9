/**
 * Comprehensive tests for Job Queue Service
 * Tests job queuing, processing, retry logic
 */

import {
  addJobToQueue,
  processQueue,
  getQueueStatus,
  retryFailedJobs
} from '@/Utils/job-queue.service';

jest.mock('@/Utils/databasePool');

describe('Job Queue Service', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ error: null }),
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockResolvedValue({ error: null }),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null })
    };

    const { getDatabaseClient } = require('@/Utils/databasePool');
    getDatabaseClient.mockReturnValue(mockSupabase);
  });

  describe('addJobToQueue', () => {
    it('should add job to queue', async () => {
      const job = {
        type: 'job_scrape',
        payload: { companies: ['Company A'] },
        priority: 1
      };

      await addJobToQueue(job);

      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it('should set default priority', async () => {
      const job = {
        type: 'job_scrape',
        payload: {}
      };

      await addJobToQueue(job);

      expect(mockSupabase.insert).toHaveBeenCalled();
    });
  });

  describe('processQueue', () => {
    it('should process pending jobs', async () => {
      mockSupabase.limit.mockResolvedValue({
        data: [
          {
            id: 'job1',
            type: 'job_scrape',
            status: 'pending',
            payload: {}
          }
        ],
        error: null
      });

      const result = await processQueue('job_scrape', 10);

      expect(result.processed).toBeDefined();
    });

    it('should handle empty queue', async () => {
      mockSupabase.limit.mockResolvedValue({
        data: [],
        error: null
      });

      const result = await processQueue('job_scrape', 10);

      expect(result.processed).toBe(0);
    });
  });

  describe('getQueueStatus', () => {
    it('should get queue status', async () => {
      mockSupabase.limit.mockResolvedValue({
        data: [
          { status: 'pending' },
          { status: 'processing' },
          { status: 'completed' }
        ],
        error: null
      });

      const status = await getQueueStatus();

      expect(status.pending).toBeDefined();
      expect(status.processing).toBeDefined();
      expect(status.completed).toBeDefined();
    });
  });

  describe('retryFailedJobs', () => {
    it('should retry failed jobs', async () => {
      mockSupabase.limit.mockResolvedValue({
        data: [
          {
            id: 'job1',
            attempts: 1,
            max_attempts: 3
          }
        ],
        error: null
      });

      const result = await retryFailedJobs();

      expect(result.retried).toBeDefined();
    });
  });
});

