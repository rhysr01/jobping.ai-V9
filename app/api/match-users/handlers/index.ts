/**
 * Main Route Handler - Orchestrates all matching logic
 */

import { type NextRequest, NextResponse } from "next/server";
import { validateMatchUsersRequest } from "@/middleware/api-validation";
import { matchUsersService } from "@/services/matchUsersService";

// Simple error classes to replace deleted files
export class JobFetchError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "JobFetchError";
	}
}

export class UserFetchError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "UserFetchError";
	}
}

/**
 * Main match-users handler - Simplified using extracted services
 */
export async function matchUsersHandler(req: NextRequest) {
	const requestId = crypto.randomUUID();

	// Parse request body once to avoid double consumption
	let body;
	try {
		body = await req.json();
	} catch (error) {
		console.error("Failed to parse request body:", error);
		return NextResponse.json(
			{
				error: "Invalid JSON in request body",
				code: "INVALID_JSON",
				requestId,
			},
			{ status: 400 },
		);
	}

	// Validate request
	const validationResult = validateMatchUsersRequest(body);
	if (!validationResult.isValid) {
		return validationResult.error!;
	}

	const { userLimit, jobLimit, signature, timestamp } = validationResult.data!;

	// Extract IP address
	const ip =
		req.headers.get("x-forwarded-for") ||
		req.headers.get("x-real-ip") ||
		"unknown";

	// Process the match users request
	return matchUsersService.processMatchUsersRequest({
		userLimit,
		jobLimit,
		signature,
		timestamp,
		ip,
		requestId,
	});
}
