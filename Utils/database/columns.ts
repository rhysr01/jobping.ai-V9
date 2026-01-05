/**
 * Centralized column definitions for database queries
 * Prevents SELECT * and ensures consistency across the codebase
 *
 * Usage:
 * ```typescript
 * import { JOB_COLUMNS } from "@/Utils/database/columns";
 *
 * const { data } = await supabase
 *   .from('jobs')
 *   .select(JOB_COLUMNS.standard);
 * ```
 */

/**
 * Job table column sets
 */
export const JOB_COLUMNS = {
  /**
   * Minimal columns for list views (fast, lightweight)
   */
  minimal: "id, title, company, location, city, job_url, posted_date",

  /**
   * Standard columns for detail views
   */
  standard: `
		id,
		title,
		company,
		company_id,
		location,
		city,
		country,
		job_url,
		description,
		posted_date,
		categories,
		work_type,
		salary_min,
		salary_max,
		is_active
	`,

  /**
   * Full columns for matching/processing (includes all fields)
   */
  full: `
		id,
		title,
		company,
		company_id,
		location,
		city,
		country,
		job_url,
		description,
		posted_date,
		categories,
		work_type,
		salary_min,
		salary_max,
		currency,
		is_active,
		job_hash,
		source,
		original_posted_date,
		last_seen_at
	`,
};

/**
 * User table column sets
 */
export const USER_COLUMNS = {
  /**
   * Minimal user data
   */
  minimal: "id, email, subscription_tier",

  /**
   * Standard user data for most operations
   */
  standard: "id, email, subscription_tier, created_at, preferences",

  /**
   * Full user data (use sparingly)
   */
  full: "id, email, subscription_tier, created_at, updated_at, preferences, email_verified",
};

/**
 * Company table column sets
 */
export const COMPANY_COLUMNS = {
  /**
   * Minimal company data
   */
  minimal: "id, name",

  /**
   * Standard company data
   */
  standard: "id, name, visa_sponsorship, size",

  /**
   * Full company data
   */
  full: "id, name, visa_sponsorship, size, industry, description",
};

/**
 * Match table column sets
 */
export const MATCH_COLUMNS = {
  /**
   * Minimal match data
   */
  minimal: "id, user_id, job_id, match_score, created_at",

  /**
   * Standard match data with job details
   */
  standard: `
		id,
		user_id,
		job_id,
		match_score,
		match_reason,
		created_at,
		job:jobs(${JOB_COLUMNS.minimal})
	`,

  /**
   * Full match data with all details
   */
  full: `
		id,
		user_id,
		job_id,
		match_score,
		match_reason,
		confidence_score,
		created_at,
		job:jobs(${JOB_COLUMNS.standard})
	`,
};
