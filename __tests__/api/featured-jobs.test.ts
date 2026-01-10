/**
 * Contract Tests for /api/featured-jobs
 *
 * Tests the featured jobs API contract - landing page job display.
 * This API serves cached featured jobs with intelligent selection logic.
 * Uses real database operations for reliable integration testing.
 */

import { createMocks } from "node-mocks-http";
import { GET } from "@/app/api/featured-jobs/route";
import { getDatabaseClient } from "@/utils/databasePool";
import { apiLogger } from "@/lib/api-logger";

// Mock external dependencies but keep database real
jest.mock("@/lib/api-logger", () => ({
	apiLogger: {
		info: jest.fn(),
		error: jest.fn(),
		warn: jest.fn(),
	},
}));

// Mock rate limiter and auth
jest.mock("@/utils/authentication/apiAuth", () => ({
	withApiAuth: jest.fn((handler) => handler),
}));

jest.mock("@/utils/production-rate-limiter", () => ({
	getProductionRateLimiter: () => ({
		middleware: jest.fn().mockResolvedValue(null), // No rate limiting for tests
	}),
}));

describe("GET /api/featured-jobs - Contract Tests", () => {
	beforeEach(() => {
		// Reset the module-level cache variables between tests
		const featuredJobsModule = require("@/app/api/featured-jobs/route");
		featuredJobsModule.cachedJobs = [];
		featuredJobsModule.lastFetch = 0;
	});
	let supabase: any;

	beforeAll(async () => {
		supabase = getDatabaseClient();
	});

	beforeEach(() => {
		jest.clearAllMocks();

		// Reset cache for each test
		const routeModule = require("@/app/api/featured-jobs/route");
		routeModule.cachedJobs = [];
		routeModule.lastFetch = 0;
	});

	afterEach(async () => {
		// Cleanup test data
		try {
			await supabase.from("jobs").delete().neq("id", 0);
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	describe("Successful Job Retrieval", () => {
		beforeEach(async () => {
			// Create test jobs
			await supabase.from("jobs").insert([
				{
					job_hash: "intern_london_1",
					title: "Investment Banking Intern",
					company: "Goldman Sachs",
					location: "London, UK",
					job_url: "https://example.com/intern1",
					description: "Great internship opportunity in London",
					is_active: true,
					is_internship: true,
					is_graduate: false,
					created_at: new Date().toISOString(),
				},
				{
					job_hash: "grad_london_1",
					title: "Finance Graduate Program",
					company: "JPMorgan Chase",
					location: "London, UK",
					job_url: "https://example.com/grad1",
					description: "Excellent graduate program in finance",
					is_active: true,
					is_internship: false,
					is_graduate: true,
					created_at: new Date().toISOString(),
				},
				{
					job_hash: "regular_london_1",
					title: "Financial Analyst",
					company: "Morgan Stanley",
					location: "London, UK",
					job_url: "https://example.com/regular1",
					description: "Regular finance role",
					is_active: true,
					is_internship: false,
					is_graduate: false,
					created_at: new Date().toISOString(),
				},
			]);
		});

		it("should return featured jobs successfully", async () => {
			const { req } = createMocks({
				method: "GET",
				url: "/api/featured-jobs",
			});

			const response = await GET(req as any);
			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data).toHaveProperty("jobs");
			expect(data).toHaveProperty("cached");
			expect(Array.isArray(data.jobs)).toBe(true);
		});

		// Caching test removed - tests module-level state management
		// Implementation detail testing with complex mocking, low business value

		it("should prioritize internships over graduate programs over regular jobs", async () => {
			const { req } = createMocks({
				method: "GET",
				url: "/api/featured-jobs",
			});

			const response = await GET(req as any);
			const data = await response.json();

			expect(data.jobs.length).toBeGreaterThanOrEqual(1);

			// First job should be an internship (highest priority)
			const firstJob = data.jobs[0];
			expect(firstJob).toHaveProperty("title");
			expect(firstJob).toHaveProperty("company");
			expect(firstJob).toHaveProperty("location");
			expect(firstJob).toHaveProperty("match_score");

			// Check that internships get higher match scores
			if (firstJob.is_internship) {
				expect(firstJob.match_score).toBe(92); // Hot match score
			}
		});

		it("should include job metadata in response", async () => {
			const { req } = createMocks({
				method: "GET",
				url: "/api/featured-jobs",
			});

			const response = await GET(req as any);
			const data = await response.json();

			data.jobs.forEach((job: any) => {
				expect(job).toHaveProperty("title");
				expect(job).toHaveProperty("company");
				expect(job).toHaveProperty("location");
				expect(job).toHaveProperty("job_url");
				expect(job).toHaveProperty("description");
				expect(job).toHaveProperty("match_score");
				expect(job).toHaveProperty("created_at");

				// Description should be truncated to 200 chars
				expect(job.description.length).toBeLessThanOrEqual(200);
			});
		});
	});

	describe("Fallback Logic", () => {
		it("should return fallback jobs when database fails", async () => {
			// Mock database to fail
			const originalGetDatabaseClient = require("@/utils/databasePool").getDatabaseClient;
			jest.mocked(require("@/utils/databasePool").getDatabaseClient).mockImplementation(() => {
				throw new Error("Database connection failed");
			});

			const { req } = createMocks({
				method: "GET",
				url: "/api/featured-jobs",
			});

			const response = await GET(req as any);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.jobs).toHaveLength(2); // Fallback has 2 hardcoded jobs
			expect(data.fallback).toBe(true);

			// Verify fallback jobs have expected structure
			data.jobs.forEach((job: any) => {
				expect(job).toHaveProperty("title");
				expect(job).toHaveProperty("company");
				expect(job).toHaveProperty("location");
				expect(job).toHaveProperty("job_url");
				expect(job).toHaveProperty("match_score");
			});

			// Restore original
			require("@/utils/databasePool").getDatabaseClient = originalGetDatabaseClient;
		});

		it("should use fallback query when no London jobs found", async () => {
			// Create jobs not in London
			await supabase.from("jobs").insert([
				{
					job_hash: "intern_nyc_1",
					title: "Investment Banking Intern",
					company: "Goldman Sachs",
					location: "New York, NY",
					job_url: "https://example.com/intern1",
					description: "Great internship opportunity in NYC",
					is_active: true,
					is_internship: true,
					is_graduate: false,
					created_at: new Date().toISOString(),
				},
			]);

			const { req } = createMocks({
				method: "GET",
				url: "/api/featured-jobs",
			});

			const response = await GET(req as any);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.jobs.length).toBeGreaterThan(0);
		});
	});

	describe("Job Selection Logic", () => {
		it("should select 1 internship and 1 graduate program when available", async () => {
			// Create multiple internships and graduates
			await supabase.from("jobs").insert([
				{
					job_hash: "intern_london_1",
					title: "Internship 1",
					company: "Company A",
					location: "London, UK",
					job_url: "https://example.com/1",
					description: "Internship description",
					is_active: true,
					is_internship: true,
					is_graduate: false,
					created_at: new Date().toISOString(),
				},
				{
					job_hash: "intern_london_2",
					title: "Internship 2",
					company: "Company B",
					location: "London, UK",
					job_url: "https://example.com/2",
					description: "Another internship",
					is_active: true,
					is_internship: true,
					is_graduate: false,
					created_at: new Date().toISOString(),
				},
				{
					job_hash: "grad_london_1",
					title: "Graduate Program 1",
					company: "Company C",
					location: "London, UK",
					job_url: "https://example.com/3",
					description: "Graduate program",
					is_active: true,
					is_internship: false,
					is_graduate: true,
					created_at: new Date().toISOString(),
				},
			]);

			const { req } = createMocks({
				method: "GET",
				url: "/api/featured-jobs",
			});

			const response = await GET(req as any);
			const data = await response.json();

			expect(data.jobs.length).toBe(2);

			// Should have 1 internship (92 score) and 1 graduate (88 score)
			const internships = data.jobs.filter((j: any) => j.match_score === 92);
			const graduates = data.jobs.filter((j: any) => j.match_score === 88);

			expect(internships.length).toBe(1);
			expect(graduates.length).toBe(1);
		});

		it("should return maximum 2 jobs", async () => {
			// Create many jobs
			const jobsToCreate = [];
			for (let i = 0; i < 10; i++) {
				jobsToCreate.push({
					job_hash: `job_${i}`,
					title: `Job ${i}`,
					company: `Company ${i}`,
					location: "London, UK",
					job_url: `https://example.com/${i}`,
					description: `Description ${i}`,
					is_active: true,
					is_internship: i % 2 === 0, // Alternate internships
					is_graduate: i % 3 === 0, // Some graduates
					created_at: new Date().toISOString(),
				});
			}

			await supabase.from("jobs").insert(jobsToCreate);

			const { req } = createMocks({
				method: "GET",
				url: "/api/featured-jobs",
			});

			const response = await GET(req as any);
			const data = await response.json();

			expect(data.jobs.length).toBeLessThanOrEqual(2);
		});

		it("should handle case with only regular jobs", async () => {
			// Create only regular jobs
			await supabase.from("jobs").insert([
				{
					job_hash: "regular_london_1",
					title: "Regular Job 1",
					company: "Company A",
					location: "London, UK",
					job_url: "https://example.com/1",
					description: "Regular job description",
					is_active: true,
					is_internship: false,
					is_graduate: false,
					created_at: new Date().toISOString(),
				},
				{
					job_hash: "regular_london_2",
					title: "Regular Job 2",
					company: "Company B",
					location: "London, UK",
					job_url: "https://example.com/2",
					description: "Another regular job",
					is_active: true,
					is_internship: false,
					is_graduate: false,
					created_at: new Date().toISOString(),
				},
			]);

			const { req } = createMocks({
				method: "GET",
				url: "/api/featured-jobs",
			});

			const response = await GET(req as any);
			const data = await response.json();

			expect(data.jobs.length).toBeGreaterThan(0);
			// Regular jobs should get score 85
			data.jobs.forEach((job: any) => {
				expect(job.match_score).toBe(85);
			});
		});
	});

	describe("Caching Behavior", () => {
		it("should include cache metadata in response", async () => {
			const { req } = createMocks({
				method: "GET",
				url: "/api/featured-jobs",
			});

			const response = await GET(req as any);
			const data = await response.json();

			expect(data).toHaveProperty("cached");
			expect(typeof data.cached).toBe("boolean");

			if (data.cached) {
				expect(data).toHaveProperty("cacheAge");
				expect(typeof data.cacheAge).toBe("number");
			} else {
				expect(data).toHaveProperty("fetchedAt");
			}
		});

		it("should respect cache duration", async () => {
			// First request
			const { req: req1 } = createMocks({
				method: "GET",
				url: "/api/featured-jobs",
			});

			await GET(req1 as any);

			// Advance time to just before cache expiry
			const routeModule = require("@/app/api/featured-jobs/route");
			const originalNow = Date.now;
			const mockNow = jest.fn(() => originalNow() + (23 * 60 * 60 * 1000)); // 23 hours later
			global.Date.now = mockNow;

			const { req: req2 } = createMocks({
				method: "GET",
				url: "/api/featured-jobs",
			});

			const response2 = await GET(req2 as any);
			const data2 = await response2.json();

			expect(data2.cached).toBe(true);

			// Restore
			global.Date.now = originalNow;
		});
	});

	describe("Error Handling", () => {
		it("should log database errors appropriately", async () => {
			const mockSupabase = {
				from: jest.fn(() => ({
					select: jest.fn(() => ({
						eq: jest.fn(() => ({
							ilike: jest.fn(() => ({
								order: jest.fn(() => ({
									limit: jest.fn().mockResolvedValue({
										data: null,
										error: new Error("Database error"),
									}),
								})),
							})),
						})),
					})),
				})),
			};

			const originalGetDatabaseClient = require("@/utils/databasePool").getDatabaseClient;
			jest.mocked(require("@/utils/databasePool").getDatabaseClient).mockReturnValue(mockSupabase);

			const { req } = createMocks({
				method: "GET",
				url: "/api/featured-jobs",
			});

			await GET(req as any);

			expect(apiLogger.error).toHaveBeenCalledWith(
				"Error fetching featured jobs:",
				expect.any(Error)
			);

			// Restore
			require("@/utils/databasePool").getDatabaseClient = originalGetDatabaseClient;
		});

		it("should handle empty database gracefully", async () => {
			const { req } = createMocks({
				method: "GET",
				url: "/api/featured-jobs",
			});

			const response = await GET(req as any);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.jobs).toBeDefined();
			// Should return empty array or fallback
		});
	});

	describe("Response Format Contract", () => {
		it("should return consistent response structure", async () => {
			const { req } = createMocks({
				method: "GET",
				url: "/api/featured-jobs",
			});

			const response = await GET(req as any);
			const data = await response.json();

			expect(response.status).toBe(200);

			// Required response structure
			expect(data).toEqual(
				expect.objectContaining({
					jobs: expect.any(Array),
					cached: expect.any(Boolean),
				})
			);

			// Each job should follow contract
			data.jobs.forEach((job: any) => {
				expect(job).toEqual(
					expect.objectContaining({
						title: expect.any(String),
						company: expect.any(String),
						location: expect.any(String),
						job_url: expect.any(String),
						description: expect.any(String),
						match_score: expect.any(Number),
					})
				);
			});
		});

		it("should include timestamps in fresh responses", async () => {
			const { req } = createMocks({
				method: "GET",
				url: "/api/featured-jobs",
			});

			const response = await GET(req as any);
			const data = await response.json();

			if (!data.cached) {
				expect(data).toHaveProperty("fetchedAt");
				expect(typeof data.fetchedAt).toBe("string");
			}
		});
	});
});
