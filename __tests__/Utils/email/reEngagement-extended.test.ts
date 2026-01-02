/**
 * Comprehensive tests for Re-Engagement Service
 * Tests email sending, candidate retrieval, stats
 */

import {
	getReEngagementStats,
	sendReEngagementEmails,
	shouldRunReEngagement,
} from "@/Utils/email/reEngagementService";

jest.mock("@/Utils/engagementTracker");
jest.mock("@/Utils/email/clients");
jest.mock("@/Utils/url-helpers", () => ({
	getUnsubscribeUrl: jest.fn(() => "https://getjobping.com/unsubscribe"),
}));

describe("Re-Engagement Service", () => {
	let mockResend: any;

	beforeEach(() => {
		jest.clearAllMocks();

		mockResend = {
			emails: {
				send: jest
					.fn()
					.mockResolvedValue({ data: { id: "email_123" }, error: null }),
			},
		};

		const { getResendClient } = require("@/Utils/email/clients");
		getResendClient.mockReturnValue(mockResend);
		require("@/Utils/email/clients").EMAIL_CONFIG = {
			from: "JobPing <noreply@getjobping.com>",
		};

		const {
			getReEngagementCandidates,
			markReEngagementSent,
		} = require("@/Utils/engagementTracker");
		getReEngagementCandidates.mockResolvedValue([
			{ email: "user1@example.com", full_name: "User One" },
			{ email: "user2@example.com", full_name: null },
		]);
		markReEngagementSent.mockResolvedValue(undefined);
	});

	describe("sendReEngagementEmails", () => {
		it("should send re-engagement emails", async () => {
			const result = await sendReEngagementEmails();

			expect(result.success).toBe(true);
			expect(result.emailsSent).toBe(2);
			expect(mockResend.emails.send).toHaveBeenCalledTimes(2);
		});

		it("should handle no candidates", async () => {
			const {
				getReEngagementCandidates,
			} = require("@/Utils/engagementTracker");
			getReEngagementCandidates.mockResolvedValue([]);

			const result = await sendReEngagementEmails();

			expect(result.emailsSent).toBe(0);
			expect(mockResend.emails.send).not.toHaveBeenCalled();
		});

		it("should handle send errors", async () => {
			mockResend.emails.send.mockRejectedValue(new Error("Send failed"));

			const result = await sendReEngagementEmails();

			expect(result.success).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it("should mark emails as sent", async () => {
			const { markReEngagementSent } = require("@/Utils/engagementTracker");

			await sendReEngagementEmails();

			expect(markReEngagementSent).toHaveBeenCalledTimes(2);
		});
	});

	describe("getReEngagementStats", () => {
		it("should get re-engagement statistics", async () => {
			const stats = await getReEngagementStats();

			expect(stats).toBeDefined();
			expect(stats.candidates).toBeDefined();
		});
	});

	describe("shouldRunReEngagement", () => {
		it("should determine if re-engagement should run", async () => {
			const shouldRun = await shouldRunReEngagement();

			expect(typeof shouldRun).toBe("boolean");
		});
	});
});
