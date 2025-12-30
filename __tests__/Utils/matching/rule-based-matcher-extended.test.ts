import type { Job } from "@/scrapers/types";
import {
  applyHardGates,
  calculateMatchScore,
} from "@/Utils/matching/rule-based-matcher.service";
import type { UserPreferences } from "@/Utils/matching/types";

describe("rule-based-matcher.service", () => {
  const mockJob: Job = {
    job_hash: "test-hash",
    title: "Software Engineer",
    company: "Test Company",
    location: "London, UK",
    description: "Looking for a junior developer",
    job_url: "https://example.com/job",
    source: "test",
    categories: ["early-career", "software", "career:tech", "loc:london"],
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
  };

  const mockUser: UserPreferences = {
    email: "test@example.com",
    career_path: ["tech"],
    target_cities: ["London"],
    professional_expertise: "Software Engineering",
    work_environment: "remote",
  };

  describe("applyHardGates", () => {
    it("should pass for eligible job", () => {
      const result = applyHardGates(mockJob, mockUser);
      expect(result.passed).toBe(true);
    });

    it("should fail for non-early-career job", () => {
      const jobWithoutEligibility = {
        ...mockJob,
        categories: ["software"],
      };
      const result = applyHardGates(jobWithoutEligibility, mockUser);
      expect(result.passed).toBe(false);
      expect(result.reason).toContain("early career");
    });

    it("should fail for location mismatch", () => {
      const jobWrongLocation = {
        ...mockJob,
        location: "Tokyo, Japan",
        city: "Tokyo",
        country: "Japan",
      };
      const userWrongCity = {
        ...mockUser,
        target_cities: ["London"],
      };
      const result = applyHardGates(jobWrongLocation, userWrongCity);
      expect(result.passed).toBe(false);
      expect(result.reason).toContain("Location");
    });

    it("should pass for remote work", () => {
      const remoteJob = {
        ...mockJob,
        location: "Remote",
        work_environment: "remote",
      };
      const result = applyHardGates(remoteJob, mockUser);
      expect(result.passed).toBe(true);
    });

    it("should fail for work environment mismatch", () => {
      const officeJob = {
        ...mockJob,
        work_environment: "office",
      };
      const remoteUser = {
        ...mockUser,
        work_environment: "remote",
      };
      const result = applyHardGates(officeJob, remoteUser);
      expect(result.passed).toBe(false);
      expect(result.reason).toContain("Work environment");
    });

    it("should pass for hybrid work with remote preference", () => {
      const hybridJob = {
        ...mockJob,
        work_environment: "hybrid",
      };
      const remoteUser = {
        ...mockUser,
        work_environment: "remote",
      };
      const result = applyHardGates(hybridJob, remoteUser);
      // Hybrid should be compatible with remote preference
      expect(result.passed).toBe(true);
    });

    it("should pass for unclear work environment preference", () => {
      const unclearUser = {
        ...mockUser,
        work_environment: "unclear",
      };
      const result = applyHardGates(mockJob, unclearUser);
      expect(result.passed).toBe(true);
    });
  });

  describe("calculateMatchScore", () => {
    it("should calculate match score", () => {
      const score = calculateMatchScore(mockJob, mockUser);
      expect(score).toBeDefined();
      expect(score.overall).toBeGreaterThanOrEqual(0);
      expect(score.overall).toBeLessThanOrEqual(100);
      expect(score.eligibility).toBeGreaterThanOrEqual(0);
      expect(score.location).toBeGreaterThanOrEqual(0);
      expect(score.experience).toBeGreaterThanOrEqual(0);
      expect(score.skills).toBeGreaterThanOrEqual(0);
      expect(score.company).toBeGreaterThanOrEqual(0);
      expect(score.timing).toBeGreaterThanOrEqual(0);
    });

    it("should give high eligibility score for early-career jobs", () => {
      const earlyCareerJob = {
        ...mockJob,
        categories: ["early-career", "software"],
      };
      const score = calculateMatchScore(earlyCareerJob, mockUser);
      expect(score.eligibility).toBe(100);
    });

    it("should calculate location score", () => {
      const londonJob = {
        ...mockJob,
        location: "London, UK",
        city: "London",
        country: "UK",
      };
      const londonUser = {
        ...mockUser,
        target_cities: ["London"],
      };
      const score = calculateMatchScore(londonJob, londonUser);
      expect(score.location).toBeGreaterThan(0);
    });

    it("should calculate timing score for recent jobs", () => {
      const recentJob = {
        ...mockJob,
        posted_at: new Date().toISOString(),
      };
      const score = calculateMatchScore(recentJob, mockUser);
      expect(score.timing).toBeGreaterThanOrEqual(0);
    });

    it("should calculate overall weighted score", () => {
      const score = calculateMatchScore(mockJob, mockUser);
      // Overall should be weighted average
      expect(score.overall).toBeGreaterThanOrEqual(0);
      expect(score.overall).toBeLessThanOrEqual(100);
    });
  });
});
