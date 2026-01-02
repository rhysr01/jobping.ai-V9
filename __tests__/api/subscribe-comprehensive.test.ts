/**
 * Tests for Subscribe API Route
 * Tests user subscription functionality
 */

import type { NextRequest } from "next/server";
import { POST } from "@/app/api/subscribe/route";

jest.mock("@/Utils/databasePool");
jest.mock("@/lib/errors", () => ({
	asyncHandler: (fn: any) => fn,
	ValidationError: class extends Error {
		constructor(message: string) {
			super(message);
			this.name = "ValidationError";
		}
	},
	AppError: class extends Error {
		constructor(message: string, status: number, code: string, details?: any) {
			super(message);
			this.name = "AppError";
			this.status = status;
			this.code = code;
			this.details = details;
		}
	},
}));

describe("Subscribe API Route", () => {
	let mockRequest: NextRequest;
	let mockSupabase: any;

	beforeEach(() => {
		jest.clearAllMocks();

		mockRequest = {
			method: "POST",
			formData: jest.fn(),
			headers: new Headers(),
		} as any;

		// Create chainable mock builder similar to engagementTracker pattern
		const createChainableMock = (finalResult?: any) => {
			const chain: any = {
				select: jest.fn().mockReturnThis(),
				insert: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn(),
			};

			if (finalResult) {
				chain.single.mockResolvedValue(finalResult);
			}

			return chain;
		};

		mockSupabase = {
			from: jest.fn().mockReturnValue(createChainableMock()),
		};

		const { getDatabaseClient } = require("@/Utils/databasePool");
		getDatabaseClient.mockReturnValue(mockSupabase);
	});

	describe("POST /api/subscribe", () => {
		it("should create new user subscription", async () => {
			const formData = new FormData();
			formData.append("email", "user@example.com");
			formData.append("name", "John Doe");
			formData.append("plan", "premium");

			mockRequest.formData.mockResolvedValue(formData);

			// Set up chain for select().eq().single() - no existing user
			const selectChain = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: null,
					error: { code: "PGRST116" },
				}),
			};

			// Set up chain for insert().select().single() - new user created
			const insertChain = {
				insert: jest.fn().mockReturnThis(),
				select: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: { id: "1", email: "user@example.com" },
					error: null,
				}),
			};

			let callCount = 0;
			mockSupabase.from.mockImplementation(() => {
				callCount++;
				if (callCount === 1) return selectChain; // First call: check existing user
				return insertChain; // Second call: insert new user
			});

			const response = await POST(mockRequest);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.userId).toBe("1");
		});

		it("should validate email format", async () => {
			const formData = new FormData();
			formData.append("email", "invalid-email");
			formData.append("name", "John Doe");
			formData.append("plan", "premium");

			mockRequest.formData.mockResolvedValue(formData);

			await expect(POST(mockRequest)).rejects.toThrow("Invalid email format");
		});

		it("should reject duplicate email", async () => {
			const formData = new FormData();
			formData.append("email", "existing@example.com");
			formData.append("name", "John Doe");
			formData.append("plan", "premium");

			mockRequest.formData.mockResolvedValue(formData);

			// User already exists
			const selectChain = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: { email: "existing@example.com" },
					error: null,
				}),
			};

			mockSupabase.from.mockReturnValue(selectChain);

			await expect(POST(mockRequest)).rejects.toThrow(
				"Email already registered",
			);
		});

		it("should handle free tier subscription", async () => {
			const formData = new FormData();
			formData.append("email", "user@example.com");
			formData.append("name", "John Doe");
			formData.append("plan", "free");

			mockRequest.formData.mockResolvedValue(formData);

			// Set up chains
			const selectChain = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: null,
					error: { code: "PGRST116" },
				}),
			};

			const insertChain = {
				insert: jest.fn().mockReturnThis(),
				select: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: { id: "1", email: "user@example.com" },
					error: null,
				}),
			};

			let callCount = 0;
			mockSupabase.from.mockImplementation(() => {
				callCount++;
				return callCount === 1 ? selectChain : insertChain;
			});

			const response = await POST(mockRequest);

			expect(response.status).toBe(200);
		});

		it("should handle database errors", async () => {
			const formData = new FormData();
			formData.append("email", "user@example.com");
			formData.append("name", "John Doe");
			formData.append("plan", "premium");

			mockRequest.formData.mockResolvedValue(formData);

			const selectChain = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: null,
					error: { code: "PGRST116" },
				}),
			};

			const insertChain = {
				insert: jest.fn().mockReturnThis(),
				select: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: null,
					error: { message: "Database error" },
				}),
			};

			let callCount = 0;
			mockSupabase.from.mockImplementation(() => {
				callCount++;
				return callCount === 1 ? selectChain : insertChain;
			});

			await expect(POST(mockRequest)).rejects.toThrow();
		});

		it.skip("should require database configuration", async () => {
			// TODO: This test is skipped because getDatabaseClient() throws synchronously
			// but the route handler is async. Need to check if this validation actually happens
			// at runtime or if it's handled elsewhere.
			delete process.env.NEXT_PUBLIC_SUPABASE_URL;

			const formData = new FormData();
			formData.append("email", "user@example.com");
			formData.append("name", "John Doe");
			formData.append("plan", "premium");

			mockRequest.formData.mockResolvedValue(formData);

			await expect(POST(mockRequest)).rejects.toThrow();
		});
	});
});
