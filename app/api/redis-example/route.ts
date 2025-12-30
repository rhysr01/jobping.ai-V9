/**
 * Example API route demonstrating Redis usage
 *
 * This is a simple example showing how to use the centralized Redis client.
 * You can use this pattern in other API routes for caching, session storage, etc.
 */

import { type NextRequest, NextResponse } from "next/server";
import { withRedis } from "@/lib/redis-client";

export async function GET(_req: NextRequest) {
	try {
		// Example 1: Simple get operation
		const result = await withRedis(async (client) => {
			return await client.get("item");
		}, null);

		return NextResponse.json(
			{
				success: true,
				result,
				message: result ? "Value found in Redis" : "Value not found in Redis",
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error("Redis GET error:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to fetch from Redis",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const { key, value, ttl } = body;

		if (!key || value === undefined) {
			return NextResponse.json(
				{
					success: false,
					error: "Missing required fields",
					message: 'Both "key" and "value" are required',
				},
				{ status: 400 },
			);
		}

		// Example 2: Set operation with optional TTL
		const result = await withRedis(async (client) => {
			if (ttl && typeof ttl === "number" && ttl > 0) {
				// Set with expiration (TTL in seconds)
				await client.setEx(key, ttl, JSON.stringify(value));
			} else {
				// Set without expiration
				await client.set(key, JSON.stringify(value));
			}
			return "OK";
		}, null);

		if (!result) {
			return NextResponse.json(
				{
					success: false,
					error: "Redis unavailable",
					message: "Redis is not configured or unavailable",
				},
				{ status: 503 },
			);
		}

		return NextResponse.json(
			{
				success: true,
				message: `Value stored in Redis${ttl ? ` with TTL of ${ttl} seconds` : ""}`,
				key,
				ttl: ttl || null,
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error("Redis POST error:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to store in Redis",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

export async function DELETE(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const key = searchParams.get("key");

		if (!key) {
			return NextResponse.json(
				{
					success: false,
					error: "Missing key parameter",
					message: 'Query parameter "key" is required',
				},
				{ status: 400 },
			);
		}

		// Example 3: Delete operation
		const deleted = await withRedis(async (client) => {
			const result = await client.del(key);
			return result > 0;
		}, false);

		return NextResponse.json(
			{
				success: true,
				deleted,
				message: deleted
					? `Key "${key}" deleted from Redis`
					: `Key "${key}" not found in Redis`,
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error("Redis DELETE error:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to delete from Redis",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
