/**
 * Types for pre-filter system
 */

import type { Job as ScrapersJob } from "@/scrapers/types";

export type JobWithFreshness = ScrapersJob & { freshnessTier: string };

export interface ScoredJob {
  job: JobWithFreshness;
  score: number;
  hasRoleMatch: boolean;
  hasCareerMatch: boolean;
}

export type LocationMatchLevel = "exact" | "country" | "remote" | "all";
