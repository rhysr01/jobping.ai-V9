import dayjs from "dayjs";
import {
	inferTrack,
	type JobPingJob,
	type JobTrack,
	normalize,
	scoreJob,
} from "@/lib/normalize";

describe("normalize", () => {
	describe("inferTrack", () => {
		it("should infer consulting track", () => {
			expect(inferTrack("Consultant")).toBe("consulting");
			expect(inferTrack("advisory role")).toBe("consulting");
			expect(inferTrack("strategy consulting")).toBe("consulting");
		});

		it("should infer finance track", () => {
			expect(inferTrack("Investment Banker")).toBe("finance");
			expect(inferTrack("finance analyst")).toBe("finance");
			expect(inferTrack("equity research")).toBe("finance");
		});

		it("should infer strategy track", () => {
			expect(inferTrack("strategy")).toBe("strategy");
			expect(inferTrack("strategic planning")).toBe("strategy");
		});

		it("should infer operations track", () => {
			expect(inferTrack("operations manager")).toBe("operations");
			expect(inferTrack("supply chain")).toBe("operations");
			expect(inferTrack("logistics")).toBe("operations");
		});

		it("should infer marketing track", () => {
			expect(inferTrack("marketing manager")).toBe("marketing");
			expect(inferTrack("brand manager")).toBe("marketing");
			expect(inferTrack("digital marketing")).toBe("marketing");
		});

		it("should infer product track", () => {
			expect(inferTrack("product manager")).toBe("product");
			expect(inferTrack("product management")).toBe("product");
		});

		it("should infer data track", () => {
			expect(inferTrack("data analyst")).toBe("data");
			expect(inferTrack("business intelligence")).toBe("data");
			expect(inferTrack("analytics")).toBe("data");
		});

		it("should infer sustainability track", () => {
			expect(inferTrack("sustainability")).toBe("sustainability");
			expect(inferTrack("ESG")).toBe("sustainability");
			expect(inferTrack("climate")).toBe("sustainability");
		});

		it("should return other for unknown", () => {
			expect(inferTrack("unknown role")).toBe("other");
			expect(inferTrack("random job")).toBe("other");
		});

		it("should be case insensitive", () => {
			expect(inferTrack("CONSULTANT")).toBe("consulting");
			expect(inferTrack("Finance")).toBe("finance");
		});
	});

	describe("scoreJob", () => {
		const recentDate = dayjs().subtract(5, "days").toISOString();
		const oldDate = dayjs().subtract(30, "days").toISOString();

		it("should score recent jobs higher", () => {
			const recentScore = scoreJob("Title", "Description", recentDate, "other");
			const oldScore = scoreJob("Title", "Description", oldDate, "other");
			expect(recentScore).toBeGreaterThan(oldScore);
		});

		it("should add points for early career keywords", () => {
			const score = scoreJob(
				"Graduate Programme",
				"Entry level position",
				recentDate,
				"other",
			);
			expect(score).toBeGreaterThan(40);
		});

		it("should add points for tracked roles", () => {
			const trackedScore = scoreJob(
				"Title",
				"Description",
				recentDate,
				"consulting",
			);
			const untrackedScore = scoreJob(
				"Title",
				"Description",
				recentDate,
				"other",
			);
			expect(trackedScore).toBeGreaterThan(untrackedScore);
		});

		it("should cap score at 100", () => {
			const score = scoreJob(
				"Graduate Programme",
				"Entry level intern trainee rotation",
				recentDate,
				"consulting",
			);
			expect(score).toBeLessThanOrEqual(100);
		});

		it("should return minimum 0", () => {
			const score = scoreJob("Title", "Description", oldDate, "other");
			expect(score).toBeGreaterThanOrEqual(0);
		});

		it("should handle multiple early career keywords", () => {
			const score = scoreJob(
				"Graduate Intern",
				"Trainee rotation leadership",
				recentDate,
				"other",
			);
			expect(score).toBeGreaterThan(55);
		});
	});

	describe("normalize", () => {
		it("should normalize job with all fields", () => {
			const job = {
				title: "Software Engineer",
				company_name: "Test Company",
				company_domain: "test.com",
				url: "https://test.com/job",
				posted_at: new Date().toISOString(),
				location: { name: "London", id: 1 },
				source: "test",
				seniority: "junior",
				description: "Test description",
			};

			const normalized = normalize(job);
			expect(normalized.title).toBe("Software Engineer");
			expect(normalized.company).toBe("Test Company");
			expect(normalized.companyDomain).toBe("test.com");
			expect(normalized.url).toBe("https://test.com/job");
			expect(normalized.locationName).toBe("London");
			expect(normalized.locationId).toBe(1);
			expect(normalized.source).toBe("test");
			expect(normalized.seniority).toBe("junior");
			expect(normalized.id).toBeDefined();
			expect(normalized.track).toBeDefined();
			expect(normalized.score).toBeGreaterThanOrEqual(0);
		});

		it("should handle missing fields", () => {
			const job = {
				title: "Engineer",
				company: "Company",
			};

			const normalized = normalize(job);
			expect(normalized.title).toBe("Engineer");
			expect(normalized.company).toBe("Company");
			expect(normalized.url).toBe("");
			expect(normalized.descriptionSnippet).toBeDefined();
		});

		it("should generate consistent hash", () => {
			const job = {
				title: "Engineer",
				company: "Company",
				company_domain: "test.com",
				url: "https://test.com/job",
				location_name: "London",
				posted_at: "2024-01-01",
			};

			const normalized1 = normalize(job);
			const normalized2 = normalize(job);
			expect(normalized1.id).toBe(normalized2.id);
		});

		it("should truncate description snippet", () => {
			const longDescription = "a".repeat(1000);
			const job = {
				title: "Engineer",
				company: "Company",
				description: longDescription,
			};

			const normalized = normalize(job);
			expect(normalized.descriptionSnippet.length).toBeLessThanOrEqual(500);
		});

		it("should infer track from title and description", () => {
			const job = {
				title: "Consultant",
				company: "Company",
				description: "Advisory role",
			};

			const normalized = normalize(job);
			expect(normalized.track).toBe("consulting");
		});

		it("should calculate score", () => {
			const job = {
				title: "Graduate Programme",
				company: "Company",
				description: "Entry level",
				posted_at: dayjs().subtract(5, "days").toISOString(),
			};

			const normalized = normalize(job);
			expect(normalized.score).toBeGreaterThan(0);
		});

		it("should handle alternative field names", () => {
			const job = {
				title: "Engineer",
				company: "Company",
				job_url: "https://test.com/job",
				publication_date: new Date().toISOString(),
				location_name: "London",
				job_board: "test",
				snippet: "Description",
			};

			const normalized = normalize(job);
			expect(normalized.url).toBe("https://test.com/job");
			expect(normalized.locationName).toBe("London");
			expect(normalized.source).toBe("test");
			expect(normalized.descriptionSnippet).toContain("Description");
		});

		it("should handle external_id for hash", () => {
			const job = {
				title: "Engineer",
				company: "Company",
				company_domain: "test.com",
				external_id: "12345",
				location_name: "London",
				posted_at: "2024-01-01",
			};

			const normalized = normalize(job);
			expect(normalized.id).toBeDefined();
		});
	});
});
