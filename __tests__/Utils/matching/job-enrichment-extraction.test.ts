import {
	extractCareerPath,
	extractPostingDate,
	extractProfessionalExpertise,
	extractStartDate,
} from "@/Utils/matching/job-enrichment.service";

describe("job-enrichment extraction functions", () => {
	describe("extractPostingDate", () => {
		it("should extract ISO date format", () => {
			const html = "Posted on 2024-01-15T10:30:00Z";
			const result = extractPostingDate(html, "test");
			expect(result).toContain("2024-01-15");
		});

		it("should extract European date format", () => {
			const html = "Posted 15/01/2024";
			const result = extractPostingDate(html, "test");
			expect(result).toBeDefined();
		});

		it("should extract US date format", () => {
			const html = "Posted 01/15/2024";
			const result = extractPostingDate(html, "test");
			expect(result).toBeDefined();
		});

		it("should extract relative date format", () => {
			const html = "Posted on 15 January 2024";
			const result = extractPostingDate(html, "test");
			expect(result).toBeDefined();
		});

		it("should return fallback for invalid HTML", () => {
			const fallback = "2024-01-01T00:00:00.000Z";
			const result = extractPostingDate("", "test", fallback);
			expect(result).toBe(fallback);
		});

		it("should return fallback for null HTML", () => {
			const fallback = "2024-01-01T00:00:00.000Z";
			const result = extractPostingDate(null as any, "test", fallback);
			expect(result).toBe(fallback);
		});

		it("should return fallback when no date found", () => {
			const fallback = "2024-01-01T00:00:00.000Z";
			const result = extractPostingDate("No date here", "test", fallback);
			expect(result).toBe(fallback);
		});

		it("should use default fallback", () => {
			const result = extractPostingDate("", "test");
			expect(result).toBeDefined();
			expect(typeof result).toBe("string");
		});
	});

	describe("extractProfessionalExpertise", () => {
		it("should extract software expertise", () => {
			const result = extractProfessionalExpertise(
				"Software Engineer",
				"Building software",
			);
			expect(result).toBe("Software Development");
		});

		it("should extract data expertise", () => {
			const result = extractProfessionalExpertise(
				"Data Scientist",
				"Working with data",
			);
			expect(result).toBe("Data Science");
		});

		it("should extract product expertise", () => {
			const result = extractProfessionalExpertise(
				"Product Manager",
				"Managing products",
			);
			expect(result).toBe("Product Management");
		});

		it("should extract marketing expertise", () => {
			const result = extractProfessionalExpertise(
				"Marketing Manager",
				"Marketing campaigns",
			);
			expect(result).toBe("Marketing");
		});

		it("should extract frontend expertise", () => {
			const result = extractProfessionalExpertise(
				"Frontend Developer",
				"React and Vue",
			);
			expect(result).toBe("Frontend Development");
		});

		it("should extract backend expertise", () => {
			const result = extractProfessionalExpertise(
				"Backend Developer",
				"Node.js and Python",
			);
			expect(result).toBe("Backend Development");
		});

		it("should return General for unknown", () => {
			const result = extractProfessionalExpertise(
				"Unknown Role",
				"Random description",
			);
			expect(result).toBe("General");
		});

		it("should be case insensitive", () => {
			const result = extractProfessionalExpertise(
				"SOFTWARE ENGINEER",
				"BUILDING SOFTWARE",
			);
			expect(result).toBe("Software Development");
		});
	});

	describe("extractCareerPath", () => {
		it("should extract tech path", () => {
			const result = extractCareerPath(
				"Software Engineer",
				"Building software",
			);
			expect(result).toBe("tech");
		});

		it("should extract data path", () => {
			const result = extractCareerPath("Data Analyst", "Analyzing data");
			expect(result).toBe("data");
		});

		it("should extract product path", () => {
			const result = extractCareerPath("Product Manager", "Managing products");
			expect(result).toBe("product");
		});

		it("should extract marketing path", () => {
			const result = extractCareerPath(
				"Marketing Specialist",
				"Marketing campaigns",
			);
			expect(result).toBe("marketing");
		});

		it("should extract sales path", () => {
			const result = extractCareerPath(
				"Sales Representative",
				"Selling products",
			);
			expect(result).toBe("sales");
		});

		it("should return general for unknown", () => {
			const result = extractCareerPath("Unknown Role", "Random description");
			expect(result).toBe("general");
		});

		it("should prioritize more specific matches", () => {
			const result = extractCareerPath("Data Scientist", "Data science");
			expect(result).toBe("data");
		});

		it("should be case insensitive", () => {
			const result = extractCareerPath("DEVELOPER", "PROGRAMMING");
			expect(result).toBe("tech");
		});
	});

	describe("extractStartDate", () => {
		it("should extract date from description", () => {
			const description = "Start date: 2024-06-01";
			const result = extractStartDate(description);
			expect(result).toBeDefined();
			expect(typeof result).toBe("string");
		});

		it("should handle various date formats", () => {
			const formats = [
				"Start: June 1, 2024",
				"Starting 01/06/2024",
				"Start date: 2024-06-01",
			];
			formats.forEach((desc) => {
				const result = extractStartDate(desc);
				expect(result).toBeDefined();
			});
		});

		it("should return empty string when no date found", () => {
			const result = extractStartDate("No date mentioned");
			expect(result).toBeDefined();
			expect(typeof result).toBe("string");
		});

		it("should handle empty description", () => {
			const result = extractStartDate("");
			expect(result).toBeDefined();
			expect(typeof result).toBe("string");
		});
	});
});
