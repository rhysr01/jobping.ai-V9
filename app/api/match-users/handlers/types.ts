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

export interface Job {
	id: string;
	title: string;
	company: string;
	location: string;
	job_url: string;
	description: string;
	created_at: string;
	job_hash: string;
	is_sent: boolean;
	status: string;
	original_posted_date: string | null;
	last_seen_at: string | null;
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
