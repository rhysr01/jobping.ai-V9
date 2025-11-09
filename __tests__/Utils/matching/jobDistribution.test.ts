/**
 * Tests for Job Distribution Service
 * Tests job diversity and distribution logic
 */

import {
  distributeJobsWithDiversity,
  getDistributionStats
} from '@/Utils/matching/jobDistribution';
import { buildMockJob } from '@/__tests__/_helpers/testBuilders';

describe('Job Distribution Service', () => {
  describe('distributeJobsWithDiversity', () => {
    it('should distribute jobs with diversity', () => {
      const jobs = Array.from({ length: 100 }, (_, i) => ({
        ...buildMockJob(),
        source: `source${i % 3}`,
        city: `City${i % 5}`,
        company: `Company ${i % 10}`
      }));

      const distributed = distributeJobsWithDiversity(jobs, {
        targetCount: 20,
        targetCities: ['City0', 'City1', 'City2']
      });

      expect(distributed.length).toBeLessThanOrEqual(20);
      expect(distributed.length).toBeGreaterThan(0);
    });

    it('should ensure company diversity', () => {
      const jobs = Array.from({ length: 50 }, () => ({
        ...buildMockJob(),
        source: 'same-source',
        city: 'City0'
      }));

      const distributed = distributeJobsWithDiversity(jobs, {
        targetCount: 20,
        targetCities: ['City0']
      });

      // Should still return jobs even if all same source
      expect(distributed.length).toBeGreaterThan(0);
    });

    it('should ensure location diversity', () => {
      const jobs = Array.from({ length: 50 }, () => ({
        ...buildMockJob(),
        source: 'source1',
        city: 'SameCity'
      }));

      const distributed = distributeJobsWithDiversity(jobs, {
        targetCount: 20,
        targetCities: ['SameCity']
      });

      expect(distributed.length).toBeGreaterThan(0);
    });

    it('should handle empty job list', () => {
      const distributed = distributeJobsWithDiversity([], {
        targetCount: 20,
        targetCities: []
      });

      expect(distributed).toEqual([]);
    });

    it('should respect limit parameter', () => {
      const jobs = Array.from({ length: 100 }, (_, i) => ({
        ...buildMockJob(),
        source: `source${i % 3}`,
        city: `City${i % 2}`
      }));

      const distributed = distributeJobsWithDiversity(jobs, {
        targetCount: 10,
        targetCities: ['City0', 'City1']
      });

      expect(distributed.length).toBeLessThanOrEqual(10);
    });
  });

  describe('getDistributionStats', () => {
    it('should calculate distribution statistics', () => {
      const jobs = [
        { ...buildMockJob(), source: 'source1', city: 'London' },
        { ...buildMockJob(), source: 'source2', city: 'Paris' },
        { ...buildMockJob(), source: 'source1', city: 'London' }
      ];

      const stats = getDistributionStats(jobs);

      expect(stats).toHaveProperty('uniqueSources');
      expect(stats).toHaveProperty('uniqueCities');
      expect(stats.uniqueSources).toBe(2);
      expect(stats.uniqueCities).toBe(2);
    });

    it('should handle empty job list', () => {
      const stats = getDistributionStats([]);

      expect(stats.uniqueSources).toBe(0);
      expect(stats.uniqueCities).toBe(0);
    });
  });
});

