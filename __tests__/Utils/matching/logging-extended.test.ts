/**
 * Comprehensive tests for Match Logging Service
 * Tests session logging, stats retrieval
 */

import {
  getMatchSessionStats,
  logMatchSession,
} from "@/Utils/matching/logging.service";

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));

describe("Match Logging Service", () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn(),
    };

    let selectResult = { data: [], error: null } as any;
    let insertResult = { error: null } as any;

    const createQuery = () => {
      const query: any = {
        insert: jest.fn(() => Promise.resolve(insertResult)),
        select: jest.fn(() => query),
        eq: jest.fn(() => query),
        gte: jest.fn(() => query),
        lte: jest.fn(() => query),
        then: (resolve: any) => Promise.resolve(resolve(selectResult)),
        catch: () => Promise.resolve(),
      };
      return query;
    };

    mockSupabase.from.mockImplementation((_table: string) => createQuery());

    const { createClient } = require("@supabase/supabase-js");
    createClient.mockReturnValue(mockSupabase);

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";

    // Helpers for tests to set results
    (mockSupabase as any).__setSelectResult = (result: any) => {
      selectResult = result;
    };
    (mockSupabase as any).__setInsertResult = (result: any) => {
      insertResult = result;
    };
  });

  describe("logMatchSession", () => {
    it("should log match session", async () => {
      await logMatchSession("user@example.com", "ai_success", 10, {
        processingTimeMs: 100,
        aiModel: "gpt-4",
        aiCostUsd: 0.05,
      });

      const queryInstance = mockSupabase.from.mock.results[0].value;
      expect(queryInstance.insert).toHaveBeenCalled();
    });

    it("should handle errors gracefully", async () => {
      (mockSupabase as any).__setInsertResult({
        error: new Error("Insert failed"),
      });

      await expect(
        logMatchSession("user@example.com", "ai_failed", 0),
      ).resolves.not.toThrow();
    });
  });

  describe("getMatchSessionStats", () => {
    it("should get stats for user", async () => {
      (mockSupabase as any).__setSelectResult({
        data: [
          { match_type: "ai_success", matches_count: 10, ai_cost_usd: 0.05 },
          { match_type: "ai_success", matches_count: 8, ai_cost_usd: 0.04 },
          { match_type: "fallback", matches_count: 5, ai_cost_usd: 0 },
        ],
        error: null,
      });

      const stats = await getMatchSessionStats("user@example.com");

      expect(stats.totalSessions).toBe(3);
      expect(stats.aiSuccessRate).toBeGreaterThan(0);
      expect(stats.averageMatches).toBeGreaterThan(0);
    });

    it("should filter by time range", async () => {
      const start = new Date("2024-01-01");
      const end = new Date("2024-01-31");

      (mockSupabase as any).__setSelectResult({
        data: [],
        error: null,
      });

      await getMatchSessionStats(undefined, { start, end });
      const queryInstance = mockSupabase.from.mock.results[0].value;
      expect(queryInstance.gte).toHaveBeenCalled();
      expect(queryInstance.lte).toHaveBeenCalled();
    });

    it("should handle errors", async () => {
      (mockSupabase as any).__setSelectResult({
        data: null,
        error: new Error("Query failed"),
      });

      const stats = await getMatchSessionStats();

      expect(stats.totalSessions).toBe(0);
      expect(stats.aiSuccessRate).toBe(0);
    });
  });
});
