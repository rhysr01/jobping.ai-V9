import { assertValidFrom, EMAIL_CONFIG } from "@/utils/email/clients";

describe("Email Domain Validation", () => {
	describe("EMAIL_CONFIG.from", () => {
		it("should use getjobping.com domain", () => {
			expect(EMAIL_CONFIG.from).toMatch(/@getjobping\.com>?$/);
			expect(EMAIL_CONFIG.from).not.toMatch(/@www\.getjobping\.com/);
		});

		it("should have correct format", () => {
			expect(EMAIL_CONFIG.from).toMatch(/^JobPing <.*@getjobping\.com>$/);
		});
	});

	describe("assertValidFrom", () => {
		it("should pass for valid getjobping.com addresses", () => {
			expect(() =>
				assertValidFrom("JobPing <noreply@getjobping.com>"),
			).not.toThrow();
			expect(() =>
				assertValidFrom("JobPing <hello@getjobping.com>"),
			).not.toThrow();
			expect(() =>
				assertValidFrom("JobPing <support@getjobping.com>"),
			).not.toThrow();
		});

		it("should fail for www.getjobping.com addresses", () => {
			expect(() =>
				assertValidFrom("JobPing <noreply@www.getjobping.com>"),
			).toThrow();
			expect(() =>
				assertValidFrom("JobPing <hello@www.getjobping.com>"),
			).toThrow();
		});

		it("should fail for other domains", () => {
			expect(() => assertValidFrom("JobPing <noreply@example.com>")).toThrow();
			expect(() => assertValidFrom("JobPing <noreply@localhost>")).toThrow();
		});

		it("should fail for malformed addresses", () => {
			expect(() => assertValidFrom("invalid-email")).toThrow();
			expect(() => assertValidFrom("JobPing <invalid>")).toThrow();
		});
	});

	describe("Environment Variables", () => {
		it("should have required environment variables", () => {
			expect(process.env.RESEND_API_KEY).toBeDefined();
			// In test environment, we use a mock key, so just check it exists
			expect(process.env.RESEND_API_KEY).toBeTruthy();
		});

		it("should use correct email domain", () => {
			const emailDomain = process.env.EMAIL_DOMAIN || "getjobping.com";
			expect(emailDomain).toBe("getjobping.com");
		});
	});
});
