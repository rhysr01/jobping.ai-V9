/**
 * Tests for Matching Metrics Service
 * Tests matching performance metrics collection
 */

import {
  calculateRecallAt50,
  calculateNDCGAt5,
  recordMatchMetrics
} from '@/Utils/matching/metrics.service';

jest.mock('@/Utils/databasePool');
jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn()
}));

describe('Matching Metrics Service', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ error: null })
    };

    const { getDatabaseClient } = require('@/Utils/databasePool');
    getDatabaseClient.mockReturnValue(mockSupabase);
  });

  describe('calculateRecallAt50', () => {
    it('should calculate recall correctly', () => {
      const top50Jobs = [
        { job_hash: 'hash1', score: 90 },
        { job_hash: 'hash2', score: 85 },
        { job_hash: 'hash3', score: 80 }
      ];
      const relevantHashes = new Set(['hash1', 'hash2', 'hash4']);

      const recall = calculateRecallAt50(top50Jobs, relevantHashes);

      expect(recall).toBe(2 / 3); // 2 relevant in top50 / 3 total relevant
    });

    it('should return 0 when no relevant jobs', () => {
      const top50Jobs = [{ job_hash: 'hash1', score: 90 }];
      const relevantHashes = new Set();

      const recall = calculateRecallAt50(top50Jobs, relevantHashes);

      expect(recall).toBe(0);
    });
  });

  describe('calculateNDCGAt5', () => {
    it('should calculate nDCG correctly', () => {
      const top5Jobs = [
        { job_hash: 'hash1', score: 90 },
        { job_hash: 'hash2', score: 85 },
        { job_hash: 'hash3', score: 80 }
      ];
      const relevantHashes = new Set(['hash1', 'hash2']);

      const ndcg = calculateNDCGAt5(top5Jobs, relevantHashes);

      expect(ndcg).toBeGreaterThan(0);
      expect(ndcg).toBeLessThanOrEqual(1);
    });

    it('should return 0 for empty job list', () => {
      const ndcg = calculateNDCGAt5([], new Set(['hash1']));
      expect(ndcg).toBe(0);
    });
  });

  describe('recordMatchMetrics', () => {
    it('should record metrics to database', async () => {
      await recordMatchMetrics({
        recallAt50: 0.8,
        ndcgAt5: 0.75,
        timestamp: new Date().toISOString(),
        matchType: 'ai'
      });

      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.insert.mockResolvedValue({
        error: { message: 'DB error' }
      });

      await expect(
        recordMatchMetrics({
          recallAt50: 0.8,
          ndcgAt5: 0.75,
          timestamp: new Date().toISOString(),
          matchType: 'ai'
        })
      ).resolves.not.toThrow();
    });
  });
});

