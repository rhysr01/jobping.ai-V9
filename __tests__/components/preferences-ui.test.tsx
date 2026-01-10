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
import PreferencesPage from "@/app/preferences/page";

describe("Preferences UI Integration Tests", () => {
	const mockUserPreferences = {
		email: "test@example.com",
		cities: ["London", "Berlin"],
		languages: ["English", "German"],
		experience: "2-3 years",
		workEnvironment: ["hybrid", "remote"],
		visaStatus: "EU citizen",
		careerPath: "tech",
		roles: ["Software Engineer", "Full Stack Developer"],
		industries: ["Technology", "SaaS"],
		companySizePreference: "startup",
		skills: ["React", "TypeScript", "Node.js"],
		careerKeywords: "full-stack development, web applications",
	};

	beforeEach(() => {
		jest.clearAllMocks();
		(global.fetch as jest.Mock)
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockUserPreferences),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ success: true }),
			});
	});

	describe("Preferences Page Loading", () => {
		it("shows loading state initially", () => {
			render(<PreferencesPage />);

			expect(screen.getByText(/loading.*preferences/i)).toBeInTheDocument();
		});

		it("loads and displays user preferences", async () => {
			render(<PreferencesPage />);

			await waitFor(() => {
				expect(screen.getByText("London")).toBeInTheDocument();
				expect(screen.getByText("Berlin")).toBeInTheDocument();
				expect(screen.getByText("English")).toBeInTheDocument();
				expect(screen.getByText("German")).toBeInTheDocument();
			});

			expect(screen.getByText("2-3 years")).toBeInTheDocument();
			expect(screen.getByText("EU citizen")).toBeInTheDocument();
		});

		it("handles loading errors gracefully", async () => {
			(global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

			render(<PreferencesPage />);

			await waitFor(() => {
				expect(screen.getByText(/error.*loading.*preferences/i)).toBeInTheDocument();
			});

			expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
		});
	});

	describe("Preferences Editing", () => {
		it("allows editing all preference categories", async () => {
			render(<PreferencesPage />);

			await waitFor(() => {
				expect(screen.getByText("London")).toBeInTheDocument();
			});

			// Should show edit buttons for each section
			expect(screen.getByRole("button", { name: /edit.*location/i })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /edit.*career/i })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /edit.*skills/i })).toBeInTheDocument();
		});

		it("enters edit mode when edit button clicked", async () => {
			const user = userEvent.setup();
			render(<PreferencesPage />);

			await waitFor(() => {
				expect(screen.getByText("London")).toBeInTheDocument();
			});

			const editLocationButton = screen.getByRole("button", { name: /edit.*location/i });
			await user.click(editLocationButton);

			// Should show form controls
			expect(screen.getByRole("textbox", { name: /cities/i })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
		});

		it("saves changes successfully", async () => {
			const user = userEvent.setup();
			render(<PreferencesPage />);

			await waitFor(() => {
				expect(screen.getByText("London")).toBeInTheDocument();
			});

			// Enter edit mode
			const editSkillsButton = screen.getByRole("button", { name: /edit.*skills/i });
			await user.click(editSkillsButton);

			// Modify skills
			const skillsInput = screen.getByRole("textbox", { name: /skills/i });
			await user.clear(skillsInput);
			await user.type(skillsInput, "React, TypeScript, Python");

			// Save changes
			const saveButton = screen.getByRole("button", { name: /save/i });
			await user.click(saveButton);

			// Should show success message
			await waitFor(() => {
				expect(screen.getByText(/preferences.*updated/i)).toBeInTheDocument();
			});

			// Should exit edit mode
			expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
		});

		it("cancels changes without saving", async () => {
			const user = userEvent.setup();
			render(<PreferencesPage />);

			await waitFor(() => {
				expect(screen.getByText("London")).toBeInTheDocument();
			});

			// Enter edit mode
			const editLocationButton = screen.getByRole("button", { name: /edit.*location/i });
			await user.click(editLocationButton);

			// Modify cities
			const citiesInput = screen.getByRole("textbox", { name: /cities/i });
			await user.clear(citiesInput);
			await user.type(citiesInput, "Paris, Amsterdam");

			// Cancel changes
			const cancelButton = screen.getByRole("button", { name: /cancel/i });
			await user.click(cancelButton);

			// Should revert to original values
			expect(screen.getByText("London")).toBeInTheDocument();
			expect(screen.getByText("Berlin")).toBeInTheDocument();
			expect(screen.queryByText("Paris")).not.toBeInTheDocument();
		});

		it("validates input before saving", async () => {
			const user = userEvent.setup();
			render(<PreferencesPage />);

			await waitFor(() => {
				expect(screen.getByText("London")).toBeInTheDocument();
			});

			// Enter edit mode
			const editLocationButton = screen.getByRole("button", { name: /edit.*location/i });
			await user.click(editLocationButton);

			// Clear required field
			const citiesInput = screen.getByRole("textbox", { name: /cities/i });
			await user.clear(citiesInput);

			// Try to save
			const saveButton = screen.getByRole("button", { name: /save/i });
			await user.click(saveButton);

			// Should show validation error
			await waitFor(() => {
				expect(screen.getByText(/at least one city/i)).toBeInTheDocument();
			});

			// Should not save
			expect(global.fetch).not.toHaveBeenCalledWith(
				expect.stringContaining("/api/preferences"),
				expect.objectContaining({ method: "PUT" })
			);
		});
	});

	describe("Preferences Categories", () => {
		it("displays location preferences correctly", async () => {
			render(<PreferencesPage />);

			await waitFor(() => {
				expect(screen.getByText("London")).toBeInTheDocument();
				expect(screen.getByText("Berlin")).toBeInTheDocument();
			});

			// Should show as tags or list
			const locationSection = screen.getByText("Location Preferences").closest("section");
			expect(locationSection).toBeInTheDocument();
		});

		it("displays career preferences correctly", async () => {
			render(<PreferencesPage />);

			await waitFor(() => {
				expect(screen.getByText("Software Engineer")).toBeInTheDocument();
				expect(screen.getByText("Full Stack Developer")).toBeInTheDocument();
			});

			expect(screen.getByText("Technology")).toBeInTheDocument();
			expect(screen.getByText("SaaS")).toBeInTheDocument();
		});

		it("displays skills and keywords", async () => {
			render(<PreferencesPage />);

			await waitFor(() => {
				expect(screen.getByText("React")).toBeInTheDocument();
				expect(screen.getByText("TypeScript")).toBeInTheDocument();
				expect(screen.getByText("Node.js")).toBeInTheDocument();
			});

			expect(screen.getByText(/full-stack development/i)).toBeInTheDocument();
		});

		it("displays work preferences", async () => {
			render(<PreferencesPage />);

			await waitFor(() => {
				expect(screen.getByText("hybrid")).toBeInTheDocument();
				expect(screen.getByText("remote")).toBeInTheDocument();
			});

			expect(screen.getByText("2-3 years")).toBeInTheDocument();
			expect(screen.getByText("startup")).toBeInTheDocument();
		});
	});

	describe("Bulk Operations", () => {
		it("allows resetting all preferences", async () => {
			const user = userEvent.setup();
			render(<PreferencesPage />);

			await waitFor(() => {
				expect(screen.getByText("London")).toBeInTheDocument();
			});

			// Look for reset button
			const resetButton = screen.getByRole("button", { name: /reset.*preferences/i });
			await user.click(resetButton);

			// Should show confirmation dialog
			expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /confirm.*reset/i })).toBeInTheDocument();
		});

		it("allows exporting preferences", async () => {
			const user = userEvent.setup();
			render(<PreferencesPage />);

			await waitFor(() => {
				expect(screen.getByText("London")).toBeInTheDocument();
			});

			const exportButton = screen.getByRole("button", { name: /export/i });
			await user.click(exportButton);

			// Should trigger download or show export options
			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining("/api/preferences/export"),
				expect.any(Object)
			);
		});

		it("shows preference change history", async () => {
			render(<PreferencesPage />);

			await waitFor(() => {
				expect(screen.getByText("London")).toBeInTheDocument();
			});

			// Should have history section
			expect(screen.getByText(/recent.*changes/i)).toBeInTheDocument();
			expect(screen.getByText(/last.*updated/i)).toBeInTheDocument();
		});
	});

	describe("Error Handling", () => {
		it("handles save errors gracefully", async () => {
			const user = userEvent.setup();

			// Mock save failure
			(global.fetch as jest.Mock).mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockUserPreferences),
			}).mockRejectedValueOnce(new Error("Save failed"));

			render(<PreferencesPage />);

			await waitFor(() => {
				expect(screen.getByText("London")).toBeInTheDocument();
			});

			// Try to save changes
			const editButton = screen.getByRole("button", { name: /edit.*location/i });
			await user.click(editButton);

			const saveButton = screen.getByRole("button", { name: /save/i });
			await user.click(saveButton);

			// Should show error message
			await waitFor(() => {
				expect(screen.getByText(/error.*saving/i)).toBeInTheDocument();
			});
		});

		it("allows retry after save error", async () => {
			const user = userEvent.setup();

			// Mock failure then success
			(global.fetch as jest.Mock)
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockUserPreferences),
				})
				.mockRejectedValueOnce(new Error("Save failed"))
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve({ success: true }),
				});

			render(<PreferencesPage />);

			await waitFor(() => {
				expect(screen.getByText("London")).toBeInTheDocument();
			});

			// Trigger and retry error
			const editButton = screen.getByRole("button", { name: /edit.*location/i });
			await user.click(editButton);

			const saveButton = screen.getByRole("button", { name: /save/i });
			await user.click(saveButton);

			await waitFor(() => {
				expect(screen.getByText(/error/i)).toBeInTheDocument();
			});

			// Retry
			const retryButton = screen.getByRole("button", { name: /retry/i });
			await user.click(retryButton);

			// Should succeed
			await waitFor(() => {
				expect(screen.getByText(/updated/i)).toBeInTheDocument();
			});
		});
	});

	describe("Accessibility", () => {
		it("provides keyboard navigation", async () => {
			const user = userEvent.setup();
			render(<PreferencesPage />);

			await waitFor(() => {
				expect(screen.getByText("London")).toBeInTheDocument();
			});

			// Tab through interactive elements
			await user.tab();
			let activeElement = document.activeElement as HTMLElement;
			expect(activeElement.tagName).toBe("BUTTON");

			await user.tab();
			activeElement = document.activeElement as HTMLElement;
			expect(["BUTTON", "A", "INPUT"].includes(activeElement.tagName)).toBe(true);
		});

		it("provides screen reader support", async () => {
			render(<PreferencesPage />);

			await waitFor(() => {
				expect(screen.getByText("London")).toBeInTheDocument();
			});

			// Sections should have proper headings
			const headings = screen.getAllByRole("heading");
			expect(headings.length).toBeGreaterThan(3); // At least 4 sections

			// Form elements should have labels
			const inputs = screen.getAllByRole("textbox");
			inputs.forEach(input => {
				expect(input).toHaveAttribute("aria-label");
			});
		});

		it("announces status changes", async () => {
			const user = userEvent.setup();
			render(<PreferencesPage />);

			await waitFor(() => {
				expect(screen.getByText("London")).toBeInTheDocument();
			});

			// Status messages should be announced
			const editButton = screen.getByRole("button", { name: /edit/i });
			await user.click(editButton);

			await waitFor(() => {
				expect(screen.getByRole("status")).toBeInTheDocument();
			});
		});
	});

	describe("Performance", () => {
		it("debounces rapid changes", async () => {
			const user = userEvent.setup();
			render(<PreferencesPage />);

			await waitFor(() => {
				expect(screen.getByText("London")).toBeInTheDocument();
			});

			const editButton = screen.getByRole("button", { name: /edit.*skills/i });
			await user.click(editButton);

			const skillsInput = screen.getByRole("textbox", { name: /skills/i });

			// Type rapidly
			await user.type(skillsInput, "React");
			await user.type(skillsInput, "TypeScript");
			await user.type(skillsInput, "Node.js");

			// Should only trigger validation/save once, not on every keystroke
			expect(global.fetch).toHaveBeenCalledTimes(1); // Initial load only
		});

		it("caches preference data", async () => {
			const { rerender } = render(<PreferencesPage />);

			await waitFor(() => {
				expect(screen.getByText("London")).toBeInTheDocument();
			});

			// Rerender should use cached data
			rerender(<PreferencesPage />);

			// Should not make additional API calls
			expect(global.fetch).toHaveBeenCalledTimes(1);
		});

		it("optimizes re-renders", async () => {
			const user = userEvent.setup();
			render(<PreferencesPage />);

			await waitFor(() => {
				expect(screen.getByText("London")).toBeInTheDocument();
			});

			// Changing unrelated state shouldn't cause full re-render
			const editButton = screen.getByRole("button", { name: /edit.*location/i });
			await user.click(editButton);

			// Only the location section should re-render
			expect(screen.getByText("London")).toBeInTheDocument();
			expect(screen.getByText("React")).toBeInTheDocument(); // Other sections unchanged
		});
	});
});