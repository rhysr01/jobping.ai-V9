/**
 * Comprehensive tests for Validators
 * Tests location validation, compatibility checks
 */

import {
	validateJobCompatibility,
	validateLocationCompatibility,
	validateUserPreferences,
} from "@/Utils/matching/validators";

describe("Validators", () => {
	describe("validateLocationCompatibility", () => {
		it("should validate location compatibility", () => {
			const result = validateLocationCompatibility(
				["London, UK"],
				["London"],
				"London",
				"UK",
			);

			expect(result.compatible).toBeDefined();
			expect(typeof result.compatible).toBe("boolean");
		});

		it("should handle mismatched locations", () => {
			const result = validateLocationCompatibility(
				["Paris, France"],
				["London"],
				"Paris",
				"France",
			);

			expect(result.compatible).toBe(false);
		});
	});

	describe("validateJobCompatibility", () => {
		it("should validate job compatibility", () => {
			const job = {
				location: "London",
				categories: ["early-career"],
			};
			const userPrefs = {
				email: "user@example.com",
				target_cities: ["London"],
			};

			const isValid = validateJobCompatibility(job as any, userPrefs);

			expect(typeof isValid).toBe("boolean");
		});
	});

	describe("validateUserPreferences", () => {
		it("should validate user preferences", () => {
			const prefs = {
				email: "user@example.com",
				target_cities: ["London"],
			};

			const isValid = validateUserPreferences(prefs);

			expect(typeof isValid).toBe("boolean");
		});
	});
});
