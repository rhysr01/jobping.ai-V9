/**
 * Comprehensive API Response Types for JobPing
 * Standardized response formats across all API endpoints
 */

import type { JobMatch } from "@/Utils/matching/types";

// ================================
// Base API Response Types
// ================================

export interface BaseApiResponse {
	success: boolean;
	timestamp: string;
	requestId?: string;
}

export interface SuccessResponse<T = unknown> extends BaseApiResponse {
	success: true;
	data: T;
	message?: string;
}

export interface ErrorResponse extends BaseApiResponse {
	success: false;
	error: string;
	code?: string;
	details?: unknown;
	field?: string;
}

// ================================
// Specific API Response Types
// ================================

// User Matches API
export interface UserMatchesResponse
	extends SuccessResponse<{
		matches: JobMatch[];
		total: number;
		page: number;
		limit: number;
		userEmail: string;
	}> {}

// Match Users API
export interface MatchUsersResponse
	extends SuccessResponse<{
		processedUsers: number;
		totalMatches: number;
		processingTime: number;
		metrics: {
			totalJobs: number;
			distributedJobs: number;
			tierDistribution: Record<string, number>;
			cityDistribution?: Record<string, number>;
			processingTime: number;
		};
		errors: string[];
	}> {}

// Health Check API
export interface HealthCheckResponse
	extends SuccessResponse<{
		status: "healthy" | "unhealthy";
		uptime: number;
		version: string;
		environment: string;
		checks: {
			database: { status: string; message: string };
			redis?: { status: string; message: string };
			external: { status: string; message: string };
		};
	}> {}

// Signup API
export interface SignupResponse
	extends SuccessResponse<{
		userId: string;
		email: string;
		subscriptionTier: "free" | "premium";
		welcomeEmailSent: boolean;
		matchesScheduled: boolean;
		estimatedMatchCount: number;
	}> {}

// Email Feedback API
export interface EmailFeedbackResponse
	extends SuccessResponse<{
		feedbackId: string;
		action: "positive" | "negative" | "neutral";
		score: number;
		email: string;
		timestamp: string;
	}> {}

// Unsubscribe API
export interface UnsubscribeResponse
	extends SuccessResponse<{
		email: string;
		unsubscribed: boolean;
		suppressionAdded: boolean;
		timestamp: string;
	}> {}

// Admin Cleanup API
export interface CleanupJobsResponse
	extends SuccessResponse<{
		cleanupId: string;
		jobsDeleted: number;
		usersAffected: number;
		processingTime: number;
		safetyThreshold: number;
		errors: string[];
		report: {
			totalJobs: number;
			jobsDeleted: number;
			usersAffected: number;
			processingTimeMs: number;
			safetyThreshold: number;
			batchSize: number;
		};
	}> {}

// Dashboard API
export interface DashboardResponse
	extends SuccessResponse<{
		totalUsers: number;
		activeUsers: number;
		totalJobs: number;
		totalMatches: number;
		emailsSent: number;
		systemHealth: {
			database: boolean;
			redis: boolean;
			external: boolean;
		};
		recentActivity: Array<{
			type: string;
			timestamp: string;
			details: string;
		}>;
	}> {}

// Metrics API
export interface MetricsResponse
	extends SuccessResponse<{
		current: {
			activeUsers: number;
			jobsScraped: number;
			matchesGenerated: number;
			emailsSent: number;
			errorRate: number;
			averageResponseTime: number;
		};
		historical: Array<{
			timestamp: string;
			activeUsers: number;
			jobsScraped: number;
			matchesGenerated: number;
			emailsSent: number;
			errorRate: number;
			averageResponseTime: number;
		}>;
		timeRange: {
			start: string;
			end: string;
			hours: number;
		};
	}> {}

// Scrape API
export interface ScrapeResponse
	extends SuccessResponse<{
		platforms: string[];
		jobsScraped: number;
		processingTime: number;
		errors: string[];
		nextRun: string;
	}> {}

// ================================
// Request Types
// ================================

export interface UserMatchesRequest {
	email: string;
	limit?: number;
	minScore?: number;
	signature: string;
	timestamp: number;
}

export interface MatchUsersRequest {
	userLimit?: number;
	jobLimit?: number;
	forceRun?: boolean;
	dryRun?: boolean;
	signature: string;
	timestamp: number;
}

export interface SignupRequest {
	email: string;
	fullName: string;
	cities: string[];
	roles: string[];
	tier?: "free" | "premium";
	languages?: string[];
	workEnvironment?: string[];
	companyTypes?: string[];
	careerPath?: string[];
	experienceLevel?: string;
	visaRequired?: boolean;
}

export interface EmailFeedbackRequest {
	action: "positive" | "negative" | "neutral";
	score: number;
	email: string;
	signature?: string;
	timestamp?: number;
}

// ================================
// Type Guards
// ================================

export function isSuccessResponse<T>(
	response: unknown,
): response is SuccessResponse<T> {
	return (
		typeof response === "object" &&
		response !== null &&
		"success" in response &&
		(response as SuccessResponse<T>).success === true
	);
}

export function isErrorResponse(response: unknown): response is ErrorResponse {
	return (
		typeof response === "object" &&
		response !== null &&
		"success" in response &&
		(response as ErrorResponse).success === false
	);
}

// ================================
// Response Builders
// ================================

export function createSuccessResponse<T>(
	data: T,
	message?: string,
	requestId?: string,
): SuccessResponse<T> {
	// Generate requestId if not provided
	const id =
		requestId ||
		(() => {
			try {
				// eslint-disable-next-line
				const nodeCrypto = require("node:crypto");
				return nodeCrypto.randomUUID
					? nodeCrypto.randomUUID()
					: nodeCrypto.randomBytes(16).toString("hex");
			} catch {
				return Math.random().toString(36).slice(2) + Date.now().toString(36);
			}
		})();

	return {
		success: true,
		data,
		message,
		timestamp: new Date().toISOString(),
		requestId: id,
	};
}

export function createErrorResponse(
	error: string,
	code?: string,
	details?: unknown,
	field?: string,
	requestId?: string,
): ErrorResponse {
	// Generate requestId if not provided
	const id =
		requestId ||
		(() => {
			try {
				// eslint-disable-next-line
				const nodeCrypto = require("node:crypto");
				return nodeCrypto.randomUUID
					? nodeCrypto.randomUUID()
					: nodeCrypto.randomBytes(16).toString("hex");
			} catch {
				return Math.random().toString(36).slice(2) + Date.now().toString(36);
			}
		})();

	return {
		success: false,
		error,
		code,
		details,
		field,
		timestamp: new Date().toISOString(),
		requestId: id,
	};
}
