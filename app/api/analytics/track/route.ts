import { type NextRequest, NextResponse } from "next/server";
import { apiLogger } from "@/lib/api-logger";
import { getDatabaseClient } from "@/Utils/databasePool";

export async function POST(request: NextRequest) {
	try {
		const { event, properties } = await request.json();

		// Validate input
		if (!event || typeof event !== "string") {
			return NextResponse.json(
				{ success: false, error: "Invalid event name" },
				{ status: 400 },
			);
		}

		const supabase = getDatabaseClient();

		// Store event (optional - or send to Mixpanel/PostHog)
		// Note: You may need to create an analytics_events table if it doesn't exist
		try {
			await supabase.from("analytics_events").insert({
				event_name: event,
				properties: properties || {},
				created_at: new Date().toISOString(),
			});

			apiLogger.debug("Analytics event tracked", {
				event,
				hasProperties: !!properties,
			});
		} catch (error: any) {
			// Table might not exist - that's okay, just log
			// Check if it's a table-not-found error vs other DB error
			if (
				error?.code === "42P01" ||
				error?.message?.includes("does not exist")
			) {
				apiLogger.debug("Analytics table not found, skipping storage", {
					event,
				});
			} else {
				// Other database error - log but don't fail the request
				apiLogger.warn("Analytics storage failed", error as Error, { event });
			}
		}

		// Always return success - analytics shouldn't block user flow
		return NextResponse.json({ success: true });
	} catch (error) {
		// Invalid JSON or other parsing error
		apiLogger.error("Analytics tracking failed", error as Error);
		// Still return success - analytics failures shouldn't break user experience
		return NextResponse.json({ success: false }, { status: 200 });
	}
}
