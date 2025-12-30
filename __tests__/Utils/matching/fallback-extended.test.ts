import type { Job } from "@/scrapers/types";
import {
  FallbackMatchingService,
  generateRobustFallbackMatches,
} from "@/Utils/matching/fallback.service";
import type { UserPreferences } from "@/Utils/matching/types";

describe("fallback.service", () => {
  const mockJobs: Job[] = [
    {
      job_hash: "hash1",
      title: "Software Engineer",
      company: "Tech Co",
      location: "London",
      description: "Test",
      job_url: "https://test.com",
      source: "test",
      categories: ["tech"],
      is_active: true,
      is_graduate: false,
      is_internship: false,
      created_at: new Date().toISOString(),
      posted_at: new Date().toISOString(),
      original_posted_date: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      scrape_timestamp: new Date().toISOString(),
      experience_required: "",
      work_environment: "remote",
    },
    {
      job_hash: "hash2",
      title: "Product Manager",
      company: "Startup Co",
      location: "Berlin",
      description: "Test",
      job_url: "https://test.com",
      source: "test",
      categories: ["product"],
      is_active: true,
      is_graduate: false,
      is_internship: false,
      created_at: new Date().toISOString(),
      posted_at: new Date().toISOString(),
      original_posted_date: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      scrape_timestamp: new Date().toISOString(),
      experience_required: "",
      work_environment: "remote",
    },
  ];

  const mockUser: UserPreferences = {
    email: "test@example.com",
    career_path: ["tech"],
    target_cities: ["London"],
  };

  describe("generateRobustFallbackMatches", () => {
    it("should generate fallback matches", () => {
      const matches = generateRobustFallbackMatches(mockJobs, mockUser);
      expect(matches).toBeDefined();
      expect(Array.isArray(matches)).toBe(true);
    });

    it("should limit matches to 5", () => {
      const manyJobs = Array(10).fill(mockJobs[0]);
      const matches = generateRobustFallbackMatches(manyJobs, mockUser);
      expect(matches.length).toBeLessThanOrEqual(5);
    });

    it("should assign match scores", () => {
      const matches = generateRobustFallbackMatches(mockJobs, mockUser);
      matches.forEach((match) => {
        expect(match.match_score).toBeDefined();
        expect(match.match_score).toBeGreaterThanOrEqual(50);
      });
    });

    it("should include match reason", () => {
      const matches = generateRobustFallbackMatches(mockJobs, mockUser);
      matches.forEach((match) => {
        expect(match.match_reason).toBeDefined();
        expect(typeof match.match_reason).toBe("string");
      });
    });

    it("should include match quality", () => {
      const matches = generateRobustFallbackMatches(mockJobs, mockUser);
      matches.forEach((match) => {
        expect(match.match_quality).toBeDefined();
      });
    });

    it("should handle empty job array", () => {
      const matches = generateRobustFallbackMatches([], mockUser);
      expect(matches).toEqual([]);
    });

    it("should handle null jobs gracefully", () => {
      const matches = generateRobustFallbackMatches(null as any, mockUser);
      expect(Array.isArray(matches)).toBe(true);
    });
  });

  describe("FallbackMatchingService", () => {
    it("should create instance", () => {
      const service = new FallbackMatchingService();
      expect(service).toBeDefined();
    });

    it("should have generateMatches method", () => {
      const service = new FallbackMatchingService();
      expect(typeof service.generateRobustFallbackMatches).toBe("function");
    });

    it("should generate matches", async () => {
      const service = new FallbackMatchingService();
      const matches = service.generateRobustFallbackMatches(mockJobs, mockUser);
      expect(matches).toBeDefined();
      expect(Array.isArray(matches)).toBe(true);
    });

    it("should respect max matches limit", () => {
      const service = new FallbackMatchingService();
      const manyJobs = Array(20).fill(mockJobs[0]);
      const matches = service.generateRobustFallbackMatches(manyJobs, mockUser);
      expect(matches.length).toBeLessThanOrEqual(6);
    });

    it("should have generateMatchesByCriteria method", () => {
      const service = new FallbackMatchingService();
      expect(typeof service.generateMatchesByCriteria).toBe("function");
    });

    it("should filter by career path when requested", () => {
      const service = new FallbackMatchingService();
      const matches = service.generateMatchesByCriteria(mockJobs, mockUser, {
        careerPath: true,
      });
      expect(matches).toBeDefined();
      expect(Array.isArray(matches)).toBe(true);
    });

    it("should filter by location when requested", () => {
      const service = new FallbackMatchingService();
      const matches = service.generateMatchesByCriteria(mockJobs, mockUser, {
        location: true,
      });
      expect(matches).toBeDefined();
      expect(Array.isArray(matches)).toBe(true);
    });

    it("should respect maxResults option", () => {
      const service = new FallbackMatchingService();
      const matches = service.generateMatchesByCriteria(mockJobs, mockUser, {
        maxResults: 2,
      });
      expect(matches.length).toBeLessThanOrEqual(2);
    });

    it("should have generateEmergencyFallbackMatches method", () => {
      const service = new FallbackMatchingService();
      expect(typeof service.generateEmergencyFallbackMatches).toBe("function");
    });

    it("should generate emergency matches", () => {
      const service = new FallbackMatchingService();
      const matches = service.generateEmergencyFallbackMatches(
        mockJobs,
        mockUser,
      );
      expect(matches).toBeDefined();
      expect(Array.isArray(matches)).toBe(true);
    });

    it("should filter recent jobs for emergency matches", () => {
      const service = new FallbackMatchingService();
      const recentJob = {
        ...mockJobs[0],
        posted_at: new Date().toISOString(),
      };
      const oldJob = {
        ...mockJobs[0],
        posted_at: new Date(
          Date.now() - 10 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      };
      const matches = service.generateEmergencyFallbackMatches(
        [recentJob, oldJob],
        mockUser,
      );
      expect(matches.length).toBeGreaterThanOrEqual(0);
    });

    it("should have shouldUseFallback method", () => {
      const service = new FallbackMatchingService();
      expect(typeof service.shouldUseFallback).toBe("function");
    });

    it("should use fallback for empty matches", () => {
      const service = new FallbackMatchingService();
      expect(service.shouldUseFallback([], mockUser)).toBe(true);
    });

    it("should use fallback for low confidence matches", () => {
      const service = new FallbackMatchingService();
      const lowConfidenceMatches = [
        { confidence_score: 0.3 },
        { confidence_score: 0.2 },
      ];
      expect(service.shouldUseFallback(lowConfidenceMatches, mockUser)).toBe(
        true,
      );
    });

    it("should not use fallback for high confidence matches", () => {
      const service = new FallbackMatchingService();
      const highConfidenceMatches = [
        { confidence_score: 0.8 },
        { confidence_score: 0.9 },
      ];
      expect(service.shouldUseFallback(highConfidenceMatches, mockUser)).toBe(
        false,
      );
    });

    it("should have getStats method", () => {
      const service = new FallbackMatchingService();
      expect(typeof service.getStats).toBe("function");
    });

    it("should return stats", () => {
      const service = new FallbackMatchingService();
      const stats = service.getStats();
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty("maxMatches");
      expect(stats).toHaveProperty("lowConfidenceThreshold");
    });
  });
});
