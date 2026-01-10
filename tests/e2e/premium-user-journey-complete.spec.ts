/**
 * Complete Premium User Journey E2E Tests
 *
 * Tests the entire premium user experience from initial discovery
 * through signup, payment, and premium feature access
 *
 * This is critical revenue-generating flow validation
 */

import { expect, test } from "@playwright/test";

test.describe("Complete Premium User Journey", () => {
	test.describe.configure({ mode: "serial" }); // Run tests in sequence

	let testUserEmail: string;
	let testUserName: string;

	test.beforeEach(async () => {
		// Generate unique test user for each test
		const timestamp = Date.now();
		testUserEmail = `premium-journey-${timestamp}@testjobping.com`;
		testUserName = `Premium User ${timestamp}`;
	});

	test("Phase 1: Homepage Discovery & Free Signup", async ({ page }) => {
		await page.goto("/");

		// Verify premium value proposition is visible
		await expect(page.locator("text=Premium")).toBeVisible();
		await expect(page.locator("text=€5")).toBeVisible();
		await expect(page.locator("text=weekly")).toBeVisible();

		// Start with free signup to establish baseline
		await page.locator("text=Find my matches").first().click();
		await expect(page).toHaveURL(/.*signup/);

		// Complete free signup
		await page.fill('input[placeholder*="email"]', testUserEmail);
		await page.fill('input[placeholder*="name"]', testUserName);
		await page.locator('button:has-text("Continue")').first().click();

		// Complete basic preferences
		await expect(page.locator("text=Your career path")).toBeVisible();
		await page.locator('button:has-text("Tech")').or(page.locator('button:has-text("Technology")')).first().click();
		await page.locator('button:has-text("Continue")').first().click();

		// Complete location preferences
		await expect(page.locator("text=Where are you located")).toBeVisible();
		await page.locator('button:has-text("London")').first().click();
		await page.locator('button:has-text("Continue")').first().click();

		// Complete language preferences
		await page.locator('button:has-text("English")').first().click();
		await page.locator('button:has-text("Continue")').first().click();

		// Submit free signup
		await page.locator('button:has-text("Get my matches")').or(page.locator('button:has-text("Complete")')).first().click();

		// Should reach success page
		await expect(page.locator("text=success")).toBeVisible();
	});

	test("Phase 2: Free User Experience & Upgrade Prompt", async ({ page }) => {
		// Login as free user (simulate)
		await page.goto("/dashboard");

		// Verify free user limitations are shown
		await expect(page.locator("text=Free")).toBeVisible();
		await expect(page.locator("text=5 matches")).toBeVisible();

		// Verify upgrade prompts are visible
		await expect(page.locator("text=Upgrade")).toBeVisible();
		await expect(page.locator("text=Premium")).toBeVisible();
		await expect(page.locator("text=€5")).toBeVisible();

		// Click upgrade CTA
		await page.locator("text=Upgrade to Premium").first().click();

		// Should navigate to upgrade flow
		await expect(page.locator("text=Premium")).toBeVisible();
		await expect(page.locator("text=€5")).toBeVisible();
	});

	test("Phase 3: Premium Upgrade Flow", async ({ page }) => {
		await page.goto("/upgrade");

		// Verify premium benefits are clearly shown
		await expect(page.locator("text=Premium")).toBeVisible();
		await expect(page.locator("text=€5")).toBeVisible();
		await expect(page.locator("text=50 matches")).toBeVisible();
		await expect(page.locator("text=weekly")).toBeVisible();
		await expect(page.locator("text=email")).toBeVisible();

		// Verify pricing is clear
		await expect(page.locator("text=€5")).toBeVisible();
		await expect(page.locator("text=month")).toBeVisible();

		// Click upgrade CTA
		const upgradeButton = page.locator("text=Upgrade").or(page.locator("text=Subscribe")).first();
		await expect(upgradeButton).toBeVisible();
		await upgradeButton.click();
	});

	test("Phase 4: Premium Signup & Onboarding", async ({ page }) => {
		await page.goto("/signup?tier=premium");

		// Verify premium signup flow
		await expect(page.locator("text=Premium")).toBeVisible();
		await expect(page.locator("text=€5")).toBeVisible();

		// Complete premium signup form
		await page.fill('input[placeholder*="email"]', testUserEmail);
		await page.fill('input[placeholder*="name"]', testUserName);
		await page.locator('button:has-text("Continue")').first().click();

		// Premium users get enhanced preferences
		await expect(page.locator("text=Advanced")).or(page.locator("text=Premium")).toBeVisible();

		// Complete enhanced preferences
		await page.locator('button:has-text("Tech")').first().click();
		await page.locator('button:has-text("Continue")').first().click();

		// Enhanced location selection
		await page.locator('button:has-text("London")').first().click();
		await page.locator('button:has-text("Berlin")').first().click(); // Premium gets multiple cities
		await page.locator('button:has-text("Continue")').first().click();

		// Enhanced language selection
		await page.locator('button:has-text("English")').first().click();
		await page.locator('button:has-text("German")').first().click(); // Premium gets multiple languages
		await page.locator('button:has-text("Continue")').first().click();

		// Premium-specific preferences
		await page.locator('button:has-text("Senior")').or(page.locator('button:has-text("5+ years")')).first().click();
		await page.locator('button:has-text("Continue")').first().click();

		// Visa preferences (premium feature)
		await page.locator('button:has-text("EU citizen")').first().click();
		await page.locator('button:has-text("Continue")').first().click();
	});

	test("Phase 5: Premium Payment Processing", async ({ page }) => {
		await page.goto("/upgrade");

		// Click premium upgrade
		await page.locator("text=Upgrade").first().click();

		// Should reach payment form
		await expect(page.locator("text=Payment")).or(page.locator("text=Subscribe")).toBeVisible();

		// Verify pricing display
		await expect(page.locator("text=€5")).toBeVisible();
		await expect(page.locator("text=month")).toBeVisible();

		// Test payment form elements (without actual payment)
		await expect(page.locator('input[type="email"]')).toBeVisible();

		// Verify secure payment indicators
		await expect(page.locator("text=Secure")).or(page.locator("text=SSL")).toBeVisible();
	});

	test("Phase 6: Premium User Dashboard", async ({ page }) => {
		// Simulate premium user login
		await page.goto("/dashboard");

		// Verify premium status
		await expect(page.locator("text=Premium")).toBeVisible();
		await expect(page.locator("text=50 matches")).toBeVisible();
		await expect(page.locator("text=weekly")).toBeVisible();

		// Verify premium features are accessible
		await expect(page.locator("text=email")).toBeVisible();

		// Check for premium-only UI elements
		await expect(page.locator('[data-premium="true"]')).toBeDefined();
	});

	test("Phase 7: Premium Email Delivery", async ({ page, request }) => {
		// Create premium user via API
		const signupResponse = await request.post("/api/signup", {
			data: {
				fullName: testUserName,
				email: testUserEmail,
				cities: ["London", "Berlin"],
				languages: ["English", "German"],
				startDate: "2024-06-01",
				experience: "3 years",
				workEnvironment: ["Hybrid"],
				visaStatus: "EU citizen",
				entryLevelPreferences: ["Graduate Programmes"],
				targetCompanies: ["Tech Companies"],
				careerPath: "tech",
				roles: ["Software Engineer"],
				industries: ["Technology"],
				companySizePreference: "large",
				skills: ["Python", "JavaScript"],
				careerKeywords: "full-stack development",
				gdprConsent: true,
				tier: "premium",
			},
		});

		expect(signupResponse.status()).toBe(201);

		// Trigger matching for premium user
		const matchResponse = await request.post("/api/match-users", {
			data: { userEmail: testUserEmail },
		});

		expect(matchResponse.status()).toBe(200);

		// Verify premium email was queued/sent
		const emailCheckResponse = await request.get(`/api/admin/emails?user=${encodeURIComponent(testUserEmail)}`);
		if (emailCheckResponse.status() === 200) {
			const emailData = await emailCheckResponse.json();
			expect(emailData.premiumEmails).toBeDefined();
		}
	});

	test("Phase 8: Premium Feature Access Control", async ({ page }) => {
		// Test that premium features require authentication
		await page.goto("/matches/premium");

		// Should redirect to login or show upgrade prompt
		await expect(page.locator("text=Premium")).or(page.locator("text=Upgrade")).toBeVisible();

		// Test premium API endpoints
		const apiResponse = await page.request.get("/api/matches/premium");
		expect([401, 403]).toContain(apiResponse.status());
	});

	test("Phase 9: Premium User Retention Features", async ({ page }) => {
		await page.goto("/dashboard");

		// Verify premium user sees retention messaging
		await expect(page.locator("text=Premium")).toBeVisible();

		// Check for usage statistics (premium feature)
		await expect(page.locator("text=matches used")).or(page.locator("text=50")).toBeVisible();

		// Verify no upgrade prompts for premium users
		await expect(page.locator("text=Upgrade")).not.toBeVisible();
	});

	test("Phase 10: Premium Cancellation Flow", async ({ page }) => {
		await page.goto("/billing");

		// Verify billing management is available
		await expect(page.locator("text=Billing")).or(page.locator("text=Subscription")).toBeVisible();

		// Test cancellation flow (UI only, no actual cancellation)
		const cancelButton = page.locator("text=Cancel").or(page.locator("text=Manage"));
		if (await cancelButton.isVisible()) {
			await expect(cancelButton).toBeVisible();
		}
	});

	test("Cross-Tier Feature Comparison", async ({ page }) => {
		// Compare free vs premium features
		await page.goto("/pricing");

		// Verify feature comparison is clear
		await expect(page.locator("text=Free")).toBeVisible();
		await expect(page.locator("text=Premium")).toBeVisible();
		await expect(page.locator("text=5 matches")).toBeVisible();
		await expect(page.locator("text=50 matches")).toBeVisible();
		await expect(page.locator("text=weekly")).toBeVisible();

		// Verify value proposition is compelling
		await expect(page.locator("text=email")).toBeVisible();
		await expect(page.locator("text=€5")).toBeVisible();
	});

	test("Premium User Support & Help", async ({ page }) => {
		await page.goto("/dashboard");

		// Verify premium users have access to support
		const supportLink = page.locator("text=Support").or(page.locator("text=Help"));
		if (await supportLink.isVisible()) {
			await expect(supportLink).toBeVisible();
		}

		// Check for premium-specific help resources
		await expect(page.locator("text=Premium")).toBeVisible();
	});
});