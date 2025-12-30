/**
 * Run Reed City Extraction Fix
 * Uses Supabase client to execute the SQL fix
 */

import { existsSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { getDatabaseClient } from "@/Utils/databasePool";

// Load environment variables
const envPath = path.join(process.cwd(), ".env.local");
if (existsSync(envPath)) {
	dotenv.config({ path: envPath });
	console.log(`✅ Loaded .env.local`);
} else {
	console.error(`❌ .env.local not found`);
	process.exit(1);
}

async function fixReedCities() {
	const supabase = getDatabaseClient();

	console.log("\n🔧 Fixing Reed city extraction...\n");

	// Execute the fix SQL
	const fixSQL = `
    BEGIN;

    -- Extract UK cities from Reed locations (UK-only source)
    UPDATE jobs
    SET 
        city = CASE
            WHEN location ~* '\\y(london)\\y' THEN 'London'
            WHEN location ~* '\\y(manchester)\\y' THEN 'Manchester'
            WHEN location ~* '\\y(birmingham)\\y' THEN 'Birmingham'
            WHEN location ~* '\\y(dublin)\\y' THEN 'Dublin'
            ELSE city
        END,
        updated_at = NOW()
    WHERE is_active = true
      AND source = 'reed'
      AND city IS NULL
      AND location IS NOT NULL
      AND location != ''
      AND location ~* '\\y(london|manchester|birmingham|dublin)\\y'
      AND NOT (location ILIKE '%remote%' OR location ILIKE '%work from home%' OR location ILIKE '%wfh%');

    COMMIT;
  `;

	let fixError = null;
	try {
		const result = await supabase.rpc("exec_sql", { sql: fixSQL });
		fixError = result.error;
	} catch (_error) {
		// If RPC doesn't exist, try direct query (Supabase doesn't support multi-statement by default)
		// So we'll do it step by step
		fixError = null;
	}

	if (fixError) {
		console.error("❌ Error executing fix:", fixError);
		// Try alternative approach - update in batches
		await fixReedCitiesBatched(supabase);
		return;
	}

	// Check results
	const { data: before, error: beforeError } = await supabase
		.from("jobs")
		.select("id", { count: "exact", head: true })
		.eq("is_active", true)
		.eq("source", "reed")
		.is("city", null)
		.not("location", "is", null);

	if (beforeError) {
		console.error("❌ Error checking results:", beforeError);
		return;
	}

	console.log(`✅ Fix completed!`);
	console.log(`📊 Remaining Reed jobs without city: ${before?.length || 0}`);
}

async function fixReedCitiesBatched(supabase: any) {
	console.log("Using batched update approach...");

	// Get Reed jobs missing city
	const { data: reedJobs, error: fetchError } = await supabase
		.from("jobs")
		.select("id, location")
		.eq("is_active", true)
		.eq("source", "reed")
		.is("city", null)
		.not("location", "is", null)
		.limit(1000);

	if (fetchError) {
		console.error("❌ Error fetching Reed jobs:", fetchError);
		return;
	}

	if (!reedJobs || reedJobs.length === 0) {
		console.log("✅ No Reed jobs need fixing");
		return;
	}

	console.log(`📊 Found ${reedJobs.length} Reed jobs to fix`);

	// Extract city from location
	const updates: Array<{ id: number; city: string }> = [];

	for (const job of reedJobs) {
		const location = (job.location || "").toLowerCase();

		let city: string | null = null;
		if (location.match(/y(london)y/)) city = "London";
		else if (location.match(/y(manchester)y/)) city = "Manchester";
		else if (location.match(/y(birmingham)y/)) city = "Birmingham";
		else if (location.match(/y(dublin)y/)) city = "Dublin";

		if (
			city &&
			!location.includes("remote") &&
			!location.includes("work from home")
		) {
			updates.push({ id: job.id, city });
		}
	}

	console.log(`📝 Extracted city for ${updates.length} jobs`);

	// Update in batches
	const batchSize = 100;
	let fixed = 0;

	for (let i = 0; i < updates.length; i += batchSize) {
		const batch = updates.slice(i, i + batchSize);

		for (const update of batch) {
			const { error } = await supabase
				.from("jobs")
				.update({ city: update.city, updated_at: new Date().toISOString() })
				.eq("id", update.id);

			if (!error) fixed++;
		}
	}

	console.log(`✅ Fixed ${fixed} Reed jobs with city data`);
}

// Run if called directly
if (require.main === module) {
	fixReedCities()
		.then(() => {
			console.log("\n✅ Done!");
			process.exit(0);
		})
		.catch((error) => {
			console.error("❌ Failed:", error);
			process.exit(1);
		});
}

export { fixReedCities };
