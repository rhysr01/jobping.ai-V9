/**
 * Quality Domain - Quality filtering and thresholds
 */

import { apiLogger } from "@/lib/api-logger";
import { logger } from "@/lib/monitoring";
import type { UserPreferences } from "@/Utils/matching/types";
import type { LocationMatchLevel, ScoredJob } from "./types";

/**
 * Calculate quality thresholds based on match level and job scarcity
 */
export function calculateQualityThresholds(
  matchLevel: LocationMatchLevel,
  availableJobsCount: number,
): {
  adjustedMinimumScore: number;
  adjustedRelevanceThreshold: number;
} {
  const getMinimumScore = () => {
    if (matchLevel === "exact") return 40;
    if (matchLevel === "country") return 35;
    if (matchLevel === "remote") return 30;
    return 25;
  };
  const MINIMUM_SCORE = getMinimumScore();

  const QUALITY_RELEVANCE_THRESHOLD = 0.3;
  const isScarceJobs = availableJobsCount < 20;
  const isVeryScarceJobs = availableJobsCount < 10;

  const baseAdjustment =
    matchLevel === "exact"
      ? 0
      : matchLevel === "country"
        ? 2
        : matchLevel === "remote"
          ? 5
          : 10;

  const adjustedMinimumScore = isVeryScarceJobs
    ? Math.max(30, MINIMUM_SCORE - baseAdjustment - 5)
    : isScarceJobs
      ? Math.max(35, MINIMUM_SCORE - baseAdjustment)
      : MINIMUM_SCORE;

  const baseRelevanceThreshold =
    matchLevel === "exact"
      ? QUALITY_RELEVANCE_THRESHOLD
      : matchLevel === "country"
        ? QUALITY_RELEVANCE_THRESHOLD - 0.05
        : matchLevel === "remote"
          ? QUALITY_RELEVANCE_THRESHOLD - 0.1
          : QUALITY_RELEVANCE_THRESHOLD - 0.15;

  const adjustedRelevanceThreshold = isVeryScarceJobs
    ? Math.max(0.1, baseRelevanceThreshold - 0.05)
    : isScarceJobs
      ? Math.max(0.15, baseRelevanceThreshold - 0.05)
      : baseRelevanceThreshold;

  return {
    adjustedMinimumScore,
    adjustedRelevanceThreshold,
  };
}

/**
 * Filter and sort jobs by quality
 */
export function filterByQuality(
  scoredJobs: ScoredJob[],
  user: UserPreferences,
  matchLevel: LocationMatchLevel,
): ScoredJob[] {
  const userHasRolePreference =
    user.roles_selected && user.roles_selected.length > 0;
  const userHasCareerPreference =
    user.career_path &&
    (Array.isArray(user.career_path)
      ? user.career_path.length > 0
      : !!user.career_path);

  const availableJobsCount = scoredJobs.length;
  const { adjustedMinimumScore, adjustedRelevanceThreshold } =
    calculateQualityThresholds(matchLevel, availableJobsCount);

  const isScarceJobs = availableJobsCount < 20;

  const sortedJobs = scoredJobs
    .filter((item) => {
      if (item.score < adjustedMinimumScore) return false;

      if (userHasCareerPreference && !item.hasCareerMatch) {
        const penalty =
          matchLevel === "exact"
            ? 15
            : matchLevel === "country"
              ? 12
              : matchLevel === "remote"
                ? 10
                : 8;

        apiLogger.info("Allowing non-career match with penalty", {
          email: user.email,
          availableJobs: availableJobsCount,
          matchLevel,
          penaltyApplied: penalty,
          reason:
            "Ensuring users get matches while prioritizing career-relevant jobs",
        });
        item.score = Math.max(item.score - penalty, adjustedMinimumScore - 5);
      }

      if (userHasRolePreference) {
        const baseScore =
          matchLevel === "exact"
            ? 45
            : matchLevel === "country"
              ? 35
              : matchLevel === "remote"
                ? 30
                : 25;
        const relevanceScore = item.score - baseScore;
        const maxPossibleRelevance = 40 + 25 + 10 + 8 + 7 + 5;
        const relevanceRatio = relevanceScore / maxPossibleRelevance;

        if (relevanceRatio < adjustedRelevanceThreshold) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => b.score - a.score);

  if (isScarceJobs) {
    logger.info("Quality thresholds relaxed due to scarce jobs", {
      metadata: {
        email: user.email,
        availableJobs: availableJobsCount,
        adjustedMinimumScore,
        adjustedRelevanceThreshold,
        finalMatches: sortedJobs.length,
      },
    });
  }

  return sortedJobs;
}
