/**
 * Matching System Index
 * Centralized exports for the refactored matching system
 */

// ================================
// MAIN SERVICES
// ================================

export { ConsolidatedMatchingEngine, createConsolidatedMatcher } from './consolidated-matcher.service';
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
  calculateFreshnessTier,
  extractPostingDate,
  extractProfessionalExpertise,
  extractCareerPath,
  extractStartDate
} from './job-enrichment.service';

// ================================
// LEGACY COMPATIBILITY
// ================================

// Re-export the main function for backward compatibility
export { performEnhancedAIMatching } from './consolidated-matcher.service';

// Provide ScoringService for tests expecting it
export { ScoringService } from './scoring.service';
