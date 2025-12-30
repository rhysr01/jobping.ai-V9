import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E Test Configuration
 *
 * Comprehensive configuration for testing JobPing across multiple browsers
 * with focus on accessibility, performance, and cross-browser compatibility.
 */
export default defineConfig({
	// Test directory
	testDir: "./tests",

	// Maximum time one test can run
	timeout: 30 * 1000,

	// Run tests in parallel
	fullyParallel: true,

	// Fail the build on CI if you accidentally left test.only in the source code
	forbidOnly: !!process.env.CI,

	// Retry on CI only
	retries: process.env.CI ? 2 : 0,

	// Opt out of parallel tests on CI
	workers: process.env.CI ? 1 : undefined,

	// Reporter to use
	reporter: [
		["html", { outputFolder: "playwright-report" }],
		["json", { outputFile: "test-results/results.json" }],
		["list"],
	],

	// Shared settings for all the projects below
	use: {
		// Base URL to use in actions like `await page.goto('/')`
		baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",

		// Collect trace when retrying the failed test
		trace: "on-first-retry",

		// Take screenshot on failure
		screenshot: "only-on-failure",

		// Record video on first retry
		video: "retain-on-failure",

		// Maximum time each action such as `click()` can take
		actionTimeout: 10 * 1000,

		// Viewport size
		viewport: { width: 1280, height: 720 },
	},

	// Configure projects for major browsers
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},

		{
			name: "firefox",
			use: { ...devices["Desktop Firefox"] },
		},

		{
			name: "webkit",
			use: { ...devices["Desktop Safari"] },
		},

		// Mobile viewports
		{
			name: "Mobile Chrome",
			use: { ...devices["Pixel 5"] },
		},

		{
			name: "Mobile Safari",
			use: { ...devices["iPhone 12"] },
		},

		// Tablet viewports
		{
			name: "iPad",
			use: { ...devices["iPad Pro"] },
		},
	],

	// Run local dev server before starting tests
	webServer: {
		command: "npm run dev",
		url: "http://localhost:3000",
		reuseExistingServer: !process.env.CI,
		timeout: 120 * 1000,
		stdout: "ignore",
		stderr: "pipe",
	},
});
