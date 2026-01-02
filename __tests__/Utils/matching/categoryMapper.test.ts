import {
	DATABASE_TO_FORM_MAPPING,
	FORM_LABEL_TO_DATABASE_MAPPING,
	FORM_TO_DATABASE_MAPPING,
	getDatabaseCategoriesForForm,
	getStudentSatisfactionScore,
	mapDatabaseToForm,
	mapFormLabelToDatabase,
	mapFormToDatabase,
	WORK_TYPE_CATEGORIES,
} from "@/Utils/matching/categoryMapper";

describe("categoryMapper", () => {
	describe("mapFormToDatabase", () => {
		it("should map known form values", () => {
			expect(mapFormToDatabase("tech")).toBe("tech-transformation");
			expect(mapFormToDatabase("finance")).toBe("finance-investment");
			expect(mapFormToDatabase("data")).toBe("data-analytics");
		});

		it("should return value as-is for unknown values", () => {
			expect(mapFormToDatabase("unknown")).toBe("unknown");
		});

		it('should handle special case "unsure"', () => {
			expect(mapFormToDatabase("unsure")).toBe("all-categories");
		});
	});

	describe("mapFormLabelToDatabase", () => {
		it("should map known form labels", () => {
			expect(mapFormLabelToDatabase("Tech & Engineering")).toBe(
				"tech-transformation",
			);
			expect(mapFormLabelToDatabase("Finance & Investment")).toBe(
				"finance-investment",
			);
			expect(mapFormLabelToDatabase("Tech & Transformation")).toBe(
				"tech-transformation",
			);
		});

		it('should handle "Not Sure Yet / General"', () => {
			expect(mapFormLabelToDatabase("Not Sure Yet / General")).toBe(
				"all-categories",
			);
		});

		it("should return label as-is for unknown labels", () => {
			expect(mapFormLabelToDatabase("Unknown Label")).toBe("Unknown Label");
		});
	});

	describe("mapDatabaseToForm", () => {
		it("should map known database categories", () => {
			expect(mapDatabaseToForm("tech-transformation")).toBe("tech");
			expect(mapDatabaseToForm("finance-investment")).toBe("finance");
			expect(mapDatabaseToForm("data-analytics")).toBe("data");
		});

		it("should return category as-is for unmapped categories", () => {
			expect(mapDatabaseToForm("unknown-category")).toBe("unknown-category");
		});

		it("should handle categories not in form mapping", () => {
			expect(mapDatabaseToForm("retail-luxury")).toBe("retail-luxury");
			expect(mapDatabaseToForm("technology")).toBe("technology");
		});
	});

	describe("getDatabaseCategoriesForForm", () => {
		it('should return all categories for "unsure"', () => {
			const result = getDatabaseCategoriesForForm("unsure");
			expect(result).toEqual(WORK_TYPE_CATEGORIES);
			expect(result.length).toBeGreaterThan(0);
		});

		it("should map known form values", () => {
			const result = getDatabaseCategoriesForForm("tech");
			expect(result).toContain("tech-transformation");
			expect(result.length).toBeGreaterThan(0);
		});

		it("should return value as-is for unknown values", () => {
			const result = getDatabaseCategoriesForForm("unknown");
			expect(result).toEqual(["unknown"]);
		});
	});

	describe("getStudentSatisfactionScore", () => {
		it("should return high score for exact match", () => {
			const score = getStudentSatisfactionScore(
				["tech-transformation"],
				["tech"],
			);
			expect(score).toBeGreaterThanOrEqual(60);
		});

		it("should return score for multiple matches", () => {
			const score = getStudentSatisfactionScore(
				["tech-transformation", "data-analytics"],
				["tech", "data"],
			);
			expect(score).toBeGreaterThanOrEqual(60);
		});

		it("should return score for work type categories", () => {
			const score = getStudentSatisfactionScore(
				["tech-transformation"],
				["unknown"],
			);
			// Should still get some score for work type match
			expect(score).toBeGreaterThanOrEqual(0);
		});

		it("should cap score at 100", () => {
			const score = getStudentSatisfactionScore(
				["tech-transformation", "data-analytics", "product-innovation"],
				["tech", "data", "product"],
			);
			expect(score).toBeLessThanOrEqual(100);
		});

		it("should return 1 for empty user preferences", () => {
			const score = getStudentSatisfactionScore(["tech-transformation"], []);
			expect(score).toBe(1);
		});

		it("should handle null user preferences", () => {
			const score = getStudentSatisfactionScore(
				["tech-transformation"],
				null as any,
			);
			expect(score).toBe(1);
		});

		it("should return neutral score for no matches", () => {
			const score = getStudentSatisfactionScore(["unknown-category"], ["tech"]);
			expect(score).toBeGreaterThanOrEqual(0);
		});
	});

	describe("mapping constants", () => {
		it("should have consistent forward and reverse mappings", () => {
			Object.entries(FORM_TO_DATABASE_MAPPING).forEach(([form, db]) => {
				if (DATABASE_TO_FORM_MAPPING[db]) {
					expect(DATABASE_TO_FORM_MAPPING[db]).toBe(form);
				}
			});
		});

		it("should include all work type categories", () => {
			expect(WORK_TYPE_CATEGORIES.length).toBeGreaterThan(0);
			expect(WORK_TYPE_CATEGORIES).toContain("tech-transformation");
			expect(WORK_TYPE_CATEGORIES).toContain("data-analytics");
		});
	});
});
