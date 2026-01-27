import { NextRequest, NextResponse } from "next/server";
import { apiLogger } from "@/lib/api-logger";

/**
 * Analytics tracking endpoint
 * Routes events to Vercel Analytics and logs for monitoring
 *
 * Tracked events:
 * - signup_started: User begins signup
 * - signup_no_matches: No matches found
 * - signup_completed: Signup successful
 * - signup_failed: Signup failed with error
 * - job_viewed: User views a job
 * - email_opened: Email engagement
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { event, properties, timestamp, url } = body;

		const userAgent = request.headers.get("user-agent");
		const ip =
			request.headers.get("x-forwarded-for") ||
			request.headers.get("x-real-ip");

		// Log to API logger for backend analysis
		apiLogger.info(`Analytics event tracked: ${event}`, {
			event,
			properties,
			timestamp,
			url,
			userAgent,
			ip,
		});

		// Critical events for debugging should be highlighted
		if (
			event === "signup_no_matches" ||
			event === "signup_failed" ||
			event === "error"
		) {
			apiLogger.warn(`Critical signup event: ${event}`, {
				event,
				properties,
				timestamp,
			});
		}

		// Vercel Analytics is automatically captured by the SDK
		// This endpoint serves as a custom event logger and audit trail
		// Events are also forwarded to:
		// 1. Server-side logging (API logger above)
		// 2. Vercel Analytics dashboard (via @vercel/analytics)
		// 3. Sentry (if integrated for error events)

		return NextResponse.json({
			success: true,
			event,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		apiLogger.error("[Analytics API] Error processing event", error as Error);
		return NextResponse.json(
			{ error: "Failed to track event" },
			{ status: 500 },
		);
	}
}
