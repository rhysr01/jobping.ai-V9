/**
 * Fallback Domain - Emergency fallback logic
 */

import { apiLogger } from "@/lib/api-logger";
import { logger } from "@/lib/monitoring";
import type { UserPreferences } from "@/Utils/matching/types";
import type { JobWithFreshness, ScoredJob } from "./types";

/**
 * Apply emergency fallback if no matches found
 */
export function applyEmergencyFallback(
  scoredJobs: ScoredJob[],
  originalJobs: JobWithFreshness[],
  user: UserPreferences,
  matchLevel: string,
): JobWithFreshness[] {
  const zeroMatchesError = new Error(
    "Zero matches after pre-filtering - emergency fallback applied",
  );
  apiLogger.error(
    "CRITICAL: Pre-filtering returned zero matches, applying emergency fallback",
    zeroMatchesError,
    {
      email: user.email,
      targetCities: user.target_cities,
      originalJobs: originalJobs.length,
      scoredJobs: scoredJobs.length,
    },
  );

  logger.error("Zero matches after emergency fallback", {
    error: zeroMatchesError,
    component: "matching",
    metadata: {
      issue: "zero_matches_emergency",
      email: user.email,
      targetCities: user.target_cities,
      originalJobs: originalJobs.length,
      matchLevel,
    },
  });

  // Emergency fallback: Return top-scored jobs regardless of strict filters
  const emergencyJobs = scoredJobs
    .filter((item) => item.score >= 35)
    .sort((a, b) => b.score - a.score)
    .slice(0, 50)
    .map((item) => item.job);

  if (emergencyJobs.length > 0) {
    apiLogger.warn("Emergency fallback successful", {
      email: user.email,
      emergencyMatches: emergencyJobs.length,
    });
    return emergencyJobs;
  }

  // Last resort: Return any jobs (better than zero)
  const lastResortError = new Error("Last resort: Returning all jobs");
  apiLogger.error("Last resort: Returning all jobs", lastResortError, {
    email: user.email,
    totalJobs: originalJobs.length,
  });
  return originalJobs.slice(0, 100);
}
