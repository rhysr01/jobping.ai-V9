/**
 * Job Filtering - Pure Business Logic
 *
 * Defines business rules about which jobs should be filtered out or excluded.
 * This is "Brain" logic - it decides WHAT to show, not HOW to filter.
 */

/**
 * Known job board company names that should be excluded from user-facing results
 *
 * Business Rule: Job boards (like Indeed, Reed, LinkedIn) should not be shown
 * as "companies" because they're aggregators, not actual employers.
 */
export const JOB_BOARD_COMPANIES = [
  "efinancial",
  "efinancialcareers",
  "reed",
  "indeed",
  "linkedin",
  "adzuna",
  "totaljobs",
  "monster",
  "ziprecruiter",
  "jobspy",
  "google",
  "glassdoor",
  "careerjet",
  "jooble",
  "arbeitnow",
  "stepstone",
] as const;

/**
 * Check if a company is a job board (should be excluded)
 *
 * @param company - Company name
 * @param companyName - Alternative company name field
 * @returns true if company should be excluded (is a job board)
 */
export function isJobBoard(company?: string, companyName?: string): boolean {
  const companyLower = (company || "").toLowerCase();
  const companyNameLower = (companyName || "").toLowerCase();

  return JOB_BOARD_COMPANIES.some(
    (board) => companyLower.includes(board) || companyNameLower.includes(board),
  );
}

/**
 * Filter out job board companies from job list
 *
 * @param jobs - Array of jobs with company and/or company_name properties
 * @returns Filtered array excluding job boards
 */
export function filterJobBoards<
  T extends { company?: string; company_name?: string },
>(jobs: T[]): T[] {
  return jobs.filter((job) => !isJobBoard(job.company, job.company_name));
}

/**
 * Sort jobs by status (active first, then inactive)
 *
 * Business Rule: Active jobs should be shown first, but inactive jobs
 * are still shown (not filtered out completely)
 *
 * @param jobs - Array of jobs with is_active and status properties
 * @returns Sorted array with active jobs first
 */
export function sortJobsByStatus<
  T extends { is_active?: boolean; status?: string },
>(jobs: T[]): { active: T[]; inactive: T[] } {
  const activeJobs = jobs.filter(
    (job) => job.is_active && job.status === "active",
  );
  const inactiveJobs = jobs.filter(
    (job) => !job.is_active || job.status !== "active",
  );

  return { active: activeJobs, inactive: inactiveJobs };
}
