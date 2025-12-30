/**
 * Normalize location data in the database
 * Standardizes city, country, and location fields to consistent format
 */

import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import { normalizeJobLocation } from "@/lib/locationNormalizer";
import { getDatabaseClient } from "@/Utils/databasePool";

async function normalizeLocations() {
	const supabase = getDatabaseClient();

	console.log("🔄 Starting location normalization...");

	// Fetch all active jobs with pagination (Supabase defaults to 1000 limit)
	let allJobs: any[] = [];
	let page = 0;
	const pageSize = 1000;
	let hasMore = true;

	while (hasMore) {
		const { data: jobs, error: fetchError } = await supabase
			.from("jobs")
			.select("job_hash, city, country, location")
			.eq("is_active", true)
			.range(page * pageSize, (page + 1) * pageSize - 1);

		if (fetchError) {
			console.error("❌ Error fetching jobs:", fetchError);
			return;
		}

		if (!jobs || jobs.length === 0) {
			hasMore = false;
			break;
		}

		allJobs = allJobs.concat(jobs);

		// If we got fewer than pageSize, we've reached the end
		if (jobs.length < pageSize) {
			hasMore = false;
		} else {
			page++;
			console.log(`📥 Fetched ${allJobs.length} jobs so far...`);
		}
	}

	if (allJobs.length === 0) {
		console.log("ℹ️  No jobs to normalize");
		return;
	}

	console.log(`📊 Found ${allJobs.length} jobs to normalize`);

	const jobs = allJobs;

	let updated = 0;
	let errors = 0;

	// Process in batches of 100
	const batchSize = 100;
	for (let i = 0; i < jobs.length; i += batchSize) {
		const batch = jobs.slice(i, i + batchSize);

		// Normalize all jobs in batch
		const updates = batch.map((job) => {
			const normalized = normalizeJobLocation({
				city: job.city,
				country: job.country,
				location: job.location,
			});

			return {
				job_hash: job.job_hash,
				city: normalized.city,
				country: normalized.country,
				location: normalized.location,
			};
		});

		// Filter out jobs that don't need updating (already normalized)
		const needsUpdate = updates.filter((update) => {
			const original = batch.find((j) => j.job_hash === update.job_hash);
			return (
				original &&
				(original.city !== update.city ||
					original.country !== update.country ||
					original.location !== update.location)
			);
		});

		if (needsUpdate.length === 0) {
			updated += batch.length; // All already normalized
			continue;
		}

		// Update jobs individually using update (can't use upsert without all required fields)
		for (const update of needsUpdate) {
			const { error } = await supabase
				.from("jobs")
				.update({
					city: update.city,
					country: update.country,
					location: update.location,
				})
				.eq("job_hash", update.job_hash);

			if (error) {
				console.error(
					`❌ Error updating job ${update.job_hash}:`,
					error.message,
				);
				errors++;
			} else {
				updated++;
			}
		}

		// Progress logging
		if ((i + batchSize) % 500 === 0 || i + batchSize >= jobs.length) {
			console.log(
				`✅ Processed ${Math.min(i + batchSize, jobs.length)}/${jobs.length} jobs (${updated} updated, ${errors} errors)...`,
			);
		}
	}

	console.log(`\n✅ Normalization complete!`);
	console.log(`   Updated: ${updated}`);
	console.log(`   Errors: ${errors}`);
	console.log(`   Total: ${jobs.length}`);
}

// Run if called directly
if (require.main === module) {
	normalizeLocations()
		.then(() => {
			console.log("✨ Done!");
			process.exit(0);
		})
		.catch((error) => {
			console.error("💥 Fatal error:", error);
			process.exit(1);
		});
}

export { normalizeLocations };
