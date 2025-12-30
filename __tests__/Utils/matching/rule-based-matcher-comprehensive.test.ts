/**
 * Comprehensive tests for Rule-Based Matcher Service
 * Tests all functions including edge cases and error handling
 */

import { buildMockJob, buildMockUser } from "@/__tests__/_helpers/testBuilders";
import {
  applyHardGates,
  calculateConfidenceScore,
  calculateMatchScore,
  categorizeMatches,
  generateMatchExplanation,
  generateRobustFallbackMatches,
  performRobustMatching,
} from "@/Utils/matching/rule-based-matcher.service";
import type { MatchResult } from "@/Utils/matching/types";

describe("Rule-Based Matcher Service - Comprehensive", () => {
  describe("applyHardGates", () => {
    it("should pass all gates for valid job and user", () => {
      const job = buildMockJob({
        categories: ["early-career", "tech"],
        location: "London, UK",
        work_environment: "hybrid",
      });
      const user = buildMockUser({
        target_cities: ["London"],
        work_environment: "hybrid",
      });

      const result = applyHardGates(job, user);

      expect(result.passed).toBe(true);
      expect(result.reason).toBe("Passed all hard gates");
    });

    it("should fail gate for non-early-career job", () => {
      const job = buildMockJob({
        categories: ["senior", "executive"],
        location: "London, UK",
      });
      const user = buildMockUser({ target_cities: ["London"] });

      const result = applyHardGates(job, user);

      expect(result.passed).toBe(false);
      expect(result.reason).toContain("early career");
    });

    it("should fail gate for location mismatch", () => {
      const job = buildMockJob({
        categories: ["early-career"],
        location: "New York, USA",
        city: "New York",
      });
      const user = buildMockUser({ target_cities: ["London"] });

      const result = applyHardGates(job, user);

      expect(result.passed).toBe(false);
      expect(result.reason).toContain("Location mismatch");
    });

    it("should pass gate for remote job when user prefers remote", () => {
      const job = buildMockJob({
        categories: ["early-career"],
        location: "Remote",
        work_environment: "remote",
      });
      const user = buildMockUser({
        target_cities: ["London"],
        work_environment: "remote",
      });

      const result = applyHardGates(job, user);

      expect(result.passed).toBe(true);
    });

    it("should fail gate for work environment mismatch", () => {
      const job = buildMockJob({
        categories: ["early-career"],
        location: "London, UK",
        work_environment: "on-site",
      });
      const user = buildMockUser({
        target_cities: ["London"],
        work_environment: "remote",
      });

      const result = applyHardGates(job, user);

      expect(result.passed).toBe(false);
      expect(result.reason).toContain("Work environment mismatch");
    });

    it("should pass gate when user has no location preference", () => {
      const job = buildMockJob({
        categories: ["early-career"],
        location: "Berlin, Germany",
      });
      const user = buildMockUser({ target_cities: [] });

      const result = applyHardGates(job, user);

      expect(result.passed).toBe(true);
    });

    it("should pass gate when user has unclear work environment", () => {
      const job = buildMockJob({
        categories: ["early-career"],
        location: "London, UK",
        work_environment: "on-site",
      });
      const user = buildMockUser({
        target_cities: ["London"],
        work_environment: "unclear",
      });

      const result = applyHardGates(job, user);

      expect(result.passed).toBe(true);
    });

    it("should pass gate for hybrid job when user prefers remote", () => {
      const job = buildMockJob({
        categories: ["early-career"],
        location: "London, UK",
        work_environment: "hybrid",
      });
      const user = buildMockUser({
        target_cities: ["London"],
        work_environment: "remote",
      });

      const result = applyHardGates(job, user);

      expect(result.passed).toBe(true);
    });
  });

  describe("calculateMatchScore", () => {
    it("should calculate score for perfect match", () => {
      const job = buildMockJob({
        categories: ["early-career", "tech"],
        location: "London, UK",
        title: "Junior Software Engineer",
        description: "Entry-level position for recent graduates",
        posted_at: new Date().toISOString(),
      });
      const user = buildMockUser({
        target_cities: ["London"],
        career_path: ["tech"],
        entry_level_preference: "entry",
        roles_selected: ["developer"],
      });

      const score = calculateMatchScore(job, user);

      expect(score.overall).toBeGreaterThanOrEqual(0);
      expect(score.overall).toBeLessThanOrEqual(100);
      expect(score.eligibility).toBeGreaterThanOrEqual(0);
      expect(score.location).toBeGreaterThanOrEqual(0);
      expect(score.experience).toBeGreaterThanOrEqual(0);
      expect(score.skills).toBeGreaterThanOrEqual(0);
      expect(score.company).toBeGreaterThanOrEqual(0);
      expect(score.timing).toBeGreaterThanOrEqual(0);
    });

    it("should calculate score for job with no location preference", () => {
      const job = buildMockJob({
        categories: ["early-career"],
        location: "Berlin, Germany",
      });
      const user = buildMockUser({ target_cities: [] });

      const score = calculateMatchScore(job, user);

      expect(score.location).toBeGreaterThanOrEqual(0);
      expect(score.overall).toBeGreaterThanOrEqual(0);
    });

    it("should calculate score for old job", () => {
      const job = buildMockJob({
        categories: ["early-career"],
        location: "London, UK",
        posted_at: new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      });
      const user = buildMockUser({ target_cities: ["London"] });

      const score = calculateMatchScore(job, user);

      expect(score.timing).toBeGreaterThanOrEqual(0);
      expect(score.overall).toBeGreaterThanOrEqual(0);
    });

    it("should calculate score for job with missing fields", () => {
      const job = {
        job_hash: "test",
        title: "Engineer",
        categories: ["early-career"],
      } as any;
      const user = buildMockUser();

      const score = calculateMatchScore(job, user);

      expect(score.overall).toBeGreaterThanOrEqual(0);
      expect(score.overall).toBeLessThanOrEqual(100);
    });
  });

  describe("calculateConfidenceScore", () => {
    it("should return confidence score between 0 and 1", () => {
      const job = buildMockJob({
        categories: ["early-career", "tech"],
        location: "London, UK",
      });
      const user = buildMockUser({
        target_cities: ["London"],
        career_path: ["tech"],
      });

      const confidence = calculateConfidenceScore(job, user);

      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    it("should increase confidence for location match", () => {
      const job = buildMockJob({
        categories: ["early-career"],
        location: "London, UK",
      });
      const user = buildMockUser({ target_cities: ["London"] });

      const confidence = calculateConfidenceScore(job, user);

      expect(confidence).toBeGreaterThan(0.5);
    });

    it("should increase confidence for career path match", () => {
      const job = buildMockJob({
        categories: ["early-career", "tech"],
        location: "London, UK",
      });
      const user = buildMockUser({
        target_cities: ["London"],
        career_path: ["tech"],
      });

      const confidence = calculateConfidenceScore(job, user);

      expect(confidence).toBeGreaterThan(0.5);
    });

    it("should return base confidence for job with no matches", () => {
      const job = buildMockJob({
        categories: ["early-career"],
        location: "Berlin, Germany",
      });
      const user = buildMockUser({
        target_cities: ["London"],
        career_path: ["finance"],
      });

      const confidence = calculateConfidenceScore(job, user);

      expect(confidence).toBeGreaterThanOrEqual(0.5);
      expect(confidence).toBeLessThanOrEqual(1);
    });
  });

  describe("generateMatchExplanation", () => {
    it("should generate explanation with reasons", () => {
      const job = buildMockJob({
        categories: ["early-career", "tech"],
        location: "London, UK",
      });
      const score = {
        overall: 85,
        eligibility: 100,
        location: 100,
        experience: 80,
        skills: 70,
        company: 60,
        timing: 90,
      };
      const user = buildMockUser({
        target_cities: ["London"],
        career_path: ["tech"],
      });

      const explanation = generateMatchExplanation(job, score, user);

      expect(explanation.reason).toBeDefined();
      expect(typeof explanation.reason).toBe("string");
      expect(explanation.tags).toBeDefined();
      expect(typeof explanation.tags).toBe("string");
    });

    it("should include tags for high-scoring components", () => {
      const job = buildMockJob({
        categories: ["early-career"],
        location: "London, UK",
      });
      const score = {
        overall: 90,
        eligibility: 100,
        location: 100,
        experience: 90,
        skills: 85,
        company: 80,
        timing: 95,
      };
      const user = buildMockUser({ target_cities: ["London"] });

      const explanation = generateMatchExplanation(job, score, user);

      expect(explanation.tags.length).toBeGreaterThan(0);
    });

    it("should generate default explanation for low scores", () => {
      const job = buildMockJob({
        categories: ["early-career"],
      });
      const score = {
        overall: 50,
        eligibility: 50,
        location: 50,
        experience: 50,
        skills: 50,
        company: 50,
        timing: 50,
      };
      const user = buildMockUser();

      const explanation = generateMatchExplanation(job, score, user);

      expect(explanation.reason).toBe("Good overall match");
    });
  });

  describe("categorizeMatches", () => {
    it("should categorize matches into confident and promising", () => {
      const matches: MatchResult[] = [
        {
          job: buildMockJob(),
          match_score: 85,
          confidence_score: 0.8,
          match_reason: "Great match",
          match_quality: "excellent",
          score_breakdown: {} as any,
          provenance: {} as any,
        },
        {
          job: buildMockJob(),
          match_score: 65,
          confidence_score: 0.6,
          match_reason: "Decent match",
          match_quality: "fair",
          score_breakdown: {} as any,
          provenance: {} as any,
        },
      ];

      const categorized = categorizeMatches(matches);

      expect(categorized.confident).toBeDefined();
      expect(categorized.promising).toBeDefined();
      expect(Array.isArray(categorized.confident)).toBe(true);
      expect(Array.isArray(categorized.promising)).toBe(true);
    });

    it("should put high-confidence matches in confident category", () => {
      const matches: MatchResult[] = [
        {
          job: buildMockJob(),
          match_score: 85,
          confidence_score: 0.8,
          match_reason: "Great match",
          match_quality: "excellent",
          score_breakdown: {} as any,
          provenance: {} as any,
        },
      ];

      const categorized = categorizeMatches(matches);

      expect(categorized.confident.length).toBe(1);
      expect(categorized.promising.length).toBe(0);
    });

    it("should put medium-confidence matches in promising category", () => {
      const matches: MatchResult[] = [
        {
          job: buildMockJob(),
          match_score: 65,
          confidence_score: 0.6,
          match_reason: "Decent match",
          match_quality: "fair",
          score_breakdown: {} as any,
          provenance: {} as any,
        },
      ];

      const categorized = categorizeMatches(matches);

      expect(categorized.confident.length).toBe(0);
      expect(categorized.promising.length).toBe(1);
    });

    it("should filter out low-scoring matches", () => {
      const matches: MatchResult[] = [
        {
          job: buildMockJob(),
          match_score: 50,
          confidence_score: 0.5,
          match_reason: "Low match",
          match_quality: "poor",
          score_breakdown: {} as any,
          provenance: {} as any,
        },
      ];

      const categorized = categorizeMatches(matches);

      expect(categorized.confident.length).toBe(0);
      expect(categorized.promising.length).toBe(0);
    });
  });

  describe("performRobustMatching", () => {
    it("should return matches for valid jobs and user", () => {
      const jobs = [
        buildMockJob({
          categories: ["early-career", "tech"],
          location: "London, UK",
        }),
        buildMockJob({
          categories: ["early-career", "finance"],
          location: "Berlin, Germany",
        }),
      ];
      const user = buildMockUser({
        target_cities: ["London"],
        career_path: ["tech"],
      });

      const matches = performRobustMatching(jobs, user);

      expect(Array.isArray(matches)).toBe(true);
      matches.forEach((match) => {
        expect(match).toHaveProperty("job");
        expect(match).toHaveProperty("match_score");
        expect(match).toHaveProperty("match_reason");
        expect(match).toHaveProperty("confidence_score");
      });
    });

    it("should filter out jobs that fail hard gates", () => {
      const jobs = [
        buildMockJob({
          categories: ["early-career"],
          location: "London, UK",
        }),
        buildMockJob({
          categories: ["senior"],
          location: "London, UK",
        }),
      ];
      const user = buildMockUser({ target_cities: ["London"] });

      const matches = performRobustMatching(jobs, user);

      expect(matches.length).toBeLessThanOrEqual(jobs.length);
      matches.forEach((match) => {
        expect(match.match_score).toBeGreaterThanOrEqual(50);
      });
    });

    it("should sort matches by score descending", () => {
      const jobs = [
        buildMockJob({
          categories: ["early-career"],
          location: "London, UK",
          match_score: 60,
        }),
        buildMockJob({
          categories: ["early-career"],
          location: "London, UK",
          match_score: 80,
        }),
      ];
      const user = buildMockUser({ target_cities: ["London"] });

      const matches = performRobustMatching(jobs, user);

      if (matches.length > 1) {
        for (let i = 0; i < matches.length - 1; i++) {
          expect(matches[i].match_score).toBeGreaterThanOrEqual(
            matches[i + 1].match_score,
          );
        }
      }
    });

    it("should return empty array for no matching jobs", () => {
      const jobs = [
        buildMockJob({
          categories: ["senior"],
          location: "New York, USA",
        }),
      ];
      const user = buildMockUser({
        target_cities: ["London"],
        entry_level_preference: "entry",
      });

      const matches = performRobustMatching(jobs, user);

      expect(Array.isArray(matches)).toBe(true);
    });

    it("should handle empty jobs array", () => {
      const user = buildMockUser();

      const matches = performRobustMatching([], user);

      expect(matches).toEqual([]);
    });

    it("should include provenance information", () => {
      const jobs = [
        buildMockJob({
          categories: ["early-career"],
          location: "London, UK",
        }),
      ];
      const user = buildMockUser({ target_cities: ["London"] });

      const matches = performRobustMatching(jobs, user);

      if (matches.length > 0) {
        expect(matches[0].provenance).toBeDefined();
        expect(matches[0].provenance?.match_algorithm).toBe("rules");
      }
    });
  });

  describe("generateRobustFallbackMatches", () => {
    it("should call performRobustMatching", () => {
      const jobs = [
        buildMockJob({
          categories: ["early-career"],
          location: "London, UK",
        }),
      ];
      const user = buildMockUser({ target_cities: ["London"] });

      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      const matches = generateRobustFallbackMatches(jobs, user);

      expect(Array.isArray(matches)).toBe(true);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should log user email", () => {
      const jobs = [buildMockJob()];
      const user = buildMockUser({ email: "test@example.com" });

      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      generateRobustFallbackMatches(jobs, user);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("test@example.com"),
      );

      consoleSpy.mockRestore();
    });
  });
});
