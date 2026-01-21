/**
 * Unified Error Handling for JobPing
 * Centralizes error handling across all API routes
 */

import { type NextRequest, NextResponse } from "next/server";
import { logger } from "./monitoring";

// Request ID helper (for consistent request tracking)
export function getRequestId(req: NextRequest): string {
	const headerVal = req.headers.get("x-request-id");
	if (headerVal && headerVal.length > 0) {
		return headerVal;
	}

	// Generate request ID
	try {
		// eslint-disable-next-line
		const nodeCrypto = require("node:crypto");
		return nodeCrypto.randomUUID
			? nodeCrypto.randomUUID()
			: nodeCrypto.randomBytes(16).toString("hex");
	} catch {
		return Math.random().toString(36).slice(2) + Date.now().toString(36);
	}
}

export class AppError extends Error {
	constructor(
		message: string,
		public statusCode: number = 500,
		public code?: string,
		public details?: unknown,
	) {
		super(message);
		this.name = "AppError";
	}
}

export class ValidationError extends AppError {
	constructor(message: string, details?: unknown) {
		super(message, 400, "VALIDATION_ERROR", details);
	}
}

export class NotFoundError extends AppError {
	constructor(resource: string) {
		super(`${resource} not found`, 404, "NOT_FOUND");
	}
}

export class UnauthorizedError extends AppError {
	constructor(message = "Unauthorized") {
		super(message, 401, "UNAUTHORIZED");
	}
}

export class RateLimitError extends AppError {
	constructor(retryAfter?: number) {
		super("Rate limit exceeded", 429, "RATE_LIMIT", { retryAfter });
	}
}

/**
 * Centralized error handler
 * Logs errors and returns consistent JSON response with requestId
 */
export function handleError(error: unknown, req?: NextRequest): NextResponse {
	const requestId = req ? getRequestId(req) : undefined;

	if (error instanceof AppError) {
		logger.warn(error.message, {
			metadata: {
				statusCode: error.statusCode,
				code: error.code,
				details: error.details,
				requestId,
			},
		});

		const response = NextResponse.json(
			{
				error: error.message,
				code: error.code,
				details: error.details,
				...(requestId && { requestId }),
			},
			{ status: error.statusCode },
		);

		if (requestId) {
			response.headers.set("x-request-id", requestId);
		}

		return response;
	}

	// Unknown error - log with full stack
	logger.error("Unhandled error", {
		error: error instanceof Error ? error : new Error(String(error)),
	});

	const response = NextResponse.json(
		{
			error: "Internal server error",
			...(requestId && { requestId }),
		},
		{ status: 500 },
	);

	if (requestId) {
		response.headers.set("x-request-id", requestId);
	}

	return response;
}

/**
 * Async handler wrapper - wraps API route handlers
 * Automatically catches and handles all errors
 *
 * Usage:
 * export const POST = asyncHandler(async (req) => {
 *   // Your code here
 *   // Errors are auto-caught and handled
 * });
 */
export function asyncHandler(
	handler: (req: NextRequest, context?: any) => Promise<NextResponse>,
) {
	return async (req: NextRequest, context?: any) => {
		try {
			return await handler(req, context);
		} catch (error) {
			return handleError(error, req);
		}
	};
}
