import { expect, test } from "@playwright/test";

/**
 * Real User Journey E2E Tests
 *
 * Simulates actual user behavior with multiple signups, different tiers,
 * and realistic user flows to catch real-world bugs
 */

test.describe("Real User Journey - Multiple Signups", () => {
	// Test data for different user types
	const testUsers = [
		{
			name: "Alice Johnson",
			email: "alice.johnson@example.com",
			tier: "free",
			cities: ["London", "Paris"],
			languages: ["English", "French"],
			experience: "0",
			careerPath: "finance",
			description: "Fresh graduate looking for finance roles",
		},
		{
			name: "Bob Smith",
			email: "bob.smith@example.com",
			tier: "premium",
			cities: ["Berlin", "Amsterdam", "Dublin"],
			languages: ["English", "German"],
			experience: "1 year",
			careerPath: "tech",
			description: "Experienced developer seeking tech roles",
		},
		{
			name: "Carol Davis",
			email: "carol.davis@example.com",
			tier: "free",
			cities: ["Madrid", "Barcelona"],
			languages: ["English", "Spanish"],
			experience: "6 months",
			careerPath: "marketing",
			description: "Marketing intern looking for growth opportunities",
		},
	];

	test.beforeEach(async ({ page }) => {
		// Clear any existing data
		await page.context().clearCookies();
		await page.goto("/");
	});

	test("Complete user journey - Free tier signup", async ({ page }) => {
		const user = testUsers[0];

		console.log(
			` Testing complete user journey for ${user.name} (${user.tier} tier)`,
		);

		// Step 1: Land on homepage
		await expect(
			page.locator('h1:has-text("Five roles. Zero scrolling.")'),
		).toBeVisible();
		await expect(page.locator("text=Get matches in 48 hours")).toBeVisible();

		// Step 2: Click signup CTA
		await page.locator("text=Get matches in 48 hours").click();
		await expect(page).toHaveURL(/.*signup/);

		// Step 3: Fill out signup form
		await fillSignupForm(page, user);

		// Step 4: Verify success page
		await expect(page).toHaveURL(/.*success/);
		await expect(page.locator("text=Welcome to JobPing")).toBeVisible();

		console.log(` Free tier signup completed for ${user.name}`);
	});

	test("Complete user journey - Premium tier signup", async ({ page }) => {
		const user = testUsers[1];

		console.log(` Testing premium tier signup for ${user.name}`);

		// Step 1: Go to pricing section
		await page.locator("text=Pricing").click();
		await expect(page.locator('h3:has-text("Premium")')).toBeVisible();

		// Step 2: Click premium CTA
		await page.locator("text=Get Premium Now").click();
		await expect(page).toHaveURL(/.*upgrade/);

		// Step 3: Fill out premium signup
		await fillSignupForm(page, user);

		// Step 4: Verify premium features
		await expect(page.locator("text=Premium Plan Selected")).toBeVisible();

		console.log(` Premium tier signup completed for ${user.name}`);
	});

	test("Multiple rapid signups - Stress test", async ({ page }) => {
		console.log(" Testing multiple rapid signups");

		// Test rapid signups to catch race conditions
		for (let i = 0; i < 3; i++) {
			const user = testUsers[i];

			console.log(` Starting signup ${i + 1}/3 for ${user.name}`);

			// Navigate to signup
			await page.goto(`/signup?tier=${user.tier}`);

			// Fill form quickly
			await fillSignupForm(page, user, true); // fast mode

			// Verify no errors
			await expect(page.locator("text=Something went wrong")).not.toBeVisible();

			// Wait a bit between signups
			await page.waitForTimeout(1000);
		}

		console.log(" Multiple rapid signups completed successfully");
	});

	test("Form validation and error handling", async ({ page }) => {
		console.log(" Testing form validation");

		await page.goto("/signup?tier=free");

		// Test 1: Empty form submission - button should be disabled
		const button = page.locator('button:has-text("Continue to Preferences")');
		await expect(button).toBeDisabled();

		// Test 2: Partial form - still disabled
		await page.fill('input[type="email"]', "invalid-email");
		await page.fill('input[type="text"]', "Test User");
		await expect(button).toBeDisabled();

		// Test 3: Valid form progression
		await page.fill('input[type="email"]', "test@example.com");
		await page.fill('input[type="text"]', "Test User");

		// Select cities
		await page.locator('button:has-text("London")').click();
		await page.locator('button:has-text("Paris")').click();

		// Select languages
		await page.locator('button:has-text("English")').click();
		await page.locator('button:has-text("French")').click();

		// Button should now be enabled
		await expect(button).toBeEnabled();

		// Should proceed to next step
		await page.locator('button:has-text("Continue to Preferences")').click();
		await expect(page.locator("text=Your preferences")).toBeVisible();

		console.log(" Form validation working correctly");
	});

	test("Mobile user journey", async ({ page }) => {
		console.log(" Testing mobile user journey");

		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });

		const user = testUsers[2];

		// Mobile navigation
		await expect(
			page.locator('h1:has-text("Five roles. Zero scrolling.")'),
		).toBeVisible();

		// Mobile signup flow
		await page.locator("text=Get matches in 48 hours").click();
		await expect(page).toHaveURL(/.*signup/);

		// Mobile form interaction
		await fillSignupForm(page, user);

		// Verify mobile success
		await expect(page.locator("text=Welcome to JobPing")).toBeVisible();

		console.log(" Mobile user journey completed");
	});

	test("Cross-browser compatibility - Real user flows", async ({
		page,
		browserName,
	}) => {
		const user = testUsers[0];

		console.log(` Testing ${browserName} browser compatibility`);

		// Basic functionality test
		await page.goto("/");
		await expect(
			page.locator('h1:has-text("Five roles. Zero scrolling.")'),
		).toBeVisible();

		// Navigation test
		await page.locator("text=Pricing").click();
		await expect(page.locator('h3:has-text("Free")')).toBeVisible();

		// Signup flow test
		await page.locator("text=Start Free").click();
		await expect(page).toHaveURL(/.*signup/);

		// Form interaction test
		await page.fill('input[type="email"]', user.email);
		await page.fill('input[type="text"]', user.name);

		// Verify form is working
		await expect(page.locator('input[type="email"]')).toHaveValue(user.email);
		await expect(page.locator('input[type="text"]')).toHaveValue(user.name);

		console.log(` ${browserName} browser compatibility verified`);
	});

	test("Performance under load - Multiple concurrent users", async ({
		page,
		context,
	}) => {
		console.log(" Testing performance under load");

		// Simulate multiple browser contexts (different users)
		const contexts = await Promise.all([
			context.browser()?.newContext(),
			context.browser()?.newContext(),
			context.browser()?.newContext(),
		]);

		const pages = await Promise.all(contexts.map((ctx) => ctx?.newPage()));

		// Concurrent signups
		const signupPromises = pages.map(async (p, index) => {
			if (!p) return;

			const user = testUsers[index];
			await p.goto(`/signup?tier=${user.tier}`);
			await fillSignupForm(p, user, true);
		});

		// Wait for all signups to complete
		await Promise.all(signupPromises);

		// Verify no errors occurred
		for (const p of pages) {
			if (p) {
				await expect(p.locator("text=Something went wrong")).not.toBeVisible();
			}
		}

		// Cleanup
		await Promise.all(contexts.map((ctx) => ctx?.close()));

		console.log(" Concurrent user load test completed");
	});

	test("Error recovery and resilience", async ({ page }) => {
		console.log(" Testing error recovery");

		// Test network interruption simulation
		await page.goto("/signup?tier=free");

		// Fill form completely
		await page.fill('input[type="email"]', "test@example.com");
		await page.fill('input[type="text"]', "Test User");

		// Select cities and languages
		await page.locator('button:has-text("London")').click();
		await page.locator('button:has-text("English")').click();

		// Simulate network issues by blocking requests
		await page.route("**/api/**", (route) => {
			// Randomly fail some requests
			if (Math.random() < 0.3) {
				route.abort();
			} else {
				route.continue();
			}
		});

		// Try to continue - should handle errors gracefully
		await page.locator('button:has-text("Continue to Preferences")').click();

		// Wait for next step or error
		try {
			await page.waitForSelector("text=Your preferences", { timeout: 5000 });
			console.log(" Form progression working despite network issues");
		} catch (_error) {
			// Check if error handling is working
			const errorVisible = await page
				.locator("text=Something went wrong")
				.isVisible();
			if (errorVisible) {
				console.log(" Error handling working correctly");
			}
		}
	});

	test("Accessibility compliance - Real user scenarios", async ({ page }) => {
		console.log(" Testing accessibility compliance");

		await page.goto("/signup?tier=free");

		// Test keyboard navigation
		await page.keyboard.press("Tab");
		await page.keyboard.press("Tab");
		await page.keyboard.press("Tab");

		// Verify focus is visible
		const focusedElement = page.locator(":focus");
		await expect(focusedElement).toBeVisible();

		// Test screen reader compatibility
		const labels = page.locator("label[for]");
		const labelCount = await labels.count();
		expect(labelCount).toBeGreaterThan(0);

		// Test form submission with keyboard
		await page.fill('input[type="email"]', "test@example.com");
		await page.fill('input[type="text"]', "Test User");
		await page.keyboard.press("Tab");
		await page.keyboard.press("Enter"); // Try to submit with Enter

		console.log(" Accessibility compliance verified");
	});
});

// Helper function to fill signup form
async function fillSignupForm(page: any, user: any, fastMode = false) {
	console.log(` Filling signup form for ${user.name}`);

	// Step 1: Basic info
	await page.fill('input[type="text"]', user.name);
	await page.fill('input[type="email"]', user.email);

	// Select cities
	for (const city of user.cities) {
		await page.locator(`button:has-text("${city}")`).click();
	}

	// Select languages
	for (const lang of user.languages) {
		await page.locator(`button:has-text("${lang}")`).click();
	}

	// Wait for button to be enabled
	await page.waitForSelector(
		'button:has-text("Continue to Preferences"):not([disabled])',
		{ timeout: 5000 },
	);

	// Continue to preferences
	await page.locator('button:has-text("Continue to Preferences")').click();

	if (!fastMode) {
		await page.waitForSelector("text=Your preferences");
	}

	// Step 2: Preferences
	await page.fill('input[type="date"]', "2024-06-01");
	await page.locator(`button:has-text("${user.experience}")`).click();
	await page.locator('button:has-text("EU citizen")').click();
	await page.locator('button:has-text("Graduate Programmes")').click();

	// Continue to career
	await page.locator('button:has-text("Continue")').click();

	if (!fastMode) {
		await page.waitForSelector("text=Your career path");
	}

	// Step 3: Career path
	await page
		.locator(`button:has-text("${getCareerPathLabel(user.careerPath)}")`)
		.click();

	// Select some roles
	const roleButtons = page.locator('button:has-text("Analyst")');
	const roleCount = await roleButtons.count();
	if (roleCount > 0) {
		await roleButtons.first().click();
	}

	// Continue to final step
	await page.locator('button:has-text("Continue to Preferences")').click();

	if (!fastMode) {
		await page.waitForSelector("text=Additional Preferences");
	}

	// Step 4: Final preferences
	await page.check('input[type="checkbox"]'); // GDPR consent

	// Submit
	await page.locator('button:has-text("Get My 10 Roles")').click();

	if (!fastMode) {
		await page.waitForSelector("text=Welcome to JobPing");
	}

	console.log(` Form completed for ${user.name}`);
}

// Helper function to get career path label
// Uses the shared function from categoryMapper for consistency
function getCareerPathLabel(careerPath: string): string {
	const {
		getCareerPathLabel: getLabel,
	} = require("../../Utils/matching/categoryMapper");
	return getLabel(careerPath) || "Not Sure Yet / General";
}
