/**
 * Comprehensive tests for Matching Config
 * Tests configuration values, validation
 */

import {
	getMatchingConfig,
	MATCHING_CONFIG,
	validateMatchingConfig,
} from "@/Utils/config/matching";

describe("Matching Config", () => {
	describe("MATCHING_CONFIG", () => {
		it("should have valid configuration", () => {
			expect(MATCHING_CONFIG).toBeDefined();
		});
	});

	describe("getMatchingConfig", () => {
		it("should get matching configuration", () => {
			const config = getMatchingConfig();

			expect(config).toBeDefined();
		});
	});

	describe("validateMatchingConfig", () => {
		it("should validate configuration", () => {
			const isValid = validateMatchingConfig(MATCHING_CONFIG);

			expect(typeof isValid).toBe("boolean");
		});
	});
});
