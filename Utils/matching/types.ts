/**
 * Core Types for Job Matching System
 * Extracted from jobMatching.ts for better organization
 */

import { Job } from '../../scrapers/types';

// Re-export Job type for convenience
export type { Job } from '../../scrapers/types';

// Freshness tiers for job prioritization
export enum FreshnessTier {
  ULTRA_FRESH = 'ultra_fresh',    // < 24 hours
  FRESH = 'fresh',                // 1-3 days
  COMPREHENSIVE = 'comprehensive' // > 3 days
}

// ================================
// CORE INTERFACES
// ================================

export interface AiProvenance {
  match_algorithm: 'ai' | 'rules' | 'hybrid';
  ai_model?: string;
  prompt_version?: string;
  ai_latency_ms?: number;
  ai_cost_usd?: number;
  cache_hit?: boolean;
  fallback_reason?: string;
}

export interface JobRow {
  id: string;
  title: string;
  company: string;
  location: string | null;
  description: string | null;
  categories: string[];
  languages_required: string[] | null;
  work_environment: string | null;
  source: string | null;
  job_hash: string;
  posted_at: string | null;
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
  match_tags: any;
  matched_at: string;
  freshness_law: string | null;
}

export interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  professional_experience: string | null;
  languages_spoken: string[] | null;
  start_date: string | null;
  work_authorization: string | null;
  visa_related: boolean | null;
  entry_level_preference: string | null;
  company_types: string[] | null;
  career_path: string[] | null;
  roles_selected: any | null;
  target_cities: string[] | null;
  work_environment: string | null;
  target_employment_start_date: string | null;
  professional_expertise: string | null;
  email_verified: boolean | null;
  active: boolean | null;
  created_at: string;
  updated_at: string;
}

// ================================
// NORMALIZED USER PROFILE
// ================================

export interface NormalizedUser {
  email: string;
  career_path: string[];
  target_cities: string[];
  languages_spoken: string[];
  company_types: string[];
  roles_selected: string[];
  professional_expertise: string | null;
  entry_level_preference: string | null;
  work_environment: 'remote' | 'hybrid' | 'on-site' | null;
  start_date: string | null;
  careerFocus: string;
}

export type NormalizedUserProfile = NormalizedUser;

// ================================
// USER PREFERENCES
// ================================

export interface UserPreferences {
  email: string;
  professional_expertise?: string;
  full_name?: string;
  start_date?: string;
  work_environment?: 'remote' | 'hybrid' | 'on-site' | 'unclear';
  visa_status?: string;
  entry_level_preference?: 'entry' | 'mid' | 'senior';
  career_path?: string[];
  target_cities?: string[];
  languages_spoken?: string[];
  company_types?: string[];
  roles_selected?: string[];
}

// ================================
// MATCHING RESULTS
// ================================

export interface MatchScore {
  overall: number;
  eligibility: number;
  location: number;
  experience: number;
  skills: number;
  company: number;
  timing: number;
}

export interface MatchResult {
  job: Job;
  match_score: number;
  match_reason: string;
  confidence_score: number;
  match_quality: string;
  score_breakdown: MatchScore;
  provenance: AiProvenance;
}

export interface JobMatch {
  job_index: number;
  job_hash: string;
  match_score: number;
  match_reason: string;
  confidence_score: number;
}

// ================================
// ENRICHED JOB DATA
// ================================

export interface EnrichedJob extends Job {
  visaFriendly: boolean;
  experienceLevel: 'entry' | 'junior' | 'mid' | 'senior';
  marketDemand: number;
  salaryRange: string;
  companySize: string;
  remoteFlexibility: number;
  growthPotential: number;
  culturalFit: number;
  skillAlignment: number;
  locationScore: number;
  timingScore: number;
  overallScore: number;
}

// ================================
// MARKET DATA
// ================================

export interface CityMarketData {
  city: string;
  demandScore: number;
  salaryMultiplier: number;
  competitionLevel: number;
  visaFriendliness: number;
  techHub: boolean;
  startupEcosystem: boolean;
  corporatePresence: boolean;
}

export interface CompanyProfile {
  name: string;
  size: 'startup' | 'scaleup' | 'enterprise';
  industry: string;
  culture: string[];
  benefits: string[];
  growthStage: 'early' | 'growth' | 'mature';
  remotePolicy: 'remote-first' | 'hybrid' | 'office-first';
  visaSponsorship: boolean;
  diversityScore: number;
  workLifeBalance: number;
}

export interface SkillDemand {
  skill: string;
  demandLevel: 'high' | 'medium' | 'low';
  growthTrend: 'rising' | 'stable' | 'declining';
  marketValue: number;
  futureRelevance: number;
}

// ================================
// UTILITY TYPES
// ================================

export type UnknownObj = Record<string, unknown>;

export interface MatchingConfig {
  minMatchScore: number;
  maxResults: number;
  enableAI: boolean;
  enableFallback: boolean;
  cacheEnabled: boolean;
  timeoutMs: number;
}