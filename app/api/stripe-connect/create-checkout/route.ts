/**
 * Create Checkout Session (Direct Charge to Connected Account)
 *
 * POST /api/stripe-connect/create-checkout
 *
 * Creates a Checkout session that charges directly to a connected account.
 * Platform receives application fee (if configured).
 */

import { type NextRequest, NextResponse } from "next/server";
import { apiLogger } from "@/lib/api-logger";
import { ENV } from "@/lib/env";
import {
	getStripeClientForAccount,
	isStripeConfigured,
} from "@/lib/stripe";

export async function POST(req: NextRequest) {
	try {
		if (!isStripeConfigured()) {
			return NextResponse.json(
				{ error: "Stripe Connect is not configured" },
				{ status: 503 },
			);
		}

		const {
			accountId,
			priceId,
			successUrl,
			cancelUrl,
			customerEmail,
			applicationFeePercent = 0, // Platform fee percentage (0-100)
		} = await req.json();

		if (!accountId || !priceId) {
			return NextResponse.json(
				{ error: "accountId and priceId are required" },
				{ status: 400 },
			);
		}

		const stripeAccount = getStripeClientForAccount(accountId);
		const baseUrl =
			ENV.NEXT_PUBLIC_URL ||
			(process.env.VERCEL_URL
				? `https://${process.env.VERCEL_URL}`
				: "http://localhost:3000");

		// Get price details from connected account to determine mode
		const price = await stripeAccount.prices.retrieve(priceId);

		// Create checkout session on connected account
		// For Express accounts, checkout sessions are created on the connected account
		// Platform fee is handled via application_fee_percent
		const sessionParams: any = {
			payment_method_types: ["card"],
			line_items: [
				{
					price: priceId,
					quantity: 1,
				},
			],
			mode: price.recurring ? "subscription" : "payment",
			success_url: successUrl || `${baseUrl}/store/${accountId}?success=true`,
			cancel_url: cancelUrl || `${baseUrl}/store/${accountId}?canceled=true`,
			customer_email: customerEmail || undefined,
		};

		// Add application fee if specified (platform fee)
		if (applicationFeePercent > 0) {
			if (price.recurring) {
				// For subscriptions, use application_fee_percent
				sessionParams.subscription_data = {
					application_fee_percent: applicationFeePercent,
				};
			} else {
				// For one-time payments, calculate fee amount
				const amount = price.unit_amount || 0;
				const applicationFeeAmount = Math.round(
					amount * (applicationFeePercent / 100),
				);
				sessionParams.payment_intent_data = {
					application_fee_amount: applicationFeeAmount,
				};
			}
		}

		// Create session on connected account
		const session = await stripeAccount.checkout.sessions.create(sessionParams);

		apiLogger.info("Checkout session created for connected account", {
			accountId,
			sessionId: session.id,
			priceId,
		});

		return NextResponse.json({
			success: true,
			sessionId: session.id,
			url: session.url,
		});
	} catch (error: any) {
		apiLogger.error("Failed to create checkout session", error as Error, {
			errorType: error.type,
			errorCode: error.code,
		});

		return NextResponse.json(
			{
				error: "Failed to create checkout session",
				details: error.message,
			},
			{ status: 500 },
		);
	}
}
