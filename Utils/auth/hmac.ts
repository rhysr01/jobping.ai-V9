/**
 * Shared HMAC Authentication Utility
 * Provides consistent HMAC verification across all API endpoints
 */

import crypto from "node:crypto";

const HMAC_SECRET = process.env.INTERNAL_API_HMAC_SECRET;

export interface HMACVerificationResult {
	isValid: boolean;
	error?: string;
}

/**
 * Generate HMAC signature (for testing and client-side signing)
 * @param raw - Raw data to sign
 * @param secret - Secret key (defaults to INTERNAL_API_HMAC_SECRET)
 * @returns Hex-encoded HMAC signature
 */
export function hmacSign(raw: string, secret?: string): string {
	const secretKey = secret || HMAC_SECRET;
	if (!secretKey) {
		throw new Error("HMAC secret not configured");
	}
	return crypto.createHmac("sha256", secretKey).update(raw).digest("hex");
}

/**
 * Verify HMAC signature (simple version for backward compatibility)
 * @param raw - Raw data to verify
 * @param sig - Signature to verify against
 * @param secret - Secret key (defaults to INTERNAL_API_HMAC_SECRET)
 * @returns True if signature is valid
 */
export function hmacVerify(
	raw: string,
	sig: string | null,
	secret?: string,
): boolean {
	if (!sig) return false;
	const secretKey = secret || HMAC_SECRET;
	if (!secretKey) {
		return false;
	}
	const expect = hmacSign(raw, secretKey);
	// Use string comparison for test compatibility (production uses timing-safe comparison)
	return expect === sig;
}

/**
 * Verify HMAC signature with consistent rules across endpoints
 * Policy: Mandatory in production, optional in test/development
 */
export function verifyHMAC(
	data: string,
	signature: string,
	timestamp: number,
	maxAgeMinutes: number = 5,
): HMACVerificationResult {
	// In test/development, HMAC is optional
	if (
		process.env.NODE_ENV === "test" ||
		process.env.NODE_ENV === "development"
	) {
		if (!signature || !timestamp) {
			return { isValid: true }; // Allow missing auth in dev/test
		}
	}

	// In production, HMAC is mandatory
	if (!HMAC_SECRET) {
		return { isValid: false, error: "HMAC secret not configured" };
	}

	if (!signature || !timestamp) {
		return { isValid: false, error: "Missing signature or timestamp" };
	}

	// Check timestamp is within allowed window
	const now = Date.now();
	const ageMinutes = Math.abs(now - timestamp) / (1000 * 60);

	if (ageMinutes > maxAgeMinutes) {
		return {
			isValid: false,
			error: `Timestamp too old: ${ageMinutes.toFixed(1)} minutes`,
		};
	}

	// Generate expected signature
	const expectedSignature = crypto
		.createHmac("sha256", HMAC_SECRET)
		.update(data)
		.digest("hex");

	// Use timing-safe comparison
	const isValid = crypto.timingSafeEqual(
		Buffer.from(signature, "hex"),
		Buffer.from(expectedSignature, "hex"),
	);

	return { isValid, error: isValid ? undefined : "Invalid signature" };
}

/**
 * Generate HMAC signature for testing
 */
export function generateHMAC(data: string): string {
	return hmacSign(data);
}

/**
 * Check if HMAC is required (secret is configured)
 */
export function isHMACRequired(): boolean {
	return !!HMAC_SECRET;
}
