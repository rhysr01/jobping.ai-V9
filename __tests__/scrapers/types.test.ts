import type { Job } from "@/scrapers/types";
import {
	addTagToCategories,
	CANONICAL_CAREER_PATHS,
	CAREER_PATH_PRIORITY,
	CAREER_PATH_SYNONYMS,
	calculateCareerPathTelemetry,
	createJobCategories,
	extractCareerPathFromCategories,
	normalizeCareerPath,
} from "@/scrapers/types";

describe("scrapers/types career path functions", () => {
	describe("normalizeCareerPath", () => {
		it("should normalize exact match", () => {
			expect(normalizeCareerPath("strategy")).toEqual(["strategy"]);
			expect(normalizeCareerPath("tech")).toEqual(["tech"]);
			expect(normalizeCareerPath("data-analytics")).toEqual(["data-analytics"]);
		});

		it("should be case insensitive", () => {
			expect(normalizeCareerPath("Strategy")).toEqual(["strategy"]);
			expect(normalizeCareerPath("TECH")).toEqual(["tech"]);
		});

		it("should handle synonyms", () => {
			expect(normalizeCareerPath("consulting")).toEqual(["strategy"]);
			expect(normalizeCareerPath("software")).toEqual(["tech"]);
			expect(normalizeCareerPath("data analyst")).toEqual(["data-analytics"]);
		});

		it("should return unsure for unknown", () => {
			expect(normalizeCareerPath("unknown-path")).toEqual(["unsure"]);
			expect(normalizeCareerPath("invalid")).toEqual(["unsure"]);
		});

		it("should handle null/undefined", () => {
			expect(normalizeCareerPath(null)).toEqual(["unsure"]);
			expect(normalizeCareerPath(undefined)).toEqual(["unsure"]);
			expect(normalizeCareerPath("")).toEqual(["unsure"]);
		});

		it("should handle array input", () => {
			expect(normalizeCareerPath(["strategy", "tech"])).toEqual(["strategy"]);
			expect(normalizeCareerPath(["invalid", "tech"])).toEqual(["tech"]);
			expect(normalizeCareerPath(["invalid1", "invalid2"])).toEqual(["unsure"]);
		});

		it("should use priority for multiple matches", () => {
			const result = normalizeCareerPath(["product", "tech"]);
			expect(result.length).toBe(1);
			expect(result[0]).toBe("product"); // product has higher priority
		});

		it("should trim whitespace", () => {
			expect(normalizeCareerPath("  strategy  ")).toEqual(["strategy"]);
		});
	});

	describe("createJobCategories", () => {
		it("should create categories with career path", () => {
			const result = createJobCategories("tech");
			expect(result).toContain("career:tech");
		});

		it("should include additional tags", () => {
			const result = createJobCategories("tech", ["tag1", "tag2"]);
			expect(result).toContain("tag1");
			expect(result).toContain("tag2");
		});

		it("should deduplicate tags", () => {
			const result = createJobCategories("tech", ["tag1", "tag1"]);
			const tags = result.split("|");
			expect(tags.filter((t) => t === "tag1").length).toBe(1);
		});

		it("should sort tags", () => {
			const result = createJobCategories("tech", ["zebra", "apple"]);
			const tags = result.split("|");
			expect(tags[0]).toBe("career:tech");
		});

		it("should truncate to 512 characters", () => {
			const longTags = Array(100).fill("very-long-tag-name-that-makes-it-long");
			const result = createJobCategories("tech", longTags);
			expect(result.length).toBeLessThanOrEqual(512);
		});

		it("should handle empty additional tags", () => {
			const result = createJobCategories("tech", []);
			expect(result).toBe("career:tech");
		});
	});

	describe("extractCareerPathFromCategories", () => {
		it("should extract career path from categories string", () => {
			expect(extractCareerPathFromCategories("career:tech|loc:london")).toBe(
				"tech",
			);
			expect(extractCareerPathFromCategories("career:strategy")).toBe(
				"strategy",
			);
		});

		it("should extract from categories array", () => {
			expect(
				extractCareerPathFromCategories(["career:tech", "loc:london"]),
			).toBe("tech");
		});

		it("should return unknown for no career tag", () => {
			expect(extractCareerPathFromCategories("loc:london")).toBe("unknown");
			expect(extractCareerPathFromCategories("")).toBe("unknown");
		});

		it("should return unknown for invalid career path", () => {
			expect(extractCareerPathFromCategories("career:invalid-path")).toBe(
				"unknown",
			);
		});

		it("should handle null/undefined", () => {
			expect(extractCareerPathFromCategories(null)).toBe("unknown");
			expect(extractCareerPathFromCategories(undefined)).toBe("unknown");
		});
	});

	describe("addTagToCategories", () => {
		it("should add tag to existing categories", () => {
			const result = addTagToCategories("career:tech|loc:london", "new-tag");
			expect(result).toContain("new-tag");
			expect(result).toContain("career:tech");
		});

		it("should handle empty categories", () => {
			const result = addTagToCategories("", "new-tag");
			expect(result).toContain("new-tag");
		});
	});

	describe("calculateCareerPathTelemetry", () => {
		const mockJobs: Job[] = [
			{
				job_hash: "hash1",
				title: "Software Engineer",
				company: "Tech Co",
				location: "London",
				description: "Test",
				job_url: "https://test.com",
				source: "test",
				categories: ["career:tech", "loc:london"],
				is_active: true,
				is_graduate: false,
				is_internship: false,
				created_at: new Date().toISOString(),
				posted_at: new Date().toISOString(),
				original_posted_date: new Date().toISOString(),
				last_seen_at: new Date().toISOString(),
				scrape_timestamp: new Date().toISOString(),
				experience_required: "",
				work_environment: "",
			},
			{
				job_hash: "hash2",
				title: "Consultant",
				company: "Strategy Co",
				location: "London",
				description: "Test",
				job_url: "https://test.com",
				source: "test",
				categories: ["career:strategy"],
				is_active: true,
				is_graduate: false,
				is_internship: false,
				created_at: new Date().toISOString(),
				posted_at: new Date().toISOString(),
				original_posted_date: new Date().toISOString(),
				last_seen_at: new Date().toISOString(),
				scrape_timestamp: new Date().toISOString(),
				experience_required: "",
				work_environment: "",
			},
			{
				job_hash: "hash3",
				title: "Unknown Job",
				company: "Co",
				location: "London",
				description: "Test",
				job_url: "https://test.com",
				source: "test",
				categories: [],
				is_active: true,
				is_graduate: false,
				is_internship: false,
				created_at: new Date().toISOString(),
				posted_at: new Date().toISOString(),
				original_posted_date: new Date().toISOString(),
				last_seen_at: new Date().toISOString(),
				scrape_timestamp: new Date().toISOString(),
				experience_required: "",
				work_environment: "",
			},
		];

		it("should calculate telemetry correctly", () => {
			const telemetry = calculateCareerPathTelemetry(mockJobs);
			expect(telemetry.totalJobs).toBe(3);
			expect(telemetry.jobsWithCareerPath).toBe(2);
			expect(telemetry.unknownJobs).toBe(1);
			expect(telemetry.unknownPercentage).toBeCloseTo(33.33, 1);
			expect(telemetry.careerPathDistribution["tech"]).toBe(1);
			expect(telemetry.careerPathDistribution["strategy"]).toBe(1);
			expect(telemetry.taxonomyVersion).toBe(1);
		});

		it("should handle empty array", () => {
			const telemetry = calculateCareerPathTelemetry([]);
			expect(telemetry.totalJobs).toBe(0);
			expect(telemetry.unknownPercentage).toBe(0);
		});

		it("should handle all unknown jobs", () => {
			const unknownJobs: Job[] = [
				{
					job_hash: "hash1",
					title: "Job",
					company: "Co",
					location: "London",
					description: "Test",
					job_url: "https://test.com",
					source: "test",
					categories: [],
					is_active: true,
					is_graduate: false,
					is_internship: false,
					created_at: new Date().toISOString(),
					posted_at: new Date().toISOString(),
					original_posted_date: new Date().toISOString(),
					last_seen_at: new Date().toISOString(),
					scrape_timestamp: new Date().toISOString(),
					experience_required: "",
					work_environment: "",
				},
			];
			const telemetry = calculateCareerPathTelemetry(unknownJobs);
			expect(telemetry.unknownJobs).toBe(1);
			expect(telemetry.jobsWithCareerPath).toBe(0);
			expect(telemetry.unknownPercentage).toBe(100);
		});
	});

	describe("constants", () => {
		it("should have canonical career paths", () => {
			expect(CANONICAL_CAREER_PATHS.length).toBeGreaterThan(0);
			expect(CANONICAL_CAREER_PATHS).toContain("strategy");
			expect(CANONICAL_CAREER_PATHS).toContain("tech");
		});

		it("should have synonyms mapping", () => {
			expect(Object.keys(CAREER_PATH_SYNONYMS).length).toBeGreaterThan(0);
			expect(CAREER_PATH_SYNONYMS["consulting"]).toBe("strategy");
			expect(CAREER_PATH_SYNONYMS["software"]).toBe("tech");
		});

		it("should have priority mapping", () => {
			expect(CAREER_PATH_PRIORITY["product"]).toBeGreaterThan(
				CAREER_PATH_PRIORITY["tech"],
			);
		});
	});
});
