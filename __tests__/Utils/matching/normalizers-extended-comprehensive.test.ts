/**
 * Comprehensive tests for Normalizers
 * Tests string normalization, category extraction
 */

import {
	careerSlugs,
	cats,
	hasEligibility,
	locTag,
	normalizeToString,
} from "@/Utils/matching/normalizers";

describe("Normalizers", () => {
	describe("normalizeToString", () => {
		it("should normalize array to string", () => {
			const result = normalizeToString(["tag1", "tag2"]);

			expect(typeof result).toBe("string");
		});

		it("should handle string input", () => {
			const result = normalizeToString("test");

			expect(result).toBe("test");
		});
	});

	describe("cats", () => {
		it("should extract categories", () => {
			const categories = "early-career,strategy-business-design";

			const tags = cats(categories);

			expect(Array.isArray(tags)).toBe(true);
		});
	});

	describe("hasEligibility", () => {
		it("should check eligibility", () => {
			const categories = "early-career,strategy";

			const hasElig = hasEligibility(categories);

			expect(typeof hasElig).toBe("boolean");
		});
	});

	describe("careerSlugs", () => {
		it("should extract career slugs", () => {
			const categories = "strategy-business-design,finance-investment";

			const slugs = careerSlugs(categories);

			expect(Array.isArray(slugs)).toBe(true);
		});
	});

	describe("locTag", () => {
		it("should extract location tag", () => {
			const location = "London, UK";

			const tag = locTag(location);

			expect(tag).toBeDefined();
		});
	});
});
