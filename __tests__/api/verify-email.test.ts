import { NextRequest } from "next/server";

import { GET, POST } from "@/app/api/verify-email/route";

jest.mock("@/Utils/errorResponse", () => ({
	errorResponse: {
		badRequest: jest.fn(
			(_req, msg) =>
				new Response(JSON.stringify({ error: msg }), { status: 400 }),
		),
		internal: jest.fn(
			(_req, msg) =>
				new Response(JSON.stringify({ error: msg }), { status: 500 }),
		),
	},
}));

jest.mock("@/Utils/productionRateLimiter", () => ({
	getProductionRateLimiter: jest.fn(() => ({
		middleware: jest.fn(() => null),
	})),
}));

jest.mock("@/Utils/constants", () => ({
	ENV: {
		isTest: jest.fn(() => true),
	},
}));

jest.mock("@/Utils/emailVerification", () => ({
	verifyVerificationToken: jest.fn(),
	markUserVerified: jest.fn(),
}));

describe("/api/verify-email", () => {
	const {
		verifyVerificationToken,
		markUserVerified,
	} = require("@/Utils/emailVerification");

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("GET", () => {
		it("returns 400 when parameters missing", async () => {
			const request = new NextRequest("http://localhost/api/verify-email");
			const response = await GET(request);
			expect(response.status).toBe(400);
		});

		it("verifies token and marks user when valid", async () => {
			verifyVerificationToken.mockResolvedValue({ valid: true });
			const request = new NextRequest(
				"http://localhost/api/verify-email?email=user@example.com&token=abc",
			);

			const response = await GET(request);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body.success).toBe(true);
			expect(verifyVerificationToken).toHaveBeenCalledWith(
				"user@example.com",
				"abc",
			);
			expect(markUserVerified).toHaveBeenCalledWith("user@example.com");
		});

		it("returns 400 for invalid token", async () => {
			verifyVerificationToken.mockResolvedValue({
				valid: false,
				reason: "expired",
			});
			const request = new NextRequest(
				"http://localhost/api/verify-email?email=user@example.com&token=bad",
			);

			const response = await GET(request);
			const body = await response.json();

			expect(response.status).toBe(400);
			expect(body.reason).toBe("expired");
		});
	});

	describe("POST", () => {
		it("requires email and token", async () => {
			const request = {
				json: async () => ({}),
			} as unknown as NextRequest;

			const response = await POST(request);
			expect(response.status).toBe(400);
		});

		it("verifies payload and marks user", async () => {
			verifyVerificationToken.mockResolvedValue({ valid: true });
			const request = {
				json: async () => ({ email: "user@example.com", token: "abc" }),
			} as unknown as NextRequest;

			const response = await POST(request);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body.success).toBe(true);
			expect(verifyVerificationToken).toHaveBeenCalledWith(
				"user@example.com",
				"abc",
			);
			expect(markUserVerified).toHaveBeenCalledWith("user@example.com");
		});

		it("returns 400 for invalid token", async () => {
			verifyVerificationToken.mockResolvedValue({
				valid: false,
				reason: "expired",
			});
			const request = {
				json: async () => ({ email: "user@example.com", token: "bad" }),
			} as unknown as NextRequest;

			const response = await POST(request);
			const body = await response.json();

			expect(response.status).toBe(400);
			expect(body.reason).toBe("expired");
		});
	});
});
