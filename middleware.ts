import { type NextRequest, NextResponse } from "next/server";
import { addSecurityHeaders } from "./middleware/security-headers";

/**
 * Next.js Middleware
 * Handles security headers, redirects, and other request processing
 */
export function middleware(_request: NextRequest) {
	// Create response to modify
	const response = NextResponse.next();

	// Add security headers
	addSecurityHeaders(response);

	// Return modified response
	return response;
}

// Configure which paths the middleware runs on
export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - api (API routes)
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * - public folder
		 */
		"/((?!api|_next/static|_next/image|favicon.ico|public).*)",
	],
};