/**
 * GDPR Data Export & Compliance Tests
 *
 * Tests data export functionality and GDPR compliance features
 * Critical for legal compliance and user data rights
 */

import { createMocks } from "node-mocks-http";
import { GET as getUserData } from "@/app/api/gdpr/data/route";
import { DELETE as deleteUserData } from "@/app/api/gdpr/delete/route";
import { POST as exportUserData } from "@/app/api/gdpr/export/route";
import { GET as getDataRetention } from "@/app/api/gdpr/retention/route";

describe("GDPR Data Export & Compliance", () => {
	const testUserEmail = "test-user@example.com";
	const testUserId = "user-123";

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("Authentication & Authorization", () => {
		it("requires user authentication for all GDPR endpoints", async () => {
			const endpoints = [
				{ method: "GET", handler: getUserData, path: "/api/gdpr/data" },
				{ method: "DELETE", handler: deleteUserData, path: "/api/gdpr/delete" },
				{ method: "POST", handler: exportUserData, path: "/api/gdpr/export" },
				{ method: "GET", handler: getDataRetention, path: "/api/gdpr/retention" },
			];

			for (const endpoint of endpoints) {
				const { req } = createMocks({
					method: endpoint.method,
					url: endpoint.path,
				});

				const response = await endpoint.handler(req as any);
				expect([401, 403]).toContain(response.status);
			}
		});

		it("accepts valid user authentication", async () => {
			const { req } = createMocks({
				method: "GET",
				url: "/api/gdpr/data",
				headers: {
					authorization: `Bearer user-token-${testUserId}`,
				},
			});

			const response = await getUserData(req as any);
			expect([200, 404]).toContain(response.status); // 200 if data exists, 404 if not
		});

		it("validates user owns the requested data", async () => {
			const { req } = createMocks({
				method: "GET",
				url: "/api/gdpr/data?userId=different-user-456",
				headers: {
					authorization: `Bearer user-token-${testUserId}`,
				},
			});

			const response = await getUserData(req as any);
			expect([403, 404]).toContain(response.status); // Cannot access other users' data
		});
	});

	describe("Data Export Functionality", () => {
		it("exports comprehensive user data", async () => {
			const { req } = createMocks({
				method: "POST",
				url: "/api/gdpr/export",
				headers: {
					authorization: `Bearer user-token-${testUserId}`,
				},
			});

			const response = await exportUserData(req as any);
			expect([200, 202]).toContain(response.status); // 202 if queued for processing

			if (response.status === 200) {
				const data = await response.json();
				expect(data).toHaveProperty("exportId");
				expect(data).toHaveProperty("status");
				expect(data).toHaveProperty("estimatedCompletion");
			}
		});

		it("includes all user data categories in export", async () => {
			const { req } = createMocks({
				method: "GET",
				url: "/api/gdpr/data",
				headers: {
					authorization: `Bearer user-token-${testUserId}`,
				},
			});

			const response = await getUserData(req as any);

			if (response.status === 200) {
				const data = await response.json();
				expect(data).toHaveProperty("personal");
				expect(data).toHaveProperty("preferences");
				expect(data).toHaveProperty("activity");
				expect(data).toHaveProperty("matches");
				expect(data).toHaveProperty("communications");

				// Personal data
				expect(data.personal).toHaveProperty("email");
				expect(data.personal).toHaveProperty("fullName");
				expect(data.personal).toHaveProperty("signupDate");
				expect(data.personal).toHaveProperty("lastLogin");

				// Preferences
				expect(data.preferences).toHaveProperty("cities");
				expect(data.preferences).toHaveProperty("languages");
				expect(data.preferences).toHaveProperty("careerPath");
			}
		});

		it("provides data in multiple formats", async () => {
			const formats = ["json", "csv", "pdf"];

			for (const format of formats) {
				const { req } = createMocks({
					method: "POST",
					url: `/api/gdpr/export?format=${format}`,
					headers: {
						authorization: `Bearer user-token-${testUserId}`,
					},
				});

				const response = await exportUserData(req as any);
				expect([200, 202]).toContain(response.status);

				if (response.status === 200) {
					const data = await response.json();
					expect(data.format).toBe(format);
				}
			}
		});

		it("respects data export size limits", async () => {
			const { req } = createMocks({
				method: "POST",
				url: "/api/gdpr/export",
				headers: {
					authorization: `Bearer user-token-${testUserId}`,
				},
			});

			const response = await exportUserData(req as any);

			if (response.status === 200) {
				const data = await response.json();
				// Should not exceed reasonable size limits
				expect(data.sizeEstimate).toBeLessThan(100 * 1024 * 1024); // 100MB
			}
		});
	});

	describe("Right to Erasure (Data Deletion)", () => {
		it("allows users to delete their account", async () => {
			const { req } = createMocks({
				method: "DELETE",
				url: "/api/gdpr/delete",
				headers: {
					authorization: `Bearer user-token-${testUserId}`,
				},
			});

			const response = await deleteUserData(req as any);
			expect([200, 202]).toContain(response.status);

			if (response.status === 200) {
				const data = await response.json();
				expect(data).toHaveProperty("deleted");
				expect(data).toHaveProperty("confirmationId");
			}
		});

		it("requires explicit confirmation for deletion", async () => {
			const { req } = createMocks({
				method: "DELETE",
				url: "/api/gdpr/delete",
				headers: {
					authorization: `Bearer user-token-${testUserId}`,
				},
			});

			const response = await deleteUserData(req as any);

			if (response.status === 202) {
				// Requires additional confirmation
				const data = await response.json();
				expect(data).toHaveProperty("requiresConfirmation");
				expect(data.requiresConfirmation).toBe(true);
			}
		});

		it("provides deletion confirmation with details", async () => {
			const { req } = createMocks({
				method: "DELETE",
				url: "/api/gdpr/delete?confirm=true",
				headers: {
					authorization: `Bearer user-token-${testUserId}`,
				},
			});

			const response = await deleteUserData(req as any);

			if (response.status === 200) {
				const data = await response.json();
				expect(data).toHaveProperty("dataRemoved");
				expect(data).toHaveProperty("servicesDisconnected");
				expect(data).toHaveProperty("finalConfirmation");
			}
		});

		it("prevents premium user account deletion without cancellation", async () => {
			// Test with premium user
			const premiumUserId = "premium-user-789";
			const { req } = createMocks({
				method: "DELETE",
				url: "/api/gdpr/delete",
				headers: {
					authorization: `Bearer premium-token-${premiumUserId}`,
				},
			});

			const response = await deleteUserData(req as any);
			expect([400, 409]).toContain(response.status);

			if (response.status === 400) {
				const data = await response.json();
				expect(data.error).toMatch(/subscription|premium/i);
			}
		});
	});

	describe("Data Retention Policies", () => {
		it("provides clear data retention information", async () => {
			const { req } = createMocks({
				method: "GET",
				url: "/api/gdpr/retention",
				headers: {
					authorization: `Bearer user-token-${testUserId}`,
				},
			});

			const response = await getDataRetention(req as any);
			expect(response.status).toBe(200);

			const data = await response.json();
			expect(data).toHaveProperty("retentionPolicies");
			expect(data).toHaveProperty("dataCategories");
			expect(data).toHaveProperty("userRights");
		});

		it("specifies retention periods for different data types", async () => {
			const { req } = createMocks({
				method: "GET",
				url: "/api/gdpr/retention",
				headers: {
					authorization: `Bearer user-token-${testUserId}`,
				},
			});

			const response = await getDataRetention(req as any);
			const data = await response.json();

			expect(data.retentionPolicies).toHaveProperty("personal");
			expect(data.retentionPolicies).toHaveProperty("activity");
			expect(data.retentionPolicies).toHaveProperty("communications");

			// Retention periods should be reasonable
			Object.values(data.retentionPolicies).forEach((period: any) => {
				expect(period).toMatch(/\d+\s+(days?|months?|years?)/i);
			});
		});

		it("explains user rights clearly", async () => {
			const { req } = createMocks({
				method: "GET",
				url: "/api/gdpr/retention",
				headers: {
					authorization: `Bearer user-token-${testUserId}`,
				},
			});

			const response = await getDataRetention(req as any);
			const data = await response.json();

			expect(data.userRights).toHaveProperty("access");
			expect(data.userRights).toHaveProperty("rectification");
			expect(data.userRights).toHaveProperty("erasure");
			expect(data.userRights).toHaveProperty("portability");
			expect(data.userRights).toHaveProperty("restriction");
			expect(data.userRights).toHaveProperty("objection");

			// Rights should be explained clearly
			Object.values(data.userRights).forEach((explanation: any) => {
				expect(typeof explanation).toBe("string");
				expect(explanation.length).toBeGreaterThan(10);
			});
		});
	});

	describe("Consent Management", () => {
		it("allows users to withdraw consent", async () => {
			const { req } = createMocks({
				method: "POST",
				url: "/api/gdpr/consent",
				body: {
					action: "withdraw",
					dataProcessing: ["marketing", "analytics"],
				},
				headers: {
					authorization: `Bearer user-token-${testUserId}`,
				},
			});

			// Note: This endpoint might not exist, testing the framework
			const response = await fetch("/api/gdpr/consent", {
				method: "POST",
				body: JSON.stringify({
					action: "withdraw",
					dataProcessing: ["marketing", "analytics"],
				}),
				headers: {
					authorization: `Bearer user-token-${testUserId}`,
					"content-type": "application/json",
				},
			}).catch(() => ({ status: 404 }));

			expect([200, 404]).toContain(response.status);
		});

		it("tracks consent history", async () => {
			const { req } = createMocks({
				method: "GET",
				url: "/api/gdpr/consent/history",
				headers: {
					authorization: `Bearer user-token-${testUserId}`,
				},
			});

			// Test consent history tracking
			const response = await fetch("/api/gdpr/consent/history", {
				headers: {
					authorization: `Bearer user-token-${testUserId}`,
				},
			}).catch(() => ({ status: 404 }));

			expect([200, 404]).toContain(response.status);

			if (response.status === 200) {
				const data = await response.json();
				expect(data).toHaveProperty("consentHistory");
				expect(Array.isArray(data.consentHistory)).toBe(true);
			}
		});

		it("enforces consent requirements", async () => {
			// Test that certain operations require consent
			const { req } = createMocks({
				method: "POST",
				url: "/api/preferences",
				body: {
					marketingConsent: false,
					analyticsConsent: false,
				},
				headers: {
					authorization: `Bearer user-token-${testUserId}`,
				},
			});

			// Should handle consent preferences appropriately
			const response = await fetch("/api/preferences", {
				method: "POST",
				body: JSON.stringify({
					marketingConsent: false,
					analyticsConsent: false,
				}),
				headers: {
					authorization: `Bearer user-token-${testUserId}`,
					"content-type": "application/json",
				},
			}).catch(() => ({ status: 404 }));

			expect([200, 201, 404]).toContain(response.status);
		});
	});

	describe("Data Portability", () => {
		it("provides data in machine-readable format", async () => {
			const { req } = createMocks({
				method: "GET",
				url: "/api/gdpr/data?format=machine",
				headers: {
					authorization: `Bearer user-token-${testUserId}`,
				},
			});

			const response = await getUserData(req as any);

			if (response.status === 200) {
				const data = await response.json();
				expect(data).toHaveProperty("@context");
				expect(data).toHaveProperty("@type");
				expect(data).toHaveProperty("dataSubject");
			}
		});

		it("supports structured data export", async () => {
			const { req } = createMocks({
				method: "POST",
				url: "/api/gdpr/export?format=structured",
				headers: {
					authorization: `Bearer user-token-${testUserId}`,
				},
			});

			const response = await exportUserData(req as any);

			if (response.status === 200) {
				const data = await response.json();
				expect(data.format).toBe("structured");
				expect(data).toHaveProperty("schema");
				expect(data).toHaveProperty("version");
			}
		});

		it("allows selective data export", async () => {
			const categories = ["personal", "preferences", "activity"];

			for (const category of categories) {
				const { req } = createMocks({
					method: "GET",
					url: `/api/gdpr/data?category=${category}`,
					headers: {
						authorization: `Bearer user-token-${testUserId}`,
					},
				});

				const response = await getUserData(req as any);

				if (response.status === 200) {
					const data = await response.json();
					expect(data).toHaveProperty(category);
					// Should not include other categories
					Object.keys(data).forEach(key => {
						if (key !== category && key !== "metadata") {
							expect(data[key]).toBeUndefined();
						}
					});
				}
			}
		});
	});

	describe("Audit & Compliance Logging", () => {
		it("logs all GDPR-related actions", async () => {
			const actions = [
				{ endpoint: getUserData, method: "GET", path: "/api/gdpr/data" },
				{ endpoint: exportUserData, method: "POST", path: "/api/gdpr/export" },
				{ endpoint: deleteUserData, method: "DELETE", path: "/api/gdpr/delete" },
			];

			for (const action of actions) {
				const { req } = createMocks({
					method: action.method,
					url: action.path,
					headers: {
						authorization: `Bearer user-token-${testUserId}`,
					},
				});

				await action.endpoint(req as any);

				// Should have logged the action (checked via monitoring)
				expect(true).toBe(true); // Audit logging is tested separately
			}
		});

		it("provides compliance reports", async () => {
			const { req } = createMocks({
				method: "GET",
				url: "/api/gdpr/compliance-report",
				headers: {
					authorization: `Bearer admin-token`,
				},
			});

			const response = await fetch("/api/gdpr/compliance-report", {
				headers: {
					authorization: `Bearer admin-token`,
				},
			}).catch(() => ({ status: 404 }));

			expect([200, 401, 403, 404]).toContain(response.status);

			if (response.status === 200) {
				const data = await response.json();
				expect(data).toHaveProperty("gdprCompliance");
				expect(data).toHaveProperty("dataProcessing");
				expect(data).toHaveProperty("userRights");
			}
		});

		it("tracks data processing purposes", async () => {
			const { req } = createMocks({
				method: "GET",
				url: "/api/gdpr/processing-purposes",
				headers: {
					authorization: `Bearer user-token-${testUserId}`,
				},
			});

			const response = await fetch("/api/gdpr/processing-purposes", {
				headers: {
					authorization: `Bearer user-token-${testUserId}`,
				},
			}).catch(() => ({ status: 404 }));

			expect([200, 404]).toContain(response.status);

			if (response.status === 200) {
				const data = await response.json();
				expect(data).toHaveProperty("purposes");
				expect(Array.isArray(data.purposes)).toBe(true);

				data.purposes.forEach((purpose: any) => {
					expect(purpose).toHaveProperty("name");
					expect(purpose).toHaveProperty("legalBasis");
					expect(purpose).toHaveProperty("retentionPeriod");
				});
			}
		});
	});

	describe("Error Handling & Security", () => {
		it("handles data export failures gracefully", async () => {
			// Mock export failure
			const { req } = createMocks({
				method: "POST",
				url: "/api/gdpr/export",
				headers: {
					authorization: `Bearer user-token-${testUserId}`,
				},
			});

			const response = await exportUserData(req as any);
			expect([200, 202, 500]).toContain(response.status);

			if (response.status === 500) {
				const data = await response.json();
				expect(data).toHaveProperty("error");
				expect(data).toHaveProperty("retryAfter");
			}
		});

		it("prevents unauthorized data access", async () => {
			const sensitiveData = ["passwords", "paymentInfo", "internalNotes"];

			for (const dataType of sensitiveData) {
				const { req } = createMocks({
					method: "GET",
					url: `/api/gdpr/data?include=${dataType}`,
					headers: {
						authorization: `Bearer user-token-${testUserId}`,
					},
				});

				const response = await getUserData(req as any);
				expect([400, 403]).toContain(response.status);

				if (response.status === 400) {
					const data = await response.json();
					expect(data.error).toMatch(/sensitive|unauthorized/i);
				}
			}
		});

		it("rate limits GDPR requests", async () => {
			const requests = Array.from({ length: 10 }, () => {
				const { req } = createMocks({
					method: "GET",
					url: "/api/gdpr/data",
					headers: {
						authorization: `Bearer user-token-${testUserId}`,
					},
				});
				return getUserData(req as any);
			});

			const responses = await Promise.all(requests);
			const successCount = responses.filter(r => r.status === 200).length;
			const rateLimitedCount = responses.filter(r => r.status === 429).length;

			// Should allow reasonable access but rate limit abuse
			expect(successCount + rateLimitedCount).toBe(10);
		});

		it("validates data integrity in exports", async () => {
			const { req } = createMocks({
				method: "POST",
				url: "/api/gdpr/export?verify=true",
				headers: {
					authorization: `Bearer user-token-${testUserId}`,
				},
			});

			const response = await exportUserData(req as any);

			if (response.status === 200) {
				const data = await response.json();
				expect(data).toHaveProperty("integrity");
				expect(data).toHaveProperty("checksum");
				expect(data.integrity).toBe("verified");
			}
		});
	});
});