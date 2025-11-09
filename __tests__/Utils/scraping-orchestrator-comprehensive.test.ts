/**
 * Comprehensive tests for Scraping Orchestrator
 * Tests orchestration logic, scraper coordination
 */

import {
  orchestrateScraping,
  getScrapingStatus,
  scheduleScrapingJob
} from '@/Utils/scraping-orchestrator';

jest.mock('@/Utils/job-queue.service');
jest.mock('@/Utils/databasePool');

describe('Scraping Orchestrator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('orchestrateScraping', () => {
    it('should orchestrate scraping for platforms', async () => {
      const { addJobToQueue } = require('@/Utils/job-queue.service');
      addJobToQueue.mockResolvedValue({ id: 'job1' });

      const result = await orchestrateScraping(['greenhouse', 'lever']);

      expect(result.success).toBe(true);
      expect(addJobToQueue).toHaveBeenCalled();
    });

    it('should handle empty platform list', async () => {
      const result = await orchestrateScraping([]);

      expect(result.success).toBe(true);
    });
  });

  describe('getScrapingStatus', () => {
    it('should get scraping status', async () => {
      const { getQueueStatus } = require('@/Utils/job-queue.service');
      getQueueStatus.mockResolvedValue({
        pending: 5,
        processing: 2,
        completed: 100
      });

      const status = await getScrapingStatus();

      expect(status).toBeDefined();
      expect(status.pending).toBe(5);
    });
  });

  describe('scheduleScrapingJob', () => {
    it('should schedule scraping job', async () => {
      const { addJobToQueue } = require('@/Utils/job-queue.service');
      addJobToQueue.mockResolvedValue({ id: 'job1' });

      const result = await scheduleScrapingJob({
        platforms: ['greenhouse'],
        scheduledFor: new Date()
      });

      expect(result.jobId).toBeDefined();
    });
  });
});

