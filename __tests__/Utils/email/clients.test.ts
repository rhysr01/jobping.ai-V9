/**
 * Tests for Email Clients
 * Tests Resend and Supabase client initialization
 */

jest.mock("resend", () => ({
	Resend: jest.fn(),
}));

jest.mock("@supabase/supabase-js", () => ({
	createClient: jest.fn(),
}));

jest.mock("@/Utils/url-helpers", () => ({
	getBaseUrl: jest.fn(() => "https://jobping.com"),
	getEmailDomain: jest.fn(() => "getjobping.com"),
	getUnsubscribeEmail: jest.fn(() => "unsubscribe@getjobping.com"),
}));

import {
	assertValidFrom,
	EMAIL_CONFIG,
	getResendClient,
	getSupabaseClient,
} from "@/Utils/email/clients";

describe("Email Clients", () => {
	let mockResend: any;
	let mockCreateClient: any;

	beforeEach(() => {
		jest.clearAllMocks();
		const { Resend } = require("resend");
		const { createClient } = require("@supabase/supabase-js");
		mockResend = Resend;
		mockCreateClient = createClient;
	});

	describe("getResendClient", () => {
		it("should create Resend client with valid API key", () => {
			process.env.RESEND_API_KEY = "re_test_key_123";

			getResendClient();

			expect(mockResend).toHaveBeenCalledWith("re_test_key_123");
		});

		it("should throw error when API key is missing", () => {
			delete process.env.RESEND_API_KEY;

			expect(() => getResendClient()).toThrow("Missing Resend API key");
		});

		it("should throw error when API key format is invalid", () => {
			process.env.RESEND_API_KEY = "invalid_key";

			expect(() => getResendClient()).toThrow("Invalid Resend API key format");
		});
	});

	describe("getSupabaseClient", () => {
		it("should create Supabase client with valid config", () => {
			process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
			process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";

			getSupabaseClient();

			expect(mockCreateClient).toHaveBeenCalledWith(
				"https://test.supabase.co",
				"test-key",
				expect.objectContaining({
					auth: expect.objectContaining({
						autoRefreshToken: false,
						persistSession: false,
					}),
				}),
			);
		});

		it("should throw error when Supabase URL is missing", () => {
			delete process.env.NEXT_PUBLIC_SUPABASE_URL;
			process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";

			expect(() => getSupabaseClient()).toThrow(
				"Missing Supabase configuration",
			);
		});

		it("should throw error when Supabase key is missing", () => {
			process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
			delete process.env.SUPABASE_SERVICE_ROLE_KEY;

			expect(() => getSupabaseClient()).toThrow(
				"Missing Supabase configuration",
			);
		});
	});

	describe("assertValidFrom", () => {
		it("should pass with valid from address", () => {
			expect(() =>
				assertValidFrom("JobPing <noreply@getjobping.com>"),
			).not.toThrow();
		});

		it("should throw error for invalid format", () => {
			expect(() => assertValidFrom("invalid")).toThrow("Invalid 'from' format");
		});

		it("should throw error for malformed email", () => {
			expect(() => assertValidFrom("JobPing <invalid-email>")).toThrow(
				"Malformed email address",
			);
		});

		it("should throw error for wrong domain", () => {
			expect(() =>
				assertValidFrom("JobPing <noreply@wrongdomain.com>"),
			).toThrow("Invalid sender domain");
		});
	});

	describe("EMAIL_CONFIG", () => {
		it("should have valid from address", () => {
			expect(EMAIL_CONFIG.from).toContain("@getjobping.com");
		});

		it("should have retry configuration", () => {
			expect(EMAIL_CONFIG.maxRetries).toBe(3);
			expect(EMAIL_CONFIG.retryDelay).toBe(2000);
		});

		it("should have unsubscribe configuration", () => {
			expect(EMAIL_CONFIG.unsubscribeBase).toBeDefined();
			expect(EMAIL_CONFIG.listUnsubscribeEmail).toBeDefined();
		});
	});
});
