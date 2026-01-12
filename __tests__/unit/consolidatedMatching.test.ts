/**
 * Unit Tests for ConsolidatedMatchingEngine
 * Tests the core job matching logic
 */

import { SimplifiedMatchingEngine } from "../../utils/matching/core/matching-engine";
import { JobMatch, type UserPreferences } from "../../utils/matching/types";

// Mock OpenAI
const mockOpenAI = {
	chat: {
		completions: {
			create: jest.fn(),
		},
	},
} as any;

// Mock the OpenAI module
jest.mock("openai", () => {
	return jest.fn(() => mockOpenAI);
});

// Mock the CircuitBreaker
jest.mock("@/utils/matching/consolidated/circuitBreaker", () => ({
	CircuitBreaker: jest.fn().mockImplementation(() => ({
		canExecute: jest.fn(() => true),
		recordSuccess: jest.fn(),
		recordFailure: jest.fn(),
	})),
}));

// Mock the hard gates pre-filter to return all jobs as eligible
jest.mock("@/utils/matching/preFilterHardGates", () => ({
	preFilterByHardGates: jest.fn((jobs) => jobs), // Return all jobs as eligible
}));

// Mock the prompts module
jest.mock("@/utils/matching/consolidated/prompts", () => ({
	performAIMatching: jest.fn().mockResolvedValue({
		matches: [
			{
				job_index: 0,
				job_hash: "hash1",
				match_score: 95,
				match_reason: "Perfect career match for entry-level developer",
				confidence_score: 0.9,
			},
		],
		tokensUsed: 150,
		cost: 0.001,
		model: "gpt-4",
	}),
}));

// Mock the validation module
jest.mock("@/utils/matching/consolidated/validation", () => ({
	validateAndNormalizeAIMatches: jest.fn((matches) => matches),
}));

describe("ConsolidatedMatchingEngine", () => {
	let matcher: ConsolidatedMatchingEngine;
	let mockJobs: any[];
	let mockUser: UserPreferences;

	beforeEach(() => {
		matcher = new ConsolidatedMatchingEngine("sk-test-api-key-for-testing");

		mockJobs = [
			{
				id: 1,
				job_hash: "hash1",
				title: "Junior Software Engineer",
				company: "Tech Corp",
				location: "London, UK",
				job_url: "https://example.com/job1",
				description:
					"Entry-level software engineering position for recent graduates",
				experience_required: "entry-level",
				work_environment: "hybrid",
				source: "test",
				categories: ["early-career", "tech"],
				company_profile_url: "",
				language_requirements: ["English"],
				scrape_timestamp: new Date().toISOString(),
				original_posted_date: new Date(
					Date.now() - 24 * 60 * 60 * 1000,
				).toISOString(),
				posted_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
				last_seen_at: new Date().toISOString(),
				is_active: true,
				created_at: new Date().toISOString(),
			},
			{
				id: 2,
				job_hash: "hash2",
				title: "Data Analyst Intern",
				company: "Data Corp",
				location: "Berlin, Germany",
				job_url: "https://example.com/job2",
				description:
					"Data analysis internship for students and recent graduates",
				experience_required: "entry-level",
				work_environment: "remote",
				source: "test",
				categories: ["early-career", "data"],
				company_profile_url: "",
				language_requirements: ["English", "German"],
				scrape_timestamp: new Date().toISOString(),
				original_posted_date: new Date(
					Date.now() - 12 * 60 * 60 * 1000,
				).toISOString(),
				posted_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
				last_seen_at: new Date().toISOString(),
				is_active: true,
				created_at: new Date().toISOString(),
			},
			{
				id: 3,
				job_hash: "hash3",
				title: "Senior Product Manager",
				company: "Product Corp",
				location: "Amsterdam, Netherlands",
				job_url: "https://example.com/job3",
				description:
					"Senior product management role requiring 5+ years experience",
				experience_required: "senior",
				work_environment: "office",
				source: "test",
				categories: ["senior", "product"],
				company_profile_url: "",
				language_requirements: ["English"],
				scrape_timestamp: new Date().toISOString(),
				original_posted_date: new Date(
					Date.now() - 48 * 60 * 60 * 1000,
				).toISOString(),
				posted_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
				last_seen_at: new Date().toISOString(),
				is_active: true,
				created_at: new Date().toISOString(),
			},
		];

		mockUser = {
			email: "test@example.com",
			career_path: ["tech"],
			target_cities: ["London", "Berlin"],
			professional_expertise: "software development",
			work_environment: "hybrid" as any,
			visa_status: "eu-citizen",
			entry_level_preference: "entry" as any,
			full_name: "Test User",
			start_date: "2024-01-01",
			languages_spoken: ["English"],
			company_types: ["tech"],
			roles_selected: ["developer"],
		};
	});

	afterEach(() => {
		jest.clearAllMocks();
		jest.clearAllTimers();
	});

	describe("performMatching", () => {
		it("should perform AI matching successfully", async () => {
			// Mock the AI response with function call format
			mockOpenAI.chat.completions.create.mockResolvedValue({
				choices: [
					{
						message: {
							function_call: {
								name: "return_job_matches",
								arguments: JSON.stringify({
									matches: [
										{
											job_index: 0, // 0-indexed for first job
											job_hash: "hash1",
											match_score: 95,
											match_reason:
												"Perfect career match for entry-level developer",
											confidence_score: 0.9,
										},
									],
								}),
							},
						},
					},
				],
				usage: {
					model: "gpt-4",
					prompt_tokens: 100,
					completion_tokens: 50,
					total_tokens: 150,
				},
			});

			// Ensure OpenAI is properly initialized
			expect(matcher).toBeDefined();

			const result = await matcher.performMatching(mockJobs, mockUser);

			// With stratified matching for multiple cities, should successfully use AI
			// This tests that stratified matching works correctly
			expect(result.method).toBe("ai_success");
			expect(result.matches).toBeDefined();
			expect(result.matches.length).toBeGreaterThan(0);
			expect(result.confidence).toBeGreaterThanOrEqual(0);
			expect(result.confidence).toBeLessThanOrEqual(1);
		});
	});

	describe("rule-based matching", () => {
		it("should generate valid matches when forced to use rules", async () => {
			const result = await matcher.performMatching(mockJobs, mockUser, true);

			// When forced to use rules, should return rule_based method
			expect(["rule_based"]).toContain(result.method);
			expect(result.matches.length).toBeGreaterThanOrEqual(0);
			expect(result.confidence).toBeGreaterThanOrEqual(0);
		});
	});

	describe("testConnection", () => {
		it("should return true for successful connection", async () => {
			mockOpenAI.chat.completions.create.mockResolvedValue({
				choices: [{ message: { content: "test" } }],
			});

			const result = await matcher.testConnection();

			expect(result).toBe(true);
		});

		it("should return false for failed connection", async () => {
			mockOpenAI.chat.completions.create.mockRejectedValue(
				new Error("Connection failed"),
			);

			const result = await matcher.testConnection();

			expect(result).toBe(false);
		});
	});
});
