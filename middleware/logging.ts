import { NextRequest } from "next/server";
import { logger, RequestContext } from "../lib/monitoring";

/**
 * Request Logging and Monitoring Middleware
 * Sets up request context and logs API requests
 */
export function handleRequestLogging(request: NextRequest): void {
	const requestId = crypto.randomUUID();

	// Set up request context for monitoring
	const requestContext = {
		requestId,
		operation: "http-request",
		component: "middleware",
		metadata: {
			method: request.method,
			url: request.url,
			userAgent: request.headers.get("user-agent") || undefined,
			ip:
				request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
				request.headers.get("x-real-ip") ||
				"unknown",
			timestamp: Date.now(),
		},
	};

	RequestContext.set(requestId, requestContext);

	// Log API requests for monitoring
	if (request.nextUrl.pathname.startsWith("/api/")) {
		logger.debug("API request started", requestContext);
	}
}