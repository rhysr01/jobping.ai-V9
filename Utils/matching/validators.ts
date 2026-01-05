/**
 * Validation Logic for JobPing Matching System
 *
 * This file contains all validation and gate functions for ensuring
 * data quality and business rule compliance.
 */

import { MATCHING_CONFIG } from "../config/matching";
import type { Job, UserPreferences } from "./types";

/**
 * Apply hard gates to determine if a job is eligible for a user
 */
export function applyHardGates(
  job: Job,
  userPrefs: UserPreferences,
): {
  passed: boolean;
  reason: string;
} {
  // Gate 1: Job must have required fields
  if (!job.title || !job.company || !job.job_hash) {
    return { passed: false, reason: "Missing required job fields" };
  }

  // Gate 2: Job must have categories
  if (!job.categories || job.categories.length === 0) {
    return { passed: false, reason: "Job has no categories" };
  }

  // Gate 3: Job must have location
  if (!job.location || job.location.trim() === "") {
    return { passed: false, reason: "Job has no location" };
  }

  // Gate 4: User must have email
  if (!userPrefs.email) {
    return { passed: false, reason: "User has no email" };
  }

  // Gate 5: Job must not be too old (configurable)
  if (job.created_at) {
    const jobAge = Date.now() - new Date(job.created_at).getTime();
    const maxAge = 90 * 24 * 60 * 60 * 1000; // 90 days
    if (jobAge > maxAge) {
      return { passed: false, reason: "Job is too old" };
    }
  }

  return { passed: true, reason: "All gates passed" };
}

/**
 * Validate job data structure
 */
export function validateJobData(job: Partial<Job>): job is Job {
  return !!(
    job.title &&
    job.company &&
    job.job_hash &&
    job.categories &&
    job.location
  );
}

/**
 * Validate user preferences structure
 */
export function validateUserPreferences(
  user: Partial<UserPreferences>,
): user is UserPreferences {
  return !!(
    user.email &&
    typeof user.email === "string" &&
    user.email.includes("@")
  );
}

/**
 * Validate match result structure
 */
export function validateMatchResult(match: any): match is {
  job: Job;
  match_score: number;
  match_reason: string;
  match_quality: string;
  match_tags: string;
  confidence_score: number;
} {
  return !!(
    match.job &&
    typeof match.match_score === "number" &&
    typeof match.match_reason === "string" &&
    typeof match.match_quality === "string" &&
    typeof match.match_tags === "string" &&
    typeof match.confidence_score === "number"
  );
}

/**
 * Check if user meets minimum requirements for matching
 */
export function validateUserEligibility(user: UserPreferences): {
  eligible: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  // Email verification is handled at the API level, not in user preferences

  if (!user.career_path) {
    reasons.push("No career path specified");
  }

  if (!user.professional_expertise) {
    reasons.push("No professional expertise specified");
  }

  if (!user.target_cities || user.target_cities.length === 0) {
    reasons.push("No target cities specified");
  }

  const eligible = reasons.length === 0;
  return { eligible, reasons };
}

/**
 * Validate job age for matching
 */
export function validateJobAge(job: Job): {
  recent: boolean;
  daysOld: number;
} {
  if (!job.created_at) {
    return { recent: false, daysOld: 999 };
  }

  const daysOld = Math.floor(
    (Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24),
  );

  return { recent: daysOld <= 30, daysOld };
}

/**
 * Validate location compatibility
 * ENHANCED: Now uses robust location matcher that handles all variations
 */
export function validateLocationCompatibility(
  jobLocations: string[],
  userTargetCities: string[],
  jobCity?: string | null,
  jobCountry?: string | null,
): {
  compatible: boolean;
  matchScore: number;
  reasons: string[];
} {
  // Use enhanced location matcher for robust variation handling
  const {
    validateLocationCompatibilityEnhanced,
  } = require("./locationMatcher");

  // Convert jobLocations array to single location string for compatibility
  const jobLocation =
    jobLocations && jobLocations.length > 0 ? jobLocations[0] : null;

  return validateLocationCompatibilityEnhanced(
    {
      city: jobCity,
      country: jobCountry,
      location: jobLocation,
    },
    userTargetCities,
  );
}

/**
 * Validate career path compatibility
 */
export function validateCareerPathCompatibility(
  jobCategories: string[],
  userCareerPath: string,
): {
  compatible: boolean;
  matchScore: number;
  reasons: string[];
} {
  if (!userCareerPath) {
    return {
      compatible: false,
      matchScore: 0,
      reasons: ["No career path specified"],
    };
  }

  if (!jobCategories || jobCategories.length === 0) {
    return {
      compatible: false,
      matchScore: 0,
      reasons: ["Job has no categories"],
    };
  }

  const reasons: string[] = [];
  let matchScore = 0;
  let hasMatch = false;

  // Map career paths to relevant categories
  const careerPathMap: Record<string, string[]> = {
    tech: [
      "software",
      "engineering",
      "development",
      "programming",
      "data",
      "ai",
      "machine learning",
    ],
    finance: ["finance", "banking", "accounting", "investment", "trading"],
    marketing: [
      "marketing",
      "advertising",
      "brand",
      "digital marketing",
      "social media",
    ],
    sales: ["sales", "business development", "account management"],
    design: ["design", "ux", "ui", "graphic design", "product design"],
    operations: ["operations", "project management", "business operations"],
    hr: ["human resources", "recruitment", "talent acquisition"],
    legal: ["legal", "law", "compliance"],
    healthcare: ["healthcare", "medical", "nursing", "pharmacy"],
    education: ["education", "teaching", "training", "academic"],
  };

  const relevantCategories = careerPathMap[userCareerPath.toLowerCase()] || [];

  // Check for category matches
  for (const category of jobCategories) {
    const lowerCategory = category.toLowerCase();

    // Exact match
    if (relevantCategories.includes(lowerCategory)) {
      hasMatch = true;
      matchScore = Math.max(matchScore, 100);
      reasons.push(`Exact category match: ${category}`);
    }

    // Partial match
    for (const relevantCategory of relevantCategories) {
      if (
        lowerCategory.includes(relevantCategory) ||
        relevantCategory.includes(lowerCategory)
      ) {
        hasMatch = true;
        matchScore = Math.max(matchScore, 80);
        reasons.push(
          `Partial category match: ${category} relates to ${relevantCategory}`,
        );
      }
    }
  }

  return {
    compatible: hasMatch,
    matchScore,
    reasons: reasons.length > 0 ? reasons : ["No career path compatibility"],
  };
}

/**
 * Validate work environment compatibility
 */
export function validateWorkEnvironmentCompatibility(
  jobEnvironment: string,
  userPreference: string,
): {
  compatible: boolean;
  matchScore: number;
  reasons: string[];
} {
  if (!userPreference || userPreference === "unclear") {
    return {
      compatible: true,
      matchScore: 50,
      reasons: ["No work environment preference specified"],
    };
  }

  if (!jobEnvironment || jobEnvironment === "unclear") {
    return {
      compatible: true,
      matchScore: 50,
      reasons: ["Job work environment unclear"],
    };
  }

  const reasons: string[] = [];
  let matchScore = 0;

  // Exact match
  if (jobEnvironment.toLowerCase() === userPreference.toLowerCase()) {
    matchScore = 100;
    reasons.push(`Exact work environment match: ${jobEnvironment}`);
  }
  // Remote compatibility
  else if (
    userPreference.toLowerCase() === "remote" &&
    jobEnvironment.toLowerCase().includes("remote")
  ) {
    matchScore = 90;
    reasons.push(`Remote work preference satisfied: ${jobEnvironment}`);
  }
  // Hybrid compatibility
  else if (
    userPreference.toLowerCase() === "hybrid" &&
    (jobEnvironment.toLowerCase().includes("hybrid") ||
      jobEnvironment.toLowerCase().includes("remote"))
  ) {
    matchScore = 85;
    reasons.push(`Hybrid work preference satisfied: ${jobEnvironment}`);
  }
  // Office compatibility
  else if (
    userPreference.toLowerCase() === "office" &&
    jobEnvironment.toLowerCase().includes("office")
  ) {
    matchScore = 80;
    reasons.push(`Office work preference satisfied: ${jobEnvironment}`);
  } else {
    matchScore = 30;
    reasons.push(
      `Work environment mismatch: preferred ${userPreference}, job offers ${jobEnvironment}`,
    );
  }

  return {
    compatible: matchScore >= 30, // Allow some flexibility
    matchScore,
    reasons,
  };
}

/**
 * Comprehensive validation for a job-user pair
 */
export function validateJobUserCompatibility(
  job: Job,
  user: UserPreferences,
): {
  compatible: boolean;
  overallScore: number;
  breakdown: {
    hardGates: { passed: boolean; reason: string };
    location: { compatible: boolean; matchScore: number; reasons: string[] };
    careerPath: { compatible: boolean; matchScore: number; reasons: string[] };
    workEnvironment: {
      compatible: boolean;
      matchScore: number;
      reasons: string[];
    };
    userEligibility: { eligible: boolean; reasons: string[] };
  };
} {
  const hardGates = applyHardGates(job, user);
  const jobLocation = [job.location]; // Location is now single string, convert to array for compatibility
  const location = validateLocationCompatibility(
    jobLocation,
    user.target_cities || [],
    job.city,
    job.country,
  );
  const careerPath = validateCareerPathCompatibility(
    job.categories || [],
    user.career_path?.join(", ") || "",
  );
  const workEnvironment = validateWorkEnvironmentCompatibility(
    job.work_environment || "unclear",
    user.work_environment || "unclear",
  );
  const userEligibility = validateUserEligibility(user);

  // Calculate overall score
  let overallScore = 0;
  let validChecks = 0;

  if (hardGates.passed) {
    overallScore += 100;
    validChecks++;
  }

  if (location.compatible) {
    overallScore += location.matchScore;
    validChecks++;
  }

  if (careerPath.compatible) {
    overallScore += careerPath.matchScore;
    validChecks++;
  }

  if (workEnvironment.compatible) {
    overallScore += workEnvironment.matchScore;
    validChecks++;
  }

  if (userEligibility.eligible) {
    overallScore += 100;
    validChecks++;
  }

  const finalScore = validChecks > 0 ? overallScore / validChecks : 0;
  const compatible =
    hardGates.passed && userEligibility.eligible && finalScore >= 50;

  return {
    compatible,
    overallScore: finalScore,
    breakdown: {
      hardGates,
      location,
      careerPath,
      workEnvironment,
      userEligibility,
    },
  };
}

/**
 * Validate configuration values
 */
export function validateMatchingConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate scoring weights sum to 1
  const weightSum = Object.values(MATCHING_CONFIG.scoring.weights).reduce(
    (sum, weight) => sum + weight,
    0,
  );
  if (Math.abs(weightSum - 1) > 0.01) {
    errors.push(`Scoring weights must sum to 1.0, got ${weightSum}`);
  }

  // Validate thresholds
  if (
    MATCHING_CONFIG.scoring.thresholds.confident <=
    MATCHING_CONFIG.scoring.thresholds.minimum
  ) {
    errors.push("Confident threshold must be greater than minimum threshold");
  }

  // Validate cache settings
  if (MATCHING_CONFIG.cache.ttl <= 0) {
    errors.push("Cache TTL must be positive");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
