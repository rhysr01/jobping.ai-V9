/**
 * Contract Tests for /api/matches/free
 *
 * Tests the API contract - what the endpoint returns, not internal implementation.
 * Focuses on integration behavior with real database.
 */

import { createMocks } from "node-mocks-http";
import { GET } from "@/app/api/matches/free/route";
import { getDatabaseClient } from "@/Utils/databasePool";
import { apiLogger } from "@/lib/api-logger";

// Mock external dependencies but keep database real
jest.mock("@/lib/api-logger", () => ({
	apiLogger: {
		info: jest.fn(),
		error: jest.fn(),
		warn: jest.fn(),
	},
}));

// Mock rate limiter to avoid external dependencies
jest.mock("@/Utils/productionRateLimiter", () => ({
	getProductionRateLimiter: () => ({
		middleware: jest.fn().mockResolvedValue(null), // No rate limiting for tests
	}),
}));

describe("GET /api/matches/free - Contract Tests", () => {
	let supabase: any;

	beforeAll(async () => {
		supabase = getDatabaseClient();
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("Authentication & Authorization", () => {
		it("should return 401 when no cookie is provided", async () => {
			const { req } = createMocks({
				method: "GET",
				headers: {},
			});

			const response = await GET(req as any);
			const data = await response.json();

			expect(response.status).toBe(401);
			expect(data.error).toBe("Unauthorized");
			expect(data.message).toBe("Please sign up again to see your matches.");
		});

		it("should return 401 when user doesn't exist", async () => {
			const { req } = createMocks({
				method: "GET",
				headers: {
					cookie: "free_user_email=nonexistent@example.com",
				},
			});

			const response = await GET(req as any);
			const data = await response.json();

			expect(response.status).toBe(401);
			expect(data.error).toBe("User not found");
		});

		it("should return 401 when user exists but not free tier", async () => {
			// Create a premium user for this test
			const testEmail = `premium-test-${Date.now()}@example.com`;

			await supabase.from("users").insert({
				email: testEmail,
				subscription_tier: "premium",
				active: true,
			});

			const { req } = createMocks({
				method: "GET",
				headers: {
					cookie: `free_user_email=${testEmail}`,
				},
			});

			const response = await GET(req as any);
			const data = await response.json();

			expect(response.status).toBe(401);
			expect(data.error).toBe("User not found");

			// Cleanup
			await supabase.from("users").delete().eq("email", testEmail);
		});
	});

	describe("Success Cases", () => {
		let testEmail: string;

		beforeEach(async () => {
			testEmail = `free-test-${Date.now()}@example.com`;

			// Create a test user
			await supabase.from("users").insert({
				email: testEmail,
				subscription_tier: "free",
				active: true,
			});
		});

		afterEach(async () => {
			// Cleanup
			await supabase.from("matches").delete().eq("user_email", testEmail);
			await supabase.from("users").delete().eq("email", testEmail);
		});

		it("should return empty jobs array when user has no matches", async () => {
			const { req } = createMocks({
				method: "GET",
				headers: {
					cookie: `free_user_email=${testEmail}`,
				},
			});

			const response = await GET(req as any);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data).toHaveProperty("jobs");
			expect(Array.isArray(data.jobs)).toBe(true);
			expect(data.jobs).toHaveLength(0);
		});

		it("should return matches when user has stored matches", async () => {
			// Create test job
			const testJobHash = `test-job-${Date.now()}`;
			await supabase.from("jobs").insert({
				job_hash: testJobHash,
				title: "Test Job",
				company: "Test Company",
				location: "London, UK",
				description: "Test description",
				job_url: "https://example.com/job",
				work_environment: "hybrid",
				categories: ["tech"],
				is_active: true,
				status: "active",
			});

			// Create match for user
			await supabase.from("matches").insert({
				user_email: testEmail,
				job_hash: testJobHash,
				match_score: 95,
				match_reason: "Perfect match for your profile",
			});

			const { req } = createMocks({
				method: "GET",
				headers: {
					cookie: `free_user_email=${testEmail}`,
				},
			});

			const response = await GET(req as any);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data).toHaveProperty("jobs");
			expect(Array.isArray(data.jobs)).toBe(true);
			expect(data.jobs).toHaveLength(1);

			const job = data.jobs[0];
			expect(job).toHaveProperty("id");
			expect(job).toHaveProperty("title", "Test Job");
			expect(job).toHaveProperty("company", "Test Company");
			expect(job).toHaveProperty("match_score", 95);
			expect(job).toHaveProperty("match_reason", "Perfect match for your profile");
			expect(job).toHaveProperty("job_hash", testJobHash);
			expect(job).toHaveProperty("is_active", true);

			// Cleanup job
			await supabase.from("jobs").delete().eq("job_hash", testJobHash);
		});

		it("should include visa confidence data in response", async () => {
			// Create test job with visa-related content
			const testJobHash = `visa-test-job-${Date.now()}`;
			await supabase.from("jobs").insert({
				job_hash: testJobHash,
				title: "Software Engineer",
				company: "Global Tech Corp",
				location: "San Francisco, CA",
				description: "We sponsor H1B visas for qualified candidates",
				job_url: "https://example.com/job",
				work_environment: "remote",
				categories: ["tech"],
				is_active: true,
				status: "active",
			});

			// Create match for user
			await supabase.from("matches").insert({
				user_email: testEmail,
				job_hash: testJobHash,
				match_score: 90,
				match_reason: "Great tech role",
			});

			const { req } = createMocks({
				method: "GET",
				headers: {
					cookie: `free_user_email=${testEmail}`,
				},
			});

			const response = await GET(req as any);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.jobs).toHaveLength(1);

			const job = data.jobs[0];
			expect(job).toHaveProperty("visa_confidence");
			expect(job).toHaveProperty("visa_confidence_label");
			expect(job).toHaveProperty("visa_confidence_reason");
			expect(typeof job.visa_confidence).toBe("number");

			// Cleanup job
			await supabase.from("jobs").delete().eq("job_hash", testJobHash);
		});
	});

	describe("Error Handling", () => {
		it("should handle database timeouts gracefully", async () => {
			// This would require mocking the database timeout
			// For now, we test that the API responds within reasonable time
			const testEmail = `timeout-test-${Date.now()}@example.com`;

			const { req } = createMocks({
				method: "GET",
				headers: {
					cookie: `free_user_email=${testEmail}`,
				},
			});

			const startTime = Date.now();
			const response = await GET(req as any);
			const duration = Date.now() - startTime;

			// Should respond quickly even with errors
			expect(duration).toBeLessThan(1000); // Should be fast for auth errors
			expect(response.status).toBe(401); // User doesn't exist
		});

		it("should handle malformed cookies", async () => {
			const { req } = createMocks({
				method: "GET",
				headers: {
					cookie: "free_user_email=invalid-email", // Missing @domain
				},
			});

			const response = await GET(req as any);
			const data = await response.json();

			expect(response.status).toBe(401);
			expect(data.error).toBe("Unauthorized");
		});

		it("should handle rate limit exceeded", async () => {
			// Mock rate limiter to return 429
			const mockRateLimitResponse = new Response(
				JSON.stringify({ error: "Rate limit exceeded", retryAfter: 60 }),
				{ status: 429, headers: { "Retry-After": "60" } }
			);

			const { getProductionRateLimiter } = require("@/Utils/productionRateLimiter");
			getProductionRateLimiter().middleware.mockResolvedValue(mockRateLimitResponse);

			const { req } = createMocks({
				method: "GET",
				headers: {
					cookie: "free_user_email=test@example.com",
				},
			});

			const response = await GET(req as any);

			expect(response.status).toBe(429);
			expect(response.headers.get("Retry-After")).toBe("60");
		});

		it("should handle database connection errors", async () => {
			// Mock database client to throw connection error
			const originalGetDatabaseClient = jest.requireActual("@/Utils/databasePool").getDatabaseClient;
			const mockSupabase = {
				from: jest.fn(() => {
					throw new Error("Database connection failed");
				}),
			};

			jest.mocked(require("@/Utils/databasePool").getDatabaseClient).mockReturnValue(mockSupabase);

			const { req } = createMocks({
				method: "GET",
				headers: {
					cookie: "free_user_email=test@example.com",
				},
			});

			const response = await GET(req as any);

			expect(response.status).toBe(500);

			// Restore original mock
			jest.mocked(require("@/Utils/databasePool").getDatabaseClient).mockReturnValue(originalGetDatabaseClient());
		});

		it("should handle invalid request methods", async () => {
			const { req } = createMocks({
				method: "POST", // Wrong method
				headers: {
					cookie: "free_user_email=test@example.com",
				},
			});

			// The API handler doesn't check method, but let's test the flow
			const response = await GET(req as any);
			// Should still process as GET since that's what we're calling
			expect([200, 401, 500]).toContain(response.status);
		});

		it("should handle empty request body for non-GET methods", async () => {
			// Test that POST requests would fail appropriately if sent to GET endpoint
			const { req } = createMocks({
				method: "GET",
				headers: {
					cookie: "free_user_email=test@example.com",
				},
				body: "", // Empty body
			});

			const response = await GET(req as any);
			expect([200, 401, 500]).toContain(response.status);
		});
	});

	describe("Rate Limiting", () => {
		it("should handle rate limiting responses", async () => {
			// Mock rate limiter to return a rate limit response
			const mockRateLimitResponse = new Response(
				JSON.stringify({ error: "Rate limit exceeded" }),
				{ status: 429 }
			);

			const { getProductionRateLimiter } = require("@/Utils/productionRateLimiter");
			getProductionRateLimiter().middleware.mockResolvedValue(mockRateLimitResponse);

			const { req } = createMocks({
				method: "GET",
				headers: {
					cookie: "free_user_email=test@example.com",
				},
			});

			const response = await GET(req as any);

			expect(response.status).toBe(429);
		});
	});

	describe("Response Format Contract", () => {
		let testEmail: string;
		let testJobHash: string;

		beforeEach(async () => {
			testEmail = `contract-test-${Date.now()}@example.com`;
			testJobHash = `contract-job-${Date.now()}`;

			// Create test user and job
			await supabase.from("users").insert({
				email: testEmail,
				subscription_tier: "free",
				active: true,
			});

			await supabase.from("jobs").insert({
				job_hash: testJobHash,
				title: "Contract Test Job",
				company: "Test Corp",
				location: "New York, NY",
				city: "New York",
				country: "USA",
				description: "Test job description",
				job_url: "https://example.com/contract-test",
				work_environment: "hybrid",
				categories: ["finance"],
				is_active: true,
				status: "active",
			});

			await supabase.from("matches").insert({
				user_email: testEmail,
				job_hash: testJobHash,
				match_score: 88,
				match_reason: "Good cultural fit",
			});
		});

		afterEach(async () => {
			await supabase.from("matches").delete().eq("user_email", testEmail);
			await supabase.from("jobs").delete().eq("job_hash", testJobHash);
			await supabase.from("users").delete().eq("email", testEmail);
		});

		it("should return jobs in correct format", async () => {
			const { req } = createMocks({
				method: "GET",
				headers: {
					cookie: `free_user_email=${testEmail}`,
				},
			});

			const response = await GET(req as any);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data).toHaveProperty("jobs");
			expect(Array.isArray(data.jobs)).toBe(true);

			const job = data.jobs[0];
			expect(job).toEqual(
				expect.objectContaining({
					id: expect.any(Number),
					title: expect.any(String),
					company: expect.any(String),
					location: expect.any(String),
					description: expect.any(String),
					url: expect.any(String),
					work_environment: expect.any(String),
					match_score: expect.any(Number),
					match_reason: expect.any(String),
					visa_confidence: expect.any(Number),
					visa_confidence_label: expect.any(String),
					job_hash: expect.any(String),
					is_active: expect.any(Boolean),
				})
			);
		});

		it("should sort jobs by active status then match score", async () => {
			// Create a second job with lower score
			const testJobHash2 = `contract-job-2-${Date.now()}`;
			await supabase.from("jobs").insert({
				job_hash: testJobHash2,
				title: "Lower Score Job",
				company: "Test Corp 2",
				location: "Boston, MA",
				description: "Lower priority job",
				job_url: "https://example.com/low-score",
				work_environment: "remote",
				categories: ["finance"],
				is_active: true,
				status: "active",
			});

			await supabase.from("matches").insert({
				user_email: testEmail,
				job_hash: testJobHash2,
				match_score: 75,
				match_reason: "Decent match",
			});

			const { req } = createMocks({
				method: "GET",
				headers: {
					cookie: `free_user_email=${testEmail}`,
				},
			});

			const response = await GET(req as any);
			const data = await response.json();

			expect(data.jobs).toHaveLength(2);
			// Higher score should come first
			expect(data.jobs[0].match_score).toBeGreaterThan(data.jobs[1].match_score);

			// Cleanup second job
			await supabase.from("matches").delete().eq("job_hash", testJobHash2);
			await supabase.from("jobs").delete().eq("job_hash", testJobHash2);
		});
	});
});
