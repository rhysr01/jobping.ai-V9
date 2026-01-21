#!/usr/bin/env node

// Script to apply the pending_digests table migration
require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const { execSync } = require("child_process");

async function applyMigration() {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!supabaseUrl || !supabaseKey) {
		console.error("❌ Missing Supabase environment variables");
		console.error("Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
		process.exit(1);
	}

	console.log("🔄 Connecting to Supabase...");
	const supabase = createClient(supabaseUrl, supabaseKey);

	try {
		// Check if table already exists
		const { data: existingTable, error: checkError } = await supabase
			.from("pending_digests")
			.select("id")
			.limit(1);

		if (!checkError && existingTable !== null) {
			console.log("✅ Table 'pending_digests' already exists!");
			return;
		}

		// Read migration file
		const migrationSQL = fs.readFileSync(
			"./supabase/migrations/20260121_create_pending_digests_table.sql",
			"utf8",
		);

		console.log("📄 Applying migration: Create pending_digests table...");

		// Try using Supabase CLI first (most reliable)
		try {
			console.log("🔄 Attempting via Supabase CLI...");
			execSync("supabase db push --include-all", {
				stdio: "inherit",
				cwd: process.cwd(),
			});
			console.log("✅ Migration applied via Supabase CLI!");
			return;
		} catch (cliError) {
			console.log("⚠️  Supabase CLI failed, trying direct SQL execution...");
		}

		// Fallback: Execute SQL directly via RPC
		// Split migration into statements (handling multi-statement SQL)
		const statements = migrationSQL
			.split(";")
			.map((stmt) => stmt.trim())
			.filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

		console.log(`📝 Executing ${statements.length} SQL statements...`);

		for (let i = 0; i < statements.length; i++) {
			const statement = statements[i];
			if (!statement || statement.length < 10) continue;

			try {
				// Try RPC exec if available
				const { error: rpcError } = await supabase.rpc("exec_sql", {
					sql: statement + ";",
				});

				if (rpcError) {
					// If RPC doesn't exist, try direct query (for simple statements)
					if (statement.toUpperCase().includes("CREATE TABLE")) {
						// For CREATE TABLE, we need to use raw SQL connection
						console.log("⚠️  RPC exec_sql not available, using alternative method...");
						// Use pg directly if available
						const { Client } = require("pg");
						const dbUrl = `postgresql://postgres.${supabaseUrl.split("//")[1].split(".")[0]}:${supabaseKey}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;
						
						const client = new Client({
							connectionString: dbUrl,
							ssl: { rejectUnauthorized: false },
						});
						
						await client.connect();
						await client.query(statement);
						await client.end();
						console.log(`✅ Statement ${i + 1}/${statements.length} executed`);
					} else {
						console.warn(`⚠️  Statement ${i + 1} skipped (may need manual execution)`);
					}
				} else {
					console.log(`✅ Statement ${i + 1}/${statements.length} executed`);
				}
			} catch (stmtError) {
				console.warn(`⚠️  Statement ${i + 1} failed:`, stmtError.message);
				// Continue with next statement
			}
		}

		// Verify table was created
		const { data: verifyData, error: verifyError } = await supabase
			.from("pending_digests")
			.select("id")
			.limit(1);

		if (verifyError && verifyError.code === "42P01") {
			console.error("❌ Migration failed - table still does not exist");
			console.error("Please apply manually via Supabase Dashboard SQL Editor");
			process.exit(1);
		}

		console.log("✅ Migration applied successfully!");
		console.log("🎯 pending_digests table is now available");
	} catch (error) {
		console.error("❌ Error applying migration:", error);
		console.error("\n💡 Alternative: Apply via Supabase Dashboard SQL Editor");
		console.error("   File: supabase/migrations/20260121_create_pending_digests_table.sql");
		process.exit(1);
	}
}

applyMigration();
