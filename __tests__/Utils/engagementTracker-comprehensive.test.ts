/**
 * Comprehensive tests for Engagement Tracker
 * Tests engagement scoring, re-engagement, delivery pausing
 */

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

jest.mock("@/Utils/databasePool");

describe("Engagement Tracker", () => {
	let mockSupabase: any;

	beforeEach(() => {
		jest.clearAllMocks();

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

			if (finalResult) {
				chain.single.mockResolvedValue(finalResult);
			}

			return chain;
		};

		mockSupabase = {
			from: jest.fn().mockReturnValue(createChainableMock()),
			rpc: jest.fn(),
		};

		const { getDatabaseClient } = require("@/Utils/databasePool");
		getDatabaseClient.mockReturnValue(mockSupabase);
	});

	describe("isUserEngaged", () => {
		it("should return true for engaged user", async () => {
			const thirtyDaysAgo = new Date();
			thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 10);

			mockSupabase.from().single.mockResolvedValue({
				data: {
					email_engagement_score: 50,
					delivery_paused: false,
					last_engagement_date: thirtyDaysAgo.toISOString(),
				},
				error: null,
			});

			const result = await isUserEngaged("user@example.com");

			expect(result).toBe(true);
		});

		it("should return false for low engagement score", async () => {
			mockSupabase.from().single.mockResolvedValue({
				data: {
					email_engagement_score: 20,
					delivery_paused: false,
					last_engagement_date: new Date().toISOString(),
				},
				error: null,
			});

			const result = await isUserEngaged("user@example.com");

			expect(result).toBe(false);
		});

		it("should return false for paused user", async () => {
			mockSupabase.from().single.mockResolvedValue({
				data: {
					email_engagement_score: 50,
					delivery_paused: true,
					last_engagement_date: new Date().toISOString(),
				},
				error: null,
			});

			const result = await isUserEngaged("user@example.com");

			expect(result).toBe(false);
		});

		it("should return false for old engagement", async () => {
			const oldDate = new Date();
			oldDate.setDate(oldDate.getDate() - 40);

			mockSupabase.from().single.mockResolvedValue({
				data: {
					email_engagement_score: 50,
					delivery_paused: false,
					last_engagement_date: oldDate.toISOString(),
				},
				error: null,
			});

			const result = await isUserEngaged("user@example.com");

			expect(result).toBe(false);
		});
	});

	describe("updateUserEngagement", () => {
		it("should update engagement via RPC", async () => {
			mockSupabase.rpc.mockResolvedValue({ error: null });

			await updateUserEngagement("user@example.com", "email_opened");

			expect(mockSupabase.rpc).toHaveBeenCalledWith("update_user_engagement", {
				user_email: "user@example.com",
				engagement_type: "email_opened",
			});
		});

		it("should handle RPC errors", async () => {
			mockSupabase.rpc.mockResolvedValue({
				error: new Error("RPC failed"),
			});

			await expect(
				updateUserEngagement("user@example.com", "email_clicked"),
			).resolves.not.toThrow();
		});
	});

	describe("getReEngagementCandidates", () => {
		it("should get re-engagement candidates", async () => {
			mockSupabase.rpc.mockResolvedValue({
				data: [
					{ email: "user1@example.com", email_engagement_score: 20 },
					{ email: "user2@example.com", email_engagement_score: 15 },
				],
				error: null,
			});

			const result = await getReEngagementCandidates();

			expect(result.length).toBe(2);
			expect(mockSupabase.rpc).toHaveBeenCalledWith(
				"get_users_for_re_engagement",
			);
		});

		it("should return empty array on error", async () => {
			mockSupabase.rpc.mockResolvedValue({
				data: null,
				error: new Error("RPC failed"),
			});

			const result = await getReEngagementCandidates();

			expect(result).toEqual([]);
		});
	});

	describe("markReEngagementSent", () => {
		it("should mark re-engagement as sent", async () => {
			mockSupabase.from().update().eq.mockResolvedValue({ error: null });

			await markReEngagementSent("user@example.com");

			expect(mockSupabase.from).toHaveBeenCalledWith("users");
		});
	});

	describe("getEngagementStats", () => {
		it("should get engagement statistics", async () => {
			const totalChain = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn(),
			};
			totalChain.select.mockResolvedValue({ data: Array(100), error: null });

			const engagedChain = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				gte: jest.fn().mockReturnThis(),
				single: jest.fn(),
			};
			engagedChain.select.mockResolvedValue({ data: Array(70), error: null });

			const pausedChain = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn(),
			};
			pausedChain.select.mockResolvedValue({ data: Array(10), error: null });

			let callCount = 0;
			mockSupabase.from.mockImplementation(() => {
				callCount++;
				if (callCount === 1) return totalChain;
				if (callCount === 2) return engagedChain;
				return pausedChain;
			});

			mockSupabase.rpc.mockResolvedValue({
				data: Array(5),
				error: null,
			});

			const result = await getEngagementStats();

			expect(result.total_users).toBe(100);
			expect(result.engaged_users).toBe(70);
			expect(result.paused_users).toBe(10);
		});
	});

	describe("shouldSendEmailToUser", () => {
		it("should return true for eligible user", async () => {
			mockSupabase.from().single.mockResolvedValue({
				data: {
					delivery_paused: false,
					email_engagement_score: 50,
					last_engagement_date: new Date().toISOString(),
				},
				error: null,
			});

			const result = await shouldSendEmailToUser("user@example.com");

			expect(result).toBe(true);
		});

		it("should return false for paused user", async () => {
			mockSupabase.from().single.mockResolvedValue({
				data: {
					delivery_paused: true,
					email_engagement_score: 50,
					last_engagement_date: new Date().toISOString(),
				},
				error: null,
			});

			const result = await shouldSendEmailToUser("user@example.com");

			expect(result).toBe(false);
		});
	});

	describe("getEngagedUsersForDelivery", () => {
		it("should get engaged users for delivery", async () => {
			mockSupabase.from().select.mockResolvedValue({
				data: [{ email: "user1@example.com" }, { email: "user2@example.com" }],
				error: null,
			});

			const result = await getEngagedUsersForDelivery();

			expect(result).toEqual(["user1@example.com", "user2@example.com"]);
		});
	});

	describe("resetUserEngagement", () => {
		it("should reset engagement in non-production", async () => {
			process.env.NODE_ENV = "development";

			mockSupabase.from().update().eq.mockResolvedValue({ error: null });

			await resetUserEngagement("user@example.com");

			expect(mockSupabase.from).toHaveBeenCalledWith("users");
		});

		it("should not reset in production", async () => {
			process.env.NODE_ENV = "production";

			await resetUserEngagement("user@example.com");

			expect(mockSupabase.from).not.toHaveBeenCalled();
		});
	});
});
