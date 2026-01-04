/**
 * Work-Type Category Inference
 * Automatically infers work-type categories from job title and description
 * This ensures jobs always have work-type categories for proper matching
 */

const WORK_TYPE_CATEGORIES = [
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
	"people-hr",
	"legal-compliance",
	"creative-design",
	"general-management",
];

/**
 * Infer work-type categories from job title and description
 * @param {string} title - Job title
 * @param {string} description - Job description
 * @returns {string[]} - Array of inferred work-type categories
 */
function inferWorkTypeCategories(title = "", description = "") {
	const text = `${title} ${description}`.toLowerCase();
	const inferred = [];

	// Strategy & Business Design
	if (
		text.includes("strategy") ||
		text.includes("business design") ||
		text.includes("consulting") ||
		text.includes("consultant") ||
		text.includes("business analyst") ||
		text.includes("transformation")
	) {
		inferred.push("strategy-business-design");
	}

	// Data & Analytics
	if (
		text.includes("data analyst") ||
		text.includes("data scientist") ||
		text.includes("data engineer") ||
		text.includes("analytics") ||
		text.includes("business intelligence") ||
		text.includes("bi engineer") ||
		text.includes("insights analyst")
	) {
		inferred.push("data-analytics");
	}

	// Marketing & Growth
	if (
		text.includes("marketing") ||
		text.includes("growth") ||
		text.includes("social media") ||
		text.includes("content") ||
		text.includes("brand") ||
		text.includes("digital marketing") ||
		text.includes("seo") ||
		text.includes("ppc")
	) {
		inferred.push("marketing-growth");
	}

	// Tech & Transformation
	if (
		text.includes("software") ||
		text.includes("developer") ||
		text.includes("engineer") ||
		text.includes("programmer") ||
		text.includes("programming") ||
		text.includes("tech") ||
		text.includes("technology") ||
		text.includes("it ") ||
		text.includes("information technology") ||
		text.includes("systems") ||
		text.includes("devops") ||
		text.includes("sre") ||
		text.includes("site reliability") ||
		text.includes("cybersecurity") ||
		text.includes("security") ||
		text.includes("cloud") ||
		text.includes("backend") ||
		text.includes("frontend") ||
		text.includes("full stack") ||
		text.includes("fullstack")
	) {
		inferred.push("tech-transformation");
	}

	// Operations & Supply Chain
	if (
		text.includes("operations") ||
		text.includes("supply chain") ||
		text.includes("logistics") ||
		text.includes("procurement") ||
		text.includes("purchasing") ||
		text.includes("warehouse") ||
		text.includes("inventory") ||
		text.includes("fulfillment")
	) {
		inferred.push("operations-supply-chain");
	}

	// Finance & Investment
	if (
		text.includes("finance") ||
		text.includes("investment") ||
		text.includes("financial") ||
		text.includes("trading") ||
		text.includes("trader") ||
		text.includes("accountant") ||
		text.includes("accounting") ||
		text.includes("audit") ||
		text.includes("risk") ||
		text.includes("compliance") ||
		text.includes("banking")
	) {
		inferred.push("finance-investment");
	}

	// Sales & Client Success
	if (
		text.includes("sales") ||
		text.includes("account manager") ||
		text.includes("client success") ||
		text.includes("business development") ||
		text.includes(" bd ") ||
		text.includes("account executive") ||
		text.includes(" sdr ") ||
		text.includes(" bdr ") ||
		text.includes("sales development")
	) {
		inferred.push("sales-client-success");
	}

	// Product & Innovation
	if (
		text.includes("product manager") ||
		text.includes("product owner") ||
		text.includes("product analyst") ||
		text.includes("product specialist") ||
		text.includes("product development") ||
		text.includes("product innovation") ||
		text.includes("product management")
	) {
		inferred.push("product-innovation");
	}

	// Sustainability & ESG
	if (
		text.includes("sustainability") ||
		text.includes("esg") ||
		text.includes("environmental") ||
		text.includes("green") ||
		text.includes("climate") ||
		text.includes("carbon") ||
		text.includes("renewable")
	) {
		inferred.push("sustainability-esg");
	}

	// People & HR
	if (
		text.includes("hr") ||
		text.includes("human resources") ||
		text.includes("recruitment") ||
		text.includes("recruiter") ||
		text.includes("talent acquisition") ||
		text.includes("people operations")
	) {
		inferred.push("people-hr");
	}

	// Legal & Compliance
	if (
		text.includes("legal") ||
		text.includes("lawyer") ||
		text.includes("attorney") ||
		text.includes("compliance") ||
		text.includes("regulatory")
	) {
		inferred.push("legal-compliance");
	}

	// Creative & Design
	if (
		text.includes("designer") ||
		text.includes("design") ||
		text.includes("creative") ||
		text.includes("graphic") ||
		text.includes("ux") ||
		text.includes("ui")
	) {
		inferred.push("creative-design");
	}

	// General Management
	if (
		text.includes("manager") ||
		text.includes("management") ||
		text.includes("director") ||
		text.includes("executive")
	) {
		// Only add if no other work-type category was found
		if (inferred.length === 0) {
			inferred.push("general-management");
		}
	}

	return [...new Set(inferred)]; // Remove duplicates
}

/**
 * Ensure job has at least one work-type category
 * If missing, infer from title/description
 * @param {Object} job - Job object with title, description, categories
 * @returns {string[]} - Updated categories array with work-type category
 */
function ensureWorkTypeCategory(job) {
	const categories = Array.isArray(job.categories) ? [...job.categories] : [];
	
	// Check if job already has a work-type category
	const hasWorkType = categories.some((cat) =>
		WORK_TYPE_CATEGORIES.includes(cat),
	);

	if (!hasWorkType) {
		// Infer work-type categories from title and description
		const inferred = inferWorkTypeCategories(
			job.title || "",
			job.description || "",
		);

		if (inferred.length > 0) {
			// Add inferred categories
			inferred.forEach((cat) => {
				if (!categories.includes(cat)) {
					categories.push(cat);
				}
			});
		} else {
			// If we can't infer, add general-management as fallback
			// This ensures every job has at least one work-type category
			if (!categories.includes("general-management")) {
				categories.push("general-management");
			}
		}
	}

	return categories;
}

module.exports = {
	inferWorkTypeCategories,
	ensureWorkTypeCategory,
	WORK_TYPE_CATEGORIES,
};

