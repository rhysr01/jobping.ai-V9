/**
 * Stripe Connect Health Check
 *
 * GET /api/stripe-connect/health
 *
 * Verifies that Stripe Connect is properly configured.
 * Useful for testing setup without making actual API calls.
 */

import { type NextRequest, NextResponse } from "next/server";
import { apiLogger } from "../../../../lib/api-logger";
import { ENV } from "../../../../lib/env";
import { getStripeClient, isStripeConfigured } from "../../../../lib/stripe";

export async function GET(_req: NextRequest) {
	try {
		const checks = {
			stripeConfigured: false,
			secretKeyPresent: false,
			secretKeyFormat: false,
			publishableKeyPresent: false,
			publishableKeyFormat: false,
			connectWebhookSecretPresent: false,
			billingWebhookSecretPresent: false,
			clientInitialized: false,
			mode: "unknown" as "test" | "live" | "unknown",
			errors: [] as string[],
		};

		// Check if Stripe is configured
		checks.stripeConfigured = isStripeConfigured();

		// Check secret key
		if (ENV.STRIPE_SECRET_KEY) {
			checks.secretKeyPresent = true;
			checks.secretKeyFormat = ENV.STRIPE_SECRET_KEY.startsWith("sk_");
			checks.mode = ENV.STRIPE_SECRET_KEY.includes("_test_") ? "test" : "live";

			if (!checks.secretKeyFormat) {
				checks.errors.push('STRIPE_SECRET_KEY must start with "sk_"');
			}
		} else {
			checks.errors.push("STRIPE_SECRET_KEY is not set");
		}

		// Check publishable key
		if (ENV.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
			checks.publishableKeyPresent = true;
			checks.publishableKeyFormat =
				ENV.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.startsWith("pk_");

			if (!checks.publishableKeyFormat) {
				checks.errors.push(
					'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must start with "pk_"',
				);
			}
		} else {
			checks.errors.push("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set");
		}

		// Check webhook secrets
		if (ENV.STRIPE_CONNECT_WEBHOOK_SECRET) {
			checks.connectWebhookSecretPresent = true;
			if (!ENV.STRIPE_CONNECT_WEBHOOK_SECRET.startsWith("whsec_")) {
				checks.errors.push(
					'STRIPE_CONNECT_WEBHOOK_SECRET should start with "whsec_"',
				);
			}
		} else {
			checks.errors.push(
				"STRIPE_CONNECT_WEBHOOK_SECRET is not set (optional for local dev)",
			);
		}

		if (ENV.STRIPE_WEBHOOK_SECRET) {
			checks.billingWebhookSecretPresent = true;
			if (!ENV.STRIPE_WEBHOOK_SECRET.startsWith("whsec_")) {
				checks.errors.push('STRIPE_WEBHOOK_SECRET should start with "whsec_"');
			}
		} else {
			checks.errors.push(
				"STRIPE_WEBHOOK_SECRET is not set (optional for local dev)",
			);
		}

		// Try to initialize Stripe client
		if (checks.stripeConfigured) {
			try {
				const client = getStripeClient();
				checks.clientInitialized = !!client;
			} catch (error: any) {
				checks.errors.push(
					`Failed to initialize Stripe client: ${error.message}`,
				);
			}
		}

		const allGood =
			checks.stripeConfigured &&
			checks.secretKeyPresent &&
			checks.secretKeyFormat &&
			checks.publishableKeyPresent &&
			checks.publishableKeyFormat &&
			checks.clientInitialized;

		const status = allGood ? 200 : 503;

		return NextResponse.json(
			{
				status: allGood ? "healthy" : "unhealthy",
				checks,
				summary: {
					configured: checks.stripeConfigured,
					mode: checks.mode,
					clientReady: checks.clientInitialized,
					webhooksConfigured:
						checks.connectWebhookSecretPresent &&
						checks.billingWebhookSecretPresent,
				},
				message: allGood
					? "Stripe Connect is properly configured ✅"
					: "Some configuration issues detected. Check errors array.",
			},
			{ status },
		);
	} catch (error: any) {
		apiLogger.error("Health check failed", error as Error);
		return NextResponse.json(
			{
				status: "error",
				error: error.message,
			},
			{ status: 500 },
		);
	}
}
