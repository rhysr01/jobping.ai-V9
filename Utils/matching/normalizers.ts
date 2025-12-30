/**
 * Data Normalization Utilities
 * Extracted from jobMatching.ts for better organization
 */

import type { Job, NormalizedUser, UserPreferences, UserRow } from "./types";

// ================================
// STRING NORMALIZATION
// ================================

export const toStringArray = (
	v: unknown,
	fallback: string[] = [],
): string[] => {
	if (Array.isArray(v)) {
		return v.filter(
			(x): x is string => typeof x === "string" && x.trim() !== "",
		);
	}
	if (typeof v === "string" && v.trim() !== "") {
		return v
			.split("|")
			.map((s) => s.trim())
			.filter(Boolean);
	}
	return fallback;
};

export const toOptString = (v: unknown): string | null =>
	typeof v === "string" && v.trim() !== "" ? v : null;

export const toWorkEnv = (
	v: unknown,
): "remote" | "hybrid" | "on-site" | null => {
	const s = typeof v === "string" ? v.toLowerCase() : "";
	if (s === "onsite" || s === "office") return "on-site";
	if (s === "hybrid") return "hybrid";
	if (s === "remote") return "remote";
	return null;
};

export const reqString = (
	s: string | null | undefined,
	fallback = "",
): string => (typeof s === "string" ? s : fallback);

export const reqFirst = (
	arr: string[] | null | undefined,
	fallback = "unknown",
): string => {
	const a = toStringArray(arr);
	return a[0] ?? fallback;
};

// ================================
// CATEGORY NORMALIZATION
// ================================

export const normalizeCategoriesForRead = (v: unknown): string[] =>
	toStringArray(v);

export const mapCategories = <T>(
	categories: unknown,
	fn: (c: string) => T,
): T[] => normalizeCategoriesForRead(categories).map(fn);

export const anyIndex = (obj: unknown): Record<string, any> =>
	obj as Record<string, any>;

// ================================
// JOB VALIDATION
// ================================

export function isJob(v: unknown): v is Job {
	if (!v || typeof v !== "object") return false;
	const j = v as Record<string, unknown>;

	return (
		typeof j.job_hash === "string" &&
		typeof j.title === "string" &&
		typeof j.company === "string" &&
		typeof j.job_url === "string"
	);
}

// ================================
// HELPER FUNCTIONS
// ================================

export const cats = (v: unknown): string[] => normalizeCategoriesForRead(v);

export const mapCats = <T>(v: unknown, fn: (c: string) => T): T[] =>
	normalizeCategoriesForRead(v).map(fn);

export const mapCities = <T>(v: unknown, fn: (city: string) => T): T[] =>
	toStringArray(v).map(fn);

export const idx = (o: unknown) => o as Record<string, any>;

// ================================
// USER NORMALIZATION
// ================================

export const normalizeUser = (
	u: Partial<UserRow> & { email: string },
): NormalizedUser => ({
	email: u.email,
	career_path: cats(u.career_path),
	target_cities: cats(u.target_cities),
	languages_spoken: cats(u.languages_spoken),
	company_types: cats(u.company_types),
	roles_selected: cats(u.roles_selected),
	professional_expertise: toOptString(u.professional_expertise),
	entry_level_preference: toOptString(u.entry_level_preference),
	work_environment: toWorkEnv(u.work_environment),
	start_date: toOptString(u.start_date),
	careerFocus: reqFirst(u.career_path as unknown as string[] | null, "unknown"),
});

export const normalizeUserPreferences = (
	userPrefs: UserPreferences,
): NormalizedUser => {
	return {
		email: userPrefs.email,
		career_path: toStringArray(userPrefs.career_path),
		target_cities: toStringArray(userPrefs.target_cities),
		languages_spoken: toStringArray(userPrefs.languages_spoken),
		company_types: toStringArray(userPrefs.company_types),
		roles_selected: toStringArray(userPrefs.roles_selected),
		professional_expertise: toOptString(userPrefs.professional_expertise),
		entry_level_preference: toOptString(userPrefs.entry_level_preference),
		work_environment: toWorkEnv(userPrefs.work_environment),
		start_date: toOptString(userPrefs.start_date),
		careerFocus: reqFirst(userPrefs.career_path, "unknown"),
	};
};

// ================================
// JOB NORMALIZATION
// ================================

export function normalizeJobForMatching(job: Job): Job {
	const normalizedJob = { ...job };

	// Ensure categories is always an array
	if (!Array.isArray(normalizedJob.categories)) {
		normalizedJob.categories = [];
	}

	// Normalize strings
	normalizedJob.title = reqString(normalizedJob.title);
	normalizedJob.company = reqString(normalizedJob.company);
	normalizedJob.location = reqString(normalizedJob.location);
	normalizedJob.description = reqString(normalizedJob.description);

	return normalizedJob;
}

// ================================
// ELIGIBILITY CHECKS
// ================================

export const hasEligibility = (v: unknown) => {
	const a = cats(v);
	return a.includes("early-career") || a.includes("eligibility:uncertain");
};

export const careerSlugs = (v: unknown) =>
	cats(v).filter((c: string) => c.startsWith("career:"));
export const locTag = (v: unknown) =>
	cats(v).find((c: string) => c.startsWith("loc:")) ?? "loc:unknown";

// ================================
// UTILITY FUNCTIONS
// ================================

export const normalizeToString = (value: unknown): string => {
	if (typeof value === "string") return value;
	if (Array.isArray(value)) return value.join(", ");
	if (value && typeof value === "object") return JSON.stringify(value);
	return String(value || "");
};

export const isTestOrPerfMode = () =>
	process.env.NODE_ENV === "test" || process.env.JOBPING_TEST_MODE === "1";

export function timeout<T>(ms: number, label = "timeout"): Promise<T> {
	return new Promise((_r, rej) => setTimeout(() => rej(new Error(label)), ms));
}
