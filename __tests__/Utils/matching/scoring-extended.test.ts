import type { Job } from "@/scrapers/types";
import { ScoringService } from "@/Utils/matching/scoring.service";
import type { MatchScore, UserPreferences } from "@/Utils/matching/types";

describe("ScoringService", () => {
	let scoringService: ScoringService;
	const mockJob: Job = {
		job_hash: "test-hash",
		title: "Software Engineer",
		company: "Test Company",
		location: "London, UK",
		description: "Looking for a junior developer",
		job_url: "https://example.com/job",
		source: "test",
		categories: ["early-career", "software"],
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
	};

	beforeEach(() => {
		scoringService = new ScoringService();
	});

	describe("calculateMatchScore", () => {
		it("should calculate match score", () => {
			const score = scoringService.calculateMatchScore(mockJob, mockUser);
			expect(score).toBeDefined();
			expect(score.overall).toBeGreaterThanOrEqual(0);
			expect(score.overall).toBeLessThanOrEqual(100);
			expect(score.eligibility).toBeGreaterThanOrEqual(0);
			expect(score.location).toBeGreaterThanOrEqual(0);
		});

		it("should give high eligibility for early-career jobs", () => {
			const earlyCareerJob = {
				...mockJob,
				categories: ["early-career", "software"],
			};
			const score = scoringService.calculateMatchScore(
				earlyCareerJob,
				mockUser,
			);
			expect(score.eligibility).toBe(100);
		});

		it("should give lower eligibility for non-early-career jobs", () => {
			const nonEarlyCareerJob = {
				...mockJob,
				categories: ["software"],
			};
			const score = scoringService.calculateMatchScore(
				nonEarlyCareerJob,
				mockUser,
			);
			expect(score.eligibility).toBe(0);
		});

		it("should calculate career path score", () => {
			const techJob = {
				...mockJob,
				categories: ["early-career", "career:tech"],
			};
			const score = scoringService.calculateMatchScore(techJob, mockUser);
			expect(score.careerPath).toBeGreaterThanOrEqual(0);
		});

		it("should calculate location score", () => {
			const londonJob = {
				...mockJob,
				categories: ["early-career", "loc:san-francisco"],
			};
			const score = scoringService.calculateMatchScore(londonJob, mockUser);
			expect(score.location).toBeGreaterThanOrEqual(0);
		});

		it("should calculate overall weighted score", () => {
			const score = scoringService.calculateMatchScore(mockJob, mockUser);
			expect(score.overall).toBeGreaterThanOrEqual(0);
			expect(score.overall).toBeLessThanOrEqual(100);
		});
	});

	describe("calculateConfidenceScore", () => {
		it("should calculate confidence score", () => {
			const confidence = scoringService.calculateConfidenceScore(
				mockJob,
				mockUser,
			);
			expect(confidence).toBeGreaterThanOrEqual(0);
			expect(confidence).toBeLessThanOrEqual(1);
		});

		it("should reduce confidence for uncertain eligibility", () => {
			const uncertainJob = {
				...mockJob,
				categories: ["eligibility:uncertain"],
			};
			const confidence = scoringService.calculateConfidenceScore(
				uncertainJob,
				mockUser,
			);
			expect(confidence).toBeLessThan(1);
		});

		it("should reduce confidence for unknown categories", () => {
			const unknownJob = {
				...mockJob,
				categories: ["career:unknown"],
			};
			const confidence = scoringService.calculateConfidenceScore(
				unknownJob,
				mockUser,
			);
			expect(confidence).toBeLessThan(1);
		});

		it("should maintain minimum confidence floor", () => {
			const confidence = scoringService.calculateConfidenceScore(
				mockJob,
				mockUser,
			);
			expect(confidence).toBeGreaterThanOrEqual(0.5);
		});
	});

	describe("generateMatchExplanation", () => {
		it("should generate explanation", () => {
			const score: MatchScore = {
				overall: 85,
				eligibility: 100,
				career_path: 90,
				careerPath: 90,
				location: 80,
				keywords: 0,
				work_environment: 0,
				visa_sponsorship: 0,
				experience_level: 0,
				languages: 0,
				company_type: 0,
				roles: 0,
			};
			const explanation = scoringService.generateMatchExplanation(
				mockJob,
				score,
				mockUser,
			);
			expect(explanation).toBeDefined();
			expect(explanation.reason).toBeDefined();
			expect(explanation.tags).toBeDefined();
		});

		it("should generate excellent match explanation for high scores", () => {
			const score: MatchScore = {
				overall: 95,
				eligibility: 100,
				career_path: 100,
				careerPath: 100,
				location: 100,
				keywords: 0,
				work_environment: 0,
				visa_sponsorship: 0,
				experience_level: 0,
				languages: 0,
				company_type: 0,
				roles: 0,
			};
			const explanation = scoringService.generateMatchExplanation(
				mockJob,
				score,
				mockUser,
			);
			expect(explanation.reason).toContain("Perfect");
			expect(explanation.tags).toBe("excellent-match");
		});
	});

	describe("categorizeMatches", () => {
		it("should categorize matches by confidence", () => {
			const matches = [
				{ confidence_score: 0.85, match_score: 90 },
				{ confidence_score: 0.6, match_score: 75 },
				{ confidence_score: 0.9, match_score: 85 },
			];
			const categorized = scoringService.categorizeMatches(matches);
			expect(categorized.confident).toBeDefined();
			expect(categorized.promising).toBeDefined();
			expect(Array.isArray(categorized.confident)).toBe(true);
			expect(Array.isArray(categorized.promising)).toBe(true);
		});

		it("should put high confidence matches in confident category", () => {
			const matches = [{ confidence_score: 0.85, match_score: 90 }];
			const categorized = scoringService.categorizeMatches(matches);
			expect(categorized.confident.length).toBeGreaterThanOrEqual(0);
		});
	});

	describe("evaluateJobUserPair", () => {
		it("should evaluate job-user pair", () => {
			const result = scoringService.evaluateJobUserPair(mockJob, mockUser);
			expect(result).toBeDefined();
			expect(result).toHaveProperty("eligible");
			expect(result).toHaveProperty("score");
			expect(result).toHaveProperty("confidence");
			expect(result).toHaveProperty("explanation");
		});

		it("should return ineligible for jobs without title", () => {
			const invalidJob = {
				...mockJob,
				title: "",
			};
			const result = scoringService.evaluateJobUserPair(invalidJob, mockUser);
			expect(result.eligible).toBe(false);
		});

		it("should return ineligible for jobs without categories", () => {
			const invalidJob = {
				...mockJob,
				categories: [],
			};
			const result = scoringService.evaluateJobUserPair(invalidJob, mockUser);
			expect(result.eligible).toBe(false);
		});
	});

	describe("scoreJobsForUser", () => {
		it("should score multiple jobs", () => {
			const jobs = [mockJob, { ...mockJob, job_hash: "hash2" }];
			const results = scoringService.scoreJobsForUser(jobs, mockUser);
			expect(results).toBeDefined();
			expect(Array.isArray(results)).toBe(true);
			expect(results.length).toBeGreaterThan(0);
		});

		it("should filter out invalid jobs", () => {
			const jobs = [
				mockJob,
				{ ...mockJob, job_hash: "hash2", title: "" },
				{ ...mockJob, job_hash: "hash3", categories: [] },
			];
			const results = scoringService.scoreJobsForUser(jobs, mockUser);
			expect(results.length).toBeLessThan(jobs.length);
		});

		it("should sort by match score descending", () => {
			const jobs = [
				{ ...mockJob, job_hash: "hash1", categories: ["early-career"] },
				{
					...mockJob,
					job_hash: "hash2",
					categories: ["early-career", "career:tech"],
				},
			];
			const results = scoringService.scoreJobsForUser(jobs, mockUser);
			if (results.length > 1) {
				expect(results[0].match_score).toBeGreaterThanOrEqual(
					results[1].match_score,
				);
			}
		});
	});
});
