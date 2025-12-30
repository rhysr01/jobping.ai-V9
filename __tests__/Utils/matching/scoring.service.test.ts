/**
 * Tests for ScoringService
 */

import { buildMockJob, buildMockUser } from "@/__tests__/_helpers/testBuilders";
import { ScoringService } from "@/Utils/matching/scoring.service";

describe("ScoringService", () => {
  let scoringService: ScoringService;

  beforeEach(() => {
    scoringService = new ScoringService();
  });

  describe("calculateMatchScore", () => {
    it("should calculate high score for early-career tech jobs", () => {
      const job = buildMockJob({
        categories: ["early-career", "career:tech", "loc:san-francisco"],
      });
      const user = buildMockUser({ career_path: ["tech"] });

      const score = scoringService.calculateMatchScore(job, user);

      expect(score.overall).toBeGreaterThan(80);
      expect(score.eligibility).toBe(100);
      expect(score.careerPath).toBe(100);
      expect(score.location).toBe(100);
    });

    it("should calculate lower score for non-early-career jobs", () => {
      const job = buildMockJob({
        categories: ["senior", "career:tech"],
      });
      const user = buildMockUser({ career_path: ["tech"] });

      const score = scoringService.calculateMatchScore(job, user);

      expect(score.eligibility).toBe(0);
      expect(score.overall).toBeLessThan(100);
    });

    it("should handle jobs without categories", () => {
      const job = buildMockJob({ categories: [] });
      const user = buildMockUser();

      const score = scoringService.calculateMatchScore(job, user);

      expect(score.overall).toBeGreaterThanOrEqual(0);
      expect(score.eligibility).toBe(0);
    });

    it("should calculate different scores for different locations", () => {
      const job1 = buildMockJob({
        categories: ["early-career", "career:tech", "loc:san-francisco"],
      });
      const job2 = buildMockJob({
        categories: ["early-career", "career:tech", "loc:other"],
      });
      const user = buildMockUser();

      const score1 = scoringService.calculateMatchScore(job1, user);
      const score2 = scoringService.calculateMatchScore(job2, user);

      expect(score1.location).toBeGreaterThan(score2.location);
    });
  });

  describe("calculateConfidenceScore", () => {
    it("should return high confidence for clear jobs", () => {
      const job = buildMockJob({
        categories: ["early-career", "career:tech", "loc:san-francisco"],
      });
      const user = buildMockUser();

      const confidence = scoringService.calculateConfidenceScore(job, user);

      expect(confidence).toBeGreaterThan(0.7);
      expect(confidence).toBeLessThanOrEqual(1.0);
    });

    it("should reduce confidence for uncertain jobs", () => {
      const job = buildMockJob({
        categories: ["early-career", "eligibility:uncertain"],
      });
      const user = buildMockUser();

      const confidence = scoringService.calculateConfidenceScore(job, user);

      expect(confidence).toBeLessThan(1.0);
    });

    it("should reduce confidence for unknown categories", () => {
      const job = buildMockJob({
        categories: ["early-career", "career:unknown", "loc:unknown"],
      });
      const user = buildMockUser();

      const confidence = scoringService.calculateConfidenceScore(job, user);

      expect(confidence).toBeLessThan(1.0);
    });

    it("should respect minimum confidence floor", () => {
      const job = buildMockJob({
        categories: ["eligibility:uncertain", "career:unknown", "loc:unknown"],
      });
      const user = buildMockUser();

      const confidence = scoringService.calculateConfidenceScore(job, user);

      expect(confidence).toBeGreaterThan(0);
    });
  });

  describe("generateMatchExplanation", () => {
    it("should generate excellent explanation for high scores", () => {
      const job = buildMockJob({
        categories: ["early-career", "career:tech", "loc:san-francisco"],
      });
      const user = buildMockUser();
      const score = { overall: 95 } as any;

      const explanation = scoringService.generateMatchExplanation(
        job,
        score,
        user,
      );

      expect(explanation.reason).toContain("Perfect");
      expect(explanation.tags).toContain("excellent-match");
    });

    it("should generate basic explanation for lower scores", () => {
      const job = buildMockJob({
        categories: ["early-career"],
      });
      const user = buildMockUser();
      const score = { overall: 70 } as any;

      const explanation = scoringService.generateMatchExplanation(
        job,
        score,
        user,
      );

      expect(explanation.reason).toContain("Potential match");
    });

    it("should include confidence in tags for lower scores", () => {
      const job = buildMockJob({
        categories: ["early-career"],
      });
      const user = buildMockUser();
      const score = { overall: 70 } as any;

      const explanation = scoringService.generateMatchExplanation(
        job,
        score,
        user,
      );

      expect(explanation.tags).toContain("confidence");
    });
  });

  describe("categorizeMatches", () => {
    it("should categorize high confidence matches as confident", () => {
      const matches = [
        { confidence_score: 0.9, match_score: 85 },
        { confidence_score: 0.7, match_score: 80 },
      ];

      const result = scoringService.categorizeMatches(matches);

      expect(result.confident).toHaveLength(1);
      expect(result.promising).toHaveLength(1);
    });

    it("should categorize low confidence matches as promising", () => {
      const matches = [
        { confidence_score: 0.5, match_score: 75 },
        { confidence_score: 0.3, match_score: 70 },
      ];

      const result = scoringService.categorizeMatches(matches);

      expect(result.confident).toHaveLength(0);
      expect(result.promising).toHaveLength(2);
    });

    it("should handle empty matches array", () => {
      const result = scoringService.categorizeMatches([]);

      expect(result.confident).toHaveLength(0);
      expect(result.promising).toHaveLength(0);
    });

    it("should handle matches without confidence scores", () => {
      const matches = [{ match_score: 85 }, { match_score: 80 }];

      const result = scoringService.categorizeMatches(matches);

      expect(result.confident).toHaveLength(0);
      expect(result.promising).toHaveLength(2);
    });
  });

  describe("evaluateJobUserPair", () => {
    it("should return eligible for valid job", () => {
      const job = buildMockJob({
        title: "Software Engineer",
        categories: ["early-career", "tech"],
      });
      const user = buildMockUser();

      const result = scoringService.evaluateJobUserPair(job, user);

      expect(result.eligible).toBe(true);
      expect(result.score).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(result.explanation).toBeDefined();
    });

    it("should return ineligible for job without title", () => {
      const job = buildMockJob({
        title: "",
        categories: ["early-career"],
      });
      const user = buildMockUser();

      const result = scoringService.evaluateJobUserPair(job, user);

      expect(result.eligible).toBe(false);
    });

    it("should return ineligible for job without categories", () => {
      const job = buildMockJob({
        title: "Software Engineer",
        categories: [],
      });
      const user = buildMockUser();

      const result = scoringService.evaluateJobUserPair(job, user);

      expect(result.eligible).toBe(false);
    });
  });

  describe("scoreJobsForUser", () => {
    it("should score and sort jobs by match score", () => {
      const jobs = [
        buildMockJob({ id: "1", categories: ["early-career"], title: "Job 1" }),
        buildMockJob({
          id: "2",
          categories: ["early-career", "tech"],
          title: "Job 2",
        }),
        buildMockJob({ id: "3", categories: ["senior"], title: "Job 3" }),
      ];
      const user = buildMockUser();

      const results = scoringService.scoreJobsForUser(jobs, user);

      expect(results).toHaveLength(3); // All jobs have categories and title
      expect(results[0].match_score).toBeGreaterThanOrEqual(
        results[1].match_score,
      );
    });

    it("should filter out jobs without title or categories", () => {
      const jobs = [
        buildMockJob({ id: "1", categories: ["early-career"], title: "Job 1" }),
        buildMockJob({ id: "2", categories: [], title: "Job 2" }),
        buildMockJob({ id: "3", categories: ["early-career"], title: "" }),
      ];
      const user = buildMockUser();

      const results = scoringService.scoreJobsForUser(jobs, user);

      expect(results).toHaveLength(1);
    });

    it("should handle empty jobs array", () => {
      const results = scoringService.scoreJobsForUser([], buildMockUser());

      expect(results).toHaveLength(0);
    });

    it("should include job object in results", () => {
      const jobs = [
        buildMockJob({ id: "1", categories: ["early-career"], title: "Job 1" }),
      ];
      const user = buildMockUser();

      const results = scoringService.scoreJobsForUser(jobs, user);

      expect(results[0]).toHaveProperty("job");
      expect(results[0].job.id).toBe("1");
    });
  });

  describe("constructor with custom config", () => {
    it("should accept custom config", () => {
      const customConfig = {
        scoring: {
          weights: { eligibility: 0.4, careerPath: 0.35, location: 0.25 },
          confidence: {
            uncertain_penalty: 0.1,
            unknown_penalty: 0.2,
            floor: 0.3,
          },
          thresholds: { minimum: 50 },
        },
      };

      const service = new ScoringService(customConfig as any);

      expect(service).toBeDefined();
    });
  });
});
