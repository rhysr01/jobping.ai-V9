/**
 * Property-Based Tests for Matching Algorithms
 * Uses fast-check to test business logic with generated edge cases
 */

import { calculateMatchScore } from "@/utils/matching/rule-based-matcher.service";
import fc from "fast-check";

// Simple inline mock builders
const buildMockJob = (overrides: any = {}) => ({
	job_hash: "test-job",
	title: "Software Engineer",
	company: "Test Company",
	location: "London",
	categories: ["early-career", "tech"],
	work_environment: "remote",
	is_active: true,
	...overrides,
});

const buildMockUser = (overrides: any = {}) => ({
	email: "test@example.com",
	target_cities: ["London"],
	career_path: ["tech"],
	work_environment: "remote",
	...overrides,
});

describe("Matching Algorithm - Property-Based Tests", () => {
	// Use the proven mock builders instead of arbitrary data
	describe("calculateMatchScore with mock data", () => {
		it("should handle various job and user combinations", () => {
			fc.assert(
				fc.property(
					fc.constantFrom("tech", "finance", "marketing", "operations"), // Limited career paths
					fc.constantFrom("remote", "hybrid", "on-site"), // Limited work environments
					fc.array(fc.constantFrom("early-career", "experienced", "tech", "finance")), // Limited categories
					(careerPath, workEnv, categories) => {
						const job = buildMockJob({
							categories,
							work_environment: workEnv
						});
						const user = buildMockUser({
							career_path: [careerPath],
							work_environment: workEnv
						});

						const result = calculateMatchScore(job, user);

						// Should return a valid MatchScore object
						expect(result).toBeDefined();
						expect(typeof result).toBe("object");

						// Should have all required MatchScore properties
						expect(result).toHaveProperty("overall");
						expect(result).toHaveProperty("eligibility");
						expect(result).toHaveProperty("careerPath");
						expect(result).toHaveProperty("location");
						expect(result).toHaveProperty("workEnvironment");

						// All scores should be valid numbers
						expect(typeof result.overall).toBe("number");
						expect(result.overall).toBeGreaterThanOrEqual(0);
						expect(result.overall).toBeLessThanOrEqual(100);

						expect(typeof result.eligibility).toBe("number");
						expect(result.eligibility).toBeGreaterThanOrEqual(0);
						expect(result.eligibility).toBeLessThanOrEqual(100);
					}
				)
			);
		});

		it("should be deterministic for same inputs", () => {
			fc.assert(
				fc.property(
					fc.constantFrom("tech", "finance", "marketing"), // Limited set
					fc.constantFrom("remote", "hybrid", "on-site"),
					(careerPath, workEnv) => {
						const job = buildMockJob({
							categories: ["early-career", "tech"],
							work_environment: workEnv
						});
						const user = buildMockUser({
							career_path: [careerPath],
							work_environment: workEnv
						});

						const result1 = calculateMatchScore(job, user);
						const result2 = calculateMatchScore(job, user);

						// Results should be consistent
						expect(result1.overall).toBe(result2.overall);
						expect(result1.eligibility).toBe(result2.eligibility);
					}
				)
			);
		});
	});

	describe("Mock Data Builders", () => {
		it("should generate valid mock data", () => {
			fc.assert(
				fc.property(
					fc.string({ minLength: 1, maxLength: 50 }),
					fc.string({ minLength: 1, maxLength: 50 }),
					fc.array(fc.string({ minLength: 1, maxLength: 20 })),
					(title, company, categories) => {
						const job = buildMockJob({ title, company, categories });

						expect(job).toBeDefined();
						expect(job.title).toBe(title);
						expect(job.company).toBe(company);
						expect(job.categories).toEqual(categories);
						expect(job.job_hash).toBeDefined();
					}
				)
			);
		});
	});
});
