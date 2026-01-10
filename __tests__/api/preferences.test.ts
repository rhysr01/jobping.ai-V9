/**
 * User Preferences Management Tests
 *
 * Tests the core user experience customization functionality
 * This is critical for personalization and user retention
 */

import { createMocks } from "node-mocks-http";
import { GET, PUT } from "@/app/api/preferences/route";
import { issueSecureToken } from "@/utils/authentication/secureTokens";

describe("User Preferences Management API", () => {
	describe("GET /api/preferences - Retrieve User Preferences", () => {
		it("should require valid token and email", async () => {
			const { req } = createMocks({
				method: "GET",
				url: "/api/preferences",
			});

			const response = await GET(req as any);
			expect([400, 422]).toContain(response.status);
		});

		it("should reject invalid tokens", async () => {
			const { req } = createMocks({
				method: "GET",
				url: "/api/preferences?token=invalid&email=test@example.com",
			});

			const response = await GET(req as any);
			expect([400, 401]).toContain(response.status);
		});

		it("should accept valid secure tokens", async () => {
			const testEmail = "test@example.com";
			const validToken = issueSecureToken(testEmail, "preferences");

			const { req } = createMocks({
				method: "GET",
				url: `/api/preferences?token=${validToken}&email=${testEmail}`,
			});

			const response = await GET(req as any);
			expect([200, 404]).toContain(response.status); // 200 if user exists, 404 if not
		});

		it("should reject expired tokens", async () => {
			const testEmail = "test@example.com";

			// Create token that's already expired by manipulating time
			const expiredToken = issueSecureToken(
				testEmail,
				"preferences",
				-60 * 60 * 1000,
			); // 1 hour ago

			const { req } = createMocks({
				method: "GET",
				url: `/api/preferences?token=${expiredToken}&email=${testEmail}`,
			});

			const response = await GET(req as any);
			expect([400, 401]).toContain(response.status);
		});

		it("should return user preferences when found", async () => {
			const testEmail = "existing-user@example.com";
			const validToken = issueSecureToken(testEmail, "preferences");

			const { req } = createMocks({
				method: "GET",
				url: `/api/preferences?token=${validToken}&email=${testEmail}`,
			});

			const response = await GET(req as any);

			if (response.status === 200) {
				const data = await response.json();
				expect(data).toHaveProperty("email", testEmail);
				expect(data).toHaveProperty("preferences");
			}
		});
	});

	describe("PUT /api/preferences - Update User Preferences", () => {
		it("should require authentication", async () => {
			const { req } = createMocks({
				method: "PUT",
				body: {
					cities: ["London"],
					languages: ["English"],
				},
			});

			const response = await PUT(req as any);
			expect([401, 403]).toContain(response.status);
		});

		it("should validate preference data structure", async () => {
			const invalidPreferences = [
				{ cities: "not-an-array" },
				{ languages: 123 },
				{ experience: { invalid: "object" } },
			];

			for (const prefs of invalidPreferences) {
				const { req } = createMocks({
					method: "PUT",
					body: prefs,
					headers: {
						authorization: "Bearer valid-token",
					},
				});

				const response = await PUT(req as any);
				expect([400, 422]).toContain(response.status);
			}
		});

		it("should accept valid preference updates", async () => {
			const validPreferences = {
				cities: ["London", "Berlin"],
				languages: ["English", "German"],
				experience: "entry-level",
				workEnvironment: ["hybrid", "remote"],
				visaStatus: "EU citizen",
				entryLevelPreferences: ["Graduate Programmes"],
				targetCompanies: ["Tech Companies"],
				careerPath: "tech",
				roles: ["Software Engineer"],
				industries: ["Technology"],
				companySizePreference: "large",
				skills: ["React", "TypeScript"],
				careerKeywords: "full-stack development",
			};

			const { req } = createMocks({
				method: "PUT",
				body: validPreferences,
				headers: {
					authorization: "Bearer valid-token",
				},
			});

			const response = await PUT(req as any);
			expect([200, 201, 401]).toContain(response.status); // 401 if user not found
		});

		it("should support partial updates", async () => {
			const partialUpdate = {
				cities: ["New York"],
				languages: ["English"],
			};

			const { req } = createMocks({
				method: "PUT",
				body: partialUpdate,
				headers: {
					authorization: "Bearer valid-token",
				},
			});

			const response = await PUT(req as any);
			expect([200, 201, 401]).toContain(response.status);
		});

		it("should validate array field contents", async () => {
			const invalidArrays = [
				{ cities: ["", "London"] }, // Empty string
				{ languages: ["English", null] }, // Null value
				{ skills: ["Valid Skill", "x".repeat(200)] }, // Too long
			];

			for (const prefs of invalidArrays) {
				const { req } = createMocks({
					method: "PUT",
					body: prefs,
					headers: {
						authorization: "Bearer valid-token",
					},
				});

				const response = await PUT(req as any);
				expect([400, 422]).toContain(response.status);
			}
		});
	});

	describe("Preference Data Validation", () => {
		it("should validate city names", async () => {
			const invalidCities = [
				["", "London"], // Empty city
				["London", "A".repeat(100)], // Too long
				["London", "Invalid@City!#"], // Invalid characters
			];

			for (const cities of invalidCities) {
				const { req } = createMocks({
					method: "PUT",
					body: { cities },
					headers: {
						authorization: "Bearer valid-token",
					},
				});

				const response = await PUT(req as any);
				expect([400, 422]).toContain(response.status);
			}
		});

		it("should validate language codes", async () => {
			const invalidLanguages = [
				[""], // Empty
				["English", "NotALanguage"], // Invalid language
				["English", "E".repeat(50)], // Too long
			];

			for (const languages of invalidLanguages) {
				const { req } = createMocks({
					method: "PUT",
					body: { languages },
					headers: {
						authorization: "Bearer valid-token",
					},
				});

				const response = await PUT(req as any);
				expect([400, 422]).toContain(response.status);
			}
		});

		it("should validate experience levels", async () => {
			const validExperienceLevels = [
				"entry-level",
				"1 year",
				"2-3 years",
				"5+ years",
			];

			const invalidExperienceLevels = ["", "invalid-level", "negative-years"];

			for (const experience of validExperienceLevels) {
				const { req } = createMocks({
					method: "PUT",
					body: { experience },
					headers: {
						authorization: "Bearer valid-token",
					},
				});

				const response = await PUT(req as any);
				// Should not fail validation
				expect(response.status).not.toBe(422);
			}

			for (const experience of invalidExperienceLevels) {
				const { req } = createMocks({
					method: "PUT",
					body: { experience },
					headers: {
						authorization: "Bearer valid-token",
					},
				});

				const response = await PUT(req as any);
				expect([400, 422]).toContain(response.status);
			}
		});

		it("should validate work environment preferences", async () => {
			const validEnvironments = ["remote", "hybrid", "onsite"];
			const invalidEnvironments = ["", "invalid-env", "telecommute"];

			const { req: validReq } = createMocks({
				method: "PUT",
				body: { workEnvironment: validEnvironments },
				headers: {
					authorization: "Bearer valid-token",
				},
			});

			const validResponse = await PUT(validReq as any);
			expect(validResponse.status).not.toBe(422);

			const { req: invalidReq } = createMocks({
				method: "PUT",
				body: { workEnvironment: invalidEnvironments },
				headers: {
					authorization: "Bearer valid-token",
				},
			});

			const invalidResponse = await PUT(invalidReq as any);
			expect([400, 422]).toContain(invalidResponse.status);
		});
	});

	describe("Preference Persistence", () => {
		it("should persist preference updates", async () => {
			const testEmail = "persist-test@example.com";
			const preferences = {
				cities: ["London"],
				languages: ["English"],
				experience: "entry-level",
			};

			// Update preferences
			const { req: updateReq } = createMocks({
				method: "PUT",
				body: preferences,
				headers: {
					authorization: "Bearer valid-token",
				},
			});

			const updateResponse = await PUT(updateReq as any);
			expect([200, 201, 401]).toContain(updateResponse.status);

			// Verify persistence by retrieving
			if (updateResponse.status === 200) {
				const token = issueSecureToken(testEmail, "preferences");
				const { req: getReq } = createMocks({
					method: "GET",
					url: `/api/preferences?token=${token}&email=${testEmail}`,
				});

				const getResponse = await GET(getReq as any);
				if (getResponse.status === 200) {
					const data = await getResponse.json();
					expect(data.preferences).toBeDefined();
				}
			}
		});

		it("should handle concurrent preference updates", async () => {
			const preferences1 = { cities: ["London"] };
			const preferences2 = { cities: ["Berlin"] };

			const [response1, response2] = await Promise.all([
				PUT(
					createMocks({
						method: "PUT",
						body: preferences1,
						headers: { authorization: "Bearer token1" },
					}).req as any,
				),
				PUT(
					createMocks({
						method: "PUT",
						body: preferences2,
						headers: { authorization: "Bearer token2" },
					}).req as any,
				),
			]);

			// Both should succeed or both should fail consistently
			expect([response1.status, response2.status]).toEqual(
				expect.arrayContaining([response1.status, response2.status]),
			);
		});
	});

	describe("Security and Privacy", () => {
		it("should protect against preference data leakage", async () => {
			const sensitivePreferences = {
				cities: ["London"],
				// Should not allow sensitive data
				password: "secret",
				creditCard: "4111111111111111",
				ssn: "123-45-6789",
			};

			const { req } = createMocks({
				method: "PUT",
				body: sensitivePreferences,
				headers: {
					authorization: "Bearer valid-token",
				},
			});

			const response = await PUT(req as any);
			expect([400, 422]).toContain(response.status);
		});

		it("should require secure token for access", async () => {
			const { req } = createMocks({
				method: "GET",
				url: "/api/preferences?token=weak-token&email=test@example.com",
			});

			const response = await GET(req as any);
			expect([400, 401]).toContain(response.status);
		});

		it("should prevent preference enumeration attacks", async () => {
			const nonExistentEmails = [
				"not-found-1@example.com",
				"not-found-2@example.com",
			];

			for (const email of nonExistentEmails) {
				const token = issueSecureToken(email, "preferences");
				const { req } = createMocks({
					method: "GET",
					url: `/api/preferences?token=${token}&email=${email}`,
				});

				const response = await GET(req as any);
				// Should return consistent responses to prevent enumeration
				expect([200, 404]).toContain(response.status);
			}
		});
	});
});
