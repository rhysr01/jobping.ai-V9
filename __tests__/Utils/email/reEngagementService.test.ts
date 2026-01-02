/**
 * Tests for Re-Engagement Email Service
 * Tests re-engagement email sending to inactive users
 */

import { getResendClient } from "@/Utils/email/clients";
import {
	sendReEngagementEmail,
	sendReEngagementEmails,
} from "@/Utils/email/reEngagementService";
import {
	getReEngagementCandidates,
	markReEngagementSent,
} from "@/Utils/engagementTracker";

jest.mock("@/Utils/engagementTracker");
jest.mock("@/Utils/email/clients");
jest.mock("@/Utils/url-helpers", () => ({
	getUnsubscribeUrl: jest.fn(
		(email) => `https://jobping.com/unsubscribe?email=${email}`,
	),
}));

describe("Re-Engagement Email Service", () => {
	let mockResend: any;

	beforeEach(() => {
		jest.clearAllMocks();

		mockResend = {
			emails: {
				send: jest.fn().mockResolvedValue({ error: null }),
			},
		};

		(getResendClient as jest.Mock).mockReturnValue(mockResend);
		process.env.RESEND_API_KEY = "re_test_key";
	});

	describe("sendReEngagementEmails", () => {
		it("should send re-engagement emails to candidates", async () => {
			const candidates = [
				{ email: "user1@example.com", full_name: "User 1" },
				{ email: "user2@example.com", full_name: "User 2" },
			];

			(getReEngagementCandidates as jest.Mock).mockResolvedValue(candidates);
			(markReEngagementSent as jest.Mock).mockResolvedValue(undefined);

			const result = await sendReEngagementEmails();

			expect(result.success).toBe(true);
			expect(result.emailsSent).toBe(2);
			expect(result.errors).toHaveLength(0);
		});

		it("should return early when no candidates", async () => {
			(getReEngagementCandidates as jest.Mock).mockResolvedValue([]);

			const result = await sendReEngagementEmails();

			expect(result.emailsSent).toBe(0);
			expect(mockResend.emails.send).not.toHaveBeenCalled();
		});

		it("should handle email send errors gracefully", async () => {
			const candidates = [{ email: "user@example.com", full_name: "User" }];
			(getReEngagementCandidates as jest.Mock).mockResolvedValue(candidates);
			mockResend.emails.send.mockRejectedValue(new Error("Send failed"));

			const result = await sendReEngagementEmails();

			expect(result.success).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it("should mark emails as sent after successful send", async () => {
			const candidates = [{ email: "user@example.com", full_name: "User" }];
			(getReEngagementCandidates as jest.Mock).mockResolvedValue(candidates);
			(markReEngagementSent as jest.Mock).mockResolvedValue(undefined);

			await sendReEngagementEmails();

			expect(markReEngagementSent).toHaveBeenCalledWith("user@example.com");
		});
	});
});
