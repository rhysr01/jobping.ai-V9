/**
 * UNIT TESTS for SignupMatchingService - Strategy Pattern Implementation
 *
 * Tests the strategy pattern orchestration and delegation logic
 */

import { SignupMatchingService } from "@/utils/services/SignupMatchingService";
import type { UserPreferences } from "@/utils/matching/types";
import type { MatchingConfig } from "@/utils/services/SignupMatchingService";

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

jest.mock("@/utils/strategies/FreeMatchingStrategy", () => ({
	runFreeMatching: jest.fn(),
}));

jest.mock("@/utils/strategies/PremiumMatchingStrategy", () => ({
	runPremiumMatching: jest.fn(),
}));

const mockRunFreeMatching = require("@/utils/strategies/FreeMatchingStrategy")
	.runFreeMatching as jest.MockedFunction<any>;
const mockRunPremiumMatching =
	require("@/utils/strategies/PremiumMatchingStrategy")
		.runPremiumMatching as jest.MockedFunction<any>;
const mockGetDatabaseClient = require("@/utils/core/database-pool")
	.getDatabaseClient as jest.MockedFunction<any>;

describe("SignupMatchingService - Strategy Pattern", () => {
	let service: SignupMatchingService;
	let mockUser: UserPreferences;
	let mockConfig: MatchingConfig;
	let mockSupabase: any;

	beforeEach(() => {
		service = new SignupMatchingService();
		mockUser = {
			email: "test@example.com",
			target_cities: ["London"],
			career_path: ["Tech"],
			subscription_tier: "free",
		};
		mockConfig = {
			tier: "free",
			maxMatches: 5,
			jobFreshnessDays: 30,
			useAI: true,
			maxJobsForAI: 10,
			fallbackThreshold: 2,
			includePrefilterScore: false,
		};

		// Mock database client
		mockSupabase = {
			from: jest.fn().mockReturnThis(),
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			limit: jest.fn().mockResolvedValue({ data: [], count: null }),
			update: jest.fn().mockReturnThis(),
			upsert: jest.fn().mockResolvedValue({}),
		};
		mockGetDatabaseClient.mockReturnValue(mockSupabase);

		jest.clearAllMocks();
	});

	describe("Strategy Delegation", () => {
		beforeEach(() => {
			// Mock job fetching
			mockSupabase.from.mockReturnValue({
				select: jest.fn().mockReturnValue({
					eq: jest.fn().mockReturnValue({
						gt: jest.fn().mockResolvedValue({
							data: [
								{
									job_hash: "job1",
									title: "Software Engineer",
									city: "London",
									categories: ["tech"],
									created_at: new Date().toISOString(),
								},
							],
						}),
					}),
				}),
			});
		});

		it("should delegate to FreeMatchingStrategy for free tier", async () => {
			const freeConfig = { ...mockConfig, tier: "free" as const };
			const mockFreeResult = {
				matches: [{ job_hash: "job1", title: "Software Engineer" }],
				matchCount: 1,
				method: "free_ai_ranked",
				duration: 100,
			};

			mockRunFreeMatching.mockResolvedValue(mockFreeResult);

			const result = await SignupMatchingService.runMatching(
				mockUser,
				freeConfig,
			);

			expect(mockRunFreeMatching).toHaveBeenCalledWith(
				expect.objectContaining({
					email: mockUser.email,
					target_cities: mockUser.target_cities,
					career_path: null,
					subscription_tier: "free",
				}),
				expect.any(Array),
			);
			expect(result.success).toBe(true);
			expect(result.matchCount).toBe(1);
			expect(result.method).toBe("free_ai_ranked");
		});

		it("should delegate to PremiumMatchingStrategy for premium tier", async () => {
			const premiumConfig = { ...mockConfig, tier: "premium_pending" as const };
			const premiumUser = {
				...mockUser,
				subscription_tier: "premium_pending" as const,
			};
			const mockPremiumResult = {
				matches: [
					{ job_hash: "job1", title: "Software Engineer" },
					{ job_hash: "job2", title: "Product Manager" },
				],
				matchCount: 2,
				method: "premium_ai_ranked",
				duration: 200,
			};

			mockRunPremiumMatching.mockResolvedValue(mockPremiumResult);

			const result = await SignupMatchingService.runMatching(
				premiumUser,
				premiumConfig,
			);

			expect(mockRunPremiumMatching).toHaveBeenCalledWith(
				expect.objectContaining({
					email: premiumUser.email,
					target_cities: premiumUser.target_cities,
					career_path: premiumUser.career_path,
					subscription_tier: "premium_pending",
				}),
				expect.any(Array),
			);
			expect(result.success).toBe(true);
			expect(result.matchCount).toBe(2);
			expect(result.method).toBe("premium_ai_ranked");
		});
	});

	describe("Idempotency Checks", () => {
		it("should return existing matches if user already has them", async () => {
			// Mock existing matches
			mockSupabase.from.mockReturnValue({
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				limit: jest.fn().mockResolvedValue({
					data: [{ job_hash: "existing1" }],
					count: 3,
				}),
			});

			const result = await SignupMatchingService.runMatching(
				mockUser,
				mockConfig,
			);

			expect(result.success).toBe(true);
			expect(result.matchCount).toBe(3);
			expect(result.method).toBe("idempotent");
			expect(mockRunFreeMatching).not.toHaveBeenCalled();
		});

		it("should proceed with matching if no existing matches", async () => {
			// Mock no existing matches
			mockSupabase.from.mockReturnValue({
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				limit: jest.fn().mockResolvedValue({ data: [], count: null }),
			});

			// Mock job fetching and strategy
			mockSupabase.from.mockReturnValue({
				select: jest.fn().mockReturnValue({
					eq: jest.fn().mockReturnValue({
						gt: jest.fn().mockResolvedValue({
							data: [{ job_hash: "job1", title: "Software Engineer" }],
						}),
					}),
				}),
			});

			mockRunFreeMatching.mockResolvedValue({
				matches: [{ job_hash: "job1" }],
				matchCount: 1,
				method: "free_ai_ranked",
				duration: 100,
			});

			const result = await SignupMatchingService.runMatching(
				mockUser,
				mockConfig,
			);

			expect(mockRunFreeMatching).toHaveBeenCalled();
			expect(result.success).toBe(true);
		});
	});

	describe("Job Fetching", () => {
		beforeEach(() => {
			// Mock no existing matches
			mockSupabase.from.mockReturnValue({
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				limit: jest.fn().mockResolvedValue({ data: [], count: null }),
			});
		});

		it("should fetch jobs with correct freshness for free tier", async () => {
			mockSupabase.from.mockReturnValue({
				select: jest.fn().mockReturnValue({
					eq: jest.fn().mockReturnValue({
						gt: jest.fn().mockResolvedValue({
							data: [{ job_hash: "job1" }],
						}),
					}),
				}),
			});

			mockRunFreeMatching.mockResolvedValue({
				matches: [],
				matchCount: 0,
				method: "no_jobs_available",
				duration: 50,
			});

			await SignupMatchingService.runMatching(mockUser, mockConfig);

			expect(mockSupabase.from).toHaveBeenCalledWith("jobs");
			// Should filter by created_at > 30 days ago for free tier
		});

		it("should fetch jobs with correct freshness for premium tier", async () => {
			const premiumConfig = {
				...mockConfig,
				tier: "premium_pending" as const,
				jobFreshnessDays: 7,
			};

			mockSupabase.from.mockReturnValue({
				select: jest.fn().mockReturnValue({
					eq: jest.fn().mockReturnValue({
						gt: jest.fn().mockResolvedValue({
							data: [{ job_hash: "job1" }],
						}),
					}),
				}),
			});

			mockRunPremiumMatching.mockResolvedValue({
				matches: [],
				matchCount: 0,
				method: "no_jobs_available",
				duration: 50,
			});

			await SignupMatchingService.runMatching(mockUser, premiumConfig);

			expect(mockSupabase.from).toHaveBeenCalledWith("jobs");
			// Should filter by created_at > 7 days ago for premium tier
		});

		it("should handle no jobs available", async () => {
			mockSupabase.from.mockReturnValue({
				select: jest.fn().mockReturnValue({
					eq: jest.fn().mockReturnValue({
						gt: jest.fn().mockResolvedValue({
							data: [], // No jobs
						}),
					}),
				}),
			});

			const result = await SignupMatchingService.runMatching(
				mockUser,
				mockConfig,
			);

			expect(result.success).toBe(false);
			expect(result.matchCount).toBe(0);
			expect(result.error).toBe("NO_JOBS_AVAILABLE");
			expect(mockRunFreeMatching).not.toHaveBeenCalled();
		});
	});

	describe("Error Handling", () => {
		beforeEach(() => {
			// Mock successful setup
			mockSupabase.from.mockReturnValue({
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				limit: jest.fn().mockResolvedValue({ data: [], count: null }),
			});

			mockSupabase.from.mockReturnValue({
				select: jest.fn().mockReturnValue({
					eq: jest.fn().mockReturnValue({
						gt: jest.fn().mockResolvedValue({
							data: [{ job_hash: "job1" }],
						}),
					}),
				}),
			});
		});

		it("should handle strategy failures gracefully", async () => {
			mockRunFreeMatching.mockRejectedValue(new Error("Strategy failed"));

			const result = await SignupMatchingService.runMatching(
				mockUser,
				mockConfig,
			);

			expect(result.success).toBe(false);
			expect(result.matchCount).toBe(0);
			expect(result.error).toBe("Strategy failed");
		});

		it("should handle database errors in idempotency check", async () => {
			mockSupabase.from.mockRejectedValue(new Error("Database error"));

			const result = await SignupMatchingService.runMatching(
				mockUser,
				mockConfig,
			);

			expect(result.success).toBe(false);
			expect(result.error).toContain("Database error");
		});
	});

	describe("Logging", () => {
		beforeEach(() => {
			// Mock successful setup
			mockSupabase.from.mockReturnValue({
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				limit: jest.fn().mockResolvedValue({ data: [], count: null }),
			});

			mockSupabase.from.mockReturnValue({
				select: jest.fn().mockReturnValue({
					eq: jest.fn().mockReturnValue({
						gt: jest.fn().mockResolvedValue({
							data: [{ job_hash: "job1" }],
						}),
					}),
				}),
			});

			mockRunFreeMatching.mockResolvedValue({
				matches: [{ job_hash: "job1" }],
				matchCount: 1,
				method: "free_ai_ranked",
				duration: 100,
			});
		});

		it("should log matching start with correct tier", async () => {
			const mockLogger = require("@/lib/api-logger").apiLogger;

			await SignupMatchingService.runMatching(mockUser, mockConfig);

			expect(mockLogger.info).toHaveBeenCalledWith(
				"[FREE] Starting signup matching via strategy",
				expect.objectContaining({
					email: mockUser.email,
					tier: "free",
					maxMatches: 5,
				}),
			);
		});

		it("should log successful completion", async () => {
			const mockLogger = require("@/lib/api-logger").apiLogger;

			await SignupMatchingService.runMatching(mockUser, mockConfig);

			expect(mockLogger.info).toHaveBeenCalledWith(
				"[FREE] Strategy matching completed",
				expect.objectContaining({
					email: mockUser.email,
					tier: "free",
					matchesFound: 1,
					method: "free_ai_ranked",
				}),
			);
		});

		it("should log errors with context", async () => {
			const mockLogger = require("@/lib/api-logger").apiLogger;
			mockRunFreeMatching.mockRejectedValue(new Error("Test error"));

			await SignupMatchingService.runMatching(mockUser, mockConfig);

			expect(mockLogger.error).toHaveBeenCalledWith(
				"[FREE] Matching failed catastrophically",
				expect.any(Error),
				expect.objectContaining({
					email: mockUser.email,
					tier: "free",
				}),
			);
		});
	});
});
