import { NextRequest, NextResponse } from "next/server";
import { logger } from "../lib/monitoring";

/**
 * CSRF Protection Middleware
 * Protects state-changing API requests from cross-site request forgery
 */
export function handleCSRFProtection(request: NextRequest): NextResponse | null {
	const stateChangingMethods = ["POST", "PUT", "DELETE", "PATCH"];

	if (
		request.nextUrl.pathname.startsWith("/api/") &&
		stateChangingMethods.includes(request.method)
	) {
		// Skip CSRF check for webhook endpoints (they use their own authentication)
		const isWebhook = request.nextUrl.pathname.includes("/webhooks/");

		// Skip CSRF check for Inngest endpoint (Inngest DevServer uses its own authentication)
		const isInngestEndpoint = request.nextUrl.pathname === "/api/inngest";

		// Skip CSRF check for internal/system endpoints that use API keys
		const isSystemEndpoint =
			request.nextUrl.pathname.includes("/cleanup-jobs") ||
			request.nextUrl.pathname.includes("/send-scheduled-emails");

		// Skip CSRF check for analytics/tracking endpoints (non-state-changing, called from client-side)
		const isAnalyticsEndpoint =
			request.nextUrl.pathname.includes("/analytics/") ||
			request.nextUrl.pathname.includes("/track-engagement") ||
			request.nextUrl.pathname.includes("/tracking/");

		if (
			!isWebhook &&
			!isInngestEndpoint &&
			!isSystemEndpoint &&
			!isAnalyticsEndpoint
		) {
			const csrfHeader = request.headers.get("x-csrf-token");

			if (!csrfHeader || csrfHeader !== "jobping-request") {
				logger.warn("CSRF protection failed", {
					metadata: {
						method: request.method,
						url: request.url,
						csrfHeader: csrfHeader || "missing",
					},
				});

				return NextResponse.json({ error: "Invalid request" }, { status: 403 });
			}
		}
	}

	return null;
}

/**
 * HTTPS Enforcement Middleware
 * Redirects HTTP requests to HTTPS in production
 */
export function handleHTTPSEnforcement(request: NextRequest): NextResponse | null {
	if (process.env.NODE_ENV === "production") {
		const proto = request.headers.get("x-forwarded-proto");
		if (proto === "http") {
			const url = request.nextUrl.clone();
			url.protocol = "https:";
			return NextResponse.redirect(url, 301);
		}
	}

	return null;
}

/**
 * Basic Authentication Middleware
 * Protects admin routes with Basic Auth
 */
export function handleBasicAuth(request: NextRequest): NextResponse | null {
	if (request.nextUrl.pathname.startsWith("/admin")) {
		const basicUser = process.env.ADMIN_BASIC_USER;
		const basicPass = process.env.ADMIN_BASIC_PASS;

		// If creds not configured, deny by default
		if (!basicUser || !basicPass) {
			return new NextResponse("Admin access not configured", {
				status: 403,
				headers: { "Content-Type": "text/plain" },
			});
		}

		const authHeader = request.headers.get("authorization");

		if (!authHeader || !authHeader.startsWith("Basic ")) {
			return new NextResponse("Authentication required", {
				status: 401,
				headers: {
					"WWW-Authenticate": 'Basic realm="Admin Area"',
					"Content-Type": "text/plain",
				},
			});
		}

		try {
			const base64Credentials = authHeader.split(" ")[1];
			const credentials = Buffer.from(base64Credentials, "base64").toString("ascii");
			const [username, password] = credentials.split(":");

			if (username !== basicUser || password !== basicPass) {
				return new NextResponse("Invalid credentials", {
					status: 401,
					headers: { "Content-Type": "text/plain" },
				});
			}
		} catch (error) {
			return new NextResponse("Invalid authentication", {
				status: 401,
				headers: { "Content-Type": "text/plain" },
			});
		}
	}

	return null;
}