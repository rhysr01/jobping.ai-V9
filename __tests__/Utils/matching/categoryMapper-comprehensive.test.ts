/**
 * Comprehensive tests for Category Mapper
 * Tests form-to-database mapping, category matching, priority scoring
 */

import {
	FORM_TO_DATABASE_MAPPING,
	getCategoryPriorityScore,
	getDatabaseCategoriesForForm,
	getStudentSatisfactionScore,
	jobMatchesUserCategories,
	mapDatabaseToForm,
	mapFormLabelToDatabase,
	mapFormToDatabase,
	WORK_TYPE_CATEGORIES,
} from "@/Utils/matching/categoryMapper";

describe("Category Mapper", () => {
	describe("mapFormToDatabase", () => {
		it("should map form values to database categories", () => {
			expect(mapFormToDatabase("strategy")).toBe("strategy-business-design");
			expect(mapFormToDatabase("finance")).toBe("finance-investment");
			expect(mapFormToDatabase("tech")).toBe("tech-transformation");
		});

		it("should return original value if not in mapping", () => {
			expect(mapFormToDatabase("unknown")).toBe("unknown");
		});
	});

	describe("mapFormLabelToDatabase", () => {
		it("should map form labels to database categories", () => {
			expect(mapFormLabelToDatabase("Strategy & Business Design")).toBe(
				"strategy-business-design",
			);
			expect(mapFormLabelToDatabase("Finance & Investment")).toBe(
				"finance-investment",
			);
		});

		it("should handle variations", () => {
			expect(mapFormLabelToDatabase("Tech & Engineering")).toBe(
				"tech-transformation",
			);
			expect(mapFormLabelToDatabase("Tech & Transformation")).toBe(
				"tech-transformation",
			);
		});
	});

	describe("mapDatabaseToForm", () => {
		it("should map database categories to form values", () => {
			expect(mapDatabaseToForm("strategy-business-design")).toBe("strategy");
			expect(mapDatabaseToForm("finance-investment")).toBe("finance");
		});

		it("should return original value if not in mapping", () => {
			expect(mapDatabaseToForm("unknown-category")).toBe("unknown-category");
		});
	});

	describe("getDatabaseCategoriesForForm", () => {
		it("should return single category for form value", () => {
			const categories = getDatabaseCategoriesForForm("strategy");
			expect(categories).toEqual(["strategy-business-design"]);
		});

		it("should return all categories for unsure", () => {
			const categories = getDatabaseCategoriesForForm("unsure");
			expect(categories.length).toBeGreaterThan(5);
			expect(categories).toContain("strategy-business-design");
		});

		it("should handle all-categories special case", () => {
			const categories = getDatabaseCategoriesForForm("unsure");
			expect(categories).toEqual(WORK_TYPE_CATEGORIES);
		});
	});

	describe("jobMatchesUserCategories", () => {
		it("should match job categories to user preferences", () => {
			const jobCategories = ["strategy-business-design", "data-analytics"];
			const userFormValues = ["strategy"];

			expect(jobMatchesUserCategories(jobCategories, userFormValues)).toBe(
				true,
			);
		});

		it("should return true if no user preferences", () => {
			const jobCategories = ["strategy-business-design"];
			expect(jobMatchesUserCategories(jobCategories, [])).toBe(true);
		});

		it("should return false if no job categories", () => {
			expect(jobMatchesUserCategories([], ["strategy"])).toBe(false);
		});

		it("should handle multiple user preferences", () => {
			const jobCategories = ["finance-investment"];
			const userFormValues = ["strategy", "finance"];

			expect(jobMatchesUserCategories(jobCategories, userFormValues)).toBe(
				true,
			);
		});
	});

	describe("getCategoryPriorityScore", () => {
		it("should calculate priority score based on matches", () => {
			const jobCategories = ["strategy-business-design", "data-analytics"];
			const userFormValues = ["strategy", "data"];

			const score = getCategoryPriorityScore(jobCategories, userFormValues);
			expect(score).toBeGreaterThan(0);
		});

		it("should return 0 for no matches", () => {
			const jobCategories = ["finance-investment"];
			const userFormValues = ["strategy"];

			const score = getCategoryPriorityScore(jobCategories, userFormValues);
			expect(score).toBe(0);
		});

		it("should return 1 for no user preferences", () => {
			const jobCategories = ["strategy-business-design"];
			const score = getCategoryPriorityScore(jobCategories, []);
			expect(score).toBe(1);
		});
	});

	describe("getStudentSatisfactionScore", () => {
		it("should calculate satisfaction score", () => {
			const jobCategories = ["strategy-business-design"];
			const userFormValues = ["strategy"];

			const score = getStudentSatisfactionScore(jobCategories, userFormValues);
			expect(score).toBeGreaterThanOrEqual(0);
			expect(score).toBeLessThanOrEqual(100);
		});

		it("should give high score for exact matches", () => {
			const jobCategories = ["strategy-business-design"];
			const userFormValues = ["strategy"];

			const score = getStudentSatisfactionScore(jobCategories, userFormValues);
			expect(score).toBeGreaterThan(50);
		});

		it("should return neutral score for no preferences", () => {
			const jobCategories = ["strategy-business-design"];
			const score = getStudentSatisfactionScore(jobCategories, []);
			expect(score).toBe(1);
		});
	});

	describe("Constants", () => {
		it("should have valid form to database mapping", () => {
			expect(Object.keys(FORM_TO_DATABASE_MAPPING).length).toBeGreaterThan(0);
			expect(FORM_TO_DATABASE_MAPPING["strategy"]).toBe(
				"strategy-business-design",
			);
		});

		it("should have work type categories", () => {
			expect(WORK_TYPE_CATEGORIES.length).toBeGreaterThan(0);
			expect(WORK_TYPE_CATEGORIES).toContain("strategy-business-design");
		});
	});
});
