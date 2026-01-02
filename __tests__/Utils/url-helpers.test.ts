/**
 * Tests for URL Helpers
 * Tests URL generation and validation utilities
 */

import {
	getBaseUrl,
	getCanonicalDomain,
	getEmailDomain,
	getListUnsubscribeHeader,
	getUnsubscribeEmail,
	getUnsubscribeUrl,
} from "@/Utils/url-helpers";

describe("URL Helpers", () => {
	beforeEach(() => {
		delete process.env.NEXT_PUBLIC_URL;
		delete process.env.VERCEL_URL;
		delete process.env.EMAIL_DOMAIN;
	});

	describe("getBaseUrl", () => {
		it("should use NEXT_PUBLIC_URL when set", () => {
			process.env.NEXT_PUBLIC_URL = "https://custom.com";
			expect(getBaseUrl()).toBe("https://custom.com");
		});

		it("should use VERCEL_URL when NEXT_PUBLIC_URL not set", () => {
			process.env.VERCEL_URL = "https://vercel.app";
			expect(getBaseUrl()).toContain("vercel.app");
		});

		it("should default to getjobping.com when no env vars set", () => {
			expect(getBaseUrl()).toBe("https://getjobping.com");
		});
	});

	describe("getEmailDomain", () => {
		it("should use EMAIL_DOMAIN when set", () => {
			process.env.EMAIL_DOMAIN = "custom.com";
			expect(getEmailDomain()).toBe("custom.com");
		});

		it("should default to getjobping.com", () => {
			expect(getEmailDomain()).toBe("getjobping.com");
		});
	});

	describe("getUnsubscribeEmail", () => {
		it("should return unsubscribe email", () => {
			const email = getUnsubscribeEmail();
			expect(email).toBe("unsubscribe@getjobping.com");
		});
	});

	describe("getCanonicalDomain", () => {
		it("should return canonical domain", () => {
			expect(getCanonicalDomain()).toBe("getjobping.com");
		});
	});

	describe("getUnsubscribeUrl", () => {
		it("should build unsubscribe URL for email", () => {
			const url = getUnsubscribeUrl("user@example.com");
			expect(url).toContain("unsubscribe");
			expect(url).toContain("user%40example.com"); // URL-encoded email
		});
	});

	describe("getListUnsubscribeHeader", () => {
		it("should return List-Unsubscribe header", () => {
			const header = getListUnsubscribeHeader();
			expect(header).toContain("unsubscribe");
			expect(header).toContain("mailto:");
		});
	});

	// NOTE: buildJobUrl and buildUnsubscribeUrl functions don't exist in the actual implementation
	// These tests have been removed as they test non-existent functionality
});
