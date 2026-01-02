/**
 * Comprehensive tests for Pre-Filter Jobs
 * Tests location matching, scoring, feedback learning
 */

import { preFilterJobsByUserPreferencesEnhanced } from "@/Utils/matching/preFilterJobs";

jest.mock("@/Utils/databasePool");
jest.mock("@/Utils/matching/categoryMapper", () => ({
	getDatabaseCategoriesForForm: jest.fn((formValue: string) => {
		const mapping: Record<string, string[]> = {
			strategy: ["strategy-business-design"],
			finance: ["finance-investment"],
		};
		return mapping[formValue] || [];
	}),
}));
// Sentry removed - using Axiom for error tracking

describe("Pre-Filter Jobs", () => {
	let mockSupabase: any;

	beforeEach(() => {
		jest.clearAllMocks();

		mockSupabase = {
			from: jest.fn().mockReturnThis(),
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			gte: jest.fn().mockReturnThis(),
			limit: jest.fn().mockResolvedValue({
				data: [],
				error: null,
			}),
		};

		const { getDatabaseClient } = require("@/Utils/databasePool");
		getDatabaseClient.mockReturnValue(mockSupabase);
	});

	const buildMockJob = (overrides: any = {}) => ({
		id: "job1",
		title: "Software Engineer",
		description: "Great opportunity",
		location: "London, UK",
		city: "London",
		source: "greenhouse",
		company: "Tech Corp",
		freshnessTier: "fresh",
		...overrides,
	});

	describe("Location Filtering", () => {
		it("should filter jobs by target cities", async () => {
			const jobs = [
				buildMockJob({ location: "London, UK" }),
				buildMockJob({ location: "Paris, France" }),
				buildMockJob({ location: "Berlin, Germany" }),
			];

			const user = {
				email: "user@example.com",
				target_cities: ["London"],
			};

			const result = await preFilterJobsByUserPreferencesEnhanced(jobs, user);

			expect(result.length).toBe(1);
			expect(result[0].location).toContain("London");
		});

		it("should handle multiple target cities", async () => {
			const jobs = [
				buildMockJob({ location: "London, UK" }),
				buildMockJob({ location: "Paris, France" }),
				buildMockJob({ location: "Berlin, Germany" }),
			];

			const user = {
				email: "user@example.com",
				target_cities: ["London", "Paris"],
			};

			const result = await preFilterJobsByUserPreferencesEnhanced(jobs, user);

			expect(result.length).toBe(2);
		});

		it("should allow remote jobs", async () => {
			const jobs = [
				buildMockJob({ location: "Remote" }),
				buildMockJob({ location: "London, UK" }),
			];

			const user = {
				email: "user@example.com",
				target_cities: ["London"],
			};

			const result = await preFilterJobsByUserPreferencesEnhanced(jobs, user);

			expect(
				result.some((j) => j.location.toLowerCase().includes("remote")),
			).toBe(true);
		});
	});

	describe("Scoring System", () => {
		it("should score jobs with career path match", async () => {
			const jobs = [
				buildMockJob({
					title: "Strategy Consultant",
					description: "Strategy role",
					categories: ["strategy-business-design"],
				}),
			];

			const user = {
				email: "user@example.com",
				target_cities: ["London"],
				career_path: ["strategy"],
			};

			const result = await preFilterJobsByUserPreferencesEnhanced(jobs, user);

			expect(result.length).toBeGreaterThan(0);
		});

		it("should score jobs with role match", async () => {
			const jobs = [
				buildMockJob({
					title: "Financial Analyst",
					description: "Analyst role",
				}),
			];

			const user = {
				email: "user@example.com",
				target_cities: ["London"],
				roles_selected: ["Analyst"],
			};

			const result = await preFilterJobsByUserPreferencesEnhanced(jobs, user);

			expect(result.length).toBeGreaterThan(0);
		});

		it("should apply work environment scoring", async () => {
			const jobs = [
				buildMockJob({
					location: "Remote",
					work_environment: "remote",
				}),
			];

			const user = {
				email: "user@example.com",
				target_cities: ["London"],
				work_environment: "remote",
			};

			const result = await preFilterJobsByUserPreferencesEnhanced(jobs, user);

			expect(result.length).toBeGreaterThan(0);
		});
	});

	describe("Feedback Learning", () => {
		it("should load feedback boosts", async () => {
			mockSupabase.limit.mockResolvedValue({
				data: [
					{
						relevance_score: 5,
						job_context: {
							location: "Berlin",
							company: "Startup Inc",
						},
					},
				],
				error: null,
			});

			const jobs = [buildMockJob({ location: "Berlin, Germany" })];

			const user = {
				email: "user@example.com",
				target_cities: ["Berlin"],
			};

			await preFilterJobsByUserPreferencesEnhanced(jobs, user);

			expect(mockSupabase.from).toHaveBeenCalledWith("user_feedback");
		});

		it("should boost jobs based on feedback", async () => {
			mockSupabase.limit.mockResolvedValue({
				data: [
					{
						relevance_score: 5,
						job_context: { location: "Berlin" },
					},
				],
				error: null,
			});

			const jobs = [buildMockJob({ location: "Berlin, Germany" })];

			const user = {
				email: "user@example.com",
				target_cities: ["Berlin"],
			};

			const result = await preFilterJobsByUserPreferencesEnhanced(jobs, user);

			expect(result.length).toBeGreaterThan(0);
		});
	});

	describe("Edge Cases", () => {
		it("should handle empty jobs array", async () => {
			const user = {
				email: "user@example.com",
				target_cities: ["London"],
			};

			const result = await preFilterJobsByUserPreferencesEnhanced([], user);

			expect(result).toEqual([]);
		});

		it("should handle user with no preferences", async () => {
			const jobs = [buildMockJob()];

			const user = {
				email: "user@example.com",
			};

			const result = await preFilterJobsByUserPreferencesEnhanced(jobs, user);

			expect(result.length).toBeGreaterThan(0);
		});

		it("should handle database errors gracefully", async () => {
			mockSupabase.limit.mockRejectedValue(new Error("DB error"));

			const jobs = [buildMockJob()];

			const user = {
				email: "user@example.com",
				target_cities: ["London"],
			};

			const result = await preFilterJobsByUserPreferencesEnhanced(jobs, user);

			expect(result).toBeDefined();
		});
	});
});
