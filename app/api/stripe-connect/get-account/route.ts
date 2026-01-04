/**
 * Get Stripe Connect Account Details
 *
 * GET /api/stripe-connect/get-account?accountId=acct_xxx
 *
 * Retrieves account information including onboarding status and requirements.
 */

import { type NextRequest, NextResponse } from "next/server";
import { apiLogger } from "@/lib/api-logger";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe";

export async function GET(req: NextRequest) {
	try {
		if (!isStripeConfigured()) {
			return NextResponse.json(
				{ error: "Stripe Connect is not configured" },
				{ status: 503 },
			);
		}

		const { searchParams } = new URL(req.url);
		const accountId = searchParams.get("accountId");

		if (!accountId) {
			return NextResponse.json(
				{ error: "accountId query parameter is required" },
				{ status: 400 },
			);
		}

		const stripe = getStripeClient();

		// Retrieve account details
		const account = await stripe.accounts.retrieve(accountId);

		// Check if account is ready to accept payments
		const chargesEnabled = account.charges_enabled || false;
		const payoutsEnabled = account.payouts_enabled || false;
		const detailsSubmitted = account.details_submitted || false;

		// Get requirements that still need to be completed
		const requirements = account.requirements || null;
		const currentlyDue = requirements?.currently_due || [];
		const pastDue = requirements?.past_due || [];
		const pendingVerification = requirements?.pending_verification || [];

		apiLogger.info("Account retrieved", {
			accountId,
			chargesEnabled,
			payoutsEnabled,
			detailsSubmitted,
		});

		return NextResponse.json({
			success: true,
			account: {
				id: account.id,
				email: account.email,
				country: account.country,
				type: account.type,
				chargesEnabled,
				payoutsEnabled,
				detailsSubmitted,
				requirements: {
					currentlyDue,
					pastDue,
					pendingVerification,
				},
			},
		});
	} catch (error: any) {
		apiLogger.error("Failed to retrieve account", error as Error, {
			errorType: error.type,
			errorCode: error.code,
		});

		if (error.code === "resource_missing") {
			return NextResponse.json({ error: "Account not found" }, { status: 404 });
		}

		return NextResponse.json(
			{
				error: "Failed to retrieve account",
				details: error.message,
			},
			{ status: 500 },
		);
	}
}
