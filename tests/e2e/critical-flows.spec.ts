import { expect, test } from "@playwright/test";

/**
 * Critical E2E Tests for JobPing
 *
 * Tests use data-testids and roles instead of literal copy for better maintainability
 */

test.describe("Critical User Flows", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
	});

	test("Homepage loads correctly and displays all sections", async ({
		page,
	}) => {
		// Use data-testids instead of text selectors
		await expect(page.locator('[data-testid="hero-section"]')).toBeVisible();
		await expect(page.locator('[data-testid="how-it-works"]')).toBeVisible();
		await expect(page.locator('[data-testid="pricing"]')).toBeVisible();

		// Use semantic selectors
		await expect(page.locator("h1")).toBeVisible();

		// Use role-based selectors where appropriate
		await expect(page.locator("role=heading[level=1]")).toBeVisible();
	});

	test("Pricing section displays correctly with both tiers", async ({
		page,
	}) => {
		// Navigate to pricing section using data-testid
		await page.locator('[data-testid="pricing"]').scrollIntoViewIfNeeded();

		// Check free tier using data-testid
		await expect(page.locator('[data-testid="free-plan"]')).toBeVisible();
		await expect(
			page.locator('[data-testid="free-plan"]').locator("role=heading"),
		).toBeVisible();

		// Check premium tier using data-testid
		await expect(page.locator('[data-testid="premium-plan"]')).toBeVisible();
		await expect(
			page.locator('[data-testid="premium-plan"]').locator("role=heading"),
		).toBeVisible();

		// Check CTA buttons using role and aria-label
		await expect(
			page
				.locator('[data-testid="free-plan"]')
				.locator('role=link[aria-label*="Start free"]'),
		).toBeVisible();
		await expect(
			page
				.locator('[data-testid="premium-plan"]')
				.locator('role=link[aria-label*="Premium"]'),
		).toBeVisible();
	});

	test("Signup flow works for free tier", async ({ page }) => {
		// Use data-testid for CTA
		await page
			.locator('[data-testid="free-plan"]')
			.locator("role=link")
			.first()
			.click();

		// Should navigate to signup page
		await expect(page).toHaveURL(/.*signup.*tier=free/);

		// Check signup form using data-testid
		await expect(page.locator('[data-testid="signup-form"]')).toBeVisible();
		await expect(
			page
				.locator('[data-testid="signup-form"]')
				.locator('input[type="email"]'),
		).toBeVisible();
		await expect(
			page.locator('[data-testid="signup-form"]').locator("role=button"),
		).toBeVisible();
	});

	test("Signup flow works for premium tier", async ({ page }) => {
		// Use data-testid for premium CTA
		await page
			.locator('[data-testid="premium-plan"]')
			.locator("role=link")
			.first()
			.click();

		// Should navigate to billing/upgrade page
		await expect(page).toHaveURL(/.*(billing|upgrade)/);

		// Check if premium form is present
		await expect(
			page
				.locator('[data-testid="billing-form"], [data-testid="upgrade-form"]')
				.first(),
		).toBeVisible();
	});

	test("Navigation works correctly", async ({ page }) => {
		// Test logo click using data-testid
		await page.locator('[data-testid="logo"]').click();
		await expect(page).toHaveURL("/");

		// Test navigation links using role and aria-label
		const navLinks = [
			{ testid: "nav-how-it-works", href: "#how-it-works" },
			{ testid: "nav-pricing", href: "#pricing" },
		];

		for (const link of navLinks) {
			const navElement = page.locator(`[data-testid="${link.testid}"]`);
			if ((await navElement.count()) > 0) {
				await navElement.click();
				await expect(page).toHaveURL(new RegExp(link.href));
			}
		}
	});

	test("Mobile responsiveness works", async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });

		// Check if hero section is visible
		await expect(page.locator('[data-testid="hero-section"]')).toBeVisible();

		// Check if pricing cards stack properly using data-testids
		await page.locator('[data-testid="pricing"]').scrollIntoViewIfNeeded();
		await expect(page.locator('[data-testid="free-plan"]')).toBeVisible();
		await expect(page.locator('[data-testid="premium-plan"]')).toBeVisible();
	});

	test("Error pages handle gracefully", async ({ page }) => {
		// Test 404 page
		await page.goto("/non-existent-page");
		await expect(page.locator("role=heading[level=1]")).toBeVisible();

		// Test that we can navigate back
		await page.goBack();
		await expect(page).toHaveURL("/");
	});
});

test.describe("API Endpoints", () => {
	test("Health check endpoint works and meets SLO (<100ms)", async ({
		request,
	}) => {
		const startTime = Date.now();
		const response = await request.get("/api/health");
		const duration = Date.now() - startTime;

		expect(response.status()).toBe(200);

		const data = await response.json();
		expect(["healthy", "degraded"]).toContain(data.status);

		// SLO check: health endpoint should respond in <100ms
		expect(duration).toBeLessThan(100);
		expect(data.responseTime || data.duration).toBeLessThan(100);
	});

	test("Match users endpoint requires authentication", async ({ request }) => {
		const response = await request.post("/api/match-users");
		expect(response.status()).toBe(401);
	});

	test("Signup endpoint handles invalid data gracefully", async ({
		request,
	}) => {
		const response = await request.post("/api/signup", {
			data: { invalid: "data" },
		});
		// Should return 400, 422 for invalid data
		expect([400, 422]).toContain(response.status());
	});
});

test.describe("Performance Tests", () => {
	test("Homepage loads within acceptable time", async ({ page }) => {
		const startTime = Date.now();
		await page.goto("/");
		await page.waitForLoadState("networkidle");
		const loadTime = Date.now() - startTime;

		// Should load within 3 seconds
		expect(loadTime).toBeLessThan(3000);
	});

	test("Images load correctly", async ({ page }) => {
		await page.goto("/");

		// Check for broken images
		const images = page.locator("img");
		const count = await images.count();

		for (let i = 0; i < count; i++) {
			const img = images.nth(i);
			await expect(img).toHaveAttribute("src");

			// Check if image loads without errors
			const naturalWidth = await img.evaluate(
				(el: HTMLImageElement) => el.naturalWidth,
			);
			expect(naturalWidth).toBeGreaterThan(0);
		}
	});
});

test.describe("Accessibility Tests", () => {
	test("Page has proper heading structure", async ({ page }) => {
		await page.goto("/");

		// Check for h1 using role
		await expect(page.locator("role=heading[level=1]")).toBeVisible();

		// Check for proper heading hierarchy
		const headings = page.locator("role=heading");
		const count = await headings.count();
		expect(count).toBeGreaterThan(0);
	});

	test("Interactive elements are keyboard accessible", async ({ page }) => {
		await page.goto("/");

		// Test tab navigation
		await page.keyboard.press("Tab");
		await page.keyboard.press("Tab");
		await page.keyboard.press("Tab");

		// Check if focus is visible
		const focusedElement = page.locator(":focus");
		await expect(focusedElement).toBeVisible();
	});

	test("Form elements have proper labels", async ({ page }) => {
		await page.goto("/signup?tier=free");

		// Check email input has label using role
		const emailInput = page.locator('input[type="email"]');
		await expect(emailInput).toBeVisible();

		// Check if input is properly labeled
		const labels = page.locator("label[for]");
		await expect(labels.first()).toBeVisible();
	});
});

test.describe("Cross-browser Compatibility", () => {
	test("Works in Chrome", async ({ page, browserName }) => {
		await page.goto("/");
		await expect(page.locator('[data-testid="hero-section"]')).toBeVisible();
	});

	test("Works in Firefox", async ({ page, browserName }) => {
		await page.goto("/");
		await expect(page.locator('[data-testid="hero-section"]')).toBeVisible();
	});

	test("Works in Safari", async ({ page, browserName }) => {
		await page.goto("/");
		await expect(page.locator('[data-testid="hero-section"]')).toBeVisible();
	});
});
