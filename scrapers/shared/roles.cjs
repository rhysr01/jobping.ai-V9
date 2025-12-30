/**
 * Shared role definitions matching the signup form
 * Used by all scrapers to ensure queries match what users actually select
 */

const CAREER_PATHS_ROLES = {
	strategy: [
		"Business Analyst",
		"Associate Consultant",
		"Junior Consultant",
		"Strategy Analyst",
		"Consulting Intern",
		"Junior Business Analyst",
		"Transformation Analyst",
		"Management Consulting Intern",
		"Growth Consultant",
		"Business Analyst Trainee",
		"Junior Associate",
		"Strategy Consultant",
		"Digital Transformation Analyst",
		"Operations Excellence Consultant",
		"Business Strategy Intern",
	],
	data: [
		"Data Analyst",
		"Junior Data Analyst",
		"Analytics Intern",
		"Business Intelligence Intern",
		"Data Analyst Trainee",
		"Junior Data Scientist",
		"Data Science Trainee",
		"Junior Data Engineer",
		"BI Engineer Intern",
		"Analytics Associate",
		"Data Analytics Graduate",
		"Insights Analyst",
		"Junior BI Developer",
		"Data Assistant",
		"Research & Analytics Intern",
	],
	sales: [
		"Sales Development Representative (SDR)",
		"Business Development Representative (BDR)",
		"Inside Sales Representative",
		"Account Executive",
		"Business Development Associate",
		"Sales Trainee",
		"Customer Success Associate",
		"Revenue Operations Analyst",
		"Sales Operations Analyst",
		"Graduate Sales Programme",
		"Business Development Intern",
		"Channel Sales Associate",
		"Account Development Representative",
		"Junior Sales Executive",
		"Client Success Manager",
	],
	marketing: [
		"Marketing Intern",
		"Social Media Intern",
		"Digital Marketing Assistant",
		"Marketing Coordinator",
		"Growth Marketing Intern",
		"Content Marketing Intern",
		"Brand Assistant",
		"Marketing Assistant",
		"Junior Marketing Associate",
		"Email Marketing Trainee",
		"SEO/SEM Intern",
		"Trade Marketing Intern",
		"Marketing Graduate Programme",
		"Junior B2B Marketing Coordinator",
		"Marketing Campaign Assistant",
	],
	finance: [
		"Financial Analyst",
		"Finance Intern",
		"Investment Banking Analyst",
		"Risk Analyst",
		"Audit Associate",
		"Finance Trainee",
		"FP&A Analyst",
		"Credit Analyst",
		"Investment Analyst",
		"Junior Accountant",
		"Corporate Finance Analyst",
		"M&A Analyst",
		"Treasury Analyst",
		"Junior Tax Associate",
		"Finance Graduate",
	],
	operations: [
		"Operations Analyst",
		"Supply Chain Analyst",
		"Logistics Analyst",
		"Procurement Analyst",
		"Operations Intern",
		"Inventory Planner",
		"Operations Coordinator",
		"Supply Chain Trainee",
		"Logistics Planning Graduate",
		"Demand Planning Intern",
		"Operations Management Trainee",
		"Fulfilment Specialist",
		"Sourcing Analyst",
		"Process Improvement Analyst",
		"Supply Chain Graduate",
	],
	product: [
		"Associate Product Manager (APM)",
		"Product Analyst",
		"Product Management Intern",
		"Junior Product Manager",
		"Product Operations Associate",
		"Product Designer",
		"UX Intern",
		"Product Research Assistant",
		"Innovation Analyst",
		"Product Development Coordinator",
		"Product Marketing Assistant",
		"Product Owner Graduate",
		"Assistant Product Manager",
		"Product Strategy Intern",
		"Technical Product Specialist",
	],
	tech: [
		"Software Engineer Intern",
		"Cloud Engineer Intern",
		"DevOps Engineer Intern",
		"Data Engineer Intern",
		"Systems Analyst",
		"IT Support Analyst",
		"Application Support Analyst",
		"Technology Analyst",
		"QA/Test Analyst",
		"Platform Engineer Intern",
		"Cybersecurity Analyst",
		"IT Operations Trainee",
		"Technical Consultant",
		"Solutions Engineer Graduate",
		"IT Business Analyst",
	],
	sustainability: [
		"ESG Intern",
		"Sustainability Strategy Intern",
		"Junior ESG Analyst",
		"Sustainability Graduate Programme",
		"ESG Data Analyst Intern",
		"Corporate Responsibility Intern",
		"Environmental Analyst",
		"Sustainability Reporting Trainee",
		"Climate Analyst",
		"Sustainable Finance Analyst",
		"ESG Assurance Intern",
		"Sustainability Communications Intern",
		"Junior Impact Analyst",
		"Sustainability Operations Assistant",
		"Green Finance Analyst",
	],
	unsure: [
		"Graduate Trainee",
		"Rotational Graduate Program",
		"Management Trainee",
		"Business Graduate Analyst",
		"Entry Level Program Associate",
		"Future Leaders Programme",
		"General Analyst",
		"Operations Graduate",
		"Commercial Graduate",
		"Early Careers Program",
		"Project Coordinator",
		"Business Operations Analyst",
		"Emerging Leaders Associate",
		"Corporate Graduate Programme",
		"Generalist Trainee",
	],
};

/**
 * Get all unique roles across all career paths
 */
function getAllRoles() {
	const allRoles = new Set();
	Object.values(CAREER_PATHS_ROLES).forEach((roles) => {
		roles.forEach((role) => allRoles.add(role));
	});
	return Array.from(allRoles);
}

/**
 * Get roles for a specific career path
 */
function getRolesForCareerPath(careerPath) {
	return CAREER_PATHS_ROLES[careerPath] || [];
}

/**
 * Get top roles by career path (most common/searched)
 * Returns top N roles per career path
 */
function getTopRolesByCareerPath(topN = 5) {
	const topRoles = {};
	Object.keys(CAREER_PATHS_ROLES).forEach((path) => {
		topRoles[path] = CAREER_PATHS_ROLES[path].slice(0, topN);
	});
	return topRoles;
}

/**
 * Get roles that contain early-career keywords (intern, graduate, junior, trainee)
 * These are highest priority for scraping
 */
function getEarlyCareerRoles() {
	const earlyCareerKeywords =
		/intern|graduate|junior|trainee|entry|assistant|associate/i;
	const allRoles = getAllRoles();
	return allRoles.filter((role) => earlyCareerKeywords.test(role));
}

/**
 * Get roles grouped by career path for query generation
 */
function getRolesByCareerPath() {
	return CAREER_PATHS_ROLES;
}

/**
 * Clean role name for search (remove parentheses, handle special chars)
 * e.g., "Sales Development Representative (SDR)" -> ["Sales Development Representative", "SDR"]
 */
function cleanRoleForSearch(role) {
	const variations = [role];

	// Remove parentheses: "Sales Development Representative (SDR)" -> "Sales Development Representative", "SDR"
	const parenMatch = role.match(/^(.+?)\s*\(([^)]+)\)$/);
	if (parenMatch) {
		variations.push(parenMatch[1].trim()); // Without parentheses
		variations.push(parenMatch[2].trim()); // Abbreviation only
	}

	// Handle special characters: "FP&A" -> "FP&A", "FPA"
	if (role.includes("&")) {
		variations.push(role.replace(/&/g, ""));
	}

	// Handle slashes: "SEO/SEM" -> "SEO", "SEM", "SEO SEM"
	if (role.includes("/")) {
		const parts = role.split("/");
		variations.push(...parts.map((p) => p.trim()));
		variations.push(parts.map((p) => p.trim()).join(" "));
	}

	return [...new Set(variations)];
}

/**
 * Get role variations (for query expansion)
 * e.g., "Financial Analyst" -> ["Financial Analyst", "Finance Analyst", "Financial Analyst Intern"]
 * NOW INCLUDES CLEANED VARIATIONS
 */
function getRoleVariations(role) {
	const variations = [];

	// Start with cleaned variations (handles parentheses, special chars)
	const cleaned = cleanRoleForSearch(role);
	variations.push(...cleaned);

	// Add internship variant
	cleaned.forEach((cleanRole) => {
		if (!/intern/i.test(cleanRole)) {
			variations.push(`${cleanRole} Intern`);
		}
	});

	// Add junior variant if not already junior
	cleaned.forEach((cleanRole) => {
		if (!/junior/i.test(cleanRole.toLowerCase())) {
			variations.push(`Junior ${cleanRole}`);
		}
	});

	// Add graduate variant
	cleaned.forEach((cleanRole) => {
		if (!/graduate/i.test(cleanRole.toLowerCase())) {
			variations.push(`${cleanRole} Graduate`);
		}
	});

	// Remove duplicates and return
	return [...new Set(variations)];
}

module.exports = {
	CAREER_PATHS_ROLES,
	getAllRoles,
	getRolesForCareerPath,
	getTopRolesByCareerPath,
	getEarlyCareerRoles,
	getRolesByCareerPath,
	getRoleVariations,
	cleanRoleForSearch,
};
