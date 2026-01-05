/**
 * Types for job distribution system
 */

export interface JobWithSource {
  source?: string;
  city?: string;
  job_hash?: string;
  [key: string]: any;
}

export interface DistributionOptions {
  targetCount: number;
  targetCities: string[];
  maxPerSource?: number;
  ensureCityBalance?: boolean;
  targetWorkEnvironments?: string[];
  ensureWorkEnvironmentBalance?: boolean;
  qualityFloorThreshold?: number;
}
