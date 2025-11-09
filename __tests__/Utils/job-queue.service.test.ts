/**
 * Tests for Job Queue Service
 * Tests job queue management and processing
 */

import { JobQueueService } from '@/Utils/job-queue.service';

jest.mock('@/Utils/databasePool');
jest.mock('bull', () => ({
  Queue: jest.fn()
}));

describe('Job Queue Service', () => {
  let service: JobQueueService;
  let mockQueue: any;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-123' }),
      process: jest.fn(),
      getJob: jest.fn(),
      getJobs: jest.fn().mockResolvedValue([]),
      clean: jest.fn().mockResolvedValue([])
    };

    const { Queue } = require('bull');
    Queue.mockImplementation(() => mockQueue);

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis()
    };

    const { getDatabaseClient } = require('@/Utils/databasePool');
    getDatabaseClient.mockReturnValue(mockSupabase);

    service = new JobQueueService();
  });

  describe('addJob', () => {
    it('should add job to queue', async () => {
      const jobData = {
        type: 'scrape',
        params: { source: 'reed' }
      };

      const job = await service.addJob(jobData);

      expect(job).toBeDefined();
      expect(mockQueue.add).toHaveBeenCalled();
    });

    it('should handle queue errors', async () => {
      mockQueue.add.mockRejectedValue(new Error('Queue error'));

      await expect(
        service.addJob({ type: 'scrape', params: {} })
      ).rejects.toThrow('Queue error');
    });
  });

  describe('getJobStatus', () => {
    it('should get job status', async () => {
      mockQueue.getJob.mockResolvedValue({
        id: 'job-123',
        data: { type: 'scrape' },
        processedOn: Date.now(),
        finishedOn: Date.now()
      });

      const status = await service.getJobStatus('job-123');

      expect(status).toBeDefined();
    });

    it('should return null for non-existent job', async () => {
      mockQueue.getJob.mockResolvedValue(null);

      const status = await service.getJobStatus('non-existent');

      expect(status).toBeNull();
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      mockQueue.getJobs.mockResolvedValue([
        { id: '1', processedOn: Date.now() },
        { id: '2', processedOn: null }
      ]);

      const stats = await service.getQueueStats();

      expect(stats).toHaveProperty('pending');
      expect(stats).toHaveProperty('processing');
      expect(stats).toHaveProperty('completed');
    });
  });
});

