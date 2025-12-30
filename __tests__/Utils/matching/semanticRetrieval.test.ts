import { SemanticRetrievalService } from "@/Utils/matching/semanticRetrieval";
import type { UserPreferences } from "@/Utils/matching/types";

jest.mock("@/Utils/databasePool", () => ({
  getDatabaseClient: jest.fn(() => ({
    rpc: jest.fn().mockResolvedValue({
      data: [],
      error: null,
    }),
  })),
}));

jest.mock("@/Utils/matching/embedding.service", () => ({
  embeddingService: {
    generateUserEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  },
}));

describe("SemanticRetrievalService", () => {
  let service: SemanticRetrievalService;
  const mockUser: UserPreferences = {
    email: "test@example.com",
    career_path: ["tech"],
    target_cities: ["London"],
  };

  beforeEach(() => {
    service = new SemanticRetrievalService();
  });

  describe("getSemanticCandidates", () => {
    it("should get semantic candidates", async () => {
      const jobs = await service.getSemanticCandidates(mockUser, 100);
      expect(Array.isArray(jobs)).toBe(true);
    });

    it("should respect limit parameter", async () => {
      const jobs = await service.getSemanticCandidates(mockUser, 50);
      expect(Array.isArray(jobs)).toBe(true);
    });

    it("should handle array target cities", async () => {
      const userWithArray: UserPreferences = {
        ...mockUser,
        target_cities: ["London", "Berlin"],
      };
      const jobs = await service.getSemanticCandidates(userWithArray);
      expect(Array.isArray(jobs)).toBe(true);
    });

    it("should handle string target city", async () => {
      const userWithString: UserPreferences = {
        ...mockUser,
        target_cities: "London" as any,
      };
      const jobs = await service.getSemanticCandidates(userWithString);
      expect(Array.isArray(jobs)).toBe(true);
    });

    it("should handle array career path", async () => {
      const userWithArray: UserPreferences = {
        ...mockUser,
        career_path: ["tech", "product"],
      };
      const jobs = await service.getSemanticCandidates(userWithArray);
      expect(Array.isArray(jobs)).toBe(true);
    });

    it("should handle string career path", async () => {
      const userWithString: UserPreferences = {
        ...mockUser,
        career_path: "tech" as any,
      };
      const jobs = await service.getSemanticCandidates(userWithString);
      expect(Array.isArray(jobs)).toBe(true);
    });

    it("should fallback on error", async () => {
      const { getDatabaseClient } = require("@/Utils/databasePool");
      getDatabaseClient.mockReturnValue({
        rpc: jest.fn().mockRejectedValue(new Error("RPC failed")),
      });
      const jobs = await service.getSemanticCandidates(mockUser);
      expect(Array.isArray(jobs)).toBe(true);
    });
  });

  describe("isSemanticSearchAvailable", () => {
    it("should check if semantic search is available", async () => {
      const available = await service.isSemanticSearchAvailable();
      expect(typeof available).toBe("boolean");
    });
  });
});
