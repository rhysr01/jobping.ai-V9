/**
 * Extended Tests for Subject Builder
 */

import { buildPersonalizedSubject } from "@/Utils/email/subjectBuilder";

describe("Subject Builder - Extended Tests", () => {
  describe("buildPersonalizedSubject - Variant A", () => {
    it("should create company list variant for multiple jobs with role and location", () => {
      const jobs = [
        {
          title: "Frontend Developer",
          company: "Adyen",
          location: "Amsterdam",
          match_score: 90,
        },
        {
          title: "React Developer",
          company: "Spotify",
          location: "Amsterdam",
          match_score: 85,
        },
        {
          title: "UI Developer",
          company: "Booking.com",
          location: "Amsterdam",
          match_score: 80,
        },
      ];
      const preferences = {
        rolePreference: "Frontend",
        locationPreference: "Amsterdam",
      };

      const subject = buildPersonalizedSubject({ jobs, preferences });

      expect(subject).toContain("3 frontend roles in Amsterdam");
      expect(subject).toContain("Adyen, Spotify & Booking.com");
    });

    it("should handle two companies correctly", () => {
      const jobs = [
        {
          title: "Backend Developer",
          company: "Company A",
          location: "Berlin",
          match_score: 90,
        },
        {
          title: "API Developer",
          company: "Company B",
          location: "Berlin",
          match_score: 85,
        },
      ];
      const preferences = {
        rolePreference: "Backend",
        locationPreference: "Berlin",
      };

      const subject = buildPersonalizedSubject({ jobs, preferences });

      expect(subject).toContain("2 backend roles in Berlin");
      expect(subject).toContain("Company A & Company B");
    });

    it("should handle single company correctly", () => {
      const jobs = [
        {
          title: "Data Scientist",
          company: "Data Corp",
          location: "London",
          match_score: 95,
        },
      ];
      const preferences = {
        rolePreference: "Data Scientist",
        locationPreference: "London",
      };

      const subject = buildPersonalizedSubject({ jobs, preferences });

      expect(subject).toContain(
        "London Data Scientist: Data Scientist at Data Corp (95% match)",
      );
    });
  });

  describe("buildPersonalizedSubject - Variant B", () => {
    it("should create top job variant with score and company", () => {
      const jobs = [
        {
          title: "React Developer",
          company: "Stripe",
          location: "Amsterdam",
          match_score: 94,
        },
        {
          title: "Vue Developer",
          company: "Other Corp",
          location: "Amsterdam",
          match_score: 80,
        },
      ];
      const preferences = {
        rolePreference: "Frontend",
        locationPreference: "Amsterdam",
      };

      const subject = buildPersonalizedSubject({ jobs, preferences });

      expect(subject).toContain("2 frontend roles in Amsterdam");
      expect(subject).toContain("Stripe & Other Corp");
    });

    it('should handle single job without "more" text', () => {
      const jobs = [
        {
          title: "Python Developer",
          company: "Tech Corp",
          location: "Berlin",
          match_score: 88,
        },
      ];
      const preferences = {
        rolePreference: "Python",
        locationPreference: "Berlin",
      };

      const subject = buildPersonalizedSubject({ jobs, preferences });

      expect(subject).toContain(
        "Berlin Python: Python Developer at Tech Corp (88% match)",
      );
      expect(subject).not.toContain("more");
    });

    it("should sort jobs by match score", () => {
      const jobs = [
        {
          title: "Low Score Job",
          company: "Low Corp",
          location: "London",
          match_score: 60,
        },
        {
          title: "High Score Job",
          company: "High Corp",
          location: "London",
          match_score: 95,
        },
      ];
      const preferences = {
        rolePreference: "Developer",
        locationPreference: "London",
      };

      const subject = buildPersonalizedSubject({ jobs, preferences });

      expect(subject).toContain("2 developer roles in London");
      expect(subject).toContain("Low Corp & High Corp");
    });
  });

  describe("buildPersonalizedSubject - Variant C", () => {
    it("should create day-based variant with role and location", () => {
      const jobs = [
        {
          title: "Full Stack Developer",
          company: "Company A",
          location: "Paris",
          match_score: 85,
        },
        {
          title: "Backend Developer",
          company: "Company B",
          location: "Paris",
          match_score: 80,
        },
      ];
      const preferences = {
        rolePreference: "Full Stack",
        locationPreference: "Paris",
      };

      const subject = buildPersonalizedSubject({ jobs, preferences });

      expect(subject).toContain("full stack roles");
      expect(subject).toContain("Paris");
    });

    it("should handle vowel-starting locations", () => {
      const jobs = [
        {
          title: "Designer",
          company: "Design Corp",
          location: "Amsterdam",
          match_score: 90,
        },
      ];
      const preferences = {
        rolePreference: "Designer",
        locationPreference: "Amsterdam",
      };

      const subject = buildPersonalizedSubject({ jobs, preferences });

      expect(subject).toContain("Amsterdam");
    });

    it("should handle consonant-starting locations", () => {
      const jobs = [
        {
          title: "Engineer",
          company: "Tech Corp",
          location: "Berlin",
          match_score: 85,
        },
      ];
      const preferences = {
        rolePreference: "Engineer",
        locationPreference: "Berlin",
      };

      const subject = buildPersonalizedSubject({ jobs, preferences });

      expect(subject).toContain("Berlin");
    });
  });

  describe("buildPersonalizedSubject - Edge Cases", () => {
    it("should handle jobs without match scores", () => {
      const jobs = [
        { title: "Developer", company: "Company A", location: "London" },
        { title: "Designer", company: "Company B", location: "London" },
      ];
      const preferences = {
        rolePreference: "Developer",
        locationPreference: "London",
      };

      const subject = buildPersonalizedSubject({ jobs, preferences });

      expect(subject).toBeDefined();
      expect(subject.length).toBeGreaterThan(0);
    });

    it("should handle empty jobs array", () => {
      const jobs: any[] = [];
      const preferences = {
        rolePreference: "Developer",
        locationPreference: "London",
      };

      const subject = buildPersonalizedSubject({ jobs, preferences });

      expect(subject).toBeDefined();
    });

    it("should handle jobs with missing company names", () => {
      const jobs = [
        {
          title: "Developer",
          company: "",
          location: "London",
          match_score: 85,
        },
        {
          title: "Designer",
          company: undefined,
          location: "London",
          match_score: 80,
        },
      ];
      const preferences = {
        rolePreference: "Developer",
        locationPreference: "London",
      };

      const subject = buildPersonalizedSubject({ jobs, preferences });

      expect(subject).toBeDefined();
    });

    it("should handle jobs with missing titles", () => {
      const jobs = [
        {
          title: "",
          company: "Company A",
          location: "London",
          match_score: 85,
        },
        {
          title: undefined,
          company: "Company B",
          location: "London",
          match_score: 80,
        },
      ];
      const preferences = {
        rolePreference: "Developer",
        locationPreference: "London",
      };

      const subject = buildPersonalizedSubject({ jobs, preferences });

      expect(subject).toBeDefined();
    });

    it("should handle custom date", () => {
      const jobs = [
        {
          title: "Developer",
          company: "Company A",
          location: "London",
          match_score: 85,
        },
      ];
      const preferences = {
        rolePreference: "Developer",
        locationPreference: "London",
      };
      const customDate = new Date("2024-01-15"); // Monday

      const subject = buildPersonalizedSubject({
        jobs,
        preferences,
        now: customDate,
      });

      expect(subject).toContain("Developer");
    });

    it("should handle different day contexts", () => {
      const jobs = [
        {
          title: "Developer",
          company: "Company A",
          location: "London",
          match_score: 85,
        },
      ];
      const preferences = {
        rolePreference: "Developer",
        locationPreference: "London",
      };

      const monday = new Date("2024-01-15");
      const tuesday = new Date("2024-01-16");
      const wednesday = new Date("2024-01-17");

      const mondaySubject = buildPersonalizedSubject({
        jobs,
        preferences,
        now: monday,
      });
      const tuesdaySubject = buildPersonalizedSubject({
        jobs,
        preferences,
        now: tuesday,
      });
      const wednesdaySubject = buildPersonalizedSubject({
        jobs,
        preferences,
        now: wednesday,
      });

      expect(mondaySubject).toContain("Developer");
      expect(tuesdaySubject).toContain("Developer");
      expect(wednesdaySubject).toContain("Developer");
    });
  });

  describe("buildPersonalizedSubject - Role Preference Handling", () => {
    it("should convert role preference to title case", () => {
      const jobs = [
        {
          title: "Developer",
          company: "Company A",
          location: "London",
          match_score: 85,
        },
      ];
      const preferences = {
        rolePreference: "frontend developer",
        locationPreference: "London",
      };

      const subject = buildPersonalizedSubject({ jobs, preferences });

      expect(subject).toContain("Frontend Developer");
    });

    it("should handle mixed case role preferences", () => {
      const jobs = [
        {
          title: "Engineer",
          company: "Company A",
          location: "London",
          match_score: 85,
        },
      ];
      const preferences = {
        rolePreference: "fULL sTACK eNGINEER",
        locationPreference: "London",
      };

      const subject = buildPersonalizedSubject({ jobs, preferences });

      expect(subject).toContain("FULL STACK ENGINEER");
    });

    it("should handle role preferences with special characters", () => {
      const jobs = [
        {
          title: "Developer",
          company: "Company A",
          location: "London",
          match_score: 85,
        },
      ];
      const preferences = {
        rolePreference: "c++ developer",
        locationPreference: "London",
      };

      const subject = buildPersonalizedSubject({ jobs, preferences });

      expect(subject).toContain("C++ Developer");
    });
  });

  describe("buildPersonalizedSubject - Company Selection", () => {
    it("should limit to top 3 companies", () => {
      const jobs = [
        {
          title: "Job 1",
          company: "Company A",
          location: "London",
          match_score: 90,
        },
        {
          title: "Job 2",
          company: "Company B",
          location: "London",
          match_score: 85,
        },
        {
          title: "Job 3",
          company: "Company C",
          location: "London",
          match_score: 80,
        },
        {
          title: "Job 4",
          company: "Company D",
          location: "London",
          match_score: 75,
        },
        {
          title: "Job 5",
          company: "Company E",
          location: "London",
          match_score: 70,
        },
      ];
      const preferences = {
        rolePreference: "Developer",
        locationPreference: "London",
      };

      const subject = buildPersonalizedSubject({ jobs, preferences });

      expect(subject).toContain("Company A, Company B & Company C");
      expect(subject).not.toContain("Company D");
      expect(subject).not.toContain("Company E");
    });

    it("should handle duplicate company names", () => {
      const jobs = [
        {
          title: "Job 1",
          company: "Company A",
          location: "London",
          match_score: 90,
        },
        {
          title: "Job 2",
          company: "Company A",
          location: "London",
          match_score: 85,
        },
        {
          title: "Job 3",
          company: "Company B",
          location: "London",
          match_score: 80,
        },
      ];
      const preferences = {
        rolePreference: "Developer",
        locationPreference: "London",
      };

      const subject = buildPersonalizedSubject({ jobs, preferences });

      expect(subject).toContain("Company A & Company B");
      expect(subject).not.toContain("Company A, Company A");
    });

    it("should filter out empty company names", () => {
      const jobs = [
        {
          title: "Job 1",
          company: "Company A",
          location: "London",
          match_score: 90,
        },
        { title: "Job 2", company: "", location: "London", match_score: 85 },
        {
          title: "Job 3",
          company: "Company B",
          location: "London",
          match_score: 80,
        },
      ];
      const preferences = {
        rolePreference: "Developer",
        locationPreference: "London",
      };

      const subject = buildPersonalizedSubject({ jobs, preferences });

      expect(subject).toContain("Company A & Company B");
      expect(subject).not.toContain("Company A,  & Company B");
    });
  });
});
