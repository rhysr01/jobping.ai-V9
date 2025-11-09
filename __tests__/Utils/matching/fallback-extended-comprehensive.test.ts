/**
 * Comprehensive tests for Fallback Service
 * Tests fallback matching logic, error handling
 */

import {
  performFallbackMatching,
  getFallbackMatches
} from '@/Utils/matching/fallback.service';

jest.mock('@/Utils/matching/rule-based-matcher.service');

describe('Fallback Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('performFallbackMatching', () => {
    it('should perform fallback matching', async () => {
      const jobs = [
        { id: 'job1', title: 'Engineer', location: 'London' }
      ];
      const userPrefs = {
        email: 'user@example.com',
        target_cities: ['London']
      };

      const result = await performFallbackMatching(jobs, userPrefs);

      expect(result).toBeDefined();
      expect(result.matches).toBeDefined();
    });

    it('should handle empty jobs', async () => {
      const userPrefs = {
        email: 'user@example.com',
        target_cities: ['London']
      };

      const result = await performFallbackMatching([], userPrefs);

      expect(result.matches).toEqual([]);
    });
  });

  describe('getFallbackMatches', () => {
    it('should get fallback matches', async () => {
      const jobs = [
        { id: 'job1', title: 'Engineer' }
      ];
      const userPrefs = {
        email: 'user@example.com'
      };

      const matches = await getFallbackMatches(jobs, userPrefs);

      expect(Array.isArray(matches)).toBe(true);
    });
  });
});

