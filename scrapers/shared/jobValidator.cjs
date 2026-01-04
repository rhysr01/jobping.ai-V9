/**
 * Job Data Quality Validator
 * CRITICAL: Prevents data quality issues before jobs are saved to database
 *
 * This validator ensures:
 * - Company names are set (not NULL)
 * - Job boards are not saved as companies
 * - Cities are normalized and set
 * - Descriptions are adequate
 * - Required fields are present
 */

// Job boards/aggregators to filter out (NOT recruitment agencies)
// Recruitment agencies like "Hays Recruitment" are legitimate companies
const JOB_BOARDS = [
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
	"efinancial",
	"stepstone",
	"reed.co.uk",
	"indeed.com",
	"linkedin.com",
	"adzuna.co.uk",
	"totaljobs.com",
	"glassdoor.com",
	"careerjet.com",
	"monster.com",
	"ziprecruiter.com",
	"stepstone.com",
];

const COUNTRY_NAMES = [
	"espana",
	"deutschland",
	"osterreich",
	"nederland",
	"belgique",
	"united kingdom",
	"uk",
	"usa",
	"us",
	"france",
	"germany",
	"spain",
	"austria",
	"netherlands",
	"belgium",
	"ireland",
	"schweiz",
	"switzerland",
	"italia",
	"italy",
	"poland",
	"polska",
	"denmark",
	"danmark",
	"sweden",
	"sverige",
	"czech republic",
	"czechia",
];

/**
 * Validate a job before saving to database
 * Returns { valid: boolean, errors: string[], warnings: string[] }
 */
function validateJob(job) {
	const errors = [];
	const warnings = [];

	// CRITICAL: Required fields
	if (!job.title || job.title.trim().length === 0) {
		errors.push("Missing title");
	}

	if (!job.company || job.company.trim().length === 0) {
		errors.push("Missing company");
	}

	if (!job.job_hash || job.job_hash.trim().length === 0) {
		errors.push("Missing job_hash");
	}

	if (!job.job_url || job.job_url.trim().length === 0) {
		errors.push("Missing job_url");
	}

	// CRITICAL: Company name must be set
	if (!job.company_name || job.company_name.trim().length === 0) {
		if (job.company && job.company.trim().length > 0) {
			// Auto-fix: Set company_name from company
			job.company_name = job.company;
			warnings.push("Auto-fixed: Set company_name from company field");
		} else {
			errors.push("Missing company_name and company");
		}
	}

	// CRITICAL: Reject job board companies
	const companyLower = (job.company || "").toLowerCase();
	const companyNameLower = (job.company_name || "").toLowerCase();
	const isJobBoard = JOB_BOARDS.some(
		(board) => companyLower.includes(board) || companyNameLower.includes(board),
	);

	if (isJobBoard) {
		errors.push(
			`Job board detected as company: ${job.company || job.company_name}`,
		);
	}

	// WARNING: Missing city (not blocking, but should be fixed)
	if (!job.city || job.city.trim().length === 0) {
		warnings.push("Missing city - may affect location filtering");

		// Try to extract from location
		if (job.location?.includes(",")) {
			const parts = job.location
				.split(",")
				.map((p) => p.trim())
				.filter(Boolean);
			if (parts.length > 0) {
				job.city = parts[0];
				warnings.push("Auto-extracted city from location field");
			}
		}
	}

	// WARNING: Missing country (not blocking)
	if (!job.country || job.country.trim().length === 0) {
		warnings.push("Missing country");

		// Try to extract from location
		if (job.location?.includes(",")) {
			const parts = job.location
				.split(",")
				.map((p) => p.trim())
				.filter(Boolean);
			if (parts.length > 1) {
				job.country = parts[parts.length - 1];
				warnings.push("Auto-extracted country from location field");
			}
		}
	}

	// WARNING: Country name used as city
	if (job.city && COUNTRY_NAMES.includes(job.city.toLowerCase())) {
		warnings.push(`Country name used as city: ${job.city} - should be NULL`);
		job.city = null; // Auto-fix
	}

	// WARNING: Very short description
	if (!job.description || job.description.trim().length < 20) {
		warnings.push("Description too short (< 20 chars)");

		// Auto-fix: Build minimal description
		if (!job.description || job.description.trim().length === 0) {
			job.description = `${job.title || "Job"} at ${job.company_name || job.company || "Company"}`;
			warnings.push("Auto-generated minimal description");
		}
	}

	// WARNING: Missing categories
	if (
		!job.categories ||
		!Array.isArray(job.categories) ||
		job.categories.length === 0
	) {
		warnings.push("Missing categories - adding default");
		job.categories = ["early-career"];
	}

	// CRITICAL: Validate and fix categories - prevent old category names
	const {
		validateAndFixCategories,
		DEPRECATED_CATEGORIES,
	} = require("./categoryMapper.cjs");
	const originalCategories = [...(job.categories || [])];
	job.categories = validateAndFixCategories(job.categories);

	// CRITICAL: Ensure job has at least one work-type category
	// This prevents jobs from being saved without work-type categories
	// This is REQUIRED for proper matching - jobs without work-type categories cannot be matched to users
	const { ensureWorkTypeCategory, WORK_TYPE_CATEGORIES } = require("./workTypeInference.cjs");
	const hasWorkTypeCategory = (job.categories || []).some((cat) =>
		WORK_TYPE_CATEGORIES.includes(cat),
	);

	if (!hasWorkTypeCategory) {
		// Auto-fix: Infer work-type category from title/description
		// This ensures ALL jobs have work-type categories for proper matching
		const inferredCategories = ensureWorkTypeCategory({
			title: job.title || "",
			description: job.description || "",
			categories: job.categories || [],
		});
		
		const inferredWorkTypes = inferredCategories.filter((cat) =>
			WORK_TYPE_CATEGORIES.includes(cat),
		);
		
		if (inferredWorkTypes.length > 0) {
			job.categories = inferredCategories;
			warnings.push(
				`Missing work-type category - auto-inferred: ${inferredWorkTypes.join(", ")}`,
			);
		} else {
			// This should never happen due to ensureWorkTypeCategory fallback to 'general-management'
			// But if it does, reject the job - it cannot be matched without a work-type category
			errors.push(
				`CRITICAL: Unable to infer work-type category for job "${job.title}" - job will be rejected (required for matching)`,
			);
		}
	}

	// Check if deprecated categories were removed
	const hadDeprecated = originalCategories.some((cat) =>
		DEPRECATED_CATEGORIES.includes(cat),
	);
	if (hadDeprecated) {
		warnings.push(
			`Removed deprecated categories: ${originalCategories.filter((cat) => DEPRECATED_CATEGORIES.includes(cat)).join(", ")}`,
		);
	}

	// WARNING: Missing work_environment
	if (!job.work_environment) {
		warnings.push("Missing work_environment - defaulting to on-site");
		job.work_environment = "on-site";
	}

	// WARNING: Future posted_at date
	if (job.posted_at && new Date(job.posted_at) > new Date()) {
		warnings.push("posted_at is in the future - using current time");
		job.posted_at = new Date().toISOString();
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings,
		job: errors.length === 0 ? job : null, // Return fixed job if valid
	};
}

/**
 * Validate and fix a batch of jobs
 * Returns { valid: [], invalid: [], stats: {} }
 */
function validateJobs(jobs) {
	const valid = [];
	const invalid = [];
	const stats = {
		total: jobs.length,
		valid: 0,
		invalid: 0,
		autoFixed: 0,
		errors: {},
		warnings: {},
	};

	for (const job of jobs) {
		const result = validateJob(job);

		if (result.valid) {
			valid.push(result.job);
			stats.valid++;
			if (result.warnings.length > 0) {
				stats.autoFixed++;
			}
		} else {
			invalid.push({ job, errors: result.errors, warnings: result.warnings });
			stats.invalid++;

			// Track error types
			result.errors.forEach((error) => {
				const errorType = error.split(":")[0];
				stats.errors[errorType] = (stats.errors[errorType] || 0) + 1;
			});
		}

		// Track warning types
		result.warnings.forEach((warning) => {
			const warningType = warning.split(":")[0];
			stats.warnings[warningType] = (stats.warnings[warningType] || 0) + 1;
		});
	}

	return { valid, invalid, stats };
}

module.exports = {
	validateJob,
	validateJobs,
	JOB_BOARDS,
	COUNTRY_NAMES,
};
