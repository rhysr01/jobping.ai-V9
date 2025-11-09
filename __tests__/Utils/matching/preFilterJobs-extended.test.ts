/**
 * Tests for Pre-Filter Jobs Service
 * Tests job pre-filtering logic
 */

import { preFilterJobsByUserPreferencesEnhanced } from '@/Utils/matching/preFilterJobs';
import { buildMockUser, buildMockJob } from '@/__tests__/_helpers/testBuilders';

describe('Pre-Filter Jobs Service', () => {
  describe('preFilterJobsByUserPreferencesEnhanced', () => {
    it('should filter jobs by user preferences', () => {
      const userPrefs = buildMockUser();
      const jobs = [
        buildMockJob(),
        buildMockJob(),
        buildMockJob()
      ];

      const filtered = preFilterJobsByUserPreferencesEnhanced(jobs, userPrefs);

      expect(Array.isArray(filtered)).toBe(true);
      expect(filtered.length).toBeLessThanOrEqual(jobs.length);
    });

    it('should filter by target cities', () => {
      const userPrefs = {
        ...buildMockUser(),
        target_cities: ['London']
      };

      const jobs = [
        { ...buildMockJob(), location: 'London' },
        { ...buildMockJob(), location: 'Paris' },
        { ...buildMockJob(), location: 'London' }
      ];

      const filtered = preFilterJobsByUserPreferencesEnhanced(jobs, userPrefs);

      expect(filtered.every(job => job.location.includes('London'))).toBe(true);
    });

    it('should filter by work environment', () => {
      const userPrefs = {
        ...buildMockUser(),
        work_environment: 'remote'
      };

      const jobs = [
        { ...buildMockJob(), work_environment: 'remote' },
        { ...buildMockJob(), work_environment: 'hybrid' },
        { ...buildMockJob(), work_environment: 'remote' }
      ];

      const filtered = preFilterJobsByUserPreferencesEnhanced(jobs, userPrefs);

      expect(filtered.every(job => job.work_environment === 'remote')).toBe(true);
    });

    it('should handle empty job list', () => {
      const userPrefs = buildMockUser();
      const filtered = preFilterJobsByUserPreferencesEnhanced([], userPrefs);

      expect(filtered).toEqual([]);
    });

    it('should handle jobs without location', () => {
      const userPrefs = {
        ...buildMockUser(),
        target_cities: ['London']
      };

      const jobs = [
        { ...buildMockJob(), location: null },
        { ...buildMockJob(), location: 'London' }
      ];

      const filtered = preFilterJobsByUserPreferencesEnhanced(jobs, userPrefs);

      expect(Array.isArray(filtered)).toBe(true);
    });

    it('should filter by experience level', () => {
      const userPrefs = {
        ...buildMockUser(),
        entry_level_preference: 'entry'
      };

      const jobs = [
        { ...buildMockJob(), experience_required: 'entry' },
        { ...buildMockJob(), experience_required: 'senior' },
        { ...buildMockJob(), experience_required: 'entry' }
      ];

      const filtered = preFilterJobsByUserPreferencesEnhanced(jobs, userPrefs);

      expect(filtered.length).toBeGreaterThan(0);
    });
  });
});

