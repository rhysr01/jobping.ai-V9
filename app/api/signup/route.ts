import { type NextRequest, NextResponse } from "next/server";
import { apiLogger } from "../../../lib/api-logger";
import { asyncHandler } from "../../../lib/errors";
import { getDatabaseClient } from "../../../utils/core/database-pool";
import {
	sendMatchedJobsEmail,
	sendWelcomeEmail,
} from "../../../utils/email/sender";
import { sendVerificationEmail } from "../../../utils/email-verification";
// Pre-filtering removed - AI handles semantic matching
import { getProductionRateLimiter } from "../../../utils/production-rate-limiter";
import { SignupMatchingService } from "../../../utils/services/SignupMatchingService";

// 🔴 BUG FIX #5: Promo code validation moved to reusable function
const VALID_PROMO_CODES = ["rhys"]; // Add more codes here as needed

function isPromoCodeValid(code: string, expiresAt: string): boolean {
	return (
		VALID_PROMO_CODES.includes(code.toLowerCase()) &&
		new Date(expiresAt) > new Date()
	);
}

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
			apiLogger.info(
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

export const POST = asyncHandler(async (req: NextRequest) => {
	// Rate limiting - prevent abuse of expensive AI matching
	const rateLimitResult = await getProductionRateLimiter().middleware(
		req,
		"signup",
	);
	if (rateLimitResult) {
		return rateLimitResult;
	}

	const data = await req.json();

	// Validate required fields including GDPR compliance
	if (
		!data.email ||
		!data.fullName ||
		!data.cities ||
		data.cities.length === 0 ||
		data.ageVerified !== true ||
		data.termsAccepted !== true
	) {
		// Track validation failure
		apiLogger.info("signup_failed_validation", {
			event: "signup_failed_validation",
			reason: "missing_required_fields",
			hasEmail: !!data.email,
			hasFullName: !!data.fullName,
			hasCities: !!(data.cities && data.cities.length > 0),
			hasAgeVerification: !!data.ageVerified,
			hasTermsAcceptance: !!data.termsAccepted,
			timestamp: new Date().toISOString(),
		});
		return NextResponse.json(
			{
				error: "missing_required_fields",
				message:
					"Please fill in all required fields: email, full name, at least one city, age verification, and terms acceptance.",
			},
			{ status: 400 },
		);
	}

	const supabase = getDatabaseClient();

	// Check if user already exists
	const normalizedEmail = data.email.toLowerCase().trim();
	const { data: existingUser } = await supabase
		.from("users")
		.select("id, email, last_email_sent, email_count")
		.eq("email", normalizedEmail)
		.single();

	// 🔴 BUG FIX #6: Idempotency check - moved BEFORE user creation
	// Check if user already has matches before doing expensive operations
	const { data: existingMatches } = await supabase
		.from("matches")
		.select("job_hash")
		.eq("user_email", normalizedEmail)
		.limit(1);

	if (existingUser) {
		// Check if it's a free user upgrading to premium
		const { data: userDetails } = await supabase
			.from("users")
			.select("subscription_tier, active")
			.eq("email", normalizedEmail)
			.single();

		if (userDetails?.subscription_tier === "free" && userDetails?.active) {
			// Free user upgrading to premium - update their account
			apiLogger.info("Free user upgrading to premium", {
				email: normalizedEmail,
			});

			const { error: upgradeError } = await supabase
				.from("users")
				.update({
					subscription_tier: "premium",
					subscription_active: true,
					email_verified: false, // Require verification for premium features
					updated_at: new Date().toISOString(),
				})
				.eq("email", normalizedEmail);

			if (upgradeError) {
				apiLogger.error(
					"Failed to upgrade free user to premium",
					upgradeError as Error,
					{
						email: normalizedEmail,
					},
				);
				throw upgradeError;
			}

			// Return success for upgrade
			return NextResponse.json({
				success: true,
				message: "Successfully upgraded to premium!",
				userId: existingUser.id,
				wasUpgrade: true,
			});
		} else {
			// Existing premium user - allow access to matches
			// Similar to free signup behavior
			const response = NextResponse.json(
				{
					error: "account_already_exists",
					message:
						"Looks like you already have a premium JobPing account! Taking you to your enhanced matches...",
					redirectToMatches: true,
				},
				{ status: 409 },
			);

		// Set unified cookie so they can access premium matches
		// 🟢 FIXED: Using single "user_email" cookie for all tiers
		// The matches endpoints check subscription_tier in database, not cookie name
		const isProduction = process.env.NODE_ENV === "production";
		const isHttps =
			req.headers.get("x-forwarded-proto") === "https" ||
			req.url.startsWith("https://");

		response.cookies.set("user_email", normalizedEmail, {
			httpOnly: true,
			secure: isProduction && isHttps,
			sameSite: "lax",
			maxAge: 60 * 60 * 24 * 30, // 30 days
			path: "/",
		});

			apiLogger.info("Existing premium user tried to sign up again", {
				email: normalizedEmail,
				hasMatches: (existingMatches?.length || 0) > 0,
				matchCount: existingMatches?.length || 0,
			});

			return response;
		}
	}

	// Check for pending promo code
	const { data: pendingPromo } = await supabase
		.from("promo_pending")
		.select("promo_code, expires_at")
		.eq("email", normalizedEmail)
		.single();

	const hasValidPromo =
		pendingPromo && isPromoCodeValid(pendingPromo.promo_code, pendingPromo.expires_at);

	// This is the premium signup API - free users use /api/signup/free
	const subscriptionTier: "premium_pending" | "premium" = "premium_pending";

	// Handle promo code activation
	let subscriptionActive = false;
	let promoExpiresAt = null;
	let emailVerified = false; // Premium users need email verification before accessing paid features
	let finalSubscriptionTier: "premium_pending" | "premium" = subscriptionTier;

	if (hasValidPromo) {
		// Activate subscription immediately for promo users
		subscriptionActive = true;
		emailVerified = true; // Skip verification for promo users
		finalSubscriptionTier = "premium";

		// Set expiration date for 1 month free
		const expirationDate = new Date();
		expirationDate.setMonth(expirationDate.getMonth() + 1);
		promoExpiresAt = expirationDate.toISOString();
	}

	// Create user in database
	const userData = {
		email: normalizedEmail,
		full_name: data.fullName.trim(),
		target_cities: data.cities,
		languages_spoken: data.languages || [],
		start_date: null, // Removed from form - not used in matching
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
		// Form now sends long form directly (data-analytics, finance-investment, etc)
		// No conversion needed - store as-is
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
		subscription_tier: finalSubscriptionTier,
		email_verified: emailVerified,
		subscription_active: subscriptionActive,
		promo_code_used: hasValidPromo ? pendingPromo.promo_code : null,
		promo_expires_at: promoExpiresAt,
		email_phase: "welcome", // Start in welcome phase
		onboarding_complete: false, // Will be set to true after first email
		email_count: 0, // Will increment after first email
		last_email_sent: null, // Will be set after first email
		// GDPR compliance fields
		birth_year: data.birthYear || null,
		age_verified: data.ageVerified || false,
		terms_accepted: data.termsAccepted || false,
		created_at: new Date().toISOString(),
	};

	const { data: _insertedUserData, error: userError } = await supabase
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
					error: "account_already_exists",
					message:
						"An account with this email already exists. Try signing in instead, or use a different email.",
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

	// 🔴 BUG FIX #4: Email verification race condition
	// Premium users must verify email BEFORE getting matches
	// If not email verified (and not using promo code that skips verification),
	// don't run matching yet - user must verify first
	if (!emailVerified) {
		// Send email verification for premium users (required before payment)
		try {
			await sendVerificationEmail(normalizedEmail);
			apiLogger.info("Verification email sent to premium user", {
				email: normalizedEmail,
			});
		} catch (emailError) {
			apiLogger.error("Failed to send verification email", emailError as Error, {
				email: normalizedEmail,
			});
			// Don't fail signup - user can resend verification later
		}

		// Return early - don't run matching for unverified users
		return NextResponse.json({
			success: true,
			message:
				"Account created! Verify your email to access your personalized matches.",
			email: userData.email,
			verificationRequired: true,
			redirectUrl: `/signup/verify?tier=premium&email=${encodeURIComponent(userData.email)}`,
			matchesCount: 0,
			emailSent: false,
		});
	}

	// Email is verified (either user verified it or promo code skipped verification)
	// Safe to proceed with matching and email delivery
	apiLogger.info("Email verified, proceeding with premium matching", {
		email: normalizedEmail,
		skipVerification: !!hasValidPromo,
	});

	// Clean up promo_pending if promo code was used
	if (hasValidPromo) {
		await supabase.from("promo_pending").delete().eq("email", normalizedEmail);
		apiLogger.info("Promo code applied and cleaned up", {
			email: normalizedEmail,
			promoCode: pendingPromo.promo_code,
		});
	}

	// Track signup success event
	apiLogger.info("signup_success", {
		event: "signup_success",
		email: data.email,
		tier: "premium",
		hasPromo: hasValidPromo,
		timestamp: new Date().toISOString(),
	});

	// Trigger instant matching and email (only for premium users)
	let matchesCount = 0;
	let emailSent = false;

	// Note: Idempotency check was already done earlier (line ~106)
	// If matches existed, user is already handled and we returned early
	// Only new users reach this point
	if (existingMatches && existingMatches.length > 0) {
		apiLogger.info(
			"Matches already exist for user, skipping expensive matching",
			{
				email: normalizedEmail,
				existingMatchCount: existingMatches.length,
			},
		);
		if (process.env.NODE_ENV === "development") {
			apiLogger.info(
				`[SIGNUP] ✅ Matches already exist for ${normalizedEmail}, skipping expensive matching`,
			);
		}

		// Get actual match count
		const { count: matchCount } = await supabase
			.from("matches")
			.select("id", { count: "exact", head: true })
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
			.select(
				"id, title, company, location, description, job_url, job_hash, categories, work_environment, source, language_requirements, posted_at",
			)
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
		// REFACTORED: No existing matches - use consolidated matching service
		const userPrefs = {
			email: userData.email,
			target_cities: userData.target_cities,
			languages_spoken: userData.languages_spoken,
			career_path: userData.career_path || [],
			roles_selected: userData.roles_selected,
			entry_level_preference: userData.entry_level_preference,
			work_environment: userData.work_environment,
			visa_status: userData.visa_status,
			skills: userData.skills || [],
			industries: userData.industries || [],
			company_size_preference: userData.company_size_preference,
			career_keywords: userData.career_keywords,
			subscription_tier: (finalSubscriptionTier === "premium"
				? "premium"
				: "free") as "free" | "premium",
		};

		const matchingConfig = SignupMatchingService.getConfig("premium_pending");
		const matchingResult = await SignupMatchingService.runMatching(
			userPrefs,
			matchingConfig,
		);
		matchesCount = matchingResult.matchCount;

		// REFACTORED: Service handled matching and email sending
	}

	// Prepare response
	const responseData = {
		success: true,
		message: "Premium signup successful!",
		matchesCount,
		emailSent,
		email: userData.email,
		verificationRequired: true,
		redirectUrl: `/signup/verify?tier=premium&email=${encodeURIComponent(userData.email)}`,
	};

	// Add fallback metadata if available (will be fetched by metadata API, but include for immediate use)
	// Note: Metadata is primarily fetched via /api/signup/metadata for decoupling

	return NextResponse.json(responseData);
});
