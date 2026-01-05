/**
 * Create Subscription on Connected Account
 *
 * POST /api/stripe-connect/create-subscription
 *
 * Creates a subscription directly on a connected account.
 * Platform receives recurring application fee.
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
      priceId,
      customerEmail,
      customerId, // Optional: use existing customer
      applicationFeePercent = 0,
    } = await req.json();

    if (!accountId || !priceId) {
      return NextResponse.json(
        { error: "accountId and priceId are required" },
        { status: 400 },
      );
    }

    const stripe = getStripeClientForAccount(accountId);

    // Create or retrieve customer
    let customer: string;
    if (customerId) {
      customer = customerId;
    } else if (customerEmail) {
      // Create customer on connected account
      const customerObj = await stripe.customers.create(
        {
          email: customerEmail,
        },
        {
          stripeAccount: accountId,
        },
      );
      customer = customerObj.id;
    } else {
      return NextResponse.json(
        { error: "customerEmail or customerId is required" },
        { status: 400 },
      );
    }

    // Create subscription on connected account
    const subscription = await stripe.subscriptions.create(
      {
        customer,
        items: [{ price: priceId }],
        application_fee_percent:
          applicationFeePercent > 0 ? applicationFeePercent : undefined,
        transfer_data: {
          destination: accountId,
        },
      },
      {
        stripeAccount: accountId,
      },
    );

    apiLogger.info("Subscription created on connected account", {
      accountId,
      subscriptionId: subscription.id,
      customerId: customer,
    });

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        customerId: customer,
      },
    });
  } catch (error: any) {
    apiLogger.error("Failed to create subscription", error as Error, {
      errorType: error.type,
      errorCode: error.code,
    });

    return NextResponse.json(
      {
        error: "Failed to create subscription",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
