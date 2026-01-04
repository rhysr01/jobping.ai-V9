import { type NextRequest, NextResponse } from "next/server";
import { apiLogger } from "@/lib/api-logger";

export async function POST(req: NextRequest) {
	try {
		const event = await req.json();

		// Log the webhook event for debugging
		apiLogger.info("[RESEND_WEBHOOK]", {
			type: event.type,
			id: event.id,
			timestamp: new Date().toISOString(),
			data: event.data,
		});

		// NOTE: Event persistence not yet implemented - events are logged for debugging

		return NextResponse.json({ ok: true });
	} catch (error) {
		apiLogger.error("[RESEND_WEBHOOK_ERROR]", error as Error);
		return NextResponse.json(
			{ error: "Webhook processing failed" },
			{ status: 500 },
		);
	}
}
