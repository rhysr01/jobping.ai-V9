/**
 * Stripe Connect Webhook Handler
 *
 * POST /api/webhooks/stripe-connect
 *
 * Handles webhooks from Stripe for Connect account events:
 * - account.updated (requirements, onboarding status)
 * - account.application.deauthorized
 * - etc.
 */

import { type NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { apiLogger } from "@/lib/api-logger";
import { ENV } from "@/lib/env";
import { isStripeConfigured, verifyWebhookSignature } from "@/lib/stripe";
import { getDatabaseClient } from "@/utils/core/database-pool";

export async function POST(req: NextRequest) {
	try {
		if (!isStripeConfigured()) {
			return NextResponse.json(
				{ error: "Stripe Connect is not configured" },
				{ status: 503 },
			);
		}

		const webhookSecret = ENV.STRIPE_CONNECT_WEBHOOK_SECRET;

		if (!webhookSecret) {
			apiLogger.error(
				"STRIPE_CONNECT_WEBHOOK_SECRET not configured",
				new Error("Missing webhook secret"),
			);
			return NextResponse.json(
				{ error: "Webhook secret not configured" },
				{ status: 500 },
			);
		}

		// Get raw body for signature verification
		const body = await req.text();
		const signature = req.headers.get("stripe-signature");

		if (!signature) {
			return NextResponse.json(
				{ error: "Missing stripe-signature header" },
				{ status: 400 },
			);
		}

		// Verify webhook signature
		let event: Stripe.Event;
		try {
			event = verifyWebhookSignature(body, signature, webhookSecret);
		} catch (error) {
			apiLogger.error("Webhook signature verification failed", error as Error);
			return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
		}

		apiLogger.info("Stripe Connect webhook received", {
			type: event.type,
			id: event.id,
		});

		const supabase = getDatabaseClient();

		// Handle different event types
		switch (event.type) {
			case "account.updated": {
				const account = event.data.object as Stripe.Account;

				// Update account status in database
				const chargesEnabled = account.charges_enabled || false;
				const payoutsEnabled = account.payouts_enabled || false;
				const detailsSubmitted = account.details_submitted || false;

				// Check if onboarding is complete
				const onboardingComplete =
					chargesEnabled && payoutsEnabled && detailsSubmitted;

				const { error: updateError } = await supabase
					.from("stripe_connect_accounts")
					.update({
						onboarding_complete: onboardingComplete,
						charges_enabled: chargesEnabled,
						payouts_enabled: payoutsEnabled,
						details_submitted: detailsSubmitted,
						requirements_currently_due:
							account.requirements?.currently_due || [],
						requirements_past_due: account.requirements?.past_due || [],
						updated_at: new Date().toISOString(),
					})
					.eq("account_id", account.id);

				if (updateError) {
					apiLogger.error(
						"Failed to update account in database",
						updateError as Error,
						{
							accountId: account.id,
						},
					);
				} else {
					apiLogger.info("Account updated in database", {
						accountId: account.id,
						onboardingComplete,
					});
				}

				break;
			}

			case "account.application.deauthorized": {
				const account = event.data.object as unknown as Stripe.Account;

				// Mark account as deauthorized
				const { error: deauthError } = await supabase
					.from("stripe_connect_accounts")
					.update({
						deauthorized: true,
						updated_at: new Date().toISOString(),
					})
					.eq("account_id", account.id);

				if (deauthError) {
					apiLogger.error(
						"Failed to mark account as deauthorized",
						deauthError as Error,
					);
				}

				break;
			}

			default:
				apiLogger.debug("Unhandled webhook event type", {
					type: event.type,
				});
		}

		return NextResponse.json({ received: true });
	} catch (error: any) {
		apiLogger.error("Webhook handler error", error as Error, {
			errorType: error.type,
			errorCode: error.code,
		});

		return NextResponse.json(
			{ error: "Webhook handler failed" },
			{ status: 500 },
		);
	}
}
