/**
 * Tests for Integrated Matching Service
 * Tests batch optimization and semantic retrieval integration
 */

import { buildMockJob, buildMockUser } from "@/__tests__/_helpers/testBuilders";
import { batchMatchingProcessor } from "@/Utils/matching/batch-processor.service";
import {
  IntegratedMatchingService,
  integratedMatchingService,
} from "@/Utils/matching/integrated-matching.service";
import { semanticRetrievalService } from "@/Utils/matching/semanticRetrieval";

// Mock dependencies
jest.mock("@/Utils/matching/batch-processor.service");
jest.mock("@/Utils/matching/semanticRetrieval");
jest.mock("@/Utils/consolidatedMatchingV2");

describe("IntegratedMatchingService", () => {
  let service: IntegratedMatchingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new IntegratedMatchingService();
  });

  describe("processUsersWithBatchOptimization", () => {
    it("should use batch processing for large user groups", async () => {
      const users = Array.from({ length: 10 }, (_, i) => ({
        email: `user${i}@example.com`,
        preferences: buildMockUser({ email: `user${i}@example.com` }),
      }));
      const jobs = [buildMockJob(), buildMockJob()];

      const mockBatchResults = new Map();
      mockBatchResults.set("user0@example.com", {
        matches: [],
        method: "ai_success",
        processingTime: 100,
      });

      (batchMatchingProcessor.processBatch as jest.Mock).mockResolvedValue(
        mockBatchResults,
      );

      const results = await service.processUsersWithBatchOptimization(
        users,
        jobs,
        {
          enabled: true,
          minUsersForBatch: 5,
        },
      );

      expect(batchMatchingProcessor.processBatch).toHaveBeenCalled();
      expect(results.size).toBeGreaterThan(0);
    });

    it("should use individual processing for small user groups", async () => {
      const users = [
        { email: "user1@example.com", preferences: buildMockUser() },
        { email: "user2@example.com", preferences: buildMockUser() },
      ];
      const jobs = [buildMockJob()];

      const {
        createConsolidatedMatcher,
      } = require("@/Utils/consolidatedMatchingV2");
      const mockMatcher = {
        performMatching: jest.fn().mockResolvedValue({
          matches: [],
          method: "ai_success",
          confidence: 0.8,
        }),
      };
      createConsolidatedMatcher.mockReturnValue(mockMatcher);

      const results = await service.processUsersWithBatchOptimization(
        users,
        jobs,
        {
          enabled: true,
          minUsersForBatch: 5,
        },
      );

      expect(batchMatchingProcessor.processBatch).not.toHaveBeenCalled();
      expect(mockMatcher.performMatching).toHaveBeenCalledTimes(2);
      expect(results.size).toBe(2);
    });

    it("should respect batch processing disabled flag", async () => {
      const users = Array.from({ length: 10 }, (_, i) => ({
        email: `user${i}@example.com`,
        preferences: buildMockUser(),
      }));
      const jobs = [buildMockJob()];

      const {
        createConsolidatedMatcher,
      } = require("@/Utils/consolidatedMatchingV2");
      const mockMatcher = {
        performMatching: jest.fn().mockResolvedValue({
          matches: [],
          method: "ai_success",
          confidence: 0.8,
        }),
      };
      createConsolidatedMatcher.mockReturnValue(mockMatcher);

      const results = await service.processUsersWithBatchOptimization(
        users,
        jobs,
        {
          enabled: false,
        },
      );

      expect(batchMatchingProcessor.processBatch).not.toHaveBeenCalled();
      expect(mockMatcher.performMatching).toHaveBeenCalledTimes(10);
    });

    it("should use default options when not provided", async () => {
      const users = Array.from({ length: 10 }, (_, i) => ({
        email: `user${i}@example.com`,
        preferences: buildMockUser(),
      }));
      const jobs = [buildMockJob()];

      const mockBatchResults = new Map();
      (batchMatchingProcessor.processBatch as jest.Mock).mockResolvedValue(
        mockBatchResults,
      );

      await service.processUsersWithBatchOptimization(users, jobs);

      expect(batchMatchingProcessor.processBatch).toHaveBeenCalledWith(
        users,
        jobs,
        expect.objectContaining({
          useEmbeddings: true,
          maxBatchSize: 10,
        }),
      );
    });

    it("should handle batch processing errors gracefully", async () => {
      const users = Array.from({ length: 10 }, (_, i) => ({
        email: `user${i}@example.com`,
        preferences: buildMockUser(),
      }));
      const jobs = [buildMockJob()];

      (batchMatchingProcessor.processBatch as jest.Mock).mockRejectedValue(
        new Error("Batch processing failed"),
      );

      await expect(
        service.processUsersWithBatchOptimization(users, jobs),
      ).rejects.toThrow("Batch processing failed");
    });
  });

  describe("getSemanticJobs", () => {
    it("should return semantic jobs when available", async () => {
      const userPrefs = buildMockUser();
      const mockJobs = [
        { ...buildMockJob(), semantic_score: 0.85 },
        { ...buildMockJob(), semantic_score: 0.75 },
      ];

      (
        semanticRetrievalService.isSemanticSearchAvailable as jest.Mock
      ).mockResolvedValue(true);
      (
        semanticRetrievalService.getSemanticCandidates as jest.Mock
      ).mockResolvedValue(mockJobs);

      const result = await service.getSemanticJobs(userPrefs, 200);

      expect(result).toEqual(mockJobs);
      expect(
        semanticRetrievalService.getSemanticCandidates,
      ).toHaveBeenCalledWith(userPrefs, 200);
    });

    it("should return empty array when semantic search unavailable", async () => {
      const userPrefs = buildMockUser();

      (
        semanticRetrievalService.isSemanticSearchAvailable as jest.Mock
      ).mockResolvedValue(false);

      const result = await service.getSemanticJobs(userPrefs);

      expect(result).toEqual([]);
      expect(
        semanticRetrievalService.getSemanticCandidates,
      ).not.toHaveBeenCalled();
    });

    it("should use default limit when not provided", async () => {
      const userPrefs = buildMockUser();
      const mockJobs = [buildMockJob()];

      (
        semanticRetrievalService.isSemanticSearchAvailable as jest.Mock
      ).mockResolvedValue(true);
      (
        semanticRetrievalService.getSemanticCandidates as jest.Mock
      ).mockResolvedValue(mockJobs);

      await service.getSemanticJobs(userPrefs);

      expect(
        semanticRetrievalService.getSemanticCandidates,
      ).toHaveBeenCalledWith(userPrefs, 200);
    });

    it("should handle semantic search errors gracefully", async () => {
      const userPrefs = buildMockUser();

      (
        semanticRetrievalService.isSemanticSearchAvailable as jest.Mock
      ).mockResolvedValue(true);
      (
        semanticRetrievalService.getSemanticCandidates as jest.Mock
      ).mockRejectedValue(new Error("Semantic search failed"));

      await expect(service.getSemanticJobs(userPrefs)).rejects.toThrow(
        "Semantic search failed",
      );
    });
  });

  describe("singleton instance", () => {
    it("should export singleton instance", () => {
      expect(integratedMatchingService).toBeInstanceOf(
        IntegratedMatchingService,
      );
    });
  });
});
