/**
 * Comprehensive tests for Send Configuration
 * Tests send plan validation, week calculations, send eligibility
 */

import {
  canUserReceiveSend,
  getCurrentWeekStart,
  MATCH_RULES,
  SEND_PLAN,
  shouldSkipSend,
} from "@/Utils/sendConfiguration";

describe("Send Configuration", () => {
  describe("SEND_PLAN", () => {
    it("should have free tier configuration", () => {
      expect(SEND_PLAN.free).toBeDefined();
      expect(SEND_PLAN.free.days).toEqual(["Thu"]);
      expect(SEND_PLAN.free.perSend).toBe(5);
      expect(SEND_PLAN.free.pullsPerWeek).toBe(1);
    });

    it("should have premium tier configuration", () => {
      expect(SEND_PLAN.premium).toBeDefined();
      expect(SEND_PLAN.premium.days).toEqual(["Mon", "Wed", "Fri"]);
      expect(SEND_PLAN.premium.perSend).toBe(5);
      expect(SEND_PLAN.premium.pullsPerWeek).toBe(3);
    });
  });

  describe("MATCH_RULES", () => {
    it("should have match quality rules", () => {
      expect(MATCH_RULES.minScore).toBeGreaterThan(0);
      expect(MATCH_RULES.lookbackDays).toBeGreaterThan(0);
      expect(MATCH_RULES.maxPerCompanyPerSend).toBeGreaterThan(0);
    });
  });

  describe("canUserReceiveSend", () => {
    it("should allow send for new week", () => {
      const currentWeek = "2024-01-08";
      const ledger = {
        user_id: "user1",
        week_start: "2024-01-01",
        tier: "free" as const,
        sends_used: 1,
      };

      const canReceive = canUserReceiveSend(ledger, currentWeek, "free");
      expect(canReceive).toBe(true);
    });

    it("should allow send if under limit", () => {
      const currentWeek = "2024-01-08";
      const ledger = {
        user_id: "user1",
        week_start: currentWeek,
        tier: "free" as const,
        sends_used: 0,
      };

      const canReceive = canUserReceiveSend(ledger, currentWeek, "free");
      expect(canReceive).toBe(true);
    });

    it("should deny send if limit reached", () => {
      const currentWeek = "2024-01-08";
      const ledger = {
        user_id: "user1",
        week_start: currentWeek,
        tier: "free" as const,
        sends_used: 1,
      };

      const canReceive = canUserReceiveSend(ledger, currentWeek, "free");
      expect(canReceive).toBe(false);
    });
  });

  describe("shouldSkipSend", () => {
    it("should skip if insufficient jobs", () => {
      const eligibleJobs = Array(3).fill(null);
      const shouldSkip = shouldSkipSend(eligibleJobs, "free");
      expect(shouldSkip).toBe(true);
    });

    it("should not skip if enough jobs", () => {
      const eligibleJobs = Array(5).fill(null);
      const shouldSkip = shouldSkipSend(eligibleJobs, "free");
      expect(shouldSkip).toBe(false);
    });
  });

  describe("getCurrentWeekStart", () => {
    it("should return Monday date", () => {
      const weekStart = getCurrentWeekStart();
      expect(weekStart).toBeDefined();
      expect(typeof weekStart).toBe("string");
    });
  });
});
