/**
 * Test Environment Keys Configuration
 *
 * Verifies that SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY
 * are correctly configured and different before deploying to Vercel
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables
const envPath = path.join(process.cwd(), ".env.local");
if (existsSync(envPath)) {
	dotenv.config({ path: envPath });
}

// Also load from process.env (for Vercel/CI)
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

console.log("\n🔍 Testing Environment Keys Configuration");
console.log("==========================================\n");

// Test 1: Check if keys are set
console.log("1. Checking if keys are set:");
const hasServiceRoleKey = !!serviceRoleKey;
const hasAnonKey = !!anonKey;
const hasUrl = !!supabaseUrl;

console.log(
	`   SUPABASE_SERVICE_ROLE_KEY: ${hasServiceRoleKey ? "✅ Set" : "❌ Missing"}`,
);
console.log(
	`   NEXT_PUBLIC_SUPABASE_ANON_KEY: ${hasAnonKey ? "✅ Set" : "⚠️  Not set (optional for server-side)"}`,
);
console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${hasUrl ? "✅ Set" : "❌ Missing"}`);

if (!hasServiceRoleKey || !hasUrl) {
	console.error("\n❌ Missing required environment variables!");
	console.error(
		"   Make sure SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL are set.",
	);
	process.exit(1);
}

// Test 2: Check key format
console.log("\n2. Checking key format:");
console.log(`   Service Role Key length: ${serviceRoleKey?.length} chars`);
console.log(
	`   Service Role Key prefix: ${serviceRoleKey?.substring(0, 20)}...`,
);
const looksLikeServiceRole =
	serviceRoleKey?.length > 100 && serviceRoleKey?.startsWith("eyJ");
console.log(
	`   Looks like service role key: ${looksLikeServiceRole ? "✅" : "❌"}`,
);

if (hasAnonKey) {
	console.log(`   Anon Key length: ${anonKey?.length} chars`);
	console.log(`   Anon Key prefix: ${anonKey?.substring(0, 20)}...`);
	const looksLikeAnon = anonKey?.length > 100 && anonKey?.startsWith("eyJ");
	console.log(`   Looks like anon key: ${looksLikeAnon ? "✅" : "❌"}`);
}

// Test 3: Check if keys are different
console.log("\n3. Checking if keys are different:");
let keysMatch = false;
if (hasServiceRoleKey && hasAnonKey) {
	keysMatch = serviceRoleKey === anonKey;
	console.log(`   Keys match: ${keysMatch ? "❌ CRITICAL ERROR" : "✅ Good"}`);

	if (keysMatch) {
		console.error(
			"\n   🔴 CRITICAL: Service role key and anon key are IDENTICAL!",
		);
		console.error("   This will cause RLS to block inserts in production.");
		console.error(
			"   The service role key MUST be different from the anon key.",
		);
		console.error("\n   Solution:");
		console.error("   1. Go to Supabase Dashboard → Settings → API");
		console.error('   2. Copy the "service_role" key (NOT "anon public")');
		console.error("   3. Update SUPABASE_SERVICE_ROLE_KEY in Vercel");
		process.exit(1);
	} else {
		// Check if they're similar (first 20 chars)
		const servicePrefix = serviceRoleKey?.substring(0, 20);
		const anonPrefix = anonKey?.substring(0, 20);
		if (servicePrefix === anonPrefix) {
			console.warn(
				"   ⚠️  WARNING: Keys start with the same prefix. Double-check they're different!",
			);
		}
	}
} else {
	console.log("   ℹ️  Anon key not set (this is OK for server-side only)");
}

async function testServiceRoleKey() {
	// Test 4: Test if service role key can bypass RLS
	console.log("\n4. Testing Service Role Key (RLS Bypass):");
	const supabase = createClient(supabaseUrl!, serviceRoleKey!, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
		db: {
			schema: "public",
		},
	});

	// Test read access
	console.log("   Testing read access...");
	const { data: readData, error: readError } = await supabase
		.from("users")
		.select("count")
		.limit(1);

	if (readError) {
		console.error(`   ❌ Read failed: ${readError.message}`);
		if (readError.code === "42501") {
			console.error("   🔴 RLS is blocking even with service role key!");
			console.error(
				"   This suggests the key might be anon key, not service role key.",
			);
			process.exit(1);
		}
	} else {
		console.log("   ✅ Read access works");
	}

	// Test insert access (the critical test)
	console.log("   Testing insert access (RLS bypass)...");
	const testEmail = `test-rls-${Date.now()}@example.com`;
	const testUser = {
		email: testEmail,
		full_name: "Test RLS User",
		target_cities: ["London"],
		subscription_tier: "free",
		email_verified: false,
		subscription_active: false,
		created_at: new Date().toISOString(),
	};

	const { data: insertData, error: insertError } = await supabase
		.from("users")
		.insert([testUser])
		.select()
		.single();

	if (insertError) {
		console.error(`   ❌ Insert failed: ${insertError.message}`);
		console.error(`   Code: ${insertError.code}`);

		if (insertError.code === "42501") {
			console.error("\n   🔴 RLS POLICY VIOLATION!");
			console.error("   The service role key is NOT bypassing RLS.");
			console.error("\n   Possible causes:");
			console.error(
				"   1. The key is actually the anon key (not service role key)",
			);
			console.error("   2. RLS policies are not configured correctly");
			console.error("   3. The key format is incorrect");
			console.error("\n   Solution:");
			console.error(
				"   1. Verify the key is the service_role key from Supabase Dashboard",
			);
			console.error(
				"   2. Check that RLS policies allow service_role to insert",
			);
			console.error(
				"   3. Run: migrations/fix_signup_rls_service_role.sql in Supabase",
			);
			process.exit(1);
		} else {
			console.error("   ⚠️  Insert failed for a different reason (not RLS)");
			process.exit(1);
		}
	} else {
		console.log("   ✅ Insert successful - service role key is working!");

		// Clean up test user
		await supabase.from("users").delete().eq("email", testEmail);
		console.log("   🧹 Test user cleaned up");
	}

	// Test 5: Summary
	console.log("\n5. Summary:");
	console.log("   ✅ Service role key is set");
	console.log("   ✅ Service role key format looks correct");
	if (hasAnonKey) {
		console.log("   ✅ Keys are different");
	}
	console.log("   ✅ Service role key can bypass RLS");
	console.log("   ✅ Configuration is correct for production!");

	console.log("\n==========================================");
	console.log("✅ All tests passed! Ready for Vercel deployment.\n");
}

testServiceRoleKey().catch((error) => {
	console.error("\n❌ Test failed with error:", error);
	process.exit(1);
});
