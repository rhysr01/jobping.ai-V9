/**
 * Matching Engine Type Definitions
 * Types related to job matching, scoring, and match processing
 */

// ================================
// Matching Engine Types
// ================================

export interface MatchMetrics {
	totalJobs: number;
	distributedJobs: number;
	tierDistribution: Record<string, number>;
	cityDistribution?: Record<string, number>;
	processingTime: number;
	originalJobCount?: number;
	validJobCount?: number;
	selectedJobCount?: number; // Add missing property
	aiMatches?: number;
	ruleBasedMatches?: number;
	cacheHits?: number;
	cacheMisses?: number;
}

export interface MatchProvenance {
	match_algorithm: string;
	ai_latency_ms?: number;
	fallback_reason?: string;
	confidence_score?: number;
	cache_hit?: boolean;
	ai_cost_usd?: number; // Add missing property
}

export interface ParsedMatch {
	job_index: number;
	job_hash: string;
	match_score: number;
	match_reason: string;
	confidence: number;
	isEarlyCareer: boolean;
	locationMatch: boolean;
	skillsMatch: boolean;
	companyMatch: boolean;
}

// ================================
// Type Guards
// ================================

export function isMatchMetrics(obj: unknown): obj is MatchMetrics {
	return (
		typeof obj === "object" &&
		obj !== null &&
		"totalJobs" in obj &&
		"distributedJobs" in obj &&
		"processingTime" in obj
	);
}