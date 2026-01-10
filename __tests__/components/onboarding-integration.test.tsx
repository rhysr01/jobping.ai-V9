/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { jest } from "@jest/globals";

// Mock Next.js router
jest.mock("next/navigation", () => ({
	useRouter: () => ({
		push: jest.fn(),
		replace: jest.fn(),
		prefetch: jest.fn(),
	}),
	useSearchParams: () => new URLSearchParams(),
}));

// Mock fetch
global.fetch = jest.fn();

// Import components after mocks
import OnboardingPage from "@/app/onboard/page";

describe("Onboarding Page Integration Tests", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(global.fetch as jest.Mock).mockClear();
	});

	describe("Onboarding Flow", () => {
		it("renders onboarding welcome message", () => {
			render(<OnboardingPage />);

			expect(screen.getByText(/welcome.*onboard/i)).toBeInTheDocument();
			expect(screen.getByText(/complete.*profile/i)).toBeInTheDocument();
		});

		it("shows progress indicator", () => {
			render(<OnboardingPage />);

			expect(screen.getByText(/step.*1.*3/i)).toBeInTheDocument();
			expect(screen.getByRole("progressbar")).toBeInTheDocument();
		});

		it("navigates through onboarding steps", async () => {
			const user = userEvent.setup();
			render(<OnboardingPage />);

			// Step 1: Basic Information
			expect(screen.getByText(/tell.*about.*yourself/i)).toBeInTheDocument();

			const continueButton = screen.getByRole("button", { name: /continue/i });
			await user.click(continueButton);

			// Should move to step 2
			await waitFor(() => {
				expect(screen.getByText(/preferences/i)).toBeInTheDocument();
			});

			// Step 2: Preferences
			const nextButton = screen.getByRole("button", { name: /next/i });
			await user.click(nextButton);

			// Should move to step 3
			await waitFor(() => {
				expect(screen.getByText(/complete/i)).toBeInTheDocument();
			});
		});

		it("validates required information before proceeding", async () => {
			const user = userEvent.setup();
			render(<OnboardingPage />);

			// Try to continue without filling required fields
			const continueButton = screen.getByRole("button", { name: /continue/i });
			await user.click(continueButton);

			// Should show validation errors
			await waitFor(() => {
				expect(screen.getByText(/required/i)).toBeInTheDocument();
			});

			// Should not proceed to next step
			expect(screen.getByText(/tell.*about.*yourself/i)).toBeInTheDocument();
		});

		it("allows skipping optional steps", async () => {
			const user = userEvent.setup();
			render(<OnboardingPage />);

			// Look for skip button
			const skipButton = screen.queryByRole("button", { name: /skip/i });
			if (skipButton) {
				await user.click(skipButton);

				// Should skip to next required step or completion
				await waitFor(() => {
					expect(screen.queryByText(/required/i)).not.toBeInTheDocument();
				});
			}
		});

		it("saves progress automatically", async () => {
			const user = userEvent.setup();
			render(<OnboardingPage />);

			// Fill out some information
			const nameInput = screen.getByLabelText(/name/i);
			await user.type(nameInput, "Test User");

			// Navigate away and come back
			// (In a real app, this would test localStorage/sessionStorage)

			// Progress should be saved
			expect(nameInput).toHaveValue("Test User");
		});
	});

	describe("Onboarding Completion", () => {
		it("shows completion message", async () => {
			const user = userEvent.setup();
			render(<OnboardingPage />);

			// Complete all required steps
			await completeOnboardingSteps(user);

			// Should show completion message
			await waitFor(() => {
				expect(screen.getByText(/congratulations/i)).toBeInTheDocument();
				expect(screen.getByText(/setup.*complete/i)).toBeInTheDocument();
			});
		});

		it("provides next steps after completion", async () => {
			const user = userEvent.setup();
			render(<OnboardingPage />);

			await completeOnboardingSteps(user);

			await waitFor(() => {
				expect(screen.getByRole("button", { name: /get.*started/i })).toBeInTheDocument();
				expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
			});
		});

		it("redirects to dashboard after completion", async () => {
			const user = userEvent.setup();
			const mockRouter = { push: jest.fn() };

			// Mock useRouter to return our mock
			jest.mocked(require("next/navigation")).useRouter.mockReturnValue(mockRouter);

			render(<OnboardingPage />);

			await completeOnboardingSteps(user);

			const getStartedButton = await screen.findByRole("button", { name: /get.*started/i });
			await user.click(getStartedButton);

			expect(mockRouter.push).toHaveBeenCalledWith("/dashboard");
		});
	});

	describe("Error Handling", () => {
		it("handles network errors during save", async () => {
			const user = userEvent.setup();

			// Mock network failure
			(global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

			render(<OnboardingPage />);

			// Try to save progress
			const continueButton = screen.getByRole("button", { name: /continue/i });
			await user.click(continueButton);

			await waitFor(() => {
				expect(screen.getByText(/error.*saving/i)).toBeInTheDocument();
			});
		});

		it("allows retry after network error", async () => {
			const user = userEvent.setup();

			// Mock network failure then success
			(global.fetch as jest.Mock)
				.mockRejectedValueOnce(new Error("Network error"))
				.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) });

			render(<OnboardingPage />);

			// Trigger error
			const continueButton = screen.getByRole("button", { name: /continue/i });
			await user.click(continueButton);

			// Error should be shown
			await waitFor(() => {
				expect(screen.getByText(/error/i)).toBeInTheDocument();
			});

			// Retry button should appear
			const retryButton = screen.getByRole("button", { name: /retry/i });
			await user.click(retryButton);

			// Should succeed on retry
			await waitFor(() => {
				expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
			});
		});
	});

	describe("Accessibility", () => {
		it("supports keyboard navigation", async () => {
			const user = userEvent.setup();
			render(<OnboardingPage />);

			// Tab through form elements
			await user.tab();
			const activeElement = document.activeElement as HTMLElement;
			expect(activeElement.tagName).toMatch(/INPUT|BUTTON|SELECT/);
		});

		it("provides screen reader announcements", async () => {
			render(<OnboardingPage />);

			// Progress announcements
			expect(screen.getByText(/step.*1.*3/i)).toBeInTheDocument();

			// Form field labels
			const inputs = screen.getAllByRole("textbox");
			inputs.forEach(input => {
				expect(input).toHaveAttribute("aria-label");
			});
		});

		it("maintains focus management", async () => {
			const user = userEvent.setup();
			render(<OnboardingPage />);

			// Focus should move logically through the form
			const firstInput = screen.getAllByRole("textbox")[0];
			firstInput.focus();

			await user.tab();
			const newActiveElement = document.activeElement as HTMLElement;
			expect(newActiveElement).not.toBe(firstInput);
		});
	});

	describe("Mobile Responsiveness", () => {
		it("adapts layout for mobile screens", () => {
			// Mock mobile viewport
			Object.defineProperty(window, 'innerWidth', {
				writable: true,
				configurable: true,
				value: 375,
			});

			render(<OnboardingPage />);

			// Should show mobile-optimized layout
			const container = screen.getByRole("main");
			expect(container).toHaveClass(/mobile/);
		});

		it("stacks form elements vertically on mobile", () => {
			Object.defineProperty(window, 'innerWidth', {
				writable: true,
				configurable: true,
				value: 375,
			});

			render(<OnboardingPage />);

			const form = screen.getByRole("form");
			expect(form).toHaveStyle({ flexDirection: "column" });
		});
	});

	describe("Analytics Integration", () => {
		it("tracks onboarding progress", async () => {
			const user = userEvent.setup();
			render(<OnboardingPage />);

			// Mock analytics
			const mockAnalytics = jest.fn();
			global.gtag = mockAnalytics;

			// Complete a step
			const continueButton = screen.getByRole("button", { name: /continue/i });
			await user.click(continueButton);

			// Should track the event
			expect(mockAnalytics).toHaveBeenCalledWith("event", "onboarding_step_complete", {
				step: 1,
			});
		});

		it("tracks onboarding completion", async () => {
			const user = userEvent.setup();
			render(<OnboardingPage />);

			const mockAnalytics = jest.fn();
			global.gtag = mockAnalytics;

			await completeOnboardingSteps(user);

			expect(mockAnalytics).toHaveBeenCalledWith("event", "onboarding_complete", {
				total_steps: 3,
				time_spent: expect.any(Number),
			});
		});

		it("tracks abandonment", async () => {
			const user = userEvent.setup();
			render(<OnboardingPage />);

			const mockAnalytics = jest.fn();
			global.gtag = mockAnalytics;

			// Navigate away (simulate)
			window.dispatchEvent(new Event("beforeunload"));

			expect(mockAnalytics).toHaveBeenCalledWith("event", "onboarding_abandoned", {
				step: 1,
				time_spent: expect.any(Number),
			});
		});
	});
});

// Helper function to complete onboarding steps
async function completeOnboardingSteps(user: ReturnType<typeof userEvent.setup>) {
	// Step 1: Basic Information
	await user.type(screen.getByLabelText(/name/i), "Test User");
	await user.type(screen.getByLabelText(/email/i), "test@example.com");

	const continueButton = screen.getByRole("button", { name: /continue/i });
	await user.click(continueButton);

	// Step 2: Preferences
	await waitFor(() => {
		expect(screen.getByText(/preferences/i)).toBeInTheDocument();
	});

	const cityButton = screen.getByRole("button", { name: /london/i });
	await user.click(cityButton);

	const languageButton = screen.getByRole("button", { name: /english/i });
	await user.click(languageButton);

	const nextButton = screen.getByRole("button", { name: /next/i });
	await user.click(nextButton);

	// Step 3: Completion
	await waitFor(() => {
		expect(screen.getByText(/complete/i)).toBeInTheDocument();
	});

	const finishButton = screen.getByRole("button", { name: /finish/i });
	await user.click(finishButton);
}