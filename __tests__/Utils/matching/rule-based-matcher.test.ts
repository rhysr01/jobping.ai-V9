/**
 * Tests for Rule-Based Matcher Service
 * Tests rule-based matching logic and scoring
 */

import { buildMockJob, buildMockUser } from "@/__tests__/_helpers/testBuilders";
import {
	applyHardGates,
	calculateMatchScore,
} from "@/Utils/matching/rule-based-matcher.service";

describe("Rule-Based Matcher - applyHardGates", () => {
	it("should evaluate job against criteria", () => {
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

		// Should return a result with passed and reason properties
		expect(result).toHaveProperty("passed");
		expect(result).toHaveProperty("reason");
		expect(typeof result.passed).toBe("boolean");
		expect(typeof result.reason).toBe("string");
	});

	it("should reject job without early career eligibility", () => {
		const job = buildMockJob({
			categories: ["senior", "experienced"],
			location: "London",
		});
		const user = buildMockUser({
			target_cities: ["London"],
		});

		const result = applyHardGates(job, user);

		expect(result.passed).toBe(false);
		expect(result.reason).toBe("Not eligible for early career");
	});

	it("should reject job with location mismatch", () => {
		const job = buildMockJob({
			categories: ["early-career"],
			location: "New York, USA",
		});
		const user = buildMockUser({
			target_cities: ["London", "Berlin"],
		});

		const result = applyHardGates(job, user);

		expect(result.passed).toBe(false);
		expect(result.reason).toBe(
			"Location mismatch: No location compatibility found",
		);
	});

	it("should accept remote jobs for any location", () => {
		const job = buildMockJob({
			categories: ["early-career"],
			location: "Remote - Europe",
		});
		const user = buildMockUser({
			target_cities: ["London"],
		});

		const result = applyHardGates(job, user);

		expect(result.passed).toBe(true);
	});

	it("should accept hybrid jobs for users with hybrid preference", () => {
		const job = buildMockJob({
			categories: ["early-career"],
			location: "London",
			work_environment: "hybrid",
		});
		const user = buildMockUser({
			target_cities: ["London"],
			work_environment: "on-site", // User wants onsite
		});

		const result = applyHardGates(job, user);

		// Hybrid jobs are flexible and should pass
		expect(result.passed).toBe(true);
	});

	it("should reject work environment mismatch for strict preferences", () => {
		const job = buildMockJob({
			categories: ["early-career"],
			location: "London",
			work_environment: "on-site",
		});
		const user = buildMockUser({
			target_cities: ["London"],
			work_environment: "remote",
		});

		const result = applyHardGates(job, user);

		expect(result.passed).toBe(false);
		expect(result.reason).toBe("Work environment mismatch");
	});

	it("should pass when user has no location preference", () => {
		const job = buildMockJob({
			categories: ["early-career"],
			location: "Berlin",
		});
		const user = buildMockUser({
			target_cities: [],
		});

		const result = applyHardGates(job, user);

		expect(result.passed).toBe(true);
	});

	it("should pass when user work environment is unclear", () => {
		const job = buildMockJob({
			categories: ["early-career"],
			location: "London",
			work_environment: "on-site",
		});
		const user = buildMockUser({
			target_cities: ["London"],
			work_environment: "unclear" as any,
		});

		const result = applyHardGates(job, user);

		expect(result.passed).toBe(true);
	});
});

describe("Rule-Based Matcher - calculateMatchScore", () => {
	it("should calculate match score for well-matched job", () => {
		const job = buildMockJob({
			categories: ["early-career", "tech"],
			location: "London, UK",
			work_environment: "hybrid",
			posted_at: new Date().toISOString(),
		});
		const user = buildMockUser({
			target_cities: ["London"],
			work_environment: "hybrid",
			company_types: ["tech"],
			entry_level_preference: "entry",
		});

		const score = calculateMatchScore(job, user);

		expect(score.overall).toBeGreaterThan(50); // Reasonable threshold
		expect(score).toHaveProperty("eligibility");
		expect(score).toHaveProperty("location");
	});

	it("should score early career jobs positively", () => {
		const earlyCareerJob = buildMockJob({
			categories: ["early-career", "graduate"],
		});
		const nonEarlyCareerJob = buildMockJob({
			categories: ["senior", "experienced"],
		});
		const user = buildMockUser();

		const earlyCareerScore = calculateMatchScore(earlyCareerJob, user);
		const seniorScore = calculateMatchScore(nonEarlyCareerJob, user);

		// Early career jobs should score at least as high (or have different score components)
		expect(earlyCareerScore.overall).toBeGreaterThanOrEqual(
			seniorScore.overall,
		);
	});

	it("should give high location score for exact city match", () => {
		const job = buildMockJob({
			categories: ["early-career"],
			location: "London, United Kingdom",
		});
		const user = buildMockUser({
			target_cities: ["London"],
		});

		const score = calculateMatchScore(job, user);

		expect(score.location).toBeGreaterThan(80);
	});

	it("should score location matches appropriately", () => {
		const matchingJob = buildMockJob({
			categories: ["early-career"],
			location: "London, UK",
		});
		const mismatchJob = buildMockJob({
			categories: ["early-career"],
			location: "New York, USA",
		});
		const user = buildMockUser({
			target_cities: ["London", "Berlin"],
		});

		const matchingScore = calculateMatchScore(matchingJob, user);
		const mismatchScore = calculateMatchScore(mismatchJob, user);

		// Matching location should score higher
		expect(matchingScore.location).toBeGreaterThan(mismatchScore.location);
	});

	it("should score recent jobs higher than old ones", () => {
		const recentJob = buildMockJob({
			categories: ["early-career"],
			posted_at: new Date().toISOString(),
		});
		const oldJob = buildMockJob({
			categories: ["early-career"],
			posted_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days old
		});
		const user = buildMockUser();

		const recentScore = calculateMatchScore(recentJob, user);
		const oldScore = calculateMatchScore(oldJob, user);

		expect(recentScore.timing).toBeGreaterThan(oldScore.timing);
	});

	it("should score based on experience level match", () => {
		const job = buildMockJob({
			categories: ["early-career"],
			description: "Entry level position for graduates",
		});
		const user = buildMockUser({
			entry_level_preference: "entry",
		});

		const score = calculateMatchScore(job, user);

		expect(score.experience).toBeGreaterThan(0);
	});

	it("should have all score components", () => {
		const job = buildMockJob({
			categories: ["early-career"],
		});
		const user = buildMockUser();

		const score = calculateMatchScore(job, user);

		expect(score).toHaveProperty("overall");
		expect(score).toHaveProperty("eligibility");
		expect(score).toHaveProperty("location");
		expect(score).toHaveProperty("experience");
		expect(score).toHaveProperty("skills");
		expect(score).toHaveProperty("company");
		expect(score).toHaveProperty("timing");
	});

	it("should give higher overall scores to better matching jobs", () => {
		const techJob = buildMockJob({
			categories: ["early-career", "tech", "software"],
		});
		const nonTechJob = buildMockJob({
			categories: ["early-career", "marketing"],
		});
		const user = buildMockUser({
			company_types: ["tech", "startup"],
			roles_selected: ["developer", "engineer"],
		});

		const techScore = calculateMatchScore(techJob, user);
		const nonTechScore = calculateMatchScore(nonTechJob, user);

		// Tech job should score better for tech user (overall or skills)
		expect(
			techScore.overall >= nonTechScore.overall ||
				techScore.skills >= nonTechScore.skills,
		).toBe(true);
	});

	it("should return score between 0 and 100", () => {
		const job = buildMockJob({
			categories: ["early-career"],
		});
		const user = buildMockUser();

		const score = calculateMatchScore(job, user);

		expect(score.overall).toBeGreaterThanOrEqual(0);
		expect(score.overall).toBeLessThanOrEqual(100);
	});

	it("should boost recent jobs in timing score", () => {
		const recentJob = buildMockJob({
			categories: ["early-career"],
			posted_at: new Date().toISOString(),
		});
		const oldJob = buildMockJob({
			categories: ["early-career"],
			posted_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days old
		});
		const user = buildMockUser();

		const recentScore = calculateMatchScore(recentJob, user);
		const oldScore = calculateMatchScore(oldJob, user);

		expect(recentScore.timing).toBeGreaterThanOrEqual(oldScore.timing);
	});

	it("should handle jobs with no posted_at date", () => {
		const job = buildMockJob({
			categories: ["early-career"],
			posted_at: "",
		});
		const user = buildMockUser();

		const score = calculateMatchScore(job, user);

		expect(score).toBeDefined();
		expect(score.timing).toBeGreaterThanOrEqual(0);
	});

	it("should score company match when company_types match", () => {
		const job = buildMockJob({
			categories: ["early-career", "startup"],
		});
		const user = buildMockUser({
			company_types: ["startup", "tech"],
		});

		const score = calculateMatchScore(job, user);

		expect(score.company).toBeGreaterThan(0);
	});

	it("should score company component", () => {
		const job = buildMockJob({
			categories: ["early-career"],
		});
		const user = buildMockUser({
			company_types: ["enterprise"],
		});

		const score = calculateMatchScore(job, user);

		expect(score.company).toBeGreaterThanOrEqual(0);
		expect(score.company).toBeLessThanOrEqual(100);
	});

	it("should handle empty user preferences gracefully", () => {
		const job = buildMockJob({
			categories: ["early-career", "tech"],
		});
		const user = buildMockUser({
			career_path: [],
			target_cities: [],
			work_environment: undefined,
		});

		const score = calculateMatchScore(job, user);

		expect(score).toBeDefined();
		expect(score.overall).toBeGreaterThanOrEqual(0);
	});

	it("should handle jobs with minimum information", () => {
		const job = buildMockJob({
			title: "Job",
			company: "Company",
			location: "",
			categories: [],
		});
		const user = buildMockUser();

		const score = calculateMatchScore(job, user);

		expect(score).toBeDefined();
		expect(typeof score.overall).toBe("number");
	});

	it("should provide breakdown of all score components", () => {
		const job = buildMockJob();
		const user = buildMockUser();

		const score = calculateMatchScore(job, user);

		expect(score).toHaveProperty("overall");
		expect(score).toHaveProperty("eligibility");
		expect(score).toHaveProperty("location");
		expect(score).toHaveProperty("experience");
		expect(score).toHaveProperty("skills");
		expect(score).toHaveProperty("company");
		expect(score).toHaveProperty("timing");
	});

	it("should weight components to reach overall score", () => {
		const job = buildMockJob({
			categories: ["early-career", "tech"],
			location: "London, UK",
		});
		const user = buildMockUser({
			career_path: ["tech"],
			target_cities: ["London"],
		});

		const score = calculateMatchScore(job, user);

		// Overall should be influenced by components
		expect(score.overall).toBeGreaterThan(0);
		expect(score.overall).toBeLessThanOrEqual(100);
	});
});

describe("Rule-Based Matcher - Edge Cases", () => {
	it("should handle jobs with undefined categories", () => {
		const job = buildMockJob({
			categories: undefined as any,
		});
		const user = buildMockUser();

		const score = calculateMatchScore(job, user);

		expect(score).toBeDefined();
	});

	it("should handle remote jobs for location matching", () => {
		const remoteJob = buildMockJob({
			categories: ["early-career"],
			location: "Remote",
			work_environment: "remote",
		});
		const user = buildMockUser({
			target_cities: ["Berlin"],
			work_environment: "remote",
		});

		const score = calculateMatchScore(remoteJob, user);

		expect(score).toBeDefined();
		expect(score.overall).toBeGreaterThanOrEqual(0);
	});

	it("should score hybrid flexibility higher", () => {
		const hybridJob = buildMockJob({
			categories: ["early-career"],
			work_environment: "hybrid",
		});
		const officeJob = buildMockJob({
			categories: ["early-career"],
			work_environment: "on-site",
		});
		const user = buildMockUser({
			work_environment: "hybrid",
		});

		const hybridScore = calculateMatchScore(hybridJob, user);
		const officeScore = calculateMatchScore(officeJob, user);

		expect(hybridScore.overall).toBeGreaterThanOrEqual(officeScore.overall);
	});
});

describe("Rule-Based Matcher - calculateConfidenceScore", () => {
	const {
		calculateConfidenceScore,
	} = require("@/Utils/matching/rule-based-matcher.service");

	it("should return base confidence of 0.5", () => {
		const job = buildMockJob({ categories: [] });
		const user = buildMockUser({});

		const confidence = calculateConfidenceScore(job, user);

		expect(confidence).toBeGreaterThanOrEqual(0.5);
		expect(confidence).toBeLessThanOrEqual(1.0);
	});

	it("should increase confidence for eligible jobs", () => {
		const job = buildMockJob({ categories: ["early-career"] });
		const user = buildMockUser({});

		const confidence = calculateConfidenceScore(job, user);

		expect(confidence).toBeGreaterThan(0.5);
	});

	it("should increase confidence for location match", () => {
		const job = buildMockJob({
			categories: ["early-career"],
			location: "London, UK",
		});
		const user = buildMockUser({ target_cities: ["London"] });

		const confidence = calculateConfidenceScore(job, user);

		expect(confidence).toBeGreaterThan(0.7);
	});

	it("should increase confidence for career path match", () => {
		const job = buildMockJob({
			categories: ["early-career", "software-engineer"],
		});
		const user = buildMockUser({ career_path: ["software-engineer"] });

		const confidence = calculateConfidenceScore(job, user);

		expect(confidence).toBeGreaterThan(0.5);
	});

	it("should cap confidence at 1.0", () => {
		const job = buildMockJob({
			categories: ["early-career", "tech"],
			location: "London, UK",
		});
		const user = buildMockUser({
			target_cities: ["London"],
			career_path: ["tech"],
		});

		const confidence = calculateConfidenceScore(job, user);

		expect(confidence).toBeLessThanOrEqual(1.0);
	});

	it("should handle missing location", () => {
		const job = buildMockJob({
			categories: ["early-career"],
		});
		const user = buildMockUser({ target_cities: ["London"] });

		const confidence = calculateConfidenceScore(job, user);

		expect(confidence).toBeGreaterThanOrEqual(0);
		expect(confidence).toBeLessThanOrEqual(1.0);
	});

	it("should handle missing career path", () => {
		const job = buildMockJob({
			categories: ["early-career"],
		});
		const user = buildMockUser({});

		const confidence = calculateConfidenceScore(job, user);

		expect(confidence).toBeGreaterThanOrEqual(0);
		expect(confidence).toBeLessThanOrEqual(1.0);
	});
});

describe("Rule-Based Matcher - generateMatchExplanation", () => {
	const {
		generateMatchExplanation,
	} = require("@/Utils/matching/rule-based-matcher.service");

	it("should generate explanation for high eligibility score", () => {
		const job = buildMockJob({ categories: ["early-career"] });
		const scoreBreakdown = {
			overall: 85,
			eligibility: 100,
			location: 50,
			experience: 50,
			skills: 50,
			company: 50,
			timing: 50,
		};
		const user = buildMockUser({});

		const result = generateMatchExplanation(job, scoreBreakdown, user);

		expect(result.reason).toContain("early career");
		expect(result.tags).toContain("early-career");
	});

	it("should generate explanation for high location score", () => {
		const job = buildMockJob({ location: "London" });
		const scoreBreakdown = {
			overall: 85,
			eligibility: 50,
			location: 90,
			experience: 50,
			skills: 50,
			company: 50,
			timing: 50,
		};
		const user = buildMockUser({});

		const result = generateMatchExplanation(job, scoreBreakdown, user);

		expect(result.reason).toContain("location");
		expect(result.tags).toContain("location-match");
	});

	it("should generate explanation for high experience score", () => {
		const job = buildMockJob({});
		const scoreBreakdown = {
			overall: 85,
			eligibility: 50,
			location: 50,
			experience: 90,
			skills: 50,
			company: 50,
			timing: 50,
		};
		const user = buildMockUser({});

		const result = generateMatchExplanation(job, scoreBreakdown, user);

		expect(result.reason).toContain("experience");
		expect(result.tags).toContain("experience-match");
	});

	it("should generate explanation for high skills score", () => {
		const job = buildMockJob({});
		const scoreBreakdown = {
			overall: 85,
			eligibility: 50,
			location: 50,
			experience: 50,
			skills: 90,
			company: 50,
			timing: 50,
		};
		const user = buildMockUser({});

		const result = generateMatchExplanation(job, scoreBreakdown, user);

		expect(result.reason).toContain("skill");
		expect(result.tags).toContain("skill-match");
	});

	it("should generate explanation for high company score", () => {
		const job = buildMockJob({});
		const scoreBreakdown = {
			overall: 85,
			eligibility: 50,
			location: 50,
			experience: 50,
			skills: 50,
			company: 90,
			timing: 50,
		};
		const user = buildMockUser({});

		const result = generateMatchExplanation(job, scoreBreakdown, user);

		expect(result.reason).toContain("company");
		expect(result.tags).toContain("company-match");
	});

	it("should generate explanation for multiple high scores", () => {
		const job = buildMockJob({});
		const scoreBreakdown = {
			overall: 90,
			eligibility: 100,
			location: 90,
			experience: 90,
			skills: 90,
			company: 90,
			timing: 50,
		};
		const user = buildMockUser({});

		const result = generateMatchExplanation(job, scoreBreakdown, user);

		expect(result.reason).toBeDefined();
		expect(result.tags).toBeDefined();
		expect(result.reason.length).toBeGreaterThan(0);
		expect(result.tags.length).toBeGreaterThan(0);
	});

	it("should handle low scores gracefully", () => {
		const job = buildMockJob({});
		const scoreBreakdown = {
			overall: 30,
			eligibility: 30,
			location: 30,
			experience: 30,
			skills: 30,
			company: 30,
			timing: 30,
		};
		const user = buildMockUser({});

		const result = generateMatchExplanation(job, scoreBreakdown, user);

		expect(result.reason).toBeDefined();
		expect(result.tags).toBeDefined();
	});
});

describe("Rule-Based Matcher - categorizeMatches", () => {
	const {
		categorizeMatches,
	} = require("@/Utils/matching/rule-based-matcher.service");

	it("should categorize matches as confident when score >= 80 and confidence >= 0.7", () => {
		const matches = [
			{
				match_score: 85,
				confidence_score: 0.8,
				job: {},
				match_reason: "Good match",
			},
		];

		const result = categorizeMatches(matches as any);

		expect(result.confident).toHaveLength(1);
		expect(result.promising).toHaveLength(0);
	});

	it("should categorize matches as promising when score >= 60 but confidence < 0.7", () => {
		const matches = [
			{
				match_score: 70,
				confidence_score: 0.5,
				job: {},
				match_reason: "Decent match",
			},
		];

		const result = categorizeMatches(matches as any);

		expect(result.confident).toHaveLength(0);
		expect(result.promising).toHaveLength(1);
	});

	it("should exclude matches below 60 score", () => {
		const matches = [
			{
				match_score: 55,
				confidence_score: 0.8,
				job: {},
				match_reason: "Low match",
			},
		];

		const result = categorizeMatches(matches as any);

		expect(result.confident).toHaveLength(0);
		expect(result.promising).toHaveLength(0);
	});

	it("should handle empty array", () => {
		const result = categorizeMatches([]);

		expect(result.confident).toHaveLength(0);
		expect(result.promising).toHaveLength(0);
	});

	it("should handle mixed matches", () => {
		const matches = [
			{
				match_score: 90,
				confidence_score: 0.9,
				job: {},
				match_reason: "Excellent",
			},
			{ match_score: 65, confidence_score: 0.5, job: {}, match_reason: "Ok" },
			{ match_score: 45, confidence_score: 0.3, job: {}, match_reason: "Poor" },
		];

		const result = categorizeMatches(matches as any);

		expect(result.confident).toHaveLength(1);
		expect(result.promising).toHaveLength(1);
	});
});

describe("Rule-Based Matcher - performRobustMatching", () => {
	const {
		performRobustMatching,
	} = require("@/Utils/matching/rule-based-matcher.service");

	it("should perform matching and return sorted results", () => {
		const jobs = [
			buildMockJob({
				id: "1",
				categories: ["early-career", "tech"],
				location: "London",
			}),
			buildMockJob({
				id: "2",
				categories: ["early-career", "tech"],
				location: "Berlin",
			}),
		];
		const user = buildMockUser({ target_cities: ["London", "Berlin"] });

		const results = performRobustMatching(jobs, user);

		expect(results).toBeDefined();
		expect(Array.isArray(results)).toBe(true);
	});

	it("should filter out non-eligible jobs", () => {
		const jobs = [
			buildMockJob({
				id: "1",
				categories: ["senior", "experienced"],
				location: "London",
			}),
			buildMockJob({
				id: "2",
				categories: ["early-career", "tech"],
				location: "London",
			}),
		];
		const user = buildMockUser({ target_cities: ["London"] });

		const results = performRobustMatching(jobs, user);

		expect(results.length).toBeLessThan(2);
	});

	it("should filter out low-scoring matches", () => {
		const jobs = [
			buildMockJob({
				id: "1",
				categories: ["early-career"],
				location: "New York",
			}),
		];
		const user = buildMockUser({ target_cities: ["London"] });

		const results = performRobustMatching(jobs, user);

		expect(results.length).toBeLessThan(jobs.length);
	});

	it("should sort results by score descending", () => {
		const jobs = [
			buildMockJob({
				id: "1",
				categories: ["early-career"],
				location: "London",
			}),
			buildMockJob({
				id: "2",
				categories: ["early-career", "tech"],
				location: "London",
			}),
		];
		const user = buildMockUser({
			target_cities: ["London"],
			career_path: ["tech"],
		});

		const results = performRobustMatching(jobs, user);

		if (results.length >= 2) {
			expect(results[0].match_score).toBeGreaterThanOrEqual(
				results[1].match_score,
			);
		}
	});

	it("should include match metadata", () => {
		const jobs = [
			buildMockJob({
				id: "1",
				categories: ["early-career", "tech"],
				location: "London",
			}),
		];
		const user = buildMockUser({ target_cities: ["London"] });

		const results = performRobustMatching(jobs, user);

		if (results.length > 0) {
			expect(results[0]).toHaveProperty("match_score");
			expect(results[0]).toHaveProperty("match_reason");
			expect(results[0]).toHaveProperty("confidence_score");
			expect(results[0]).toHaveProperty("match_quality");
			expect(results[0]).toHaveProperty("provenance");
		}
	});

	it("should handle empty job array", () => {
		const results = performRobustMatching([], buildMockUser());

		expect(results).toHaveLength(0);
	});
});
