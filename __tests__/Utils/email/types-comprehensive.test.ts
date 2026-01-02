/**
 * Comprehensive tests for Email Types
 * Tests type definitions, interfaces
 */

import type {
	EmailJobCard,
	EmailPerformanceMetrics,
} from "@/Utils/email/types";

describe("Email Types", () => {
	it("should have EmailJobCard type", () => {
		const jobCard: EmailJobCard = {
			job: {
				id: "job1",
				title: "Engineer",
				company: "Corp",
				location: "London",
				description: "Description",
				job_url: "https://example.com",
				user_email: "user@example.com",
			},
			matchResult: {
				match_score: 85,
				reasoning: "Great match",
			},
			isConfident: true,
			isPromising: true,
			hasManualLocator: false,
			searchHint: "",
		};

		expect(jobCard.job.title).toBe("Engineer");
		expect(jobCard.matchResult.match_score).toBe(85);
	});

	it("should have EmailPerformanceMetrics type", () => {
		const metrics: EmailPerformanceMetrics = {
			totalSent: 100,
			totalFailed: 5,
			averageLatency: 200,
			successRate: 0.95,
		};

		expect(metrics.totalSent).toBe(100);
		expect(metrics.successRate).toBe(0.95);
	});
});
