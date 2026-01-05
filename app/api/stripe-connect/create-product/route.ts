/**
 * Create Product on Connected Account
 *
 * POST /api/stripe-connect/create-product
 *
 * Creates a product and price on a connected account.
 * Products are created on the connected account, not the platform.
 */

import { type NextRequest, NextResponse } from "next/server";
import { apiLogger } from "@/lib/api-logger";
import { getStripeClientForAccount, isStripeConfigured } from "@/lib/stripe";

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
      name,
      description,
      amount,
      currency = "usd",
      recurring = false,
      interval = "month", // 'month' | 'year'
    } = await req.json();

    if (!accountId || !name || amount === undefined) {
      return NextResponse.json(
        { error: "accountId, name, and amount are required" },
        { status: 400 },
      );
    }

    // Get Stripe client for the connected account
    const stripe = getStripeClientForAccount(accountId);

    // Create product on connected account
    const product = await stripe.products.create(
      {
        name,
        description: description || undefined,
      },
      {
        stripeAccount: accountId,
      },
    );

    // Create price for the product
    const price = await stripe.prices.create(
      {
        product: product.id,
        unit_amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        ...(recurring
          ? {
              recurring: {
                interval: interval as "month" | "year",
              },
            }
          : {}),
      },
      {
        stripeAccount: accountId,
      },
    );

    apiLogger.info("Product and price created on connected account", {
      accountId,
      productId: product.id,
      priceId: price.id,
    });

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
      },
      price: {
        id: price.id,
        amount: price.unit_amount ? price.unit_amount / 100 : 0,
        currency: price.currency,
        recurring: price.recurring
          ? {
              interval: price.recurring.interval,
            }
          : null,
      },
    });
  } catch (error: any) {
    apiLogger.error(
      "Failed to create product on connected account",
      error as Error,
      {
        errorType: error.type,
        errorCode: error.code,
      },
    );

    return NextResponse.json(
      {
        error: "Failed to create product",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
