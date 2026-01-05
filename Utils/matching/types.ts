/**
 * Core Types for Job Matching System
 * Extracted from jobMatching.ts for better organization
 */

import type { Tables } from "@/lib/database.types";
import type { Job } from "../../scrapers/types";

// Re-export Job type for convenience
export type { Job } from "../../scrapers/types";

// Use generated database types
export type UserRow = Tables<"users">;
export type JobRow = Tables<"jobs">;

// ================================
// CORE INTERFACES
// ================================

export interface AiProvenance {
  match_algorithm: "ai" | "rules" | "hybrid";
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
  work_environment: "remote" | "hybrid" | "on-site" | null;
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
  work_environment?: "remote" | "hybrid" | "on-site" | "unclear";
  visa_status?: string;
  entry_level_preference?: "entry" | "mid" | "senior";
  career_path?: string[];
  target_cities?: string[];
  languages_spoken?: string[];
  company_types?: string[];
  roles_selected?: string[];
  // Extended preferences from signup form
  industries?: string[];
  company_size_preference?: string;
  skills?: string[];
  career_keywords?: string;
  // Tier-aware matching
  subscription_tier?: "free" | "premium";
}

// ================================
// MATCHING RESULTS
// ================================

export interface MatchScore {
  overall: number;
  eligibility: number; // 100 if eligible for early career, 0 otherwise
  careerPath: number;
  location: number;
  workEnvironment: number;
  roleFit: number;
  experienceLevel: number;
  companyCulture: number;
  skills: number;
  timing: number;
  semanticBoost?: number; // Optional semantic similarity boost (0-10%)
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

/**
 * Comprehensive JobMatch Interface
 *
 * This interface includes all optional fields that are accessed via "as any"
 * throughout the matching services. This eliminates the need for type assertions.
 */
export interface JobMatch {
  job_index: number;
  job_hash: string;
  match_score: number;
  match_reason: string;
  confidence_score: number;

  // Optional fields commonly accessed via "as any" in matching services
  // These fields may be present on jobs returned from matching engine
  job?: Job; // Full job object (if available)

  // Metadata fields from JobWithMetadata
  visa_friendly?: boolean;
  visa_sponsorship?: boolean;
  visa_confidence?: "verified" | "likely" | "local-only" | "unknown";
  language_requirements?: string[];
  min_yoe?: number | null;
  max_yoe?: number | null;

  // Extended job properties (commonly accessed)
  city?: string;
  country?: string;
  work_environment?: string;
  source?: string;
  industry?: string;
  company_size?: string;
  is_internship?: boolean;
  is_graduate?: boolean;
  is_early_career?: boolean;

  // Score breakdown (if available)
  score_breakdown?: MatchScore;
  match_quality?: "excellent" | "very good" | "good" | "fair" | "poor";

  // Provenance
  provenance?: AiProvenance;
  relaxationLevel?: number;

  // Job snapshot (for historical matching)
  job_snapshot?: Record<string, unknown>;
}

// ================================
// ENRICHED JOB DATA
// ================================

export interface EnrichedJob extends Job {
  visaFriendly: boolean;
  experienceLevel: "entry" | "junior" | "mid" | "senior";
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
