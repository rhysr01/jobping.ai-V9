import { NextResponse } from "next/server";

// Simple test endpoint that triggers the exact error from Sentry docs
export async function GET() {
	// @ts-expect-error - Intentionally calling undefined function for testing
	myUndefinedFunction();

	return NextResponse.json({ success: true });
}
