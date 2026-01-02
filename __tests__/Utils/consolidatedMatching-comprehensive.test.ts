/**
 * Comprehensive tests for Consolidated Matching Engine
 * Tests all methods including edge cases and error handling
 */

import { buildMockJob, buildMockUser } from "@/__tests__/_helpers/testBuilders";
import {
	ConsolidatedMatchingEngine,
	createConsolidatedMatcher,
} from "@/Utils/consolidatedMatchingV2";

// Mock OpenAI
jest.mock("openai", () => {
	return {
		__esModule: true,
		default: jest.fn().mockImplementation(() => ({
			chat: {
				completions: {
					create: jest.fn().mockResolvedValue({
						choices: [
							{
								message: {
									function_call: {
										name: "return_job_matches",
										arguments: JSON.stringify({
											matches: [
												{
													job_index: 1,
													job_hash: "job1",
													match_score: 95,
													match_reason: "Perfect fit",
												},
												{
													job_index: 2,
													job_hash: "job2",
													match_score: 90,
													match_reason: "Great match",
												},
												{
													job_index: 3,
													job_hash: "job3",
													match_score: 85,
													match_reason: "Good fit",
												},
												{
													job_index: 4,
													job_hash: "job4",
													match_score: 80,
													match_reason: "Solid match",
												},
												{
													job_index: 5,
													job_hash: "job5",
													match_score: 75,
													match_reason: "Decent fit",
												},
											],
										}),
									},
								},
							},
						],
						usage: { total_tokens: 100 },
					}),
				},
			},
		})),
	};
});

describe("Consolidated Matching Engine - Comprehensive", () => {
	let matcher: ConsolidatedMatchingEngine;

	beforeEach(() => {
		matcher = new ConsolidatedMatchingEngine("test-api-key");
		jest.clearAllMocks();
	});

	describe("performMatching", () => {
		it("should return empty matches for empty job array", async () => {
			const user = buildMockUser();
			const result = await matcher.performMatching([], user);

			expect(result.matches).toEqual([]);
			expect(result.method).toBe("rule_based");
			expect(result.processingTime).toBeGreaterThanOrEqual(0);
		});

		it("should handle null jobs array", async () => {
			const user = buildMockUser();
			const result = await matcher.performMatching(null as any, user);

			expect(result.matches).toEqual([]);
			expect(result.method).toBe("rule_based");
		});

		it("should return matches with required fields", async () => {
			const jobs = Array.from({ length: 10 }, (_, i) =>
				buildMockJob({ job_hash: `job${i}`, categories: ["early-career"] }),
			);
			const user = buildMockUser();

			const result = await matcher.performMatching(jobs, user);

			expect(result).toBeDefined();
			expect(result.matches).toBeDefined();
			expect(Array.isArray(result.matches)).toBe(true);
			expect(result.method).toBeDefined();
			expect(result.processingTime).toBeGreaterThanOrEqual(0);
			expect(result.confidence).toBeGreaterThanOrEqual(0);

			if (result.matches.length > 0) {
				result.matches.forEach((match) => {
					expect(match).toHaveProperty("job_hash");
					expect(match).toHaveProperty("match_score");
					expect(match).toHaveProperty("match_reason");
				});
			}
		});

		it("should use rule-based matching when forced", async () => {
			const jobs = Array.from({ length: 10 }, (_, i) =>
				buildMockJob({ job_hash: `job${i}`, categories: ["early-career"] }),
			);
			const user = buildMockUser();

			const result = await matcher.performMatching(jobs, user, true);

			expect(result.method).toBe("rule_based");
			expect(result.matches).toBeDefined();
		});

		it("should handle jobs with missing fields", async () => {
			const jobs = [
				{ job_hash: "job1", title: "Engineer" } as any,
				buildMockJob({ job_hash: "job2" }),
			];
			const user = buildMockUser();

			const result = await matcher.performMatching(jobs, user, true);

			expect(result.matches).toBeDefined();
			expect(Array.isArray(result.matches)).toBe(true);
		});

		it("should handle user with minimal preferences", async () => {
			const jobs = Array.from({ length: 10 }, (_, i) =>
				buildMockJob({ job_hash: `job${i}`, categories: ["early-career"] }),
			);
			const user = { email: "test@example.com" } as any;

			const result = await matcher.performMatching(jobs, user, true);

			expect(result.matches).toBeDefined();
			expect(Array.isArray(result.matches)).toBe(true);
		});

		it("should handle large job arrays", async () => {
			const jobs = Array.from({ length: 200 }, (_, i) =>
				buildMockJob({ job_hash: `job${i}`, categories: ["early-career"] }),
			);
			const user = buildMockUser();

			const result = await matcher.performMatching(jobs, user);

			expect(result.matches.length).toBeLessThanOrEqual(8);
			expect(result.processingTime).toBeGreaterThanOrEqual(0);
		});
	});

	describe("testConnection", () => {
		it("should return true for successful connection", async () => {
			const OpenAI = require("openai").default;
			const mockInstance = new OpenAI();
			mockInstance.chat.completions.create.mockResolvedValue({
				choices: [{ message: { content: "test" } }],
			});

			const result = await matcher.testConnection();

			expect(result).toBe(true);
		});

		it("should return false for failed connection", async () => {
			const OpenAI = require("openai").default;
			const mockInstance = new OpenAI();
			mockInstance.chat.completions.create.mockRejectedValue(
				new Error("Connection failed"),
			);

			const result = await matcher.testConnection();

			expect(result).toBe(false);
		});

		it("should return false when OpenAI client not initialized", async () => {
			const matcherWithoutKey = new ConsolidatedMatchingEngine();
			const result = await matcherWithoutKey.testConnection();

			expect(result).toBe(false);
		});
	});

	describe("getCostMetrics", () => {
		it("should return cost metrics structure", () => {
			const metrics = matcher.getCostMetrics();

			expect(metrics).toBeDefined();
			expect(metrics).toHaveProperty("totalCalls");
			expect(metrics).toHaveProperty("totalTokens");
			expect(metrics).toHaveProperty("totalCost");
			expect(metrics).toHaveProperty("byModel");

			expect(typeof metrics.totalCalls).toBe("number");
			expect(typeof metrics.totalTokens).toBe("number");
			expect(typeof metrics.totalCost).toBe("number");
			expect(typeof metrics.byModel).toBe("object");
		});

		it("should track costs by model", () => {
			const metrics = matcher.getCostMetrics();

			expect(metrics.byModel).toHaveProperty("gpt4omini");
			expect(metrics.byModel).toHaveProperty("gpt4");
			expect(metrics.byModel).toHaveProperty("gpt35");
		});

		it("should initialize with zero costs", () => {
			const newMatcher = new ConsolidatedMatchingEngine("test-key");
			const metrics = newMatcher.getCostMetrics();

			expect(metrics.totalCalls).toBe(0);
			expect(metrics.totalTokens).toBe(0);
			expect(metrics.totalCost).toBe(0);
		});
	});

	describe("createConsolidatedMatcher factory", () => {
		it("should create matcher with API key", () => {
			const matcher = createConsolidatedMatcher("test-api-key");

			expect(matcher).toBeInstanceOf(ConsolidatedMatchingEngine);
		});

		it("should create matcher without API key", () => {
			const matcher = createConsolidatedMatcher();

			expect(matcher).toBeInstanceOf(ConsolidatedMatchingEngine);
		});

		it("should create functional matcher", async () => {
			const matcher = createConsolidatedMatcher("test-key");
			const jobs = Array.from({ length: 5 }, (_, i) =>
				buildMockJob({ job_hash: `job${i}`, categories: ["early-career"] }),
			);
			const user = buildMockUser();

			const result = await matcher.performMatching(jobs, user);

			expect(result).toBeDefined();
			expect(result.matches).toBeDefined();
		});
	});

	describe("Edge Cases", () => {
		it("should handle jobs with special characters in hash", async () => {
			const jobs = [
				buildMockJob({ job_hash: "job-123_abc", categories: ["early-career"] }),
			];
			const user = buildMockUser();

			const result = await matcher.performMatching(jobs, user, true);

			expect(result.matches).toBeDefined();
		});

		it("should handle user with array preferences", async () => {
			const jobs = Array.from({ length: 10 }, (_, i) =>
				buildMockJob({ job_hash: `job${i}`, categories: ["early-career"] }),
			);
			const user = buildMockUser({
				career_path: ["tech", "data"],
				target_cities: ["London", "Berlin", "Paris"],
			});

			const result = await matcher.performMatching(jobs, user, true);

			expect(result.matches).toBeDefined();
		});

		it("should handle user with string preferences", async () => {
			const jobs = Array.from({ length: 10 }, (_, i) =>
				buildMockJob({ job_hash: `job${i}`, categories: ["early-career"] }),
			);
			const user = buildMockUser({
				career_path: "tech" as any,
				target_cities: "London" as any,
			});

			const result = await matcher.performMatching(jobs, user, true);

			expect(result.matches).toBeDefined();
		});

		it("should handle very long job descriptions", async () => {
			const longDescription = "A".repeat(10000);
			const jobs = [
				buildMockJob({
					job_hash: "job1",
					description: longDescription,
					categories: ["early-career"],
				}),
			];
			const user = buildMockUser();

			const result = await matcher.performMatching(jobs, user, true);

			expect(result.matches).toBeDefined();
		});

		it("should handle jobs with null/undefined values", async () => {
			const jobs = [
				buildMockJob({
					job_hash: "job1",
					title: null as any,
					description: undefined as any,
					categories: ["early-career"],
				}),
			];
			const user = buildMockUser();

			const result = await matcher.performMatching(jobs, user, true);

			expect(result.matches).toBeDefined();
		});
	});

	describe("Performance", () => {
		it("should complete matching within reasonable time", async () => {
			const jobs = Array.from({ length: 50 }, (_, i) =>
				buildMockJob({ job_hash: `job${i}`, categories: ["early-career"] }),
			);
			const user = buildMockUser();

			const startTime = Date.now();
			await matcher.performMatching(jobs, user);
			const endTime = Date.now();

			expect(endTime - startTime).toBeLessThan(10000); // 10 seconds max
		});

		it("should handle concurrent matching requests", async () => {
			const jobs = Array.from({ length: 10 }, (_, i) =>
				buildMockJob({ job_hash: `job${i}`, categories: ["early-career"] }),
			);
			const user1 = buildMockUser({ email: "user1@test.com" });
			const user2 = buildMockUser({ email: "user2@test.com" });

			const [result1, result2] = await Promise.all([
				matcher.performMatching(jobs, user1),
				matcher.performMatching(jobs, user2),
			]);

			expect(result1.matches).toBeDefined();
			expect(result2.matches).toBeDefined();
		});
	});
});
