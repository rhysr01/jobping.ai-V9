/**
 * Type definitions for consolidated matching system
 */

import type { JobMatch } from "../types";

export interface ConsolidatedMatchResult {
	matches: JobMatch[];
	method:
		| "ai_success"
		| "ai_timeout"
		| "ai_failed"
		| "rule_based"
		| "guaranteed_fallback";
	processingTime: number;
	confidence: number;
	aiModel?: string; // AI model used (e.g., 'gpt-4o-mini')
	aiCostUsd?: number; // Calculated cost in USD
	aiTokensUsed?: number; // Tokens consumed (optional, for debugging)
}

export interface CacheEntry {
	matches: JobMatch[];
	timestamp: number;
	accessCount: number;
	lastAccessed: number;
}
