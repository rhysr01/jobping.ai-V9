/**
 * Tests for Matching Validators
 * Tests all validation logic and hard gates
 */

import {
  applyHardGates,
  validateJobData,
  validateUserPreferences,
  validateMatchResult,
  validateUserEligibility
} from '@/Utils/matching/validators';
import { buildMockJob, buildMockUser } from '@/__tests__/_helpers/testBuilders';

describe('Validators - applyHardGates', () => {
  it('should pass valid job and user', () => {
    const job = buildMockJob({
      title: 'Engineer',
      company: 'Corp',
      job_hash: 'hash123',
      categories: ['tech'],
      location: 'London'
    });
    const user = buildMockUser({ email: 'test@example.com' });

    const result = applyHardGates(job, user);

    expect(result.passed).toBe(true);
    expect(result.reason).toBe('All gates passed');
  });

  it('should fail job with missing title', () => {
    const job = buildMockJob({ title: '' });
    const user = buildMockUser();

    const result = applyHardGates(job, user);

    expect(result.passed).toBe(false);
    expect(result.reason).toBe('Missing required job fields');
  });

  it('should fail job with missing company', () => {
    const job = buildMockJob({ company: '' });
    const user = buildMockUser();

    const result = applyHardGates(job, user);

    expect(result.passed).toBe(false);
    expect(result.reason).toBe('Missing required job fields');
  });

  it('should fail job with no categories', () => {
    const job = buildMockJob({ categories: [] });
    const user = buildMockUser();

    const result = applyHardGates(job, user);

    expect(result.passed).toBe(false);
    expect(result.reason).toBe('Job has no categories');
  });

  it('should fail job with no location', () => {
    const job = buildMockJob({ location: '' });
    const user = buildMockUser();

    const result = applyHardGates(job, user);

    expect(result.passed).toBe(false);
    expect(result.reason).toBe('Job has no location');
  });

  it('should fail if user has no email', () => {
    const job = buildMockJob();
    const user = buildMockUser({ email: '' });

    const result = applyHardGates(job, user);

    expect(result.passed).toBe(false);
    expect(result.reason).toBe('User has no email');
  });

  it('should fail job that is too old (90+ days)', () => {
    const veryOldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
    const job = buildMockJob({ created_at: veryOldDate });
    const user = buildMockUser();

    const result = applyHardGates(job, user);

    expect(result.passed).toBe(false);
    expect(result.reason).toBe('Job is too old');
  });

  it('should pass job that is recent (within 90 days)', () => {
    const recentDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const job = buildMockJob({ created_at: recentDate });
    const user = buildMockUser();

    const result = applyHardGates(job, user);

    expect(result.passed).toBe(true);
  });
});

describe('Validators - validateJobData', () => {
  it('should validate complete job', () => {
    const job = {
      title: 'Engineer',
      company: 'Corp',
      job_hash: 'hash123',
      categories: ['tech'],
      location: 'London'
    };

    expect(validateJobData(job)).toBe(true);
  });

  it('should reject job without title', () => {
    const job = {
      company: 'Corp',
      job_hash: 'hash123',
      categories: ['tech'],
      location: 'London'
    };

    expect(validateJobData(job)).toBe(false);
  });

  it('should reject job without company', () => {
    const job = {
      title: 'Engineer',
      job_hash: 'hash123',
      categories: ['tech'],
      location: 'London'
    };

    expect(validateJobData(job)).toBe(false);
  });

  it('should reject job without job_hash', () => {
    const job = {
      title: 'Engineer',
      company: 'Corp',
      categories: ['tech'],
      location: 'London'
    };

    expect(validateJobData(job)).toBe(false);
  });

  it('should reject job without categories', () => {
    const job = {
      title: 'Engineer',
      company: 'Corp',
      job_hash: 'hash123',
      location: 'London'
    };

    expect(validateJobData(job)).toBe(false);
  });

  it('should reject job without location', () => {
    const job = {
      title: 'Engineer',
      company: 'Corp',
      job_hash: 'hash123',
      categories: ['tech']
    };

    expect(validateJobData(job)).toBe(false);
  });
});

describe('Validators - validateUserPreferences', () => {
  it('should validate user with email', () => {
    const user = { email: 'test@example.com' };

    expect(validateUserPreferences(user)).toBe(true);
  });

  it('should reject user without email', () => {
    const user = {};

    expect(validateUserPreferences(user)).toBe(false);
  });

  it('should reject user with invalid email', () => {
    expect(validateUserPreferences({ email: 'notanemail' })).toBe(false);
    expect(validateUserPreferences({ email: '' })).toBe(false);
  });

  it('should reject user with non-string email', () => {
    expect(validateUserPreferences({ email: 123 as any })).toBe(false);
    expect(validateUserPreferences({ email: null as any })).toBe(false);
  });
});

describe('Validators - validateMatchResult', () => {
  it('should validate complete match result', () => {
    const match = {
      job: buildMockJob(),
      match_score: 85,
      match_reason: 'Great fit',
      match_quality: 'high',
      match_tags: 'tech,early-career',
      confidence_score: 0.9
    };

    expect(validateMatchResult(match)).toBe(true);
  });

  it('should reject match without job', () => {
    const match = {
      match_score: 85,
      match_reason: 'Great fit',
      match_quality: 'high',
      match_tags: 'tech',
      confidence_score: 0.9
    };

    expect(validateMatchResult(match)).toBe(false);
  });

  it('should reject match with invalid match_score', () => {
    const match = {
      job: buildMockJob(),
      match_score: 'high' as any,
      match_reason: 'Great fit',
      match_quality: 'high',
      match_tags: 'tech',
      confidence_score: 0.9
    };

    expect(validateMatchResult(match)).toBe(false);
  });

  it('should reject match without match_reason', () => {
    const match = {
      job: buildMockJob(),
      match_score: 85,
      match_quality: 'high',
      match_tags: 'tech',
      confidence_score: 0.9
    };

    expect(validateMatchResult(match)).toBe(false);
  });

  it('should reject match without confidence_score', () => {
    const match = {
      job: buildMockJob(),
      match_score: 85,
      match_reason: 'Great fit',
      match_quality: 'high',
      match_tags: 'tech'
    };

    expect(validateMatchResult(match)).toBe(false);
  });
});

describe('Validators - validateUserEligibility', () => {
  it('should validate eligible user with all fields', () => {
    const user = buildMockUser({
      email: 'test@example.com',
      career_path: ['tech'],
      target_cities: ['London'],
      professional_expertise: 'software development'
    });

    const result = validateUserEligibility(user);

    expect(result.eligible).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it('should flag user without career path', () => {
    const user = buildMockUser({
      email: 'test@example.com',
      career_path: undefined as any,
      target_cities: ['London'],
      professional_expertise: 'software'
    });

    const result = validateUserEligibility(user);

    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain('No career path specified');
  });

  it('should flag user without professional expertise', () => {
    const user = buildMockUser({
      email: 'test@example.com',
      career_path: ['tech'],
      target_cities: ['London'],
      professional_expertise: undefined as any
    });

    const result = validateUserEligibility(user);

    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain('No professional expertise specified');
  });

  it('should flag user without target cities', () => {
    const user = buildMockUser({
      email: 'test@example.com',
      career_path: ['tech'],
      target_cities: [],
      professional_expertise: 'software'
    });

    const result = validateUserEligibility(user);

    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain('No target cities specified');
  });

  it('should accumulate multiple validation failures', () => {
    const user = buildMockUser({
      email: 'test@example.com',
      career_path: undefined as any,
      target_cities: [],
      professional_expertise: undefined as any
    });

    const result = validateUserEligibility(user);

    expect(result.eligible).toBe(false);
    expect(result.reasons.length).toBeGreaterThan(1);
  });
});

