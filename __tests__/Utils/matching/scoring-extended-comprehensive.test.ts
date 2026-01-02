/**
 * Comprehensive tests for Scoring Service
 * Tests score calculation, normalization
 */

import {
	calculateJobScore,
	getScoreBreakdown,
	normalizeScore,
} from "@/Utils/matching/scoring.service";

describe("Scoring Service", () => {
	describe("calculateJobScore", () => {
		it("should calculate job score", () => {
			const job = {
				id: "job1",
				title: "Engineer",
				location: "London",
			};
			const userPrefs = {
				email: "user@example.com",
				target_cities: ["London"],
			};

			const score = calculateJobScore(job as any, userPrefs);

			expect(score).toBeGreaterThanOrEqual(0);
			expect(score).toBeLessThanOrEqual(100);
		});
	});

	describe("normalizeScore", () => {
		it("should normalize score to 0-100", () => {
			const normalized = normalizeScore(0.85);

			expect(normalized).toBeGreaterThanOrEqual(0);
			expect(normalized).toBeLessThanOrEqual(100);
		});

		it("should handle edge cases", () => {
			expect(normalizeScore(0)).toBe(0);
			expect(normalizeScore(1)).toBe(100);
		});
	});

	describe("getScoreBreakdown", () => {
		it("should get score breakdown", () => {
			const job = {
				id: "job1",
				title: "Engineer",
			};
			const userPrefs = {
				email: "user@example.com",
			};

			const breakdown = getScoreBreakdown(job as any, userPrefs);

			expect(breakdown).toBeDefined();
			expect(typeof breakdown).toBe("object");
		});
	});
});
