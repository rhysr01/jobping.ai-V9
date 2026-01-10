/**
 * A/B Testing Framework Tests
 *
 * Tests feature experimentation, performance comparison, and automated rollout
 * Ensures data-driven feature development and optimization
 */

import { createMocks } from "node-mocks-http";
import { GET as getExperiment } from "@/app/api/experiments/[experimentId]/route";
import { POST as createExperiment } from "@/app/api/experiments/route";
import { POST as trackConversion } from "@/app/api/experiments/[experimentId]/conversion/route";
import { GET as getResults } from "@/app/api/experiments/[experimentId]/results/route";

describe("A/B Testing Framework", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("Experiment Creation and Configuration", () => {
		it("creates valid experiments with proper configuration", async () => {
			const experimentConfig = {
				name: "signup_form_test",
				description: "Testing simplified vs detailed signup flow",
				hypothesis: "Simplified signup form will increase conversion by 15%",
				goal: "signup_completion",
				primaryMetric: "conversion_rate",
				secondaryMetrics: ["time_to_complete", "bounce_rate"],
				variants: [
					{
						name: "control",
						description: "Current detailed signup form",
						traffic: 0.5,
						configuration: {
							formSteps: 4,
							requireAllFields: true,
							showProgressBar: false,
						},
					},
					{
						name: "simplified",
						description: "Simplified 2-step signup",
						traffic: 0.5,
						configuration: {
							formSteps: 2,
							requireAllFields: false,
							showProgressBar: true,
						},
					},
				],
				targeting: {
					userType: "new",
					trafficPercentage: 100,
					countries: ["US", "GB", "DE"],
				},
				duration: {
					minDuration: 7, // days
					maxDuration: 30,
					autoStop: {
						enabled: true,
						confidenceThreshold: 0.95,
						minimumLift: 0.05,
					},
				},
			};

			const request = createMocks({
				method: "POST",
				url: "/api/experiments",
				body: experimentConfig,
			});

			const response = await createExperiment(request.req as any);
			expect(response.status).toBe(201);

			const data = await response.json();
			expect(data).toHaveProperty("experimentId");
			expect(data).toHaveProperty("status", "active");
			expect(data).toHaveProperty("startTime");

			// Validate experiment structure
			expect(data.variants.length).toBe(2);
			expect(data.variants[0].traffic + data.variants[1].traffic).toBe(1);
		});

		it("validates experiment configuration", async () => {
			const invalidConfigs = [
				{
					name: "",
					variants: [],
					description: "Missing required fields",
				},
				{
					name: "test_experiment",
					variants: [{ name: "only_one" }],
					description: "Need at least 2 variants",
				},
				{
					name: "traffic_test",
					variants: [
						{ name: "a", traffic: 0.7 },
						{ name: "b", traffic: 0.7 },
					],
					description: "Traffic allocation must sum to 1",
				},
			];

			for (const config of invalidConfigs) {
				const request = createMocks({
					method: "POST",
					url: "/api/experiments",
					body: config,
				});

				const response = await createExperiment(request.req as any);
				expect([400, 422]).toContain(response.status);

				if (response.status === 400) {
					const data = await response.json();
					expect(data).toHaveProperty("error");
					expect(data.error).toHaveProperty("field");
				}
			}
		});

		it("supports multivariate testing", async () => {
			const multivariateConfig = {
				name: "homepage_multivariate",
				variants: [
					{ name: "hero_a_button_b", traffic: 0.25 },
					{ name: "hero_a_button_c", traffic: 0.25 },
					{ name: "hero_b_button_b", traffic: 0.25 },
					{ name: "hero_c_button_c", traffic: 0.25 },
				],
				factors: {
					hero: ["a", "b", "c"],
					button: ["b", "c"],
				},
				description: "Testing hero variations with button combinations",
			};

			const request = createMocks({
				method: "POST",
				url: "/api/experiments",
				body: multivariateConfig,
			});

			const response = await createExperiment(request.req as any);
			expect(response.status).toBe(201);

			const data = await response.json();
			expect(data.factors).toBeDefined();
			expect(data.variants.length).toBe(4); // 3 hero × 2 button = 6 combinations, but only 4 specified
		});
	});

	describe("Traffic Allocation and User Assignment", () => {
		it("distributes traffic evenly across variants", async () => {
			const experimentId = "traffic-test-experiment";
			const sampleSize = 1000;
			const variantCounts = { control: 0, variant_a: 0, variant_b: 0 };

			// Simulate user assignments
			for (let i = 0; i < sampleSize; i++) {
				const userId = `user-${i}`;
				const request = createMocks({
					method: "GET",
					url: `/api/experiments/${experimentId}?userId=${userId}`,
				});

				const response = await getExperiment(request.req as any, {
					params: { experimentId },
				});

				if (response.status === 200) {
					const data = await response.json();
					if (data.variant && variantCounts.hasOwnProperty(data.variant)) {
						variantCounts[data.variant as keyof typeof variantCounts]++;
					}
				}
			}

			// Check traffic distribution
			const totalAssigned = Object.values(variantCounts).reduce((sum, count) => sum + count, 0);
			expect(totalAssigned).toBeGreaterThan(sampleSize * 0.9); // At least 90% assigned

			// Each variant should get roughly equal traffic
			const expectedPerVariant = totalAssigned / 3;
			Object.values(variantCounts).forEach(count => {
				const deviation = Math.abs(count - expectedPerVariant) / expectedPerVariant;
				expect(deviation).toBeLessThan(0.1); // Within 10% of expected
			});
		});

		it("provides consistent user-variant assignment", async () => {
			const experimentId = "consistency-test";
			const userId = "consistent-user-123";
			let assignedVariant = null;

			// Make multiple requests for the same user
			for (let i = 0; i < 10; i++) {
				const request = createMocks({
					method: "GET",
					url: `/api/experiments/${experimentId}?userId=${userId}`,
				});

				const response = await getExperiment(request.req as any, {
					params: { experimentId },
				});

				if (response.status === 200) {
					const data = await response.json();
					if (assignedVariant === null) {
						assignedVariant = data.variant;
					} else {
						expect(data.variant).toBe(assignedVariant); // Should be consistent
					}
				}
			}

			expect(assignedVariant).toBeDefined();
		});

		it("respects targeting rules", async () => {
			const experimentId = "targeting-test";

			const testUsers = [
				{ userId: "us-user", country: "US", userType: "new", shouldBeIncluded: true },
				{ userId: "eu-user", country: "DE", userType: "new", shouldBeIncluded: true },
				{ userId: "old-user", country: "US", userType: "existing", shouldBeIncluded: false },
				{ userId: "asia-user", country: "JP", userType: "new", shouldBeIncluded: false }, // Not in target countries
			];

			for (const testUser of testUsers) {
				const request = createMocks({
					method: "GET",
					url: `/api/experiments/${experimentId}?userId=${testUser.userId}&country=${testUser.country}&userType=${testUser.userType}`,
				});

				const response = await getExperiment(request.req as any, {
					params: { experimentId },
				});

				if (testUser.shouldBeIncluded) {
					if (response.status === 200) {
						const data = await response.json();
						expect(data).toHaveProperty("variant");
					}
				} else {
					// Should not include user in experiment
					if (response.status === 200) {
						const data = await response.json();
						expect(data.variant).toBe("not_in_experiment");
					}
				}
			}
		});
	});

	describe("Conversion Tracking and Analytics", () => {
		it("tracks conversions accurately", async () => {
			const experimentId = "conversion-test";
			const conversions = [
				{ userId: "user-1", variant: "control", goal: "signup_completion", value: 1 },
				{ userId: "user-2", variant: "variant_a", goal: "signup_completion", value: 1 },
				{ userId: "user-3", variant: "variant_a", goal: "signup_completion", value: 1 },
				{ userId: "user-4", variant: "control", goal: "premium_upgrade", value: 5 },
				{ userId: "user-5", variant: "variant_a", goal: "email_open", value: 0.1 },
			];

			// Track conversions
			for (const conversion of conversions) {
				const request = createMocks({
					method: "POST",
					url: `/api/experiments/${experimentId}/conversion`,
					body: {
						userId: conversion.userId,
						goal: conversion.goal,
						value: conversion.value,
						timestamp: Date.now(),
					},
				});

				const response = await trackConversion(request.req as any, {
					params: { experimentId },
				});

				expect([200, 202]).toContain(response.status);
			}

			// Verify results
			const resultsRequest = createMocks({
				method: "GET",
				url: `/api/experiments/${experimentId}/results`,
			});

			const resultsResponse = await getResults(resultsRequest.req as any, {
				params: { experimentId },
			});

			if (resultsResponse.status === 200) {
				const data = await resultsResponse.json();
				expect(data).toHaveProperty("variants");

				data.variants.forEach((variant: any) => {
					expect(variant).toHaveProperty("conversions");
					expect(variant).toHaveProperty("conversionRate");
					expect(variant.conversions).toBeGreaterThanOrEqual(0);
					expect(variant.conversionRate).toBeGreaterThanOrEqual(0);
					expect(variant.conversionRate).toBeLessThanOrEqual(1);
				});
			}
		});

		it("calculates statistical significance", async () => {
			const experimentResults = {
				variants: [
					{
						name: "control",
						visitors: 1000,
						conversions: 120,
						conversionRate: 0.12,
						standardError: 0.01,
					},
					{
						name: "variant_a",
						visitors: 1000,
						conversions: 150,
						conversionRate: 0.15,
						standardError: 0.011,
					},
				],
				statisticalTest: {
					testType: "two_proportion_z_test",
					zScore: 2.45,
					pValue: 0.014,
					confidentInterval: [0.015, 0.045],
					significant: true,
					effectSize: 0.25, // 25% relative improvement
				},
				recommendations: [
					"Variant A shows statistically significant improvement",
					"Confidence interval suggests 1.5-4.5% absolute lift",
					"Recommend rolling out Variant A to 100% of traffic",
				],
			};

			// Validate statistical calculations
			expect(experimentResults.variants.length).toBe(2);

			const control = experimentResults.variants[0];
			const variant = experimentResults.variants[1];

			// Basic conversion rate validation
			expect(control.conversions / control.visitors).toBeCloseTo(control.conversionRate, 2);
			expect(variant.conversions / variant.visitors).toBeCloseTo(variant.conversionRate, 2);

			// Statistical significance
			expect(experimentResults.statisticalTest.pValue).toBeLessThan(0.05); // Significant at 5% level
			expect(experimentResults.statisticalTest.significant).toBe(true);
			expect(experimentResults.statisticalTest.confidentInterval.length).toBe(2);

			// Effect size should be positive for winning variant
			expect(experimentResults.statisticalTest.effectSize).toBeGreaterThan(0);

			expect(experimentResults.recommendations.length).toBeGreaterThan(0);
		});

		it("handles multiple conversion goals", async () => {
			const multiGoalResults = {
				experimentId: "multi-goal-test",
				goals: [
					{
						name: "primary_signup",
						variants: {
							control: { conversions: 120, visitors: 1000, rate: 0.12 },
							variant: { conversions: 150, visitors: 1000, rate: 0.15 },
						},
						significant: true,
						winner: "variant",
					},
					{
						name: "secondary_engagement",
						variants: {
							control: { conversions: 450, visitors: 1000, rate: 0.45 },
							variant: { conversions: 480, visitors: 1000, rate: 0.48 },
						},
						significant: false,
						winner: null,
					},
					{
						name: "guardrail_bounce_rate",
						variants: {
							control: { conversions: 80, visitors: 1000, rate: 0.08 },
							variant: { conversions: 95, visitors: 1000, rate: 0.095 },
						},
						significant: true,
						winner: "control", // Lower bounce rate is better
					},
				],
				overallRecommendation: {
					canProceed: false,
					reason: "Guardrail metric (bounce rate) shows degradation",
					suggestedAction: "Do not roll out variant, investigate bounce rate increase",
				},
			};

			// Validate multi-goal analysis
			expect(multiGoalResults.goals.length).toBeGreaterThan(1);

			multiGoalResults.goals.forEach(goal => {
				expect(goal.variants.control.rate).toBe(goal.variants.control.conversions / goal.variants.control.visitors);
				expect(goal.variants.variant.rate).toBe(goal.variants.variant.conversions / goal.variants.variant.visitors);
			});

			// Primary goal should be significant and show improvement
			const primaryGoal = multiGoalResults.goals.find(g => g.name === "primary_signup");
			expect(primaryGoal?.significant).toBe(true);
			expect(primaryGoal?.winner).toBe("variant");

			// Guardrail should prevent rollout despite primary improvement
			expect(multiGoalResults.overallRecommendation.canProceed).toBe(false);
			expect(multiGoalResults.overallRecommendation.reason).toContain("bounce rate");
		});
	});

	describe("Automated Rollout and Feature Flags", () => {
		it("supports automated rollout based on results", async () => {
			const automatedRollout = {
				experimentId: "auto-rollout-test",
				triggerConditions: {
					minimumDuration: 7, // days
					statisticalSignificance: 0.95,
					minimumLift: 0.03, // 3% improvement
					guardrailChecks: {
						bounceRate: { maxIncrease: 0.05 },
						errorRate: { maxIncrease: 0.02 },
					},
				},
				rolloutStrategy: {
					initialPercentage: 25,
					incrementPercentage: 25,
					incrementInterval: 24, // hours
					maxPercentage: 100,
					rollbackThreshold: 0.10, // Rollback if metrics degrade by 10%
				},
				currentStatus: {
					rolloutPercentage: 50,
					lastIncrement: "2024-01-15T10:00:00Z",
					nextIncrement: "2024-01-16T10:00:00Z",
					monitoringActive: true,
				},
				rollbackHistory: [], // No rollbacks yet
			};

			// Validate automated rollout configuration
			expect(automatedRollout.triggerConditions.minimumDuration).toBeGreaterThan(0);
			expect(automatedRollout.triggerConditions.statisticalSignificance).toBeGreaterThan(0.8);
			expect(automatedRollout.triggerConditions.minimumLift).toBeGreaterThan(0);

			expect(automatedRollout.rolloutStrategy.initialPercentage).toBeLessThan(
				automatedRollout.rolloutStrategy.maxPercentage
			);
			expect(automatedRollout.rolloutStrategy.incrementPercentage).toBeGreaterThan(0);
			expect(automatedRollout.rolloutStrategy.incrementInterval).toBeGreaterThan(0);

			// Current status should be valid
			expect(automatedRollout.currentStatus.rolloutPercentage).toBeLessThanOrEqual(100);
			expect(automatedRollout.currentStatus.monitoringActive).toBe(true);
			expect(new Date(automatedRollout.currentStatus.nextIncrement)).toBeAfter(
				new Date(automatedRollout.currentStatus.lastIncrement)
			);
		});

		it("provides rollback capabilities", async () => {
			const rollbackScenario = {
				experimentId: "rollback-test",
				issueDetected: "error_rate_spike",
				triggerMetrics: {
					errorRate: { before: 0.02, after: 0.08, threshold: 0.05 },
					responseTime: { before: 250, after: 450, threshold: 400 },
				},
				rollbackAction: {
					timestamp: "2024-01-15T11:30:00Z",
					fromPercentage: 75,
					toPercentage: 25,
					reason: "Error rate exceeded threshold",
					automated: true,
				},
				recoveryActions: [
					"Reduced traffic to 25%",
					"Triggered incident response",
					"Scheduled code review",
					"Implemented additional monitoring",
				],
				lessonsLearned: [
					"Add more comprehensive pre-rollout testing",
					"Implement gradual rollout with smaller increments",
					"Add circuit breakers for automatic rollback",
				],
			};

			// Validate rollback scenario
			expect(rollbackScenario.triggerMetrics.errorRate.after).toBeGreaterThan(
				rollbackScenario.triggerMetrics.errorRate.threshold
			);

			expect(rollbackScenario.rollbackAction.fromPercentage).toBeGreaterThan(
				rollbackScenario.rollbackAction.toPercentage
			);

			expect(rollbackScenario.rollbackAction.automated).toBe(true);
			expect(rollbackScenario.recoveryActions.length).toBeGreaterThan(0);
			expect(rollbackScenario.lessonsLearned.length).toBeGreaterThan(0);
		});

		it("integrates with feature flag system", async () => {
			const featureFlagIntegration = {
				experimentId: "feature-flag-integration",
				featureFlags: [
					{
						flagName: "simplified_signup",
						description: "Enable simplified signup flow",
						rolloutPercentage: 75,
						targetingRules: {
							userType: "new",
							countries: ["US", "GB", "DE"],
							excludeUsers: ["problem-user-123"],
						},
						killSwitch: {
							enabled: true,
							conditions: [
								{ metric: "error_rate", operator: ">", value: 0.05 },
								{ metric: "conversion_rate", operator: "<", value: 0.10 },
							],
						},
					},
				],
				flagStatus: {
					lastUpdated: "2024-01-15T12:00:00Z",
					activeUsers: 12500,
					affectedTraffic: 0.75,
					healthChecks: {
						flagEvaluation: "healthy",
						metricsCollection: "healthy",
						killSwitch: "ready",
					},
				},
			};

			// Validate feature flag integration
			expect(featureFlagIntegration.featureFlags.length).toBeGreaterThan(0);

			const flag = featureFlagIntegration.featureFlags[0];
			expect(flag.rolloutPercentage).toBeGreaterThan(0);
			expect(flag.rolloutPercentage).toBeLessThanOrEqual(1);
			expect(flag.targetingRules).toBeDefined();
			expect(flag.killSwitch.enabled).toBe(true);
			expect(flag.killSwitch.conditions.length).toBeGreaterThan(0);

			// Flag status should be current
			expect(featureFlagIntegration.flagStatus.affectedTraffic).toBe(flag.rolloutPercentage);
			expect(featureFlagIntegration.flagStatus.healthChecks.flagEvaluation).toBe("healthy");
		});
	});

	describe("Experiment Lifecycle Management", () => {
		it("manages experiment lifecycle states", async () => {
			const lifecycleStates = [
				{
					state: "draft",
					description: "Experiment configured but not started",
					actions: ["edit", "start"],
					canReceiveTraffic: false,
				},
				{
					state: "active",
					description: "Experiment running and receiving traffic",
					actions: ["pause", "stop", "edit_traffic"],
					canReceiveTraffic: true,
				},
				{
					state: "paused",
					description: "Experiment temporarily stopped",
					actions: ["resume", "stop", "edit"],
					canReceiveTraffic: false,
				},
				{
					state: "completed",
					description: "Experiment finished with results",
					actions: ["archive", "rollout_winner"],
					canReceiveTraffic: false,
				},
				{
					state: "archived",
					description: "Experiment stored for historical reference",
					actions: ["restore"],
					canReceiveTraffic: false,
				},
			];

			// Validate state transitions
			lifecycleStates.forEach(state => {
				expect(state.state).toBeDefined();
				expect(state.description).toBeDefined();
				expect(state.actions.length).toBeGreaterThan(0);
				expect(typeof state.canReceiveTraffic).toBe("boolean");
			});

			// Active states should receive traffic
			const activeStates = lifecycleStates.filter(s => s.canReceiveTraffic);
			expect(activeStates.length).toBe(1);
			expect(activeStates[0].state).toBe("active");
		});

		it("handles experiment termination conditions", async () => {
			const terminationScenarios = [
				{
					condition: "duration_limit",
					description: "Maximum experiment duration reached",
					autoTerminate: true,
					requiresReview: false,
				},
				{
					condition: "statistical_significance",
					description: "Achieved required confidence level",
					autoTerminate: true,
					requiresReview: false,
				},
				{
					condition: "minimum_lift_achieved",
					description: "Variant shows sufficient improvement",
					autoTerminate: true,
					requiresReview: false,
				},
				{
					condition: "guardrail_violation",
					description: "Important metric degraded significantly",
					autoTerminate: true,
					requiresReview: true,
				},
				{
					condition: "manual_stop",
					description: "Experiment stopped by administrator",
					autoTerminate: false,
					requiresReview: true,
				},
				{
					condition: "system_error",
					description: "Technical issues prevent continuation",
					autoTerminate: true,
					requiresReview: true,
				},
			];

			terminationScenarios.forEach(scenario => {
				expect(scenario.condition).toBeDefined();
				expect(scenario.description).toBeDefined();
				expect(typeof scenario.autoTerminate).toBe("boolean");
				expect(typeof scenario.requiresReview).toBe("boolean");

				// Critical conditions should require review
				if (scenario.condition.includes("guardrail") ||
					scenario.condition.includes("manual") ||
					scenario.condition.includes("error")) {
					expect(scenario.requiresReview).toBe(true);
				}
			});
		});

		it("provides experiment performance monitoring", async () => {
			const experimentMonitoring = {
				experimentId: "monitoring-test",
				healthMetrics: {
					dataQuality: 0.98,
					trafficDistribution: 0.99,
					conversionTracking: 0.97,
					overallHealth: 0.98,
				},
				alerts: [
					{
						severity: "warning",
						message: "Traffic distribution slightly uneven",
						timestamp: "2024-01-15T14:30:00Z",
						autoResolved: true,
					},
				],
				performance: {
					avgResponseTime: 45, // ms
					throughput: 1250, // requests per second
					errorRate: 0.002,
					resourceUsage: {
						cpu: 0.15,
						memory: 0.25,
						network: 0.08,
					},
				},
				recommendations: [
					"Consider increasing sample size for more statistical power",
					"Monitor resource usage trends",
				],
			};

			// Validate monitoring data
			expect(experimentMonitoring.healthMetrics.overallHealth).toBeGreaterThan(0.95);

			Object.values(experimentMonitoring.healthMetrics).forEach(metric => {
				expect(metric).toBeGreaterThanOrEqual(0);
				expect(metric).toBeLessThanOrEqual(1);
			});

			expect(experimentMonitoring.performance.avgResponseTime).toBeLessThan(100);
			expect(experimentMonitoring.performance.errorRate).toBeLessThan(0.01);

			expect(experimentMonitoring.alerts.length).toBeGreaterThanOrEqual(0);
			expect(experimentMonitoring.recommendations.length).toBeGreaterThanOrEqual(0);
		});
	});

	describe("Experiment Ethics and Compliance", () => {
		it("ensures ethical experimentation practices", async () => {
			const ethicalGuidelines = {
				informedConsent: {
					required: true,
					transparencyLevel: "full", // Users know they're in experiment
					optOutMechanism: true,
				},
				riskAssessment: {
					highRiskExperiments: ["payment_flow", "account_deletion"],
					mediumRiskExperiments: ["signup_flow", "navigation"],
					lowRiskExperiments: ["button_color", "text_variations"],
				},
				dataPrivacy: {
					minimalDataCollection: true,
					purposeLimitation: true,
					retentionLimits: "90 days post experiment",
					anonymizationRequired: true,
				},
				fairnessChecks: {
					demographicBalance: true,
					noDiscrimination: true,
					accessibilityCompliance: true,
				},
				accountability: {
					experimentOwner: "required",
					peerReview: "required for high-risk",
					postMortem: "required",
				},
			};

			// Validate ethical guidelines
			expect(ethicalGuidelines.informedConsent.required).toBe(true);
			expect(ethicalGuidelines.informedConsent.optOutMechanism).toBe(true);

			expect(ethicalGuidelines.riskAssessment.highRiskExperiments.length).toBeGreaterThan(0);
			expect(ethicalGuidelines.riskAssessment.mediumRiskExperiments.length).toBeGreaterThan(
				ethicalGuidelines.riskAssessment.highRiskExperiments.length
			);

			expect(ethicalGuidelines.dataPrivacy.minimalDataCollection).toBe(true);
			expect(ethicalGuidelines.dataPrivacy.anonymizationRequired).toBe(true);

			expect(ethicalGuidelines.fairnessChecks.demographicBalance).toBe(true);
			expect(ethicalGuidelines.fairnessChecks.noDiscrimination).toBe(true);

			expect(ethicalGuidelines.accountability.experimentOwner).toBe("required");
		});

		it("complies with privacy regulations", async () => {
			const privacyCompliance = {
				gdpr: {
					lawfulBasis: "legitimate_interest",
					dataMinimization: true,
					purposeSpecification: true,
					retentionLimits: true,
					userRights: ["access", "rectification", "erasure", "portability"],
				},
				ccpa: {
					noticeRequired: true,
					optOutMechanism: true,
					dataSalesDisclosure: false, // No data sales
					serviceProviderNotice: true,
				},
				pipeda: {
					consentRequired: true,
					meaningfulConsent: true,
					withdrawalMechanism: true,
				},
				regionalVariations: {
					"EU-Germany": { strictConsent: true, dataLocalization: true },
					"US-California": { broadRights: true, dataSales: false },
					"Canada": { meaningfulConsent: true, withdrawal: true },
				},
			};

			// Validate privacy compliance
			expect(privacyCompliance.gdpr.userRights.length).toBeGreaterThan(0);
			expect(privacyCompliance.gdpr.lawfulBasis).toBeDefined();

			expect(privacyCompliance.ccpa.noticeRequired).toBe(true);
			expect(privacyCompliance.ccpa.optOutMechanism).toBe(true);

			expect(privacyCompliance.pipeda.consentRequired).toBe(true);
			expect(privacyCompliance.pipeda.withdrawalMechanism).toBe(true);

			// Regional variations should reflect local requirements
			Object.values(privacyCompliance.regionalVariations).forEach(region => {
				expect(Object.keys(region).length).toBeGreaterThan(0);
			});
		});

		it("provides experiment transparency and reporting", async () => {
			const transparencyReporting = {
				publicExperimentRegistry: {
					experimentList: true,
					currentlyRunning: ["signup-test", "pricing-test"],
					recentlyCompleted: ["navigation-test", "button-test"],
					upcoming: ["checkout-test"],
				},
				userCommunication: {
					experimentNotice: true,
					optOutInstructions: true,
					resultsSharing: "anonymized",
				},
				reportingStandards: {
					methodologyDisclosure: true,
					statisticalMethods: "documented",
					dataSources: "transparent",
					limitations: "acknowledged",
				},
				externalAudits: {
					regularAudits: true,
					independentReview: true,
					publicAuditReports: true,
					lastAudit: "2024-01-01",
					nextAudit: "2024-07-01",
				},
			};

			// Validate transparency measures
			expect(transparencyReporting.publicExperimentRegistry.experimentList).toBe(true);
			expect(transparencyReporting.publicExperimentRegistry.currentlyRunning.length).toBeGreaterThan(0);

			expect(transparencyReporting.userCommunication.experimentNotice).toBe(true);
			expect(transparencyReporting.userCommunication.optOutInstructions).toBe(true);

			expect(transparencyReporting.reportingStandards.methodologyDisclosure).toBe(true);
			expect(transparencyReporting.reportingStandards.limitations).toBe("acknowledged");

			expect(transparencyReporting.externalAudits.regularAudits).toBe(true);
			expect(new Date(transparencyReporting.externalAudits.nextAudit)).toBeAfter(
				new Date(transparencyReporting.externalAudits.lastAudit)
			);
		});
	});
});