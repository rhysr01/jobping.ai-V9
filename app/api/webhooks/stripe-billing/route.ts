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
import { apiLogger } from "../../../../lib/api-logger";
import { ENV } from "../../../../lib/env";
import {
	isStripeConfigured,
	verifyWebhookSignature,
} from "../../../../lib/stripe";
import { getDatabaseClient } from "../../../../utils/core/database-pool";
import { sendSubscriptionConfirmationEmail } from "../../../../utils/email/sender";

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

	const supabase = getDatabaseClient();

	// Handle different event types
	switch (event.type) {
		case "payment_intent.succeeded": {
			const paymentIntent = event.data.object as Stripe.PaymentIntent;
			apiLogger.info("Payment succeeded", {
				paymentIntentId: paymentIntent.id,
				amount: paymentIntent.amount,
				currency: paymentIntent.currency,
				metadata: paymentIntent.metadata,
			});

			// Update payment metadata in database if email is provided
			if (paymentIntent.metadata?.email) {
				try {
					await supabase
						.from("users")
						.update({
							stripe_payment_intent_id: paymentIntent.id,
							last_payment_at: new Date().toISOString(),
						})
						.eq("email", paymentIntent.metadata.email);

					apiLogger.info("Payment intent recorded", {
						email: paymentIntent.metadata.email,
						paymentIntentId: paymentIntent.id,
					});
				} catch (dbError) {
					apiLogger.error("Failed to record payment intent", dbError as Error, {
						email: paymentIntent.metadata.email,
					});
				}
			}
			break;
		}

		case "customer.subscription.created": {
			const subscription = event.data.object as Stripe.Subscription;
			apiLogger.info("Subscription created", {
				subscriptionId: subscription.id,
				status: subscription.status,
				customerId: subscription.customer,
				metadata: subscription.metadata,
			});

			// Activate subscription for user
			if (subscription.metadata?.email) {
				try {
					const { data: user, error: userError } = await supabase
						.from("users")
						.select("id, email, subscription_tier")
						.eq("email", subscription.metadata.email)
						.single();

					if (userError || !user) {
						apiLogger.warn("User not found for subscription", {
							email: subscription.metadata.email,
							subscriptionId: subscription.id,
						});
						break;
					}

					// Update user subscription status
					await supabase
						.from("users")
						.update({
							subscription_active: true,
							subscription_tier: "premium",
							stripe_subscription_id: subscription.id,
							subscription_started_at: new Date().toISOString(),
							subscription_status: subscription.status,
						})
						.eq("email", subscription.metadata.email);

					apiLogger.info("User subscription activated", {
						email: subscription.metadata.email,
						userId: user.id,
						subscriptionId: subscription.id,
					});

					// Send confirmation email
					try {
						await sendSubscriptionConfirmationEmail({
							to: subscription.metadata.email,
							userName: user.email,
							subscriptionId: subscription.id,
						});
					} catch (emailError) {
						apiLogger.warn("Failed to send subscription confirmation email", emailError as Error, {
							email: subscription.metadata.email,
						});
					}
				} catch (error) {
					apiLogger.error("Failed to activate subscription", error as Error, {
						email: subscription.metadata.email,
						subscriptionId: subscription.id,
					});
				}
			}
			break;
		}

		case "customer.subscription.updated": {
			const subscription = event.data.object as Stripe.Subscription;
			apiLogger.info("Subscription updated", {
				subscriptionId: subscription.id,
				status: subscription.status,
				customerId: subscription.customer,
			});

			// Update subscription status
			if (subscription.metadata?.email) {
				try {
					// If subscription is active/trialing, ensure premium is active
					const isActive =
						subscription.status === "active" ||
						subscription.status === "trialing";

					await supabase
						.from("users")
						.update({
							subscription_active: isActive,
							subscription_status: subscription.status,
							subscription_current_period_end: subscription.current_period_end
								? new Date(subscription.current_period_end * 1000).toISOString()
								: null,
						})
						.eq("email", subscription.metadata.email);

					apiLogger.info("User subscription updated", {
						email: subscription.metadata.email,
						status: subscription.status,
						active: isActive,
					});
				} catch (error) {
					apiLogger.error("Failed to update subscription", error as Error, {
						email: subscription.metadata.email,
					});
				}
			}
			break;
		}

		case "customer.subscription.deleted": {
			const subscription = event.data.object as Stripe.Subscription;
			apiLogger.info("Subscription deleted", {
				subscriptionId: subscription.id,
				customerId: subscription.customer,
			});

			// Deactivate subscription for user
			if (subscription.metadata?.email) {
				try {
					await supabase
						.from("users")
						.update({
							subscription_active: false,
							subscription_status: "cancelled",
							subscription_cancelled_at: new Date().toISOString(),
						})
						.eq("email", subscription.metadata.email);

					apiLogger.info("User subscription cancelled", {
						email: subscription.metadata.email,
						subscriptionId: subscription.id,
					});
				} catch (error) {
					apiLogger.error("Failed to cancel subscription", error as Error, {
						email: subscription.metadata.email,
					});
				}
			}
			break;
		}

		case "invoice.payment_succeeded": {
			const invoice = event.data.object as Stripe.Invoice;
			apiLogger.info("Invoice payment succeeded", {
				invoiceId: invoice.id,
				subscriptionId: invoice.subscription,
				amount: invoice.amount_paid,
			});

			// Record invoice payment
			if (invoice.metadata?.email) {
				try {
					await supabase
						.from("users")
						.update({
							last_invoice_paid_at: new Date().toISOString(),
						})
						.eq("email", invoice.metadata.email);

					apiLogger.info("Invoice recorded", {
						email: invoice.metadata.email,
						invoiceId: invoice.id,
					});
				} catch (error) {
					apiLogger.error("Failed to record invoice", error as Error, {
						email: invoice.metadata.email,
					});
				}
			}
			break;
		}

		case "invoice.payment_failed": {
			const invoice = event.data.object as Stripe.Invoice;
			apiLogger.warn("Invoice payment failed", {
				invoiceId: invoice.id,
				subscriptionId: invoice.subscription,
				attemptCount: invoice.attempt_count,
			});

			// Mark subscription as failed payment
			if (invoice.metadata?.email) {
				try {
					await supabase
						.from("users")
						.update({
							last_payment_failed_at: new Date().toISOString(),
						})
						.eq("email", invoice.metadata.email);

					apiLogger.warn("Payment failure recorded", {
						email: invoice.metadata.email,
						invoiceId: invoice.id,
					});
				} catch (error) {
					apiLogger.error("Failed to record payment failure", error as Error, {
						email: invoice.metadata.email,
					});
				}
			}
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
