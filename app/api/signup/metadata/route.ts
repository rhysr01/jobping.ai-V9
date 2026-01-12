import { type NextRequest, NextResponse } from "next/server";
import { apiLogger } from "../../../../lib/api-logger";
import { getDatabaseClient } from "../../../../utils/core/database-pool";
import { getProductionRateLimiter } from "../../../../utils/production-rate-limiter";

// Simple replacement for getTargetCompaniesFromHistory
async function getTargetCompaniesFromHistory() {
	// Return empty result for now
	return { targetCompanies: [], stats: { total: 0 } };
}

export async function GET(request: NextRequest) {
	// Rate limiting
	const rateLimitResult = await getProductionRateLimiter().middleware(
		request,
		"signup-metadata",
		{
			windowMs: 60 * 1000,
			maxRequests: 20,
		},
	);

	if (rateLimitResult) {
		return rateLimitResult;
	}

	try {
		const { searchParams } = new URL(request.url);
		const email = searchParams.get("email");

		if (!email) {
			return NextResponse.json({ error: "Email required" }, { status: 400 });
		}

		const supabase = getDatabaseClient();

		// Get user preferences
		const { data: userPrefs, error: userError } = await supabase
			.from("users")
			.select("career_path, target_cities, roles_selected, work_environment")
			.eq("email", email)
			.single();

		if (userError || !userPrefs) {
			apiLogger.warn("User not found for metadata", {
				email,
				error: userError?.message,
			});
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		// Get target companies (non-blocking, can be slow)
		const targetCompaniesResult = await getTargetCompaniesFromHistory();

		// Get custom scan status
		const { data: customScanData } = await supabase
			.from("custom_scans")
			.select("id, estimated_completion, created_at, status")
			.eq("user_email", email)
			.eq("status", "pending")
			.order("created_at", { ascending: false })
			.limit(1)
			.single();

		// Get relaxation level from latest fallback event
		const { data: fallbackEvent } = await supabase
			.from("fallback_match_events")
			.select("relaxation_level, relaxation_path, timestamp")
			.eq("user_email", email)
			.order("timestamp", { ascending: false })
			.limit(1)
			.single();

		return NextResponse.json({
			targetCompanies: targetCompaniesResult.targetCompanies || [],
			customScan: customScanData
				? {
						scanId: customScanData.id,
						estimatedTime: "2 hours",
						message:
							"Your niche is highly specialized. We've prioritized a custom scrape for your criteria.",
						status: customScanData.status,
						estimatedCompletion: customScanData.estimated_completion,
					}
				: null,
			relaxationLevel: fallbackEvent?.relaxation_level || null,
			relaxationPath: fallbackEvent?.relaxation_path || null,
			lastFallbackAt: fallbackEvent?.timestamp || null,
		});
	} catch (error) {
		apiLogger.error("Metadata API error", error as Error, {
			email: request.nextUrl.searchParams.get("email"),
		});
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
