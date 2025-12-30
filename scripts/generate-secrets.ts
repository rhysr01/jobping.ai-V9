#!/usr/bin/env tsx
/**
 * Generate secure random secrets for production environment variables
 *
 * Usage:
 *   npm run generate-secrets
 *   tsx scripts/generate-secrets.ts
 *
 * This script generates cryptographically secure random secrets for:
 * - PREFERENCES_SECRET (≥32 chars)
 * - EMAIL_VERIFICATION_SECRET (≥32 chars)
 * - INTERNAL_API_HMAC_SECRET (≥32 chars) - if not already set
 *
 * Output format is suitable for copying into Vercel environment variables.
 */

import crypto from "node:crypto";

function generateSecret(length: number = 64): string {
	return crypto.randomBytes(length).toString("hex");
}

function _generateBase64Secret(length: number = 48): string {
	return crypto.randomBytes(length).toString("base64url");
}

console.log("\n🔐 Generating Secure Secrets for Production\n");
console.log("=".repeat(70));
console.log("\nCopy these values into your Vercel environment variables:\n");

// Generate secrets
const preferencesSecret = generateSecret(32); // 64 hex chars
const emailVerificationSecret = generateSecret(32); // 64 hex chars
const hmacSecret = generateSecret(32); // 64 hex chars

console.log(`PREFERENCES_SECRET=${preferencesSecret}`);
console.log(`\nEMAIL_VERIFICATION_SECRET=${emailVerificationSecret}`);
console.log(`\nINTERNAL_API_HMAC_SECRET=${hmacSecret}`);

console.log(`\n${"=".repeat(70)}`);
console.log("\n📋 Instructions:");
console.log("1. Copy each value above");
console.log(
	"2. Go to Vercel Dashboard → Your Project → Settings → Environment Variables",
);
console.log("3. Add each variable for Production environment");
console.log("4. Redeploy your application");
console.log("\n⚠️  Security Notes:");
console.log("- Store these secrets securely (never commit to git)");
console.log("- Each secret must be ≥32 characters");
console.log("- Rotate secrets quarterly or after security incidents");
console.log("- Keep backups in a secure password manager");
console.log(
	"\n✅ After setting these, the security warnings will disappear.\n",
);
