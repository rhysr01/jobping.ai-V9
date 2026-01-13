import { NextRequest, NextResponse } from "next/server";
import { logger } from "../lib/monitoring";

// Simple in-memory rate limiting (production should use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMITS = {
	// API endpoints: 100 requests per 15 minutes
	api: { maxRequests: 100, windowMs: 15 * 60 * 1000 },
	// Signup endpoints: 5 requests per hour
	signup: { maxRequests: 5, windowMs: 60 * 60 * 1000 },
	// General endpoints: 500 requests per hour
	general: { maxRequests: 500, windowMs: 60 * 60 * 1000 },
};

/**
 * Rate Limiting Middleware
 * Protects against abuse and ensures fair usage
 */
export function handleRateLimiting(request: NextRequest): NextResponse | null {
	const clientIP =
		request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
		request.headers.get("x-real-ip") ||
		request.ip ||
		"unknown";

	const pathname = request.nextUrl.pathname;
	const now = Date.now();

	// Skip rate limiting for static assets and health checks
	if (
		pathname.startsWith("/_next/") ||
		pathname.startsWith("/favicon") ||
		pathname.includes(".") ||
		pathname === "/health" ||
		pathname === "/api/health"
	) {
		return null;
	}

	// Determine rate limit category
	let limit;
	if (pathname.startsWith("/api/signup")) {
		limit = RATE_LIMITS.signup;
	} else if (pathname.startsWith("/api/")) {
		limit = RATE_LIMITS.api;
	} else {
		limit = RATE_LIMITS.general;
	}

	// Get or create rate limit entry for this IP
	const key = `${clientIP}:${pathname}`;
	let entry = rateLimitStore.get(key);

	if (!entry || now > entry.resetTime) {
		entry = { count: 0, resetTime: now + limit.windowMs };
		rateLimitStore.set(key, entry);
	}

	entry.count++;

	// Clean up old entries periodically
	if (Math.random() < 0.01) { // 1% chance to cleanup
		for (const [k, v] of rateLimitStore.entries()) {
			if (now > v.resetTime) {
				rateLimitStore.delete(k);
			}
		}
	}

	// Check if rate limit exceeded
	if (entry.count > limit.maxRequests) {
		logger.warn("Rate limit exceeded", {
			metadata: {
				ip: clientIP,
				pathname,
				method: request.method,
				count: entry.count,
				limit: limit.maxRequests,
				resetTime: new Date(entry.resetTime).toISOString(),
			},
		});

		const resetTime = Math.ceil((entry.resetTime - now) / 1000);
		return NextResponse.json(
			{
				error: "Too many requests",
				message: "Rate limit exceeded. Please try again later.",
				retry_after: resetTime,
			},
			{
				status: 429,
				headers: {
					"Retry-After": resetTime.toString(),
					"X-RateLimit-Limit": limit.maxRequests.toString(),
					"X-RateLimit-Remaining": "0",
					"X-RateLimit-Reset": entry.resetTime.toString(),
				},
			},
		);
	}

	// Log API requests for monitoring
	if (pathname.startsWith("/api/")) {
		logger.debug("API request", {
			metadata: {
				ip: clientIP,
				pathname,
				method: request.method,
				remaining: limit.maxRequests - entry.count,
			},
		});
	}

	return null;
}