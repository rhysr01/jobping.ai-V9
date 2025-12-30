/**
 * Create Billing Portal Session
 *
 * POST /api/stripe-connect/billing-portal
 *
 * Creates a billing portal session for customers to manage subscriptions.
 * Works with subscriptions on connected accounts.
 */

import { type NextRequest, NextResponse } from "next/server";
import { apiLogger } from "@/lib/api-logger";
import { ENV } from "@/lib/env";
import { getStripeClientForAccount, isStripeConfigured } from "@/lib/stripe";

export async function POST(req: NextRequest) {
	try {
		if (!isStripeConfigured()) {
			return NextResponse.json(
				{ error: "Stripe Connect is not configured" },
				{ status: 503 },
			);
		}

		const { accountId, customerId, returnUrl } = await req.json();

		if (!accountId || !customerId) {
			return NextResponse.json(
				{ error: "accountId and customerId are required" },
				{ status: 400 },
			);
		}

		const stripe = getStripeClientForAccount(accountId);
		const baseUrl =
			ENV.NEXT_PUBLIC_URL ||
			(process.env.VERCEL_URL
				? `https://${process.env.VERCEL_URL}`
				: "http://localhost:3000");

		// Create billing portal session
		const session = await stripe.billingPortal.sessions.create(
			{
				customer: customerId,
				return_url: returnUrl || `${baseUrl}/store/${accountId}`,
			},
			{
				stripeAccount: accountId,
			},
		);

		apiLogger.info("Billing portal session created", {
			accountId,
			customerId,
			sessionId: session.id,
		});

		return NextResponse.json({
			success: true,
			url: session.url,
		});
	} catch (error: any) {
		apiLogger.error("Failed to create billing portal session", error, {
			errorType: error.type,
			errorCode: error.code,
		});

		return NextResponse.json(
			{
				error: "Failed to create billing portal session",
				details: error.message,
			},
			{ status: 500 },
		);
	}
}
