/**
 * Comprehensive tests for Integrated Matching Service
 * Tests batch optimization, semantic retrieval integration
 */

import { IntegratedMatchingService } from "@/Utils/matching/integrated-matching.service";

jest.mock("@/Utils/matching/batch-processor.service");
jest.mock("@/Utils/matching/semanticRetrieval");
jest.mock("@/Utils/consolidatedMatchingV2");

describe("Integrated Matching Service", () => {
	let service: IntegratedMatchingService;

	beforeEach(() => {
		jest.clearAllMocks();
		service = new IntegratedMatchingService();
	});

	describe("processUsersWithBatchOptimization", () => {
		it("should use batch processing for large groups", async () => {
			const {
				batchMatchingProcessor,
			} = require("@/Utils/matching/batch-processor.service");
			batchMatchingProcessor.processBatch.mockResolvedValue(
				new Map([
					[
						"user1@example.com",
						{ matches: [], method: "ai_success", processingTime: 100 },
					],
				]),
			);

			const users = Array(10)
				.fill(null)
				.map((_, i) => ({
					email: `user${i}@example.com`,
					preferences: { target_cities: ["London"] },
				}));

			const result = await service.processUsersWithBatchOptimization(
				users,
				[],
				{ enabled: true, minUsersForBatch: 5 },
			);

			expect(batchMatchingProcessor.processBatch).toHaveBeenCalled();
			expect(result.size).toBeGreaterThan(0);
		});

		it("should use individual processing for small groups", async () => {
			const {
				createConsolidatedMatcher,
			} = require("@/Utils/consolidatedMatchingV2");
			const mockMatcher = {
				performMatching: jest.fn().mockResolvedValue({
					matches: [],
					method: "rule_based",
				}),
			};
			createConsolidatedMatcher.mockReturnValue(mockMatcher);

			const users = [
				{
					email: "user1@example.com",
					preferences: { target_cities: ["London"] },
				},
			];

			const result = await service.processUsersWithBatchOptimization(
				users,
				[],
				{ enabled: true, minUsersForBatch: 5 },
			);

			expect(mockMatcher.performMatching).toHaveBeenCalled();
			expect(result.size).toBe(1);
		});

		it("should respect batch processing options", async () => {
			const {
				batchMatchingProcessor,
			} = require("@/Utils/matching/batch-processor.service");
			batchMatchingProcessor.processBatch.mockResolvedValue(new Map());

			const users = Array(10)
				.fill(null)
				.map((_, i) => ({
					email: `user${i}@example.com`,
					preferences: {},
				}));

			await service.processUsersWithBatchOptimization(users, [], {
				enabled: false,
				minUsersForBatch: 5,
			});

			expect(batchMatchingProcessor.processBatch).not.toHaveBeenCalled();
		});
	});

	describe("getSemanticJobs", () => {
		it("should get semantic jobs when available", async () => {
			const {
				semanticRetrievalService,
			} = require("@/Utils/matching/semanticRetrieval");
			semanticRetrievalService.isSemanticSearchAvailable.mockResolvedValue(
				true,
			);
			semanticRetrievalService.getSemanticCandidates.mockResolvedValue([
				{ id: "job1", semantic_score: 0.9 },
			]);

			const userPrefs = {
				email: "user@example.com",
				target_cities: ["London"],
			};

			const result = await service.getSemanticJobs(userPrefs, 50);

			expect(result.length).toBeGreaterThan(0);
			expect(result[0].semantic_score).toBeDefined();
		});

		it("should return empty array when semantic search unavailable", async () => {
			const {
				semanticRetrievalService,
			} = require("@/Utils/matching/semanticRetrieval");
			semanticRetrievalService.isSemanticSearchAvailable.mockResolvedValue(
				false,
			);

			const userPrefs = { email: "user@example.com" };

			const result = await service.getSemanticJobs(userPrefs);

			expect(result).toEqual([]);
		});
	});
});
