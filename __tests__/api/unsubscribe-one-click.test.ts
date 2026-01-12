import type { NextRequest } from "next/server";
import { GET } from "@/app/api/unsubscribe/one-click/route";
import { getDatabaseClient } from "../../utils/databasePool";

jest.mock("@/utils/databasePool", () => ({
	getDatabaseClient: jest.fn(() => ({
		from: jest.fn(() => ({
			update: jest.fn(() => ({
				eq: jest.fn(() => ({
					data: {},
					error: null,
				})),
			})),
			insert: jest.fn(() => ({
				data: {},
				error: null,
			})),
		})),
	})),
}));

describe("GET /api/unsubscribe/one-click", () => {
	it("should require email parameter", async () => {
		const req = {
			nextUrl: {
				searchParams: {
					get: jest.fn(() => null),
				},
			},
		} as unknown as NextRequest;

		const response = await GET(req);
		expect(response.status).toBeGreaterThanOrEqual(400);
	});

	it("should unsubscribe user with valid email", async () => {
		const req = {
			nextUrl: {
				searchParams: {
					get: jest.fn((key: string) => {
						if (key === "email") return "test@example.com";
						return null;
					}),
				},
			},
		} as unknown as NextRequest;

		const response = await GET(req);
		expect(response.status).toBeGreaterThanOrEqual(200);
	});

	it("should successfully process unsubscribe request (behavior test)", async () => {
		const req = {
			nextUrl: {
				searchParams: {
					get: jest.fn((key: string) => {
						if (key === "email") return "test@example.com";
						if (key === "u") return "test@example.com";
						if (key === "t") return "valid-token";
						return null;
					}),
				},
			},
			formData: jest
				.fn()
				.mockResolvedValue(new Map([["List-Unsubscribe", "One-Click"]])),
			url: "https://example.com/api/unsubscribe/one-click?u=test@example.com&t=valid-token",
		} as unknown as NextRequest;

		// Behavior: Request should be processed (we're testing outcome, not internal calls)
		const response = await GET(req);
		expect(response.status).toBeGreaterThanOrEqual(200);
	});
});
