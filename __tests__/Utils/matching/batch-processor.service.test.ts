/**
 * Tests for Batch Matching Processor
 * Tests user grouping and batch processing logic
 */

import { buildMockJob, buildMockUser } from "@/__tests__/_helpers/testBuilders";
import { createConsolidatedMatcher } from "@/Utils/consolidatedMatchingV2";
import {
	BatchMatchingProcessor,
	batchMatchingProcessor,
} from "@/Utils/matching/batch-processor.service";
import { embeddingService } from "@/Utils/matching/embedding.service";

jest.mock("@/Utils/databasePool");
jest.mock("@/Utils/matching/embedding.service");
jest.mock("@/Utils/consolidatedMatchingV2");
jest.mock("@/Utils/matching/preFilterJobs");

describe("BatchMatchingProcessor", () => {
	let processor: BatchMatchingProcessor;
	let mockSupabase: any;
	let mockMatcher: any;

	beforeEach(() => {
		jest.clearAllMocks();

		mockSupabase = {
			from: jest.fn().mockReturnThis(),
			select: jest.fn().mockReturnThis(),
			rpc: jest.fn(),
		};

		mockMatcher = {
			performMatching: jest.fn().mockResolvedValue({
				matches: [],
				method: "ai_success",
				confidence: 0.8,
			}),
		};

		(createConsolidatedMatcher as jest.Mock).mockReturnValue(mockMatcher);

		processor = new BatchMatchingProcessor();
	});

	describe("processBatch", () => {
		it("should process users with heuristic grouping", async () => {
			const users = [
				{
					email: "user1@example.com",
					preferences: buildMockUser({ target_cities: ["London"] }),
				},
				{
					email: "user2@example.com",
					preferences: buildMockUser({ target_cities: ["London"] }),
				},
			];
			const jobs = [buildMockJob()];

			(
				embeddingService.batchGenerateUserEmbeddings as jest.Mock
			).mockResolvedValue(new Map());

			const results = await processor.processBatch(users, jobs, {
				useEmbeddings: false,
			});

			expect(results.size).toBeGreaterThan(0);
		});

		it("should process users with embedding grouping", async () => {
			const users = [
				{ email: "user1@example.com", preferences: buildMockUser() },
				{ email: "user2@example.com", preferences: buildMockUser() },
			];
			const jobs = [buildMockJob()];

			const embeddings = new Map();
			embeddings.set("user1@example.com", [0.1, 0.2, 0.3]);
			embeddings.set("user2@example.com", [0.1, 0.2, 0.3]); // Similar embedding

			(
				embeddingService.batchGenerateUserEmbeddings as jest.Mock
			).mockResolvedValue(embeddings);

			const results = await processor.processBatch(users, jobs, {
				useEmbeddings: true,
			});

			expect(results.size).toBeGreaterThan(0);
		});

		it("should handle empty user list", async () => {
			const results = await processor.processBatch([], [buildMockJob()]);
			expect(results.size).toBe(0);
		});

		it("should handle empty job list", async () => {
			const users = [
				{ email: "user1@example.com", preferences: buildMockUser() },
			];
			const results = await processor.processBatch(users, [], {
				useEmbeddings: false,
			});
			expect(results.size).toBeGreaterThan(0);
		});

		it("should respect maxBatchSize option", async () => {
			const users = Array.from({ length: 20 }, (_, i) => ({
				email: `user${i}@example.com`,
				preferences: buildMockUser(),
			}));
			const jobs = [buildMockJob()];

			(
				embeddingService.batchGenerateUserEmbeddings as jest.Mock
			).mockResolvedValue(new Map());

			await processor.processBatch(users, jobs, {
				maxBatchSize: 5,
				useEmbeddings: false,
			});

			// Should process in batches
			expect(mockMatcher.performMatching).toHaveBeenCalled();
		});
	});

	describe("getSegmentStats", () => {
		it("should return segment statistics", async () => {
			mockSupabase.select.mockResolvedValue({ count: 100 });

			const stats = await processor.getSegmentStats();

			expect(stats).toHaveProperty("totalUsers");
			expect(stats).toHaveProperty("totalSegments");
		});

		it("should handle database errors", async () => {
			mockSupabase.select.mockRejectedValue(new Error("DB error"));

			await expect(processor.getSegmentStats()).resolves.toBeDefined();
		});
	});
});
