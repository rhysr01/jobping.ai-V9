/**
 * EMAIL ENGAGEMENT TRACKING ENDPOINT
 * Tracks email opens and clicks for engagement scoring
 */

import { type NextRequest, NextResponse } from "next/server";
import { asyncHandler, ValidationError } from "@/lib/errors";
import { updateUserEngagement } from "@/Utils/engagementTracker";
import { apiLogger } from "@/lib/api-logger";

export const POST = asyncHandler(async (req: NextRequest) => {
	const { email, type } = await req.json();

	if (!email || !type) {
		throw new ValidationError("Email and type are required");
	}

	if (!["email_opened", "email_clicked"].includes(type)) {
		throw new ValidationError("Type must be email_opened or email_clicked");
	}

	// Update user engagement
	await updateUserEngagement(email, type as "email_opened" | "email_clicked");

	apiLogger.info(` Tracked ${type} for ${email}`);

	return NextResponse.json({
		success: true,
		message: `Engagement tracked: ${type}`,
	});
});

export const GET = asyncHandler(async (req: NextRequest) => {
	const { searchParams } = new URL(req.url);
	const email = searchParams.get("email");
	const type = searchParams.get("type");
	const url = searchParams.get("url");

	if (!email || !type) {
		throw new ValidationError("Email and type are required");
	}

	if (!["email_opened", "email_clicked"].includes(type)) {
		throw new ValidationError("Type must be email_opened or email_clicked");
	}

	// Update user engagement
	await updateUserEngagement(email, type as "email_opened" | "email_clicked");

	apiLogger.info(` Tracked ${type} for ${email}`);

	// For click tracking, redirect to the original URL
	if (type === "email_clicked" && url) {
		const originalUrl = decodeURIComponent(url);
		return NextResponse.redirect(originalUrl);
	}

	// For open tracking, return a 1x1 transparent pixel
	if (type === "email_opened") {
		const pixel = Buffer.from(
			"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
			"base64",
		);

		return new NextResponse(pixel, {
			headers: {
				"Content-Type": "image/png",
				"Cache-Control": "no-cache, no-store, must-revalidate",
				Pragma: "no-cache",
				Expires: "0",
			},
		});
	}

	return NextResponse.json({
		success: true,
		message: `Engagement tracked: ${type}`,
	});
});
