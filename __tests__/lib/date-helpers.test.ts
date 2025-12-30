import {
  getDateDaysAgo,
  getDateHoursAgo,
  getDateMinutesAgo,
  getEndOfToday,
  getStartOfToday,
  isWithinDays,
  toUTCString,
} from "@/lib/date-helpers";

describe("date-helpers", () => {
  const now = new Date("2024-01-15T12:00:00Z");
  const yesterday = new Date("2024-01-14T12:00:00Z");
  const tomorrow = new Date("2024-01-16T12:00:00Z");
  const lastWeek = new Date("2024-01-08T12:00:00Z");
  const nextWeek = new Date("2024-01-22T12:00:00Z");

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("getDateDaysAgo", () => {
    it("should get date N days ago", () => {
      const date = getDateDaysAgo(7);
      expect(date).toBeInstanceOf(Date);
      expect(date.getTime()).toBeLessThan(now.getTime());
    });

    it("should set to midnight UTC", () => {
      const date = getDateDaysAgo(1);
      expect(date.getUTCHours()).toBe(0);
      expect(date.getUTCMinutes()).toBe(0);
      expect(date.getUTCSeconds()).toBe(0);
    });
  });

  describe("getDateHoursAgo", () => {
    it("should get date N hours ago", () => {
      const date = getDateHoursAgo(2);
      expect(date).toBeInstanceOf(Date);
      expect(date.getTime()).toBeLessThan(now.getTime());
    });
  });

  describe("getDateMinutesAgo", () => {
    it("should get date N minutes ago", () => {
      const date = getDateMinutesAgo(30);
      expect(date).toBeInstanceOf(Date);
      expect(date.getTime()).toBeLessThan(now.getTime());
    });
  });

  describe("toUTCString", () => {
    it("should convert date to ISO string", () => {
      const str = toUTCString(now);
      expect(str).toBe(now.toISOString());
      expect(str).toContain("2024-01-15");
    });
  });

  describe("isWithinDays", () => {
    it("should check if date is within N days", () => {
      expect(isWithinDays(yesterday, 2)).toBe(true);
      expect(isWithinDays(lastWeek, 2)).toBe(false);
    });

    it("should handle string dates", () => {
      expect(isWithinDays(yesterday.toISOString(), 2)).toBe(true);
    });
  });

  describe("getStartOfToday", () => {
    it("should get start of today in UTC", () => {
      const start = getStartOfToday();
      expect(start.getUTCHours()).toBe(0);
      expect(start.getUTCMinutes()).toBe(0);
      expect(start.getUTCSeconds()).toBe(0);
    });
  });

  describe("getEndOfToday", () => {
    it("should get end of today in UTC", () => {
      const end = getEndOfToday();
      expect(end.getUTCHours()).toBe(23);
      expect(end.getUTCMinutes()).toBe(59);
      expect(end.getUTCSeconds()).toBe(59);
    });
  });
});
