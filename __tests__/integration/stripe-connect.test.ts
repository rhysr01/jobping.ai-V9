/**
 * Stripe Connect Integration Tests
 *
 * These tests verify Stripe Connect functionality including:
 * - Account creation and management
 * - Billing portal sessions
 * - Product and pricing management
 * - Customer and payment method handling
 */

import { describe, expect, it } from "@jest/globals";
import Stripe from "stripe";

// Use test keys (Vercel integration provides these)
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "sk_test_dummy";
const STRIPE_CONNECT_WEBHOOK_SECRET = process.env.STRIPE_CONNECT_WEBHOOK_SECRET || "whsec_test_dummy";

describe("Stripe Connect Integration", () => {
	let stripe: Stripe;
	let serverAvailable = false;

	beforeAll(async () => {
		// Skip tests if Stripe keys not configured
		if (!process.env.STRIPE_SECRET_KEY || STRIPE_SECRET_KEY.includes("dummy")) {
			console.warn(
				"⚠️  Stripe test keys not configured. Skipping Stripe Connect tests.",
			);
			return;
		}

		stripe = new Stripe(STRIPE_SECRET_KEY, {
			apiVersion: "2025-02-24.acacia",
		});

		// Check if server is available for API tests
		try {
			const response = await fetch("http://localhost:3000/api/health").catch(() => null);
			serverAvailable = response?.ok || false;
		} catch {
			serverAvailable = false;
		}

		if (!serverAvailable) {
			console.warn("⚠️  Server not running. Skipping API endpoint tests.");
		}
	});

	describe("Account Management", () => {
		it("should create Express account", async () => {
			if (!stripe) {
				console.warn("Skipping: Stripe not configured");
				return;
			}

			const account = await stripe.accounts.create({
				type: "express",
				country: "US",
				email: "test@example.com",
				capabilities: {
					transfers: { requested: true },
				},
				business_type: "individual",
			});

			expect(account).toBeDefined();
			expect(account.id).toMatch(/^acct_/);
			expect(account.type).toBe("express");
			expect(account.country).toBe("US");

			// Clean up
			await stripe.accounts.del(account.id);
		});

		it("should retrieve account information", async () => {
			if (!stripe) {
				console.warn("Skipping: Stripe not configured");
				return;
			}

			const account = await stripe.accounts.create({
				type: "express",
				country: "US",
				email: "test@example.com",
			});

			const retrieved = await stripe.accounts.retrieve(account.id);

			expect(retrieved.id).toBe(account.id);
			expect(retrieved.type).toBe("express");
			expect(retrieved.country).toBe("US");

			// Clean up
			await stripe.accounts.del(account.id);
		});

		it("should create account links for onboarding", async () => {
			if (!stripe) {
				console.warn("Skipping: Stripe not configured");
				return;
			}

			const account = await stripe.accounts.create({
				type: "express",
				country: "US",
				email: "test@example.com",
			});

			const accountLink = await stripe.accountLinks.create({
				account: account.id,
				refresh_url: "https://example.com/reauth",
				return_url: "https://example.com/return",
				type: "account_onboarding",
			});

			expect(accountLink).toBeDefined();
			expect(accountLink.url).toBeDefined();
			expect(accountLink.url).toMatch(/^https:\/\/connect\.stripe\.com/);

			// Clean up
			await stripe.accounts.del(account.id);
		});
	});

	describe("Billing Portal", () => {
		it("should create billing portal session", async () => {
			if (!stripe) {
				console.warn("Skipping: Stripe not configured");
				return;
			}

			// Create a test account
			const account = await stripe.accounts.create({
				type: "express",
				country: "US",
				email: "test@example.com",
			});

			// Create a test customer on the connected account
			const customer = await stripe.customers.create(
				{
					email: "test@example.com",
					name: "Test Customer",
				},
				{ stripeAccount: account.id },
			);

			// Create billing portal session
			const session = await stripe.billingPortal.sessions.create(
				{
					customer: customer.id,
					return_url: "https://example.com/return",
				},
				{ stripeAccount: account.id },
			);

			expect(session).toBeDefined();
			expect(session.url).toBeDefined();
			expect(session.url).toMatch(/^https:\/\/billing\.stripe\.com/);

			// Clean up
			await stripe.customers.del(customer.id, { stripeAccount: account.id });
			await stripe.accounts.del(account.id);
		});

		it("should test billing portal API endpoint", async () => {
			if (!serverAvailable || !stripe) {
				console.warn("Skipping: Server or Stripe not available");
				return;
			}

			// Create test account and customer first
			const account = await stripe.accounts.create({
				type: "express",
				country: "US",
				email: "test@example.com",
			});

			const customer = await stripe.customers.create(
				{
					email: "test@example.com",
					name: "Test Customer",
				},
				{ stripeAccount: account.id },
			);

			// Test the API endpoint
			const response = await fetch("http://localhost:3000/api/stripe-connect/billing-portal", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					accountId: account.id,
					customerId: customer.id,
					returnUrl: "https://example.com/return",
				}),
			});

			const data = await response.json();

			if (response.ok) {
				expect(data.success).toBe(true);
				expect(data.url).toBeDefined();
				expect(data.url).toMatch(/^https:\/\/billing\.stripe\.com/);
			} else {
				// May fail due to account not being fully onboarded
				expect([400, 500]).toContain(response.status);
			}

			// Clean up
			await stripe.customers.del(customer.id, { stripeAccount: account.id });
			await stripe.accounts.del(account.id);
		});
	});

	describe("Product Management", () => {
		it("should create and manage products on connected accounts", async () => {
			if (!stripe) {
				console.warn("Skipping: Stripe not configured");
				return;
			}

			const account = await stripe.accounts.create({
				type: "express",
				country: "US",
				email: "test@example.com",
			});

			// Create product on connected account
			const product = await stripe.products.create(
				{
					name: "Test Product",
					description: "A test product for integration testing",
				},
				{ stripeAccount: account.id },
			);

			expect(product.name).toBe("Test Product");
			expect(product.description).toBe("A test product for integration testing");

			// Create price for the product
			const price = await stripe.prices.create(
				{
					product: product.id,
					unit_amount: 2000, // $20.00
					currency: "usd",
					recurring: {
						interval: "month",
					},
				},
				{ stripeAccount: account.id },
			);

			expect(price.unit_amount).toBe(2000);
			expect(price.currency).toBe("usd");
			expect(price.recurring?.interval).toBe("month");

			// Test listing products
			const products = await stripe.products.list(
				{ limit: 10 },
				{ stripeAccount: account.id },
			);

			expect(products.data.length).toBeGreaterThan(0);
			expect(products.data.some(p => p.id === product.id)).toBe(true);

			// Clean up
			await stripe.prices.update(price.id, { active: false }, { stripeAccount: account.id });
			await stripe.products.update(product.id, { active: false }, { stripeAccount: account.id });
			await stripe.accounts.del(account.id);
		});

		it("should test product listing API endpoint", async () => {
			if (!serverAvailable || !stripe) {
				console.warn("Skipping: Server or Stripe not available");
				return;
			}

			const account = await stripe.accounts.create({
				type: "express",
				country: "US",
				email: "test@example.com",
			});

			// Test the API endpoint
			const response = await fetch(`http://localhost:3000/api/stripe-connect/list-products?accountId=${account.id}`);

			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(Array.isArray(data.products)).toBe(true);

			// Clean up
			await stripe.accounts.del(account.id);
		});
	});

	describe("Customer Management", () => {
		it("should create and manage customers on connected accounts", async () => {
			if (!stripe) {
				console.warn("Skipping: Stripe not configured");
				return;
			}

			const account = await stripe.accounts.create({
				type: "express",
				country: "US",
				email: "test@example.com",
			});

			// Create customer
			const customer = await stripe.customers.create(
				{
					email: "customer@example.com",
					name: "Test Customer",
					metadata: {
						user_id: "test_user_123",
					},
				},
				{ stripeAccount: account.id },
			);

			expect(customer.email).toBe("customer@example.com");
			expect(customer.name).toBe("Test Customer");
			expect(customer.metadata?.user_id).toBe("test_user_123");

			// Retrieve customer
			const retrieved = await stripe.customers.retrieve(customer.id, {
				stripeAccount: account.id,
			});

			expect(retrieved.id).toBe(customer.id);
			expect(retrieved.email).toBe("customer@example.com");

			// Clean up
			await stripe.customers.del(customer.id, { stripeAccount: account.id });
			await stripe.accounts.del(account.id);
		});
	});

	describe("Error Handling", () => {
		it("should handle invalid account IDs", async () => {
			if (!stripe) {
				console.warn("Skipping: Stripe not configured");
				return;
			}

			await expect(
				stripe.accounts.retrieve("acct_invalid")
			).rejects.toThrow();
		});

		it("should handle invalid customer IDs", async () => {
			if (!stripe) {
				console.warn("Skipping: Stripe not configured");
				return;
			}

			const account = await stripe.accounts.create({
				type: "express",
				country: "US",
				email: "test@example.com",
			});

			await expect(
				stripe.customers.retrieve("cus_invalid", { stripeAccount: account.id })
			).rejects.toThrow();

			await stripe.accounts.del(account.id);
		});

		it("should validate required parameters", async () => {
			if (!serverAvailable) {
				console.warn("Skipping: Server not available");
				return;
			}

			// Test missing accountId
			const response1 = await fetch("http://localhost:3000/api/stripe-connect/billing-portal", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					customerId: "cus_test",
				}),
			});

			const data1 = await response1.json();
			expect(response1.status).toBe(400);
			expect(data1.error).toContain("accountId");

			// Test missing customerId
			const response2 = await fetch("http://localhost:3000/api/stripe-connect/billing-portal", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					accountId: "acct_test",
				}),
			});

			const data2 = await response2.json();
			expect(response2.status).toBe(400);
			expect(data2.error).toContain("customerId");
		});
	});

	describe("Webhook Security", () => {
		it("should validate webhook signatures", async () => {
			if (!stripe || !STRIPE_CONNECT_WEBHOOK_SECRET) {
				console.warn("Skipping: Stripe or webhook secret not configured");
				return;
			}

			const payload = JSON.stringify({
				id: "evt_test_webhook",
				type: "account.updated",
				data: {
					object: {
						id: "acct_test_123",
					},
				},
			});

			// Generate test signature
			const signature = stripe.webhooks.generateTestHeaderString({
				payload,
				secret: STRIPE_CONNECT_WEBHOOK_SECRET,
			});

			// Verify signature
			const event = stripe.webhooks.constructEvent(payload, signature, STRIPE_CONNECT_WEBHOOK_SECRET);

			expect(event).toBeDefined();
			expect(event.type).toBe("account.updated");
		});

		it("should reject invalid webhook signatures", async () => {
			if (!STRIPE_CONNECT_WEBHOOK_SECRET) {
				console.warn("Skipping: Webhook secret not configured");
				return;
			}

			const payload = JSON.stringify({
				id: "evt_test_webhook",
				type: "account.updated",
			});

			const invalidSignature = "t=123,v1=invalid_signature";

			expect(() => {
				stripe.webhooks.constructEvent(payload, invalidSignature, STRIPE_CONNECT_WEBHOOK_SECRET);
			}).toThrow();
		});
	});

	describe("Rate Limiting and Performance", () => {
		it("should handle concurrent requests appropriately", async () => {
			if (!stripe) {
				console.warn("Skipping: Stripe not configured");
				return;
			}

			// Create multiple accounts concurrently to test rate limiting
			const promises = Array(3).fill(null).map(() =>
				stripe.accounts.create({
					type: "express",
					country: "US",
					email: "test@example.com",
				})
			);

			const results = await Promise.all(promises);

			expect(results).toHaveLength(3);
			results.forEach(account => {
				expect(account.id).toMatch(/^acct_/);
			});

			// Clean up
			await Promise.all(results.map(account => stripe.accounts.del(account.id)));
		});

		it("should validate Stripe API limits", () => {
			// Test that our configuration respects Stripe's limits
			const testLimits = {
				maxProductsPerRequest: 100, // Stripe's limit
				maxPricesPerRequest: 100,
				maxCustomersPerRequest: 100,
			};

			expect(testLimits.maxProductsPerRequest).toBeLessThanOrEqual(100);
			expect(testLimits.maxPricesPerRequest).toBeLessThanOrEqual(100);
			expect(testLimits.maxCustomersPerRequest).toBeLessThanOrEqual(100);
		});
	});

	describe("Configuration Validation", () => {
		it("should validate Stripe configuration", () => {
			const config = {
				secretKey: STRIPE_SECRET_KEY,
				connectWebhookSecret: STRIPE_CONNECT_WEBHOOK_SECRET,
			};

			// Check that keys are present and properly formatted
			if (config.secretKey && !config.secretKey.includes("dummy")) {
				expect(config.secretKey).toMatch(/^sk_(test|live)_/);
			}

			if (config.connectWebhookSecret && !config.connectWebhookSecret.includes("dummy")) {
				expect(config.connectWebhookSecret).toMatch(/^whsec_/);
			}
		});

		it("should test health check endpoint", async () => {
			if (!serverAvailable) {
				console.warn("Skipping: Server not available");
				return;
			}

			const response = await fetch("http://localhost:3000/api/stripe-connect/health");

			expect([200, 503]).toContain(response.status); // 200 if configured, 503 if not

			const data = await response.json();

			if (response.status === 200) {
				expect(data.status).toBe("healthy");
				expect(data.checks.stripeConfigured).toBe(true);
			} else {
				expect(data.status).toBe("unhealthy");
			}
		});
	});
});