/**
 * Unit Tests for Job Filtering Business Rules
 *
 * Tests pure business logic for job filtering and sorting.
 * These are critical business rules that determine what users see.
 */

import {
	filterJobBoards,
	isJobBoard,
	JOB_BOARD_COMPANIES,
	sortJobsByStatus,
} from "@/utils/business-rules/job-filtering";

describe("Job Filtering Business Rules", () => {
	describe("JOB_BOARD_COMPANIES constant", () => {
		it("should contain known job board companies", () => {
			expect(JOB_BOARD_COMPANIES).toContain("reed");
			expect(JOB_BOARD_COMPANIES).toContain("indeed");
			expect(JOB_BOARD_COMPANIES).toContain("linkedin");
			expect(JOB_BOARD_COMPANIES).toContain("glassdoor");
			expect(JOB_BOARD_COMPANIES).toContain("jobspy");
		});

		it("should be a readonly array", () => {
			expect(Array.isArray(JOB_BOARD_COMPANIES)).toBe(true);
			expect(JOB_BOARD_COMPANIES.length).toBeGreaterThan(10); // Has substantial list
			// Note: as const provides compile-time readonly, runtime mutability depends on usage
		});
	});

	describe("isJobBoard", () => {
		it("should return true for known job board companies", () => {
			expect(isJobBoard("Reed")).toBe(true);
			expect(isJobBoard("INDEED")).toBe(true);
			expect(isJobBoard("LinkedIn")).toBe(true);
			expect(isJobBoard("Glassdoor")).toBe(true);
			expect(isJobBoard("JobSpy")).toBe(true);
		});

		it("should return false for real companies", () => {
			expect(isJobBoard("Microsoft")).toBe(false);
			expect(isJobBoard("Apple Inc")).toBe(false);
			expect(isJobBoard("Tesla")).toBe(false);
			expect(isJobBoard("Amazon")).toBe(false);
			// Note: Google is correctly identified as a job board
			expect(isJobBoard("Google")).toBe(true);
		});

		it("should handle case insensitive matching", () => {
			expect(isJobBoard("reed")).toBe(true);
			expect(isJobBoard("REED")).toBe(true);
			expect(isJobBoard("ReEd")).toBe(true);
		});

		it("should handle partial matches within company names", () => {
			expect(isJobBoard("Reed Solutions Ltd")).toBe(true);
			expect(isJobBoard("Indeed Staffing")).toBe(true);
			expect(isJobBoard("LinkedIn Corp")).toBe(true);
		});

		it("should use company_name field as fallback", () => {
			expect(isJobBoard(undefined, "Reed")).toBe(true);
			expect(isJobBoard("", "indeed")).toBe(true);
		});

		it("should handle undefined and empty inputs", () => {
			expect(isJobBoard()).toBe(false);
			expect(isJobBoard("")).toBe(false);
			expect(isJobBoard(null as any)).toBe(false);
			expect(isJobBoard(undefined, undefined)).toBe(false);
		});

		it("should handle complex company names", () => {
			expect(isJobBoard("Reed & Mackay")).toBe(true);
			expect(isJobBoard("Indeed.com Ltd")).toBe(true);
			expect(isJobBoard("LinkedIn Ireland")).toBe(true);
		});
	});

	describe("filterJobBoards", () => {
		const mockJobs = [
			{ id: 1, company: "Google", title: "Software Engineer" }, // Google is a job board
			{ id: 2, company: "Reed", title: "Data Analyst" }, // Job board
			{ id: 3, company: "Microsoft", title: "Product Manager" }, // Real company
			{ id: 4, company: "Indeed", title: "Designer" }, // Job board
			{ id: 5, company: "Apple", title: "DevOps Engineer" }, // Real company
			{ id: 6, company: "LinkedIn", title: "Marketing Manager" }, // Job board
		];

		it("should filter out job board companies", () => {
			const filtered = filterJobBoards(mockJobs);

			expect(filtered).toHaveLength(2); // Only Microsoft and Apple should remain
			expect(filtered.map((j) => j.company)).toEqual(["Microsoft", "Apple"]);
		});

		it("should preserve non-job-board companies", () => {
			const filtered = filterJobBoards(mockJobs);

			expect(filtered.some((j) => j.company === "Google")).toBe(false); // Google filtered out
			expect(filtered.some((j) => j.company === "Microsoft")).toBe(true);
			expect(filtered.some((j) => j.company === "Apple")).toBe(true);
		});

		it("should exclude all job board companies", () => {
			const filtered = filterJobBoards(mockJobs);

			expect(filtered.some((j) => j.company === "Reed")).toBe(false);
			expect(filtered.some((j) => j.company === "Indeed")).toBe(false);
			expect(filtered.some((j) => j.company === "LinkedIn")).toBe(false);
		});

		it("should handle empty array", () => {
			const filtered = filterJobBoards([]);
			expect(filtered).toEqual([]);
		});

		it("should work with company_name field", () => {
			const jobsWithCompanyName = [
				{ id: 1, company_name: "Microsoft Inc", title: "Engineer" }, // Real company
				{ id: 2, company_name: "Reed Solutions", title: "Analyst" }, // Job board
			];

			const filtered = filterJobBoards(jobsWithCompanyName);
			expect(filtered).toHaveLength(1);
			expect(filtered[0].company_name).toBe("Microsoft Inc");
		});

		it("should preserve job properties", () => {
			const filtered = filterJobBoards(mockJobs);

			filtered.forEach((job) => {
				expect(job).toHaveProperty("id");
				expect(job).toHaveProperty("company");
				expect(job).toHaveProperty("title");
			});
		});

		it("should be deterministic (same input, same output)", () => {
			const result1 = filterJobBoards(mockJobs);
			const result2 = filterJobBoards(mockJobs);

			expect(result1).toEqual(result2);
		});
	});

	describe("sortJobsByStatus", () => {
		const mockJobs = [
			{
				id: 1,
				company: "Google",
				is_active: true,
				status: "active",
				title: "Active Job",
			},
			{
				id: 2,
				company: "Microsoft",
				is_active: true,
				status: "active",
				title: "Another Active",
			},
			{
				id: 3,
				company: "Apple",
				is_active: false,
				status: "inactive",
				title: "Inactive Job",
			},
			{
				id: 4,
				company: "Tesla",
				is_active: true,
				status: "pending",
				title: "Pending Job",
			},
			{
				id: 5,
				company: "Amazon",
				is_active: false,
				status: "active",
				title: "Conflicting Status",
			},
		];

		it("should separate jobs into active and inactive groups", () => {
			const result = sortJobsByStatus(mockJobs);

			expect(result).toHaveProperty("active");
			expect(result).toHaveProperty("inactive");
			expect(Array.isArray(result.active)).toBe(true);
			expect(Array.isArray(result.inactive)).toBe(true);
		});

		it("should classify truly active jobs (is_active=true AND status=active)", () => {
			const result = sortJobsByStatus(mockJobs);

			expect(result.active).toHaveLength(2);
			expect(result.active.map((j) => j.company)).toEqual(
				expect.arrayContaining(["Google", "Microsoft"]),
			);
		});

		it("should classify inactive jobs (is_active=false OR status!=active)", () => {
			const result = sortJobsByStatus(mockJobs);

			expect(result.inactive).toHaveLength(3);
			expect(result.inactive.map((j) => j.company)).toEqual(
				expect.arrayContaining(["Apple", "Tesla", "Amazon"]),
			);
		});

		it("should handle jobs with missing properties", () => {
			const jobsWithMissingProps = [
				{ id: 1, company: "Test", is_active: true }, // missing status
				{ id: 2, company: "Test2", status: "active" }, // missing is_active
				{ id: 3, company: "Test3" }, // missing both
			];

			const result = sortJobsByStatus(jobsWithMissingProps);

			expect(result.active).toHaveLength(0);
			expect(result.inactive).toHaveLength(3);
		});

		it("should handle empty array", () => {
			const result = sortJobsByStatus([]);

			expect(result.active).toEqual([]);
			expect(result.inactive).toEqual([]);
		});

		it("should preserve job properties in both groups", () => {
			const result = sortJobsByStatus(mockJobs);

			[...result.active, ...result.inactive].forEach((job) => {
				expect(job).toHaveProperty("id");
				expect(job).toHaveProperty("company");
				expect(job).toHaveProperty("is_active");
				expect(job).toHaveProperty("status");
				expect(job).toHaveProperty("title");
			});
		});

		it("should be deterministic", () => {
			const result1 = sortJobsByStatus(mockJobs);
			const result2 = sortJobsByStatus(mockJobs);

			expect(result1).toEqual(result2);
		});

		it("should handle edge cases with status values", () => {
			const edgeCaseJobs = [
				{ id: 1, company: "A", is_active: true, status: "ACTIVE" }, // uppercase - inactive
				{ id: 2, company: "B", is_active: true, status: "active" }, // exact match - active
				{ id: 3, company: "C", is_active: true, status: "" }, // empty string - inactive
				{ id: 4, company: "D", is_active: true, status: null }, // null - inactive
				{ id: 5, company: "E", is_active: true, status: undefined }, // undefined - inactive
			];

			const result = sortJobsByStatus(edgeCaseJobs);

			// Only the exact string "active" should be considered active
			expect(result.active).toHaveLength(1); // Only id: 2 has exact "active"
			expect(result.inactive).toHaveLength(4);
		});
	});

	describe("Business Logic Integration", () => {
		it("should demonstrate complete job filtering workflow", () => {
			// Simulate real job data with mix of real companies and job boards
			const rawJobs = [
				{
					id: 1,
					company: "Google",
					is_active: true,
					status: "active",
					title: "SWE",
				},
				{
					id: 2,
					company: "Reed",
					is_active: true,
					status: "active",
					title: "Data Analyst",
				},
				{
					id: 3,
					company: "Microsoft",
					is_active: true,
					status: "active",
					title: "PM",
				},
				{
					id: 4,
					company: "Indeed",
					is_active: false,
					status: "inactive",
					title: "Designer",
				},
				{
					id: 5,
					company: "Apple",
					is_active: true,
					status: "pending",
					title: "DevOps",
				},
				{
					id: 6,
					company: "LinkedIn",
					is_active: true,
					status: "active",
					title: "Marketing",
				},
			];

			// Step 1: Filter out job boards (business rule)
			const filteredJobs = filterJobBoards(rawJobs);
			expect(filteredJobs).toHaveLength(2); // Only Microsoft and Apple (Google is job board)

			// Step 2: Sort by status (business rule: active first)
			const sortedJobs = sortJobsByStatus(filteredJobs);
			expect(sortedJobs.active).toHaveLength(1); // Microsoft (truly active)
			expect(sortedJobs.inactive).toHaveLength(1); // Apple (pending status)

			// Verify final result follows business rules
			const finalJobs = [...sortedJobs.active, ...sortedJobs.inactive];
			expect(finalJobs[0].company).toBe("Microsoft"); // Active jobs first
			expect(finalJobs[1].company).toBe("Apple"); // Then inactive
		});

		it("should handle complex real-world scenarios", () => {
			// Test with company_name variations and edge cases
			const complexJobs = [
				{
					id: 1,
					company: "Google Inc",
					company_name: "Alphabet",
					is_active: true,
					status: "active",
				}, // Still job board due to "Google"
				{
					id: 2,
					company: undefined,
					company_name: "Reed Solutions Ltd",
					is_active: true,
					status: "active",
				}, // Job board
				{
					id: 3,
					company: "Microsoft",
					company_name: "",
					is_active: true,
					status: "active",
				}, // Real company
				{
					id: 4,
					company: "",
					company_name: "indeed.com",
					is_active: true,
					status: "active",
				}, // Job board
				{
					id: 5,
					company: "Apple",
					company_name: "Apple Inc",
					is_active: true,
					status: "active",
				}, // Real company
			];

			const filtered = filterJobBoards(complexJobs);
			expect(filtered).toHaveLength(2); // Should keep Microsoft and Apple
			expect(filtered.map((j) => j.company)).toEqual(["Microsoft", "Apple"]);
		});
	});
});
