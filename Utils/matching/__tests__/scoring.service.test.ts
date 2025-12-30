/**
 * Tests for ScoringService
 */

import { MATCHING_CONFIG } from "../../config/matching";
import { ScoringService } from "../scoring.service";
import type { Job, MatchScore, UserPreferences } from "../types";

// Mock data
const mockJob: Job = {
	id: "1",
	title: "Software Engineer",
	company: "Tech Corp",
	job_url: "https://example.com/job",
	categories: ["software", "engineering"],
	location: ["San Francisco"],
	description: "Great job for early career",
	posted_at: new Date().toISOString(),
	created_at: new Date().toISOString(),
	updated_at: new Date().toISOString(),
};

const mockUser: UserPreferences = {
	email: "test@example.com",
	full_name: "Test User",
	professional_expertise: "Software Engineering",
	career_path: ["tech"],
	target_cities: ["San Francisco"],
	work_environment: "hybrid" as const,
	languages_spoken: ["English"],
	company_types: ["startups"],
	roles_selected: ["Software Engineer"],
	entry_level_preference: "entry",
	email_verified: true,
};

describe("ScoringService", () => {
	let scoringService: ScoringService;

	beforeEach(() => {
		scoringService = new ScoringService();
	});

	describe("calculateMatchScore", () => {
		it("should calculate eligibility score correctly", () => {
			const jobWithEarlyCareer: Job = {
				...mockJob,
				categories: ["early-career", "software"],
			};

			const score = scoringService.calculateMatchScore(
				jobWithEarlyCareer,
				mockUser,
			);
			expect(score.eligibility).toBe(100);
		});

		it("should calculate career path score correctly", () => {
			const jobWithTechCareer: Job = {
				...mockJob,
				categories: ["career:tech", "software"],
			};

			const score = scoringService.calculateMatchScore(
				jobWithTechCareer,
				mockUser,
			);
			expect(score.careerPath).toBe(100);
		});

		it("should calculate location score correctly", () => {
			const jobWithMatchingLocation: Job = {
				...mockJob,
				categories: ["loc:san-francisco", "software"],
			};

			const score = scoringService.calculateMatchScore(
				jobWithMatchingLocation,
				mockUser,
			);
			expect(score.location).toBe(100);
		});

		it("should calculate overall score with correct weights", () => {
			const perfectJob: Job = {
				...mockJob,
				categories: ["early-career", "career:tech", "loc:san-francisco"],
				posted_at: new Date().toISOString(),
			};

			const score = scoringService.calculateMatchScore(perfectJob, mockUser);

			// Expected: (100 * 0.35) + (100 * 0.30) + (100 * 0.20) + (100 * 0.15) = 100
			expect(score.overall).toBe(100);
		});
	});

	describe("calculateConfidenceScore", () => {
		it("should return high confidence for complete job data", () => {
			const completeJob: Job = {
				...mockJob,
				categories: ["early-career", "career:tech", "loc:san-francisco"],
			};

			const confidence = scoringService.calculateConfidenceScore(
				completeJob,
				mockUser,
			);
			expect(confidence).toBe(1.0);
		});

		it("should reduce confidence for uncertain eligibility", () => {
			const uncertainJob: Job = {
				...mockJob,
				categories: [
					"eligibility:uncertain",
					"career:tech",
					"loc:san-francisco",
				],
			};

			const confidence = scoringService.calculateConfidenceScore(
				uncertainJob,
				mockUser,
			);
			expect(confidence).toBe(0.9);
		});

		it("should ensure minimum confidence", () => {
			const incompleteJob: Job = {
				...mockJob,
				categories: ["eligibility:uncertain", "career:unknown", "loc:unknown"],
			};

			const confidence = scoringService.calculateConfidenceScore(
				incompleteJob,
				mockUser,
			);
			expect(confidence).toBeGreaterThanOrEqual(
				MATCHING_CONFIG.scoring.thresholds.minimum,
			);
		});
	});

	describe("generateMatchExplanation", () => {
		it("should generate explanation for high-scoring job", () => {
			const highScoreJob: Job = {
				...mockJob,
				categories: ["early-career", "career:tech", "loc:san-francisco"],
				posted_at: new Date().toISOString(),
			};

			const score: MatchScore = {
				overall: 95,
				eligibility: 100,
				careerPath: 100,
				location: 100,
				confidence: 1.0,
			};

			const explanation = scoringService.generateMatchExplanation(
				highScoreJob,
				score,
				mockUser,
			);

			expect(explanation.reason).toContain(
				"Perfect for early-career professionals",
			);
			expect(explanation.reason).toContain("Exact career path match");
			expect(explanation.reason).toContain("Perfect location match");
			expect(explanation.reason).toContain("Recently posted");
			expect(explanation.tags).toContain("excellent-match");
		});

		it("should generate explanation for low-scoring job", () => {
			const lowScoreJob: Job = {
				...mockJob,
				categories: ["career:unknown", "loc:unknown"],
				posted_at: new Date(
					Date.now() - 30 * 24 * 60 * 60 * 1000,
				).toISOString(), // 30 days ago
			};

			const score: MatchScore = {
				overall: 30,
				eligibility: 0,
				careerPath: 40,
				location: 50,
				confidence: 0.7,
			};

			const explanation = scoringService.generateMatchExplanation(
				lowScoreJob,
				score,
				mockUser,
			);

			expect(explanation.reason).toBe("Potential match");
			expect(explanation.tags).toContain('"confidence":0.7');
		});
	});

	describe("categorizeMatches", () => {
		it("should categorize matches by confidence level", () => {
			const confidentMatch = {
				job: mockJob,
				match_score: 85,
				match_reason: "Great match",
				match_quality: "excellent",
				match_tags: "excellent-match",
				confidence_score: 0.9,
				scoreBreakdown: {
					overall: 85,
					eligibility: 100,
					careerPath: 100,
					location: 100,
					confidence: 0.9,
				},
			};

			const promisingMatch = {
				job: mockJob,
				match_score: 65,
				match_reason: "Good match",
				match_quality: "good",
				match_tags: "good-match",
				confidence_score: 0.6,
				scoreBreakdown: {
					overall: 65,
					eligibility: 70,
					careerPath: 70,
					location: 75,
					confidence: 0.6,
				},
			};

			const matches = [confidentMatch, promisingMatch];
			const categorized = scoringService.categorizeMatches(matches);

			expect(categorized.confident).toHaveLength(1);
			expect(categorized.promising).toHaveLength(1);
			expect(categorized.confident[0]).toBe(confidentMatch);
			expect(categorized.promising[0]).toBe(promisingMatch);
		});
	});

	describe("evaluateJobUserPair", () => {
		it("should return eligible for good match", () => {
			const goodJob: Job = {
				...mockJob,
				categories: ["early-career", "career:tech", "loc:san-francisco"],
			};

			const evaluation = scoringService.evaluateJobUserPair(goodJob, mockUser);

			expect(evaluation.eligible).toBe(true);
			expect(evaluation.score).toBeDefined();
			expect(evaluation.confidence).toBeDefined();
			expect(evaluation.explanation).toBeDefined();
			expect(evaluation.gateResult.passed).toBe(true);
		});

		it("should return ineligible for job that fails gates", () => {
			const badJob: Job = {
				...mockJob,
				title: "", // Missing required field
				categories: [],
			};

			const evaluation = scoringService.evaluateJobUserPair(badJob, mockUser);

			expect(evaluation.eligible).toBe(false);
			expect(evaluation.score).toBeUndefined();
			expect(evaluation.gateResult.passed).toBe(false);
		});
	});

	describe("scoreJobsForUser", () => {
		it("should score and sort multiple jobs", () => {
			const job1: Job = { ...mockJob, id: "1", categories: ["early-career"] };
			const job2: Job = { ...mockJob, id: "2", categories: ["career:tech"] };
			const job3: Job = {
				...mockJob,
				id: "3",
				categories: ["early-career", "career:tech"],
			};

			const jobs = [job1, job2, job3];
			const results = scoringService.scoreJobsForUser(jobs, mockUser);

			expect(results.length).toBeGreaterThan(0);
			expect(results[0].match_score).toBeGreaterThanOrEqual(
				results[1].match_score,
			);
		});

		it("should filter out ineligible jobs", () => {
			const goodJob: Job = { ...mockJob, categories: ["early-career"] };
			const badJob: Job = { ...mockJob, title: "", categories: [] };

			const jobs = [goodJob, badJob];
			const results = scoringService.scoreJobsForUser(jobs, mockUser);

			expect(results.length).toBe(1);
			expect(results[0].job.id).toBe(goodJob.id);
		});
	});

	describe("Configuration Integration", () => {
		it("should use configuration weights correctly", () => {
			const customConfig = {
				...MATCHING_CONFIG,
				scoring: {
					...MATCHING_CONFIG.scoring,
					weights: {
						eligibility: 0.5,
						careerPath: 0.3,
						location: 0.1,
					},
				},
			};

			const customScoringService = new ScoringService(customConfig);
			const perfectJob: Job = {
				...mockJob,
				categories: ["early-career", "career:tech", "loc:san-francisco"],
				posted_at: new Date().toISOString(),
			};

			const score = customScoringService.calculateMatchScore(
				perfectJob,
				mockUser,
			);

			// With custom weights: (100 * 0.5) + (100 * 0.3) + (100 * 0.1) + (100 * 0.1) = 100
			expect(score.overall).toBe(100);
		});
	});
});
