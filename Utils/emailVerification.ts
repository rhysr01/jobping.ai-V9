import { createHash } from "node:crypto";
import { issueSecureToken, verifySecureToken } from "./auth/secureTokens";
import { getDatabaseClient } from "./databasePool";
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
    .select("*")
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

  const baseUrl = getBaseUrl();
  const link = `${baseUrl}/api/verify-email?email=${encodeURIComponent(
    normalizedEmail,
  )}&token=${encodeURIComponent(token)}`;

  const resend = getResendClient();
  assertValidFrom(EMAIL_CONFIG.from);

  // Use production template for consistent styling
  const html = createVerificationEmail(link, normalizedEmail);
  const subject = "Verify your JobPing email address";

  const result = await resend.emails.send({
    from: EMAIL_CONFIG.from,
    to: [normalizedEmail],
    subject,
    html,
    text: `Verify your JobPing email address: ${link}\n\nThis link expires in 24 hours.\n\nIf you did not create a JobPing account, you can safely ignore this email.`,
  });

  if (result?.error) {
    throw new Error(`Resend error: ${JSON.stringify(result.error)}`);
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
