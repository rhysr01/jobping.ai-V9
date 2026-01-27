/**
 * Cron Endpoint: Cleanup Expired Users
 * Schedule: Daily at 2 AM UTC
 * Purpose: Auto-delete free users after 30 days & premium_pending after 7 days
 * 
 * KISS Principles:
 * - Single responsibility: Just run cleanup functions
 * - Simple logic: No complex filtering or conditions
 * - Database handles cascade deletes via FK constraints
 * - No secrets in code: Uses standard authentication
 */

import { type NextRequest, NextResponse } from "next/server";
import { apiLogger } from "../../../../lib/api-logger";
import { getDatabaseClient } from "../../../../utils/core/database-pool";

export const maxDuration = 60; // 1 minute timeout

export async function POST(request: NextRequest) {
	try {
		// Verify this is a legitimate cron request
		const authHeader = request.headers.get("authorization");
		const expectedAuth = `Bearer ${process.env.SYSTEM_API_KEY}`;

		if (authHeader !== expectedAuth && process.env.NODE_ENV === "production") {
			apiLogger.warn("Unauthorized cleanup request", {
				ip: request.headers.get("x-forwarded-for"),
			});
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

	const supabase = getDatabaseClient();
	const startTime = Date.now();

	apiLogger.info("Starting cleanup of expired users");

	// 🟢 FIXED BUG #15: Wrap each cleanup in try/catch to ensure both run
	// even if one fails
	let freeUsersDeleted = 0;
	let freeMatchesDeleted = 0;
	let premiumUsersDeleted = 0;
	let premiumMatchesDeleted = 0;
	const errors: string[] = [];

	// Step 1: Cleanup free users (30 days expired)
	try {
		const freeCleanupResult = await supabase.rpc(
			"cleanup_expired_free_users",
		);

		if (freeCleanupResult.error) {
			throw new Error(
				`Free user cleanup failed: ${freeCleanupResult.error.message}`,
			);
		}

		[freeUsersDeleted, freeMatchesDeleted] = freeCleanupResult.data || [0, 0];

		apiLogger.info("Free user cleanup completed", {
			usersDeleted: freeUsersDeleted,
			matchesDeleted: freeMatchesDeleted,
		});
	} catch (freeCleanupError) {
		const errorMessage =
			freeCleanupError instanceof Error
				? freeCleanupError.message
				: "Unknown error";
		apiLogger.error("Free user cleanup failed", freeCleanupError as Error, {
			error: errorMessage,
		});
		errors.push(`Free user cleanup: ${errorMessage}`);
		// Continue to premium cleanup even if free cleanup fails
	}

	// Step 2: Cleanup premium_pending users (7 days unverified)
	try {
		const premiumCleanupResult = await supabase.rpc(
			"cleanup_expired_premium_pending",
		);

		if (premiumCleanupResult.error) {
			throw new Error(
				`Premium pending cleanup failed: ${premiumCleanupResult.error.message}`,
			);
		}

		[premiumUsersDeleted, premiumMatchesDeleted] =
			premiumCleanupResult.data || [0, 0];

		apiLogger.info("Premium pending cleanup completed", {
			usersDeleted: premiumUsersDeleted,
			matchesDeleted: premiumMatchesDeleted,
		});
	} catch (premiumCleanupError) {
		const errorMessage =
			premiumCleanupError instanceof Error
				? premiumCleanupError.message
				: "Unknown error";
		apiLogger.error("Premium pending cleanup failed", premiumCleanupError as Error, {
			error: errorMessage,
		});
		errors.push(`Premium pending cleanup: ${errorMessage}`);
		// Continue despite error - some cleanup is better than none
	}

	// Step 3: Summary
	const totalUsersDeleted = freeUsersDeleted + premiumUsersDeleted;
	const totalMatchesDeleted = freeMatchesDeleted + premiumMatchesDeleted;
	const duration = Date.now() - startTime;

	const summary = {
		success: errors.length === 0,
		duration,
		freed: {
			users: freeUsersDeleted,
			matches: freeMatchesDeleted,
		},
		premium: {
			users: premiumUsersDeleted,
			matches: premiumMatchesDeleted,
		},
		total: {
			users: totalUsersDeleted,
			matches: totalMatchesDeleted,
		},
		...(errors.length > 0 && { errors }),
	};

	apiLogger.info("Cleanup completed", summary);

	return NextResponse.json(summary);
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : String(error);

		apiLogger.error("Cleanup job failed", error as Error, {
			error: errorMessage,
		});

		return NextResponse.json(
			{
				success: false,
				error: errorMessage,
			},
			{ status: 500 },
		);
	}
}
