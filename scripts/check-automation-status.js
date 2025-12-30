#!/usr/bin/env node

// Check automation status by querying recent database activity
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const SUPABASE_URL =
	process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY =
	process.env.SUPABASE_SERVICE_ROLE_KEY ||
	process.env.SUPABASE_KEY ||
	process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
	console.error("❌ Missing required environment variables");
	console.error(
		"   Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
	);
	process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkAutomationStatus() {
	console.log("\n🔍 CHECKING AUTOMATION STATUS");
	console.log("================================\n");

	try {
		// Get most recent job
		const { data: recentJob, error: recentError } = await supabase
			.from("jobs")
			.select("created_at, source, title, company")
			.order("created_at", { ascending: false })
			.limit(1);

		if (recentError) {
			console.error("❌ Error fetching recent job:", recentError.message);
			return;
		}

		if (!recentJob || recentJob.length === 0) {
			console.log("⚠️  No jobs found in database");
			return;
		}

		const lastJob = recentJob[0];
		const lastJobTime = new Date(lastJob.created_at);
		const now = new Date();
		const hoursSinceLastJob = (now - lastJobTime) / (1000 * 60 * 60);
		const daysSinceLastJob = hoursSinceLastJob / 24;

		console.log("📊 RECENT JOB ACTIVITY:");
		console.log(`   Last job: ${lastJob.title} at ${lastJob.company}`);
		console.log(`   Source: ${lastJob.source}`);
		console.log(`   Created: ${lastJobTime.toISOString()}`);
		console.log(
			`   Time ago: ${hoursSinceLastJob.toFixed(1)} hours (${daysSinceLastJob.toFixed(2)} days)`,
		);
		console.log("");

		// Check jobs in last 24 hours
		const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);
		const { count: jobs24h, error: count24Error } = await supabase
			.from("jobs")
			.select("*", { count: "exact", head: true })
			.gte("created_at", twentyFourHoursAgo.toISOString());

		if (!count24Error) {
			console.log("📈 JOBS IN LAST 24 HOURS:");
			console.log(`   Count: ${jobs24h || 0} jobs`);
			console.log("");
		}

		// Check jobs by source in last 24 hours
		const { data: jobsBySource, error: sourceError } = await supabase
			.from("jobs")
			.select("source, created_at")
			.gte("created_at", twentyFourHoursAgo.toISOString());

		if (!sourceError && jobsBySource) {
			const sourceBreakdown = jobsBySource.reduce((acc, job) => {
				acc[job.source] = (acc[job.source] || 0) + 1;
				return acc;
			}, {});

			console.log("🏷️  JOBS BY SOURCE (last 24h):");
			Object.entries(sourceBreakdown).forEach(([source, count]) => {
				console.log(`   ${source}: ${count} jobs`);
			});
			console.log("");
		}

		// Check total active jobs
		const { count: activeJobs, error: activeError } = await supabase
			.from("jobs")
			.select("*", { count: "exact", head: true })
			.eq("is_active", true);

		if (!activeError) {
			console.log("💾 DATABASE STATS:");
			console.log(`   Active jobs: ${activeJobs || 0}`);
			console.log("");
		}

		// Automation health assessment
		console.log("✅ AUTOMATION HEALTH:");
		if (hoursSinceLastJob < 6) {
			console.log("   🟢 HEALTHY - Jobs added within last 6 hours");
		} else if (hoursSinceLastJob < 24) {
			console.log("   🟡 DEGRADED - No jobs in last 6-24 hours");
		} else {
			console.log("   🔴 UNHEALTHY - No jobs in last 24+ hours");
			console.log("   ⚠️  Automation may not be running!");
		}

		// GitHub Actions schedule reminder
		console.log("");
		console.log("📅 EXPECTED SCHEDULE:");
		console.log("   GitHub Actions: Every 4 hours (0 */4 * * *)");
		console.log("   Next expected run: Within 4 hours of last run");
		console.log("");
	} catch (error) {
		console.error("❌ Error checking automation status:", error.message);
		process.exit(1);
	}
}

checkAutomationStatus()
	.then(() => {
		console.log("✅ Status check complete\n");
		process.exit(0);
	})
	.catch((error) => {
		console.error("❌ Status check failed:", error);
		process.exit(1);
	});
