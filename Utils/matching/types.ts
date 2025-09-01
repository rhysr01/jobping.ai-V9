/**
 * Type Safety Layer for JobPing Matching System
 * 
 * This file provides type-safe interfaces and utilities for the matching system,
 * eliminating the need for dangerous type workarounds like anyIndex.
 */

// Re-export shared types from scrapers
export {
  Job,
  User,
  Match,
  MatchLog,
  JobUpsertResult,
  DateExtractionResult,
  FreshnessTier,
} from '@/scrapers/types';

// Matching-specific types
export interface MatchScore {
  overall: number;
  eligibility: number;
  careerPath: number;
  location: number;
  freshness: number;
  confidence: number;
}

export interface MatchResult {
  job: Job;
  match_score: number;
  match_reason: string;
  match_quality: string;
  match_tags: string;
  confidence_score: number;
  scoreBreakdown: MatchScore;
}

export interface EnrichedJob extends Job {
  visaFriendly: boolean;
  experienceLevel: 'entry' | 'junior' | 'mid' | 'senior';
  workEnvironment: 'remote' | 'hybrid' | 'office' | 'unclear';
  languageRequirements: string[];
  complexityScore: number;
}

export interface UserPreferences {
  email: string;
  full_name?: string;
  professional_expertise?: string;
  visa_status?: string;
  start_date?: string;
  work_environment?: string;
  languages_spoken?: string[];
  company_types?: string[];
  roles_selected?: string[];
  career_path?: string;
  entry_level_preference?: string;
  target_cities?: string[];
  subscription_tier?: string;
  email_verified?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AIMatchResponse {
  matches: JobMatch[];
  reasoning: string;
  confidence: number;
}

export interface JobMatch {
  job_id: string;
  match_score: number;
  match_reason: string;
  confidence_score: number;
}

export interface MatchingContext {
  user: UserPreferences;
  availableJobs: Job[];
  userCap: number;
  jobCap: number;
  perUserCap: number;
  isTestMode: boolean;
}

export interface MatchingResult {
  user: string;
  matches: MatchResult[];
  matchCount: number;
  aiSuccess: boolean;
  fallbackUsed: boolean;
  processingTime: number;
  errors?: string[];
}

// Type-safe property accessors (replaces anyIndex function)
export function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

export function hasProperty<T extends object, K extends PropertyKey>(
  obj: T,
  key: K
): obj is T & Record<K, unknown> {
  return key in obj;
}

export function safeGetProperty<T extends object, K extends PropertyKey>(
  obj: T,
  key: K,
  defaultValue?: unknown
): unknown {
  return hasProperty(obj, key) ? obj[key] : defaultValue;
}

// Type guards for validation
export function isJob(obj: unknown): obj is Job {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    hasProperty(obj, 'title') &&
    hasProperty(obj, 'company') &&
    hasProperty(obj, 'job_url')
  );
}

export function isUserPreferences(obj: unknown): obj is UserPreferences {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    hasProperty(obj, 'email') &&
    typeof getProperty(obj, 'email') === 'string'
  );
}

export function isMatchResult(obj: unknown): obj is MatchResult {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    hasProperty(obj, 'job') &&
    hasProperty(obj, 'match_score') &&
    isJob(getProperty(obj, 'job'))
  );
}

// Array type utilities
export function ensureArray<T>(value: T | T[] | null | undefined): T[] {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

export function filterValidJobs(jobs: unknown[]): Job[] {
  return jobs.filter(isJob);
}

export function filterValidUsers(users: unknown[]): UserPreferences[] {
  return users.filter(isUserPreferences);
}

// Score calculation types
export interface ScoreBreakdown {
  eligibility: number;
  careerPath: number;
  location: number;
  freshness: number;
  bonus: number;
  penalty: number;
}

export interface ScoringContext {
  job: Job;
  user: UserPreferences;
  weights: {
    eligibility: number;
    careerPath: number;
    location: number;
    freshness: number;
  };
  thresholds: {
    confident: number;
    minimum: number;
    excellent: number;
    good: number;
    fair: number;
  };
}

// Cache types
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
  hitRate: number;
}

// Error types
export interface MatchingError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
  userId?: string;
}

export class MatchingServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'MatchingServiceError';
  }
}

// Performance monitoring types
export interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface MatchingPerformanceMetrics extends PerformanceMetrics {
  userId: string;
  jobCount: number;
  matchCount: number;
  aiSuccess: boolean;
  fallbackUsed: boolean;
}

// Configuration types
export interface MatchingConfig {
  ai: {
    model: string;
    maxTokens: number;
    temperature: number;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
  };
  scoring: {
    weights: {
      eligibility: number;
      careerPath: number;
      location: number;
      freshness: number;
    };
    thresholds: {
      confident: number;
      minimum: number;
      excellent: number;
      good: number;
      fair: number;
    };
  };
  fallback: {
    maxMatches: number;
    lowConfidenceThreshold: number;
    diversityFactor: number;
    freshnessWeight: number;
  };
}

// Utility types for working with partial data
export type PartialJob = Partial<Job>;
export type PartialUserPreferences = Partial<UserPreferences>;
export type PartialMatchResult = Partial<MatchResult>;

// Type for function that can be awaited
export type Awaitable<T> = T | Promise<T>;

// Type for functions that can be called with different signatures
export type FlexibleFunction<TArgs extends unknown[], TReturn> = 
  | ((...args: TArgs) => TReturn)
  | ((...args: TArgs) => Promise<TReturn>);

// Export commonly used type combinations
export type JobArray = Job[];
export type UserPreferencesArray = UserPreferences[];
export type MatchResultArray = MatchResult[];
export type JobMatchArray = JobMatch[];
