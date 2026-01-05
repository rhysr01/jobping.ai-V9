/**
 * Diversity Domain - Source diversity enforcement
 */

import { MATCH_RULES } from "@/Utils/sendConfiguration";
import type { JobWithFreshness, ScoredJob } from "./types";

/**
 * Ensure source diversity in top jobs
 */
export function ensureSourceDiversity(
  sortedJobs: ScoredJob[],
  maxJobs: number = 100,
): JobWithFreshness[] {
  const diverseJobs: ScoredJob[] = [];
  const maxPerSource = MATCH_RULES.maxPerSource;

  for (const item of sortedJobs) {
    const source = (item.job as any).source || "unknown";
    const currentCount = diverseJobs.filter(
      (d) => ((d.job as any).source || "unknown") === source,
    ).length;

    if (currentCount < maxPerSource) {
      diverseJobs.push(item);
    }

    if (diverseJobs.length >= maxJobs) break;
  }

  if (diverseJobs.length < maxJobs) {
    const remainingJobs = sortedJobs.filter(
      (item) => !diverseJobs.includes(item),
    );
    diverseJobs.push(...remainingJobs.slice(0, maxJobs - diverseJobs.length));
  }

  return diverseJobs.map((item) => item.job);
}
