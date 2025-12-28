/**
 * Pre-filter jobs by applying hard gates BEFORE AI matching
 * This ensures AI only sees 100% eligible jobs, saving API costs
 */

import { Job } from '../../scrapers/types';
import { UserPreferences } from './types';
import { applyHardGates } from './rule-based-matcher.service';

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
  userPrefs: UserPreferences
): Job[] {
  const eligibleJobs: Job[] = [];
  
  for (const job of jobs) {
    const gateResult = applyHardGates(job, userPrefs);
    if (gateResult.passed) {
      eligibleJobs.push(job);
    }
  }
  
  return eligibleJobs;
}

