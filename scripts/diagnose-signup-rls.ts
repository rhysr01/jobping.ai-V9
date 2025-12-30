/**
 * Diagnose Signup RLS Issue
 *
 * Checks if SUPABASE_SERVICE_ROLE_KEY is configured correctly
 * and verifies RLS policies exist
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

async function diagnose() {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
	const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	console.log("\n🔍 Signup RLS Diagnosis");
	console.log("================================\n");

	// Check environment variables
	console.log("1. Environment Variables:");
	console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? "✅" : "❌"}`);
	console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${serviceRoleKey ? "✅" : "❌"}`);
	console.log(`   NEXT_PUBLIC_SUPABASE_ANON_KEY: ${anonKey ? "✅" : "❌"}`);

	if (!supabaseUrl || !serviceRoleKey) {
		console.error("\n❌ Missing required environment variables!");
		console.error(
			"   Make sure SUPABASE_SERVICE_ROLE_KEY is set in production.",
		);
		process.exit(1);
	}

	// Check key format
	console.log("\n2. Service Role Key Format:");
	console.log(`   Length: ${serviceRoleKey.length} chars`);
	console.log(`   Starts with: ${serviceRoleKey.substring(0, 20)}...`);

	// Service role keys are typically JWT tokens
	if (serviceRoleKey.length < 100) {
		console.warn(
			"   ⚠️  Service role key seems too short (should be ~200+ chars)",
		);
	}

	// Create client with service role key
	console.log("\n3. Testing Service Role Client:");
	const supabase = createClient(supabaseUrl, serviceRoleKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	});

	try {
		// Test connection
		const { data, error } = await supabase
			.from("users")
			.select("count")
			.limit(1);

		if (error) {
			console.error(`   ❌ Connection failed: ${error.message}`);
			console.error(`   Code: ${error.code}`);
			console.error(`   Details: ${error.details}`);
			console.error(`   Hint: ${error.hint}`);
		} else {
			console.log("   ✅ Service role client connection successful");
		}

		// Check RLS policies
		console.log("\n4. Checking RLS Policies:");
		const { data: policies, error: policyError } = await supabase.rpc(
			"exec_sql",
			{
				query: `
          SELECT 
            tablename, 
            policyname, 
            roles, 
            cmd,
            with_check
          FROM pg_policies
          WHERE schemaname = 'public'
            AND tablename = 'users'
            AND cmd = 'INSERT'
          ORDER BY policyname;
        `,
			},
		);

		if (policyError) {
			// Try direct query instead
			const { data: directPolicies, error: directError } = await supabase
				.from("pg_policies")
				.select("*")
				.eq("tablename", "users")
				.eq("cmd", "INSERT");

			if (directError) {
				console.log("   ⚠️  Cannot query policies directly (this is normal)");
				console.log("   Run the SQL manually in Supabase Dashboard:");
				console.log(
					"   SELECT tablename, policyname, roles, cmd FROM pg_policies",
				);
				console.log(
					"   WHERE schemaname = 'public' AND tablename = 'users' AND cmd = 'INSERT';",
				);
			} else {
				console.log(`   Found ${directPolicies?.length || 0} INSERT policies`);
				directPolicies?.forEach((p: any) => {
					console.log(`   - ${p.policyname} (roles: ${p.roles})`);
				});
			}
		} else {
			console.log(`   Found ${policies?.length || 0} INSERT policies`);
			policies?.forEach((p: any) => {
				console.log(`   - ${p.policyname} (roles: ${p.roles})`);
			});
		}

		// Test insert (dry run - don't actually insert)
		console.log("\n5. Testing Insert Permissions:");
		console.log("   Attempting test insert (will be rolled back)...");

		const testUserData = {
			email: `test-${Date.now()}@example.com`,
			full_name: "Test User",
			target_cities: ["London"],
			subscription_tier: "free",
			email_verified: false,
			subscription_active: false,
			created_at: new Date().toISOString(),
		};

		const { data: insertData, error: insertError } = await supabase
			.from("users")
			.insert([testUserData])
			.select()
			.single();

		if (insertError) {
			console.error(`   ❌ Insert failed: ${insertError.message}`);
			console.error(`   Code: ${insertError.code}`);
			console.error(`   Details: ${insertError.details}`);
			console.error(`   Hint: ${insertError.hint}`);

			if (insertError.code === "42501") {
				console.error("\n   🔴 RLS POLICY ERROR DETECTED!");
				console.error("   The service role key is being blocked by RLS.");
				console.error("\n   Solutions:");
				console.error(
					"   1. Apply migration: migrations/fix_signup_rls_service_role.sql",
				);
				console.error(
					"   2. Verify SUPABASE_SERVICE_ROLE_KEY is set in Vercel",
				);
				console.error(
					"   3. Check that the key is the service_role key, not anon key",
				);
			}
		} else {
			console.log("   ✅ Insert successful (service role bypasses RLS)");

			// Clean up test user
			if (insertData?.email) {
				await supabase.from("users").delete().eq("email", insertData.email);
				console.log("   🧹 Test user cleaned up");
			}
		}
	} catch (error) {
		console.error("   ❌ Unexpected error:", error);
	}

	console.log("\n================================");
	console.log("Diagnosis complete!\n");
}

diagnose().catch(console.error);
