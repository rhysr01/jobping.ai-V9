/**
 * Quality Thresholds - Pure Business Logic
 * 
 * Defines quality thresholds for job matches and provides filtering functions.
 * This is "Brain" logic - it makes decisions about what constitutes "quality".
 */

/**
 * Quality thresholds for different tiers and use cases
 */
export const QUALITY_THRESHOLDS = {
	/**
	 * Minimum match score for free signup matches
	 * Jobs below this threshold are considered low-quality
	 * Lowered from 60 to 40 for basic matching to ensure matches happen
	 */
	FREE_SIGNUP: 40,

	/**
	 * Minimum match score for premium signup matches
	 * May be lower than free since premium users get more matches
	 */
	PREMIUM_SIGNUP: 50,

	/**
	 * Absolute minimum acceptable match score
	 * Used as a safety threshold
	 */
	MINIMUM_ACCEPTABLE: 40,
} as const;

/**
 * Filter jobs to only include high-quality matches
 * 
 * @param jobs - Array of jobs with match_score property
 * @param threshold - Quality threshold (defaults to FREE_SIGNUP threshold)
 * @returns Filtered array of high-quality jobs
 */
export function filterHighQualityJobs(
	jobs: Array<{ match_score?: number }>,
	threshold: number = QUALITY_THRESHOLDS.FREE_SIGNUP,
): Array<{ match_score?: number }> {
	return jobs.filter((job) => (job.match_score || 0) >= threshold);
}

/**
 * Calculate quality metrics for a set of jobs
 * 
 * @param jobs - Array of jobs with match_score property
 * @returns Quality metrics object
 */
export function calculateQualityMetrics(jobs: Array<{ match_score?: number }>) {
	if (jobs.length === 0) {
		return {
			averageScore: 0,
			minScore: 0,
			maxScore: 0,
			totalJobs: 0,
		};
	}

	const scores = jobs.map((job) => job.match_score || 0);
	const averageScore =
		scores.reduce((sum, score) => sum + score, 0) / scores.length;
	const minScore = Math.min(...scores);
	const maxScore = Math.max(...scores);

	return {
		averageScore: Math.round(averageScore * 10) / 10,
		minScore,
		maxScore,
		totalJobs: jobs.length,
	};
}

/**
 * Select jobs for distribution based on quality threshold
 * 
 * Business Rule: Use high-quality jobs if we have enough, otherwise use all jobs
 * This ensures we always return enough jobs if possible, but prioritize quality
 * 
 * @param allJobs - All matched jobs
 * @param highQualityJobs - High-quality filtered jobs
 * @param minJobsRequired - Minimum number of jobs needed (e.g., 5 for free tier)
 * @returns Jobs to use for distribution
 */
export function selectJobsForDistribution<T extends { match_score?: number }>(
	allJobs: T[],
	highQualityJobs: T[],
	minJobsRequired: number,
): T[] {
	return highQualityJobs.length >= minJobsRequired ? highQualityJobs : allJobs;
}

