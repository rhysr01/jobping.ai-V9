// types.ts - Corrected to match your actual Supabase schema

// Job structure matching your Supabase schema exactly
export interface Job {
	id?: number; // int4 Identity column (auto-generated PK)
	job_hash: string; // text Non-nullable, UNIQUE (jobs_job_hash_unique)
	title: string; // text Non-nullable
	company: string; // text Non-nullable
	location: string; // text Non-nullable
	city?: string; // varchar Nullable (extracted from location)
	country?: string; // varchar Nullable (2-letter country code)
	job_url: string; // text Non-nullable
	description: string; // text Non-nullable
	experience_required: string; // text Non-nullable
	work_environment: string; // text Non-nullable
	source: string; // text Non-nullable
	categories: string[]; // text[] Nullable (PostgreSQL array)
	company_profile_url: string; // text Nullable (matches DB schema)
	language_requirements: string[]; // text[] Nullable (matches DB schema)
	scrape_timestamp: string; // timestamptz Non-nullable (renamed from scraped_at)
	original_posted_date: string; // timestamp Non-nullable
	posted_at: string; // timestamp Non-nullable
	last_seen_at: string; // timestamp Non-nullable (added for lifecycle tracking)
	is_active: boolean; // boolean Non-nullable, default true (added for lifecycle)
	scraper_run_id?: string; // uuid Nullable
	created_at: string; // timestamptz Non-nullable, default now()
	is_internship?: boolean; // boolean Nullable (for internship detection)
	is_graduate?: boolean; // boolean Nullable (for graduate scheme detection)
}

// Type guards for validation
export function isValidJob(obj: any): obj is Job {
	return (
		typeof obj.title === "string" &&
		typeof obj.company === "string" &&
		typeof obj.location === "string" &&
		typeof obj.job_url === "string" &&
		typeof obj.description === "string" &&
		typeof obj.job_hash === "string" &&
		typeof obj.source === "string"
	);
}

// Career Path Taxonomy Version 1.0
export const CAREER_TAXONOMY_VERSION = 1;

// Canonical career paths - Single source of truth
export const CANONICAL_CAREER_PATHS = [
	"strategy", // Strategy & Business Design
	"data-analytics", // Data Analytics
	"retail-luxury", // Retail & Luxury
	"sales", // Sales & Client Success
	"marketing", // Marketing
	"finance", // Finance
	"operations", // Operations & Supply Chain
	"product", // Product & Innovation
	"tech", // Tech & Transformation
	"sustainability", // Sustainability & ESG
	"entrepreneurship", // Entrepreneurship
	"unsure", // I'm not sure yet
	"unknown", // Could not infer the job's path
] as const;

// Tie-break priority order (higher index = higher priority)
export const CAREER_PATH_PRIORITY = {
	product: 9,
	"data-analytics": 8,
	marketing: 7,
	operations: 6,
	finance: 5,
	strategy: 4,
	sales: 3,
	tech: 2,
	sustainability: 1,
	"retail-luxury": 0,
	entrepreneurship: 0,
	unsure: -1,
	unknown: -2,
} as const;

// Synonym slug mapping dictionary
export const CAREER_PATH_SYNONYMS: Record<string, string> = {
	// Strategy synonyms
	"business development": "strategy",
	"biz dev": "sales",
	"management consulting": "strategy",
	advisory: "strategy",
	"business strategy": "strategy",
	strategic: "strategy",

	// Data Analytics synonyms
	"data analyst": "data-analytics",
	"business analyst": "data-analytics",
	ba: "data-analytics",
	analytics: "data-analytics",
	"business intelligence": "data-analytics",
	bi: "data-analytics",
	"data science": "data-analytics",
	"machine learning": "data-analytics",
	ml: "data-analytics",
	ai: "data-analytics",
	"artificial intelligence": "data-analytics",

	// Retail & Luxury synonyms
	retail: "retail-luxury",
	luxury: "retail-luxury",
	fashion: "retail-luxury",
	merchandising: "retail-luxury",
	buying: "retail-luxury",

	// Sales synonyms
	"sales representative": "sales",
	"account executive": "sales",
	"client success": "sales",
	"customer success": "sales",
	"account manager": "sales",
	"sales development": "sales",
	revenue: "sales",

	// Marketing synonyms
	brand: "marketing",
	"digital marketing": "marketing",
	"social media": "marketing",
	content: "marketing",
	advertising: "marketing",
	"brand manager": "marketing",
	growth: "marketing",

	// Finance synonyms
	financial: "finance",
	investment: "finance",
	banking: "finance",
	accounting: "finance",
	audit: "finance",
	treasury: "finance",
	"corporate finance": "finance",

	// Operations synonyms
	"supply chain": "operations",
	logistics: "operations",
	procurement: "operations",
	manufacturing: "operations",
	production: "operations",
	"quality assurance": "operations",
	inventory: "operations",

	// Product synonyms
	"product manager": "product",
	"product owner": "product",
	"product development": "product",
	"user experience": "product",
	ux: "product",
	"user interface": "product",
	ui: "product",
	"product design": "product",

	// Tech synonyms
	software: "tech",
	developer: "tech",
	engineer: "tech",
	programming: "tech",
	coding: "tech",
	technology: "tech",
	technical: "tech",
	engineering: "tech",
	devops: "tech",
	cybersecurity: "tech",
	infrastructure: "tech",

	// Sustainability synonyms
	esg: "sustainability",
	environmental: "sustainability",
	"social responsibility": "sustainability",
	"corporate responsibility": "sustainability",
	green: "sustainability",
	climate: "sustainability",
	renewable: "sustainability",

	// Entrepreneurship synonyms
	startup: "entrepreneurship",
	entrepreneur: "entrepreneurship",
	founder: "entrepreneurship",
	"co-founder": "entrepreneurship",
	innovation: "entrepreneurship",
	venture: "entrepreneurship",
};

// Legacy constants (deprecated - use CANONICAL_CAREER_PATHS instead)
export const WORK_ENVIRONMENTS = [
	"remote",
	"hybrid",
	"office",
	"no-preference",
] as const;

export const VISA_STATUS_OPTIONS = [
	"eu-citizen",
	"non-eu-visa-required",
	"non-eu-no-visa",
] as const;

export const CAREER_PATHS = [
	"strategy-business-design",
	"data-analytics",
	"retail-luxury",
	"sales-client-success",
	"marketing-growth",
	"finance-investment",
	"operations-supply-chain",
	"product-innovation",
	"tech-transformation",
	"sustainability-esg",
] as const;

export const TARGET_CITIES = [
	// UK Cities
	"London",
	"Manchester",
	"Belfast",
	"Birmingham",
	// Ireland
	"Dublin",
	// Continental Europe
	"Paris",
	"Milan",
	"Berlin",
	"Madrid",
	"Barcelona",
	"Amsterdam",
	"Munich",
	"Hamburg",
	"Zurich",
	"Rome",
	"Brussels",
	// Nordic
	"Stockholm",
	"Copenhagen",
	// Central/Eastern Europe
	"Vienna",
	"Prague",
	"Warsaw",
] as const;

export type WorkEnvironment = (typeof WORK_ENVIRONMENTS)[number];
export type VisaStatus = (typeof VISA_STATUS_OPTIONS)[number];
export type CareerPath = (typeof CAREER_PATHS)[number];
export type CanonicalCareerPath = (typeof CANONICAL_CAREER_PATHS)[number];
export type TargetCity = (typeof TARGET_CITIES)[number];

// Enhanced career path normalization with synonym mapping and tie-breaking
export function normalizeCareerPath(
	input: string | string[] | null | undefined,
): string[] {
	if (!input) return ["unsure"];

	// Handle array input - collect all valid matches
	const paths = Array.isArray(input) ? input : [input];
	const validMatches: string[] = [];

	for (const path of paths) {
		if (!path) continue;

		// Try exact match first
		if (CANONICAL_CAREER_PATHS.includes(path as CanonicalCareerPath)) {
			validMatches.push(path);
			continue;
		}

		// Try case-insensitive match
		const normalizedPath = path.toLowerCase().trim();
		const match = CANONICAL_CAREER_PATHS.find((cp) => cp === normalizedPath);
		if (match) {
			validMatches.push(match);
			continue;
		}

		// Try synonym mapping
		const synonymMatch = CAREER_PATH_SYNONYMS[normalizedPath];
		if (
			synonymMatch &&
			CANONICAL_CAREER_PATHS.includes(synonymMatch as CanonicalCareerPath)
		) {
			validMatches.push(synonymMatch);
		}
	}

	// If no valid matches found, return unsure
	if (validMatches.length === 0) {
		return ["unsure"];
	}

	// If multiple matches, use tie-break priority
	if (validMatches.length > 1) {
		// Sort by priority (higher number = higher priority)
		validMatches.sort((a, b) => {
			const priorityA =
				CAREER_PATH_PRIORITY[a as keyof typeof CAREER_PATH_PRIORITY] || -999;
			const priorityB =
				CAREER_PATH_PRIORITY[b as keyof typeof CAREER_PATH_PRIORITY] || -999;
			return priorityB - priorityA; // Descending order
		});

		// Log warning for multiple matches
		console.warn(
			` Multiple career paths detected: ${validMatches.join(", ")}. Using highest priority: ${validMatches[0]}`,
		);
	}

	// Return single highest priority match
	return [validMatches[0]];
}

// Test function for career path normalization (for development/debugging)
export function testCareerPathNormalization() {
	const testCases = [
		{ input: "strategy", expected: ["strategy"] },
		{ input: "Strategy", expected: ["strategy"] },
		{ input: "STRATEGY", expected: ["strategy"] },
		{ input: "data-analytics", expected: ["data-analytics"] },
		{ input: "Data Analytics", expected: ["data-analytics"] },
		{ input: "tech", expected: ["tech"] },
		{ input: "Technology", expected: ["tech"] },
		{ input: "unknown", expected: ["unknown"] },
		{ input: "invalid-path", expected: ["unsure"] },
		{ input: null, expected: ["unsure"] },
		{ input: undefined, expected: ["unsure"] },
		{ input: "", expected: ["unsure"] },
		{ input: ["strategy", "tech"], expected: ["strategy"] }, // First valid wins
		{ input: ["invalid", "tech"], expected: ["tech"] }, // Second valid wins
		{ input: ["invalid1", "invalid2"], expected: ["unsure"] }, // No valid found
	];

	console.log(" Testing career path normalization:");
	testCases.forEach(({ input, expected }) => {
		const result = normalizeCareerPath(input);
		const passed = JSON.stringify(result) === JSON.stringify(expected);
		console.log(
			`${passed ? "" : ""} "${input}" ${JSON.stringify(result)} (expected: ${JSON.stringify(expected)})`,
		);
	});
}

// Job categories tag management
export function createJobCategories(
	careerPath: string,
	additionalTags: string[] = [],
): string {
	const tags = [`career:${careerPath}`, ...additionalTags];

	// Deduplicate, sort, and clean tags
	const uniqueTags = [...new Set(tags)]
		.map((tag) => tag.toLowerCase().trim())
		.filter((tag) => tag.length > 0)
		.sort();

	// Join with pipe delimiter and truncate to safe length
	const result = uniqueTags.join("|");
	return result.length > 512 ? result.substring(0, 512) : result;
}

export function extractCareerPathFromCategories(categories: any): string {
	if (!categories) return "unknown";

	// Normalize categories to string before parsing
	const normalizedCategories =
		typeof categories === "string"
			? categories
			: Array.isArray(categories)
				? categories.filter(Boolean).join("|")
				: "career:unknown|loc:unknown";

	const tags = normalizedCategories.split("|");
	const careerTag = tags.find((tag: string) => tag.startsWith("career:"));

	if (careerTag) {
		const careerPath = careerTag.replace("career:", "");
		return CANONICAL_CAREER_PATHS.includes(careerPath as CanonicalCareerPath)
			? careerPath
			: "unknown";
	}

	return "unknown";
}

export function addTagToCategories(categories: string, newTag: string): string {
	const tags = categories ? categories.split("|") : [];
	tags.push(newTag);
	return createJobCategories("unknown", tags); // We'll extract the career path from existing tags
}

// Career path telemetry tracking
export interface CareerPathTelemetry {
	totalJobs: number;
	jobsWithCareerPath: number;
	unknownJobs: number;
	careerPathDistribution: Record<string, number>;
	unknownPercentage: number;
	taxonomyVersion: number;
}

export function calculateCareerPathTelemetry(jobs: Job[]): CareerPathTelemetry {
	const telemetry: CareerPathTelemetry = {
		totalJobs: jobs.length,
		jobsWithCareerPath: 0,
		unknownJobs: 0,
		careerPathDistribution: {},
		unknownPercentage: 0,
		taxonomyVersion: CAREER_TAXONOMY_VERSION,
	};

	jobs.forEach((job) => {
		const careerPath = extractCareerPathFromCategories(job.categories || "");

		if (careerPath === "unknown") {
			telemetry.unknownJobs++;
		} else {
			telemetry.jobsWithCareerPath++;
			telemetry.careerPathDistribution[careerPath] =
				(telemetry.careerPathDistribution[careerPath] || 0) + 1;
		}
	});

	telemetry.unknownPercentage =
		telemetry.totalJobs > 0
			? (telemetry.unknownJobs / telemetry.totalJobs) * 100
			: 0;

	return telemetry;
}

// Core types for ATS-API scraping system

export type IngestJob = {
	title: string;
	company: string;
	description: string;
	job_url: string;
	posted_at: string;
	source: string;
	location?: string;
	languages_required?: string[];
	work_environment?: string; // Remote/Hybrid/Onsite
	meta?: {
		early?: boolean;
		eligibility?: "certain" | "uncertain";
		role?: string;
		remote_scope?: "emea" | "world" | null;
		country?: string | null;
		signals?: string[];
	};
	job_hash?: string;
};
