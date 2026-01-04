/**
 * Stripe Billing Webhook Handler
 *
 * POST /api/webhooks/stripe-billing
 *
 * Handles webhooks for payment and subscription events:
 * - payment_intent.succeeded
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - invoice.payment_succeeded
 * - etc.
 */

import { type NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { apiLogger } from "@/lib/api-logger";
import { ENV } from "@/lib/env";
import { isStripeConfigured, verifyWebhookSignature } from "@/lib/stripe";

export async function POST(req: NextRequest) {
	try {
		if (!isStripeConfigured()) {
			return NextResponse.json(
				{ error: "Stripe is not configured" },
				{ status: 503 },
			);
		}

		const webhookSecret = ENV.STRIPE_WEBHOOK_SECRET;

		if (!webhookSecret) {
			apiLogger.error(
				"STRIPE_WEBHOOK_SECRET not configured",
				new Error("Missing webhook secret"),
			);
			return NextResponse.json(
				{ error: "Webhook secret not configured" },
				{ status: 500 },
			);
		}

		const body = await req.text();
		const signature = req.headers.get("stripe-signature");

		if (!signature) {
			return NextResponse.json(
				{ error: "Missing stripe-signature header" },
				{ status: 400 },
			);
		}

		let event: Stripe.Event;
		try {
			event = verifyWebhookSignature(body, signature, webhookSecret);
		} catch (error) {
			apiLogger.error("Webhook signature verification failed", error as Error);
			return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
		}

		apiLogger.info("Stripe billing webhook received", {
			type: event.type,
			id: event.id,
		});

		// Handle different event types
		switch (event.type) {
			case "payment_intent.succeeded": {
				const paymentIntent = event.data.object as Stripe.PaymentIntent;
				apiLogger.info("Payment succeeded", {
					paymentIntentId: paymentIntent.id,
					amount: paymentIntent.amount,
					currency: paymentIntent.currency,
				});
				// Add your payment processing logic here
				break;
			}

			case "customer.subscription.created":
			case "customer.subscription.updated": {
				const subscription = event.data.object as Stripe.Subscription;
				apiLogger.info("Subscription event", {
					subscriptionId: subscription.id,
					status: subscription.status,
					customerId: subscription.customer,
				});
				// Add your subscription handling logic here
				break;
			}

			case "customer.subscription.deleted": {
				const subscription = event.data.object as Stripe.Subscription;
				apiLogger.info("Subscription deleted", {
					subscriptionId: subscription.id,
				});
				// Add your subscription cancellation logic here
				break;
			}

			case "invoice.payment_succeeded": {
				const invoice = event.data.object as Stripe.Invoice;
				apiLogger.info("Invoice payment succeeded", {
					invoiceId: invoice.id,
					subscriptionId: invoice.subscription,
				});
				// Add your invoice handling logic here
				break;
			}

			case "invoice.payment_failed": {
				const invoice = event.data.object as Stripe.Invoice;
				apiLogger.warn("Invoice payment failed", {
					invoiceId: invoice.id,
					subscriptionId: invoice.subscription,
				});
				// Add your payment failure handling logic here
				break;
			}

			default:
				apiLogger.debug("Unhandled billing webhook event", {
					type: event.type,
				});
		}

		return NextResponse.json({ received: true });
	} catch (error: any) {
		apiLogger.error("Billing webhook handler error", error as Error, {
			errorType: error.type,
			errorCode: error.code,
		});

		return NextResponse.json(
			{ error: "Webhook handler failed" },
			{ status: 500 },
		);
	}
}
