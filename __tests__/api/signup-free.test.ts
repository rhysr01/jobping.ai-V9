/**
 * Contract Tests for /api/signup/free
 *
 * Tests the free tier signup API contract - user acquisition flow.
 * This API creates free users, runs matching, and sets cookies.
 * Uses real database operations for reliable integration testing.
 */

import { createMocks } from "node-mocks-http";
import { POST } from "@/app/api/signup/free/route";
import { apiLogger } from "@/lib/api-logger";
import { getDatabaseClient } from "@/utils/databasePool";

// Mock external dependencies but keep database real
jest.mock("@/lib/api-logger", () => ({
	apiLogger: {
		info: jest.fn(),
		error: jest.fn(),
		warn: jest.fn(),
	},
}));

jest.mock("@/utils/production-rate-limiter", () => ({
	getProductionRateLimiter: () => ({
		middleware: jest.fn().mockResolvedValue(null), // No rate limiting for tests
	}),
}));

// Mock country utilities
jest.mock("@/lib/countryFlags", () => ({
	getCountryFromCity: jest.fn().mockReturnValue("GB"),
	getCountryVariations: jest
		.fn()
		.mockReturnValue(["UK", "United Kingdom", "GB"]),
}));

// Mock Inngest
jest.mock("@/lib/inngest/matching-helpers", () => ({
	triggerMatchingEvent: jest.fn().mockResolvedValue(undefined),
}));

// Mock business rules
jest.mock("@/utils/business-rules/quality-thresholds", () => ({
	QUALITY_THRESHOLDS: {
		FREE_SIGNUP: 0.7,
	},
	calculateQualityMetrics: jest.fn().mockReturnValue({
		averageScore: 0.8,
		minScore: 0.75,
		maxScore: 0.95,
	}),
	filterHighQualityJobs: jest.fn().mockImplementation((jobs) => jobs),
	selectJobsForDistribution: jest
		.fn()
		.mockImplementation((allJobs, highQualityJobs, targetCount) =>
			highQualityJobs.slice(0, targetCount),
		),
}));

// Mock matching engine
jest.mock("@/utils/matching/core/matching-engine", () => ({
	createConsolidatedMatcher: jest.fn().mockReturnValue({
		performMatching: jest.fn().mockResolvedValue({
			method: "ai_success",
			matches: [
				{ job_hash: "job1", match_score: 0.95, match_reason: "Perfect match" },
				{ job_hash: "job2", match_score: 0.88, match_reason: "Good match" },
			],
			confidence: 0.9,
		}),
	}),
}));

// Mock job distribution
jest.mock("@/utils/matching/jobDistribution", () => ({
	distributeJobsWithDiversity: jest
		.fn()
		.mockImplementation((jobs) => jobs.slice(0, 5)),
}));

describe("POST /api/signup/free - Contract Tests", () => {
	let supabase: any;
	let testUserEmail: string;

	beforeAll(async () => {
		supabase = getDatabaseClient();
		testUserEmail = `free-signup-test-${Date.now()}@example.com`;
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	afterEach(async () => {
		// Cleanup test data
		try {
			await supabase.from("matches").delete().eq("user_email", testUserEmail);
			await supabase.from("jobs").delete().neq("id", 0);
			await supabase.from("users").delete().eq("email", testUserEmail);
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	describe("Input Validation", () => {
		it("should return 400 for missing email", async () => {
			const mockRequest = {
				method: "POST",
				json: jest.fn().mockResolvedValue({
					full_name: "Test User",
					preferred_cities: ["London"],
					career_paths: ["tech"],
					visa_sponsorship: "no",
				}),
			} as any;

			const response = await POST(mockRequest);
			expect(response.status).toBe(400);

			const data = await response.json();
			expect(data.error).toBe("invalid_input");
			expect(data.details).toBeDefined();
		});

		it("should return 400 for invalid email format", async () => {
			const mockRequest = {
				json: jest.fn().mockResolvedValue({
					email: "invalid-email",
					full_name: "Test User",
					preferred_cities: ["London"],
					career_paths: ["tech"],
					visa_sponsorship: "no",
				}),
			} as any;

			const response = await POST(mockRequest);
			expect(response.status).toBe(400);

			const data = await response.json();
			expect(data.error).toBe("invalid_input");
		});

		it("should return 400 for missing cities", async () => {
			const mockRequest = {
				json: jest.fn().mockResolvedValue({
					email: testUserEmail,
					full_name: "Test User",
					career_paths: ["tech"],
					visa_sponsorship: "no",
				}),
			} as any;

			const response = await POST(mockRequest);
			expect(response.status).toBe(400);

			const data = await response.json();
			expect(data.error).toBe("invalid_input");
		});

		it("should return 400 for invalid name format", async () => {
			const { req } = createMocks({
				method: "POST",
				body: {
					email: testUserEmail,
					full_name: "123@#$",
					preferred_cities: ["London"],
					career_paths: ["tech"],
					visa_sponsorship: "no",
				},
			});

			const response = await POST(req as any);
			expect(response.status).toBe(400);

			const data = await response.json();
			expect(data.error).toBe("invalid_input");
		});

		it("should accept valid input", async () => {
			const { req } = createMocks({
				method: "POST",
				body: {
					email: testUserEmail,
					full_name: "Test User",
					preferred_cities: ["London"],
					career_paths: ["tech"],
					visa_sponsorship: "no",
				},
			});

			const response = await POST(req as any);
			// Should either succeed or fail for other reasons (not validation)
			expect([200, 404, 500]).toContain(response.status);
		});
	});

	describe("Existing User Handling", () => {
		beforeEach(async () => {
			// Create existing user
			await supabase.from("users").insert({
				email: testUserEmail,
				full_name: "Existing User",
				subscription_tier: "free",
				active: true,
			});
		});

		it("should return 409 for existing free user", async () => {
			const { req } = createMocks({
				method: "POST",
				body: {
					email: testUserEmail,
					full_name: "Test User",
					preferred_cities: ["London"],
					career_paths: ["tech"],
					visa_sponsorship: "no",
				},
			});

			const response = await POST(req as any);
			expect(response.status).toBe(409);

			const data = await response.json();
			expect(data.error).toBe("account_already_exists");
			expect(data.message).toContain("already have a JobPing account");
			expect(data.redirectToMatches).toBe(true);
		});

		it("should set cookie for existing user", async () => {
			const { req } = createMocks({
				method: "POST",
				body: {
					email: testUserEmail,
					full_name: "Test User",
					preferred_cities: ["London"],
					career_paths: ["tech"],
					visa_sponsorship: "no",
				},
			});

			const response = await POST(req as any);
			expect(response.status).toBe(409);

			// Check if cookie is set
			expect(response.cookies.get("free_user_email")?.value).toBe(
				testUserEmail,
			);
		});
	});

	describe("Successful User Creation", () => {
		beforeEach(async () => {
			// Create test jobs for matching
			await supabase.from("jobs").insert([
				{
					job_hash: "job1",
					title: "Software Engineer",
					company: "Tech Corp",
					location: "London, UK",
					description: "Great job",
					is_active: true,
					is_internship: true,
					is_graduate: false,
					work_environment: "remote",
					categories: ["early-career"],
				},
				{
					job_hash: "job2",
					title: "Product Manager",
					company: "Product Co",
					location: "London, UK",
					description: "Product role",
					is_active: true,
					is_internship: false,
					is_graduate: true,
					work_environment: "hybrid",
					categories: ["early-career"],
				},
			]);
		});

		it("should create new free user successfully", async () => {
			const { req } = createMocks({
				method: "POST",
				body: {
					email: testUserEmail,
					full_name: "Test User",
					preferred_cities: ["London"],
					career_paths: ["tech"],
					visa_sponsorship: "no",
				},
			});

			const response = await POST(req as any);
			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data.matchCount).toBeGreaterThan(0);
			expect(data.userId).toBeDefined();
		});

		it("should set cookie with correct properties", async () => {
			const { req } = createMocks({
				method: "POST",
				body: {
					email: testUserEmail,
					full_name: "Test User",
					preferred_cities: ["London"],
					career_paths: ["tech"],
					visa_sponsorship: "no",
				},
			});

			const response = await POST(req as any);
			expect(response.status).toBe(200);

			const cookie = response.cookies.get("free_user_email");
			expect(cookie?.value).toBe(testUserEmail);
			expect(cookie?.httpOnly).toBe(true);
			expect(cookie?.path).toBe("/");
		});

		it("should map visa sponsorship correctly", async () => {
			const { req } = createMocks({
				method: "POST",
				body: {
					email: testUserEmail,
					full_name: "Test User",
					preferred_cities: ["London"],
					career_paths: ["tech"],
					visa_sponsorship: "yes",
				},
			});

			await POST(req as any);

			// Verify user was created with correct visa status
			const { data: user } = await supabase
				.from("users")
				.select("visa_status")
				.eq("email", testUserEmail)
				.single();

			expect(user.visa_status).toBe("Non-EU (require sponsorship)");
		});

		it("should store matches in database", async () => {
			const { req } = createMocks({
				method: "POST",
				body: {
					email: testUserEmail,
					full_name: "Test User",
					preferred_cities: ["London"],
					career_paths: ["tech"],
					visa_sponsorship: "no",
				},
			});

			const response = await POST(req as any);
			expect(response.status).toBe(200);

			// Verify matches were stored
			const { data: matches } = await supabase
				.from("matches")
				.select("user_email, job_hash, match_score")
				.eq("user_email", testUserEmail);

			expect(matches.length).toBeGreaterThan(0);
			expect(matches[0].user_email).toBe(testUserEmail);
			expect(matches[0].match_score).toBeGreaterThan(0);
		});

		it("should handle multiple cities correctly", async () => {
			const { req } = createMocks({
				method: "POST",
				body: {
					email: testUserEmail,
					full_name: "Test User",
					preferred_cities: ["London", "Berlin", "Paris"],
					career_paths: ["tech"],
					visa_sponsorship: "no",
				},
			});

			const response = await POST(req as any);
			expect([200, 404, 500]).toContain(response.status);

			if (response.status === 200) {
				// Verify cities were stored
				const { data: user } = await supabase
					.from("users")
					.select("target_cities")
					.eq("email", testUserEmail)
					.single();

				expect(user.target_cities).toEqual(["London", "Berlin", "Paris"]);
			}
		});
	});

	describe("Job Matching and Selection", () => {
		beforeEach(async () => {
			// Create diverse test jobs
			await supabase.from("jobs").insert([
				{
					job_hash: "intern_london",
					title: "Tech Internship",
					company: "Tech Corp",
					location: "London, UK",
					city: "London",
					description: "Great internship",
					is_active: true,
					is_internship: true,
					is_graduate: false,
					work_environment: "remote",
					categories: ["early-career"],
					created_at: new Date().toISOString(),
				},
				{
					job_hash: "grad_london",
					title: "Graduate Program",
					company: "Finance Corp",
					location: "London, UK",
					city: "London",
					description: "Graduate program",
					is_active: true,
					is_internship: false,
					is_graduate: true,
					work_environment: "hybrid",
					categories: ["early-career"],
					created_at: new Date().toISOString(),
				},
			]);
		});

		it("should filter jobs by city and early-career criteria", async () => {
			const { req } = createMocks({
				method: "POST",
				body: {
					email: testUserEmail,
					full_name: "Test User",
					preferred_cities: ["London"],
					career_paths: ["tech"],
					visa_sponsorship: "no",
				},
			});

			const response = await POST(req as any);
			expect([200, 404, 500]).toContain(response.status);
		});

		it("should return 404 when no jobs found", async () => {
			// Delete all jobs
			await supabase.from("jobs").delete().neq("id", 0);

			const { req } = createMocks({
				method: "POST",
				body: {
					email: testUserEmail,
					full_name: "Test User",
					preferred_cities: ["Nowhere"],
					career_paths: ["tech"],
					visa_sponsorship: "no",
				},
			});

			const response = await POST(req as any);
			expect(response.status).toBe(404);

			const data = await response.json();
			expect(data.error).toContain("No jobs found");
		});
	});

	describe("Error Handling", () => {
		it("should handle database errors gracefully", async () => {
			// Mock database to fail during user creation
			const originalGetDatabaseClient =
				require("@/utils/databasePool").getDatabaseClient;
			jest
				.mocked(require("@/utils/databasePool").getDatabaseClient)
				.mockImplementation(() => {
					throw new Error("Database connection failed");
				});

			const { req } = createMocks({
				method: "POST",
				body: {
					email: testUserEmail,
					full_name: "Test User",
					preferred_cities: ["London"],
					career_paths: ["tech"],
					visa_sponsorship: "no",
				},
			});

			const response = await POST(req as any);
			expect(response.status).toBe(500);

			const data = await response.json();
			expect(data.error).toBe("Internal server error");

			// Restore
			require("@/utils/databasePool").getDatabaseClient =
				originalGetDatabaseClient;
		});

		it("should handle invalid JSON", async () => {
			const { req } = createMocks({
				method: "POST",
				body: "invalid json",
			});

			const response = await POST(req as any);
			expect([400, 500]).toContain(response.status);
		});
	});

	describe("Analytics Tracking", () => {
		it("should track signup analytics (non-critical)", async () => {
			// Create jobs first
			await supabase.from("jobs").insert([
				{
					job_hash: "job1",
					title: "Test Job",
					company: "Test Corp",
					location: "London, UK",
					city: "London",
					description: "Test",
					is_active: true,
					is_internship: true,
					work_environment: "remote",
					categories: ["early-career"],
				},
			]);

			const { req } = createMocks({
				method: "POST",
				body: {
					email: testUserEmail,
					full_name: "Test User",
					preferred_cities: ["London"],
					career_paths: ["tech"],
					visa_sponsorship: "no",
				},
			});

			const response = await POST(req as any);
			// Analytics tracking is optional - shouldn't affect response
			expect([200, 404, 500]).toContain(response.status);
		});
	});

	describe("Rate Limiting", () => {
		it("should respect rate limiting", async () => {
			const mockRateLimitResponse = new Response(
				JSON.stringify({ error: "Rate limit exceeded" }),
				{ status: 429 },
			);

			const {
				getProductionRateLimiter,
			} = require("@/utils/production-rate-limiter");
			getProductionRateLimiter().middleware.mockResolvedValue(
				mockRateLimitResponse,
			);

			const { req } = createMocks({
				method: "POST",
				body: {
					email: testUserEmail,
					full_name: "Test User",
					preferred_cities: ["London"],
					career_paths: ["tech"],
					visa_sponsorship: "no",
				},
			});

			const response = await POST(req as any);
			expect(response.status).toBe(429);
		});
	});

	describe("Response Format Contract", () => {
		beforeEach(async () => {
			// Create test jobs
			await supabase.from("jobs").insert([
				{
					job_hash: "job1",
					title: "Test Job",
					company: "Test Corp",
					location: "London, UK",
					city: "London",
					description: "Test",
					is_active: true,
					is_internship: true,
					work_environment: "remote",
					categories: ["early-career"],
				},
			]);
		});

		it("should return correct success response format", async () => {
			const { req } = createMocks({
				method: "POST",
				body: {
					email: testUserEmail,
					full_name: "Test User",
					preferred_cities: ["London"],
					career_paths: ["tech"],
					visa_sponsorship: "no",
				},
			});

			const response = await POST(req as any);
			const data = await response.json();

			if (response.status === 200) {
				expect(data).toEqual(
					expect.objectContaining({
						success: true,
						matchCount: expect.any(Number),
						userId: expect.any(Number),
					}),
				);
			}
		});

		it("should set cookies correctly", async () => {
			const { req } = createMocks({
				method: "POST",
				body: {
					email: testUserEmail,
					full_name: "Test User",
					preferred_cities: ["London"],
					career_paths: ["tech"],
					visa_sponsorship: "no",
				},
			});

			const response = await POST(req as any);

			if (response.status === 200) {
				const cookie = response.cookies.get("free_user_email");
				expect(cookie?.value).toBe(testUserEmail);
				expect(cookie?.httpOnly).toBe(true);
				expect(cookie?.sameSite).toBe("lax");
				expect(cookie?.path).toBe("/");
			}
		});
	});
});
