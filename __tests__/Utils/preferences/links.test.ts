/**
 * Tests for Preferences Links Utilities
 * Tests URL generation for user preference links
 */

import { buildPreferencesLink } from "@/Utils/preferences/links";

jest.mock("@/Utils/auth/secureTokens", () => ({
	issueSecureToken: jest.fn().mockReturnValue("mock-token-123"),
}));

jest.mock("@/Utils/url-helpers", () => ({
	getBaseUrl: jest.fn().mockReturnValue("https://getjobping.com"),
}));

describe("Preferences Links Utilities", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("buildPreferencesLink", () => {
		it("should build preference URL with email parameter", () => {
			// Behavior: Should generate a preference URL with email (URL encoded)
			const url = buildPreferencesLink("user@example.com");

			expect(url).toContain(encodeURIComponent("user@example.com"));
			expect(url).toContain("/preferences");
			expect(url).toMatch(/^https?:\/\//); // Valid URL
			// ✅ Tests outcome (valid URL with email), not implementation
		});

		it("should URL encode email in URL", () => {
			// Behavior: Should properly encode special characters
			const url = buildPreferencesLink("user+test@example.com");

			expect(url).toContain(encodeURIComponent("user+test@example.com"));
			// ✅ Tests outcome (encoded URL), not implementation
		});

		it("should include token in URL when email provided", () => {
			// Behavior: Should include token parameter
			const url = buildPreferencesLink("user@example.com");

			expect(url).toContain("token=");
			// ✅ Tests outcome (token present), not implementation
		});

		it("should return base preferences URL when email is null", () => {
			// Behavior: Should return base URL without token when no email
			const url = buildPreferencesLink(null);

			expect(url).toBe("https://getjobping.com/preferences");
			expect(url).not.toContain("token=");
			// ✅ Tests outcome (base URL), not implementation
		});

		it("should return base preferences URL when email is undefined", () => {
			// Behavior: Should return base URL without token when email undefined
			const url = buildPreferencesLink(undefined);

			expect(url).toBe("https://getjobping.com/preferences");
			expect(url).not.toContain("token=");
			// ✅ Tests outcome (base URL), not implementation
		});

		it("should normalize email to lowercase", () => {
			// Behavior: Should lowercase email in URL (URL encoded)
			const url = buildPreferencesLink("User@Example.COM");

			expect(url).toContain(encodeURIComponent("user@example.com"));
			// ✅ Tests outcome (normalized email), not implementation
		});

		it("should accept custom TTL options", () => {
			// Behavior: Should generate URL with custom options (no errors)
			const url = buildPreferencesLink("user@example.com", { ttlMinutes: 60 });

			expect(url).toContain("/preferences");
			expect(url).toContain("token=");
			// ✅ Tests outcome (valid URL generated), not implementation (TTL value)
		});

		it("should generate URL when no options provided", () => {
			// Behavior: Should generate URL with default options
			const url = buildPreferencesLink("user@example.com");

			expect(url).toContain("/preferences");
			expect(url).toContain("token=");
			// ✅ Tests outcome (valid URL generated), not implementation
		});
	});
});
