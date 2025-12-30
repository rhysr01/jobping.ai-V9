#!/usr/bin/env tsx

/**
 * Debug Free Signup Flow
 *
 * Helps diagnose why free signup isn't generating matches
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

const testEmail = process.argv[2] || `test-debug-${Date.now()}@testjobping.com`;

console.log("🔍 Debugging Free Signup Flow\n");
console.log(`📧 Test Email: ${testEmail}\n`);

async function debug() {
	const supabase = getDatabaseClient();

	// STEP 1: Test OpenAI API Key (most critical for free signup)
	console.log("=".repeat(60));
	console.log("STEP 1: Test OpenAI API Key");
	console.log("=".repeat(60));

	if (!process.env.OPENAI_API_KEY) {
		console.log("❌ OPENAI_API_KEY not set! AI matching will fail.");
		console.log(
			"   Free signup will use fallback matching (pre-filtered jobs only)",
		);
	} else {
		const apiKey = process.env.OPENAI_API_KEY;
		console.log("✅ OPENAI_API_KEY is set");
		console.log(`   Length: ${apiKey.length} chars`);
		console.log(`   Starts with: ${apiKey.substring(0, 7)}...`);

		// Test the API key
		console.log("\n🔄 Testing OpenAI API call...");
		try {
			const OpenAI = require("openai");
			const openai = new OpenAI({ apiKey: apiKey.trim() });

			const startTime = Date.now();
			const response = await openai.chat.completions.create({
				model: "gpt-4o-mini",
				messages: [
					{ role: "system", content: "You are a helpful assistant." },
					{
						role: "user",
						content: 'Say "API key is working" if you can read this.',
					},
				],
				max_tokens: 20,
			});

			const responseTime = Date.now() - startTime;
			const message = response.choices[0]?.message?.content || "No response";

			console.log("✅ OpenAI API key is WORKING!");
			console.log(`   Response time: ${responseTime}ms`);
			console.log(`   Model: ${response.model}`);
			console.log(`   Response: ${message}`);
			console.log(`   Tokens used: ${response.usage?.total_tokens || "N/A"}`);
		} catch (error: any) {
			console.log("❌ OpenAI API test FAILED!");
			console.log(`   Error: ${error.message || error}`);

			if (error.status === 401) {
				console.log("\n💡 This means:");
				console.log("   - API key is invalid or expired");
				console.log("   - Check your OpenAI account billing/credits");
			} else if (error.status === 429) {
				console.log("\n💡 This means:");
				console.log("   - Rate limit exceeded");
				console.log("   - Wait a few minutes and try again");
			}
		}
	}

	// STEP 2: Check if jobs exist for common free cities
	console.log(`\n${"=".repeat(60)}`);
	console.log("STEP 2: Check if jobs exist for free cities");
	console.log("=".repeat(60));

	const testCities = ["Prague", "Warsaw", "London", "Madrid", "Berlin"];
	console.log("Checking cities:", testCities);

	// Progressive filtering to see where jobs are lost
	console.log("\n📊 Progressive filter check:");

	// 1. City filter only
	const { count: cityOnly } = await supabase
		.from("jobs")
		.select("*", { count: "exact", head: true })
		.in("city", testCities);
	console.log(`   1. City filter only: ${cityOnly || 0} jobs`);

	// 2. + is_active
	const { count: withActive } = await supabase
		.from("jobs")
		.select("*", { count: "exact", head: true })
		.in("city", testCities)
		.eq("is_active", true);
	console.log(`   2. + is_active=true: ${withActive || 0} jobs`);

	// 3. + status
	const { count: withStatus } = await supabase
		.from("jobs")
		.select("*", { count: "exact", head: true })
		.in("city", testCities)
		.eq("is_active", true)
		.eq("status", "active");
	console.log(`   3. + status='active': ${withStatus || 0} jobs`);

	// 4. + filtered_reason
	const { count: withFilteredReason } = await supabase
		.from("jobs")
		.select("*", { count: "exact", head: true })
		.in("city", testCities)
		.eq("is_active", true)
		.eq("status", "active")
		.is("filtered_reason", null);
	console.log(
		`   4. + filtered_reason IS NULL: ${withFilteredReason || 0} jobs`,
	);

	// 5. + job_url
	const { count: withUrl } = await supabase
		.from("jobs")
		.select("*", { count: "exact", head: true })
		.in("city", testCities)
		.eq("is_active", true)
		.eq("status", "active")
		.is("filtered_reason", null)
		.not("job_url", "is", null)
		.neq("job_url", "");
	console.log(`   5. + has job_url: ${withUrl || 0} jobs`);

	// 6. + early-career
	const { count: earlyCareer } = await supabase
		.from("jobs")
		.select("*", { count: "exact", head: true })
		.in("city", testCities)
		.eq("is_active", true)
		.eq("status", "active")
		.is("filtered_reason", null)
		.not("job_url", "is", null)
		.neq("job_url", "")
		.or(
			"is_internship.eq.true,is_graduate.eq.true,categories.cs.{early-career}",
		);
	console.log(`   6. + early-career: ${earlyCareer || 0} jobs`);

	// Get actual jobs
	const { data: jobs, error: jobsError } = await supabase
		.from("jobs")
		.select("id, title, company, city, is_active, status, job_url")
		.in("city", testCities)
		.eq("is_active", true)
		.eq("status", "active")
		.is("filtered_reason", null)
		.not("job_url", "is", null)
		.neq("job_url", "")
		.or(
			"is_internship.eq.true,is_graduate.eq.true,categories.cs.{early-career}",
		)
		.limit(100);

	if (jobsError) {
		console.log("\n❌ Error fetching jobs:", jobsError);
	} else {
		console.log(
			`\n📊 Final result: ${jobs?.length || 0} jobs (limited to 100)`,
		);

		if (jobs && jobs.length > 0) {
			const cityCounts = jobs.reduce(
				(acc: Record<string, number>, job: any) => {
					acc[job.city] = (acc[job.city] || 0) + 1;
					return acc;
				},
				{},
			);

			console.log("\nJobs by city (sample):");
			Object.entries(cityCounts).forEach(([city, count]) => {
				console.log(`   ${city}: ${count} jobs`);
			});

			console.log("\n✅ Jobs exist! Free signup should work.");
			console.log(
				`\n💡 Note: MCP query shows 2,288 total early-career jobs with URLs`,
			);
			console.log(`   - Berlin: 408 jobs`);
			console.log(`   - London: 1,676 jobs`);
			console.log(`   - Madrid: 110 jobs`);
			console.log(`   - Warsaw: 94 jobs`);
			console.log(`   - Prague: 0 jobs (not in database)`);
		} else {
			console.log("\n❌ No jobs found after filtering!");
			console.log("\n💡 Filter breakdown shows where jobs are lost:");
			console.log(`   - ${cityOnly || 0} total jobs in cities`);
			console.log(`   - ${withActive || 0} are active`);
			console.log(`   - ${withStatus || 0} have status='active'`);
			console.log(
				`   - ${withFilteredReason || 0} have filtered_reason IS NULL`,
			);
			console.log(`   - ${withUrl || 0} have URLs`);
			console.log(`   - ${earlyCareer || 0} are early-career`);
			console.log(
				"\n⚠️  MCP query shows 2,288 jobs exist - check if Supabase client is blocking queries",
			);
		}
	}

	// STEP 3: Check if user exists (optional - for existing users)
	console.log(`\n${"=".repeat(60)}`);
	console.log("STEP 3: Check if user exists");
	console.log("=".repeat(60));

	const { data: user, error: userError } = await supabase
		.from("users")
		.select("*")
		.eq("email", testEmail)
		.eq("subscription_tier", "free")
		.maybeSingle();

	if (userError) {
		console.log("❌ Error checking user:", userError);
	} else if (!user) {
		console.log("ℹ️  User does not exist yet (this is fine for free signup)");
		console.log("\n💡 To test signup:");
		console.log("   curl -X POST http://localhost:3000/api/signup/free \\");
		console.log('     -H "Content-Type: application/json" \\');
		console.log(
			'     -d \'{"email":"' +
				testEmail +
				'","full_name":"Test User","preferred_cities":["Prague"],"career_paths":["finance"],"entry_level_preferences":["graduate"]}\'',
		);
	} else {
		console.log("✅ User exists:", {
			id: user.id,
			email: user.email,
			subscription_tier: user.subscription_tier,
			target_cities: user.target_cities,
			career_path: user.career_path,
		});

		// STEP 4: Check for matches (only if user exists)
		console.log(`\n${"=".repeat(60)}`);
		console.log("STEP 4: Check for matches");
		console.log("=".repeat(60));

		const { data: matches, error: matchesError } = await supabase
			.from("matches")
			.select("*")
			.eq("user_email", testEmail);

		if (matchesError) {
			console.log("❌ Error fetching matches:", matchesError);
		} else {
			console.log(`📊 Found ${matches?.length || 0} matches`);

			if (!matches || matches.length === 0) {
				console.log("⚠️  No matches found for this user");
				console.log("\n💡 Possible reasons:");
				console.log("   1. Signup didn't complete successfully");
				console.log("   2. AI matching failed");
				console.log("   3. Pre-filtering removed all jobs");
				console.log("   4. Matches were created but not saved");
			} else {
				console.log("\n✅ Matches found! Checking job details...\n");

				const jobHashes = matches.map((m) => m.job_hash).filter(Boolean);

				const { data: matchedJobs, error: jobsError } = await supabase
					.from("jobs")
					.select("id, title, company, city, job_hash")
					.in("job_hash", jobHashes)
					.eq("is_active", true);

				if (jobsError) {
					console.log("❌ Error fetching matched jobs:", jobsError);
				} else {
					console.log(
						`📊 Found ${matchedJobs?.length || 0} active jobs for matches`,
					);

					if (matchedJobs && matchedJobs.length < matches.length) {
						console.log(
							`⚠️  ${matches.length - matchedJobs.length} matches point to inactive/deleted jobs`,
						);
					}

					matchedJobs?.forEach((job, i) => {
						console.log(
							`   ${i + 1}. ${job.title} at ${job.company} (${job.city})`,
						);
					});
				}
			}
		}
	}

	// STEP 5: Summary and next steps
	console.log(`\n${"=".repeat(60)}`);
	console.log("SUMMARY");
	console.log("=".repeat(60));

	console.log("\n✅ Free signup should work if:");
	console.log("   1. OpenAI API key is set and working (checked above)");
	console.log("   2. Jobs exist for selected cities (checked above)");
	console.log("   3. User signs up via /api/signup/free");

	console.log("\n📝 To test signup:");
	console.log(`   curl -X POST http://localhost:3000/api/signup/free \\`);
	console.log(`     -H "Content-Type: application/json" \\`);
	console.log(
		`     -d '{"email":"${testEmail}","full_name":"Test User","preferred_cities":["Prague"],"career_paths":["finance"],"entry_level_preferences":["graduate"]}'`,
	);

	if (user) {
		console.log("\n📝 To check matches:");
		console.log(`   curl http://localhost:3000/api/matches/free \\`);
		console.log(`     -H "Cookie: free_user_email=${testEmail}"`);
	}
}

debug().catch(console.error);
