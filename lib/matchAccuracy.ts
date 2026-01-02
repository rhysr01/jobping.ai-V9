/**
 * Match Accuracy Score Calculator
 * Converts relaxation level to a user-friendly percentage score
 *
 * Formula: S = max(70, 100 - (R × 3))
 * - Relaxation 0 → 100% (Perfect match)
 * - Relaxation 5 → 85% (Good match with minor expansion)
 * - Relaxation 10 → 70% (Minimum score, significant expansion)
 *
 * This makes the premium tier's AI matching visible and valuable.
 */

export interface MatchAccuracyResult {
	score: number;
	percentage: string;
	label: "perfect" | "excellent" | "very-good" | "good" | "fair";
	description: string;
}

/**
 * Calculate match accuracy score from relaxation level
 * @param relaxationLevel - The relaxation level (0-10+)
 * @returns Match accuracy result with score, percentage, label, and description
 */
export function calculateMatchAccuracy(
	relaxationLevel: number | null | undefined,
): MatchAccuracyResult {
	// Default to 100% if no relaxation (perfect match)
	if (
		relaxationLevel === null ||
		relaxationLevel === undefined ||
		relaxationLevel === 0
	) {
		return {
			score: 100,
			percentage: "100%",
			label: "perfect",
			description: "Perfect match - all criteria met exactly",
		};
	}

	// Calculate score: max(70, 100 - (R × 3))
	// This ensures scores stay above 70% even with high relaxation
	const score = Math.max(70, 100 - relaxationLevel * 3);
	const percentage = `${Math.round(score)}%`;

	// Determine label based on score
	let label: "perfect" | "excellent" | "very-good" | "good" | "fair";
	let description: string;

	if (score >= 95) {
		label = "perfect";
		description = "Perfect match - all criteria met exactly";
	} else if (score >= 90) {
		label = "excellent";
		description = "Excellent match - minor adjustments made";
	} else if (score >= 85) {
		label = "very-good";
		description = "Very good match - slight expansion in location or criteria";
	} else if (score >= 80) {
		label = "good";
		description = "Good match - expanded search to find quality roles";
	} else {
		label = "fair";
		description =
			"Fair match - broader search to ensure you get quality options";
	}

	return {
		score: Math.round(score),
		percentage,
		label,
		description,
	};
}

/**
 * Get color class for match accuracy badge
 */
export function getMatchAccuracyColor(
	label: "perfect" | "excellent" | "very-good" | "good" | "fair",
): string {
	switch (label) {
		case "perfect":
			return "bg-emerald-500/20 border-emerald-500/50 text-emerald-300";
		case "excellent":
			return "bg-green-500/20 border-green-500/50 text-green-300";
		case "very-good":
			return "bg-brand-500/20 border-brand-500/50 text-brand-300";
		case "good":
			return "bg-blue-500/20 border-blue-500/50 text-blue-300";
		case "fair":
			return "bg-amber-500/20 border-amber-500/50 text-amber-300";
		default:
			return "bg-zinc-500/20 border-zinc-500/50 text-zinc-300";
	}
}
