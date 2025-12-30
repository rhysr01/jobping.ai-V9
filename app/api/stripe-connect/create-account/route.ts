/**
 * Create Stripe Connect Account (V2)
 *
 * POST /api/stripe-connect/create-account
 *
 * Creates a new Stripe Connect Express account for a user.
 * Returns the account ID and onboarding URL.
 */

import { type NextRequest, NextResponse } from "next/server";
import { apiLogger } from "@/lib/api-logger";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe";
import { getDatabaseClient } from "@/Utils/databasePool";

export async function POST(req: NextRequest) {
	try {
		// Check if Stripe is configured
		if (!isStripeConfigured()) {
			return NextResponse.json(
				{
					error:
						"Stripe Connect is not configured. Please set STRIPE_SECRET_KEY.",
				},
				{ status: 503 },
			);
		}

		const { userId, email, country = "US" } = await req.json();

		if (!userId || !email) {
			return NextResponse.json(
				{ error: "userId and email are required" },
				{ status: 400 },
			);
		}

		const stripe = getStripeClient();
		const supabase = getDatabaseClient();

		// Check if user already has a Connect account
		const { data: existingAccount } = await supabase
			.from("stripe_connect_accounts")
			.select("account_id, onboarding_complete")
			.eq("user_id", userId)
			.single();

		if (existingAccount) {
			apiLogger.info("User already has Connect account", {
				userId,
				accountId: existingAccount.account_id,
			});

			return NextResponse.json({
				success: true,
				accountId: existingAccount.account_id,
				onboardingComplete: existingAccount.onboarding_complete,
				message: "Account already exists",
			});
		}

		// Create Stripe Connect Express account (V2)
		const account = await stripe.accounts.create({
			type: "express", // V2 Express account
			country: country,
			email: email,
			capabilities: {
				card_payments: { requested: true },
				transfers: { requested: true },
			},
			business_type: "individual", // or 'company' if needed
		});

		apiLogger.info("Stripe Connect account created", {
			accountId: account.id,
			userId,
			country,
		});

		// Store account in database
		const { error: dbError } = await supabase
			.from("stripe_connect_accounts")
			.insert({
				user_id: userId,
				account_id: account.id,
				email: email,
				country: country,
				onboarding_complete: false,
				created_at: new Date().toISOString(),
			});

		if (dbError) {
			apiLogger.error(
				"Failed to store Connect account in database",
				dbError as Error,
				{
					accountId: account.id,
					userId,
				},
			);
			// Continue anyway - account is created in Stripe
		}

		return NextResponse.json({
			success: true,
			accountId: account.id,
			onboardingComplete: false,
			message:
				"Account created successfully. Call /api/stripe-connect/create-account-link to start onboarding.",
		});
	} catch (error: any) {
		apiLogger.error("Failed to create Stripe Connect account", error, {
			errorType: error.type,
			errorCode: error.code,
		});

		return NextResponse.json(
			{
				error: "Failed to create Connect account",
				details: error.message,
			},
			{ status: 500 },
		);
	}
}
