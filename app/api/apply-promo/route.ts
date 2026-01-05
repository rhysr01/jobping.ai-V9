import { type NextRequest, NextResponse } from "next/server";
import { AppError, asyncHandler, ValidationError } from "@/lib/errors";
import { getDatabaseClient } from "@/Utils/databasePool";
import { apiLogger } from "@/lib/api-logger";

export const POST = asyncHandler(async (req: NextRequest) => {
  // Get database client with service_role key
  const supabase = getDatabaseClient();
  const { email, promoCode } = await req.json();

  if (!email || !promoCode) {
    throw new ValidationError("Email and promo code required");
  }

  // Verify promo code is "rhys"
  if (promoCode.toLowerCase() !== "rhys") {
    throw new ValidationError("Invalid promo code");
  }

  // Check if user already exists
  const { data: existingUser } = await supabase
    .from("users")
    .select("id, subscription_active")
    .eq("email", email)
    .single();

  if (existingUser) {
    // EXISTING USER: Upgrade to premium instantly
    const { error: updateError } = await supabase
      .from("users")
      .update({
        subscription_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("email", email);

    if (updateError) {
      apiLogger.error("Error updating user:", updateError);
      throw new AppError("Failed to upgrade user", 500, "DB_UPDATE_ERROR", {
        error: updateError.message,
      });
    }

    return NextResponse.json({
      success: true,
      existingUser: true,
      message: " Upgraded to premium! You're all set.",
      redirectUrl: null, // No redirect needed - user already has profile
    });
  }

  // NEW USER: Store promo in temp table, redirect to signup form
  const { error: tempError } = await supabase.from("promo_pending").upsert(
    {
      email,
      promo_code: "rhys",
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      created_at: new Date().toISOString(),
    },
    {
      onConflict: "email",
    },
  );

  if (tempError) {
    apiLogger.error("Error storing promo pending:", tempError);
    // Don't fail - just log and continue
  }

  // Return redirect URL to signup form
  const signupUrl = "/signup";

  return NextResponse.json({
    success: true,
    existingUser: false,
    message:
      " Promo code valid! Please complete your profile to activate premium.",
    redirectUrl: `${signupUrl}?email=${encodeURIComponent(email)}&promo=rhys`,
  });
});
