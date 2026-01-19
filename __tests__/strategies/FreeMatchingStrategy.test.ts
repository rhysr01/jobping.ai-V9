/**
 * UNIT TESTS for FreeMatchingStrategy - Free Tier Matching Logic
 *
 * Tests the free tier matching strategy with simple filtering and light AI
 */

import {
	runFreeMatching,
	type FreeUserPreferences,
} from "@/utils/strategies/FreeMatchingStrategy";
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

describe("FreeMatchingStrategy - Free Tier Logic", () => {
	let mockUser: FreeUserPreferences;
	let mockJobs: JobWithMetadata[];
	let mockSupabase: any;

	beforeEach(() => {
		mockUser = {
			email: "free-test@example.com",
			target_cities: ["London"],
			career_path: "Tech",
			visa_status: "eu-citizen",
			entry_level_preference: "entry",
			subscription_tier: "free",
		};

		mockJobs = [
			{
				job_hash: "job1",
				title: "Software Engineer",
				company: "Tech Corp",
				city: "London",
				categories: ["tech-transformation"],
				primary_category: "tech-transformation",
				description: "Software engineering role",
				created_at: new Date().toISOString(),
			} as JobWithMetadata,
			{
				job_hash: "job2",
				title: "Data Analyst",
				company: "Data Inc",
				city: "London",
				categories: ["tech-transformation"],
				primary_category: "tech-transformation",
				description: "Data analysis role",
				created_at: new Date().toISOString(),
			} as JobWithMetadata,
			{
				job_hash: "job3",
				title: "Marketing Manager",
				company: "Marketing Ltd",
				city: "Manchester",
				categories: ["marketing"],
				primary_category: "marketing",
				description: "Marketing role",
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
		it("should handle user preferences correctly", async () => {
			mockSimplifiedMatchingEngine.findMatchesForFreeUser.mockResolvedValue({
				matches: [],
				method: "ai",
				metadata: { matchingMethod: "free_ai_ranked" },
			});

			await runFreeMatching(mockUser, mockJobs);

			expect(
				mockSimplifiedMatchingEngine.findMatchesForFreeUser,
			).toHaveBeenCalledWith(
				expect.objectContaining({
					email: mockUser.email,
					target_cities: mockUser.target_cities,
					career_path: [mockUser.career_path], // Converted to array
					entry_level_preference: mockUser.entry_level_preference,
					visa_status: mockUser.visa_status,
					// Free users don't provide these
					languages_spoken: [],
					roles_selected: [],
					work_environment: undefined,
					skills: [],
					industries: [],
					company_size_preference: "any",
					career_keywords: null,
					subscription_tier: "free",
				}),
				expect.any(Array),
				expect.objectContaining({
					useAI: true,
					maxJobsForAI: 10,
					fallbackThreshold: 2,
					includePrefilterScore: false,
				}),
			);
		});
	});

	describe("Pre-filtering Logic", () => {
		beforeEach(() => {
			mockSimplifiedMatchingEngine.findMatchesForFreeUser.mockResolvedValue({
				matches: [
					{
						job: mockJobs[0],
						match_score: 85,
						match_reason: "Good match",
					},
				],
				method: "ai",
				metadata: { matchingMethod: "free_ai_ranked" },
			});
		});

		it("should filter jobs by city and career path", async () => {
			const result = await runFreeMatching(mockUser, mockJobs);

			// Should match job1 and job2 (London + tech), but not job3 (Manchester + marketing)
			expect(
				mockSimplifiedMatchingEngine.findMatchesForFreeUser,
			).toHaveBeenCalledWith(
				expect.any(Object),
				expect.arrayContaining([
					expect.objectContaining({ job_hash: "job1" }),
					expect.objectContaining({ job_hash: "job2" }),
				]),
				expect.any(Object),
			);
		});

		it("should handle users without career path specified", async () => {
			const userNoCareer = { ...mockUser, career_path: null };

			await runFreeMatching(userNoCareer, mockJobs);

			// Should still filter by city but allow all careers
			expect(
				mockSimplifiedMatchingEngine.findMatchesForFreeUser,
			).toHaveBeenCalledWith(
				expect.any(Object),
				expect.arrayContaining([
					expect.objectContaining({ job_hash: "job1" }),
					expect.objectContaining({ job_hash: "job2" }),
					expect.objectContaining({ job_hash: "job3" }), // Manchester job should be included
				]),
				expect.any(Object),
			);
		});

		it("should use fallback filtering when pre-filter is too restrictive", async () => {
			// Create jobs that don't match the career path
			const restrictiveJobs = [
				{
					...mockJobs[0],
					categories: ["finance"], // Doesn't match "Tech"
				} as JobWithMetadata,
			];

			const result = await runFreeMatching(mockUser, restrictiveJobs);

			// Should fall back to city-only filtering
			expect(result.method).toBe("free_fallback");
		});
	});

	describe("AI Processing", () => {
		it("should use light AI configuration for free tier", async () => {
			mockSimplifiedMatchingEngine.findMatchesForFreeUser.mockResolvedValue({
				matches: [
					{
						job: mockJobs[0],
						match_score: 85,
						match_reason: "Good match",
					},
				],
				method: "ai",
				metadata: { matchingMethod: "free_ai_ranked" },
			});

			await runFreeMatching(mockUser, mockJobs);

			expect(
				mockSimplifiedMatchingEngine.findMatchesForFreeUser,
			).toHaveBeenCalledWith(
				expect.any(Object),
				expect.any(Array),
				expect.objectContaining({
					useAI: true,
					maxJobsForAI: 10, // Light AI for free tier
					fallbackThreshold: 2,
					includePrefilterScore: false,
				}),
			);
		});

		it("should limit results to 5 matches maximum", async () => {
			mockSimplifiedMatchingEngine.findMatchesForFreeUser.mockResolvedValue({
				matches: Array(10)
					.fill(null)
					.map((_, i) => ({
						job: { ...mockJobs[0], job_hash: `job${i}` },
						match_score: 80 + i,
						match_reason: `Match ${i}`,
					})),
				method: "ai",
				metadata: { matchingMethod: "free_ai_ranked" },
			});

			const result = await runFreeMatching(mockUser, mockJobs);

			expect(result.matches).toHaveLength(5); // FREE: Always 5 matches max
			expect(result.matchCount).toBe(5);
		});
	});

	describe("Database Operations", () => {
		beforeEach(() => {
			mockSimplifiedMatchingEngine.findMatchesForFreeUser.mockResolvedValue({
				matches: [
					{
						job: mockJobs[0],
						match_score: 85,
						match_reason: "Good match",
					},
				],
				method: "ai",
				metadata: { matchingMethod: "free_ai_ranked" },
			});
		});

		it("should save matches to database", async () => {
			await runFreeMatching(mockUser, mockJobs);

			expect(mockSupabase.from).toHaveBeenCalledWith("matches");
			expect(mockSupabase.upsert).toHaveBeenCalledWith(
				expect.arrayContaining([
					expect.objectContaining({
						user_email: mockUser.email,
						job_hash: "job1",
						match_score: 8.5, // Converted from 85/100 to 0.085
						match_reason: "Matched",
						matched_at: expect.any(String),
						created_at: expect.any(String),
						match_algorithm: "free_ai_ranked",
					}),
				]),
				{ onConflict: "user_email,job_hash" },
			);
		});

		it("should handle database errors gracefully", async () => {
			mockSupabase.upsert.mockRejectedValue(new Error("Database error"));

			const result = await runFreeMatching(mockUser, mockJobs);

			// Should still return matches even if saving fails
			expect(result.matchCount).toBe(1);
			expect(result.matches).toHaveLength(1);
		});
	});

	describe("Error Handling", () => {
		it("should handle empty job list", async () => {
			const result = await runFreeMatching(mockUser, []);

			expect(result.matchCount).toBe(0);
			expect(result.method).toBe("no_jobs_available");
			expect(result.matches).toHaveLength(0);
		});

		it("should handle AI matching failures", async () => {
			mockSimplifiedMatchingEngine.findMatchesForUser.mockRejectedValue(
				new Error("AI service unavailable"),
			);

			await expect(runFreeMatching(mockUser, mockJobs)).rejects.toThrow(
				"AI service unavailable",
			);
		});
	});

	describe("Logging", () => {
		beforeEach(() => {
			mockSimplifiedMatchingEngine.findMatchesForFreeUser.mockResolvedValue({
				matches: [
					{
						job: mockJobs[0],
						match_score: 85,
						match_reason: "Good match",
					},
				],
				method: "ai",
				metadata: { matchingMethod: "free_ai_ranked" },
			});
		});

		it("should log matching start", async () => {
			const mockLogger = require("@/lib/api-logger").apiLogger;

			await runFreeMatching(mockUser, mockJobs);

			expect(mockLogger.info).toHaveBeenCalledWith(
				"[FREE] Starting free tier matching",
				expect.objectContaining({
					email: mockUser.email,
					cities: mockUser.target_cities,
					careerPath: mockUser.career_path,
					jobsAvailable: 3,
				}),
			);
		});

		it("should log pre-filtering results", async () => {
			const mockLogger = require("@/lib/api-logger").apiLogger;

			await runFreeMatching(mockUser, mockJobs);

			expect(mockLogger.info).toHaveBeenCalledWith(
				"[FREE] Pre-filtered jobs",
				expect.objectContaining({
					email: mockUser.email,
					original: 3,
					afterPreFilter: 2, // London + tech jobs
				}),
			);
		});

		it("should log ranking completion", async () => {
			const mockLogger = require("@/lib/api-logger").apiLogger;

			await runFreeMatching(mockUser, mockJobs);

			expect(mockLogger.info).toHaveBeenCalledWith(
				"[FREE] Ranking complete",
				expect.objectContaining({
					email: mockUser.email,
					inputJobs: 2,
					outputMatches: 1,
					method: "free_ai_ranked",
				}),
			);
		});

		it("should log database save success", async () => {
			const mockLogger = require("@/lib/api-logger").apiLogger;

			await runFreeMatching(mockUser, mockJobs);

			expect(mockLogger.info).toHaveBeenCalledWith(
				"[FREE] Matches saved",
				expect.objectContaining({
					email: mockUser.email,
					count: 1,
				}),
			);
		});

		it("should log errors with context", async () => {
			const mockLogger = require("@/lib/api-logger").apiLogger;
			mockSimplifiedMatchingEngine.findMatchesForUser.mockRejectedValue(
				new Error("AI failed"),
			);

			await expect(runFreeMatching(mockUser, mockJobs)).rejects.toThrow();

			expect(mockLogger.error).toHaveBeenCalledWith(
				"[FREE] Matching error",
				expect.any(Error),
				expect.objectContaining({
					email: mockUser.email,
				}),
			);
		});
	});
});
