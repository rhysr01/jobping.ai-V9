/**
 * Centralized configuration for the JobPing matching system
 * This extracts all magic numbers and configuration from jobMatching.ts
 */

// Test mode detection
export const isTestOrPerfMode = () =>
  process.env.NODE_ENV === 'test' || process.env.JOBPING_TEST_MODE === '1';

// Main configuration object
export const MATCHING_CONFIG = {
  // AI Configuration
  ai: {
    model: 'gpt-4-turbo-preview' as const,
    maxTokens: 2000,
    temperature: 0.3,
    timeout: 30000, // 30 seconds
    clusterSize: 3, // Max users per AI cluster
  },

  // Cache Configuration
  cache: {
    ttl: 30 * 60 * 1000, // 30 minutes
    maxSize: 5000,
    cleanupInterval: 5 * 60 * 1000, // 5 minutes
    warmEntries: 2500, // Number of entries to persist
  },

  // Scoring Configuration
  scoring: {
    // Weight distribution (must sum to 100)
    weights: {
      eligibility: 35,
      careerPath: 30,
      location: 20,
      freshness: 15,
    },
    
    // Score thresholds
    thresholds: {
      excellent: 80,
      good: 70,
      confident: 70,
      fair: 50,
      minimum: 50,
      poor: 0,
    },
    
    // Confidence adjustments
    confidence: {
      uncertain_penalty: 0.1,
      unknown_penalty: 0.1,
      floor: 0.5,
      target: 0.7,
    },
  },

  // Fallback Configuration
  fallback: {
    maxMatches: 6,
    lowConfidenceThreshold: 0.4,
    backfillEnabled: true,
    diversityFactor: 0.3,
    freshnessWeight: 0.2,
    emergencyFallbackEnabled: true,
    maxEmergencyMatches: 3,
  },

  // Tier Distribution Configuration
  tierDistribution: {
    free: {
      ultra_fresh: parseInt(process.env.FREE_ULTRA_FRESH || '2'),
      fresh: parseInt(process.env.FREE_FRESH || '3'),
      comprehensive: parseInt(process.env.FREE_COMPREHENSIVE || '1'),
      fallback_order: ['fresh', 'comprehensive', 'ultra_fresh'] as const,
    },
    premium: {
      ultra_fresh: parseInt(process.env.PREMIUM_ULTRA_FRESH || '5'),
      fresh: parseInt(process.env.PREMIUM_FRESH || '7'),
      comprehensive: parseInt(process.env.PREMIUM_COMPREHENSIVE || '3'),
      fallback_order: ['fresh', 'ultra_fresh', 'comprehensive'] as const,
    },
  },

  // Environment-specific limits
  testing: {
    userCap: 3,
    jobCap: 300,
    perUserCap: 6,
    aiTimeout: 2000, // 2 seconds for tests
    enableDetailedLogging: true,
  },
  
  production: {
    userCap: 50,
    jobCap: 1200,
    perUserCap: 100,
    maxJobsPerUserFree: parseInt(process.env.SEND_DAILY_FREE || '50'),
    maxJobsPerUserPremium: parseInt(process.env.SEND_DAILY_PREMIUM || '100'),
    enableDetailedLogging: false,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '3'),
    jobReservationTtl: 300000, // 5 minutes
  },

  // Freshness Tier Definitions
  freshness: {
    ultraFreshHours: 24,
    freshDays: 3,
    comprehensiveDays: 7,
    maxDaysToConsider: 30,
  },

  // Feature Flags
  features: {
    useNewArchitecture: process.env.USE_NEW_MATCHING === 'true',
    shadowTest: process.env.SHADOW_TEST === 'true',
    aiDisabled: process.env.MATCH_USERS_DISABLE_AI === 'true',
    useEnhancedCache: process.env.USE_ENHANCED_CACHE === 'true',
  },
} as const;

// Dynamic configuration getter based on environment
export function getConfig() {
  return isTestOrPerfMode() ? MATCHING_CONFIG.testing : MATCHING_CONFIG.production;
}

// Get tier distribution config for a user
export function getTierConfig(userTier: 'free' | 'premium' = 'free') {
  return MATCHING_CONFIG.tierDistribution[userTier];
}

// Get scoring weights as decimals
export function getScoringWeights() {
  const weights = MATCHING_CONFIG.scoring.weights;
  return {
    eligibility: weights.eligibility / 100,
    careerPath: weights.careerPath / 100,
    location: weights.location / 100,
    freshness: weights.freshness / 100,
  };
}

// Configuration validation
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validate scoring weights sum to 100
  const weightSum = Object.values(MATCHING_CONFIG.scoring.weights).reduce((sum, weight) => sum + weight, 0);
  if (weightSum !== 100) {
    errors.push(`Scoring weights must sum to 100, got ${weightSum}`);
  }
  
  // Validate thresholds are in correct order
  const { thresholds } = MATCHING_CONFIG.scoring;
  if (thresholds.excellent <= thresholds.good) {
    errors.push('Excellent threshold must be greater than good threshold');
  }
  if (thresholds.good <= thresholds.fair) {
    errors.push('Good threshold must be greater than fair threshold');
  }
  if (thresholds.fair <= thresholds.poor) {
    errors.push('Fair threshold must be greater than poor threshold');
  }
  
  // Validate cache TTL is positive
  if (MATCHING_CONFIG.cache.ttl <= 0) {
    errors.push('Cache TTL must be positive');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Get specific configuration section
export function getConfigSection<T extends keyof typeof MATCHING_CONFIG>(
  section: T
): typeof MATCHING_CONFIG[T] {
  return MATCHING_CONFIG[section];
}

// Export type for config
export type MatchingConfig = typeof MATCHING_CONFIG;
