import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { BusinessMetrics, logger, RequestContext } from "@/lib/monitoring";

export function middleware(request: NextRequest) {
	const startTime = Date.now();
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

	// CSRF Protection for state-changing API requests
	// Only check POST, PUT, DELETE, PATCH methods
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
					...requestContext,
					metadata: {
						...requestContext.metadata,
						csrfHeader: csrfHeader || "missing",
					},
				});

				return NextResponse.json({ error: "Invalid request" }, { status: 403 });
			}
		}
	}

	// HTTPS enforcement in production
	if (process.env.NODE_ENV === "production") {
		const proto = request.headers.get("x-forwarded-proto");
		if (proto === "http") {
			const url = request.nextUrl.clone();
			url.protocol = "https:";
			return NextResponse.redirect(url, 301);
		}
	}

	// Protect /admin with Basic Auth
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

		const auth = request.headers.get("authorization");
		if (!auth || !auth.startsWith("Basic ")) {
			return new NextResponse("Authentication required", {
				status: 401,
				headers: { "WWW-Authenticate": 'Basic realm="Admin"' },
			});
		}

		const credentials = Buffer.from(
			auth.split(" ")[1] || "",
			"base64",
		).toString();
		const [user, pass] = credentials.split(":");

		if (user !== basicUser || pass !== basicPass) {
			return new NextResponse("Unauthorized", { status: 401 });
		}
	}

	const response = NextResponse.next();

	// Add request tracking headers
	response.headers.set("X-Request-ID", requestId);
	response.headers.set("X-Response-Time", (Date.now() - startTime).toString());

	// Cookie security: Set SameSite=Lax and Secure for all cookies
	// This prevents CSRF attacks and ensures cookies are only sent over HTTPS
	const cookieHeader = response.headers.get("Set-Cookie") ?? "";
	response.headers.set(
		"Set-Cookie",
		cookieHeader
			? cookieHeader
					.split(",")
					.map((cookie) => {
						// Ensure all cookies have SameSite=Lax and Secure flags
						if (!cookie.includes("SameSite")) {
							cookie += "; SameSite=Lax";
						}
						if (
							process.env.NODE_ENV === "production" &&
							!cookie.includes("Secure")
						) {
							cookie += "; Secure";
						}
						return cookie;
					})
					.join(",")
			: "",
	);

	// Generate nonce for inline scripts (prevents XSS while allowing necessary inline scripts)
	const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

	// Set nonce in response header for Next.js to use
	response.headers.set("x-nonce", nonce);

	// Enhanced security headers with strict CSP (no unsafe-inline or unsafe-eval)
	// Using nonces for dynamic scripts and hashes for static inline scripts
	// Hash for Google Analytics inline script: kqFzuQJivdoTtSFw6wC6ycybBAlKswA7hJ7PojqXc7Q=
	// Hash for Structured Data JSON-LD: sha256-S/UEtrQCu6TgVoi5WG9EmfntThy9qa0ZZqFKfu1n76w=
	// Hash for FAQ JSON-LD: sha256-K2qBnrJSupBJBzTvPD141bNBx/+m8R4iJQNj2EHmozM=
	// Hash for Organization JSON-LD: sha256-6BVL0DgOeCbtUrFGJAsqrMsuY26fcarXXnMdHEfKW3Y=
	response.headers.set(
		"Content-Security-Policy",
		"default-src 'self'; " +
			`script-src 'self' 'nonce-${nonce}' 'sha256-kqFzuQJivdoTtSFw6wC6ycybBAlKswA7hJ7PojqXc7Q=' 'sha256-S/UEtrQCu6TgVoi5WG9EmfntThy9qa0ZZqFKfu1n76w=' 'sha256-K2qBnrJSupBJBzTvPD141bNBx/+m8R4iJQNj2EHmozM=' 'sha256-6BVL0DgOeCbtUrFGJAsqrMsuY26fcarXXnMdHEfKW3Y=' https://www.googletagmanager.com https://www.google-analytics.com https://*.supabase.co https://cdn.jsdelivr.net https://*.sentry.io; ` +
			"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.fontshare.com; " +
			"font-src 'self' https://fonts.gstatic.com https://api.fontshare.com https://cdn.fontshare.com; " +
			"img-src 'self' data: https: blob:; " +
			"connect-src 'self' https://*.supabase.co https://api.resend.com https://api.openai.com https://www.google-analytics.com https://www.googletagmanager.com https://*.sentry.io; " +
			"object-src 'none'; " +
			"base-uri 'self'; " +
			"form-action 'self'",
	);

	response.headers.set("X-Frame-Options", "DENY");
	response.headers.set("X-Content-Type-Options", "nosniff");
	response.headers.set("X-XSS-Protection", "1; mode=block");
	response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
	response.headers.set(
		"Permissions-Policy",
		"camera=(), microphone=(), geolocation=()",
	);

	// HSTS in production
	if (process.env.NODE_ENV === "production") {
		response.headers.set(
			"Strict-Transport-Security",
			"max-age=31536000; includeSubDomains; preload",
		);
	}

	// Log request completion for API endpoints
	const duration = Date.now() - startTime;
	if (request.nextUrl.pathname.startsWith("/api/")) {
		// Get response status from headers or assume 200
		const statusCode = response.status || 200;

		// Record API metrics
		BusinessMetrics.recordAPICall(
			request.nextUrl.pathname,
			request.method,
			statusCode,
			duration,
		);

		logger.debug("API request completed", {
			...requestContext,
			duration,
			metadata: {
				...requestContext.metadata,
				statusCode,
				success: statusCode < 400,
			},
		});
	}

	// Clean up request context after a delay to allow for async operations
	setTimeout(() => {
		RequestContext.clear(requestId);
	}, 5000);

	return response;
}

export const config = {
	matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
