/**
 * Core Types for Job Matching System
 * Extracted from jobMatching.ts for better organization
 */

import { Job } from '../../scrapers/types';
import type { Tables } from '../../lib/db-types';

// Re-export Job type for convenience
export type { Job } from '../../scrapers/types';

// Use generated database types
export type UserRow = Tables<'users'>;
export type JobRow = Tables<'jobs'>;
export type MatchRow = Tables<'matches'>;

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

// JobRow, MatchRow, and UserRow are now imported from generated database types above

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
  // NEW MATCHING PREFERENCES
  remote_preference?: string;
  industries?: string[];
  company_size_preference?: string;
  skills?: string[];
  career_keywords?: string;
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