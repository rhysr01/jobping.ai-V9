import { createHash } from "node:crypto";
import { apiLogger } from "../lib/api-logger";
import {
	issueSecureToken,
	verifySecureToken,
} from "./authentication/secureTokens";
import { getDatabaseClient } from "./core/database-pool";
import {
	assertValidFrom,
	EMAIL_CONFIG,
	getResendClient,
} from "./email/clients";
import { createVerificationEmail } from "./email/productionReadyTemplates";
import { getBaseUrl } from "./url-helpers";

interface VerificationResult {
	valid: boolean;
	reason?: string;
}

export function generateVerificationToken(
	email: string,
	ttlMinutes: number = 60 * 24,
): string {
	return issueSecureToken(email, "email_verification", { ttlMinutes });
}

export async function persistVerificationToken(
	email: string,
	token: string,
	expiresAt: number,
): Promise<void> {
	const supabase = getDatabaseClient();
	const tokenHash = createHash("sha256").update(token).digest("hex");

	const { error } = await supabase.from("email_verification_requests").upsert({
		email: email.trim().toLowerCase(),
		token_hash: tokenHash,
		expires_at: new Date(expiresAt).toISOString(),
		consumed_at: null,
	});

	if (error) {
		throw new Error(`Failed to persist verification token: ${error.message}`);
	}
}

export async function verifyVerificationToken(
	email: string,
	token: string,
): Promise<VerificationResult> {
	const verification = verifySecureToken(email, token, "email_verification");
	if (!verification.valid) {
		return { valid: false, reason: verification.reason };
	}

	const supabase = getDatabaseClient();
	const tokenHash = createHash("sha256").update(token).digest("hex");

	const { data, error } = await supabase
		.from("email_verification_requests")
		.select("expires_at")
		.eq("email", email.trim().toLowerCase())
		.eq("token_hash", tokenHash)
		.is("consumed_at", null)
		.single();

	if (error || !data) {
		return { valid: false, reason: "Token not found" };
	}

	if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
		return { valid: false, reason: "Token expired" };
	}

	const { error: consumeError } = await supabase
		.from("email_verification_requests")
		.update({ consumed_at: new Date().toISOString() })
		.eq("email", email.trim().toLowerCase());

	if (consumeError) {
		return { valid: false, reason: "Failed to mark token as consumed" };
	}

	return { valid: true };
}

export async function markUserVerified(email: string): Promise<void> {
	const supabase = getDatabaseClient();
	const { error } = await supabase
		.from("users")
		.update({
			email_verified: true,
			updated_at: new Date().toISOString(),
		})
		.eq("email", email.trim().toLowerCase());

	if (error) {
		throw new Error(
			`Failed to update user verification status: ${error.message}`,
		);
	}
}

export async function sendVerificationEmail(email: string): Promise<void> {
	const normalizedEmail = email.trim().toLowerCase();
	const token = generateVerificationToken(normalizedEmail);
	const verification = verifySecureToken(
		normalizedEmail,
		token,
		"email_verification",
	);

	if (!verification.valid || !verification.expiresAt) {
		throw new Error("Failed to generate verification token");
	}

	await persistVerificationToken(
		normalizedEmail,
		token,
		verification.expiresAt,
	);

	const startTime = Date.now();
	const baseUrl = getBaseUrl();
	const link = `${baseUrl}/api/verify-email?email=${encodeURIComponent(
		normalizedEmail,
	)}&token=${encodeURIComponent(token)}`;

	apiLogger.info("sendVerificationEmail called", {
		to: normalizedEmail,
	});

	console.log(`[EMAIL] sendVerificationEmail called for ${normalizedEmail}`);

	// Check API key BEFORE creating client (same pattern as sender.ts)
	const apiKey = process.env.RESEND_API_KEY;
	if (!apiKey) {
		const error = new Error("RESEND_API_KEY environment variable is not set");
		console.error(`[EMAIL] ❌ Missing API key`);
		apiLogger.error("RESEND_API_KEY missing", error);
		throw error;
	}

	if (!apiKey.startsWith("re_")) {
		const error = new Error(
			`Invalid RESEND_API_KEY format: must start with "re_"`,
		);
		console.error(`[EMAIL] ❌ Invalid API key format`);
		apiLogger.error("Invalid RESEND_API_KEY format", error);
		throw error;
	}

	try {
		const resend = getResendClient();
		console.log(`[EMAIL] Resend client initialized. API Key present: true`);

		// Use production template for consistent styling
		const htmlContent = createVerificationEmail(link, normalizedEmail);
		const subject = "Verify your JobPing email address";
		const baseUrl2 = getBaseUrl();
		const textContent = `Verify your JobPing email address: ${link}

This link expires in 24 hours.

If you did not create a JobPing account, you can safely ignore this email.

Need help? Visit ${baseUrl2} or contact contact@getjobping.com

- The JobPing Team`;

		apiLogger.info("Verification email content generated", {
			from: EMAIL_CONFIG.from,
		});
		assertValidFrom(EMAIL_CONFIG.from);

		apiLogger.info("Attempting to send verification email", {
			to: normalizedEmail,
			from: EMAIL_CONFIG.from,
		});
		console.log(
			`[EMAIL] Attempting to send verification email from ${EMAIL_CONFIG.from} to ${normalizedEmail}`,
		);

		// Add timeout to prevent hanging (same as sender.ts)
		const sendPromise = resend.emails.send({
			from: EMAIL_CONFIG.from,
			to: [normalizedEmail],
			subject,
			text: textContent,
			html: htmlContent,
		});

		const timeoutPromise = new Promise((_, reject) =>
			setTimeout(
				() => reject(new Error("Email send timeout after 15 seconds")),
				15000,
			),
		);

		const result = (await Promise.race([sendPromise, timeoutPromise])) as any;

		// Handle Resend response format (same as sender.ts)
		if (result?.error) {
			throw new Error(`Resend API error: ${JSON.stringify(result.error)}`);
		}

		const emailId = result?.data?.id || result?.id || "unknown";

		// Track successful send (same pattern as sender.ts)
		apiLogger.info("Verification email sent successfully", {
			to: normalizedEmail,
			emailId,
			duration: Date.now() - startTime,
		});
		console.log(
			`[EMAIL] ✅ Verification email sent successfully to ${normalizedEmail}. Email ID: ${emailId}`,
		);
		return result;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		const errorStack = error instanceof Error ? error.stack : undefined;
		const errorType = error?.constructor?.name || "UnknownError";
		const rawError = String(error);

		// Track failed send (same pattern as sender.ts)
		apiLogger.error("Verification email failed", error as Error, {
			to: normalizedEmail,
			errorMessage,
			errorStack,
			errorType,
			rawError,
			duration: Date.now() - startTime,
		});
		console.error(
			`[EMAIL] ❌ Verification email failed for ${normalizedEmail}: ${errorMessage}`,
		);

		// Re-throw with context
		throw error;
	}
}

export async function checkEmailVerificationStatus(
	email: string,
): Promise<{ verified: boolean }> {
	const supabase = getDatabaseClient();
	const { data, error } = await supabase
		.from("users")
		.select("email_verified")
		.eq("email", email.trim().toLowerCase())
		.single();

	if (error || !data) {
		return { verified: false };
	}

	return { verified: Boolean(data.email_verified) };
}
