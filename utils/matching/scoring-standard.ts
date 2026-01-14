/**
 * Unified Scoring Standard for Job Matching
 *
 * Standardizes all scoring methods to use consistent 0-100 scale with clear meaning.
 * Provides transparency into how scores are calculated and what they represent.
 */

export interface ScoreComponents {
	/** How well job matches user profile (skills, experience, preferences) */
	relevance: number;

	/** Job quality signals (company reputation, role stability, benefits) */
	quality: number;

	/** Career advancement potential and growth opportunities */
	opportunity: number;

	/** Freshness, market timing, and competitive advantages */
	timing: number;
}

export interface UnifiedScore {
	/** Final overall score (0-100) */
	overall: number;

	/** Component breakdown */
	components: ScoreComponents;

	/** AI confidence in scoring (0-100) */
	confidence: number;

	/** Scoring method used */
	method: "ai" | "rule-based" | "hybrid";

	/** Optional detailed explanation */
	explanation?: ScoreExplanation;
}

export interface ScoreExplanation {
	/** Human-readable reason for the score */
	reason: string;

	/** Key factors that influenced the score */
	keyFactors: string[];

	/** What this score means for the user */
	scoreMeaning: "excellent" | "good" | "fair" | "poor";

	/** Suggestions for improvement */
	suggestions?: string[];
}

/**
 * Standardized scoring weights for different user tiers
 */
export const SCORING_WEIGHTS = {
	free: {
		relevance: 0.5, // 50% - Basic profile matching
		quality: 0.3, // 30% - Company and role signals
		opportunity: 0.1, // 10% - Basic growth potential
		timing: 0.1, // 10% - Freshness
	},
	premium: {
		relevance: 0.35, // 35% - Advanced profile matching
		quality: 0.25, // 25% - Enhanced quality signals
		opportunity: 0.25, // 25% - Career coaching focus
		timing: 0.15, // 15% - Market intelligence
	},
} as const;

/**
 * Score interpretation guide
 */
export const SCORE_INTERPRETATION = {
	excellent: { min: 85, description: "Outstanding match - highly recommended" },
	good: { min: 70, description: "Strong match with good potential" },
	fair: { min: 55, description: "Decent match worth considering" },
	poor: { min: 0, description: "Limited fit - explore other options" },
} as const;

/**
 * Calculate overall score from components using tier-specific weights
 */
export function calculateOverallScore(
	components: ScoreComponents,
	userTier: "free" | "premium" = "free",
): number {
	const weights = SCORING_WEIGHTS[userTier];

	const weightedScore =
		components.relevance * weights.relevance +
		components.quality * weights.quality +
		components.opportunity * weights.opportunity +
		components.timing * weights.timing;

	return Math.round(Math.max(0, Math.min(100, weightedScore)));
}

/**
 * Determine score quality category
 */
export function getScoreQuality(
	score: number,
): keyof typeof SCORE_INTERPRETATION {
	if (score >= SCORE_INTERPRETATION.excellent.min) return "excellent";
	if (score >= SCORE_INTERPRETATION.good.min) return "good";
	if (score >= SCORE_INTERPRETATION.fair.min) return "fair";
	return "poor";
}

/**
 * Generate detailed score explanation
 */
export function generateScoreExplanation(
	score: UnifiedScore,
	jobTitle: string,
): ScoreExplanation {
	const quality = getScoreQuality(score.overall);
	const interpretation = SCORE_INTERPRETATION[quality];

	const keyFactors: string[] = [];

	// Analyze component contributions
	if (score.components.relevance >= 80) {
		keyFactors.push("Excellent profile alignment");
	} else if (score.components.relevance >= 60) {
		keyFactors.push("Good profile match");
	}

	if (score.components.quality >= 80) {
		keyFactors.push("High-quality opportunity");
	} else if (score.components.quality >= 60) {
		keyFactors.push("Solid company/role quality");
	}

	if (score.components.opportunity >= 80) {
		keyFactors.push("Strong career advancement potential");
	}

	if (score.components.timing >= 80) {
		keyFactors.push("Excellent timing and market fit");
	}

	// Generate suggestions
	const suggestions: string[] = [];
	if (score.components.relevance < 70) {
		suggestions.push(
			"Consider roles that better match your skills and experience",
		);
	}
	if (score.components.quality < 60) {
		suggestions.push(
			"Look for opportunities with stronger company reputations",
		);
	}
	if (score.components.opportunity < 60) {
		suggestions.push("Explore roles with clearer growth trajectories");
	}

	return {
		reason: `${interpretation.description} for ${jobTitle}`,
		keyFactors,
		scoreMeaning: quality,
		suggestions: suggestions.length > 0 ? suggestions : undefined,
	};
}

/**
 * Convert legacy scores to unified format
 */
export function convertLegacyScore(
	overall: number,
	method: "ai" | "rule-based" | "hybrid",
	confidence: number = 80,
	jobTitle?: string,
): UnifiedScore {
	// Estimate components from overall score (rough approximation)
	const components: ScoreComponents = {
		relevance: Math.max(50, overall - 10 + Math.random() * 20),
		quality: Math.max(40, overall - 15 + Math.random() * 25),
		opportunity: Math.max(30, overall - 20 + Math.random() * 30),
		timing: Math.max(60, overall - 5 + Math.random() * 15),
	};

	// Normalize components to sum appropriately
	const totalComponents =
		components.relevance +
		components.quality +
		components.opportunity +
		components.timing;
	const scaleFactor = (overall * 3.5) / totalComponents; // Rough normalization

	Object.keys(components).forEach((key) => {
		components[key as keyof ScoreComponents] = Math.min(
			100,
			Math.max(
				0,
				Math.round(components[key as keyof ScoreComponents] * scaleFactor),
			),
		);
	});

	const unifiedScore: UnifiedScore = {
		overall: Math.round(overall),
		components,
		confidence,
		method,
	};

	if (jobTitle) {
		unifiedScore.explanation = generateScoreExplanation(unifiedScore, jobTitle);
	}

	return unifiedScore;
}
