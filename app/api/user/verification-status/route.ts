import { type NextRequest, NextResponse } from "next/server";
import { apiLogger } from "../../../../lib/api-logger";
import { asyncHandler } from "../../../../lib/errors";
import { getDatabaseClient } from "../../../../utils/core/database-pool";

export const GET = asyncHandler(async (request: NextRequest) => {
	// Get user email from session or cookie (similar to how matches work)
	const cookies = request.cookies;
	const userEmail = cookies.get("free_user_email")?.value;

	if (!userEmail) {
		return NextResponse.json(
			{ verified: false, error: "No user session found" },
			{ status: 401 },
		);
	}

	const supabase = getDatabaseClient();

	// Check verification status
	const { data: user, error } = await supabase
		.from("users")
		.select("email_verified")
		.eq("email", userEmail.toLowerCase().trim())
		.single();

	if (error || !user) {
		apiLogger.warn("User verification check failed", {
			email: userEmail,
			error: error?.message,
		});
		return NextResponse.json(
			{ verified: false, error: "User not found" },
			{ status: 404 },
		);
	}

	return NextResponse.json({
		verified: Boolean(user.email_verified),
		email: userEmail,
	});
});