/**
 * Pre-filter jobs by applying hard gates BEFORE AI matching
 * This ensures AI only sees 100% eligible jobs, saving API costs
 */

import type { Job } from "../../scrapers/types";
import { applyHardGates } from "./rule-based-matcher.service";
import type { UserPreferences } from "./types";

/**
 * Pre-filter jobs by applying hard gates BEFORE AI matching
 * This ensures AI only sees 100% eligible jobs, saving API costs
 *
 * Hard gates include:
 * - Early career eligibility
 * - Location compatibility
 * - Work environment preference
 * - Visa sponsorship requirements
 * - Language requirements
 */
export function preFilterByHardGates(
  jobs: Job[],
  userPrefs: UserPreferences,
): Job[] {
  const eligibleJobs: Job[] = [];
  const rejectionReasons: Record<string, number> = {};

  for (const job of jobs) {
    const gateResult = applyHardGates(job, userPrefs);
    if (gateResult.passed) {
      eligibleJobs.push(job);
    } else {
      // Track rejection reasons for debugging
      const primaryReason =
        gateResult.reason || gateResult.reasons?.[0] || "Unknown";
      rejectionReasons[primaryReason] =
        (rejectionReasons[primaryReason] || 0) + 1;
    }
  }

  // Log rejection analysis (only if we have jobs to analyze)
  if (jobs.length > 0) {
    });
  }

  return eligibleJobs;
}
