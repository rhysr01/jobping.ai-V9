import { expect, test } from "@playwright/test";

/**
 * Premium Matching E2E Tests
 *
 * Tests that premium users receive enhanced matching with stricter criteria,
 * more jobs, and better quality matches
 */

test.describe("Premium Matching Behavior", () => {
	// Reduce workers to avoid overloading matching service
	test.describe.configure({ mode: "parallel", workers: 1 });

	const generateTestEmail = (tier: "free" | "premium" = "premium") => {
		const timestamp = Date.now();
		return `test-${tier}-${timestamp}@testjobping.com`;
	};

	test("Premium users get more matches than free users", async ({ request }) => {
		const freeEmail = generateTestEmail("free");
		const premiumEmail = generateTestEmail("premium");

		console.log(`🧪 Comparing match counts: ${freeEmail} vs ${premiumEmail}`);

		// Create free user
		await request.post("/api/signup", {
			data: {
				fullName: "Free Test User",
				email: freeEmail,
				cities: ["London"],
				languages: ["English"],
				startDate: "2024-06-01",
				experience: "0",
				workEnvironment: ["Office"],
				visaStatus: "EU citizen",
				entryLevelPreferences: ["Graduate Programmes"],
				targetCompanies: ["Any"],
				careerPath: "finance",
				roles: ["Analyst"],
				industries: ["Finance"],
				companySizePreference: "any",
				skills: ["Excel"],
				careerKeywords: "analytical",
				gdprConsent: true,
				tier: "free",
			},
		});

		// Create premium user with same preferences
		await request.post("/api/signup", {
			data: {
				fullName: "Premium Test User",
				email: premiumEmail,
				cities: ["London"],
				languages: ["English"],
				startDate: "2024-06-01",
				experience: "0",
				workEnvironment: ["Office"],
				visaStatus: "EU citizen",
				entryLevelPreferences: ["Graduate Programmes"],
				targetCompanies: ["Any"],
				careerPath: "finance",
				roles: ["Analyst"],
				industries: ["Finance"],
				companySizePreference: "any",
				skills: ["Excel"],
				careerKeywords: "analytical",
				gdprConsent: true,
				tier: "premium",
			},
		});

		// Run matching for both users
		const [freeMatch, premiumMatch] = await Promise.all([
			request.post("/api/match-users", {
				headers: {
					Authorization: `Bearer ${process.env.SYSTEM_API_KEY}`,
				},
				data: { userEmail: freeEmail },
			}),
			request.post("/api/match-users", {
				headers: {
					Authorization: `Bearer ${process.env.SYSTEM_API_KEY}`,
				},
				data: { userEmail: premiumEmail },
			}),
		]);

		expect(freeMatch.status()).toBe(200);
		expect(premiumMatch.status()).toBe(200);

		const freeData = await freeMatch.json();
		const premiumData = await premiumMatch.json();

		// Premium should return at least as many matches as free
		expect(premiumData.matches.length).toBeGreaterThanOrEqual(freeData.matches.length);

		// Premium should have minimum match threshold
		expect(premiumData.matches.length).toBeGreaterThanOrEqual(5); // Premium minimum

		console.log(`✅ Free: ${freeData.matches.length} matches, Premium: ${premiumData.matches.length} matches`);
	});

	test("Premium users get stricter location matching", async ({ request }) => {
		const premiumEmail = generateTestEmail("premium");

		console.log(`🧪 Testing premium location matching for ${premiumEmail}`);

		// Create premium user with very specific location preference
		await request.post("/api/signup", {
			data: {
				fullName: "Premium Location Test",
				email: premiumEmail,
				cities: ["Berlin"], // Very specific city
				languages: ["English"],
				startDate: "2024-06-01",
				experience: "1 year",
				workEnvironment: ["Hybrid"],
				visaStatus: "EU citizen",
				entryLevelPreferences: ["Graduate Programmes"],
				targetCompanies: ["Tech Companies"],
				careerPath: "tech",
				roles: ["Software Engineer"],
				industries: ["Technology"],
				companySizePreference: "large",
				skills: ["Python"],
				careerKeywords: "backend development",
				gdprConsent: true,
				tier: "premium",
			},
		});

		// Run matching
		const matchResponse = await request.post("/api/match-users", {
			headers: {
				Authorization: `Bearer ${process.env.SYSTEM_API_KEY}`,
			},
			data: { userEmail: premiumEmail },
		});

		expect(matchResponse.status()).toBe(200);
		const matchData = await matchResponse.json();

		// Premium should filter out non-exact location matches
		for (const match of matchData.matches) {
			const jobLocation = match.job.location?.toLowerCase() || "";
			const userCity = "berlin";

			// Premium should only get Berlin jobs, not country-wide or other cities
			if (jobLocation.includes("germany") && !jobLocation.includes("berlin")) {
				// This would be a country-wide match that premium should avoid
				expect(match.match_score).toBeLessThan(80); // Should be penalized
			}
		}

		console.log(`✅ Premium location filtering verified for ${matchData.matches.length} matches`);
	});

	test("Premium users get career path strict matching", async ({ request }) => {
		const premiumEmail = generateTestEmail("premium");

		console.log(`🧪 Testing premium career path matching for ${premiumEmail}`);

		// Create premium user with specific career path
		await request.post("/api/signup", {
			data: {
				fullName: "Premium Career Test",
				email: premiumEmail,
				cities: ["London"],
				languages: ["English"],
				startDate: "2024-06-01",
				experience: "2 years",
				workEnvironment: ["Office"],
				visaStatus: "EU citizen",
				entryLevelPreferences: ["Mid-level"],
				targetCompanies: ["Consulting Firms"],
				careerPath: "strategy", // Very specific
				roles: ["Strategy Consultant"],
				industries: ["Consulting"],
				companySizePreference: "large",
				skills: ["Strategy", "Analysis"],
				careerKeywords: "strategic planning",
				gdprConsent: true,
				tier: "premium",
			},
		});

		// Run matching
		const matchResponse = await request.post("/api/match-users", {
			headers: {
				Authorization: `Bearer ${process.env.SYSTEM_API_KEY}`,
			},
			data: { userEmail: premiumEmail },
		});

		expect(matchResponse.status()).toBe(200);
		const matchData = await matchResponse.json();

		// Premium should only get strategy-related matches, no adjacent career paths
		for (const match of matchData.matches) {
			const jobCategories = match.job.categories || [];
			const hasStrategy = jobCategories.some((cat: string) =>
				cat.toLowerCase().includes("strategy")
			);

			if (!hasStrategy) {
				// Jobs without strategy should have lower scores for premium users
				expect(match.match_score).toBeLessThan(70);
			}
		}

		console.log(`✅ Premium career path filtering verified for ${matchData.matches.length} matches`);
	});

	test("Premium matching includes enhanced scoring data", async ({ request }) => {
		const premiumEmail = generateTestEmail("premium");

		console.log(`🧪 Testing premium enhanced scoring for ${premiumEmail}`);

		// Create premium user
		await request.post("/api/signup", {
			data: {
				fullName: "Premium Scoring Test",
				email: premiumEmail,
				cities: ["London"],
				languages: ["English"],
				startDate: "2024-06-01",
				experience: "1 year",
				workEnvironment: ["Hybrid"],
				visaStatus: "EU citizen",
				entryLevelPreferences: ["Graduate Programmes"],
				targetCompanies: ["Tech Companies"],
				careerPath: "tech",
				roles: ["Software Engineer"],
				industries: ["Technology"],
				companySizePreference: "large",
				skills: ["JavaScript"],
				careerKeywords: "frontend development",
				gdprConsent: true,
				tier: "premium",
			},
		});

		// Run matching
		const matchResponse = await request.post("/api/match-users", {
			headers: {
				Authorization: `Bearer ${process.env.SYSTEM_API_KEY}`,
			},
			data: { userEmail: premiumEmail },
		});

		expect(matchResponse.status()).toBe(200);
		const matchData = await matchResponse.json();

		// Premium matches should include enhanced scoring breakdown
		for (const match of matchData.matches) {
			expect(match).toHaveProperty("score_breakdown");
			expect(match.score_breakdown).toHaveProperty("overall");

			// Premium should have stricter eligibility requirements
			expect(match.score_breakdown).toHaveProperty("eligibility");
			expect(match.score_breakdown.eligibility).toBe(100); // Premium gets strict eligibility

			// Should have detailed component scores
			expect(match.score_breakdown).toHaveProperty("careerPath");
			expect(match.score_breakdown).toHaveProperty("location");
			expect(match.score_breakdown).toHaveProperty("workEnvironment");
			expect(match.score_breakdown).toHaveProperty("skills");
		}

		console.log(`✅ Premium enhanced scoring verified for ${matchData.matches.length} matches`);
	});

	test("Premium users bypass relaxed matching rules", async ({ request }) => {
		const premiumEmail = generateTestEmail("premium");

		console.log(`🧪 Testing premium relaxed matching bypass for ${premiumEmail}`);

		// Create premium user with very restrictive preferences
		await request.post("/api/signup", {
			data: {
				fullName: "Premium Strict Test",
				email: premiumEmail,
				cities: ["Tokyo"], // Very restrictive location
				languages: ["Japanese"], // Very restrictive language
				startDate: "2024-06-01",
				experience: "0", // Entry level only
				workEnvironment: ["On-site"], // Very specific
				visaStatus: "Japan citizen", // Very restrictive
				entryLevelPreferences: ["Internships"], // Very specific
				targetCompanies: ["Japanese Companies"], // Very restrictive
				careerPath: "finance", // Specific career
				roles: ["Financial Analyst Intern"], // Very specific role
				industries: ["Finance"],
				companySizePreference: "startup", // Restrictive
				skills: ["Excel", "Japanese"], // Specific skills
				careerKeywords: "japanese finance internship",
				gdprConsent: true,
				tier: "premium",
			},
		});

		// Run matching
		const matchResponse = await request.post("/api/match-users", {
			headers: {
				Authorization: `Bearer ${process.env.SYSTEM_API_KEY}`,
			},
			data: { userEmail: premiumEmail },
		});

		expect(matchResponse.status()).toBe(200);
		const matchData = await matchResponse.json();

		// Premium users should not get matches that use relaxed criteria
		// (This is hard to test without specific job data, but we can check scoring)

		for (const match of matchData.matches) {
			// Premium matches should have high eligibility scores (no relaxation)
			expect(match.score_breakdown.eligibility).toBe(100);

			// Should not have relaxation flags in match reason
			const reason = match.match_reason.toLowerCase();
			expect(reason).not.toContain("relaxed");
			expect(reason).not.toContain("flexible");
		}

		console.log(`✅ Premium strict matching verified for ${matchData.matches.length} matches`);
	});

	test("Premium matching performance is optimized", async ({ request }) => {
		const premiumEmail = generateTestEmail("premium");

		console.log(`🧪 Testing premium matching performance for ${premiumEmail}`);

		// Create premium user
		await request.post("/api/signup", {
			data: {
				fullName: "Premium Performance Test",
				email: premiumEmail,
				cities: ["London"],
				languages: ["English"],
				startDate: "2024-06-01",
				experience: "1 year",
				workEnvironment: ["Hybrid"],
				visaStatus: "EU citizen",
				entryLevelPreferences: ["Graduate Programmes"],
				targetCompanies: ["Tech Companies"],
				careerPath: "tech",
				roles: ["Software Engineer"],
				industries: ["Technology"],
				companySizePreference: "large",
				skills: ["JavaScript"],
				careerKeywords: "web development",
				gdprConsent: true,
				tier: "premium",
			},
		});

		// Time the matching process
		const startTime = Date.now();

		const matchResponse = await request.post("/api/match-users", {
			headers: {
				Authorization: `Bearer ${process.env.SYSTEM_API_KEY}`,
			},
			data: { userEmail: premiumEmail },
		});

		const endTime = Date.now();
		const duration = endTime - startTime;

		expect(matchResponse.status()).toBe(200);

		// Premium matching should complete within reasonable time
		// (Premium analyzes more jobs but should be optimized)
		expect(duration).toBeLessThan(30000); // 30 seconds max

		const matchData = await matchResponse.json();

		// Should include performance metrics for premium
		expect(matchData).toHaveProperty("processing_time");
		expect(matchData.processing_time).toBeLessThan(30000);

		// Premium should analyze more jobs than free tier
		expect(matchData).toHaveProperty("jobs_analyzed");
		expect(matchData.jobs_analyzed).toBeGreaterThan(50); // Premium analyzes more

		console.log(`✅ Premium matching completed in ${duration}ms, analyzed ${matchData.jobs_analyzed} jobs`);
	});

	test("Premium match quality is higher than free tier", async ({ request }) => {
		const freeEmail = generateTestEmail("free");
		const premiumEmail = generateTestEmail("premium");

		console.log(`🧪 Comparing match quality: ${freeEmail} vs ${premiumEmail}`);

		// Create users with identical preferences
		const userData = {
			cities: ["London"],
			languages: ["English"],
			startDate: "2024-06-01",
			experience: "1 year",
			workEnvironment: ["Hybrid"],
			visaStatus: "EU citizen",
			entryLevelPreferences: ["Graduate Programmes"],
			targetCompanies: ["Tech Companies"],
			careerPath: "tech",
			roles: ["Software Engineer"],
			industries: ["Technology"],
			companySizePreference: "large",
			skills: ["JavaScript"],
			careerKeywords: "web development",
			gdprConsent: true,
		};

		await Promise.all([
			request.post("/api/signup", {
				data: { ...userData, fullName: "Free Quality Test", email: freeEmail, tier: "free" },
			}),
			request.post("/api/signup", {
				data: { ...userData, fullName: "Premium Quality Test", email: premiumEmail, tier: "premium" },
			}),
		]);

		// Run matching for both
		const [freeMatch, premiumMatch] = await Promise.all([
			request.post("/api/match-users", {
				headers: {
					Authorization: `Bearer ${process.env.SYSTEM_API_KEY}`,
				},
				data: { userEmail: freeEmail },
			}),
			request.post("/api/match-users", {
				headers: {
					Authorization: `Bearer ${process.env.SYSTEM_API_KEY}`,
				},
				data: { userEmail: premiumEmail },
			}),
		]);

		expect(freeMatch.status()).toBe(200);
		expect(premiumMatch.status()).toBe(200);

		const freeData = await freeMatch.json();
		const premiumData = await premiumMatch.json();

		// Calculate average match quality
		const freeAvgScore = freeData.matches.length > 0
			? freeData.matches.reduce((sum: number, match: any) => sum + match.match_score, 0) / freeData.matches.length
			: 0;

		const premiumAvgScore = premiumData.matches.length > 0
			? premiumData.matches.reduce((sum: number, match: any) => sum + match.match_score, 0) / premiumData.matches.length
			: 0;

		// Premium should have higher average match quality
		expect(premiumAvgScore).toBeGreaterThanOrEqual(freeAvgScore);

		console.log(`✅ Match quality - Free: ${freeAvgScore.toFixed(1)}, Premium: ${premiumAvgScore.toFixed(1)}`);
	});
});
