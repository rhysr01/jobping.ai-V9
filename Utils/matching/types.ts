/**
 * Core types for the JobPing matching system
 * Extracted from the massive jobMatching.ts file
 */

// AI timeout configuration
export const AI_TIMEOUT_MS = 20000; // 20 seconds for better reliability
export const AI_MAX_RETRIES = 3;
export const AI_RETRY_DELAY_MS = 1000;

// AI Provenance interface for tracking
export interface AiProvenance {
  match_algorithm: 'ai' | 'rules' | 'hybrid';
  ai_model?: string;
  prompt_version?: string;
  ai_latency_ms?: number;
  ai_cost_usd?: number;
  cache_hit?: boolean;
  fallback_reason?: string;
}

// ---------- DB row shapes (match your Postgres schema) ----------
export interface JobRow {
  id: string;
  title: string;
  company: string;
  location: string | null;               // "Berlin, DE" | "EU Remote" | null
  description: string | null;
  categories: string[];                  // IMPORTANT: text[] in Postgres
  languages_required: string[] | null;   // text[]
  work_environment: string | null;       // "remote" | "hybrid" | "on-site" | null
  source: string | null;
  job_hash: string;
  posted_at: string | null;              // timestamptz ISO
  created_at: string;
  updated_at: string;
  last_run_at: string | null;
  last_parsed_at: string | null;
  company_profile_url: string | null;
  job_url: string;
}

export interface MatchRow {
  id: string;
  user_email: string;
  job_hash: string;
  match_reason: string | null;
  match_score: number | null;
  match_quality: string | null;
  match_tags: any;                       // jsonb
  matched_at: string;                    // timestamptz ISO
  freshness_law: string | null;
}

export interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  professional_experience: string | null;
  languages_spoken: string[] | null;     // text[]
  start_date: string | null;             // date ISO
  work_authorization: string | null;
  visa_related: boolean | null;
  entry_level_preference: string | null; // "internship" | "graduate" | ...
  company_types: string[] | null;        // text[]
  career_path: string[] | null;          // text[]
  roles_selected: any | null;            // jsonb
  target_cities: string[] | null;        // text[]
  work_environment: string | null;       // "remote" | "hybrid" | "on-site"
  target_employment_start_date: string | null;
  professional_expertise: string | null;
  email_verified: boolean | null;
  active: boolean | null;
  created_at: string;
  updated_at: string;
}

// ---------- Normalized user profile used by matcher ----------
export interface NormalizedUser {
  email: string;

  // arrays normalized (never undefined)
  career_path: string[];
  target_cities: string[];
  languages_spoken: string[];
  company_types: string[];
  roles_selected: string[];

  // scalar preferences normalized to string|null
  professional_expertise: string | null;
  entry_level_preference: string | null;
  work_environment: 'remote' | 'hybrid' | 'on-site' | null;
  start_date: string | null;

  // convenience field: first career path or "unknown"
  careerFocus: string;
}

export type NormalizedUserProfile = NormalizedUser;

// ---------- User preferences interface (used by API routes) ----------
export interface UserPreferences {
  email: string;
  target_cities: string[];
  languages_spoken: string[];
  company_types: string[];
  roles_selected: string[];
  professional_expertise: string;
  work_environment: string;
  career_path: string[];
  entry_level_preference: string;
}

// ---------- Job interface (from scrapers) ----------
export interface Job {
  id?: string;
  title: string;
  company: string;
  location: string;
  description: string;
  job_url: string;
  source: string;
  job_hash: string;
  posted_at?: string;
  created_at?: string;
  categories?: string[];
  languages_required?: string[];
  work_environment?: string;
  company_profile_url?: string;
  original_posted_date?: string;
  last_seen_at?: string;
  is_active?: boolean;
}

// ---------- Matching interfaces ----------
export interface MatchScore {
  total: number;
  breakdown: {
    location: number;
    career: number;
    experience: number;
    company: number;
    freshness: number;
    eligibility: number;
  };
  confidence: number;
}

export interface MatchResult {
  job: Job;
  match_score: number;
  match_reason: string;
  match_quality: string;
  match_tags: string;
  confidence: number;
}

export interface JobMatch {
  job_index: number;
  job_hash: string;
  match_score: number;
  match_reason: string;
  match_quality: string;
  match_tags: string;
}

export interface EnrichedJob extends Job {
  freshness_tier: FreshnessTier;
  professional_expertise: string;
  career_path: string;
  start_date: string;
  complexity_score: number;
  visa_friendly: boolean;
  experience_level: 'entry' | 'junior' | 'mid' | 'senior';
  work_environment_detected: 'remote' | 'hybrid' | 'office' | 'unclear';
  language_requirements: string[];
}

export type FreshnessTier = 'fresh' | 'recent' | 'stale' | 'very_stale';

export interface DateExtractionResult {
  success: boolean;
  date?: Date;
  confidence: number;
  method?: string;
  error?: string;
}

// ---------- AI Matching Cache ----------
export interface AIMatchingCache {
  get(key: string): any;
  set(key: string, value: any, ttl?: number): void;
  has(key: string): boolean;
  clear(): void;
  size(): number;
}

// ---------- Scoring Context ----------
export interface ScoringContext {
  userPrefs: UserPreferences;
  job: Job;
  allJobs: Job[];
  userIndex: number;
  totalUsers: number;
}