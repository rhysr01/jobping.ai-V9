/**
 * Verify Service Role Key
 *
 * Tests if SUPABASE_SERVICE_ROLE_KEY is actually a service role key
 * by attempting to bypass RLS
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

async function verify() {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
	const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	console.log("\n🔍 Service Role Key Verification");
	console.log("================================\n");

	if (!supabaseUrl || !serviceRoleKey) {
		console.error("❌ Missing required environment variables");
		process.exit(1);
	}

	// Compare keys
	console.log("1. Key Comparison:");
	console.log(
		`   Service Role Key: ${serviceRoleKey.length} chars, starts with: ${serviceRoleKey.substring(0, 20)}...`,
	);
	if (anonKey) {
		console.log(
			`   Anon Key: ${anonKey.length} chars, starts with: ${anonKey.substring(0, 20)}...`,
		);
		if (serviceRoleKey === anonKey) {
			console.error(
				"   ❌ CRITICAL: Service role key and anon key are the SAME!",
			);
			console.error(
				"   This is why RLS is blocking - you're using the anon key!",
			);
			process.exit(1);
		} else {
			console.log("   ✅ Keys are different (good)");
		}
	}

	// Create client with service role key
	console.log("\n2. Testing Service Role Key:");
	const supabase = createClient(supabaseUrl, serviceRoleKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
		db: {
			schema: "public",
		},
	});

	// Test 1: Try to read from a protected table (should work with service role)
	console.log("   Testing read access...");
	const { error: readError } = await supabase
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
		}
	} else {
		console.log("   ✅ Read access works");
	}

	// Test 2: Try to insert (this is what's failing in production)
	console.log("\n3. Testing Insert (RLS Bypass):");
	const testEmail = `test-verify-${Date.now()}@example.com`;
	const testUser = {
		email: testEmail,
		full_name: "Test Verify User",
		target_cities: ["London"],
		subscription_tier: "free",
		email_verified: false,
		subscription_active: false,
		created_at: new Date().toISOString(),
	};

	const { error: insertError } = await supabase
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
			console.error("   2. The key format is incorrect");
			console.error("   3. Supabase configuration issue");
			console.error("\n   Solution:");
			console.error("   1. Go to Supabase Dashboard → Settings → API");
			console.error('   2. Copy the "service_role" key (NOT the "anon" key)');
			console.error("   3. Update SUPABASE_SERVICE_ROLE_KEY in Vercel");
		}
	} else {
		console.log("   ✅ Insert successful - service role key is working!");

		// Clean up
		await supabase.from("users").delete().eq("email", testEmail);
		console.log("   🧹 Test user cleaned up");
	}

	// Test 3: Check if we can query RLS policies (service role should be able to)
	console.log("\n4. Testing Admin Access:");
	let policyData, policyError;
	try {
		const result = await supabase.rpc("exec_sql", {
			query: `SELECT policyname, roles FROM pg_policies WHERE tablename = 'users' AND cmd = 'INSERT'`,
		});
		policyData = result.data;
		policyError = result.error;
	} catch (_err) {
		policyData = null;
		policyError = { message: "RPC not available" };
	}

	if (policyError && policyError.message !== "RPC not available") {
		console.log("   ⚠️  Cannot query policies directly (this is normal)");
	} else if (policyData) {
		console.log("   ✅ Can query policies (service role confirmed)");
	}

	console.log("\n================================");
	console.log("Verification complete!\n");
}

verify().catch(console.error);
