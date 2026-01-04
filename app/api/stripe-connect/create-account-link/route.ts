/**
 * Create Stripe Connect Account Link (Onboarding)
 *
 * POST /api/stripe-connect/create-account-link
 *
 * Creates an onboarding link for a Connect account.
 * User must complete onboarding before they can accept payments.
 */

import { type NextRequest, NextResponse } from "next/server";
import { apiLogger } from "@/lib/api-logger";
import { ENV } from "@/lib/env";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe";

export async function POST(req: NextRequest) {
	try {
		if (!isStripeConfigured()) {
			return NextResponse.json(
				{ error: "Stripe Connect is not configured" },
				{ status: 503 },
			);
		}

		const { accountId, refreshUrl, returnUrl } = await req.json();

		if (!accountId) {
			return NextResponse.json(
				{ error: "accountId is required" },
				{ status: 400 },
			);
		}

		const stripe = getStripeClient();

		// Get base URL from environment or request
		const baseUrl =
			ENV.NEXT_PUBLIC_URL ||
			(process.env.VERCEL_URL
				? `https://${process.env.VERCEL_URL}`
				: "http://localhost:3000");

		// Create account link for onboarding
		const accountLink = await stripe.accountLinks.create({
			account: accountId,
			refresh_url: refreshUrl || `${baseUrl}/onboard?refresh=true`,
			return_url: returnUrl || `${baseUrl}/dashboard?onboarded=true`,
			type: "account_onboarding",
		});

		apiLogger.info("Account link created", {
			accountId,
			linkUrl: accountLink.url,
		});

		return NextResponse.json({
			success: true,
			url: accountLink.url,
			expiresAt: accountLink.expires_at,
		});
	} catch (error: any) {
		apiLogger.error("Failed to create account link", error as Error, {
			errorType: error.type,
			errorCode: error.code,
		});

		return NextResponse.json(
			{
				error: "Failed to create account link",
				details: error.message,
			},
			{ status: 500 },
		);
	}
}
