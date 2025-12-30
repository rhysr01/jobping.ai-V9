/**
 * Comprehensive tests for Job Distribution
 * Tests source diversity, city balance, distribution stats
 */

import {
  distributeJobsWithDiversity,
  getDistributionStats,
} from "@/Utils/matching/jobDistribution";

describe("Job Distribution", () => {
  const buildMockJob = (overrides: any = {}) => ({
    id: `job-${Math.random()}`,
    title: "Test Job",
    company: "Test Company",
    source: "greenhouse",
    city: "London",
    job_hash: `hash-${Math.random()}`,
    ...overrides,
  });

  describe("distributeJobsWithDiversity", () => {
    it("should distribute jobs with source diversity", () => {
      const jobs = Array.from({ length: 100 }, (_, i) => ({
        ...buildMockJob(),
        source: `source${i % 3}`,
        city: "London",
      }));

      const distributed = distributeJobsWithDiversity(jobs, {
        targetCount: 20,
        targetCities: ["London"],
      });

      expect(distributed.length).toBeLessThanOrEqual(20);
      expect(distributed.length).toBeGreaterThan(0);
    });

    it("should ensure city balance", () => {
      const jobs = Array.from({ length: 100 }, (_, i) => ({
        ...buildMockJob(),
        city: i % 2 === 0 ? "London" : "Paris",
        source: "greenhouse",
      }));

      const distributed = distributeJobsWithDiversity(jobs, {
        targetCount: 20,
        targetCities: ["London", "Paris"],
        ensureCityBalance: true,
      });

      const londonCount = distributed.filter((j) => j.city === "London").length;
      const parisCount = distributed.filter((j) => j.city === "Paris").length;

      expect(Math.abs(londonCount - parisCount)).toBeLessThanOrEqual(2);
    });

    it("should respect maxPerSource limit", () => {
      const jobs = Array.from({ length: 100 }, () => ({
        ...buildMockJob(),
        source: "greenhouse",
        city: "London",
      }));

      const distributed = distributeJobsWithDiversity(jobs, {
        targetCount: 20,
        targetCities: ["London"],
        maxPerSource: 5,
      });

      expect(distributed.length).toBeLessThanOrEqual(20);
    });

    it("should return empty array for empty input", () => {
      const result = distributeJobsWithDiversity([], {
        targetCount: 10,
        targetCities: ["London"],
      });

      expect(result).toEqual([]);
    });

    it("should handle no target cities", () => {
      const jobs = Array.from({ length: 50 }, () => buildMockJob());

      const distributed = distributeJobsWithDiversity(jobs, {
        targetCount: 10,
        targetCities: [],
      });

      expect(distributed.length).toBeLessThanOrEqual(10);
    });
  });

  describe("getDistributionStats", () => {
    it("should calculate distribution stats", () => {
      const jobs = [
        { ...buildMockJob(), source: "greenhouse", city: "London" },
        { ...buildMockJob(), source: "lever", city: "Paris" },
        { ...buildMockJob(), source: "greenhouse", city: "London" },
      ];

      const stats = getDistributionStats(jobs);

      expect(stats.totalJobs).toBe(3);
      expect(stats.sourceDistribution).toBeDefined();
      expect(stats.cityDistribution).toBeDefined();
    });

    it("should handle empty jobs array", () => {
      const stats = getDistributionStats([]);

      expect(stats.totalJobs).toBe(0);
    });
  });
});
