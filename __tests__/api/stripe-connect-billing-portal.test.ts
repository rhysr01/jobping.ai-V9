/**
 * Contract Tests for /api/stripe-connect/billing-portal
 *
 * Tests the Stripe billing portal creation API contract - subscription management.
 * This API allows customers to manage their subscriptions and billing information.
 * Uses mocked Stripe client for reliable testing.
 */

import { createMocks } from "node-mocks-http";
import { POST } from "@/app/api/stripe-connect/billing-portal/route";
import { apiLogger } from "@/lib/api-logger";
import { ENV } from "@/lib/env";

// Mock external dependencies
jest.mock("@/lib/api-logger", () => ({
  apiLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock Stripe functions
const mockStripeAccount = {
  billingPortal: {
    sessions: {
      create: jest.fn(),
    },
  },
};

jest.mock("@/lib/stripe", () => ({
  getStripeClientForAccount: jest.fn(() => mockStripeAccount),
  isStripeConfigured: jest.fn(() => true),
}));

jest.mock("@/lib/env", () => ({
  ENV: {
    NEXT_PUBLIC_URL: "https://example.com",
  },
}));

describe("POST /api/stripe-connect/billing-portal - Contract Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementation
    mockStripeAccount.billingPortal.sessions.create.mockResolvedValue({
      id: "bps_test123",
      url: "https://billing.stripe.com/p/session/test123",
    });
  });

  describe("Input Validation", () => {
    it("should return 400 for missing accountId", async () => {
      const { req } = createMocks({
        method: "POST",
        body: {
          customerId: "cus_test123",
          returnUrl: "https://example.com/account",
        },
      });

      const response = await POST(req as any);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("accountId and customerId are required");
    });

    it("should return 400 for missing customerId", async () => {
      const { req } = createMocks({
        method: "POST",
        body: {
          accountId: "acct_test123",
          returnUrl: "https://example.com/account",
        },
      });

      const response = await POST(req as any);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("accountId and customerId are required");
    });

    it("should accept valid required parameters", async () => {
      const { req } = createMocks({
        method: "POST",
        body: {
          accountId: "acct_test123",
          customerId: "cus_test123",
        },
      });

      const response = await POST(req as any);
      expect(response.status).toBe(200);
    });
  });

  describe("Stripe Configuration", () => {
    it("should return 503 when Stripe is not configured", async () => {
      const { isStripeConfigured } = require("@/lib/stripe");
      isStripeConfigured.mockReturnValue(false);

      const { req } = createMocks({
        method: "POST",
        body: {
          accountId: "acct_test123",
          customerId: "cus_test123",
        },
      });

      const response = await POST(req as any);
      expect(response.status).toBe(503);

      const data = await response.json();
      expect(data.error).toBe("Stripe Connect is not configured");
    });
  });

  describe("Billing Portal Session Creation", () => {
    it("should create billing portal session successfully", async () => {
      const { req } = createMocks({
        method: "POST",
        body: {
          accountId: "acct_test123",
          customerId: "cus_test123",
          returnUrl: "https://example.com/dashboard",
        },
      });

      const response = await POST(req as any);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.url).toBe("https://billing.stripe.com/p/session/test123");
    });

    it("should use default return URL when not provided", async () => {
      const { req } = createMocks({
        method: "POST",
        body: {
          accountId: "acct_test123",
          customerId: "cus_test123",
        },
      });

      await POST(req as any);

      expect(
        mockStripeAccount.billingPortal.sessions.create,
      ).toHaveBeenCalledWith(
        {
          customer: "cus_test123",
          return_url: "https://example.com/store/acct_test123",
        },
        {
          stripeAccount: "acct_test123",
        },
      );
    });

    it("should pass custom return URL to Stripe", async () => {
      const customUrl = "https://example.com/custom-return";
      const { req } = createMocks({
        method: "POST",
        body: {
          accountId: "acct_test123",
          customerId: "cus_test123",
          returnUrl: customUrl,
        },
      });

      await POST(req as any);

      expect(
        mockStripeAccount.billingPortal.sessions.create,
      ).toHaveBeenCalledWith(
        {
          customer: "cus_test123",
          return_url: customUrl,
        },
        {
          stripeAccount: "acct_test123",
        },
      );
    });
  });

  describe("Environment Handling", () => {
    it("should use VERCEL_URL when NEXT_PUBLIC_URL is not set", async () => {
      const originalEnv = ENV.NEXT_PUBLIC_URL;
      delete (ENV as any).NEXT_PUBLIC_URL;
      process.env.VERCEL_URL = "vercel-app.vercel.app";

      const { req } = createMocks({
        method: "POST",
        body: {
          accountId: "acct_test123",
          customerId: "cus_test123",
        },
      });

      await POST(req as any);

      expect(
        mockStripeAccount.billingPortal.sessions.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          return_url: "https://vercel-app.vercel.app/store/acct_test123",
        }),
        expect.any(Object),
      );

      ENV.NEXT_PUBLIC_URL = originalEnv;
      delete process.env.VERCEL_URL;
    });

    it("should fallback to localhost when no URLs are configured", async () => {
      const originalEnv = ENV.NEXT_PUBLIC_URL;
      delete (ENV as any).NEXT_PUBLIC_URL;
      delete process.env.VERCEL_URL;

      const { req } = createMocks({
        method: "POST",
        body: {
          accountId: "acct_test123",
          customerId: "cus_test123",
        },
      });

      await POST(req as any);

      expect(
        mockStripeAccount.billingPortal.sessions.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          return_url: "http://localhost:3000/store/acct_test123",
        }),
        expect.any(Object),
      );

      ENV.NEXT_PUBLIC_URL = originalEnv;
    });
  });

  describe("Error Handling", () => {
    it("should handle Stripe billing portal creation errors", async () => {
      mockStripeAccount.billingPortal.sessions.create.mockRejectedValue({
        type: "invalid_request_error",
        code: "customer_not_found",
        message: "Customer not found",
      });

      const { req } = createMocks({
        method: "POST",
        body: {
          accountId: "acct_test123",
          customerId: "cus_invalid",
        },
      });

      const response = await POST(req as any);
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.error).toBe("Failed to create billing portal session");
      expect(data.details).toBe("Customer not found");

      expect(apiLogger.error).toHaveBeenCalledWith(
        "Failed to create billing portal session",
        expect.any(Object),
        expect.objectContaining({
          errorType: "invalid_request_error",
          errorCode: "customer_not_found",
        }),
      );
    });

    it("should handle invalid JSON in request", async () => {
      const { req } = createMocks({
        method: "POST",
        body: "invalid json",
      });

      const response = await POST(req as any);
      expect([400, 500]).toContain(response.status);
    });
  });

  describe("Logging and Monitoring", () => {
    it("should log successful billing portal creation", async () => {
      const { req } = createMocks({
        method: "POST",
        body: {
          accountId: "acct_test123",
          customerId: "cus_test123",
        },
      });

      await POST(req as any);

      expect(apiLogger.info).toHaveBeenCalledWith(
        "Billing portal session created",
        expect.objectContaining({
          accountId: "acct_test123",
          customerId: "cus_test123",
          sessionId: "bps_test123",
        }),
      );
    });

    it("should include account ID in Stripe client creation", async () => {
      const { getStripeClientForAccount } = require("@/lib/stripe");

      const { req } = createMocks({
        method: "POST",
        body: {
          accountId: "acct_custom123",
          customerId: "cus_test123",
        },
      });

      await POST(req as any);

      expect(getStripeClientForAccount).toHaveBeenCalledWith("acct_custom123");
    });
  });

  describe("Response Format Contract", () => {
    it("should return correct success response format", async () => {
      const { req } = createMocks({
        method: "POST",
        body: {
          accountId: "acct_test123",
          customerId: "cus_test123",
        },
      });

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        url: "https://billing.stripe.com/p/session/test123",
      });
    });

    it("should return consistent error response format", async () => {
      mockStripeAccount.billingPortal.sessions.create.mockRejectedValue(
        new Error("Network error"),
      );

      const { req } = createMocks({
        method: "POST",
        body: {
          accountId: "acct_test123",
          customerId: "cus_test123",
        },
      });

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: "Failed to create billing portal session",
        details: "Network error",
      });
    });
  });
});
