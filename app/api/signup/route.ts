import { type NextRequest, NextResponse } from "next/server";
import { apiLogger } from "@/lib/api-logger";
import type { JobWithMetadata } from "@/lib/types/job";
import { createConsolidatedMatcher } from "@/Utils/consolidatedMatchingV2";
import { getDatabaseClient } from "@/Utils/databasePool";
import { sendMatchedJobsEmail, sendWelcomeEmail } from "@/Utils/email/sender";
// Pre-filtering removed - AI handles semantic matching
import { getDatabaseCategoriesForForm } from "@/Utils/matching/categoryMapper";
import { getDistributionStats } from "@/Utils/matching/jobDistribution";
import { getProductionRateLimiter } from "@/Utils/productionRateLimiter";

// Helper function to safely send welcome email and update tracking
async function sendWelcomeEmailAndTrack(
	email: string,
	userName: string,
	tier: "premium", // This API is premium-only - free users use /api/signup/free
	matchCount: number,
	supabase: any,
	context: string,
): Promise<boolean> {
	try {
		await sendWelcomeEmail({
			to: email,
			userName,
			matchCount,
			tier,
		});

		await supabase
			.from("users")
			.update({
				last_email_sent: new Date().toISOString(),
				email_count: 1,
			})
			.eq("email", email);

		apiLogger.info(`Welcome email (${context}) sent to user`, { email });
		if (process.env.NODE_ENV === "development") {
			console.log(
				`[SIGNUP] ✅ Welcome email (${context}) sent successfully to ${email}`,
			);
		}
		return true;
	} catch (emailError) {
		const errorMessage =
			emailError instanceof Error ? emailError.message : String(emailError);
		const errorStack =
			emailError instanceof Error ? emailError.stack : undefined;
		apiLogger.error(`Welcome email (${context}) failed`, emailError as Error, {
			email,
			errorMessage,
			errorStack,
			errorType: emailError?.constructor?.name,
			rawError: String(emailError),
		});
		return false;
	}
}

export async function POST(req: NextRequest) {
	try {
		// Rate limiting - prevent abuse of expensive AI matching
		const rateLimitResult = await getProductionRateLimiter().middleware(
			req,
			"signup",
		);
		if (rateLimitResult) {
			return rateLimitResult;
		}

		const data = await req.json();

		// Validate required fields
		if (
			!data.email ||
			!data.fullName ||
			!data.cities ||
			data.cities.length === 0
		) {
			// Track validation failure
			apiLogger.info("signup_failed_validation", {
				event: "signup_failed_validation",
				reason: "missing_required_fields",
				hasEmail: !!data.email,
				hasFullName: !!data.fullName,
				hasCities: !!(data.cities && data.cities.length > 0),
				timestamp: new Date().toISOString(),
			});
			return NextResponse.json(
				{ error: "Missing required fields" },
				{ status: 400 },
			);
		}

		const supabase = getDatabaseClient();

		// Check if user already exists
		const normalizedEmail = data.email.toLowerCase().trim();
		const { data: existingUser } = await supabase
			.from("users")
			.select("email, last_email_sent, email_count")
			.eq("email", normalizedEmail)
			.single();

		if (existingUser) {
			apiLogger.info("User already exists", { email: normalizedEmail });
			return NextResponse.json(
				{
					error: "Email already registered",
					code: "DUPLICATE_EMAIL",
				},
				{ status: 409 },
			);
		}

		// This is the premium signup API - free users use /api/signup/free
		const subscriptionTier: "premium" = "premium";

		// Create user in database
		const userData = {
			email: normalizedEmail,
			full_name: data.fullName.trim(),
			target_cities: data.cities,
			languages_spoken: data.languages || [],
			start_date: null, // Removed from form - not used in matching
			professional_experience: null, // Removed from form - not used in matching (entry_level_preference is used instead)
			professional_expertise: data.careerPath || "entry", // For matching system
			work_environment:
				Array.isArray(data.workEnvironment) && data.workEnvironment.length > 0
					? data.workEnvironment.join(", ")
					: null,
			visa_status: data.visaStatus || null,
			entry_level_preference:
				Array.isArray(data.entryLevelPreferences) &&
				data.entryLevelPreferences.length > 0
					? data.entryLevelPreferences.join(", ")
					: null,
			company_types: data.targetCompanies || [],
			career_path: data.careerPath || null,
			roles_selected: data.roles || [],
			// NEW MATCHING PREFERENCES
			remote_preference:
				Array.isArray(data.workEnvironment) &&
				data.workEnvironment.includes("Remote")
					? "remote"
					: Array.isArray(data.workEnvironment) &&
							data.workEnvironment.includes("Hybrid")
						? "hybrid"
						: "flexible",
			industries: data.industries || [],
			company_size_preference: data.companySizePreference || "any",
			skills: data.skills || [],
			career_keywords: data.careerKeywords || null,
			subscription_tier: subscriptionTier,
			email_verified: true, // All users are automatically verified on signup - no verification email needed
			subscription_active: true,
			email_phase: "welcome", // Start in welcome phase
			onboarding_complete: false, // Will be set to true after first email
			email_count: 0, // Will increment after first email
			last_email_sent: null, // Will be set after first email
			created_at: new Date().toISOString(),
		};

		const { data: user, error: userError } = await supabase
			.from("users")
			.insert([userData])
			.select()
			.single();

		if (userError) {
			// Handle duplicate email case (shouldn't happen due to check above, but handle gracefully)
			if (
				userError.code === "23505" ||
				userError.message?.includes("duplicate key")
			) {
				apiLogger.warn("Duplicate email detected during insert", {
					email: normalizedEmail,
				});
				return NextResponse.json(
					{
						error: "Email already registered",
						code: "DUPLICATE_EMAIL",
					},
					{ status: 409 },
				);
			}

			// Handle RLS policy violation (42501) - indicates service role key issue
			if (userError.code === "42501") {
				const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
				const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
				const hasServiceRoleKey = !!serviceRoleKey;
				const hasAnonKey = !!anonKey;
				// Only compare if both exist
				const keysMatch =
					hasServiceRoleKey && hasAnonKey && serviceRoleKey === anonKey;

				// Additional diagnostic: Check what key the client is actually using
				const clientKey =
					process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
				const clientKeyPrefix = clientKey ? clientKey.substring(0, 20) : "N/A";
				const _anonKeyPrefix = anonKey ? anonKey.substring(0, 20) : "N/A";

				// Check if service role key looks valid (JWT format, correct length)
				const looksLikeServiceRole =
					serviceRoleKey &&
					serviceRoleKey.length > 100 &&
					serviceRoleKey.startsWith("eyJ");

				apiLogger.error(
					"RLS policy violation during user creation",
					userError as Error,
					{
						email: data.email,
						errorCode: userError.code,
						errorMessage: userError.message,
						hasServiceRoleKey,
						hasAnonKey,
						serviceRoleKeyLength: serviceRoleKey?.length || 0,
						anonKeyLength: anonKey?.length || 0,
						keysMatch,
						looksLikeServiceRole,
						serviceRoleKeyPrefix: serviceRoleKey
							? serviceRoleKey.substring(0, 20)
							: "N/A",
						anonKeyPrefix: anonKey ? anonKey.substring(0, 20) : "N/A",
						clientKeyPrefix,
						keysAreIdentical: keysMatch,
						hint: keysMatch
							? 'CRITICAL: Service role key and anon key are the SAME! This is why RLS is blocking. The service role key MUST be different from the anon key. Go to Supabase Dashboard → Settings → API → copy the "service_role" key (NOT "anon public") and update SUPABASE_SERVICE_ROLE_KEY in Vercel.'
							: !hasServiceRoleKey
								? "SUPABASE_SERVICE_ROLE_KEY is missing in production environment! Add it in Vercel → Settings → Environment Variables."
								: !looksLikeServiceRole
									? 'Service role key format looks incorrect. Service role keys should be 200+ characters and start with "eyJ". Verify you copied the correct "service_role" key from Supabase Dashboard → Settings → API → Service Role Key.'
									: "Service role key is set but RLS is blocking. Possible causes: 1) RLS policies not applied (run migrations/fix_signup_rls_service_role.sql), 2) Key was rotated in Supabase but not updated in Vercel, 3) Wrong project key. Verify the key is the service_role key from Supabase Dashboard → Settings → API → Service Role Key.",
					},
				);
				return NextResponse.json(
					{
						error: "Failed to create user",
						code: "RLS_POLICY_VIOLATION",
						details: keysMatch
							? "Service role key and anon key are identical. Update SUPABASE_SERVICE_ROLE_KEY with the correct service_role key from Supabase."
							: hasServiceRoleKey
								? "Service role key configured but RLS blocking. Verify the key is the service_role key (not anon key) from Supabase Dashboard → Settings → API."
								: "SUPABASE_SERVICE_ROLE_KEY missing in production.",
					},
					{ status: 500 },
				);
			}

			apiLogger.error("Failed to create user", userError as Error, {
				email: data.email,
				errorCode: userError.code,
				errorMessage: userError.message,
			});
			return NextResponse.json(
				{ error: "Failed to create user" },
				{ status: 500 },
			);
		}

		apiLogger.info(`User created`, { email: data.email });

		// Track signup success event
		apiLogger.info("signup_success", {
			event: "signup_success",
			email: data.email,
			tier: "premium",
			timestamp: new Date().toISOString(),
		});

		// Trigger instant matching and email (only for premium users)
		let matchesCount = 0;
		let emailSent = false;

		// IDEMPOTENCY CHECK: Check if matches already exist before expensive operations
		const { data: existingMatches } = await supabase
			.from("matches")
			.select("job_hash")
			.eq("user_email", normalizedEmail)
			.limit(1);

		if (existingMatches && existingMatches.length > 0) {
			apiLogger.info(
				"Matches already exist for user, skipping expensive matching",
				{
					email: normalizedEmail,
					existingMatchCount: existingMatches.length,
				},
			);
			if (process.env.NODE_ENV === "development") {
				console.log(
					`[SIGNUP] ✅ Matches already exist for ${normalizedEmail}, skipping expensive matching`,
				);
			}

			// Get actual match count
			const { count: matchCount } = await supabase
				.from("matches")
				.select("*", { count: "exact", head: true })
				.eq("user_email", normalizedEmail);

			matchesCount = matchCount || 0;

			// Send email with existing matches (idempotent path)
			if (matchesCount > 0) {
				// Fetch existing matches to send in email
				const { data: existingMatchData } = await supabase
					.from("matches")
					.select("job_hash, match_score, match_reason")
					.eq("user_email", normalizedEmail)
					.order("match_score", { ascending: false })
					.limit(10);

				if (existingMatchData && existingMatchData.length > 0) {
					// Fetch full job data for email
					const jobHashes = existingMatchData.map((m) => m.job_hash);
					const { data: existingJobs } = await supabase
						.from("jobs")
						.select("*")
						.in("job_hash", jobHashes);

					if (existingJobs && existingJobs.length > 0) {
						const jobsForEmail = existingJobs.map((job) => {
							const match = existingMatchData.find(
								(m) => m.job_hash === job.job_hash,
							);
							return {
								...job,
								match_score: match?.match_score || 0,
								match_reason: match?.match_reason || "",
							};
						});

						try {
							await sendMatchedJobsEmail({
								to: userData.email,
								jobs: jobsForEmail,
								userName: userData.full_name,
								subscriptionTier: "premium",
								isSignupEmail: true,
								subjectOverride: `Welcome to JobPing - Your ${matchesCount} Matches!`,
								userPreferences: {
									career_path: userData.career_path,
									target_cities: userData.target_cities,
									visa_status: userData.visa_status,
									entry_level_preference: userData.entry_level_preference,
									work_environment: userData.work_environment,
								},
							});

							await supabase
								.from("users")
								.update({
									last_email_sent: new Date().toISOString(),
									email_count: 1,
								})
								.eq("email", userData.email);

							emailSent = true;
							apiLogger.info("Email sent with existing matches (idempotent)", {
								email: normalizedEmail,
								matchCount: matchesCount,
							});
						} catch (_emailError) {
							// Error already logged via apiLogger below
						}
					}
				}
			} else {
				// No matches but user exists - send welcome email
				emailSent = await sendWelcomeEmailAndTrack(
					userData.email,
					userData.full_name,
					"premium",
					0,
					supabase,
					"idempotent - no matches",
				);
			}
		} else {
			// No existing matches - proceed with expensive matching
			// This is the premium signup API - always send emails
			try {
				apiLogger.info("Starting email sending process for premium user", {
					email: data.email,
				});

				const _matcher = createConsolidatedMatcher(process.env.OPENAI_API_KEY);

				// OPTIMIZED: Fetch jobs using database-level filtering for better performance
				// Use the same optimized approach as match-users route
				apiLogger.info("Fetching jobs for matching", {
					email: data.email,
					cities: userData.target_cities,
				});
				if (process.env.NODE_ENV === "development") {
					console.log(
						`[SIGNUP] Fetching jobs for cities: ${JSON.stringify(userData.target_cities)}`,
					);
				}

				// Map career path to database categories for filtering
				let careerPathCategories: string[] = [];
				if (userData.career_path) {
					careerPathCategories = getDatabaseCategoriesForForm(
						userData.career_path,
					);
				}

				// Build optimized query using database indexes
				// Select all fields needed for email template (including tags, work_environment, etc.)
				let query = supabase
					.from("jobs")
					.select("*")
					.eq("is_active", true)
					.eq("status", "active")
					.is("filtered_reason", null);

				// CRITICAL: Filter by cities at database level (uses idx_jobs_city index)
				if (userData.target_cities && userData.target_cities.length > 0) {
					query = query.in("city", userData.target_cities);
				}

				// QUALITY-FOCUSED: Filter by career path at database level for quality matches
				// This ensures graduates get relevant, high-quality matches
				// But we'll still show quality jobs even if exact match isn't found
				if (careerPathCategories.length > 0) {
					// Use overlaps to find jobs with ANY matching category (flexible but quality-focused)
					query = query.overlaps("categories", careerPathCategories);
				}

				query = query.order("created_at", { ascending: false }).limit(1000);

				const { data: allJobs, error: jobsError } = await query;

				if (jobsError) {
					apiLogger.error("Failed to fetch jobs", jobsError as Error, {
						email: data.email,
					});
					throw jobsError;
				}

				// NEW ARCHITECTURE: "Funnel of Truth"
				// Stage 1: SQL Filter (already done - is_active, city, categories)
				// Stage 2-4: Hard Gates + Pre-Ranking + AI (handled in consolidatedMatchingV2)
				// Stage 5: Diversity Pass (in distributeJobsWithDiversity)
				const userPrefs = {
					email: userData.email,
					target_cities: userData.target_cities,
					languages_spoken: userData.languages_spoken,
					career_path: userData.career_path ? [userData.career_path] : [],
					roles_selected: userData.roles_selected,
					entry_level_preference: userData.entry_level_preference,
					professional_expertise: userData.career_path || "",
					work_environment: userData.work_environment,
					visa_status: userData.visa_status,
					company_types: userData.company_types || [],
					// Extended preferences from premium signup form
					industries: userData.industries || [],
					company_size_preference: userData.company_size_preference || "any",
					skills: userData.skills || [],
					career_keywords: userData.career_keywords || undefined,
					subscription_tier: "premium" as const, // TIER-AWARE: Mark as premium tier
				};

				// Pass all jobs to matching engine - it handles hard gates and pre-ranking
				const jobsForMatching = allJobs || [];

				apiLogger.info("Jobs for matching", {
					email: data.email,
					allJobsCount: allJobs?.length || 0,
					note: "Matching engine handles hard gates, pre-ranking, and AI matching",
				});
				if (process.env.NODE_ENV === "development") {
					console.log(
						`[SIGNUP] Using ${allJobs?.length || 0} jobs, matching engine will handle filtering and ranking`,
					);
				}

				try {
					// Initialize distributedJobs at function scope
					// TYPE SHIM: Using JobWithMetadata instead of any[]
					let distributedJobs: JobWithMetadata[] = [];
					let coordinatedResult: any = null;
					let _fallbackMetadata: {
						targetCompanies?: Array<{
							company: string;
							lastMatchedAt: string;
							matchCount: number;
							roles: string[];
						}>;
						customScan?: {
							scanId: string;
							estimatedTime: string;
							message: string;
						};
						relaxationLevel?: number;
					} | null = null;

					if (jobsForMatching && jobsForMatching.length > 0) {
						if (process.env.NODE_ENV === "development") {
							console.log(
								`[SIGNUP] Found ${jobsForMatching.length} jobs, using coordinator pattern...`,
							);
						}

						// Use coordinator pattern for guaranteed matching
						const { coordinatePremiumMatching } = await import(
							"@/Utils/matching/guaranteed/coordinator"
						);

						// Extract work environment preferences from form data
						const targetWorkEnvironments: string[] =
							Array.isArray(data.workEnvironment) &&
							data.workEnvironment.length > 0
								? data.workEnvironment // Form values: ['Office', 'Hybrid', 'Remote']
								: [];

						// Normalize jobs to ensure language_requirements is always an array
						const normalizedJobs = jobsForMatching.map((job) => ({
							...job,
							language_requirements: job.language_requirements || [],
						}));

						coordinatedResult = await coordinatePremiumMatching(
							normalizedJobs as any,
							userPrefs as any,
							supabase,
							{
								targetCount: 10,
								targetCities: userData.target_cities || [],
								targetWorkEnvironments: targetWorkEnvironments,
							},
						);

						// Extract matches (already distributed)
						distributedJobs = coordinatedResult.matches.map((m: any) => ({
							...m.job,
							match_score: m.match_score,
							match_reason: m.match_reason,
						}));

						if (process.env.NODE_ENV === "development") {
							console.log(
								`[SIGNUP] Coordinator complete: ${distributedJobs.length} matches found (method: ${coordinatedResult.metadata.matchingMethod})`,
							);
						}

						// Store metadata for success page (if fallback was used)
						if (coordinatedResult.metadata.matchingMethod !== "ai_success") {
							_fallbackMetadata = {
								targetCompanies:
									coordinatedResult.targetCompanies.length > 0
										? coordinatedResult.targetCompanies
										: undefined,
								customScan: coordinatedResult.customScan || undefined,
								relaxationLevel: coordinatedResult.metadata.relaxationLevel,
							};
						}

						// CRITICAL: If no jobs, trigger guaranteed matching with broader query
						if (distributedJobs.length === 0) {
							apiLogger.warn(
								"No jobs from coordinator, attempting guaranteed matching",
								{
									email: data.email,
								},
							);

							// Fetch ALL active jobs (no filters)
							const { data: allActiveJobs } = await supabase
								.from("jobs")
								.select("*")
								.eq("is_active", true)
								.eq("status", "active")
								.is("filtered_reason", null)
								.order("created_at", { ascending: false })
								.limit(2000);

							if (allActiveJobs && allActiveJobs.length > 0) {
								// Normalize jobs to ensure language_requirements is always an array
								const normalizedAllJobs = allActiveJobs.map((job) => ({
									...job,
									language_requirements: job.language_requirements || [],
								}));
								const guaranteedResult = await coordinatePremiumMatching(
									normalizedAllJobs as any,
									userPrefs as any,
									supabase,
									{
										targetCount: 10,
										targetCities: userData.target_cities || [],
										targetWorkEnvironments: targetWorkEnvironments,
									},
								);

								distributedJobs = guaranteedResult.matches.map((m) => ({
									...m.job,
									match_score: m.match_score,
									match_reason: m.match_reason,
								}));

								coordinatedResult = guaranteedResult;
								_fallbackMetadata = {
									targetCompanies:
										guaranteedResult.targetCompanies.length > 0
											? guaranteedResult.targetCompanies
											: undefined,
									customScan: guaranteedResult.customScan || undefined,
									relaxationLevel: guaranteedResult.metadata.relaxationLevel,
								};
							}

							// If still no jobs, trigger custom scan
							if (distributedJobs.length === 0) {
								const { triggerCustomScan, extractMissingCriteria } =
									await import("@/Utils/matching/guaranteed/custom-scan");
								const missingCriteria = extractMissingCriteria(userPrefs, []);
								const customScan = await triggerCustomScan(
									supabase,
									userPrefs,
									missingCriteria,
								);

								_fallbackMetadata = {
									customScan,
									relaxationLevel: 7,
								};

								// Don't throw error - proceed with welcome email and custom scan info
								apiLogger.warn("No jobs found, custom scan triggered", {
									email: data.email,
									scanId: customScan.scanId,
								});
							}
						}

						// Log distribution stats if we have matches
						if (distributedJobs.length > 0) {
							const stats = getDistributionStats(distributedJobs);
							apiLogger.info("Job distribution stats", {
								email: data.email,
								sourceDistribution: stats.sourceDistribution,
								cityDistribution: stats.cityDistribution,
								totalJobs: stats.totalJobs,
								matchingMethod:
									coordinatedResult?.metadata?.matchingMethod || "unknown",
								relaxationLevel:
									coordinatedResult?.metadata?.relaxationLevel || 0,
							});
							if (process.env.NODE_ENV === "development") {
								console.log(
									`[SIGNUP] Distribution: Sources=${JSON.stringify(stats.sourceDistribution)}, Cities=${JSON.stringify(stats.cityDistribution)}`,
								);
							}
						}

						// Save matches
						// CRITICAL FIX: Ensure distributedJobs is defined and is an array before processing
						if (!Array.isArray(distributedJobs)) {
							apiLogger.error(
								"distributedJobs is not an array",
								new Error("Type mismatch"),
								{
									email: data.email,
									type: typeof distributedJobs,
								},
							);
							throw new Error("distributedJobs is not an array");
						}

						// CRITICAL: Process matches in a way that avoids closure issues
						// Create a helper function to process each job
						const userEmailForMatches = userData.email;
						const matchAlgorithmForMatches =
							coordinatedResult?.metadata?.matchingMethod || "ai_success";

						const processJobForMatch = (job: any) => {
							if (!job || !job.job_hash) {
								return null;
							}
							return {
								user_email: userEmailForMatches,
								job_hash: String(job.job_hash),
								match_score: Number(job.match_score) || 85,
								match_reason: String(job.match_reason || "AI match"),
							};
						};

						const matchesToSave: Array<{
							user_email: string;
							job_hash: string;
							match_score: number;
							match_reason: string;
						}> = [];
						for (const job of distributedJobs) {
							const processed = processJobForMatch(job);
							if (processed) {
								matchesToSave.push(processed);
							}
						}

						const processMatchForEntry = (match: {
							user_email: string;
							job_hash: string;
							match_score: number;
							match_reason: string;
						}) => {
							return {
								user_email: String(match.user_email),
								job_hash: String(match.job_hash),
								match_score: Number((match.match_score || 85) / 100),
								match_reason: String(match.match_reason || "AI match"),
								matched_at: new Date().toISOString(),
								created_at: new Date().toISOString(),
								match_algorithm: String(matchAlgorithmForMatches),
							};
						};

						const matchEntries: Array<{
							user_email: string;
							job_hash: string;
							match_score: number;
							match_reason: string;
							matched_at: string;
							created_at: string;
							match_algorithm: string;
						}> = [];
						for (const match of matchesToSave) {
							matchEntries.push(processMatchForEntry(match));
						}

						// CRITICAL DEBUG: Log what we're trying to save (without using map to avoid closure issues)
						const debugEntries: Array<{
							user_email: string;
							job_hash: string;
							match_score: number;
							hasJobHash: boolean;
						}> = [];
						for (const m of matchEntries) {
							debugEntries.push({
								user_email: m.user_email,
								job_hash: m.job_hash,
								match_score: m.match_score,
								hasJobHash: !!m.job_hash,
							});
						}
						if (process.env.NODE_ENV === "development") {
							console.log(
								`[SIGNUP] 🔍 Attempting to save ${matchEntries.length} matches:`,
								{
									email: data.email,
									matchEntriesCount: matchEntries.length,
									sampleEntry: debugEntries[0] || null,
								},
							);

							// CRITICAL: Verify we have valid match entries before attempting save
							if (matchEntries.length === 0) {
								apiLogger.error(
									"No match entries to save",
									new Error("No match entries"),
									{
										email: data.email,
										distributedJobsLength: distributedJobs.length,
										matchesToSaveLength: matchesToSave.length,
									},
								);
								matchesCount = 0;
							} else {
								const { data: savedMatches, error: saveError } = await supabase
									.from("matches")
									.upsert(matchEntries, {
										onConflict: "user_email,job_hash",
									})
									.select();

								if (saveError) {
									apiLogger.error(
										"Failed to save matches",
										saveError as Error,
										{
											email: data.email,
											matchEntriesCount: matchEntries.length,
											errorCode: saveError.code,
											errorMessage: saveError.message,
											errorDetails: saveError.details,
											errorHint: saveError.hint,
										},
									);
									// Don't throw - continue with email send even if match save fails
									matchesCount = 0;
								} else {
									matchesCount = matchEntries.length;
									const actualSavedCount = savedMatches?.length || 0;
									apiLogger.info(`Saved ${matchesCount} matches for user`, {
										email: data.email,
										matchCount: matchesCount,
										savedMatchesCount: actualSavedCount,
									});
									if (process.env.NODE_ENV === "development") {
										console.log(
											`[SIGNUP] ✅ Successfully saved ${matchesCount} matches for ${data.email} (DB returned ${actualSavedCount})`,
										);
									}

									// CRITICAL DEBUG: Verify matches can be queried back immediately
									if (actualSavedCount > 0) {
										// Wait a tiny bit for DB consistency
										await new Promise((resolve) => setTimeout(resolve, 100));

										const { data: verifyMatches, error: verifyError } =
											await supabase
												.from("matches")
												.select("*")
												.eq("user_email", data.email)
												.limit(10);

										if (verifyError) {
											console.error(
												`[SIGNUP] ❌ Failed to verify matches:`,
												verifyError,
											);
										} else {
											console.log(
												`[SIGNUP] �� Verification query returned ${verifyMatches?.length || 0} matches`,
											);
											if (verifyMatches && verifyMatches.length > 0) {
												console.log(`[SIGNUP] 🔍 Sample verified match:`, {
													id: verifyMatches[0].id,
													user_email: verifyMatches[0].user_email,
													job_hash: verifyMatches[0].job_hash,
													match_score: verifyMatches[0].match_score,
													match_algorithm: verifyMatches[0].match_algorithm,
												});

												// Also check if the job exists in jobs table
												const { data: jobCheck, error: jobCheckError } =
													await supabase
														.from("jobs")
														.select("job_hash, title, company")
														.eq("job_hash", verifyMatches[0].job_hash)
														.single();

												if (jobCheckError) {
													console.warn(
														`[SIGNUP] ⚠️ Job ${verifyMatches[0].job_hash} not found in jobs table:`,
														jobCheckError.message,
													);
												} else {
													console.log(`[SIGNUP] ✅ Job exists:`, {
														job_hash: jobCheck.job_hash,
														title: jobCheck.title,
														company: jobCheck.company,
													});
												}
											}
										}
									} else {
										apiLogger.warn(
											"No matches returned from DB after save",
											new Error("DB inconsistency"),
											{
												email: data.email,
												expectedCount: matchesCount,
											},
										);
									}
								} // end else for saveError
							} // end else for matchEntries.length > 0

							// Send welcome email with matched jobs
							try {
								apiLogger.info("Preparing to send matched jobs email", {
									email: data.email,
									matchesCount,
									jobsToSend: distributedJobs.length,
								});
								if (process.env.NODE_ENV === "development") {
									console.log(
										`[SIGNUP] Preparing to send matched jobs email to ${data.email} with ${distributedJobs.length} jobs`,
									);
								}

								// CRITICAL: Validate jobs array before sending
								if (!distributedJobs || distributedJobs.length === 0) {
									throw new Error(
										`Cannot send email: distributedJobs is empty. Matches saved: ${matchesCount}`,
									);
								}

								const matchedJobs = distributedJobs;

								await sendMatchedJobsEmail({
									to: userData.email,
									jobs: matchedJobs,
									userName: userData.full_name,
									subscriptionTier: "premium",
									isSignupEmail: true,
									subjectOverride: ` Welcome to JobPing - Your First ${matchesCount} Matches!`,
									userPreferences: {
										career_path: userData.career_path,
										target_cities: userData.target_cities,
										visa_status: userData.visa_status,
										entry_level_preference: userData.entry_level_preference,
										work_environment: userData.work_environment,
									},
								});

								// Update user tracking fields after successful email send
								await supabase
									.from("users")
									.update({
										last_email_sent: new Date().toISOString(),
										email_count: 1,
									})
									.eq("email", userData.email);

								emailSent = true;
								apiLogger.info(`Welcome email sent to user`, {
									email: data.email,
									matchCount: matchesCount,
								});
							} catch (emailError) {
								const errorMessage =
									emailError instanceof Error
										? emailError.message
										: String(emailError);
								const errorStack =
									emailError instanceof Error ? emailError.stack : undefined;
								apiLogger.error(
									"Email send failed (non-fatal)",
									emailError as Error,
									{
										email: data.email,
										errorMessage,
										errorStack,
										errorType: emailError?.constructor?.name,
										rawError: String(emailError),
									},
								);
							}
						} else {
							// No matches found, send welcome email anyway
							apiLogger.info("No matches found, sending welcome email", {
								email: data.email,
							});

							// Track zero matches event
							apiLogger.info("no_initial_matches", {
								event: "no_initial_matches",
								email: data.email,
								reason: "ai_matching_returned_zero",
								cities: userData.target_cities,
								careerPath: userData.career_path,
								timestamp: new Date().toISOString(),
							});

							emailSent = await sendWelcomeEmailAndTrack(
								userData.email,
								userData.full_name,
								"premium",
								0,
								supabase,
								"no matches",
							);
						}
					} else {
						// No jobs found in database, send welcome email anyway
						apiLogger.info(
							`No jobs found for user cities, sending welcome email`,
							{ email: data.email, cities: userData.target_cities },
						);

						// Track zero matches event
						apiLogger.info("no_initial_matches", {
							event: "no_initial_matches",
							email: data.email,
							reason: "no_jobs_in_database",
							cities: userData.target_cities,
							timestamp: new Date().toISOString(),
						});

						emailSent = await sendWelcomeEmailAndTrack(
							userData.email,
							userData.full_name,
							"premium",
							0,
							supabase,
							"no jobs",
						);
					}
				} catch (matchError) {
					apiLogger.warn("Matching failed (non-fatal)", matchError as Error, {
						email: data.email,
					});
					apiLogger.info(
						"Matching failed, attempting to send welcome email anyway",
						{ email: data.email },
					);
					emailSent = await sendWelcomeEmailAndTrack(
						userData.email,
						userData.full_name,
						"premium",
						0,
						supabase,
						"matching failed",
					);
				}
			} catch (emailError) {
				apiLogger.warn(
					"Email sending process failed (non-fatal)",
					emailError as Error,
					{
						email: data.email,
					},
				);
				// Send welcome email even if process fails
				emailSent = await sendWelcomeEmailAndTrack(
					userData.email,
					userData.full_name,
					"premium",
					0,
					supabase,
					"process failed",
				);
			}
		}

		// Log final status
		apiLogger.info(`Signup completed`, {
			email: data.email,
			matchesCount,
			emailSent,
			emailStatus: emailSent ? "sent" : "not_sent",
		});
		if (process.env.NODE_ENV === "development") {
			console.log(`[SIGNUP] ===== FINAL STATUS =====`);
			console.log(`[SIGNUP] Email: ${data.email}`);
			console.log(`[SIGNUP] Matches: ${matchesCount}`);
			console.log(`[SIGNUP] Email Sent: ${emailSent ? "YES ✅" : "NO ❌"}`);
			console.log(`[SIGNUP] ========================`);
		}

		// SAFETY NET: Ensure email is sent even if something went wrong
		if (!emailSent) {
			apiLogger.warn("Email not sent yet, attempting safety net send", {
				email: data.email,
			});
			apiLogger.warn(
				"Email not sent during normal flow, attempting safety net",
				{ email: data.email },
			);
			emailSent = await sendWelcomeEmailAndTrack(
				userData.email,
				userData.full_name,
				"premium",
				matchesCount,
				supabase,
				"safety net",
			);
		}

		// Track final signup completion with match count
		apiLogger.info("signup_completed", {
			event: "signup_completed",
			email: data.email,
			matchesCount,
			emailSent,
			tier: "premium",
			timestamp: new Date().toISOString(),
		});

		// Include fallback metadata in response if available
		const responseData: any = {
			success: true,
			message:
				matchesCount > 0
					? `Signup successful! We found ${matchesCount} perfect matches. Check your email!`
					: "Signup successful! We're finding your matches now. Check your email soon!",
			matchesCount,
			emailSent,
			email: userData.email,
			redirectUrl: `/signup/success?tier=premium&email=${encodeURIComponent(userData.email)}&matches=${matchesCount}`,
		};

		// Add fallback metadata if available (will be fetched by metadata API, but include for immediate use)
		// Note: Metadata is primarily fetched via /api/signup/metadata for decoupling

		return NextResponse.json(responseData);
	} catch (error) {
		apiLogger.error("Signup error", error as Error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
