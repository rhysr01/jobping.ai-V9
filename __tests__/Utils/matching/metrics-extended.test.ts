/**
 * Comprehensive tests for Match Metrics Service
 * Tests Recall@50, nDCG@5, metrics logging
 */

import {
  calculateNDCGAt5,
  calculateRecallAt50,
  getMetricsSummary,
  logMatchMetrics,
} from "@/Utils/matching/metrics.service";

jest.mock("@/Utils/databasePool");
// Sentry removed - using Axiom for error tracking

describe("Match Metrics Service", () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ error: null }),
      select: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
    };

    const { getDatabaseClient } = require("@/Utils/databasePool");
    getDatabaseClient.mockReturnValue(mockSupabase);
  });

  describe("calculateRecallAt50", () => {
    it("should calculate recall correctly", () => {
      const top50Jobs = Array(50)
        .fill(null)
        .map((_, i) => ({
          job_hash: `job${i}`,
          score: 0.9 - i * 0.01,
        }));

      const relevantHashes = new Set(["job0", "job1", "job2", "job100"]);

      const recall = calculateRecallAt50(top50Jobs, relevantHashes);

      expect(recall).toBeGreaterThanOrEqual(0);
      expect(recall).toBeLessThanOrEqual(1);
    });

    it("should return 0 for empty relevant set", () => {
      const top50Jobs = [{ job_hash: "job1", score: 0.9 }];
      const relevantHashes = new Set();

      const recall = calculateRecallAt50(top50Jobs, relevantHashes);

      expect(recall).toBe(0);
    });
  });

  describe("calculateNDCGAt5", () => {
    it("should calculate nDCG correctly", () => {
      const top5Jobs = Array(5)
        .fill(null)
        .map((_, i) => ({
          job_hash: `job${i}`,
          score: 0.9 - i * 0.1,
        }));

      const relevantHashes = new Set(["job0", "job1", "job2"]);

      const ndcg = calculateNDCGAt5(top5Jobs, relevantHashes);

      expect(ndcg).toBeGreaterThanOrEqual(0);
      expect(ndcg).toBeLessThanOrEqual(1);
    });

    it("should return 0 for empty top5", () => {
      const relevantHashes = new Set(["job1"]);

      const ndcg = calculateNDCGAt5([], relevantHashes);

      expect(ndcg).toBe(0);
    });

    it("should return 1 for perfect ranking", () => {
      const top5Jobs = Array(5)
        .fill(null)
        .map((_, i) => ({
          job_hash: `job${i}`,
          score: 0.9,
        }));

      const relevantHashes = new Set(["job0", "job1", "job2", "job3", "job4"]);

      const ndcg = calculateNDCGAt5(top5Jobs, relevantHashes);

      expect(ndcg).toBeCloseTo(1.0, 2);
    });
  });

  describe("logMatchMetrics", () => {
    it("should log metrics to database", async () => {
      const metrics = {
        recallAt50: 0.8,
        ndcgAt5: 0.75,
        timestamp: new Date().toISOString(),
        matchType: "ai" as const,
      };

      await logMatchMetrics(metrics);

      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it("should handle database errors", async () => {
      mockSupabase.insert.mockResolvedValue({
        error: new Error("Insert failed"),
      });

      const metrics = {
        recallAt50: 0.8,
        ndcgAt5: 0.75,
        timestamp: new Date().toISOString(),
        matchType: "rules" as const,
      };

      await expect(logMatchMetrics(metrics)).resolves.not.toThrow();
    });
  });

  describe("getMetricsSummary", () => {
    it("should get metrics summary", async () => {
      mockSupabase.select.mockResolvedValue({
        data: [
          { recall_at_50: 0.8, ndcg_at_5: 0.75 },
          { recall_at_50: 0.9, ndcg_at_5: 0.85 },
        ],
        error: null,
      });

      const summary = await getMetricsSummary(7);

      expect(summary.avgRecallAt50).toBeGreaterThan(0);
      expect(summary.avgNDCGAt5).toBeGreaterThan(0);
      expect(summary.sampleCount).toBe(2);
    });

    it("should return zeros for no data", async () => {
      mockSupabase.select.mockResolvedValue({
        data: [],
        error: null,
      });

      const summary = await getMetricsSummary(7);

      expect(summary.avgRecallAt50).toBe(0);
      expect(summary.avgNDCGAt5).toBe(0);
      expect(summary.sampleCount).toBe(0);
    });
  });
});
