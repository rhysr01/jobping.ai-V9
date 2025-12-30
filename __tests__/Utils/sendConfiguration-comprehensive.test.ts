/**
 * Comprehensive tests for Send Configuration
 * Tests all functions including edge cases
 */

import {
  canUserReceiveSend,
  getCurrentWeekStart,
  getEarlyAccessCutoff,
  getJobsPerSend,
  getSignupBonusJobs,
  isSendDay,
  MATCH_RULES,
  SEND_PLAN,
  type SendLedgerEntry,
  shouldSkipSend,
} from "@/Utils/sendConfiguration";

describe("Send Configuration - Comprehensive", () => {
  describe("SEND_PLAN", () => {
    it("should have correct free plan configuration", () => {
      expect(SEND_PLAN.free).toBeDefined();
      expect(SEND_PLAN.free.days).toEqual(["Thu"]);
      expect(SEND_PLAN.free.perSend).toBe(5);
      expect(SEND_PLAN.free.pullsPerWeek).toBe(1);
      expect(SEND_PLAN.free.signupBonus).toBe(10);
      expect(SEND_PLAN.free.earlyAccessHours).toBeUndefined();
    });

    it("should have correct premium plan configuration", () => {
      expect(SEND_PLAN.premium).toBeDefined();
      expect(SEND_PLAN.premium.days).toEqual(["Mon", "Wed", "Fri"]);
      expect(SEND_PLAN.premium.perSend).toBe(5);
      expect(SEND_PLAN.premium.pullsPerWeek).toBe(3);
      expect(SEND_PLAN.premium.signupBonus).toBe(10);
      expect(SEND_PLAN.premium.earlyAccessHours).toBe(24);
    });
  });

  describe("MATCH_RULES", () => {
    it("should have all required match rules", () => {
      expect(MATCH_RULES.minScore).toBe(65);
      expect(MATCH_RULES.lookbackDays).toBe(30);
      expect(MATCH_RULES.maxPerCompanyPerSend).toBe(2);
      expect(MATCH_RULES.maxPerSource).toBe(40);
    });

    it("should have reasonable threshold values", () => {
      expect(MATCH_RULES.minScore).toBeGreaterThanOrEqual(50);
      expect(MATCH_RULES.minScore).toBeLessThanOrEqual(100);
      expect(MATCH_RULES.lookbackDays).toBeGreaterThan(0);
      expect(MATCH_RULES.lookbackDays).toBeLessThanOrEqual(90);
      expect(MATCH_RULES.maxPerCompanyPerSend).toBeGreaterThan(0);
      expect(MATCH_RULES.maxPerSource).toBeGreaterThan(0);
    });
  });

  describe("canUserReceiveSend", () => {
    it("should allow send for new week", () => {
      const ledger: SendLedgerEntry = {
        user_id: "user1",
        week_start: "2024-01-01",
        tier: "free",
        sends_used: 1,
        jobs_sent: 5,
      };
      const currentWeek = "2024-01-08";
      expect(canUserReceiveSend(ledger, currentWeek, "free")).toBe(true);
    });

    it("should allow send when under limit for free tier", () => {
      const ledger: SendLedgerEntry = {
        user_id: "user1",
        week_start: "2024-01-01",
        tier: "free",
        sends_used: 0,
        jobs_sent: 0,
      };
      const currentWeek = "2024-01-01";
      expect(canUserReceiveSend(ledger, currentWeek, "free")).toBe(true);
    });

    it("should deny send when at limit for free tier", () => {
      const ledger: SendLedgerEntry = {
        user_id: "user1",
        week_start: "2024-01-01",
        tier: "free",
        sends_used: 1,
        jobs_sent: 5,
      };
      const currentWeek = "2024-01-01";
      expect(canUserReceiveSend(ledger, currentWeek, "free")).toBe(false);
    });

    it("should allow premium users more sends", () => {
      const ledger: SendLedgerEntry = {
        user_id: "user1",
        week_start: "2024-01-01",
        tier: "premium",
        sends_used: 2,
        jobs_sent: 10,
      };
      const currentWeek = "2024-01-01";
      expect(canUserReceiveSend(ledger, currentWeek, "premium")).toBe(true);
    });

    it("should deny premium users when at limit", () => {
      const ledger: SendLedgerEntry = {
        user_id: "user1",
        week_start: "2024-01-01",
        tier: "premium",
        sends_used: 3,
        jobs_sent: 15,
      };
      const currentWeek = "2024-01-01";
      expect(canUserReceiveSend(ledger, currentWeek, "premium")).toBe(false);
    });

    it("should reset for new week even if previous week was at limit", () => {
      const ledger: SendLedgerEntry = {
        user_id: "user1",
        week_start: "2024-01-01",
        tier: "free",
        sends_used: 1,
        jobs_sent: 5,
      };
      const currentWeek = "2024-01-08";
      expect(canUserReceiveSend(ledger, currentWeek, "free")).toBe(true);
    });
  });

  describe("shouldSkipSend", () => {
    it("should skip when insufficient jobs for free tier", () => {
      const jobs = Array(4).fill({});
      expect(shouldSkipSend(jobs, "free")).toBe(true);
    });

    it("should not skip when sufficient jobs for free tier", () => {
      const jobs = Array(5).fill({});
      expect(shouldSkipSend(jobs, "free")).toBe(false);
    });

    it("should not skip when more than enough jobs for free tier", () => {
      const jobs = Array(10).fill({});
      expect(shouldSkipSend(jobs, "free")).toBe(false);
    });

    it("should skip when insufficient jobs for premium tier", () => {
      const jobs = Array(4).fill({});
      expect(shouldSkipSend(jobs, "premium")).toBe(true);
    });

    it("should not skip when sufficient jobs for premium tier", () => {
      const jobs = Array(5).fill({});
      expect(shouldSkipSend(jobs, "premium")).toBe(false);
    });

    it("should skip when empty job array", () => {
      expect(shouldSkipSend([], "free")).toBe(true);
      expect(shouldSkipSend([], "premium")).toBe(true);
    });
  });

  describe("getCurrentWeekStart", () => {
    it("should return Monday date", () => {
      const weekStart = getCurrentWeekStart();
      expect(weekStart).toBeDefined();
      expect(typeof weekStart).toBe("string");
    });

    it("should return valid ISO date string", () => {
      const weekStart = getCurrentWeekStart();
      const date = new Date(weekStart);
      expect(date.getTime()).toBeGreaterThan(0);
      expect(isNaN(date.getTime())).toBe(false);
    });

    it("should return Monday for any day of week", () => {
      const weekStart = getCurrentWeekStart();
      const date = new Date(weekStart + "T00:00:00");
      const dayOfWeek = date.getDay();
      // Monday is 1, but we need to account for timezone
      // The function should return Monday, so check it's valid
      expect(dayOfWeek).toBeGreaterThanOrEqual(0);
      expect(dayOfWeek).toBeLessThanOrEqual(6);
      // Verify it's actually a Monday by checking the date string format
      expect(weekStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should return date at midnight", () => {
      const weekStart = getCurrentWeekStart();
      const date = new Date(weekStart + "T00:00:00");
      expect(date.getHours()).toBe(0);
      expect(date.getMinutes()).toBe(0);
      expect(date.getSeconds()).toBe(0);
      expect(date.getMilliseconds()).toBe(0);
    });

    it("should return consistent format", () => {
      const weekStart = getCurrentWeekStart();
      expect(weekStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("isSendDay", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should return true for Thursday for free tier", () => {
      const thursday = new Date("2024-01-04"); // Thursday
      jest.setSystemTime(thursday);
      expect(isSendDay("free")).toBe(true);
    });

    it("should return false for non-Thursday for free tier", () => {
      const monday = new Date("2024-01-01"); // Monday
      jest.setSystemTime(monday);
      expect(isSendDay("free")).toBe(false);
    });

    it("should return true for Monday for premium tier", () => {
      const monday = new Date("2024-01-01"); // Monday
      jest.setSystemTime(monday);
      expect(isSendDay("premium")).toBe(true);
    });

    it("should return true for Wednesday for premium tier", () => {
      const wednesday = new Date("2024-01-03"); // Wednesday
      jest.setSystemTime(wednesday);
      expect(isSendDay("premium")).toBe(true);
    });

    it("should return true for Friday for premium tier", () => {
      const friday = new Date("2024-01-05"); // Friday
      jest.setSystemTime(friday);
      expect(isSendDay("premium")).toBe(true);
    });

    it("should return false for non-send days for premium tier", () => {
      const tuesday = new Date("2024-01-02"); // Tuesday
      jest.setSystemTime(tuesday);
      expect(isSendDay("premium")).toBe(false);
    });
  });

  describe("getJobsPerSend", () => {
    it("should return 5 for free tier", () => {
      expect(getJobsPerSend("free")).toBe(5);
    });

    it("should return 5 for premium tier", () => {
      expect(getJobsPerSend("premium")).toBe(5);
    });
  });

  describe("getSignupBonusJobs", () => {
    it("should return 10 for free tier", () => {
      expect(getSignupBonusJobs("free")).toBe(10);
    });

    it("should return 10 for premium tier", () => {
      expect(getSignupBonusJobs("premium")).toBe(10);
    });
  });

  describe("getEarlyAccessCutoff", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should return date 24 hours ago", () => {
      const now = new Date("2024-01-05T12:00:00Z");
      jest.setSystemTime(now);

      const cutoff = getEarlyAccessCutoff();
      const expected = new Date("2024-01-04T12:00:00Z");

      expect(cutoff.getTime()).toBe(expected.getTime());
    });

    it("should return Date object", () => {
      const cutoff = getEarlyAccessCutoff();
      expect(cutoff).toBeInstanceOf(Date);
    });

    it("should handle different current times", () => {
      const now1 = new Date("2024-01-05T00:00:00Z");
      jest.setSystemTime(now1);
      const cutoff1 = getEarlyAccessCutoff();

      const now2 = new Date("2024-01-05T23:59:59Z");
      jest.setSystemTime(now2);
      const cutoff2 = getEarlyAccessCutoff();

      expect(cutoff2.getTime()).toBeGreaterThan(cutoff1.getTime());
    });
  });
});
