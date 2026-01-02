/**
 * Comprehensive tests for Send Re-Engagement API Route
 * Tests re-engagement email sending and stats
 */

import type { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/send-re-engagement/route";

jest.mock("@/Utils/productionRateLimiter");
jest.mock("@/Utils/email/reEngagementService");

describe("Send Re-Engagement API Route", () => {
	let mockRequest: NextRequest;

	beforeEach(() => {
		jest.clearAllMocks();

		process.env.SYSTEM_API_KEY = "system-key";

		mockRequest = {
			method: "POST",
			headers: new Headers({
				"x-api-key": "system-key",
			}),
			url: "https://example.com/api/send-re-engagement",
		} as any;

		const {
			getProductionRateLimiter,
		} = require("@/Utils/productionRateLimiter");
		getProductionRateLimiter.mockReturnValue({
			middleware: jest.fn().mockResolvedValue(null),
		});

		const {
			sendReEngagementEmails,
			getReEngagementStats,
		} = require("@/Utils/email/reEngagementService");
		sendReEngagementEmails.mockResolvedValue({
			success: true,
			emailsSent: 5,
			errors: [],
		});
		getReEngagementStats.mockResolvedValue({
			candidates: 10,
			sent: 5,
			errors: 0,
		});
	});

	describe("POST /api/send-re-engagement", () => {
		it("should send re-engagement emails", async () => {
			const response = await POST(mockRequest);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.emailsSent).toBe(5);
		});

		it("should handle rate limiting", async () => {
			const {
				getProductionRateLimiter,
			} = require("@/Utils/productionRateLimiter");
			getProductionRateLimiter.mockReturnValue({
				middleware: jest.fn().mockResolvedValue(
					new Response(JSON.stringify({ error: "Rate limited" }), {
						status: 429,
					}),
				),
			});

			const response = await POST(mockRequest);

			expect(response.status).toBe(429);
		});

		it("should handle errors", async () => {
			const {
				sendReEngagementEmails,
			} = require("@/Utils/email/reEngagementService");
			sendReEngagementEmails.mockRejectedValue(new Error("Send failed"));

			const response = await POST(mockRequest);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.error).toBeDefined();
		});

		it("should return errors array", async () => {
			const {
				sendReEngagementEmails,
			} = require("@/Utils/email/reEngagementService");
			sendReEngagementEmails.mockResolvedValue({
				success: true,
				emailsSent: 3,
				errors: ["Error 1", "Error 2"],
			});

			const response = await POST(mockRequest);
			const data = await response.json();

			expect(data.errors).toHaveLength(2);
		});
	});

	describe("GET /api/send-re-engagement", () => {
		beforeEach(() => {
			mockRequest.method = "GET";
			mockRequest.headers.set("x-api-key", "system-key");
		});

		it("should get re-engagement stats", async () => {
			const response = await GET(mockRequest);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.stats).toBeDefined();
		});

		it("should handle stats errors", async () => {
			const {
				getReEngagementStats,
			} = require("@/Utils/email/reEngagementService");
			getReEngagementStats.mockRejectedValue(new Error("Stats failed"));

			const response = await GET(mockRequest);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data.error).toBeDefined();
		});
	});
});

afterEach(() => {
	delete process.env.SYSTEM_API_KEY;
});
