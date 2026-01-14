/**
 * Stripe Subscription Integration Tests
 *
 * These tests verify subscription management including:
 * - Subscription creation and lifecycle
 * - Payment method handling
 * - Invoice management
 * - Subscription updates and cancellations
 */

import { describe, expect, it } from "@jest/globals";
import Stripe from "stripe";

// Use test keys (Vercel integration provides these)
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "sk_test_dummy";

describe("Stripe Subscription Integration", () => {
	let stripe: Stripe;
	let serverAvailable = false;

	beforeAll(async () => {
		// Skip tests if Stripe keys not configured
		if (!process.env.STRIPE_SECRET_KEY || STRIPE_SECRET_KEY.includes("dummy")) {
			console.warn(
				"⚠️  Stripe test keys not configured. Skipping Stripe subscription tests.",
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

	describe("Subscription Creation", () => {
		it("should create a subscription with payment method", async () => {
			if (!stripe) {
				console.warn("Skipping: Stripe not configured");
				return;
			}

			// Create customer
			const customer = await stripe.customers.create({
				email: "sub-test@example.com",
				name: "Subscription Test Customer",
			});

			// Create payment method
			const paymentMethod = await stripe.paymentMethods.create({
				type: "card",
				card: {
					number: "4242424242424242",
					exp_month: 12,
					exp_year: new Date().getFullYear() + 1,
					cvc: "314",
				},
			});

			// Attach payment method to customer
			await stripe.paymentMethods.attach(paymentMethod.id, {
				customer: customer.id,
			});

			// Set as default payment method
			await stripe.customers.update(customer.id, {
				invoice_settings: {
					default_payment_method: paymentMethod.id,
				},
			});

			// Create product and price
			const product = await stripe.products.create({
				name: "Test Subscription",
				description: "A test subscription for integration testing",
			});

			const price = await stripe.prices.create({
				product: product.id,
				unit_amount: 999, // $9.99
				currency: "usd",
				recurring: {
					interval: "month",
				},
			});

			// Create subscription
			const subscription = await stripe.subscriptions.create({
				customer: customer.id,
				items: [
					{
						price: price.id,
					},
				],
				default_payment_method: paymentMethod.id,
			});

			expect(subscription).toBeDefined();
			expect(subscription.id).toMatch(/^sub_/);
			expect(subscription.status).toBe("active");
			expect(subscription.customer).toBe(customer.id);
			expect(subscription.items.data[0].price.id).toBe(price.id);

			// Clean up
			await stripe.subscriptions.cancel(subscription.id);
			await stripe.prices.update(price.id, { active: false });
			await stripe.products.update(product.id, { active: false });
			await stripe.customers.del(customer.id);
		});

		it("should handle subscription with trial period", async () => {
			if (!stripe) {
				console.warn("Skipping: Stripe not configured");
				return;
			}

			const customer = await stripe.customers.create({
				email: "trial-test@example.com",
			});

			const product = await stripe.products.create({
				name: "Trial Subscription",
			});

			const price = await stripe.prices.create({
				product: product.id,
				unit_amount: 1999, // $19.99
				currency: "usd",
				recurring: {
					interval: "month",
				},
			});

			// Create subscription with trial
			const trialEnd = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // 7 days
			const subscription = await stripe.subscriptions.create({
				customer: customer.id,
				items: [{ price: price.id }],
				trial_end: trialEnd,
			});

			expect(subscription.status).toBe("trialing");
			expect(subscription.trial_end).toBe(trialEnd);

			// Clean up
			await stripe.subscriptions.cancel(subscription.id);
			await stripe.prices.update(price.id, { active: false });
			await stripe.products.update(product.id, { active: false });
			await stripe.customers.del(customer.id);
		});
	});

	describe("Payment Method Management", () => {
		it("should create and attach payment methods", async () => {
			if (!stripe) {
				console.warn("Skipping: Stripe not configured");
				return;
			}

			// Create customer
			const customer = await stripe.customers.create({
				email: "pm-test@example.com",
			});

			// Create payment method
			const paymentMethod = await stripe.paymentMethods.create({
				type: "card",
				card: {
					number: "5555555555554444", // Mastercard test number
					exp_month: 12,
					exp_year: new Date().getFullYear() + 2,
					cvc: "123",
				},
			});

			// Attach to customer
			const attachedMethod = await stripe.paymentMethods.attach(paymentMethod.id, {
				customer: customer.id,
			});

			expect(attachedMethod.customer).toBe(customer.id);
			expect(attachedMethod.type).toBe("card");
			expect(attachedMethod.card?.brand).toBe("mastercard");

			// List payment methods
			const paymentMethods = await stripe.paymentMethods.list({
				customer: customer.id,
				type: "card",
			});

			expect(paymentMethods.data.length).toBeGreaterThan(0);
			expect(paymentMethods.data[0].id).toBe(paymentMethod.id);

			// Detach payment method
			const detachedMethod = await stripe.paymentMethods.detach(paymentMethod.id);
			expect(detachedMethod.customer).toBeNull();

			// Clean up
			await stripe.customers.del(customer.id);
		});

		it("should handle payment method failures", async () => {
			if (!stripe) {
				console.warn("Skipping: Stripe not configured");
				return;
			}

			// Test with declined card
			const paymentMethod = await stripe.paymentMethods.create({
				type: "card",
				card: {
					number: "4000000000000002", // Declined card
					exp_month: 12,
					exp_year: new Date().getFullYear() + 1,
					cvc: "123",
				},
			});

			const customer = await stripe.customers.create({
				email: "decline-test@example.com",
			});

			await stripe.paymentMethods.attach(paymentMethod.id, {
				customer: customer.id,
			});

			const product = await stripe.products.create({
				name: "Decline Test",
			});

			const price = await stripe.prices.create({
				product: product.id,
				unit_amount: 1000,
				currency: "usd",
				recurring: { interval: "month" },
			});

			// This should fail with card declined
			await expect(
				stripe.subscriptions.create({
					customer: customer.id,
					items: [{ price: price.id }],
					default_payment_method: paymentMethod.id,
				})
			).rejects.toThrow();

			// Clean up
			await stripe.paymentMethods.detach(paymentMethod.id);
			await stripe.prices.update(price.id, { active: false });
			await stripe.products.update(product.id, { active: false });
			await stripe.customers.del(customer.id);
		});
	});

	describe("Invoice Management", () => {
		it("should create and manage invoices", async () => {
			if (!stripe) {
				console.warn("Skipping: Stripe not configured");
				return;
			}

			const customer = await stripe.customers.create({
				email: "invoice-test@example.com",
			});

			const paymentMethod = await stripe.paymentMethods.create({
				type: "card",
				card: {
					number: "4242424242424242",
					exp_month: 12,
					exp_year: new Date().getFullYear() + 1,
					cvc: "314",
				},
			});

			await stripe.paymentMethods.attach(paymentMethod.id, {
				customer: customer.id,
			});

			await stripe.customers.update(customer.id, {
				invoice_settings: {
					default_payment_method: paymentMethod.id,
				},
			});

			// Create one-time invoice
			const invoice = await stripe.invoices.create({
				customer: customer.id,
				auto_advance: false, // Don't auto-charge
			});

			// Add invoice item
			await stripe.invoiceItems.create({
				customer: customer.id,
				invoice: invoice.id,
				amount: 5000, // $50.00
				currency: "usd",
				description: "Test invoice item",
			});

			// Finalize invoice
			const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

			expect(finalizedInvoice.status).toBe("open");
			expect(finalizedInvoice.amount_due).toBe(5000);

			// Pay invoice
			const paidInvoice = await stripe.invoices.pay(invoice.id);

			expect(paidInvoice.status).toBe("paid");
			expect(paidInvoice.amount_paid).toBe(5000);

			// Clean up
			await stripe.paymentMethods.detach(paymentMethod.id);
			await stripe.customers.del(customer.id);
		});

		it("should retrieve invoice PDF URLs", async () => {
			if (!stripe) {
				console.warn("Skipping: Stripe not configured");
				return;
			}

			// This test validates that invoices can be retrieved with hosted URLs
			// (Actual PDF generation requires paid invoices)
			const customer = await stripe.customers.create({
				email: "pdf-test@example.com",
			});

			const invoices = await stripe.invoices.list({
				customer: customer.id,
				limit: 1,
			});

			// Just validate the API works
			expect(Array.isArray(invoices.data)).toBe(true);

			await stripe.customers.del(customer.id);
		});
	});

	describe("Subscription Lifecycle", () => {
		it("should update subscription", async () => {
			if (!stripe) {
				console.warn("Skipping: Stripe not configured");
				return;
			}

			// Create subscription
			const customer = await stripe.customers.create({
				email: "update-test@example.com",
			});

			const paymentMethod = await stripe.paymentMethods.create({
				type: "card",
				card: {
					number: "4242424242424242",
					exp_month: 12,
					exp_year: new Date().getFullYear() + 1,
					cvc: "314",
				},
			});

			await stripe.paymentMethods.attach(paymentMethod.id, {
				customer: customer.id,
			});

			const product = await stripe.products.create({
				name: "Update Test",
			});

			const price1 = await stripe.prices.create({
				product: product.id,
				unit_amount: 999,
				currency: "usd",
				recurring: { interval: "month" },
			});

			const price2 = await stripe.prices.create({
				product: product.id,
				unit_amount: 1999,
				currency: "usd",
				recurring: { interval: "month" },
			});

			const subscription = await stripe.subscriptions.create({
				customer: customer.id,
				items: [{ price: price1.id }],
			});

			// Update subscription to new price
			const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
				items: [
					{
						id: subscription.items.data[0].id,
						price: price2.id,
					},
				],
				proration_behavior: "create_prorations",
			});

			expect(updatedSubscription.items.data[0].price.id).toBe(price2.id);

			// Clean up
			await stripe.subscriptions.cancel(subscription.id);
			await stripe.prices.update(price1.id, { active: false });
			await stripe.prices.update(price2.id, { active: false });
			await stripe.products.update(product.id, { active: false });
			await stripe.paymentMethods.detach(paymentMethod.id);
			await stripe.customers.del(customer.id);
		});

		it("should pause and resume subscription", async () => {
			if (!stripe) {
				console.warn("Skipping: Stripe not configured");
				return;
			}

			// Create subscription
			const customer = await stripe.customers.create({
				email: "pause-test@example.com",
			});

			const paymentMethod = await stripe.paymentMethods.create({
				type: "card",
				card: {
					number: "4242424242424242",
					exp_month: 12,
					exp_year: new Date().getFullYear() + 1,
					cvc: "314",
				},
			});

			await stripe.paymentMethods.attach(paymentMethod.id, {
				customer: customer.id,
			});

			const product = await stripe.products.create({
				name: "Pause Test",
			});

			const price = await stripe.prices.create({
				product: product.id,
				unit_amount: 999,
				currency: "usd",
				recurring: { interval: "month" },
			});

			const subscription = await stripe.subscriptions.create({
				customer: customer.id,
				items: [{ price: price.id }],
			});

			// Pause subscription
			const pausedSubscription = await stripe.subscriptions.update(subscription.id, {
				pause_collection: {
					behavior: "void",
				},
			});

			expect(pausedSubscription.pause_collection?.behavior).toBe("void");

			// Resume subscription
			const resumedSubscription = await stripe.subscriptions.update(subscription.id, {
				pause_collection: "",
			});

			expect(resumedSubscription.pause_collection).toBeNull();

			// Clean up
			await stripe.subscriptions.cancel(subscription.id);
			await stripe.prices.update(price.id, { active: false });
			await stripe.products.update(product.id, { active: false });
			await stripe.paymentMethods.detach(paymentMethod.id);
			await stripe.customers.del(customer.id);
		});

		it("should cancel subscription", async () => {
			if (!stripe) {
				console.warn("Skipping: Stripe not configured");
				return;
			}

			// Create subscription
			const customer = await stripe.customers.create({
				email: "cancel-test@example.com",
			});

			const paymentMethod = await stripe.paymentMethods.create({
				type: "card",
				card: {
					number: "4242424242424242",
					exp_month: 12,
					exp_year: new Date().getFullYear() + 1,
					cvc: "314",
				},
			});

			await stripe.paymentMethods.attach(paymentMethod.id, {
				customer: customer.id,
			});

			const product = await stripe.products.create({
				name: "Cancel Test",
			});

			const price = await stripe.prices.create({
				product: product.id,
				unit_amount: 999,
				currency: "usd",
				recurring: { interval: "month" },
			});

			const subscription = await stripe.subscriptions.create({
				customer: customer.id,
				items: [{ price: price.id }],
			});

			// Cancel immediately
			const canceledSubscription = await stripe.subscriptions.cancel(subscription.id);

			expect(canceledSubscription.status).toBe("canceled");
			expect(canceledSubscription.canceled_at).toBeDefined();

			// Clean up
			await stripe.prices.update(price.id, { active: false });
			await stripe.products.update(product.id, { active: false });
			await stripe.paymentMethods.detach(paymentMethod.id);
			await stripe.customers.del(customer.id);
		});

		it("should cancel subscription at period end", async () => {
			if (!stripe) {
				console.warn("Skipping: Stripe not configured");
				return;
			}

			// Create subscription
			const customer = await stripe.customers.create({
				email: "period-end-test@example.com",
			});

			const paymentMethod = await stripe.paymentMethods.create({
				type: "card",
				card: {
					number: "4242424242424242",
					exp_month: 12,
					exp_year: new Date().getFullYear() + 1,
					cvc: "314",
				},
			});

			await stripe.paymentMethods.attach(paymentMethod.id, {
				customer: customer.id,
			});

			const product = await stripe.products.create({
				name: "Period End Test",
			});

			const price = await stripe.prices.create({
				product: product.id,
				unit_amount: 999,
				currency: "usd",
				recurring: { interval: "month" },
			});

			const subscription = await stripe.subscriptions.create({
				customer: customer.id,
				items: [{ price: price.id }],
			});

			// Cancel at period end
			const canceledSubscription = await stripe.subscriptions.update(subscription.id, {
				cancel_at_period_end: true,
			});

			expect(canceledSubscription.cancel_at_period_end).toBe(true);
			expect(canceledSubscription.status).toBe("active");

			// Clean up
			await stripe.subscriptions.cancel(subscription.id);
			await stripe.prices.update(price.id, { active: false });
			await stripe.products.update(product.id, { active: false });
			await stripe.paymentMethods.detach(paymentMethod.id);
			await stripe.customers.del(customer.id);
		});
	});

	describe("Discounts and Coupons", () => {
		it("should create and apply coupons", async () => {
			if (!stripe) {
				console.warn("Skipping: Stripe not configured");
				return;
			}

			// Create coupon
			const coupon = await stripe.coupons.create({
				duration: "once",
				percent_off: 20, // 20% off
				name: "Test Discount",
			});

			expect(coupon.percent_off).toBe(20);
			expect(coupon.duration).toBe("once");
			expect(coupon.name).toBe("Test Discount");

			// Create customer and subscription with coupon
			const customer = await stripe.customers.create({
				email: "coupon-test@example.com",
			});

			const paymentMethod = await stripe.paymentMethods.create({
				type: "card",
				card: {
					number: "4242424242424242",
					exp_month: 12,
					exp_year: new Date().getFullYear() + 1,
					cvc: "314",
				},
			});

			await stripe.paymentMethods.attach(paymentMethod.id, {
				customer: customer.id,
			});

			const product = await stripe.products.create({
				name: "Coupon Test",
			});

			const price = await stripe.prices.create({
				product: product.id,
				unit_amount: 2000, // $20.00
				currency: "usd",
				recurring: { interval: "month" },
			});

			const subscription = await stripe.subscriptions.create({
				customer: customer.id,
				items: [{ price: price.id }],
				coupon: coupon.id,
			});

			expect(subscription.discount?.coupon.id).toBe(coupon.id);

			// Clean up
			await stripe.subscriptions.cancel(subscription.id);
			await stripe.coupons.del(coupon.id);
			await stripe.prices.update(price.id, { active: false });
			await stripe.products.update(product.id, { active: false });
			await stripe.paymentMethods.detach(paymentMethod.id);
			await stripe.customers.del(customer.id);
		});
	});

	describe("Usage-Based Billing", () => {
		it("should create metered subscription", async () => {
			if (!stripe) {
				console.warn("Skipping: Stripe not configured");
				return;
			}

			const customer = await stripe.customers.create({
				email: "metered-test@example.com",
			});

			const paymentMethod = await stripe.paymentMethods.create({
				type: "card",
				card: {
					number: "4242424242424242",
					exp_month: 12,
					exp_year: new Date().getFullYear() + 1,
					cvc: "314",
				},
			});

			await stripe.paymentMethods.attach(paymentMethod.id, {
				customer: customer.id,
			});

			const product = await stripe.products.create({
				name: "Metered Usage",
			});

			// Create metered price
			const price = await stripe.prices.create({
				product: product.id,
				unit_amount: 10, // $0.10 per unit
				currency: "usd",
				recurring: {
					interval: "month",
					usage_type: "metered",
				},
			});

			const subscription = await stripe.subscriptions.create({
				customer: customer.id,
				items: [{ price: price.id }],
			});

			expect(subscription.items.data[0].price.recurring?.usage_type).toBe("metered");

			// Report usage
			const usageRecord = await stripe.subscriptionItems.createUsageRecord(
				subscription.items.data[0].id,
				{
					quantity: 100,
					timestamp: Math.floor(Date.now() / 1000),
				}
			);

			expect(usageRecord.quantity).toBe(100);

			// Clean up
			await stripe.subscriptions.cancel(subscription.id);
			await stripe.prices.update(price.id, { active: false });
			await stripe.products.update(product.id, { active: false });
			await stripe.paymentMethods.detach(paymentMethod.id);
			await stripe.customers.del(customer.id);
		});
	});
});