#!/usr/bin/env node

/**
 * Backfill visa_friendly field for existing jobs in database
 * Runs visa detection on job descriptions and updates the visa_friendly field
 * 
 * Usage: node scripts/backfill-visa-friendly.cjs [--batch-size=100] [--limit=10000]
 */

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const { detectVisaFriendliness } = require("../scrapers/shared/visa-detection.cjs");

function getSupabase() {
	const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key =
		process.env.SUPABASE_SERVICE_ROLE_KEY ||
		process.env.SUPABASE_ANON_KEY ||
		process.env.SUPABASE_KEY;
	if (!url || !key)
		throw new Error(
			"Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/ANON_KEY",
		);
	return createClient(url, key, {
		auth: { persistSession: false },
		db: { schema: "public" },
	});
}

async function backfillVisaFriendly(options = {}) {
	const batchSize = parseInt(options.batchSize || "100", 10);
	const limit = parseInt(options.limit || "10000", 10);
	const supabase = getSupabase();

	console.log("🔄 Starting visa_friendly backfill...");
	console.log(`📊 Batch size: ${batchSize}, Max jobs: ${limit}`);

	let totalProcessed = 0;
	let totalUpdated = 0;
	let totalTrue = 0;
	let totalFalse = 0;
	let totalNull = 0;
	let offset = 0;

	while (totalProcessed < limit) {
		// Fetch batch of jobs where visa_friendly is NULL
		const { data: jobs, error: fetchError } = await supabase
			.from("jobs")
			.select("id, title, description, company, company_name, visa_friendly")
			.is("visa_friendly", null)
			.eq("is_active", true)
			.range(offset, offset + batchSize - 1)
			.order("created_at", { ascending: false });

		if (fetchError) {
			console.error("❌ Error fetching jobs:", fetchError);
			break;
		}

		if (!jobs || jobs.length === 0) {
			console.log("✅ No more jobs to process");
			break;
		}

		console.log(`\n📦 Processing batch: ${jobs.length} jobs (offset: ${offset})`);

		// Process each job
		const updates = [];
		for (const job of jobs) {
			const visaInfo = detectVisaFriendliness({
				title: job.title || "",
				description: job.description || "",
				company: job.company || "",
				company_name: job.company_name || "",
			});

			// Only update if we have a definitive answer (true or false)
			// Skip if null (unknown) - keep it as null
			if (visaInfo.visa_friendly !== null) {
				updates.push({
					id: job.id,
					visa_friendly: visaInfo.visa_friendly,
				});

				if (visaInfo.visa_friendly === true) {
					totalTrue++;
				} else {
					totalFalse++;
				}
			} else {
				totalNull++;
			}
		}

		// Batch update jobs
		if (updates.length > 0) {
			console.log(`   💾 Updating ${updates.length} jobs...`);

			// Update in smaller batches to avoid query size limits
			const updateBatchSize = 50;
			for (let i = 0; i < updates.length; i += updateBatchSize) {
				const batch = updates.slice(i, i + updateBatchSize);
				
				// Use upsert for batch update
				const updatePromises = batch.map((update) =>
					supabase
						.from("jobs")
						.update({ visa_friendly: update.visa_friendly })
						.eq("id", update.id),
				);

				const results = await Promise.all(updatePromises);
				
				// Check for errors
				const errors = results.filter((r) => r.error);
				if (errors.length > 0) {
					console.warn(
						`   ⚠️  ${errors.length} update errors in this batch`,
					);
					errors.forEach((err) => {
						console.warn("   Error:", err.error?.message);
					});
				} else {
					totalUpdated += batch.length;
				}
			}

			console.log(`   ✅ Updated ${updates.length} jobs in this batch`);
		} else {
			console.log(`   ℹ️  No updates needed (all unknown)`);
		}

		totalProcessed += jobs.length;
		offset += batchSize;

		// Progress update
		console.log(
			`📊 Progress: ${totalProcessed} processed, ${totalUpdated} updated (${totalTrue} true, ${totalFalse} false, ${totalNull} null)`,
		);

		// Small delay to avoid overwhelming the database
		await new Promise((resolve) => setTimeout(resolve, 100));
	}

	console.log("\n✅ Backfill complete!");
	console.log("📊 Final Statistics:");
	console.log(`   - Total processed: ${totalProcessed}`);
	console.log(`   - Total updated: ${totalUpdated}`);
	console.log(`   - Visa friendly (true): ${totalTrue}`);
	console.log(`   - Not visa friendly (false): ${totalFalse}`);
	console.log(`   - Unknown (null): ${totalNull}`);

	// Check remaining NULL jobs
	const { count: remainingNull } = await supabase
		.from("jobs")
		.select("id", { count: "exact", head: true })
		.is("visa_friendly", null)
		.eq("is_active", true);

	console.log(`\n📋 Remaining jobs with NULL visa_friendly: ${remainingNull || 0}`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {};
args.forEach((arg) => {
	if (arg.startsWith("--batch-size=")) {
		options.batchSize = arg.split("=")[1];
	} else if (arg.startsWith("--limit=")) {
		options.limit = arg.split("=")[1];
	}
});

// Run backfill
backfillVisaFriendly(options)
	.then(() => {
		console.log("\n✅ Script completed successfully");
		process.exit(0);
	})
	.catch((error) => {
		console.error("\n❌ Script failed:", error);
		process.exit(1);
	});

