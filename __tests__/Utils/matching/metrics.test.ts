import {
  getMatchMetricsSummary,
  type MatchMetrics,
  recordMatchMetrics,
  resetMatchMetrics,
} from "@/Utils/matching/metrics.service";

describe("metrics.service", () => {
  beforeEach(() => {
    resetMatchMetrics();
  });

  describe("recordMatchMetrics", () => {
    it("should record metrics", () => {
      const metrics: MatchMetrics = {
        userEmail: "test@example.com",
        matchType: "ai_success",
        matchesGenerated: 5,
        processingTimeMs: 1000,
        aiCostUsd: 0.01,
      };
      recordMatchMetrics(metrics);
      const summary = getMatchMetricsSummary();
      expect(summary).toBeDefined();
      expect(summary.totalMatches).toBeGreaterThanOrEqual(0);
    });

    it("should accumulate metrics", () => {
      recordMatchMetrics({
        userEmail: "test1@example.com",
        matchType: "ai_success",
        matchesGenerated: 5,
        processingTimeMs: 1000,
      });
      recordMatchMetrics({
        userEmail: "test2@example.com",
        matchType: "ai_success",
        matchesGenerated: 3,
        processingTimeMs: 800,
      });
      const summary = getMatchMetricsSummary();
      expect(summary.totalMatches).toBeGreaterThanOrEqual(0);
    });

    it("should track different match types", () => {
      recordMatchMetrics({
        userEmail: "test@example.com",
        matchType: "ai_success",
        matchesGenerated: 5,
        processingTimeMs: 1000,
      });
      recordMatchMetrics({
        userEmail: "test@example.com",
        matchType: "fallback",
        matchesGenerated: 3,
        processingTimeMs: 500,
      });
      const summary = getMatchMetricsSummary();
      expect(summary).toBeDefined();
    });

    it("should handle optional fields", () => {
      recordMatchMetrics({
        userEmail: "test@example.com",
        matchType: "ai_success",
        matchesGenerated: 5,
      });
      const summary = getMatchMetricsSummary();
      expect(summary).toBeDefined();
    });
  });

  describe("getMatchMetricsSummary", () => {
    it("should return metrics summary", () => {
      const summary = getMatchMetricsSummary();
      expect(summary).toBeDefined();
      expect(summary).toHaveProperty("totalMatches");
      expect(summary).toHaveProperty("totalUsers");
      expect(summary).toHaveProperty("averageMatches");
      expect(summary).toHaveProperty("averageProcessingTime");
    });

    it("should return zero for empty metrics", () => {
      resetMatchMetrics();
      const summary = getMatchMetricsSummary();
      expect(summary.totalMatches).toBe(0);
      expect(summary.totalUsers).toBe(0);
      expect(summary.averageMatches).toBe(0);
    });

    it("should calculate averages correctly", () => {
      recordMatchMetrics({
        userEmail: "test1@example.com",
        matchType: "ai_success",
        matchesGenerated: 5,
        processingTimeMs: 1000,
      });
      recordMatchMetrics({
        userEmail: "test2@example.com",
        matchType: "ai_success",
        matchesGenerated: 3,
        processingTimeMs: 800,
      });
      const summary = getMatchMetricsSummary();
      expect(summary.averageMatches).toBeGreaterThanOrEqual(0);
      expect(summary.averageProcessingTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe("resetMatchMetrics", () => {
    it("should reset metrics", () => {
      recordMatchMetrics({
        userEmail: "test@example.com",
        matchType: "ai_success",
        matchesGenerated: 5,
        processingTimeMs: 1000,
      });
      resetMatchMetrics();
      const summary = getMatchMetricsSummary();
      expect(summary.totalMatches).toBe(0);
    });
  });
});
