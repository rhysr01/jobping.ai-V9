/**
 * Classification Validator
 * 
 * ENSURES job classification is correct at ingestion time
 * Validates that is_internship and is_graduate are set properly
 * Prevents misclassification issues from being saved to database
 */

/**
 * Validate job classification
 * Returns validation result with is_valid, errors, and auto-fixes if possible
 */
function validateJobClassification(job) {
	const errors = [];
	const warnings = [];
	let fixed = false;

	// Check required fields exist
	if (!job.title || !job.description) {
		errors.push("Missing title or description for classification");
		return { isValid: false, errors, warnings, fixed };
	}

	// RULE 1: Exactly ONE of is_internship or is_graduate should be true
	const internshipCount = (job.is_internship ? 1 : 0) + (job.is_graduate ? 1 : 0);

	if (internshipCount > 1) {
		errors.push(
			`Job cannot be both internship AND graduate: title="${job.title}"`
		);
	}

	// RULE 2: Check if classification matches actual content
	const title = (job.title || "").toLowerCase();
	const description = (job.description || "").toLowerCase();
	const fullText = `${title} ${description}`;

	// Graduate indicators
	const isGraduateKeyword =
		/\bgraduate\s+(?:programme|program|scheme|trainee|role)\b/.test(fullText) ||
		/\bgrad\s+(?:scheme|program)\b/.test(fullText) ||
		/\b(?:management|graduate)\s+trainee\b/.test(fullText) ||
		/\b(?:rotational|leadership|accelerated)\s+(?:programme|program)\b/.test(fullText) ||
		/\bcampus\s+hire\b/.test(fullText) ||
		/\bnew\s+grad(?:uate)?\b/.test(fullText);

	// Internship indicators
	const isInternshipKeyword =
		/\bintern(?:ship)?\b/.test(fullText) &&
		!isGraduateKeyword; // Only if not already graduate

	// RULE 3: Verify actual content matches flags
	if (job.is_graduate && !isGraduateKeyword) {
		warnings.push(
			`Job marked as graduate but title doesn't indicate it: "${job.title}"`
		);
	}

	if (job.is_internship && !isInternshipKeyword && isGraduateKeyword) {
		errors.push(
			`Job marked as internship but is actually graduate: "${job.title}"`
		);
		fixed = true;
		job.is_internship = false;
		job.is_graduate = true;
	}

	// RULE 4: If title clearly indicates graduate, but marked as internship, auto-fix
	if (
		isGraduateKeyword &&
		job.is_internship &&
		!job.is_graduate
	) {
		warnings.push(
			`Auto-fixing: Job marked as internship but is graduate: "${job.title}"`
		);
		job.is_internship = false;
		job.is_graduate = true;
		fixed = true;
	}

	return {
		isValid: errors.length === 0,
		errors,
		warnings,
		fixed,
		job,
	};
}

/**
 * Validate batch of jobs
 * Returns summary of validation results
 */
function validateJobClassificationBatch(jobs) {
	const results = [];
	let validCount = 0;
	let invalidCount = 0;
	let fixedCount = 0;
	let warningCount = 0;
	const errors = [];
	const warnings = [];

	for (const job of jobs) {
		const result = validateJobClassification(job);
		results.push(result);

		if (result.isValid) {
			validCount++;
		} else {
			invalidCount++;
			errors.push({
				job_title: job.title,
				errors: result.errors,
			});
		}

		if (result.fixed) {
			fixedCount++;
		}

		if (result.warnings && result.warnings.length > 0) {
			warningCount += result.warnings.length;
			warnings.push({
				job_title: job.title,
				warnings: result.warnings,
			});
		}
	}

	return {
		total: jobs.length,
		valid: validCount,
		invalid: invalidCount,
		fixed: fixedCount,
		warnings: warningCount,
		details: {
			errors,
			warnings,
		},
		results,
	};
}

module.exports = {
	validateJobClassification,
	validateJobClassificationBatch,
};

