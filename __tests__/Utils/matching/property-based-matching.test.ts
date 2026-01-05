/**
 * Property-Based Tests for Matching Algorithms
 *
 * Uses fast-check to test matching algorithms with generated edge cases.
 * Focuses on mathematical properties and edge conditions.
 */

import fc from "fast-check";
import { calculateMatchScore } from "@/Utils/matching/rule-based-matcher.service";
import type { Job, UserPreferences } from "@/Utils/matching/types";

// Mock data generators
const jobArbitrary = fc.record({
	job_hash: fc.string({ minLength: 1 }),
	title: fc.string({ minLength: 1 }),
	company: fc.string({ minLength: 1 }),
	location: fc.string({ minLength: 1 }),
	description: fc.string({ minLength: 10 }),
	experience_required: fc.constantFrom("entry-level", "junior", "mid", "senior", "executive"),
	work_environment: fc.constantFrom("remote", "hybrid", "on-site"),
	categories: fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 }),
	is_active: fc.boolean(),
	source: fc.string({ minLength: 1 }),
});

const userPreferencesArbitrary = fc.record({
	email: fc.email(),
	career_path: fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 3 }),
	target_cities: fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 }),
	professional_expertise: fc.string({ minLength: 1 }),
	work_environment: fc.constantFrom("remote", "hybrid", "on-site"),
	visa_status: fc.constantFrom("eu-citizen", "visa-needed", "no-visa"),
	entry_level_preference: fc.constantFrom("entry", "junior", "mid", "senior"),
	full_name: fc.string({ minLength: 1 }),
	start_date: fc.date().map(d => d.toISOString().split('T')[0]),
	languages_spoken: fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 3 }),
	company_types: fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 3 }),
	roles_selected: fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 3 }),
	subscription_tier: fc.constantFrom("free", "premium"),
});

describe("Matching Algorithm - Property-Based Tests", () => {
	describe("calculateMatchScore Properties", () => {
		it("should always return valid score ranges", () => {
			fc.assert(
				fc.property(jobArbitrary, userPreferencesArbitrary, (job, user) => {
					const result = calculateMatchScore(job, user);

					// All scores should be between 0-100
					expect(result.overall).toBeGreaterThanOrEqual(0);
					expect(result.overall).toBeLessThanOrEqual(100);

					expect(result.eligibility).toBeGreaterThanOrEqual(0);
					expect(result.eligibility).toBeLessThanOrEqual(100);

					expect(result.careerPath).toBeGreaterThanOrEqual(0);
					expect(result.careerPath).toBeLessThanOrEqual(100);

					expect(result.location).toBeGreaterThanOrEqual(0);
					expect(result.location).toBeLessThanOrEqual(100);

					expect(result.workEnvironment).toBeGreaterThanOrEqual(0);
					expect(result.workEnvironment).toBeLessThanOrEqual(100);

					expect(result.roleFit).toBeGreaterThanOrEqual(0);
					expect(result.roleFit).toBeLessThanOrEqual(100);

					expect(result.experienceLevel).toBeGreaterThanOrEqual(0);
					expect(result.experienceLevel).toBeLessThanOrEqual(100);

					expect(result.companyCulture).toBeGreaterThanOrEqual(0);
					expect(result.companyCulture).toBeLessThanOrEqual(100);

					expect(result.skills).toBeGreaterThanOrEqual(0);
					expect(result.skills).toBeLessThanOrEqual(100);

					expect(result.timing).toBeGreaterThanOrEqual(0);
					expect(result.timing).toBeLessThanOrEqual(100);
				})
			);
		});

		it("should be deterministic (same inputs produce same outputs)", () => {
			fc.assert(
				fc.property(jobArbitrary, userPreferencesArbitrary, (job, user) => {
					const result1 = calculateMatchScore(job, user);
					const result2 = calculateMatchScore(job, user);

					expect(result1).toEqual(result2);
				})
			);
		});

		it("should handle edge cases without crashing", () => {
			const edgeJobArbitrary = fc.record({
				job_hash: fc.constant("edge-case-job"),
				title: fc.constant(""), // Empty title
				company: fc.constant(""), // Empty company
				location: fc.constant(""), // Empty location
				description: fc.constant(""), // Empty description
				experience_required: fc.constant("entry-level"),
				work_environment: fc.constant("remote"),
				categories: fc.constant([]), // Empty categories
				is_active: fc.constant(true),
				source: fc.constant("test"),
			});

			const edgeUserArbitrary = fc.record({
				email: fc.constant("test@example.com"),
				career_path: fc.constant([]), // Empty career path
				target_cities: fc.constant([]), // Empty cities
				professional_expertise: fc.constant(""),
				work_environment: fc.constant("remote"),
				visa_status: fc.constant("eu-citizen"),
				entry_level_preference: fc.constant("entry"),
				full_name: fc.constant(""),
				start_date: fc.constant("2024-01-01"),
				languages_spoken: fc.constant([]),
				company_types: fc.constant([]),
				roles_selected: fc.constant([]),
				subscription_tier: fc.constant("free"),
			});

			fc.assert(
				fc.property(edgeJobArbitrary, edgeUserArbitrary, (job, user) => {
					expect(() => calculateMatchScore(job, user)).not.toThrow();
				})
			);
		});

		it("should handle null/undefined values gracefully", () => {
			const nullableJobArbitrary = fc.record({
				job_hash: fc.string(),
				title: fc.oneof(fc.constant(null), fc.constant(undefined), fc.string()),
				company: fc.oneof(fc.constant(null), fc.constant(undefined), fc.string()),
				location: fc.oneof(fc.constant(null), fc.constant(undefined), fc.string()),
				description: fc.oneof(fc.constant(null), fc.constant(undefined), fc.string()),
				experience_required: fc.constant("entry-level"),
				work_environment: fc.constant("remote"),
				categories: fc.oneof(fc.constant(null), fc.constant(undefined), fc.array(fc.string())),
				is_active: fc.boolean(),
				source: fc.string(),
			});

			const nullableUserArbitrary = fc.record({
				email: fc.email(),
				career_path: fc.oneof(fc.constant(null), fc.constant(undefined), fc.array(fc.string())),
				target_cities: fc.oneof(fc.constant(null), fc.constant(undefined), fc.array(fc.string())),
				professional_expertise: fc.oneof(fc.constant(null), fc.constant(undefined), fc.string()),
				work_environment: fc.constant("remote"),
				visa_status: fc.constant("eu-citizen"),
				entry_level_preference: fc.constant("entry"),
				full_name: fc.oneof(fc.constant(null), fc.constant(undefined), fc.string()),
				start_date: fc.constant("2024-01-01"),
				languages_spoken: fc.oneof(fc.constant(null), fc.constant(undefined), fc.array(fc.string())),
				company_types: fc.oneof(fc.constant(null), fc.constant(undefined), fc.array(fc.string())),
				roles_selected: fc.oneof(fc.constant(null), fc.constant(undefined), fc.array(fc.string())),
				subscription_tier: fc.constant("free"),
			});

			fc.assert(
				fc.property(nullableJobArbitrary, nullableUserArbitrary, (job, user) => {
					expect(() => calculateMatchScore(job, user)).not.toThrow();
				})
			);
		});

		it("should handle extreme string lengths", () => {
			const extremeStringArbitrary = fc.record({
				job_hash: fc.string({ minLength: 1000, maxLength: 10000 }), // Very long strings
				title: fc.string({ minLength: 1000, maxLength: 10000 }),
				company: fc.string({ minLength: 1000, maxLength: 10000 }),
				location: fc.string({ minLength: 1000, maxLength: 10000 }),
				description: fc.string({ minLength: 10000, maxLength: 50000 }),
				experience_required: fc.constant("entry-level"),
				work_environment: fc.constant("remote"),
				categories: fc.array(fc.string({ minLength: 100, maxLength: 1000 }), { minLength: 50, maxLength: 100 }),
				is_active: fc.boolean(),
				source: fc.string({ minLength: 1000, maxLength: 10000 }),
			});

			fc.assert(
				fc.property(extremeStringArbitrary, userPreferencesArbitrary, (job, user) => {
					expect(() => calculateMatchScore(job, user)).not.toThrow();
				})
			);
		});

		it("should handle semantic boost scores correctly", () => {
			fc.assert(
				fc.property(
					jobArbitrary,
					userPreferencesArbitrary,
					fc.float({ min: -10, max: 20 }), // Semantic scores can be negative or positive
					(job, user, semanticScore) => {
						const result = calculateMatchScore(job, user, semanticScore);

						// Overall score should still be 0-100 even with semantic boost
						expect(result.overall).toBeGreaterThanOrEqual(0);
						expect(result.overall).toBeLessThanOrEqual(100);

						// Semantic boost should be recorded
						expect(result.semanticBoost).toBe(semanticScore);
					}
				)
			);
		});

		it("should maintain score consistency across equivalent inputs", () => {
			fc.assert(
				fc.property(jobArbitrary, userPreferencesArbitrary, (job, user) => {
					const result1 = calculateMatchScore(job, user);
					const result2 = calculateMatchScore({ ...job }, { ...user }); // Clone objects

					// Deep equality should be maintained
					expect(result1).toEqual(result2);
				})
			);
		});
	});

	describe("Business Logic Invariants", () => {
		it("entry-level jobs should give high eligibility scores to entry-level users", () => {
			fc.assert(
				fc.property(
					fc.record({
						job_hash: fc.string(),
						title: fc.string(),
						company: fc.string(),
						location: fc.string(),
						description: fc.string(),
						experience_required: fc.constant("entry-level"),
						work_environment: fc.constant("remote"),
						categories: fc.array(fc.string()),
						is_active: fc.constant(true),
						source: fc.string(),
					}),
					fc.record({
						email: fc.email(),
						career_path: fc.array(fc.string()),
						target_cities: fc.array(fc.string()),
						professional_expertise: fc.string(),
						work_environment: fc.constant("remote"),
						visa_status: fc.constant("eu-citizen"),
						entry_level_preference: fc.constant("entry"),
						full_name: fc.string(),
						start_date: fc.constant("2024-01-01"),
						languages_spoken: fc.array(fc.string()),
						company_types: fc.array(fc.string()),
						roles_selected: fc.array(fc.string()),
						subscription_tier: fc.constant("free"),
					}),
					(job, user) => {
						const result = calculateMatchScore(job, user);

						// Business rule: entry-level jobs should give high eligibility to entry-level users
						expect(result.eligibility).toBeGreaterThanOrEqual(80);
					}
				)
			);
		});

		it("work environment matches should give high scores", () => {
			fc.assert(
				fc.property(
					fc.constantFrom("remote", "hybrid", "on-site"),
					(workEnv) =>
						fc.record({
							job_hash: fc.string(),
							title: fc.string(),
							company: fc.string(),
							location: fc.string(),
							description: fc.string(),
							experience_required: fc.constant("entry-level"),
							work_environment: fc.constant(workEnv),
							categories: fc.array(fc.string()),
							is_active: fc.constant(true),
							source: fc.string(),
						}).chain(job =>
							fc.record({
								email: fc.email(),
								career_path: fc.array(fc.string()),
								target_cities: fc.array(fc.string()),
								professional_expertise: fc.string(),
								work_environment: fc.constant(workEnv), // Same work environment
								visa_status: fc.constant("eu-citizen"),
								entry_level_preference: fc.constant("entry"),
								full_name: fc.string(),
								start_date: fc.constant("2024-01-01"),
								languages_spoken: fc.array(fc.string()),
								company_types: fc.array(fc.string()),
								roles_selected: fc.array(fc.string()),
								subscription_tier: fc.constant("free"),
							}).map(user => ({ job, user }))
						),
					({ job, user }) => {
						const result = calculateMatchScore(job, user);

						// Business rule: matching work environments should give high scores
						expect(result.workEnvironment).toBeGreaterThanOrEqual(90);
					}
				)
			);
		});

		it("should handle large arrays without performance issues", () => {
			const largeJobArbitrary = fc.record({
				job_hash: fc.string(),
				title: fc.string(),
				company: fc.string(),
				location: fc.string(),
				description: fc.string(),
				experience_required: fc.constant("entry-level"),
				work_environment: fc.constant("remote"),
				categories: fc.array(fc.string(), { minLength: 100, maxLength: 1000 }), // Large category arrays
				is_active: fc.constant(true),
				source: fc.string(),
			});

			const largeUserArbitrary = fc.record({
				email: fc.email(),
				career_path: fc.array(fc.string(), { minLength: 50, maxLength: 500 }),
				target_cities: fc.array(fc.string(), { minLength: 50, maxLength: 500 }),
				professional_expertise: fc.string(),
				work_environment: fc.constant("remote"),
				visa_status: fc.constant("eu-citizen"),
				entry_level_preference: fc.constant("entry"),
				full_name: fc.string(),
				start_date: fc.constant("2024-01-01"),
				languages_spoken: fc.array(fc.string(), { minLength: 20, maxLength: 200 }),
				company_types: fc.array(fc.string(), { minLength: 20, maxLength: 200 }),
				roles_selected: fc.array(fc.string(), { minLength: 20, maxLength: 200 }),
				subscription_tier: fc.constant("free"),
			});

			fc.assert(
				fc.property(largeJobArbitrary, largeUserArbitrary, (job, user) => {
					const startTime = Date.now();
					const result = calculateMatchScore(job, user);
					const duration = Date.now() - startTime;

					// Should complete in reasonable time even with large arrays
					expect(duration).toBeLessThan(1000); // Less than 1 second
					expect(result).toBeDefined();
				})
			);
		});
	});
});
