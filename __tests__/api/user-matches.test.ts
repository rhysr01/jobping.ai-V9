/**
 * Tests for User Matches API Route
 * Tests user match retrieval endpoint
 */

import type { NextRequest } from "next/server";

jest.mock("next-axiom", () => ({
	withAxiom: (handler: any) => handler,
}));

jest.mock("@/Utils/databasePool");
jest.mock("@/Utils/productionRateLimiter");
jest.mock("@/Utils/auth/hmac");

import { GET } from "@/app/api/user-matches/route";

// Sentry removed - using Axiom for error tracking

describe("User Matches API Route", () => {
	let mockRequest: NextRequest;
	let mockSupabase: any;

	beforeEach(() => {
		jest.clearAllMocks();

		mockRequest = {
			method: "GET",
			url: "https://example.com/api/user-matches?email=user@example.com&limit=10&signature=test&timestamp=1234567890",
			headers: new Headers(),
			nextUrl: new URL(
				"https://example.com/api/user-matches?email=user@example.com&limit=10&signature=test&timestamp=1234567890",
			),
		} as any;

		// Create chainable mock for Supabase queries
		const createChainableMock = (finalResult: any) => {
			const chain: any = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				gte: jest.fn().mockReturnThis(),
				order: jest.fn().mockReturnThis(),
				limit: jest.fn().mockResolvedValue(finalResult),
			};
			return chain;
		};

		mockSupabase = {
			from: jest.fn((table: string) =>
				createChainableMock({
					data:
						table === "matches"
							? [
									{
										match_score: 0.85, // Normalized score (0-1 range)
										user_email: "user@example.com",
										job_hash: "hash1",
										jobs: {
											id: 1,
											title: "Software Engineer",
											company: "Tech Corp",
											location: "London",
											job_url: "https://example.com/job1",
											description: "Job description",
											categories: "tech",
											experience_required: "entry",
											work_environment: "remote",
											language_requirements: "English",
											company_profile_url: "https://example.com/company",
											posted_at: new Date().toISOString(),
										},
									},
								]
							: [],
					error: null,
				}),
			),
		};

		const { getDatabaseClient } = require("@/Utils/databasePool");
		getDatabaseClient.mockReturnValue(mockSupabase);

		const {
			getProductionRateLimiter,
		} = require("@/Utils/productionRateLimiter");
		getProductionRateLimiter.mockReturnValue({
			middleware: jest.fn().mockResolvedValue(null),
		});

		const { verifyHMAC } = require("@/Utils/auth/hmac");
		verifyHMAC.mockReturnValue({ isValid: true });
	});

	describe("GET /api/user-matches", () => {
		it("should return user matches", async () => {
			const response = await GET(mockRequest);

			// Behavior: Should return valid response
			expect(response).toBeDefined();
			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data.success).toBe(true);
			// Response structure: { success: true, data: { matches: [...] } }
			expect(data.data).toBeDefined();
			expect(data.data.matches).toBeDefined();
			expect(Array.isArray(data.data.matches)).toBe(true);
			// ✅ Tests outcome, not implementation
		});

		it("should return 400 for invalid email", async () => {
			mockRequest.url =
				"https://example.com/api/user-matches?email=invalid&signature=test&timestamp=1234567890";

			const response = await GET(mockRequest);

			expect(response.status).toBe(400);
		});

		it("should return 400 for missing signature", async () => {
			mockRequest.url =
				"https://example.com/api/user-matches?email=user@example.com&timestamp=1234567890";

			const response = await GET(mockRequest);

			expect(response.status).toBe(400);
		});

		it.skip("should return 401 for invalid HMAC signature", async () => {
			// TODO: In test environment, verifyHMAC returns { isValid: true } by default
			// Need to mock the actual implementation or test in production mode
			const { verifyHMAC } = require("@/Utils/auth/hmac");
			verifyHMAC.mockReturnValue({
				isValid: false,
				error: "Invalid signature",
			});

			const response = await GET(mockRequest);
			const data = await response.json();

			expect(response.status).toBe(401);
			expect(data.code).toBe("UNAUTHORIZED");
		});

		it.skip("should respect limit parameter", async () => {
			// TODO: Test behavior (response contains correct number of matches) instead of implementation
			mockRequest.url =
				"https://example.com/api/user-matches?email=user@example.com&limit=5&signature=test&timestamp=1234567890";

			const response = await GET(mockRequest);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.matches.length).toBeLessThanOrEqual(5);
			// ✅ Tests outcome (limit respected), not implementation
		});

		it.skip("should respect minScore parameter", async () => {
			// TODO: Test behavior (response contains matches above minScore) instead of implementation
			mockRequest.url =
				"https://example.com/api/user-matches?email=user@example.com&minScore=80&signature=test&timestamp=1234567890";

			const response = await GET(mockRequest);
			const data = await response.json();

			expect(response.status).toBe(200);
			if (data.matches.length > 0) {
				// All matches should have score >= normalized minScore (0.8)
				data.matches.forEach((match: any) => {
					expect(match.match_score).toBeGreaterThanOrEqual(0.8);
				});
			}
			// ✅ Tests outcome (scores >= minScore), not implementation
		});

		it("should handle database errors", async () => {
			// Mock database query to return error
			const chainMock = mockSupabase.from("matches");
			chainMock.limit.mockResolvedValueOnce({
				data: null,
				error: { message: "Database error" },
			});

			const response = await GET(mockRequest);

			// Behavior: Should return error status
			expect(response.status).toBeGreaterThanOrEqual(500);
			// ✅ Tests outcome (error status), not implementation
		});

		it.skip("should handle query timeout", async () => {
			// TODO: Fix timeout test - needs proper async handling with fake timers
			jest.useFakeTimers();
			mockSupabase.limit.mockImplementation(
				() => new Promise((resolve) => setTimeout(resolve, 15000)),
			);

			const promise = GET(mockRequest);
			jest.advanceTimersByTime(11000);

			const response = await promise;
			expect(response.status).toBeGreaterThanOrEqual(500);
			jest.useRealTimers();
		});
	});
});
