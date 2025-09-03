/**
 * Tests for scraper helper functions
 */

import {
  IngestJob,
  classifyEarlyCareer,
  parseLocation,
  makeJobHash,
  validateJob,
  convertToDatabaseFormat,
  shouldSaveJob
} from '../utils';

describe('Scraper Helper Functions', () => {
  const mockIngestJob: IngestJob = {
    title: 'Software Engineer Graduate',
    company: 'Tech Corp',
    location: 'London, UK',
    description: 'We are looking for a recent graduate to join our software engineering team. No experience required.',
    url: 'https://example.com/job',
    posted_at: '2024-01-01T00:00:00Z',
    source: 'lever'
  };

  describe('classifyEarlyCareer', () => {
    it('should classify graduate jobs as early career', () => {
      const job: IngestJob = {
        ...mockIngestJob,
        title: 'Graduate Software Engineer',
        description: 'Perfect for recent graduates'
      };
      
      expect(classifyEarlyCareer(job)).toBe(true);
    });

    it('should classify entry-level jobs as early career', () => {
      const job: IngestJob = {
        ...mockIngestJob,
        title: 'Entry Level Developer',
        description: 'No experience required'
      };
      
      expect(classifyEarlyCareer(job)).toBe(true);
    });

    it('should classify senior jobs as not early career', () => {
      const job: IngestJob = {
        ...mockIngestJob,
        title: 'Senior Software Engineer',
        description: '5+ years of experience required'
      };
      
      expect(classifyEarlyCareer(job)).toBe(false);
    });

    it('should classify jobs with education requirements as early career', () => {
      const job: IngestJob = {
        ...mockIngestJob,
        title: 'Software Engineer',
        description: 'Bachelor\'s degree required'
      };
      
      expect(classifyEarlyCareer(job)).toBe(true);
    });
  });



  describe('parseLocation', () => {
    it('should parse EU location correctly', () => {
      const result = parseLocation('London, UK');
      
      expect(result.city).toBe('london');
      expect(result.country).toBe('uk');
      expect(result.isEU).toBe(true);
      expect(result.isRemote).toBe(false);
    });

    it('should parse remote location correctly', () => {
      const result = parseLocation('Remote');
      
      expect(result.city).toBe('remote');
      expect(result.isRemote).toBe(true);
      expect(result.isEU).toBe(true); // Remote jobs considered potentially EU
    });

    it('should parse non-EU location correctly', () => {
      const result = parseLocation('New York, USA');
      
      expect(result.city).toBe('new york');
      expect(result.country).toBe('usa');
      expect(result.isEU).toBe(false);
      expect(result.isRemote).toBe(false);
    });

    it('should handle location without country', () => {
      const result = parseLocation('Berlin');
      
      expect(result.city).toBe('berlin');
      expect(result.country).toBe('berlin'); // When no comma, the whole string becomes city
      expect(result.isEU).toBe(false); // No country specified
    });
  });

  describe('makeJobHash', () => {
    it('should generate consistent hash for same job', () => {
      const job1: IngestJob = {
        ...mockIngestJob,
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'London'
      };
      
      const job2: IngestJob = {
        ...mockIngestJob,
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'London'
      };
      
      expect(makeJobHash(job1)).toBe(makeJobHash(job2));
    });

    it('should generate different hash for different jobs', () => {
      const job1: IngestJob = {
        ...mockIngestJob,
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'London'
      };
      
      const job2: IngestJob = {
        ...mockIngestJob,
        title: 'Data Scientist',
        company: 'Tech Corp',
        location: 'London'
      };
      
      expect(makeJobHash(job1)).not.toBe(makeJobHash(job2));
    });
  });

  describe('validateJob', () => {
    it('should validate complete job', () => {
      const result = validateJob(mockIngestJob);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject job without title', () => {
      const job: IngestJob = {
        ...mockIngestJob,
        title: ''
      };
      
      const result = validateJob(job);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Title is required');
    });

    it('should reject job without company', () => {
      const job: IngestJob = {
        ...mockIngestJob,
        company: ''
      };
      
      const result = validateJob(job);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Company is required');
    });

    it('should reject job without location', () => {
      const job: IngestJob = {
        ...mockIngestJob,
        location: ''
      };
      
      const result = validateJob(job);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Location is required');
    });
  });

  describe('shouldSaveJob', () => {
    it('should save early-career EU job', () => {
      const job: IngestJob = {
        ...mockIngestJob,
        title: 'Graduate Software Engineer',
        location: 'London, UK',
        description: 'Perfect for recent graduates'
      };
      
      expect(shouldSaveJob(job)).toBe(true);
    });

    it('should not save senior EU job', () => {
      const job: IngestJob = {
        ...mockIngestJob,
        title: 'Senior Software Engineer',
        location: 'London, UK',
        description: '5+ years of experience required'
      };
      
      expect(shouldSaveJob(job)).toBe(false);
    });

    it('should not save early-career non-EU job', () => {
      const job: IngestJob = {
        ...mockIngestJob,
        title: 'Graduate Software Engineer',
        location: 'New York, USA',
        description: 'Perfect for recent graduates'
      };
      
      expect(shouldSaveJob(job)).toBe(false);
    });

    it('should save early-career remote job', () => {
      const job: IngestJob = {
        ...mockIngestJob,
        title: 'Graduate Software Engineer',
        location: 'Remote',
        description: 'Perfect for recent graduates'
      };
      
      expect(shouldSaveJob(job)).toBe(true);
    });
  });

  describe('convertToDatabaseFormat', () => {
    it('should convert IngestJob to database format', () => {
      const result = convertToDatabaseFormat(mockIngestJob);
      
      expect(result.job_hash).toBeDefined();
      expect(result.title).toBe('Software Engineer Graduate');
      expect(result.company).toBe('Tech Corp');
      expect(result.location).toBe('London, UK');
      expect(result.job_url).toBe('https://example.com/job');
      expect(result.source).toBe('lever');
      expect(result.categories).toContain('early-career');
      expect(result.work_environment).toBe('on-site');
      expect(result.experience_required).toBe('entry-level');
      expect(result.metadata).toBeDefined();
      expect(result.metadata.isEarlyCareer).toBe(true);
      expect(result.metadata.isEU).toBe(true);
    });

    it('should handle remote jobs correctly', () => {
      const remoteJob: IngestJob = {
        ...mockIngestJob,
        location: 'Remote'
      };
      
      const result = convertToDatabaseFormat(remoteJob);
      
      expect(result.work_environment).toBe('remote');
      expect(result.metadata.isRemote).toBe(true);
    });

    it('should handle experienced jobs correctly', () => {
      const seniorJob: IngestJob = {
        ...mockIngestJob,
        title: 'Senior Software Engineer',
        description: '5+ years of experience required'
      };
      
      const result = convertToDatabaseFormat(seniorJob);
      
      expect(result.categories).toContain('experienced');
      expect(result.experience_required).toBe('experienced');
      expect(result.metadata.isEarlyCareer).toBe(false);
    });
  });
});
