/**
 * Job Distribution Utility
 * Ensures diversity in job sources and balanced city distribution
 *
 * This file now re-exports from the refactored distribution modules
 * for backward compatibility.
 */

// Re-export utility functions (if needed by other modules)
export { matchesCity } from "./distribution/cityMatching";

// Re-export main functions
export { distributeJobsWithDiversity } from "./distribution/distribution";
export {
  checkCityBalance,
  checkSourceDiversity,
  checkWorkEnvironmentBalance,
} from "./distribution/feasibility";
export { getDistributionStats } from "./distribution/stats";
// Re-export types
export type { DistributionOptions, JobWithSource } from "./distribution/types";
export {
  getJobWorkEnv,
  matchesWorkEnvironment,
  normalizeWorkEnv,
} from "./distribution/workEnvironment";
