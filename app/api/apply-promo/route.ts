/**
 * Apply Promo Code
 *
 * POST /api/apply-promo
 *
 * Applies a promo code to activate premium subscription for free.
 * Currently supports the "rhys" promo code for 1 month free premium.
 */

import { type NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "../../../utils/core/database-pool";
import { apiLogger } from "../../../lib/api-logger";

export async function POST(req: NextRequest) {
	try {
		const supabase = getDatabaseClient();
		const { email, promoCode } = await req.json();

		if (!email || !promoCode) {
			return NextResponse.json(
				{ error: "Email and promo code are required" },
				{ status: 400 },
			);
		}

		const normalizedEmail = email.toLowerCase().trim();
		const normalizedPromoCode = promoCode.toLowerCase().trim();

		// Check if user exists
		const { data: existingUser, error: userError } = await supabase
			.from("users")
			.select("subscription_active, email, subscription_tier")
			.eq("email", normalizedEmail)
			.single();

		if (userError || !existingUser) {
			return NextResponse.json(
				{ error: "User not found. Please sign up first." },
				{ status: 404 },
			);
		}

		// Check if user already has active premium
		if (existingUser.subscription_active === true) {
			return NextResponse.json(
				{ error: "You already have an active premium subscription." },
				{ status: 400 },
			);
		}

		// Validate promo code
		let isValidPromo = false;
		let promoType = "";

		if (normalizedPromoCode === "rhys") {
			isValidPromo = true;
			promoType = "1_month_free";
		}

		if (!isValidPromo) {
			return NextResponse.json(
				{ error: "Invalid promo code." },
				{ status: 400 },
			);
		}

		// Apply promo code based on type
		if (promoType === "1_month_free") {
			// Calculate expiration date (1 month from now)
			const expirationDate = new Date();
			expirationDate.setMonth(expirationDate.getMonth() + 1);

			const { error: updateError } = await supabase
				.from("users")
				.update({
					subscription_active: true,
					subscription_tier: "premium",
					email_verified: true, // Skip verification for promo users
					promo_code_used: normalizedPromoCode,
					promo_expires_at: expirationDate.toISOString(),
					updated_at: new Date().toISOString(),
				})
				.eq("email", normalizedEmail);

			if (updateError) {
				apiLogger.error("Failed to apply promo code", updateError as Error, {
					email: normalizedEmail,
					promoCode: normalizedPromoCode,
				});
				return NextResponse.json(
					{ error: "Failed to apply promo code. Please try again." },
					{ status: 500 },
				);
			}

			apiLogger.info("Promo code applied successfully", {
				email: normalizedEmail,
				promoCode: normalizedPromoCode,
				promoType,
				expiresAt: expirationDate.toISOString(),
			});

			return NextResponse.json({
				success: true,
				message: "Promo code applied! You now have 1 month of free premium access.",
				expiresAt: expirationDate.toISOString(),
			});
		}

		// Fallback (shouldn't reach here with current logic)
		return NextResponse.json(
			{ error: "Unsupported promo code type." },
			{ status: 400 },
		);
	} catch (error: any) {
		apiLogger.error("Promo code application error", error as Error);
		return NextResponse.json(
			{ error: "An unexpected error occurred. Please try again." },
			{ status: 500 },
		);
	}
}