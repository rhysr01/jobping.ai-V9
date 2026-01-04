/**
 * Pre-filter Jobs Orchestrator
 * Main entry point that orchestrates all pre-filtering logic
 */

import { logger } from "@/lib/monitoring";
import type { Job as ScrapersJob } from "@/scrapers/types";
import type { UserPreferences } from "@/Utils/matching/types";
import { ensureSourceDiversity } from "./diversity";
import { applyEmergencyFallback } from "./fallback";
import { loadFeedbackBoosts } from "./feedback";
import { filterByLanguageRequirements } from "./language";
import { getLocationMatchedJobs } from "./location";
import { filterByQuality } from "./quality";
import { scoreJobs } from "./scoring";

/**
 * Enhanced pre-filter jobs by user preferences with scoring AND feedback learning
 */
export async function preFilterJobsByUserPreferencesEnhanced(
	jobs: (ScrapersJob & { freshnessTier: string })[],
	user: UserPreferences,
): Promise<(ScrapersJob & { freshnessTier: string })[]> {
	// Load feedback boosts
	const feedbackBoosts = await loadFeedbackBoosts(user);

	// Filter by location
	const targetCities = Array.isArray(user.target_cities)
		? user.target_cities
		: user.target_cities
			? [user.target_cities]
			: [];

	const locationMatchResult = getLocationMatchedJobs(
		jobs,
		targetCities,
		user.email,
		user.subscription_tier,
	);
	let filteredJobs = locationMatchResult.jobs;
	const matchLevel = locationMatchResult.matchLevel;

	// Log match level for monitoring
	if (matchLevel !== "exact" && targetCities.length > 0) {
		logger.info("Location matching fallback applied", {
			metadata: {
				email: user.email,
				matchLevel,
				targetCities,
				matchedJobs: filteredJobs.length,
				totalJobs: jobs.length,
			},
		});
	}

	// Filter by language requirements
	filteredJobs = filterByLanguageRequirements(filteredJobs, user);

	// Track source distribution
	const sourceCount: Record<string, number> = {};
	filteredJobs.forEach((job) => {
		const source = (job as any).source || "unknown";
		sourceCount[source] = (sourceCount[source] || 0) + 1;
	});

	// Score all jobs
	const scoredJobs = scoreJobs(filteredJobs, user, matchLevel, feedbackBoosts);

	// Filter by quality
	const qualityFilteredJobs = filterByQuality(scoredJobs, user, matchLevel);

	// Ensure source diversity
	const topJobs = ensureSourceDiversity(qualityFilteredJobs, 100);

	// Apply emergency fallback if needed
	if (topJobs.length === 0) {
		return applyEmergencyFallback(scoredJobs, jobs, user, matchLevel);
	}

	// Log job filtering results
	const sourceCounts = Object.entries(sourceCount)
		.map(([s, c]) => `${s}:${c}`)
		.join(", ");

	logger.info("Job filtering completed", {
		metadata: {
			userEmail: user.email,
			originalCount: jobs.length,
			filteredCount: topJobs.length,
			sourceDistribution: sourceCounts,
			feedbackBoosted: feedbackBoosts.size > 0,
			matchLevel,
		},
	});

	return topJobs;
}
