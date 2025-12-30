import { Checkout } from "@polar-sh/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { ENV } from "@/lib/env";

// Polar's Checkout component handles GET requests with query parameters
// Usage: /api/checkout?product_id=prod_xxx&customer_email=user@example.com
export const GET = (req: NextRequest) => {
	if (!ENV.POLAR_ACCESS_TOKEN) {
		return NextResponse.json(
			{ error: "Polar checkout is not configured. Please contact support." },
			{ status: 503 },
		);
	}

	const checkoutHandler = Checkout({
		accessToken: ENV.POLAR_ACCESS_TOKEN,
		successUrl: ENV.POLAR_SUCCESS_URL,
	});

	return checkoutHandler(req);
};

// POST endpoint to create checkout session programmatically
export async function POST(req: NextRequest) {
	try {
		if (!ENV.POLAR_ACCESS_TOKEN) {
			return NextResponse.json(
				{ error: "Polar checkout is not configured. Please contact support." },
				{ status: 503 },
			);
		}

		const { customerEmail } = await req.json();

		// Get product ID from environment (server-side only)
		const productId = ENV.POLAR_PRODUCT_ID;

		if (!productId) {
			return NextResponse.json(
				{ error: "Product ID not configured. Please contact support." },
				{ status: 500 },
			);
		}

		// Redirect to Polar checkout with product ID
		// The GET handler above will process this
		const checkoutParams = new URLSearchParams({
			product_id: productId,
		});

		if (customerEmail) {
			checkoutParams.append("customer_email", customerEmail);
		}

		const checkoutUrl = `/api/checkout?${checkoutParams.toString()}`;

		return NextResponse.json({
			success: true,
			checkoutUrl,
			redirect: checkoutUrl,
		});
	} catch (error) {
		console.error("Checkout creation error:", error);
		return NextResponse.json(
			{ error: "Failed to create checkout session" },
			{ status: 500 },
		);
	}
}
