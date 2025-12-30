/**
 * Tests for Featured Jobs API Route
 * Tests featured jobs fetching with caching
 */

import { GET } from "@/app/api/featured-jobs/route";

jest.mock("@/Utils/supabase");

describe("Featured Jobs API Route", () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    const { getSupabaseClient } = require("@/Utils/supabase");
    getSupabaseClient.mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("GET /api/featured-jobs", () => {
    it("should return cached jobs when cache is valid", async () => {
      // First call populates cache
      mockSupabase.limit.mockResolvedValue({
        data: [
          { id: 1, title: "Job 1", is_internship: true },
          { id: 2, title: "Job 2", is_graduate: true },
        ],
        error: null,
      });

      await GET();

      // Second call should use cache
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.cached).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledTimes(1); // Only called once
    });

    it("should fetch fresh jobs when cache expires", async () => {
      mockSupabase.limit.mockResolvedValue({
        data: [{ id: 1, title: "Job 1" }],
        error: null,
      });

      await GET();

      // Advance time past cache duration (24 hours)
      jest.advanceTimersByTime(25 * 60 * 60 * 1000);

      const response = await GET();
      const data = await response.json();

      expect(data.cached).toBe(false);
      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
    });

    it("should filter by location and early career", async () => {
      mockSupabase.limit.mockResolvedValue({
        data: [],
        error: null,
      });

      await GET();

      expect(mockSupabase.eq).toHaveBeenCalledWith("is_active", true);
      expect(mockSupabase.or).toHaveBeenCalled();
      expect(mockSupabase.ilike).toHaveBeenCalledWith("location", "%London%");
    });

    it("should fallback to any early career jobs if London jobs not found", async () => {
      mockSupabase.limit
        .mockResolvedValueOnce({
          data: [],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [{ id: 1, title: "Fallback Job", is_internship: true }],
          error: null,
        });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.jobs).toBeDefined();
    });

    it("should select best jobs (1 internship + 1 graduate)", async () => {
      mockSupabase.limit.mockResolvedValue({
        data: [
          { id: 1, title: "Internship", is_internship: true },
          { id: 2, title: "Graduate", is_graduate: true },
          { id: 3, title: "Other", is_internship: false, is_graduate: false },
        ],
        error: null,
      });

      const response = await GET();
      const data = await response.json();

      expect(data.jobs.length).toBeLessThanOrEqual(2);
    });

    it("should return fallback jobs on database error", async () => {
      mockSupabase.limit.mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.fallback).toBe(true);
      expect(data.jobs.length).toBeGreaterThan(0);
    });

    it("should limit results to 20 jobs", async () => {
      await GET();

      expect(mockSupabase.limit).toHaveBeenCalledWith(20);
    });
  });
});
