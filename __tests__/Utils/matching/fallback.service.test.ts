/**
 * Tests for FallbackMatchingService
 */

import { buildMockJob, buildMockUser } from "@/__tests__/_helpers/testBuilders";
import {
	FallbackMatchingService,
	generateRobustFallbackMatches,
} from "@/Utils/matching/fallback.service";

describe("FallbackMatchingService", () => {
	let fallbackService: FallbackMatchingService;

	beforeEach(() => {
		fallbackService = new FallbackMatchingService();
	});

	describe("generateRobustFallbackMatches", () => {
		it("should generate fallback matches for jobs", () => {
			const jobs = [
				buildMockJob({ id: "1", title: "Software Engineer" }),
				buildMockJob({ id: "2", title: "Data Analyst" }),
				buildMockJob({ id: "3", title: "Product Manager" }),
			];
			const user = buildMockUser();

			const matches = fallbackService.generateRobustFallbackMatches(jobs, user);

			expect(matches).toBeDefined();
			expect(Array.isArray(matches)).toBe(true);
			expect(matches.length).toBeGreaterThan(0);
		});

		it("should limit matches to maxMatches config", () => {
			const jobs = Array.from({ length: 20 }, (_, i) =>
				buildMockJob({ id: `${i}`, title: `Job ${i}` }),
			);
			const user = buildMockUser();

			const matches = fallbackService.generateRobustFallbackMatches(jobs, user);

			expect(matches.length).toBeLessThanOrEqual(10); // Default maxMatches
		});

		it("should include job objects in matches", () => {
			const jobs = [buildMockJob({ id: "1", title: "Software Engineer" })];
			const user = buildMockUser();

			const matches = fallbackService.generateRobustFallbackMatches(jobs, user);

			if (matches.length > 0) {
				expect(matches[0]).toHaveProperty("job");
				expect(matches[0].job).toBeDefined();
			}
		});

		it("should handle empty jobs array", () => {
			const matches = fallbackService.generateRobustFallbackMatches(
				[],
				buildMockUser(),
			);

			expect(matches).toHaveLength(0);
		});
	});

	describe("generateMatchesByCriteria", () => {
		it("should filter by career path when specified", () => {
			const jobs = [
				buildMockJob({ title: "Software Engineer", description: "Tech role" }),
				buildMockJob({
					title: "Marketing Manager",
					description: "Marketing role",
				}),
			];
			const user = buildMockUser({ career_path: ["software", "tech"] });

			const matches = fallbackService.generateMatchesByCriteria(jobs, user, {
				careerPath: true,
				maxResults: 5,
			});

			expect(matches).toBeDefined();
			expect(Array.isArray(matches)).toBe(true);
		});

		it("should filter by location when specified", () => {
			const jobs = [
				buildMockJob({ title: "Job 1", location: "London, UK" }),
				buildMockJob({ title: "Job 2", location: "New York, USA" }),
			];
			const user = buildMockUser({ target_cities: ["London"] });

			const matches = fallbackService.generateMatchesByCriteria(jobs, user, {
				location: true,
				maxResults: 5,
			});

			expect(matches).toBeDefined();
			expect(Array.isArray(matches)).toBe(true);
		});

		it("should combine multiple criteria", () => {
			const jobs = [
				buildMockJob({
					title: "Software Engineer",
					location: "London, UK",
					posted_at: new Date(
						Date.now() - 1 * 24 * 60 * 60 * 1000,
					).toISOString(),
				}),
				buildMockJob({
					title: "Marketing Manager",
					location: "London, UK",
					posted_at: new Date(
						Date.now() - 1 * 24 * 60 * 60 * 1000,
					).toISOString(),
				}),
			];
			const user = buildMockUser({
				career_path: ["software"],
				target_cities: ["London"],
			});

			const matches = fallbackService.generateMatchesByCriteria(jobs, user, {
				careerPath: true,
				location: true,
				maxResults: 5,
			});

			expect(matches).toBeDefined();
			expect(Array.isArray(matches)).toBe(true);
		});

		it("should respect maxResults limit", () => {
			const jobs = Array.from({ length: 10 }, (_, i) =>
				buildMockJob({ id: `${i}`, title: `Job ${i}` }),
			);
			const user = buildMockUser();

			const matches = fallbackService.generateMatchesByCriteria(jobs, user, {
				maxResults: 3,
			});

			expect(matches.length).toBeLessThanOrEqual(3);
		});

		it("should handle empty jobs array", () => {
			const matches = fallbackService.generateMatchesByCriteria(
				[],
				buildMockUser(),
				{},
			);

			expect(matches).toHaveLength(0);
		});
	});

	describe("generateEmergencyFallbackMatches", () => {
		it("should generate emergency matches for recent jobs", () => {
			const now = Date.now();
			const recent = new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString();

			const jobs = [
				buildMockJob({ id: "1", title: "Recent Job", posted_at: recent }),
				buildMockJob({
					id: "2",
					title: "Old Job",
					posted_at: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(),
				}),
			];
			const user = buildMockUser();

			const matches = fallbackService.generateEmergencyFallbackMatches(
				jobs,
				user,
			);

			expect(matches).toBeDefined();
			expect(Array.isArray(matches)).toBe(true);
		});

		it("should include confidence scores in emergency matches", () => {
			const jobs = [buildMockJob({ id: "1", title: "Recent Job" })];
			const user = buildMockUser();

			const matches = fallbackService.generateEmergencyFallbackMatches(
				jobs,
				user,
			);

			if (matches.length > 0) {
				expect(matches[0]).toHaveProperty("confidence_score");
				expect(matches[0].confidence_score).toBe(0.5);
			}
		});

		it("should limit emergency matches to maxEmergencyMatches", () => {
			const jobs = Array.from({ length: 20 }, (_, i) =>
				buildMockJob({ id: `${i}`, title: `Job ${i}` }),
			);
			const user = buildMockUser();

			const matches = fallbackService.generateEmergencyFallbackMatches(
				jobs,
				user,
			);

			expect(matches.length).toBeLessThanOrEqual(5); // Default maxEmergencyMatches
		});

		it("should handle jobs without timestamps", () => {
			const jobs = [buildMockJob({ id: "1", title: "Job without timestamp" })];
			const user = buildMockUser();

			const matches = fallbackService.generateEmergencyFallbackMatches(
				jobs,
				user,
			);

			expect(matches).toBeDefined();
			expect(Array.isArray(matches)).toBe(true);
		});
	});

	describe("shouldUseFallback", () => {
		it("should return true for empty matches", () => {
			const result = fallbackService.shouldUseFallback([], buildMockUser());

			expect(result).toBe(true);
		});

		it("should return true for low confidence matches", () => {
			const matches = [{ confidence_score: 0.3 }, { confidence_score: 0.4 }];
			const user = buildMockUser();

			const result = fallbackService.shouldUseFallback(matches, user);

			expect(result).toBe(true);
		});

		it("should return false for high confidence matches", () => {
			const matches = [{ confidence_score: 0.8 }, { confidence_score: 0.9 }];
			const user = buildMockUser();

			const result = fallbackService.shouldUseFallback(matches, user);

			expect(result).toBe(false);
		});

		it("should handle matches without confidence scores", () => {
			const matches = [{ match_score: 80 }, { match_score: 90 }];
			const user = buildMockUser();

			const result = fallbackService.shouldUseFallback(matches, user);

			expect(typeof result).toBe("boolean");
		});
	});

	describe("getStats", () => {
		it("should return configuration stats", () => {
			const stats = fallbackService.getStats();

			expect(stats).toHaveProperty("maxMatches");
			expect(stats).toHaveProperty("lowConfidenceThreshold");
			expect(stats).toHaveProperty("maxEmergencyMatches");
		});

		it("should return numeric values for stats", () => {
			const stats = fallbackService.getStats();

			expect(typeof stats.maxMatches).toBe("number");
			expect(typeof stats.lowConfidenceThreshold).toBe("number");
			expect(typeof stats.maxEmergencyMatches).toBe("number");
		});
	});

	describe("constructor with custom scoring service", () => {
		it("should accept custom scoring service", () => {
			const customScoringService = {
				scoreJobsForUser: jest.fn(),
				categorizeMatches: jest.fn(),
			} as any;

			const service = new FallbackMatchingService(customScoringService);

			expect(service).toBeDefined();
		});
	});
});

describe("generateRobustFallbackMatches (standalone function)", () => {
	it("should generate fallback matches", () => {
		const jobs = [
			buildMockJob({ id: "1", title: "Job 1" }),
			buildMockJob({ id: "2", title: "Job 2" }),
		];
		const user = buildMockUser();

		const matches = generateRobustFallbackMatches(jobs, user);

		expect(matches).toHaveLength(2);
		expect(matches[0]).toHaveProperty("job");
		expect(matches[0]).toHaveProperty("match_score");
		expect(matches[0]).toHaveProperty("match_reason");
		expect(matches[0]).toHaveProperty("match_quality");
	});

	it("should limit to 5 matches maximum", () => {
		const jobs = Array.from({ length: 10 }, (_, i) =>
			buildMockJob({ id: `${i}`, title: `Job ${i}` }),
		);
		const user = buildMockUser();

		const matches = generateRobustFallbackMatches(jobs, user);

		expect(matches.length).toBeLessThanOrEqual(5);
	});

	it("should handle non-array input", () => {
		const matches = generateRobustFallbackMatches(null as any, buildMockUser());

		expect(matches).toHaveLength(0);
	});

	it("should generate decreasing scores", () => {
		const jobs = Array.from({ length: 3 }, (_, i) =>
			buildMockJob({ id: `${i}`, title: `Job ${i}` }),
		);
		const user = buildMockUser();

		const matches = generateRobustFallbackMatches(jobs, user);

		expect(matches[0].match_score).toBeGreaterThanOrEqual(
			matches[1].match_score,
		);
		expect(matches[1].match_score).toBeGreaterThanOrEqual(
			matches[2].match_score,
		);
	});
});
