/**
 * Comprehensive tests for Email Deliverability
 * Tests DMARC/SPF/DKIM validation, bounce handling, unsubscribe
 */

import {
	addToBounceSuppressionList,
	getBounceSuppressionListSize,
	getComplaintRate,
	isInBounceSuppressionList,
	unsubscribeUser,
	validateEmailDeliverability,
} from "@/Utils/email/deliverability";

jest.mock("@/Utils/databasePool");
jest.mock("dns", () => ({
	promises: {
		resolveTxt: jest.fn(),
	},
}));

describe("Email Deliverability", () => {
	let mockSupabase: any;

	beforeEach(() => {
		jest.clearAllMocks();

		mockSupabase = {
			from: jest.fn().mockReturnThis(),
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			gte: jest.fn().mockReturnThis(),
			single: jest.fn(),
			insert: jest.fn().mockResolvedValue({ error: null }),
			update: jest.fn().mockReturnThis(),
			upsert: jest.fn().mockResolvedValue({ error: null }),
		};

		const { getDatabaseClient } = require("@/Utils/databasePool");
		getDatabaseClient.mockReturnValue(mockSupabase);

		process.env.EMAIL_DOMAIN = "getjobping.com";
	});

	describe("validateEmailDeliverability", () => {
		it("should validate SPF record", async () => {
			const dns = require("dns").promises;
			dns.resolveTxt.mockResolvedValue([
				["v=spf1 include:_spf.resend.com ~all"],
			]);

			const result = await validateEmailDeliverability();

			expect(result.isValid).toBeDefined();
			expect(result.issues).toBeDefined();
			expect(result.recommendations).toBeDefined();
		});

		it("should detect missing SPF record", async () => {
			const dns = require("dns").promises;
			dns.resolveTxt.mockRejectedValue(new Error("Not found"));

			const result = await validateEmailDeliverability();

			expect(result.issues.some((i) => i.includes("SPF"))).toBe(true);
		});

		it("should validate DKIM record", async () => {
			const dns = require("dns").promises;
			dns.resolveTxt
				.mockResolvedValueOnce([]) // SPF
				.mockResolvedValueOnce([["v=DKIM1 k=rsa p=..."]]); // DKIM

			const result = await validateEmailDeliverability();

			expect(result).toBeDefined();
		});

		it("should validate DMARC record", async () => {
			const dns = require("dns").promises;
			dns.resolveTxt
				.mockResolvedValueOnce([]) // SPF
				.mockResolvedValueOnce([]) // DKIM
				.mockResolvedValueOnce([["v=DMARC1; p=quarantine"]]); // DMARC

			const result = await validateEmailDeliverability();

			expect(result).toBeDefined();
		});
	});

	describe("addToBounceSuppressionList", () => {
		it("should add email to suppression list", async () => {
			mockSupabase.single.mockResolvedValue({ data: null, error: null });

			const result = await addToBounceSuppressionList(
				"bounced@example.com",
				"hard",
				"Invalid recipient",
			);

			expect(result).toBe(true);
			expect(mockSupabase.insert).toHaveBeenCalled();
		});

		it("should update existing suppression record", async () => {
			mockSupabase.single.mockResolvedValue({
				data: { email: "bounced@example.com", retry_count: 1 },
				error: null,
			});

			const result = await addToBounceSuppressionList(
				"bounced@example.com",
				"hard",
				"Invalid recipient",
			);

			expect(result).toBe(true);
			expect(mockSupabase.update).toHaveBeenCalled();
		});

		it("should unsubscribe on hard bounce", async () => {
			mockSupabase.single.mockResolvedValue({ data: null, error: null });
			mockSupabase.eq.mockReturnThis();

			await addToBounceSuppressionList(
				"bounced@example.com",
				"hard",
				"Invalid recipient",
			);

			expect(mockSupabase.from).toHaveBeenCalledWith("users");
		});
	});

	describe("isInBounceSuppressionList", () => {
		it("should return true for hard bounce", async () => {
			mockSupabase.single.mockResolvedValue({
				data: {
					email: "bounced@example.com",
					bounce_type: "hard",
					retry_count: 1,
				},
				error: null,
			});

			const result = await isInBounceSuppressionList("bounced@example.com");

			expect(result).toBe(true);
		});

		it("should return true for soft bounce with high retry count", async () => {
			mockSupabase.single.mockResolvedValue({
				data: {
					email: "bounced@example.com",
					bounce_type: "soft",
					retry_count: 3,
				},
				error: null,
			});

			const result = await isInBounceSuppressionList("bounced@example.com");

			expect(result).toBe(true);
		});

		it("should return false for email not in list", async () => {
			mockSupabase.single.mockResolvedValue({ data: null, error: null });

			const result = await isInBounceSuppressionList("test@example.com");

			expect(result).toBe(false);
		});
	});

	describe("unsubscribeUser", () => {
		it("should successfully unsubscribe user (behavior test)", async () => {
			// Mock successful unsubscribe operations
			mockSupabase.from.mockImplementation((table: string) => {
				if (table === "users") {
					return {
						update: jest.fn().mockReturnValue({
							eq: jest.fn().mockResolvedValue({ error: null }),
						}),
					};
				} else if (table === "unsubscribes") {
					return {
						insert: jest.fn().mockResolvedValue({ error: null }),
					};
				}
				return mockSupabase;
			});

			// Behavior: Function should return true on success
			const result = await unsubscribeUser(
				"user@example.com",
				"User requested",
			);

			expect(result).toBe(true); // ✅ Tests outcome, not implementation
		});

		it("should return false when unsubscribe fails (behavior test)", async () => {
			// Mock failed update operation
			mockSupabase.from.mockImplementation((table: string) => {
				if (table === "users") {
					return {
						update: jest.fn().mockReturnValue({
							eq: jest
								.fn()
								.mockResolvedValue({ error: { message: "DB error" } }),
						}),
					};
				}
				return mockSupabase;
			});

			// Behavior: Function should return false on failure
			const result = await unsubscribeUser("user@example.com");

			expect(result).toBe(false); // ✅ Tests outcome
		});
	});

	describe("getBounceSuppressionListSize", () => {
		it("should return suppression list size (behavior test)", async () => {
			mockSupabase.from.mockReturnThis();
			mockSupabase.select.mockImplementation(() => {
				return Promise.resolve({
					count: 3,
					error: null,
				});
			});

			// Behavior: Function should return the count
			const size = await getBounceSuppressionListSize();

			expect(size).toBe(3); // ✅ Tests outcome, not implementation
		});
	});

	describe("getComplaintRate", () => {
		it("should calculate complaint rate (behavior test)", async () => {
			// getComplaintRate makes two queries: email_sends count and email_suppression count
			let queryCallCount = 0;
			mockSupabase.from.mockImplementation((table: string) => {
				queryCallCount++;
				const isFirstQuery = queryCallCount === 1; // email_sends

				if (table === "email_sends") {
					return {
						select: jest.fn().mockReturnThis(),
						gte: jest.fn().mockResolvedValue({ count: 100, error: null }),
					};
				} else if (table === "email_suppression") {
					return {
						select: jest.fn().mockReturnThis(),
						eq: jest.fn().mockReturnThis(),
						gte: jest.fn().mockResolvedValue({ count: 5, error: null }),
					};
				}
				return mockSupabase;
			});

			// Behavior: Should calculate rate as complaints / total emails
			const rate = await getComplaintRate();

			expect(rate).toBeGreaterThanOrEqual(0);
			expect(rate).toBeLessThanOrEqual(1);
			expect(rate).toBe(0.05); // 5/100 = 0.05
			// ✅ Tests outcome (calculated rate), not implementation details
		});

		it("should return 0 when no emails sent (behavior test)", async () => {
			mockSupabase.from.mockImplementation((table: string) => {
				if (table === "email_sends") {
					return {
						select: jest.fn().mockReturnThis(),
						gte: jest.fn().mockResolvedValue({ count: 0, error: null }),
					};
				} else if (table === "email_suppression") {
					return {
						select: jest.fn().mockReturnThis(),
						eq: jest.fn().mockReturnThis(),
						gte: jest.fn().mockResolvedValue({ count: 5, error: null }),
					};
				}
				return mockSupabase;
			});

			// Behavior: Should return 0 when denominator is 0 (no emails sent)
			const rate = await getComplaintRate();
			expect(rate).toBe(0);
		});
	});
});
