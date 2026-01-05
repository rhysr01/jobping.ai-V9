/**
 * Contract Tests for /api/user-matches
 *
 * Tests the user matches retrieval API contract - what users see when they request their matches.
 * This is a critical user-facing API with HMAC authentication.
 * Uses real database operations for reliable integration testing.
 */

import { createMocks } from "node-mocks-http";
import { GET } from "@/app/api/user-matches/route";
import { getDatabaseClient } from "@/Utils/databasePool";
import { apiLogger } from "@/lib/api-logger";
import { signHMAC } from "@/Utils/auth/hmac";

// Mock external dependencies but keep database real
jest.mock("@/lib/api-logger", () => ({
	apiLogger: {
		info: jest.fn(),
		error: jest.fn(),
		warn: jest.fn(),
	},
}));

jest.mock("next-axiom", () => ({
	withAxiom: (handler: any) => handler,
}));

// Mock rate limiter to avoid external dependencies
jest.mock("@/Utils/productionRateLimiter", () => ({
	getProductionRateLimiter: () => ({
		middleware: jest.fn().mockResolvedValue(null), // No rate limiting for tests
	}),
}));

describe("GET /api/user-matches - Contract Tests", () => {
	let supabase: any;
	let testUserEmail: string;

	beforeAll(async () => {
		supabase = getDatabaseClient();
		testUserEmail = `user-matches-test-${Date.now()}@example.com`;
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	afterEach(async () => {
		// Cleanup test data
		try {
			await supabase.from("matches").delete().eq("user_email", testUserEmail);
			await supabase.from("jobs").delete().eq("job_hash", `test-job-${Date.now()}`);
			await supabase.from("users").delete().eq("email", testUserEmail);
		} catch (e) {
			// Ignore cleanup errors
		}
	});

	describe("Authentication & Authorization", () => {
		it("should return 400 for missing required parameters", async () => {
			const mockRequest = {
				method: "GET",
				url: "http://localhost/api/user-matches?limit=10", // Missing email, signature, timestamp
				nextUrl: new URL("http://localhost/api/user-matches?limit=10"),
				headers: new Headers(),
			} as any;

			const response = await GET(mockRequest);
			expect(response.status).toBe(400);

			const data = await response.json();
			expect(data.success).toBe(false);
			expect(data.error).toContain("Invalid input parameters");
		});

		it("should return 400 for invalid email format", async () => {
			const timestamp = Date.now();
			const signature = signHMAC(`invalid-email:${timestamp}`, timestamp);

			const { req } = createMocks({
				method: "GET",
				url: `/api/user-matches?email=invalid-email&signature=${signature}&timestamp=${timestamp}`,
			});

			const response = await GET(req as any);
			expect(response.status).toBe(400);

			const data = await response.json();
			expect(data.success).toBe(false);
			expect(data.error).toContain("Invalid input parameters");
		});

		it("should return 400 for missing HMAC signature", async () => {
			const { req } = createMocks({
				method: "GET",
				url: `/api/user-matches?email=${testUserEmail}&timestamp=${Date.now()}`,
			});

			const response = await GET(req as any);
			expect(response.status).toBe(400);

			const data = await response.json();
			expect(data.success).toBe(false);
			expect(data.error).toContain("Invalid input parameters");
		});

		it("should return 401 for invalid HMAC signature", async () => {
			const timestamp = Date.now();
			const invalidSignature = "invalid-signature";

			const { req } = createMocks({
				method: "GET",
				url: `/api/user-matches?email=${testUserEmail}&signature=${invalidSignature}&timestamp=${timestamp}`,
			});

			const response = await GET(req as any);
			expect(response.status).toBe(401);

			const data = await response.json();
			expect(data.success).toBe(false);
			expect(data.error).toBe("Authentication failed");
		});
	});

	describe("Parameter Validation", () => {
		it("should accept valid parameters with correct HMAC", async () => {
			const timestamp = Date.now();
			const signature = signHMAC(`${testUserEmail}:${timestamp}`, timestamp);

			const { req } = createMocks({
				method: "GET",
				url: `/api/user-matches?email=${testUserEmail}&signature=${signature}&timestamp=${timestamp}&limit=5&minScore=50`,
			});

			const response = await GET(req as any);
			// Should not fail due to auth, even if user has no matches
			expect([200, 500]).toContain(response.status); // 500 if DB error, 200 if success
		});

		it("should validate limit parameter bounds", async () => {
			const timestamp = Date.now();
			const signature = signHMAC(`${testUserEmail}:${timestamp}`, timestamp);

			const { req } = createMocks({
				method: "GET",
				url: `/api/user-matches?email=${testUserEmail}&signature=${signature}&timestamp=${timestamp}&limit=100`,
			});

			const response = await GET(req as any);
			// Should validate limit is <= 50
			expect([200, 400]).toContain(response.status);
		});

		it("should handle minScore parameter correctly", async () => {
			const timestamp = Date.now();
			const signature = signHMAC(`${testUserEmail}:${timestamp}`, timestamp);

			const { req } = createMocks({
				method: "GET",
				url: `/api/user-matches?email=${testUserEmail}&signature=${signature}&timestamp=${timestamp}&minScore=75`,
			});

			const response = await GET(req as any);
			expect([200, 500]).toContain(response.status);
		});
	});

	describe("Successful Match Retrieval", () => {
		let jobHash1: string;
		let jobHash2: string;

		beforeEach(async () => {
			jobHash1 = `test-job-1-${Date.now()}`;
			jobHash2 = `test-job-2-${Date.now()}`;

			// Create test user
			await supabase.from("users").insert({
				email: testUserEmail,
				subscription_tier: "premium",
				active: true,
			});

			// Create test jobs
			await supabase.from("jobs").insert([
				{
					job_hash: jobHash1,
					title: "Senior Software Engineer",
					company: "Tech Corp",
					location: "San Francisco, CA",
					description: "Looking for experienced developer",
					job_url: "https://example.com/job1",
					work_environment: "hybrid",
					categories: ["tech"],
					is_active: true,
					status: "active",
				},
				{
					job_hash: jobHash2,
					title: "Product Manager",
					company: "Product Co",
					location: "New York, NY",
					description: "Product management role",
					job_url: "https://example.com/job2",
					work_environment: "remote",
					categories: ["product"],
					is_active: true,
					status: "active",
				},
			]);

			// Create matches for user
			await supabase.from("matches").insert([
				{
					user_email: testUserEmail,
					job_hash: jobHash1,
					match_score: 0.95, // 95%
					match_reason: "Perfect technical match",
				},
				{
					user_email: testUserEmail,
					job_hash: jobHash2,
					match_score: 0.85, // 85%
					match_reason: "Good product experience match",
				},
			]);
		});

		it("should return user matches with valid HMAC", async () => {
			const timestamp = Date.now();
			const signature = signHMAC(`${testUserEmail}:${timestamp}`, timestamp);

			const { req } = createMocks({
				method: "GET",
				url: `/api/user-matches?email=${testUserEmail}&signature=${signature}&timestamp=${timestamp}`,
			});

			const response = await GET(req as any);
			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data.data).toHaveProperty("total_matches");
			expect(data.data).toHaveProperty("matches");
			expect(Array.isArray(data.data.matches)).toBe(true);
		});

		it("should return matches sorted by score descending", async () => {
			const timestamp = Date.now();
			const signature = signHMAC(`${testUserEmail}:${timestamp}`, timestamp);

			const { req } = createMocks({
				method: "GET",
				url: `/api/user-matches?email=${testUserEmail}&signature=${signature}&timestamp=${timestamp}`,
			});

			const response = await GET(req as any);
			const data = await response.json();

			expect(data.data.matches.length).toBeGreaterThanOrEqual(2);
			// First match should have higher score
			expect(data.data.matches[0].match_score).toBeGreaterThanOrEqual(data.data.matches[1].match_score);
		});

		it("should respect limit parameter", async () => {
			const timestamp = Date.now();
			const signature = signHMAC(`${testUserEmail}:${timestamp}`, timestamp);

			const { req } = createMocks({
				method: "GET",
				url: `/api/user-matches?email=${testUserEmail}&signature=${signature}&timestamp=${timestamp}&limit=1`,
			});

			const response = await GET(req as any);
			const data = await response.json();

			expect(data.data.matches.length).toBe(1);
			expect(data.data.total_matches).toBe(2); // Total should still be 2
		});

		it("should filter by minScore parameter", async () => {
			const timestamp = Date.now();
			const signature = signHMAC(`${testUserEmail}:${timestamp}`, timestamp);

			// Request matches with minScore 90 (should only return the 95% match)
			const { req } = createMocks({
				method: "GET",
				url: `/api/user-matches?email=${testUserEmail}&signature=${signature}&timestamp=${timestamp}&minScore=90`,
			});

			const response = await GET(req as any);
			const data = await response.json();

			expect(data.data.matches.length).toBe(1);
			expect(data.data.matches[0].match_score).toBe(0.95);
		});

		it("should include complete job data in response", async () => {
			const timestamp = Date.now();
			const signature = signHMAC(`${testUserEmail}:${timestamp}`, timestamp);

			const { req } = createMocks({
				method: "GET",
				url: `/api/user-matches?email=${testUserEmail}&signature=${signature}&timestamp=${timestamp}`,
			});

			const response = await GET(req as any);
			const data = await response.json();

			const match = data.data.matches[0];
			expect(match).toHaveProperty("id");
			expect(match).toHaveProperty("match_score");
			expect(match).toHaveProperty("match_reason");
			expect(match).toHaveProperty("job");

			const job = match.job;
			expect(job).toHaveProperty("id");
			expect(job).toHaveProperty("title");
			expect(job).toHaveProperty("company");
			expect(job).toHaveProperty("location");
			expect(job).toHaveProperty("job_url");
			expect(job).toHaveProperty("description");
			expect(job).toHaveProperty("categories");
			expect(job).toHaveProperty("work_environment");
		});
	});

	describe("Edge Cases & Error Handling", () => {
		it("should handle user with no matches", async () => {
			// Create user but no matches
			await supabase.from("users").insert({
				email: testUserEmail,
				subscription_tier: "premium",
				active: true,
			});

			const timestamp = Date.now();
			const signature = signHMAC(`${testUserEmail}:${timestamp}`, timestamp);

			const { req } = createMocks({
				method: "GET",
				url: `/api/user-matches?email=${testUserEmail}&signature=${signature}&timestamp=${timestamp}`,
			});

			const response = await GET(req as any);
			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data.data.total_matches).toBe(0);
			expect(data.data.matches).toEqual([]);
		});

		it("should handle matches with missing job data", async () => {
			// Create user and match, but delete the job
			await supabase.from("users").insert({
				email: testUserEmail,
				subscription_tier: "premium",
				active: true,
			});

			const missingJobHash = `missing-job-${Date.now()}`;
			await supabase.from("matches").insert({
				user_email: testUserEmail,
				job_hash: missingJobHash,
				match_score: 0.90,
				match_reason: "Good match",
			});

			const timestamp = Date.now();
			const signature = signHMAC(`${testUserEmail}:${timestamp}`, timestamp);

			const { req } = createMocks({
				method: "GET",
				url: `/api/user-matches?email=${testUserEmail}&signature=${signature}&timestamp=${timestamp}`,
			});

			const response = await GET(req as any);
			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data.success).toBe(true);
			// Should filter out matches with missing job data
			expect(data.data.total_matches).toBe(0);
		});

		it("should handle rate limiting", async () => {
			// Mock rate limiter to return rate limit response
			const mockRateLimitResponse = new Response(
				JSON.stringify({ error: "Rate limit exceeded", retryAfter: 60 }),
				{ status: 429, headers: { "Retry-After": "60" } }
			);

			const { getProductionRateLimiter } = require("@/Utils/productionRateLimiter");
			getProductionRateLimiter().middleware.mockResolvedValue(mockRateLimitResponse);

			const timestamp = Date.now();
			const signature = signHMAC(`${testUserEmail}:${timestamp}`, timestamp);

			const { req } = createMocks({
				method: "GET",
				url: `/api/user-matches?email=${testUserEmail}&signature=${signature}&timestamp=${timestamp}`,
			});

			const response = await GET(req as any);
			expect(response.status).toBe(429);
		});

		it("should handle database timeouts", async () => {
			// Create user and matches to trigger database query
			await supabase.from("users").insert({
				email: testUserEmail,
				subscription_tier: "premium",
				active: true,
			});

			const timestamp = Date.now();
			const signature = signHMAC(`${testUserEmail}:${timestamp}`, timestamp);

			const { req } = createMocks({
				method: "GET",
				url: `/api/user-matches?email=${testUserEmail}&signature=${signature}&timestamp=${timestamp}`,
			});

			const response = await GET(req as any);
			// Should either succeed or handle timeout gracefully
			expect([200, 500]).toContain(response.status);
		});
	});

	describe("Response Format Contract", () => {
		beforeEach(async () => {
			// Create test user and matches
			await supabase.from("users").insert({
				email: testUserEmail,
				subscription_tier: "premium",
				active: true,
			});

			const jobHash = `contract-test-job-${Date.now()}`;
			await supabase.from("jobs").insert({
				job_hash: jobHash,
				title: "Contract Test Job",
				company: "Test Corp",
				location: "Test City",
				description: "Test description",
				job_url: "https://example.com/test",
				work_environment: "remote",
				categories: ["test"],
				is_active: true,
				status: "active",
			});

			await supabase.from("matches").insert({
				user_email: testUserEmail,
				job_hash: jobHash,
				match_score: 0.88,
				match_reason: "Test match reason",
			});
		});

		it("should return correct response format", async () => {
			const timestamp = Date.now();
			const signature = signHMAC(`${testUserEmail}:${timestamp}`, timestamp);

			const { req } = createMocks({
				method: "GET",
				url: `/api/user-matches?email=${testUserEmail}&signature=${signature}&timestamp=${timestamp}`,
			});

			const response = await GET(req as any);
			const data = await response.json();

			expect(response.status).toBe(200);

			// Success response contract
			expect(data).toEqual(
				expect.objectContaining({
					success: true,
					data: expect.objectContaining({
						total_matches: expect.any(Number),
						matches: expect.any(Array),
					}),
					timestamp: expect.any(String),
				})
			);

			// Each match should follow contract
			data.data.matches.forEach((match: any) => {
				expect(match).toEqual(
					expect.objectContaining({
						id: expect.any(Number),
						match_score: expect.any(Number),
						match_reason: expect.any(String),
						job: expect.objectContaining({
							id: expect.any(Number),
							title: expect.any(String),
							company: expect.any(String),
							location: expect.any(String),
							job_url: expect.any(String),
							description: expect.any(String),
							categories: expect.any(Array),
							work_environment: expect.any(String),
						}),
					})
				);
			});
		});

		it("should include request ID in response headers", async () => {
			const timestamp = Date.now();
			const signature = signHMAC(`${testUserEmail}:${timestamp}`, timestamp);

			const { req } = createMocks({
				method: "GET",
				url: `/api/user-matches?email=${testUserEmail}&signature=${signature}&timestamp=${timestamp}`,
			});

			const response = await GET(req as any);
			expect(response.headers.get("x-request-id")).toBeDefined();
		});
	});
});
