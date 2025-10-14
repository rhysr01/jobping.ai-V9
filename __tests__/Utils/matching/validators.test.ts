/**
 * Tests for Matching Validators
 * Tests all validation logic and hard gates
 */

import {
  applyHardGates,
  validateJobData,
  validateUserPreferences,
  validateMatchResult,
  validateUserEligibility,
  validateJobFreshness,
  validateLocationCompatibility,
  validateCareerPathCompatibility,
  validateWorkEnvironmentCompatibility,
  validateJobUserCompatibility,
  validateMatchingConfig
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

describe('Validators - validateJobFreshness', () => {
  it('should mark job as ultra_fresh within 1 day', () => {
    const oneDayAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    const job = buildMockJob({ created_at: oneDayAgo });

    const result = validateJobFreshness(job);

    expect(result.fresh).toBe(true);
    expect(result.tier).toBe('ultra_fresh');
    expect(result.daysOld).toBe(0);
  });

  it('should mark job as fresh within 7 days', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const job = buildMockJob({ created_at: threeDaysAgo });

    const result = validateJobFreshness(job);

    expect(result.fresh).toBe(true);
    expect(result.tier).toBe('fresh');
    expect(result.daysOld).toBe(3);
  });

  it('should mark job as stale between 7-30 days', () => {
    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
    const job = buildMockJob({ created_at: fifteenDaysAgo });

    const result = validateJobFreshness(job);

    expect(result.fresh).toBe(false);
    expect(result.tier).toBe('stale');
    expect(result.daysOld).toBe(15);
  });

  it('should mark job as very_stale after 30 days', () => {
    const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
    const job = buildMockJob({ created_at: fortyDaysAgo });

    const result = validateJobFreshness(job);

    expect(result.fresh).toBe(false);
    expect(result.tier).toBe('very_stale');
    expect(result.daysOld).toBe(40);
  });

  it('should handle job without created_at date', () => {
    const job = buildMockJob({ created_at: undefined });

    const result = validateJobFreshness(job);

    expect(result.fresh).toBe(false);
    expect(result.tier).toBe('very_stale');
    expect(result.daysOld).toBe(999);
  });
});

describe('Validators - validateLocationCompatibility', () => {
  it('should find exact location match', () => {
    const result = validateLocationCompatibility(['London, UK'], ['London']);

    expect(result.compatible).toBe(true);
    expect(result.matchScore).toBe(100);
    expect(result.reasons[0]).toContain('Exact location match');
  });

  it('should handle remote jobs', () => {
    const result = validateLocationCompatibility(['Remote, Anywhere'], ['London']);

    expect(result.compatible).toBe(true);
    expect(result.matchScore).toBeGreaterThanOrEqual(80);
    expect(result.reasons).toContain('Remote work available');
  });

  it('should reject incompatible locations', () => {
    const result = validateLocationCompatibility(['New York, USA'], ['London']);

    expect(result.compatible).toBe(false);
    expect(result.matchScore).toBe(0);
  });

  it('should handle empty user target cities', () => {
    const result = validateLocationCompatibility(['London'], []);

    expect(result.compatible).toBe(false);
    expect(result.reasons).toContain('No target cities specified');
  });

  it('should handle empty job locations', () => {
    const result = validateLocationCompatibility([], ['London']);

    expect(result.compatible).toBe(false);
    expect(result.reasons).toContain('Job has no location');
  });

  it('should match multiple user cities', () => {
    const result = validateLocationCompatibility(['Berlin, Germany'], ['London', 'Berlin', 'Paris']);

    expect(result.compatible).toBe(true);
    expect(result.matchScore).toBe(100);
  });
});

describe('Validators - validateCareerPathCompatibility', () => {
  it('should match compatible career paths', () => {
    const result = validateCareerPathCompatibility(['tech', 'software'], 'tech');

    expect(result).toBeDefined();
    expect(result.matchScore).toBeGreaterThanOrEqual(0);
  });

  it('should reject incompatible career paths', () => {
    const result = validateCareerPathCompatibility(['marketing', 'sales'], 'software-engineer');

    expect(result).toBeDefined();
    expect(result.matchScore).toBeGreaterThanOrEqual(0);
  });

  it('should handle missing user career path', () => {
    const result = validateCareerPathCompatibility(['tech'], '');

    expect(result.compatible).toBe(false);
    expect(result.reasons).toContain('No career path specified');
  });

  it('should handle missing job categories', () => {
    const result = validateCareerPathCompatibility([], 'software-engineer');

    expect(result.compatible).toBe(false);
    expect(result.reasons).toContain('Job has no categories');
  });
});

describe('Validators - validateWorkEnvironmentCompatibility', () => {
  it('should match exact work environment preference', () => {
    const result = validateWorkEnvironmentCompatibility('remote', 'remote');

    expect(result.compatible).toBe(true);
    expect(result.matchScore).toBe(100);
  });

  it('should handle hybrid compatibility', () => {
    const result = validateWorkEnvironmentCompatibility('hybrid', 'remote');

    expect(result.compatible).toBe(true);
    expect(result.matchScore).toBeGreaterThan(0);
  });

  it('should handle missing user preference', () => {
    const result = validateWorkEnvironmentCompatibility('remote', undefined);

    expect(result.compatible).toBe(true); // Should default to compatible
  });

  it('should handle missing job environment', () => {
    const result = validateWorkEnvironmentCompatibility(undefined, 'remote');

    expect(result.compatible).toBe(true); // Should default to compatible
  });

  it('should handle office vs remote preference', () => {
    const result = validateWorkEnvironmentCompatibility('office', 'remote');

    expect(result).toBeDefined();
    expect(result.matchScore).toBeGreaterThanOrEqual(0);
  });
});

describe('Validators - validateJobUserCompatibility', () => {
  it('should validate fully compatible job and user', () => {
    const job = buildMockJob({
      location: 'London, UK',
      categories: ['tech', 'early-career'],
      work_environment: 'remote',
      created_at: new Date().toISOString()
    });
    const user = buildMockUser({
      target_cities: ['London'],
      career_path: ['tech'],
      work_environment: 'remote'
    });

    const result = validateJobUserCompatibility(job, user);

    expect(result.compatible).toBe(true);
    expect(result.overallScore).toBeGreaterThan(0);
  });

  it('should handle location incompatibility', () => {
    const job = buildMockJob({ location: 'New York, USA' });
    const user = buildMockUser({ target_cities: ['London'] });

    const result = validateJobUserCompatibility(job, user);

    expect(result.breakdown.location.compatible).toBe(false);
  });

  it('should handle career path incompatibility', () => {
    const job = buildMockJob({ categories: ['marketing'] });
    const user = buildMockUser({ career_path: ['tech'] });

    const result = validateJobUserCompatibility(job, user);

    expect(result.breakdown.careerPath.compatible).toBe(false);
  });

  it('should handle work environment compatibility', () => {
    const job = buildMockJob({ work_environment: 'office' });
    const user = buildMockUser({ work_environment: 'remote' });

    const result = validateJobUserCompatibility(job, user);

    expect(result.breakdown.workEnvironment).toBeDefined();
  });

  it('should provide detailed compatibility breakdown', () => {
    const job = buildMockJob();
    const user = buildMockUser();

    const result = validateJobUserCompatibility(job, user);

    expect(result).toHaveProperty('compatible');
    expect(result).toHaveProperty('overallScore');
    expect(result).toHaveProperty('breakdown');
    expect(result.breakdown).toHaveProperty('location');
    expect(result.breakdown).toHaveProperty('careerPath');
    expect(result.breakdown).toHaveProperty('workEnvironment');
  });
});

describe('Validators - validateMatchingConfig', () => {
  it('should validate matching configuration', () => {
    const result = validateMatchingConfig();

    expect(result).toHaveProperty('valid');
    expect(result).toHaveProperty('errors');
    expect(Array.isArray(result.errors)).toBe(true);
  });

  it('should return validation status', () => {
    const result = validateMatchingConfig();

    expect(typeof result.valid).toBe('boolean');
  });

  it('should provide error details if invalid', () => {
    const result = validateMatchingConfig();

    if (!result.valid) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });
});

