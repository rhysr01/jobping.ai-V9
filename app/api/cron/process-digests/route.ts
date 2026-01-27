/**
 * CRON ENDPOINT: Process Pending Digests
 * Runs periodically to send queued digest emails
 * Checks for digests where scheduled_for <= now() and sends them
 */

import { type NextRequest, NextResponse } from "next/server";
import { apiLogger } from "../../../../lib/api-logger";
import { getDatabaseClient } from "../../../../utils/core/database-pool";
import { sendMatchedJobsEmail } from "../../../../utils/email/sender";

// Simple replacement for distributeJobsWithDiversity
function distributeJobsWithDiversity(jobs: any[], options: any) {
	// Simple implementation: just return first N jobs
	const { targetCount = 10 } = options;
	return jobs.slice(0, targetCount);
}

export async function POST(request: NextRequest) {
	try {
		// Authentication check
		const authHeader = request.headers.get("authorization");
		const cronSecret = process.env.CRON_SECRET;
		const systemKey = process.env.SYSTEM_API_KEY;
		const apiKey = request.headers.get("x-api-key");

		const isVercelCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
		const isSystemKey = systemKey && apiKey === systemKey;

		if (!isVercelCron && !isSystemKey) {
			apiLogger.warn("Unauthorized digest processing attempt", {
				hasAuthHeader: !!authHeader,
				hasApiKey: !!apiKey,
			});
			return NextResponse.json(
				{ error: "Unauthorized: Invalid or missing authentication" },
				{ status: 401 },
			);
		}

		const supabase = getDatabaseClient();
		const now = new Date().toISOString();

		// Fetch ready digests (scheduled_for <= now, not sent, not cancelled)
		const { data: readyDigests, error: fetchError } = await supabase
			.from("pending_digests")
			.select("*")
			.lte("scheduled_for", now)
			.eq("sent", false)
			.eq("cancelled", false)
			.order("scheduled_for", { ascending: true })
			.limit(50); // Process max 50 digests per run to avoid timeout

		if (fetchError) {
			apiLogger.error("Failed to fetch pending digests", fetchError as Error);
			return NextResponse.json(
				{
					error: "Failed to fetch pending digests",
					details: fetchError.message,
				},
				{ status: 500 },
			);
		}

		if (!readyDigests || readyDigests.length === 0) {
			return NextResponse.json({
				success: true,
				message: "No digests ready to send",
				processed: 0,
			});
		}

		apiLogger.info(`Processing ${readyDigests.length} pending digests`);

		let processed = 0;
		const errors: Array<{ email: string; error: string }> = [];
		let cancelled = 0;

		for (const digest of readyDigests) {
			try {
				// Check if user still exists, is active, and is premium
				// Free users get instant matches on /matches page, not emails
				const { data: user, error: userError } = await supabase
					.from("users")
					.select(
						"email, full_name, subscription_tier, subscription_active, delivery_paused, last_email_sent, email_count",
					)
					.eq("email", digest.user_email)
					.single();

				if (userError || !user || !user.subscription_active || user.delivery_paused) {
					// Cancel digest if user doesn't exist or is inactive
					await supabase
						.from("pending_digests")
						.update({ cancelled: true, sent: true })
						.eq("id", digest.id);

					cancelled++;
					continue;
				}

				// Skip free users - they don't get emails (instant matches only)
				if (user.subscription_tier !== "premium") {
					await supabase
						.from("pending_digests")
						.update({ cancelled: true, sent: true })
						.eq("id", digest.id);

					cancelled++;
					continue;
				}

				// Check if user received email in last 24 hours (rate limit)
				if (user.last_email_sent) {
					const lastSent = new Date(user.last_email_sent);
					const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

					if (lastSent >= twentyFourHoursAgo) {
						// Reschedule for later (24 hours after last email)
						const newScheduledFor = new Date(
							lastSent.getTime() + 24 * 60 * 60 * 1000,
						);
						await supabase
							.from("pending_digests")
							.update({ scheduled_for: newScheduledFor.toISOString() })
							.eq("id", digest.id);

						apiLogger.debug("Rescheduled digest due to rate limit", {
							email: digest.user_email,
							newScheduledFor: newScheduledFor.toISOString(),
						});
						continue;
					}
				}

				// Parse job hashes from JSONB
				const jobHashes = digest.job_hashes as Array<{
					job_hash: string;
					match_score?: number;
					match_reason?: string;
				}>;

				if (!jobHashes || jobHashes.length === 0) {
					// Cancel empty digest
					await supabase
						.from("pending_digests")
						.update({ cancelled: true, sent: true })
						.eq("id", digest.id);

					cancelled++;
					continue;
				}

				// Fetch full job data for each job hash
				const hashes = jobHashes.map((j) => j.job_hash);
				const { data: jobs, error: jobsError } = await supabase
					.from("jobs")
					.select("*")
					.in("job_hash", hashes)
					.eq("is_active", true); // Only active jobs

				if (jobsError) {
					throw new Error(`Failed to fetch jobs: ${jobsError.message}`);
				}

				// Filter out inactive jobs and merge match data
				const activeJobs = (jobs || [])
					.map((job) => {
						const matchData = jobHashes.find(
							(j) => j.job_hash === job.job_hash,
						);
						return {
							...job,
							match_score: matchData?.match_score || 85,
							match_reason: matchData?.match_reason || "AI-matched",
						};
					})
					.filter((job) => job.is_active);

				// Check if we have minimum viable jobs (at least 3)
				if (activeJobs.length < 3) {
					// Cancel digest if too few active jobs
					await supabase
						.from("pending_digests")
						.update({ cancelled: true, sent: true })
						.eq("id", digest.id);

					cancelled++;
					apiLogger.info("Cancelled digest - insufficient active jobs", {
						email: digest.user_email,
						activeJobs: activeJobs.length,
						totalJobs: jobHashes.length,
					});
					continue;
				}

				// Get user preferences for distribution and email
				const { data: userPrefs } = await supabase
					.from("users")
					.select(
						"target_cities, work_environment, career_path, visa_status, entry_level_preference",
					)
					.eq("email", digest.user_email)
					.single();

				// Extract work environment preferences
				let targetWorkEnvironments: string[] = [];
				if (userPrefs?.work_environment) {
					if (Array.isArray(userPrefs.work_environment)) {
						targetWorkEnvironments = userPrefs.work_environment;
					} else if (typeof userPrefs.work_environment === "string") {
						targetWorkEnvironments = userPrefs.work_environment
							.split(",")
							.map((env) => env.trim())
							.filter(Boolean);
					}
				}

				// Apply job distribution for diversity
				const distributedJobs = distributeJobsWithDiversity(
					activeJobs as any[],
					{
						targetCount: Math.min(activeJobs.length, 10), // Max 10 jobs per digest
						targetCities: userPrefs?.target_cities || [],
						maxPerSource: Math.ceil(10 / 3),
						ensureCityBalance: true,
						targetWorkEnvironments: targetWorkEnvironments,
						ensureWorkEnvironmentBalance: targetWorkEnvironments.length > 0,
					},
				);

			// Send digest email
			// 🟢 FIXED BUG #9: Try email send first, only mark sent if successful
			let emailSentSuccessfully = false;
			try {
				await sendMatchedJobsEmail({
					to: digest.user_email,
					jobs: distributedJobs,
					userName: user.full_name || undefined,
					subscriptionTier: (user.subscription_tier || "free") as
						| "free"
						| "premium",
					isSignupEmail: false,
					subjectOverride: `Your ${distributedJobs.length} Additional Job Matches - JobPing`,
					userPreferences: {
						career_path: userPrefs?.career_path,
						target_cities: userPrefs?.target_cities,
						visa_status: userPrefs?.visa_status,
						entry_level_preference: userPrefs?.entry_level_preference,
						work_environment: userPrefs?.work_environment,
					},
				});
				emailSentSuccessfully = true;
			} catch (emailError) {
				// Email failed - mark as failed, don't save as sent
				apiLogger.error("Failed to send pending digest email", emailError as Error, {
					email: digest.user_email,
					digestId: digest.id,
				});

				// Update digest to mark email as failed (for manual retry later)
				await supabase
					.from("pending_digests")
					.update({ 
						sent: false, 
						error_message: emailError instanceof Error ? emailError.message : String(emailError),
						last_error_at: new Date().toISOString(),
					})
					.eq("id", digest.id);

				// Reschedule for retry in 1 hour
				const retryTime = new Date(Date.now() + 60 * 60 * 1000);
				await supabase
					.from("pending_digests")
					.update({ scheduled_for: retryTime.toISOString() })
					.eq("id", digest.id);

				errors.push({
					email: digest.user_email,
					error: emailError instanceof Error ? emailError.message : "Unknown error",
				});
				continue;
			}

			// Only mark as sent and update user if email succeeded
			if (emailSentSuccessfully) {
				// Mark digest as sent
				await supabase
					.from("pending_digests")
					.update({ sent: true })
					.eq("id", digest.id);

				// Update user's last_email_sent
				await supabase
					.from("users")
					.update({
						last_email_sent: new Date().toISOString(),
						email_count: (user.email_count || 0) + 1,
					})
					.eq("email", digest.user_email);

				processed++;
				apiLogger.info("Pending digest sent successfully", {
					email: digest.user_email,
					jobsSent: distributedJobs.length,
					digestId: digest.id,
				});
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			
			// This catch is for database/logic errors, not email errors (already handled above)
			apiLogger.error("Failed to process pending digest", error as Error, {
				email: digest.user_email,
				digestId: digest.id,
			});

			// Mark digest as failed for investigation
			try {
				await supabase
					.from("pending_digests")
					.update({ 
						error_message: errorMessage,
						last_error_at: new Date().toISOString(),
					})
					.eq("id", digest.id);
			} catch (updateError) {
				apiLogger.warn(
					"Failed to mark digest error status",
					updateError as Error,
					{ digestId: digest.id },
				);
			}

			errors.push({
				email: digest.user_email,
				error: errorMessage,
			});
		}
		}

		return NextResponse.json({
			success: true,
			message: "Digest processing completed",
			processed,
			cancelled,
			errors: errors.length > 0 ? errors : undefined,
			totalReady: readyDigests.length,
		});
	} catch (error) {
		apiLogger.error("Digest processing failed", error as Error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

// GET endpoint for health check
export async function GET() {
	const supabase = getDatabaseClient();
	const now = new Date().toISOString();

	try {
		const { count: readyCount } = await supabase
			.from("pending_digests")
			.select("id", { count: "exact", head: true })
			.lte("scheduled_for", now)
			.eq("sent", false)
			.eq("cancelled", false);

		const { count: totalPending } = await supabase
			.from("pending_digests")
			.select("id", { count: "exact", head: true })
			.eq("sent", false)
			.eq("cancelled", false);

		return NextResponse.json({
			message: "Digest processing endpoint active",
			readyToSend: readyCount || 0,
			totalPending: totalPending || 0,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		return NextResponse.json(
			{
				error: "Failed to get digest stats",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
