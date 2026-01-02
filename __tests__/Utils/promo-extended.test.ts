/**
 * Tests for Promo Code Utilities
 * Tests promo code validation and activation
 */

import { validatePromoCode } from "@/Utils/promo";

describe("Promo Code Utilities", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		delete process.env.PROMO_CODE;
		delete process.env.PROMO_EMAIL_ALLOWLIST;
	});

	describe("validatePromoCode", () => {
		it("should validate valid promo code", () => {
			process.env.PROMO_CODE = "PROMO123";

			const result = validatePromoCode("PROMO123", "user@example.com");

			expect(result.isValid).toBe(true);
		});

		it("should use default promo code when not configured", () => {
			const result = validatePromoCode("rhys", "user@example.com");

			expect(result.isValid).toBe(true);
		});

		it("should reject missing promo code", () => {
			process.env.PROMO_CODE = "PROMO123";

			const result = validatePromoCode(null, "user@example.com");

			expect(result.isValid).toBe(false);
			expect(result.reason).toBe("missing_code");
		});

		it("should reject invalid promo code", () => {
			process.env.PROMO_CODE = "PROMO123";

			const result = validatePromoCode("WRONG", "user@example.com");

			expect(result.isValid).toBe(false);
			expect(result.reason).toBe("invalid_code");
		});

		it("should validate email against allowlist regex", () => {
			process.env.PROMO_CODE = "PROMO123";
			process.env.PROMO_EMAIL_ALLOWLIST = "^.*@example\\.com$";

			const result = validatePromoCode("PROMO123", "user@example.com");

			expect(result.isValid).toBe(true);
		});

		it("should reject email not matching allowlist", () => {
			process.env.PROMO_CODE = "PROMO123";
			process.env.PROMO_EMAIL_ALLOWLIST = "^.*@example\\.com$";

			const result = validatePromoCode("PROMO123", "user@other.com");

			expect(result.isValid).toBe(false);
			expect(result.reason).toBe("email_not_allowed");
		});

		it("should handle invalid regex gracefully", () => {
			process.env.PROMO_CODE = "PROMO123";
			process.env.PROMO_EMAIL_ALLOWLIST = "[invalid regex";

			const result = validatePromoCode("PROMO123", "user@example.com");

			expect(result.isValid).toBe(false);
			expect(result.reason).toBe("invalid_allowlist_regex");
		});

		it("should be case insensitive", () => {
			process.env.PROMO_CODE = "PROMO123";

			const result1 = validatePromoCode("promo123", "user@example.com");
			const result2 = validatePromoCode("PROMO123", "user@example.com");
			const result3 = validatePromoCode("Promo123", "user@example.com");

			expect(result1.isValid).toBe(true);
			expect(result2.isValid).toBe(true);
			expect(result3.isValid).toBe(true);
		});
	});
});
