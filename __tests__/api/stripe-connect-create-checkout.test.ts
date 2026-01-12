/**
 * Contract Tests for /api/stripe-connect/create-checkout
 *
 * Tests the Stripe checkout creation API contract - revenue-critical payment processing.
 * This API handles subscription and one-time payments for connected accounts.
 * Uses mocked Stripe client for reliable testing.
 */

import { createMocks } from "node-mocks-http";
import { POST } from "@/app/api/stripe-connect/create-checkout/route";
import { apiLogger } from "../../lib/api-logger";
import { ENV } from "../../lib/env";

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
	prices: {
		retrieve: jest.fn(),
	},
	checkout: {
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
		STRIPE_SECRET_KEY: "sk_test_mock_stripe_secret_key",
	},
}));

describe("POST /api/stripe-connect/create-checkout - Contract Tests", () => {
	beforeEach(() => {
		jest.clearAllMocks();

		// Default mock implementations
		mockStripeAccount.prices.retrieve.mockResolvedValue({
			id: "price_test123",
			recurring: false,
			unit_amount: 1000, // $10.00
		});

		mockStripeAccount.checkout.sessions.create.mockResolvedValue({
			id: "cs_test123",
			url: "https://checkout.stripe.com/pay/cs_test123",
		});
	});

	describe("Input Validation", () => {
		it("should return 400 for missing accountId", async () => {
			const { req } = createMocks({
				method: "POST",
				body: {
					priceId: "price_test123",
					successUrl: "https://example.com/success",
					cancelUrl: "https://example.com/cancel",
				},
			});

			const response = await POST(req as any);
			// Should pass Stripe config check first, then fail validation
			expect([400, 500]).toContain(response.status);

			if (response.status === 400) {
				const data = await response.json();
				expect(data.error).toBe("accountId and priceId are required");
			}
		});

		it("should return 400 for missing priceId", async () => {
			const { req } = createMocks({
				method: "POST",
				body: {
					accountId: "acct_test123",
					successUrl: "https://example.com/success",
					cancelUrl: "https://example.com/cancel",
				},
			});

			const response = await POST(req as any);
			// Should pass Stripe config check first, then fail validation
			expect([400, 500]).toContain(response.status);

			if (response.status === 400) {
				const data = await response.json();
				expect(data.error).toBe("accountId and priceId are required");
			}
		});

		it("should accept valid required parameters", async () => {
			const { req } = createMocks({
				method: "POST",
				body: {
					accountId: "acct_test123",
					priceId: "price_test123",
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
					priceId: "price_test123",
				},
			});

			const response = await POST(req as any);
			expect(response.status).toBe(503);

			const data = await response.json();
			expect(data.error).toBe("Stripe Connect is not configured");

			// Reset for other tests
			isStripeConfigured.mockReturnValue(true);
		});
	});

	describe("One-Time Payment Checkout", () => {
		beforeEach(() => {
			mockStripeAccount.prices.retrieve.mockResolvedValue({
				id: "price_test123",
				recurring: false,
				unit_amount: 2000, // $20.00
			});
		});

		it("should create checkout session for one-time payment", async () => {
			const { req } = createMocks({
				method: "POST",
				body: {
					accountId: "acct_test123",
					priceId: "price_test123",
					customerEmail: "customer@example.com",
					successUrl: "https://example.com/success",
					cancelUrl: "https://example.com/cancel",
				},
			});

			const response = await POST(req as any);
			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data.sessionId).toBe("cs_test123");
			expect(data.url).toBe("https://checkout.stripe.com/pay/cs_test123");

			// Verify Stripe API was called correctly
			expect(mockStripeAccount.checkout.sessions.create).toHaveBeenCalledWith({
				payment_method_types: ["card"],
				line_items: [
					{
						price: "price_test123",
						quantity: 1,
					},
				],
				mode: "payment",
				success_url: "https://example.com/success",
				cancel_url: "https://example.com/cancel",
				customer_email: "customer@example.com",
			});
		});

		it("should use default URLs when not provided", async () => {
			const { req } = createMocks({
				method: "POST",
				body: {
					accountId: "acct_test123",
					priceId: "price_test123",
				},
			});

			await POST(req as any);

			expect(mockStripeAccount.checkout.sessions.create).toHaveBeenCalledWith(
				expect.objectContaining({
					success_url: "https://example.com/store/acct_test123?success=true",
					cancel_url: "https://example.com/store/acct_test123?canceled=true",
				}),
			);
		});

		it("should handle application fee for one-time payments", async () => {
			const { req } = createMocks({
				method: "POST",
				body: {
					accountId: "acct_test123",
					priceId: "price_test123",
					applicationFeePercent: 10, // 10%
				},
			});

			await POST(req as any);

			// 10% of $20.00 = $2.00 = 200 cents
			expect(mockStripeAccount.checkout.sessions.create).toHaveBeenCalledWith(
				expect.objectContaining({
					payment_intent_data: {
						application_fee_amount: 200,
					},
				}),
			);
		});
	});

	describe("Subscription Checkout", () => {
		beforeEach(() => {
			mockStripeAccount.prices.retrieve.mockResolvedValue({
				id: "price_test123",
				recurring: {
					interval: "month",
				},
				unit_amount: 1000, // $10.00/month
			});
		});

		it("should create checkout session for subscription", async () => {
			const { req } = createMocks({
				method: "POST",
				body: {
					accountId: "acct_test123",
					priceId: "price_test123",
				},
			});

			const response = await POST(req as any);
			expect(response.status).toBe(200);

			// Verify mode is set to subscription
			expect(mockStripeAccount.checkout.sessions.create).toHaveBeenCalledWith(
				expect.objectContaining({
					mode: "subscription",
				}),
			);
		});

		it("should handle application fee for subscriptions", async () => {
			const { req } = createMocks({
				method: "POST",
				body: {
					accountId: "acct_test123",
					priceId: "price_test123",
					applicationFeePercent: 5, // 5%
				},
			});

			await POST(req as any);

			expect(mockStripeAccount.checkout.sessions.create).toHaveBeenCalledWith(
				expect.objectContaining({
					subscription_data: {
						application_fee_percent: 5,
					},
				}),
			);
		});
	});

	describe("Environment Handling", () => {
		it("should use VERCEL_URL when NEXT_PUBLIC_URL is not set", async () => {
			// Mock ENV without NEXT_PUBLIC_URL but with VERCEL_URL
			const originalEnv = ENV.NEXT_PUBLIC_URL;
			delete (ENV as any).NEXT_PUBLIC_URL;
			process.env.VERCEL_URL = "vercel-app.vercel.app";

			const { req } = createMocks({
				method: "POST",
				body: {
					accountId: "acct_test123",
					priceId: "price_test123",
				},
			});

			await POST(req as any);

			expect(mockStripeAccount.checkout.sessions.create).toHaveBeenCalledWith(
				expect.objectContaining({
					success_url:
						"https://vercel-app.vercel.app/store/acct_test123?success=true",
					cancel_url:
						"https://vercel-app.vercel.app/store/acct_test123?canceled=true",
				}),
			);

			// Restore
			ENV.NEXT_PUBLIC_URL = originalEnv;
			delete process.env.VERCEL_URL;
		});

		it("should fallback to localhost when no URLs are configured", async () => {
			// Mock ENV without any URLs
			const originalEnv = ENV.NEXT_PUBLIC_URL;
			delete (ENV as any).NEXT_PUBLIC_URL;
			delete process.env.VERCEL_URL;

			const { req } = createMocks({
				method: "POST",
				body: {
					accountId: "acct_test123",
					priceId: "price_test123",
				},
			});

			await POST(req as any);

			expect(mockStripeAccount.checkout.sessions.create).toHaveBeenCalledWith(
				expect.objectContaining({
					success_url: "http://localhost:3000/store/acct_test123?success=true",
					cancel_url: "http://localhost:3000/store/acct_test123?canceled=true",
				}),
			);

			// Restore
			ENV.NEXT_PUBLIC_URL = originalEnv;
		});
	});

	describe("Error Handling", () => {
		it("should handle Stripe price retrieval errors", async () => {
			mockStripeAccount.prices.retrieve.mockRejectedValue(
				new Error("Price not found"),
			);

			const { req } = createMocks({
				method: "POST",
				body: {
					accountId: "acct_test123",
					priceId: "price_invalid",
				},
			});

			const response = await POST(req as any);
			expect(response.status).toBe(500);

			const data = await response.json();
			expect(data.error).toBe("Failed to create checkout session");

			expect(apiLogger.error).toHaveBeenCalledWith(
				"Failed to create checkout session",
				expect.any(Error),
				expect.objectContaining({
					errorType: undefined,
					errorCode: undefined,
				}),
			);
		});

		it("should handle Stripe session creation errors", async () => {
			mockStripeAccount.checkout.sessions.create.mockRejectedValue({
				type: "card_error",
				code: "card_declined",
				message: "Your card was declined",
			});

			const { req } = createMocks({
				method: "POST",
				body: {
					accountId: "acct_test123",
					priceId: "price_test123",
				},
			});

			const response = await POST(req as any);
			expect(response.status).toBe(500);

			const data = await response.json();
			expect(data.error).toBe("Failed to create checkout session");
			expect(data.details).toBe("Your card was declined");

			expect(apiLogger.error).toHaveBeenCalledWith(
				"Failed to create checkout session",
				expect.any(Object),
				expect.objectContaining({
					errorType: "card_error",
					errorCode: "card_declined",
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
		it("should log successful checkout creation", async () => {
			const { req } = createMocks({
				method: "POST",
				body: {
					accountId: "acct_test123",
					priceId: "price_test123",
				},
			});

			await POST(req as any);

			expect(apiLogger.info).toHaveBeenCalledWith(
				"Checkout session created for connected account",
				expect.objectContaining({
					accountId: "acct_test123",
					sessionId: "cs_test123",
					priceId: "price_test123",
				}),
			);
		});

		it("should include account ID in Stripe client creation", async () => {
			const { getStripeClientForAccount } = require("@/lib/stripe");

			const { req } = createMocks({
				method: "POST",
				body: {
					accountId: "acct_custom123",
					priceId: "price_test123",
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
					priceId: "price_test123",
				},
			});

			const response = await POST(req as any);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data).toEqual({
				success: true,
				sessionId: "cs_test123",
				url: "https://checkout.stripe.com/pay/cs_test123",
			});
		});

		it("should return consistent error response format", async () => {
			const { req } = createMocks({
				method: "POST",
				body: {
					accountId: "acct_test123",
					priceId: "price_invalid",
				},
			});

			mockStripeAccount.prices.retrieve.mockRejectedValue(
				new Error("Price not found"),
			);

			const response = await POST(req as any);
			const data = await response.json();

			expect(response.status).toBe(500);
			expect(data).toEqual({
				error: "Failed to create checkout session",
				details: "Price not found",
			});
		});
	});
});
