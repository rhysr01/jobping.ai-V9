/**
 * List Products on Connected Account
 *
 * GET /api/stripe-connect/list-products?accountId=acct_xxx
 *
 * Lists all products and prices for a connected account.
 */

import { type NextRequest, NextResponse } from "next/server";
import { apiLogger } from "@/lib/api-logger";
import { getStripeClientForAccount, isStripeConfigured } from "@/lib/stripe";

export async function GET(req: NextRequest) {
	try {
		if (!isStripeConfigured()) {
			return NextResponse.json(
				{ error: "Stripe Connect is not configured" },
				{ status: 503 },
			);
		}

		const { searchParams } = new URL(req.url);
		const accountId = searchParams.get("accountId");
		const limit = parseInt(searchParams.get("limit") || "10", 10);

		if (!accountId) {
			return NextResponse.json(
				{ error: "accountId query parameter is required" },
				{ status: 400 },
			);
		}

		const stripe = getStripeClientForAccount(accountId);

		// List products
		const products = await stripe.products.list(
			{
				limit: Math.min(limit, 100),
			},
			{
				stripeAccount: accountId,
			},
		);

		// List prices and attach to products
		const prices = await stripe.prices.list(
			{
				limit: 100,
			},
			{
				stripeAccount: accountId,
			},
		);

		// Combine products with their prices
		const productsWithPrices = products.data.map((product) => {
			const productPrices = prices.data.filter(
				(price) => price.product === product.id,
			);
			return {
				id: product.id,
				name: product.name,
				description: product.description,
				active: product.active,
				prices: productPrices.map((price) => ({
					id: price.id,
					amount: price.unit_amount ? price.unit_amount / 100 : 0,
					currency: price.currency,
					recurring: price.recurring
						? {
								interval: price.recurring.interval,
							}
						: null,
				})),
			};
		});

		return NextResponse.json({
			success: true,
			products: productsWithPrices,
			hasMore: products.has_more,
		});
	} catch (error: any) {
		apiLogger.error("Failed to list products", error as Error, {
			errorType: error.type,
			errorCode: error.code,
		});

		return NextResponse.json(
			{
				error: "Failed to list products",
				details: error.message,
			},
			{ status: 500 },
		);
	}
}
