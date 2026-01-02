/**
 * Tests for Engagement Tracker
 * Tests user engagement tracking and email delivery logic
 */

import { getDatabaseClient } from "@/Utils/databasePool";
import {
	getEngagedUsersForDelivery,
	getEngagementStats,
	getReEngagementCandidates,
	isUserEngaged,
	markReEngagementSent,
	resetUserEngagement,
	shouldSendEmailToUser,
	updateUserEngagement,
} from "@/Utils/engagementTracker";

// Mock database pool
jest.mock("@/Utils/databasePool", () => ({
	getDatabaseClient: jest.fn(),
}));

describe("Engagement Tracker", () => {
	let mockSupabase: any;

	beforeEach(() => {
		jest.clearAllMocks();

		// Create a chainable mock builder that properly handles all Supabase chaining
		const createChainableMock = (finalResult?: any) => {
			const chain: any = {
				eq: jest.fn().mockReturnThis(),
				gte: jest.fn().mockReturnThis(),
				select: jest.fn().mockReturnThis(),
				update: jest.fn().mockReturnThis(),
				insert: jest.fn().mockReturnThis(),
				single: jest.fn(),
				rpc: jest.fn(),
			};

			// If finalResult is provided, make single() return it
			if (finalResult) {
				chain.single.mockResolvedValue(finalResult);
			}

			return chain;
		};

		mockSupabase = {
			from: jest.fn().mockReturnValue(createChainableMock()),
			rpc: jest.fn(),
		};

		(getDatabaseClient as jest.Mock).mockReturnValue(mockSupabase);
	});

	describe("isUserEngaged", () => {
		it("should return true for engaged user", async () => {
			const thirtyDaysAgo = new Date();
			thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 15); // 15 days ago

			const chain = {
				eq: jest.fn().mockReturnThis(),
				select: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: {
						email_engagement_score: 50,
						delivery_paused: false,
						last_engagement_date: thirtyDaysAgo.toISOString(),
					},
					error: null,
				}),
			};

			mockSupabase.from.mockReturnValue(chain);

			const result = await isUserEngaged("user@example.com");

			expect(result).toBe(true);
			expect(mockSupabase.from).toHaveBeenCalledWith("users");
		});

		it("should return false for user with low engagement score", async () => {
			const chain = {
				eq: jest.fn().mockReturnThis(),
				select: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: {
						email_engagement_score: 20,
						delivery_paused: false,
						last_engagement_date: new Date().toISOString(),
					},
					error: null,
				}),
			};

			mockSupabase.from.mockReturnValue(chain);

			const result = await isUserEngaged("user@example.com");

			expect(result).toBe(false);
		});

		it("should return false for paused user", async () => {
			const chain = {
				eq: jest.fn().mockReturnThis(),
				select: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: {
						email_engagement_score: 50,
						delivery_paused: true,
						last_engagement_date: new Date().toISOString(),
					},
					error: null,
				}),
			};

			mockSupabase.from.mockReturnValue(chain);

			const result = await isUserEngaged("user@example.com");

			expect(result).toBe(false);
		});

		it("should return false for user with old engagement", async () => {
			const fortyDaysAgo = new Date();
			fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40);

			const chain = {
				eq: jest.fn().mockReturnThis(),
				select: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: {
						email_engagement_score: 50,
						delivery_paused: false,
						last_engagement_date: fortyDaysAgo.toISOString(),
					},
					error: null,
				}),
			};

			mockSupabase.from.mockReturnValue(chain);

			const result = await isUserEngaged("user@example.com");

			expect(result).toBe(false);
		});

		it("should return false when user not found", async () => {
			const chain = {
				eq: jest.fn().mockReturnThis(),
				select: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: null,
					error: { message: "User not found" },
				}),
			};

			mockSupabase.from.mockReturnValue(chain);

			const result = await isUserEngaged("user@example.com");

			expect(result).toBe(false);
		});

		it("should return false when database error occurs", async () => {
			const chain = {
				eq: jest.fn().mockReturnThis(),
				select: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: null,
					error: { message: "Database error" },
				}),
			};

			mockSupabase.from.mockReturnValue(chain);

			const result = await isUserEngaged("user@example.com");

			expect(result).toBe(false);
		});
	});

	describe("updateUserEngagement", () => {
		it("should update engagement for email_opened", async () => {
			mockSupabase.rpc.mockResolvedValue({ error: null });

			await updateUserEngagement("user@example.com", "email_opened");

			expect(mockSupabase.rpc).toHaveBeenCalledWith("update_user_engagement", {
				user_email: "user@example.com",
				engagement_type: "email_opened",
			});
		});

		it("should update engagement for email_clicked", async () => {
			mockSupabase.rpc.mockResolvedValue({ error: null });

			await updateUserEngagement("user@example.com", "email_clicked");

			expect(mockSupabase.rpc).toHaveBeenCalledWith("update_user_engagement", {
				user_email: "user@example.com",
				engagement_type: "email_clicked",
			});
		});

		it("should update engagement for email_sent", async () => {
			mockSupabase.rpc.mockResolvedValue({ error: null });

			await updateUserEngagement("user@example.com", "email_sent");

			expect(mockSupabase.rpc).toHaveBeenCalledWith("update_user_engagement", {
				user_email: "user@example.com",
				engagement_type: "email_sent",
			});
		});

		it("should handle database errors gracefully", async () => {
			mockSupabase.rpc.mockResolvedValue({
				error: { message: "Database error" },
			});

			// Should not throw
			await expect(
				updateUserEngagement("user@example.com", "email_opened"),
			).resolves.not.toThrow();
		});
	});

	describe("getReEngagementCandidates", () => {
		it("should return re-engagement candidates", async () => {
			const mockCandidates = [
				{
					email: "user1@example.com",
					full_name: "User 1",
					email_engagement_score: 20,
					delivery_paused: false,
					last_engagement_date: null,
					last_email_opened: null,
					last_email_clicked: null,
					re_engagement_sent: false,
				},
			];

			mockSupabase.rpc.mockResolvedValue({
				data: mockCandidates,
				error: null,
			});

			const result = await getReEngagementCandidates();

			expect(result).toEqual(mockCandidates);
			expect(mockSupabase.rpc).toHaveBeenCalledWith(
				"get_users_for_re_engagement",
			);
		});

		it("should return empty array on error", async () => {
			mockSupabase.rpc.mockResolvedValue({
				data: null,
				error: { message: "Database error" },
			});

			const result = await getReEngagementCandidates();

			expect(result).toEqual([]);
		});
	});

	describe("markReEngagementSent", () => {
		it("should mark re-engagement as sent", async () => {
			const chain = {
				eq: jest.fn().mockResolvedValue({ error: null }),
				update: jest.fn().mockReturnThis(),
			};

			mockSupabase.from.mockReturnValue(chain);

			await markReEngagementSent("user@example.com");

			expect(mockSupabase.from).toHaveBeenCalledWith("users");
			expect(chain.update).toHaveBeenCalledWith({ re_engagement_sent: true });
			expect(chain.eq).toHaveBeenCalledWith("email", "user@example.com");
		});

		it("should handle errors gracefully", async () => {
			const chain = {
				eq: jest.fn().mockResolvedValue({
					error: { message: "Database error" },
				}),
				update: jest.fn().mockReturnThis(),
			};

			mockSupabase.from.mockReturnValue(chain);

			await expect(
				markReEngagementSent("user@example.com"),
			).resolves.not.toThrow();
		});
	});

	describe("getEngagementStats", () => {
		it("should return engagement statistics", async () => {
			// Create separate chainable mocks for each query
			const totalUsersChain = {
				eq: jest.fn().mockReturnThis(),
				select: jest.fn().mockReturnThis(),
			};
			totalUsersChain.eq.mockReturnValueOnce(totalUsersChain);
			totalUsersChain.eq.mockResolvedValueOnce({
				data: [{ email: "user1@example.com" }, { email: "user2@example.com" }],
				error: null,
				length: 2,
			});

			const engagedUsersChain = {
				eq: jest.fn().mockReturnThis(),
				gte: jest.fn().mockReturnThis(),
				select: jest.fn().mockReturnThis(),
			};
			engagedUsersChain.eq.mockReturnValueOnce(engagedUsersChain);
			engagedUsersChain.eq.mockReturnValueOnce(engagedUsersChain);
			engagedUsersChain.gte.mockReturnValueOnce(engagedUsersChain);
			engagedUsersChain.eq.mockResolvedValueOnce({
				data: [{ email: "user1@example.com" }],
				error: null,
				length: 1,
			});

			const pausedUsersChain = {
				eq: jest.fn().mockReturnThis(),
				select: jest.fn().mockReturnThis(),
			};
			pausedUsersChain.eq.mockReturnValueOnce(pausedUsersChain);
			pausedUsersChain.eq.mockReturnValueOnce(pausedUsersChain);
			pausedUsersChain.eq.mockResolvedValueOnce({
				data: [],
				error: null,
				length: 0,
			});

			// Set up from() to return different chains
			let callCount = 0;
			mockSupabase.from.mockImplementation(() => {
				callCount++;
				if (callCount === 1) return totalUsersChain;
				if (callCount === 2) return engagedUsersChain;
				if (callCount === 3) return pausedUsersChain;
				return totalUsersChain;
			});

			// Mock re-engagement candidates
			mockSupabase.rpc.mockResolvedValue({
				data: [{ email: "user2@example.com" }],
				error: null,
			});

			const stats = await getEngagementStats();

			expect(stats.total_users).toBe(2);
			expect(stats.engaged_users).toBe(1);
			expect(stats.paused_users).toBe(0);
			expect(stats.re_engagement_candidates).toBe(1);
		});

		it("should handle errors and return zero stats", async () => {
			// Mock error response
			const errorChain = {
				eq: jest.fn().mockReturnThis(),
				select: jest.fn().mockReturnThis(),
			};
			errorChain.eq.mockReturnValueOnce(errorChain);
			errorChain.eq.mockResolvedValueOnce({
				data: null,
				error: { message: "Database error" },
				length: 0,
			});

			mockSupabase.from.mockReturnValue(errorChain);

			const stats = await getEngagementStats();

			expect(stats.total_users).toBe(0);
			expect(stats.engaged_users).toBe(0);
			expect(stats.paused_users).toBe(0);
			expect(stats.re_engagement_candidates).toBe(0);
		});
	});

	describe("shouldSendEmailToUser", () => {
		it("should return true for eligible user", async () => {
			const thirtyDaysAgo = new Date();
			thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 15);

			const chain = {
				eq: jest.fn().mockReturnThis(),
				select: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: {
						delivery_paused: false,
						email_engagement_score: 50,
						last_engagement_date: thirtyDaysAgo.toISOString(),
					},
					error: null,
				}),
			};

			mockSupabase.from.mockReturnValue(chain);

			const result = await shouldSendEmailToUser("user@example.com");

			expect(result).toBe(true);
		});

		it("should return false for paused user", async () => {
			const chain = {
				eq: jest.fn().mockReturnThis(),
				select: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: {
						delivery_paused: true,
						email_engagement_score: 50,
						last_engagement_date: new Date().toISOString(),
					},
					error: null,
				}),
			};

			mockSupabase.from.mockReturnValue(chain);

			const result = await shouldSendEmailToUser("user@example.com");

			expect(result).toBe(false);
		});

		it("should return false when user not found", async () => {
			const chain = {
				eq: jest.fn().mockReturnThis(),
				select: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: null,
					error: { message: "User not found" },
				}),
			};

			mockSupabase.from.mockReturnValue(chain);

			const result = await shouldSendEmailToUser("user@example.com");

			expect(result).toBe(false);
		});
	});

	describe("getEngagedUsersForDelivery", () => {
		it("should return list of engaged user emails", async () => {
			const chain = {
				eq: jest.fn().mockReturnThis(),
				gte: jest.fn().mockResolvedValue({
					data: [
						{ email: "user1@example.com" },
						{ email: "user2@example.com" },
					],
					error: null,
				}),
				select: jest.fn().mockReturnThis(),
			};

			mockSupabase.from.mockReturnValue(chain);

			const result = await getEngagedUsersForDelivery();

			expect(result).toEqual(["user1@example.com", "user2@example.com"]);
			expect(mockSupabase.from).toHaveBeenCalledWith("users");
		});

		it("should return empty array on error", async () => {
			const chain = {
				eq: jest.fn().mockReturnThis(),
				gte: jest.fn().mockResolvedValue({
					data: null,
					error: { message: "Database error" },
				}),
				select: jest.fn().mockReturnThis(),
			};

			mockSupabase.from.mockReturnValue(chain);

			const result = await getEngagedUsersForDelivery();

			expect(result).toEqual([]);
		});
	});

	describe("resetUserEngagement", () => {
		beforeEach(() => {
			process.env.NODE_ENV = "test";
		});

		afterEach(() => {
			delete process.env.NODE_ENV;
		});

		it("should reset engagement in test environment", async () => {
			const chain = {
				eq: jest.fn().mockResolvedValue({ error: null }),
				update: jest.fn().mockReturnThis(),
			};

			mockSupabase.from.mockReturnValue(chain);

			await resetUserEngagement("user@example.com");

			expect(chain.update).toHaveBeenCalledWith(
				expect.objectContaining({
					email_engagement_score: 100,
					delivery_paused: false,
					re_engagement_sent: false,
				}),
			);
		});

		it("should not reset in production", async () => {
			process.env.NODE_ENV = "production";

			await resetUserEngagement("user@example.com");

			expect(mockSupabase.from).not.toHaveBeenCalled();
		});

		it("should handle errors gracefully", async () => {
			const chain = {
				eq: jest.fn().mockResolvedValue({
					error: { message: "Database error" },
				}),
				update: jest.fn().mockReturnThis(),
			};

			mockSupabase.from.mockReturnValue(chain);

			await expect(
				resetUserEngagement("user@example.com"),
			).resolves.not.toThrow();
		});
	});
});
