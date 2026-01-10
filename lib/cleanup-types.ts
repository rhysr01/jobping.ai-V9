/**
 * Admin & Cleanup Type Definitions
 * Types related to administrative operations and data cleanup
 */

// ================================
// Admin & Cleanup Types
// ================================

export interface CleanupLogEntry {
	timestamp: string;
	requestId?: string; // Add missing property
	level: "info" | "warn" | "error";
	message: string;
	context?: CleanupContext;
	metrics?: CleanupMetrics;
}

export interface CleanupContext {
	operation: "job_cleanup" | "user_cleanup" | "match_cleanup";
	batchId: string;
	recordsProcessed: number;
	recordsDeleted: number;
	errors: string[];
}

export interface CleanupMetrics {
	totalJobs: number;
	jobsDeleted: number;
	usersAffected: number;
	processingTimeMs: number;
	safetyThreshold: number;
	batchSize: number;
}