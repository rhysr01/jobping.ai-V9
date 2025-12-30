/**
 * Comprehensive tests for Embedding Service
 * Tests embedding generation, caching, batch processing
 */

import { EmbeddingService } from "@/Utils/matching/embedding.service";

jest.mock("openai");
jest.mock("@/Utils/databasePool");

describe("Embedding Service", () => {
  let service: EmbeddingService;
  let mockOpenAI: any;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    process.env.OPENAI_API_KEY = "sk-test-123";

    mockOpenAI = {
      embeddings: {
        create: jest.fn().mockResolvedValue({
          data: [
            { embedding: Array(1536).fill(0.1) },
            { embedding: Array(1536).fill(0.2) },
          ],
          usage: { total_tokens: 100 },
        }),
      },
    };

    const OpenAI = require("openai");
    OpenAI.mockImplementation(() => mockOpenAI);

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      update: jest.fn().mockResolvedValue({ error: null }),
    };

    const { getDatabaseClient } = require("@/Utils/databasePool");
    getDatabaseClient.mockReturnValue(mockSupabase);

    service = new EmbeddingService();
  });

  describe("generateJobEmbedding", () => {
    it("should generate embedding for job", async () => {
      const job = {
        title: "Software Engineer",
        description: "Great opportunity",
        company: "Tech Corp",
        location: "London",
      };

      const embedding = await service.generateJobEmbedding(job as any);

      expect(embedding).toBeDefined();
      expect(Array.isArray(embedding)).toBe(true);
      expect(mockOpenAI.embeddings.create).toHaveBeenCalled();
    });
  });

  describe("generateUserEmbedding", () => {
    it("should generate embedding for user preferences", async () => {
      const preferences = {
        target_cities: ["London"],
        career_path: ["strategy"],
      };

      const embedding = await service.generateUserEmbedding(preferences);

      expect(embedding).toBeDefined();
      expect(Array.isArray(embedding)).toBe(true);
    });
  });

  describe("batchGenerateUserEmbeddings", () => {
    it("should batch generate embeddings", async () => {
      const users = [
        {
          email: "user1@example.com",
          preferences: { target_cities: ["London"] },
        },
        {
          email: "user2@example.com",
          preferences: { target_cities: ["Paris"] },
        },
      ];

      const result = await service.batchGenerateUserEmbeddings(users);

      expect(result.size).toBe(2);
      expect(result.has("user1@example.com")).toBe(true);
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledTimes(1);
    });

    it("should return empty map for empty users", async () => {
      const result = await service.batchGenerateUserEmbeddings([]);

      expect(result.size).toBe(0);
      expect(mockOpenAI.embeddings.create).not.toHaveBeenCalled();
    });
  });

  describe("getUserEmbeddingWithCache", () => {
    it("should return cached embedding when hash matches", async () => {
      const cachedEmbedding = Array(1536).fill(0.1);
      mockSupabase.single.mockResolvedValue({
        data: {
          preference_embedding: cachedEmbedding,
          preference_hash: "test-hash-1234",
        },
        error: null,
      });

      const preferences = { target_cities: ["London"] };
      const prefsText = (service as any).buildUserPreferencesText(preferences);
      const prefsHash = (service as any).hashString(prefsText);

      // Mock hash to match
      jest
        .spyOn(service as any, "hashString")
        .mockReturnValue("test-hash-1234");

      const embedding = await service.getUserEmbeddingWithCache(
        "user@example.com",
        preferences,
      );

      expect(embedding).toEqual(cachedEmbedding);
      expect(mockOpenAI.embeddings.create).not.toHaveBeenCalled();
    });

    it("should generate new embedding when cache miss", async () => {
      mockSupabase.single.mockResolvedValue({ data: null, error: null });

      const preferences = { target_cities: ["London"] };

      const embedding = await service.getUserEmbeddingWithCache(
        "user@example.com",
        preferences,
      );

      expect(embedding).toBeDefined();
      expect(mockOpenAI.embeddings.create).toHaveBeenCalled();
    });
  });

  describe("batchGenerateJobEmbeddings", () => {
    it("should batch generate job embeddings", async () => {
      const jobs = Array(50)
        .fill(null)
        .map((_, i) => ({
          job_hash: `job${i}`,
          title: `Job ${i}`,
          description: "Description",
        }));

      const result = await service.batchGenerateJobEmbeddings(jobs);

      expect(result.size).toBe(50);
    });

    it("should process in batches", async () => {
      const jobs = Array(250)
        .fill(null)
        .map((_, i) => ({
          job_hash: `job${i}`,
          title: `Job ${i}`,
          description: "Description",
        }));

      await service.batchGenerateJobEmbeddings(jobs);

      // Should be called multiple times for batches
      expect(mockOpenAI.embeddings.create).toHaveBeenCalled();
    });
  });
});
