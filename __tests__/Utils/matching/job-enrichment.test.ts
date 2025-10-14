/**
 * Tests for Job Enrichment Service
 * Tests job data enrichment and scoring logic
 */

import {
  enrichJobData,
  calculateFreshnessTier
} from '@/Utils/matching/job-enrichment.service';
import { buildMockJob } from '@/__tests__/_helpers/testBuilders';

describe('Job Enrichment - enrichJobData', () => {
  it('should enrich job with all fields', () => {
    const job = buildMockJob({
      title: 'Junior Software Engineer',
      description: 'Looking for a junior developer with visa sponsorship available',
      company: 'Google',
      work_environment: 'remote',
      posted_at: new Date().toISOString(),
      categories: ['tech', 'early-career']
    });

    const enriched = enrichJobData(job);

    expect(enriched).toHaveProperty('visaFriendly');
    expect(enriched).toHaveProperty('experienceLevel');
    expect(enriched).toHaveProperty('marketDemand');
    expect(enriched).toHaveProperty('salaryRange');
    expect(enriched).toHaveProperty('companySize');
    expect(enriched).toHaveProperty('remoteFlexibility');
    expect(enriched).toHaveProperty('growthPotential');
  });

  it('should detect visa sponsorship', () => {
    const jobWithVisa = buildMockJob({
      description: 'We offer visa sponsorship for qualified candidates'
    });
    const jobWithoutVisa = buildMockJob({
      description: 'Local candidates only'
    });

    const enrichedWithVisa = enrichJobData(jobWithVisa);
    const enrichedWithoutVisa = enrichJobData(jobWithoutVisa);

    expect(enrichedWithVisa.visaFriendly).toBe(true);
    expect(enrichedWithoutVisa.visaFriendly).toBe(false);
  });

  it('should determine experience level from title', () => {
    const seniorJob = buildMockJob({ title: 'Senior Software Engineer' });
    const juniorJob = buildMockJob({ title: 'Junior Developer' });
    const entryJob = buildMockJob({ title: 'Graduate Software Engineer' });

    expect(enrichJobData(seniorJob).experienceLevel).toBe('senior');
    expect(enrichJobData(juniorJob).experienceLevel).toBe('junior');
    expect(enrichJobData(entryJob).experienceLevel).toBe('entry');
  });

  it('should calculate market demand based on categories', () => {
    const highDemandJob = buildMockJob({
      categories: ['tech', 'ai', 'machine-learning', 'data']
    });
    const lowDemandJob = buildMockJob({
      categories: ['other']
    });

    const highDemand = enrichJobData(highDemandJob).marketDemand;
    const lowDemand = enrichJobData(lowDemandJob).marketDemand;

    expect(highDemand).toBeGreaterThan(lowDemand);
    expect(highDemand).toBeLessThanOrEqual(10);
  });

  it('should extract salary range from description', () => {
    const jobWithSalary = buildMockJob({
      description: 'Salary: €50,000 - €70,000 per year'
    });
    const jobWithoutSalary = buildMockJob({
      description: 'Competitive salary offered'
    });

    expect(enrichJobData(jobWithSalary).salaryRange).toContain('€');
    expect(enrichJobData(jobWithoutSalary).salaryRange).toBe('Competitive');
  });

  it('should determine company size', () => {
    const bigTechJob = buildMockJob({ company: 'Google' });
    const startupJob = buildMockJob({ company: 'TechStartup Inc' });

    const bigTechEnriched = enrichJobData(bigTechJob);
    const startupEnriched = enrichJobData(startupJob);

    expect(bigTechEnriched.companySize).toBeTruthy();
    expect(startupEnriched.companySize).toBeTruthy();
  });

  it('should calculate remote flexibility', () => {
    const remoteJob = buildMockJob({
      work_environment: 'remote',
      description: 'Fully remote position'
    });
    const onsiteJob = buildMockJob({
      work_environment: 'on-site',
      description: 'Office-based role'
    });

    const remoteScore = enrichJobData(remoteJob).remoteFlexibility;
    const onsiteScore = enrichJobData(onsiteJob).remoteFlexibility;

    expect(remoteScore).toBeGreaterThan(onsiteScore);
  });

  it('should handle missing optional fields gracefully', () => {
    const minimalJob = buildMockJob({
      title: 'Engineer',
      company: 'Corp',
      description: undefined as any,
      work_environment: undefined as any
    });

    const enriched = enrichJobData(minimalJob);

    expect(enriched).toBeTruthy();
    expect(enriched.experienceLevel).toBe('entry'); // Default
  });
});

describe('Job Enrichment - calculateFreshnessTier', () => {
  it('should classify ultra fresh jobs (< 24 hours)', () => {
    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);

    const tier = calculateFreshnessTier(twelveHoursAgo.toISOString());

    expect(tier).toBe('ultra_fresh');
  });

  it('should classify fresh jobs (24-72 hours)', () => {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const tier = calculateFreshnessTier(twoDaysAgo.toISOString());

    expect(tier).toBe('fresh');
  });

  it('should classify comprehensive jobs (> 72 hours)', () => {
    const now = new Date();
    const fourDaysAgo = new Date(now.getTime() - 96 * 60 * 60 * 1000);

    const tier = calculateFreshnessTier(fourDaysAgo.toISOString());

    expect(tier).toBe('comprehensive');
  });

  it('should handle old jobs as comprehensive', () => {
    const now = new Date();
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const tier = calculateFreshnessTier(twoMonthsAgo.toISOString());

    expect(tier).toBe('comprehensive');
  });

  it('should handle edge case at 24 hour boundary', () => {
    const now = new Date();
    const exactlyOneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const tier = calculateFreshnessTier(exactlyOneDayAgo.toISOString());

    expect(['ultra_fresh', 'fresh']).toContain(tier); // Boundary case
  });

  it('should handle edge case at 72 hour boundary', () => {
    const now = new Date();
    const exactlyThreeDaysAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);

    const tier = calculateFreshnessTier(exactlyThreeDaysAgo.toISOString());

    expect(['fresh', 'comprehensive']).toContain(tier); // Boundary case
  });
});

