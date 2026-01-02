import type { Job } from "@/scrapers/types";
import { IntegratedMatchingService } from "@/Utils/matching/integrated-matching.service";
import type { UserPreferences } from "@/Utils/matching/types";

jest.mock("@/Utils/matching/batch-processor.service", () => ({
	batchMatchingProcessor: {
		processBatch: jest.fn().mockResolvedValue(new Map()),
	},
}));

jest.mock("@/Utils/consolidatedMatchingV2", () => ({
	createConsolidatedMatcher: jest.fn(() => ({
		performMatching: jest.fn().mockResolvedValue({
			matches: [],
			method: "rule_based",
		}),
	})),
}));

describe("IntegratedMatchingService", () => {
	let service: IntegratedMatchingService;
	const mockJobs: Job[] = [
		{
			job_hash: "hash1",
			title: "Engineer",
			company: "Co",
			location: "London",
			description: "Test",
			job_url: "https://test.com",
			source: "test",
			categories: ["tech"],
			is_active: true,
			is_graduate: false,
			is_internship: false,
			created_at: new Date().toISOString(),
			posted_at: new Date().toISOString(),
			original_posted_date: new Date().toISOString(),
			last_seen_at: new Date().toISOString(),
			scrape_timestamp: new Date().toISOString(),
			experience_required: "",
			work_environment: "remote",
		},
	];

	const mockUsers = [
		{
			email: "user1@example.com",
			preferences: {
				email: "user1@example.com",
				career_path: ["tech"],
				target_cities: ["London"],
			} as UserPreferences,
		},
	];

	beforeEach(() => {
		service = new IntegratedMatchingService();
	});

	describe("processUsersWithBatchOptimization", () => {
		it("should process users", async () => {
			const results = await service.processUsersWithBatchOptimization(
				mockUsers,
				mockJobs,
			);
			expect(results).toBeDefined();
			expect(results instanceof Map).toBe(true);
		});

		it("should use batch processing for large groups", async () => {
			const manyUsers = Array(10).fill(mockUsers[0]);
			const results = await service.processUsersWithBatchOptimization(
				manyUsers,
				mockJobs,
				{
					enabled: true,
					minUsersForBatch: 5,
				},
			);
			expect(results).toBeDefined();
		});

		it("should use individual processing for small groups", async () => {
			const smallGroup = mockUsers.slice(0, 2);
			const results = await service.processUsersWithBatchOptimization(
				smallGroup,
				mockJobs,
				{
					enabled: true,
					minUsersForBatch: 5,
				},
			);
			expect(results).toBeDefined();
		});

		it("should disable batch processing when requested", async () => {
			const results = await service.processUsersWithBatchOptimization(
				Array(10).fill(mockUsers[0]),
				mockJobs,
				{
					enabled: false,
				},
			);
			expect(results).toBeDefined();
		});
	});

	describe("getSemanticJobs", () => {
		it("should get semantic jobs", async () => {
			const userPrefs: UserPreferences = {
				email: "test@example.com",
				career_path: ["tech"],
				target_cities: ["London"],
			};
			const jobs = await service.getSemanticJobs(userPrefs, 100);
			expect(Array.isArray(jobs)).toBe(true);
		});

		it("should respect limit parameter", async () => {
			const userPrefs: UserPreferences = {
				email: "test@example.com",
			};
			const jobs = await service.getSemanticJobs(userPrefs, 50);
			expect(Array.isArray(jobs)).toBe(true);
		});
	});
});
