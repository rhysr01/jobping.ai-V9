/**
 * Unified analytics tracking for Vercel Analytics
 * Tracks user events with rich context for production debugging
 *
 * Supported events:
 * - signup_started: User begins signup flow
 * - signup_completed: User successfully completes signup
 * - signup_no_matches: No matches found for user preferences
 * - signup_failed: Signup failed with error
 */

export interface SignupNoMatchesEvent {
	tier: "free" | "premium";
	cities: string[];
	career_path: string | string[] | null;
	available_jobs_count: number;
	filter_stage: "location" | "career" | "city_career" | "visa";
	duration_ms: number;
	reason?: string;
}

export interface SignupCompletedEvent {
	tier: "free" | "premium";
	matchCount: number;
	cities: number;
	career_path: string | string[] | null;
	duration_ms?: number;
}

export function trackEvent(
	event: string,
	properties?: Record<string, any>,
): void {
	// Send to analytics API (backend will route to Vercel Analytics)
	fetch("/api/analytics/track", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			event,
			properties: {
				...properties,
				timestamp: new Date().toISOString(),
				url: typeof window !== "undefined" ? window.location.href : "",
			},
		}),
	}).catch((err) => {
		// Silent fail - analytics shouldn't block user flow
		console.error("[Analytics] Tracking failed:", err);
	});
}

/**
 * Track when no matches are found
 * Helps identify issues with matching filters
 */
export function trackSignupNoMatches(event: SignupNoMatchesEvent): void {
	trackEvent("signup_no_matches", {
		tier: event.tier,
		cities: event.cities,
		career_path: event.career_path,
		available_jobs_count: event.available_jobs_count,
		filter_stage: event.filter_stage,
		duration_ms: event.duration_ms,
		reason: event.reason || "no_matches_found",
	});
}

/**
 * Track successful signup completion
 */
export function trackSignupCompleted(event: SignupCompletedEvent): void {
	trackEvent("signup_completed", {
		tier: event.tier,
		matchCount: event.matchCount,
		cities: event.cities,
		career_path: event.career_path,
		duration_ms: event.duration_ms || 0,
	});
}

/**
 * Track signup failure
 */
export function trackSignupFailed(
	error: string,
	context?: Record<string, any>,
): void {
	trackEvent("signup_failed", {
		error,
		...context,
	});
}

/**
 * Track signup started
 */
export function trackSignupStarted(tier: "free" | "premium"): void {
	trackEvent("signup_started", {
		tier,
	});
}
