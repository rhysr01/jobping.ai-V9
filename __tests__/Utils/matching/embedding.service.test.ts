/**
 * Tests for Embedding Service
 * Tests vector embedding generation and caching
 */

import { buildMockJob, buildMockUser } from "@/__tests__/_helpers/testBuilders";
import {
	EmbeddingService,
	embeddingService,
} from "@/Utils/matching/embedding.service";

jest.mock("openai");
jest.mock("@/Utils/databasePool");

describe("EmbeddingService", () => {
	let service: EmbeddingService;
	let mockOpenAI: any;
	let mockSupabase: any;

	beforeEach(() => {
		jest.clearAllMocks();

		mockOpenAI = {
			embeddings: {
				create: jest.fn(),
			},
		};

		mockSupabase = {
			from: jest.fn().mockReturnThis(),
			select: jest.fn().mockReturnThis(),
			insert: jest.fn().mockReturnThis(),
			update: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			single: jest.fn(),
			upsert: jest.fn().mockResolvedValue({ error: null }),
		};

		const { OpenAI } = require("openai");
		OpenAI.mockImplementation(() => mockOpenAI);

		const { getDatabaseClient } = require("@/Utils/databasePool");
		getDatabaseClient.mockReturnValue(mockSupabase);

		process.env.OPENAI_API_KEY = "test-key";
		service = new EmbeddingService();
	});

	describe("generateJobEmbedding", () => {
		it("should generate embedding for a job", async () => {
			const job = buildMockJob();
			mockOpenAI.embeddings.create.mockResolvedValue({
				data: [{ embedding: [0.1, 0.2, 0.3] }],
			});

			const embedding = await service.generateJobEmbedding(job);

			expect(embedding).toEqual([0.1, 0.2, 0.3]);
			expect(mockOpenAI.embeddings.create).toHaveBeenCalled();
		});

		it("should handle OpenAI errors", async () => {
			const job = buildMockJob();
			mockOpenAI.embeddings.create.mockRejectedValue(new Error("OpenAI error"));

			await expect(service.generateJobEmbedding(job)).rejects.toThrow();
		});
	});

	describe("generateUserEmbedding", () => {
		it("should generate embedding for user preferences", async () => {
			const userPrefs = buildMockUser();
			mockOpenAI.embeddings.create.mockResolvedValue({
				data: [{ embedding: [0.4, 0.5, 0.6] }],
			});

			const embedding = await service.generateUserEmbedding(userPrefs);

			expect(embedding).toEqual([0.4, 0.5, 0.6]);
		});
	});

	describe("batchGenerateUserEmbeddings", () => {
		it("should batch generate embeddings for multiple users", async () => {
			const users = [
				{ email: "user1@example.com", preferences: buildMockUser() },
				{ email: "user2@example.com", preferences: buildMockUser() },
			];

			mockOpenAI.embeddings.create.mockResolvedValue({
				data: [{ embedding: [0.1, 0.2] }, { embedding: [0.3, 0.4] }],
			});

			const embeddings = await service.batchGenerateUserEmbeddings(users);

			expect(embeddings.size).toBe(2);
			expect(embeddings.get("user1@example.com")).toEqual([0.1, 0.2]);
			expect(embeddings.get("user2@example.com")).toEqual([0.3, 0.4]);
		});

		it("should return empty map for empty user list", async () => {
			const embeddings = await service.batchGenerateUserEmbeddings([]);
			expect(embeddings.size).toBe(0);
		});

		it("should handle batch generation errors gracefully", async () => {
			const users = [
				{ email: "user1@example.com", preferences: buildMockUser() },
			];
			mockOpenAI.embeddings.create.mockRejectedValue(new Error("Batch error"));

			const embeddings = await service.batchGenerateUserEmbeddings(users);

			expect(embeddings.size).toBe(0);
		});
	});

	describe("getUserEmbeddingWithCache", () => {
		it("should return cached embedding when available", async () => {
			const userPrefs = buildMockUser();
			mockSupabase.single.mockResolvedValue({
				data: { embedding: [0.1, 0.2, 0.3] },
				error: null,
			});

			const embedding = await service.getUserEmbeddingWithCache(
				"user@example.com",
				userPrefs,
			);

			expect(embedding).toEqual([0.1, 0.2, 0.3]);
		});

		it("should generate new embedding when cache miss", async () => {
			const userPrefs = buildMockUser();
			mockSupabase.single.mockResolvedValue({
				data: null,
				error: { code: "PGRST116" },
			});
			mockOpenAI.embeddings.create.mockResolvedValue({
				data: [{ embedding: [0.5, 0.6] }],
			});

			const embedding = await service.getUserEmbeddingWithCache(
				"user@example.com",
				userPrefs,
			);

			expect(embedding).toEqual([0.5, 0.6]);
		});
	});

	describe("storeUserEmbedding", () => {
		it("should store user embedding in database", async () => {
			const embedding = [0.1, 0.2, 0.3];
			mockSupabase.upsert.mockResolvedValue({ error: null });

			await service.storeUserEmbedding("user@example.com", embedding);

			expect(mockSupabase.upsert).toHaveBeenCalled();
		});
	});

	describe("singleton instance", () => {
		it("should export singleton instance", () => {
			expect(embeddingService).toBeInstanceOf(EmbeddingService);
		});
	});
});
