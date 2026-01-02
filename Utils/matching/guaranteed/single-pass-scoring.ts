/**
 * Single-Pass Penalty Scoring System
 *
 * CRITICAL: No recursive loops - all penalties calculated in ONE pass
 * Formula: TotalScore = (BaseMatch × Weight) - Σ(RelaxationPenalties)
 */

import type { Job } from "@/scrapers/types";
import { CITY_COUNTRY_MAP } from "../prefilter/location";
import type { UserPreferences } from "../types";
import { calculateVisaConfidence } from "../visa-confidence";

export interface RelaxationPenalties {
	locationMismatch: number; // -10% if city wrong but country right
	roleProximity: number; // -15% if related role (Frontend vs React)
	careerPathAdjacent: number; // -20% if adjacent career path
	visaHighPotential: number; // -5% if high-potential sponsor (not explicit)
	workEnvMismatch: number; // -8% if remote/hybrid mismatch
	historical: number; // -30% if job > 7 days old
	countryWide: number; // -12% if country-level match
}

export interface GuaranteedMatchScore {
	finalScore: number;
	penalties: RelaxationPenalties;
	relaxationLevel: number; // 0 = exact, 7 = custom scan
	relaxationReason: string;
	baseScore: number;
}

/**
 * Check location match level
 */
function checkLocationMatch(
	job: Job,
	targetCities: string[],
): {
	level: "exact" | "country" | "country_wide" | "remote" | "none";
	country?: string;
} {
	if (targetCities.length === 0) {
		return { level: "none" };
	}

	const jobLocation = (job.location || "").toLowerCase();
	const jobCity = (job as any).city?.toLowerCase() || "";
	const jobCountry = (job as any).country?.toLowerCase() || "";

	// Check for remote/hybrid
	if (
		jobLocation.includes("remote") ||
		jobLocation.includes("work from home") ||
		jobLocation.includes("hybrid")
	) {
		return { level: "remote" };
	}

	// Check exact city match
	for (const city of targetCities) {
		const cityLower = city.toLowerCase();
		if (
			jobLocation.includes(cityLower) ||
			jobCity.includes(cityLower) ||
			cityLower === jobCity
		) {
			return { level: "exact" };
		}
	}

	// Check country match
	const targetCountries = new Set<string>();
	for (const city of targetCities) {
		const cityLower = city.toLowerCase();
		const countries = CITY_COUNTRY_MAP[cityLower] || [];
		countries.forEach((c) => targetCountries.add(c.toLowerCase()));
	}

	if (jobCountry && targetCountries.has(jobCountry)) {
		return { level: "country", country: jobCountry };
	}

	// Check if any target city's country matches
	for (const city of targetCities) {
		const cityLower = city.toLowerCase();
		const countries = CITY_COUNTRY_MAP[cityLower] || [];
		for (const country of countries) {
			if (jobLocation.includes(country.toLowerCase())) {
				return { level: "country_wide", country: country };
			}
		}
	}

	return { level: "none" };
}

/**
 * Check role match (exact vs related)
 */
function checkRoleMatch(
	job: Job,
	userRoles: string[],
): {
	isExact: boolean;
	isRelated: boolean;
	relatedReason?: string;
} {
	if (!userRoles || userRoles.length === 0) {
		return { isExact: false, isRelated: false };
	}

	const jobTitle = (job.title || "").toLowerCase();
	const jobDesc = (job.description || "").toLowerCase();
	const jobText = `${jobTitle} ${jobDesc}`;

	// Check exact match
	for (const role of userRoles) {
		const roleLower = role.toLowerCase();
		if (jobTitle.includes(roleLower) || jobDesc.includes(roleLower)) {
			return { isExact: true, isRelated: false };
		}
	}

	// Check related roles (simplified - can be enhanced with semantic matching)
	const relatedRoleMap: Record<string, string[]> = {
		frontend: ["react", "vue", "angular", "javascript", "typescript", "ui"],
		backend: ["api", "server", "database", "node", "python", "java"],
		"full stack": ["fullstack", "full-stack", "react", "node", "api"],
		data: ["analyst", "scientist", "engineer", "sql", "python"],
		product: ["manager", "owner", "designer", "ux"],
		"software engineer": ["developer", "programmer", "coder", "engineer"],
	};

	for (const role of userRoles) {
		const roleLower = role.toLowerCase();
		const relatedTerms = relatedRoleMap[roleLower] || [];
		for (const term of relatedTerms) {
			if (jobText.includes(term)) {
				return {
					isExact: false,
					isRelated: true,
					relatedReason: `Related role: ${term} (user wanted ${role})`,
				};
			}
		}
	}

	return { isExact: false, isRelated: false };
}

/**
 * Check career path match
 */
function checkCareerPathMatch(
	job: Job,
	userCareerPaths: string[],
): {
	isExact: boolean;
	isAdjacent: boolean;
	adjacentReason?: string;
} {
	if (!userCareerPaths || userCareerPaths.length === 0) {
		return { isExact: false, isAdjacent: false };
	}

	const jobTitle = (job.title || "").toLowerCase();
	const jobDesc = (job.description || "").toLowerCase();
	const jobText = `${jobTitle} ${jobDesc}`;
	const categories = (job.categories || []).map((c) => c.toLowerCase());

	// Check exact match
	for (const path of userCareerPaths) {
		const pathLower = path.toLowerCase();
		if (
			jobTitle.includes(pathLower) ||
			jobDesc.includes(pathLower) ||
			categories.some((c) => c.includes(pathLower))
		) {
			return { isExact: true, isAdjacent: false };
		}
	}

	// Check adjacent career paths (simplified)
	const adjacentMap: Record<string, string[]> = {
		tech: ["software", "engineering", "developer", "programming"],
		finance: ["banking", "investment", "accounting", "consulting"],
		consulting: ["strategy", "management", "advisory", "finance"],
		marketing: ["growth", "product", "brand", "content"],
		product: ["design", "ux", "ui", "marketing"],
	};

	for (const path of userCareerPaths) {
		const pathLower = path.toLowerCase();
		const adjacentTerms = adjacentMap[pathLower] || [];
		for (const term of adjacentTerms) {
			if (jobText.includes(term)) {
				return {
					isExact: false,
					isAdjacent: true,
					adjacentReason: `Adjacent career: ${term} (user wanted ${path})`,
				};
			}
		}
	}

	return { isExact: false, isAdjacent: false };
}

/**
 * Check work environment match
 */
function checkWorkEnvironmentMatch(
	job: Job,
	userWorkEnv?: string,
): {
	isMatch: boolean;
	isMismatch: boolean;
} {
	if (!userWorkEnv || userWorkEnv === "unclear") {
		return { isMatch: true, isMismatch: false };
	}

	const jobLocation = (job.location || "").toLowerCase();
	const isRemote =
		jobLocation.includes("remote") || jobLocation.includes("work from home");
	const isHybrid = jobLocation.includes("hybrid");
	const isOnSite = !isRemote && !isHybrid;

	if (userWorkEnv === "remote" && isRemote) {
		return { isMatch: true, isMismatch: false };
	}
	if (userWorkEnv === "hybrid" && (isHybrid || isRemote)) {
		return { isMatch: true, isMismatch: false };
	}
	if (userWorkEnv === "on-site" && isOnSite) {
		return { isMatch: true, isMismatch: false };
	}

	// Mismatch (e.g., user wants remote but job is on-site)
	return { isMatch: false, isMismatch: true };
}

/**
 * Calculate job age in days
 */
function calculateJobAge(job: Job): number {
	const postedAt = (job as any).posted_at || job.created_at;
	if (!postedAt) {
		return 0; // Assume fresh if no date
	}

	const postedDate = new Date(postedAt);
	const now = new Date();
	const diffMs = now.getTime() - postedDate.getTime();
	return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Check if company is known sponsor
 */
function isKnownSponsor(company?: string | null): boolean {
	if (!company) return false;

	const companyLower = company.toLowerCase();
	const knownSponsors = [
		"google",
		"microsoft",
		"amazon",
		"meta",
		"apple",
		"netflix",
		"spotify",
		"stripe",
		"salesforce",
		"oracle",
		"ibm",
		"accenture",
		"deloitte",
		"pwc",
		"ey",
		"kpmg",
		"mckinsey",
		"boston consulting",
		"bain",
		"goldman sachs",
		"morgan stanley",
		"jpmorgan",
		"barclays",
		"hsbc",
		"deutsche bank",
		"uber",
		"airbnb",
		"tesla",
		"shopify",
		"notion",
		"vercel",
	];

	return knownSponsors.some((sponsor) => companyLower.includes(sponsor));
}

/**
 * SINGLE-PASS: Calculate all relaxation penalties in one scoring function
 */
export function calculateGuaranteedMatchScore(
	job: Job,
	userPrefs: UserPreferences,
	baseScore: number, // From existing calculateMatchScore
): GuaranteedMatchScore {
	const penalties: RelaxationPenalties = {
		locationMismatch: 0,
		roleProximity: 0,
		careerPathAdjacent: 0,
		visaHighPotential: 0,
		workEnvMismatch: 0,
		historical: 0,
		countryWide: 0,
	};

	let relaxationLevel = 0;
	const relaxationReasons: string[] = [];

	// Penalty 1: Location Mismatch (-10%)
	const targetCities = userPrefs.target_cities || [];
	const locationMatch = checkLocationMatch(job, targetCities);
	if (locationMatch.level === "country") {
		penalties.locationMismatch = 10;
		relaxationLevel = Math.max(relaxationLevel, 1);
		relaxationReasons.push("Same country, different city");
	} else if (locationMatch.level === "country_wide") {
		penalties.countryWide = 12;
		relaxationLevel = Math.max(relaxationLevel, 6);
		relaxationReasons.push("Country-wide search");
	}

	// Penalty 2: Role Proximity (-15%)
	const userRoles = userPrefs.roles_selected || [];
	const roleMatch = checkRoleMatch(job, userRoles);
	if (roleMatch.isRelated && !roleMatch.isExact) {
		penalties.roleProximity = 15;
		relaxationLevel = Math.max(relaxationLevel, 3);
		relaxationReasons.push(roleMatch.relatedReason || "Related role");
	}

	// Penalty 3: Career Path Adjacent (-20%)
	const userCareerPaths = userPrefs.career_path || [];
	const careerMatch = checkCareerPathMatch(job, userCareerPaths);
	if (careerMatch.isAdjacent && !careerMatch.isExact) {
		penalties.careerPathAdjacent = 20;
		relaxationLevel = Math.max(relaxationLevel, 4);
		relaxationReasons.push(
			careerMatch.adjacentReason || "Adjacent career path",
		);
	}

	// Penalty 4: Work Environment Mismatch (-8%)
	const workEnvMatch = checkWorkEnvironmentMatch(
		job,
		userPrefs.work_environment,
	);
	if (workEnvMatch.isMismatch) {
		penalties.workEnvMismatch = 8;
		relaxationLevel = Math.max(relaxationLevel, 2);
		relaxationReasons.push("Work environment relaxed (remote/hybrid)");
	}

	// Penalty 5: Visa High-Potential (-5%)
	if (userPrefs.visa_status?.includes("sponsor")) {
		const visaConfidence = calculateVisaConfidence(job);
		if (
			visaConfidence.confidence === "unknown" &&
			isKnownSponsor(job.company)
		) {
			penalties.visaHighPotential = 5;
			relaxationLevel = Math.max(relaxationLevel, 5);
			relaxationReasons.push("High-potential sponsor (company history)");
		}
	}

	// Penalty 6: Historical Job (-30%)
	const jobAge = calculateJobAge(job);
	if (jobAge > 7) {
		penalties.historical = 30;
		relaxationLevel = Math.max(relaxationLevel, 7);
		relaxationReasons.push("Historical job (>7 days old)");
	}

	// Calculate final score
	const totalPenalty = Object.values(penalties).reduce((sum, p) => sum + p, 0);
	const finalScore = Math.max(50, baseScore - totalPenalty); // Floor at 50%

	return {
		finalScore,
		penalties,
		relaxationLevel,
		relaxationReason: relaxationReasons.join("; ") || "Exact match",
		baseScore,
	};
}

/**
 * Generate match reason with relaxation context
 */
export function generateMatchReason(
	scoreBreakdown: any,
	relaxationReason: string,
): string {
	const reasons: string[] = [];

	if (scoreBreakdown.careerPath > 80) {
		reasons.push("Strong career path match");
	}
	if (scoreBreakdown.location > 80) {
		reasons.push("Perfect location match");
	}
	if (scoreBreakdown.roleFit > 80) {
		reasons.push("Ideal role fit");
	}

	if (relaxationReason !== "Exact match") {
		reasons.push(`Relaxed: ${relaxationReason}`);
	}

	return reasons.join(" • ") || "Good overall match";
}

/**
 * Count relaxation levels in matches
 */
export function countRelaxationLevels(
	matches: Array<{ relaxationLevel: number }>,
): Record<number, number> {
	const counts: Record<number, number> = {};
	matches.forEach((m) => {
		counts[m.relaxationLevel] = (counts[m.relaxationLevel] || 0) + 1;
	});
	return counts;
}
