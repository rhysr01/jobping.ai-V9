import { type NextRequest, NextResponse } from "next/server";
import { apiLogger } from "@/lib/api-logger";
import { getDatabaseClient } from "@/Utils/databasePool";

// GET: Retrieve billing information
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const supabase = getDatabaseClient();

    // Get user's subscription status and email
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("subscription_active, email")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get current subscription details
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    return NextResponse.json({
      success: true,
      currentSubscription: subscription || null,
      invoices: [],
      hasPaymentCustomer: false,
      email: user?.email || null,
    });
  } catch (error) {
    apiLogger.error("Billing API error", error as Error);
    return NextResponse.json(
      { error: "Failed to retrieve billing information" },
      { status: 500 },
    );
  }
}

// POST: Update billing (placeholder for future Polar integration)
export async function POST(req: NextRequest) {
  try {
    const { userId, action } = await req.json();

    if (!userId || !action) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 },
      );
    }

    // Placeholder for future Polar integration
    return NextResponse.json(
      {
        success: false,
        error: "Billing management not yet implemented with Polar",
      },
      { status: 501 },
    );
  } catch (error) {
    apiLogger.error("Billing update error", error as Error);
    return NextResponse.json(
      { error: "Failed to update billing information" },
      { status: 500 },
    );
  }
}

// PUT: Manage subscription (placeholder for future Polar integration)
export async function PUT(req: NextRequest) {
  try {
    const { userId, action } = await req.json();

    if (!userId || !action) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 },
      );
    }

    // Placeholder for future Polar integration
    return NextResponse.json(
      {
        success: false,
        error: "Subscription management not yet implemented with Polar",
      },
      { status: 501 },
    );
  } catch (error) {
    apiLogger.error("Subscription management error", error as Error);
    return NextResponse.json(
      { error: "Failed to manage subscription" },
      { status: 500 },
    );
  }
}
