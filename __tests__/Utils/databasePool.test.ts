/**
 * Tests for Database Pool
 * Tests connection pooling and health checks
 */

import { closeDatabasePool, getDatabaseClient } from "../../utils/databasePool";

jest.mock("@supabase/supabase-js", () => ({
	createClient: jest.fn(),
}));
// Sentry removed - using Axiom for error tracking

describe("Database Pool", () => {
	beforeEach(async () => {
		jest.clearAllMocks();
		// Reset singleton state
		await closeDatabasePool();
		process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
		process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
	});

	afterEach(async () => {
		await closeDatabasePool();
		delete process.env.NEXT_PUBLIC_SUPABASE_URL;
		delete process.env.SUPABASE_SERVICE_ROLE_KEY;
	});

	describe("getDatabaseClient", () => {
		it("should create Supabase client with valid config", () => {
			const { createClient } = require("@supabase/supabase-js");
			const mockClient = { from: jest.fn() };
			(createClient as jest.Mock).mockReturnValue(mockClient);

			const client = getDatabaseClient();

			expect(createClient).toHaveBeenCalledWith(
				"https://test.supabase.co",
				"test-key",
				expect.objectContaining({
					auth: expect.objectContaining({
						autoRefreshToken: false,
						persistSession: false,
					}),
				}),
			);
			expect(client).toBeDefined();
		});

		it("should throw error when Supabase URL is missing", () => {
			delete process.env.NEXT_PUBLIC_SUPABASE_URL;

			expect(() => getDatabaseClient()).toThrow(
				"Missing Supabase configuration",
			);
		});

		it("should throw error when Supabase key is missing", () => {
			delete process.env.SUPABASE_SERVICE_ROLE_KEY;

			expect(() => getDatabaseClient()).toThrow(
				"Missing Supabase configuration",
			);
		});

		it("should return same instance on multiple calls", () => {
			const { createClient } = require("@supabase/supabase-js");
			const mockClient = { from: jest.fn() };
			(createClient as jest.Mock).mockReturnValue(mockClient);

			const client1 = getDatabaseClient();
			const client2 = getDatabaseClient();

			expect(client1).toBe(client2);
			expect(createClient).toHaveBeenCalledTimes(1);
		});

		it("should handle initialization errors", async () => {
			await closeDatabasePool();
			const { createClient } = require("@supabase/supabase-js");
			(createClient as jest.Mock).mockImplementation(() => {
				throw new Error("Connection failed");
			});

			expect(() => getDatabaseClient()).toThrow("Connection failed");
		});
	});
});
