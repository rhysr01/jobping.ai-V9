/**
 * Contract Tests for /api/tracking/implicit
 *
 * Tests the implicit user behavior tracking API contract.
 * This API captures user engagement signals for analytics and personalization.
 * Uses mocked database to avoid dependencies on tracking tables.
 */

import { createMocks } from "node-mocks-http";
import { GET, POST } from "@/app/api/tracking/implicit/route";
import { apiLogger } from "@/lib/api-logger";

// Mock external dependencies
jest.mock("@/lib/api-logger", () => ({
	apiLogger: {
		info: jest.fn(),
		error: jest.fn(),
		warn: jest.fn(),
		debug: jest.fn(),
	},
}));

// Mock database to avoid requiring tracking tables
const mockSupabase = {
	from: jest.fn(() => ({
		insert: jest.fn().mockResolvedValue({}),
		select: jest.fn(() => ({
			eq: jest.fn(() => ({
				order: jest.fn(() => ({
					limit: jest.fn().mockResolvedValue({
						data: [],
						error: null,
					}),
				})),
			})),
		})),
	})),
};

jest.mock("@/utils/databasePool", () => ({
	getDatabaseClient: jest.fn(() => mockSupabase),
}));

describe("POST /api/tracking/implicit - Contract Tests", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("Input Validation", () => {
		it("should return 400 for missing jobHash", async () => {
			const mockRequest = {
				json: jest.fn().mockResolvedValue({
					email: "user@example.com",
					signalType: "click",
				}),
			} as any;

			const response = await POST(mockRequest);
			expect(response.status).toBe(400);

			const data = await response.json();
			expect(data.error).toBe("Missing required fields");
		});

		it("should return 400 for missing email", async () => {
			const mockRequest = {
				json: jest.fn().mockResolvedValue({
					jobHash: "job123",
					signalType: "click",
				}),
			} as any;

			const response = await POST(mockRequest);
			expect(response.status).toBe(400);

			const data = await response.json();
			expect(data.error).toBe("Missing required fields");
		});

		it("should return 400 for missing signalType", async () => {
			const mockRequest = {
				json: jest.fn().mockResolvedValue({
					jobHash: "job123",
					email: "user@example.com",
				}),
			} as any;

			const response = await POST(mockRequest);
			expect(response.status).toBe(400);

			const data = await response.json();
			expect(data.error).toBe("Missing required fields");
		});

		it("should return 400 for invalid signal type", async () => {
			const mockRequest = {
				json: jest.fn().mockResolvedValue({
					jobHash: "job123",
					email: "user@example.com",
					signalType: "invalid_signal",
				}),
			} as any;

			const response = await POST(mockRequest);
			expect(response.status).toBe(400);

			const data = await response.json();
			expect(data.error).toBe("Invalid signal type");
		});

		it("should accept all valid signal types", async () => {
			const validSignalTypes = ["open", "click", "dwell", "scroll", "close", "shown"];

			for (const signalType of validSignalTypes) {
				const { req } = createMocks({
					method: "POST",
					body: {
						jobHash: "job123",
						email: "user@example.com",
						signalType,
					},
				});

				const response = await POST(req as any);
				expect(response.status).toBe(200);

				const data = await response.json();
				expect(data.success).toBe(true);
			}
		});
	});

	describe("Signal Recording", () => {
		beforeEach(() => {
			mockSupabase.from.mockReturnValue({
				insert: jest.fn().mockResolvedValue({}),
			});
		});

		it("should record basic signal successfully", async () => {
			const { req } = createMocks({
				method: "POST",
				body: {
					jobHash: "job123",
					email: "user@example.com",
					signalType: "click",
				},
			});

			const response = await POST(req as any);
			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data.message).toBe("Signal recorded successfully!");
			expect(data.signalId).toBeDefined();
		});

		it("should record signal with value and metadata", async () => {
			const { req } = createMocks({
				method: "POST",
				body: {
					jobHash: "job123",
					email: "user@example.com",
					signalType: "dwell",
					value: 5000,
					metadata: {
						pagePosition: "top",
						elementId: "job-card",
					},
					source: "web",
					sessionId: "session123",
				},
			});

			const response = await POST(req as any);
			expect(response.status).toBe(200);

			expect(mockSupabase.from).toHaveBeenCalledWith("implicit_signals");
			expect(mockSupabase.from().insert).toHaveBeenCalledWith(
				expect.objectContaining({
					user_email: "user@example.com",
					job_hash: "job123",
					signal_type: "dwell",
					value: 5000,
					metadata: expect.objectContaining({
						pagePosition: "top",
						elementId: "job-card",
						source: "web",
					}),
					source: "web",
					session_id: "session123",
				})
			);
		});

		it("should extract IP and user agent from headers", async () => {
			const { req } = createMocks({
				method: "POST",
				headers: {
					"x-forwarded-for": "192.168.1.1",
					"user-agent": "Mozilla/5.0 Test Browser",
				},
				body: {
					jobHash: "job123",
					email: "user@example.com",
					signalType: "open",
				},
			});

			await POST(req as any);

			expect(mockSupabase.from().insert).toHaveBeenCalledWith(
				expect.objectContaining({
					ip_address: "192.168.1.1",
					user_agent: "Mozilla/5.0 Test Browser",
				})
			);
		});
	});

	describe("Feedback Signal Recording", () => {
		beforeEach(() => {
			mockSupabase.from.mockReturnValue({
				insert: jest.fn().mockResolvedValue({}),
			});
		});

		it("should record click signals as positive feedback", async () => {
			const { req } = createMocks({
				method: "POST",
				body: {
					jobHash: "job123",
					email: "user@example.com",
					signalType: "click",
				},
			});

			await POST(req as any);

			expect(mockSupabase.from).toHaveBeenCalledWith("match_logs");

			const matchLogsCall = mockSupabase.from.mock.calls.find(
				(call) => call[0] === "match_logs"
			);
			expect(matchLogsCall).toBeDefined();

			const insertCall = matchLogsCall[1].insert.mock.calls[0][0];
			expect(insertCall.match_score).toBe(1);
			expect(insertCall.match_quality).toBe("positive");
			expect(insertCall.match_tags.signal_type).toBe("click");
		});

		it("should record shown signals for CTR tracking", async () => {
			const { req } = createMocks({
				method: "POST",
				body: {
					jobHash: "job123",
					email: "user@example.com",
					signalType: "shown",
				},
			});

			await POST(req as any);

			expect(mockSupabase.from).toHaveBeenCalledWith("match_logs");

			const matchLogsCall = mockSupabase.from.mock.calls.find(
				(call) => call[0] === "match_logs"
			);
			const insertCall = matchLogsCall[1].insert.mock.calls[0][0];
			expect(insertCall.match_score).toBe(0);
			expect(insertCall.match_quality).toBe("neutral");
			expect(insertCall.match_tags.signal_type).toBe("shown");
		});
	});

	describe("Response Format Contract", () => {
		it("should return consistent success response", async () => {
			const { req } = createMocks({
				method: "POST",
				body: {
					jobHash: "job123",
					email: "user@example.com",
					signalType: "click",
				},
			});

			const response = await POST(req as any);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data).toEqual({
				success: true,
				message: "Signal recorded successfully!",
				signalId: expect.any(String),
			});
		});
	});
});

describe("GET /api/tracking/implicit - Contract Tests", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockSupabase.from.mockReturnValue({
			select: jest.fn(() => ({
				eq: jest.fn(() => ({
					order: jest.fn(() => ({
						limit: jest.fn().mockResolvedValue({
							data: [],
							error: null,
						}),
					})),
				})),
			})),
		});
	});

	describe("Query Parameters", () => {
		it("should return 400 for missing email", async () => {
			const mockRequest = {
				method: "GET",
				url: "http://localhost/api/tracking/implicit",
				nextUrl: new URL("http://localhost/api/tracking/implicit"),
			} as any;

			const response = await GET(mockRequest);
			expect(response.status).toBe(400);

			const data = await response.json();
			expect(data.error).toBe("Email parameter required");
		});

		it("should accept email parameter", async () => {
			const { req } = createMocks({
				method: "GET",
				url: "/api/tracking/implicit?email=user@example.com",
			});

			const response = await GET(req as any);
			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data.success).toBe(true);
		});
	});

	describe("Response Format", () => {
		it("should return signals with job data", async () => {
			mockSupabase.from.mockReturnValue({
				select: jest.fn(() => ({
					eq: jest.fn(() => ({
						order: jest.fn(() => ({
							limit: jest.fn().mockResolvedValue({
								data: [
									{
										user_email: "user@example.com",
										job_hash: "job123",
										signal_type: "click",
										value: null,
										created_at: "2024-01-01T00:00:00Z",
										jobs: {
											title: "Test Job",
											company: "Test Corp",
											location: "London",
											job_url: "https://example.com/job",
										},
									},
								],
								error: null,
							}),
						})),
					})),
				})),
			});

			const { req } = createMocks({
				method: "GET",
				url: "/api/tracking/implicit?email=user@example.com",
			});

			const response = await GET(req as any);
			const data = await response.json();

			expect(data.success).toBe(true);
			expect(Array.isArray(data.signals)).toBe(true);
			expect(typeof data.count).toBe("number");
		});
	});
});
