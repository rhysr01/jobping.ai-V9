#!/usr/bin/env tsx

/**
 * Diagnostic script to check why free tier users aren't seeing jobs
 *
 * Checks:
 * 1. Jobs in database for specific cities
 * 2. Matches in matches table for a user
 * 3. Whether matched jobs are still active
 * 4. City matching issues
 */

import path from "node:path";
import dotenv from "dotenv";

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), ".env.local");
try {
	dotenv.config({ path: envPath });
	console.log("✅ Loaded environment variables from .env.local\n");
} catch (_error) {
	console.warn("⚠️  Could not load .env.local, using process.env\n");
}

import { getDatabaseClient } from "../Utils/databasePool";

async function diagnose() {
	const supabase = getDatabaseClient();

	console.log("=".repeat(80));
	console.log("FREE TIER MATCHES DIAGNOSTIC");
	console.log("=".repeat(80));

	// Get a sample free tier user
	const { data: freeUsers, error: usersError } = await supabase
		.from("users")
		.select("email, target_cities, career_path, subscription_tier")
		.eq("subscription_tier", "free")
		.limit(5);

	if (usersError) {
		console.error("❌ Error fetching free users:", usersError);
		return;
	}

	if (!freeUsers || freeUsers.length === 0) {
		console.log("⚠️  No free tier users found in database");
		return;
	}

	const sampleUser = freeUsers[0];
	console.log(`\n📧 Sample User: ${sampleUser.email}`);
	console.log(`   Cities: ${JSON.stringify(sampleUser.target_cities)}`);
	console.log(`   Career Path: ${sampleUser.career_path}`);

	// Check matches for this user
	const { data: matches, error: matchesError } = await supabase
		.from("matches")
		.select("job_hash, match_score, match_reason, matched_at")
		.eq("user_email", sampleUser.email)
		.order("match_score", { ascending: false });

	if (matchesError) {
		console.error("❌ Error fetching matches:", matchesError);
		return;
	}

	console.log(`\n📊 Matches in database: ${matches?.length || 0}`);

	if (matches && matches.length > 0) {
		console.log("   Sample matches:");
		matches.slice(0, 5).forEach((m: any, i: number) => {
			console.log(
				`     ${i + 1}. Job Hash: ${m.job_hash}, Score: ${m.match_score}`,
			);
		});

		// Check if matched jobs are still active
		const jobHashes = matches.map((m: any) => m.job_hash).filter(Boolean);

		const { data: matchedJobs, error: jobsError } = await supabase
			.from("jobs")
			.select(
				"job_hash, title, company, city, is_active, status, filtered_reason",
			)
			.in("job_hash", jobHashes);

		if (jobsError) {
			console.error("❌ Error fetching matched jobs:", jobsError);
			return;
		}

		console.log(`\n🔍 Matched Jobs Status:`);
		console.log(`   Total matches: ${matches.length}`);
		console.log(`   Jobs found in DB: ${matchedJobs?.length || 0}`);

		if (matchedJobs) {
			const activeJobs = matchedJobs.filter(
				(j) => j.is_active && j.status === "active",
			);
			const inactiveJobs = matchedJobs.filter(
				(j) => !j.is_active || j.status !== "active",
			);
			const filteredJobs = matchedJobs.filter(
				(j) => j.filtered_reason !== null,
			);

			console.log(`   ✅ Active jobs: ${activeJobs.length}`);
			console.log(`   ❌ Inactive jobs: ${inactiveJobs.length}`);
			console.log(`   🚫 Filtered jobs: ${filteredJobs.length}`);

			if (inactiveJobs.length > 0) {
				console.log("\n   Inactive job examples:");
				inactiveJobs.slice(0, 3).forEach((job: any) => {
					console.log(`     - ${job.title} at ${job.company} (${job.city})`);
					console.log(
						`       is_active: ${job.is_active}, status: ${job.status}`,
					);
				});
			}

			if (filteredJobs.length > 0) {
				console.log("\n   Filtered job examples:");
				filteredJobs.slice(0, 3).forEach((job: any) => {
					console.log(`     - ${job.title} at ${job.company} (${job.city})`);
					console.log(`       filtered_reason: ${job.filtered_reason}`);
				});
			}
		}

		// Check missing jobs
		const foundHashes = new Set(matchedJobs?.map((j: any) => j.job_hash) || []);
		const missingHashes = jobHashes.filter((hash) => !foundHashes.has(hash));

		if (missingHashes.length > 0) {
			console.log(
				`\n⚠️  Missing jobs (in matches but not in jobs table): ${missingHashes.length}`,
			);
			console.log("   Sample missing hashes:", missingHashes.slice(0, 3));
		}
	} else {
		console.log("\n⚠️  No matches found for this user");
		console.log("   This means matches were never created during signup");
	}

	// Check jobs available for user's cities
	const userCities = Array.isArray(sampleUser.target_cities)
		? sampleUser.target_cities
		: sampleUser.target_cities
			? [sampleUser.target_cities]
			: [];

	if (userCities.length > 0) {
		console.log(`\n${"=".repeat(80)}`);
		console.log("JOBS AVAILABLE FOR USER CITIES");
		console.log("=".repeat(80));

		// Build city variations (same as signup)
		const cityVariations = new Set<string>();
		userCities.forEach((city) => {
			cityVariations.add(city);
			cityVariations.add(city.toUpperCase());
			cityVariations.add(city.toLowerCase());
		});

		// Check jobs with progressive filters
		const { count: totalCityJobs } = await supabase
			.from("jobs")
			.select("*", { count: "exact", head: true })
			.in("city", Array.from(cityVariations));

		const { count: activeCityJobs } = await supabase
			.from("jobs")
			.select("*", { count: "exact", head: true })
			.in("city", Array.from(cityVariations))
			.eq("is_active", true)
			.eq("status", "active")
			.is("filtered_reason", null);

		const { count: earlyCareerJobs } = await supabase
			.from("jobs")
			.select("*", { count: "exact", head: true })
			.in("city", Array.from(cityVariations))
			.eq("is_active", true)
			.eq("status", "active")
			.is("filtered_reason", null)
			.or(
				"is_internship.eq.true,is_graduate.eq.true,categories.cs.{early-career}",
			);

		console.log(`\n📊 Jobs for cities ${userCities.join(", ")}:`);
		console.log(`   1. Total jobs (any status): ${totalCityJobs || 0}`);
		console.log(
			`   2. Active jobs (is_active=true, status='active', filtered_reason IS NULL): ${activeCityJobs || 0}`,
		);
		console.log(`   3. Early-career jobs: ${earlyCareerJobs || 0}`);

		// Get sample jobs
		const { data: sampleJobs } = await supabase
			.from("jobs")
			.select(
				"title, company, city, is_active, status, filtered_reason, is_internship, is_graduate",
			)
			.in("city", Array.from(cityVariations))
			.eq("is_active", true)
			.eq("status", "active")
			.is("filtered_reason", null)
			.limit(10);

		if (sampleJobs && sampleJobs.length > 0) {
			console.log("\n   Sample active jobs:");
			sampleJobs.slice(0, 5).forEach((job: any) => {
				console.log(`     - ${job.title} at ${job.company} (${job.city})`);
			});
		} else {
			console.log("\n   ⚠️  No active jobs found for these cities!");

			// Check what cities DO have jobs
			const { data: allCities } = await supabase
				.from("jobs")
				.select("city")
				.eq("is_active", true)
				.eq("status", "active")
				.is("filtered_reason", null)
				.limit(1000);

			const uniqueCities = [
				...new Set(allCities?.map((j) => j.city).filter(Boolean) || []),
			];
			console.log(
				`\n   💡 Cities with active jobs (sample): ${uniqueCities.slice(0, 20).join(", ")}`,
			);
		}
	}

	console.log(`\n${"=".repeat(80)}`);
	console.log("DIAGNOSIS COMPLETE");
	console.log("=".repeat(80));
}

diagnose().catch(console.error);
