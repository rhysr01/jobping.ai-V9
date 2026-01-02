import { Webhooks } from "@polar-sh/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { apiLogger } from "@/lib/api-logger";
import { ENV } from "@/lib/env";
import { getDatabaseClient } from "@/Utils/databasePool";

// Use any for payload since Polar SDK has complex union types
// We'll extract what we need from the payload dynamically
type PolarWebhookPayload = any;

// Handle order paid event (most important - payment actually received)
async function handleOrderPaid(payload: PolarWebhookPayload) {
	const order = payload.data;
	// Extract email from various possible locations in Polar payload
	const customerEmail =
		order.customer?.email ||
		order.customer_email ||
		order.email ||
		(order.customer_id ? null : null);

	if (!customerEmail) {
		apiLogger.warn("Order paid but no email found", { orderId: order.id });
		return { success: false, error: "Missing customer email" };
	}

	const supabase = getDatabaseClient();

	// Check if user already has active subscription (idempotency)
	const { data: existingUser } = await supabase
		.from("users")
		.select("subscription_active, email")
		.eq("email", customerEmail)
		.single();

	if (existingUser?.subscription_active === true) {
		apiLogger.info(
			`User ${customerEmail} already has active subscription (idempotency)`,
		);
		return { success: true, message: "Subscription already active" };
	}

	// Update user to premium
	const { error: updateError } = await supabase
		.from("users")
		.update({
			subscription_active: true,
			updated_at: new Date().toISOString(),
		})
		.eq("email", customerEmail);

	if (updateError) {
		apiLogger.error("Failed to activate subscription", updateError as Error, {
			email: customerEmail,
		});
		return { success: false, error: updateError.message };
	}

	apiLogger.info(`✅ Activated premium subscription for ${customerEmail}`, {
		orderId: order.id,
	});
	return { success: true, message: "Subscription activated" };
}

// Handle checkout created/updated events (for tracking)
async function handleCheckoutEvent(payload: PolarWebhookPayload) {
	const checkout = payload.data;
	apiLogger.debug(`Checkout event: ${payload.type}`, {
		checkoutId: checkout.id,
	});
	// Just log for now - actual activation happens on order.paid
	return { success: true, message: "Checkout event logged" };
}

// Handle subscription created/updated/active events
async function handleSubscriptionEvent(payload: PolarWebhookPayload) {
	const subscription = payload.data;
	// Try to get email from customer object or subscription metadata
	const customerEmail =
		subscription.customer?.email ||
		subscription.customer_email ||
		subscription.email;

	if (!customerEmail) {
		// For subscription events, we might need to fetch customer by ID
		if (subscription.customer_id) {
			apiLogger.debug(
				`Subscription event but no email, will sync via customer_id`,
				{
					subscriptionId: subscription.id,
					customerId: subscription.customer_id,
				},
			);
			// We'll handle this by checking subscription status directly
		} else {
			apiLogger.warn("Subscription event but no email or customer_id found", {
				subscriptionId: subscription.id,
			});
			return { success: false, error: "Missing customer information" };
		}
	}

	const supabase = getDatabaseClient();
	const status = subscription.status;
	const isActive = status === "active" || status === "trialing";

	// If we have email, update by email
	if (customerEmail) {
		const { data: user } = await supabase
			.from("users")
			.select("subscription_active, email")
			.eq("email", customerEmail)
			.single();

		if (!user) {
			apiLogger.warn(`User not found for subscription event`, {
				email: customerEmail,
			});
			return { success: false, error: "User not found" };
		}

		if (user.subscription_active === isActive) {
			apiLogger.info(
				`User ${customerEmail} subscription status unchanged (${status})`,
			);
			return { success: true, message: "Status unchanged" };
		}

		const { error: updateError } = await supabase
			.from("users")
			.update({
				subscription_active: isActive,
				updated_at: new Date().toISOString(),
			})
			.eq("email", customerEmail);

		if (updateError) {
			apiLogger.error("Failed to update subscription", updateError as Error, {
				email: customerEmail,
			});
			return { success: false, error: updateError.message };
		}

		apiLogger.info(
			`✅ Updated subscription for ${customerEmail}: ${status} (active: ${isActive})`,
		);
		return { success: true, message: "Subscription updated" };
	}

	// If no email but we have customer_id, just log for now
	apiLogger.debug(`Subscription event processed (no email match)`, {
		subscriptionId: subscription.id,
		status,
		isActive,
	});
	return { success: true, message: "Subscription event logged" };
}

// Handle subscription canceled/revoked events
async function handleSubscriptionCanceled(payload: PolarWebhookPayload) {
	const subscription = payload.data;
	const customerEmail =
		subscription.customer?.email ||
		subscription.customer_email ||
		subscription.email;

	if (!customerEmail) {
		apiLogger.warn("Subscription canceled but no email found", {
			subscriptionId: subscription.id,
		});
		return { success: false, error: "Missing customer email" };
	}

	const supabase = getDatabaseClient();

	// Check current status (idempotency)
	const { data: user } = await supabase
		.from("users")
		.select("subscription_active, email")
		.eq("email", customerEmail)
		.single();

	if (!user) {
		apiLogger.warn(`User not found for subscription cancellation`, {
			email: customerEmail,
		});
		return { success: false, error: "User not found" };
	}

	if (user.subscription_active === false) {
		apiLogger.info(
			`User ${customerEmail} subscription already inactive (idempotency)`,
		);
		return { success: true, message: "Subscription already inactive" };
	}

	const { error: updateError } = await supabase
		.from("users")
		.update({
			subscription_active: false,
			updated_at: new Date().toISOString(),
		})
		.eq("email", customerEmail);

	if (updateError) {
		apiLogger.error("Failed to deactivate subscription", updateError as Error, {
			email: customerEmail,
		});
		return { success: false, error: updateError.message };
	}

	apiLogger.info(`✅ Deactivated subscription for ${customerEmail}`);
	return { success: true, message: "Subscription deactivated" };
}

// Handle subscription uncanceled (user reactivated)
async function handleSubscriptionUncanceled(payload: PolarWebhookPayload) {
	// Same as subscription.active - reactivate premium
	return handleSubscriptionEvent(payload);
}

// Handle customer events (for tracking)
async function handleCustomerEvent(payload: PolarWebhookPayload) {
	const customer = payload.data;
	apiLogger.debug(`Customer event: ${payload.type}`, {
		customerId: customer.id,
		email: customer.email,
	});
	return { success: true, message: "Customer event logged" };
}

// Create Polar webhook handler
export const POST = Webhooks({
	webhookSecret: ENV.POLAR_WEBHOOK_SECRET || "",
	onPayload: async (payload: PolarWebhookPayload): Promise<void> => {
		const startTime = Date.now();
		const eventType = payload.type;

		apiLogger.info(`Polar webhook received`, {
			eventType,
			payloadId: payload.data?.id,
		});

		try {
			let result:
				| { success: boolean; error?: string; message?: string }
				| undefined;

			switch (eventType) {
				// Payment events - most important!
				case "order.paid":
					result = await handleOrderPaid(payload);
					break;

				// Checkout events - for tracking
				case "checkout.created":
				case "checkout.updated":
					result = await handleCheckoutEvent(payload);
					break;

				// Subscription lifecycle events
				case "subscription.created":
				case "subscription.updated":
				case "subscription.active":
					result = await handleSubscriptionEvent(payload);
					break;

				case "subscription.canceled":
				case "subscription.revoked":
					result = await handleSubscriptionCanceled(payload);
					break;

				case "subscription.uncanceled":
					result = await handleSubscriptionUncanceled(payload);
					break;

				// Customer events - for tracking
				case "customer.created":
				case "customer.updated":
				case "customer.deleted":
				case "customer.state_changed":
					result = await handleCustomerEvent(payload);
					break;

				// Order events - log for now
				case "order.created":
				case "order.updated":
				case "order.refunded":
					apiLogger.debug(`Order event: ${eventType}`, {
						orderId: payload.data.id,
					});
					result = {
						success: true,
						message: `Order event logged: ${eventType}`,
					};
					break;

				// Other events - log but don't process
				default:
					apiLogger.debug(`Unhandled Polar webhook event type: ${eventType}`, {
						payloadId: payload.data?.id,
					});
					result = {
						success: true,
						message: `Unhandled event type: ${eventType}`,
					};
			}

			const duration = Date.now() - startTime;
			apiLogger.info(`Polar webhook processed`, {
				eventType,
				success: result.success,
				duration,
			});

			// Don't return result - onPayload should return void
		} catch (error) {
			const duration = Date.now() - startTime;
			apiLogger.error("Polar webhook processing failed", error as Error, {
				eventType,
				duration,
			});
			throw error;
		}
	},
});

// GET endpoint for webhook verification (Polar may require this to verify the endpoint)
export async function GET(_req: NextRequest) {
	// Some webhook providers ping the endpoint with GET to verify it exists
	// Return a simple success response
	return NextResponse.json(
		{
			status: "ok",
			message: "Polar webhook endpoint is active",
			endpoint: "/api/webhooks/polar",
		},
		{ status: 200 },
	);
}
