/**
 * Tests for Email Deliverability
 * Tests email deliverability validation and bounce handling
 */

import {
	getBounceSuppressionListSize,
	getComplaintRate,
	handleBounce,
	handleComplaint,
	validateEmailDeliverability,
} from "@/Utils/email/deliverability";

jest.mock("@/Utils/databasePool");
jest.mock("@/Utils/url-helpers", () => ({
	getListUnsubscribeHeader: jest.fn(
		() => "<https://example.com/unsubscribe>, <mailto:unsubscribe@example.com>",
	),
}));

describe("Email Deliverability", () => {
	let mockSupabase: any;

	beforeEach(() => {
		jest.clearAllMocks();

		mockSupabase = {
			from: jest.fn().mockReturnThis(),
			select: jest.fn().mockReturnThis(),
			insert: jest.fn().mockReturnThis(),
			update: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			count: jest.fn().mockResolvedValue({ count: 0, error: null }),
		};

		const { getDatabaseClient } = require("@/Utils/databasePool");
		getDatabaseClient.mockReturnValue(mockSupabase);

		process.env.EMAIL_DOMAIN = "getjobping.com";
	});

	describe("validateEmailDeliverability", () => {
		it("should validate email deliverability setup", async () => {
			// Mock DNS lookups to pass
			jest
				.spyOn(require("dns").promises, "resolveTxt")
				.mockResolvedValue([["v=spf1 include:_spf.google.com ~all"]]);

			const result = await validateEmailDeliverability();

			expect(result).toHaveProperty("isValid");
			expect(result).toHaveProperty("issues");
			expect(result).toHaveProperty("recommendations");
		});

		it("should detect SPF issues", async () => {
			jest
				.spyOn(require("dns").promises, "resolveTxt")
				.mockRejectedValue(new Error("No SPF record"));

			const result = await validateEmailDeliverability();

			expect(result.issues.length).toBeGreaterThan(0);
		});

		it("should detect high bounce rate", async () => {
			mockSupabase.count.mockResolvedValue({ count: 150, error: null });

			const result = await validateEmailDeliverability();

			expect(result.issues.some((issue) => issue.includes("bounce"))).toBe(
				true,
			);
		});
	});

	describe("handleBounce", () => {
		it("should handle hard bounce", async () => {
			mockSupabase.insert.mockResolvedValue({ error: null });
			mockSupabase.update.mockResolvedValue({ error: null });

			await handleBounce({
				email: "bounced@example.com",
				bounceType: "hard",
				reason: "Invalid email address",
			});

			expect(mockSupabase.insert).toHaveBeenCalled();
		});

		it("should handle soft bounce", async () => {
			mockSupabase.insert.mockResolvedValue({ error: null });

			await handleBounce({
				email: "bounced@example.com",
				bounceType: "soft",
				reason: "Mailbox full",
			});

			expect(mockSupabase.insert).toHaveBeenCalled();
		});
	});

	describe("handleComplaint", () => {
		it("should handle spam complaint", async () => {
			mockSupabase.insert.mockResolvedValue({ error: null });
			mockSupabase.update.mockResolvedValue({ error: null });

			await handleComplaint({
				email: "complained@example.com",
				reason: "Spam complaint",
			});

			expect(mockSupabase.insert).toHaveBeenCalled();
		});
	});

	describe("getBounceSuppressionListSize", () => {
		it("should return bounce list size", async () => {
			mockSupabase.count.mockResolvedValue({ count: 25, error: null });

			const size = await getBounceSuppressionListSize();

			expect(size).toBe(25);
		});
	});

	describe("getComplaintRate", () => {
		it("should calculate complaint rate", async () => {
			mockSupabase.count
				.mockResolvedValueOnce({ count: 1000, error: null }) // Total emails
				.mockResolvedValueOnce({ count: 5, error: null }); // Complaints

			const rate = await getComplaintRate();

			expect(rate).toBeGreaterThanOrEqual(0);
			expect(rate).toBeLessThanOrEqual(1);
		});
	});
});
