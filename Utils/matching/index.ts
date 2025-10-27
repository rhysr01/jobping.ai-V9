/**
 * Matching System Index
 * Centralized exports for the refactored matching system
 */

// ================================
// MAIN SERVICES
// ================================

// Re-export production matching engine
export { ConsolidatedMatchingEngine, createConsolidatedMatcher } from '../consolidatedMatching';
export { AIMatchingService, AIMatchingCache } from './ai-matching.service';
export { 
  performRobustMatching,
  applyHardGates,
  calculateMatchScore,
  calculateConfidenceScore,
  generateMatchExplanation,
  categorizeMatches,
  generateRobustFallbackMatches
} from './rule-based-matcher.service';

// ================================
// TYPES
// ================================

export type {
  AiProvenance,
  JobRow,
  MatchRow,
  UserRow,
  NormalizedUser,
  NormalizedUserProfile,
  UserPreferences,
  MatchScore,
  MatchResult,
  JobMatch,
  EnrichedJob,
  CityMarketData,
  CompanyProfile,
  SkillDemand,
  UnknownObj,
  MatchingConfig
} from './types';

// ================================
// NORMALIZERS
// ================================

export {
  toStringArray,
  toOptString,
  toWorkEnv,
  reqString,
  reqFirst,
  normalizeCategoriesForRead,
  mapCategories,
  anyIndex,
  isJob,
  cats,
  mapCats,
  mapCities,
  idx,
  normalizeUser,
  normalizeUserPreferences,
  normalizeJobForMatching,
  hasEligibility,
  careerSlugs,
  locTag,
  normalizeToString,
  isTestOrPerfMode,
  timeout
} from './normalizers';

// ================================
// JOB ENRICHMENT
// ================================

export {
  enrichJobData,
  extractPostingDate,
  extractProfessionalExpertise,
  extractCareerPath,
  extractStartDate
} from './job-enrichment.service';

// ================================
// LEGACY COMPATIBILITY
// ================================

// Compatibility wrapper for performEnhancedAIMatching
import { Job } from '../../scrapers/types';
import { UserPreferences, MatchResult } from './types';
import { createConsolidatedMatcher } from '../consolidatedMatching';

export async function performEnhancedAIMatching(
  jobs: Job[], 
  userPrefs: UserPreferences
): Promise<MatchResult[]> {
  const matcher = createConsolidatedMatcher();
  const result = await matcher.performMatching(jobs, userPrefs);
  // Convert ConsolidatedMatchResult to MatchResult[]
  return result.matches as unknown as MatchResult[];
}

// Provide ScoringService for tests expecting it
export { ScoringService } from './scoring.service';
