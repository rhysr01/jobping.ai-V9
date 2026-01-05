/**
 * Feasibility Domain - Check if distribution constraints are feasible
 */

import { matchesCity } from "./cityMatching";
import type { JobWithSource } from "./types";
import { matchesWorkEnvironment } from "./workEnvironment";

export interface FeasibilityResult {
  hasMultipleSources: boolean;
  effectiveMaxPerSource: number;
  canBalanceCities: boolean;
  effectiveTargetCities: string[];
  canBalanceWorkEnvironments: boolean;
  uniqueSources: Set<string>;
}

/**
 * Check source diversity feasibility
 */
export function checkSourceDiversity(
  jobs: JobWithSource[],
  targetCount: number,
  maxPerSource: number,
): {
  hasMultipleSources: boolean;
  effectiveMaxPerSource: number;
  uniqueSources: Set<string>;
} {
  const jobsArray = Array.isArray(jobs) ? jobs : [];
  const uniqueSources = new Set<string>();

  for (let i = 0; i < jobsArray.length; i++) {
    const source = jobsArray[i].source || "unknown";
    if (source !== "unknown") {
      uniqueSources.add(source);
    }
  }

  const hasMultipleSources = uniqueSources.size >= 2;
  const MIN_REQUIRED_SOURCES = 2;

  if (!hasMultipleSources) {
    console.warn("[JobDistribution] Insufficient source diversity", {
      uniqueSources: Array.from(uniqueSources),
      totalJobs: jobsArray.length,
      requiredSources: MIN_REQUIRED_SOURCES,
      recommendation:
        "Consider relaxing source diversity constraints or expanding job pool",
    });
  }

  let effectiveMaxPerSource: number;
  if (!hasMultipleSources && uniqueSources.size === 1) {
    effectiveMaxPerSource = targetCount;
  } else if (hasMultipleSources) {
    const calculatedMax = Math.ceil(targetCount * 0.8);
    effectiveMaxPerSource = Math.min(maxPerSource, calculatedMax);
    if (effectiveMaxPerSource >= targetCount - 1) {
      effectiveMaxPerSource = Math.max(1, targetCount - 1);
    }
  } else {
    effectiveMaxPerSource = maxPerSource;
  }

  return {
    hasMultipleSources,
    effectiveMaxPerSource,
    uniqueSources,
  };
}

/**
 * Check city balance feasibility
 */
export function checkCityBalance(
  jobs: JobWithSource[],
  targetCities: string[],
  targetCount: number,
  ensureCityBalance: boolean,
): {
  canBalanceCities: boolean;
  effectiveTargetCities: string[];
} {
  const jobsArray = Array.isArray(jobs) ? jobs : [];
  let canBalanceCities = ensureCityBalance && targetCities.length > 0;
  let effectiveTargetCities = [...targetCities];

  if (canBalanceCities) {
    const jobsByCityCount: number[] = [];
    const citiesWithJobs: string[] = [];
    const citiesWithNoJobs: string[] = [];

    for (let cityIdx = 0; cityIdx < targetCities.length; cityIdx++) {
      const city = targetCities[cityIdx];
      let count = 0;
      for (let jobIdx = 0; jobIdx < jobsArray.length; jobIdx++) {
        const job = jobsArray[jobIdx];
        const jobCity = (job.city || "").toLowerCase();
        const jobLocation = ((job as any).location || "").toLowerCase();
        if (matchesCity(jobCity, jobLocation, city)) {
          count++;
        }
      }
      jobsByCityCount.push(count);

      if (count === 0) {
        citiesWithNoJobs.push(city);
      } else {
        citiesWithJobs.push(city);
      }
    }

    if (citiesWithNoJobs.length > 0) {
      effectiveTargetCities = citiesWithJobs;
      const cityBreakdown: Record<string, number> = {};
      for (let i = 0; i < targetCities.length; i++) {
        cityBreakdown[targetCities[i]] = jobsByCityCount[i];
      }

      console.warn("[JobDistribution] Cannot balance cities", {
        targetCities,
        jobsPerCity: jobsByCityCount,
        cityBreakdown,
        citiesWithNoJobs,
        citiesWithJobs,
        minCityJobs: Math.min(...jobsByCityCount.filter((c) => c > 0)),
        totalCityJobs: jobsByCityCount.reduce((sum, c) => sum + c, 0),
        targetCount,
        totalJobsAvailable: jobsArray.length,
        reason: "Some cities have no jobs",
        recommendation:
          "Jobs may have been filtered out by scoring/career path requirements, or city name variations (e.g., Roma vs Rome) not matching. Will balance across cities with available jobs.",
        action: `Filtering out ${citiesWithNoJobs.length} city/cities with no jobs, balancing across ${citiesWithJobs.length} city/cities with jobs`,
      });
    }

    if (effectiveTargetCities.length === 0) {
      canBalanceCities = false;
      effectiveTargetCities = [];
    } else if (effectiveTargetCities.length === 1) {
      canBalanceCities = false;
    } else {
      const totalCityJobs = jobsByCityCount.reduce((sum, c) => sum + c, 0);
      if (totalCityJobs < targetCount) {
        canBalanceCities = false;
      } else {
        canBalanceCities = true;
      }
    }
  }

  return {
    canBalanceCities,
    effectiveTargetCities,
  };
}

/**
 * Check work environment balance feasibility
 */
export function checkWorkEnvironmentBalance(
  jobs: JobWithSource[],
  targetWorkEnvironments: string[],
  targetCount: number,
  ensureWorkEnvironmentBalance: boolean,
): boolean {
  const jobsArray = Array.isArray(jobs) ? jobs : [];
  let canBalanceWorkEnvironments =
    ensureWorkEnvironmentBalance && targetWorkEnvironments.length > 0;

  if (canBalanceWorkEnvironments) {
    const jobsByWorkEnvCount: number[] = [];
    for (let envIdx = 0; envIdx < targetWorkEnvironments.length; envIdx++) {
      const targetEnv = targetWorkEnvironments[envIdx];
      let count = 0;
      for (let jobIdx = 0; jobIdx < jobsArray.length; jobIdx++) {
        const job = jobsArray[jobIdx];
        if (matchesWorkEnvironment(job, targetEnv)) {
          count++;
        }
      }
      jobsByWorkEnvCount.push(count);
    }

    let minWorkEnvJobs =
      jobsByWorkEnvCount.length > 0 ? jobsByWorkEnvCount[0] : 0;
    for (let i = 1; i < jobsByWorkEnvCount.length; i++) {
      if (jobsByWorkEnvCount[i] < minWorkEnvJobs) {
        minWorkEnvJobs = jobsByWorkEnvCount[i];
      }
    }
    let totalWorkEnvJobs = 0;
    for (let i = 0; i < jobsByWorkEnvCount.length; i++) {
      totalWorkEnvJobs += jobsByWorkEnvCount[i];
    }

    if (minWorkEnvJobs === 0 || totalWorkEnvJobs < targetCount) {
      const workEnvBreakdown: Record<string, number> = {};
      for (let i = 0; i < targetWorkEnvironments.length; i++) {
        workEnvBreakdown[targetWorkEnvironments[i]] = jobsByWorkEnvCount[i];
      }

      const workEnvsWithNoJobs: string[] = [];
      for (let i = 0; i < targetWorkEnvironments.length; i++) {
        if (jobsByWorkEnvCount[i] === 0) {
          workEnvsWithNoJobs.push(targetWorkEnvironments[i]);
        }
      }

      console.warn("[JobDistribution] Cannot balance work environments", {
        targetWorkEnvironments,
        jobsPerWorkEnv: jobsByWorkEnvCount,
        workEnvBreakdown,
        workEnvsWithNoJobs,
        minWorkEnvJobs,
        totalWorkEnvJobs,
        targetCount,
        totalJobsAvailable: jobsArray.length,
        reason:
          minWorkEnvJobs === 0
            ? "Some work environments have no jobs"
            : "Insufficient jobs to fill quota",
        recommendation:
          minWorkEnvJobs === 0
            ? "Jobs may have been filtered out by scoring/career path requirements, or work environment detection needs improvement"
            : "Consider relaxing scoring thresholds or expanding job pool",
      });
      canBalanceWorkEnvironments = false;
    }
  }

  return canBalanceWorkEnvironments;
}
