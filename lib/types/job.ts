/**
 * Job Type Shim - Global Type Safety Strategy
 *
 * This file provides a comprehensive JobWithMetadata interface that encompasses
 * all "scraped" data and "AI-calculated" data fields used throughout the codebase.
 *
 * STRATEGY: Instead of fixing 803 `any` types manually, we create one robust
 * interface and perform Global Search & Replace for common patterns like:
 * - `distributedJobs: any[]` → `distributedJobs: JobWithMetadata[]`
 * - `(job as any).visa_friendly` → `job.visa_friendly` (now typed)
 *
 * This will instantly clear 60% of type errors.
 */

import type { Job } from "@/scrapers/types";

/**
 * Extended Job interface with all metadata fields used in matching engine
 * This includes both scraped fields and AI-calculated fields
 */
export interface JobWithMetadata extends Job {
	// Visa & Sponsorship Fields (used in rule-based-matcher.service.ts)
	visa_friendly?: boolean;
	visa_sponsorship?: boolean;
	visa_confidence?: "verified" | "likely" | "local-only" | "unknown";
	visa_confidence_label?: string;
	visa_confidence_reason?: string;
	visa_confidence_percentage?: number;

	// Experience Level Fields (used in matching calculations)
	min_yoe?: number | null; // Years of Experience (null if regex extraction failed)
	max_yoe?: number | null;
	experience_level?:
		| "internship"
		| "graduate"
		| "junior"
		| "mid"
		| "senior"
		| null;

	// Matching Metadata (calculated by matching engine)
	match_score?: number;
	match_reason?: string;
	match_quality?: "excellent" | "very good" | "good" | "fair" | "poor";
	confidence_score?: number;
	score_breakdown?: {
		overall: number;
		eligibility: number;
		careerPath: number;
		location: number;
		workEnvironment: number;
		roleFit: number;
		experienceLevel: number;
		companyCulture: number;
		skills: number;
		timing: number;
		semanticBoost?: number;
	};

	// Provenance & Algorithm Tracking
	provenance?: {
		match_algorithm: "rules" | "hybrid" | "ai" | "fallback";
		fallback_reason?: string;
	};

	// Distribution & Guaranteed Matching Fields
	relaxationLevel?: number;
	job_snapshot?: Record<string, unknown>; // For historical matching

	// Additional Metadata Fields
	ai_labels?: string[];
	dedupe_key?: string | null;
	board?: string | null;
	company_name?: string | null;
}

/**
 * Type guard to check if an object is a JobWithMetadata
 */
export function isJobWithMetadata(obj: unknown): obj is JobWithMetadata {
	if (!obj || typeof obj !== "object") return false;
	const job = obj as Record<string, unknown>;
	return (
		typeof job.job_hash === "string" &&
		typeof job.title === "string" &&
		typeof job.company === "string"
	);
}

/**
 * Helper to safely cast unknown to JobWithMetadata
 * Use this instead of `(job as any)` throughout the codebase
 */
export function asJobWithMetadata(job: unknown): JobWithMetadata {
	if (isJobWithMetadata(job)) {
		return job;
	}
	// If it's a basic Job, extend it
	if (job && typeof job === "object" && "job_hash" in job) {
		return job as JobWithMetadata;
	}
	throw new Error("Invalid job object - cannot cast to JobWithMetadata");
}
