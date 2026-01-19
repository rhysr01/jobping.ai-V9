/**
 * UNIT TESTS for PremiumMatchingStrategy - Premium Tier Matching Logic
 *
 * Tests the premium tier matching strategy with comprehensive filtering and deep AI
 */

import {
	runPremiumMatching,
	type PremiumUserPreferences,
} from "@/utils/strategies/PremiumMatchingStrategy";
import type { JobWithMetadata } from "@/lib/types/job";

// Mock all dependencies
jest.mock("@/lib/api-logger", () => ({
	apiLogger: {
		info: jest.fn(),
		error: jest.fn(),
		warn: jest.fn(),
	},
}));

jest.mock("@/utils/core/database-pool", () => ({
	getDatabaseClient: jest.fn(),
}));

jest.mock("@/utils/matching/core/matching-engine", () => ({
	simplifiedMatchingEngine: {
		findMatchesForUser: jest.fn(),
		findMatchesForFreeUser: jest.fn(),
		findMatchesForPremiumUser: jest.fn(),
	},
}));

const mockSimplifiedMatchingEngine =
	require("@/utils/matching/core/matching-engine").simplifiedMatchingEngine;
const mockGetDatabaseClient = require("@/utils/core/database-pool")
	.getDatabaseClient as jest.MockedFunction<any>;

describe("PremiumMatchingStrategy - Premium Tier Logic", () => {
	let mockUser: PremiumUserPreferences;
	let mockJobs: JobWithMetadata[];
	let mockSupabase: any;

	beforeEach(() => {
		mockUser = {
			email: "premium-test@example.com",
			target_cities: ["London", "Berlin"],
			career_path: ["Tech", "Product"],
			languages_spoken: ["English", "German"],
			roles_selected: ["software-engineer", "product-manager"],
			entry_level_preference: "mid",
			work_environment: "hybrid",
			visa_status: "visa-needed",
			skills: ["React", "Python", "SQL"],
			industries: ["tech", "finance"],
			company_size_preference: "startup",
			career_keywords: "leadership growth",
			subscription_tier: "premium_pending",
		};

		mockJobs = [
			{
				job_hash: "job1",
				title: "Senior Software Engineer",
				company: "Tech Corp",
				city: "London",
				categories: ["tech"],
				description: "Senior React/Python role at tech startup",
				work_environment: "hybrid",
				visa_sponsorship: true,
				visa_friendly: true,
				created_at: new Date().toISOString(),
			} as JobWithMetadata,
			{
				job_hash: "job2",
				title: "Product Manager",
				company: "Finance Ltd",
				city: "Berlin",
				categories: ["product"],
				description: "Product management in finance",
				work_environment: "hybrid",
				visa_sponsorship: false,
				visa_friendly: false,
				created_at: new Date().toISOString(),
			} as JobWithMetadata,
			{
				job_hash: "job3",
				title: "Marketing Manager",
				company: "Marketing Inc",
				city: "Manchester",
				categories: ["marketing"],
				description: "Marketing role",
				work_environment: "remote",
				visa_sponsorship: false,
				created_at: new Date().toISOString(),
			} as JobWithMetadata,
		];

		// Mock database client
		mockSupabase = {
			from: jest.fn().mockReturnThis(),
			upsert: jest.fn().mockResolvedValue({}),
			select: jest.fn().mockResolvedValue([]),
		};
		mockGetDatabaseClient.mockReturnValue(mockSupabase);

		jest.clearAllMocks();
	});

	describe("Input Processing", () => {
		it("should handle comprehensive user preferences", async () => {
			mockSimplifiedMatchingEngine.findMatchesForUser.mockResolvedValue({
				matches: [],
				method: "ai",
				metadata: { matchingMethod: "premium_ai_ranked" },
			});

			await runPremiumMatching(mockUser, mockJobs);

			expect(
				mockSimplifiedMatchingEngine.findMatchesForUser,
			).toHaveBeenCalledWith(
				mockUser, // Premium strategy passes user preferences directly
				expect.any(Array),
				expect.objectContaining({
					useAI: true,
					maxJobsForAI: 30, // Deep AI for premium
					fallbackThreshold: 5,
					includePrefilterScore: true,
				}),
			);
		});
	});

	describe("Comprehensive Pre-filtering", () => {
		beforeEach(() => {
			mockSimplifiedMatchingEngine.findMatchesForUser.mockResolvedValue({
				matches: [
					{
						job: mockJobs[0],
						match_score: 90,
						match_reason: "Excellent premium match",
					},
				],
				method: "ai",
				metadata: { matchingMethod: "premium_ai_ranked" },
			});
		});

		it("should apply all filtering criteria", async () => {
			const result = await runPremiumMatching(mockUser, mockJobs);

			// Should only match job1 (London + tech + hybrid + visa sponsorship)
			expect(
				mockSimplifiedMatchingEngine.findMatchesForUser,
			).toHaveBeenCalledWith(
				expect.any(Object),
				expect.arrayContaining([expect.objectContaining({ job_hash: "job1" })]),
				expect.any(Object),
			);

			// Should not include job2 (Berlin but no visa sponsorship) or job3 (Manchester + marketing + remote)
			expect(
				mockSimplifiedMatchingEngine.findMatchesForUser,
			).toHaveBeenCalledWith(
				expect.any(Object),
				expect.not.arrayContaining([
					expect.objectContaining({ job_hash: "job2" }),
					expect.objectContaining({ job_hash: "job3" }),
				]),
				expect.any(Object),
			);
		});

		it("should filter by city", async () => {
			const londonOnlyUser = { ...mockUser, target_cities: ["London"] };

			await runPremiumMatching(londonOnlyUser, mockJobs);

			// Should include London job, exclude Berlin and Manchester
			expect(
				mockSimplifiedMatchingEngine.findMatchesForUser,
			).toHaveBeenCalledWith(
				expect.any(Object),
				expect.arrayContaining([expect.objectContaining({ job_hash: "job1" })]),
				expect.any(Object),
			);
		});

		it("should filter by career path", async () => {
			// Should match tech and product categories
			const result = await runPremiumMatching(mockUser, mockJobs);

			// job1 has "tech" category, job2 has "product" category
			expect(
				mockSimplifiedMatchingEngine.findMatchesForUser,
			).toHaveBeenCalledWith(
				expect.any(Object),
				expect.arrayContaining([
					expect.objectContaining({ job_hash: "job1" }),
					expect.objectContaining({ job_hash: "job2" }), // Berlin job, but has product category
				]),
				expect.any(Object),
			);
		});

		it("should filter by skills", async () => {
			// Should match jobs containing React/Python/SQL keywords
			const result = await runPremiumMatching(mockUser, mockJobs);

			// job1 description contains "React/Python"
			expect(
				mockSimplifiedMatchingEngine.findMatchesForUser,
			).toHaveBeenCalledWith(
				expect.any(Object),
				expect.arrayContaining([expect.objectContaining({ job_hash: "job1" })]),
				expect.any(Object),
			);
		});

		it("should filter by work environment", async () => {
			const remoteUser = { ...mockUser, work_environment: "remote" };

			await runPremiumMatching(remoteUser, mockJobs);

			// Should only include job3 (remote), exclude job1/job2 (hybrid)
			expect(
				mockSimplifiedMatchingEngine.findMatchesForUser,
			).toHaveBeenCalledWith(
				expect.any(Object),
				expect.arrayContaining([expect.objectContaining({ job_hash: "job3" })]),
				expect.any(Object),
			);
		});

		it("should filter by visa requirements", async () => {
			// User needs visa sponsorship, job1 has it, job2 doesn't
			const result = await runPremiumMatching(mockUser, mockJobs);

			// Should include job1 (visa sponsorship), exclude job2 (no visa)
			expect(
				mockSimplifiedMatchingEngine.findMatchesForUser,
			).toHaveBeenCalledWith(
				expect.any(Object),
				expect.arrayContaining([expect.objectContaining({ job_hash: "job1" })]),
				expect.any(Object),
			);
		});

		it("should use fallback filtering when pre-filter is too restrictive", async () => {
			// Create jobs that don't match all criteria
			const restrictiveJobs = [
				{
					...mockJobs[0],
					categories: ["finance"], // Doesn't match user's career paths
					work_environment: "remote", // Doesn't match user's preference
				} as JobWithMetadata,
			];

			const result = await runPremiumMatching(mockUser, restrictiveJobs);

			// Should fall back to less restrictive filtering
			expect(result.method).toBe("premium_fallback");
		});
	});

	describe("Deep AI Processing", () => {
		it("should use premium AI configuration", async () => {
			mockSimplifiedMatchingEngine.findMatchesForUser.mockResolvedValue({
				matches: [
					{
						job: mockJobs[0],
						match_score: 95,
						match_reason: "Premium AI match",
					},
				],
				method: "ai",
				metadata: { matchingMethod: "premium_ai_ranked" },
			});

			await runPremiumMatching(mockUser, mockJobs);

			expect(
				mockSimplifiedMatchingEngine.findMatchesForUser,
			).toHaveBeenCalledWith(
				expect.any(Object),
				expect.any(Array),
				expect.objectContaining({
					useAI: true,
					maxJobsForAI: 30, // PREMIUM: Deep AI processing
					fallbackThreshold: 5, // More tolerant
					includePrefilterScore: true, // Include pre-filter scores
				}),
			);
		});

		it("should limit results to 15 matches maximum", async () => {
			mockSimplifiedMatchingEngine.findMatchesForUser.mockResolvedValue({
				matches: Array(20)
					.fill(null)
					.map((_, i) => ({
						job: { ...mockJobs[0], job_hash: `job${i}` },
						match_score: 80 + i,
						match_reason: `Premium match ${i}`,
					})),
				method: "ai",
				metadata: { matchingMethod: "premium_ai_ranked" },
			});

			const result = await runPremiumMatching(mockUser, mockJobs);

			expect(result.matches).toHaveLength(15); // PREMIUM: Always 15 matches max
			expect(result.matchCount).toBe(15);
		});
	});

	describe("Database Operations", () => {
		beforeEach(() => {
			mockSimplifiedMatchingEngine.findMatchesForUser.mockResolvedValue({
				matches: [
					{
						job: mockJobs[0],
						match_score: 90,
						match_reason: "Premium AI match",
					},
				],
				method: "ai",
				metadata: { matchingMethod: "premium_ai_ranked" },
			});
		});

		it("should save premium matches to database", async () => {
			await runPremiumMatching(mockUser, mockJobs);

			expect(mockSupabase.from).toHaveBeenCalledWith("matches");
			expect(mockSupabase.upsert).toHaveBeenCalledWith(
				expect.arrayContaining([
					expect.objectContaining({
						user_email: mockUser.email,
						job_hash: "job1",
						match_score: 9.0, // Converted from 90/100 to 0.9
						match_reason: "Premium AI Match",
						matched_at: expect.any(String),
						created_at: expect.any(String),
						match_algorithm: "premium_ai_ranked",
					}),
				]),
				{ onConflict: "user_email,job_hash" },
			);
		});

		it("should handle database save failures gracefully", async () => {
			mockSupabase.upsert.mockRejectedValue(new Error("Database error"));

			const result = await runPremiumMatching(mockUser, mockJobs);

			// Should still return matches even if saving fails
			expect(result.matchCount).toBe(1);
			expect(result.matches).toHaveLength(1);
		});
	});

	describe("Error Handling", () => {
		it("should handle empty job list", async () => {
			const result = await runPremiumMatching(mockUser, []);

			expect(result.matchCount).toBe(0);
			expect(result.method).toBe("no_jobs_available");
			expect(result.matches).toHaveLength(0);
		});

		it("should handle AI matching failures", async () => {
			mockSimplifiedMatchingEngine.findMatchesForUser.mockRejectedValue(
				new Error("Premium AI service unavailable"),
			);

			await expect(runPremiumMatching(mockUser, mockJobs)).rejects.toThrow(
				"Premium AI service unavailable",
			);
		});
	});

	describe("Logging", () => {
		beforeEach(() => {
			mockSimplifiedMatchingEngine.findMatchesForUser.mockResolvedValue({
				matches: [
					{
						job: mockJobs[0],
						match_score: 90,
						match_reason: "Premium AI match",
					},
				],
				method: "ai",
				metadata: { matchingMethod: "premium_ai_ranked" },
			});
		});

		it("should log premium matching start with comprehensive details", async () => {
			const mockLogger = require("../../../lib/api-logger").apiLogger;

			await runPremiumMatching(mockUser, mockJobs);

			expect(mockLogger.info).toHaveBeenCalledWith(
				"[PREMIUM] Starting premium tier matching",
				expect.objectContaining({
					email: mockUser.email,
					cities: mockUser.target_cities,
					careerPaths: mockUser.career_path,
					skills: mockUser.skills.length,
					industries: mockUser.industries.length,
					jobsAvailable: 3,
				}),
			);
		});

		it("should log detailed pre-filtering results", async () => {
			const mockLogger = require("../../../lib/api-logger").apiLogger;

			await runPremiumMatching(mockUser, mockJobs);

			expect(mockLogger.info).toHaveBeenCalledWith(
				"[PREMIUM] Pre-filtered jobs",
				expect.objectContaining({
					email: mockUser.email,
					original: 3,
					afterPreFilter: 1, // Only job1 matches all criteria
					filtersApplied: expect.objectContaining({
						cities: 2,
						careers: 2,
						skills: 3,
						industries: 2,
						workEnvironment: "hybrid",
						visaStatus: "visa-needed",
					}),
				}),
			);
		});

		it("should log deep AI ranking completion", async () => {
			const mockLogger = require("../../../lib/api-logger").apiLogger;

			await runPremiumMatching(mockUser, mockJobs);

			expect(mockLogger.info).toHaveBeenCalledWith(
				"[PREMIUM] Deep AI ranking complete",
				expect.objectContaining({
					email: mockUser.email,
					inputJobs: 1,
					outputMatches: 1,
					method: "premium_ai_ranked",
				}),
			);
		});

		it("should log premium database saves", async () => {
			const mockLogger = require("../../../lib/api-logger").apiLogger;

			await runPremiumMatching(mockUser, mockJobs);

			expect(mockLogger.info).toHaveBeenCalledWith(
				"[PREMIUM] Premium matches saved",
				expect.objectContaining({
					email: mockUser.email,
					count: 1,
				}),
			);
		});

		it("should log premium-specific errors", async () => {
			const mockLogger = require("../../../lib/api-logger").apiLogger;
			mockSimplifiedMatchingEngine.findMatchesForUser.mockRejectedValue(
				new Error("Premium AI failed"),
			);

			await expect(runPremiumMatching(mockUser, mockJobs)).rejects.toThrow();

			expect(mockLogger.error).toHaveBeenCalledWith(
				"[PREMIUM] Deep AI ranking error",
				expect.any(Error),
				expect.objectContaining({
					email: mockUser.email,
				}),
			);
		});
	});
});
