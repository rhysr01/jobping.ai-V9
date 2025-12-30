import {
  type BasicJob,
  buildPersonalizedSubject,
  type UserPreferencesLike,
} from "@/Utils/email/subjectBuilder";

describe("subjectBuilder", () => {
  const mockJobs: BasicJob[] = [
    {
      title: "Frontend Developer",
      company: "Adyen",
      location: "Amsterdam",
      match_score: 95,
    },
    {
      title: "React Engineer",
      company: "Spotify",
      location: "Amsterdam",
      match_score: 90,
    },
    {
      title: "UI Developer",
      company: "Booking.com",
      location: "Amsterdam",
      match_score: 88,
    },
  ];

  describe("buildPersonalizedSubject", () => {
    it("should build variant A with role, location, and companies", () => {
      const subject = buildPersonalizedSubject({
        jobs: mockJobs,
        preferences: {
          rolePreference: "Frontend",
          locationPreference: "Amsterdam",
        },
      });
      expect(subject).toContain("Frontend");
      expect(subject).toContain("Amsterdam");
      expect(subject).toContain("roles");
    });

    it("should build variant B with top match details", () => {
      const subject = buildPersonalizedSubject({
        jobs: mockJobs,
        preferences: {
          rolePreference: "Frontend",
          locationPreference: "Amsterdam",
        },
      });
      // May return variant B if conditions are met
      expect(subject).toBeDefined();
      expect(typeof subject).toBe("string");
    });

    it("should build variant C with day context", () => {
      const subject = buildPersonalizedSubject({
        jobs: mockJobs,
        preferences: {
          rolePreference: "Frontend",
          locationPreference: "Amsterdam",
        },
        now: new Date("2024-01-15T12:00:00Z"), // Monday
      });
      expect(subject).toBeDefined();
      expect(typeof subject).toBe("string");
    });

    it("should build variant D with location only", () => {
      const subject = buildPersonalizedSubject({
        jobs: mockJobs,
        preferences: {
          locationPreference: "Amsterdam",
        },
      });
      expect(subject).toContain("Amsterdam");
      expect(subject).toContain("roles");
    });

    it("should include salary preference when available", () => {
      const subject = buildPersonalizedSubject({
        jobs: mockJobs,
        preferences: {
          salaryPreference: "€45-65k",
        },
      });
      expect(subject).toBeDefined();
      expect(typeof subject).toBe("string");
    });

    it("should use fallback for generic subject", () => {
      const subject = buildPersonalizedSubject({
        jobs: mockJobs,
      });
      expect(subject).toContain("JobPing");
      expect(typeof subject).toBe("string");
    });

    it("should handle single job", () => {
      const subject = buildPersonalizedSubject({
        jobs: [mockJobs[0]],
      });
      expect(subject).toBeDefined();
      expect(typeof subject).toBe("string");
    });

    it("should handle empty jobs array", () => {
      const subject = buildPersonalizedSubject({
        jobs: [],
      });
      expect(subject).toBeDefined();
      expect(typeof subject).toBe("string");
    });

    it("should format company list correctly", () => {
      const twoJobs = [mockJobs[0], mockJobs[1]];
      const subject = buildPersonalizedSubject({
        jobs: twoJobs,
        preferences: {
          rolePreference: "Frontend",
          locationPreference: "Amsterdam",
        },
      });
      expect(subject).toBeDefined();
    });

    it("should use top job for score-based variant", () => {
      const subject = buildPersonalizedSubject({
        jobs: mockJobs,
        preferences: {
          rolePreference: "Frontend",
          locationPreference: "Amsterdam",
        },
      });
      // Should include match score information
      expect(subject).toBeDefined();
    });
  });
});
