#!/usr/bin/env node

// Auto-apply pending_digests migration using Supabase client
require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

async function applyMigration() {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!supabaseUrl || !supabaseKey) {
		console.error("❌ Missing Supabase environment variables");
		process.exit(1);
	}

	console.log("🔄 Connecting to Supabase...");
	const supabase = createClient(supabaseUrl, supabaseKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	});

	try {
		// Check if table already exists
		const { error: checkError } = await supabase
			.from("pending_digests")
			.select("id")
			.limit(1);

		if (!checkError) {
			console.log("✅ Table 'pending_digests' already exists!");
			return;
		}

		// Read migration file
		const migrationSQL = fs.readFileSync(
			"./supabase/migrations/20260121_create_pending_digests_table.sql",
			"utf8",
		);

		console.log("📄 Applying migration: Create pending_digests table...");

		// Use pg client for direct SQL execution
		const { Client } = require("pg");
		
		// Extract project ref from URL
		const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
		if (!projectRef) {
			throw new Error("Could not extract project ref from Supabase URL");
		}

		// Build connection string for direct database access
		const dbUrl = `postgresql://postgres.${projectRef}:${supabaseKey}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;
		
		const client = new Client({
			connectionString: dbUrl,
			ssl: { rejectUnauthorized: false },
		});

		await client.connect();
		console.log("✅ Connected to database");

		// Execute migration SQL
		await client.query(migrationSQL);
		
		await client.end();
		console.log("✅ Migration applied successfully!");
		console.log("🎯 pending_digests table is now available");

		// Verify
		const { data: verifyData, error: verifyError } = await supabase
			.from("pending_digests")
			.select("id")
			.limit(1);

		if (verifyError) {
			console.warn("⚠️  Verification query failed, but migration may have succeeded");
		} else {
			console.log("✅ Verification: Table exists and is accessible");
		}
	} catch (error) {
		console.error("❌ Error applying migration:", error.message);
		console.error("\n💡 Alternative: Apply via Supabase Dashboard SQL Editor");
		console.error("   1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql");
		console.error("   2. Copy contents of: supabase/migrations/20260121_create_pending_digests_table.sql");
		console.error("   3. Paste and Run");
		process.exit(1);
	}
}

applyMigration();
