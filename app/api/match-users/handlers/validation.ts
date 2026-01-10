/**
 * Validation Domain - Request validation, HMAC, and schema validation
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { apiLogger } from "@/lib/api-logger";
import { isHMACRequired, verifyHMAC } from "@/utils/authentication/hmac";
import { HMAC_SECRET, SCHEMA_VALIDATION_TTL_MS } from "./config";
import type { SchemaValidationCache } from "./types";

// Zod validation schemas
export const matchUsersRequestSchema = z.object({
	userLimit: z.coerce.number().min(1).max(100).default(50),
	jobLimit: z.coerce.number().min(100).max(50000).default(10000),
	forceRun: z.coerce.boolean().default(false),
	dryRun: z.coerce.boolean().default(false),
	signature: isHMACRequired()
		? z.string().min(1, "Authentication signature required")
		: z.string().optional(),
	timestamp: isHMACRequired()
		? z.coerce.number().min(1, "Timestamp required")
		: z.coerce.number().optional(),
});

let schemaValidationCache: SchemaValidationCache | null = null;

/**
 * Validate database schema before proceeding
 */
export async function validateDatabaseSchema(
	supabase: SupabaseClient,
): Promise<{ valid: boolean; missingColumns?: string[] }> {
	const now = Date.now();

	if (process.env.SKIP_SCHEMA_VALIDATION === "true") {
		const result = { valid: true };
		schemaValidationCache = { timestamp: now, result };
		return result;
	}

	if (
		schemaValidationCache &&
		now - schemaValidationCache.timestamp < SCHEMA_VALIDATION_TTL_MS
	) {
		return schemaValidationCache.result;
	}

	try {
		if (process.env.NODE_ENV === "test") {
			apiLogger.debug("Test mode: Skipping database schema validation");
			const result = { valid: true };
			schemaValidationCache = { timestamp: now, result };
			return result;
		}

		const requiredColumns = ["status", "original_posted_date", "last_seen_at"];
		const queryPromise = supabase
			.from("jobs")
			.select(requiredColumns.join(", "))
			.limit(1);

		const timeoutPromise = new Promise((_, reject) =>
			setTimeout(() => reject(new Error("Query timeout")), 5000),
		);

		const { error } = (await Promise.race([
			queryPromise,
			timeoutPromise,
		])) as any;

		if (error) {
			apiLogger.error("Database schema validation failed", error as Error, {
				requiredColumns,
			});
			const missingColumns = requiredColumns.filter((col) =>
				error.message?.toLowerCase().includes(col.toLowerCase()),
			);
			const result = { valid: false, missingColumns };
			schemaValidationCache = { timestamp: Date.now(), result };
			return result;
		}

		apiLogger.debug("Database schema validation passed");
		const result = { valid: true };
		schemaValidationCache = { timestamp: Date.now(), result };
		return result;
	} catch (err) {
		apiLogger.error("Database schema validation error", err as Error);
		const result = {
			valid: false,
			missingColumns: ["status", "original_posted_date", "last_seen_at"],
		};
		schemaValidationCache = { timestamp: Date.now(), result };
		return result;
	}
}

/**
 * Verify HMAC authentication
 */
export function verifyHMACAuth(
	rawBody: string,
	signature: string | null,
	timestamp: number,
): { isValid: boolean; error?: string } {
	if (!HMAC_SECRET) {
		return { isValid: true }; // No-op if secret not set
	}

	const hmacResult = verifyHMAC(rawBody, signature || "", timestamp);
	return hmacResult;
}

/**
 * Verify HMAC from request body parameters
 */
export function verifyHMACFromParams(
	userLimit: number,
	jobLimit: number,
	signature: string | undefined,
	timestamp: number | undefined,
): { isValid: boolean; error?: string } {
	if (!isHMACRequired()) {
		return { isValid: true };
	}

	if (!signature || !timestamp) {
		return { isValid: false, error: "Missing signature or timestamp" };
	}

	const hmacResult = verifyHMAC(
		`${userLimit}:${jobLimit}:${timestamp}`,
		signature,
		timestamp,
	);
	return hmacResult;
}
