/**
 * Types Domain - TypeScript interfaces and types
 */

import type { Database } from "@/lib/database.types";
import type { MatchMetrics, MatchProvenance } from "@/lib/types";

export type User = Database["public"]["Tables"]["users"]["Row"];

export interface PerformanceMetrics {
	jobFetchTime: number;
	tierDistributionTime: number;
	aiMatchingTime: number;
	totalProcessingTime: number;
	memoryUsage: number;
	errors: number;
	totalRequests: number;
}

export interface SchemaValidationCache {
	timestamp: number;
	result: { valid: boolean; missingColumns?: string[] };
}

export interface MatchResult {
	user: string;
	success: boolean;
	matches?: number;
	error?: string;
}

export type { MatchMetrics, MatchProvenance };
