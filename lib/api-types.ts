/**
 * Comprehensive API Response Types for JobPing
 * Standardized response formats across all API endpoints
 */

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
// Request Types
// ================================

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
