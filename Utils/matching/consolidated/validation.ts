/**
 * Validation Domain - AI output validation logic
 * Extracted from consolidatedMatchingV2.ts for better organization
 */

import { apiLogger } from "@/lib/api-logger";
import type { ParsedMatch } from "@/lib/types";
import type { Job } from "@/scrapers/types";
import type { JobMatch, UserPreferences } from "../types";

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate individual match from AI response
 */
export function isValidMatch(match: ParsedMatch, maxJobIndex: number): boolean {
  return (
    match &&
    typeof match.job_index === "number" &&
    typeof match.job_hash === "string" &&
    typeof match.match_score === "number" &&
    match.job_index >= 1 &&
    match.job_index <= maxJobIndex &&
    match.match_score >= 0 &&
    match.match_score <= 100 &&
    match.job_hash.length > 0
  );
}

/**
 * Parse function call response - much more reliable than text parsing
 * CRITICAL: Uses imperative loops instead of filter/map to avoid TDZ errors during bundling
 */
export function parseFunctionCallResponse(
  matches: ParsedMatch[],
  jobs: Job[],
): JobMatch[] {
  const jobsArray = Array.isArray(jobs) ? jobs : [];
  const maxJobIndex = jobsArray.length;

  try {
    if (!Array.isArray(matches) || maxJobIndex === 0) {
      if (maxJobIndex === 0) {
        console.warn(
          "parseFunctionCallResponse: jobs array is empty or invalid",
        );
      }
      return [];
    }

    const validMatches: JobMatch[] = [];

    for (let i = 0; i < matches.length && validMatches.length < 5; i++) {
      const match = matches[i];

      if (!isValidMatch(match, maxJobIndex)) {
        continue;
      }

      if (!match || typeof match.job_index !== "number" || !match.job_hash) {
        continue;
      }

      validMatches.push({
        job_index: match.job_index,
        job_hash: match.job_hash,
        match_score: Math.min(100, Math.max(50, match.match_score || 50)),
        match_reason: match.match_reason || "AI match",
        confidence_score: 0.8,
      });
    }

    return validMatches;
  } catch (error) {
    console.error("Failed to parse function call response:", error);
    return [];
  }
}

/**
 * Post-filter AI matches to ensure they meet location and career path requirements
 * This is a safety net to catch any AI mistakes
 * CRITICAL: Uses imperative loops instead of filter/some to avoid TDZ errors during bundling
 */
export function validateAIMatches(
  aiMatches: JobMatch[],
  jobs: Job[],
  userPrefs: UserPreferences,
): JobMatch[] {
  const jobsArray = Array.isArray(jobs) ? jobs : [];

  const targetCities = Array.isArray(userPrefs.target_cities)
    ? userPrefs.target_cities
    : userPrefs.target_cities
      ? [userPrefs.target_cities]
      : [];

  const userHasRolePreference =
    userPrefs.roles_selected && userPrefs.roles_selected.length > 0;
  const userHasCareerPreference =
    userPrefs.career_path &&
    (Array.isArray(userPrefs.career_path)
      ? userPrefs.career_path.length > 0
      : !!userPrefs.career_path);

  const validatedMatches: JobMatch[] = [];

  for (let i = 0; i < aiMatches.length; i++) {
    const match = aiMatches[i];

    let job: Job | undefined;
    for (let j = 0; j < jobsArray.length; j++) {
      if (jobsArray[j].job_hash === match.job_hash) {
        job = jobsArray[j];
        break;
      }
    }

    if (!job) {
      console.warn(`Job not found for hash: ${match.job_hash}`);
      continue;
    }

    // Validate location match
    if (targetCities.length > 0) {
      const jobCity = (job as any).city
        ? String((job as any).city).toLowerCase()
        : "";
      const jobLocation = (job.location || "").toLowerCase();

      let locationMatches = false;
      for (let k = 0; k < targetCities.length; k++) {
        const city = targetCities[k];
        const cityLower = city.toLowerCase();

        if (jobCity && jobCity === cityLower) {
          locationMatches = true;
          break;
        }

        if (!jobCity) {
          const escapedCity = cityLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const patterns = [
            new RegExp(`\\b${escapedCity}\\b`, "i"),
            new RegExp(`^${escapedCity}[,\\s]`, "i"),
            new RegExp(`[,\\s]${escapedCity}[,\\s]`, "i"),
            new RegExp(`[,\\s]${escapedCity}$`, "i"),
          ];

          for (let p = 0; p < patterns.length; p++) {
            if (patterns[p].test(jobLocation)) {
              locationMatches = true;
              break;
            }
          }
        }

        if (locationMatches) break;

        if (jobLocation.includes("remote") || jobLocation.includes("hybrid")) {
          locationMatches = true;
          break;
        }
      }

      if (!locationMatches) {
        console.warn(
          `Location mismatch: job location "${job.location}" doesn't match user cities: ${targetCities.join(", ")}`,
        );
        continue;
      }
    }

    // Validate role match if user specified roles
    if (userHasRolePreference) {
      const jobTitle = (job.title || "").toLowerCase();
      const jobDesc = (job.description || "").toLowerCase();
      const roles = userPrefs.roles_selected || [];

      let hasRoleMatch = false;
      for (let r = 0; r < roles.length; r++) {
        const role = roles[r];
        if (
          role &&
          (jobTitle.includes(role.toLowerCase()) ||
            jobDesc.includes(role.toLowerCase()))
        ) {
          hasRoleMatch = true;
          break;
        }
      }

      if (!hasRoleMatch) {
        console.warn(
          `Role mismatch: job "${job.title}" doesn't match user roles: ${roles.join(", ")}`,
        );
        continue;
      }
    }

    // Validate career path match if user specified career path
    if (userHasCareerPreference) {
      const jobTitle = (job.title || "").toLowerCase();
      const jobDesc = (job.description || "").toLowerCase();
      const careerPaths = Array.isArray(userPrefs.career_path)
        ? userPrefs.career_path
        : [userPrefs.career_path];

      let hasCareerMatch = false;
      for (let c = 0; c < careerPaths.length; c++) {
        const path = careerPaths[c];
        if (!path) continue;
        const pathLower = path.toLowerCase();

        if (jobTitle.includes(pathLower) || jobDesc.includes(pathLower)) {
          hasCareerMatch = true;
          break;
        }

        if (job.categories && Array.isArray(job.categories)) {
          for (let cat = 0; cat < job.categories.length; cat++) {
            const catLower = String(job.categories[cat]).toLowerCase();
            if (catLower.includes(pathLower) || pathLower.includes(catLower)) {
              hasCareerMatch = true;
              break;
            }
          }
        }
        if (hasCareerMatch) break;
      }

      if (!hasCareerMatch) {
        console.warn(
          `Career path mismatch: job "${job.title}" doesn't match user career paths: ${careerPaths.join(", ")}`,
        );
        continue;
      }
    }

    // EVIDENCE VERIFICATION: Check match reason length
    const matchReason = match.match_reason || "";
    const wordCount = matchReason
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length;
    const EVIDENCE_THRESHOLD = 20;

    if (wordCount < EVIDENCE_THRESHOLD) {
      apiLogger.debug("Short match reason detected (potential weak evidence)", {
        email: userPrefs.email || "unknown",
        jobHash: match.job_hash,
        jobTitle: job.title,
        reasonLength: wordCount,
        reason: matchReason.substring(0, 100),
        threshold: EVIDENCE_THRESHOLD,
        note: "AI may have struggled to find strong evidence linking user skills to job requirements",
      });
    }

    validatedMatches.push(match);
  }

  return validatedMatches;
}
