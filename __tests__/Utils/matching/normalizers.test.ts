/**
 * Tests for Matching Normalizers
 * Tests all normalization utility functions
 */

import {
  toStringArray,
  toOptString,
  toWorkEnv,
  reqString,
  reqFirst,
  normalizeCategoriesForRead,
  isJob,
  normalizeUser,
  normalizeUserPreferences,
  normalizeJobForMatching
} from '@/Utils/matching/normalizers';

describe('Normalizers - toStringArray', () => {
  it('should convert array to string array', () => {
    expect(toStringArray(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('should filter out empty strings', () => {
    expect(toStringArray(['a', '', 'b', '  ', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('should split pipe-delimited string', () => {
    expect(toStringArray('tech|data|marketing')).toEqual(['tech', 'data', 'marketing']);
  });

  it('should handle single string', () => {
    expect(toStringArray('tech')).toEqual(['tech']);
  });

  it('should return fallback for null/undefined', () => {
    expect(toStringArray(null)).toEqual([]);
    expect(toStringArray(undefined)).toEqual([]);
    expect(toStringArray(null, ['default'])).toEqual(['default']);
  });

  it('should return fallback for non-string/non-array', () => {
    expect(toStringArray(123)).toEqual([]);
    expect(toStringArray({})).toEqual([]);
  });

  it('should preserve whitespace in array elements but filter empties', () => {
    // The function filters out empty strings but doesn't trim individual array elements
    expect(toStringArray(['tech', 'data', '  '])).toEqual(['tech', 'data']);
  });
});

describe('Normalizers - toOptString', () => {
  it('should return string for valid input', () => {
    expect(toOptString('test')).toBe('test');
  });

  it('should return null for empty string', () => {
    expect(toOptString('')).toBeNull();
    expect(toOptString('   ')).toBeNull();
  });

  it('should return null for non-string', () => {
    expect(toOptString(null)).toBeNull();
    expect(toOptString(undefined)).toBeNull();
    expect(toOptString(123)).toBeNull();
  });
});

describe('Normalizers - toWorkEnv', () => {
  it('should normalize onsite variants', () => {
    expect(toWorkEnv('onsite')).toBe('on-site');
    expect(toWorkEnv('office')).toBe('on-site');
    expect(toWorkEnv('ONSITE')).toBe('on-site');
  });

  it('should normalize hybrid', () => {
    expect(toWorkEnv('hybrid')).toBe('hybrid');
    expect(toWorkEnv('HYBRID')).toBe('hybrid');
  });

  it('should normalize remote', () => {
    expect(toWorkEnv('remote')).toBe('remote');
    expect(toWorkEnv('REMOTE')).toBe('remote');
  });

  it('should return null for invalid input', () => {
    expect(toWorkEnv('invalid')).toBeNull();
    expect(toWorkEnv('')).toBeNull();
    expect(toWorkEnv(null)).toBeNull();
  });
});

describe('Normalizers - reqString', () => {
  it('should return string for valid input', () => {
    expect(reqString('test')).toBe('test');
  });

  it('should return fallback for null/undefined', () => {
    expect(reqString(null)).toBe('');
    expect(reqString(undefined)).toBe('');
    expect(reqString(null, 'default')).toBe('default');
  });
});

describe('Normalizers - reqFirst', () => {
  it('should return first element of array', () => {
    expect(reqFirst(['first', 'second', 'third'])).toBe('first');
  });

  it('should return fallback for empty array', () => {
    expect(reqFirst([])).toBe('unknown');
    expect(reqFirst([], 'default')).toBe('default');
  });

  it('should return fallback for null/undefined', () => {
    expect(reqFirst(null)).toBe('unknown');
    expect(reqFirst(undefined)).toBe('unknown');
  });
});

describe('Normalizers - normalizeCategoriesForRead', () => {
  it('should normalize categories array', () => {
    expect(normalizeCategoriesForRead(['early-career', 'tech'])).toEqual(['early-career', 'tech']);
  });

  it('should normalize pipe-delimited string', () => {
    expect(normalizeCategoriesForRead('early-career|tech|graduate')).toEqual(['early-career', 'tech', 'graduate']);
  });

  it('should filter empty values', () => {
    expect(normalizeCategoriesForRead(['tech', '', 'data'])).toEqual(['tech', 'data']);
  });
});

describe('Normalizers - isJob', () => {
  it('should validate complete job object', () => {
    const job = {
      job_hash: 'hash123',
      title: 'Engineer',
      company: 'Corp',
      job_url: 'https://example.com'
    };

    expect(isJob(job)).toBe(true);
  });

  it('should reject object missing job_hash', () => {
    const job = {
      title: 'Engineer',
      company: 'Corp',
      job_url: 'url'
    };

    expect(isJob(job)).toBe(false);
  });

  it('should reject object missing required fields', () => {
    expect(isJob({ job_hash: 'hash' })).toBe(false);
    expect(isJob({ job_hash: 'hash', title: 'Title' })).toBe(false);
  });

  it('should reject non-objects', () => {
    expect(isJob(null)).toBe(false);
    expect(isJob(undefined)).toBe(false);
    expect(isJob('string')).toBe(false);
    expect(isJob(123)).toBe(false);
  });
});

describe('Normalizers - normalizeUser', () => {
  it('should normalize user with all fields', () => {
    const rawUser = {
      email: 'test@example.com',
      career_path: ['tech', 'data'],
      target_cities: ['London', 'Berlin'],
      languages_spoken: ['English'],
      company_types: ['tech'],
      roles_selected: ['developer'],
      professional_expertise: 'software',
      entry_level_preference: 'entry',
      work_environment: 'hybrid',
      start_date: '2024-01-01'
    };

    const normalized = normalizeUser(rawUser);

    expect(normalized.email).toBe('test@example.com');
    expect(normalized.career_path).toEqual(['tech', 'data']);
    expect(normalized.target_cities).toEqual(['London', 'Berlin']);
    expect(normalized.careerFocus).toBe('tech');
  });

  it('should handle pipe-delimited strings', () => {
    const rawUser = {
      email: 'test@example.com',
      career_path: 'tech|data|marketing',
      target_cities: 'London|Berlin|Paris'
    };

    const normalized = normalizeUser(rawUser as any);

    expect(normalized.career_path).toEqual(['tech', 'data', 'marketing']);
    expect(normalized.target_cities).toEqual(['London', 'Berlin', 'Paris']);
  });

  it('should handle missing optional fields', () => {
    const rawUser = {
      email: 'test@example.com'
    };

    const normalized = normalizeUser(rawUser);

    expect(normalized.email).toBe('test@example.com');
    expect(normalized.career_path).toEqual([]);
    expect(normalized.target_cities).toEqual([]);
  });

  it('should normalize work environment', () => {
    expect(normalizeUser({ email: 'test@test.com', work_environment: 'onsite' }).work_environment).toBe('on-site');
    expect(normalizeUser({ email: 'test@test.com', work_environment: 'hybrid' }).work_environment).toBe('hybrid');
    expect(normalizeUser({ email: 'test@test.com', work_environment: 'remote' }).work_environment).toBe('remote');
  });
});

describe('Normalizers - normalizeUserPreferences', () => {
  it('should normalize user preferences', () => {
    const userPrefs = {
      email: 'test@example.com',
      career_path: ['tech'],
      target_cities: ['London'],
      professional_expertise: 'software',
      entry_level_preference: 'entry',
      work_environment: 'hybrid' as const,
      visa_status: 'eu-citizen',
      start_date: '2024-01-01',
      languages_spoken: ['English'],
      company_types: ['tech'],
      roles_selected: ['developer'],
      full_name: 'Test User'
    };

    const normalized = normalizeUserPreferences(userPrefs);

    expect(normalized).toHaveProperty('email', 'test@example.com');
    expect(normalized).toHaveProperty('career_path');
    expect(normalized).toHaveProperty('careerFocus');
  });

  it('should extract career focus from career_path', () => {
    const userPrefs = {
      email: 'test@example.com',
      career_path: ['tech', 'data'],
      target_cities: [],
      professional_expertise: '',
      entry_level_preference: '',
      work_environment: 'hybrid' as const,
      visa_status: '',
      start_date: '',
      languages_spoken: [],
      company_types: [],
      roles_selected: [],
      full_name: ''
    };

    const normalized = normalizeUserPreferences(userPrefs);

    expect(normalized.careerFocus).toBe('tech');
  });
});

describe('Normalizers - normalizeJobForMatching', () => {
  it('should normalize job for matching', () => {
    const job: any = {
      job_hash: 'hash123',
      title: 'Software Engineer',
      company: 'Tech Corp',
      location: 'London, UK',
      description: 'Great job',
      job_url: 'https://example.com',
      categories: ['early-career', 'tech'],
      work_environment: 'hybrid'
    };

    const normalized = normalizeJobForMatching(job);

    expect(normalized).toHaveProperty('job_hash', 'hash123');
    expect(normalized).toHaveProperty('title', 'Software Engineer');
  });

  it('should handle missing optional fields', () => {
    const job: any = {
      job_hash: 'hash123',
      title: 'Engineer',
      company: 'Corp',
      job_url: 'url'
    };

    const normalized = normalizeJobForMatching(job);

    expect(normalized).toHaveProperty('job_hash');
    expect(normalized).toHaveProperty('title');
  });
});

