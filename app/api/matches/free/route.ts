import { type NextRequest, NextResponse } from "next/server";
import { asyncHandler } from "../../../../lib/errors";
import { apiLogger } from "../../../../lib/api-logger";
import { getDatabaseClient } from "../../../../utils/core/database-pool";
import { getProductionRateLimiter } from "../../../../utils/production-rate-limiter";

export const GET = asyncHandler(async (request: NextRequest) => {
	// Rate limiting - prevent abuse
	const rateLimitResult = await getProductionRateLimiter().middleware(
		request,
		"matches-free",
		{
			windowMs: 60 * 1000, // 1 minute
			maxRequests: 30, // 30 requests per minute per IP (allows reasonable browsing)
		},
	);

	if (rateLimitResult) {
		return rateLimitResult;
	}

	// Get user email from unified cookie (set by signup API for all tiers)
	const cookies = request.cookies;
	const userEmail = cookies.get("user_email")?.value?.toLowerCase().trim();

	if (!userEmail) {
		apiLogger.warn("Free matches accessed without cookie", {
			ip:
				request.headers.get("x-forwarded-for") ||
				request.headers.get("x-real-ip"),
			userAgent: request.headers.get("user-agent"),
		});
		return NextResponse.json(
			{
				error: "authentication_required",
				message: "Please sign up first to view your matches.",
			},
			{ status: 401 },
		);
	}

	const supabase = getDatabaseClient();

	// Verify user exists and is free tier
	const { data: user } = await supabase
		.from("users")
		.select("id, subscription_tier, email")
		.eq("email", userEmail)
		.maybeSingle();

	if (!user) {
		apiLogger.warn("Free matches - user not found", {
			email: userEmail,
		});
		return NextResponse.json(
			{
				error: "user_not_found",
				message: "User account not found. Please sign up again.",
			},
			{ status: 404 },
		);
	}

	// Get user's matches with job details
	const { data: matches, error: matchesError } = await supabase
		.from("matches")
		.select(`
			job_hash,
			match_score,
			match_reason,
			matched_at,
			jobs:job_hash (
				id,
				job_hash,
				title,
				company,
				company_name,
				location,
				city,
				country,
				description,
				job_url,
				work_environment,
				categories,
				is_internship,
				is_graduate,
				visa_friendly,
				posted_at,
				experience_required,
				salary_min,
				salary_max,
				visa_sponsorship
			)
		`)
		.eq("user_email", userEmail)
		.order("match_score", { ascending: false })
		.order("matched_at", { ascending: false });

	if (matchesError) {
		apiLogger.error(
			"Failed to fetch free user matches",
			matchesError as Error,
			{
				email: userEmail,
			},
		);
		return NextResponse.json(
			{
				error: "database_error",
				message: "Failed to load your matches. Please try again.",
			},
			{ status: 500 },
		);
	}

	// Transform the data - Supabase returns jobs as nested objects, we need to flatten them
	const transformedMatches = (matches || []).map((match: any) => {
		const jobData = match.jobs;
		return {
			id: jobData?.id,
			job_hash: match.job_hash,
			title: jobData?.title,
			company: jobData?.company,
			company_name: jobData?.company_name,
			location: jobData?.location,
			city: jobData?.city,
			country: jobData?.country,
			description: jobData?.description,
			url: jobData?.job_url,
			job_url: jobData?.job_url,
			work_environment: jobData?.work_environment,
			match_score: match.match_score,
			match_reason: match.match_reason,
			visa_confidence: jobData?.visa_friendly ? "likely" : "unknown",
			visa_confidence_label: jobData?.visa_friendly
				? "Visa Friendly"
				: "Unknown",
			categories: jobData?.categories || [],
			is_internship: jobData?.is_internship,
			is_graduate: jobData?.is_graduate,
			posted_at: jobData?.posted_at,
			experience_required: jobData?.experience_required,
			salary_min: jobData?.salary_min,
			salary_max: jobData?.salary_max,
			visa_sponsorship: jobData?.visa_sponsorship,
		};
	});

	// Get target companies for this user (companies that have been hiring recently)
	const { data: targetCompanies } = await supabase
		.from("matches")
		.select(`
			jobs:job_hash (
				company,
				posted_at
			)
		`)
		.eq("user_email", userEmail)
		.order("matched_at", { ascending: false });

	// Aggregate target companies
	const companyStats = new Map<
		string,
		{ count: number; lastMatchedAt: string; roles: string[] }
	>();
	(targetCompanies || []).forEach((match: any) => {
		const company = match.jobs?.company;
		const postedAt = match.jobs?.posted_at;
		if (company && postedAt) {
			const existing = companyStats.get(company) || {
				count: 0,
				lastMatchedAt: postedAt,
				roles: [],
			};
			existing.count++;
			existing.lastMatchedAt =
				postedAt > existing.lastMatchedAt ? postedAt : existing.lastMatchedAt;
			companyStats.set(company, existing);
		}
	});

	const targetCompaniesArray = Array.from(companyStats.entries())
		.map(([company, stats]) => ({
			company,
			lastMatchedAt: stats.lastMatchedAt,
			matchCount: stats.count,
			roles: stats.roles,
		}))
		.sort((a, b) => b.matchCount - a.matchCount)
		.slice(0, 5); // Top 5 companies

	apiLogger.info("Free matches loaded successfully", {
		email: userEmail,
		matchCount: transformedMatches.length,
		targetCompaniesCount: targetCompaniesArray.length,
	});

	return NextResponse.json({
		jobs: transformedMatches,
		targetCompanies: targetCompaniesArray,
		user: {
			email: user.email,
			tier: user.subscription_tier,
		},
	});
});
