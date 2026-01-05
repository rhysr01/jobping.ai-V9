/**
 * Work Environment Domain - Normalization and matching logic
 */

import type { JobWithSource } from "./types";

/**
 * Normalize work environment values
 * Form values: 'Office', 'Hybrid', 'Remote'
 * Job values: 'on-site', 'hybrid', 'remote' (or in location field)
 */
export function normalizeWorkEnv(env: string): string | null {
  if (!env) return null;
  const envLower = env.toLowerCase().trim();
  if (envLower === "office" || envLower === "on-site" || envLower === "onsite")
    return "on-site";
  if (envLower === "hybrid") return "hybrid";
  if (envLower === "remote") return "remote";
  return null;
}

/**
 * Get work environment from job
 */
export function getJobWorkEnv(job: JobWithSource): string | null {
  if ((job as any).work_environment) {
    const normalized = normalizeWorkEnv((job as any).work_environment);
    if (normalized) return normalized;
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
}

/**
 * Check if job matches target work environment
 */
export function matchesWorkEnvironment(
  job: JobWithSource,
  targetEnv: string,
): boolean {
  const jobEnv = getJobWorkEnv(job);
  const normalizedTarget = normalizeWorkEnv(targetEnv);
  if (!jobEnv || !normalizedTarget) return true;

  if (jobEnv === normalizedTarget) return true;

  if (normalizedTarget === "remote") {
    return jobEnv === "remote" || jobEnv === "hybrid";
  }
  if (normalizedTarget === "hybrid") {
    return jobEnv === "hybrid" || jobEnv === "remote" || jobEnv === "on-site";
  }
  if (normalizedTarget === "on-site") {
    return jobEnv === "on-site" || jobEnv === "hybrid";
  }

  return false;
}
