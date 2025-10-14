/**
 * Test Data Builders
 * Generate consistent test data with sensible defaults
 */

import type { Job } from '@/scrapers/types';
import type { UserPreferences } from '@/Utils/matching/types';

// ================================
// USER BUILDERS
// ================================

export const buildMockUser = (overrides: Partial<UserPreferences> = {}): UserPreferences => {
  return {
    email: 'test@example.com',
    full_name: 'Test User',
    professional_expertise: 'software development',
    career_path: ['tech'],
    target_cities: ['London', 'Berlin'],
    languages_spoken: ['English'],
    company_types: ['tech', 'startup'],
    roles_selected: ['developer', 'engineer'],
    entry_level_preference: 'entry',
    work_environment: 'hybrid',
    visa_status: 'eu-citizen',
    start_date: '2024-01-01',
    ...overrides
  };
};

export const buildMockPremiumUser = (overrides: Partial<UserPreferences> = {}): UserPreferences => {
  return buildMockUser({
    subscription_tier: 'premium',
    ...overrides
  });
};

export const buildMockFreeUser = (overrides: Partial<UserPreferences> = {}): UserPreferences => {
  return buildMockUser({
    subscription_tier: 'free',
    ...overrides
  });
};

// ================================
// JOB BUILDERS
// ================================

export const buildMockJob = (overrides: Partial<Job> = {}): Job => {
  const id = Math.random().toString(36).substring(7);
  
  return {
    id: parseInt(id, 36),
    job_hash: `hash-${id}`,
    title: 'Junior Software Engineer',
    company: 'Tech Corp',
    location: 'London, UK',
    job_url: `https://example.com/job/${id}`,
    description: 'Great opportunity for early career professionals',
    source: 'test',
    categories: ['early-career', 'tech'],
    experience_required: 'entry-level',
    work_environment: 'hybrid',
    company_profile_url: '',
    language_requirements: ['English'],
    scrape_timestamp: new Date().toISOString(),
    original_posted_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    posted_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    last_seen_at: new Date().toISOString(),
    is_active: true,
    created_at: new Date().toISOString(),
    ...overrides
  };
};

export const buildMockGraduateJob = (overrides: Partial<Job> = {}): Job => {
  return buildMockJob({
    title: 'Graduate Programme - Technology',
    description: 'Graduate scheme for recent university graduates',
    categories: ['early-career', 'graduate-scheme'],
    ...overrides
  });
};

export const buildMockInternship = (overrides: Partial<Job> = {}): Job => {
  return buildMockJob({
    title: 'Summer Internship - Data Analytics',
    description: 'Internship program for students',
    categories: ['early-career', 'internship'],
    ...overrides
  });
};

export const buildMockSeniorJob = (overrides: Partial<Job> = {}): Job => {
  return buildMockJob({
    title: 'Senior Software Engineer',
    description: 'Requires 5+ years of experience',
    experience_required: 'senior',
    categories: ['experienced'],
    ...overrides
  });
};

export const buildMockRemoteJob = (overrides: Partial<Job> = {}): Job => {
  return buildMockJob({
    location: 'Remote - Europe',
    work_environment: 'remote',
    ...overrides
  });
};

// ================================
// MATCH BUILDERS
// ================================

export const buildMockMatch = (overrides: any = {}) => {
  return {
    user_email: 'test@example.com',
    job_hash: 'hash-' + Math.random().toString(36).substring(7),
    match_score: 85,
    match_reason: 'Great match based on your preferences',
    confidence_score: 0.8,
    matched_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    match_algorithm: 'ai',
    ai_latency_ms: 1500,
    cache_hit: false,
    ...overrides
  };
};

// ================================
// BATCH BUILDERS
// ================================

export const buildMockJobs = (count: number, overrides: Partial<Job> = {}): Job[] => {
  return Array.from({ length: count }, (_, i) => 
    buildMockJob({
      job_hash: `hash-${i}`,
      title: `Job ${i + 1}`,
      ...overrides
    })
  );
};

export const buildMockUsers = (count: number, overrides: Partial<UserPreferences> = {}): UserPreferences[] => {
  return Array.from({ length: count }, (_, i) => 
    buildMockUser({
      email: `user${i + 1}@example.com`,
      full_name: `User ${i + 1}`,
      ...overrides
    })
  );
};

export const buildMockMatches = (count: number, overrides: any = {}) => {
  return Array.from({ length: count }, (_, i) => 
    buildMockMatch({
      job_hash: `hash-${i}`,
      match_score: 80 + i,
      ...overrides
    })
  );
};

// ================================
// SCENARIO BUILDERS
// ================================

/**
 * Build a complete test scenario with users, jobs, and expected matches
 */
export const buildMatchingScenario = (options: {
  userCount?: number;
  jobCount?: number;
  includeGraduateJobs?: boolean;
  includeInternships?: boolean;
  includeSeniorJobs?: boolean;
} = {}) => {
  const {
    userCount = 1,
    jobCount = 5,
    includeGraduateJobs = true,
    includeInternships = true,
    includeSeniorJobs = false
  } = options;

  const jobs: Job[] = [];
  
  if (includeGraduateJobs) {
    jobs.push(buildMockGraduateJob({ job_hash: 'grad-1' }));
    jobs.push(buildMockGraduateJob({ job_hash: 'grad-2', location: 'Berlin, Germany' }));
  }
  
  if (includeInternships) {
    jobs.push(buildMockInternship({ job_hash: 'intern-1' }));
  }
  
  if (includeSeniorJobs) {
    jobs.push(buildMockSeniorJob({ job_hash: 'senior-1' }));
  }
  
  // Fill remaining with regular junior jobs
  while (jobs.length < jobCount) {
    jobs.push(buildMockJob({ job_hash: `job-${jobs.length}` }));
  }

  const users = buildMockUsers(userCount);

  return { users, jobs };
};

// ================================
// DATABASE ROW BUILDERS
// ================================

/**
 * Build database user row (matches actual DB schema)
 */
export const buildDbUser = (overrides: any = {}) => {
  return {
    id: 'user-' + Math.random().toString(36).substring(7),
    email: 'test@example.com',
    full_name: 'Test User',
    professional_expertise: 'software development',
    professional_experience: 'software development',
    career_path: 'tech',
    target_cities: ['London', 'Berlin'],
    languages_spoken: ['English'],
    company_types: ['tech'],
    roles_selected: ['developer'],
    entry_level_preference: 'entry',
    work_environment: 'hybrid',
    visa_status: 'eu-citizen',
    start_date: '2024-01-01',
    email_verified: true,
    active: true,
    subscription_active: false,
    delivery_paused: false,
    email_engagement_score: 50,
    email_count: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_email_sent: null,
    last_email_opened: null,
    last_email_clicked: null,
    last_engagement_date: null,
    cv_url: null,
    onboarding_complete: true,
    re_engagement_sent: false,
    email_phase: 'active',
    target_employment_start_date: null,
    verification_token: null,
    verification_token_expires: null,
    ...overrides
  };
};

/**
 * Build database job row (matches actual DB schema)
 */
export const buildDbJob = (overrides: any = {}) => {
  const id = Math.random().toString(36).substring(7);
  
  return {
    id: parseInt(id, 36),
    job_hash: `hash-${id}`,
    title: 'Junior Software Engineer',
    company: 'Tech Corp',
    location: 'London, UK',
    job_url: `https://example.com/job/${id}`,
    description: 'Great opportunity',
    source: 'test',
    categories: ['early-career', 'tech'],
    experience_required: 'entry-level',
    work_environment: 'hybrid',
    posted_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    is_active: true,
    is_sent: false,
    status: 'active',
    freshness_tier: 'fresh',
    original_posted_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    scrape_timestamp: new Date().toISOString(),
    company_name: 'Tech Corp',
    company_profile_url: '',
    language_requirements: ['English'],
    ai_labels: [],
    board: null,
    city: 'London',
    country: 'United Kingdom',
    region: 'Europe',
    location_name: 'London',
    work_location: 'hybrid',
    platform: 'test',
    scraper_run_id: null,
    dedupe_key: null,
    fingerprint: null,
    is_graduate: false,
    is_internship: false,
    filtered_reason: null,
    lang: 'en',
    lang_conf: 0.99,
    job_hash_score: 80,
    ...overrides
  };
};

