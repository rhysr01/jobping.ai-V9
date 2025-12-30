#!/usr/bin/env tsx

/**
 * Test Free Signup Flow End-to-End
 *
 * Tests the complete free signup flow and checks if matches are generated
 */

import path from "node:path";
import dotenv from "dotenv";

// Load environment variables
const envPath = path.join(process.cwd(), ".env.local");
try {
	dotenv.config({ path: envPath });
} catch (_error) {
	// Ignore if .env.local doesn't exist
}

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const testEmail = process.argv[2] || `test-${Date.now()}@testjobping.com`;

console.log("🧪 Testing Free Signup Flow End-to-End\n");
console.log(`📧 Test Email: ${testEmail}`);
console.log(`📍 Base URL: ${BASE_URL}\n`);

async function testSignup() {
	console.log("=".repeat(60));
	console.log("STEP 1: Sign up via API");
	console.log("=".repeat(60));

	const signupData = {
		email: testEmail,
		full_name: "Test User",
		preferred_cities: ["Prague"],
		career_paths: ["finance"],
		entry_level_preferences: ["graduate", "intern", "junior"],
	};

	const startTime = Date.now();

	try {
		const response = await fetch(`${BASE_URL}/api/signup/free`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(signupData),
		});

		const responseTime = Date.now() - startTime;
		const data = await response.json();

		console.log(`Status: ${response.status}`);
		console.log(`Response Time: ${responseTime}ms`);

		if (!response.ok) {
			console.log(
				`❌ Signup failed: ${data.error || data.message || "Unknown error"}`,
			);
			if (data.details) {
				console.log("Details:", JSON.stringify(data.details, null, 2));
			}
			return;
		}

		console.log(`✅ Signup successful!`);
		console.log(`Match Count: ${data.matchCount || 0}`);
		console.log(`User ID: ${data.userId || "N/A"}`);

		// Extract cookie from response
		const setCookieHeader = response.headers.get("set-cookie");
		let cookie = "";
		if (setCookieHeader) {
			const match = setCookieHeader.match(/free_user_email=([^;]+)/);
			if (match) {
				cookie = match[0];
			}
		}

		console.log(`\nCookie: ${cookie ? "Set ✅" : "Not set ❌"}`);

		if (data.matchCount === 0) {
			console.log("\n⚠️  WARNING: No matches were created during signup!");
			console.log("   This could mean:");
			console.log("   1. No jobs found for selected cities");
			console.log("   2. AI matching failed");
			console.log("   3. Pre-filtering removed all jobs");
			return;
		}

		console.log(`\n${"=".repeat(60)}`);
		console.log("STEP 2: Check matches via API");
		console.log("=".repeat(60));

		// Wait a moment for database to sync
		await new Promise((resolve) => setTimeout(resolve, 1000));

		const matchesResponse = await fetch(`${BASE_URL}/api/matches/free`, {
			headers: {
				Cookie: cookie || `free_user_email=${testEmail}`,
			},
		});

		const matchesData = await matchesResponse.json();

		console.log(`Status: ${matchesResponse.status}`);

		if (!matchesResponse.ok) {
			console.log(
				`❌ Failed to fetch matches: ${matchesData.error || matchesData.message || "Unknown error"}`,
			);
			return;
		}

		console.log(`✅ Matches API successful!`);
		console.log(`Jobs Returned: ${matchesData.jobs?.length || 0}`);

		if (matchesData.jobs && matchesData.jobs.length > 0) {
			console.log("\n📋 Matched Jobs:");
			matchesData.jobs.forEach((job: any, i: number) => {
				console.log(`   ${i + 1}. ${job.title} at ${job.company}`);
				console.log(`      Location: ${job.location || job.city}`);
				console.log(
					`      Match Score: ${job.match_score ? Math.round(job.match_score * 100) : "N/A"}%`,
				);
			});
		} else {
			console.log("\n⚠️  WARNING: No jobs returned from matches API!");
			console.log("   Even though signup said matches were created.");
			console.log("   This could mean:");
			console.log("   1. Matches were saved but jobs are inactive");
			console.log("   2. Cookie not set correctly");
			console.log("   3. Database query issue");
		}

		console.log(`\n${"=".repeat(60)}`);
		console.log("SUMMARY");
		console.log("=".repeat(60));
		console.log(`✅ Signup: ${response.status === 200 ? "Success" : "Failed"}`);
		console.log(`✅ Matches Created: ${data.matchCount || 0}`);
		console.log(
			`✅ Matches API: ${matchesResponse.status === 200 ? "Success" : "Failed"}`,
		);
		console.log(`✅ Jobs Returned: ${matchesData.jobs?.length || 0}`);

		if (data.matchCount > 0 && matchesData.jobs?.length === 0) {
			console.log(
				"\n⚠️  ISSUE DETECTED: Matches were created but not returned!",
			);
			console.log(`   Run: npm run debug:free ${testEmail}`);
			console.log("   To investigate further.");
		}
	} catch (error) {
		console.error(
			"❌ Error:",
			error instanceof Error ? error.message : String(error),
		);
		if (error instanceof Error && error.stack) {
			console.error("Stack:", error.stack);
		}
	}
}

testSignup().catch(console.error);
