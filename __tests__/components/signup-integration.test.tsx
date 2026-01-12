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

// Mock fetch for API calls
global.fetch = jest.fn();

// Import components after mocks
import Step1Basics from "../../components/signup/Step1Basics";
import Step2Preferences from "../../components/signup/Step2Preferences";
import Step3CareerPath from "../../components/signup/Step3CareerPath";
import Step4MatchingPreferences from "../../components/signup/Step4MatchingPreferences";
import GDPRConsentSection from "../../components/signup/GDPRConsentSection";
import CareerPathSection from "../../components/signup/CareerPathSection";
import CitySelectionSection from "../../components/signup/CitySelectionSection";
import VisaSponsorshipSection from "../../components/signup/VisaSponsorshipSection";

describe("Signup Component Integration Tests", () => {
	const mockOnNext = jest.fn();
	const mockOnBack = jest.fn();
	const mockOnComplete = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		(global.fetch as jest.Mock).mockClear();
	});

	describe("Step1Basics - Basic Information", () => {
		const defaultProps = {
			onNext: mockOnNext,
			isLoading: false,
			initialData: {},
		};

		it("renders all required form fields", () => {
			render(<Step1Basics {...defaultProps} />);

			expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /continue/i })).toBeInTheDocument();
		});

		it("validates required fields", async () => {
			render(<Step1Basics {...defaultProps} />);

			const continueButton = screen.getByRole("button", { name: /continue/i });
			fireEvent.click(continueButton);

			await waitFor(() => {
				expect(screen.getByText(/required/i)).toBeInTheDocument();
			});

			expect(mockOnNext).not.toHaveBeenCalled();
		});

		it("validates email format", async () => {
			const user = userEvent.setup();
			render(<Step1Basics {...defaultProps} />);

			const emailInput = screen.getByLabelText(/email/i);
			await user.type(emailInput, "invalid-email");

			const continueButton = screen.getByRole("button", { name: /continue/i });
			fireEvent.click(continueButton);

			await waitFor(() => {
				expect(screen.getByText(/valid email/i)).toBeInTheDocument();
			});
		});

		it("submits valid data and calls onNext", async () => {
			const user = userEvent.setup();
			render(<Step1Basics {...defaultProps} />);

			const nameInput = screen.getByLabelText(/full name/i);
			const emailInput = screen.getByLabelText(/email/i);

			await user.type(nameInput, "John Doe");
			await user.type(emailInput, "john@example.com");

			const continueButton = screen.getByRole("button", { name: /continue/i });
			fireEvent.click(continueButton);

			await waitFor(() => {
				expect(mockOnNext).toHaveBeenCalledWith({
					fullName: "John Doe",
					email: "john@example.com",
				});
			});
		});

		it("shows loading state", () => {
			render(<Step1Basics {...defaultProps} isLoading={true} />);

			const continueButton = screen.getByRole("button", { name: /continue/i });
			expect(continueButton).toBeDisabled();
			expect(screen.getByText(/loading/i)).toBeInTheDocument();
		});
	});

	describe("CareerPathSection - Career Selection", () => {
		const defaultProps = {
			selectedCareerPath: "",
			onCareerPathChange: jest.fn(),
		};

		it("renders all career path options", () => {
			render(<CareerPathSection {...defaultProps} />);

			expect(screen.getByText("Tech & Transformation")).toBeInTheDocument();
			expect(screen.getByText("Finance & Investment")).toBeInTheDocument();
			expect(screen.getByText("Strategy & Business Design")).toBeInTheDocument();
			expect(screen.getByText("Marketing & Growth")).toBeInTheDocument();
		});

		it("calls onCareerPathChange when option selected", async () => {
			const user = userEvent.setup();
			const mockOnChange = jest.fn();
			render(<CareerPathSection {...defaultProps} onCareerPathChange={mockOnChange} />);

			const techButton = screen.getByRole("button", { name: /tech.*transformation/i });
			await user.click(techButton);

			expect(mockOnChange).toHaveBeenCalledWith("tech");
		});

		it("shows selected state", () => {
			render(<CareerPathSection {...defaultProps} selectedCareerPath="tech" />);

			const techButton = screen.getByRole("button", { name: /tech.*transformation/i });
			expect(techButton).toHaveAttribute("data-selected", "true");
		});
	});

	describe("CitySelectionSection - Location Selection", () => {
		const defaultProps = {
			selectedCities: [],
			onCitiesChange: jest.fn(),
			maxCities: 3,
		};

		it("renders popular cities", () => {
			render(<CitySelectionSection {...defaultProps} />);

			expect(screen.getByText("London")).toBeInTheDocument();
			expect(screen.getByText("Berlin")).toBeInTheDocument();
			expect(screen.getByText("Paris")).toBeInTheDocument();
		});

		it("allows multiple city selection up to max", async () => {
			const user = userEvent.setup();
			const mockOnChange = jest.fn();
			render(<CitySelectionSection {...defaultProps} onCitiesChange={mockOnChange} />);

			const londonButton = screen.getByRole("button", { name: /london/i });
			const berlinButton = screen.getByRole("button", { name: /berlin/i });
			const parisButton = screen.getByRole("button", { name: /paris/i });

			await user.click(londonButton);
			expect(mockOnChange).toHaveBeenCalledWith(["London"]);

			await user.click(berlinButton);
			expect(mockOnChange).toHaveBeenCalledWith(["London", "Berlin"]);

			await user.click(parisButton);
			expect(mockOnChange).toHaveBeenCalledWith(["London", "Berlin", "Paris"]);

			// Should be disabled after max reached
			expect(parisButton).toBeDisabled();
		});

		it("allows deselection of cities", async () => {
			const user = userEvent.setup();
			const mockOnChange = jest.fn();
			render(<CitySelectionSection {...defaultProps} selectedCities={["London"]} onCitiesChange={mockOnChange} />);

			const londonButton = screen.getByRole("button", { name: /london/i });
			await user.click(londonButton);

			expect(mockOnChange).toHaveBeenCalledWith([]);
		});
	});

	describe("GDPRConsentSection - Privacy Compliance", () => {
		const defaultProps = {
			consentGiven: false,
			onConsentChange: jest.fn(),
		};

		it("renders GDPR consent text", () => {
			render(<GDPRConsentSection {...defaultProps} />);

			expect(screen.getByText(/privacy policy/i)).toBeInTheDocument();
			expect(screen.getByText(/terms of service/i)).toBeInTheDocument();
			expect(screen.getByRole("checkbox")).toBeInTheDocument();
		});

		it("requires consent before proceeding", async () => {
			const user = userEvent.setup();
			const mockOnConsent = jest.fn();
			render(<GDPRConsentSection {...defaultProps} onConsentChange={mockOnConsent} />);

			const checkbox = screen.getByRole("checkbox");
			await user.click(checkbox);

			expect(mockOnConsent).toHaveBeenCalledWith(true);
		});

		it("shows validation error when consent not given", () => {
			render(<GDPRConsentSection {...defaultProps} />);

			expect(screen.getByText(/consent required/i)).toBeInTheDocument();
		});
	});

	describe("VisaSponsorshipSection - Immigration Support", () => {
		const defaultProps = {
			selectedVisaStatus: "",
			onVisaStatusChange: jest.fn(),
		};

		it("renders visa status options", () => {
			render(<VisaSponsorshipSection {...defaultProps} />);

			expect(screen.getByText("EU Citizen")).toBeInTheDocument();
			expect(screen.getByText("Visa Required")).toBeInTheDocument();
			expect(screen.getByText("Work Permit")).toBeInTheDocument();
		});

		it("provides helpful information for each option", () => {
			render(<VisaSponsorshipSection {...defaultProps} />);

			expect(screen.getByText(/freedom of movement/i)).toBeInTheDocument();
			expect(screen.getByText(/visa sponsorship/i)).toBeInTheDocument();
		});

		it("calls onVisaStatusChange when option selected", async () => {
			const user = userEvent.setup();
			const mockOnChange = jest.fn();
			render(<VisaSponsorshipSection {...defaultProps} onVisaStatusChange={mockOnChange} />);

			const euCitizenButton = screen.getByRole("button", { name: /eu citizen/i });
			await user.click(euCitizenButton);

			expect(mockOnChange).toHaveBeenCalledWith("eu-citizen");
		});
	});

	describe("Complete Signup Flow Integration", () => {
		it("maintains data across steps", async () => {
			const user = userEvent.setup();

			// Step 1: Basic Info
			const { rerender } = render(
				<Step1Basics
					onNext={mockOnNext}
					isLoading={false}
					initialData={{}}
				/>
			);

			await user.type(screen.getByLabelText(/full name/i), "Jane Smith");
			await user.type(screen.getByLabelText(/email/i), "jane@example.com");
			fireEvent.click(screen.getByRole("button", { name: /continue/i }));

			expect(mockOnNext).toHaveBeenCalledWith({
				fullName: "Jane Smith",
				email: "jane@example.com",
			});

			// Step 2: Career Path
			rerender(
				<CareerPathSection
					selectedCareerPath=""
					onCareerPathChange={(path) => {
						// Step 3: Preferences would use this data
						expect(["tech", "finance", "strategy", "marketing"]).toContain(path);
					}}
				/>
			);

			const techButton = screen.getByRole("button", { name: /tech.*transformation/i });
			await user.click(techButton);
		});

		it("handles form validation across steps", async () => {
			const user = userEvent.setup();

			// Test that invalid data prevents progression
			render(
				<Step1Basics
					onNext={mockOnNext}
					isLoading={false}
					initialData={{}}
				/>
			);

			// Try to continue without filling required fields
			fireEvent.click(screen.getByRole("button", { name: /continue/i }));

			await waitFor(() => {
				expect(screen.getAllByText(/required/i)).toHaveLength(2); // Name and email
			});

			expect(mockOnNext).not.toHaveBeenCalled();
		});

		it("provides accessible form navigation", async () => {
			const user = userEvent.setup();
			render(<Step1Basics onNext={mockOnNext} isLoading={false} initialData={{}} />);

			// Test keyboard navigation
			const nameInput = screen.getByLabelText(/full name/i);
			const emailInput = screen.getByLabelText(/email/i);
			const continueButton = screen.getByRole("button", { name: /continue/i });

			nameInput.focus();
			expect(document.activeElement).toBe(nameInput);

			await user.tab();
			expect(document.activeElement).toBe(emailInput);

			await user.tab();
			expect(document.activeElement).toBe(continueButton);
		});

		it("handles network errors gracefully", async () => {
			const user = userEvent.setup();

			// Mock network failure
			(global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

			render(<Step1Basics onNext={mockOnNext} isLoading={false} initialData={{}} />);

			await user.type(screen.getByLabelText(/full name/i), "Test User");
			await user.type(screen.getByLabelText(/email/i), "test@example.com");

			fireEvent.click(screen.getByRole("button", { name: /continue/i }));

			await waitFor(() => {
				expect(screen.getByText(/network error/i)).toBeInTheDocument();
			});

			expect(mockOnNext).not.toHaveBeenCalled();
		});

		it("maintains form state during loading", async () => {
			render(<Step1Basics onNext={mockOnNext} isLoading={true} initialData={{}} />);

			const nameInput = screen.getByLabelText(/full name/i);
			const emailInput = screen.getByLabelText(/email/i);

			expect(nameInput).toBeDisabled();
			expect(emailInput).toBeDisabled();
		});
	});

	describe("Accessibility Compliance", () => {
		it("provides proper ARIA labels", () => {
			render(<Step1Basics onNext={mockOnNext} isLoading={false} initialData={{}} />);

			const nameInput = screen.getByLabelText(/full name/i);
			const emailInput = screen.getByLabelText(/email/i);

			expect(nameInput).toHaveAttribute("aria-required", "true");
			expect(emailInput).toHaveAttribute("aria-required", "true");
		});

		it("announces validation errors", async () => {
			render(<Step1Basics onNext={mockOnNext} isLoading={false} initialData={{}} />);

			fireEvent.click(screen.getByRole("button", { name: /continue/i }));

			await waitFor(() => {
				const errors = screen.getAllByRole("alert");
				expect(errors.length).toBeGreaterThan(0);
			});
		});

		it("supports screen reader navigation", () => {
			render(<CareerPathSection selectedCareerPath="" onCareerPathChange={jest.fn()} />);

			const buttons = screen.getAllByRole("button");
			buttons.forEach(button => {
				expect(button).toHaveAttribute("aria-pressed");
			});
		});
	});
});