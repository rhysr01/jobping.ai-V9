/**
 * Comprehensive tests for Semantic Retrieval Service
 * Tests vector embeddings, pgvector queries, fallback logic
 */

import { embeddingService } from "@/Utils/matching/embedding.service";
import { SemanticRetrievalService } from "@/Utils/matching/semanticRetrieval";

jest.mock("@/Utils/databasePool");
jest.mock("@/Utils/matching/embedding.service");
jest.mock("@/Utils/matching/categoryMapper", () => ({
  getDatabaseCategoriesForForm: jest.fn((formValue: string) => {
    const mapping: Record<string, string[]> = {
      strategy: ["strategy-business-design"],
      finance: ["finance-investment"],
    };
    return mapping[formValue] || [];
  }),
}));

describe("Semantic Retrieval Service", () => {
  let service: SemanticRetrievalService;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      rpc: jest.fn(),
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [{ id: "1" }], error: null }),
    };

    const { getDatabaseClient } = require("@/Utils/databasePool");
    getDatabaseClient.mockReturnValue(mockSupabase);

    (embeddingService.generateUserEmbedding as jest.Mock).mockResolvedValue(
      Array(1536).fill(0.1),
    );

    service = new SemanticRetrievalService();
  });

  describe("getSemanticCandidates", () => {
    it("should retrieve semantic candidates", async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [
          {
            id: "job1",
            title: "Software Engineer",
            semantic_score: 0.85,
            embedding_distance: 0.15,
          },
        ],
        error: null,
      });

      const userPrefs = {
        email: "user@example.com",
        target_cities: ["London"],
        career_path: ["strategy"],
      };

      const result = await service.getSemanticCandidates(userPrefs, 50);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].semantic_score).toBeDefined();
    });

    it("should handle array target_cities", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      const userPrefs = {
        email: "user@example.com",
        target_cities: ["London", "Paris"],
        career_path: ["strategy"],
      };

      await service.getSemanticCandidates(userPrefs);

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        "match_jobs_by_embedding",
        expect.objectContaining({
          city_filter: ["London", "Paris"],
        }),
      );
    });

    it("should map career path to database categories", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      const userPrefs = {
        email: "user@example.com",
        target_cities: ["London"],
        career_path: ["strategy", "finance"],
      };

      await service.getSemanticCandidates(userPrefs);

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        "match_jobs_by_embedding",
        expect.objectContaining({
          career_path_filter: expect.arrayContaining([
            "strategy-business-design",
            "finance-investment",
          ]),
        }),
      );
    });

    it("should fallback on RPC error", async () => {
      mockSupabase.rpc
        .mockRejectedValueOnce(new Error("RPC error"))
        .mockResolvedValueOnce({
          data: [{ id: "job1", semantic_score: 0.7 }],
          error: null,
        });

      const userPrefs = {
        email: "user@example.com",
        target_cities: ["London"],
      };

      const result = await service.getSemanticCandidates(userPrefs);

      expect(result).toBeDefined();
    });

    it("should handle single string target_cities", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      const userPrefs = {
        email: "user@example.com",
        target_cities: "London" as any,
        career_path: ["strategy"],
      };

      await service.getSemanticCandidates(userPrefs);

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        "match_jobs_by_embedding",
        expect.objectContaining({
          city_filter: ["London"],
        }),
      );
    });
  });

  describe("isSemanticSearchAvailable", () => {
    it("should return true when embeddings exist", async () => {
      mockSupabase.limit.mockResolvedValue({
        data: [{ id: "job1" }],
        error: null,
      });

      const result = await service.isSemanticSearchAvailable();

      expect(result).toBe(true);
    });

    it("should return false when no embeddings", async () => {
      mockSupabase.limit.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await service.isSemanticSearchAvailable();

      expect(result).toBe(false);
    });

    it("should return false on error", async () => {
      mockSupabase.limit.mockResolvedValue({
        data: null,
        error: new Error("Database error"),
      });

      const result = await service.isSemanticSearchAvailable();

      expect(result).toBe(false);
    });
  });

  describe("Fallback Logic", () => {
    it("should use text-based fallback", async () => {
      mockSupabase.rpc
        .mockRejectedValueOnce(new Error("Embedding error"))
        .mockResolvedValueOnce({
          data: [{ id: "job1", semantic_score: 0.6 }],
          error: null,
        });

      const userPrefs = {
        email: "user@example.com",
        target_cities: ["London"],
        career_path: ["strategy"],
      };

      const result = await service.getSemanticCandidates(userPrefs);

      expect(result).toBeDefined();
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        "search_jobs_semantic",
        expect.any(Object),
      );
    });
  });
});
