// Utils/matching/categoryMapper.ts
// Maps form values to database categories for proper job matching

export interface FormCategory {
	value: string;
	label: string;
	databaseCategory: string;
	jobCount?: number;
}

// Original career path values from Supabase (what gets stored in users.career_path)
// These are the simple values that match what's in the database
export const ORIGINAL_CAREER_PATH_VALUES = [
	"strategy",
	"data",
	"sales",
	"marketing",
	"finance",
	"operations",
	"product",
	"tech",
	"sustainability",
	"unsure",
] as const;

// Better-worded labels for display (what users see in the UI)
// These match the labels used in the signup forms
export const CAREER_PATH_LABELS: Record<string, string> = {
	strategy: "Strategy & Business Design",
	data: "Data & Analytics",
	sales: "Sales & Client Success",
	marketing: "Marketing & Growth",
	finance: "Finance & Investment",
	operations: "Operations & Supply Chain",
	product: "Product & Innovation",
	tech: "Tech & Transformation",
	sustainability: "Sustainability & ESG",
	unsure: "Not Sure Yet / General",
};

/**
 * Gets the display label for a career path value
 * Returns the better-worded label for display purposes
 */
export function getCareerPathLabel(value: string): string {
	return CAREER_PATH_LABELS[value] || value;
}

// Complete mapping between form values and database categories
// Form values match the original Supabase users.career_path values (simple, no hyphens)
export const FORM_TO_DATABASE_MAPPING: Record<string, string> = {
	strategy: "strategy-business-design",
	data: "data-analytics", // Original form value 'data' maps to database category 'data-analytics'
	sales: "sales-client-success",
	marketing: "marketing-growth",
	finance: "finance-investment",
	operations: "operations-supply-chain",
	product: "product-innovation",
	tech: "tech-transformation",
	sustainability: "sustainability-esg",
	unsure: "all-categories", // Special case for "Not Sure Yet"
	// Legacy support for hyphenated values (if they come from old data)
	"data-analytics": "data-analytics",
	"retail-luxury": "retail-luxury",
	entrepreneurship: "entrepreneurship",
};

// Mapping from form labels to database categories (for career_path field)
export const FORM_LABEL_TO_DATABASE_MAPPING: Record<string, string> = {
	"Strategy & Business Design": "strategy-business-design",
	"Finance & Investment": "finance-investment",
	"Sales & Client Success": "sales-client-success",
	"Marketing & Growth": "marketing-growth",
	"Data & Analytics": "data-analytics",
	"Operations & Supply Chain": "operations-supply-chain",
	"Product & Innovation": "product-innovation",
	"Tech & Transformation": "tech-transformation", // Using the better-worded version consistently
	"Sustainability & ESG": "sustainability-esg",
	"Not Sure Yet / General": "all-categories",
	// Legacy support for old variations
	"Tech & Engineering": "tech-transformation",
	"Retail & Luxury": "retail-luxury",
	Entrepreneurship: "entrepreneurship",
};

// Reverse mapping for display purposes
// Maps database categories back to original form values (simple, no hyphens)
export const DATABASE_TO_FORM_MAPPING: Record<string, string> = {
	"strategy-business-design": "strategy",
	"finance-investment": "finance",
	"sales-client-success": "sales",
	"marketing-growth": "marketing",
	"data-analytics": "data", // Database category maps back to original form value 'data'
	"operations-supply-chain": "operations",
	"product-innovation": "product",
	"tech-transformation": "tech",
	"sustainability-esg": "sustainability",
	"retail-luxury": "retail-luxury", // Not in original form, keep as-is
	entrepreneurship: "entrepreneurship", // Not in original form, keep as-is
	technology: "tech", // Legacy mapping
};

// All work type categories in the database (excluding seniority levels)
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
	"retail-luxury",
	"entrepreneurship",
	"technology",
];

// Student satisfaction optimization
// Prioritizes what students told us they want - simple relevance matching

export const STUDENT_SATISFACTION_FACTORS = {
	// How well jobs match what students explicitly selected
	preferenceMatch: {
		exact: 100, // Perfect match with user's career path choice
		related: 70, // Related work type categories
		general: 40, // General business jobs (fallback)
		none: 0, // No match with preferences
	},
};

// Simple satisfaction scoring - matches what students told us they want
export function getStudentSatisfactionScore(
	jobCategories: string[],
	userFormValues: string[],
): number {
	if (!userFormValues || userFormValues.length === 0) return 1; // Neutral for flexible users

	let score = 0;

	// Primary: Exact career path match (most important for satisfaction)
	const userDatabaseCategories = new Set<string>();
	userFormValues.forEach((formValue) => {
		getDatabaseCategoriesForForm(formValue).forEach((category) => {
			userDatabaseCategories.add(category);
		});
	});

	const exactMatches = jobCategories.filter((category) =>
		userDatabaseCategories.has(category),
	);
	if (exactMatches.length > 0) {
		score += 60; // Strong career alignment
	}

	// Secondary: Work type categorization (shows job quality)
	const workTypeMatches = jobCategories.filter((cat) =>
		WORK_TYPE_CATEGORIES.includes(cat),
	);
	if (workTypeMatches.length > 0) {
		score += 20; // Properly categorized = higher quality
	}

	// Additional factors (work environment, entry level) intentionally omitted for simplicity and consistency

	return Math.min(score, 100); // Cap at 100
}

// Seniority levels (not work types)
export const SENIORITY_LEVELS = [
	"early-career",
	"experienced",
	"internship",
	"business-graduate",
];

/**
 * Maps form category value to database category
 */
export function mapFormToDatabase(formValue: string): string {
	return FORM_TO_DATABASE_MAPPING[formValue] || formValue;
}

/**
 * Maps form label to database category (for career_path field)
 */
export function mapFormLabelToDatabase(formLabel: string): string {
	return FORM_LABEL_TO_DATABASE_MAPPING[formLabel] || formLabel;
}

/**
 * Maps database category to form value
 */
export function mapDatabaseToForm(databaseCategory: string): string {
	return DATABASE_TO_FORM_MAPPING[databaseCategory] || databaseCategory;
}

/**
 * Gets all database categories for a form value
 * Handles special case of 'unsure' which should include all categories
 */
export function getDatabaseCategoriesForForm(formValue: string): string[] {
	if (formValue === "unsure") {
		return WORK_TYPE_CATEGORIES;
	}

	const mappedCategory = mapFormToDatabase(formValue);
	return mappedCategory === "all-categories"
		? WORK_TYPE_CATEGORIES
		: [mappedCategory];
}

/**
 * Checks if a job category matches any of the user's selected form categories
 */
export function jobMatchesUserCategories(
	jobCategories: string[],
	userFormValues: string[],
): boolean {
	if (!jobCategories || jobCategories.length === 0) return false;
	if (!userFormValues || userFormValues.length === 0) return true; // If no preferences, show all

	// Get all database categories the user is interested in
	const userDatabaseCategories = new Set<string>();
	userFormValues.forEach((formValue) => {
		getDatabaseCategoriesForForm(formValue).forEach((category) => {
			userDatabaseCategories.add(category);
		});
	});

	// Check if any job category matches user preferences
	return jobCategories.some((category) => userDatabaseCategories.has(category));
}

/**
 * Gets the priority score for a job based on category alignment
 */
export function getCategoryPriorityScore(
	jobCategories: string[],
	userFormValues: string[],
): number {
	if (!jobCategories || jobCategories.length === 0) return 0;
	if (!userFormValues || userFormValues.length === 0) return 1; // Neutral score if no preferences

	const userDatabaseCategories = new Set<string>();
	userFormValues.forEach((formValue) => {
		getDatabaseCategoriesForForm(formValue).forEach((category) => {
			userDatabaseCategories.add(category);
		});
	});

	// Count how many job categories match user preferences
	const matchingCategories = jobCategories.filter((category) =>
		userDatabaseCategories.has(category),
	);
	return matchingCategories.length;
}
