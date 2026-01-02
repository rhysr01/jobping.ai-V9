/**
 * Comprehensive tests for Matching Types
 * Tests type definitions, interfaces
 */

import type {
	JobMatch,
	MatchResult,
	MatchScore,
	UserPreferences,
} from "@/Utils/matching/types";

describe("Matching Types", () => {
	it("should have UserPreferences type", () => {
		const prefs: UserPreferences = {
			email: "user@example.com",
			target_cities: ["London"],
		};

		expect(prefs.email).toBe("user@example.com");
	});

	it("should have JobMatch type", () => {
		const match: JobMatch = {
			job: {
				id: "job1",
				title: "Engineer",
				company: "Corp",
				location: "London",
				job_url: "https://example.com",
			},
			match_score: 85,
			match_reason: "Great match",
		};

		expect(match.match_score).toBe(85);
	});

	it("should have MatchResult type", () => {
		const result: MatchResult = {
			matches: [],
			method: "rule_based",
		};

		expect(result.method).toBe("rule_based");
	});

	it("should have MatchScore type", () => {
		const score: MatchScore = {
			overall: 85,
			eligibility: 100,
			location: 80,
			experience: 70,
			skills: 75,
			company: 80,
			timing: 90,
		};

		expect(score.overall).toBe(85);
	});
});
