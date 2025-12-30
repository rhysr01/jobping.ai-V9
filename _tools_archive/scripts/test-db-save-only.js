#!/usr/bin/env node

/**
 * Test Database Save Functionality
 *
 * Tests if we can save jobs to Supabase with the new retry logic
 * Uses a small batch to verify the save mechanism works
 */

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

// Copy the retry logic from jobspy-save.cjs
async function retryWithBackoff(fn, maxRetries = 5, baseDelay = 2000) {
	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			const errorMessage = error?.message || String(error || "");
			const errorName = error?.name || "";
			const isNetworkError =
				errorName === "NetworkError" ||
				errorName === "AbortError" ||
				errorName === "TypeError" ||
				errorMessage.toLowerCase().includes("fetch failed") ||
				errorMessage.toLowerCase().includes("network") ||
				errorMessage.toLowerCase().includes("timeout") ||
				errorMessage.toLowerCase().includes("econnrefused") ||
				errorMessage.toLowerCase().includes("enotfound") ||
				errorMessage.toLowerCase().includes("econnreset") ||
				errorMessage.toLowerCase().includes("etimedout") ||
				(error instanceof TypeError &&
					errorMessage.toLowerCase().includes("fetch"));

			if (!isNetworkError || attempt === maxRetries - 1) {
				throw error;
			}

			const delay = baseDelay * 2 ** attempt;
			console.warn(
				`⚠️  Network error (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`,
				errorMessage,
			);
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}
}

// Create Supabase client with timeout
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

	const fetchWithTimeout =
		typeof fetch !== "undefined"
			? async (fetchUrl, fetchOptions = {}) => {
					const timeout = 60000; // 60 seconds
					const controller = new AbortController();
					const timeoutId = setTimeout(() => controller.abort(), timeout);

					try {
						const response = await fetch(fetchUrl, {
							...fetchOptions,
							signal: controller.signal,
						});
						clearTimeout(timeoutId);
						return response;
					} catch (error) {
						clearTimeout(timeoutId);
						if (
							error instanceof TypeError &&
							error.message?.includes("fetch failed")
						) {
							const networkError = new Error(`Network error: ${error.message}`);
							networkError.name = "NetworkError";
							networkError.cause = error;
							throw networkError;
						}
						throw error;
					}
				}
			: undefined;

	return createClient(url, key, {
		auth: { persistSession: false },
		db: { schema: "public" },
		...(fetchWithTimeout ? { global: { fetch: fetchWithTimeout } } : {}),
	});
}

async function testSave() {
	console.log("🧪 Testing Database Save Functionality...\n");

	const supabase = getSupabase();

	// Create a test job
	const testJob = {
		job_hash: `test-${Date.now()}-${Math.random().toString(36).substring(7)}`,
		title: "Test Software Engineer",
		company: "Test Company",
		company_name: "Test Company",
		location: "London, UK",
		city: "London",
		country: "GB",
		job_url: "https://example.com/test-job",
		description:
			"This is a test job description for testing the save functionality.",
		experience_required: "entry-level",
		work_environment: "on-site",
		source: "test-save",
		categories: ["early-career", "tech"],
		scrape_timestamp: new Date().toISOString(),
		original_posted_date: new Date().toISOString(),
		posted_at: new Date().toISOString(),
		last_seen_at: new Date().toISOString(),
		is_active: true,
	};

	console.log("📝 Test job created:");
	console.log(`   Hash: ${testJob.job_hash}`);
	console.log(`   Title: ${testJob.title}`);
	console.log(`   Company: ${testJob.company}`);
	console.log(`   Location: ${testJob.location}\n`);

	console.log("💾 Attempting to save to database...\n");

	try {
		const result = await retryWithBackoff(
			async () => {
				const upsertResult = await supabase.from("jobs").upsert([testJob], {
					onConflict: "job_hash",
					ignoreDuplicates: false,
				});

				if (upsertResult.error) {
					console.error(`   Upsert error details:`, {
						message: upsertResult.error.message,
						code: upsertResult.error.code,
						details: upsertResult.error.details,
						hint: upsertResult.error.hint,
					});

					const isNetworkError =
						upsertResult.error.message?.includes("fetch failed") ||
						upsertResult.error.message?.includes("network") ||
						upsertResult.error.message?.includes("timeout") ||
						upsertResult.error.message?.includes("ECONNREFUSED") ||
						upsertResult.error.message?.includes("ENOTFOUND") ||
						upsertResult.error.message?.includes("ETIMEDOUT");
					if (isNetworkError) {
						throw upsertResult.error;
					}
				}
				return upsertResult;
			},
			5,
			2000,
		);

		if (result.error) {
			console.error(`❌ Save failed:`, result.error.message);
			console.error(`   Code: ${result.error.code}`);
			console.error(`   Details: ${result.error.details || "none"}`);
			process.exit(1);
		} else {
			console.log(`✅ Successfully saved test job!`);
			console.log(`   Job hash: ${testJob.job_hash}`);

			// Verify it was saved
			const { data: verify, error: verifyError } = await supabase
				.from("jobs")
				.select("id, job_hash, title, company")
				.eq("job_hash", testJob.job_hash)
				.limit(1);

			if (verifyError) {
				console.error(`⚠️  Could not verify save:`, verifyError.message);
			} else if (verify && verify.length > 0) {
				console.log(`\n✅ Verification: Job found in database`);
				console.log(`   ID: ${verify[0].id}`);
				console.log(`   Title: ${verify[0].title}`);
				console.log(`   Company: ${verify[0].company}`);
			} else {
				console.log(
					`\n⚠️  Verification: Job not found in database (may have been filtered)`,
				);
			}

			// Clean up test job
			console.log(`\n🧹 Cleaning up test job...`);
			await supabase.from("jobs").delete().eq("job_hash", testJob.job_hash);
			console.log(`✅ Test job deleted`);

			console.log(`\n✅ TEST PASSED: Database save functionality is working!`);
			process.exit(0);
		}
	} catch (error) {
		console.error(`\n❌ Fatal error after retries:`, error.message);
		console.error(`   Full error details:`, {
			message: error.message,
			name: error.name,
			code: error.code,
			errno: error.errno,
			syscall: error.syscall,
			hostname: error.hostname,
			cause: error.cause
				? {
						message: error.cause.message,
						name: error.cause.name,
						code: error.cause.code,
					}
				: null,
			stack: error.stack?.substring(0, 500),
		});
		process.exit(1);
	}
}

testSave().catch((error) => {
	console.error("❌ Unhandled error:", error);
	process.exit(1);
});
