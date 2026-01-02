import { type NextRequest, NextResponse } from "next/server";
import { apiLogger } from "@/lib/api-logger";
import { createConsolidatedMatcher } from "@/Utils/consolidatedMatchingV2";
import { getDatabaseClient } from "@/Utils/databasePool";
import type { UserPreferences } from "@/Utils/matching/types";
import { getProductionRateLimiter } from "@/Utils/productionRateLimiter";

/**
 * Ghost Matches API
 *
 * Returns additional matches that would be available with Premium tier.
 * Uses "lite" premium matching (rule-based only, no AI) to show value.
 *
 * This creates FOMO and drives conversion to Premium.
 */

export async function GET(request: NextRequest) {
	// Rate limiting - prevent abuse
	const rateLimitResult = await getProductionRateLimiter().middleware(
		request,
		"matches-ghost",
		{
			windowMs: 60 * 1000, // 1 minute
			maxRequests: 5, // 5 requests per minute per IP (more restrictive)
		},
	);

	if (rateLimitResult) {
		return rateLimitResult;
	}

	try {
		// Get user email from cookie
		const email = request.cookies
			.get("free_user_email")
			?.value?.toLowerCase()
			.trim();

		if (!email) {
			return NextResponse.json(
				{
					error: "Unauthorized",
					message: "Please sign up to see matches.",
				},
				{ status: 401 },
			);
		}

		const supabase = getDatabaseClient();

		// Get user preferences
		const { data: user, error: userError } = await supabase
			.from("users")
			.select(
				"email, target_cities, languages_spoken, career_path, roles_selected, entry_level_preference, professional_expertise, work_environment, visa_status, company_types, industries, company_size_preference, skills, career_keywords",
			)
			.eq("email", email)
			.eq("subscription_tier", "free")
			.single();

		if (userError || !user) {
			apiLogger.warn("Ghost matches: User not found", userError as Error, {
				email,
			});
			return NextResponse.json(
				{
					error: "User not found",
					ghostMatchCount: 0,
				},
				{ status: 404 },
			);
		}

		// Get user's existing matches to exclude
		const { data: existingMatches } = await supabase
			.from("matches")
			.select("job_hash")
			.eq("user_email", email)
			.limit(100);

		const existingJobHashes = new Set(
			existingMatches?.map((m) => m.job_hash) || [],
		);

		// Fetch jobs using same strategy as premium (but rule-based only)
		let query = supabase
			.from("jobs")
			.select("*")
			.eq("is_active", true)
			.eq("status", "active")
			.is("filtered_reason", null);

		// Filter by cities
		if (user.target_cities && user.target_cities.length > 0) {
			query = query.in("city", user.target_cities);
		}

		// Filter by career path categories (if available)
		if (user.career_path) {
			// Map career path to database categories
			const { getDatabaseCategoriesForForm } = await import(
				"@/Utils/matching/categoryMapper"
			);
			const careerPathCategories = getDatabaseCategoriesForForm(
				user.career_path,
			);
			if (careerPathCategories.length > 0) {
				query = query.overlaps("categories", careerPathCategories);
			}
		}

		// Filter for early-career roles
		query = query.or(
			"is_internship.eq.true,is_graduate.eq.true,categories.cs.{early-career}",
		);

		// Get recent jobs (last 60 days)
		const sixtyDaysAgo = new Date();
		sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

		query = query
			.gte("created_at", sixtyDaysAgo.toISOString())
			.order("created_at", { ascending: false })
			.limit(500); // Fetch more for better matching pool

		const { data: allJobs, error: jobsError } = await query;

		if (jobsError || !allJobs || allJobs.length === 0) {
			apiLogger.warn("Ghost matches: No jobs found", jobsError as Error, {
				email,
			});
			return NextResponse.json({
				ghostMatchCount: 0,
				message: "No additional matches found",
			});
		}

		// Filter out existing matches
		const availableJobs = allJobs.filter(
			(job) => !existingJobHashes.has(job.job_hash),
		);

		if (availableJobs.length === 0) {
			return NextResponse.json({
				ghostMatchCount: 0,
				message: "No additional matches found",
			});
		}

		// Use rule-based matching only (no AI - cost optimization)
		// This is "lite" premium matching
		const userPrefs: UserPreferences = {
			email: user.email,
			target_cities: user.target_cities || [],
			languages_spoken: user.languages_spoken || [],
			career_path: user.career_path ? [user.career_path] : [],
			roles_selected: user.roles_selected || [],
			entry_level_preference: user.entry_level_preference || "",
			professional_expertise: user.professional_expertise || "",
			work_environment: user.work_environment || "",
			visa_status: user.visa_status || "",
			company_types: user.company_types || [],
			industries: user.industries || [],
			company_size_preference: user.company_size_preference || "any",
			skills: user.skills || [],
			career_keywords: user.career_keywords || undefined,
			subscription_tier: "free", // Mark as free for rule-based only
		};

		// Use consolidated matcher with forceRulesBased flag
		const matcher = createConsolidatedMatcher(process.env.OPENAI_API_KEY);
		const matchResult = await matcher.performMatching(
			availableJobs,
			userPrefs,
			true, // forceRulesBased = true (no AI, cost-free)
		);

		// Get top matches (limit to 5-8 for FOMO effect)
		const ghostMatches = matchResult.matches
			.filter((m) => m.match_score >= 0.6) // Only show good matches
			.slice(0, 8)
			.map((m) => ({
				job_hash: m.job_hash,
				match_score: m.match_score,
				match_reason: m.match_reason,
			}));

		const ghostMatchCount = ghostMatches.length;

		apiLogger.info("Ghost matches calculated", {
			email,
			ghostMatchCount,
			totalJobsScanned: availableJobs.length,
			method: "rule_based",
		});

		return NextResponse.json({
			ghostMatchCount,
			message:
				ghostMatchCount > 0
					? `${ghostMatchCount} more high-quality matches found via AI. Upgrade to Premium to unlock.`
					: "No additional matches found",
		});
	} catch (error) {
		apiLogger.error("Ghost matches API error", error as Error);
		return NextResponse.json(
			{
				error: "Failed to calculate ghost matches",
				ghostMatchCount: 0,
			},
			{ status: 500 },
		);
	}
}
