/**
 * Stats Domain - Calculate distribution statistics for logging/debugging
 */

import type { JobWithSource } from "./types";

/**
 * Get distribution stats for logging/debugging
 */
export function getDistributionStats(jobs: JobWithSource[]): {
  sourceDistribution: Record<string, number>;
  cityDistribution: Record<string, number>;
  workEnvironmentDistribution: Record<string, number>;
  totalJobs: number;
} {
  const jobsArray = Array.isArray(jobs) ? jobs : [];

  const sourceDistribution: Record<string, number> = {};
  const cityDistribution: Record<string, number> = {};
  const workEnvironmentDistribution: Record<string, number> = {};

  const getJobWorkEnvForStats = (job: JobWithSource): string => {
    if ((job as any).work_environment) {
      const env = String((job as any).work_environment)
        .toLowerCase()
        .trim();
      if (env === "office" || env === "on-site" || env === "onsite")
        return "on-site";
      if (env === "hybrid") return "hybrid";
      if (env === "remote") return "remote";
    }
    const location = ((job as any).location || "").toLowerCase();
    if (
      location.includes("remote") ||
      location.includes("work from home") ||
      location.includes("wfh")
    ) {
      return "remote";
    }
    if (location.includes("hybrid")) {
      return "hybrid";
    }
    return "on-site";
  };

  for (let i = 0; i < jobsArray.length; i++) {
    const job = jobsArray[i];
    const source = job.source || "unknown";
    const city = job.city || "unknown";
    const workEnv = getJobWorkEnvForStats(job);

    sourceDistribution[source] = (sourceDistribution[source] || 0) + 1;
    cityDistribution[city] = (cityDistribution[city] || 0) + 1;
    workEnvironmentDistribution[workEnv] =
      (workEnvironmentDistribution[workEnv] || 0) + 1;
  }

  return {
    sourceDistribution,
    cityDistribution,
    workEnvironmentDistribution,
    totalJobs: jobsArray.length,
  };
}
