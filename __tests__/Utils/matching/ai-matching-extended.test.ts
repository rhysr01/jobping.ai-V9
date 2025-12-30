/**
 * Tests for AI Matching Service
 * Tests AI-powered job matching with caching
 */

import { buildMockJob, buildMockUser } from "@/__tests__/_helpers/testBuilders";
import {
  AIMatchingCache,
  AIMatchingService,
} from "@/Utils/matching/ai-matching.service";

jest.mock("openai");
jest.mock("@/Utils/matching/job-enrichment.service");

describe("AIMatchingService", () => {
  let service: AIMatchingService;
  let mockOpenAI: any;

  beforeEach(() => {
    jest.clearAllMocks();
    AIMatchingCache.clear();

    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    };

    const { OpenAI } = require("openai");
    OpenAI.mockImplementation(() => mockOpenAI);

    process.env.OPENAI_API_KEY = "test-key";
    service = new AIMatchingService("test-key");
  });

  describe("AIMatchingCache", () => {
    it("should cache matches", () => {
      const key = "test-key";
      const matches = [{ job: buildMockJob(), match_score: 85 }];

      AIMatchingCache.set(key, matches);
      const cached = AIMatchingCache.get(key);

      expect(cached).toEqual(matches);
    });

    it("should return undefined for cache miss", () => {
      const cached = AIMatchingCache.get("non-existent-key");
      expect(cached).toBeUndefined();
    });

    it("should clear cache", () => {
      AIMatchingCache.set("key1", []);
      AIMatchingCache.set("key2", []);

      AIMatchingCache.clear();

      expect(AIMatchingCache.get("key1")).toBeUndefined();
      expect(AIMatchingCache.get("key2")).toBeUndefined();
    });

    it("should evict expired entries", async () => {
      const key = "test-key";
      AIMatchingCache.set(key, []);

      // Wait for TTL to expire (30 minutes)
      jest.useFakeTimers();
      jest.advanceTimersByTime(31 * 60 * 1000);

      const cached = AIMatchingCache.get(key);
      expect(cached).toBeUndefined();

      jest.useRealTimers();
    });
  });

  describe("performAIMatching", () => {
    it("should perform AI matching successfully", async () => {
      const jobs = [buildMockJob()];
      const userPrefs = buildMockUser();

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                matches: [
                  { job_id: 1, match_score: 85, reasoning: "Great match" },
                ],
              }),
            },
          },
        ],
      });

      const {
        enrichJobData,
      } = require("@/Utils/matching/job-enrichment.service");
      enrichJobData.mockResolvedValue({ ...buildMockJob(), enriched: true });

      const result = await service.performAIMatching(jobs, userPrefs);

      expect(result.matches).toBeDefined();
      expect(result.method).toBe("ai_success");
    });

    it("should use cache when available", async () => {
      const jobs = [buildMockJob()];
      const userPrefs = buildMockUser();
      const cacheKey = "test-cache-key";
      const cachedMatches = [{ job: buildMockJob(), match_score: 90 }];

      AIMatchingCache.set(cacheKey, cachedMatches);

      // Mock cache key generation
      jest.spyOn(service as any, "generateCacheKey").mockReturnValue(cacheKey);

      const result = await service.performAIMatching(jobs, userPrefs);

      expect(mockOpenAI.chat.completions.create).not.toHaveBeenCalled();
    });

    it("should handle OpenAI timeout", async () => {
      const jobs = [buildMockJob()];
      const userPrefs = buildMockUser();

      mockOpenAI.chat.completions.create.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 25000)),
      );

      jest.useFakeTimers();
      const promise = service.performAIMatching(jobs, userPrefs);
      jest.advanceTimersByTime(21000);

      const result = await promise;
      expect(result.method).toBe("ai_timeout");
      jest.useRealTimers();
    });

    it("should handle OpenAI errors", async () => {
      const jobs = [buildMockJob()];
      const userPrefs = buildMockUser();

      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error("OpenAI error"),
      );

      const result = await service.performAIMatching(jobs, userPrefs);

      expect(result.method).toBe("ai_failed");
    });
  });
});
