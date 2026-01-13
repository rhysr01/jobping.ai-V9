/**
 * CRITICAL USER JOURNEY E2E TESTS
 *
 * Tests the complete user experience from signup to job matches.
 * This validates that our core business value actually works for real users.
 */

import { test, expect } from "@playwright/test";

test.describe("Critical User Journey - Free Signup to Matches", () => {
    // Generate unique test data for each test run
    const testEmail = `e2e-test-${Date.now()}@jobping-test.com`;
    const testName = "E2E Test User";

    test("complete free user journey: signup → matches → email", async ({ page }) => {
        console.log(`🧪 Testing complete journey for ${testEmail}`);

        // Step 1: Navigate to signup page
        await page.goto("/signup/free");
        await expect(page).toHaveTitle(/JobPing/);

        // Step 2: Fill out the signup form
        await page.waitForSelector('input[type="email"]', { timeout: 10000 });

        // Fill basic info
        await page.fill('input[type="text"]', testName); // Name field
        await page.fill('input[type="email"]', testEmail);

        // Select city (interactive map - click on a city)
        const cityButton = page.locator('[role="button"]').filter({ hasText: /London|Berlin|Paris/ }).first();
        await expect(cityButton).toBeVisible({ timeout: 5000 });
        await cityButton.click();

        // Select career path
        const careerCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /Tech/ }).first();
        await expect(careerCheckbox).toBeVisible({ timeout: 5000 });
        await careerCheckbox.check();

        // Accept terms and age verification
        const ageCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /16|age/i }).first();
        await ageCheckbox.check();

        const termsCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /terms|accept/i }).first();
        await termsCheckbox.check();

        // Select visa status
        const visaRadio = page.locator('input[type="radio"]').filter({ hasText: /no|No/ }).first();
        await visaRadio.check();

        // Submit the form
        const submitButton = page.locator('button[type="submit"], button').filter({ hasText: /submit|signup|register|get matches/i }).first();
        await expect(submitButton).toBeVisible();
        await submitButton.click();

        // Step 3: Wait for processing and redirect to matches
        await page.waitForURL(/\/matches|\/dashboard/, { timeout: 30000 });

        // Step 4: Verify we have matches
        await expect(page.locator('text=matches found')).toBeVisible({ timeout: 10000 });

        // Check that we have at least some matches displayed
        const matchCards = page.locator('[data-testid="job-card"], .job-card, .match-card').first();
        await expect(matchCards).toBeVisible({ timeout: 5000 });

        console.log("✅ User journey completed successfully - matches displayed");

        // Step 5: Verify email was sent (if we can check this)
        // This would require email testing setup
        // For now, just verify the UI shows success
        await expect(page.locator('text=Welcome|Check your email')).toBeVisible({ timeout: 5000 });

        console.log("✅ Complete user journey test passed");
    });

    test("signup form validation works", async ({ page }) => {
        await page.goto("/signup/free");

        // Try to submit without filling required fields
        const submitButton = page.locator('button[type="submit"], button').filter({ hasText: /submit|signup|get matches/i }).first();
        await submitButton.click();

        // Should show validation errors
        await expect(page.locator('text=required|invalid|please fill')).toBeVisible({ timeout: 5000 });

        console.log("✅ Form validation working correctly");
    });

    test("can navigate to pricing page", async ({ page }) => {
        await page.goto("/");
        await page.click('text=Pricing|Upgrade|Premium');

        await expect(page).toHaveURL(/pricing/);
        console.log("✅ Navigation to pricing works");
    });

    test("homepage loads and shows key elements", async ({ page }) => {
        await page.goto("/");

        // Check key homepage elements
        await expect(page.locator('text=JobPing|Find your dream job')).toBeVisible();
        await expect(page.locator('button, a').filter({ hasText: /Get Started|Sign Up|Start/i })).toBeVisible();

        console.log("✅ Homepage loads correctly");
    });
});