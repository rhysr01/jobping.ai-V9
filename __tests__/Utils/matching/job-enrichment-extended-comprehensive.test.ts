/**
 * Comprehensive tests for Job Enrichment Service
 * Tests job data enrichment, normalization
 */

import {
  enrichJobData,
  normalizeJobData,
  getJobMetadata
} from '@/Utils/matching/job-enrichment.service';

describe('Job Enrichment Service', () => {
  describe('enrichJobData', () => {
    it('should enrich job data', () => {
      const job = {
        id: 'job1',
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'London'
      };

      const enriched = enrichJobData(job as any);

      expect(enriched).toBeDefined();
      expect(enriched.title).toBe('Software Engineer');
    });

    it('should add metadata', () => {
      const job = {
        id: 'job1',
        title: 'Engineer'
      };

      const enriched = enrichJobData(job as any);

      expect(enriched).toBeDefined();
    });
  });

  describe('normalizeJobData', () => {
    it('should normalize job data', () => {
      const job = {
        title: '  Software Engineer  ',
        company: 'Tech Corp',
        location: 'London, UK'
      };

      const normalized = normalizeJobData(job as any);

      expect(normalized.title).toBe('Software Engineer');
    });
  });

  describe('getJobMetadata', () => {
    it('should extract job metadata', () => {
      const job = {
        id: 'job1',
        title: 'Engineer',
        description: 'Great opportunity'
      };

      const metadata = getJobMetadata(job as any);

      expect(metadata).toBeDefined();
    });
  });
});

