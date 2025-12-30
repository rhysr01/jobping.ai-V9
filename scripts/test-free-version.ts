#!/usr/bin/env tsx
/**
 * Manual Test Script for Free Version
 *
 * Tests the free version signup and matches flow to ensure it doesn't hang.
 * Run with: tsx scripts/test-free-version.ts
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

console.log("🧪 Testing Free Version Flow\n");
console.log(`📍 Base URL: ${BASE_URL}\n`);

// Generate unique test email
const testEmail = `test-free-${Date.now()}@testjobping.com`;

console.log(`📧 Test Email: ${testEmail}\n`);

async function testEndpoint(
	url: string,
	options: {
		method?: string;
		headers?: Record<string, string>;
		body?: string;
	} = {},
) {
	const startTime = Date.now();

	try {
		const response = await fetch(`${BASE_URL}${url}`, {
			method: options.method || "GET",
			headers: {
				"Content-Type": "application/json",
				...options.headers,
			},
			body: options.body,
		});

		const responseTime = Date.now() - startTime;
		const data = await response.json().catch(() => ({}));

		return {
			status: response.status,
			responseTime,
			data,
			success: response.ok,
		};
	} catch (error) {
		const responseTime = Date.now() - startTime;
		return {
			status: 0,
			responseTime,
			error: error instanceof Error ? error.message : String(error),
			success: false,
		};
	}
}

async function runTests() {
	console.log("=".repeat(60));
	console.log("TEST 1: Health Check");
	console.log("=".repeat(60));

	const healthCheck = await testEndpoint("/api/health");
	console.log(`Status: ${healthCheck.status}`);
	console.log(`Response Time: ${healthCheck.responseTime}ms`);
	console.log(`Success: ${healthCheck.success ? "✅" : "❌"}\n`);

	if (!healthCheck.success) {
		console.log("❌ Health check failed. Is the server running?");
		console.log(`   Run: npm run dev`);
		process.exit(1);
	}

	console.log("=".repeat(60));
	console.log("TEST 2: Free Signup API");
	console.log("=".repeat(60));

	const signupData = {
		email: testEmail,
		full_name: "Test User",
		preferred_cities: ["Prague"],
		career_paths: ["finance"],
		entry_level_preferences: ["graduate", "intern", "junior"],
	};

	const signupResult = await testEndpoint("/api/signup/free", {
		method: "POST",
		body: JSON.stringify(signupData),
	});

	console.log(`Status: ${signupResult.status}`);
	console.log(`Response Time: ${signupResult.responseTime}ms`);
	console.log(`Success: ${signupResult.success ? "✅" : "❌"}`);

	if (signupResult.responseTime > 30000) {
		console.log("⚠️  WARNING: Signup took longer than 30 seconds!");
	}

	if (signupResult.data) {
		console.log(`Match Count: ${signupResult.data.matchCount || 0}`);
	}

	if (signupResult.error) {
		console.log(`Error: ${signupResult.error}`);
	}
	console.log();

	if (!signupResult.success && signupResult.status !== 409) {
		console.log("❌ Signup failed. Check the error above.");
		process.exit(1);
	}

	// Extract cookie from response headers (in real scenario, browser handles this)
	console.log("=".repeat(60));
	console.log("TEST 3: Matches API (with cookie)");
	console.log("=".repeat(60));

	const matchesResult = await testEndpoint("/api/matches/free", {
		headers: {
			Cookie: `free_user_email=${testEmail}`,
		},
	});

	console.log(`Status: ${matchesResult.status}`);
	console.log(`Response Time: ${matchesResult.responseTime}ms`);
	console.log(`Success: ${matchesResult.success ? "✅" : "❌"}`);

	if (matchesResult.responseTime > 35000) {
		console.log(
			"❌ ERROR: Matches API took longer than 35 seconds - TIMEOUT ISSUE!",
		);
	} else if (matchesResult.responseTime > 30000) {
		console.log(
			"⚠️  WARNING: Matches API took longer than 30 seconds - may indicate slow DB",
		);
	}

	if (matchesResult.data?.jobs) {
		console.log(`Jobs Returned: ${matchesResult.data.jobs.length}`);
		if (matchesResult.data.jobs.length > 0) {
			console.log(
				`First Job: ${matchesResult.data.jobs[0].title} at ${matchesResult.data.jobs[0].company}`,
			);
		}
	}

	if (matchesResult.error) {
		console.log(`Error: ${matchesResult.error}`);
	}

	if (matchesResult.status === 504) {
		console.log("❌ ERROR: Gateway Timeout - Database queries are timing out!");
		process.exit(1);
	}

	console.log();

	console.log("=".repeat(60));
	console.log("SUMMARY");
	console.log("=".repeat(60));
	console.log(`✅ Health Check: ${healthCheck.responseTime}ms`);
	console.log(`✅ Signup: ${signupResult.responseTime}ms`);
	console.log(`✅ Matches: ${matchesResult.responseTime}ms`);
	console.log();

	const maxTime = Math.max(
		healthCheck.responseTime,
		signupResult.responseTime,
		matchesResult.responseTime,
	);

	if (maxTime < 10000) {
		console.log("🎉 Excellent! All endpoints respond quickly (<10s)");
	} else if (maxTime < 30000) {
		console.log("✅ Good! All endpoints respond within acceptable time (<30s)");
	} else {
		console.log("⚠️  Warning! Some endpoints are slow (>30s)");
	}

	console.log("\n💡 To test in browser:");
	console.log(`   1. Go to ${BASE_URL}/signup/free`);
	console.log(`   2. Sign up with email: ${testEmail}`);
	console.log(`   3. Check Network tab for /api/matches/free response time`);
	console.log(`   4. Verify matches page loads without infinite loading`);
}

runTests().catch((error) => {
	console.error("❌ Test script failed:", error);
	process.exit(1);
});
