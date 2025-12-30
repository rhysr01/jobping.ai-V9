import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export async function GET() {
	try {
		// Intentionally trigger an error for testing
		// @ts-expect-error - Intentionally calling undefined function
		myUndefinedServerFunction();

		return NextResponse.json({ success: true });
	} catch (error) {
		// Capture the error with Sentry
		Sentry.captureException(error, {
			tags: {
				test: "sentry-test-api",
				environment: process.env.NODE_ENV,
			},
			extra: {
				endpoint: "/api/sentry-test",
				timestamp: new Date().toISOString(),
			},
		});

		return NextResponse.json(
			{
				message: "Server error triggered and sent to Sentry!",
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
