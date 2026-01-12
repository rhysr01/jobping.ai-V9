import { type NextRequest, NextResponse } from "next/server";
import { getProductionRateLimiter } from "../production-rate-limiter";
import { apiLogger } from "../../lib/api-logger";

export interface AuthConfig {
	/**
	 * Require user authentication (email/session)
	 */
	requireAuth?: boolean;

	/**
	 * Require system API key (x-api-key header)
	 */
	requireSystemKey?: boolean;

	/**
	 * Allow public access with rate limiting (leaky bucket style)
	 */
	allowPublic?: boolean;

	/**
	 * Custom rate limiting configuration
	 */
	rateLimitConfig?: {
		maxRequests: number;
		windowMs: number;
	};
}

/**
 * Enhanced auth middleware with rate limiting
 * Supports: Public (rate-limited), User auth, System key auth
 *
 * @example
 * ```typescript
 * export const GET = withApiAuth(
 *   async (req: NextRequest) => {
 *     // Handler code
 *   },
 *   {
 *     allowPublic: true,
 *     rateLimitConfig: {
 *       maxRequests: 50,
 *       windowMs: 60000,
 *     },
 *   }
 * );
 * ```
 */
export function withApiAuth(
	handler: (req: NextRequest) => Promise<NextResponse>,
	config: AuthConfig = {},
): (req: NextRequest) => Promise<NextResponse> {
	return async (req: NextRequest): Promise<NextResponse> => {
		const {
			requireAuth = false,
			requireSystemKey = false,
			allowPublic = false,
			rateLimitConfig,
		} = config;

		// System key check (highest priority)
		if (requireSystemKey) {
			const apiKey = req.headers.get("x-api-key");
			const systemKey = process.env.SYSTEM_API_KEY;

			if (!systemKey) {
				apiLogger.error("SYSTEM_API_KEY not configured", new Error("SYSTEM_API_KEY not configured"), {
					endpoint: req.nextUrl.pathname,
				});
				return NextResponse.json(
					{ error: "Server configuration error" },
					{ status: 500 },
				);
			}

			if (!apiKey || apiKey !== systemKey) {
				apiLogger.warn("Unauthorized system API key attempt", {
					endpoint: req.nextUrl.pathname,
					hasApiKey: !!apiKey,
					apiKeyPrefix: apiKey?.substring(0, 5) || "none",
				});
				return NextResponse.json(
					{ error: "Unauthorized: Invalid system API key" },
					{ status: 401 },
				);
			}
		}

		// User auth check
		if (requireAuth) {
			// Check for user email in headers (set by middleware or client)
			const userEmail = req.headers.get("x-user-email");
			// TODO: Implement proper session check when user auth system is ready
			if (!userEmail) {
				apiLogger.warn("Unauthorized user access attempt", {
					endpoint: req.nextUrl.pathname,
				});
				return NextResponse.json(
					{ error: "Unauthorized: User authentication required" },
					{ status: 401 },
				);
			}
		}

		// Rate limiting for public endpoints (leaky bucket style)
		// Allows bursts but blocks sustained scraping
		if (allowPublic || (!requireAuth && !requireSystemKey)) {
			const rateLimiter = getProductionRateLimiter();
			const customConfig = rateLimitConfig || {
				maxRequests: 100, // Default: 100 requests per minute
				windowMs: 60000, // 1 minute window
			};

			const rateLimitResult = await rateLimiter.middleware(
				req,
				`public-api-${req.nextUrl.pathname}`,
				customConfig,
			);

			if (rateLimitResult) {
				// Rate limit exceeded
				apiLogger.warn("Rate limit exceeded", {
					endpoint: req.nextUrl.pathname,
					ip: req.headers.get("x-forwarded-for") || "unknown",
				});
				return rateLimitResult;
			}
		}

		// Call the actual handler
		try {
			return await handler(req);
		} catch (error) {
			apiLogger.error("API handler error", error as Error, {
				endpoint: req.nextUrl.pathname,
			});
			return NextResponse.json(
				{
					error: "Internal server error",
					message:
						process.env.NODE_ENV === "development"
							? (error as Error).message
							: undefined,
				},
				{ status: 500 },
			);
		}
	};
}

