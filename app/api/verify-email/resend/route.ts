import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiLogger } from "../../../../lib/api-logger";
import { asyncHandler, ValidationError } from "../../../../lib/errors";
import { sendVerificationEmail } from "../../../../utils/email-verification";
import { getProductionRateLimiter } from "../../../../utils/production-rate-limiter";

const resendSchema = z.object({
	email: z.string().email("Invalid email address"),
});

export const POST = asyncHandler(async (request: NextRequest) => {
	// Rate limiting - prevent abuse of resend functionality
	const rateLimitResult = await getProductionRateLimiter().middleware(
		request,
		"resend-verification",
		{
			windowMs: 60 * 60 * 1000, // 1 hour
			maxRequests: 3, // Max 3 resend requests per hour per IP
		},
	);

	if (rateLimitResult) {
		return rateLimitResult;
	}

	const body = await request.json();

	// Validate input
	const validationResult = resendSchema.safeParse(body);
	if (!validationResult.success) {
		throw new ValidationError("Invalid email address");
	}

	const { email } = validationResult.data;
	const normalizedEmail = email.toLowerCase().trim();

	// Check if user exists and needs verification
	const supabase = (await import("../../../../utils/core/database-pool")).getDatabaseClient();
	const { data: user } = await supabase
		.from("users")
		.select("email, email_verified, full_name, subscription_tier")
		.eq("email", normalizedEmail)
		.single();

	if (!user) {
		// Don't reveal if email exists or not (security)
		return NextResponse.json(
			{ message: "If an account exists with this email, a verification link has been sent." },
			{ status: 200 },
		);
	}

	if (user.email_verified) {
		return NextResponse.json(
			{ message: "Email is already verified." },
			{ status: 200 },
		);
	}

	// Only allow resend for premium users (free users don't need verification)
	if (user.subscription_tier !== "premium") {
		return NextResponse.json(
			{ message: "Email verification not required for this account type." },
			{ status: 200 },
		);
	}

	// Send verification email
	try {
		await sendVerificationEmail(normalizedEmail, user.full_name);

		apiLogger.info("Verification email resent", {
			email: normalizedEmail,
			userTier: user.subscription_tier,
		});

		return NextResponse.json(
			{ message: "Verification email sent successfully." },
			{ status: 200 },
		);
	} catch (error) {
		apiLogger.error("Failed to resend verification email", error as Error, {
			email: normalizedEmail,
		});

		return NextResponse.json(
			{ message: "Failed to send verification email. Please try again later." },
			{ status: 500 },
		);
	}
});