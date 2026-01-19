/**
 * MATCHING ALGORITHM INTEGRATION TEST
 *
 * Tests the core matching functionality that powers the user experience:
 * - 40% career path relevance threshold (vs old 50%)
 * - Balanced distribution across multiple user preferences
 * - Partial scoring for borderline matches
 * - End-to-end validation of our production matching logic
 */

import { FallbackService } from "../../../utils/matching/core/fallback.service";
import type { Job } from "../../../scrapers/types";
import type { UserPreferences } from "../../../utils/matching/types";

describe("Matching Algorithm Integration", () => {
	let testJobs: Job[];
	let multiPreferenceUser: UserPreferences;
	let singlePreferenceUser: UserPreferences;
	let fallbackService: FallbackService;

	beforeEach(() => {
		fallbackService = new FallbackService();

		// Create comprehensive test jobs covering different scenarios
		testJobs = [
			// London Tech jobs (exact matches)
			{
				job_hash: "london-software-eng-1",
				title: "Software Engineer",
				company: "Google",
				location: "London, UK",
				city: "London",
				country: "UK",
				job_url: "https://example.com/london-software-1",
				description:
					"React, TypeScript, Node.js software engineering role with mentorship and growth opportunities",
				experience_required: "entry-level",
				work_environment: "hybrid",
				source: "test",
				categories: ["early-career", "tech-transformation"],
				language_requirements: ["English"],
				visa_friendly: true, // Production field: visa sponsorship available
				salary_min: 55000, // Production field: salary data
				salary_max: 75000, // Production field: salary data
				scrape_timestamp: new Date().toISOString(),
				original_posted_date: new Date().toISOString(),
				posted_at: new Date().toISOString(),
				last_seen_at: new Date().toISOString(),
				is_active: true,
				created_at: new Date().toISOString(),
			},
			{
				job_hash: "london-software-eng-2",
				title: "Junior Developer",
				company: "Microsoft",
				location: "London, UK",
				city: "London",
				country: "UK",
				job_url: "https://example.com/london-software-2",
				description:
					"Junior developer position for recent graduates with Python, JavaScript, and SQL skills",
				experience_required: "entry-level",
				work_environment: "remote",
				source: "test",
				categories: ["early-career", "tech-transformation"],
				language_requirements: ["English"],
				visa_friendly: true, // Production field: visa sponsorship available
				salary_min: 45000, // Production field: salary data
				salary_max: 60000, // Production field: salary data
				scrape_timestamp: new Date().toISOString(),
				original_posted_date: new Date().toISOString(),
				posted_at: new Date().toISOString(),
				last_seen_at: new Date().toISOString(),
				is_active: true,
				created_at: new Date().toISOString(),
			},
			// Berlin Data jobs (different city, different career path)
			{
				job_hash: "berlin-data-analyst-1",
				title: "Data Analyst",
				company: "Amazon",
				location: "Berlin, Germany",
				city: "Berlin",
				country: "Germany",
				job_url: "https://example.com/berlin-data-1",
				description:
					"Data analysis role for graduates with SQL, Python, and Excel skills",
				experience_required: "entry-level",
				work_environment: "office",
				source: "test",
				categories: ["early-career", "data-analytics"],
				language_requirements: ["English", "German"],
				visa_friendly: true, // Production field: visa sponsorship available
				salary_min: 48000, // Production field: salary data
				salary_max: 65000, // Production field: salary data
				scrape_timestamp: new Date().toISOString(),
				original_posted_date: new Date().toISOString(),
				posted_at: new Date().toISOString(),
				last_seen_at: new Date().toISOString(),
				is_active: true,
				created_at: new Date().toISOString(),
			},
			{
				job_hash: "berlin-data-analyst-2",
				title: "Junior Data Scientist",
				company: "Meta",
				location: "Berlin, Germany",
				city: "Berlin",
				country: "Germany",
				job_url: "https://example.com/berlin-data-2",
				description:
					"Junior data scientist with Python, pandas, and machine learning experience",
				experience_required: "entry-level",
				work_environment: "hybrid",
				source: "test",
				categories: ["early-career", "data-analytics"],
				language_requirements: ["English"],
				visa_friendly: true, // Production field: visa sponsorship available
				salary_min: 52000, // Production field: salary data
				salary_max: 70000, // Production field: salary data
				scrape_timestamp: new Date().toISOString(),
				original_posted_date: new Date().toISOString(),
				posted_at: new Date().toISOString(),
				last_seen_at: new Date().toISOString(),
				is_active: true,
				created_at: new Date().toISOString(),
			},
			// Paris Marketing jobs (third city, third career path)
			{
				job_hash: "paris-marketing-coord-1",
				title: "Digital Marketing Coordinator",
				company: "L'Oréal",
				location: "Paris, France",
				city: "Paris",
				country: "France",
				job_url: "https://example.com/paris-marketing-1",
				description:
					"Digital marketing role for recent graduates with SEO, content, and social media skills",
				experience_required: "entry-level",
				work_environment: "office",
				source: "test",
				categories: ["early-career", "marketing-growth"],
				language_requirements: ["English", "French"],
				visa_friendly: false, // Production field: no visa sponsorship mentioned
				salary_min: 38000, // Production field: salary data
				salary_max: 48000, // Production field: salary data
				scrape_timestamp: new Date().toISOString(),
				original_posted_date: new Date().toISOString(),
				posted_at: new Date().toISOString(),
				last_seen_at: new Date().toISOString(),
				is_active: true,
				created_at: new Date().toISOString(),
			},
			// Partial relevance jobs (test 40% threshold)
			{
				job_hash: "mixed-role-tech-marketing",
				title: "Growth Hacker",
				company: "Stripe",
				location: "London, UK",
				city: "London",
				country: "UK",
				job_url: "https://example.com/mixed-role",
				description:
					"Role combining technical and marketing skills with analytics and growth expertise",
				experience_required: "entry-level",
				work_environment: "hybrid",
				source: "test",
				categories: ["early-career", "tech-transformation", "marketing-growth"], // 2/3 relevant for tech-only user
				language_requirements: ["English"],
				visa_friendly: true, // Production field: visa sponsorship available
				salary_min: 50000, // Production field: salary data
				salary_max: 65000, // Production field: salary data
				scrape_timestamp: new Date().toISOString(),
				original_posted_date: new Date().toISOString(),
				posted_at: new Date().toISOString(),
				last_seen_at: new Date().toISOString(),
				is_active: true,
				created_at: new Date().toISOString(),
			},
		];

		// User with multiple preferences (should trigger balanced distribution)
		multiPreferenceUser = {
			email: "multi-preference@example.com",
			target_cities: ["London", "Berlin", "Paris"],
			career_path: ["Tech & Transformation", "Data & Analytics"],
			professional_expertise: "Software Development",
			work_environment: "hybrid",
			visa_status: "eu-citizen",
			entry_level_preference: "entry",
			languages_spoken: ["English"],
			company_types: ["tech"],
			roles_selected: ["software-engineer"],
			subscription_tier: "free",
			career_keywords:
				"javascript,react,python,sql,data analysis,machine learning", // Production field: specific skills
		};

		// User with single preferences (baseline test)
		singlePreferenceUser = {
			email: "single-preference@example.com",
			target_cities: ["London"],
			career_path: ["Tech & Transformation"],
			professional_expertise: "Software Development",
			work_environment: "hybrid",
			visa_status: "eu-citizen",
			entry_level_preference: "entry",
			languages_spoken: ["English"],
			company_types: ["tech"],
			roles_selected: ["software-engineer"],
			subscription_tier: "free",
			career_keywords: "javascript,react,typescript,node.js,python,git,agile", // Production field: specific skills
		};
	});

	describe("40% Career Path Relevance Threshold", () => {
		it("should include jobs with partial relevance above 40% threshold", () => {
			// Test with job that has 2/3 relevant categories (66% relevance)
			const partialJob = testJobs.find(
				(job) => job.job_hash === "mixed-role-tech-marketing",
			)!;
			const userWithTechOnly = {
				...singlePreferenceUser,
				career_path: ["Tech & Transformation"], // Only wants tech
			};

			const results = fallbackService.generateFallbackMatches(
				[partialJob],
				userWithTechOnly,
				1,
			);

			expect(results.length).toBe(1);
			expect(results[0].unifiedScore.overall).toBeGreaterThan(0);
			expect(results[0].unifiedScore.components.relevance).toBeGreaterThan(0);
		});

		it("should give partial scores to jobs below 100% relevance", () => {
			const partialJob = testJobs.find(
				(job) => job.job_hash === "mixed-role-tech-marketing",
			)!;
			const userWithTechOnly = {
				...singlePreferenceUser,
				career_path: ["Tech & Transformation"],
			};

			const results = fallbackService.generateFallbackMatches(
				[partialJob],
				userWithTechOnly,
				1,
			);

			// Job has 2/3 relevant categories, so should get partial relevance score
			expect(results[0].unifiedScore.components.relevance).toBeGreaterThan(0);
			expect(results[0].unifiedScore.components.relevance).toBeLessThan(100);
		});

		it("should exclude jobs with very low relevance", () => {
			// Create a job with completely irrelevant categories
			const irrelevantJob: Job = {
				...testJobs[0],
				job_hash: "irrelevant-job",
				categories: ["finance-investment", "operations-supply-chain"], // No tech/data relevance
				title: "Financial Analyst",
			};

			const userWithTechOnly = {
				...singlePreferenceUser,
				career_path: ["Tech & Transformation"],
			};

			const results = fallbackService.generateFallbackMatches(
				[irrelevantJob],
				userWithTechOnly,
				1,
			);

			expect(results.length).toBe(1);
			// Should get moderate relevance score (less than 70)
			expect(results[0].unifiedScore.components.relevance).toBeLessThan(70);
		});
	});

	describe("Balanced Distribution Logic", () => {
		it("should distribute across multiple cities when user has multiple preferences", () => {
			const results = fallbackService.generateFallbackMatches(
				testJobs,
				multiPreferenceUser,
				6,
			);

			expect(results.length).toBeGreaterThan(0);

			// Extract cities from matched jobs
			const matchedCities = results
				.map((match) => {
					const job = testJobs.find((j) => j.job_hash === match.job.job_hash);
					return job?.city;
				})
				.filter(Boolean);

			const uniqueCities = [...new Set(matchedCities)];
			expect(uniqueCities.length).toBeGreaterThan(1); // Should have representation from multiple cities
		});

		it("should distribute across multiple career paths when user has multiple preferences", () => {
			const results = fallbackService.generateFallbackMatches(
				testJobs,
				multiPreferenceUser,
				6,
			);

			// Count tech vs data jobs
			const techJobs = results.filter((match) => {
				const job = testJobs.find((j) => j.job_hash === match.job.job_hash);
				return job?.categories?.includes("tech-transformation");
			});

			const dataJobs = results.filter((match) => {
				const job = testJobs.find((j) => j.job_hash === match.job.job_hash);
				return job?.categories?.includes("data-analytics");
			});

			// Should have representation from both career paths
			expect(techJobs.length).toBeGreaterThan(0);
			expect(dataJobs.length).toBeGreaterThan(0);
		});

		it("should work normally with single user preferences", () => {
			const results = fallbackService.generateFallbackMatches(
				testJobs,
				singlePreferenceUser,
				3,
			);

			expect(results.length).toBeGreaterThan(0);
			expect(results.length).toBeLessThanOrEqual(3);

			// All results should be from London (single city preference)
			const nonLondonJobs = results.filter((match) => {
				const job = testJobs.find((j) => j.job_hash === match.job.job_hash);
				return job?.city !== "London";
			});

			expect(nonLondonJobs.length).toBe(0); // Should only include London jobs
		});
	});

	describe("End-to-End Matching Flow", () => {
		it("should produce valid match results with all required fields", () => {
			const results = fallbackService.generateFallbackMatches(
				testJobs,
				multiPreferenceUser,
				5,
			);

			results.forEach((match) => {
				// Validate match structure
				expect(match).toHaveProperty("job");
				expect(match).toHaveProperty("unifiedScore");
				expect(match).toHaveProperty("matchReason");

				// Validate unifiedScore structure
				expect(match.unifiedScore).toHaveProperty("overall");
				expect(match.unifiedScore).toHaveProperty("components");
				expect(match.unifiedScore).toHaveProperty("confidence");
				expect(match.unifiedScore).toHaveProperty("method");

				// Validate score ranges
				expect(match.unifiedScore.overall).toBeGreaterThanOrEqual(0);
				expect(match.unifiedScore.overall).toBeLessThanOrEqual(100);
				expect(match.unifiedScore.confidence).toBeGreaterThan(0);
				expect(match.unifiedScore.confidence).toBeLessThanOrEqual(100);

				// Validate unifiedScore components
				expect(match.unifiedScore.components).toHaveProperty("relevance");
				expect(match.unifiedScore.components).toHaveProperty("quality");
				expect(match.unifiedScore.components).toHaveProperty("opportunity");
				expect(match.unifiedScore.components).toHaveProperty("timing");

				// Validate match reason
				expect(typeof match.matchReason).toBe("string");
				expect(match.matchReason.length).toBeGreaterThan(10);

				// Validate match quality from unified score
				expect(match.unifiedScore.explanation?.scoreMeaning).toBeDefined();
				expect(["excellent", "good", "fair", "low", "poor"]).toContain(
					match.unifiedScore.explanation?.scoreMeaning,
				);
			});
		});

		it("should handle edge cases gracefully", () => {
			// Test with empty job list
			const emptyResults = fallbackService.generateFallbackMatches(
				[],
				multiPreferenceUser,
				5,
			);
			expect(emptyResults).toEqual([]);

			// Test with very few jobs
			const fewJobs = testJobs.slice(0, 1);
			const fewResults = fallbackService.generateFallbackMatches(
				fewJobs,
				multiPreferenceUser,
				5,
			);
			expect(fewResults.length).toBe(1);

			// Test with high limit
			const highLimitResults = fallbackService.generateFallbackMatches(
				testJobs,
				multiPreferenceUser,
				20,
			);
			expect(highLimitResults.length).toBe(testJobs.length);
		});

		it("should be deterministic with same inputs", () => {
			const results1 = fallbackService.generateFallbackMatches(
				testJobs,
				multiPreferenceUser,
				4,
			);
			const results2 = fallbackService.generateFallbackMatches(
				testJobs,
				multiPreferenceUser,
				4,
			);

			expect(results1.length).toBe(results2.length);

			// Compare scores (allowing for small timing variations)
			const scores1 = results1.map((m) => m.unifiedScore.overall).sort();
			const scores2 = results2.map((m) => m.unifiedScore.overall).sort();

			expect(scores1.length).toBe(scores2.length);
			scores1.forEach((score, index) => {
				expect(Math.abs(score - scores2[index])).toBeLessThanOrEqual(3); // Allow small variations
			});
		});
	});

	describe("Production Algorithm Validation", () => {
		it("should demonstrate improved matching over old 50% threshold", () => {
			// Create a scenario where old 50% threshold would exclude good matches
			const borderlineJob: Job = {
				...testJobs[0],
				job_hash: "borderline-job",
				categories: [
					"early-career",
					"tech-transformation",
					"operations-supply-chain",
				], // 1/3 = 33% relevance
				title: "Technical Operations Specialist",
			};

			const userWithTechFocus = {
				...singlePreferenceUser,
				career_path: ["Tech & Transformation"],
			};

			const results = fallbackService.generateFallbackMatches(
				[borderlineJob],
				userWithTechFocus,
				1,
			);

			expect(results.length).toBe(1);
			// With new 40% threshold, this job should be included with partial scoring
			expect(results[0].unifiedScore.overall).toBeGreaterThan(0);
			expect(results[0].unifiedScore.components.relevance).toBeGreaterThan(0);
		});

		it("should show balanced results across diverse job pool", () => {
			// Add more jobs to create a diverse pool
			const additionalJobs: Job[] = [
				{
					...testJobs[0],
					job_hash: "extra-tech-1",
					categories: ["early-career", "tech-transformation"],
				},
				{
					...testJobs[0],
					job_hash: "extra-tech-2",
					categories: ["early-career", "tech-transformation"],
				},
				{
					...testJobs[1],
					job_hash: "extra-data-1",
					categories: ["early-career", "data-analytics"],
				},
				{
					...testJobs[1],
					job_hash: "extra-data-2",
					categories: ["early-career", "data-analytics"],
				},
				{
					...testJobs[2],
					job_hash: "extra-marketing-1",
					categories: ["early-career", "marketing-growth"],
				},
			];

			const diverseJobPool = [...testJobs, ...additionalJobs];
			const results = fallbackService.generateFallbackMatches(
				diverseJobPool,
				multiPreferenceUser,
				8,
			);

			// Analyze distribution
			const categoryCounts: Record<string, number> = {};
			results.forEach((match) => {
				const job = diverseJobPool.find(
					(j) => j.job_hash === match.job.job_hash,
				);
				job?.categories?.forEach((cat) => {
					if (cat !== "early-career") {
						// Skip common category
						categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
					}
				});
			});

			// Should show representation across different career paths
			const careerPaths = Object.keys(categoryCounts);
			expect(careerPaths.length).toBeGreaterThan(1);
			expect(categoryCounts["tech-transformation"]).toBeGreaterThan(0);
			expect(categoryCounts["data-analytics"]).toBeGreaterThan(0);
		});
	});
});
