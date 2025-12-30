/**
 * Check Supabase Environment Variables
 * Shows which variables are set without exposing their values
 */

import { existsSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

// Load environment variables
const envPath = path.join(process.cwd(), ".env.local");
if (existsSync(envPath)) {
	dotenv.config({ path: envPath });
}

console.log("\n🔍 Supabase Environment Variables Check");
console.log("==========================================\n");

const vars = {
	NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
	SUPABASE_URL: process.env.SUPABASE_URL,
	SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
	SUPABASE_KEY: process.env.SUPABASE_KEY,
	SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
	NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};

console.log("Environment Variables Status:");
console.log("─────────────────────────────\n");

for (const [name, value] of Object.entries(vars)) {
	const isSet = !!value;
	const status = isSet ? "✅ SET" : "❌ MISSING";
	const length = value?.length || 0;

	console.log(`${status} ${name}`);
	if (isSet) {
		console.log(`   Length: ${length} characters`);
		console.log(`   Starts with: ${value?.substring(0, 20)}...`);

		// Special checks
		if (name.includes("SERVICE_ROLE")) {
			if (length < 100) {
				console.log(
					`   ⚠️  WARNING: Too short! Service role keys are typically 200+ chars`,
				);
			} else {
				console.log(`   ✅ Length looks correct for service role key`);
			}
		}

		if (name.includes("ANON")) {
			if (length < 100) {
				console.log(
					`   ⚠️  WARNING: Too short! Anon keys are typically 200+ chars`,
				);
			} else {
				console.log(`   ✅ Length looks correct for anon key`);
			}
		}
	}
	console.log("");
}

// Check for potential confusion
console.log("\n🔍 Potential Issues:");
console.log("─────────────────────\n");

const hasServiceRole = !!vars.SUPABASE_SERVICE_ROLE_KEY;
const _hasAnon = !!(
	vars.SUPABASE_ANON_KEY || vars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const hasGenericKey = !!vars.SUPABASE_KEY;

if (!hasServiceRole) {
	console.log("❌ SUPABASE_SERVICE_ROLE_KEY is MISSING");
	console.log("   This is REQUIRED for server-side operations (like signup)");
	console.log(
		"   Get it from: Supabase Dashboard → Settings → API → Service Role Key\n",
	);
}

if (hasGenericKey && !hasServiceRole) {
	console.log("⚠️  You have SUPABASE_KEY but not SUPABASE_SERVICE_ROLE_KEY");
	console.log("   The code expects SUPABASE_SERVICE_ROLE_KEY specifically\n");
}

if (
	hasServiceRole &&
	vars.SUPABASE_SERVICE_ROLE_KEY &&
	vars.SUPABASE_SERVICE_ROLE_KEY.length < 100
) {
	console.log("⚠️  SUPABASE_SERVICE_ROLE_KEY seems too short");
	console.log(
		"   This might actually be the anon key, not the service role key",
	);
	console.log("   Service role keys are typically 200+ characters\n");
}

// Check URL
const url = vars.NEXT_PUBLIC_SUPABASE_URL || vars.SUPABASE_URL;
if (!url) {
	console.log(
		"❌ No Supabase URL found (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL)\n",
	);
} else if (!url.includes(".supabase.co")) {
	console.log("⚠️  Supabase URL format looks incorrect");
	console.log(`   Got: ${url.substring(0, 50)}...`);
	console.log("   Expected format: https://[project-ref].supabase.co\n");
}

console.log("\n📋 What the Code Expects:");
console.log("─────────────────────────\n");
console.log("Required for server-side (signup, etc.):");
console.log("  ✅ NEXT_PUBLIC_SUPABASE_URL");
console.log("  ✅ SUPABASE_SERVICE_ROLE_KEY (200+ chars, starts with eyJ...)");
console.log("");
console.log("Optional for client-side:");
console.log("  ⚪ NEXT_PUBLIC_SUPABASE_ANON_KEY (for client components)");
console.log("");

console.log("==========================================\n");
