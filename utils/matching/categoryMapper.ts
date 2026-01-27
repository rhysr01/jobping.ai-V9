// Utils/matching/categoryMapper.ts
// Category mapping - uses LONG FORM everywhere
// 
// All categories use LONG FORM (with hyphens):
// - finance-investment (consistent everywhere)
// - data-analytics (consistent everywhere)
// - strategy-business-design (consistent everywhere)
// - etc.
//
// SINGLE mapping: long-form → display label (for UI only)

export interface FormCategory {
	value: string;
	label: string;
	jobCount?: number;
}

// Career path values - stored and used in long form everywhere
export const ORIGINAL_CAREER_PATH_VALUES = [
	"strategy-business-design",
	"data-analytics",
	"sales-client-success",
	"marketing-growth",
	"finance-investment",
	"operations-supply-chain",
	"product-innovation",
	"tech-transformation",
	"sustainability-esg",
	"all-categories",
] as const;

// Display labels for UI - ONLY mapping needed
// Maps long-form category → human-readable label
export const CAREER_PATH_LABELS: Record<string, string> = {
	"strategy-business-design": "Strategy & Business Design",
	"data-analytics": "Data & Analytics",
	"sales-client-success": "Sales & Client Success",
	"marketing-growth": "Marketing & Growth",
	"finance-investment": "Finance & Investment",
	"operations-supply-chain": "Operations & Supply Chain",
	"product-innovation": "Product & Innovation",
	"tech-transformation": "Tech & Transformation",
	"sustainability-esg": "Sustainability & ESG",
	"all-categories": "Not Sure Yet / General",
};

/**
 * Gets the display label for a career path value
 * Input: long-form category (finance-investment)
 * Output: display label (Finance & Investment)
 */
export function getCareerPathLabel(value: string): string {
	return CAREER_PATH_LABELS[value] || value;
}

// Student satisfaction optimization
export const STUDENT_SATISFACTION_FACTORS = {
	preferenceMatch: {
		exact: 100,
		related: 70,
		general: 40,
		none: 0,
	},
	multiPath: {
		bothPathsMatch: 120,
		onePathMatch: 100,
		partialMatch: 60,
	},
};

/**
 * Balanced satisfaction scoring for single and multiple career paths
 */
export function getStudentSatisfactionScore(
	jobCategories: string[],
	userFormValues: string[],
): number {
	if (!userFormValues || userFormValues.length === 0) return 1;
	if (!jobCategories || jobCategories.length === 0) return 0;

	let score = 0;

	// No mapping needed - userFormValues ARE the database categories
	const userPreferredCategories = new Set(userFormValues);

	// Count exact category matches
	const exactMatches = jobCategories.filter((category) =>
		userPreferredCategories.has(category),
	);

	const relevanceRatio = exactMatches.length / jobCategories.length;

	if (relevanceRatio < 0.4) {
		return 0;
	}

	score += relevanceRatio * 60;

	if (userFormValues.length > 1) {
		const userPathsCovered = userFormValues.filter((formValue) => {
			return jobCategories.includes(formValue);
		});

		if (userPathsCovered.length === userFormValues.length) {
			score += STUDENT_SATISFACTION_FACTORS.multiPath.bothPathsMatch - 100;
		} else if (userPathsCovered.length >= 1) {
			score += STUDENT_SATISFACTION_FACTORS.multiPath.onePathMatch - 100;
		} else {
			score += STUDENT_SATISFACTION_FACTORS.multiPath.partialMatch - 100;
		}
	}

	const workTypeMatches = jobCategories.filter((cat) =>
		WORK_TYPE_CATEGORIES.includes(cat),
	);
	if (workTypeMatches.length > 0) {
		score += 20;
	}

	return Math.min(Math.max(score, 0), 100);
}

// Seniority levels (not work types)
export const SENIORITY_LEVELS = [
	"early-career",
	"experienced",
	"internship",
	"business-graduate",
];

/**
 * Identity function - form values ARE database categories (no mapping needed)
 */
export function mapFormToDatabase(formValue: string): string {
	return formValue; // Already in correct format!
}

/**
 * Maps form label to database category
 * Input: "Finance & Investment" (UI label)
 * Output: "finance-investment" (database category)
 */
export function mapFormLabelToDatabase(formLabel: string): string {
	for (const [value, label] of Object.entries(CAREER_PATH_LABELS)) {
		if (label === formLabel) {
			return value;
		}
	}
	return formLabel;
}

/**
 * Identity function - database categories ARE form values
 */
export function mapDatabaseToForm(databaseCategory: string): string {
	return databaseCategory; // Already in correct format!
}

/**
 * Gets all database categories for a form value
 * Since form value IS database category now, just return it
 */
export function getDatabaseCategoriesForForm(formValue: string): string[] {
	if (formValue === "all-categories") {
		return WORK_TYPE_CATEGORIES;
	}
	return [formValue];
}

/**
 * Checks if a job category matches user's selected form categories
 */
export function jobMatchesUserCategories(
	jobCategories: string[],
	userFormValues: string[],
): boolean {
	if (!jobCategories || jobCategories.length === 0) return false;
	if (!userFormValues || userFormValues.length === 0) return true;

	const userPreferredCategories = new Set(userFormValues);

	const exactMatches = jobCategories.filter((category) =>
		userPreferredCategories.has(category),
	);

	if (userFormValues.length === 1) {
		return exactMatches.length > 0;
	}

	const relevanceRatio = exactMatches.length / jobCategories.length;
	return relevanceRatio >= 0.4;
}

/**
 * Gets the priority score for a job based on category alignment
 */
export function getCategoryPriorityScore(
	jobCategories: string[],
	userFormValues: string[],
): number {
	if (!jobCategories || jobCategories.length === 0) return 0;
	if (!userFormValues || userFormValues.length === 0) return 1;

	const userPreferredCategories = new Set(userFormValues);

	const matchingCategories = jobCategories.filter((category) =>
		userPreferredCategories.has(category),
	);
	return matchingCategories.length;
}

// All work type categories in long form
export const WORK_TYPE_CATEGORIES = [
	"strategy-business-design",
	"data-analytics",
	"marketing-growth",
	"tech-transformation",
	"operations-supply-chain",
	"finance-investment",
	"sales-client-success",
	"product-innovation",
	"sustainability-esg",
	"all-categories",
	"early-career",
	"internship",
];
