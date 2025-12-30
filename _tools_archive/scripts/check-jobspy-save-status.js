#!/usr/bin/env node

/**
 * Check JobSpy Save Status
 *
 * Checks if JobSpy jobs are being saved successfully after the fetch failed fix
 */

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

async function checkJobSpyStatus() {
	console.log("🔍 Checking JobSpy Save Status...\n");

	const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key =
		process.env.SUPABASE_SERVICE_ROLE_KEY ||
		process.env.SUPABASE_KEY ||
		process.env.SUPABASE_ANON_KEY;

	if (!url || !key) {
		console.error("❌ Missing Supabase credentials");
		console.error(
			"   Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
		);
		process.exit(1);
	}

	const supabase = createClient(url, key);
	const jobspySources = [
		"jobspy-indeed",
		"jobspy-internships",
		"jobspy-career-roles",
	];

	try {
		// Check counts for known JobSpy sources
		console.log("📊 Available JobSpy Sources in Database:");
		console.log("=".repeat(50));

		const sourceCounts = {};
		const jobspyRelatedSources = [];

		// Check each known source
		for (const source of jobspySources) {
			const { count, error } = await supabase
				.from("jobs")
				.select("*", { count: "exact", head: true })
				.eq("source", source);

			if (!error && count !== null) {
				sourceCounts[source] = count;
				jobspyRelatedSources.push(source);
				const marker = "✅";
				console.log(`   ${marker} ${source}: ${count.toLocaleString()} jobs`);
			}
		}

		// Also search for any other sources containing "jobspy" (case-insensitive)
		const { data: allJobs, error: allSourcesError } = await supabase
			.from("jobs")
			.select("source")
			.limit(50000); // Sample a larger set

		if (!allSourcesError && allJobs) {
			const allSourceCounts = {};
			allJobs.forEach((job) => {
				if (job.source) {
					allSourceCounts[job.source] = (allSourceCounts[job.source] || 0) + 1;
				}
			});

			// Find any other JobSpy sources we might have missed
			Object.keys(allSourceCounts).forEach((source) => {
				if (
					source?.toLowerCase().includes("jobspy") &&
					!jobspySources.includes(source)
				) {
					sourceCounts[source] = allSourceCounts[source];
					jobspyRelatedSources.push(source);
					console.log(
						`   ⚠️  ${source}: ${allSourceCounts[source].toLocaleString()} jobs (unexpected source name)`,
					);
				}
			});
		}

		if (jobspyRelatedSources.length === 0) {
			console.log("   ⚠️  No JobSpy sources found in database");
		}

		// Check when the last JobSpy job was saved (any time)
		const { data: lastJob, error: lastJobError } = await supabase
			.from("jobs")
			.select("source, created_at")
			.in(
				"source",
				jobspySources.length > 0 ? jobspySources : jobspyRelatedSources,
			)
			.order("created_at", { ascending: false })
			.limit(1);

		if (lastJobError) {
			console.error("❌ Error fetching last job:", lastJobError.message);
		} else if (lastJob && lastJob.length > 0) {
			const lastJobDate = new Date(lastJob[0].created_at);
			const hoursAgo = (Date.now() - lastJobDate.getTime()) / (1000 * 60 * 60);
			const daysAgo = hoursAgo / 24;
			console.log(
				`\n📅 Last JobSpy Job Saved: ${lastJobDate.toLocaleString()}`,
			);
			if (daysAgo >= 1) {
				console.log(`   (${daysAgo.toFixed(1)} days ago)`);
			} else {
				console.log(`   (${hoursAgo.toFixed(1)} hours ago)`);
			}
		}

		// Check multiple time windows
		const timeWindows = [
			{ name: "Last 2 Hours", hours: 2 },
			{ name: "Last 6 Hours", hours: 6 },
			{ name: "Last 24 Hours", hours: 24 },
			{ name: "Last 7 Days", hours: 24 * 7 },
		];

		console.log("\n📊 JobSpy Jobs by Time Window:");
		console.log("=".repeat(50));

		const windowResults = {};
		for (const window of timeWindows) {
			const cutoff = new Date(
				Date.now() - window.hours * 60 * 60 * 1000,
			).toISOString();
			const { data: jobs, error } = await supabase
				.from("jobs")
				.select("source, created_at")
				.in(
					"source",
					jobspySources.length > 0 ? jobspySources : jobspyRelatedSources,
				)
				.gte("created_at", cutoff)
				.order("created_at", { ascending: false });

			if (error) {
				console.error(`   ❌ Error checking ${window.name}:`, error.message);
				continue;
			}

			const count = jobs?.length || 0;
			windowResults[window.name] = { count, jobs: jobs || [] };

			if (count > 0) {
				const bySource = {};
				jobs.forEach((job) => {
					bySource[job.source] = (bySource[job.source] || 0) + 1;
				});
				const sourceSummary = Object.entries(bySource)
					.map(([s, c]) => `${s}: ${c}`)
					.join(", ");
				console.log(`   ✅ ${window.name}: ${count} jobs (${sourceSummary})`);
			} else {
				console.log(`   ⚠️  ${window.name}: 0 jobs`);
			}
		}

		// Detailed analysis for most recent window with data
		const recentWindow = timeWindows.find(
			(w) => (windowResults[w.name]?.count || 0) > 0,
		);
		if (recentWindow) {
			const data = windowResults[recentWindow.name];
			const latest = new Date(data.jobs[0].created_at);
			const hoursAgo = (Date.now() - latest.getTime()) / (1000 * 60 * 60);
			const minutesAgo = Math.round(
				(Date.now() - latest.getTime()) / (1000 * 60),
			);

			console.log(
				`\n📅 Most Recent Job: ${minutesAgo} minutes ago (${hoursAgo.toFixed(2)} hours)`,
			);

			if (hoursAgo < 1) {
				console.log("\n✅ SUCCESS: Jobs are being saved successfully!");
				console.log("   The fetch failed fix appears to be working.");
			} else if (hoursAgo < 4) {
				console.log("\n⚠️  WARNING: No very recent jobs");
				console.log("   Check if scraper ran in last hour");
			} else if (hoursAgo < 24) {
				console.log("\n⚠️  WARNING: No jobs in last few hours");
				console.log("   Scraper may not have run recently");
			} else {
				console.log("\n❌ ERROR: No recent jobs found");
				console.log("   Check GitHub Actions logs for errors");
			}
		} else {
			console.log("\n⚠️  No JobSpy jobs found in any recent time window");
			console.log("\n💡 Possible reasons:");
			console.log("   1. No scraper run yet (runs every 4 hours)");
			console.log(
				"   2. Jobs still failing to save (check GitHub Actions logs)",
			);
			console.log("   3. All jobs filtered out by categorization");
			console.log("   4. Scraper may have stopped running");
			console.log("\n🔍 Next steps:");
			console.log(
				"   1. Check GitHub Actions: https://github.com/YOUR_REPO/actions",
			);
			console.log('   2. Look for "Automated Job Scraping" workflow');
			console.log("   3. Check scraper logs for errors");
			console.log("   4. Verify scraper is scheduled correctly");
		}

		// Show overall statistics
		const totalJobspyJobs = jobspyRelatedSources.reduce(
			(sum, source) => sum + (sourceCounts[source] || 0),
			0,
		);
		if (totalJobspyJobs > 0) {
			console.log(
				`\n📈 Total JobSpy Jobs in Database: ${totalJobspyJobs.toLocaleString()}`,
			);
		}
	} catch (error) {
		console.error("❌ Error checking status:", error.message);
		console.error("   Stack:", error.stack);
		process.exit(1);
	}
}

checkJobSpyStatus();
