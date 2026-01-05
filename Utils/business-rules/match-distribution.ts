/**
 * Match Distribution - Pure Business Logic
 *
 * Defines business rules about how many jobs users get based on their tier.
 * This is "Brain" logic - it decides HOW MANY jobs to give, not HOW to distribute.
 */

/**
 * Maximum number of jobs per tier
 *
 * Business Rules:
 * - Free tier: 5 jobs per signup/match
 * - Premium tier: More jobs (defined in sendConfiguration.ts)
 */
export const JOBS_PER_TIER = {
  free: 5,
  premium: 10, // Default, may be overridden by sendConfiguration
} as const;

/**
 * Get maximum jobs for a tier
 *
 * @param tier - User subscription tier
 * @returns Maximum number of jobs for the tier
 */
export function getMaxJobsForTier(tier: "free" | "premium"): number {
  return JOBS_PER_TIER[tier] || JOBS_PER_TIER.free;
}
