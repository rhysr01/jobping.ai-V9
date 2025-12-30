/**
 * Centralized configuration for the JobPing matching system
 * This extracts all magic numbers and configuration from jobMatching.ts
 */

// Test mode detection
export const isTestOrPerfMode = () =>
	process.env.NODE_ENV === "test" || process.env.JOBPING_TEST_MODE === "1";

// Main configuration object
export const MATCHING_CONFIG = {
	// AI Configuration
	ai: {
		model: "gpt-4o-mini" as const,
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
		// Career coach priorities: Career path > Location > Work environment > Role > Experience
		weights: {
			careerPath: 40, // Career direction (Strategy, Finance, Tech, etc.) - MOST IMPORTANT
			location: 20, // Geographic match (hard requirement)
			workEnvironment: 15, // Office/Hybrid/Remote - IMPORTANT for early career
			roleFit: 10, // Specific role within career path (reduced from 20%)
			experienceLevel: 10, // Entry/junior/mid level matching
			timing: 10, // Job freshness, urgency - INCREASED from 1% (early-career roles close fast!)
			companyCulture: 2, // Startup vs corporate, company type - DECREASED from 3% (less critical for juniors)
			skills: 1, // Technical/soft skills alignment
		},

		// Score thresholds (use decimals for tests expecting 0-1 scale)
		thresholds: {
			excellent: 0.8,
			good: 0.7,
			confident: 0.7,
			fair: 0.5,
			minimum: 0.5,
			poor: 0.0,
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
		emergencyFallbackEnabled: true,
		maxEmergencyMatches: 3,
	},

	// Tier Distribution Configuration
	tierDistribution: {
		free: {
			ultra_fresh: parseInt(process.env.FREE_ULTRA_FRESH || "2", 10),
			fresh: parseInt(process.env.FREE_FRESH || "3", 10),
			comprehensive: parseInt(process.env.FREE_COMPREHENSIVE || "1", 10),
			fallback_order: ["fresh", "comprehensive", "ultra_fresh"] as const,
		},
		premium: {
			ultra_fresh: parseInt(process.env.PREMIUM_ULTRA_FRESH || "5", 10),
			fresh: parseInt(process.env.PREMIUM_FRESH || "7", 10),
			comprehensive: parseInt(process.env.PREMIUM_COMPREHENSIVE || "3", 10),
			fallback_order: ["fresh", "ultra_fresh", "comprehensive"] as const,
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
		userCap: 400, // Updated for 350+ users this month (buffer for growth)
		jobCap: 1200,
		perUserCap: 100,
		maxJobsPerUserFree: parseInt(process.env.SEND_DAILY_FREE || "50", 10),
		maxJobsPerUserPremium: parseInt(
			process.env.SEND_DAILY_PREMIUM || "100",
			10,
		),
		enableDetailedLogging: false,
	},

	// Rate Limiting
	rateLimit: {
		windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10), // 15 minutes
		maxRequests: parseInt(process.env.RATE_LIMIT_MAX || "3", 10),
		jobReservationTtl: 300000, // 5 minutes
	},

	// Feature Flags
	features: {
		useNewArchitecture: process.env.USE_NEW_MATCHING === "true",
		shadowTest: process.env.SHADOW_TEST === "true",
		aiDisabled: process.env.MATCH_USERS_DISABLE_AI === "true",
		useEnhancedCache: process.env.USE_ENHANCED_CACHE === "true",
	},
} as const;

// Dynamic configuration getter based on environment
export function getConfig() {
	return isTestOrPerfMode()
		? MATCHING_CONFIG.testing
		: MATCHING_CONFIG.production;
}

// Get tier distribution config for a user
export function getTierConfig(userTier: "free" | "premium" = "free") {
	return MATCHING_CONFIG.tierDistribution[userTier];
}

// Get scoring weights as decimals
export function getScoringWeights() {
	const weights = MATCHING_CONFIG.scoring.weights;
	return {
		careerPath: weights.careerPath / 100,
		location: weights.location / 100,
		workEnvironment: weights.workEnvironment / 100,
		roleFit: weights.roleFit / 100,
		experienceLevel: weights.experienceLevel / 100,
		companyCulture: weights.companyCulture / 100,
		skills: weights.skills / 100,
		timing: weights.timing / 100,
	};
}

// Configuration validation
export function validateConfig(): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	// Validate scoring weights sum to 100
	const weightSum = Object.values(MATCHING_CONFIG.scoring.weights).reduce(
		(sum, weight) => sum + weight,
		0,
	);
	if (weightSum !== 100) {
		errors.push(`Scoring weights must sum to 100, got ${weightSum}`);
	}

	// Validate individual weights are non-negative
	Object.entries(MATCHING_CONFIG.scoring.weights).forEach(([key, weight]) => {
		if (weight < 0 || weight > 100) {
			errors.push(
				`Invalid weight for ${key}: ${weight} (must be between 0 and 100)`,
			);
		}
	});

	// Validate thresholds are in correct order
	const { thresholds } = MATCHING_CONFIG.scoring;
	if (thresholds.excellent <= thresholds.good) {
		errors.push("Excellent threshold must be greater than good threshold");
	}
	if (thresholds.good <= thresholds.fair) {
		errors.push("Good threshold must be greater than fair threshold");
	}
	if (thresholds.fair <= thresholds.poor) {
		errors.push("Fair threshold must be greater than poor threshold");
	}

	// Validate cache TTL is positive
	if (MATCHING_CONFIG.cache.ttl <= 0) {
		errors.push("Cache TTL must be positive");
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

// Get specific configuration section
export function getConfigSection<T extends keyof typeof MATCHING_CONFIG>(
	section: T,
): (typeof MATCHING_CONFIG)[T] {
	return MATCHING_CONFIG[section];
}

// Export type for config
export type MatchingConfig = typeof MATCHING_CONFIG;
