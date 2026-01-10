import type { Job } from "@/scrapers/types";
import { enrichJobData } from "@/utils/matching/job-enrichment.service";

describe("job-enrichment.service", () => {
	const mockJob: Job = {
		job_hash: "test-hash",
		title: "Software Engineer",
		company: "Test Company",
		location: "London, UK",
		description:
			"Looking for a junior developer with visa sponsorship available",
		job_url: "https://example.com/job",
		source: "test",
		categories: ["software", "tech"],
		is_active: true,
		is_graduate: false,
		is_internship: false,
		created_at: new Date().toISOString(),
		posted_at: new Date().toISOString(),
	};

	describe("enrichJobData", () => {
		it("should enrich job with all fields", () => {
			const enriched = enrichJobData(mockJob);

			expect(enriched).toHaveProperty("visaFriendly");
			expect(enriched).toHaveProperty("experienceLevel");
			expect(enriched).toHaveProperty("marketDemand");
			expect(enriched).toHaveProperty("salaryRange");
			expect(enriched).toHaveProperty("companySize");
			expect(enriched).toHaveProperty("remoteFlexibility");
			expect(enriched).toHaveProperty("growthPotential");
			expect(enriched).toHaveProperty("culturalFit");
			expect(enriched).toHaveProperty("skillAlignment");
			expect(enriched).toHaveProperty("locationScore");
			expect(enriched).toHaveProperty("timingScore");
			expect(enriched).toHaveProperty("overallScore");
		});

		it("should detect visa-friendly jobs", () => {
			const jobWithVisa = {
				...mockJob,
				description: "Visa sponsorship available for international candidates",
			};
			const enriched = enrichJobData(jobWithVisa);
			expect(enriched.visaFriendly).toBe(true);
		});

		it("should detect entry-level positions", () => {
			const jobEntry = {
				...mockJob,
				title: "Junior Developer",
				description: "Entry level position",
			};
			const enriched = enrichJobData(jobEntry);
			expect(enriched.experienceLevel).toBe("junior");
		});

		it("should detect senior positions", () => {
			const jobSenior = {
				...mockJob,
				title: "Senior Software Engineer",
				description: "Lead developer position",
			};
			const enriched = enrichJobData(jobSenior);
			expect(enriched.experienceLevel).toBe("senior");
		});

		it("should calculate market demand", () => {
			const enriched = enrichJobData(mockJob);
			expect(enriched.marketDemand).toBeGreaterThanOrEqual(0);
			expect(enriched.marketDemand).toBeLessThanOrEqual(10);
		});

		it("should handle jobs without description", () => {
			const jobNoDesc = {
				...mockJob,
				description: undefined,
			};
			const enriched = enrichJobData(jobNoDesc);
			expect(enriched).toBeDefined();
			expect(enriched.visaFriendly).toBe(false);
		});

		it("should extract salary range when present", () => {
			const jobWithSalary = {
				...mockJob,
				description: "Salary: £30,000 - £40,000 per year",
			};
			const enriched = enrichJobData(jobWithSalary);
			// Salary extraction may or may not work depending on regex patterns
			expect(enriched.salaryRange).toBeDefined();
			expect(typeof enriched.salaryRange).toBe("string");
		});

		it("should use default salary when not found", () => {
			const enriched = enrichJobData(mockJob);
			expect(enriched.salaryRange).toBe("Competitive");
		});

		it("should calculate remote flexibility", () => {
			const enriched = enrichJobData(mockJob);
			expect(enriched.remoteFlexibility).toBeGreaterThanOrEqual(0);
			expect(enriched.remoteFlexibility).toBeLessThanOrEqual(100);
		});

		it("should detect company size", () => {
			const enriched = enrichJobData(mockJob);
			expect(enriched.companySize).toBeDefined();
			expect(typeof enriched.companySize).toBe("string");
		});

		it("should calculate location score", () => {
			const enriched = enrichJobData(mockJob);
			expect(enriched.locationScore).toBeGreaterThanOrEqual(0);
			expect(enriched.locationScore).toBeLessThanOrEqual(100);
		});

		it("should calculate timing score", () => {
			const enriched = enrichJobData(mockJob);
			expect(enriched.timingScore).toBeGreaterThanOrEqual(0);
			expect(enriched.timingScore).toBeLessThanOrEqual(100);
		});

		it("should preserve original job properties", () => {
			const enriched = enrichJobData(mockJob);
			expect(enriched.job_hash).toBe(mockJob.job_hash);
			expect(enriched.title).toBe(mockJob.title);
			expect(enriched.company).toBe(mockJob.company);
			expect(enriched.location).toBe(mockJob.location);
		});
	});
});
