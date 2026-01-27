import { type NextRequest, NextResponse } from "next/server";
import { asyncHandler } from "../../../../lib/errors";
import { apiLogger } from "../../../../lib/api-logger";
import { getDatabaseClient } from "../../../../utils/core/database-pool";
import { getProductionRateLimiter } from "../../../../utils/production-rate-limiter";

export const GET = asyncHandler(async (request: NextRequest) => {
	// Rate limiting - prevent abuse
	const rateLimitResult = await getProductionRateLimiter().middleware(
		request,
		"matches-premium",
		{
			windowMs: 60 * 1000, // 1 minute
			maxRequests: 60, // Premium users get higher limits (60 requests/min)
		},
	);

	if (rateLimitResult) {
		return rateLimitResult;
	}

	// Get user email from unified cookie (set by signup API for all tiers)
	const cookies = request.cookies;
	const userEmail = cookies
		.get("user_email")
		?.value?.toLowerCase()
		.trim();

	if (!userEmail) {
		apiLogger.warn("Premium matches accessed without cookie", {
			ip:
				request.headers.get("x-forwarded-for") ||
				request.headers.get("x-real-ip"),
			userAgent: request.headers.get("user-agent"),
		});
		return NextResponse.json(
			{
				error: "authentication_required",
				message: "Please upgrade to premium to access your enhanced matches.",
			},
			{ status: 401 },
		);
	}

	const supabase = getDatabaseClient();

	// Verify user exists and is premium tier
	const { data: user } = await supabase
		.from("users")
		.select("id, subscription_tier, email, subscription_active")
		.eq("email", userEmail)
		.maybeSingle();

	if (!user) {
		apiLogger.warn("Premium matches - user not found", {
			email: userEmail,
		});
		return NextResponse.json(
			{
				error: "user_not_found",
				message:
					"Premium account not found. Please sign up for premium access.",
			},
			{ status: 404 },
		);
	}

	// Verify user has premium access
	if (user.subscription_tier !== "premium" || !user.subscription_active) {
		apiLogger.warn("Premium matches - user not premium", {
			email: userEmail,
			tier: user.subscription_tier,
			active: user.subscription_active,
		});
		return NextResponse.json(
			{
				error: "premium_required",
				message: "Premium subscription required to access enhanced matches.",
			},
			{ status: 403 },
		);
	}

	// Get user's matches with job details (premium gets more comprehensive data)
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
				visa_sponsorship,
				career_path,
				primary_category,
				career_paths,
				work_arrangement,
				work_mode,
				employment_type,
				job_type,
				contract_type,
				source,
				language_requirements
			)
		`)
		.eq("user_email", userEmail)
		.order("match_score", { ascending: false })
		.order("matched_at", { ascending: false });

	if (matchesError) {
		apiLogger.error(
			"Failed to fetch premium user matches",
			matchesError as Error,
			{
				email: userEmail,
			},
		);
		return NextResponse.json(
			{
				error: "database_error",
				message: "Failed to load your premium matches. Please try again.",
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
			visa_confidence: jobData?.visa_friendly ? "verified" : "likely", // Premium gets better visa confidence
			visa_confidence_label: jobData?.visa_friendly
				? "Visa Friendly"
				: "Likely Compatible",
			categories: jobData?.categories || [],
			is_internship: jobData?.is_internship,
			is_graduate: jobData?.is_graduate,
			posted_at: jobData?.posted_at,
			experience_required: jobData?.experience_required,
			salary_min: jobData?.salary_min,
			salary_max: jobData?.salary_max,
			visa_sponsorship: jobData?.visa_sponsorship,
			// Premium-only fields
			career_path: jobData?.career_path,
			primary_category: jobData?.primary_category,
			career_paths: jobData?.career_paths,
			work_arrangement: jobData?.work_arrangement,
			work_mode: jobData?.work_mode,
			employment_type: jobData?.employment_type,
			job_type: jobData?.job_type,
			contract_type: jobData?.contract_type,
			source: jobData?.source,
			language_requirements: jobData?.language_requirements,
		};
	});

	// Get target companies for this premium user (more detailed for premium)
	const { data: targetCompanies } = await supabase
		.from("matches")
		.select(`
			jobs:job_hash (
				company,
				posted_at,
				career_path,
				primary_category
			)
		`)
		.eq("user_email", userEmail)
		.order("matched_at", { ascending: false });

	// Aggregate target companies with premium-level detail
	const companyStats = new Map<
		string,
		{
			count: number;
			lastMatchedAt: string;
			roles: string[];
			careerPaths: string[];
			latestCategory: string;
		}
	>();
	(targetCompanies || []).forEach((match: any) => {
		const company = match.jobs?.company;
		const postedAt = match.jobs?.posted_at;
		const careerPath = match.jobs?.career_path;
		const category = match.jobs?.primary_category;
		if (company && postedAt) {
			const existing = companyStats.get(company) || {
				count: 0,
				lastMatchedAt: postedAt,
				roles: [] as string[],
				careerPaths: [] as string[],
				latestCategory: category || "",
			};
			existing.count++;
			existing.lastMatchedAt =
				postedAt > existing.lastMatchedAt ? postedAt : existing.lastMatchedAt;
			if (careerPath && !existing.careerPaths.includes(careerPath)) {
				existing.careerPaths.push(careerPath);
			}
			if (category) {
				existing.latestCategory = category;
			}
			companyStats.set(company, existing);
		}
	});

	const targetCompaniesArray = Array.from(companyStats.entries())
		.map(([company, stats]) => ({
			company,
			lastMatchedAt: stats.lastMatchedAt,
			matchCount: stats.count,
			roles: stats.roles,
			careerPaths: stats.careerPaths,
			latestCategory: stats.latestCategory,
		}))
		.sort((a, b) => b.matchCount - a.matchCount)
		.slice(0, 10); // Premium gets top 10 companies

	apiLogger.info("Premium matches loaded successfully", {
		email: userEmail,
		matchCount: transformedMatches.length,
		targetCompaniesCount: targetCompaniesArray.length,
		tier: user.subscription_tier,
	});

	return NextResponse.json({
		jobs: transformedMatches,
		targetCompanies: targetCompaniesArray,
		user: {
			email: user.email,
			tier: user.subscription_tier,
			active: user.subscription_active,
		},
		// Premium-specific metadata
		premiumFeatures: {
			enhancedVisaConfidence: true,
			detailedJobData: true,
			expandedTargetCompanies: true,
			prioritySupport: true,
		},
	});
});
