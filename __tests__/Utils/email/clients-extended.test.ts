/**
 * Comprehensive tests for Email Clients
 * Tests Resend client, Supabase client, email validation
 */

import {
  assertValidFrom,
  EMAIL_CONFIG,
  getResendClient,
  getSupabaseClient,
} from "@/Utils/email/clients";

jest.mock("resend", () => ({
  Resend: jest.fn(),
}));
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));
jest.mock("@/Utils/url-helpers", () => ({
  getBaseUrl: jest.fn(() => "https://getjobping.com"),
  getEmailDomain: jest.fn(() => "getjobping.com"),
  getUnsubscribeEmail: jest.fn(() => "unsubscribe@getjobping.com"),
}));

describe("Email Clients", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.RESEND_API_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const { createClient } = require("@supabase/supabase-js");
    createClient.mockReturnValue({
      from: jest.fn(),
    });
  });

  describe("getResendClient", () => {
    it("should create Resend client with valid API key", () => {
      process.env.RESEND_API_KEY = "re_test_123456789";

      const client = getResendClient();

      expect(client).toBeDefined();
      const { Resend } = require("resend");
      expect(Resend).toHaveBeenCalledWith("re_test_123456789");
    });

    it("should throw if API key missing", () => {
      expect(() => {
        getResendClient();
      }).toThrow("Missing Resend API key");
    });

    it("should throw if API key format invalid", () => {
      process.env.RESEND_API_KEY = "invalid_key";

      expect(() => {
        getResendClient();
      }).toThrow("Invalid Resend API key format");
    });
  });

  describe("getSupabaseClient", () => {
    it("should create Supabase client", () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";

      const client = getSupabaseClient();

      expect(client).toBeDefined();
      const { createClient } = require("@supabase/supabase-js");
      expect(createClient).toHaveBeenCalled();
    });

    it("should throw if config missing", () => {
      expect(() => {
        getSupabaseClient();
      }).toThrow("Missing Supabase configuration");
    });
  });

  describe("assertValidFrom", () => {
    it("should validate correct from address", () => {
      expect(() => {
        assertValidFrom("JobPing <noreply@getjobping.com>");
      }).not.toThrow();
    });

    it("should throw for invalid format", () => {
      expect(() => {
        assertValidFrom("invalid-format");
      }).toThrow("Invalid 'from' format");
    });

    it("should throw for wrong domain", () => {
      expect(() => {
        assertValidFrom("JobPing <noreply@wrongdomain.com>");
      }).toThrow("Invalid sender domain");
    });

    it("should throw for malformed email", () => {
      expect(() => {
        assertValidFrom("JobPing <invalid-email>");
      }).toThrow("Malformed email address");
    });
  });

  describe("EMAIL_CONFIG", () => {
    it("should have valid from address", () => {
      expect(EMAIL_CONFIG.from).toContain("@getjobping.com");
    });

    it("should have unsubscribe configuration", () => {
      expect(EMAIL_CONFIG.unsubscribeBase).toBeDefined();
      expect(EMAIL_CONFIG.listUnsubscribeEmail).toBeDefined();
    });
  });
});
