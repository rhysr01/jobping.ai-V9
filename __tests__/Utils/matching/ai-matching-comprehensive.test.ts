/**
 * Comprehensive tests for AI Matching Service
 * Tests all methods including cache, parsing, and error handling
 */

import { buildMockJob, buildMockUser } from "@/__tests__/_helpers/testBuilders";
import {
  AIMatchingCache,
  AIMatchingService,
} from "@/Utils/matching/ai-matching.service";

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
                  content: JSON.stringify([
                    {
                      job_index: 0,
                      match_score: 95,
                      match_reason: "Perfect fit for your skills",
                      confidence_score: 0.9,
                    },
                    {
                      job_index: 1,
                      match_score: 85,
                      match_reason: "Great opportunity",
                      confidence_score: 0.8,
                    },
                  ]),
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

// Mock Supabase
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue({
      data: [],
      error: null,
    }),
    single: jest.fn().mockResolvedValue({
      data: null,
      error: null,
    }),
  }),
}));

describe("AI Matching Service - Comprehensive", () => {
  let service: AIMatchingService;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-key";
    service = new AIMatchingService();
    AIMatchingCache.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    AIMatchingCache.clear();
  });

  describe("AIMatchingCache", () => {
    it("should get and set cache entries", () => {
      const key = "test-key";
      const value = [{ job_hash: "job1", match_score: 95 }];

      AIMatchingCache.set(key, value);
      const cached = AIMatchingCache.get(key);

      expect(cached).toEqual(value);
    });

    it("should return undefined for non-existent key", () => {
      const cached = AIMatchingCache.get("non-existent");

      expect(cached).toBeUndefined();
    });

    it("should clear cache", () => {
      AIMatchingCache.set("key1", []);
      AIMatchingCache.set("key2", []);

      AIMatchingCache.clear();

      expect(AIMatchingCache.get("key1")).toBeUndefined();
      expect(AIMatchingCache.get("key2")).toBeUndefined();
    });

    it("should return cache size", () => {
      AIMatchingCache.clear();
      AIMatchingCache.set("key1", []);
      AIMatchingCache.set("key2", []);

      const size = AIMatchingCache.size();

      expect(size).toBe(2);
    });

    it("should evict expired entries", async () => {
      const key = "test-key";
      const value = [{ job_hash: "job1" }];

      // Create cache with very short TTL
      const shortTTLCache = new (AIMatchingCache.constructor as any)(10, 1); // 1ms TTL
      shortTTLCache.set(key, value);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const cached = shortTTLCache.get(key);
      expect(cached).toBeUndefined();
    });
  });

  describe("performEnhancedAIMatching", () => {
    it("should return matches from cache if available", async () => {
      const jobs = [
        buildMockJob({ job_hash: "job1", categories: ["early-career"] }),
      ];
      const user = buildMockUser({ email: "test@example.com" });

      // Set cache first
      const cacheKey = `ai-match:test@example.com-:no-feedback:job1`;
      AIMatchingCache.set(cacheKey, [
        { job_hash: "job1", match_score: 95, match_reason: "Cached match" },
      ]);

      const matches = await service.performEnhancedAIMatching(
        jobs,
        user as any,
      );

      expect(matches.length).toBeGreaterThan(0);
    });

    it("should call OpenAI when cache miss", async () => {
      const jobs = [
        buildMockJob({ job_hash: "job1", categories: ["early-career"] }),
      ];
      const user = buildMockUser({ email: "test@example.com" });

      const matches = await service.performEnhancedAIMatching(
        jobs,
        user as any,
      );

      expect(matches).toBeDefined();
      expect(Array.isArray(matches)).toBe(true);
    });

    it("should handle empty jobs array", async () => {
      const user = buildMockUser();

      const matches = await service.performEnhancedAIMatching([], user as any);

      expect(Array.isArray(matches)).toBe(true);
    });

    it("should handle OpenAI errors gracefully", async () => {
      const OpenAI = require("openai").default;
      const mockInstance = new OpenAI();
      mockInstance.chat.completions.create.mockRejectedValueOnce(
        new Error("API Error"),
      );

      const jobs = [buildMockJob()];
      const user = buildMockUser();

      await expect(
        service.performEnhancedAIMatching(jobs, user as any),
      ).rejects.toThrow();
    });

    it("should handle timeout errors", async () => {
      const OpenAI = require("openai").default;
      const mockInstance = new OpenAI();
      mockInstance.chat.completions.create.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 25000)),
      );

      const jobs = [buildMockJob()];
      const user = buildMockUser();

      await expect(
        service.performEnhancedAIMatching(jobs, user as any),
      ).rejects.toThrow();
    });
  });

  describe("parseAndValidateMatches", () => {
    it("should parse valid JSON response", () => {
      const response = JSON.stringify([
        {
          job_index: 0,
          match_score: 95,
          match_reason: "Great match",
          confidence_score: 0.9,
        },
      ]);
      const jobs = [buildMockJob({ job_hash: "job1" })];

      const matches = service.parseAndValidateMatches(response, jobs);

      expect(matches.length).toBe(1);
      expect(matches[0].job_hash).toBe("job1");
      expect(matches[0].match_score).toBe(95);
    });

    it("should handle JSON wrapped in markdown code blocks", () => {
      const response =
        "```json\n" +
        JSON.stringify([
          {
            job_index: 0,
            match_score: 95,
            match_reason: "Great match",
          },
        ]) +
        "\n```";
      const jobs = [buildMockJob({ job_hash: "job1" })];

      const matches = service.parseAndValidateMatches(response, jobs);

      expect(matches.length).toBe(1);
    });

    it("should filter invalid matches", () => {
      const response = JSON.stringify([
        {
          job_index: 0,
          match_score: 95,
          match_reason: "Valid match",
        },
        {
          job_index: 999, // Invalid index
          match_score: 85,
          match_reason: "Invalid match",
        },
        {
          job_index: 1,
          match_score: 150, // Invalid score
          match_reason: "Invalid score",
        },
      ]);
      const jobs = [
        buildMockJob({ job_hash: "job1" }),
        buildMockJob({ job_hash: "job2" }),
      ];

      const matches = service.parseAndValidateMatches(response, jobs);

      expect(matches.length).toBe(1);
      expect(matches[0].job_index).toBe(0);
    });

    it("should handle missing match_reason", () => {
      const response = JSON.stringify([
        {
          job_index: 0,
          match_score: 95,
        },
      ]);
      const jobs = [buildMockJob({ job_hash: "job1" })];

      const matches = service.parseAndValidateMatches(response, jobs);

      expect(matches[0].match_reason).toBe("AI match");
    });

    it("should handle missing confidence_score", () => {
      const response = JSON.stringify([
        {
          job_index: 0,
          match_score: 95,
          match_reason: "Great match",
        },
      ]);
      const jobs = [buildMockJob({ job_hash: "job1" })];

      const matches = service.parseAndValidateMatches(response, jobs);

      expect(matches[0].confidence_score).toBe(0.8);
    });

    it("should throw error for invalid JSON", () => {
      const response = "invalid json";
      const jobs = [buildMockJob()];

      expect(() => {
        service.parseAndValidateMatches(response, jobs);
      }).toThrow();
    });

    it("should throw error for non-array response", () => {
      const response = JSON.stringify({ matches: [] });
      const jobs = [buildMockJob()];

      expect(() => {
        service.parseAndValidateMatches(response, jobs);
      }).toThrow();
    });
  });

  describe("convertToRobustMatches", () => {
    it("should convert AI matches to robust format", () => {
      const aiMatches = [
        {
          job_index: 0,
          match_score: 95,
          match_reason: "Great match",
          confidence_score: 0.9,
        },
      ];
      const jobs = [buildMockJob({ job_hash: "job1" })];
      const user = buildMockUser();

      const robustMatches = service.convertToRobustMatches(
        aiMatches,
        user as any,
        jobs,
      );

      expect(robustMatches.length).toBe(1);
      expect(robustMatches[0].job).toBeDefined();
      expect(robustMatches[0].match_score).toBe(95);
    });

    it("should filter out invalid job indices", () => {
      const aiMatches = [
        {
          job_index: 0,
          match_score: 95,
          match_reason: "Valid",
        },
        {
          job_index: 999,
          match_score: 85,
          match_reason: "Invalid",
        },
      ];
      const jobs = [buildMockJob()];
      const user = buildMockUser();

      const robustMatches = service.convertToRobustMatches(
        aiMatches,
        user as any,
        jobs,
      );

      expect(robustMatches.length).toBe(1);
    });

    it("should sort matches by score descending", () => {
      const aiMatches = [
        {
          job_index: 0,
          match_score: 75,
          match_reason: "Lower score",
        },
        {
          job_index: 1,
          match_score: 95,
          match_reason: "Higher score",
        },
      ];
      const jobs = [
        buildMockJob({ job_hash: "job1" }),
        buildMockJob({ job_hash: "job2" }),
      ];
      const user = buildMockUser();

      const robustMatches = service.convertToRobustMatches(
        aiMatches,
        user as any,
        jobs,
      );

      expect(robustMatches[0].match_score).toBeGreaterThanOrEqual(
        robustMatches[1].match_score,
      );
    });
  });

  describe("testConnection", () => {
    it("should return true for successful connection", async () => {
      const OpenAI = require("openai").default;
      const mockInstance = new OpenAI();
      mockInstance.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: "test" } }],
      });

      const result = await service.testConnection();

      expect(result).toBe(true);
    });

    it("should return false for failed connection", async () => {
      const OpenAI = require("openai").default;
      const mockInstance = new OpenAI();
      mockInstance.chat.completions.create.mockRejectedValue(
        new Error("Connection failed"),
      );

      const result = await service.testConnection();

      expect(result).toBe(false);
    });
  });

  describe("getStats", () => {
    it("should return service statistics", () => {
      const stats = service.getStats();

      expect(stats).toBeDefined();
      expect(stats.model).toBe("gpt-4o-mini");
      expect(stats.maxTokens).toBeDefined();
      expect(stats.temperature).toBeDefined();
      expect(stats.timeout).toBeDefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle jobs with missing fields", async () => {
      const jobs = [{ job_hash: "job1", title: "Engineer" } as any];
      const user = buildMockUser();

      const matches = await service.performEnhancedAIMatching(
        jobs,
        user as any,
      );

      expect(Array.isArray(matches)).toBe(true);
    });

    it("should handle user with minimal preferences", async () => {
      const jobs = [buildMockJob()];
      const user = { email: "test@example.com" } as any;

      const matches = await service.performEnhancedAIMatching(jobs, user);

      expect(Array.isArray(matches)).toBe(true);
    });

    it("should handle very long job descriptions", async () => {
      const longDescription = "A".repeat(10000);
      const jobs = [
        buildMockJob({
          description: longDescription,
          categories: ["early-career"],
        }),
      ];
      const user = buildMockUser();

      const matches = await service.performEnhancedAIMatching(
        jobs,
        user as any,
      );

      expect(Array.isArray(matches)).toBe(true);
    });
  });
});
