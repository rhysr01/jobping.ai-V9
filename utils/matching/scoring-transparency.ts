/**
 * Scoring Transparency Utilities
 *
 * Provides functions to display scoring information to users in a clear, understandable way.
 */

import {
	getScoreQuality,
	SCORE_INTERPRETATION,
	UnifiedScore,
} from "./scoring-standard";

export interface ScoreDisplay {
	/** Overall score (0-100) */
	overall: number;

	/** Quality category (excellent, good, fair, poor) */
	quality: "excellent" | "good" | "fair" | "poor";

	/** Human-readable quality description */
	qualityDescription: string;

	/** Method used (ai, rule-based, hybrid) */
	method: string;

	/** Confidence level (0-100) */
	confidence: number;

	/** Component breakdown for detailed view */
	components: {
		relevance: ComponentDisplay;
		quality: ComponentDisplay;
		opportunity: ComponentDisplay;
		timing: ComponentDisplay;
	};

	/** Key insights and suggestions */
	insights: string[];

	/** Visual indicators */
	visual: {
		scoreColor: string;
		progressWidth: string;
		confidenceIcon: string;
	};
}

export interface ComponentDisplay {
	score: number;
	label: string;
	description: string;
	weight: number;
	impact: "high" | "medium" | "low";
}

/**
 * Convert UnifiedScore to user-friendly display format
 */
export function createScoreDisplay(unifiedScore: UnifiedScore): ScoreDisplay {
	const quality = getScoreQuality(unifiedScore.overall);
	const interpretation = SCORE_INTERPRETATION[quality];

	const components: ScoreDisplay["components"] = {
		relevance: {
			score: unifiedScore.components.relevance,
			label: "Profile Match",
			description:
				"How well your skills, experience, and preferences align with this role",
			weight: unifiedScore.method === "ai" ? 35 : 50,
			impact:
				unifiedScore.components.relevance >= 80
					? "high"
					: unifiedScore.components.relevance >= 60
						? "medium"
						: "low",
		},
		quality: {
			score: unifiedScore.components.quality,
			label: "Company Quality",
			description:
				"Company reputation, stability, and work environment quality",
			weight: unifiedScore.method === "ai" ? 25 : 30,
			impact:
				unifiedScore.components.quality >= 80
					? "high"
					: unifiedScore.components.quality >= 60
						? "medium"
						: "low",
		},
		opportunity: {
			score: unifiedScore.components.opportunity,
			label: "Growth Potential",
			description:
				"Career advancement opportunities and skill development potential",
			weight: unifiedScore.method === "ai" ? 25 : 10,
			impact:
				unifiedScore.components.opportunity >= 80
					? "high"
					: unifiedScore.components.opportunity >= 60
						? "medium"
						: "low",
		},
		timing: {
			score: unifiedScore.components.timing,
			label: "Market Timing",
			description: "Job freshness and current market demand",
			weight: unifiedScore.method === "ai" ? 15 : 10,
			impact:
				unifiedScore.components.timing >= 80
					? "high"
					: unifiedScore.components.timing >= 60
						? "medium"
						: "low",
		},
	};

	const insights = generateInsights(unifiedScore, components);

	return {
		overall: unifiedScore.overall,
		quality,
		qualityDescription: interpretation.description,
		method: formatMethodName(unifiedScore.method),
		confidence: unifiedScore.confidence,
		components,
		insights,
		visual: {
			scoreColor: getScoreColor(quality),
			progressWidth: `${unifiedScore.overall}%`,
			confidenceIcon: getConfidenceIcon(unifiedScore.confidence),
		},
	};
}

/**
 * Generate actionable insights based on score
 */
function generateInsights(
	unifiedScore: UnifiedScore,
	components: ScoreDisplay["components"],
): string[] {
	const insights: string[] = [];

	// Overall score insights
	if (unifiedScore.overall >= 85) {
		insights.push(
			"🎯 Excellent match! This role aligns perfectly with your profile.",
		);
	} else if (unifiedScore.overall >= 70) {
		insights.push("👍 Strong match with good potential for your career.");
	} else if (unifiedScore.overall >= 55) {
		insights.push("🤔 Decent match worth considering if it interests you.");
	} else {
		insights.push(
			"💭 Limited fit - explore other opportunities that better match your goals.",
		);
	}

	// Component-specific insights
	if (components.relevance.score >= 80) {
		insights.push(
			"🎓 Your skills and experience are an excellent fit for this role.",
		);
	} else if (components.relevance.score < 60) {
		insights.push(
			"💡 Consider roles that better match your current skill set and experience level.",
		);
	}

	if (components.quality.score >= 80) {
		insights.push("🏢 High-quality opportunity with a reputable company.");
	}

	if (components.opportunity.score >= 80) {
		insights.push(
			"🚀 Strong career growth potential with learning and advancement opportunities.",
		);
	}

	if (components.timing.score >= 80) {
		insights.push(
			"⏰ Perfect timing - this role was posted recently and is in high demand.",
		);
	}

	// Method-specific insights
	if (unifiedScore.method === "ai") {
		insights.push(
			"🤖 AI-powered match using advanced semantic analysis of your profile.",
		);
	} else if (unifiedScore.method === "rule-based") {
		insights.push(
			"📊 Algorithmic match using proven matching rules and market data.",
		);
	}

	return insights;
}

/**
 * Format method name for display
 */
function formatMethodName(method: "ai" | "rule-based" | "hybrid"): string {
	switch (method) {
		case "ai":
			return "AI Analysis";
		case "rule-based":
			return "Smart Algorithm";
		case "hybrid":
			return "AI + Algorithm";
		default:
			return "Analysis";
	}
}

/**
 * Get color for score quality
 */
function getScoreColor(
	quality: "excellent" | "good" | "fair" | "poor",
): string {
	switch (quality) {
		case "excellent":
			return "#10b981"; // emerald-500
		case "good":
			return "#3b82f6"; // blue-500
		case "fair":
			return "#f59e0b"; // amber-500
		case "poor":
			return "#ef4444"; // red-500
		default:
			return "#6b7280"; // gray-500
	}
}

/**
 * Get confidence icon based on confidence level
 */
function getConfidenceIcon(confidence: number): string {
	if (confidence >= 90) return "🎯"; // Very confident
	if (confidence >= 75) return "👍"; // Confident
	if (confidence >= 60) return "🤔"; // Moderate confidence
	return "❓"; // Low confidence
}

/**
 * Create comparison between two scores
 */
export function compareScores(
	score1: UnifiedScore,
	score2: UnifiedScore,
): {
	better: "first" | "second" | "equal";
	differences: string[];
} {
	const diff = score1.overall - score2.overall;

	if (Math.abs(diff) < 5) {
		return {
			better: "equal",
			differences: [
				"Scores are very similar - both are good options to consider.",
			],
		};
	}

	const better = diff > 0 ? "first" : "second";
	const differences: string[] = [];

	// Compare components
	const components = ["relevance", "quality", "opportunity", "timing"] as const;
	components.forEach((component) => {
		const compDiff =
			score1.components[component] - score2.components[component];
		if (Math.abs(compDiff) >= 15) {
			if (compDiff > 0) {
				differences.push(
					`Better ${component} match (${compDiff} points higher)`,
				);
			} else {
				differences.push(
					`Lower ${component} score (${Math.abs(compDiff)} points lower)`,
				);
			}
		}
	});

	if (differences.length === 0) {
		differences.push(
			"Similar component scores, but overall score difference is significant.",
		);
	}

	return { better, differences };
}

/**
 * Generate score improvement suggestions
 */
export function getImprovementSuggestions(
	unifiedScore: UnifiedScore,
): string[] {
	const suggestions: string[] = [];

	if (unifiedScore.components.relevance < 70) {
		suggestions.push(
			"💡 Focus on roles that better match your current skills and experience level",
		);
		suggestions.push(
			"🎓 Consider updating your profile with recent projects or achievements",
		);
	}

	if (unifiedScore.components.quality < 60) {
		suggestions.push(
			"🏢 Look for opportunities with established companies or growing startups",
		);
	}

	if (unifiedScore.components.opportunity < 60) {
		suggestions.push(
			"🚀 Seek roles with clear growth paths and learning opportunities",
		);
	}

	if (unifiedScore.components.timing < 60) {
		suggestions.push(
			"⏰ Consider both new postings and established roles in your field",
		);
	}

	if (suggestions.length === 0) {
		suggestions.push(
			"🎯 You're well-matched for this role! Consider applying and preparing for interviews.",
		);
	}

	return suggestions;
}
