import { type NextRequest, NextResponse } from "next/server";
import { isTest } from "@/lib/env";
import { asyncHandler, ValidationError } from "@/lib/errors";
import {
	markUserVerified,
	verifyVerificationToken,
} from "@/utils/email-verification";
import { getProductionRateLimiter } from "@/utils/production-rate-limiter";
import { getBaseUrl } from "@/utils/url-helpers";

// Test mode helper - using professional pattern
const isTestMode = () => isTest();

export const POST = asyncHandler(async (request: NextRequest) => {
	// PRODUCTION: Rate limiting for email verification (prevent abuse)
	// Skip rate limiting in test mode
	if (!isTestMode()) {
		const rateLimitResult = await getProductionRateLimiter().middleware(
			request,
			"verify-email",
		);
		if (rateLimitResult) {
			return rateLimitResult;
		}
	}

	const { token, email } = await request.json();

	if (!token || !email) {
		throw new ValidationError("Email and verification token required");
	}

	const verification = await verifyVerificationToken(email, token);
	if (!verification.valid) {
		return NextResponse.json(
			{
				success: false,
				error: "Invalid or expired token",
				reason: verification.reason,
			},
			{ status: 400 },
		);
	}

	await markUserVerified(email);

	return NextResponse.json({ success: true }, { status: 200 });
});

export const GET = asyncHandler(async (req: NextRequest) => {
	const { searchParams } = new URL(req.url);
	const token = searchParams.get("token");
	const email = searchParams.get("email");

	if (!token || !email) {
		throw new ValidationError("Missing email or token");
	}

	const verification = await verifyVerificationToken(email, token);
	const baseUrl = getBaseUrl();

	if (!verification.valid) {
		// Redirect to signup success page with error message
		return NextResponse.redirect(
			`${baseUrl}/signup/success?verified=false&error=${encodeURIComponent(verification.reason || "Invalid or expired token")}&email=${encodeURIComponent(email)}`,
		);
	}

	await markUserVerified(email);

	// Redirect to signup success page with success message
	return NextResponse.redirect(
		`${baseUrl}/signup/success?verified=true&email=${encodeURIComponent(email)}`,
	);
});
