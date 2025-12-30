import { type NextRequest, NextResponse } from "next/server";
import { apiLogger } from "@/lib/api-logger";
import { getDatabaseClient } from "@/Utils/databasePool";
import { sendMatchedJobsEmail } from "@/Utils/email/sender";

export async function POST(req: NextRequest) {
	try {
		const { email } = await req.json();

		if (!email) {
			return NextResponse.json({ error: "Email required" }, { status: 400 });
		}

		const supabase = getDatabaseClient();

		// Verify user exists, is premium, and get preferences
		// Free users get instant matches on /matches page, not emails
		const { data: user, error: userError } = await supabase
			.from("users")
			.select(
				"email, full_name, subscription_tier, career_path, target_cities, visa_status, entry_level_preference, work_environment",
			)
			.eq("email", email)
			.eq("active", true)
			.single();

		if (userError || !user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		// Only premium users can resend emails
		if (user.subscription_tier !== "premium") {
			return NextResponse.json(
				{
					error:
						"Email resend is only available for premium users. Free users can view matches instantly on the /matches page.",
				},
				{ status: 403 },
			);
		}

		// Get user's matches
		const { data: matches, error: matchesError } = await supabase
			.from("matches")
			.select("job_hash, match_score, match_reason")
			.eq("user_email", email)
			.order("matched_at", { ascending: false })
			.limit(10);

		if (matchesError) {
			console.error("Error fetching matches:", matchesError);
		}

		// Get job details for matches
		let jobs = [];
		if (matches && matches.length > 0) {
			const jobHashes = matches.map((m) => m.job_hash);
			const { data: jobData } = await supabase
				.from("jobs")
				.select("*")
				.in("job_hash", jobHashes)
				.eq("is_active", true);

			if (jobData) {
				jobs = jobData.map((job) => {
					const match = matches.find((m) => m.job_hash === job.job_hash);
					return {
						...job,
						match_score: match?.match_score || 85,
						match_reason: match?.match_reason || "AI match",
					};
				});
			}
		}

		// Send email
		await sendMatchedJobsEmail({
			to: user.email,
			jobs: jobs.slice(0, 5), // Send top 5 matches
			userName: user.full_name,
			subscriptionTier: user.subscription_tier || "free",
			isSignupEmail: false,
			subjectOverride: "Your JobPing Matches - Resent",
			userPreferences: {
				career_path: user.career_path,
				target_cities: user.target_cities,
				visa_status: user.visa_status,
				entry_level_preference: user.entry_level_preference,
				work_environment: user.work_environment,
			},
		});

		apiLogger.info("Resend email sent", { email });

		return NextResponse.json({
			success: true,
			message: "Email resent successfully",
			jobsSent: Math.min(jobs.length, 5),
		});
	} catch (error) {
		console.error("Resend email error:", error);
		apiLogger.error("Resend email failed", error as Error);
		return NextResponse.json(
			{ error: "Failed to resend email" },
			{ status: 500 },
		);
	}
}
