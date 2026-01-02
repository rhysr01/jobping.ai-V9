/**
 * Category Mapper - Single Source of Truth
 * CRITICAL: This must match Utils/matching/categoryMapper.ts exactly
 *
 * This file ensures all scrapers use the same category mappings,
 * preventing old category names from being created.
 */

// CRITICAL: These mappings MUST match Utils/matching/categoryMapper.ts
// Form values (from CAREER_PATH_KEYWORDS) → Database categories
const CATEGORY_MAP = {
	strategy: "strategy-business-design",
	finance: "finance-investment", // NOT 'finance-accounting'
	sales: "sales-client-success", // NOT 'sales-business-development'
	marketing: "marketing-growth", // NOT 'marketing-advertising'
	product: "product-innovation", // NOT 'product-management'
	operations: "operations-supply-chain",
	"general-management": "general-management",
	data: "data-analytics",
	"people-hr": "people-hr",
	legal: "legal-compliance",
	sustainability: "sustainability-esg",
	creative: "creative-design",
};

// OLD category names that should NEVER be used
const DEPRECATED_CATEGORIES = [
	"marketing-advertising",
	"finance-accounting",
	"sales-business-development",
	"product-management",
];

/**
 * Map a career path to database category
 * @param {string} path - Career path from CAREER_PATH_KEYWORDS
 * @returns {string} - Database category name
 */
function mapCategory(path) {
	return CATEGORY_MAP[path] || path;
}

/**
 * Validate and fix categories array
 * Removes deprecated categories and ensures correct mappings
 * @param {string[]} categories - Array of category names
 * @returns {string[]} - Cleaned categories array
 */
function validateAndFixCategories(categories) {
	if (!Array.isArray(categories)) {
		return ["early-career"];
	}

	const cleaned = [];
	const seen = new Set();

	for (const cat of categories) {
		// Skip deprecated categories
		if (DEPRECATED_CATEGORIES.includes(cat)) {
			continue;
		}

		// Map old categories to new ones (if somehow they got through)
		let mappedCat = cat;
		if (cat === "marketing-advertising") mappedCat = "marketing-growth";
		else if (cat === "finance-accounting") mappedCat = "finance-investment";
		else if (cat === "sales-business-development")
			mappedCat = "sales-client-success";
		else if (cat === "product-management") mappedCat = "product-innovation";

		// Add if not already seen
		if (!seen.has(mappedCat)) {
			cleaned.push(mappedCat);
			seen.add(mappedCat);
		}
	}

	// Ensure at least 'early-career' exists
	if (cleaned.length === 0 || !cleaned.includes("early-career")) {
		cleaned.unshift("early-career");
	}

	return cleaned;
}

/**
 * Build categories from career path keywords
 * @param {string} path - Career path key
 * @param {string[]} existingCategories - Existing categories array
 * @returns {string[]} - Updated categories array
 */
function addCategoryFromPath(path, existingCategories = []) {
	const mappedCategory = mapCategory(path);
	const categories = Array.isArray(existingCategories)
		? [...existingCategories]
		: ["early-career"];

	if (!categories.includes(mappedCategory)) {
		categories.push(mappedCategory);
	}

	return validateAndFixCategories(categories);
}

module.exports = {
	CATEGORY_MAP,
	DEPRECATED_CATEGORIES,
	mapCategory,
	validateAndFixCategories,
	addCategoryFromPath,
};
