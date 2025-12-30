/**
 * Test Supabase Connection
 * Diagnoses "Failed to fetch" errors
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(process.cwd(), ".env.local");
if (existsSync(envPath)) {
	dotenv.config({ path: envPath });
	console.log(`✅ Loaded .env.local from: ${envPath}`);
} else {
	console.error(`❌ .env.local not found at: ${envPath}`);
	process.exit(1);
}

async function testConnection() {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
	const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

	console.log("\n🔍 Supabase Configuration Check:");
	console.log("================================");
	console.log(
		`NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? "✅ Set" : "❌ Missing"}`,
	);
	if (supabaseUrl) {
		console.log(`  URL: ${supabaseUrl.substring(0, 30)}...`);
		console.log(
			`  Valid format: ${supabaseUrl.startsWith("https://") ? "✅" : "❌"}`,
		);
	}
	console.log(
		`SUPABASE_SERVICE_ROLE_KEY: ${supabaseKey ? "✅ Set" : "❌ Missing"}`,
	);
	if (supabaseKey) {
		console.log(`  Key length: ${supabaseKey.length} chars`);
		console.log(`  Starts with: ${supabaseKey.substring(0, 10)}...`);
	}
	console.log(
		`SUPABASE_ANON_KEY: ${supabaseAnonKey ? "✅ Set" : "❌ Missing"}`,
	);

	if (!supabaseUrl || !supabaseKey) {
		console.error("\n❌ Missing required Supabase configuration!");
		process.exit(1);
	}

	// Test network connectivity
	console.log("\n🌐 Network Connectivity Test:");
	console.log("================================");

	try {
		const urlObj = new URL(supabaseUrl);
		const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
		console.log(`Testing connection to: ${baseUrl}`);

		const response = await fetch(`${baseUrl}/rest/v1/`, {
			method: "GET",
			headers: {
				apikey: supabaseKey,
				Authorization: `Bearer ${supabaseKey}`,
			},
		});

		console.log(`Status: ${response.status} ${response.statusText}`);
		if (response.ok) {
			console.log("✅ Network connection successful!");
		} else {
			console.log(`⚠️  Connection returned status ${response.status}`);
			const text = await response.text();
			console.log(`Response: ${text.substring(0, 200)}`);
		}
	} catch (error: any) {
		console.error("❌ Network connection failed:", error.message);
		console.error("Error details:", error);
	}

	// Test Supabase client
	console.log("\n📦 Supabase Client Test:");
	console.log("================================");

	try {
		const { createClient } = await import("@supabase/supabase-js");
		const supabase = createClient(supabaseUrl, supabaseKey, {
			auth: {
				autoRefreshToken: false,
				persistSession: false,
			},
		});

		console.log("Testing database query...");
		const { data, error } = await supabase.from("jobs").select("id").limit(1);

		if (error) {
			console.error("❌ Database query failed:", error.message);
			console.error("Error code:", error.code);
			console.error("Error details:", error);
		} else {
			console.log("✅ Database query successful!");
			console.log(`Sample data: ${data ? "Found" : "No data"}`);
		}
	} catch (error: any) {
		console.error("❌ Supabase client error:", error.message);
		console.error("Error stack:", error.stack);
	}

	// Check for common issues
	console.log("\n🔧 Common Issues Check:");
	console.log("================================");

	if (supabaseUrl?.includes("api.supabase.com")) {
		console.log('⚠️  WARNING: URL contains "api.supabase.com"');
		console.log(
			"   This is incorrect. Should be: https://[project-ref].supabase.co",
		);
	}

	if (supabaseUrl && !supabaseUrl.includes(".supabase.co")) {
		console.log("⚠️  WARNING: URL does not match Supabase format");
		console.log("   Expected: https://[project-ref].supabase.co");
	}

	if (supabaseKey && supabaseKey.length < 100) {
		console.log("⚠️  WARNING: Service role key seems too short");
		console.log("   Expected length: ~150+ characters");
	}

	console.log("\n✅ Diagnostic complete!");
}

testConnection().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
