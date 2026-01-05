/**
 * Stripe Client Utility
 *
 * Provides typed Stripe client instances for Connect operations.
 * Uses latest Stripe SDK beta with proper error handling.
 */

import Stripe from "stripe";
import { apiLogger } from "@/lib/api-logger";
import { ENV } from "@/lib/env";

// Main Stripe client (platform account)
let stripeClient: Stripe | null = null;

/**
 * Get the main Stripe client instance (singleton)
 * Throws error if STRIPE_SECRET_KEY is not configured
 */
export function getStripeClient(): Stripe {
  if (!stripeClient) {
    const secretKey = ENV.STRIPE_SECRET_KEY;

    if (!secretKey) {
      apiLogger.error(
        "STRIPE_SECRET_KEY not configured",
        new Error("Missing Stripe secret key"),
      );
      throw new Error(
        "Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.",
      );
    }

    if (!secretKey.startsWith("sk_")) {
      apiLogger.error(
        "Invalid STRIPE_SECRET_KEY format",
        new Error("Key must start with sk_"),
      );
      throw new Error("Invalid Stripe secret key format. Must start with sk_");
    }

    stripeClient = new Stripe(secretKey, {
      apiVersion: "2025-02-24.acacia", // Latest beta version
      typescript: true,
    });

    apiLogger.info("Stripe client initialized", {
      mode: secretKey.includes("_test_") ? "test" : "live",
    });
  }

  return stripeClient;
}

/**
 * Get a Stripe client for a connected account
 * Use this for operations that need to be performed on behalf of a connected account
 */
export function getStripeClientForAccount(accountId: string): Stripe {
  const secretKey = ENV.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Stripe is not configured");
  }

  return new Stripe(secretKey, {
    apiVersion: "2025-02-24.acacia",
    typescript: true,
    stripeAccount: accountId, // Perform operations on behalf of this account
  });
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string,
): Stripe.Event {
  const stripe = getStripeClient();

  try {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    apiLogger.error("Webhook signature verification failed", error as Error);
    throw new Error("Invalid webhook signature");
  }
}

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured(): boolean {
  return !!ENV.STRIPE_SECRET_KEY && ENV.STRIPE_SECRET_KEY.startsWith("sk_");
}
