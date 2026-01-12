import { type NextRequest, NextResponse } from "next/server";
import { apiLogger } from "../../../lib/api-logger";
import { asyncHandler } from "../../../lib/errors";
import { verifySecureToken } from "../../../utils/authentication/secureTokens";
import { getDatabaseClient } from "../../../utils/core/database-pool";

export const GET = asyncHandler(async (req: NextRequest) => {
	const { searchParams } = new URL(req.url);
	const token = searchParams.get("token");
	const email = searchParams.get("email");

	if (!token || !email) {
		return NextResponse.json(
			{ error: "Token and email required" },
			{ status: 400 },
		);
	}

	const verification = verifySecureToken(email, token, "preferences");
	if (!verification.valid) {
		return NextResponse.json(
			{ error: "Invalid token", reason: verification.reason },
			{ status: 401 },
		);
	}

	const supabase = getDatabaseClient();
	const { data: user, error } = await supabase
		.from("users")
		.select("*")
		.eq("email", email)
		.eq("active", true)
		.single();

	if (error || !user) {
		return NextResponse.json({ error: "User not found" }, { status: 404 });
	}

	return NextResponse.json({ success: true, user });
});

export const POST = asyncHandler(async (req: NextRequest) => {
	const body = await req.json();
	const { token, email, ...preferences } = body;

	if (!token || !email) {
		return NextResponse.json(
			{ error: "Token and email required" },
			{ status: 400 },
		);
	}

	const verification = verifySecureToken(email, token, "preferences");
	if (!verification.valid) {
		return NextResponse.json(
			{ error: "Invalid token", reason: verification.reason },
			{ status: 401 },
		);
	}

	const supabase = getDatabaseClient();

	// Update user preferences
	const { error } = await supabase
		.from("users")
		.update({
			target_cities: preferences.cities || [],
			languages: preferences.languages || [],
			start_date: preferences.startDate || null,
			experience: preferences.experience || "",
			work_environment: preferences.workEnvironment || [],
			visa_status: preferences.visaStatus || "",
			entry_level_preference: preferences.entryLevelPreferences || [],
			company_types: preferences.targetCompanies || [],
			professional_expertise: preferences.careerPath || "",
			roles: preferences.roles || [],
			updated_at: new Date().toISOString(),
		})
		.eq("email", email);

	if (error) {
		apiLogger.error("Update preferences error:", error as Error);
		return NextResponse.json(
			{ error: "Failed to update preferences" },
			{ status: 500 },
		);
	}

	return NextResponse.json({ success: true, message: "Preferences updated" });
});
